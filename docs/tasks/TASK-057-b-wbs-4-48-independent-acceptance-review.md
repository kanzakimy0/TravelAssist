# TASK-057-B — WBS 4.48 Independent Acceptance Review / Regression Support

## Status

Authorized / Ready for Codex execution.

## Tracking

- Related WBS: `4.48 Travel Region Graph Pilot / Reference Dataset`
- WBS canonical Owner: **A**
- Review/support executor: **B**
- Issue: `#359`
- A implementation under review: `TASK-045-A / Issue #349 / Draft PR #352`
- A branch: `codex/a-task-041-master-code-integration`
- Publication-time reviewed candidate head: `fb6f2e44d6207a241a84410bc2fd588fcc378c18`
- Publication baseline: `develop@d23dedef1b6ecf9133fb544451d8b6789482213e`
- Spec branch: `task/b-wbs-4-48-independent-acceptance-review`
- Planned B review branch: `codex/b-wbs-4-48-independent-acceptance-review`

## 1. Objective

Perform an **independent B-side acceptance review** of A's WBS 4.48 Master Code integration candidate without taking ownership of WBS 4.48 and without modifying A-owned Region Graph implementation files.

B's job is to answer one question with reproducible evidence:

> Does the exact latest TASK-045-A / PR #352 candidate safely complete the remaining Master Code gate for the existing 50-node Region Graph while preserving graph semantics and current repository compatibility?

The final recommendation must be exactly one of:

- `ACCEPT`
- `ACCEPT WITH REQUIRED CORRECTIONS`
- `REJECT`

A review may also return `PARTIAL / PR head advanced or current-develop integration pending` when an exact final candidate cannot yet be frozen.

## 2. Ownership / concurrency boundary

WBS 4.48 remains **Owner=A**.

This Task is a B support/review task only. It does not change the Master WBS owner or replace TASK-045-A.

### Hard conflict-avoidance rule

At execution time, obtain PR #352's complete changed-file list. B MUST NOT edit any file changed by PR #352.

At publication, PR #352 changes these A-owned files:

- `docs/project/WBS-TravelAssist.md`
- `docs/qa/TASK-041/graph-validation.json`
- `docs/qa/TASK-041/master-code-audit.json`
- `docs/qa/TASK-041/pilot-report.md`
- `docs/qa/TASK-041/region-nodes.json`
- `docs/qa/TASK-045/region-master-code-integration-report.md`
- `docs/qa/TASK-045/region-master-code-integration.json`
- `docs/tasks/RESULT-TASK-045-a-task-041-region-master-code-integration.md`
- `package.json`
- `tests/task-041-region-graph-pilot.test.mjs`
- `tests/task-045-region-master-code-integration.test.mjs`
- `tools/qa/region-graph-pilot.mjs`
- `tools/qa/region-master-code-integration.mjs`

Re-fetch the list before work. If A changes more files, those new files become protected too.

B deliverables must stay under TASK-057-specific paths unless a later explicit user instruction authorizes a fix.

## 3. Review target resolution

Before reviewing:

1. fetch latest `origin/develop`;
2. fetch latest A branch / PR #352 metadata;
3. record exact PR head SHA;
4. record current `origin/develop` SHA;
5. determine merge-base / ahead / behind state;
6. record whether PR #352 has advanced since publication.

The review must always target the **latest exact PR #352 head at the start of the final review pass**.

If A pushes a new commit after B has reviewed the candidate, the previous recommendation is stale. Re-run at least all focused acceptance gates against the new head before returning a final ACCEPT.

## 4. Read-only implementation audit

Inspect A's PR #352 diff and independently verify that it is limited to the approved remaining 4.48 integration scope.

Required audit questions:

1. Is the existing 50-node Region Graph reused instead of replaced or re-taxonomized?
2. Are existing `regionId` values preserved exactly?
3. Are Master Codes sourced from the merged canonical registry/governed allocation, not derived from names, destination IDs, prefecture codes, transport IDs, POI IDs, DB IDs, or rejected `JP-RG-* / JP-PREF-* / JP-MACRO-*` substitutes?
4. Does the production/reference Region Graph contain 50/50 non-null canonical Master Codes?
5. Does every published Master Code resolve to one active canonical registry entry?
6. Are duplicates, unknown codes, deprecated-invalid or superseded-invalid references zero?
7. Are RegionRelation semantics unchanged?
8. Are TravelEdge semantics unchanged?
9. Are TravelEdgeVariant semantics unchanged?
10. Is corridor reachability unchanged?
11. Are Planning Prior / Live Route Fact boundaries unchanged?
12. Is there any unrelated Planner UI, DB migration, Provider, AI, Candidate Pipeline, POI scoring or Engine runtime work in the PR?

