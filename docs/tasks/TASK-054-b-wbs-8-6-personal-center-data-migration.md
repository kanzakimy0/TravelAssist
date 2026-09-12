# TASK-054-B — WBS 8.6 Personal Center Data Migration Integration v1

## Status

Authorized / Ready for Codex implementation.

## Tracking

- WBS: `8.6 B 个人中心数据 Migration`
- Owner: B / Personal Center Data / DB
- Priority: P1
- Issue: #351
- Publication baseline: `develop@166f996eab3d75fb5afabc4ad7cb9f3d265c54c1`
- Spec branch: `task/b-wbs-8-6-personal-center-data-migration`
- Implementation branch: `codex/b-account-wbs-8-6-personal-center-data-migration`
- Hard dependencies: WBS 5.11, 5.12, 5.18, 8.4 — completed
- Database standard: `docs/architecture/db-orm-migration-standards.md`

## 1. Objective

Complete WBS 8.6 by independently auditing, replaying and hardening the B-owned Personal Center database migration chain on top of the accepted Supabase/PostgreSQL foundation.

The repository SQL migration history must be sufficient to reconstruct the complete current B-owned Personal Center database state from an empty Local Supabase database without Dashboard-only state, hidden manual changes or a second migration history.

This Task is a **migration integration / drift / replay closeout**. It is **not** permission to redesign the accepted Profile, Preference, Companion or Trip Library product schemas.

## 2. Why this Task exists now

The hard dependencies are already accepted:

- WBS 5.11 — Preference Schema v1: completed.
- WBS 5.12 — Companion Schema v1: completed.
- WBS 5.18 — Saved Trip / History / Draft persistence model: completed.
- WBS 8.4 — global DB Migration standard/foundation: completed.

Those earlier Tasks deliberately created their own SQL migrations. WBS 8.6 therefore must **integrate and verify the chain**, not recreate the same tables under a second set of migrations.

## 3. Canonical source-of-truth rules

The following rules are frozen for TASK-054-B:

1. `supabase/migrations/*.sql` is the only formal DB schema history.
2. A migration already merged into `develop` is immutable history.
3. Never edit, rename, squash, reorder or silently replace accepted historical migrations.
4. A real defect found in accepted history must be repaired only with a new, narrowly scoped corrective migration.
5. Do not create a meaningless no-op SQL file merely so WBS 8.6 appears to have a new migration.
6. Drizzle is an application/query mirror and must not become a second migration history.
7. `src/types/database.generated.ts` is generated from real Local Supabase and must never be hand-edited.
8. Production/Staging schema must not be changed manually in this Task.
9. `drizzle-kit push` is not an accepted formal migration mechanism.
10. A successful current developer database is not sufficient; empty-database replay is mandatory.

If the accepted migration chain is already correct, a valid TASK-054 implementation may contain only integration tests, audit inventory, QA evidence, package-script wiring if needed, Result and WBS tracking. Do not manufacture schema churn.

## 4. Execution-time dependency gate

Before implementation:

1. Fetch all remotes and read the execution-time latest `origin/develop`.
2. Read the complete latest `docs/project/WBS-TravelAssist.md`.
3. Confirm WBS 5.11, 5.12, 5.18 and 8.4 remain completed.
4. Confirm the DB foundation and Local Supabase scripts still exist.
5. Re-inventory all B-owned migrations present on the latest `origin/develop`; do not rely only on this publication baseline.

If a hard dependency has been reverted, replaced or is no longer present on the execution-time latest `develop`, return `Blocked` with exact evidence and do not create schema changes.

## 5. Existing migration chain to audit

At the publication baseline the accepted B-owned Personal Center DB history includes at minimum:

```text
supabase/migrations/20260908083000_create_user_profile_schema.sql
supabase/migrations/20260911090000_create_travel_preferences.sql
supabase/migrations/20260911100000_create_companion_schema.sql
supabase/migrations/20260912090000_add_companion_transaction_api.sql
supabase/migrations/20260912100000_create_trip_library_records.sql
supabase/migrations/20260912120000_trip_library_creation_intent.sql
```

At execution time, include any newer accepted B-owned migration added before TASK-054 starts.

The Task must record the final audited migration inventory and hashes in its Result/QA evidence.

## 6. B-owned database boundary

The audit must cover the actual accepted B-owned schema on execution-time `develop`, including at least these tables when they still exist under the accepted design:

```text
profiles
profile_settings
emergency_contacts
travel_preferences
companions
companion_groups
companion_group_members
trip_library_records
```

Also inventory accepted B-owned:

- SQL functions / RPCs;
- triggers;
- RLS policies;
- ownership foreign keys;
- revision/CAS constraints;
- indexes and unique constraints;
- delete/cascade behavior;
- JSON/JSONB checks or version constraints.

