# CODEX — TASK-047-A

请执行 TravelAssist 的 TASK-047-A。

Repository:
`https://github.com/kanzakimy0/TravelAssist`

Issue:
`#371`

Target PR:
`#352`

Target branch:
`codex/a-task-041-master-code-integration`

Previously accepted TASK-046 head:
`3281a072e976e747256a0e73cbd2692f9a9915f7`

## Start checks

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/codex/a-task-041-master-code-integration
git log --oneline -15 origin/develop
```

Confirm canonical Registry history:

```bash
git merge-base --is-ancestor \
24d5718e47fa1a7f9996a3717c4bd35c7ab89db0 \
origin/codex/a-task-041-master-code-integration
```

## Prohibited commands

Do not run:

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Do not rebase or rewrite the existing PR #352 branch history.

## Read authoritative Task

```bash
git show origin/develop:docs/tasks/TASK-047-a-pr352-latest-develop-sync-delta-revalidation.md
```

Strictly follow that Task.

## Execution rule

Use a dedicated clean worktree.

On `codex/a-task-041-master-code-integration`, normally merge latest `origin/develop` into the branch. Resolve only actual conflicts required to preserve both latest develop and the already accepted TASK-045/TASK-046 Region Master Code behavior.

Do not create a replacement implementation PR. Continue using PR #352.

## Mandatory post-sync invariants

Independently confirm on the NEW exact head:

```text
Region nodes = 50
Region IDs preserved = 50/50
Canonical Master Codes populated = 50/50
Production graph masterCode null = 0
Active canonical Registry resolution = 50/50
Duplicate Master Codes = 0
Invalid lifecycle allocations = 0
Unknown/mismatched Region allocations = 0
Legacy/side-channel substitutions = 0
Semantic topology changes excluding masterCode = 0
Runtime QA-manifest dependency = 0
```

Runtime authority must remain:

`src/shared/data/master-code-registry.v1.json`

TASK-047 must introduce zero intentional semantic changes to:
- Region taxonomy / ordering / IDs;
- RegionRelation;
- TravelEdge / TravelEdgeVariant;
- Master Code governance/allocation;
- nullable contract semantics;
- Planner/Step UI;
- DB schema/migrations;
- Candidate Pipeline;
- POI production allocation.

## Delta evidence

Explicitly record:
- old accepted head `3281a072e976e747256a0e73cbd2692f9a9915f7`;
- latest develop SHA merged;
- merge commit SHA;
- new PR #352 head;
- conflict files and resolution decisions;
- upstream-only file changes;
- TASK-047-owned conflict-resolution changes;
- semantic before/after comparison;
- whether TASK-046 ACCEPT remains valid.

## Validation

Rerun at least:

```text
TASK-047 focused delta checks
TASK-046 focused
TASK-045 focused
TASK-041 Region Graph
TASK-043 Master Code
TASK-044 governance acceptance
Planning Contracts
Planning Soak
Routing
Trip / Engine focused
Canonical full Node regression
npm run lint
npm run typecheck
npm run build
TASK-owned Prettier
git diff --check
GitHub CI
GitHub merge-eligibility
```

## Tracking behavior

- WBS 4.48 remains `待审查`.
- PR #352 remains Draft/Open.
- Do not merge PR #352.
- Do not start Candidate Pipeline.

## Completion

After pushing the updated PR #352 branch, return the complete file:

`docs/tasks/RESULT-TASK-047-a-pr352-latest-develop-sync-delta-revalidation.md`

Stop there.