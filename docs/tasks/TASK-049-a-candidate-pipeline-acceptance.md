# TASK-049-A — WBS 4.49 Candidate Pipeline Independent Acceptance Review

## Goal
Perform an independent acceptance review of TASK-048-A / PR #372 before merge and before WBS 4.49 can be marked complete. Reproduce the Candidate Pipeline reference runtime claims from repository state rather than treating TASK-048 Result or generated QA evidence as proof.

## Reviewed implementation
- PR: #372
- Branch: `codex/a-candidate-pipeline-reference`
- Initial reviewed head: `b90917d2c5534ab73ed924cde4f79b992a93bb88`
- If the PR advances, review the exact latest head and record it.
- Keep PR #372 Open / Draft during review.

## Prerequisites
- WBS 4.48 = 已完成.
- PR #352 merge `4465d8fef68456a1d4554322b97fa5b3e3f10b82` is in the candidate lineage.
- Candidate Pipeline remains provider-free.

## Independent Review Scope
1. Inspect PR #372 runtime and changed-file boundary.
2. Reconstruct execution from runtime source and contract-valid fixtures.
3. Verify deterministic stage ordering and byte-stable normalized repeated output.
4. Verify stable Domain IDs and temporary Candidate IDs remain separated.
5. Verify Hard Filter is fail-closed and cannot be bypassed by later stages.
6. Verify must-go handling with explicit hard-rejection reasons.
7. Verify critical unknown facts remain NEEDS_FACT/unresolved and are not promoted.
8. Verify fallback/expansion/retry behavior is deterministic and bounded.
9. Verify Pareto behavior is genuinely multi-objective.
10. Verify Diversity never resurrects rejected candidates and prevents obvious monoculture.
11. Verify Top-N deterministic tie handling.
12. Verify Decision Trace / Reason Code coverage and safety boundaries.
13. Verify zero AI/provider calls, DB writes, scoring-weight changes, Region Graph changes, Master Code governance changes and Planner/Step UI changes.
14. Independently rerun the 14 pilot scenarios and negative cases.

## Mandatory Acceptance Gates
- deterministic repeat = PASS
- byte-stable normalized result = PASS
- hard reject bypass = 0
- must-go silently dropped = 0
- NEEDS_FACT silently promoted = 0
- dangling Region/POI/Candidate refs = 0
- improper Pareto dominated survivors = 0 unless explicitly protected with a contract-valid reason
- diversity-resurrected rejected candidates = 0
- unbounded loop/retry = 0
- Decision Trace stage coverage = 100%
- duplicate Candidate IDs rejected
- stale run/revision mismatch rejected
- invalid Region/POI refs rejected
- equal-score ordering deterministic
- AI/local run IDs do not leak into stable domain output
- all 14 required pilot scenarios independently pass
- AI/provider calls = 0
- production DB writes = 0
- scoring parameter changes = 0
- Region Graph semantic changes = 0
- Master Code governance/allocation changes = 0
- Planner/Step UI changes = 0

## Required Regression
- TASK-049 focused acceptance checks
- TASK-048 focused
- Planning Contracts
- Planning Soak
- Region Graph
- Master Code Registry
- Region Master Code integration
- Routing
- Trip / Engine focused
- canonical full Node regression
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- TASK-owned Prettier
- `git diff --check`
- GitHub CI / merge-eligibility for PR #372 exact reviewed head

## Required Outputs
- `docs/tasks/RESULT-TASK-049-a-candidate-pipeline-acceptance.md`
- `docs/qa/TASK-049/acceptance-report.md`
- `docs/qa/TASK-049/acceptance-check.json`
- focused review tooling/tests as needed
- Master WBS tracking update on review branch

## Completion
- PASS: `Completed / WBS 4.49 Candidate Pipeline acceptance ready for owner approval`, Recommendation = `ACCEPT`; WBS 4.49 remains `待审查`, PR #372 remains Open/Draft.
- Narrow defect: `Partial / Corrections require re-review`.
- Structural violation: `Blocked / Candidate Pipeline rejected`.

## Out of Scope
- merging PR #372
- AI Compact Context / Decision Adapter Pilot
- LLM/provider calls
- scoring calibration / candidate-0457 freeze
- Human Gold / reviewer answers
- production POI import
- DB migrations/persistence
- Planner UI
- Trip Mutation / Replanning runtime
- unrelated refactors

Do not merge PR #372 and do not start the next AI Pilot automatically.
