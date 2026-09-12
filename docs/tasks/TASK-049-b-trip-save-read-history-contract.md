# TASK-049-B — WBS 5.19 Trip Save / Read / History Contract v1

## 1. Tracking

- Repository: `https://github.com/kanzakimy0/TravelAssist`
- WBS: `5.19`
- Owner: `B`
- Responsibility: Personal Center / Saved Trip Data API
- Priority: `P0`
- Issue: `#333`
- Spec branch: `task/b-wbs-5-19-trip-save-read-history-contract`
- Planned implementation branch: `codex/b-account-wbs-5-19-trip-save-read-history-contract`
- Publication baseline: `develop@5ceffd8349ead5b5280029d2b344c23e9346e317`
- Dependency: `5.18` completed
- Status at publication: Task/spec ready; implementation not started

Canonical design:

```text
docs/architecture/trip-save-read-history-contract-v1.md
```

The design document is normative. If this Task summary conflicts with it, the design document wins.

---

## 2. Objective

Implement the authenticated B-side Trip Library Save / Read / History contract on top of the completed WBS 5.18 `trip_library_records` aggregate.

Deliver a server/API layer that safely supports:

```text
create Draft
list/read own records
update Draft
save/re-save canonical plan
freeze Saved → History
copy History → new Draft
delete Draft
```

Publish the browser-safe A/B handoff required later by WBS 4.19, but do **not** wire Planner in this Task.

---

## 3. Hard gates before coding

Codex must begin from execution-time latest `origin/develop`, not from this spec branch.

Run and record:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Then verify:

1. Master WBS 5.18 is `已完成`.
2. PR #331 is merged.
3. The 5.18 closeout is present in develop.
4. `public.trip_library_records` and the 5.18 domain/parser exist.
5. No existing full TASK-049 / WBS 5.19 implementation has appeared concurrently.
6. WBS 5.19 is not already completed by another branch.

If a concurrent full 5.19 implementation exists, stop and report rather than duplicating it.

---

## 4. Required source audit

Read at minimum:

```text
docs/architecture/trip-save-read-history-contract-v1.md
docs/architecture/trip-persistence-data-model-v1.md
docs/tasks/RESULT-TASK-048-b-trip-persistence-data-model.md
docs/qa/TASK-048/README.md
src/features/trip-library/domain/trip-persistence-v1.ts
src/db/schema/trip-library.ts
src/db/index.ts
src/server/private-http.ts
src/server/preferences/**
src/server/companions/**
src/features/preferences/domain/preference-v1.ts
src/features/companions/domain/companion-v1.ts
src/shared/contracts/trips/**
src/features/trip-library/trip-library-model.ts
src/features/trip-library/trip-library-page.tsx
supabase/migrations/20260912100000_create_trip_library_records.sql
docs/architecture/cross-module-contract-handoff.md
docs/project/WBS-TravelAssist.md
```

Historical reference only:

```text
Issue #207
Draft PR #221
```

Do not merge/cherry-pick PR #221.

---

## 5. Branch / WBS start

Create/update only the planned implementation branch from latest `origin/develop`:

```text
codex/b-account-wbs-5-19-trip-save-read-history-contract
```

At real implementation start, reread the latest Master WBS and minimally change only row 5.19:

```text
未开始
→ 进行中（#333 / TASK-049-B）
```

Preserve every unrelated A/B WBS edit.

Do not rewrite the full Master WBS from the spec branch snapshot.

---

## 6. Required API surface

Implement the exact route family:

```text
GET    /api/trip-library
POST   /api/trip-library
GET    /api/trip-library/{id}
PUT    /api/trip-library/{id}
DELETE /api/trip-library/{id}
POST   /api/trip-library/{id}/save
POST   /api/trip-library/{id}/history
POST   /api/trip-library/{id}/copy
```

No generic action route.

No `/api/travel-persistence` revival.

---

## 7. Auth / request security

Reuse accepted private Auth semantics:

- Cookie/Bearer only after actual Supabase verification.
- Explicit Bearer never falls back to Cookie.
- Cookie mutation requires trusted Origin.
- No owner supplied by client.
- All responses private/no-store.
- Cross-owner access must not reveal existence.

Normal user request code must not instantiate/use Supabase `service_role`.

Use `getDb()` only after verified Auth and always with explicit owner predicates.

Keep direct authenticated table writes denied.

---

## 8. Canonical semantic validation

Before any DB write, validate through the current canonical parsers.

Must directly reuse:

```text
parseTripDraftFacts
parseWizardProgress
parseTripPlanSnapshot
parsePreferenceV1
parsePreferencePatchV1
applyPreferencePatch
parseCompanionTravelProfileV1
5.18 Trip persistence parser/helpers
```

Do not copy canonical Trip/Preference/Companion registries into parallel parsers.

SQL envelope checks are defense-in-depth only.

---

## 9. Create Draft contract

`POST /api/trip-library`

Body exactly follows the design:

```text
schemaVersion
creationKey
draftFacts
wizardProgress
preferenceOverridePatch? (default empty)
partySelection:
  includesOwner
  companionIds[] ordered
  ageReferenceDate? when needed
```

Server must capture:

- current long-term Preference snapshot/revision;
- selected owner-scoped Companion resources;
- minimized party snapshot.

Reject arbitrary client creation Preference snapshot/source revision/raw party snapshot.

Implement owner-scoped creationKey idempotency:

- same key + same client intent => same resource;
- incompatible intent => 409 `CREATION_KEY_CONFLICT`.

Retry compatibility must not depend on later changes to the current Preference/Companion source records.

---

## 10. Draft update

`PUT /api/trip-library/{id}`

Requirements:

- exact `If-Match: "revision"`;
- Draft only;
- full replacement of draft facts/progress/override/party selection;
- recapture selected current Companion data;
- creation Preference snapshot/source remain immutable;
- one successful CAS increment only;
- stale/concurrent attempts => 409.

---

## 11. Plan save

`POST /api/trip-library/{id}/save`

Requirements:

- exact If-Match;
- strict canonical `TripPlanSnapshotV1` body;
- derive canonical Trip ID from `planSnapshot.trip.id`;
- Draft→Saved and Saved→Saved only;
- established canonical Trip ID must not change on re-save;
- A Trip/Plan revisions preserved exactly;
- no Planner runtime modification in this Task.

This route/client contract is the later WBS 4.19 handoff.

---

## 12. History freeze

`POST /api/trip-library/{id}/history`

- exact If-Match;
- empty body;
- Saved→History only;
- caller cannot supply freeze timestamp;
- DB trigger supplies freeze/update time;
- no automatic date-driven archive.

---

## 13. History copy

`POST /api/trip-library/{id}/copy`

- source must be owner History;
- body contains only schemaVersion + new creationKey;
- source remains unchanged;
- new B UUID and creationKey;
- canonical ID/plan/freeze cleared;
- preserve source draft/progress/party context;
- capture **current** long-term Preference into the new Draft;
- empty override;
- do not generate an A Trip ID;
- same creationKey retry is idempotent; incompatible reuse is 409.

---

## 14. Delete

`DELETE /api/trip-library/{id}`

- exact If-Match;
- no body;
- Draft only;
- Saved/History cannot be deleted through v1 API;
- never imply external Partner cancellation.

---

## 15. Reads / summaries / pagination

### Single GET

Return full owner resource + ETag.

Unknown and cross-owner both return 404.

### List GET

Strict query only:

```text
state=all|draft|saved|history
limit=1..50
cursor=<opaque versioned cursor>
```

Default limit 20, ordering:

```text
updated_at DESC, id DESC
```

List returns bounded `TripLibrarySummaryV1`; it must not return full multi-MiB plan snapshots.

Do not fabricate Reservation/Favorite data.

If the shared private request helper must allow query strings, make this additive/opt-in so existing Preference/Companion API query rejection stays unchanged.

---

## 16. Body limits

Extend `readPrivateJson` only additively if needed, with existing default unchanged.

Expected endpoint caps:

```text
create/update Draft ≈ 512 KiB
save plan ≈ 4.5 MiB
copy ≈ 16 KiB
history/delete = empty body
```

Centralize constants and test exact behavior.

5.18 persisted caps remain storage truth.

---

## 17. Error / HTTP contract

Implement stable codes from the design, including:

```text
AUTH_REQUIRED
AUTH_UNAVAILABLE
FORBIDDEN
INVALID_REQUEST
PAYLOAD_TOO_LARGE
INVALID_TRIP_DRAFT_INPUT
INVALID_TRIP_PLAN_INPUT
INVALID_TRIP_PREFERENCE_PATCH
TRIP_LIBRARY_NOT_FOUND
STALE_TRIP_LIBRARY_REVISION
TRIP_LIBRARY_STATE_CONFLICT
CREATION_KEY_CONFLICT
COMPANION_SELECTION_INVALID
TRIP_LIBRARY_UNAVAILABLE
```

