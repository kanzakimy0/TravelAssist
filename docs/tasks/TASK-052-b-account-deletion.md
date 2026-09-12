# TASK-052-B — WBS 5.21 User Data / Account Deletion v1

## Status

Ready for Codex implementation after user authorization.

## Metadata

- Repository: `kanzakimy0/TravelAssist`
- WBS: `5.21 用户数据删除 / 账户删除`
- Owner: `B`
- Priority: `P1`
- Issue: `#342`
- Spec branch: `task/b-wbs-5-21-account-deletion`
- Planned implementation branch: `codex/b-account-wbs-5-21-account-deletion`
- Publication baseline: `cb97e96bdb27e7b8e1e6eef742fa95837dcc3477`
- Architecture: `docs/architecture/account-deletion-v1.md`

## 1. Dependency gate

WBS 5.21 depends on 5.15–5.19.

Actual dependency state at publication:

- 5.15 completed / PR #337 merged / Issue #336 completed.
- 5.16 completed.
- 5.17 completed.
- 5.18 completed / PR #331 merged.
- 5.19 **already completed and merged**:
  - TASK-049-B accepted;
  - PR #334 merged;
  - closeout PR #335 merged;
  - Issue #333 Closed / Completed.

The current Master WBS row 5.19 is stale and still contains review-stage text. This is tracking drift only.

### Mandatory first WBS action when implementation starts

After fetching the execution-time latest `origin/develop`, read the complete current `docs/project/WBS-TravelAssist.md` and make only the necessary current-state changes:

```text
5.19 -> 已完成（#333 / TASK-049-B；用户验收，PR #334 已合并）
5.21 -> 进行中（#342 / TASK-052-B）
```

Preserve every unrelated row and historical section exactly unless a newer accepted closeout has already changed either row.

Do not use an old partial WBS copy.

## 2. Objective

Deliver the irreversible current-user account deletion capability promised by the existing Personal Center UI.

The implementation must:

1. verify the signed-in current user through the existing trusted Auth Core;
2. never accept a target user ID from the caller;
3. use a narrowly scoped server-only Supabase Secret Key for Auth Admin hard deletion;
4. rely on audited `ON DELETE CASCADE` constraints for current B-owned product data;
5. wire the existing `/personal-center/account/privacy/delete` page to the real operation;
6. remove fabricated deletion-page claims that would mislead a user during an irreversible action;
7. prove Local Auth/DB/RLS/browser deletion end-to-end with User A/User B/anon;
8. leave external reservations/orders untouched.

## 3. Frozen HTTP contract

### `DELETE /api/account`

Request:

```ts
interface DeleteAccountRequestV1 {
  schemaVersion: "1.0";
  confirmation: "DELETE_ACCOUNT";
  externalBookingsAcknowledged: true;
}
```

Success:

```text
204 No Content
```

Rules:

- strict plain JSON object;
- unknown keys reject;
- missing/incorrect version rejects;
- missing/incorrect confirmation rejects;
- `externalBookingsAcknowledged` must be exactly `true`;
- reject any `id`, `userId`, `ownerUserId`, email, phone, role, target, or audit field;
- no query parameters;
- no caller-selected owner;
- no successful body on 204.

The UI typed phrase `删除账户` is local confirmation; the server wire constant stays locale-neutral.

## 4. Auth / request security

Reuse the accepted private-request implementation (`src/server/private-http.ts` or its execution-time equivalent).

Required behavior:

- unauthenticated request => 401;
- Cookie mutation requires current same-origin validation;
- explicit Bearer never falls back to a valid Cookie;
- verified owner comes from live Auth verification only;
- request payload/query/header cannot override the owner;
- no decoded-JWT-only authorization;
- no custom second Auth/session stack.

## 5. Privileged Auth Admin client

### Secret key direction

Use the current Supabase server secret-key model:

```text
SUPABASE_SECRET_KEY
```

Expected current key shape is `sb_secret_...`.

Do not introduce a new browser/public key. Do not commit a real secret. Do not use `NEXT_PUBLIC_` for the secret. Do not log it.

The new privileged code must be under a server-only boundary and must be narrow, e.g.:

```text
src/server/account-deletion/admin.ts
```

Conceptual public surface:

```ts
deleteVerifiedAuthUser(verifiedOwner: string): Promise<void>
```

Internally it may construct a non-persistent Supabase server client and call:

```ts
supabase.auth.admin.deleteUser(verifiedOwner, false)
```

No route may pass an arbitrary ID into this function.

### Privilege restriction

The secret/admin client must **not** become a general-purpose repository client and must not be used for ordinary:

- Profile reads/writes;
- Preference reads/writes;
- Companion reads/writes;
- Trip Library reads/writes;
- UI data fetching.

If the secret config is absent or invalid, fail closed with sanitized `ACCOUNT_DELETION_UNAVAILABLE` / 503 and leave the account intact.

## 6. Database deletion semantics

The accepted design is Auth-user deletion driven by database FK cascade, not application-managed row-by-row deletion.

Expected current cascade coverage:

