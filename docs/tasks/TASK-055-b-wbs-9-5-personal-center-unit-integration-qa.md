# TASK-055-B — WBS 9.5 Personal Center Unit / Integration Test Baseline

## Status

Authorized / Ready for Codex implementation.

## Tracking

- WBS: `9.5 个人中心单元 / 集成测试`
- Owner: B / Personal Center QA
- Priority: P1
- Issue: #355
- Publication baseline: `develop@3850ec91a94b96f61800a9e45ba7792d07bb1c44`
- Spec branch: `task/b-wbs-9-5-personal-center-unit-integration-qa`
- Planned implementation branch: `codex/b-account-wbs-9-5-personal-center-unit-integration-qa`
- Hard dependencies: WBS 5.x complete; WBS 8.2 complete; WBS 8.3 complete
- Related completed QA: WBS 9.12 responsive/accessibility; WBS 8.6 Personal Center migration integration

## 1. Objective

Establish the canonical, reproducible **unit + integration QA baseline** for the completed B-owned Personal Center implementation.

The repository already contains substantial accepted tests from Profile, Auth, Preference, Companion, Trip Library, Account Deletion and Migration tasks. WBS 9.5 must **consolidate, classify, gap-audit and harden** those tests rather than duplicating them.

The end state must provide:

1. one auditable Personal Center test inventory;
2. one explicit critical-behavior coverage matrix;
3. narrowly scoped tests for real uncovered gaps;
4. stable aggregate npm command(s) for future B regression;
5. real Local Supabase/Auth integration evidence;
6. exact-head GitHub Quality Gate evidence.

This is a QA baseline task, not a business-feature task.

## 2. Execution baseline rule

Implementation must start from the execution-time latest clean `origin/develop`, **not** from this spec branch.

Before creating the implementation branch:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Verify the latest Master WBS still has:

- 5.x accepted B-owned Personal Center scope completed;
- 8.2 User / Profile Schema completed;
- 8.3 Authentication Core completed;
- 8.6 Personal Center Data Migration completed;
- 9.5 not yet completed.

If dependencies materially changed, document the new truth and fail closed rather than forcing the old specification.

## 3. Current accepted test families to audit

At publication baseline, `package.json` exposes accepted focused scripts including:

- `test:preferences`
- `test:preferences:db`
- `test:preference-api`
- `test:preference-api:local`
- `test:preference-contract`
- `test:preference-contract:local`
- `test:preference-presets`
- `test:preference-presets:local`
- `test:companions`
- `test:companions:db`
- `test:companion-api`
- `test:companion-api:local`
- `test:trip-persistence`
- `test:trip-persistence:db`
- `test:trip-library-api`
- `test:trip-library-api:local`
- `test:profile-api`
- `test:profile-api:local`
- `test:account-deletion`
- `test:account-deletion:local`
- `test:personal-center-migration`
- `test:personal-center-migration:local`
- `test:personal-center-migration:replay`

The repository also contains Auth/Profile schema and other relevant tests that may not have dedicated npm aliases. Codex must inventory the actual execution-time repository rather than assume this list is complete.

Do not rename or remove accepted scripts merely to make the matrix cleaner.

## 4. Required test inventory and classification

Create a machine-readable inventory for all B-owned Personal Center tests. Each test file/suite must be classified by at least:

- source Task/WBS;
- domain: Auth / Profile / Preference / Companion / Trip Library / Account Deletion / Migration / shared boundary;
- layer:
  - pure unit/domain;
  - contract/parser;
  - API/server integration;
  - DB integration;
  - Auth/RLS integration;
  - browser-boundary integration without full user journey;
  - E2E candidate deferred to 9.6;
- Local Supabase required: yes/no;
- browser runtime required: yes/no;
- destructive local reset required: yes/no;
- current npm entry point;
- critical behaviors covered;
- known environment constraints;
- deterministic cleanup status.

Suggested outputs:

- `docs/qa/TASK-055/test-inventory.json`
- `docs/qa/TASK-055/coverage-matrix.json`
- `docs/qa/TASK-055/gap-report.md`
- `docs/qa/TASK-055/README.md`

Adjust names only if a stronger current repository convention exists.

## 5. Critical behavior matrix

WBS 9.5 cannot be accepted unless the combined existing + new test set proves the following non-E2E behaviors.

### 5.1 Authentication / private boundary

- unauthenticated private Personal Center API access fails closed;
- Cookie-authenticated owner path works where accepted;
- explicit Bearer path works where accepted;
- explicit Bearer never silently falls back to Cookie;
- client cannot choose/override the owner UUID;
- stale/deleted/invalid user cannot retain private API access where live verification is required;
- secrets/admin credentials never enter client-visible contracts or test evidence.

