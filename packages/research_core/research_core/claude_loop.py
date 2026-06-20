from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
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
        timeout_seconds: float,
        system: str,
        user_prompt: str,
    ) -> str:
        ...


@dataclass(frozen=True)
class ClaudeLoopConfig:
    api_key: str | None = None
    model: str = DEFAULT_CLAUDE_MODEL
    max_tokens: int = 4096
    timeout_seconds: float = 90.0
    debug_dir: Path | None = None

    @classmethod
    def from_env(cls) -> "ClaudeLoopConfig":
        max_tokens = os.environ.get("CLAUDE_MAX_TOKENS", "4096")
        timeout_seconds = os.environ.get("CLAUDE_TIMEOUT_SECONDS", "90")
        debug_dir = os.environ.get("CLAUDE_DEBUG_DIR")
        return cls(
            api_key=os.environ.get("ANTHROPIC_API_KEY"),
            model=os.environ.get("CLAUDE_MODEL")
            or os.environ.get("ANTHROPIC_MODEL")
            or DEFAULT_CLAUDE_MODEL,
            max_tokens=int(max_tokens),
            timeout_seconds=float(timeout_seconds),
            debug_dir=Path(debug_dir) if debug_dir else None,
        )


class AnthropicMessagesClient:
    def __init__(self, api_key: str | None) -> None:
        self.api_key = api_key

    def create_message(
        self,
        *,
        model: str,
        max_tokens: int,
        timeout_seconds: float,
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

        client = Anthropic(api_key=self.api_key, timeout=timeout_seconds)
        try:
            message = client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user_prompt}],
            )
        except Exception as exc:
            raise ClaudeLoopError(f"Claude request failed: {exc}") from exc
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
        timeout_seconds=config.timeout_seconds,
        system=SYSTEM_PROMPT,
        user_prompt=prompt,
    )
    return parse_claude_loop_response(
        raw_response=raw_response,
        transcript=transcript,
        prior_insight_doc=prior_insight_doc,
        debug_dir=config.debug_dir,
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
            "updated_insight_doc": {
                "id": "insight_doc_after_interview_001",
                "research_goal": transcript.research_goal,
                "themes": [
                    {
                        "id": "theme_snake_case",
                        "label": "short theme label",
                        "findings": [
                            {
                                "id": "finding_snake_case",
                                "text": "finding grounded in the transcript",
                                "status": "open",
                                "confidence": "medium",
                                "supporting_quotes": [
                                    {
                                        "interviewee": transcript.interviewee_id,
                                        "quote": "direct quote from transcript",
                                    }
                                ],
                            }
                        ],
                    }
                ],
                "open_questions": ["question still unresolved"],
                "contradictions": [],
            },
            "next_question_bank": {
                "id": f"question_bank_interview_{transcript.interview_number + 1:03d}_claude",
                "research_goal": transcript.research_goal,
                "interview_number": transcript.interview_number + 1,
                "for_interviewee": next_interviewee_id,
                "personalized_opening": "one sentence opening",
                "questions": [
                    {
                        "id": "q1",
                        "primary": "specific question",
                        "rationale_gap": "what Interview 1 finding or gap this targets",
                        "probes": ["follow-up probe"],
                        "specificity_score": 0.82,
                        "grounding": ["direct quote or finding from Interview 1"],
                    }
                ],
            },
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
    debug_dir: Path | None = None,
) -> LoopResult:
    write_debug_response(debug_dir, raw_response)
    try:
        payload = json.loads(extract_json_object(raw_response))
    except json.JSONDecodeError as exc:
        raise ClaudeLoopError(f"Claude response was not valid JSON: {exc}") from exc

    try:
        updated_insight_doc_payload = first_present(
            payload,
            "updated_insight_doc",
            "insight_doc_after",
            "living_insight_document",
            "updated_living_insight_document",
        )
        next_question_bank_payload = first_present(
            payload,
            "next_question_bank",
            "question_bank_after",
            "generated_question_bank",
            "regenerated_question_bank",
        )
        updated_insight_doc = LivingInsightDocument.model_validate(updated_insight_doc_payload)
        next_question_bank = QuestionBank.model_validate(next_question_bank_payload)
        evidence = [LoopEvidence.model_validate(item) for item in payload.get("evidence", [])]
    except (KeyError, ValueError) as exc:
        keys = ", ".join(payload.keys())
        raise ClaudeLoopError(
            f"Claude response did not match the loop contract: {exc}. Top-level keys: {keys}"
        ) from exc

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


def first_present(payload: dict, *keys: str):
    for key in keys:
        if key in payload:
            return payload[key]
    raise KeyError(f"missing one of: {', '.join(keys)}")


def write_debug_response(debug_dir: Path | None, raw_response: str) -> None:
    if debug_dir is None:
        return
    debug_dir.mkdir(parents=True, exist_ok=True)
    (debug_dir / "claude_raw_response.txt").write_text(raw_response)
