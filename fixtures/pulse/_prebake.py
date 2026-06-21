"""Pre-bake the Pulse demo offline.

Runs an adaptive synthesis loop over all 10 internal interviews using Claude
directly (own schema + validation + retry, so it can't hit Joshua's strict
loop-contract parser). Threads the living insight document forward so themes
CONFIRM and strengthen across interviews, captures a contradiction, and ignores
one-off noise. Saves one static payload the demo serves instantly.
"""
import json
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "packages" / "research_core"))
load_dotenv(ROOT / ".env")

from anthropic import Anthropic  # noqa: E402
from research_core import LivingInsightDocument, QuestionBank, Transcript, Contact, Dossier  # noqa: E402
from research_core.loop import average_specificity  # noqa: E402
from research_core.report import ReportFinding, StakeholderReport, report_to_markdown, render_report_pdf  # noqa: E402

client = Anthropic()
MODEL = "claude-sonnet-4-6"
GOAL = "Understand why internal teams aren't adopting Pulse, our internal analytics platform."

BASELINE_BANK = QuestionBank(
    id="pulse_qbank_interview_1_broad", research_goal=GOAL, interview_number=1,
    for_interviewee="ic_001",
    personalized_opening="I'd love to understand how Pulse fits into your day-to-day.",
    questions=[
        {"id": "q1", "primary": "What makes you reach for another tool instead of Pulse?",
         "rationale_gap": "Broad opener.", "probes": [], "specificity_score": 0.28, "grounding": []},
        {"id": "q2", "primary": "Walk me through the last time you tried to get an answer from Pulse.",
         "rationale_gap": "Broad behavioral prompt.", "probes": [], "specificity_score": 0.32, "grounding": []},
        {"id": "q3", "primary": "What would make Pulse part of your daily workflow?",
         "rationale_gap": "Broad aspiration prompt.", "probes": [], "specificity_score": 0.30, "grounding": []},
    ],
)
INITIAL_DOC = LivingInsightDocument(id="pulse_insight_initial", research_goal=GOAL,
                                    themes=[], open_questions=[], contradictions=[])

SYS = """You are Meridian's adaptive research synthesis engine. You maintain ONE living insight document across many interviews about an internal analytics product called Pulse at a company called Lumen.

You are given the PRIOR insight document (JSON) and ONE new interview transcript. UPDATE the document and produce a sharper next question bank. Return ONLY one JSON object, no markdown fences, matching EXACTLY this schema:

{
  "insight_doc": {
    "id": "snake_case_id",
    "research_goal": "<copy the goal verbatim>",
    "themes": [
      {"id":"snake_case","label":"Short theme label",
       "findings":[{"id":"snake_case","text":"the finding in one sentence","status":"confirmed|challenged|nuanced|open","confidence":"high|medium|low",
         "supporting_quotes":[{"interviewee":"Person Name","quote":"a short exact quote from a transcript"}]}]}
    ],
    "open_questions":["..."],
    "contradictions":[{"between":["Person A","Person B"],"description":"what they disagree about"}]
  },
  "next_question_bank": {
    "id":"snake_case","research_goal":"<verbatim>","interview_number":<int>,"for_interviewee":"<id>",
    "personalized_opening":"one sentence",
    "questions":[{"id":"snake_case","primary":"the question","rationale_gap":"why ask it","probes":[],"specificity_score":<0.0-1.0>,"grounding":["the quote or finding it is grounded in"]}]
  }
}

ACCUMULATION RULES (critical):
- This is a LIVING document. NEVER discard prior themes or quotes. Carry them forward.
- When the new interviewee echoes an EXISTING theme, ADD their quote to that theme's supporting_quotes and RAISE its confidence/status as more people confirm it (open -> nuanced -> confirmed; low -> medium -> high). Findings backed by 3+ different interviewees should be "confirmed" / "high".
- Only create a NEW theme for a genuinely new pattern. Aim for 5 to 7 STRONG, consolidated themes by the end. Actively MERGE closely-related findings into one existing theme instead of creating near-duplicate themes. NEVER exceed 7 themes — if you would add an 8th, merge it into the closest existing theme and add the quote there.
- Contradictions are RARE and must be GENUINE, mutually-exclusive disagreements about what Pulse should BE or DO — NOT differences in priority, role, or which pain point each person feels most. There is essentially ONE real tension in this study: technical power users want MORE power (raw SQL, an API, higher query limits) while non-technical users want LESS (simple pre-built dashboards, no query building). Record that as a SINGLE contradiction and list ALL the relevant names on each side in "between". CARRY THE EXISTING CONTRADICTION FORWARD and add names to it rather than creating new pairwise ones. NEVER exceed 2 contradictions for the entire study.
- IGNORE one-off noise — do not elevate minor offhand gripes (dark mode, mobile app, noisy Slack alerts, metric naming, SSO logouts, Excel formatting) into themes. They are noise, not signal.
- Make the next question bank visibly sharper than the broad start; ground every question in a specific quote/finding; raise specificity_score as evidence accumulates (start ~0.3, climb toward ~0.85).
- statuses: confirmed|challenged|nuanced|open. confidence: high|medium|low. Use snake_case ids."""


def call_json(user, max_tokens=8000, tries=4):
    last = None
    for _ in range(tries):
        resp = client.messages.create(model=MODEL, max_tokens=max_tokens, system=SYS,
                                      messages=[{"role": "user", "content": user}])
        text = resp.content[0].text.strip()
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.M).strip()
        try:
            return json.loads(text)
        except Exception as e:
            last = e
            user += f"\n\nYour last reply was not valid JSON ({e}). Return ONLY one valid JSON object."
    raise RuntimeError(f"JSON failed: {last}")


