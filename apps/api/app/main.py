from pathlib import Path
from typing import Any
import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
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
from research_core.fixture_io import load_demo_inputs, load_demo_sequence_inputs
from research_core.loop import average_specificity
from research_core.pipeline import resolve_mode, run_loop
from research_core.report import (
    StakeholderReport,
    build_sequence_report,
    build_stakeholder_report,
    render_report_pdf,
    report_to_markdown,
)
from .deepgram_voice import router as voice_router
from .redis_memory import (
    DisabledResearchMemory,
    MemoryRead,
    MemoryWrite,
    ResearchMemory,
    build_memory_store,
    session_id_for_goal,
)

load_dotenv()


ROOT_DIR = Path(__file__).resolve().parents[3]
FIXTURES_DIR = ROOT_DIR / "fixtures"
DEFAULT_CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]


def parse_cors_allowed_origins(raw_origins: str | None) -> list[str]:
    if not raw_origins:
        return DEFAULT_CORS_ALLOWED_ORIGINS.copy()

    return [
        origin.strip().rstrip("/")
        for origin in raw_origins.split(",")
        if origin.strip()
    ]

app = FastAPI(
    title="Meridian API",
    summary="Transcript-first discovery loop API skeleton.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_allowed_origins(os.environ.get("CORS_ALLOWED_ORIGINS")),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(voice_router)


class TranscriptLoopRequest(BaseModel):
    transcript: Transcript
    session_id: str | None = None
    next_interviewee_id: str | None = None
    next_contact: Contact | None = None
    next_dossier: Dossier | None = None
    prior_insight_doc: LivingInsightDocument | None = None
    baseline_question_bank: QuestionBank | None = None
    contact: Contact | None = None
    dossier: Dossier | None = None


class LoopReportRequest(BaseModel):
    loop_result: LoopResult
    contact: Contact | None = None
    dossier: Dossier | None = None
    baseline_question_bank: QuestionBank | None = None


memory_store: ResearchMemory = build_memory_store()


def get_memory_store() -> ResearchMemory:
    return memory_store


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
    session_id: str,
    memory_read: MemoryRead,
    memory_store: ResearchMemory,
    persist_memory: bool,
    next_interviewee_id: str = "pm_002_pending",
    next_contact: Contact | None = None,
    next_dossier: Dossier | None = None,
) -> dict[str, Any]:
    requested_mode = mode
    resolved_mode = resolve_mode(mode)
    fallback_reason: str | None = None

    try:
        result = run_loop(
            transcript=transcript,
            prior_insight_doc=prior_insight_doc,
            contact=contact,
            dossier=dossier,
            next_contact=next_contact,
            next_dossier=next_dossier,
            mode=mode,
            next_interviewee_id=next_interviewee_id,
        )
    except ClaudeLoopError as exc:
        if mode != "auto":
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        result = run_loop(
            transcript=transcript,
            prior_insight_doc=prior_insight_doc,
            contact=contact,
            dossier=dossier,
            next_contact=next_contact,
            next_dossier=next_dossier,
            mode="deterministic",
            next_interviewee_id=next_interviewee_id,
        )
        resolved_mode = "deterministic"
        fallback_reason = f"Claude loop failed; auto mode used deterministic fallback: {exc}"

    if requested_mode == "auto" and resolved_mode == "deterministic" and fallback_reason is None:
        fallback_reason = "ANTHROPIC_API_KEY missing; auto mode used deterministic fallback."

    memory_write = MemoryWrite(
        enabled=memory_read.enabled,
        provider=memory_read.provider,
        session_id=session_id,
        status="skipped",
        persisted=False,
    )
    if persist_memory:
        memory_write = memory_store.persist(
            session_id=session_id,
            loop_result=result,
            baseline_question_bank=baseline_question_bank,
        )

    return {
        "transcript": transcript.model_dump(mode="json"),
        "insight_doc_before": prior_insight_doc.model_dump(mode="json"),
        "insight_doc_after": result.updated_insight_doc.model_dump(mode="json"),
        "question_bank_before": baseline_question_bank.model_dump(mode="json"),
        "question_bank_after": result.next_question_bank.model_dump(mode="json"),
        "loop_result": result.model_dump(mode="json"),
        "memory": {
            "session_id": session_id,
            "read": memory_read.to_payload(),
            "write": memory_write.to_payload(),
        },
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
            "mode": resolved_mode,
            "requested_mode": requested_mode,
            "resolved_mode": resolved_mode,
            "fallback_reason": fallback_reason,
            "memory_reads": 1 if memory_read.enabled else 0,
            "memory_writes": 1 if memory_write.persisted else 0,
            "retrieved_context_items": memory_read.retrieved_context_items,
            "persisted": memory_write.persisted,
        },
    }


