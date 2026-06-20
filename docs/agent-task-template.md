# Agent Task Template

Paste this into a new agent prompt before it starts work.

```text
Read first:
- AGENTS.md
- discovery_call_tool_PRD.md
- docs/agent-collaboration.md

Objective:

Workstream:

Branch/worktree:

Owned paths:

Allowed shared files:

Do not touch:

Definition of done:

Verification command or manual check:

Handoff requirements:
- Branch
- Files changed
- Commands run
- Demo impact
- Collision risks
- Recommended next step
```

## Example: Core Loop Agent

```text
Objective:
Build the fixture-driven transcript -> synthesis -> living insight doc -> next question bank path.

Workstream:
Core loop

Branch/worktree:
agent/js/core-loop-fixtures in ../meridian-worktrees/core-loop

Owned paths:
packages/research_core/**
fixtures/transcripts/**
fixtures/question_banks/**

Allowed shared files:
Root dependency manifests only if a package is required for the loop.

Do not touch:
apps/web/**
Deepgram integration files
PDF renderer
Auth, calendar, email, or live browsing

Definition of done:
A local command runs Interview 1 fixture through the loop and writes or prints Question Bank 2 with specific references to Interview 1 findings.

Verification:
Run the fixture command and include the output path or excerpt in the handoff.
```

## Example: UI Agent

```text
Objective:
Create the demo money-shot UI using fixture data.

Workstream:
Demo UI

Branch/worktree:
agent/<owner>/ui-money-shot in ../meridian-worktrees/demo-ui

Owned paths:
apps/web/**

Allowed shared files:
Read-only fixture consumption. Coordinate before editing fixtures or root dependency manifests.

Do not touch:
packages/research_core/**
apps/api/**
Deepgram integration files
PDF renderer

Definition of done:
The app shows Interview 1 and Interview 2 question banks side by side, plus a living insight document panel, using realistic fixture data.

Verification:
Run the web app locally and capture the URL plus any browser-check result in the handoff.
```
