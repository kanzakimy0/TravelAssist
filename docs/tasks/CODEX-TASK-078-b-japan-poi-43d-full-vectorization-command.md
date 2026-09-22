# CODEX COMMAND — TASK-078-B

请在 `kanzakimy0/TravelAssist` 中完整执行 TASK-078-B。

## Tracking

- Issue: #425
- Task: TASK-078-B
- Task branch: `task/b-task-078-japan-poi-43d-full-vectorization`
- Execution branch: `codex/b-task-078-japan-poi-43d-full-vectorization`
- Upstream: `codex/b-task-075-japan-poi-entity-resolver-43d-completion`
- Expected upstream SHA: `d706534dbfd3aa77d2857f3c214f66a8a84d07c3`
- Upstream PR: #423
- TASK-077-B / Issue #424: SUPERSEDED — DO NOT EXECUTE

## Start

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/codex/b-task-075-japan-poi-entity-resolver-43d-completion
git rev-parse origin/task/b-task-078-japan-poi-43d-full-vectorization
git log --oneline -15 origin/task/b-task-078-japan-poi-43d-full-vectorization
```

Read the complete task:

```bash
git show origin/task/b-task-078-japan-poi-43d-full-vectorization:docs/tasks/TASK-078-b-japan-poi-43d-full-vectorization.md
```

Read the authoritative TASK-075 baseline:

```bash
git show origin/task/b-task-078-japan-poi-43d-full-vectorization:docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md
git show origin/task/b-task-078-japan-poi-43d-full-vectorization:src/shared/contracts/planning/features.ts
```

Use a dedicated clean worktree.

Create/continue:

`codex/b-task-078-japan-poi-43d-full-vectorization`

from the TASK-078 task branch / exact TASK-075 ancestry.

## The requirement is numeric output, not another audit

Authoritative starting point:

```text
POIs: 10,369
feature positions: 445,867
existing numeric: 6,385
existing null: 439,482
complete 43/43 POIs: 0
```

Required TASK-078 end state:

```text
POIs: 10,369 / 10,369
43D: 43 / 43 for every POI
numeric values: 445,867 / 445,867
null: 0
preserve existing numeric: 6,385
fill previously-null: 439,482
```

Do not finish merely because all fields were “reviewed”.

A field is complete only when it has an integer 0..9 in the TASK-078 complete operational vector.

## 52 fixed batches

Freeze the 10,369 membership and deterministic order.

Run:

```text
B001 = rows 1-200
B002 = rows 201-400
...
B051 = rows 10001-10200
B052 = rows 10201-10369
```

That is:

```text
51 × 200 + 1 × 169 = 52 batches
```

Every batch must output complete 43-value vectors.

After a batch passes QA:
- write receipt;
- update progress manifest;
- commit;
- ordinary push;
- automatically start the next batch.

No user confirmation between batches.

## Mandatory value hierarchy

For every previously-null cell, descend until a numeric value exists:

```text
DIRECT_SUPPORTED
      ↓
RULE_INFERRED
      ↓
MODEL_INFERRED
      ↓
PRIOR_FALLBACK
```

No null may survive.

Every value must record:
- score 0..9;
- derivation tier;
- confidence;
- trace/basis.

Modeled/fallback values are allowed, but must not be mislabeled as direct facts.

Do not use one universal 5 as fallback.

Use calibrated entity/type/category/peer priors with deterministic backoff.

## Existing 6,385 values

Freeze them.

Do not change them in TASK-078.

If one looks suspicious:
- retain it;
- write it to review queue;
- continue.

The task is filling, not rescoring.

## B001 is real production output

Do not stop after:
- designing a schema;
- building a rubric;
- calibrating priors;
- writing a Canary plan.

The first execution must produce B001: 200 POIs × 43 numeric values.

If B001 validation fails, repair it and rerun B001, then automatically continue.

## Bounded evidence work

Do not repeat 43 independent searches per POI.

Reuse retained TASK-073/074/075 evidence first.

Fresh research is bounded.

If direct evidence is insufficient, continue down the inference hierarchy.

Evidence scarcity is not a blocker.

## Resume

Implement a resumable runner, preferably equivalent to:

```bash
node tools/poi/run-task-078-full-vectorization.mjs --resume
```

It must inspect the progress manifest and continue from the first unfinished/invalid batch.

## Final deliverable

Produce at least:

```text
data/poi/full/task-078-b-japan-poi-43d-full-vectorization/
  population-manifest.json
  priors-v1.json
  progress.json
  batches/B001.jsonl.gz
  ...
  batches/B052.jsonl.gz
  poi-43d-complete.jsonl.gz
  poi-43d-trace.jsonl.gz

docs/qa/TASK-078-B/
  batches/B001-receipt.json
  ...
  batches/B052-receipt.json
  final-coverage.json
  final-coverage.md
  low-confidence-improvement-queue.jsonl.gz

docs/tasks/
  RESULT-TASK-078-b-japan-poi-43d-full-vectorization.md
```

Final acceptance requires:

```text
10369 rows
43 numeric values / row
445867 total numeric values
0 null
52/52 batch receipts PASS
6385 previous values preserved
439482 previously-null positions filled
deterministic/checksum PASS
exact-current-head GitHub Quality Gate PASS
```

## Git safety

Forbidden:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
direct push develop/main
auto-merge
Registry rebind
Master Code allocation
candidateKey mutation
production import
```

If PR #423 remains unmerged, the TASK-078 Draft PR base is:

`codex/b-task-075-japan-poi-entity-resolver-43d-completion`

Do not auto-merge.

Do not stop for ordinary source scarcity, missing direct evidence, low confidence, or a high fallback rate. Those conditions are recorded, not treated as blockers.
