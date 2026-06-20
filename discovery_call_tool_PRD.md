# PRD — Discovery Call Automation Tool

**Event:** UC Berkeley AI Hackathon 2026 (June 20–22) · **Team size:** 2 · **Track:** Ddoski's Toolbox
**Primary win target:** Deepgram. Secondary: Redis, then other stackable sponsors + main track.
**One-liner:** *Discovery research that gets smarter with every interview — an autonomous PM research agent that adapts its questions based on what it learned from the last call.*

---

## 1. Problem & Target User

Discovery calls are one of the most tedious, time-consuming parts of the PM workflow: finding people, preparing questions, conducting the call while taking notes, synthesizing across interviews, and — the step that almost never happens — sharpening the questions between calls based on what was just learned.

**Target user:** internal PMs at technology companies running qualitative discovery research. Non-technical to moderately technical; should never need an engineer to use it.

**Core insight this product is built on:** the adaptive synthesis loop (each interview informing the next) is the highest-value part of qualitative research and the part time pressure always kills. Automate *that*, and the whole process stops being skipped or done superficially.

---

## 2. Goal & Success Criteria

Build an autonomous loop that takes a PM from a stated research goal to a structured PDF insight report, with the question bank visibly evolving between interviews.

**What winning looks like at judging:**
1. A **live voice interview** runs end to end on Deepgram, including a graceful barge-in and a personalized opening — proving best-in-class voice usage (the Deepgram bar).
2. The **money shot**: Interview 1's question bank and Interview 2's question bank shown side by side, with Interview 2 visibly sharper and grounded in what Interview 1 revealed. This single visual proves the entire thesis.
3. A **stakeholder-ready PDF report** generated live from the accumulated insights.

If only #2 and #3 work, we still have a winning main-track demo. If only the voice works but the loop is flat, we lose. **The adaptive loop is the product; voice is the vehicle.**

---

## 3. Core Differentiator

Existing tools each cover one slice — outreach (Apollo, Clay), scheduling (Calendly), transcription (Otter, Fireflies), synthesis (Dovetail). None close the loop from research goal to final report **with adaptive questioning between interviews.** Our four-part novelty:

- **Adaptive questioning loop** — the interview instrument evolves throughout the research, not fixed at the start.
- **Living insight document** — one document that updates after every interview (adds, refines, challenges prior findings) instead of a pile of transcripts a human reconciles later.
- **Personalized interview prep** — a context dossier per interviewee drives a personalized opening and tailored questions. *(Offline/pre-built for the hackathon — see §6.)*
- **Full end-to-end automation** — research goal in, report out, no human in the middle of the loop.

---

## 4. The Adaptive Loop (the heart of the system)

After each interview, Claude:

1. **Extracts insights** from the transcript — themes, revealing quotes, contradictions/surprises vs. prior interviews, hypotheses confirmed or challenged, newly raised questions.
2. **Retrieves prior context** from Redis (semantically similar existing insights) so it can tell *genuinely new* from *confirming*.
3. **Updates the living insight document** — new findings, updated confidence on prior findings (confirmed / challenged / nuanced), strengthening themes, open questions.
4. **Regenerates the next question bank** — targeting remaining gaps, hypotheses needing validation, contradictions to probe, and the next interviewee's background.

By interview 2–3 the agent is asking precise, evidence-grounded follow-ups instead of broad exploratory questions. That delta is what we put on screen.

---

## 5. Architecture — Key Decision: the transcript is the seam

**Everything downstream of the interview consumes a *transcript*, not audio.** This is the most important architectural choice in the build:

- The entire differentiator (synthesis → insight update → question regen → report) is built and demoed with **zero live-voice risk**.
- It gives us a **free failure mode**: if the live Deepgram call drops on stage, we flip to a pre-recorded transcript and the pipeline keeps running live.
- It lets us build the loop **before any voice exists.**

```
                 ┌─────────────────────────────────────────────┐
   Research      │              ORCHESTRATOR                    │
   goal ───────▶ │         (FastAPI, plain Python               │
   + contacts    │          state machine — NO agent framework) │
                 └───┬───────────────┬──────────────┬───────────┘
                     │               │              │
            ┌────────▼──────┐  ┌──────▼──────┐  ┌────▼─────────┐
            │ Claude        │  │ Deepgram    │  │ Redis        │
            │ - Q-bank gen  │  │ Voice Agent │  │ (RedisJSON)  │
            │ - synthesis   │  │ BYO-LLM=    │  │ living insight│
            │ - regen       │  │  Claude     │  │ doc + banks  │
            │ - report(PDF) │  │ STT/TTS/turn│  │ + vector mem │
            └───────┬───────┘  └──────┬──────┘  └──────────────┘
                    │                 │
                    │            TRANSCRIPT  ◀── the seam
                    │                 │
                    └────────▶ synthesis loop runs on transcript ◀───
                                      │
                            ┌─────────▼──────────┐
                            │ Next.js + Tailwind │  ← question-diff UI,
                            │ frontend (Vercel)  │    live insight doc,
                            │ SSE/WebSocket      │    final PDF
                            └────────────────────┘
```

