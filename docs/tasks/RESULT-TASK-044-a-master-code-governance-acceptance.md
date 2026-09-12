# TASK-044-A Result

## Status

Completed / Governance acceptance ready for owner approval

## Recommendation

ACCEPT

## Reviewed State

- Latest reviewed `origin/develop`: `065e74d6ed7e9ff87de37192d350efbd73c95672`
- TASK-043 candidate branch: `codex/a-master-code-registry`
- Reviewed candidate head: `3cac68b89097db9853ae881b43c8675b329e12dd`
- PR #326: Open / Draft; base `develop`; not merged, retargeted, or closed
- Issue #311: Open
- Issue #347: Open
- Review branch: `codex/a-master-code-governance-acceptance`
- Acceptance PR: #348, Open / Draft, stacked on #326 and not merged
- Review isolation: dedicated clean worktree; the main Planner/Step workspace was
  not changed

The current `origin/develop` was normally merged into the isolated review branch
to run the candidate against the latest repository baseline. This did not modify
PR #326.

## Independent Findings

The review independently reproduced the candidate's core claims rather than using
the TASK-043 Result as proof:

- the inherited five-digit segmented namespace is reused;
- no second Master Code grammar was introduced;
- `src/shared/data/master-code-registry.v1.json` is the sole hand-maintained
  canonical allocation registry;
- TypeScript validation and resolution consume that JSON source;
- generated TASK-043 allocation evidence is not treated as an authority;
- rejected legacy, destination, administrative, transport, POI, AI-local, and DB
  identifier families fail closed.

No TASK-043-owned defect requiring correction was found.

## Registry Invariants

- Registry entries: 51
- Reserved sentinel entries: 1
- Active Region entries: 50
- Unique Master Codes: 51/51
- Unique active entity allocations: 50/50
- Five-digit ASCII grammar: valid
- Active allocation immutability: enforced
- Append-only behavior: enforced
- Deprecated code recycling: rejected
- Missing supersession target: rejected
- Supersession cycle: rejected
- Unknown lifecycle: rejected
- Malformed or legacy code: rejected
- Unsafe entity reference whitespace/control characters: rejected
- Unknown code resolution: fail closed
- Side-channel/destination/administrative identifier masquerading: rejected

Machine-readable evidence:
`docs/qa/TASK-044/registry-invariant-check.json`.

## Region Allocation

- TASK-041 source Region identities: 50
- Allocation rows: 50
- Region IDs preserved exactly: 50/50
- Unique canonical Master Codes: 50/50
- Resolve to active registry entries: 50/50
- Unknown Region references: 0
- Null Master Codes in allocation manifest: 0
- TASK-041 topology changes introduced by TASK-043: 0

The existing TASK-041 graph remains Partial and unchanged. This Task did not write
the allocation values into the graph.

## Consumer Contract Review

Option A, `masterCode: string | null`, is accepted only with a strict publication
gate:

- `null` is legal only for explicitly Partial/draft/unallocated intermediate data;
- production-complete Region data requires zero null values;
- every non-null Master Code must resolve to an active registry entry;
- `null` is never a valid production-complete state.

The existing 50-node partial graph contains 50 nulls. The independent projected
production view applies all 50 reviewed allocations and results in 0 nulls and
50/50 active resolutions. A later, separate integration Task must perform the real
consumer update after owner approval and merge of PR #326.

## Change Boundary

Confirmed unchanged:

- TASK-041 graph topology;
- Planner / Step UI;
- database schema and migrations;
- Candidate Pipeline;
- POI production allocations;
- unrelated identifier families.

TASK-044 only adds independent governance acceptance code, tests, evidence,
documentation, and tracking.

## Validation

| Gate                             | Result                            |
| -------------------------------- | --------------------------------- |
| TASK-044 focused                 | 5/5 passed                        |
| TASK-043 focused                 | 15/15 passed                      |
| TASK-041 Region Graph            | 17/17 passed                      |
| Planning Contracts               | 21/21 passed                      |
| Planning Soak                    | 6/6 passed                        |
| Routing                          | 28/28 passed                      |
| Trip / Engine focused            | 124/124 passed                    |
| Canonical full Node regression   | 2459/2459 passed                  |
| `npm run lint`                   | passed                            |
| `npm run typecheck`              | passed                            |
| `npm run build`                  | passed                            |
| TASK-owned Prettier              | passed                            |
| `git diff --check`               | passed                            |
| GitHub `Install, test and build` | passed                            |
| GitHub merge-eligibility check   | passed; Draft PR remains unmerged |

The first restricted-sandbox full Node run passed 2455 tests and reported four
esbuild filesystem access failures. The identical canonical command was rerun with
normal local filesystem access and passed 2459/2459, confirming an environment
restriction rather than a repository regression.

## Files Changed

- `package.json`
- `tools/qa/master-code-governance-acceptance.mjs`
- `tests/task-044-master-code-governance-acceptance.test.mjs`
- `docs/qa/TASK-044/registry-invariant-check.json`
- `docs/qa/TASK-044/acceptance-report.md`
- `docs/tasks/RESULT-TASK-044-a-master-code-governance-acceptance.md`
- `docs/project/WBS-TravelAssist.md`

## WBS / Tracking

- WBS 2.18 remains `待审查`.
- WBS 4.48 remains `Partial`.
- PR #326 remains Open / Draft.
- PR #348 remains Open / Draft and must follow #326's owner approval/merge gate.
- Issues #311 and #347 remain Open.
- No merge was performed.

## Blockers

No technical acceptance blocker was found. Owner approval and explicit merge
authorization for PR #326 are still required before the registry can become the
accepted repository baseline.

## Next Gate

After owner approval and merge of PR #326, create a separate TASK-041 integration
task to apply the 50 governed allocations, rerun graph regression/CI, and re-review
WBS 4.48. This Task did not start that integration or Candidate Pipeline work.