def request_context(
    request: TranscriptLoopRequest,
    memory_store: ResearchMemory,
) -> tuple[Contact, Dossier, LivingInsightDocument, QuestionBank, str, MemoryRead]:
    default_contact, default_dossier, _, default_prior_doc, default_baseline_bank = load_demo_inputs(
        FIXTURES_DIR
    )
    session_id = request.session_id or session_id_for_goal(request.transcript.research_goal)
    memory_read = memory_store.retrieve(
        session_id=session_id,
        research_goal=request.transcript.research_goal,
    )
    prior_insight_doc = request.prior_insight_doc or memory_read.insight_doc or default_prior_doc
    return (
        request.contact or default_contact,
        request.dossier or default_dossier,
        prior_insight_doc,
        request.baseline_question_bank or default_baseline_bank,
        session_id,
        memory_read,
    )


def run_transcript_request(
    request: TranscriptLoopRequest,
    mode: LoopMode,
    *,
    persist_memory: bool = True,
) -> dict[str, Any]:
    store = get_memory_store()
    contact, dossier, prior_insight_doc, baseline_question_bank, session_id, memory_read = request_context(
        request,
        store,
    )
    next_interviewee_id = (
        request.next_interviewee_id
        or (request.next_contact.id if request.next_contact else None)
        or "pm_002_pending"
    )
    return loop_payload(
        transcript=request.transcript,
        prior_insight_doc=prior_insight_doc,
        baseline_question_bank=baseline_question_bank,
        contact=contact,
        dossier=dossier,
        mode=mode,
        session_id=session_id,
        memory_read=memory_read,
        memory_store=store,
        persist_memory=persist_memory,
        next_interviewee_id=next_interviewee_id,
        next_contact=request.next_contact,
        next_dossier=request.next_dossier,
    )


def report_from_transcript_request(
    request: TranscriptLoopRequest,
    mode: LoopMode,
) -> StakeholderReport:
    payload = run_transcript_request(request, mode)
    contact, dossier, _, baseline_question_bank, _, _ = request_context(
        request,
        DisabledResearchMemory("Report rendering already has a loop payload."),
    )
    return build_stakeholder_report(
        loop_result=LoopResult.model_validate(payload["loop_result"]),
        contact=contact,
        dossier=dossier,
        baseline_question_bank=baseline_question_bank,
    )


