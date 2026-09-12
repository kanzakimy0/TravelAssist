# TravelAssist — Trip Draft / Saved / History Persistence Data Model v1

> WBS: **5.18 保存行程 / 历史 / 草稿数据模型**\
> Task: **TASK-048-B**\
> Issue: **#329**\
> Owner: **B — Personal Center / Saved Trip Data**\
> Publication baseline: `develop@b7eb931698da69cec73f7a0399897dbb5caab8c2`\
> Status: **Frozen implementation specification / waiting for Codex execution**

---

## 1. Goal

WBS 5.18 establishes the durable **B-owned Trip Library persistence model** for three lifecycle states:

```text
Draft → Saved → History
```

This model must let later WBS 5.19 persist/read user travel assets without creating a second Planner/Trip domain.

The central rule is:

> **A owns the canonical Trip facts and Trip Plan contracts; B owns user-scoped persistence, library lifecycle, historical snapshots and Personal Center data management.**

Therefore 5.18 stores validated, versioned canonical snapshots. It does **not** normalize A's itinerary/day/item model into a competing B schema.

---

## 2. Preconditions

The WBS dependencies are satisfied:

- WBS 4.17 Trip Plan / Planner Contract: completed.
- WBS 8.1 DB / ORM / Migration foundation: completed.

Current canonical Trip contract source on `develop`:

```text
src/shared/contracts/trips/index.ts
src/shared/contracts/trips/validation.ts
src/shared/contracts/trips/fixtures.ts
```

The existing public contract already provides:

```text
TripDraftFactsV1
WizardProgressV1
TripPlanSnapshotV1
PlannerResumeV1
parseTripDraftFacts
parseWizardProgress
parseTripPlanSnapshot
parsePlannerResume
```

5.18 must consume those definitions directly.

---

## 3. Ownership boundary

### 3.1 A remains source of truth for Trip semantics

5.18 must not redefine:

- Trip Draft facts;
- destinations/dates/participants/budget/fixed arrangements;
- Trip Plan;
- Plan / Day / Item / Alternative structure;
- booking status fields already present inside canonical Trip Plan items;
- canonical Trip/Plan revision semantics;
- Planner resume identity;
- itinerary ordering or schedule semantics.

No new B-owned equivalents such as the following may be introduced:

```text
trip_days
trip_items
itinerary_items
saved_plan_items
history_day_items
```

unless a later A/B contract explicitly authorizes a new shared normalization layer.

### 3.2 B owns persistence semantics

5.18 may own:

- authenticated owner identity;
- persistence aggregate ID;
- idempotent creation key;
- Trip Library lifecycle (`draft | saved | history`);
- persistence/storage revision;
- immutable long-term Preference snapshot;
- trip-only Preference override patch;
- privacy-minimized Companion snapshot;
- historical freeze semantics;
- DB constraints, RLS and generated DB types.

### 3.3 Revision names must remain distinct

Two revision concepts exist and must not be conflated:

```text
TripPlanSnapshotV1.trip.revision / plan.revision
    = A canonical planning/business revisions

trip_library_records.storage_revision
    = B persistence aggregate CAS revision
```

Never overwrite or synthesize one from the other.

---

## 4. Legacy TASK-017 / Issue #207 / PR #221

Issue #207 and Draft PR #221 are **historical Partial input only**.

They mixed early versions of:

- 5.11 Preference Schema;
- 5.16 Preference persistence;
- 5.18 Trip draft persistence.

The old branch contains a now-obsolete Preference vocabulary and must not be merged or cherry-picked wholesale.

Codex must audit every relevant old changed file using exactly one classification:

```text
REUSE
REWORK
DEFER
SUPERSEDE
```

Minimum expected classification:

| Legacy area                               | Required disposition                                          |
| ----------------------------------------- | ------------------------------------------------------------- |
| old `travel_preferences` SQL/model/parser | **SUPERSEDE** by accepted 5.11 / 5.16                         |
| old `trip_drafts` aggregate idea          | **REWORK** against current Trip contract                      |
| creation-key idempotency idea             | **REUSE/REWORK** if still valid                               |
| preference snapshot / override concept    | **REWORK** using current `PreferenceV1` / `PreferencePatchV1` |
| old `/api/travel-persistence`             | **DEFER/SUPERSEDE**; HTTP belongs to 5.19                     |
| old autosave controller                   | **DEFER** to API/UI wiring                                    |
| old generated DB types                    | **SUPERSEDE**; regenerate from current Local Supabase         |
| old tests                                 | **REWORK** only as scenario references                        |
| old WBS/Task/Result docs                  | historical only; do not rewrite as current truth              |

PR #221 and Issue #207 remain untouched by TASK-048-B unless a later explicit cleanup task is authorized.

---

## 5. Canonical aggregate

### 5.1 One table, one user-owned Trip Library aggregate

The v1 persistence root is:

```text
public.trip_library_records
```

Do not create parallel draft/saved/history itinerary tables.

A single stable persistence ID follows the user asset through:

```text
Draft
  ↓
Saved
  ↓
History (frozen)
```

This avoids moving preference/party snapshots between tables and guarantees one atomic aggregate revision.

### 5.2 Required columns

```text
id                       uuid PK
owner_user_id            uuid NOT NULL → auth.users(id) ON DELETE CASCADE
creation_key             uuid NOT NULL
library_state            text NOT NULL
canonical_trip_id        text NULL

draft_facts              jsonb NOT NULL
wizard_progress          jsonb NOT NULL
plan_snapshot             jsonb NULL

preference_snapshot      jsonb NOT NULL
preference_source_revision integer NOT NULL
preference_override_patch jsonb NOT NULL

party_snapshot            jsonb NOT NULL

storage_revision          integer NOT NULL
frozen_at                 timestamptz NULL
created_at                timestamptz NOT NULL
updated_at                timestamptz NOT NULL
```

### 5.3 Internal ID vs canonical Trip ID

`id` is B's database identity and is a UUID.

`canonical_trip_id` is A's contract identity from:

```text
TripPlanSnapshotV1.trip.id
```

It is **not guaranteed to be a UUID**. The current Trip contract accepts a bounded stable string ID.

Therefore:

- never cast canonical Trip ID to UUID;
- never use the B UUID as a replacement for A's Trip ID;
- when a plan snapshot exists, `canonical_trip_id` must exactly equal `plan_snapshot.trip.id`;
- use a unique owner-scoped index for non-null canonical Trip IDs.

Required uniqueness:

```text
UNIQUE(owner_user_id, creation_key)
UNIQUE(owner_user_id, canonical_trip_id) WHERE canonical_trip_id IS NOT NULL
```

`creation_key` is idempotency identity for creation, not a Trip ID.

---

## 6. Lifecycle

### 6.1 B-owned library state

`library_state` is exactly:

```text
draft
saved
history
```

It is a **Personal Center persistence classification**, not the same field as `TripPlanSnapshotV1.trip.status`.

Do not derive one by casting the other.

### 6.2 State invariants

#### draft

```text
library_state = draft
canonical_trip_id IS NULL
plan_snapshot IS NULL
frozen_at IS NULL
```

The durable draft contains:

- canonical `TripDraftFactsV1`;
- canonical `WizardProgressV1`;
- preference creation snapshot;
- trip-only preference patch;
- optional selected Companion snapshot.

#### saved

```text
library_state = saved
canonical_trip_id IS NOT NULL
plan_snapshot IS NOT NULL
frozen_at IS NULL
```

`plan_snapshot` must parse as the canonical `TripPlanSnapshotV1` and its `trip.id` must equal `canonical_trip_id`.

#### history

```text
library_state = history
canonical_trip_id IS NOT NULL
plan_snapshot IS NOT NULL
frozen_at IS NOT NULL
```

