# CODEX — TASK-051-A Planner State / Store Closeout

Repository: `https://github.com/kanzakimy0/TravelAssist`

Issue: `#400`

WBS: `4.15`

## Start checks

Use a dedicated clean worktree or clone.

Do not touch an existing dirty Planner / Step workspace.

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Forbidden:

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Read the full Task:

```bash
git show origin/task/a-task-051-planner-state-store-closeout:docs/tasks/TASK-051-a-planner-state-store-closeout.md
```

Read WBS amendment:

```bash
git show origin/task/a-task-051-planner-state-store-closeout:docs/project/WBS-4.15-planner-state-store-closeout-amendment.md
```

## Execution branch

From execution-time latest clean:

```text
origin/develop
```

create:

```text
codex/a-planner-state-store-closeout
```

Do not implement from the Task publication branch.

## Mandatory preflight

Confirm:

```text
2.6 completed
5.11 completed
4.17 completed
8.5 completed
4.20–4.24 completed
4.15 not already superseded/completed
```

Audit current:

```text
planner-state.ts
trip-model.ts
browser-trip.ts
working-drafts.ts
detail-workspace.ts
use-browser-trip.ts
planner-page.tsx
trip-workspace.tsx
src/shared/contracts/trips/**
```

and execution-time newer equivalents.

## Core rule

Do NOT create a second Trip model or second authoritative Store.

Converge the existing implementation.

Freeze this separation:

```text
working/domain state
UI state
Detail draft state
ephemeral component state
persistence projection
canonical Trip contract
Mutation Engine authoritative server boundary
```

Every material field must have one ownership classification.

No business fact may have two independent writable authoritative locations after closeout.

## Current behavior to preserve

Preserve accepted behavior for:

```text
plan/day/range switching
item add/remove/edit/reorder/time
lock/fixed/reservation protection
settings draft/apply/cancel
Detail draft
Planner <-> Detail
browser save
refresh restore
stale-tab conflict
working draft archive/switch
localStorage failure safety
Map/workspace lifecycle
```

## Dirty semantics

Dirty must be based on persistable business projection.

These alone must NOT mark itinerary dirty:

```text
overlay open
selected item
inspector focus
dialog open
viewport collapse
temporary DOM trigger
map layer UI
focus return state
```

## Browser persistence

Browser persistence remains browser-only.

Do NOT implement 4.19.

Required:

```text
Store -> snapshot projection
snapshot -> validated Store hydrate
stale-tab guard preserved
corrupt payload fail closed
persistence failure keeps working state
no second current-trip localStorage truth
```

## Canonical Trip / Engine

Do NOT duplicate:

```text
4.17 Trip Plan Contract
8.5 Trip Plan Schema
4.20–4.24 Engine permissions/revision/audit/outbox/idempotency
```

Current reducer actions are local working-copy actions only.

Future durable flow must remain:

```text
Store intent
→ ChangeSet
→ Mutation Engine
→ canonical revision
→ Store reconcile/hydrate
```

Do not add server mutation endpoints in this Task.

## Preference

Do NOT implement 4.18.

No live Preference API wiring.
No 23→43 mapping.

## UI

No visual redesign.

No Planner Grid/Map/right rail/bottom timeline/breakpoint geometry changes.

## Deliverables

At minimum:

```text
Planner Store ownership/runtime modules
typed Store actions/reducer/selectors
hydrate/restore boundary
persistence projection boundary

docs/architecture/planner-state-store-v1.md
docs/qa/TASK-051/state-ownership-audit.json
docs/qa/TASK-051/store-invariants.json
docs/qa/TASK-051/persistence-boundary.json
docs/qa/TASK-051/regression-report.md
tests/task-051-a-planner-store.test.mjs
docs/tasks/RESULT-TASK-051-a-planner-state-store-closeout.md
```

Use stronger execution-time repository conventions if present.

## WBS

Read the complete latest Master WBS before editing.

At implementation start:

```text
4.15 -> A / 进行中（#400 / TASK-051-A）
```

After implementation + mandatory QA + Draft PR:

```text
4.15 -> A / 待审查（#400 / TASK-051-A；Draft PR #...）
```

Preserve every unrelated A/B WBS change.

## Regression

Run the complete Task matrix and current canonical equivalents, including:

```text
npm ci
TASK-051 focused
browser-trip-save
planner-working-plan
planner-track-actions
planner audit/regression
Planner/Detail workspace
Trip Contract
Trip persistence-model
Engine focused
full Node regression
lint
typecheck
build
current deployment validate/build/artifact
TASK-owned Prettier
git diff --check
```

Exact final PR head must receive GitHub Quality Gate PASS.

## Publication

Commit and push:

```text
codex/a-planner-state-store-closeout
```

Create one Draft PR:

```text
codex/a-planner-state-store-closeout -> develop
```

Update Issue #400.

Do not auto-merge.
Do not close #400.
Do not start 4.18 or 4.19.

Return the complete:

`docs/tasks/RESULT-TASK-051-a-planner-state-store-closeout.md`

Then STOP.
