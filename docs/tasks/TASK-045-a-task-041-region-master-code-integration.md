# TASK-045-A — TASK-041 Region Master Code Integration / WBS 4.48 Revalidation

## Status
Ready to execute after PR #326 owner-approved merge.

## Goal
Integrate the owner-approved canonical Master Code registry into the existing TASK-041 Region graph, replacing the 50 draft `masterCode = null` values with the 50 governed allocations, while preserving Region identities and graph topology exactly.

## Owner / WBS
- Owner: A — Shared Infrastructure / Planning Contracts
- WBS: 4.48 — Region Graph / Master Code completion
- Task: TASK-045-A
- Issue: #349
- Priority: P0 integration closeout

## Prerequisite
- PR #326 merged to `develop` at merge commit `24d5718e47fa1a7f9996a3717c4bd35c7ab89db0`.
- TASK-044-A independent governance acceptance = `ACCEPT`.
- The execution branch must be based on the latest `origin/develop`, not a stale pre-merge TASK-041 branch.

## Critical governance rules
1. Reuse the merged canonical Master Code registry exactly.
2. Do not introduce another Master Code grammar or parallel allocation table.
3. Preserve all 50 existing TASK-041 `regionId` values exactly.
4. Preserve Region topology and unrelated metadata exactly unless a direct compatibility correction is unavoidable and explicitly documented.
5. Accepted Option A remains: `masterCode: string | null` may exist only for Partial/draft/unallocated intermediate data. The production-complete Region graph must have zero null Master Codes.
6. Every production Region Master Code must resolve to an active canonical registry entry.
7. Rejected `JP-RG-*`, `JP-PREF-*`, `JP-MACRO-*`, destination IDs, administrative IDs, transport IDs, POI IDs, AI-local IDs and DB IDs must never be used as canonical substitutes.

## Scope
### Stage 1 — Baseline and consumer audit
- Fetch latest `origin/develop`.
- Record exact base SHA.
- Locate the canonical TASK-041 Region graph, shared Region contract, validators, fixtures and tests.
- Verify current production graph has 50 Region nodes and 50 `masterCode = null` values before integration.
- Verify merged canonical registry contains the accepted 50 Region allocations.

### Stage 2 — Integration
- Apply the canonical allocation for each of the 50 Region identities.
- Prefer resolving from the canonical registry rather than copying from generated QA evidence when repository architecture supports it.
- Ensure the resulting production Region graph has exactly 50 non-null canonical Master Codes.
- Do not change parent/child relationships, ordering, labels, aliases, Region IDs or unrelated fields.

### Stage 3 — Consumer contract verification
- Keep shared `masterCode: string | null` semantics only if it remains necessary for explicit Partial/draft states.
- Do not make a breaking non-null type migration unless the existing merged contract and implementation require it for correctness; if such a migration appears necessary, stop and report rather than silently widening scope.
- Ensure completed production Region data itself has zero null values.

### Stage 4 — Independent evidence
Produce machine-readable and human-readable evidence showing:
- Region count before/after;
- null Master Codes before/after;
- Region ID identity 50/50;
- canonical Master Code population 50/50;
- active registry resolution 50/50;
- duplicate count = 0;
- unknown/deprecated/invalid allocation count = 0;
- topology semantic diff = 0 except Master Code population.

### Stage 5 — Regression
Run at minimum:
- TASK-045 focused tests;
- TASK-041 Region Graph tests;
- TASK-043 Master Code focused tests;
- TASK-044 governance acceptance checks where reusable;
- Planning Contracts;
- Planning Soak;
- Routing;
- Trip / Engine focused regression;
- canonical full Node regression;
- `npm run lint`;
- `npm run typecheck`;
- `npm run build`;
- TASK-owned Prettier/formatter check;
- `git diff --check`;
- GitHub CI.

If an environment/sandbox-only test failure occurs, reproduce with the canonical command in a normal repository environment and document both runs. Do not hide genuine regressions.

## Required acceptance gates
PASS requires all of the following:
- Region nodes = 50;
- Region IDs preserved = 50/50;
- canonical Master Codes populated = 50/50;
- production Region graph null Master Codes = 0;
- active registry resolution = 50/50;
- duplicate Master Codes = 0;
- invalid lifecycle allocations = 0;
- unknown Region references = 0;
- graph topology semantic changes = 0 except `masterCode` values;
- no rejected legacy/side-channel identifiers introduced;
- all relevant tests and CI pass;
- no Planner / Step UI, DB schema/migration, Candidate Pipeline, POI production allocation or unrelated refactor changes.

## Required outputs
- `docs/tasks/RESULT-TASK-045-a-task-041-region-master-code-integration.md`
- `docs/qa/TASK-045/region-master-code-integration-report.md`
- `docs/qa/TASK-045/region-master-code-integration.json`
- focused validation/test code as needed
- WBS tracking update

## WBS behavior
- WBS 4.48 may move from `Partial` to `待审查` only if every integration gate passes.
- Do not mark WBS 4.48 `已完成` before separate human review/merge.
- Do not modify unrelated WBS states.

## Branch / PR
Suggested branch:
`codex/a-task-041-master-code-integration`

Create a Draft PR to `develop` only.
Do not auto-merge.

## Explicitly out of scope
- Candidate Pipeline
- Human Gold / scoring
- POI mass Master Code allocation
- production DB persistence or migrations
- UI changes
- Region taxonomy/topology redesign
- Region ID renumbering
- unrelated cleanup/refactor

## Completion states
### Completed
`Completed / TASK-041 Region Master Code integration ready for human review`

Use only when all 50 allocations are integrated, the production graph has zero nulls, topology is unchanged, and all required validation/CI passes.

### Partial
`Partial / Integration corrections require review`

Use when a narrow compatibility correction remains or requires review without invalidating governance.

### Blocked
`Blocked / Registry-consumer incompatibility`

Use only if the merged canonical registry and TASK-041 consumer cannot be reconciled without changing approved governance or Region graph semantics.

## Stop condition
After creating the Draft PR and Result, stop. Do not start Candidate Pipeline or any later task automatically.
