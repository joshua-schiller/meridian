# Meridian — Demo Script & Predetermined Path (Pulse)

The latency-free demo. The whole sequence is **pre-baked** — Meridian already ran
the adaptive loop over 10 internal interviews offline, so at demo time nothing
waits on a model. Live voice is an optional flourish, not the critical path.

---

## The one-line story
> "Meridian conducts internal-customer interviews and turns 10 messy conversations
> into a clear, evidence-backed insight report — research goal in, decision-ready
> report out, no human doing the synthesis."

## The scenario
- **You:** an internal **Platform PM at Lumen** (~600-person company).
- **The product you own:** **Pulse**, an internal analytics platform that teams
  aren't adopting.
- **Research goal:** *"Understand why internal teams aren't adopting Pulse, our
  internal analytics platform."*
- **The interviewees:** 10 **internal customers** (colleagues) across teams.

## The contact list (`fixtures/pulse/contacts.csv`)
Dana Whitfield (Sales Ops) · Marcus Lee (Support) · Priya Raman (Data Eng) ·
Tomás Herrera (Marketing) · Grace Kim (Finance) · Owen Bradley (CSM) ·
Hannah Ortiz (Eng Manager) · Raj Patel (Product Analyst) · Lucia Romano (Ops) ·
Derek Olsen (Regional Sales Dir).

## The pre-baked result (`fixtures/pulse/prebaked/`)
- `sequence.json` — the full computed run: per-interview insight-doc + question-bank
  snapshots, the final living insight document, and metrics.
- `report.md` / `report.pdf` — the stakeholder report.

**Headline numbers:** 10 interviews → **7 confirmed themes**, **11 findings**, **1
genuine contradiction**, question specificity **0.30 → 0.79**.

---

## The presenter script (beat by beat)

### Beat 1 — The problem (10s)
> "I'm a platform PM. I built Pulse, our internal analytics tool, and adoption is
> bad. Normally I'd interview a dozen teammates and then never have time to
> synthesize it. Meridian does the synthesis — and gets sharper every interview."

### Beat 2 — Goal + upload the contacts
*(Show the goal + "upload" `contacts.csv`.)*
> "I give it the research goal and my list of 10 colleagues to talk to."

### Beat 3 — The broad starting plan
*(Show the broad Interview-1 question bank — specificity ~0.30.)*
> "Here's Meridian's first interview plan — broad, generic. 'What makes you reach
> for another tool instead of Pulse?' Specificity about 0.30."

### Beat 4 — It interviews, and the plan sharpens (THE MONEY SHOT)
*(Advance through the 10 interviews; show the question bank sharpening and
specificity climbing 0.30 → 0.79.)*
> "After each interview it rewrites the plan, grounded in what people actually
> said. By the end the questions cross-reference people — listen to this one:"
- Read a final grounded question, e.g.:
  > *"Multiple people told us they picked a dataset in Pulse, got a number that
  > looked wrong, and lost confidence — Grace Kim described a $40K revenue
  > discrepancy, Marcus Lee saw ticket counts that didn't match Zendesk. Has that
  > happened to you?"* (specificity 0.82)
> "That question only exists because it connected Grace and Marcus. Broad → that,
> on its own."

### Beat 5 — The insight page (signal from the mud)
*(Show the living insight document — themes ranked by how many people confirm them.)*
> "10 messy interviews collapse into 7 confirmed patterns:"
- **Stale data makes Pulse unusable** — 9 of 10 people
- **Everyone builds shadow systems** (spreadsheets / own dashboards) — 8 of 10
- **Data mismatches destroy trust** — 7 of 10
- **Query builder too complex** — 6 of 10
- **No data lineage / freshness / plain-language metrics** — 5 of 10
- **Slow performance & timeouts** — 4 of 10
- **Broken access permissions** — 3 of 10
> "And the noise — dark mode, mobile app, naming gripes — correctly did NOT become
> insights."

### Beat 6 — The contradiction
> "It even caught the real tension: the technical power users want *more* — raw
> SQL, an API, higher limits — while the non-technical users want *less* — simple
> pre-built dashboards. Same tool, opposite asks. That's the product decision."

### Beat 7 — The report
*(Open `fixtures/pulse/prebaked/report.pdf`.)*
> "And out comes a stakeholder report — exec summary, findings by confidence, the
> actual quotes, the contradiction, recommended next steps. Goal in, report out."

### Beat 8 — Close
> "No human did the synthesis. Ten conversations became seven evidence-backed
> findings and a decision-ready report — and it ran on Deepgram voice, Claude
> reasoning, and Redis memory."

---

## Optional live-voice flourish (one interview, you play a colleague)
If the room/mic is good, do ONE live interview as e.g. "Marcus (Support)":
1. "We live in Zendesk. Pulse is off to the side — the ticket data in it is hours
   stale, it's not real-time."
2. "And the counts don't match Zendesk, so I don't trust it. Pulse says 340 closed,
   Zendesk says 312. If I can't trust the number I won't put it in front of my VP."
3. "I'd switch if it reconciled exactly and was near-real-time."
(Fallback: the pre-baked path needs no mic.)

---

## How to (re)generate the pre-baked data
```bash
# regenerate contacts/dossiers/CSV
python fixtures/pulse/_gen_contacts.py
# re-run the offline synthesis over all 10 interviews (needs ANTHROPIC_API_KEY)
python fixtures/pulse/_prebake.py
```

## TODO — to be finished (UI, building together)
- [ ] Serve `fixtures/pulse/prebaked/sequence.json` (new endpoint or static import).
- [ ] Guided flow UI: goal + CSV upload → broad plan → animate the 10 interviews →
      insight page (themes ranked by # confirmers) → contradiction → report download.
- [ ] Animations: specificity meter climbing, themes gaining confirmers, the
      grounded-question reveal.
- [ ] Wire a "Download report" button to `prebaked/report.pdf`.

## Coordination note
`fixtures/pulse/` is new content under Joshua's `fixtures/`, and introduces a new
demo narrative (Pulse) + a pre-baked serving path separate from his live
`/demo/run-sequence` engine. Align with Joshua on which demo is *the* demo.
