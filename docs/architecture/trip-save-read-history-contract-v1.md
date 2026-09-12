# TravelAssist — Trip Save / Read / History Contract v1

> WBS: **5.19 Trip Save / Read / History Contract**\
> Task: **TASK-049-B**\
> Issue: **#333**\
> Owner: **B — Personal Center / Saved Trip Data API**\
> Publication baseline: `develop@5ceffd8349ead5b5280029d2b344c23e9346e317`\
> Status: **Frozen design; TASK-049-B implemented and real acceptance passed; WBS 5.19 待审查; Draft PR #334 awaiting user acceptance**

---

## 1. Goal

WBS 5.19 turns the completed WBS 5.18 data model into the single authenticated server contract for a user's durable Trip Library.

The supported lifecycle is:

```text
Draft → Saved → History
```

5.19 owns the server/API boundary for:

- creating a durable draft;
- reading/listing the authenticated user's Trip Library records;
- updating a draft;
- saving/re-saving a canonical Trip Plan;
- freezing a saved Trip into History;
- copying History into a new Draft;
- deleting a Draft;
- publishing the stable handoff surface consumed later by A WBS 4.19.

The core rule is unchanged:

> A owns canonical Trip/Planner semantics. B owns authenticated persistence, owner isolation, storage CAS and Trip Library lifecycle.

5.19 must not create a second Trip/Day/Item model and must not move Planner ownership to B.

---

## 2. Preconditions

Hard dependency is satisfied:

```text
WBS 5.18 = 已完成
PR #331 = merged
closeout PR #332 = merged
```

5.19 must reuse, not replace:

```text
public.trip_library_records
src/features/trip-library/domain/trip-persistence-v1.ts
src/db/schema/trip-library.ts
src/shared/contracts/trips/**
src/features/preferences/domain/preference-v1.ts
src/features/companions/domain/companion-v1.ts
src/server/private-http.ts
src/db/index.ts
```

The trusted server DB boundary already states:

```text
getDb() = trusted server query layer; callers must authorize access; no implicit RLS.
```

This is the mutation implementation path for 5.19 after verified user authentication.

---

## 3. Responsibility boundary

### 3.1 B owns

- Trip Library HTTP routes;
- browser-safe B persistence contract;
- private server repository/service;
- owner-scoped DB reads/writes;
- storage revision CAS;
- idempotent draft creation/copy;
- creation-time Preference capture;
- selected Companion capture;
- lightweight list/read projections;
- error contract;
- Local Supabase/Auth/HTTP/DB acceptance.

### 3.2 A still owns

- Planner UI/store;
- Planner save button wiring;
- deciding when a generated Planner plan should be saved;
- canonical Trip/Plan content;
- A WBS 4.19 integration;
- A WBS 8.5 Trip Plan DB work, if/when separately implemented.

TASK-049-B publishes the handoff for 4.19 but does not edit Planner runtime.

### 3.3 Not owned here

- Favorites persistence;
- Reservation/Booking/Payment persistence;
- provider orders;
- Start Flow autosave UI wiring;
- AI;
- sharing/mobile sync;
- automatic calendar-based history conversion;
- account-wide deletion (5.21).

---

## 4. Security architecture

### 4.1 Authentication

Reuse `verifiedPrivateRequest` behavior from accepted Preference/Companion APIs:

- Cookie or explicit Bearer;
- explicit malformed/invalid Bearer never falls back to Cookie;
- mutations using Cookie require the trusted site `Origin`;
- owner identity is derived only from verified Supabase Auth;
- no client-supplied owner is accepted.

All responses remain:

```http
Cache-Control: private, no-store
Vary: Authorization, Cookie
```

### 4.2 No service-role request path

Normal user requests must **not** use Supabase `service_role`.

Use:

```text
verified Auth user
  ↓
server-only repository/service
  ↓
getDb()
  ↓
explicit owner_user_id predicate + CAS
```

`getDb()` is privileged server infrastructure and does not provide implicit RLS. Therefore every query/mutation must explicitly scope by the verified `owner` UUID.

Required static/real tests must prove there is no production service-role client in the 5.19 request path.

### 4.3 Direct browser table writes remain denied

Keep the 5.18 table permission posture:

```text
anon: no access
authenticated: owner-scoped SELECT only
browser INSERT/UPDATE/DELETE/upsert: denied
```

5.19 must not loosen this simply to implement writes.

All semantic writes pass the TypeScript canonical parsers before trusted DB mutation.

---

## 5. Canonical validation order

Every write must follow this order:

