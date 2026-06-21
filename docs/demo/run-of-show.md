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
curl "http://localhost:8001/demo/state"
```

Talk track: "The transcript is the seam. Meridian just used the interview transcript, retrieved prior insight memory from Redis, synthesized with Claude, saved the updated living insight doc back to Redis, generated the next AI interview plan, and rendered the PDF from that same result."

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
