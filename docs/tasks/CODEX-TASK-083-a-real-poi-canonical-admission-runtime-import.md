# CODEX — TASK-083-A Real 100 POI Canonical Admission + Runtime Import Gate

Execute **TASK-083-A only**.

Repository: `kanzakimy0/TravelAssist`
Issue: #438
Publication branch: `task/a-task-083-real-poi-canonical-admission`
Implementation branch: `codex/a-task-083-real-poi-canonical-admission`

## Start

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
git status --short
```

Require a clean isolated worktree. Preserve unrelated user work.

Read:

```bash
git show origin/task/a-task-083-real-poi-canonical-admission:docs/tasks/TASK-083-a-real-poi-canonical-admission-runtime-import.md
git show origin/task/a-task-083-real-poi-canonical-admission:docs/project/WBS-7.4.1-real-poi-canonical-admission-runtime-import.md
```

Also audit:

- `AGENTS.md`
- latest Master WBS
- `src/shared/contracts/poi/**`
- `src/shared/master-code/**`
- `src/shared/data/master-code-registry.v1.json`
- current Region Graph identities
- `src/server/poi-details/**`
- `src/app/api/pois/[poiRef]/route.ts`
- TASK-081-A Result/QA
- TASK-081-B / PR #437 Task/Result/preflight
- TASK-075 identity/adjudication artifacts
- v1.66 workbook
- current candidate manifest and candidate enrichment boundary
- historical Master Code claim/conflict files

## Execution branch

Create/reuse only:

`codex/a-task-083-real-poi-canonical-admission`

from execution-time latest `origin/develop`.

If develop advanced, use the newer accepted state. Do not revert newer WBS/API/POI work.

## Objective

Produce exactly **100 real ADMIT Canonical POIs**, 100 active safe Master Code allocations, one validated `CanonicalPoiDatasetV1`, and one explicitly authorized server-only runtime datasource.

This Task must remove the structural blocker identified by PR #437 without doing the 4,300 Feature43 assessments.

## Required phases

Follow the Task file exactly:

1. freeze/audit inputs;
2. build lawful admission-eligible pool from real v1.66 records;
3. deterministically freeze the 100-record sample;
4. perform conservative Master Code conflict/exclusion audit;
5. preserve a legacy code only when exact identity + no conflict + namespace match are proven; otherwise allocate deterministic safe free code;
6. append exactly 100 active POI registry allocations;
7. run the existing 14-gate Candidate Admission until final sample = 100 ADMIT;
8. publish validated 100-record Canonical dataset + checksums;
9. publish separate runtime manifest with `runtimeImportAuthorized=true` for **only** this canonical Pilot-100 dataset;
10. implement server-only runtime repository;
11. wire the merged Detail API default repository to it;
12. conditionally wire Search only if WBS 7.6 is already merged on execution-time develop;
13. create TASK-081-B handoff;
14. run complete QA and exact-head Quality Gate;
15. create exactly one Draft PR -> develop;
16. stop without merge.

## Critical Feature43 rule

Do **not** perform TASK-081-B's 43-field scoring.

Prefer `features: null` for Canonical admission unless an existing accepted canonical provenance rule requires preservation of already-supported data.

Do not fill defaults and do not infer new scores.

The handoff must leave TASK-081-B responsible for all 4,300 Pilot field assessments.

## Critical Master Code rule

An apparently unused number is not automatically free.

Build exclusion from:

- current application registry;
- agreed legacy claims;
- conflicts;
- unmapped/unknown history;
- workbook legacy claims;
- all other discovered Master Code evidence.

Never recycle unresolved historical claims.

Do not change the namespace validator to make allocations pass.

## Critical runtime rule

Never modify the candidate manifest to authorize runtime import.

Create a **separate Canonical Pilot-100 runtime manifest** and load only the validated 100-record dataset.

No fallback to `data/poi/full/**` candidate files.

## Validation

Run all required TASK-083 focused checks plus:

```text
test:poi-contracts
qa:master-code-registry
test:master-code-registry
test:region-master-code-integration
test:planning-contracts
TASK-081-A POI detail tests
TASK-080 search tests only if merged on develop
full Node test suite
npm run lint
npm run typecheck
npm run build
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
npm run format:check:deploy
git diff --check
exact-head GitHub Quality Gate
```

Do not hide baseline failures; classify them precisely.

## Git rules

Forbidden:

- `git clean -fd`
- `git reset --hard`
- `git push --force`
- `git push --force-with-lease`
- automatic merge
- auto-merge enablement

## Finalization

Before returning:

1. fetch latest develop;
2. merge it normally if advanced;
3. resolve only genuine conflicts while preserving newer work;
4. rerun affected validation;
5. update WBS 7.4.1 accurately;
6. write Result/QA/handoff artifacts;
7. push normally;
8. create/update one Draft PR;
9. record exact-head Quality Gate;
10. if possible, comment on PR #437 with the exact handoff manifest/hash and “structural blocker removed; TASK-081-B may resume after TASK-083 acceptance”;
11. stop.

Do not execute TASK-081-B scoring inside this Task.

## Final response

Report:

- status;
- base/latest develop SHA;
- branch and final head;
- Draft PR;
- v1.66 workbook hash/row audit;
- eligible pool count;
- exact deterministic sample rule and 100 IDs manifest;
- identity/duplicate results;
- Master Code exclusion sources and 100 allocations;
- ADMIT counts;
- canonical dataset revision/hash;
- runtime manifest and authorization scope;
- runtime repository wiring;
- Detail API smoke;
- Search integration status;
- tests/Quality Gate;
- TASK-081-B handoff path/hash;
- WBS update;
- explicit confirmation that 0/4300 Feature43 cells were assessed by TASK-083;
- confirmation no auto-merge occurred.