```text
HTTP body
↓
bounded UTF-8 JSON reader
↓
verified Auth / Origin
↓
strict endpoint parser
↓
canonical A Trip parser(s)
↓
accepted B Preference / Companion parser(s)
↓
B trip-persistence invariant parser
↓
owner-scoped DB CAS mutation
↓
re-read/parse response
```

Never rely on the 5.18 SQL envelope checks as the sole semantic validator for an HTTP write.

---

## 6. Public route surface

Use one B namespace:

```text
/api/trip-library
```

Routes:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/trip-library` | paginated owner summary list |
| POST | `/api/trip-library` | create durable Draft |
| GET | `/api/trip-library/{id}` | full owner resource |
| PUT | `/api/trip-library/{id}` | replace mutable Draft input state |
| DELETE | `/api/trip-library/{id}` | delete Draft only |
| POST | `/api/trip-library/{id}/save` | Draft→Saved or Saved→Saved canonical plan save |
| POST | `/api/trip-library/{id}/history` | Saved→History freeze |
| POST | `/api/trip-library/{id}/copy` | History→new Draft copy |

No generic action field. State-changing operations remain explicit routes.

---

## 7. Resource identity and ETag

The URL `{id}` is always B's `trip_library_records.id` UUID.

A canonical Trip ID remains the string stored in `canonical_trip_id` and `plan_snapshot.trip.id`.

Never substitute one for the other.

Every single-resource successful response that has a record returns:

```http
ETag: "<storageRevision>"
```

All mutations except initial create require:

```http
If-Match: "<storageRevision>"
```

Rules:

- missing/malformed If-Match → 400;
- stale revision → 409;
- no silent retry with a newer revision;
- no last-write-wins;
- storage revision is not A Trip/Plan revision.

---

## 8. Request body size

The existing private HTTP default of 80 KiB is intentionally too small for a 5.18 canonical plan that may approach 4 MiB.

Extend the shared bounded JSON reader **additively** so callers may pass a stricter endpoint-specific maximum while existing APIs retain the current 80 KiB default.

Suggested technical caps:

```text
create/update Draft HTTP body: 512 KiB
save Plan HTTP body: 4.5 MiB
copy body: 16 KiB
history/delete body: no non-empty body
```

The exact constants must be centralized and tested. They are technical safety limits, not membership limits.

The persisted column caps from 5.18 remain authoritative for stored values.

---

## 9. Create Draft

### 9.1 Request

`POST /api/trip-library`

Strict v1 body:

```ts
{
  schemaVersion: "1.0";
  creationKey: string; // UUID
  draftFacts: TripDraftFactsV1;
  wizardProgress: WizardProgressV1;
  preferenceOverridePatch?: PreferencePatchV1; // default empty patch
  partySelection: {
    includesOwner: boolean;
    companionIds: string[]; // ordered UUIDs
    ageReferenceDate?: string; // required only when exact departure cannot supply it
  };
}
```

Clients may **not** submit:

```text
ownerUserId
id
storageRevision
preferenceSnapshot
preferenceSourceRevision
partySnapshot
createdAt / updatedAt / frozenAt
canonicalTripId / planSnapshot
```

### 9.2 Server capture

Creation must:

1. parse canonical draft/progress;
2. read the current authenticated Preference root through accepted 5.16 behavior;
3. capture `emptyPreference()` / revision 0 when no root exists;
4. parse the trip-only override patch;
5. resolve all selected Companion IDs as owner-scoped current Companion resources;
6. fail if any selected ID is missing/not owned;
7. build the minimized `TripPartySnapshotV1` with the 5.18 helper;
8. create one `draft` record with storage revision 1.

Raw client Preference/party snapshots are never accepted.

### 9.3 Idempotency

`creationKey` is owner-scoped idempotency identity.

If the same owner retries the same creation intent with the same key:

- return the existing Draft rather than creating another row;
- do not recapture a changed current Preference/Companion profile merely because the network retry happened later.

If the same key is reused with incompatible client intent (`draftFacts`, progress, patch, selected Companion IDs or includes-owner differs), return:

```text
409 CREATION_KEY_CONFLICT
```

Do not compare mutable current Preference/Companion source values for retry compatibility.

---

## 10. Update Draft

`PUT /api/trip-library/{id}`

Requires exact `If-Match`.

Allowed only while `library_state = draft`.

Body is a full replacement of the mutable Draft inputs:

```text
draftFacts
wizardProgress
preferenceOverridePatch
partySelection
```

The server:

- re-resolves the selected Companion IDs;
- deliberately recaptures the party snapshot from current selected Companion data;
- keeps creation-time Preference snapshot/source revision immutable;
- replaces the trip-only override patch;
- increments storage revision exactly once.

A stale update or concurrent race returns 409 and preserves the winning row.

---

## 11. Save canonical plan

`POST /api/trip-library/{id}/save`

This is the principal future A WBS 4.19 handoff.

Body:

```ts
{
  schemaVersion: "1.0";
  planSnapshot: TripPlanSnapshotV1;
}
```

Rules:

- requires exact If-Match;
- derive canonical Trip ID from the parsed `planSnapshot.trip.id`; never accept it separately;
- `draft → saved` sets canonical ID and plan;
- `saved → saved` replaces plan only after full canonical parse;
- once a record is already Saved, its canonical Trip ID must remain stable across re-save;
- plan's own Trip/Plan revisions are preserved exactly and are never replaced by storage revision;
- History cannot be re-saved.

Successful response returns new ETag/storage revision.

---

## 12. Freeze to History

`POST /api/trip-library/{id}/history`

Requirements:

- exact If-Match;
- request body must be empty;
- only Saved may transition;
- DB trigger remains source of `frozen_at` and same-update `updated_at`;
- caller cannot supply freeze time;
- History remains immutable after transition.

No automatic transition based on Trip dates.

---

## 13. Copy History

`POST /api/trip-library/{id}/copy`

Strict body:

```ts
{
  schemaVersion: "1.0";
  creationKey: string; // new owner-scoped idempotency key
}
```

Requirements:

- source must be owner-owned History;
- source is never modified;
- use the accepted 5.18 `copyHistoryToDraft` semantics;
- generate a new B UUID;
- canonical Trip ID / plan / frozen time are cleared;
- preserve draft/progress/party context from the history source;
- capture the owner's **current** long-term Preference as the new creation snapshot;
- override starts empty;
- do not invent a new A canonical Trip ID.

Copy creationKey obeys the same retry/idempotency rule as Draft creation.

---

## 14. Delete Draft

`DELETE /api/trip-library/{id}`

Requirements:

- exact If-Match;
- empty request body;
- Draft only;
- Saved/History deletion is not exposed in v1;
- deletion never cancels Reservation/Partner orders (which are not modeled in 5.19).

Account-wide deletion remains WBS 5.21 / Auth cascade behavior.

---

## 15. Read one resource

`GET /api/trip-library/{id}`

Return the authenticated owner's full Trip Library resource needed for resume/copy/client management.

The resource may include:

- B record identity/lifecycle/revision/timestamps;
- canonical draft facts/progress;
- canonical plan snapshot when present;
- immutable Preference snapshot/source revision;
- trip-only Preference patch;
- derived effective Preference;
- minimized party snapshot.

It must not return:

- database credentials;
- service-role secrets;
- arbitrary current Companion Master fields;
- hidden owner data from another user.

Cross-owner or unknown UUID returns the same 404 contract.

---

## 16. List summary contract

`GET /api/trip-library`

Do **not** return every multi-megabyte `plan_snapshot` in list responses.

Return `TripLibrarySummaryV1` projections containing only bounded display/resume metadata, for example:

```ts
{
  id: string;
  libraryState: "draft" | "saved" | "history";
  canonicalTripId: string | null;
  storageRevision: number;
  title: string | null;
  destinations: string[];
  departure: string | null;
  returning: string | null;
  participantCount: number;
  wizardPhase: string;
  planStatus: string | null;
  createdAt: string;
  updatedAt: string;
  frozenAt: string | null;
}
```

The exact DTO must be versioned and strictly parsed.

Do not fabricate Reservation completion, Favorite state or Partner status that 5.18 does not store.

---

## 17. Pagination/query

The list route may accept only these v1 query parameters:

```text
state = all | draft | saved | history   (default all)
limit = integer 1..50                  (default 20)
cursor = opaque versioned cursor       (optional)
```

Ordering is stable:

```text
updated_at DESC, id DESC
```

Cursor must carry the last `(updatedAt,id)` pair and be strictly decoded/validated.

Unknown/duplicate query parameters or malformed values return 400.

Extend the private request helper additively so existing Preference/Companion endpoints continue rejecting all query strings unless they explicitly opt in.

Search/destination/year UX may continue client-side or be a future additive query contract; do not invent unbounded search in v1.

---

## 18. Error contract

Minimum stable codes/status:

| Code | Status |
| --- | ---: |
| `AUTH_REQUIRED` | 401 |
| `AUTH_UNAVAILABLE` | 503 |
| `FORBIDDEN` | 403 |
| `INVALID_REQUEST` | 400 |
| `PAYLOAD_TOO_LARGE` | 413 |
| `INVALID_TRIP_DRAFT_INPUT` | 400 |
| `INVALID_TRIP_PLAN_INPUT` | 400 |
| `INVALID_TRIP_PREFERENCE_PATCH` | 400 |
| `TRIP_LIBRARY_NOT_FOUND` | 404 |
| `STALE_TRIP_LIBRARY_REVISION` | 409 |
| `TRIP_LIBRARY_STATE_CONFLICT` | 409 |
| `CREATION_KEY_CONFLICT` | 409 |
| `COMPANION_SELECTION_INVALID` | 409 |
| `TRIP_LIBRARY_UNAVAILABLE` | 500 |

Do not expose DB error text, SQL, owner UUIDs or sensitive inputs in error responses.

---

## 19. Repository/service transaction rules

Implement server-only repository/service under the B Trip Library module.

Every DB operation must use `owner_user_id = verifiedOwner` in its predicate.

### 19.1 CAS mutation

A mutation must atomically require:

```text
id = requested record UUID
owner_user_id = verified owner
storage_revision = If-Match revision
expected lifecycle state
```

and write `storage_revision = expected + 1`.

If no row changes:

1. perform an owner-scoped existence read;
2. unknown/cross-owner → 404;
3. existing owner row with mismatched revision/state → 409.

Never query by ID alone to distinguish a cross-owner row.

### 19.2 Transactions

Use a DB transaction where one user action requires multiple reads/writes, especially:

- create idempotency resolution;
- copy history + current Preference capture consistency when using DB reads;
- any operation where a companion/preference snapshot and aggregate write must be treated as one server action.

No partial commit is allowed.

---

## 20. Preference and Companion capture

Prefer reusing accepted 5.16/5.17 owner-scoped repositories/services rather than rebuilding their validation semantics.

If the 5.19 transaction uses trusted DB reads directly, it must still delegate payload parsing to the accepted domain parsers and keep owner predicates explicit.

### Preference

- client cannot provide creation snapshot/source revision;
- missing root = emptyPreference + revision 0;
- later long-term Preference edits never rewrite existing records.

### Companion

- client provides only ordered selected IDs + includesOwner (+ fallback reference date when needed);
- all IDs must resolve to the verified owner;
- server constructs the minimized 5.18 party snapshot;
- raw DOB never enters `party_snapshot`;
- source Companion changes after capture do not rewrite the stored snapshot.

---

## 21. Browser-safe A/B handoff

Publish a versioned browser-safe contract surface for later A WBS 4.19.

It must expose at minimum:

```text
TripPersistenceHandleV1
  recordId
  storageRevision

