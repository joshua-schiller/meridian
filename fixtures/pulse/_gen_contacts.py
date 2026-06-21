"""Generate Pulse-demo contacts, dossiers, and contacts.csv from one table."""
import csv
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
RESEARCH_GOAL = "Understand why internal teams aren't adopting Pulse, our internal analytics platform."

# id, name, role, email, background, hooks, pains
PEOPLE = [
    ("ic_001", "Dana Whitfield", "Sales Operations Lead", "dana.whitfield@lumen.io",
     "Runs sales ops and lives in pipeline numbers; pragmatic and time-poor.",
     ["Defaults to exporting raw data into a shared team spreadsheet.", "Needs a simple pipeline number fast, not a query builder."],
     ["Query builder too complex for a simple number", "Pulse is slow on real queries"]),
    ("ic_002", "Marcus Lee", "Customer Support Lead", "marcus.lee@lumen.io",
     "Leads support; runs standup off Zendesk dashboards every morning.",
     ["Compares every Pulse number against Zendesk.", "Muted the noisy Pulse Slack alerts."],
     ["Pulse ticket data is hours stale", "Counts don't reconcile with Zendesk"]),
    ("ic_003", "Priya Raman", "Data Engineer", "priya.raman@lumen.io",
     "Owns the ingestion jobs that feed Pulse; sees every problem from the inside.",
     ["Knows the six-hour sync makes data stale by design.", "Aware of a join bug that double-counts."],
     ["Stale-by-design sync", "Known double-count bug", "Flooded with access-request tickets"]),
    ("ic_004", "Tomás Herrera", "Marketing Analyst", "tomas.herrera@lumen.io",
     "Technical marketing power user who reconciles everything by hand.",
     ["Rebuilds reports in Google Sheets he can defend.", "Wants to write raw SQL instead of the query builder."],
     ["Numbers don't match GA / ad spend", "Boxed into the query builder"]),
    ("ic_005", "Grace Kim", "Finance Manager", "grace.kim@lumen.io",
     "Owns reporting that must reconcile to the penny against the general ledger.",
     ["Treats the general ledger as the only source of truth.", "Needs fresh numbers during month-end close."],
     ["Pulse disagrees with the GL", "Data lags during month-end close"]),
    ("ic_006", "Owen Bradley", "Customer Success Manager", "owen.bradley@lumen.io",
     "Manages account health and renewals; needs early churn signals.",
     ["Acts on usage drops the morning they happen.", "Presents health scores in customer QBRs."],
     ["Account health data is days behind", "Account access requires slow data-team tickets"]),
    ("ic_007", "Hannah Ortiz", "Engineering Manager", "hannah.ortiz@lumen.io",
     "Leads an eng team that routes around tools it dislikes.",
     ["Built a self-serve Grafana dashboard off the raw tables.", "Wants an API and raw query access, not a UI."],
     ["No API / raw query access", "Pulse UI lags on real data"]),
    ("ic_008", "Raj Patel", "Product Analyst", "raj.patel@lumen.io",
     "A genuine power user who pushes Pulse to its limits daily.",
     ["Most questions are cross-team and hit permission walls.", "Wants higher query limits, not more guardrails."],
     ["Walled off from cross-team data", "Complex queries time out"]),
    ("ic_009", "Lucia Romano", "Operations Coordinator", "lucia.romano@lumen.io",
     "Non-technical ops coordinator who just wants answers.",
     ["Wants ready-made dashboards she can glance at.", "Finds the metric jargon confusing."],
     ["Query builder is intimidating", "Doesn't recognize the metric names"]),
    ("ic_010", "Derek Olsen", "Regional Sales Director", "derek.olsen@lumen.io",
     "Senior, time-poor sales leader who only checks numbers weekly.",
     ["Wants one simple pre-built summary screen of his region.", "Falls back to asking an analyst."],
     ["Too complex for a non-technical exec", "A report builder is the opposite of what he wants"]),
]

(HERE / "contacts").mkdir(exist_ok=True)
(HERE / "dossiers").mkdir(exist_ok=True)

for cid, name, role, email, background, hooks, pains in PEOPLE:
    contact = {"id": cid, "name": name, "role": role, "company": "Lumen", "background": background}
    dossier = {
        "id": f"dossier_{cid}", "contact_id": cid,
        "summary": f"{name} — {role} at Lumen. {background}",
        "personalization_hooks": hooks, "likely_pain_points": pains,
    }
    (HERE / "contacts" / f"{cid}.json").write_text(json.dumps(contact, indent=2))
    (HERE / "dossiers" / f"{cid}.json").write_text(json.dumps(dossier, indent=2))

with (HERE / "contacts.csv").open("w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["name", "role", "company", "email", "team_focus"])
    for cid, name, role, email, background, hooks, pains in PEOPLE:
        w.writerow([name, role, "Lumen", email, pains[0]])

print(f"Generated {len(PEOPLE)} contacts + dossiers + contacts.csv")
print("research goal:", RESEARCH_GOAL)
