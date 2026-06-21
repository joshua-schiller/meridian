# Meridian API

FastAPI skeleton for the transcript-first discovery loop.

Run from the repo root:

```bash
PYTHONPATH=packages/research_core uvicorn apps.api.app.main:app --reload --port 8001
```

Current endpoints:

- `GET /health`
- `GET /demo/fixtures`
- `GET /demo/transcript/interview-1`
- `GET /demo/question-banks`
- `GET /demo/insight-docs`
- `GET /demo/adaptive-loop`
- `GET /demo/report/markdown`
- `GET /demo/report.pdf`
- `POST /research/run-fixture`
- `POST /research/run-transcript`
- `POST /report/from-transcript/markdown`
- `POST /report/from-transcript.pdf`
- `POST /report/from-loop-result/markdown`
- `POST /report/from-loop-result.pdf`
- `WS /voice/session`

The API reads the same fixture files used by the web app and validates them through `packages/research_core`.

`/research/run-fixture` returns the full P0 loop payload: transcript, before/after insight docs, before/after question banks, loop evidence, and specificity metrics.

`/demo/report/markdown` and `/demo/report.pdf` generate the stakeholder-ready report from the same loop payload. The report frames the question bank as Meridian's next AI interview plan, not as a human-led guide.

`/research/run-transcript` accepts `{ "transcript": <canonical Transcript> }` from the voice session and returns the same adaptive-loop payload. `/report/from-transcript/markdown` and `/report/from-transcript.pdf` accept the same body and generate the report directly from that transcript. `/report/from-loop-result/markdown` and `/report/from-loop-result.pdf` accept `{ "loop_result": <LoopResult> }` so the web demo can render the PDF from the exact synthesis result it already showed instead of calling Claude twice. If prior insight docs, contact, dossier, or baseline question bank are omitted, the API uses the demo defaults.

`/voice/session?contact=maya_chen&scripted=true` runs the reliable scripted interview fallback. `scripted=false` streams microphone audio through Deepgram STT/TTS. When the session completes, the web UI posts the emitted canonical transcript to `/research/run-transcript?mode=auto`, then posts the returned `loop_result` to `/report/from-loop-result.pdf`.

Use `mode=deterministic`, `mode=auto`, or `mode=claude`. Claude mode requires `ANTHROPIC_API_KEY`; `CLAUDE_MODEL` defaults to `claude-sonnet-4-5`. `mode=auto` uses Claude when the key is present, falls back to the deterministic transcript loop when the key is missing or Claude fails the contract, and reports `requested_mode`, `resolved_mode`, and `fallback_reason` in `metrics`.
