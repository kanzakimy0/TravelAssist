# CODEX COMMAND — TASK-045-A

Execute TASK-045-A in the TravelAssist repository.

Repository:
`https://github.com/kanzakimy0/TravelAssist`

Issue:
`#349`

## Mandatory preflight

Run exactly:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Confirm that `origin/develop` contains PR #326 merge commit:

```bash
git merge-base --is-ancestor 24d5718e47fa1a7f9996a3717c4bd35c7ab89db0 origin/develop
```

If this check fails, stop and report `Blocked / prerequisite merge missing`.

## Forbidden commands

Do not run:

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Do not modify or discard unrelated local Planner / Step work.
Use an isolated clean worktree if needed.

## Read the authoritative Task

```bash
git show origin/develop:docs/tasks/TASK-045-a-task-041-region-master-code-integration.md
```

Also review the merged governance and prior acceptance evidence before editing:

```bash
git show origin/develop:docs/architecture/master-code-registry-v0.1.md
git show origin/develop:docs/tasks/RESULT-TASK-043-a-master-code-registry.md
```

If TASK-044 acceptance artifacts are not yet in `origin/develop` because PR #348 is still stacked/open, use the supplied acceptance Result only as review evidence; do not make TASK-045 depend on merging PR #348 unless repository content actually requires it.

## Execution branch

Create a dedicated branch from the latest `origin/develop`:

```bash
git switch --create codex/a-task-041-master-code-integration origin/develop
```

If that branch already exists, verify its base and integrate the latest `origin/develop` normally. Do not rebase destructively or force-push.

## Core objective

Integrate the 50 owner-approved canonical Master Code allocations into the existing TASK-041 Region graph.

Required end state:
- Region count = 50
- Region IDs preserved = 50/50
- canonical Master Codes populated = 50/50
- production Region graph null Master Codes = 0
- active registry resolution = 50/50
- duplicate Master Codes = 0
- graph topology semantic changes = 0 except Master Code population

Preserve accepted Option A semantics: the shared type may remain `masterCode: string | null` for explicit Partial/draft states, but the production-complete Region graph must contain zero nulls.

Do not introduce `JP-RG-*`, `JP-PREF-*`, `JP-MACRO-*`, destination IDs, administrative IDs, transport IDs, POI IDs, AI-local IDs or DB IDs as canonical substitutes.

## Validation

Run the full validation required by the Task, including focused TASK-045/TASK-041/Master Code checks, Planning Contracts, Planning Soak, Routing, Trip/Engine focused tests, canonical full Node regression, lint, typecheck, build, formatter/Prettier, `git diff --check`, and GitHub CI.

Do not hide sandbox-only failures. Reproduce them with the canonical command in a normal repository environment and document the distinction.

## Required outputs

Produce at minimum:

```text
docs/tasks/RESULT-TASK-045-a-task-041-region-master-code-integration.md
docs/qa/TASK-045/region-master-code-integration-report.md
docs/qa/TASK-045/region-master-code-integration.json
```

Update WBS 4.48 to `待审查` only if every integration gate passes. Do not mark it `已完成` before separate human review/merge.

## PR behavior

Push the branch and create a Draft PR to `develop`.
Do not auto-merge.
Do not start Candidate Pipeline.
Do not start any subsequent Task.

At completion, return the full contents of:

`docs/tasks/RESULT-TASK-045-a-task-041-region-master-code-integration.md`
