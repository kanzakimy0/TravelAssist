# TASK-048-B — WBS 5.18 Trip Draft / Saved / History Data Model v1

## Metadata

- Repository: `https://github.com/kanzakimy0/TravelAssist`
- WBS: **5.18 保存行程 / 历史 / 草稿数据模型**
- Owner: **B — Personal Center / Saved Trip Data**
- Priority: **P0**
- Issue: **#329**
- Publication baseline: `develop@b7eb931698da69cec73f7a0399897dbb5caab8c2`
- Spec branch: `task/b-wbs-5-18-trip-data-model`
- Implementation branch: `codex/b-account-wbs-5-18-trip-data-model`
- Design authority: `docs/architecture/trip-persistence-data-model-v1.md`
- Status at publication: **可执行 / implementation not started**

---

## 1. Goal

Implement the v1 B-owned durable data model for authenticated Trip Library records covering:

```text
Draft → Saved → History
```

The implementation must persist and freeze existing canonical A Trip contracts rather than creating a second itinerary model.

Deliver a real Local Supabase schema, B persistence domain parser, Drizzle mirror, generated types and real RLS/model tests. Do **not** implement the 5.19 HTTP/API/UI wiring.

---

## 2. Mandatory start sequence

Before changing code:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Then verify:

1. working tree is clean;
2. WBS 4.17 is completed;
3. WBS 8.1 is completed;
4. WBS 5.18 is not already implemented by another merged/current task;
5. Issue #329 is Open;
6. the current canonical Trip contract still exists under `src/shared/contracts/trips`;
7. accepted 5.11/5.16 and 5.12/5.17 domains remain current.

Implementation must start from **the latest `origin/develop` at execution time**, not from the publication SHA and not from the spec branch tree.

Create/switch to:

```text
codex/b-account-wbs-5-18-trip-data-model
```

Do not reuse the stale implementation branch from PR #221.

### Forbidden commands

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

---

## 3. Read before implementation

Read in full:

```text
docs/architecture/trip-persistence-data-model-v1.md
src/shared/contracts/trips/index.ts
src/shared/contracts/trips/validation.ts
src/shared/contracts/trips/fixtures.ts
src/features/preferences/domain/preference-v1.ts
src/features/companions/domain/companion-v1.ts
docs/ui/trip-library.md
docs/project/WBS-TravelAssist.md
```

Also inspect the accepted persistence patterns from 5.16/5.17 and DB conventions currently on latest develop.

Read Issue #207 / Draft PR #221 only as **historical Partial reference**.

---

## 4. Legacy PR #221 mandatory audit

Before implementing, produce a file-by-file audit of the relevant PR #221 work using:

```text
REUSE
REWORK
DEFER
SUPERSEDE
```

At minimum audit:

```text
supabase/migrations/20260908130000_create_trip_preference_drafts.sql
src/shared/contracts/preferences/drafts.ts
src/app/api/travel-persistence/route.ts
src/features/start-flow/model/server-draft-autosave.ts
src/server/preferences/*
src/db/schema/travel-preferences.ts
old TASK-017 tests
```

Hard rules:

- old `travel_preferences` vocabulary = SUPERSEDED by accepted 5.11/5.16;
- do not cherry-pick/merge PR #221 wholesale;
- do not restore old 30-key/legacy Preference semantics;
- do not overwrite current Preference/Companion persistence code;
- API/autosave/UI work belongs to 5.19 or later and remains deferred.

Save the audit under the TASK-048 QA directory or Result.

---

## 5. Canonical reuse requirements

### 5.1 Trip contracts

Use the existing A-owned canonical parsers/types directly:

```text
TripDraftFactsV1
WizardProgressV1
TripPlanSnapshotV1
parseTripDraftFacts
parseWizardProgress
parseTripPlanSnapshot
```

Do not modify `src/shared/contracts/trips/**` unless the current develop has an actual defect that makes TASK-048 impossible. If that happens, stop the implementation scope at `Blocked` and document the contract blocker instead of silently changing A's contract.

### 5.2 Preference

Use current accepted:

```text
PreferenceV1
PreferencePatchV1
parsePreferenceV1
parsePreferencePatchV1
applyPreferencePatch
emptyPreference
PREFERENCE_MAX_BYTES
```

from the current B Preference v1 truth.

Do not depend on unmerged PR #323 / WBS 5.14 implementation.

### 5.3 Companion

Reuse current Companion v1:

```text
CompanionTravelProfileV1
parseCompanionTravelProfileV1
derivePlanningAgeGroup
PLANNING_AGE_GROUPS
MAX_COMPANIONS_PER_USER
```

No second mobility/dining/activity taxonomy.

---

## 6. Implement the B persistence domain

Add one B-owned persistence-domain module under the Trip Library feature, preferably:

```text
src/features/trip-library/domain/trip-persistence-v1.ts
```

It must define/parse B-only persistence semantics while delegating canonical content parsing.

Required concepts:

```text
TripLibraryStateV1 = draft | saved | history
TripPartySnapshotV1
TripLibraryRecordV1 / mutation input as appropriate
technical payload caps in one source
state transition validation
preference effective-value helper
party capture/helper semantics
```

### 6.1 Party snapshot frozen shape

Implement the design shape:

```ts
{
  schemaVersion: "1.0";
  includesOwner: boolean;
  ageReferenceDate: "YYYY-MM-DD";
  members: Array<{
    sourceCompanionId: string;
    displayName: string;
    planningAgeGroup: "infant" | "child" | "adult" | "senior";
    travelProfile: CompanionTravelProfileV1;
  }>;
}
```

Do not accept/persist:

```text
birthDate
genderCode
avatarPath
relationshipCode
relationshipLabel
diningNote
privateNote
medical/medication/religion/free-text fields
```

No self Companion row. `includesOwner` is the only owner participation fact in this party snapshot.

`sourceCompanionId` is historical trace data and must not be an FK that can cascade/set-null when the current Companion Master changes.

---

## 7. Implement one aggregate table

Create one additive migration for:

```text
public.trip_library_records
```

Required columns and semantics are frozen in the design.

Do not add separate itinerary/day/item tables.

### Required persistence fields

```text
id uuid PK
owner_user_id uuid FK auth.users ON DELETE CASCADE
creation_key uuid
library_state
canonical_trip_id nullable text

draft_facts jsonb
wizard_progress jsonb
plan_snapshot nullable jsonb

preference_snapshot jsonb
preference_source_revision integer
preference_override_patch jsonb
party_snapshot jsonb

storage_revision integer
frozen_at timestamptz nullable
created_at timestamptz
updated_at timestamptz
```

### Required uniqueness

```text
(owner_user_id, creation_key)
(owner_user_id, canonical_trip_id) WHERE canonical_trip_id IS NOT NULL
```

### Required lifecycle constraints

```text
draft   => no canonical_trip_id / no plan_snapshot / no frozen_at
saved   => canonical_trip_id + plan_snapshot / no frozen_at
history => canonical_trip_id + plan_snapshot + frozen_at
```

When plan exists:

```text
canonical_trip_id == plan_snapshot.trip.id
```

A canonical Trip ID is a bounded string, **not necessarily a UUID**.

---

## 8. Storage revision and freeze guards

Implement DB-level invariant/trigger logic:

- insert starts `storage_revision = 1`;
- mutable update requires exactly `old + 1`;
- `id`, `owner_user_id`, `creation_key` immutable;
- preference creation snapshot and `preference_source_revision` immutable after insert;
- only allowed state transitions from the design;
- entering `history` produces/preserves a non-null `frozen_at` according to one deterministic DB rule;
- old `history` row rejects all UPDATE;
- hard delete remains possible at the data model layer;
- no delete has any Partner/Booking side effect.

Do not call this storage revision the Trip revision.

---

## 9. Preference capture semantics

At domain/model level prove:

```text
missing long-term preference
→ emptyPreference()
→ source revision 0
```

Trip-only changes are persisted as a canonical `PreferencePatchV1`.

Default patch:

```json
{"schemaVersion":"1.0","set":{},"unset":[]}
```

Effective trip preference must equal:

```text
applyPreferencePatch(preference_snapshot, preference_override_patch)
```

This must support both explicit set and explicit unset without changing long-term `travel_preferences`.

Do **not** create a DB trigger that copies or mutates the 5.16 Preference root behind the API boundary. TASK-048 is the model foundation; 5.19 will orchestrate creation atomically using current authenticated services.

---

## 10. SQL validation boundary

The TypeScript canonical parsers are semantic truth.

SQL must provide defense-in-depth for:

- object/envelope type;
- contract/schema version at top level;
- technical serialized-size caps;
- lifecycle nullability;
- canonical ID match;
- positive revisions;
- one-way lifecycle;
- immutable fields/snapshots;
- history freeze.

Do **not** write a second full PL/pgSQL copy of `TripPlanSnapshotV1` validation.

Choose conservative technical caps for Trip/party JSON based on current fixtures/expected Web use, define them once in the B domain, mirror exactly in SQL, and add parity tests. Existing `PREFERENCE_MAX_BYTES` must be reused rather than redefined.

Document that caps are technical abuse/safety limits, not subscription entitlement limits.

---

## 11. RLS / privilege posture

Enable RLS and owner isolation.

TASK-048 must not expose a premature browser write API.

Preferred v1 privileges:

```text
public / anon: no access
authenticated: owner-scoped SELECT only (or stricter if latest repo convention requires)
service_role: migration/test fixture administration only
```

If the latest repository has a stronger standard, follow it while maintaining these guarantees:

- no cross-user reads;
- anon denied;
- no direct authenticated DML shortcut that bypasses future 5.19 validation/CAS;
- service role never becomes a normal user request-path shortcut.

Do not implement 5.19 RPC/routes in TASK-048.

---

## 12. Drizzle and generated DB types

Add the Drizzle mirror under current schema conventions and export it from the existing schema index.

Run real Local Supabase migration/type generation.

`src/types/database.generated.ts` must come from the real generator, not manual fabrication.

Repeated type generation must be byte-identical.

---

## 13. Required tests

### 13.1 Pure/domain tests

Create focused TASK-048 tests covering at least:

- draft canonical parsing;
- progress canonical parsing;
- saved plan canonical parsing;
- non-UUID canonical Trip ID preservation;
- malformed plan fail-closed;
- Preference snapshot/patch set/unset semantics;
- missing vs false/neutral distinction;
- rejection of old PR #221 Preference keys;
- party snapshot order/duplicates/includesOwner;
- age reference semantics using current Companion helper;
- forbidden party privacy fields;
- detached snapshot behavior after source object mutation;
- lifecycle transition matrix;
- storage revision behavior model;
- copy-history semantics creates independent record identity.

### 13.2 Real Local Supabase tests

Use a clean Local Supabase instance and at least two real temporary Auth users plus anon.

Prove:

- migration/reset repeatability;
- RLS cross-user read isolation;
- anon denial;
- frozen direct-write privilege posture;
- owner deletion cascade;
- creation-key uniqueness;
- owner-scoped canonical Trip ID uniqueness;
- storage revision guard;
- immutable owner/identity/preference creation snapshot;
- valid/invalid lifecycle transitions;
- history immutability;
- top-level JSON and size constraints;
- deterministic generated types.

### 13.3 Regression

Run current relevant DB/domain regressions for:

```text
Profile
Preference
Preference API
Companion
Companion API
Trip Contract / Planning contract as affected
```

Do not weaken existing tests to make this task pass.

---

## 14. No UI/browser visual changes

TASK-048 must not change:

```text
Trip Library page layout
Trip Library fixture presentation
Planner UI
Start UI
Personal Center visual geometry
```

Browser screenshot QA is not required when runtime UI diff is zero.

Still verify no server DB module leaks into browser source/bundle according to current repository test conventions.

---

## 15. Quality gates

Record the actual baseline before implementation, then run at least:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs"
# TASK-048 focused tests
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
# TASK-048 real runtime test
# relevant Profile/Preference/Companion regressions
# current deploy/local validation gates
git diff origin/develop --check
```

Use actual current scripts when names differ.

If Local Docker is unavailable, do **not** claim completion. WBS 5.18 must remain `进行中`/`Blocked` because real migration/RLS/generated-type acceptance is part of this task.

If the repository has pre-existing failures, record exact baseline vs candidate. No unexplained new failure is acceptable.

---

## 16. WBS tracking rules

At actual implementation start, read the latest Master WBS and minimally update only WBS 5.18:

```text
可开始 (...) → 进行中（#329 / TASK-048-B）
```

Do not overwrite concurrent WBS changes.

When implementation + required QA + Draft PR are complete:

```text
5.18 = 待审查
```

Only after explicit user acceptance and merge:

```text
5.18 = 已完成
```

Do not change 5.19.

---

## 17. Required output

Create:

```text
docs/tasks/RESULT-TASK-048-b-trip-persistence-data-model.md
docs/qa/TASK-048/README.md
```

plus machine-readable QA evidence as useful.

Result must include:

- execution baseline and final integrated develop baseline;
- legacy #221 audit matrix;
- schema/table/column summary;
- lifecycle semantics;
- canonical Trip contract reuse evidence;
- Preference snapshot/patch behavior;
- Companion snapshot privacy behavior;
- RLS/privilege model;
- storage revision/history freeze tests;
- Local Supabase reset/types evidence;
- regression counts;
- Quality Gate results;
- changed files;
- exceptions/baseline failures;
- branch/head/PR/Issue/WBS status.

---

## 18. Draft PR rules

Push the implementation branch and create a **Draft PR** to `develop`.

PR body must include:

```text
Relates to #329
```

At completion point:

```text
Issue #329 = Open
WBS 5.18 = 待审查
PR = Draft
```

Do not:

- auto-merge;
- mark PR Ready for Review unless the user later authorizes it;
- close Issue #329;
- mark 5.18 completed;
- merge/close PR #221 as part of this task;
- start WBS 5.19.

Stop and return the full TASK-048-B Result to the user.