A history row is immutable except for hard deletion of the whole record.

### 6.3 Allowed transitions

```text
draft   → draft
saved   → saved
draft   → saved
saved   → history
```

Disallowed:

```text
history → any mutable state
draft   → history
saved   → draft
history → saved
history → draft
```

“复制旅行” creates a **new record with a new `id` and `creation_key`**. It does not unfreeze or mutate the historical row.

### 6.4 No automatic calendar transition

The DB must not automatically convert a Trip to history just because an end date is in the past.

That decision belongs to the future 5.19 service/API policy. The 5.18 model only enforces valid persistence states and immutability.

---

## 7. Draft storage

### 7.1 `draft_facts`

`draft_facts` stores exactly a value accepted by:

```ts
parseTripDraftFacts(...)
```

Do not copy its field registry into another TypeScript parser.

### 7.2 `wizard_progress`

`wizard_progress` stores exactly a value accepted by:

```ts
parseWizardProgress(...)
```

It is progress state only. It is not a substitute for Planner/Trip status.

### 7.3 Draft survives after save

When `draft → saved`, retain `draft_facts` and `wizard_progress` as the durable input context that produced the saved Trip.

This avoids losing the user's original planning facts and supports future copy/replan/history analysis.

---

## 8. Saved / History plan snapshot

`plan_snapshot` stores the full canonical `TripPlanSnapshotV1` JSON envelope.

Rules:

1. validate using `parseTripPlanSnapshot` before persistence through any server write path;
2. store the canonical parsed/detached result, not arbitrary client JSON;
3. do not normalize Days/Items into B tables;
4. preserve canonical Trip/Plan revisions untouched;
5. preserve unknown/future-code fail-closed behavior from A's parser;
6. history freeze prevents later Planner changes from rewriting historical data.

The DB may enforce top-level shape, version, size and `canonical_trip_id` consistency, but the **TypeScript semantic parser remains the sole canonical Trip parser**.

Do not implement a second full SQL copy of A's itinerary validator.

---

## 9. Long-term Preference snapshot

### 9.1 Source

Use the accepted B-internal current Preference v1:

```text
src/features/preferences/domain/preference-v1.ts
```

Canonical functions/types include:

```text
PreferenceV1
PreferencePatchV1
parsePreferenceV1
parsePreferencePatchV1
applyPreferencePatch
emptyPreference
PREFERENCE_MAX_BYTES
```

Do not restore PR #221's obsolete Preference keys.

### 9.2 Creation snapshot

`preference_snapshot` is a detached `PreferenceV1` captured when the authenticated durable Trip record is created.

`preference_source_revision` records the 5.16 long-term preference revision used for that snapshot.

If the authenticated user has no saved long-term Preference root, use:

```text
preference_snapshot = emptyPreference()
preference_source_revision = 0
```

This follows the accepted 5.16 missing-root semantics.

### 9.3 Snapshot immutability

After record creation:

```text
preference_snapshot
preference_source_revision
```

are immutable for all lifecycle states.

Changing the user's long-term Preference later must never rewrite existing Trip snapshots.

### 9.4 Trip-only override

Store trip-only changes as:

```text
preference_override_patch: PreferencePatchV1
```

not as a second long-term Preference root.

Default:

```json
{ "schemaVersion": "1.0", "set": {}, "unset": [] }
```

This is intentionally a patch rather than a sparse `PreferenceV1`, because a Trip must be able to explicitly unset an inherited long-term value.

Effective trip preference is deterministically derived as:

```ts
applyPreferencePatch(preference_snapshot, preference_override_patch);
```

Trip-only overrides never write back to `travel_preferences`.

The patch may change while the record is `draft` or `saved`. It freezes when the record becomes `history`.

### 9.5 No dependency on unfinished WBS 5.14

WBS 5.14 is not a hard dependency of 5.18.