### 5.2 Profile / Account

- accepted Profile input validation;
- owner read/update consistency;
- cross-user denial;
- profile settings ownership;
- emergency-contact ownership;
- no Auth credential truth duplicated into product profile behavior;
- API error shapes remain deterministic.

### 5.3 Preference

- sparse `missing = unset` semantics remain exact;
- parse/patch/apply semantics remain canonical;
- revision/CAS stale-write rejection;
- reset returns to unset, not a product preset;
- preset application is draft-only before explicit Save;
- preset application preserves out-of-scope keys;
- Planner-readable WBS 5.14 contract returns saved canonical Preference only;
- no preset metadata leaks into the public read contract or Trip snapshot;
- cross-user isolation and private HTTP/Auth behavior remain intact.

### 5.4 Companion

- owner-only Companion CRUD according to accepted API semantics;
- same-owner Group/Member constraints;
- no cross-owner membership injection;
- revision/CAS stale-write behavior;
- transaction rollback behavior for accepted multi-row operations;
- DOB/fallback/profile version boundaries remain valid;
- Auth deletion cascade leaves no owner rows/orphans.

### 5.5 Trip Library

- accepted Draft / Saved / History state semantics;
- create/read/update/delete behavior according to the accepted API contract;
- creation-intent/idempotency rules;
- revision/concurrency protection where applicable;
- canonical Preference snapshot compatibility;
- cross-user and anonymous denial;
- no unrelated main-system Trip Plan schema assumptions are introduced.

### 5.6 Account deletion

- verified current-user deletion only;
- arbitrary target user ID cannot be supplied;
- all accepted B-owned user data cascades away;
- another user's data remains unchanged;
- previously valid private access is rejected after deletion under accepted live verification;
- Storage gate/current accepted behavior remains regression-covered;
- external provider/booking mutation remains zero/out of scope.

### 5.7 Migration / type boundary

Reuse WBS 8.6 evidence and focused regression where appropriate to prove:

- accepted B migrations remain immutable;
- SQL / Drizzle / generated types required by current APIs/tests remain coherent;
- Local reset/type generation does not introduce drift;
- no synthetic data remains after integration tests.

Do not blindly rerun destructive double replay if it adds no 9.5 signal; the 8.6 replay command may be reused as a final regression gate or explicitly referenced where justified. Mandatory 9.5 Local integration coverage itself must still execute.

## 6. Gap policy

For each uncovered critical behavior discovered by the audit, Codex must choose exactly one:

1. **Add a focused 9.5 unit/integration test** if it can be tested below full user-journey E2E; or
2. **Defer to WBS 9.6** when the behavior intrinsically requires a multi-page/full-browser user journey.

Every defer must state:

- behavior;
- why unit/integration coverage is insufficient;
- expected 9.6 journey/assertion.

Do not mark a real gap as covered by documentation only.

Do not create fake/duplicative tests simply to increase counts.

## 7. Canonical aggregate commands

Add a stable B-owned aggregate entry point for WBS 9.5.

Preferred direction:

```text
test:personal-center
```

for the canonical non-Local/pure+contract+API test set, plus if needed:

```text
test:personal-center:local
```

for the mandatory Local Supabase/Auth integration sequence.

Exact implementation may use a small deterministic orchestrator if needed.

Rules:

- reuse existing focused scripts/files;
- do not shell out through fragile platform-specific syntax if a Node orchestrator is more reliable;
- Local suites sharing Supabase/project/server ports must run sequentially;
- aggregate exit code must fail on any mandatory child failure;
- no mandatory suite may silently skip because Docker/Auth/browser runtime is unavailable;
- document all included suites and exclusions;
- 9.6 E2E journeys must not be pulled into the 9.5 aggregate merely to inflate coverage.

## 8. Local Supabase/Auth execution rules

Where Local runtime is required:

- use existing repository `db:start/status/reset/types/stop` wrappers;
- protect unrelated developer data; do not silently wipe an occupied Local project without the accepted task safeguards;
- use real Local Auth users for ownership/RLS checks where required;
- test at least two distinct users for cross-user isolation;
- clean synthetic Auth users, table rows and task-owned Storage fixtures;
- ensure no task server/process remains after QA;
- finish with `db:status` and `db:stop` evidence;
- never connect to or mutate Production/Staging.

If Docker/Supabase is unavailable and mandatory Local QA cannot be recovered safely, return Blocked/Partial. Do not convert mandatory Local tests into skips.

## 9. Browser boundary versus WBS 9.6

WBS 9.5 may use browser automation only where an existing accepted integration suite needs a browser/runtime boundary to verify one feature/API contract.

