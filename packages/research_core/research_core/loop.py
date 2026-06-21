from __future__ import annotations

from dataclasses import dataclass
from statistics import mean

from .models import (
    Contact,
    Contradiction,
    Dossier,
    Finding,
    InsightTheme,
    LivingInsightDocument,
    LoopEvidence,
    LoopResult,
    Question,
    QuestionBank,
    SupportingQuote,
    Transcript,
)


@dataclass(frozen=True)
class ExtractedFinding:
    id: str
    theme_id: str
    theme_label: str
    text: str
    quote: str
    takeaway: str


def run_adaptive_loop(
    *,
    transcript: Transcript,
    prior_insight_doc: LivingInsightDocument,
    contact: Contact | None = None,
    dossier: Dossier | None = None,
    next_contact: Contact | None = None,
    next_dossier: Dossier | None = None,
    next_interviewee_id: str = "pm_002_pending",
) -> LoopResult:
    findings = extract_findings(transcript)
    updated_insight_doc = update_living_insight_doc(prior_insight_doc, transcript, findings)
    next_question_bank = generate_next_question_bank(
        transcript=transcript,
        updated_insight_doc=updated_insight_doc,
        findings=findings,
        contact=contact,
        dossier=dossier,
        next_contact=next_contact,
        next_dossier=next_dossier,
        next_interviewee_id=next_interviewee_id,
    )
    evidence = link_evidence_to_questions(findings, transcript.interviewee_id)

    return LoopResult(
        id=f"loop_after_interview_{transcript.interview_number:03d}",
        transcript=transcript,
        prior_insight_doc=prior_insight_doc,
        updated_insight_doc=updated_insight_doc,
        next_question_bank=next_question_bank,
        evidence=evidence,
        summary=(
            f"Interview {transcript.interview_number} produced {len(findings)} grounded "
            f"findings and regenerated Interview {next_question_bank.interview_number}'s "
            "question bank with higher specificity."
        ),
    )


def extract_findings(transcript: Transcript) -> list[ExtractedFinding]:
    interviewee_turns = [turn.text for turn in transcript.turns if turn.speaker == "interviewee"]
    text = "\n".join(interviewee_turns).lower()

    candidates = [
        (
            "synthesis_not_scheduling",
            "theme_synthesis",
            "Synthesis, not scheduling, is the bottleneck",
            "PMs can often get customer calls, but they struggle to turn each call into useful follow-up research.",
            "not getting calls",
            "The hard part is not getting calls. We can get customers on the phone.",
            "Scheduling is not the primary blocker; post-call synthesis is.",
        ),
        (
            "questions_stay_broad",
            "theme_question_sharpening",
            "Question banks stay broad for too long",
            "Teams keep asking broad workflow questions after they should be testing sharper hypotheses.",
            "broad questions",
            "We keep asking broad questions for too long.",
            "Next interviews should test whether teams actually sharpen guides between calls.",
        ),
        (
            "context_is_scattered",
            "theme_context_scatter",
            "Context is scattered across tools",
            "Important customer context is split across CRM notes, support threads, docs, and product notes.",
            "context is scattered",
            "Context is scattered. Sales notes live in the CRM, support has Slack threads, I have call notes in docs.",
            "Questioning should probe which source actually shapes the next interview.",
        ),
        (
            "trust_needs_evidence",
            "theme_trust",
            "Trust depends on visible evidence",
            "PMs may accept agent-generated questions if the system shows what changed, why, and which evidence supports it.",
            "show me what changed",
            "Show me what changed, why it changed, and what evidence it came from.",
            "Evidence display is part of the product, not just backend traceability.",
        ),
        (
            "report_needs_decision_support",
            "theme_stakeholder_report",
            "Reports must support decisions",
            "Stakeholders want patterns, confidence, quotes, and the decision each finding supports rather than raw transcripts.",
            "executives need",
            "Executives need the pattern, the confidence level, and a few quotes.",
            "The final report should emphasize confidence, quotes, and recommended decisions.",
        ),
        (
            "decision_memo_cadence",
            "theme_report_cadence",
            "Report cadence needs to match decision speed",
            "Teams may need a fast decision memo after each interview and a fuller stakeholder PDF only after enough evidence accumulates.",
            "24-hour decision memo",
            "We do not need a full PDF after every single call; we need a 24-hour decision memo.",
            "The report flow should distinguish immediate decision support from the final accumulated PDF.",
        ),
    ]

    findings: list[ExtractedFinding] = []
    for candidate in candidates:
        (
            finding_id,
            theme_id,
            theme_label,
            finding_text,
            keyword,
            fallback_quote,
            takeaway,
        ) = candidate
        if keyword in text:
            findings.append(
                ExtractedFinding(
                    id=finding_id,
                    theme_id=theme_id,
                    theme_label=theme_label,
                    text=finding_text,
                    quote=find_best_quote(interviewee_turns, keyword, fallback_quote),
                    takeaway=takeaway,
                )
            )

    return findings


