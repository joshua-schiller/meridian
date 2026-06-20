# Joshua / Bilguun Execution Plan

This plan is optimized for two people working in parallel during the hackathon with minimal merge collisions.

## Product Interpretation

Meridian conducts the discovery interviews itself. The PM sets the research goal and can approve or steer direction, but the product is not a tool for a human researcher to manually run better calls.

Treat every question bank as the AI interviewer's plan for the next Meridian-conducted interview. The UI should expose the plan evolution because it proves the adaptive loop, not because the plan is the primary human-facing artifact.

## Assignment Summary

| Person | Primary outcome | Owned paths | Avoid touching |
| --- | --- | --- | --- |
| Joshua | Adaptive loop quality, Claude prompts, synthesis, report/PDF, Redis-backed insight state | `packages/research_core/**`, `fixtures/**`, `apps/api/**/research*`, `apps/api/**/report*`, `apps/api/**/redis*`, `docs/demo/**` | `apps/web/**` except to review data shape; Deepgram-specific files unless pairing |
| Bilguun | Demo UI money shot, Meridian live voice interview path, transcript streaming UX | `apps/web/**`, `apps/api/**/deepgram*`, `apps/api/**/voice*`, `docs/demo/**/voice*` | `packages/research_core/**` except read-only contracts/fixtures; Redis/report internals |

The split is intentional: Joshua owns whether the product thesis is compelling; Bilguun owns whether judges can see and hear it land.

## Shared Contract Status

The initial scaffold and shared fixture contracts now exist on `main`.

Before deep parallel work, both people should pull the latest `origin/main` and branch from the committed scaffold. Treat `packages/research_core/research_core/models.py` and the JSON files under `fixtures/**` as the first shared contract. The P0 fixture loop should be exposed through `python3 -m research_core.run_fixture fixtures` and `POST /research/run-fixture`. Claude-backed synthesis should remain behind the same `LoopResult` contract and keep deterministic mode as the demo fallback.

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
- Make the AI interviewer's next plan cite specific Interview 1 findings.
- Produce a dramatic Interview 1 vs Interview 2 plan delta.
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

- Build the Deepgram live voice path so Meridian conducts the interview with Claude as the interviewer's reasoning model.
- Ensure the voice path emits the canonical transcript shape.
- Add the scripted barge-in and personalized opening.
- Wire transcript progress into the UI without changing core synthesis logic.

Integration point:

- Deepgram output from Meridian's live interview must feed the same transcript seam as fixture transcripts.
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
