# CODEX — TASK-080-A WBS 7.6 Canonical POI Search API

Execute **TASK-080-A only**. TASK-081-A may run in another worktree in parallel.

Repository: `kanzakimy0/TravelAssist`  
Issue: #430  
Publication branch: `task/a-task-080-081-poi-api-parallel`  
Implementation branch: `codex/a-task-080-poi-search-api`

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

Read the published Task:

```bash
git show origin/task/a-task-080-081-poi-api-parallel:docs/tasks/TASK-080-a-poi-search-api.md
git show origin/task/a-task-080-081-poi-api-parallel:docs/project/WBS-7.6-7.7-poi-api-parallel-start.md
```

Also read:

- `AGENTS.md`
- current `docs/project/WBS-TravelAssist.md`
- PR #417 / WBS 7.4 canonical POI architecture and source files
- `docs/architecture/poi-canonical-schema-v1.md` from the current PR #417 branch
- `tools/poi/read-current-candidates.mjs`
- `data/poi/full/manifests/current-candidate-review.v1.json`
- current HTTP/server conventions such as `src/server/routing/http.ts`

## Branch construction

Create/reuse only:

`codex/a-task-080-poi-search-api`

from execution-time latest `origin/develop`.

Then merge the current PR #417 implementation branch into TASK-080 for development:

```bash
git merge --no-ff origin/codex/a-poi-canonical-schema
```

Record the exact consumed schema head.

If the current 7.4 head materially diverges from the published observed head `875caf9e9130514fa99da95ce11d63fca2bf3b1d`, audit it first.

Do not copy/redefine `CanonicalPoiV1`.

## Implement

Complete the full Task specification.

Preferred ownership:

```text
src/shared/contracts/poi-search/**
src/server/poi-search/**
src/app/api/pois/search/route.ts
tests/task-080-a-poi-search-api.test.mjs
docs/qa/TASK-080/**
docs/tasks/RESULT-TASK-080-a-poi-search-api.md
```

Do not edit TASK-081 detail modules.

## Critical data rule

The existing POI corpus is candidate-only for runtime purposes.

You MUST verify the current manifest still says:

`CANDIDATE_ONLY_NO_CANONICAL_IMPORT`

and `runtimeImportAuthorized === false`.

Therefore do not wire `data/poi/full/**` into the web/server runtime.

Use canonical fixtures/test repository unless an independently accepted runtime canonical repository exists on execution-time `develop`.

## Search rule

Search relevance is lexical/filter-based only.

Do not implement:

- Preference weighting;
- personalized recommendation score;
- popularity score;
- AI ranking;
- WBS 7.9 reason/ranking.

Unknown is not zero.

## Forbidden Git operations

- `git clean -fd`
- `git reset --hard`
- `git push --force`
- `git push --force-with-lease`
- automatic merge

## Finalization

Before final response:

1. write RESULT + QA;
2. update only relevant WBS records, preserving TASK-081 status if present;
3. fetch latest `origin/develop`;
4. if develop advanced, merge it normally into TASK-080 and rerun affected tests;
5. if PR #417 is still unmerged, keep TASK-080 Draft and explicitly report the merge gate;
6. if PR #417 has merged, verify its accepted contract is an ancestor/equivalent and remove no semantics during sync;
7. stage only TASK-080-owned changes;
8. commit and push normally;
9. create/update exactly one Draft PR → `develop`;
10. run/record exact-head Quality Gate;
11. stop — do not merge.

## Return

Report:

- status;
- base/latest develop SHA;
- consumed PR #417 schema head;
- implementation branch/final commit;
- Draft PR;
- changed files;
- endpoint/contract;
- search normalization/order/filter behavior;
- repository/runtime datasource status;
- candidate-only isolation proof;
- tests/Quality Gate;
- blockers;
- WBS update;
- confirmation that 7.7/7.9 were not modified.