5.18 stores the accepted B-internal Preference v1 facts. It must not import an unmerged PR #323 implementation, and it must not fabricate Planner/43-field scoring mappings.

---

## 10. Companion snapshot

### 10.1 Why a snapshot exists

Companion Master is mutable and deletable. A historical Trip must not change when the current Companion Master changes.

Therefore each Trip Library record stores a B-owned privacy-minimized `party_snapshot`.

### 10.2 v1 shape

Define one strict B-internal domain value:

```ts
TripPartySnapshotV1 = {
  schemaVersion: "1.0";
  includesOwner: boolean;
  ageReferenceDate: string; // strict YYYY-MM-DD
  members: Array<{
    sourceCompanionId: string; // UUID string, trace only; no FK
    displayName: string;
    planningAgeGroup: "infant" | "child" | "adult" | "senior";
    travelProfile: CompanionTravelProfileV1;
  }>;
}
```

Rules:

- `sourceCompanionId` values are unique;
- order is preserved;
- at most `MAX_COMPANIONS_PER_USER` named Companion Master members;
- `includesOwner` represents self participation; never create a self Companion row;
- no FK from snapshot member to current `companions`, because deleting a current Companion must not mutate historical snapshots;
- `ageReferenceDate` records the date used to derive `planningAgeGroup`;
- when exact trip departure exists, use that local departure date as the preferred reference date;
- when exact trip departure is unavailable, the future service may use an explicit capture/reference date and must preserve it in the snapshot;
- before history freeze, later saves may deliberately recapture the party snapshot; history cannot.

### 10.3 Privacy minimization

Do **not** copy into Trip party snapshots:

```text
birthDate
ageGroupFallback source representation
genderCode
avatarPath
relationshipLabel / relationshipCode
diningNote
privateNote
medical diagnosis
medication
religious reason
unbounded free text
```

The snapshot stores only what is needed to identify a named companion in the Trip and preserve planning-relevant functional facts.

Use the accepted Companion v1 code sets/parser for the `travelProfile`; do not create another mobility/dining/activity taxonomy.

### 10.4 Named Companion snapshots are not participant-count truth

`TripDraftFactsV1.participants` remains the canonical trip-level count input.

`party_snapshot.members` only captures selected named Companion Master records. Do not require its count to equal total participants, because the current canonical Trip contract does not provide a stable identity contract for every participant or temporary traveler.

Do not invent temporary-traveler identity fields in 5.18.

---

## 11. Reservation / Booking historical data

The frozen Trip Library product design says History will eventually preserve Reservation/Partner/price/final-status snapshots.

However current 5.18 prerequisites do not provide one canonical Reservation/Booking persistence contract suitable for B to own.

Therefore v1 explicitly does **not** create:

```text
trip_reservations
booking_snapshots
partner_orders
payment_snapshots
```

and does not invent provider/order/payment fields.

Reserve this as an additive extension point for the future canonical Reservation contract.

This limitation must be stated in the Result. Completing 5.18 means the Trip Draft/Saved/History persistence foundation is complete; it does not mean external booking history persistence is implemented.

---

## 12. Favorites

Favorites remain a separate product concept in the Trip Library UI.

WBS 5.18 is scoped to:

```text
Trip Draft
Saved Trip
History Trip
```

Do not add favorite POI/hotel/restaurant/activity schemas in TASK-048-B.

---

## 13. Aggregate revision / CAS

### 13.1 Storage revision

`storage_revision` is a positive integer.

- insert starts at `1`;
- every successful mutable update increments by exactly `1`;
- identity and owner are immutable;
- stale/non-sequential revision attempts fail;
- `history` rows reject update entirely.

5.18 implements and tests the database invariant.

The HTTP `If-Match` wire contract is **not** part of 5.18; WBS 5.19 will publish API semantics.

### 13.2 Atomicity

All draft/plan/preference/party state is stored in the same aggregate row so a successful mutation cannot commit only one of these components.

