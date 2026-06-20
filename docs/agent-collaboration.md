# Agent Collaboration Playbook

This guide exists to keep two humans and multiple coding agents moving quickly without merge collisions or scope creep.

## Product Frame

Meridian is an AI interviewer, not just a research assistant for a human interviewer. A PM supplies the research goal and may approve direction, but the demo product should be framed as Meridian preparing for, conducting, synthesizing, and adapting discovery interviews itself.

The question bank is the AI interviewer's plan for the next call. It is shown in the UI to make the adaptive loop legible, but agents should not treat it as the primary human deliverable.

## Default Parallel Split

Start with two durable workstreams. For this team, Joshua should own the core loop and Bilguun should own the demo UI first; `docs/team-execution-plan.md` has the full named schedule.

| Workstream | Primary owner | Owned paths | Demo outcome |
| --- | --- | --- | --- |
| Core loop | Joshua | `packages/research_core/**`, `fixtures/**`, API routes that expose loop outputs | Meridian's next interview plan gets sharper after each transcript |
| Demo UI | Bilguun | `apps/web/**`, UI-only styles/components | Judges can see how Meridian conducts, learns, and adapts immediately |

After the first scaffold lands, split additional branches only when needed:

| Workstream | Owned paths | Notes |
| --- | --- | --- |
| Deepgram voice | `apps/api/**/deepgram*`, `apps/api/**/voice*`, voice env docs | Meridian conducts the interview; output must match the transcript format used by the text loop |
| Report/PDF | `packages/research_core/**/report*`, `apps/api/**/report*`, report templates | Claude emits structured Markdown, renderer turns it into PDF |
| Redis memory | `apps/api/**/redis*`, persistence adapters, env docs | Redis improves sponsor story but cannot be required for demo-scale correctness |
| Demo docs | `docs/demo/**` | Interviewee briefing, fallback script, run-of-show |

Do not create a separate workstream for auth, production infra, real outreach, live Browserbase, or generalized analytics during the hackathon.

## Worktree Setup

Each person or agent gets their own checkout:

```bash
cd /path/to/meridian
mkdir -p ../meridian-worktrees
git fetch origin
git worktree add ../meridian-worktrees/core-loop -b agent/<owner>/core-loop origin/main
git worktree add ../meridian-worktrees/demo-ui -b agent/<owner>/demo-ui origin/main
```

Rules:

- One branch per worktree.
- One workstream per branch.
- Never run two agents in the same worktree.
- Keep the original repo on `main` as the clean integration checkout when possible.
- Delete finished worktrees with `git worktree remove ../meridian-worktrees/<name>` after the branch is merged.

## Claiming Work

Before editing, write a short claim in the agent prompt or PR description:

```text
Workstream:
Branch:
Owned paths:
Expected shared files:
Done when:
```

If the task needs a shared file such as a dependency manifest, lockfile, API contract, fixture, or root config, call that out before making the change.

## Shared Files

Treat these as coordination points:

- Root dependency manifests and lockfiles.
- API/frontend shared contracts and generated types.
- Canonical demo fixtures under `fixtures/**`.
- Environment examples and setup scripts.
- Root config for formatting, linting, TypeScript, Python, Vercel, or Docker.

Guardrails:

- One active branch owns a shared file at a time.
- Prefer additive changes over rewrites.
- Do not reformat shared files as cleanup.
- If a shared contract changes, include a tiny fixture or example that proves the new shape.

## Contracts

The transcript is the seam. Everything downstream should consume a transcript object, whether it came from Meridian's live Deepgram interview, a recorded fallback, or a fixture.

The `QuestionBank` contract represents the AI interviewer's next-call plan. It can be displayed to users and judges, but it should be generated and evaluated as instructions for the autonomous interviewer.

Minimum shared shapes:

```text
ResearchGoal
Contact
Dossier
Transcript
QuestionBank
LivingInsightDocument
ReportMarkdown
```

Keep these contracts narrow. The hackathon goal is a reliable demo path, not a complete research platform.

## Merge Routine

Before pushing a branch:

```bash
git fetch origin
git rebase origin/main
git status -sb
```

Then run the smallest useful verification:

- Core loop: fixture transcript -> synthesis -> updated insight doc -> regenerated AI interview plan.
- UI: page loads and shows the side-by-side question diff with real fixture data.
- Voice: live or mocked Deepgram path has Meridian conduct the interview and emits the canonical transcript shape.
- Report: final insight document renders to Markdown/PDF.

PRs should be small enough to review quickly. Merge order should usually be:

1. Scaffold and shared contracts.
2. Core loop fixture path.
3. UI money shot consuming fixture/API data.
4. Deepgram transcript producer.
5. Redis persistence.
6. PDF report.
7. Polish and rehearsal docs.

## Scope Control

Use this test before starting new work:

```text
Will this make the live demo more convincing for Deepgram, the adaptive loop, Redis, or the PDF report within the next few hours?
```

If the answer is no, defer it.

Explicitly deferred unless reassigned:

- Real LinkedIn scraping.
- Real cold email or calendar scheduling.
- Auth, teams, roles, billing, or multitenancy.
- Production deployment hardening.
- Live Browserbase browsing.
- Large contact-list workflows.
- Arize or other observability before P0/P1 works.

## Handoff Format

Use this at the end of every agent run:

```text
Branch:
Workstream:
Changed:
Verified:
Demo impact:
Collision risks:
Next:
```

Keep it concrete. Name files and commands.