WBS 9.5 must **not** implement the full end-to-end Personal Center user journey. The following belong primarily to 9.6:

- complete registration/login → multiple Personal Center pages → logout/login journey;
- cross-page persistence journey spanning multiple modules;
- complete desktop/mobile navigation journey;
- full browser account lifecycle journey as an end-user scenario;
- broad multi-browser E2E matrix.

A narrow existing browser regression may remain part of 9.5 if it validates a specific accepted API/integration boundary.

## 10. Required QA sequence

At minimum perform and record:

1. `npm ci`;
2. exact baseline commit + clean status;
3. baseline full repository Node test count before task changes;
4. test inventory + coverage gap audit;
5. all relevant existing B focused pure/API tests;
6. all relevant mandatory Local DB/Auth/API integration tests;
7. new TASK-055 focused tests for uncovered non-E2E gaps;
8. canonical aggregate command(s), executed at least twice on the candidate to prove deterministic behavior;
9. candidate full repository Node tests;
10. `npm run lint` or exact unchanged baseline debt proof plus clean-repository/CI lint gate;
11. `npm run typecheck`;
12. `npm run build`;
13. current deployment local validate/build/artifact checks;
14. scoped Prettier checks for changed Task files/code/tests;
15. `git diff --check`;
16. Local cleanup + `db:status` + `db:stop` where Local runtime was used;
17. Draft PR to `develop`;
18. exact final-head GitHub Quality Gate **PASS**.

If the execution-time package scripts differ, use the latest canonical equivalents and document the mapping.

## 11. Baseline debt rule

Pre-existing repository debt must be separated from Task regressions.

A baseline exception is acceptable only when:

- the same failure is reproduced on the exact execution baseline;
- candidate failure output is materially identical;
- no changed file causes or expands the failure;
- clean GitHub Quality Gate passes on the exact final head where the repository workflow defines the accepted clean-checkout behavior.

Never hide a new failure as baseline debt.

## 12. Allowed implementation changes

Expected changes are limited to:

- test inventory / QA evidence;
- focused missing unit/integration tests;
- test helpers/fixtures required by those tests;
- package scripts or a small test orchestrator for the canonical aggregate commands;
- minimal production fix **only if a test proves a real B-owned defect** and the fix is narrow, backward-compatible and fully documented;
- Result / WBS tracking.

If a discovered defect requires schema redesign, new migration semantics, new product behavior or cross-owner architectural decisions, stop and return Partial/Blocked rather than silently expanding WBS 9.5.

## 13. Out of scope

- WBS 9.6 full Personal Center E2E;
- new Personal Center product features;
- UI redesign;
- new Preference/Companion/Trip semantics;
- A-owned Planner/Map/Route/POI changes;
- AI / Engine work;
- production/staging mutation;
- broad refactor/format sweep;
- replacing the repository's accepted test framework;
- adding a second testing framework without an explicit blocking need.

## 14. Required deliverables

At minimum:

- `docs/tasks/RESULT-TASK-055-b-wbs-9-5-personal-center-unit-integration-qa.md`
- `docs/qa/TASK-055/test-inventory.json`
- `docs/qa/TASK-055/coverage-matrix.json`
- `docs/qa/TASK-055/gap-report.md`
- `docs/qa/TASK-055/README.md`
- focused test files/helpers only where audit proves a gap;
- canonical aggregate npm entry point(s);
- Master WBS 9.5 status update;
- Draft PR + exact-head Quality Gate evidence.

## 15. WBS state transitions

At implementation start, re-read the **complete latest** Master WBS and update only the 9.5 row:

```text
未开始
→ 进行中（#355 / TASK-055-B）
```

After implementation + mandatory QA + Draft PR:

```text
→ 待审查（#355 / TASK-055-B；Draft PR #<number>）
```

Do not overwrite unrelated A/B changes.

Only explicit user acceptance and merge may change 9.5 to `已完成` and close Issue #355.

## 16. Git / PR rules

Forbidden:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Do not rebase a published shared branch unless explicitly authorized.

Create a Draft PR to `develop` and stop. Do not auto-merge. Do not auto-start WBS 9.6.

## 17. Result requirements

The final Result must clearly state:

- execution baseline and final head;
- exact test inventory count and classification;
- critical matrix coverage status;
- gaps fixed versus deferred to 9.6;
- aggregate command contents and two-run determinism result;
- focused test counts;
- Local integration counts;
- full repository baseline/candidate counts and skips;
- lint/typecheck/build/deployment/format/diff status;
- exact final-head Quality Gate run URL/status;
- any baseline debt with proof;
- Local cleanup status;
- Production/Staging mutation = No;
- downstream task started = No;
- WBS 9.5 = 待审查 until explicit user acceptance.
