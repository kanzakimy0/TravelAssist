# TASK-044-A — Master Code Registry Governance Acceptance Review

## Tracking

- Issue: #347
- Owner: A — Shared Infrastructure / Architecture
- WBS: 2.18 — Canonical Master Code Registry / Allocation Governance
- Upstream: TASK-043-A / Issue #311 / Draft PR #326
- Consumer follow-up: TASK-041-A / WBS 4.48 / PR #306
- Priority: P0 governance closeout

## Goal

Independently review the TASK-043-A governance candidate before it is allowed to become the canonical frozen Master Code registry. This Task is an acceptance/audit gate, not the TASK-041 integration Task.

## Starting state

TASK-043-A reported:

- status `Completed / Registry candidate ready for human review`;
- PR #326 Open / Draft, head `3cac68b89097db9853ae881b43c8675b329e12dd`;
- 51 registry entries: 1 reserved sentinel + 50 active Region allocations;
- duplicate Master Codes = 0;
- duplicate active entities = 0;
- unresolved Region allocations = 0;
- TASK-041 Region IDs preserved 50/50;
- full Node regression 1564/1564 plus lint/typecheck/build/CI green;
- WBS 2.18 remains `待审查` and WBS 4.48 remains `Partial`.

Do not treat those reported values as accepted facts: independently reproduce the important checks.

## Mandatory prerequisite check

Before changing anything:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
git rev-parse origin/codex/a-master-code-registry
```

Then inspect PR #326 and Issue #311. If PR #326 is no longer Open/Draft, has been merged, or its head has advanced, record the exact state. If it advanced, review the actual current head rather than assuming `3cac68b`.

Use an isolated clean worktree/branch. Do not touch Planner/Step uncommitted work in another workspace.

## Review branch

Suggested branch:

`codex/a-master-code-governance-acceptance`

Base the review on the TASK-043 PR head so all candidate files are present. Do not merge that branch into `develop` from this Task.

## Review scope

### 1. Repository governance consistency

Audit the candidate against existing repository Master Code rules. Confirm it reuses the inherited five-digit segmented namespace and does not create a second grammar.

Explicitly reject any attempt to reinterpret the following as canonical Master Codes:

- `JP-RG-*`
- `JP-PREF-*`
- `JP-MACRO-*`
- destination IDs such as `jp-tokyo`
- administrative codes
- transport-node IDs
- POI IDs
- AI-local IDs
- database primary keys

### 2. Single source of truth

Confirm `src/shared/data/master-code-registry.v1.json` is the sole authoritative allocation registry and that TypeScript utilities/tests consume it rather than maintaining a drifting parallel allocation list.

### 3. Registry invariants

Independently validate at minimum:

- valid five-digit Master Code grammar/ranges;
- unique `masterCode`;
- unique active `(entityType, entityRef)` allocation;
- legal lifecycle enum only;
- active allocation immutability;
- append-only behavior;
- deprecated code cannot be recycled;
- `supersededBy` target exists and is valid;
- supersession cycles fail;
- malformed codes fail;
- whitespace/control-character entity refs fail;
- unknown codes fail closed;
- legacy side-channel strings are not accepted merely because they are strings.

Write a machine-readable result to `docs/qa/TASK-044/registry-invariant-check.json`.

### 4. Region allocation acceptance

Cross-check TASK-041's exact 50 Region identities against `docs/qa/TASK-043/region-allocation-50.json` and the canonical registry.

Required result:

- 50/50 Region IDs preserved exactly;
- 50/50 have unique canonical Master Codes;
- 50/50 resolve to active registry entries;
- 0 unknown Region references;
- 0 `masterCode = null` in the allocation manifest;
- no TASK-041 graph topology mutation is introduced by TASK-043.

### 5. Consumer contract review

Review TASK-043's Option A / Option B analysis.

Default recommendation to test is Option A:

```ts
masterCode: string | null
```

Interpretation if accepted:

- `null` is legal only in Partial/draft/unallocated intermediate data;
- production-complete Region data must contain zero `null`;
- every non-null value must resolve to an active canonical registry entry;
- this does not make `null` a valid final production state.

If evidence shows this is unsafe or creates ambiguous downstream behavior, do not freeze it. Return the exact objection and required contract change.

### 6. Regression and CI

Re-run the focused TASK-043 tests and all relevant Planning Contracts / Planning Soak / Routing / Trip / Engine regressions. Also run:

```bash
npm run lint
npm run typecheck
npm run build
git diff --check
```

Run the repository's canonical full Node regression command as discovered from package scripts/CI. Do not invent or weaken a test command merely to obtain green output.

Record exact counts and any baseline failures.

### 7. Change-boundary audit

This review must not introduce unrelated changes. Confirm no changes to:

- TASK-041 graph topology;
- Planner / Step UI;
- database schema/migrations;
- Candidate Pipeline;
- POI production allocations;
- unrelated identifier families.

## Allowed corrections

If a small, objectively necessary defect is found in TASK-043-owned governance code/data/tests/docs, it may be corrected only on the TASK-044 review branch. Document every correction and rerun all affected tests.

Do not use this permission for redesign, consumer integration, mass migration, or unrelated cleanup.

## Deliverables

Create/update:

- `docs/tasks/RESULT-TASK-044-a-master-code-governance-acceptance.md`
- `docs/qa/TASK-044/acceptance-report.md`
- `docs/qa/TASK-044/registry-invariant-check.json`
- `docs/project/WBS-TravelAssist.md` tracking entry on the review branch

The acceptance report must end with exactly one owner-facing recommendation:

1. `ACCEPT` — technically ready for owner approval and subsequent merge authorization;
2. `ACCEPT WITH REQUIRED CORRECTIONS` — corrections are listed and require re-review;
3. `REJECT` — candidate is structurally unsuitable, with exact reasons.

## Completion states

### PASS

`Completed / Governance acceptance ready for owner approval`

Keep:

- PR #326 Open / Draft;
- Issue #311 Open;
- Issue #347 Open;
- WBS 2.18 `待审查`;
- WBS 4.48 `Partial`.

Do not merge anything automatically.

### Corrections required

`Partial / Corrections require re-review`

### Rejected

`Blocked / Governance candidate rejected`

## Explicitly forbidden

- `git clean -fd`
- `git reset --hard`
- `git push --force`
- `git push --force-with-lease`
- automatic merge of PR #326 or PR #306
- starting Candidate Pipeline
- starting TASK-041 integration before the registry is owner-approved and merged

## Next gate after this Task

If TASK-044 returns `ACCEPT`, stop and wait for owner approval/merge authorization for PR #326. Only after the accepted registry is merged into `develop` should a separate TASK integrate the canonical registry into TASK-041, replace the 50 Region `masterCode = null` values with governed allocations, rerun TASK-041 regression/CI, and separately re-review WBS 4.48.
