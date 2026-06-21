from __future__ import annotations

from dataclasses import dataclass
from html import escape
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from .models import Contact, Dossier, Finding, LoopResult, QuestionBank


@dataclass(frozen=True)
class ReportFinding:
    theme_label: str
    finding: Finding


@dataclass(frozen=True)
class StakeholderReport:
    title: str
    subtitle: str
    research_goal: str
    executive_summary: list[str]
    key_findings: list[ReportFinding]
    evidence: list[str]
    next_interview_plan: QuestionBank
    open_questions: list[str]
    methodology: list[str]


def build_stakeholder_report(
    *,
    loop_result: LoopResult,
    contact: Contact | None = None,
    dossier: Dossier | None = None,
    baseline_question_bank: QuestionBank | None = None,
) -> StakeholderReport:
    transcript = loop_result.transcript
    key_findings = [
        ReportFinding(theme_label=theme.label, finding=finding)
        for theme in loop_result.updated_insight_doc.themes
        for finding in theme.findings
    ]
    evidence_quotes = [
        f'"{item.quote}" - {item.interviewee}. Takeaway: {item.takeaway}'
        for item in loop_result.evidence[:5]
    ]
    if not evidence_quotes:
        evidence_quotes = [
            f'"{quote.quote}" - {quote.interviewee}.'
            for item in key_findings
            for quote in item.finding.supporting_quotes[:1]
        ][:5]

    next_plan = loop_result.next_question_bank
    company_context = ""
    if contact is not None:
        company_context = f" with {contact.name}, {contact.role} at {contact.company}"

    baseline_note = ""
    if baseline_question_bank is not None:
        baseline_note = (
            f" The first AI interview plan had {len(baseline_question_bank.questions)} "
            f"broad questions; the next plan has {len(next_plan.questions)} questions "
            "grounded in transcript evidence."
        )

    dossier_note = ""
    if dossier is not None and dossier.personalization_hooks:
        dossier_note = f" Dossier context used for personalization: {dossier.personalization_hooks[0]}"

    return StakeholderReport(
        title="Meridian Discovery Report",
        subtitle=f"Generated after Interview {transcript.interview_number}{company_context}",
        research_goal=transcript.research_goal,
        executive_summary=[
            (
                "Meridian used the interview transcript as the seam for the autonomous interview loop, "
                "synthesized what changed, and regenerated the AI interviewer's next-call plan."
            ),
            (
                "The strongest signal is that discovery calls are not the main bottleneck; "
                "turning each call into sharper follow-up research is."
            ),
            (
                "The next interview should focus on synthesis behavior, scattered context, "
                "and what evidence makes an AI-led interview plan trustworthy."
            )
            + baseline_note
            + dossier_note,
        ],
        key_findings=key_findings,
        evidence=evidence_quotes,
        next_interview_plan=next_plan,
        open_questions=loop_result.updated_insight_doc.open_questions,
        methodology=[
            f"Transcript seam: {transcript.id} ({transcript.source}).",
            "Synthesis output: updated living insight document with findings, confidence, and evidence.",
            (
                "Adaptive output: next question bank treated as the AI interviewer's plan "
                f"for Interview {next_plan.interview_number}."
            ),
        ],
    )


def build_sequence_report(
    *,
    loop_results: list[LoopResult],
    contacts: list[Contact] | None = None,
    baseline_question_bank: QuestionBank | None = None,
) -> StakeholderReport:
    if not loop_results:
        raise ValueError("At least one loop result is required.")

    final_result = loop_results[-1]
    final_doc = final_result.updated_insight_doc
    key_findings = [
        ReportFinding(theme_label=theme.label, finding=finding)
        for theme in final_doc.themes
        for finding in theme.findings
    ]
    evidence_quotes = [
        f'"{item.quote}" - {item.interviewee}. Takeaway: {item.takeaway}'
        for result in loop_results
        for item in result.evidence
    ][:8]
    if not evidence_quotes:
        evidence_quotes = [
            f'"{quote.quote}" - {quote.interviewee}.'
            for item in key_findings
            for quote in item.finding.supporting_quotes[:2]
        ][:8]

    confirmed_findings = sum(
        1 for item in key_findings if item.finding.status == "confirmed"
    )
    contact_by_id = {contact.id: contact for contact in contacts or []}
    interview_notes = []
    for result in loop_results:
        transcript = result.transcript
        contact = contact_by_id.get(transcript.interviewee_id)
        interviewee = contact.name if contact else transcript.interviewee_id
        interview_notes.append(
            f"Interview {transcript.interview_number}: Meridian interviewed {interviewee} "
            f"and produced {len(result.evidence)} evidence links."
        )

    plan_evolution = [
        (
            f"Interview {result.transcript.interview_number} transcript -> "
            f"Interview {result.next_question_bank.interview_number} AI plan "
            f"({len(result.next_question_bank.questions)} questions)."
        )
        for result in loop_results
    ]
    baseline_note = ""
    if baseline_question_bank is not None:
        baseline_note = (
            f" The starting AI plan had {len(baseline_question_bank.questions)} broad questions; "
            f"the final plan has {len(final_result.next_question_bank.questions)} evidence-grounded questions."
        )

    return StakeholderReport(
        title="Meridian Discovery Report",
        subtitle=(
            f"Generated after {len(loop_results)} Meridian-conducted interviews"
        ),
        research_goal=final_result.transcript.research_goal,
        executive_summary=[
            (
                "Meridian ran an adaptive interview sequence: each transcript updated the living "
                "insight document before the next AI interview plan was generated."
            ),
            (
                f"Across {len(loop_results)} interviews, {confirmed_findings} findings are now "
                "confirmed by multiple interviewees, strengthening the discovery signal."
            ),
            (
                "The strongest pattern remains that PMs can often get calls, but synthesis, "
                "context retrieval, and trust in evidence-backed follow-up questions break the loop."
            )
            + baseline_note,
        ],
        key_findings=key_findings,
        evidence=evidence_quotes,
        next_interview_plan=final_result.next_question_bank,
        open_questions=final_doc.open_questions,
        methodology=[
            *interview_notes,
            *plan_evolution,
            "Redis memory stores the living insight document and loop artifacts between interviews when configured.",
            "The question bank is Meridian's next AI interview plan, not a human interview guide.",
        ],
    )