This is deliberate: 5.18 does not need a multi-table transaction just to keep Trip, Preference and Companion snapshots aligned.

---

## 14. Database validation boundary

### 14.1 TypeScript is semantic truth

Add a B-owned persistence-domain parser, for example:

```text
src/features/trip-library/domain/trip-persistence-v1.ts
```

It must delegate to:

```text
parseTripDraftFacts
parseWizardProgress
parseTripPlanSnapshot
parsePreferenceV1
parsePreferencePatchV1
parseCompanionTravelProfileV1
```

Do not copy those schemas into a second TypeScript registry.

The new parser owns only B persistence/lifecycle/party-snapshot semantics.

### 14.2 SQL checks are defense-in-depth, not a second Trip schema

The migration should enforce at least:

- required JSON object type;
- version envelope where applicable;
- bounded byte size;
- valid `library_state`;
- draft/saved/history nullability invariants;
- `canonical_trip_id = plan_snapshot.trip.id` when a plan exists;
- positive storage/source revisions;
- owner/creation uniqueness;
- one-way state transition;
- immutable preference creation snapshot;
- history immutability.

Do not attempt to reproduce the entire A Trip parser in PL/pgSQL.

### 14.3 Technical payload limits

All JSON columns must have bounded UTF-8 serialized size.

Use current canonical limits when one already exists (`PREFERENCE_MAX_BYTES`). For Trip/party envelopes, Codex must choose conservative technical v1 caps based on current contract fixtures and expected web usage, document the exact constants in one B-owned domain source, mirror them in SQL, and test parity.

These are abuse/safety limits, **not subscription or membership limits**.

Do not scatter duplicate magic numbers through routes/tests/migrations.

---

## 15. RLS and write exposure

### 15.1 Owner isolation

`owner_user_id` references `auth.users(id) ON DELETE CASCADE`.

Enable RLS.

Required behavior:

- authenticated User A can never read User B's records;
- authenticated User B can never read User A's records;
- anon cannot read any records;
- deleting an Auth user cascades only that user's Trip Library rows.

### 15.2 No premature public write surface

WBS 5.18 is a **data model** task, not the save/read API.

Therefore v1 should not expose direct browser DML merely to make the schema writable.

Preferred 5.18 posture:

```text
anon: no privileges
authenticated: owner-scoped SELECT only (or stricter if repository convention requires)
service_role: migration/test fixture administration only
```

Do not use service-role in a normal user request path.

WBS 5.19 will define the authenticated server write gateway and CAS/API contract. If it later requires a narrowly scoped `SECURITY DEFINER` RPC, that task must validate `auth.uid()`, pin `search_path`, verify owner/id/revision and add cross-user denial tests.

5.18 must not pre-implement that API.

---

## 16. ORM / generated types

Add a Drizzle mirror for the new table under the existing DB schema conventions and export it through the existing schema index.

After migration:

```text
db:start
db:reset
db:types
```

must generate deterministic types from the real Local Supabase schema.

Do not hand-edit generated types as a substitute for `db:types`.

Repeated generation must be byte-identical.

---

## 17. Required model tests

At minimum prove:

### Canonical contract reuse

- valid `TripDraftFactsV1` delegates to the existing parser;
- valid `WizardProgressV1` delegates to the existing parser;
- valid `TripPlanSnapshotV1` delegates to the existing parser;
- a canonical non-UUID Trip ID is accepted and preserved;
- malformed canonical Trip snapshots fail closed;
- 5.18 does not modify `src/shared/contracts/trips/**`.

### Preference semantics

- empty Preference + source revision 0 is valid;
- snapshot is detached/canonical;
- trip patch `set` overrides inherited values;
- trip patch `unset` removes inherited values;
- explicit false/neutral remains distinct from missing;
- old PR #221 preference keys are rejected;
- long-term preference source is never mutated by applying trip override.

### Party snapshot

