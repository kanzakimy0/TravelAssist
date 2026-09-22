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

When local AGENTS prohibits Git:
- Git/worktree/merge/stage/commit/push happen outside Codex;
- Codex performs zero Git commands;
- Codex only edits files and runs non-Git validation.

## WBS status policy

- 6.4/6.5/6.10/6.11 become 进行中 when TASK-076-A starts.
- 6.13 remains 部分完成 until TASK-077-A starts.
- 6.6/6.8 remain 部分完成 until #406 + TASK-077 prerequisites pass.
- 6.7/6.9/6.12 remain 部分完成 until POI/Ranking/Planner prerequisites pass.
- 已完成 only after implementation review, merge to develop and acceptance.
