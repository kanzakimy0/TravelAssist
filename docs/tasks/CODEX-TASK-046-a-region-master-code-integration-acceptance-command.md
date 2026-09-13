# CODEX — TASK-046-A Region Master Code Integration Acceptance Review

Repository: `https://github.com/kanzakimy0/TravelAssist`

Issue: `#365`

## Start checks

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
git rev-parse origin/codex/a-task-041-master-code-integration
git merge-base --is-ancestor 24d5718e47fa1a7f9996a3717c4bd35c7ab89db0 origin/codex/a-task-041-master-code-integration
```

Forbidden:

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Read the full task:

```bash
git show origin/develop:docs/tasks/TASK-046-a-region-master-code-integration-acceptance.md
```

## Execution rules

- Use a dedicated clean worktree.
- Do not treat TASK-045 Result as proof; independently reproduce the acceptance claims from repository state.
- Review PR #352 exact head `fb6f2e44d6207a241a84410bc2fd588fcc378c18` unless it has advanced. If advanced, record and review the new head.
- Keep PR #352 Open / Draft.
- Do not merge PR #352.
- Do not start Candidate Pipeline.
- Do not modify Planner/Step UI or database migrations.

## Required final gates

```text
Region nodes = 50
Region IDs preserved = 50/50
Canonical Master Codes populated = 50/50
Production graph null Master Codes = 0
Active registry resolution = 50/50
Duplicate Master Codes = 0
Invalid lifecycle allocations = 0
Unknown/mismatched allocations = 0
Legacy/side-channel substitutions = 0
Semantic topology changes excluding masterCode = 0
```

Run the full validation set required by TASK-046, produce the machine-readable and human-readable evidence, update WBS tracking only on the review branch, create a Draft PR if repository convention requires one, and stop.

Return the complete file:

`docs/tasks/RESULT-TASK-046-a-region-master-code-integration-acceptance.md`
