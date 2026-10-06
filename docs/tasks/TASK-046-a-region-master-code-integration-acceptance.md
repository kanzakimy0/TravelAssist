# TASK-046-A — WBS 4.48 Region Master Code Integration Acceptance Review

## Goal
Independently validate TASK-045-A / PR #352 before merge and before WBS 4.48 can be marked complete.

## Prerequisite
- PR #352 remains Open / Draft.
- Review head `fb6f2e44d6207a241a84410bc2fd588fcc378c18` unless it advances; record the actual reviewed head.
- Registry merge `24d5718e47fa1a7f9996a3717c4bd35c7ab89db0` must be an ancestor.
- Do not merge PR #352.

## Required independent checks
1. Region nodes = 50.
2. Region IDs preserved = 50/50.
3. Canonical Master Codes populated = 50/50.
4. Production graph null Master Codes = 0.
5. Active registry resolution = 50/50.
6. Duplicate Master Codes = 0.
7. Invalid lifecycle allocations = 0.
8. Unknown/mismatched Region allocations = 0.
9. Rejected legacy/side-channel identifiers = 0.
10. Generator authority is the canonical registry, not TASK-043/TASK-045 QA manifests.
11. Shared nullable contract remains only for explicit draft/partial data; production-complete graph has zero nulls.
12. All non-masterCode Region semantics, relation structures, travel edges and variants remain unchanged.
13. No Planner/Step UI, DB schema/migration, Candidate Pipeline, POI production allocation, Region taxonomy or unrelated identifier changes.

## Regression
Re-run at minimum:
- TASK-046 focused acceptance checks
- TASK-045 focused
- TASK-041 Region Graph
- TASK-043 Master Code
- TASK-044 governance acceptance
- Planning Contracts
- Planning Soak
- Routing
- Trip / Engine focused
- canonical full Node regression
- lint
- typecheck
- build
- TASK-owned Prettier
- git diff --check
- GitHub CI status

## Required outputs
- `docs/tasks/RESULT-TASK-046-a-region-master-code-integration-acceptance.md`
- `docs/qa/TASK-046/acceptance-report.md`
- `docs/qa/TASK-046/acceptance-check.json`
- WBS tracking update on the review branch only

## Decision
Return exactly one recommendation:
- `ACCEPT`
- `ACCEPT WITH REQUIRED CORRECTIONS`
- `REJECT`

PASS completion state:
`Completed / WBS 4.48 integration acceptance ready for owner approval`

On PASS keep:
- PR #352 Open / Draft
- WBS 4.48 `待审查`
- Issue #349 Open
- Issue #365 Open

Do not merge and do not start Candidate Pipeline.