def update_living_insight_doc(
    prior_insight_doc: LivingInsightDocument,
    transcript: Transcript,
    findings: list[ExtractedFinding],
) -> LivingInsightDocument:
    themes_by_id = {theme.id: theme.model_copy(deep=True) for theme in prior_insight_doc.themes}

    for extracted in findings:
        theme = themes_by_id.get(extracted.theme_id)
        if theme is None:
            theme = InsightTheme(id=extracted.theme_id, label=extracted.theme_label, findings=[])
            themes_by_id[extracted.theme_id] = theme

        existing_finding = next(
            (finding for finding in theme.findings if finding.id == extracted.id),
            None,
        )
        if existing_finding is None:
            theme.findings.append(
                Finding(
                    id=extracted.id,
                    text=extracted.text,
                    status="open",
                    confidence="medium",
                    supporting_quotes=[
                        SupportingQuote(interviewee=transcript.interviewee_id, quote=extracted.quote)
                    ],
                )
            )
        else:
            existing_quotes = {
                (quote.interviewee, quote.quote)
                for quote in existing_finding.supporting_quotes
            }
            quote_key = (transcript.interviewee_id, extracted.quote)
            if quote_key not in existing_quotes:
                existing_finding.supporting_quotes.append(
                    SupportingQuote(
                        interviewee=transcript.interviewee_id,
                        quote=extracted.quote,
                    )
                )
            if len({quote.interviewee for quote in existing_finding.supporting_quotes}) >= 2:
                existing_finding.status = "confirmed"
                existing_finding.confidence = "high"

    text = "\n".join(
        turn.text for turn in transcript.turns if turn.speaker == "interviewee"
    ).lower()
    contradictions = list(prior_insight_doc.contradictions)
    if "24-hour decision memo" in text:
        contradiction = Contradiction(
            between=["pm_001", transcript.interviewee_id],
            description=(
                "Maya emphasized a stakeholder-ready PDF with patterns, confidence, and quotes; "
                f"{transcript.interviewee_id} says executives first need a fast decision memo, "
                "with the full PDF after multiple interviews."
            ),
        )
        if not any(item.description == contradiction.description for item in contradictions):
            contradictions.append(contradiction)

        report_theme = themes_by_id.get("theme_stakeholder_report")
        if report_theme is not None:
            for finding in report_theme.findings:
                if finding.id == "report_needs_decision_support":
                    finding.status = "nuanced"
                    finding.confidence = "high"

    open_questions = [
        "Do other PMs also see synthesis as a bigger blocker than recruiting?",
        "How often do teams currently update interview guides between calls?",
        "Which source of scattered customer context actually changes the next interview?",
        "What evidence format makes an AI-generated question bank trustworthy?",
        "What report structure helps executives make a product decision from qualitative research?",
    ]
    if contradictions:
        open_questions.append(
            "Should Meridian produce a fast decision memo after each call and reserve the full PDF for accumulated evidence?"
        )

    return LivingInsightDocument(
        id=f"insight_doc_after_interview_{transcript.interview_number:03d}",
        research_goal=prior_insight_doc.research_goal,
        themes=list(themes_by_id.values()),
        open_questions=open_questions,
        contradictions=contradictions,
    )


