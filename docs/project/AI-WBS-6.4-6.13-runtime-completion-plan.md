# TravelAssist — WBS 6.4–6.13 AI Runtime Completion Plan

> Date: 2026-09-22
> Owner: A
> Goal: move AI WBS items from architecture/design completion to production runtime completion without duplicating Planner, Trip, Engine, Preference or POI systems.

## Execution chain

```text
TASK-076-A / #418
AI Runtime Foundation
6.4 + 6.5 + server-side 6.10/6.11
        ↓
TASK-077-A / #419
Conversation Runtime + Orchestrator + Read-only Tool Router + Streaming UI
6.13 base runtime
        ↓
TASK-078-A / #420
AI Planner Action / Replan / Confirmation
6.6 + 6.8 + 6.13 mutation feedback
        ↓
TASK-079-A / #421
Initial Itinerary + Recommendation Explanation + AI Quality Benchmark
6.7 + 6.9 + 6.12
```

## Dependency gates

### TASK-076-A — executable now

Satisfied:

- 6.1 AI capability boundary frozen
- 6.2 message model frozen
- 6.3 Prompt/System Instruction v1 frozen
- 5.14 Preference Contract complete
- 2.5 env conventions complete
- 2.11 error/logging foundation complete

### TASK-077-A

Requires TASK-076-A merged/accepted.

Implementation status (2026-09-22): TASK-076-A dependency is satisfied. The
TASK-077-A base conversation runtime, read-only Tool Router, application SSE
transport and existing Home AI wiring are implemented on the designated branch
and have passed the required local gates. WBS 6.10 is pending review; WBS 6.13
remains partial because mutation confirmation and success feedback belong to
TASK-078-A and were not started.

### TASK-078-A

Requires:

- TASK-077-A
- WBS 4.19 / PR #406 accepted + merged
- accepted Planner Store/Trip persistence
- Engine 4.22–4.24

### TASK-079-A

Requires:

- TASK-077-A
- WBS 7.4 Canonical POI accepted/merged
- WBS 7.9 recommendation scoring complete
- PR #372 Candidate Pipeline resynced/accepted/merged
- Candidate Retrieval + Planner Solver/Validator/Ranking runtime complete

## Runtime boundaries

AI may:

- understand intent;
- assemble context;
- call registered tools;
- propose structured planner changes;
- explain deterministic decisions.

AI may not:

- fabricate opening/route/weather/price facts;
- bypass Validator/Engine;
- mutate Trip directly;
- decide permissions;
- silently perform booking/payment;
- decide production rollback.

## Provider direction

TASK-076-A uses a provider abstraction plus a server-only OpenAI adapter based on the current Responses API. Tests use a deterministic fake provider. Lack of a real API key must fail closed rather than fake success.

## Git / Codex rule

Current execution rule: **Codex may perform Git operations, but only one Task at a time.**

For the active Task, Codex may:

- inspect Git state;
- fetch/prune remotes;
- create or reuse only the Task's designated branch/worktree;
- merge execution-time latest `origin/develop` normally;
- stage only Task-owned files;
- commit;
- push without force;
- create/update one Draft PR to `develop`.

Codex must stop after publishing the active Task Result and Draft PR.

Do not:

- start the next AI Task automatically;
- create branches for TASK-077/078/079 while TASK-076 is active;
- work on two AI Tasks in parallel;
- rebase/force push;
- use hard reset or destructive clean;
- auto-merge a PR.

Sequence remains strictly:
`TASK-076 → human acceptance/merge → TASK-077 → human acceptance/merge → TASK-078 → ...`.

## WBS status policy

- 6.4/6.5/6.10/6.11 become 进行中 when TASK-076-A starts.
- 6.13 remains 部分完成 until TASK-077-A starts.
- 6.6/6.8 remain 部分完成 until #406 + TASK-077 prerequisites pass.
- 6.7/6.9/6.12 remain 部分完成 until POI/Ranking/Planner prerequisites pass.
- 已完成 only after implementation review, merge to develop and acceptance.
