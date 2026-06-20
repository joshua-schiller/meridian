from pathlib import Path
from typing import Any
import json

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel

from research_core import (
    Contact,
    Dossier,
    LivingInsightDocument,
    LoopMode,
    LoopResult,
    QuestionBank,
    Transcript,
)
from research_core.claude_loop import ClaudeLoopError
from research_core.fixture_io import load_demo_inputs
from research_core.loop import average_specificity
from research_core.pipeline import run_loop
from research_core.report import (
    StakeholderReport,
    build_stakeholder_report,
    render_report_pdf,
    report_to_markdown,
)


ROOT_DIR = Path(__file__).resolve().parents[3]
FIXTURES_DIR = ROOT_DIR / "fixtures"

from .deepgram_voice import router as voice_router

app = FastAPI(
    title="Meridian API",
    summary="Transcript-first discovery loop API skeleton.",
    version="0.1.0",
)

app.include_router(voice_router)


class TranscriptLoopRequest(BaseModel):
    transcript: Transcript
    prior_insight_doc: LivingInsightDocument | None = None
    baseline_question_bank: QuestionBank | None = None
    contact: Contact | None = None
    dossier: Dossier | None = None


def read_fixture(relative_path: str) -> dict[str, Any]:
    fixture_path = FIXTURES_DIR / relative_path
    return json.loads(fixture_path.read_text())


def loop_payload(
    *,
    transcript: Transcript,
    prior_insight_doc: LivingInsightDocument,
    baseline_question_bank: QuestionBank,
    contact: Contact | None,
    dossier: Dossier | None,
    mode: LoopMode,
) -> dict[str, Any]:
    try:
        result = run_loop(
            transcript=transcript,
            prior_insight_doc=prior_insight_doc,
            contact=contact,
            dossier=dossier,
            mode=mode,
        )
    except ClaudeLoopError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

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
            "mode": mode,
        },
    }


def request_context(
    request: TranscriptLoopRequest,
) -> tuple[Contact, Dossier, LivingInsightDocument, QuestionBank]:
    default_contact, default_dossier, _, default_prior_doc, default_baseline_bank = load_demo_inputs(
        FIXTURES_DIR
    )
    return (
        request.contact or default_contact,
        request.dossier or default_dossier,
        request.prior_insight_doc or default_prior_doc,
        request.baseline_question_bank or default_baseline_bank,
    )


def run_transcript_request(request: TranscriptLoopRequest, mode: LoopMode) -> dict[str, Any]:
    contact, dossier, prior_insight_doc, baseline_question_bank = request_context(request)
    return loop_payload(
        transcript=request.transcript,
        prior_insight_doc=prior_insight_doc,
        baseline_question_bank=baseline_question_bank,
        contact=contact,
        dossier=dossier,
        mode=mode,
    )


def report_from_transcript_request(
    request: TranscriptLoopRequest,
    mode: LoopMode,
) -> StakeholderReport:
    payload = run_transcript_request(request, mode)
    contact, dossier, _, baseline_question_bank = request_context(request)
    return build_stakeholder_report(
        loop_result=LoopResult.model_validate(payload["loop_result"]),
        contact=contact,
        dossier=dossier,
        baseline_question_bank=baseline_question_bank,
    )


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


def build_demo_loop_payload(mode: LoopMode = "deterministic") -> dict[str, Any]:
    contact, dossier, transcript, prior_insight_doc, baseline_question_bank = load_demo_inputs(FIXTURES_DIR)
    return loop_payload(
        transcript=transcript,
        prior_insight_doc=prior_insight_doc,
        baseline_question_bank=baseline_question_bank,
        contact=contact,
        dossier=dossier,
        mode=mode,
    )


def build_demo_report(mode: LoopMode = "deterministic") -> StakeholderReport:
    contact, dossier, transcript, prior_insight_doc, baseline_question_bank = load_demo_inputs(FIXTURES_DIR)
    payload = loop_payload(
        transcript=transcript,
        prior_insight_doc=prior_insight_doc,
        baseline_question_bank=baseline_question_bank,
        contact=contact,
        dossier=dossier,
        mode=mode,
    )
    return build_stakeholder_report(
        loop_result=LoopResult.model_validate(payload["loop_result"]),
        contact=contact,
        dossier=dossier,
        baseline_question_bank=baseline_question_bank,
    )


@app.get("/demo/adaptive-loop")
def demo_adaptive_loop(mode: LoopMode = "deterministic") -> dict[str, Any]:
    return build_demo_loop_payload(mode)


@app.post("/research/run-fixture")
def research_run_fixture(mode: LoopMode = "deterministic") -> dict[str, Any]:
    return build_demo_loop_payload(mode)


@app.post("/research/run-transcript")
def research_run_transcript(
    request: TranscriptLoopRequest,
    mode: LoopMode = "deterministic",
) -> dict[str, Any]:
    return run_transcript_request(request, mode)


@app.get("/demo/report/markdown")
def demo_report_markdown(mode: LoopMode = "deterministic") -> Response:
    report = build_demo_report(mode)
    return Response(
        content=report_to_markdown(report),
        media_type="text/markdown",
    )


@app.get("/demo/report.pdf")
def demo_report_pdf(mode: LoopMode = "deterministic") -> Response:
    report = build_demo_report(mode)
    return Response(
        content=render_report_pdf(report),
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="meridian-discovery-report.pdf"'},
    )


@app.post("/report/from-transcript/markdown")
def report_from_transcript_markdown(
    request: TranscriptLoopRequest,
    mode: LoopMode = "deterministic",
) -> Response:
    report = report_from_transcript_request(request, mode)
    return Response(
        content=report_to_markdown(report),
        media_type="text/markdown",
    )


@app.post("/report/from-transcript.pdf")
def report_from_transcript_pdf(
    request: TranscriptLoopRequest,
    mode: LoopMode = "deterministic",
) -> Response:
    report = report_from_transcript_request(request, mode)
    return Response(
        content=render_report_pdf(report),
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="meridian-discovery-report.pdf"'},
    )


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
