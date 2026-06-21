"""Emit a TypeScript Campaign object literal (for apps/web/src/lib/campaigns.ts)
from the pre-baked Pulse sequence + transcripts + contacts. Matches the base
Campaign type exactly (no extra fields)."""
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
    return [
        re.sub(r"^[-*]\s*", "", ln).strip()
        for ln in m.group(1).strip().split("\n")
        if ln.strip().startswith(("-", "*"))
    ]


def confirmers(theme):
    return len({q["interviewee"] for f in theme["findings"] for q in f.get("supporting_quotes", [])})


def sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


# Concise one-line summaries for the overview cards (the full body stays on the
# report). Matched to a theme by keyword.
SUMMARIES = [
    (("stale", "freshness"),
     "Pulse data is stale by design — a six-hour sync and multi-day close lags — so teams can't trust it for time-sensitive decisions."),
    (("spreadsheet", "source of truth", "custom-built", "shadow", "workaround"),
     "Teams across the company bypass Pulse, falling back to spreadsheets and self-built dashboards as their real source of truth."),
    (("accuracy", "mismatch", "destroy trust", "bug"),
     "When Pulse numbers don't match the source systems, people stop trusting all of it and rebuild the figures by hand."),
    (("query builder", "too complex"),
     "The query builder overwhelms non-technical users yet boxes in power users — it satisfies neither end of the spectrum."),
    (("lineage", "freshness indicator", "transparency", "plain-language"),
     "Users can't see when data refreshed or trace a number to its source, so they assume the worst and revert to source systems."),
    (("performance", "timeout", "slow"),
     "Full-scale queries lag or time out, so users abandon Pulse mid-task — and the heaviest users suffer the most."),
]


def summarize(label, body):
    low = label.lower()
    for keywords, summary in SUMMARIES:
        if any(k in low for k in keywords):
            return summary
    return body.split(",")[0].split(" — ")[0].strip()


def confidence_from_support(n, total):
    """Real-world interviews rarely confirm every theme. Let the support count
    drive confidence so the scores vary instead of all reading 'High'."""
    if total and n / total >= 0.8:
        return "High"
    if total and n / total >= 0.5:
        return "Medium"
    return "Low"


themes_sorted = sorted(doc["themes"], key=confirmers, reverse=True)
report_findings = [
    {"title": t["label"], "summary": summarize(t["label"], t["findings"][0]["text"]),
     "body": t["findings"][0]["text"],
     "confidence": confidence_from_support(confirmers(t), seq["num_interviews"]),
     "supportCount": confirmers(t)}
    for t in themes_sorted[:6]
]

interviews = []
for p in sorted((HERE / "transcripts").glob("pulse_interview_*.json")):
    tr = json.loads(p.read_text())
    cid = tr["interviewee_id"]
    contact = json.loads((HERE / "contacts" / f"{cid}.json").read_text())
    cands = []
    for turn in tr["turns"]:
        if turn["speaker"] != "interviewee":
            continue
        for s in sentences(turn["text"]):
            if 35 <= len(s) <= 150 and not s.lower().startswith("honestly?"):
                cands.append(s)
    highlights = cands[:3] if cands else [sentences(tr["turns"][1]["text"])[0]]
    interviews.append({
        "id": cid.replace("_", "-"),
        "interviewNumber": tr["interview_number"],
        "participant": contact["name"],
        "role": contact["role"],
        "company": contact["company"],
        "status": "completed",
        "summary": tr["summary"],
        "highlights": highlights,
        "transcript": [
            {"speaker": turn["speaker"], "text": turn["text"]}
            for turn in tr["turns"]
        ],
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
        f"The strongest patterns are {top}. People revert to spreadsheets and source systems because they "
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
