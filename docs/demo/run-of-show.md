# Meridian Demo Run Of Show

Goal: show that Meridian conducts discovery interviews itself, learns from each transcript, stores the living insight state, and uses that memory to create a sharper next AI interview plan plus a stakeholder PDF.

## Setup

Start the API with the keys you have:

```bash
set -a
source .env
set +a
PYTHONPATH=packages/research_core uvicorn apps.api.app.main:app --reload --port 8001
```

Start the web app:

```bash
npm run dev:web
```

Open:

```text
http://localhost:3000
```

Recommended env for the full sponsor story:

```bash
ANTHROPIC_API_KEY=...
CLAUDE_MODEL=claude-sonnet-4-5
DEEPGRAM_API_KEY=...
REDIS_URL=...
REDIS_KEY_PREFIX=meridian
REDIS_USE_JSON=0
```

`REDIS_USE_JSON=1` is only for Redis instances with RedisJSON available. Keep it `0` for a plain Redis server; Meridian still stores JSON payloads as Redis string values.

## Primary Path

1. Show the research goal: "Understand why PMs at early-stage startups struggle with discovery research."
2. Point out the first broad AI interview plan.
3. Click **Start Live (microphone)** if Deepgram is configured. Otherwise click **Run scripted fallback**.
4. Meridian opens with the dossier-personalized line.
5. Bilguun answers as Maya using the briefing beats in `docs/demo/interviewee-briefing.md`.
6. If using live voice, interrupt once mid-question to demonstrate barge-in/recovery.
7. End the session.
8. Show the post-interview card:
   - `Claude synthesis` when the Claude-backed loop ran.
   - `Deterministic fallback` only if Claude is absent or fails contract validation.
   - Evidence quote attached to each generated Interview 2 question.
   - PDF download rendered from the same loop result.
9. Show Redis state if configured:

```bash
curl -X POST "http://localhost:8001/demo/reset?session_id=stage-sequence"
curl -X POST "http://localhost:8001/demo/run-sequence?mode=claude&session_id=stage-sequence"
curl "http://localhost:8001/demo/state"
curl "http://localhost:8001/research/sessions/stage-sequence"
```

Talk track: "The transcript is the seam. Meridian just used the interview transcript, retrieved prior insight memory from Redis, synthesized with Claude, saved the updated living insight doc back to Redis, generated the next AI interview plan, and rendered the PDF from that same result."

Redis proof points to show in the JSON:

- `memory.read.status`: first loop should be `miss`; later loops should be `hit`.
- `memory.write.status`: each loop should be `persisted`.
- `memory.write.vector_status`: should be `vectorset_indexed` when Redis Vector Sets are available.
- `memory.read.vector_status`: should be `vectorset_hit` on later loops when vector retrieval is active.
- `vector_state.items`: number of per-finding vectors stored for the session.

## Accumulated Sequence Path

Use this path when you need to show the whole adaptive loop quickly, or when Bilguun's UI is pointed at the API sequence endpoint:

```bash
curl -X POST "http://localhost:8001/demo/reset?session_id=stage-sequence"
curl -X POST "http://localhost:8001/demo/run-sequence?mode=deterministic&session_id=stage-sequence"
curl -X POST -o artifacts/sequence_report.pdf \
  "http://localhost:8001/demo/run-sequence/report.pdf?mode=deterministic&session_id=stage-sequence-pdf"
```

What this proves:

- Meridian conducts Interview 1 from Maya's transcript and generates Noah's personalized Interview 2 plan.
- The living insight document is persisted, then retrieved before Noah's transcript runs.
- Meridian then runs Ava's Interview 3 fixture, adding report-cadence nuance about a fast decision memo versus the final PDF.
- Repeated findings become confirmed/high confidence when multiple interviewees support them.
- The final report is generated after three Meridian-conducted interviews and includes the Interview 4 AI plan.

Frontend contract: `POST /demo/run-sequence` returns `loops[0]` for Interview 1 -> Interview 2, `loops[1]` for Interview 2 -> Interview 3, `loops[2]` for Interview 3 -> Interview 4, `report_markdown`, `memory_state`, and sequence metrics. The money shot should compare `loops[0].question_bank_before`, `loops[0].question_bank_after`, and `loops[1].question_bank_after`; use `loops[2]` when there is time to show the accumulated-report story.

## Fallback Path

If Deepgram fails:

1. Click **Run scripted fallback**.
2. Explain that the product was designed transcript-first, so the downstream loop remains live.
3. Send all scripted responses.
4. End the session.
5. Show that the same transcript shape feeds Claude/Redis/PDF.

If Claude fails:

1. The UI should explicitly show `Deterministic fallback`.
2. Explain that the demo keeps deterministic fallbacks so judges can still see the transcript seam, question evolution, and PDF output.
3. Do not claim Claude synthesized that run.

If Redis fails:

1. The loop should still complete.
2. The response will report memory as disabled or errored.
3. Say: "Redis is an additive memory layer, not a stage-risk dependency. The current transcript loop remains reliable."

## What To Avoid

- Do not describe the question bank as a human interview guide.
- Do not dwell on specificity scores. They are supporting evidence, not the product.
- Do not introduce auth, real outreach, calendar, or Browserbase during the live demo.
- Do not manually edit the generated transcript or question plan on stage.