- `profiles`;
- `profile_settings`;
- `emergency_contacts`;
- `travel_preferences`;
- `companions`;
- `companion_groups`;
- `companion_group_members` via parent cascades;
- `trip_library_records`.

### Execution-time schema audit is mandatory

Before implementing, query the real Local schema/catalog and enumerate every relevant FK from product tables to `auth.users`, plus dependent companion membership cascades.

If newer `develop` contains a user-owned table that would survive Auth deletion:

- do not silently ignore it;
- prefer fixing the authoritative schema only if that is clearly the intended ownership model and additive migration is safe;
- otherwise mark the Task Blocked/Partial and report the retained dependency.

Do not rewrite old migrations.

### History records

Trip History immutability prevents normal updates, but account deletion is an owner-account hard delete. FK cascade must remove Draft, Saved and History records alike. Prove this with real data.

## 7. Storage gate

Supabase Auth deletion may be blocked by Storage objects owned by the user.

Current accepted TravelAssist implementation has no binary avatar/storage ownership feature; `avatarPath` is only a reference/path.

TASK-052 must inspect execution-time Storage state and product code.

If there are no owned objects, record proof.

If newer code has added user-owned Storage objects:

- only delete objects that are provably owned by the verified current user and belong to an accepted TravelAssist ownership contract;
- never broadly delete a bucket/prefix;
- otherwise return Blocked/Partial rather than orphaning data or falsely reporting deletion.

## 8. External bookings / orders

The account deletion API does not cancel anything at external vendors.

Do not call Booking.com, Agoda, Klook, airlines, rail providers, restaurants, hotels, car rental systems, payment providers, or partner APIs.

The user-facing warning that external bookings must be handled at the external platform remains.

Current mock booking/sync presentation is not a persistence contract.

## 9. Existing UI wiring

Use the existing `DeleteAccountView` in `src/features/profile/account-subpage.tsx` (or execution-time equivalent).

Do not redesign the Personal Center.

### Keep

- deletion warning;
- external-order warning;
- acknowledgment checkbox;
- typed `删除账户` confirmation;
- cancel navigation;
- existing visual language/responsiveness/accessibility.

### Change

1. Replace demo-only submit with real `DELETE /api/account`.
2. Client may only send the canonical wire confirmation once local UI confirmation passes.
3. Add deterministic submit state (`idle / deleting / failed`).
4. Prevent double-click / duplicate destructive calls.
5. Do not expose raw backend/Auth errors.
6. On success, best-effort clear the browser session and navigate away from the private account page.
7. Remove or replace fabricated `2 次未来旅行 / 6 个有效外部预订` and hard-coded provider counts.
8. Do not claim the mock data-export button exported data. Data export is outside WBS 5.21; remove it from this destructive flow or clearly render it unavailable/non-actionable.
9. Keep the statement that external reservations are not cancelled.

## 10. Session-after-delete security

Supabase hard deletion removes the Auth user and refresh capability, but an already-issued access JWT may remain cryptographically valid until expiry.

TravelAssist current private APIs perform live `getUser()` verification. Preserve this behavior.

Mandatory acceptance:

- retain User A Cookie before deletion;
- retain User A Bearer access token before deletion;
- delete User A;
- retry Profile/Preference/Companion/Trip private endpoints with those old credentials;
- all must fail authorization / expose no A data;
- User B continues working normally.

Do not weaken private APIs to local JWT-claim verification.

## 11. Error contract

At minimum:

```text
AUTH_REQUIRED                 401
FORBIDDEN                     403
INVALID_REQUEST               400
PAYLOAD_TOO_LARGE             413
AUTH_UNAVAILABLE              503
ACCOUNT_DELETION_UNAVAILABLE  503
ACCOUNT_DELETION_BLOCKED      409
```

Rules:

- no raw Supabase/Postgres/Auth error text;
- no secret/key leakage;
- no target-user existence oracle;
- no detailed Storage object names in the public error response.

## 12. Normal-user path / admin isolation

A normal request flow is:

```text
Browser / Bearer client
    ↓
DELETE /api/account
    ↓
verifiedPrivateRequest
    ↓ verified owner only
narrow server-only account deletion service
    ↓
Supabase Auth Admin delete current verified user
    ↓
auth.users hard delete
    ↓
existing FK ON DELETE CASCADE
    ↓
B-owned product rows removed
```

The admin secret never authorizes the caller. It is only an execution credential after caller authorization has already succeeded.

## 13. No persistent PII deletion ledger

Do not add a new table storing deleted user email/phone/name/token/UUID just to prove deletion.

QA may record counts and synthetic fixture aliases (`User A`, `User B`) but not credentials or personal identifiers.

## 14. Mandatory real Local acceptance

Use real Local Supabase. At least:

```text
User A = deletion target
User B = isolation control
anon   = unauthenticated control
```

Populate User A before deletion with:

- Profile row;
- Profile settings;
- emergency contact;
- Preference;
- at least two Companions;
- Companion group + members;
- Trip Draft;
- Trip Saved;
- Trip History.

