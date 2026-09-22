# CODEX COMMAND — TASK-077-B

请在 `kanzakimy0/TravelAssist` 仓库中完整执行 TASK-077-B。

## Tracking

- Issue: #424
- Task branch: `task/b-task-077-japan-poi-43d-coverage-engine`
- Execution branch: `codex/b-task-077-japan-poi-43d-coverage-engine`
- Upstream execution branch: `codex/b-task-075-japan-poi-entity-resolver-43d-completion`
- Expected TASK-075-B upstream head: `d706534dbfd3aa77d2857f3c214f66a8a84d07c3`
- TASK-075-B PR: #423
- TASK-075-B exact-head Quality Gate run: `35731940622`

## Start

First inspect the current repository and fetch all refs:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/codex/b-task-075-japan-poi-entity-resolver-43d-completion
git rev-parse origin/task/b-task-077-japan-poi-43d-coverage-engine
git log --oneline -15 origin/task/b-task-077-japan-poi-43d-coverage-engine
```

Read the full task from the remote task branch:

```bash
git show origin/task/b-task-077-japan-poi-43d-coverage-engine:docs/tasks/TASK-077-b-task-075-closure-japan-poi-43d-coverage-engine.md
```

Also read the authoritative upstream baseline and frozen contracts:

```bash
git show origin/task/b-task-077-japan-poi-43d-coverage-engine:docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md
git show origin/task/b-task-077-japan-poi-43d-coverage-engine:src/shared/contracts/planning/features.ts
git show origin/task/b-task-077-japan-poi-43d-coverage-engine:data/poi/full/rubrics/candidate-feature-rubric.v1.json
```

Use a dedicated clean worktree and create/continue:

`codex/b-task-077-japan-poi-43d-coverage-engine`

from the published TASK-077 task branch / exact TASK-075 ancestry.

## Execution requirement

Do not rerun the TASK-075 identity resolver unless TASK-077 introduces a demonstrated identity regression.

Execute the Task phases in order:

1. TASK-075 scope closeout;
2. baseline/non-regression freeze;
3. Fact v2 contract;
4. 43D rubric v2;
5. 120+ calibration corpus / blind holdout;
6. frozen 200-POI Canary;
7. if Canary gates pass, automatically run the frozen 2,519 core POI expansion in <=200-row batches;
8. build the full 10,369 remaining-gap manifest;
9. run final repository QA and exact-current-head GitHub Quality Gate;
10. write `docs/tasks/RESULT-TASK-077-b-task-075-closure-japan-poi-43d-coverage-engine.md`;
11. ordinary push only;
12. create/update Draft PR.

The core rule is:

`source -> retained fact -> normalized fact -> ruleId -> 0..9 score -> provenance -> task-scoped canonical apply`

Never fill a score from model memory, POI name, or category alone.

Coverage targets never authorize fabrication.

## Git safety

Forbidden:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
direct push to develop/main
auto-merge
Registry rebind
Master Code allocation
candidateKey mutation
production import
```

If PR #423 is still unmerged, TASK-077 Draft PR must target:

`codex/b-task-075-japan-poi-entity-resolver-43d-completion`

Do not stop for ordinary batch/source/test remediation. Self-heal according to the Task. Only report true blockers defined in TASK-077-B.