def synthesize(prior_doc, transcript, contact, next_num, next_id):
    tt = "\n".join(f"{'INTERVIEWER' if t.speaker == 'agent' else contact.name.upper()}: {t.text}"
                   for t in transcript.turns)
    base = (f"PRIOR INSIGHT DOCUMENT:\n{json.dumps(prior_doc.model_dump(mode='json'))}\n\n"
            f"NEW TRANSCRIPT — interviewee {contact.name} ({contact.role}):\n{tt}\n\n"
            f"The next interview is number {next_num} for interviewee id '{next_id}'. "
            "Update the document and return the JSON.")
    user = base
    for _ in range(4):
        data = call_json(user)
        try:
            doc = LivingInsightDocument.model_validate(data["insight_doc"])
            bank = QuestionBank.model_validate(data["next_question_bank"])
            return doc, bank
        except Exception as e:
            user = base + f"\n\nYour JSON failed schema validation: {e}. Fix it to match the schema EXACTLY."
    raise RuntimeError("validation failed after retries")


def main():
    transcripts = [Transcript.model_validate(json.loads(p.read_text()))
                   for p in sorted((HERE / "transcripts").glob("pulse_interview_*.json"))]
    print(f"Loaded {len(transcripts)} transcripts")

    prior, baseline = INITIAL_DOC, BASELINE_BANK
    steps, last_bank = [], BASELINE_BANK
    for i, tr in enumerate(transcripts, 1):
        contact = Contact.model_validate(json.loads((HERE / "contacts" / f"{tr.interviewee_id}.json").read_text()))
        doc, bank = synthesize(prior, tr, contact, i + 1, f"ic_{i + 1:03d}")
        sb, sa = average_specificity(baseline), average_specificity(bank)
        steps.append({
            "interview_number": i,
            "interviewee": {"id": contact.id, "name": contact.name, "role": contact.role},
            "transcript_summary": tr.summary,
            "specificity_before": sb, "specificity_after": sa,
            "grounded_questions": sum(1 for q in bank.questions if q.grounding),
            "theme_count": len(doc.themes),
            "finding_count": sum(len(t.findings) for t in doc.themes),
            "insight_doc": doc.model_dump(mode="json"),
            "question_bank": bank.model_dump(mode="json"),
        })
        print(f"  [{i:2d}] {contact.name:16s} spec {sb:.2f}->{sa:.2f} | themes {len(doc.themes)} "
              f"| findings {steps[-1]['finding_count']} | contradictions {len(doc.contradictions or [])}")
        prior, baseline, last_bank = doc, bank, bank

    final = prior
    # Build a StakeholderReport directly from the final living document.
    confirmed = [t for t in final.themes
                 if any(f.status == "confirmed" or f.confidence == "high" for f in t.findings)]
    key_findings = [ReportFinding(theme_label=t.label, finding=f)
                    for t in (confirmed or final.themes) for f in t.findings]
    evidence = []
    for t in final.themes:
        for f in t.findings:
            for q in (f.supporting_quotes or [])[:1]:
                evidence.append(f'"{q.quote}" — {q.interviewee}')
    narrative = call_json(
        "Return ONLY JSON {\"executive_summary\":[3-5 short bullets], \"recommended_next_steps\":[4-6 concrete action bullets]} "
        f"summarizing this internal-research insight document for a product leader. Goal: {GOAL}\n\n"
        f"{json.dumps(final.model_dump(mode='json'))}", max_tokens=2000)
    report = StakeholderReport(
        title="Pulse Adoption — Discovery Report",
        subtitle=f"Synthesized by Meridian from {len(transcripts)} internal interviews",
        research_goal=GOAL,
        executive_summary=narrative.get("executive_summary", []),
        key_findings=key_findings,
        evidence=evidence[:12],
        contradictions=[c.description for c in (final.contradictions or [])],
        recommended_next_steps=narrative.get("recommended_next_steps", []),
        next_interview_plan=last_bank,
        open_questions=final.open_questions or [],
        methodology=[
            f"Meridian conducted {len(transcripts)} voice interviews with internal Pulse users across teams.",
            "Each transcript updated a living insight document before the next interview plan was generated.",
            "Findings confirmed by multiple interviewees were promoted in confidence; one-off gripes were treated as noise.",
        ],
    )
    report_md = report_to_markdown(report)

    payload = {
        "research_goal": GOAL, "company": "Lumen", "product": "Pulse",
        "num_interviews": len(transcripts),
        "baseline_question_bank": BASELINE_BANK.model_dump(mode="json"),
        "final_insight_doc": final.model_dump(mode="json"),
        "final_question_bank": last_bank.model_dump(mode="json"),
        "steps": steps, "report_markdown": report_md,
        "summary_metrics": {
            "interviews": len(transcripts), "final_themes": len(final.themes),
            "final_findings": sum(len(t.findings) for t in final.themes),
            "contradictions": len(final.contradictions or []),
            "specificity_start": average_specificity(BASELINE_BANK),
            "specificity_final": average_specificity(last_bank),
        },
    }
    out = HERE / "prebaked"
    out.mkdir(exist_ok=True)
    (out / "sequence.json").write_text(json.dumps(payload, indent=2))
    (out / "report.md").write_text(report_md)
    (out / "report.pdf").write_bytes(render_report_pdf(report))
    print("\nSaved prebaked/sequence.json, report.md, report.pdf")
    print("FINAL:", json.dumps(payload["summary_metrics"], indent=2))
    print("\nFINAL THEMES:")
    for t in final.themes:
        n = len({q.interviewee for f in t.findings for q in (f.supporting_quotes or [])})
        print(f"  - {t.label}  ({len(t.findings)} findings, {n} interviewees)")


if __name__ == "__main__":
    main()
