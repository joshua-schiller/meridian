# Meridian

Meridian is a hackathon demo for an autonomous discovery-call interviewer. The PM provides the research goal; Meridian prepares the interview plan, conducts the live voice interview, synthesizes the transcript, updates the living insight document, and uses those learnings to conduct a sharper next interview.

The core thesis is the adaptive research loop: each Meridian-conducted interview updates the living insight document and makes the AI interviewer's next plan sharper. The question bank is not primarily a human interview guide; it is the AI interviewer's operating plan, surfaced in the demo so judges can see the system getting smarter.

Read first:

- `discovery_call_tool_PRD.md`
- `AGENTS.md`
- `docs/team-execution-plan.md`

## Repo Shape

```text
apps/
  api/                 FastAPI skeleton and demo fixture endpoints
  web/                 Next.js/Tailwind demo UI skeleton
packages/
  research_core/       Canonical Pydantic contracts and fixture validation
fixtures/
  contacts/            Mock interviewee data
  dossiers/            Offline dossier artifacts
  transcripts/         Pre-staged transcript seam fixtures
  question_banks/      Broad v1 and sharper v2 AI interview plans for the money shot
  insights/            Initial and post-interview living insight docs
```

## Quick Start

Install the web dependencies:

```bash
npm install
```

Validate the shared fixtures:

```bash
PYTHONPATH=packages/research_core python3 -m research_core.validate_fixtures fixtures
```

Run the deterministic adaptive loop on fixtures:

```bash
PYTHONPATH=packages/research_core python3 -m research_core.run_fixture fixtures
```

Run the loop through Claude when `ANTHROPIC_API_KEY` is configured:

```bash
export ANTHROPIC_API_KEY=...
export CLAUDE_MODEL=claude-sonnet-4-5
export CLAUDE_TIMEOUT_SECONDS=90
PYTHONPATH=packages/research_core python3 -m research_core.run_fixture fixtures --mode claude
```

If Claude mode fails contract validation, rerun with a debug directory:

```bash
PYTHONPATH=packages/research_core python3 -m research_core.run_fixture fixtures --mode claude --debug-dir artifacts/claude_debug
```

`--mode auto` uses Claude only when `ANTHROPIC_API_KEY` is present, otherwise it keeps the deterministic fallback.

Run the core regression tests:

```bash
PYTHONPATH=packages/research_core python3 -m unittest discover -s packages/research_core/tests
```

Run the web app:

```bash
npm run dev:web
```

Run the API:

```bash
PYTHONPATH=packages/research_core uvicorn apps.api.app.main:app --reload --port 8001
```

Optional Redis-backed memory:

```bash
export REDIS_URL=redis://localhost:6379/0
export REDIS_KEY_PREFIX=meridian
# Set to 1 only when the RedisJSON module is available; otherwise JSON payloads are stored as strings.
export REDIS_USE_JSON=0
```

Open the unified demo console:

```text
http://localhost:3000
```

Use **Run scripted fallback** for the reliable rehearsal path. It lets Meridian conduct Interview 1 without external API keys, emits the same canonical transcript shape, runs `/research/run-transcript?mode=auto`, and prepares the stakeholder PDF from `/report/from-loop-result.pdf`. Use **Start Live (microphone)** when `ANTHROPIC_API_KEY` and `DEEPGRAM_API_KEY` are configured.

Then call either loop mode:

```bash
curl -X POST "http://localhost:8001/research/run-fixture?mode=deterministic"
curl -X POST "http://localhost:8001/research/run-fixture?mode=claude"
```

When Redis is configured, those POST routes retrieve prior insight state before synthesis and persist the new `LoopResult`, living insight document, and next AI interview plan afterward. The loop response includes `memory.read`, `memory.write`, `metrics.persisted`, `metrics.memory_reads`, `metrics.memory_writes`, and `metrics.retrieved_context_items`. Without Redis, the loop still succeeds and reports memory as disabled.

Inspect saved demo state:

```bash
curl "http://localhost:8001/demo/state"
curl "http://localhost:8001/research/sessions/understand-why-pms-at-early-stage-startups-struggle-with-discovery-research"
```

Generate the stakeholder report from the demo loop:

```bash
curl "http://localhost:8001/demo/report/markdown?mode=deterministic"
curl -o artifacts/demo_report.pdf "http://localhost:8001/demo/report.pdf?mode=deterministic"
```

Feed a completed voice transcript into the adaptive loop and report path:

```bash
curl -X POST "http://localhost:8001/research/run-transcript?mode=deterministic" \
  -H "Content-Type: application/json" \
  --data '{"transcript": { ... canonical Transcript ... }}'

curl -X POST "http://localhost:8001/report/from-transcript.pdf?mode=deterministic" \
  -H "Content-Type: application/json" \
  --data '{"transcript": { ... canonical Transcript ... }}' \
  -o artifacts/live_transcript_report.pdf
```

## Immediate Work Split

Joshua should extend `packages/research_core/**`, `fixtures/**`, and the research/report/Redis API paths from the deterministic fixture loop into Claude-backed synthesis, Redis persistence, and PDF reporting.

Bilguun should extend `apps/web/**` into the polished demo money shot and then wire the Deepgram voice path into the canonical transcript shape. The voice path should be treated as Meridian conducting the interview, with Claude as the interviewer's reasoning model, not as transcription for a human interviewer.