Do not invent new product tables simply to expand the WBS 8.6 scope.

## 7. Required implementation scope

### 7.1 Migration inventory and history integrity

Create machine-readable or test-verifiable coverage for the B-owned migration chain.

Verify:

- filenames are ordered and valid under the global migration convention;
- accepted historical files are not rewritten by TASK-054;
- there is no parallel formal `drizzle/` migration history;
- current schema can be derived entirely from repository migrations;
- no required B-owned schema state depends on a Supabase Dashboard-only action.

A dedicated audit document/manifest may be added under `docs/qa/TASK-054/` if useful, but SQL migration history remains the canonical schema source.

### 7.2 Empty-database replay

Using real Local Supabase:

1. start Local Supabase;
2. capture baseline status;
3. reset/rebuild from the repository migration chain;
4. verify the resulting B-owned schema;
5. run a second full reset/rebuild;
6. prove the second replay produces the same expected schema/types/behavior.

The Task must not claim PASS when Docker/Supabase runtime was unavailable. If runtime cannot be executed, return Partial/Blocked rather than fabricating DB evidence.

### 7.3 Generated type determinism

After clean replay:

- regenerate `src/types/database.generated.ts` through the repository's Local Supabase type generation path;
- compare with the committed generated file;
- if no schema change was required, generation should be clean/deterministic;
- if a justified corrective migration changes schema, update generated types from the real Local DB in the same PR and document why.

Never hand-edit generated DB types.

### 7.4 SQL / Drizzle / generated-type agreement

Audit every B-owned table and accepted DB function boundary against:

```text
SQL migrations
  ↕
Drizzle schema mirrors
  ↕
Supabase generated types
```

A mismatch is a defect to investigate, not a reason to choose one representation arbitrarily.

If SQL history is correct but a Drizzle mirror is stale, fix the mirror without creating a fake DB migration.

If the actual SQL history is deficient, add a new corrective SQL migration rather than rewriting history.

### 7.5 RLS and ownership isolation

Use at least two real temporary Local Supabase Auth users.

Prove owner isolation for the current private B data families:

- Profile / Settings / Emergency Contact;
- Preference;
- Companion / Group / Membership;
- Trip Library.

Cross-user SELECT/INSERT/UPDATE/DELETE or RPC use must fail unless the already accepted contract explicitly allows it.

Do not add broad service-role access or weaken existing RLS merely to simplify tests.

### 7.6 Account-deletion cascade compatibility

TASK-052 accepted account deletion relies on Auth-user deletion plus database cascade semantics for B-owned user data.

TASK-054 must prove that a test user with populated B-owned rows can be deleted through the accepted deletion path and leaves no B-owned user rows orphaned.

Do not redesign account deletion, external booking handling or Auth semantics.

### 7.7 Corrective migration path, only when needed

If and only if the audit finds a real accepted-schema defect:

- create a new timestamped corrective migration with a single clear intent;
- do not modify the old migration;
- keep changes backward/forward safe according to the global migration rules;
- prove both:
  - fresh replay from an empty DB using all candidate migrations; and
  - forward application from the execution-time baseline schema to candidate schema.

If there is no real defect, add no SQL migration.

## 8. Dedicated TASK-054 tests

Add dedicated TASK-054 coverage so future database work detects regression/drift.

Preferred structure, adjusted to current repository conventions if necessary:

```text
tests/task-054-personal-center-migration.test.mjs
tests/task-054-personal-center-migration.runtime.mjs
```

Add canonical package scripts only if they are consistent with current repository naming, for example:

```text
test:personal-center-migration
test:personal-center-migration:local
```

Dedicated coverage must validate at minimum:

- expected B-owned migration inventory;
- no second formal migration history;
- expected tables/functions/policies after replay;
- SQL/Drizzle/generated-type coverage;
- RLS owner isolation;
- revision/ownership invariants that are part of accepted schemas;
- account-delete cascade behavior;
- deterministic replay/type regeneration.

Avoid reimplementing all old feature tests inside TASK-054. Reuse existing regression suites where possible.

## 9. Mandatory regression matrix

Use execution-time canonical scripts. At publication baseline, the matrix includes at least:

```text
npm ci

npm run db:start
npm run db:status
npm run db:reset
npm run db:types

npm run test:preferences
npm run test:preferences:db
npm run test:preference-api
npm run test:preference-api:local

npm run test:companions
npm run test:companions:db
npm run test:companion-api
npm run test:companion-api:local

npm run test:trip-persistence
npm run test:trip-persistence:db
npm run test:trip-library-api
npm run test:trip-library-api:local

npm run test:profile-api
npm run test:profile-api:local

npm run test:account-deletion
npm run test:account-deletion:local
```

