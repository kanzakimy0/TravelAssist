# A TASK-026–035 Execution Plan

> Publication base: `develop@171900698180b80220017c9c4bec551b72792f27`
> Task-definition branch: `task/a-current-executable-batch-20260909`
> Date: 2026-09-09 JST

## Purpose

This package turns the currently executable A-line work into Codex-ready tasks without duplicating existing implementations.

## Execution lanes

### Lane A — Existing PR closeout (parallel allowed)
- TASK-026-A / Issue #256 / WBS 8.5 / source PR #227
- TASK-027-A / Issue #257 / WBS 9.10 / source PR #231
- TASK-028-A / Issue #258 / WBS 9.11 / source PR #245

Each task must update the existing implementation branch and PR. Do not create a second implementation.

### Lane B — Integration review (parallel)
- TASK-029-A / Issue #259 / WBS 0.9 + 1.10 + 1.12 + 1.13

Documentation/integration review only. It cannot substitute for user design acceptance.

### Lane C — Home/Main Entry (strict serial)
1. TASK-030-A / Issue #260 / WBS 3.3
2. TASK-031-A / Issue #261 / WBS 3.4
3. TASK-033-A / Issue #263 / WBS 3.5

Do not run these three in parallel because they may touch Home/Header/shared entry files.

### Lane D — Independent design/governance/QA (parallel)
- TASK-032-A / Issue #262 / WBS 1.19
- TASK-034-A / Issue #264 / WBS 0.6
- TASK-035-A / Issue #265 / WBS 9.1

TASK-032 can run before TASK-033 and should be consumed by TASK-033 if already available.

## Global execution rules

1. Start from the latest `origin/develop` at execution time, not this publication base.
2. Before changing files:
   - `git status --short`
   - `git branch --show-current`
   - `git fetch --all --prune`
   - `git rev-parse origin/develop`
   - inspect relevant open PRs/issues and current WBS.
3. Never run:
   - `git clean -fd`
   - `git reset --hard`
   - `git push --force`
   - `git push --force-with-lease`
4. Preserve dirty/unrelated worktrees. Prefer an independent worktree.
5. Do not auto-merge. Implementation/closeout PRs remain Draft until explicit user acceptance.
6. Do not mark a WBS item `已完成` before merge to `develop` plus user acceptance.
7. Do not fabricate live-provider, cloud, browser, DB, production or security evidence.
8. Every implementation task must update:
   - its Result file,
   - Master WBS,
   - Issue,
   - Draft PR metadata.
9. Existing baseline formatting debt must be reported separately from new/changed-file failures.
10. No new paid vendor, production release, DNS change, real business migration, or credential purchase is authorized by this package.

## Recommended order

```text
026 + 027 + 028  (parallel acceptance closeouts)
        │
        ├── 029 (integration review, parallel)
        ├── 032 (AI UX design, parallel)
        ├── 034 (DoD, parallel)
        └── 035 (test baseline, parallel)

Home lane:
030 → 031 → 033
```

## Do not start from this package

The following remain gated and are intentionally not taskified here:
- 2.16 → 9,000 POI production batches
- 3.2.1 authorized video background enhancement
- 4.18 until B Preference Contract 5.14
- 4.19 until B Trip Save Contract 5.19
- production Route Provider selection 7.3
- production/cloud deployment without approved target
- full AI backend/agent chain until its product/data dependencies are frozen
