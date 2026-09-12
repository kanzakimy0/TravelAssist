# TravelAssist — Account Deletion v1

## 1. Purpose

This document freezes the B-owned WBS 5.21 account deletion boundary for the current Web MVP.

The goal is one irreversible current-user deletion flow that removes the Supabase Auth identity and all currently accepted B-owned product data without introducing a generic admin API, a second Auth stack, or a manual table-by-table deletion list that can drift from schema history.

## 2. Accepted prerequisites

WBS 5.21 depends on 5.15–5.19.

At publication time:

- 5.15 Profile / Account API is completed and merged (#337 / #336).
- 5.16 Preference Persistence API is completed.
- 5.17 Companion Persistence API is completed.
- 5.18 Trip Library data model is completed and merged (#331).
- 5.19 Trip Save / Read / History is already accepted and merged (#334), with closeout #335 and Issue #333 Closed / Completed.

The Master WBS 5.19 row still contains historical review-stage text. That is tracking drift only; it is not an implementation dependency failure.

## 3. Existing user-facing surface

The current Account UI already contains:

- `数据与隐私` → danger zone;
- `/personal-center/account/privacy/delete`;
- irreversible warning;
- external-booking warning;
- acknowledgment checkbox;
- typed `删除账户` confirmation;
- a disabled-until-confirmed submit button.

The submit path is currently a demo-only announcement. WBS 5.21 wires this existing surface rather than redesigning it.

The current page also contains fabricated future-trip / external-reservation counts and mock data-export behavior. Those claims must not remain next to a real destructive operation.

## 4. Frozen API

```text
DELETE /api/account
```

Strict request:

```ts
interface DeleteAccountRequestV1 {
  schemaVersion: "1.0";
  confirmation: "DELETE_ACCOUNT";
  externalBookingsAcknowledged: true;
}
```

Rules:

- no `id`, `userId`, `ownerUserId`, email, phone or arbitrary target field;
- unknown fields reject;
- exact confirmation is required as an accidental-call guard;
- caller identity is only the user returned by trusted Auth verification;
- success is `204 No Content`.

The localized typed phrase (`删除账户`) is a UI confirmation. The wire contract stays locale-neutral.

## 5. Authentication / authorization boundary

1. Reuse `verifiedPrivateRequest` / current Authentication Core.
2. Cookie deletion requests require the existing same-origin protection.
3. Explicit Bearer authorization never falls back to Cookie.
4. Verify the user through live Supabase Auth (`getUser()` behavior already used by private APIs).
5. Only after verification may the privileged delete path receive the verified owner UUID.
6. There is no API that accepts an arbitrary target user.

WBS 5.21 does not replace the Auth Core and does not authorize from decoded JWT claims, cookie JSON or client payloads.

## 6. Privileged Supabase boundary

Account identity deletion requires Supabase Auth Admin privileges.

Current Supabase guidance (2026) is to use a server-only Secret Key (`sb_secret_...`) for backend elevated operations; the legacy `service_role` key is being replaced/deprecated. Therefore v1 uses:

```text
SUPABASE_SECRET_KEY
```

The key:

- is server-only;
- is never prefixed with `NEXT_PUBLIC_`;
- is never committed;
- is never returned or logged;
- is never imported into client/browser code;
- is not used as a general-purpose Profile/Preference/Companion/Trip data client.

The privileged module exposes the narrow operation conceptually equivalent to:

```ts
deleteVerifiedAuthUser(verifiedOwner)
```

and internally calls Auth Admin hard deletion:

```text
auth.admin.deleteUser(verifiedOwner, false)
```

A missing or malformed secret key must fail closed with a sanitized 503 response.

## 7. Hard delete, not soft delete

The product promise on the existing UI is permanent deletion. v1 therefore uses Auth hard delete, not Supabase Auth soft delete.

No recovery window is introduced in this WBS.

## 8. Product data deletion model

Current accepted B-owned schemas already use Auth-user FK cascades:

- `profiles` → `auth.users` ON DELETE CASCADE;
- `profile_settings` → `auth.users` ON DELETE CASCADE;
- `emergency_contacts` → `auth.users` ON DELETE CASCADE;
- `travel_preferences` → `auth.users` ON DELETE CASCADE;
- `companions` → `auth.users` ON DELETE CASCADE;
- `companion_groups` → `auth.users` ON DELETE CASCADE;
- `companion_group_members` → parent group / companion ON DELETE CASCADE;
- `trip_library_records` → `auth.users` ON DELETE CASCADE.

Therefore the authoritative deletion event is deletion of the verified Auth user. Product data disappears from SQL FK cascade rather than an application-maintained delete sequence.

At execution time, Codex must query the Local schema and regenerate an inventory of every user-owned/current-user FK. If newer develop introduces a user-owned table that would survive Auth deletion, the Task must not silently claim full deletion.

## 9. Storage gate

Supabase Auth deletion can fail when the user owns Supabase Storage objects.

Current accepted TravelAssist design has only provider-neutral avatar paths/references; WBS 5.15 explicitly did not implement binary upload/storage/CDN ownership.

Acceptance must therefore prove the execution-time repository/project does not contain TravelAssist-owned user Storage objects.

If a newer implementation has added user-owned Storage objects:

- only delete them if the ownership contract is explicit and scoped to the verified user;
- never wipe a bucket or broad prefix as a shortcut;
- otherwise report Blocked / Partial and do not pretend account deletion is complete.

## 10. External systems

Account deletion does **not** cancel external reservations or purchases.

Examples explicitly outside the deletion mutation:

- Booking.com;
- Agoda;
- Klook;
- airlines;
- rail providers;
- restaurants;
- rental cars;
- hotels or other external providers.

If TravelAssist later stores local sync/mapping rows, those product rows may need deletion, but the external vendor order remains outside this account deletion call.

## 11. Session behavior

Deleting the Auth user removes the account and refresh capability, but a previously issued stateless access JWT may remain cryptographically valid until its expiry.

TravelAssist private APIs are expected to continue using live Auth verification (`getUser()`), so an old token must fail application authorization after the user is deleted.

Acceptance must retain one pre-deletion Cookie and one pre-deletion Bearer token and prove that after successful deletion they can no longer access B private APIs.

The browser should additionally clear its local session state best-effort and leave the deleted-account page after success. Browser cleanup is not the source of truth; Auth hard deletion is.

## 12. UI behavior

Reuse the current deletion page.

Keep:

- permanent-deletion warning;
- external-booking warning;
- acknowledgment checkbox;
- typed `删除账户` confirmation;
- cancel path.

Change:

- remove fabricated `2 次未来旅行 / 6 个有效外部预订` claims unless backed by a real accepted data source;
- remove or clearly disable the mock data-export claim (data export is not WBS 5.21);
- replace demo submit with the real API;
- disable duplicate submissions;
- expose deterministic pending/success/error state;
- never render raw backend/Auth errors;
- after 204, clear local session best-effort and redirect away from the private account page.

## 13. Error contract

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

`ACCOUNT_DELETION_BLOCKED` is for a known retained dependency such as owned Storage objects or another deterministic blocker. Raw Supabase/Postgres messages must not be exposed.

## 14. No account deletion audit row containing personal data

Do not add a persistent deletion ledger keyed by the deleted user unless a later compliance design explicitly requires one.

For v1, test/QA evidence may record synthetic fixture counts and anonymous result states but must not persist deleted user email, phone, token, UUID, password, Cookie, JWT or secret key.

## 15. Mandatory real acceptance

Use real Local Supabase with at least User A, User B and anon.

Before deletion, User A must have populated rows covering every current B-owned category. User B must also have data to prove isolation.

After deleting A:

- A Auth user is absent;
- A Profile/settings/emergency contacts are absent;
- A Preference is absent;
- A Companion/groups/members are absent;
- A Draft/Saved/History Trip records are absent;
- B rows are byte/semantic-equivalent to pre-delete state;
- old A Cookie/Bearer cannot access private APIs;
- B and anon behavior remains correct;
- external-order APIs are not called;
- all fixtures are cleaned.

Also test:

- wrong Origin on Cookie delete;
- malformed Bearer with valid Cookie (no fallback);
- missing/incorrect confirmation;
- user/owner injection attempts;
- missing/malformed secret config;
- deterministic Storage blocker behavior;
- repeated UI clicks do not send multiple destructive requests;
- deletion UI no longer displays fabricated counts or claims mock export succeeded;
- browser success flow leaves the private page and does not recover the deleted account on reload.

## 16. Out of scope

- data export;
- soft delete / recovery;
- generic user administration;
- deleting another user;
- email / phone / password mutation;
- OAuth provider management;
- device/session-management UI beyond post-delete cleanup;
- external booking cancellation;
- AI history that does not yet exist;
- WBS 5.13 / 8.6 / 9.5 / 9.6;
- Planner, Map, Route, AI, Engine or POI changes.
