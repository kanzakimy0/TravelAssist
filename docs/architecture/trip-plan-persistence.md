# Trip Plan persistence — TASK-019-A / WBS 8.5

Owner A. Issue #226. Canonical public shape remains `src/shared/contracts/trips/` v1.0, frozen by #216 / #217. This is an additive server persistence implementation, not a new public Contract, API, UI save flow or Engine. SQL migrations are the only schema history.

## Current-state ownership

| SQL table         | Contract projection                                            | Boundary                                                    |
| ----------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| `trips`           | Trip facts, active plan, provenance, root revision / updatedAt | Owner is verified Auth identity, never supplied in snapshot |
| `trip_plans`      | Ordered candidate plans / revision                             | Same-trip active-plan composite FK                          |
| `trip_days`       | Ordered local calendar dates / IANA zones                      | Day numbers unique per plan; repeated local dates allowed   |
| `itinerary_items` | Scheduled and alternative arrays, ordered independently        | One item table; no second history store                     |

Normalized rows are the only persisted current truth. No full JSONB snapshot copy, Saved Trips table, ChangeSet/event log, preference snapshot or draft-progress column exists here. Immutable publication/history belongs to a future reviewed migration. The four B-owned Preference/Draft tables are not created or modified.

## IDs and creation

Database entity IDs are UUIDs. The adapter accepts canonical lowercase UUID strings for Trip/Plan/Day/Item IDs; Consumers still treat them as opaque strings. Legacy `example-*` / private UI IDs are rejected as `UUID_REQUIRED`, not hashed, silently replaced or persisted as fake UUIDs. A future explicit migration must provide durable ID mappings.

New tree and new plan revisions must be **1**. `create` rejects higher revisions rather than pretending imported versions already existed in this DB. Synthetic full fixtures explicitly allocate fresh UUIDs and initial revision 1. Existing revisions are retained on read and compared during replace. Copy/import with new identity is a separate caller decision, not implicit behavior.

DB audit timestamps override supplied timestamps. `updatedAt` means the server write time, not the snapshot's historical source timestamp. Provenance is preserved as its own bounded field.

## Server-only repository

`createTripRepository(requestScopedSupabaseClient)` exposes internal `create`, `read`, `replace`, `remove`. Each operation calls the existing `requireAuthUser` / Auth `getUser`, never trusting cookie JSON or a caller-supplied owner ID. The injectable DB factory is server/test infrastructure, not an HTTP argument. The default connection is lazy `getDb`, so importing/building does not require a cloud DB.

Within a repeatable-read transaction, the DAL sets transaction-local authenticated role and verified subject; all queries run under owner RLS, even when the underlying server connection is privileged. Connection role/claims revert after commit/rollback and are runtime-tested. Non-owner reads/writes return `NOT_FOUND` without exposing existence. No server action, route handler or UI calls the repository in this task.

`replace` validates before Auth/DB access, locks the root, checks expected Trip revision, locks/checks existing Plan revisions, then writes the tree in one transaction. Missing plans are removed; retained plans preserve identity; days/items are atomically replaced with the supplied IDs. A colliding ID in another tree causes rollback, never cross-owner upsert. Writes use bounded batches of 200 items. Reads use one repeatable snapshot and revalidate with `parseTripPlanSnapshot`.

Child audit `created_at` is recreated by full-tree replacement. No current foreign table references these rows; a future Booking/Engine/history integration must replace this writer with a reviewed delta strategy before adding external dependent FKs. This implementation is a foundation, not that future API/Engine.

## Revision and concurrent writes

- SQL maintains revision starting at 1 and a private `revision_txid` marker. One transaction increments an existing affected Trip/Plan once, regardless of the number of row mutations. Initial tree creation stays at revision 1. An explicit no-op replacement is still a new accepted write and increments revisions.
- Day/item insertion, update or deletion invalidates Plan and Trip revisions; Plan changes invalidate Trip revision. The marker is DB-owned, not a consumer/public field.
- For direct Trip/Plan SQL updates, the `revision` value is the **expected current token**, not `nextRevision`. Mismatches and marker tampering raise `PT409 / TRIP_STALE_REVISION`; attempts to create revision >1 raise `TRIP_INITIAL_REVISION`.
- The DAL is the concurrency-safe snapshot write path. Its root/plan locks plus expected tokens prevent stale full-tree replacement. Parallel same-version writers yield exactly one success; serialization/deadlock conflicts become `STALE_TRIP` and require reread, not automatic blind retry.
- Direct authenticated table CRUD is a low-level ownership-protected interface, not a replacement for the DAL CAS protocol. A blind SQL update without an expected token cannot detect what version a caller previously read. Future public APIs must use the DAL/Engine and must not expose blind updates as concurrency-safe.
- No history, idempotency key, change log or Engine operation is invented here.

