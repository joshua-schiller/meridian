# Meridian

Meridian is a hackathon demo for a discovery-call automation tool. The core thesis is the adaptive research loop: each interview transcript updates the living insight document and makes the next question bank sharper.

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
  question_banks/      Broad v1 and sharper v2 banks for the money shot
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

Run the web app:

```bash
npm run dev:web
```

Run the API:

```bash
PYTHONPATH=packages/research_core uvicorn apps.api.app.main:app --reload --port 8001
```

## Immediate Work Split

Joshua should extend `packages/research_core/**`, `fixtures/**`, and the research/report/Redis API paths into the working adaptive loop.

Bilguun should extend `apps/web/**` into the polished demo money shot and then wire the Deepgram voice path into the canonical transcript shape.
