# TASK-047-A — PR #352 Latest Develop Sync / Acceptance Delta Revalidation

## Goal
Restore PR #352 to a clean mergeable state against the latest `develop` without changing approved TASK-045/TASK-046 Region Master Code semantics, then perform a delta revalidation sufficient to preserve the TASK-046 ACCEPT decision on the new exact head.

## Owner / WBS
- Owner: A — Shared Infrastructure / Planning Contracts
- WBS: 4.48 — Region Graph / Master Code completion
- Task: TASK-047-A
- Issue: #371
- Priority: P0 merge-readiness closeout

## Prerequisite
- TASK-046-A recommendation = ACCEPT.
- Reviewed PR #352 head before develop advanced: `3281a072e976e747256a0e73cbd2692f9a9915f7`.
- Canonical Registry merge `24d5718e47fa1a7f9996a3717c4bd35c7ab89db0` must remain an ancestor.
- PR #352 is Open / Draft and currently requires synchronization with latest `develop`.
- Do not merge PR #352 automatically.

## Required execution
1. Use a dedicated clean worktree.
2. Fetch latest `origin/develop` and record exact SHA.
3. Check out `codex/a-task-041-master-code-integration`.
4. Perform a normal merge of latest `origin/develop` into the branch.
5. Do not rebase, force-push, rewrite history, or reset.
6. Resolve only merge conflicts necessary to preserve both latest `develop` and the accepted TASK-045/TASK-046 Region Master Code integration.
7. Re-run all required validation on the new exact head.
8. Push the updated existing branch and keep PR #352 Draft/Open.

## Semantic freeze
TASK-047 must not intentionally change:
- Region taxonomy;
- Region IDs or ordering;
- names, aliases, centers, geometry, gateway metadata;
- RegionRelation;
- TravelEdge;
- TravelEdgeVariant;
- Master Code allocations/governance;
- `masterCode: string | null` contract semantics;
- Planner/Step UI behavior;
- DB schema/migrations;
- Candidate Pipeline;
- POI production allocation;
- unrelated identifier families.

## Mandatory invariants
- Region nodes = 50.
- Region IDs preserved = 50/50.
- Canonical Master Codes populated = 50/50.
- Production graph `masterCode = null` = 0.
- Active canonical Registry resolution = 50/50.
- Duplicate Master Codes = 0.
- Invalid lifecycle allocations = 0.
- Unknown/mismatched Region allocations = 0.
- Legacy/side-channel substitutions = 0.
- Semantic topology changes excluding `masterCode` = 0.
- Runtime authority remains `src/shared/data/master-code-registry.v1.json`.
- Runtime dependency on TASK-043/TASK-045 QA manifests = 0.

## Delta evidence
Record:
- old accepted head `3281a072e976e747256a0e73cbd2692f9a9915f7`;
- latest `origin/develop` SHA merged;
- merge commit SHA;
- new PR #352 head;
- conflicted files;
- exact conflict-resolution decisions;
- upstream-only changes;
- TASK-047-owned resolution changes;
- semantic comparison of Region behavior before/after sync;
- confirmation that TASK-046 ACCEPT invariants remain true.

## Required validation
At minimum:
- TASK-047 focused delta checks;
- TASK-046 focused;
- TASK-045 focused;
- TASK-041 Region Graph;
- TASK-043 Master Code;
- TASK-044 governance acceptance;
- Planning Contracts;
- Planning Soak;
- Routing;
- Trip / Engine focused;
- canonical full Node regression;
- `npm run lint`;
- `npm run typecheck`;
- `npm run build`;
- TASK-owned Prettier;
- `git diff --check`;
- GitHub CI and merge eligibility for updated PR #352.

## Required outputs
- `docs/tasks/RESULT-TASK-047-a-pr352-latest-develop-sync-delta-revalidation.md`
- `docs/qa/TASK-047/delta-revalidation-report.md`
- `docs/qa/TASK-047/delta-revalidation.json`
- focused validation tooling/tests as needed
- WBS tracking update only on the PR #352 branch

## WBS behavior
WBS 4.48 remains `待审查`. Do not mark it `已完成` until the owner explicitly authorizes PR #352 merge and that merge actually completes.

## PR behavior
- Continue using existing PR #352.
- Do not create a replacement implementation PR.
- Keep PR #352 Draft/Open.
- Do not auto-merge.
- A stacked docs/review PR is allowed only if necessary, but the implementation synchronization must remain on PR #352.

## Completion states
- `Completed / PR #352 resynchronized and acceptance preserved` — latest develop merged normally, conflicts safely resolved, all invariants/regression/CI pass, PR #352 mergeable/clean.
- `Partial / Delta corrections require review` — narrow conflict-resolution correction remains and requires another review.
- `Blocked / Upstream change invalidates prior acceptance` — latest develop conflicts with approved Region semantics or Master Code governance.

## Stop rule
Stop after updated Draft PR #352 + Result. Do not merge PR #352. Do not start Candidate Pipeline.