**Orchestration note:** explicit Python state machine, **not** LangGraph/CrewAI/AutoGen. A 5-step loop doesn't need a framework; frameworks cost debugging hours we don't have and hurt demo determinism. The steps are still legitimately "agents" in the pitch.

---

## 6. Scope — In / Out / Deferred

| Priority | Item | Notes |
|---|---|---|
| **P0** | Adaptive loop on text (goal → Q-bank v1 → transcript → synthesis → insight doc → Q-bank v2) | Build FIRST on hardcoded transcripts. Proves the thesis, lowest demo risk. |
| **P0** | Question-diff UI + live-updating insight document | The money shot. Must be beautiful and legible. |
| **P0** | Deepgram live voice loop with Claude as bring-your-own LLM | Primary win target. Includes scripted barge-in + personalized opening. |
| **P0** | PDF report generation | Final deliverable format. |
| **P1** | Redis (RedisJSON) as living insight store + vector retrieval | Secondary win target — stays in. |
| **P2** | Arize Phoenix observability ("question specificity trending up") | Only if time. Last thing built. |
| **Deferred** | Browserbase live browsing | **Dossier built offline / pre-staged and shown as an artifact.** Integration still claimed. Pending your review of this PRD before deciding to run it live. |
| **Out** | LinkedIn scraping, live cold email to real people, real calendar integration, multi-tenant, auth, prod infra/security/compliance | Per overview §9. |

---

## 7. Demo Scenario & Flow

**Research goal (anchor):** *"Understand why PMs at early-stage startups struggle with discovery research."*
This is intentionally self-referential: the live interviewee (teammate) is a PM and can speak to it authentically without a visible script, which makes the live conversation credible and the resulting transcript substantive.

**Contacts:** 3 mock interviewees (1 live, 2 pre-staged transcripts as fallback/continuation).

**On-stage sequence:**
1. PM enters the research goal + uploads the 3-contact list.
2. Show pre-built dossier for Interviewee 1 (offline Browserbase artifact).
3. Show Claude's initial question bank — broad, exploratory.
4. **Run Interview 1 LIVE on Deepgram.** Teammate-as-interviewee converses; transcript streams in real time; one scripted barge-in; personalized opening references the dossier.
5. Show the living insight document update after Interview 1.
6. **Money shot:** Interview 2's question bank appears next to Interview 1's — visibly sharper, referencing Interview 1's findings.
7. (Play pre-staged Interview 2 transcript to keep timing tight.)
8. Generate the final **PDF report** live — exec summary, findings by theme, confidence levels, contradictions/open questions, recommended next steps, methodology appendix.

---

## 8. Deepgram Design (primary win target)

Voice quality alone won't separate us — many teams will use Deepgram and sound fine. We win by showing what *good* usage produces:

- **Bring-your-own-LLM:** Deepgram orchestrates STT (Nova-3) / TTS (Aura-2) / turn-taking / barge-in; **Claude is the interviewer's reasoning model**, system-prompted with the current question bank + dossier. This puts both primary sponsors inside one loop.
- **Scripted barge-in moment:** teammate interrupts mid-question; agent yields gracefully. Rehearse this.
- **Personalized opening:** first line references something specific from the dossier.
- **Dynamic navigation:** agent follows interesting threads, skips irrelevant questions, respects declines (logs them as unanswered).
- **The differentiator framing:** our voice agent is better than a generic voicebot *because the question bank got smarter* — so the Deepgram pitch and the adaptive-loop pitch are one pitch.

**Interview-end trigger (resolves overview Q):** hybrid — agent judgment ("must-ask items covered") with a hard time cap (~8 min) as backstop.

---

## 9. Data Models