Also run the current canonical Profile schema DB regression if it is not already included by the scripts above.

Run TASK-054 dedicated tests before and after the second replay where practical.

Then run:

```text
full repository tests
npm run lint
npm run typecheck
npm run build
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
git diff --check
npm run db:status
npm run db:stop
```

Run the repository's current scoped format/deployment checks. Existing proven baseline format debt may be documented, but TASK-054 must introduce zero new format failures.

If script names changed after publication, use their current canonical replacements and document the mapping in the Result.

## 10. Baseline-vs-candidate discipline

Before modifying implementation files, capture:

- exact `origin/develop` SHA;
- baseline full-repository test result;
- current migration inventory and hashes;
- current generated-types hash;
- current Drizzle-schema file inventory;
- existing known baseline failures, if any.

Candidate validation must distinguish:

```text
existing baseline failure
vs
new TASK-054 regression
```

Do not report an existing failure as caused by TASK-054 and do not hide a new candidate failure behind old technical debt.

## 11. Git / branch rules

Implementation must be created from the execution-time latest clean `origin/develop`, not from the spec branch.

Implementation branch:

```text
codex/b-account-wbs-8-6-personal-center-data-migration
```

Forbidden:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Do not rewrite published history.

If `develop` moves during implementation, integrate the latest `origin/develop` with a normal merge before final QA. Re-run affected DB and exact-head QA after the merge.

## 12. WBS tracking rules

At actual implementation start:

1. Read the complete latest Master WBS.
2. Change only WBS 8.6 from its current not-started state to:

```text
进行中（#351 / TASK-054-B）
```

3. Preserve every unrelated A/B row exactly as latest `develop` requires.

After implementation and mandatory QA pass, create a Draft PR and change only WBS 8.6 to:

```text
待审查（#351 / TASK-054-B；Draft PR #<number>）
```

Implementation completion is not final acceptance.

Only explicit user acceptance plus merge to `develop` may mark 8.6 `已完成` and close Issue #351.

## 13. Required deliverables

At minimum:

```text
docs/tasks/RESULT-TASK-054-b-wbs-8-6-personal-center-data-migration.md
docs/qa/TASK-054/README.md
```

Plus, only as justified:

- TASK-054 test files;
- package script additions;
- migration audit/manifest evidence;
- Drizzle mirror correction;
- generated type update;
- new corrective SQL migration.

A new SQL migration is **conditional**, not automatically required.

## 14. Draft PR requirements

Create a Draft PR to `develop`.

PR description must include:

- `Refs #351`;
- execution baseline SHA;
- whether SQL migrations changed: Yes/No;
- if Yes, list every new migration and why it was required;
- two clean replay results;
- generated-type drift result;
- SQL/Drizzle/type agreement result;
- RLS two-user result;
- account-deletion cascade result;
- regression matrix result;
- exact final-head Quality Gate URL/status;
- explicit statement that Production/Staging was not mutated.

Do not mark Ready for Review or merge automatically unless the user explicitly authorizes it.

## 15. Exact-head Quality Gate

The candidate's exact final PR head must receive a passing GitHub Quality Gate.

If any commit is added after a PASS, that PASS is stale and the new exact head must receive its own passing run before returning the final Result.

## 16. Out of scope

Do not implement:

- WBS 8.5 main-system Trip Plan Schema;
- Planner WBS 4.18 / 4.19 live wiring;
- Engine WBS 4.22–4.24;
- AI session storage WBS 8.7 / 8.8;
- POI, Booking, Payment or Membership schema;
- new Preference / Companion / Profile / Trip product fields without a demonstrated migration defect;
- UI redesign;
- API semantic redesign;
- Production/Staging migration deployment;
- broad service-role paths;
- historical migration squashing/rewrite.

## 17. Completion criteria

TASK-054-B may be returned as `Completed / Ready for user review` only when all of the following are true:

- hard dependency gate passes;
- execution-time migration inventory is complete;
- empty DB replay passes twice on real Local Supabase;
- B-owned schema/RLS/function state is verified;
- generated types are deterministic or justified by a real corrective schema change;
- Drizzle mirrors agree with accepted SQL schema;
- two-user RLS isolation passes;
- account-deletion cascade regression passes;
- required existing regressions pass with zero new candidate failures;
- lint/typecheck/build/deployment checks/diff checks pass or exact unchanged baseline debt is documented;
- exact final-head GitHub Quality Gate passes;
- Result + QA evidence + Master WBS review-stage update are committed;
- Draft PR is open against `develop`;
- no Production/Staging mutation occurred;
- no downstream Task was auto-started.

If any mandatory runtime verification cannot be performed, return Partial/Blocked with exact evidence rather than claiming completion.