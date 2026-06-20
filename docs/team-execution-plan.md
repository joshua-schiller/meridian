# Joshua / Bilguun Execution Plan

This plan is optimized for two people working in parallel during the hackathon with minimal merge collisions.

## Assignment Summary

| Person | Primary outcome | Owned paths | Avoid touching |
| --- | --- | --- | --- |
| Joshua | Adaptive loop quality, Claude prompts, synthesis, report/PDF, Redis-backed insight state | `packages/research_core/**`, `fixtures/**`, `apps/api/**/research*`, `apps/api/**/report*`, `apps/api/**/redis*`, `docs/demo/**` | `apps/web/**` except to review data shape; Deepgram-specific files unless pairing |
| Bilguun | Demo UI money shot, Deepgram live interview path, transcript streaming UX | `apps/web/**`, `apps/api/**/deepgram*`, `apps/api/**/voice*`, `docs/demo/**/voice*` | `packages/research_core/**` except read-only contracts/fixtures; Redis/report internals |

The split is intentional: Joshua owns whether the product thesis is compelling; Bilguun owns whether judges can see and hear it land.

## First Shared Contract

Before deep parallel work, create and merge one small scaffold/contract branch. This should take less than an hour.

Owner: Joshua, with Bilguun reviewing quickly.

Branch:

```text
agent/joshua/scaffold-contracts
```

Deliver:

- Minimal repo scaffold.
- Canonical fixture shapes for `Transcript`, `QuestionBank`, and `LivingInsightDocument`.
- One Interview 1 transcript fixture and one expected Interview 2 question bank fixture.
- A short command or README note showing where each app/package will live.

After this lands, both people branch from updated `origin/main`.

## Worktrees

From the clean main checkout:

```bash
mkdir -p ../meridian-worktrees
git fetch origin
git worktree add ../meridian-worktrees/joshua-core -b agent/joshua/core-loop origin/main
git worktree add ../meridian-worktrees/bilguun-ui -b agent/bilguun/ui-money-shot origin/main
```

Later branches:

```bash
git worktree add ../meridian-worktrees/joshua-report-redis -b agent/joshua/report-redis origin/main
git worktree add ../meridian-worktrees/bilguun-voice -b agent/bilguun/deepgram-transcript-seam origin/main
```

Keep the original checkout clean on `main` for pulling, reviewing, and resolving integration issues.

## Hours 0-8

Joshua:

- Build the P0 text loop on fixtures.
- Make the question regen cite specific Interview 1 findings.
- Produce a dramatic Interview 1 vs Interview 2 question-bank delta.
- Keep Redis out of the load-bearing path at this stage.

Bilguun:

- Build the Next.js/Tailwind demo UI against static fixture data.
- Prioritize the side-by-side question diff, living insight document, and transcript panel.
- Add loading/progress states that can later connect to the API.
- Do not wait for the backend if fixtures are available.

Integration point:

- Bilguun consumes Joshua's fixture JSON shape.
- Joshua does not edit the UI to make the loop look better; improve the fixture/content instead.

## Hours 8-18

Joshua:

- Expose the loop through FastAPI endpoints.
- Add RedisJSON persistence and minimal retrieval for sponsor credibility.
- Start report Markdown generation from the living insight document.

Bilguun:

- Build Deepgram live voice path with Claude as BYO-LLM.
- Ensure the voice path emits the canonical transcript shape.
- Add the scripted barge-in and personalized opening.
- Wire transcript progress into the UI without changing core synthesis logic.

Integration point:

- Deepgram output must feed the same transcript seam as fixture transcripts.
- If voice flakes, the UI must be able to flip to a pre-staged transcript.

## Hours 18-24

Joshua:

- Finish PDF rendering.
- Tune prompts until the side-by-side diff is judge-obvious.
- Write the interviewee briefing and fallback transcript.

Bilguun:

- Polish the demo UI for legibility and timing.
- Connect the report-generation button/download flow.
- Rehearse voice timing, barge-in, and fallback switch.

Integration point:

- Run the full demo every time a major branch merges.
- Freeze new features once the end-to-end path works.

## Final Push

Both:

- Rehearse the exact run-of-show.
- Keep one known-good fallback transcript and PDF-ready insight document.
- Avoid dependency churn, broad refactors, or fresh sponsor integrations.
- Only accept fixes that make the demo more reliable or the money shot clearer.

## Collision Rules

- Joshua owns `packages/research_core/**`; Bilguun should not edit it without asking.
- Bilguun owns `apps/web/**`; Joshua should not edit it without asking.
- API is split by route/integration: Joshua owns research/report/Redis, Bilguun owns voice/Deepgram.
- `fixtures/**` are shared but Joshua is the primary owner; Bilguun should add UI-only sample fixtures instead of rewriting canonical ones.
- Root dependency files are one-person-at-a-time files. Announce before touching them.
- No repo-wide formatting.

## Daily Handoff

Use this concise handoff when either person pauses:

```text
Name:
Branch:
What works:
What is still fake:
Files touched:
How to run/check it:
Needs from the other person:
Collision risks:
```