No raw DB/SQL error detail.

Single-resource responses return `ETag: "<storageRevision>"`.

---

## 18. DB repository rules

Implement a server-only repository/service using the trusted DB layer.

Every query must scope `owner_user_id = verified owner`.

CAS mutations must atomically include owner + id + expected storage revision + allowed lifecycle state.

No ID-only lookup may be used to distinguish a cross-owner row.

Where multi-read/write consistency is required, use a transaction.

Keep the 5.18 table/RLS/direct DML posture unless a narrowly necessary additive hardening migration is justified and fully tested.

Do not introduce a general SECURITY DEFINER mutation RPC exposed to clients when it would bypass TypeScript canonical validation.

---

## 19. Public A/B handoff

Publish a browser-safe versioned handoff contract for A WBS 4.19.

At minimum:

```text
TripPersistenceHandleV1
TripSavePlanRequestV1
TripSavePlanResultV1
```

Add:

```text
docs/contracts/trip-save-read-history-v1-handoff.md
```

The A-facing contract must not require imports from server/db/private B persistence modules.

Add an automated A-like consumer import/boundary test.

Do not start or modify WBS 4.19.

---

## 20. Personal Center boundary

Publish the B client/read model needed for later/current Personal Center consumption.

However:

- no visual redesign;
- do not fake Reservation/Favorite values absent from persistence;
- if current Trip Library fixture UI cannot be wired without fabricating data, leave visible UI wiring Deferred and document the exact follow-up rather than weakening server truth.

TASK-049 is complete based on the contract/API/client handoff and acceptance, not on forcing mock-only UI fields into the DB.

---

## 21. Required tests

Implement all design §24–§25 scenarios, including at least:

### Pure/contract

- strict body/query parsers;
- forbidden client fields;
- ETag/If-Match;
- cursor determinism;
- creation/copy idempotency;
- summary excludes full plan/fake reservation data;
- canonical Trip ID stability;
- browser-safe handoff dependency boundary;
- no service-role request module.

### Real Local Supabase/Auth/HTTP

Use User A/User B/Anon and prove:

- Cookie/Bearer auth;
- invalid Bearer no cookie fallback;
- Origin protection;
- owner/cross-owner 404 isolation;
- create snapshots current Preference/Companions;
- empty Preference revision 0;
- retry same creationKey;
- conflict same creationKey;
- list pagination;
- ETag GET;
- Draft CAS race one success/one 409;
- Draft→Saved;
- Saved→Saved;
- canonical Trip ID change rejected;
- near-4MiB plan HTTP save;
- over-limit no partial write;
- Saved→History DB-owned timestamp;
- History mutation rejected;
- History copy current Preference/new identity;
- Draft delete;
- Saved/History delete blocked;
- direct browser DML still denied;
- no normal service-role path;
- fixture cleanup.

---

## 22. Regression / quality gates

Run and record:

```text
npm ci
baseline full repository tests
candidate full repository tests
TASK-049 pure tests
TASK-049 real Local DB/Auth/HTTP tests
TASK-048 focused regression
Profile DB regression
Preference DB/API/browser regression
Companion DB/API/browser regression
npm run lint
npm run typecheck
npm run build
npm run format:check:deploy
deploy:validate:local
deploy:build:local
deploy:verify-artifact
client bundle secret/server dependency audit
git diff --check
final GitHub Quality Gate
```

Use real `db:start/status/reset/types/stop` when required by current test conventions.

Do not hide unrelated baseline failures.

---

## 23. Deliverables

Required outputs:

```text
implementation code/routes/repository/client/contracts
docs/contracts/trip-save-read-history-v1-handoff.md
docs/tasks/RESULT-TASK-049-b-trip-save-read-history-contract.md
docs/qa/TASK-049/README.md
machine-readable QA evidence as appropriate
Master WBS current status update
Draft PR → develop
Issue #333 tracking update
```

Task/Result/WBS updates must preserve unrelated concurrent records.

---

## 24. Completion status

Before user acceptance:

```text
WBS 5.19 = 待审查
Issue #333 = Open
PR = Open / Draft
```

Do not mark completed merely because local/CI tests pass.

Only after explicit user acceptance and merge:

```text
WBS 5.19 = 已完成
Issue #333 = Closed / Completed
```

Do not automatically start:

```text
WBS 4.19
WBS 5.21
WBS 8.5
WBS 9.8
```

---

## 25. Forbidden operations

Do not use:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Do not overwrite other people's Task/WBS files.

Do not merge implementation before explicit user acceptance.