## 5. Independent evidence requirements

Do not merely trust A's committed TASK-045 evidence. Recompute the important invariants independently where possible.

Create:

- `docs/qa/TASK-057/acceptance-evidence.json`
- `docs/qa/TASK-057/acceptance-report.md`
- `docs/tasks/RESULT-TASK-057-b-wbs-4-48-independent-acceptance-review.md`

The machine-readable evidence must include at least:

- latest reviewed PR number and exact head SHA;
- current develop SHA and merge-base;
- changed-file list hash or equivalent immutable summary;
- Region node count;
- preserved Region IDs count;
- non-null canonical Master Code count;
- null count;
- active registry resolution count;
- duplicate / unknown / lifecycle-invalid counts;
- rejected legacy substitute count;
- semantic/topology identity evidence excluding the intended `masterCode` population;
- corridor reachability result;
- full command/test matrix with exit codes/counts;
- GitHub Quality Gate status for the reviewed PR head or explicit reason it is not yet final;
- final recommendation.

## 6. Test / QA matrix

Use execution-time canonical scripts from the repository. At minimum run against the reviewed A candidate:

- `npm ci`
- TASK-041 Region Graph focused tests
- TASK-045 Master Code integration focused tests
- Master Code Registry tests / QA
- Planning Contracts
- Planning Soak / consistency QA
- Routing focused regression
- Trip / Engine relevant regression
- full repository Node regression
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- current deployment validate / build / artifact verification gates
- scoped formatting checks for B review files
- `git diff --check`

Do not report a skipped or unexecuted mandatory gate as PASS.

### Current-develop compatibility check

PR #352 was published from an older develop base. B must independently check compatibility with execution-time latest `origin/develop` without pushing changes to the A branch.

A local disposable review worktree/temporary branch may be used to test the PR head combined with latest develop. Do not force-update or push A's branch.

If current develop cannot be integrated cleanly or regression fails only after latest-develop integration, recommendation cannot be plain ACCEPT; report the exact blocker/correction required.

## 7. GitHub CI gate

Record the GitHub checks associated with the exact reviewed PR head.

Plain `ACCEPT` requires:

- reviewed head is still the current PR #352 head at finalization;
- relevant GitHub Quality Gate/checks are successful on that exact head or its GitHub PR merge revision as defined by the current repository workflow;
- no newer unchecked A commit exists.

If the PR head advances after the check or after review, return PARTIAL/stale until re-reviewed.

## 8. B branch / deliverable rules

Create B review work from latest `origin/develop` on:

`codex/b-wbs-4-48-independent-acceptance-review`

Only commit B-owned independent review artifacts:

- `docs/qa/TASK-057/**`
- `docs/tasks/RESULT-TASK-057-b-wbs-4-48-independent-acceptance-review.md`

Do **not** modify:

- WBS 4.48 owner;
- A PR #352 branch;
- TASK-041 / TASK-045 A evidence;
- Region Graph data;
- Master Code registry/allocation data;
- A integration tools/tests;
- `package.json`;
- product/runtime code.

A Draft PR for the B review artifacts may target `develop`, but it must not merge or substitute for PR #352.

## 9. Result semantics

### ACCEPT

Use only when all invariants, regressions, current-develop compatibility, scope review, and exact-head CI pass.

### ACCEPT WITH REQUIRED CORRECTIONS

Use when the implementation approach is structurally sound but one or more concrete corrections are required before PR #352 should merge. List each correction precisely. Do not patch A files in this Task.

### REJECT

Use when the candidate violates canonical governance, changes approved graph semantics, has unsafe identifier substitution, introduces incompatible topology, or otherwise cannot be accepted with narrow corrections.

### PARTIAL

Use when A's head changes during review, latest-develop compatibility cannot yet be finalized, or required CI is still missing. Partial is not acceptance.

## 10. WBS / issue behavior

- Do not change WBS 4.48 Owner=A.
- Do not mark WBS 4.48 completed.
- Do not close A Issue #349 or merge PR #352.
- Issue #359 tracks only this B independent review.
- Do not start Candidate Pipeline, POI scoring, AI, Engine 4.22–4.24 or another downstream Task.

Return the complete RESULT-TASK-057-B for user decision.
