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

The API reads the same fixture files used by the web app and validates them through `packages/research_core`.