Populate User B with equivalent representative data.

### Prove before deletion

- User A owns and can read only A data;
- User B owns and can read only B data;
- anon cannot delete;
- A cannot choose B as a deletion target;
- wrong/missing Origin fails Cookie deletion;
- malformed Bearer does not fall back to valid Cookie;
- invalid confirmation fails without any data change;
- secret missing/malformed fails without any data change.

### Prove after successful A deletion

- Auth User A no longer exists;
- A Profile absent;
- A settings absent;
- A emergency contacts absent;
- A Preference absent;
- A Companions absent;
- A groups/members absent;
- A Draft/Saved/History rows absent;
- User B Auth + every B product row remains unchanged;
- old A Cookie cannot access private APIs;
- old A Bearer cannot access private APIs;
- deleted user cannot refresh/sign back into the deleted identity without a new signup;
- no external provider request was emitted;
- deletion fixture cleanup leaves no synthetic user/data residue.

### Storage test

Prove either:

- no TravelAssist-owned Storage objects exist for the fixture and deletion succeeds; or
- deterministic owned-object blocker behavior is handled according to the frozen architecture.

## 15. Browser acceptance

Use a real browser against production/local Next build.

At minimum:

- signed-out delete page is guarded by accepted account routing/auth behavior;
- signed-in User A opens delete page;
- button disabled until both checkbox + exact typed phrase;
- fabricated counts/mock export success are absent;
- one click sends one mutation;
- pending state blocks repeats;
- wrong server config produces safe error and no deletion;
- successful deletion leaves the private page;
- reload cannot restore User A session/account UI;
- User B remains usable in a separate browser context;
- no console/page error;
- no secret appears in network response, HTML, JS chunks or source maps/artifacts.

## 16. Regression matrix

At minimum rerun current accepted suites for:

- TASK-050 Profile API;
- TASK-045 Preference API;
- TASK-047 Companion API;
- TASK-049 Trip Library API;
- TASK-016 Profile/Auth schema/RLS/FK;
- Preference DB;
- Companion DB;
- Trip persistence DB.

Run the full repository tests as well.

## 17. Quality gates

Execution-time latest clean baseline first, then candidate:

```text
npm ci
npm run lint
npm run typecheck
npm run build
full repository test suite
focused TASK-052 pure tests
focused TASK-052 Local runtime/browser tests
npm run format:check:deploy
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
git diff --check
```

Local DB:

```text
npm run db:start
npm run db:status
npm run db:reset
```

Run `db:types` only if a real migration/type change is required. Never hand-edit generated DB types.

If existing local lint/format debt remains, provide before/after proof and show changed files are clean.

Final PR exact head must receive its own GitHub Quality Gate PASS. Any later commit invalidates the previous final-head claim.

## 18. Expected implementation shape

Adapt to the execution-time accepted architecture, but expected direction is:

```text
src/app/api/account/route.ts
src/features/account-deletion/...          # browser-safe contract/client if needed
src/server/account-deletion/http.ts
src/server/account-deletion/admin.ts       # server-only secret/admin boundary
```

Reuse current `private-http.ts` and existing browser Supabase/session helpers.

Do not add a generic `admin.ts` export that allows arbitrary user management outside the deletion service.

## 19. Environment / secret handling

If an environment-contract doc/example exists, add only a placeholder/name for:

```text
SUPABASE_SECRET_KEY
```

Never commit the value.

Do not require the secret at browser build/import time. Server deletion must fail closed at request time if it is missing.

Local QA should obtain/use the Local Supabase Secret Key without writing it into tracked evidence.

## 20. Explicitly out of scope

- WBS 5.13 Preference Preset;
- WBS 8.6 B migration consolidation;
- WBS 9.5 / 9.6;
- data export implementation;
- soft delete / restore;
- generic admin panel;
- arbitrary-user deletion;
- credential changes;
- OAuth management;
- external order cancellation;
- Payment/Membership schema;
- AI history unless already accepted by execution time;
- Planner / Map / Route / AI / Engine / POI changes;
- redesigning the Personal Center.

## 21. Tracking / deliverables

Deliver:

- implementation code;
- focused parser/contract tests;
- real Local Auth/DB/FK/cascade tests;
- real browser deletion flow QA;
- sanitized deletion inventory evidence;
- `docs/tasks/RESULT-TASK-052-b-account-deletion.md`;
- `docs/qa/TASK-052/README.md` + machine-readable sanitized evidence;
- latest Master WBS minimal update;
- Draft PR to `develop` using `Relates to #342`.

### WBS lifecycle

At actual implementation start:

```text
5.19 = 已完成（#333 / TASK-049-B；用户验收，PR #334 已合并）
5.21 = 进行中（#342 / TASK-052-B）
```

After implementation + mandatory QA + Draft PR:

```text
5.21 = 待审查（#342 / TASK-052-B；Draft PR #<number>）
```

Only after explicit user acceptance and merge:

```text
5.21 = 已完成
```

Keep Issue #342 Open until final acceptance.

Do not auto-merge and do not start downstream tasks.
