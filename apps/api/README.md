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
- `POST /research/run-fixture`

The API reads the same fixture files used by the web app and validates them through `packages/research_core`.

`/research/run-fixture` returns the full P0 loop payload: transcript, before/after insight docs, before/after question banks, loop evidence, and specificity metrics.

Use `mode=deterministic`, `mode=auto`, or `mode=claude`. Claude mode requires `ANTHROPIC_API_KEY`; `CLAUDE_MODEL` defaults to `claude-sonnet-4-5`.