TripSavePlanRequestV1
  planSnapshot (canonical TripPlanSnapshotV1)

TripSavePlanResultV1
  recordId
  canonicalTripId
  libraryState = saved
  storageRevision
  updatedAt
```

The public A-facing handoff must not require A to understand:

- DB UUID ownership rules beyond the opaque record handle;
- Preference snapshot storage internals;
- Companion Master storage internals;
- SQL/RLS implementation;
- B Trip Library UI fixtures.

Provide a handoff document and automated consumer-like import test.

Do not wire Planner in TASK-049-B.

---

## 22. Personal Center boundary

WBS 5.10 UI currently contains fixture-derived Reservation/Favorite presentation that 5.18/5.19 do not persist.

TASK-049-B may publish the real Trip Library read client/read model required by Personal Center, but it must not fabricate missing Reservation/Favorite data to force current fixtures into a server response.

No visual redesign is required in this Task.

If Codex discovers that wiring `trip-library-page.tsx` would require fake fields or visible product redesign, leave UI wiring Deferred and record a concrete follow-up rather than weakening the contract.

---

## 23. Legacy TASK-017 / #207 / PR #221

PR #221 remains historical Partial reference only.

For 5.19 specifically:

- old `/api/travel-persistence` route: **SUPERSEDE**, do not revive;
- old server preference HTTP/service code: accepted 5.16 is current truth;
- old autosave controller: **DEFER**, Start Flow wiring is not 5.19;
- old API tests may be read as scenario ideas only;
- do not merge/cherry-pick PR #221;
- do not close #207 from TASK-049 unless separately authorized.

---

## 24. Required pure/contract tests

At minimum prove:

- strict create/update/save/copy/list query parsers;
- owner/client cannot submit forbidden persistence fields;
- If-Match parsing exact quoted positive revision;
- ETag generation;
- summary does not include plan snapshot or fake booking/favorite values;
- cursor encode/decode/version/order determinism;
- creation retry equivalence and conflict rules;
- canonical non-UUID Trip ID survives save;
- re-save cannot silently change established canonical Trip ID;
- TypeScript canonical Trip parser is invoked before DB writes;
- effective Preference remains snapshot + patch;
- selected Companion IDs are unique/ordered/bounded;
- service-role import/use absent from production request modules;
- A browser-safe handoff has no server/db dependency.

---

## 25. Required real Local Supabase/Auth/HTTP QA

Use real Local Supabase and at least User A / User B plus unauthenticated requests.

Minimum matrix:

1. clean `db:reset` after 5.18;
2. 5.18 migration/regression remains valid;
3. Cookie create Draft succeeds;
4. Bearer create Draft succeeds;
5. malformed/invalid Bearer never falls back to Cookie;
6. cookie mutation wrong/missing Origin denied;
7. client-supplied owner/snapshot/party fields rejected;
8. create captures current Preference and selected Companions;
9. missing Preference captures empty/revision 0;
10. same creationKey retry returns same record;
11. incompatible same creationKey returns 409;
12. User A cannot list/read/mutate User B;
13. cross-user UUID and unknown UUID both return 404;
14. stable list pagination has no duplicates/omissions;
15. list response omits full plan payload;
16. full GET returns ETag and exact owner record;
17. Draft update increments revision once;
18. simultaneous same-revision update race gives one success / one 409;
19. save Draft→Saved with canonical plan succeeds;
20. Saved→Saved plan refresh succeeds with same canonical Trip ID;
21. attempt to change established canonical Trip ID returns 409;
22. exact near-4MiB valid plan can pass the save HTTP boundary;
23. over HTTP/body/storage cap returns 413/400 without partial write;
24. Saved→History uses DB-owned freeze timestamp;
25. any History mutation fails;
26. copy History creates a new Draft/new identity/current Preference snapshot;
27. copy retry idempotency works;
28. Delete Draft succeeds with correct If-Match;
29. Delete Saved/History is denied/conflict;
30. direct authenticated table DML remains denied;
31. no service-role normal request path;
32. Profile/Preference/Companion DB/API regressions pass;
33. final temporary users/data cleaned.

Browser-level API acceptance should exercise at least Cookie fetch flows; no visual screenshot matrix is required unless UI is actually changed.

---

## 26. Quality gates

Run current repository gates from a clean worktree, including:

```text
npm ci
full repository tests
TASK-049 focused pure tests
TASK-049 real Local Supabase/Auth/HTTP tests
5.18 focused regression
Preference/Companion relevant regressions
npm run lint
npm run typecheck
npm run build
npm run format:check:deploy
deploy local validate/build/artifact verify
client bundle server/credential leakage audit
git diff --check
GitHub Quality Gate on final head
```

Record exact before/after baseline. Existing unrelated local cache lint noise must be separated from clean CI evidence rather than hidden.

---

## 27. Expected implementation paths

Expected files may include:

```text
src/shared/contracts/trip-library/**
src/features/trip-library/persistence/**
src/features/trip-library/client/**
src/server/trip-library/**
src/app/api/trip-library/route.ts
src/app/api/trip-library/[id]/route.ts
src/app/api/trip-library/[id]/save/route.ts
src/app/api/trip-library/[id]/history/route.ts
src/app/api/trip-library/[id]/copy/route.ts
src/server/private-http.ts               # additive max/query option only if needed
package.json                             # focused scripts only
supabase/migrations/**                   # only if a narrow additive DB guard is truly required
tests/task-049-*.mjs
docs/contracts/trip-save-read-history-v1-handoff.md
docs/qa/TASK-049/**
```

Do not create a new persistent Trip/Day/Item table.

---

## 28. Completion semantics

When implementation and all required QA complete:

```text
WBS 5.19 = 待审查
Issue #333 = Open
Implementation PR = Draft → develop
PR body = Relates to #333
```

Generate:

```text
docs/tasks/RESULT-TASK-049-b-trip-save-read-history-contract.md
docs/contracts/trip-save-read-history-v1-handoff.md
docs/qa/TASK-049/...
```

Only explicit user acceptance and merge may change:

```text
WBS 5.19 → 已完成
Issue #333 → Closed / Completed
```

Do not automatically start WBS 4.19, 5.21, 8.5 or 9.8.