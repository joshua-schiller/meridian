from __future__ import annotations

from pathlib import Path
from typing import Any
import json

from .models import Contact, Dossier, LivingInsightDocument, LoopResult, QuestionBank, Transcript


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n")


def load_demo_inputs(fixtures_dir: Path) -> tuple[Contact, Dossier, Transcript, LivingInsightDocument, QuestionBank]:
    contact = Contact.model_validate(read_json(fixtures_dir / "contacts/maya_chen.json"))
    dossier = Dossier.model_validate(read_json(fixtures_dir / "dossiers/maya_chen.json"))
    transcript = Transcript.model_validate(read_json(fixtures_dir / "transcripts/interview_1_maya_chen.json"))
    prior_insight_doc = LivingInsightDocument.model_validate(read_json(fixtures_dir / "insights/initial.json"))
    baseline_question_bank = QuestionBank.model_validate(
        read_json(fixtures_dir / "question_banks/interview_1_broad.json")
    )
    return contact, dossier, transcript, prior_insight_doc, baseline_question_bank


def write_loop_artifacts(output_dir: Path, result: LoopResult) -> list[Path]:
    files = [
        (output_dir / "loop_result.json", result.model_dump(mode="json")),
        (
            output_dir / "updated_insight_doc.json",
            result.updated_insight_doc.model_dump(mode="json"),
        ),
        (
            output_dir / "next_question_bank.json",
            result.next_question_bank.model_dump(mode="json"),
        ),
    ]
    written: list[Path] = []
    for path, payload in files:
        write_json(path, payload)
        written.append(path)
    return written
