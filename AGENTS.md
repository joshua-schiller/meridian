# Agent Operating Guide

This repo is a hackathon build for the Discovery Call Automation Tool. Read `discovery_call_tool_PRD.md` before changing code or docs.

For the named Joshua/Bilguun execution split, also read `docs/team-execution-plan.md`.

## North Star

The product is the adaptive discovery loop: research goal -> question bank -> transcript -> synthesis -> living insight doc -> sharper next question bank -> PDF report. Voice matters, but the adaptive loop is the demo thesis.

Judging priorities:

1. Live Deepgram interview with personalized opening and graceful barge-in.
2. Side-by-side question bank evolution that is obvious in under 10 seconds.
3. Stakeholder-ready PDF report generated from accumulated insights.

If a change does not support one of those outcomes, treat it as out of scope unless a human explicitly assigns it.

## Collaboration Rules

- Work in a dedicated git worktree and branch. Do not have two people or agents editing the same checkout.
- Keep branches scoped to one workstream. If the task crosses workstreams, split it or coordinate first.
- State the intended owned paths before editing. Avoid drive-by changes in shared config, lockfiles, contracts, and fixtures.
- Build the transcript-based loop first. Live voice must feed the same transcript seam instead of creating a parallel pipeline.
- Preserve deterministic demo fallbacks. Hardcoded transcripts, mock contacts, and prebuilt dossiers are allowed and encouraged for the core path.
- Prefer boring orchestration: FastAPI plus an explicit Python state machine. Do not add LangGraph, CrewAI, AutoGen, or similar frameworks without human approval.
- Keep UI work focused on the money shot: question diff, live insight document, transcript progress, and report generation.
- Do not implement auth, multitenancy, real email/calendar, LinkedIn scraping, live Browserbase browsing, production security/compliance, or broad observability unless the PRD is updated.

## Suggested Repo Shape

Use this layout unless the team explicitly changes it:

```text
apps/
  api/                 FastAPI orchestrator, Deepgram integration, Redis access, PDF endpoint
  web/                 Next.js + Tailwind demo UI
packages/
  research_core/       Question generation, synthesis, insight updates, report markdown
fixtures/
  contacts/            Mock interviewees and offline dossiers
  transcripts/         Pre-staged demo transcripts and voice-fail fallbacks
  question_banks/      Golden question bank examples for the side-by-side diff
docs/
  demo/                Run-of-show, interviewee briefing, sponsor talking points
```

Path ownership should follow this shape. Root config, dependency manifests, lockfiles, and shared contracts are coordination points.

## Worktree Workflow

Create worktrees outside the repo root:

```bash
mkdir -p ../meridian-worktrees
git fetch origin
git worktree add ../meridian-worktrees/<stream> -b agent/<owner>/<stream>-<short-task> origin/main
```

Use branch names like:

```text
agent/joshua/core-loop-fixtures
agent/bilguun/ui-money-shot
agent/bilguun/deepgram-transcript-seam
```

Before pushing:

```bash
git fetch origin
git rebase origin/main
git status -sb
```

Run the narrowest useful verification for the files touched. If verification is blocked, say why in the handoff or PR.

## Merge Guardrails

- Merge the scaffold and shared contracts before parallel feature branches depend on them.
- Only one active branch should touch dependency manifests or lockfiles at a time.
- Only one active branch should change canonical data contracts at a time.
- Fixtures are demo-critical. Add new fixture files instead of rewriting existing ones unless the owner agrees.
- Avoid repo-wide formatting during the hackathon. Format only the files you touched.
- Keep commits small and reversible. A branch should have a single demo-visible purpose.

## Handoff Expectations

Every agent handoff should include:

- Workstream and branch name.
- Files intentionally changed.
- Demo outcome improved.
- Commands run and results.
- Any collision risks or follow-up needed.

Use `docs/agent-task-template.md` when assigning work to a new agent.
