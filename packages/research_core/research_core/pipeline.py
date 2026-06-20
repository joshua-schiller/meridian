from __future__ import annotations

from typing import Literal
import os

from .claude_loop import ClaudeLoopConfig, ClaudeMessageClient, run_claude_adaptive_loop
from .loop import run_adaptive_loop
from .models import Contact, Dossier, LivingInsightDocument, LoopResult, Transcript


LoopMode = Literal["deterministic", "claude", "auto"]


def run_loop(
    *,
    transcript: Transcript,
    prior_insight_doc: LivingInsightDocument,
    contact: Contact | None = None,
    dossier: Dossier | None = None,
    next_interviewee_id: str = "pm_002_pending",
    mode: LoopMode = "deterministic",
    claude_client: ClaudeMessageClient | None = None,
    claude_config: ClaudeLoopConfig | None = None,
) -> LoopResult:
    selected_mode = resolve_mode(mode)
    if selected_mode == "claude":
        return run_claude_adaptive_loop(
            transcript=transcript,
            prior_insight_doc=prior_insight_doc,
            contact=contact,
            dossier=dossier,
            next_interviewee_id=next_interviewee_id,
            client=claude_client,
            config=claude_config,
        )

    return run_adaptive_loop(
        transcript=transcript,
        prior_insight_doc=prior_insight_doc,
        contact=contact,
        dossier=dossier,
        next_interviewee_id=next_interviewee_id,
    )


def resolve_mode(mode: LoopMode) -> Literal["deterministic", "claude"]:
    if mode == "auto":
        return "claude" if os.environ.get("ANTHROPIC_API_KEY") else "deterministic"
    return mode