- includes-owner is independent from named members;
- duplicate source Companion IDs fail;
- member order round-trips;
- age group is derived using explicit reference date and accepted Companion rules;
- forbidden birth date/gender/avatar/relationship/free-text keys fail;
- Companion Master mutation/deletion does not mutate a detached snapshot value.

### Lifecycle

- draft shape accepted;
- draft→saved accepted only with plan + canonical ID;
- saved→history accepted and freezes;
- illegal reverse/skip transitions fail;
- copy helper/result creates independent identity rather than unfreezing history;
- storage revision increments exactly once.

---

## 18. Required Local Supabase QA

Use a real Local Supabase reset and real temporary Auth users.

Minimum matrix:

1. clean migration from baseline;
2. repeated `db:reset` succeeds;
3. generated types repeat identically;
4. User A/User B/Anon RLS read isolation;
5. direct unauthenticated access denied;
6. direct authenticated mutation exposure matches the frozen no-premature-write policy;
7. owner Auth deletion cascades only owner rows;
8. unique `(owner, creation_key)` enforced;
9. non-null canonical Trip ID uniqueness is owner-scoped;
10. stale/non-sequential `storage_revision` rejected;
11. identity/owner/preference creation snapshot mutation rejected;
12. saved/history state constraints enforced;
13. history update rejected;
14. top-level payload/size constraints fail closed;
15. Profile DB regression passes;
16. Preference DB/API regressions pass;
17. Companion DB/API regressions pass;
18. no client bundle imports server DB schema/repository.

Test fixtures and privileged test users must be cleaned up.

---

## 19. Quality gates

Codex must record a before/after baseline and run the repository's current gates, including at least:

```text
npm ci
npm run lint
npm run typecheck
npm run build
full repository tests
TASK-048 focused tests
Local Supabase reset/types tests
deployment/local gates currently used by develop
git diff --check
```

If current develop has an existing failure, record the exact baseline and prove TASK-048 adds no unexplained failure. Do not hide or repair unrelated work unless it is necessary for this task and explicitly documented.

No browser visual regression matrix is required because TASK-048 must not modify UI.

---

## 20. Non-goals

TASK-048-B must not implement:

- WBS 5.19 Trip Save / Read / History HTTP contract;
- Start Flow autosave wiring;
- Trip Library server data wiring;
- Planner save button wiring;
- live Planner consumption;
- WBS 8.5 A-owned Trip Plan DB schema;
- a second Trip/Day/Item schema;
- 5.13 Preference Presets;
- 5.14 Planner Preference mapping/43-field scoring;
- Reservation/Booking/Payment persistence;
- favorites persistence;
- AI;
- route/provider data;
- sharing/mobile sync;
- automatic historical transition based on clock time;
- migration/cherry-pick of PR #221 as a whole.

---

## 21. Expected implementation paths

Expected new/changed implementation files may include:

```text
src/features/trip-library/domain/trip-persistence-v1.ts
src/db/schema/trip-library.ts
src/db/schema/index.ts
supabase/migrations/<timestamp>_create_trip_library_records.sql
src/types/database.generated.ts
tests/task-048-trip-persistence-model.test.mjs
tests/task-048-trip-persistence-model.runtime.mjs
docs/qa/TASK-048/*
package.json            # focused test scripts only if needed
```

Exact names may follow stronger existing repository conventions, but the architecture and ownership rules above are frozen.

Do not modify Trip Library UI fixtures/pages in this task.

---

## 22. Completion semantics

When implementation and required QA are complete:

```text
WBS 5.18 = 待审查
Issue #329 = Open
PR = Draft → develop
PR body = Relates to #329
```

Codex must generate:

```text
docs/tasks/RESULT-TASK-048-b-trip-persistence-data-model.md
docs/qa/TASK-048/...
```

Only explicit user acceptance and merge may change:

```text
WBS 5.18 → 已完成
Issue #329 → Closed / Completed
```

Do not automatically start WBS 5.19.