**Living insight document (RedisJSON):**
```json
{
  "research_goal": "string",
  "themes": [
    {
      "id": "theme_01",
      "label": "string",
      "findings": [
        {
          "text": "string",
          "status": "confirmed | challenged | nuanced | open",
          "confidence": "high | medium | low",
          "supporting_quotes": [{ "interviewee": "id", "quote": "string" }]
        }
      ]
    }
  ],
  "open_questions": ["string"],
  "contradictions": [{ "between": ["id", "id"], "description": "string" }]
}
```
At 2–3 interviews this fits entirely in Claude's context, so core logic reads the JSON directly. The Redis vector index (Agent Memory / RedisVL) backs the "retrieve semantically similar prior insights" step and claims the sponsor — it is **not** load-bearing at demo scale, by design.

**Question bank:**
```json
{
  "interview_number": 1,
  "for_interviewee": "id",
  "personalized_opening": "string",
  "questions": [
    {
      "primary": "string",
      "rationale_gap": "what insight gap this targets",
      "probes": ["follow-up 1", "follow-up 2"],
      "specificity_score": 0.0
    }
  ]
}
```
`specificity_score` (Claude self-rated or embedding-distance from goal) is logged to Arize to chart the loop improving.

---

## 10. Final Report Spec (PDF output)

Generated by Claude from the complete insight document, rendered to PDF:
- **Executive summary** — 3–5 findings readable in 2 minutes.
- **Findings by theme** — each backed by quotes/evidence from multiple interviews.
- **Confidence levels** — well-supported vs. preliminary.
- **Contradictions & open questions** — where interviewees disagreed or more research is needed.
- **Recommended next steps** — specific product/research actions.
- **Methodology appendix** — who was interviewed, questions per interview, how questions evolved (this appendix *is* the money shot in document form).

**Implementation:** Claude emits structured Markdown → render to PDF. Keep styling minimal and clean; the content is the product, not the layout.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Live interviewee gives a thin transcript** → adaptive loop falls flat (the #1 risk now that the interviewee is live) | Write an **interviewee briefing**: persona + 4–5 "beats" they must hit. Conversation feels unscripted; transcript reliably carries the substance that makes Interview 2 sharper. |
| Deepgram call drops mid-interview on stage | Transcript-as-seam: flip to pre-recorded transcript, pipeline continues live. |
| Synthesis produces vague question deltas (diff not impressive) | Prompt-engineer the regen step to *cite* specific Interview 1 findings in Interview 2 questions; tune until the diff is dramatic. This is where most Claude-prompting time goes. |
| Over-building Redis vector search | Use it as store + a token retrieval call; never make core logic depend on retrieval quality. |
| Arize eats core time | Strictly last; cap at 1–2 hrs; never let it block P0/P1. |
| Browserbase live browsing flaky on stage | Deferred — dossier pre-built offline. Revisit only after this PRD is reviewed. |

---

## 12. Resolved Decisions (from overview's open questions)

- **Report format:** PDF.
- **Insight doc structure:** structured JSON in RedisJSON (schema §9).
- **Interview-end trigger:** agent judgment + hard time cap.
- **Off-topic / refusal:** agent redirects gracefully, logs declines as unanswered; show one graceful redirect to prove robustness.
- **Voice-fail fallback:** transcript-as-seam (pre-recorded transcript).
- **PM between interviews:** passive observer by default; optional "inject a note" folded into next regen — P2, only if time.
- **Parallel Browserbase / large contact lists:** out of scope (3 contacts, sequential).

**Still open, pending your input:** whether Browserbase runs live vs. stays offline.

---

## 13. Build Plan (~30 effective hours, 2 people)

1. **Hours 0–8:** P0 text loop on hardcoded transcripts + the question-diff UI skeleton. Get the money shot working on fake data first.
2. **Hours 8–18:** Deepgram live loop with Claude BYO-LLM; transcript streaming; barge-in + personalized opening. Wire real transcripts into the loop.
3. **Hours 18–24:** Redis as the insight store + vector retrieval; PDF report generation.
4. **Hours 24–28:** Polish the UI (the diff must be gorgeous), write the interviewee briefing, rehearse the demo end to end including the failure-mode flip.
5. **Hours 28–30:** Arize if time; buffer; final rehearsal.

**Rule:** the demo must be runnable end to end by hour 24. Everything after is polish and rehearsal, not new features.

---

## 14. Judging Success Metrics

- Live Deepgram interview completes with a clean barge-in and personalized opening.
- Side-by-side question evolution is immediately legible to a judge in <10 seconds.
- PDF report generates live and reads as stakeholder-ready.
- Both primary sponsors (Deepgram + Claude) and Redis are genuinely load-bearing in the demoed path.
