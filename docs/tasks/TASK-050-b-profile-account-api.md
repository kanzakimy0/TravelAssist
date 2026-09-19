# TASK-050-B — WBS 5.15 Profile / Account API

> Owner: **B / Personal Center**\
> WBS: **5.15**\
> Priority: **P1**\
> GitHub Issue: **#336**\
> Spec branch: `task/b-wbs-5-15-profile-account-api`\
> Planned implementation branch: `codex/b-account-wbs-5-15-profile-account-api`\
> Publication baseline: `develop@1af8d7feac7fa2d254ca85a00061bf6d6b0e7940`\
> Status at publication: **Ready to start; implementation not started**

---

## 1. Objective

Implement the authenticated **Profile / Account API** for TravelAssist Personal Center by reusing the already-merged User/Profile schema and Authentication Core.

This Task turns the frozen Profile/Account design into a real server boundary for:

1. current-user product profile read/update;
2. global account display settings read/update;
3. trusted Auth email/phone/verification summary read;
4. emergency-contact CRUD.

The caller must never choose the owner identity. The current verified Supabase Auth user is the only owner source of truth.

---

## 2. Dependency Gate

Implementation may start only after re-checking the execution-time latest `origin/develop`.

Required dependencies:

- **WBS 8.2 / TASK-016-B User / Profile Schema = completed / merged**;
- **WBS 8.3 / TASK-018-B Authentication Core = completed / merged**.

These gates pass at Task publication time, but Codex must verify them again immediately before creating the implementation branch.

If either dependency has regressed or is absent from latest `origin/develop`, return `Blocked` and stop. Do not stack implementation on an old feature/spec branch.

---

## 3. Canonical Sources to Read First

Before implementation, read the execution-time latest versions of:

- `AGENTS.md`
- `CONTRIBUTING.md`
- `docs/project/WBS-TravelAssist.md`
- `docs/ui/profile-account.md`
- `docs/ui/account-security-data-privacy.md`
- `docs/ui/authentication.md`
- `docs/architecture/db-orm-migration-standards.md`
- `docs/architecture/cross-module-contract-handoff.md`
- `supabase/migrations/20260908083000_create_user_profile_schema.sql`
- `src/lib/auth/server-user.ts`
- `src/server/private-http.ts`
- `src/app/api/preferences/route.ts`
- `src/server/preferences/http.ts`
- current Companion API Route/HTTP/Repository implementation

Do not treat this Task file as permission to replace newer accepted behavior on `develop`.

---

## 4. Existing Data Ownership — Do Not Duplicate

### 4.1 Authentication identity

Supabase `auth.users` remains the authentication source of truth.

Do **not** persist or mirror as independent Profile truth:

- password / password hash;
- access token / refresh token;
- Session data;
- OAuth identities;
- verified email/phone credential truth.

Email, phone and verification state may be exposed by this Task only as a **trusted read-only Auth projection** obtained from the verified server Auth user.

### 4.2 Product Profile

Reuse existing `public.profiles`:

- `id`
- `display_name`
- `full_name`
- `birth_date`
- `gender_code`
- `residence_country_code`
- `residence_city`
- `avatar_path`
- audit timestamps

Profile fields intentionally support progressive completion and may remain nullable.

### 4.3 Account display settings

Reuse existing `public.profile_settings`:

- `locale`
- `region_code`
- `timezone`
- `currency_code`
- `distance_unit`
- `temperature_unit`
- `time_format`

These are account/global display defaults, **not travel preferences**. Do not write them into `travel_preferences`.

### 4.4 Emergency contacts

Reuse existing `public.emergency_contacts`:

- zero or more rows owned by current Auth user;
- independent from Companion records;
- no automatic Companion creation;
- no messaging/notification side effects.

---

## 5. Frozen HTTP Contract v1

All endpoints are private current-user endpoints and must follow the repository's existing private B API conventions:

- thin Next.js Route Handler;
- `runtime = "nodejs"`;
- `dynamic = "force-dynamic"` where current convention requires it;
- `{ ok: true, data }` success envelope;
- `{ ok: false, error: { code } }` deterministic failure envelope;
- `Cache-Control: private, no-store`;
- `Vary: Authorization, Cookie`;
- bounded JSON bodies;
- trusted Auth verification through the current private HTTP/Auth stack;
- Cookie mutations require same-origin protection;
- explicit Bearer authorization must never silently fall back to Cookie.

### 5.1 `GET /api/profile`

Return the complete current-user Profile aggregate.

Canonical response data shape:

```ts
interface ProfileAccountViewV1 {
  schemaVersion: "1.0";
  profile: {
    displayName: string | null;
    fullName: string | null;
    birthDate: string | null; // YYYY-MM-DD
    genderCode: string | null;
    residenceCountryCode: string | null;
    residenceCity: string | null;
    avatarPath: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
  settings: {
    locale: string | null;
    regionCode: string | null;
    timezone: string | null;
    currencyCode: string | null;
    distanceUnit: "km" | "mi" | null;
    temperatureUnit: "celsius" | "fahrenheit" | null;
    timeFormat: "12h" | "24h" | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
  authContact: {
    email: string | null;
    emailVerified: boolean;
    phone: string | null;
    phoneVerified: boolean;
  };
  emergencyContacts: EmergencyContactViewV1[];
}
```

Rules:

- missing `profiles` / `profile_settings` rows are represented as nullable empty projections; GET must not create rows as a side effect;
- Auth contact fields come from trusted `client.auth.getUser()` / accepted Auth helper behavior after verification, never from request payload or public profile columns;
- never expose Auth tokens, provider identities, raw metadata blobs or secrets;
- emergency contacts use deterministic ordering. Prefer stable `created_at`, then `id`, unless a newer accepted repository convention exists.

### 5.2 `PATCH /api/profile`

Explicit-save update/upsert for **product profile + profile settings only**.

Canonical request shape:

```ts
interface UpdateProfileAccountRequestV1 {
  schemaVersion: "1.0";
  profile?: {
    displayName?: string | null;
    fullName?: string | null;
    birthDate?: string | null;
    genderCode?: string | null;
    residenceCountryCode?: string | null;
    residenceCity?: string | null;
    avatarPath?: string | null;
  };
  settings?: {
    locale?: string | null;
    regionCode?: string | null;
    timezone?: string | null;
    currencyCode?: string | null;
    distanceUnit?: "km" | "mi" | null;
    temperatureUnit?: "celsius" | "fahrenheit" | null;
    timeFormat?: "12h" | "24h" | null;
  };
}
```

Patch semantics:

- missing field = unchanged;
- explicit `null` = clear nullable field;
- unknown root/child keys = reject;
- empty mutation (`profile` and `settings` both absent or contain no effective keys) = reject as `INVALID_REQUEST`;
- caller-supplied `id`, `userId`, `ownerUserId`, auth email/phone or timestamps = reject;
- use current trusted Auth user ID for row identity;
- absent `profiles` / `profile_settings` row may be created by the explicit save;
- preserve DB-owned `created_at` and audit behavior;
- return the refreshed `ProfileAccountViewV1` after success.

Do not add a revision/CAS column solely for this Task. Existing schema has no Profile revision contract. If Codex discovers a real atomicity defect between the profile/settings pair that cannot be safely handled by the accepted server/repository boundary, it may add a tightly scoped migration/RPC only after documenting why; SQL remains schema history and generated DB types must then be regenerated from real Local Supabase.

### 5.3 `GET /api/emergency-contacts`

Return the current user's `EmergencyContactViewV1[]` in deterministic order.

