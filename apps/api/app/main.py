from pathlib import Path
from typing import Any
import json

from fastapi import FastAPI

from research_core import Contact, Dossier, LivingInsightDocument, QuestionBank, Transcript
from research_core.fixture_io import load_demo_inputs
from research_core.loop import average_specificity, run_adaptive_loop


ROOT_DIR = Path(__file__).resolve().parents[3]
FIXTURES_DIR = ROOT_DIR / "fixtures"

app = FastAPI(
    title="Meridian API",
    summary="Transcript-first discovery loop API skeleton.",
    version="0.1.0",
)


def read_fixture(relative_path: str) -> dict[str, Any]:
    fixture_path = FIXTURES_DIR / relative_path
    return json.loads(fixture_path.read_text())


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/demo/fixtures")
def demo_fixtures() -> dict[str, Any]:
    contact = Contact.model_validate(read_fixture("contacts/maya_chen.json"))
    dossier = Dossier.model_validate(read_fixture("dossiers/maya_chen.json"))
    transcript = Transcript.model_validate(read_fixture("transcripts/interview_1_maya_chen.json"))
    question_bank_1 = QuestionBank.model_validate(
        read_fixture("question_banks/interview_1_broad.json")
    )
    question_bank_2 = QuestionBank.model_validate(
        read_fixture("question_banks/interview_2_expected.json")
    )
    insight_initial = LivingInsightDocument.model_validate(read_fixture("insights/initial.json"))
    insight_after_interview_1 = LivingInsightDocument.model_validate(
        read_fixture("insights/after_interview_1.json")
    )

    return {
        "contact": contact.model_dump(mode="json"),
        "dossier": dossier.model_dump(mode="json"),
        "transcript": transcript.model_dump(mode="json"),
        "question_banks": [
            question_bank_1.model_dump(mode="json"),
            question_bank_2.model_dump(mode="json"),
        ],
        "insight_docs": [
            insight_initial.model_dump(mode="json"),
            insight_after_interview_1.model_dump(mode="json"),
        ],
    }


def build_demo_loop_payload() -> dict[str, Any]:
    contact, dossier, transcript, prior_insight_doc, baseline_question_bank = load_demo_inputs(FIXTURES_DIR)
    result = run_adaptive_loop(
        transcript=transcript,
        prior_insight_doc=prior_insight_doc,
        contact=contact,
        dossier=dossier,
    )

    return {
        "transcript": transcript.model_dump(mode="json"),
        "insight_doc_before": prior_insight_doc.model_dump(mode="json"),
        "insight_doc_after": result.updated_insight_doc.model_dump(mode="json"),
        "question_bank_before": baseline_question_bank.model_dump(mode="json"),
        "question_bank_after": result.next_question_bank.model_dump(mode="json"),
        "loop_result": result.model_dump(mode="json"),
        "metrics": {
            "specificity_before": average_specificity(baseline_question_bank),
            "specificity_after": average_specificity(result.next_question_bank),
            "findings_added": sum(
                len(theme.findings) for theme in result.updated_insight_doc.themes
            )
            - sum(len(theme.findings) for theme in prior_insight_doc.themes),
            "grounded_questions": sum(
                1 for question in result.next_question_bank.questions if question.grounding
            ),
        },
    }


@app.get("/demo/adaptive-loop")
def demo_adaptive_loop() -> dict[str, Any]:
    return build_demo_loop_payload()


@app.post("/research/run-fixture")
def research_run_fixture() -> dict[str, Any]:
    return build_demo_loop_payload()


@app.get("/demo/transcript/interview-1")
def demo_transcript() -> dict[str, Any]:
    return Transcript.model_validate(
        read_fixture("transcripts/interview_1_maya_chen.json")
    ).model_dump(mode="json")


@app.get("/demo/question-banks")
def demo_question_banks() -> list[dict[str, Any]]:
    return [
        QuestionBank.model_validate(read_fixture("question_banks/interview_1_broad.json")).model_dump(
            mode="json"
        ),
        QuestionBank.model_validate(read_fixture("question_banks/interview_2_expected.json")).model_dump(
            mode="json"
        ),
    ]


@app.get("/demo/insight-docs")
def demo_insight_docs() -> list[dict[str, Any]]:
    return [
        LivingInsightDocument.model_validate(read_fixture("insights/initial.json")).model_dump(
            mode="json"
        ),
        LivingInsightDocument.model_validate(read_fixture("insights/after_interview_1.json")).model_dump(
            mode="json"
        ),
    ]
