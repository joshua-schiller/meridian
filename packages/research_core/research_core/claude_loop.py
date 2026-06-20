from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol
import json
import os

from .models import (
    Contact,
    Dossier,
    LivingInsightDocument,
    LoopEvidence,
    LoopResult,
    QuestionBank,
    Transcript,
)


DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-5"


class ClaudeLoopError(RuntimeError):
    """Raised when Claude mode cannot produce a valid LoopResult."""


class ClaudeMessageClient(Protocol):
    def create_message(
        self,
        *,
        model: str,
        max_tokens: int,
        system: str,
        user_prompt: str,
    ) -> str:
        ...


@dataclass(frozen=True)
class ClaudeLoopConfig:
    api_key: str | None = None
    model: str = DEFAULT_CLAUDE_MODEL
    max_tokens: int = 4096

    @classmethod
    def from_env(cls) -> "ClaudeLoopConfig":
        max_tokens = os.environ.get("CLAUDE_MAX_TOKENS", "4096")
        return cls(
            api_key=os.environ.get("ANTHROPIC_API_KEY"),
            model=os.environ.get("CLAUDE_MODEL")
            or os.environ.get("ANTHROPIC_MODEL")
            or DEFAULT_CLAUDE_MODEL,
            max_tokens=int(max_tokens),
        )


class AnthropicMessagesClient:
    def __init__(self, api_key: str | None) -> None:
        self.api_key = api_key

    def create_message(
        self,
        *,
        model: str,
        max_tokens: int,
        system: str,
        user_prompt: str,
    ) -> str:
        if not self.api_key:
            raise ClaudeLoopError("ANTHROPIC_API_KEY is required for Claude mode.")

        try:
            from anthropic import Anthropic
        except ImportError as exc:
            raise ClaudeLoopError(
                "Claude mode requires the `anthropic` package. Install API requirements first."
            ) from exc

        client = Anthropic(api_key=self.api_key)
        message = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_prompt}],
        )
        text_blocks = [
            block.text
            for block in message.content
            if getattr(block, "type", None) == "text" and getattr(block, "text", None)
        ]
        if not text_blocks:
            raise ClaudeLoopError("Claude returned no text content.")
        return "\n".join(text_blocks)


SYSTEM_PROMPT = """You are Meridian's adaptive PM research agent.

Your job is to transform one discovery-call transcript into:
1. an updated living insight document,
2. a sharper next interview question bank,
3. evidence links from transcript quotes to findings/questions.

Rules:
- Return only a single JSON object. No markdown fences or explanatory prose.
- Ground every generated question in a direct quote or finding from the transcript.
- Make the next question bank visibly sharper than the prior broad exploration.
- Preserve the existing research_goal exactly.
- Use compact IDs in snake_case.
- Keep statuses to confirmed, challenged, nuanced, or open.
- Keep confidence to high, medium, or low.
"""


def run_claude_adaptive_loop(
    *,
    transcript: Transcript,
    prior_insight_doc: LivingInsightDocument,
    contact: Contact | None = None,
    dossier: Dossier | None = None,
    next_interviewee_id: str = "pm_002_pending",
    client: ClaudeMessageClient | None = None,
    config: ClaudeLoopConfig | None = None,
) -> LoopResult:
    config = config or ClaudeLoopConfig.from_env()
    client = client or AnthropicMessagesClient(config.api_key)
    prompt = build_claude_loop_prompt(
        transcript=transcript,
        prior_insight_doc=prior_insight_doc,
        contact=contact,
        dossier=dossier,
        next_interviewee_id=next_interviewee_id,
    )
    raw_response = client.create_message(
        model=config.model,
        max_tokens=config.max_tokens,
        system=SYSTEM_PROMPT,
        user_prompt=prompt,
    )
    return parse_claude_loop_response(
        raw_response=raw_response,
        transcript=transcript,
        prior_insight_doc=prior_insight_doc,
    )


def build_claude_loop_prompt(
    *,
    transcript: Transcript,
    prior_insight_doc: LivingInsightDocument,
    contact: Contact | None,
    dossier: Dossier | None,
    next_interviewee_id: str,
) -> str:
    payload = {
        "research_goal": transcript.research_goal,
        "next_interviewee_id": next_interviewee_id,
        "contact": contact.model_dump(mode="json") if contact else None,
        "dossier": dossier.model_dump(mode="json") if dossier else None,
        "transcript": transcript.model_dump(mode="json"),
        "prior_insight_doc": prior_insight_doc.model_dump(mode="json"),
        "required_response_shape": {
            "updated_insight_doc": "LivingInsightDocument JSON",
            "next_question_bank": "QuestionBank JSON for transcript.interview_number + 1",
            "evidence": [
                {
                    "id": "string",
                    "finding_id": "string",
                    "question_id": "string or null",
                    "interviewee": transcript.interviewee_id,
                    "quote": "direct transcript quote",
                    "takeaway": "why this evidence matters",
                }
            ],
            "summary": "one sentence describing the loop update",
        },
    }
    return json.dumps(payload, indent=2)


def parse_claude_loop_response(
    *,
    raw_response: str,
    transcript: Transcript,
    prior_insight_doc: LivingInsightDocument,
) -> LoopResult:
    try:
        payload = json.loads(extract_json_object(raw_response))
    except json.JSONDecodeError as exc:
        raise ClaudeLoopError("Claude response was not valid JSON.") from exc

    try:
        updated_insight_doc = LivingInsightDocument.model_validate(payload["updated_insight_doc"])
        next_question_bank = QuestionBank.model_validate(payload["next_question_bank"])
        evidence = [LoopEvidence.model_validate(item) for item in payload.get("evidence", [])]
    except (KeyError, ValueError) as exc:
        raise ClaudeLoopError("Claude response did not match the loop contract.") from exc

    validate_claude_loop_contract(
        transcript=transcript,
        prior_insight_doc=prior_insight_doc,
        updated_insight_doc=updated_insight_doc,
        next_question_bank=next_question_bank,
    )

    return LoopResult(
        id=f"claude_loop_after_interview_{transcript.interview_number:03d}",
        transcript=transcript,
        prior_insight_doc=prior_insight_doc,
        updated_insight_doc=updated_insight_doc,
        next_question_bank=next_question_bank,
        evidence=evidence,
        summary=payload.get("summary")
        or f"Claude regenerated Interview {next_question_bank.interview_number}'s question bank.",
    )


def validate_claude_loop_contract(
    *,
    transcript: Transcript,
    prior_insight_doc: LivingInsightDocument,
    updated_insight_doc: LivingInsightDocument,
    next_question_bank: QuestionBank,
) -> None:
    if updated_insight_doc.research_goal != prior_insight_doc.research_goal:
        raise ClaudeLoopError("Claude changed the research goal.")
    if next_question_bank.research_goal != transcript.research_goal:
        raise ClaudeLoopError("Claude question bank changed the research goal.")
    if next_question_bank.interview_number != transcript.interview_number + 1:
        raise ClaudeLoopError("Claude question bank did not increment interview_number.")
    if not next_question_bank.questions:
        raise ClaudeLoopError("Claude returned an empty question bank.")
    if any(not question.grounding for question in next_question_bank.questions):
        raise ClaudeLoopError("Claude returned a question without grounding.")


def extract_json_object(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("{") and stripped.endswith("}"):
        return stripped

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ClaudeLoopError("Claude response did not contain a JSON object.")
    return stripped[start : end + 1]