Stable DAL errors: `INVALID_CONTRACT`, `UUID_REQUIRED`, `INITIAL_REVISION_REQUIRED`, `UNAUTHENTICATED`, `NOT_FOUND`, `STALE_TRIP`, `STALE_PLAN`, `INVALID_DB_STATE`, `CONSTRAINT_CONFLICT`, `DATABASE_FAILURE`. SQL errors/payloads/connection strings are not returned. SQL additionally identifies immutable ID/parent violations as `PT409 / TRIP_IMMUTABLE_ID` and `TRIP_IMMUTABLE_PARENT`.

## RLS, FK and deletion

All four tables enable RLS and explicitly revoke public/anon privileges; authenticated users get CRUD only through owner-chain policies. No membership/sharing policy is invented. The server role remains a trusted boundary, never a browser credential.

IDs and parent ownership links cannot be updated in place, including day/item parent changes. Rearranging items across days uses the validated atomic tree writer; cross-tree relocation is not supported. Active plan uses `(trips.id, active_plan_id) → trip_plans(trip_id, id)`, deferred until transaction commit. Deleting an active plan requires explicitly clearing/switching the pointer. Trip/account deletion cascades to all descendants; other owners are unaffected. Position/day uniqueness is deferred to allow atomic rearrangement without temporary fake positions.

Audit/revision guards are invoker functions. The ancestor-touch trigger alone is a tightly bounded security-definer function with `search_path=pg_catalog`, fully qualified tables, no dynamic SQL/arguments, and no public/anon/authenticated EXECUTE grant. This permits GoTrue's `supabase_auth_admin` account cascade without granting it general public-table access. Actual child mutations still pass their original RLS first. The definer cannot select arbitrary owners or accept arbitrary commands; runtime verifies it cannot be directly called by authenticated users. The initial invoker-only version failed real Auth deletion; the same unmerged migration was corrected and replayed from zero.

## Time / place / booking semantics

`local_date` is a calendar `date`; start/end are `timestamptz`; both endpoint IANA zones are stored. Reader reconstructs a zone-correct ISO offset with milliseconds. Original textual `Z` versus `+00:00` spelling is not preserved; instant, local date and timezone semantics are. DST repeated hour, quarter-hour zone and international date-line/repeated-day fixtures are covered. Full IANA/date/order validation is the canonical parser; DB enforces basic null/length/range constraints and complete schedule groups.

Unknown lowercase future codes remain text and survive round-trip; Consumers use the canonical conservative fallback. Place has only opaque reference/name/nullable coordinate pair, no invented POI/Route/provider FK or data. Booking is only status/reference/verified timestamp: `confirmed` requires both evidence fields, but schema acceptance is not proof of a real booking. Lock, assessment and booking remain independent; changing a lock or risk does not manufacture confirmation. No provider, order, payment or actual purchase is performed.

## Migration and validation

- `20260908150000_create_trip_plan_schema.sql`: four tables, indexes, checks and FKs.
- `20260908150100_add_trip_plan_rls_revision.sql`: owner policies, audit and revision guards.
- Existing profile migration unchanged. Drizzle mirrors columns/types/defaults/PK/FK/unique/index/RLS; SQL exclusively owns CHECK definitions, trigger grants and deferred behavior. Runtime compares key metadata with the live database and exercises SQL constraints.
- `database.generated.ts` is generated by actual `npm run db:types`, never hand-edited; repeated generation must be byte-identical.

```text
npm ci
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
npm run test:trip-plan
npm run test:trip-plan:runtime
node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-016-user-profile.runtime.mjs
npm run lint
npm run typecheck
npm run build
npm run format:check
git diff --check
npm run db:stop
```

Full Node suite: run all `tests/*.test.mjs`. The TASK-019 wrapper runs 16 server-only fixture cases in a clean child environment (without inherited Node test-runner context); explicit Local suite is separate and must not be skipped or represented by static tests. Real Local suite creates two GoTrue users, signs them in, checks actual REST denial and SQL/RLS/CAS/rollback, then removes fixtures. Never supply production URLs/secrets. Only reset a verified empty/isolated task Local DB; don't reset another developer's data.

## Parallel B integration gate

At start and latest check #221 is Open / Draft / Partial (`ae8b1e1`); #207 stays Open. No code/migration from it was stacked/cherry-picked. The earlier stopped Local test DB contained its empty tables (all seven tables and Auth users were verified empty); reset replayed this branch's merged baseline, not B's unpublished migration. Git B migration/semantics were untouched.

Before delivery fetch develop again. If #221 or another DB task merges, retain its migration, safely integrate shared schema index/WBS, regenerate database types, and rerun Local reset/types/RLS and full regression. If still Draft, future integration must perform those same checks; it is not a blocker for this independent four-table foundation.

No browser/UI QA is claimed or required: zero UI, Planner, Start, Personal Center, Mapbox, local draft or real provider modifications. No downstream WBS starts automatically.
