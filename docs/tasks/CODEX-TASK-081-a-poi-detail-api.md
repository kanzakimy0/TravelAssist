# CODEX — TASK-081-A WBS 7.7 Canonical POI Detail API

Execute **TASK-081-A only**. TASK-080-A may run in another worktree in parallel.

Repository: `kanzakimy0/TravelAssist`  
Issue: #431  
Publication branch: `task/a-task-080-081-poi-api-parallel`  
Implementation branch: `codex/a-task-081-poi-detail-api`

## Before implementation

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
git rev-parse origin/codex/a-poi-canonical-schema
```

Require a clean worktree. Never delete/reset unrelated user changes.

Read:

```bash
git show origin/task/a-task-080-081-poi-api-parallel:docs/tasks/TASK-081-a-poi-detail-api.md
git show origin/task/a-task-080-081-poi-api-parallel:docs/project/WBS-7.6-7.7-poi-api-parallel-start.md
```

Also read:

- `AGENTS.md`
- current Master WBS;
- current PR #417 WBS 7.4 architecture/source;
- current Planning 43D and Visit contracts;
- `tools/poi/read-current-candidates.mjs`;
- current HTTP/server conventions.

## Branch construction

Create/reuse only:

`codex/a-task-081-poi-detail-api`

from execution-time latest `origin/develop`.

Then consume the current 7.4 candidate:

```bash
git merge --no-ff origin/codex/a-poi-canonical-schema
```

Record the exact consumed schema head. Audit if it changed from the published observed head `875caf9e9130514fa99da95ce11d63fca2bf3b1d`.

## Implement

Complete TASK-081 exactly.

Preferred ownership:

```text
src/shared/contracts/poi-details/**
src/server/poi-details/**
src/app/api/pois/[poiRef]/route.ts
tests/task-081-a-poi-detail-api.test.mjs
docs/qa/TASK-081/**
docs/tasks/RESULT-TASK-081-a-poi-detail-api.md
```

Do not edit TASK-080 search modules.

## Critical identity rule

`/api/pois/[poiRef]` resolves canonical `internalId` only.

Do not add fallback lookup by:

- Master Code;
- candidateKey;
- Provider ID.

Do not silently follow merged/superseded records as if the old record were active.

## Critical data rule

Candidate data remains `CANDIDATE_ONLY_NO_CANONICAL_IMPORT` unless a separate accepted runtime import is present at execution time.

Do not wire `data/poi/full/**` into runtime.

## Rights rule

Return a curated product-safe DTO, not serialized `CanonicalPoiV1` blindly.

Never leak Provider raw, credentials, candidate workflow state, restricted/transient source content, live timetable/fare/weather/crowd or internal-only licensing payload.

Preserve 43D `0` and `null` exactly.

## Forbidden Git operations

- `git clean -fd`
- `git reset --hard`
- `git push --force`
- `git push --force-with-lease`
- automatic merge

## Finalization

1. write RESULT + QA;
2. update only relevant WBS records, preserving TASK-080 status if present;
3. fetch latest `origin/develop`;
4. merge latest develop normally if advanced;
5. if PR #417 remains unmerged, keep TASK-081 Draft and report the merge gate;
6. after #417 merges, verify accepted contract ancestry/equivalence and rerun;
7. stage only TASK-081-owned changes;
8. commit and push normally;
9. create/update exactly one Draft PR → `develop`;
10. run/record exact-head Quality Gate;
11. stop — do not merge.

## Return

Report:

- status;
- base/latest develop SHA;
- consumed PR #417 schema head;
- branch/final commit;
- Draft PR;
- changed files;
- endpoint/detail DTO;
- identity/lifecycle behavior;
- 43D null/zero preservation;
- rights-safe projection;
- repository/runtime datasource status;
- candidate-only isolation proof;
- tests/Quality Gate;
- blockers;
- WBS update;
- confirmation that 7.6/7.9 were not modified.