def report_to_markdown(report: StakeholderReport) -> str:
    lines = [
        f"# {report.title}",
        "",
        report.subtitle,
        "",
        "## Research Goal",
        report.research_goal,
        "",
        "## Executive Summary",
    ]
    lines.extend(f"- {item}" for item in report.executive_summary)
    lines.extend(["", "## Key Findings"])

    for item in report.key_findings:
        lines.append(
            f"- **{item.theme_label}** ({item.finding.status}, {item.finding.confidence} confidence): "
            f"{item.finding.text}"
        )

    lines.extend(["", "## Evidence Quotes"])
    lines.extend(f"- {quote}" for quote in report.evidence)

    lines.extend(["", "## Next AI Interview Plan"])
    lines.append(report.next_interview_plan.personalized_opening)
    lines.append("")
    for index, question in enumerate(report.next_interview_plan.questions, start=1):
        lines.append(f"{index}. {question.primary}")
        lines.append(f"   - Why this question: {question.rationale_gap}")
        if question.grounding:
            lines.append(f"   - Grounded in: {question.grounding[0]}")

    lines.extend(["", "## Open Questions"])
    lines.extend(f"- {question}" for question in report.open_questions)

    lines.extend(["", "## Methodology"])
    lines.extend(f"- {item}" for item in report.methodology)
    lines.append("")
    return "\n".join(lines)


def render_report_pdf(report: StakeholderReport) -> bytes:
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.65 * inch,
        leftMargin=0.65 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
        title=report.title,
    )
    styles = build_styles()
    story: list[object] = [
        Paragraph(escape(report.title), styles["Title"]),
        Paragraph(escape(report.subtitle), styles["Subtitle"]),
        Spacer(1, 0.18 * inch),
        section_heading("Research Goal", styles),
        body_paragraph(report.research_goal, styles),
        section_heading("Executive Summary", styles),
    ]

    for item in report.executive_summary:
        story.append(bullet_paragraph(item, styles))

    story.append(section_heading("Key Findings", styles))
    for item in report.key_findings[:8]:
        story.append(
            bullet_paragraph(
                f"{item.theme_label} ({item.finding.status}, {item.finding.confidence} confidence): "
                f"{item.finding.text}",
                styles,
            )
        )

    story.append(section_heading("Evidence Quotes", styles))
    for quote in report.evidence[:5]:
        story.append(bullet_paragraph(quote, styles))

    story.append(section_heading("Next AI Interview Plan", styles))
    story.append(body_paragraph(report.next_interview_plan.personalized_opening, styles))
    for index, question in enumerate(report.next_interview_plan.questions[:6], start=1):
        story.append(body_paragraph(f"{index}. {question.primary}", styles, bold=True))
        story.append(body_paragraph(f"Why this question: {question.rationale_gap}", styles))
        if question.grounding:
            story.append(body_paragraph(f"Grounded in: {question.grounding[0]}", styles))
        story.append(Spacer(1, 0.06 * inch))

    story.append(section_heading("Open Questions", styles))
    for question in report.open_questions[:6]:
        story.append(bullet_paragraph(question, styles))

    story.append(section_heading("Methodology", styles))
    for item in report.methodology:
        story.append(bullet_paragraph(item, styles))

    document.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)
    return buffer.getvalue()


def build_styles() -> dict[str, ParagraphStyle]:
    base_styles = getSampleStyleSheet()
    return {
        "Title": ParagraphStyle(
            "MeridianTitle",
            parent=base_styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=27,
            textColor=colors.HexColor("#0b4544"),
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "Subtitle": ParagraphStyle(
            "MeridianSubtitle",
            parent=base_styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#657287"),
            alignment=TA_CENTER,
        ),
        "Section": ParagraphStyle(
            "MeridianSection",
            parent=base_styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#18212f"),
            spaceBefore=13,
            spaceAfter=5,
        ),
        "Body": ParagraphStyle(
            "MeridianBody",
            parent=base_styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#18212f"),
            spaceAfter=5,
        ),
        "BodyBold": ParagraphStyle(
            "MeridianBodyBold",
            parent=base_styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#18212f"),
            spaceAfter=4,
        ),
    }


def section_heading(text: str, styles: dict[str, ParagraphStyle]) -> Paragraph:
    return Paragraph(escape(text), styles["Section"])


def body_paragraph(text: str, styles: dict[str, ParagraphStyle], *, bold: bool = False) -> Paragraph:
    style = styles["BodyBold"] if bold else styles["Body"]
    return Paragraph(escape(text), style)


def bullet_paragraph(text: str, styles: dict[str, ParagraphStyle]) -> Paragraph:
    return Paragraph(f"&bull; {escape(text)}", styles["Body"])


def draw_footer(canvas, document) -> None:  # type: ignore[no-untyped-def]
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#d8e0ea"))
    canvas.line(document.leftMargin, 0.45 * inch, letter[0] - document.rightMargin, 0.45 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#657287"))
    canvas.drawString(document.leftMargin, 0.28 * inch, "Meridian - autonomous discovery interviewer")
    canvas.drawRightString(
        letter[0] - document.rightMargin,
        0.28 * inch,
        f"Page {document.page}",
    )
    canvas.restoreState()
