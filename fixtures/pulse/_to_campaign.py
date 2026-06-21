"""Emit a TypeScript Campaign object literal (for apps/web/src/lib/campaigns.ts)
from the pre-baked Pulse sequence + transcripts + contacts."""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
seq = json.loads((HERE / "prebaked" / "sequence.json").read_text())
report_md = seq["report_markdown"]
doc = seq["final_insight_doc"]


def md_section(title):
    m = re.search(rf"## {re.escape(title)}\n(.*?)(?:\n## |\Z)", report_md, re.S)
    if not m:
        return []
    return [re.sub(r"^[-*]\s*", "", ln).strip() for ln in m.group(1).strip().split("\n") if ln.strip().startswith(("-", "*"))]


# Findings for the report: top themes (most confirmers first)
def confirmers(theme):
    return len({q["interviewee"] for f in theme["findings"] for q in f.get("supporting_quotes", [])})


themes_sorted = sorted(doc["themes"], key=confirmers, reverse=True)
report_findings = []
for t in themes_sorted[:6]:
    f0 = t["findings"][0]
    conf = (f0.get("confidence") or "medium").capitalize()
    report_findings.append({"title": t["label"], "body": f0["text"], "confidence": conf})

# Interviews from transcripts + contacts
interviews = []
for p in sorted((HERE / "transcripts").glob("pulse_interview_*.json")):
    tr = json.loads(p.read_text())
    cid = tr["interviewee_id"]
    contact = json.loads((HERE / "contacts" / f"{cid}.json").read_text())
    quotes = [t["text"] for t in tr["turns"] if t["speaker"] == "interviewee"]
    # pick 2 punchy quotes (shortish, content-rich)
    highlights = []
    for q in quotes:
        s = q.strip()
        if 40 <= len(s) <= 180:
            highlights.append(s)
        if len(highlights) == 2:
            break
    if len(highlights) < 2:
        highlights = [q[:160] for q in quotes[:2]]
    interviews.append({
        "id": cid.replace("_", "-"),
        "interviewNumber": tr["interview_number"],
        "participant": contact["name"],
        "role": contact["role"],
        "company": contact["company"],
        "status": "completed",
        "summary": tr["summary"],
        "highlights": highlights,
    })

top = ", ".join(f'{t["label"].lower()} ({confirmers(t)}/10)' for t in themes_sorted[:3])
campaign = {
    "id": "pulse-adoption",
    "title": "Pulse adoption",
    "oneLineGoal": seq["research_goal"],
    "completedInterviews": seq["num_interviews"],
    "totalInterviews": seq["num_interviews"],
    "contactsFileName": "pulse-contacts.csv",
    "supportingDocumentNames": ["pulse-overview.pdf"],
    "questionCount": len(seq["baseline_question_bank"]["questions"]),
    "highLevelFindings": (
        f"Across {seq['num_interviews']} internal interviews, adoption fails on trust, not features. "
        f"The strongest patterns: {top}. People revert to spreadsheets and source systems because they "
        "don't believe Pulse's numbers."
    ),
    "interviews": interviews,
    "report": {
        "executiveSummary": " ".join(md_section("Executive Summary")) or seq["research_goal"],
        "findings": report_findings,
        "contradictions": [c["description"] for c in doc.get("contradictions", [])],
        "recommendedNextSteps": md_section("Recommended Next Steps"),
        "methodology": (
            f"Meridian conducted {seq['num_interviews']} voice interviews with internal Pulse users across teams. "
            "Each transcript updated a living insight document before the next interview plan was generated; "
            "findings confirmed by multiple people were promoted in confidence and one-off gripes treated as noise."
        ),
    },
}

print(json.dumps(campaign, indent=4, ensure_ascii=False))
