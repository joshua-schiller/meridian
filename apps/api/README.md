# Meridian API

FastAPI skeleton for the transcript-first discovery loop.

Run from the repo root:

```bash
PYTHONPATH=packages/research_core uvicorn apps.api.app.main:app --reload --port 8001
```

For deployment, use the Render blueprint in `render.yaml`. See `docs/deployment.md` for the exact Render and Vercel environment variable wiring.

Current endpoints:

- `GET /health`
- `GET /demo/fixtures`
- `GET /demo/transcript/interview-1`
- `GET /demo/question-banks`
- `GET /demo/insight-docs`
- `GET /demo/adaptive-loop`
- `POST /demo/run-sequence`
- `POST /demo/run-sequence/report.pdf`
- `GET /demo/report/markdown`
- `GET /demo/report.pdf`
- `POST /research/run-fixture`
- `POST /research/run-transcript`
- `POST /report/from-transcript/markdown`
- `POST /report/from-transcript.pdf`
- `POST /report/from-loop-result/markdown`
- `POST /report/from-loop-result.pdf`
- `GET /demo/state`
- `GET /research/sessions/{session_id}`
- `WS /voice/session`

The API reads the same fixture files used by the web app and validates them through `packages/research_core`.

`/research/run-fixture` returns the full P0 loop payload: transcript, before/after insight docs, before/after question banks, loop evidence, and specificity metrics.

`/demo/run-sequence` is Joshua's accumulated demo path. It runs the Maya fixture transcript, persists the updated living insight document, retrieves that memory before Noah's Interview 2 transcript, updates repeated findings to confirmed/high confidence when both interviewees support them, produces the Interview 3 AI plan, and returns a stakeholder report Markdown string from the accumulated insights. `/demo/run-sequence/report.pdf` renders the same two-interview story as a PDF.

`/demo/report/markdown` and `/demo/report.pdf` generate the stakeholder-ready report from the same loop payload. The report frames the question bank as Meridian's next AI interview plan, not as a human-led guide.

`/research/run-transcript` accepts `{ "transcript": <canonical Transcript> }` from the voice session and returns the same adaptive-loop payload. `/report/from-transcript/markdown` and `/report/from-transcript.pdf` accept the same body and generate the report directly from that transcript. `/report/from-loop-result/markdown` and `/report/from-loop-result.pdf` accept `{ "loop_result": <LoopResult> }` so the web demo can render the PDF from the exact synthesis result it already showed instead of calling Claude twice. If prior insight docs, contact, dossier, or baseline question bank are omitted, the API uses the demo defaults.

`/voice/session?contact=maya_chen&scripted=true` runs the reliable scripted interview fallback. `scripted=false` streams microphone audio through Deepgram STT/TTS. When the session completes, the web UI posts the emitted canonical transcript to `/research/run-transcript?mode=auto`, then posts the returned `loop_result` to `/report/from-loop-result.pdf`.

Use `mode=deterministic`, `mode=auto`, or `mode=claude`. Claude mode requires `ANTHROPIC_API_KEY`; `CLAUDE_MODEL` defaults to `claude-sonnet-4-5`. `mode=auto` uses Claude when the key is present, falls back to the deterministic transcript loop when the key is missing or Claude fails the contract, and reports `requested_mode`, `resolved_mode`, and `fallback_reason` in `metrics`.

Redis memory is optional and non-load-bearing. When `REDIS_URL` is set, `/research/run-transcript` and `/research/run-fixture` retrieve the latest insight document for the session before synthesis, then persist the new `LoopResult`, living insight document, next question bank, and baseline bank after synthesis. Responses include `memory.read`, `memory.write`, and metrics such as `memory_reads`, `memory_writes`, `retrieved_context_items`, and `persisted`. When Redis is absent or unavailable, the adaptive loop still completes and reports memory as disabled or errored.

Useful Redis checks:

```bash
curl "http://localhost:8001/demo/state"
curl "http://localhost:8001/research/sessions/understand-why-pms-at-early-stage-startups-struggle-with-discovery-research"
```

Useful sequence checks:

```bash
curl -X POST "http://localhost:8001/demo/run-sequence?mode=deterministic&session_id=rehearsal-sequence"
curl -X POST -o artifacts/sequence_report.pdf \
  "http://localhost:8001/demo/run-sequence/report.pdf?mode=deterministic&session_id=rehearsal-sequence-pdf"
```