def report_from_loop_result_request(request: LoopReportRequest) -> StakeholderReport:
    default_contact, default_dossier, _, _, default_baseline_bank = load_demo_inputs(FIXTURES_DIR)
    return build_stakeholder_report(
        loop_result=request.loop_result,
        contact=request.contact or default_contact,
        dossier=request.dossier or default_dossier,
        baseline_question_bank=request.baseline_question_bank or default_baseline_bank,
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
    session_id = session_id_for_goal(transcript.research_goal)
    store = get_memory_store()
    memory_read = store.retrieve(
        session_id=session_id,
        research_goal=transcript.research_goal,
    )
    return loop_payload(
        transcript=transcript,
        prior_insight_doc=memory_read.insight_doc or prior_insight_doc,
        baseline_question_bank=baseline_question_bank,
        contact=contact,
        dossier=dossier,
        mode=mode,
        session_id=session_id,
        memory_read=memory_read,
        memory_store=store,
        persist_memory=False,
    )


def build_demo_report(mode: LoopMode = "deterministic") -> StakeholderReport:
    contact, dossier, transcript, prior_insight_doc, baseline_question_bank = load_demo_inputs(FIXTURES_DIR)
    session_id = session_id_for_goal(transcript.research_goal)
    store = get_memory_store()
    memory_read = store.retrieve(
        session_id=session_id,
        research_goal=transcript.research_goal,
    )
    payload = loop_payload(
        transcript=transcript,
        prior_insight_doc=memory_read.insight_doc or prior_insight_doc,
        baseline_question_bank=baseline_question_bank,
        contact=contact,
        dossier=dossier,
        mode=mode,
        session_id=session_id,
        memory_read=memory_read,
        memory_store=store,
        persist_memory=False,
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
    contact, dossier, transcript, prior_insight_doc, baseline_question_bank = load_demo_inputs(FIXTURES_DIR)
    session_id = session_id_for_goal(transcript.research_goal)
    store = get_memory_store()
    memory_read = store.retrieve(
        session_id=session_id,
        research_goal=transcript.research_goal,
    )
    return loop_payload(
        transcript=transcript,
        prior_insight_doc=memory_read.insight_doc or prior_insight_doc,
        baseline_question_bank=baseline_question_bank,
        contact=contact,
        dossier=dossier,
        mode=mode,
        session_id=session_id,
        memory_read=memory_read,
        memory_store=store,
        persist_memory=True,
    )


@app.post("/research/run-transcript")
def research_run_transcript(
    request: TranscriptLoopRequest,
    mode: LoopMode = "deterministic",
) -> dict[str, Any]:
    return run_transcript_request(request, mode)


@app.get("/demo/state")
def demo_state() -> dict[str, Any]:
    _, _, transcript, _, _ = load_demo_inputs(FIXTURES_DIR)
    return get_memory_store().snapshot(
        session_id=session_id_for_goal(transcript.research_goal)
    )


@app.get("/research/sessions/{session_id}")
def research_session_state(session_id: str) -> dict[str, Any]:
    return get_memory_store().snapshot(session_id=session_id)


@app.delete("/research/sessions/{session_id}")
def research_session_reset(session_id: str) -> dict[str, Any]:
    store = get_memory_store()
    reset = store.reset(session_id=session_id)
    return {
        "session_id": session_id,
        "reset": reset.to_payload(),
        "state": store.snapshot(session_id=session_id),
    }


@app.post("/demo/reset")
def demo_reset(session_id: str | None = None) -> dict[str, Any]:
    _, _, transcripts, _, _ = load_demo_sequence_inputs(FIXTURES_DIR)
    base_session_id = session_id_for_goal(transcripts[0].research_goal)
    session_ids = [session_id] if session_id else [base_session_id, f"{base_session_id}-sequence"]
    store = get_memory_store()
    resets = [store.reset(session_id=item).to_payload() for item in session_ids]
    return {
        "session_ids": session_ids,
        "resets": resets,
        "states": {item: store.snapshot(session_id=item) for item in session_ids},
    }


def build_demo_sequence_payload(
    *,
    mode: LoopMode,
    session_id: str | None = None,
    persist_memory: bool = True,
) -> dict[str, Any]:
    contacts, dossiers, transcripts, initial_doc, baseline_bank = load_demo_sequence_inputs(
        FIXTURES_DIR
    )
    store = get_memory_store()
    sequence_session_id = session_id or f"{session_id_for_goal(transcripts[0].research_goal)}-sequence"

    loop_payloads: list[dict[str, Any]] = []
    loop_results: list[LoopResult] = []
    prior_doc = initial_doc
    current_baseline_bank = baseline_bank
    for index, transcript in enumerate(transcripts):
        next_contact = contacts[index + 1] if index + 1 < len(contacts) else None
        next_dossier = dossiers[index + 1] if index + 1 < len(dossiers) else None
        next_interviewee_id = next_contact.id if next_contact else f"pm_{transcript.interview_number + 1:03d}_pending"
        memory_read = store.retrieve(
            session_id=sequence_session_id,
            research_goal=transcript.research_goal,
        )
        payload = loop_payload(
            transcript=transcript,
            prior_insight_doc=memory_read.insight_doc or prior_doc,
            baseline_question_bank=current_baseline_bank,
            contact=contacts[index],
            dossier=dossiers[index],
            mode=mode,
            session_id=sequence_session_id,
            memory_read=memory_read,
            memory_store=store,
            persist_memory=persist_memory,
            next_interviewee_id=next_interviewee_id,
            next_contact=next_contact,
            next_dossier=next_dossier,
        )
        result = LoopResult.model_validate(payload["loop_result"])
        loop_payloads.append(payload)
        loop_results.append(result)
        prior_doc = result.updated_insight_doc
        current_baseline_bank = QuestionBank.model_validate(payload["question_bank_after"])

    final_result = loop_results[-1]
    report = build_sequence_report(
        loop_results=loop_results,
        contacts=contacts,
        baseline_question_bank=baseline_bank,
    )

    return {
        "session_id": sequence_session_id,
        "contacts": [contact.model_dump(mode="json") for contact in contacts],
        "loops": loop_payloads,
        "report_markdown": report_to_markdown(report),
        "memory_state": store.snapshot(session_id=sequence_session_id),
        "metrics": {
            "interviews_run": len(loop_results),
            "final_findings": sum(
                len(theme.findings) for theme in final_result.updated_insight_doc.themes
            ),
            "confirmed_findings": sum(
                1
                for theme in final_result.updated_insight_doc.themes
                for finding in theme.findings
                if finding.status == "confirmed"
            ),
            "nuanced_findings": sum(
                1
                for theme in final_result.updated_insight_doc.themes
                for finding in theme.findings
                if finding.status == "nuanced"
            ),
            "contradictions": len(final_result.updated_insight_doc.contradictions),
            "memory_read_statuses": [
                payload["memory"]["read"]["status"] for payload in loop_payloads
            ],
            "memory_write_statuses": [
                payload["memory"]["write"]["status"] for payload in loop_payloads
            ],
            "retrieved_context_items": [
                payload["metrics"]["retrieved_context_items"] for payload in loop_payloads
            ],
        },
    }


@app.post("/demo/run-sequence")
def demo_run_sequence(
    mode: LoopMode = "deterministic",
    session_id: str | None = None,
) -> dict[str, Any]:
    return build_demo_sequence_payload(mode=mode, session_id=session_id)


@app.post("/demo/run-sequence/report.pdf")
def demo_run_sequence_report_pdf(
    mode: LoopMode = "deterministic",
    session_id: str | None = None,
) -> Response:
    payload = build_demo_sequence_payload(mode=mode, session_id=session_id)
    loop_results = [
        LoopResult.model_validate(loop_payload_item["loop_result"])
        for loop_payload_item in payload["loops"]
    ]
    contacts = [Contact.model_validate(contact) for contact in payload["contacts"]]
    _, _, _, _, baseline_bank = load_demo_sequence_inputs(FIXTURES_DIR)
    report = build_sequence_report(
        loop_results=loop_results,
        contacts=contacts,
        baseline_question_bank=baseline_bank,
    )
    return Response(
        content=render_report_pdf(report),
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="meridian-sequence-report.pdf"'},
    )


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


@app.post("/report/from-loop-result/markdown")
def report_from_loop_result_markdown(request: LoopReportRequest) -> Response:
    report = report_from_loop_result_request(request)
    return Response(
        content=report_to_markdown(report),
        media_type="text/markdown",
    )


@app.post("/report/from-loop-result.pdf")
def report_from_loop_result_pdf(request: LoopReportRequest) -> Response:
    report = report_from_loop_result_request(request)
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