```ts
interface EmergencyContactViewV1 {
  id: string;
  name: string;
  relationship: string;
  phoneE164: string;
  countryCode: string | null;
  email: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### 5.4 `POST /api/emergency-contacts`

Create one current-user emergency contact.

Canonical request:

```ts
interface CreateEmergencyContactRequestV1 {
  schemaVersion: "1.0";
  name: string;
  relationship: string;
  phoneE164: string;
  countryCode?: string | null;
  email?: string | null;
  note?: string | null;
}
```

Rules:

- DB/service generates the ID;
- no caller-owned user ID accepted;
- return created `EmergencyContactViewV1`;
- no Companion side effect.

### 5.5 `PATCH /api/emergency-contacts/[id]`

Update one own contact.

Canonical request:

```ts
interface UpdateEmergencyContactRequestV1 {
  schemaVersion: "1.0";
  name?: string;
  relationship?: string;
  phoneE164?: string;
  countryCode?: string | null;
  email?: string | null;
  note?: string | null;
}
```

Rules:

- missing = unchanged;
- required fields may not be set to `null`;
- optional fields may be explicitly cleared with `null`;
- empty patch rejected;
- contact ID comes from the path and must be valid UUID syntax before repository lookup;
- owner scope must be part of lookup/update, not an after-the-fact check;
- cross-user/nonexistent ID must not disclose another user's row details. Use the current private API's accepted not-found/forbidden policy consistently.

### 5.6 `DELETE /api/emergency-contacts/[id]`

Delete one own emergency-contact row.

This is **not account deletion** and does not delete Profile, Auth user, Companion, Trip, Preference or any external order.

Return the repository's standard private mutation success shape; do not return another user's data.

---

## 6. Domain Validation

Parsing must be strict and fail closed. Prefer a B-owned Profile/Account contract/parser module under `src/features/profile/**` or the execution-time accepted equivalent. Route Handlers must not become the canonical validation registry.

### 6.1 Profile

At minimum enforce:

- `displayName`: trimmed, non-empty when non-null, max 100 chars;
- `fullName`: trimmed, non-empty when non-null, max 200 chars;
- `birthDate`: strict `YYYY-MM-DD`, real calendar date, not in the future;
- `genderCode`: reuse existing accepted Product/Profile semantics; do not invent a conflicting vocabulary. If the current schema/design still intentionally leaves the enum open, only enforce the existing bounded non-empty contract and document that no new enum was frozen;
- `residenceCountryCode`: uppercase ISO-alpha-2 shape; use an existing canonical assigned-country registry if one is already accepted in `develop` rather than duplicating a list;
- `residenceCity`: trimmed, non-empty when non-null, max 200 chars;
- `avatarPath`: bounded provider-neutral reference/path; reject obvious traversal/credential/URL abuse according to current avatar/reference conventions. Do not implement binary upload.

### 6.2 Settings

At minimum enforce:

- `locale`: valid supported BCP-47-style tag according to the accepted runtime/registry available in the repository; do not freeze a second ad-hoc locale list;
- `regionCode`: uppercase ISO-alpha-2 shape and existing registry if available;
- `timezone`: valid supported IANA timezone using the execution runtime/current accepted registry;
- `currencyCode`: uppercase alpha-3 and existing supported currency registry if available;
- `distanceUnit`: exactly `km | mi`;
- `temperatureUnit`: exactly `celsius | fahrenheit`;
- `timeFormat`: exactly `12h | 24h`.

Null remains a valid "use application fallback" state where the DB design allows it.

### 6.3 Emergency contact

At minimum enforce:

- `name`: trimmed 1–200 chars;
- `relationship`: trimmed 1–100 chars;
- `phoneE164`: canonical `+` followed by 2–15 digits, matching current DB invariant;
- `countryCode`: optional uppercase ISO-alpha-2;
- `email`: optional bounded normalized/trimmed email shape, max 254 chars;
- `note`: optional trimmed non-empty content when non-null, max 2000 chars;
- unknown keys rejected.

Do not infer Companion membership, medical facts, notification recipients or external reservation behavior from these fields.

---

## 7. Architecture and File Boundaries

Follow the current private B API architecture already present on `develop`.

Expected direction (adapt only to execution-time accepted structure):

```text
src/app/api/profile/route.ts
src/app/api/emergency-contacts/route.ts
src/app/api/emergency-contacts/[id]/route.ts

src/features/profile/...        # strict public/internal contract + parsers
src/server/profile/http.ts      # request orchestration / response mapping
src/server/profile/repository.ts
```

If a mapper/service split improves consistency with current Companion code, reuse that pattern.

Rules:

1. `src/app/api/**` Route Handlers stay thin.
2. Server DB/Auth modules include `server-only` protection where appropriate.
3. Reuse `src/server/private-http.ts` for verified private requests and body/security behavior unless an execution-time accepted replacement exists.
4. Do not create a second Supabase/Auth client stack.
5. Do not use service role for normal current-user reads/writes.
6. RLS remains defense-in-depth; server code still scopes all DB access by current owner.
7. SQL remains authoritative schema history; Drizzle/generated types mirror it.
8. No client bundle may import server repository/Auth code.

---

## 8. Error Contract

Create deterministic Profile/Account API error codes consistent with existing private APIs. Do not leak raw Postgres/Supabase/Auth error strings to clients.

At minimum cover the semantic equivalents of:

- `AUTH_REQUIRED` → 401
- `AUTH_UNAVAILABLE` → 503
- `FORBIDDEN` → 403
- `INVALID_REQUEST` → 400
- `PAYLOAD_TOO_LARGE` → 413
- `PROFILE_UNAVAILABLE` / backend unavailable → 503
- contact-not-found semantics using current private API convention

If more specific validation codes are introduced, keep them bounded, tested and documented; do not expose field values or internal SQL details in errors.

---

## 9. Mandatory Real Runtime / Security Acceptance

This Task is not complete with unit mocks only.

Use real Local Supabase and at least:

- Auth User A;
- Auth User B;
- anon / unauthenticated caller.

Prove all of the following:

### Authentication / ownership

- unauthenticated GET denied;
- unauthenticated mutation denied;
- Cookie and explicit Bearer flows behave according to current private API contract;
- Cookie mutation with wrong/missing Origin fails closed;
- caller cannot select another owner via query/body/path;
- two users cannot read or mutate each other's Profile/settings/contacts;
- malformed explicit Bearer does not fall back to Cookie.

### Profile/settings

- first GET on a user with no product rows returns a valid empty/null aggregate without creating rows;
- explicit PATCH creates missing Profile/settings rows as needed;
- subsequent GET matches saved state;
- missing patch fields remain unchanged;
- explicit null clears allowed nullable fields;
- invalid/unknown keys fail closed;
- future birth date rejected;
- invalid locale/timezone/currency/units rejected according to accepted validation source;
- auth email/phone projection cannot be overridden by PATCH payload;
- trusted Auth contact summary is derived from the authenticated Auth user.

### Emergency contacts

- list/create/update/delete own contact;
- deterministic ordering;
- invalid UUID rejected before DB lookup;
- cross-user ID read/update/delete does not leak the other user's data;
- required/optional/null semantics are correct;
- E.164/email/length guards pass/fail as designed;
- deleting one contact has no effect on Companion/Profile/Preference/Trip data.

### Existing schema/RLS regression

- TASK-016-B owner-only RLS still passes;
- deleting a real Auth test user continues to exercise the existing FK cascade behavior in Local DB fixture tests, but **do not expose account deletion as a 5.15 product API**.

---

## 10. Quality Gates

Before implementation, capture the execution-time clean `origin/develop` baseline.

Required before returning a successful Result:

```text
npm ci
npm run lint
npm run typecheck
npm run build
full repository test suite
focused TASK-050-B tests
current deploy/format/diff gates used by the repository
```

Local DB/Auth:

```text
db:start
db:status
db:reset
```

Run `db:types` and prove generated types are byte-stable/repeatable if and only if this Task adds a migration/RPC or otherwise requires generated type changes. Never hand-edit `src/types/database.generated.ts`.

If Local Supabase / Docker is unavailable, do **not** claim complete acceptance. Return `Blocked` or `Partial` with exact evidence and keep WBS 5.15 out of `待审查` until the mandatory real runtime gate is satisfied.

Existing baseline-only failures must be separated from Task regressions with before/after evidence. Never call a failing new regression "baseline" without proof.

---

## 11. Explicitly Out of Scope

Do not implement any of the following in TASK-050-B:

- change email;
- change phone;
- change/set password;
- OAuth provider connect/disconnect;
- login device/session management;
- security activity store;
- account recovery redesign;
- data export;
- **user/account/data deletion — WBS 5.21**;
- external Booking/Agoda/Klook/airline order sync;
- Reservation/Payment/Membership schema;
- Preference API or Preference Contract changes;
- Companion API changes;
- Trip Library/Trip Save API changes;
- Planner, Route, AI, Engine, POI work;
- Personal Center visual redesign;
- avatar binary upload/storage/CDN pipeline;
- public profile directory/search;
- second Auth/Session implementation;
- WBS 5.21 implementation.

If an out-of-scope dependency is genuinely required, document it and stop rather than silently expanding scope.

---

## 12. Expected Deliverables

Implementation should produce the execution-time appropriate equivalents of:

- strict Profile/Account request/response contracts and parsers;
- Profile aggregate repository/server layer;
- `/api/profile` GET/PATCH;
- emergency-contact collection/item APIs;
- focused unit/integration/runtime tests;
- Local Supabase/Auth/RLS evidence;
- `docs/tasks/RESULT-TASK-050-b-profile-account-api.md`;
- `docs/qa/TASK-050/README.md` plus concise machine-readable evidence where current repository practice uses it;
- minimal latest-Master-WBS update;
- Draft PR to `develop` with `Relates to #336`.

No UI screenshots are mandatory because this Task does not change visual UI. Browser/client verification is required only when needed to prove private API/session behavior or client-bundle boundaries.

---

## 13. WBS / Issue / PR State Machine

At spec publication:

```text
5.15 = 未开始
Issue #336 = Open
```

When Codex actually creates the implementation branch from the latest clean `origin/develop` and begins work:

```text
5.15 = 进行中（#336 / TASK-050-B）
```

After implementation, mandatory real Local Supabase/Auth acceptance, Quality Gates, Result and Draft PR:

```text
5.15 = 待审查（#336 / TASK-050-B；Draft PR #TBD）
Issue #336 = Open
PR = Draft / Open
```

Only after explicit user acceptance and merge to `develop` may later closeout set:

```text
5.15 = 已完成
Issue #336 = Closed / Completed
```

Do not auto-merge. Do not mark acceptance on the user's behalf. Do not start WBS 5.21 automatically.

---

## 14. Shared-File Safety

Before every WBS update:

1. fetch the latest `origin/develop`;
2. read the complete current `docs/project/WBS-TravelAssist.md`;
3. modify only the WBS 5.15 status/tracking text required by this Task;
4. preserve every unrelated A/B row and historical tracking section;
5. inspect the resulting diff before commit.

Do not overwrite the Master WBS with an older spec-branch copy.

---

## 15. Prohibited Git Operations

Do not run:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Do not delete or rewrite another Owner's Task/Result/WBS history.

---

## 16. Completion Result Format

Return a complete `TASK-050-B Result` including:

- Status;
- execution baseline / latest develop used;
- Dependency Gate;
- Issue / implementation branch / commits / Draft PR;
- exact API routes implemented;
- contract/validation summary;
- Auth/owner/RLS security results;
- Local Supabase commands/results;
- focused + full tests;
- lint/typecheck/build/deploy/diff gates;
- files changed;
- migrations/RPC/type-generation status;
- known limitations / deferred items;
- WBS update;
- confirmation that 5.21 was not started.