def generate_next_question_bank(
    *,
    transcript: Transcript,
    updated_insight_doc: LivingInsightDocument,
    findings: list[ExtractedFinding],
    contact: Contact | None,
    dossier: Dossier | None,
    next_contact: Contact | None,
    next_dossier: Dossier | None,
    next_interviewee_id: str,
) -> QuestionBank:
    interview_number = transcript.interview_number + 1
    next_interviewee_name = next_contact.name.split()[0] if next_contact else None
    completed_interviewee_name = contact.name.split()[0] if contact else None
    hook = first_personalization_hook(next_dossier)
    opening = (
        "I am especially interested in how your team turns one customer conversation "
        "into a sharper next one."
    )
    if next_interviewee_name and completed_interviewee_name and hook:
        opening = (
            f"{next_interviewee_name}, after Interview {transcript.interview_number} "
            f"with {completed_interviewee_name} surfaced synthesis as the blocker, "
            f"I want to compare that with your team. {hook}"
        )
    elif next_interviewee_name and hook:
        opening = (
            f"{next_interviewee_name}, I want to understand how your team turns one "
            f"customer conversation into a sharper next one. {hook}"
        )

    finding_by_id = {finding.id: finding for finding in findings}
    questions = [
        question_from_finding(
            "q1",
            finding_by_id.get("questions_stay_broad"),
            "In your last discovery sprint, what specifically changed in the interview guide after the first call?",
            "Tests whether teams actually sharpen questions after a first interview instead of repeating generic workflow prompts.",
            [
                "Who made that change?",
                "Was the change based on a quote, a theme, or a stakeholder request?",
            ],
            0.78,
        ),
        question_from_finding(
            "q2",
            finding_by_id.get("context_is_scattered"),
            "When customer context is scattered across CRM notes, Slack, docs, and support threads, which source actually shapes the next interview?",
            "Probes whether scattered context is the blocker between interview notes and better follow-up questions.",
            [
                "What information gets ignored because it is hard to find?",
                "What would you need to trust an automated synthesis of those sources?",
            ],
            0.84,
        ),
        question_from_finding(
            "q3",
            finding_by_id.get("trust_needs_evidence"),
            "If an agent proposed the next question bank, what evidence would it need to show before you would approve it?",
            "Tests the trust threshold for agent-generated research artifacts.",
            [
                "Would confidence levels matter?",
                "Would you want direct quotes attached to each new question?",
            ],
            0.81,
        ),
        question_from_finding(
            "q4",
            finding_by_id.get("report_needs_decision_support"),
            "What would make a synthesized discovery report decision-ready for your executives?",
            "Connects the adaptive loop to the final stakeholder-ready PDF report.",
            [
                "What should be in the executive summary?",
                "Which findings need quotes or confidence levels before they are credible?",
            ],
            0.77,
        ),
    ]
    if finding_by_id.get("decision_memo_cadence") is not None:
        questions.append(
            question_from_finding(
                "q5",
                finding_by_id.get("decision_memo_cadence"),
                "When should Meridian produce a fast decision memo versus the full stakeholder PDF?",
                "Tests the newly surfaced cadence nuance: executives may need a 24-hour decision artifact before the accumulated final report.",
                [
                    "Who needs the fast memo?",
                    "What belongs in the memo that should not wait for the full report?",
                ],
                0.88,
            )
        )

    return QuestionBank(
        id=f"question_bank_interview_{interview_number:03d}_generated",
        research_goal=updated_insight_doc.research_goal,
        interview_number=interview_number,
        for_interviewee=next_interviewee_id,
        personalized_opening=opening,
        questions=questions,
    )


def question_from_finding(
    question_id: str,
    finding: ExtractedFinding | None,
    primary: str,
    rationale_gap: str,
    probes: list[str],
    specificity_score: float,
) -> Question:
    grounding = []
    if finding is not None:
        grounding.append(f"{finding.quote} ({finding.takeaway})")

    return Question(
        id=question_id,
        primary=primary,
        rationale_gap=rationale_gap,
        probes=probes,
        specificity_score=specificity_score,
        grounding=grounding,
    )


def link_evidence_to_questions(
    findings: list[ExtractedFinding],
    interviewee_id: str,
) -> list[LoopEvidence]:
    question_for_finding = {
        "questions_stay_broad": "q1",
        "context_is_scattered": "q2",
        "trust_needs_evidence": "q3",
        "report_needs_decision_support": "q4",
        "decision_memo_cadence": "q5",
    }
    return [
        LoopEvidence(
            id=f"evidence_{finding.id}",
            finding_id=finding.id,
            question_id=question_for_finding.get(finding.id),
            interviewee=interviewee_id,
            quote=finding.quote,
            takeaway=finding.takeaway,
        )
        for finding in findings
    ]


def find_best_quote(turns: list[str], keyword: str, fallback: str) -> str:
    for turn in turns:
        if keyword in turn.lower():
            for sentence in turn.split("."):
                if keyword in sentence.lower():
                    cleaned = sentence.strip()
                    return f"{cleaned}." if cleaned else turn
            cleaned = turn.strip()
            return cleaned if cleaned.endswith(".") else f"{cleaned}."
    return fallback


def first_personalization_hook(dossier: Dossier | None) -> str | None:
    if dossier is None or not dossier.personalization_hooks:
        return None
    return dossier.personalization_hooks[0]


def average_specificity(question_bank: QuestionBank) -> float:
    if not question_bank.questions:
        return 0.0
    return mean(question.specificity_score for question in question_bank.questions)
