# TASK-018-B — Authentication Core

## 0. Metadata

- Task ID: `TASK-018-B`
- WBS: `8.3`
- Owner: `B`
- Priority: `P0`
- Issue: `#214`
- Spec branch: `task/b-authentication-core`
- Execution branch: `feature/b-authentication-core`
- Target branch: `develop`
- Task-definition base: `develop@39890af8c2ed137712b90f3f9d2bfdef313cfef6`
- Status at definition: `Task defined / ready for execution from latest origin/develop`
- Unlocks after merge: `5.3 Login / Register / Session UI flow`, authentication dependency of `5.15 Profile / Account API`

> The execution base is **not** frozen to the task-definition SHA. Codex must fetch and branch from the latest clean `origin/develop` when implementation actually begins.

---

# 1. Objective

Implement TravelAssist's reusable Authentication / Session core on top of the merged Supabase database foundation.

The deliverable is the technical authentication layer that later UI/API tasks call. It is **not** the visual implementation of WBS 5.3.

The completed core must provide:

```text
Browser / Next.js
      ↓
Supabase SSR client boundary
      ↓
Cookie-based Auth Session
      ↓
Authentication Core
├─ Email + Password signup/sign-in
├─ Phone OTP sign-in / auto-signup
├─ Email OTP sign-in without auto-signup
├─ Sign out
├─ Password recovery / update
├─ Google / Apple OAuth entry + callback contract
└─ Safe returnTo / redirect intent
      ↓
Supabase Auth (auth.users = identity source of truth)
      ↓
Existing owner-only RLS / future APIs
```

---

# 2. Required reading before any code change

Read all of the following from the latest implementation base:

1. `CONTRIBUTING.md`
2. `AGENTS.md`
3. `docs/project/WBS-TravelAssist.md`
4. `docs/ui/authentication.md`
5. `docs/ui/account-security-data-privacy.md`
6. `docs/architecture/db-foundation-bootstrap-plan.md`
7. `docs/architecture/db-orm-migration-standards.md`
8. `docs/architecture/cross-module-contract-handoff.md`
9. `docs/tasks/RESULT-TASK-016-b-user-profile-schema.md`
10. Issue `#214`
11. This Task file

Because the repository uses Next.js `16.3.4`, also read the relevant installed guides under:

```text
node_modules/next/dist/docs/
```

At minimum inspect the current installed documentation for:

- Proxy / request interception behavior
- cookies
- Route Handlers / Server Actions as actually used by the implementation
- redirects
- Server vs Client component boundaries

Do not implement from remembered older Next.js middleware/session APIs if the installed docs differ.

Also check the current official Supabase guidance for:

- `@supabase/ssr`
- Next.js SSR Auth / PKCE
- cookie session refresh
- trusted server-side auth verification
- Local Auth / CLI config

The exact package/API calls may evolve; the frozen requirement is the behavior and security boundary in this Task, not an obsolete API spelling.

---

# 3. Hard prerequisites

Before implementation:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Verify all of the following:

- `TASK-015-A / WBS 8.1 + 8.4` are merged into `origin/develop`.
- `TASK-016-B / WBS 8.2 / PR #209` is merged and its merge is an ancestor of the latest `origin/develop`.
- The latest `origin/develop` contains the current `profiles`, `profile_settings`, `emergency_contacts` implementation and generated database types.
- No existing open implementation PR or remote `feature/b-authentication-core` already contains implementation work. Reuse rather than duplicate if one legitimately exists.
- The implementation worktree is isolated from Planner/UI work.

If these checks fail, return `Blocked` with exact evidence. Do not stack implementation on an unmerged feature branch.

---

# 4. Workspace isolation

Authentication integration uses Supabase Local and may modify package/runtime infrastructure. Do not perform the work by switching branches inside an active Planner/UI worktree.

Create or use an isolated Git Worktree from the latest clean `origin/develop`, then create:

```text
feature/b-authentication-core
```

Do not modify another owner's uncommitted workspace.

Before destructive local DB commands, prove the Supabase stack is the disposable TravelAssist Local stack for this task. Never run `db:reset` against staging, production, or valuable local data.

---

# 5. Frozen identity and credential boundary

## 5.1 Source of truth

Supabase Auth is the only authentication identity source of truth:

```text
auth.users
```

Do not create a second application user/password/session authority.

Existing public business tables may reference the Auth user ID, but they must not become credential truth.

## 5.2 Never copy these into public business tables

Do not persist independent copies of:

- password / password hash
- access token
- refresh token
- session token/session payload
- OAuth provider access token
- OAuth provider identity as a second auth authority
- verified email/phone as a duplicate authentication truth
- Supabase Secret key

`public.profiles` remains product profile data only.

## 5.3 API key boundary

Keep the frozen project naming:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_SECRET_KEY
DATABASE_URL
```

Rules:

- browser code may only use the publishable key.
- `SUPABASE_SECRET_KEY` and `DATABASE_URL` are server-only.
- no real secret may be committed, printed into Task/Result, emitted in logs, screenshots, client chunks, fixtures or test snapshots.
- do not reintroduce legacy anon/service-role variable names as the new application standard.

---

# 6. Supabase SSR / Next.js session architecture

Add the current stable `@supabase/ssr` version compatible with the repository's existing Supabase SDK / Next.js baseline. Lock the resolved version in `package-lock.json`.

Establish typed, minimal boundaries for:

```text
Supabase Browser Client
Supabase Server Client
Request/Proxy session refresh
Trusted server-side current-user / claims helper
```

Use `src/types/database.generated.ts` where database typing is applicable.

Requirements:

1. Browser and server clients must not share server secrets.
2. Cookie-based session state must follow current `@supabase/ssr` + Next.js guidance.
3. Server Components cannot be assumed to persist refreshed cookies by themselves; implement the current recommended request/proxy refresh pattern for Next.js 16.
4. Authorization-critical server code must not trust a client-spoofable cookie or an unverified session payload as final authorization proof.
5. Use the current Supabase recommended trusted verification call (`getClaims`, `getUser`, or the current documented equivalent as appropriate for the installed/current SDK). Document the choice in Result.
6. Environment variables must be validated lazily enough that ordinary `lint`, `typecheck`, and secret-free production `build` do not fail merely because a module was imported.
7. Do not globally protect unrelated routes in this Task. Provide reusable primitives for future route/API protection.

If Next.js 16 uses `proxy.ts` rather than an older `middleware.ts` convention in the installed docs, follow the installed convention. Do not create duplicate competing interception layers.

---

# 7. Authentication flow contract

## 7.1 Email + password signup

Implement a reusable core operation for explicit email registration.

Frozen behavior:

- registration is explicit; email OTP login must not silently register.
- first-stage signup creates the minimal Auth account only.
- do not require name, gender, residence, preferences, companion data, budget or trip data.
- do not automatically mutate `profiles`/`profile_settings` merely to make signup appear complete.
- email uniqueness remains governed by Supabase Auth.

### Password policy for the MVP core

Freeze a simple policy consistent with the current UI baseline:

- minimum 8 characters
- at least one alphabetic character
- at least one numeric character
- no complex strength score
- no mandatory special-character rule

Enforce the same effective rule at the application/auth boundary used by signup and password update. If the current Supabase local configuration can safely enforce an equivalent server-side policy, keep the two aligned and document it. Do not weaken an upstream stronger default.

## 7.2 Email + password sign-in

Provide reusable email/password sign-in.

Return normalized success/error results suitable for later WBS 5.3 UI. Do not encode final visual strings in the core layer.

Do not leak whether a credential exists beyond what is necessary for the frozen UI behavior and Supabase's safe error model.

## 7.3 Phone OTP login / auto-signup

Frozen behavior from `docs/ui/authentication.md`:

```text
Phone + OTP valid
      ↓
Existing Auth user → sign in
New phone         → create minimal Auth user → sign in
```

The phone OTP request must allow account creation for an unregistered phone under the frozen design.

For Local Supabase integration tests, use the CLI-supported deterministic test OTP facility with clearly fictional test phone numbers. Do **not** send a real SMS and do not add real Twilio/Vonage/etc. credentials.

Any committed local test OTP configuration must be unambiguously Local/test-only and must not represent a production credential.

## 7.4 Email OTP login — no auto-registration

This rule is mandatory:

```text
Email OTP valid
      ↓
Existing Auth user → sign in
Unregistered email → DO NOT create account
```

Use the Supabase API option that disables user creation (`shouldCreateUser: false` in the current SDK, or the current documented equivalent).

The normalized result must allow WBS 5.3 to distinguish the “unregistered email → offer Create Account” state without silently creating a user.

A test must prove that an unregistered email OTP attempt leaves the Auth user count unchanged.

## 7.5 Sign out

Implement current-session sign-out and cookie/session cleanup suitable for later UI invocation.

Do not implement “sign out every device” or device-session management here; those belong to the later Login & Security scope.

## 7.6 Password recovery / reset

Implement the core for:

```text
request reset email
→ secure recovery link / PKCE callback
→ recovery session
→ validate new password
→ update password
→ user can sign in with new password
```

Local tests should use the Local mail capture service rather than a real email provider where practical.

Do not implement the final visual reset-password page in WBS 8.3.

## 7.7 OAuth — Google / Apple

Provide the core provider contract for:

- Google
- Apple
- safe callback / PKCE completion
- returnTo preservation

Rules:

- provider credentials are external configuration and must not be committed.
- Local config may leave real providers disabled.
- real Google/Apple network E2E is not required for this Task without owner-provided provider projects/secrets.
- do not build custom “same email = merge accounts” logic.
- do not silently overwrite an existing TravelAssist account.
- if current Supabase provider identity behavior has implications for duplicate-email/account linking, document the actual current behavior and limitation in the Result; do not invent an unreviewed merge engine.

Manual account-linking / unlinking belongs to the later Login & Security work.

---

# 8. returnTo / redirect intent security

Authentication must support restoring the user's original context, for example:

```text
home → auth → home
planner save → auth → planner / resume save intent
personal center → auth → personal center
```

Create a reusable validated return target helper.

Minimum acceptance rules:

- relative in-app paths may be accepted.
- reject `http://...`, `https://...`, protocol-relative `//...`, backslash/network-path tricks, encoded bypasses or another-origin destinations.
- invalid/missing targets fall back to a safe application route.
- callback and recovery routes must use the same validator rather than duplicating looser redirect logic.

Add malicious/open-redirect test cases.

---

# 9. Session / authorization contract for downstream code

Expose a small server-side contract that future APIs can use, for example conceptually:

```text
getCurrentAuthUser / getCurrentClaims
requireAuthUser
```

Names may differ, but responsibilities must be explicit.

Requirements:

- no service Secret is required for normal end-user authorization.
- downstream code receives the authenticated Auth user ID in a typed form.
- unauthenticated state is distinct from internal/configuration failure.
- the helper must not make unrelated pages contact a remote Supabase project during import/build.
- trusted authorization checks are server-only.

Do not implement WBS 5.15 Profile API in this Task.

---

# 10. TASK-016-B integration regression

The existing 8.2 schema is intentionally owner-only under RLS. Prove that real Auth sessions from this Task work with that boundary.

At minimum with two Local Auth users A/B:

- User A can operate on A-owned allowed profile/settings/contact rows according to current policies.
- User A cannot read/write B-owned private rows.
- User B cannot read/write A-owned private rows.
- unauthenticated client cannot read private rows.
- service/admin access used only for controlled test setup is not reported as user-path evidence.

Do not weaken RLS to make authentication tests pass.

---

# 11. Local Supabase Auth test configuration

Use the existing `supabase/config.toml` as the Local configuration source.

Allowed changes when needed:

- Local `site_url` / allowed redirect URLs for Task-owned local auth callback paths.
- deterministic Local SMS test OTP entries using fictional numbers.
- Local auth configuration necessary to reproduce password/OTP flows.

Rules:

- no real SMS provider secret.
- no real OAuth provider secret.
- no Production URLs or keys.
- explain every config change in Result.
- do not weaken security globally just to simplify tests.

Do not create a SQL migration for configuration that belongs in Supabase Auth config.

---

# 12. UI / route scope guard

WBS 8.3 is the **core**, not the final WBS 5.3 user interface.

Allowed route-level code is limited to the technical endpoints/boundaries required for the Auth core, such as callback/recovery/session plumbing.

Do not redesign or visually implement:

- login card
- registration page
- OTP forms
- password reset visual page
- Google/Apple buttons
- Personal Center security pages

Do not modify Planner visual behavior.

If a minimal non-visual route is needed to make the callback contract executable, keep it technical and explicitly record that WBS 5.3 remains unstarted.

---

# 13. Explicitly out of scope

Do not implement:

- WBS 5.3 full Login/Register/Session UI
- WBS 5.15 Profile / Account API
- Profile edit persistence
- email/phone change workflows
- connect/disconnect login methods
- account merge engine
- device/session management UI or server inventory
- “sign out all devices”
- security activity log
- re-authentication framework for destructive account settings
- data export
- account deletion
- TOTP MFA
- Passkeys
- hardware security keys
- Preference Schema / API
- Companion Schema / API
- Trip / Itinerary schema or API
- POI
- Booking / Payment / Membership
- Production/Staging Supabase configuration

---

# 14. Required tests and evidence

## 14.1 Pre-install / dependency

```text
npm ci
```

If `@supabase/ssr` must be added, use the normal project package manager and commit the manifest/lockfile change. Do not upgrade unrelated dependencies.

## 14.2 Local runtime

On the isolated disposable Local stack:

```text
db:start
db:status
db:reset
```

Run `db:types` only if schema/type-producing changes require it. If no DB schema changed, do not create meaningless generated-type churn; still verify the existing generated type file remains valid.

Final:

```text
db:status
db:stop
```

## 14.3 Authentication integration

Create dedicated tests that prove, using real Local Supabase Auth where applicable:

1. email/password signup succeeds.
2. email/password login succeeds.
3. wrong password fails.
4. current-session signout invalidates/clears the session path.
5. phone OTP can create a new minimal Auth user and sign in using Local deterministic test OTP.
6. an existing phone Auth user signs in without creating a duplicate Auth user.
7. email OTP for an unregistered email does not create an Auth user.
8. email OTP for a registered user signs in.
9. password recovery mail/callback/update-password core works locally to the maximum supported deterministic extent; final evidence must distinguish fully executed steps from contract-only tests.
10. safe returnTo allows valid in-app paths and rejects malicious external/open redirect inputs.
11. server auth verification/claims helper distinguishes authenticated and unauthenticated states.
12. cookie/session refresh path follows the current SSR contract.
13. two real Auth users retain TASK-016-B cross-user RLS isolation.
14. anonymous user remains denied private profile tables.
15. Google/Apple provider initiation/callback contract has no embedded provider Secret and handles return intent safely; real external provider E2E is explicitly deferred unless valid owner-supplied configuration already exists.

No test may print access/refresh tokens or real keys into committed evidence.

## 14.4 Full regression

Run the repository's actual tests, not only a no-op npm script.

At minimum:

```text
npm run lint
npm run typecheck
npm run build
```

Run the full Node test suite using the repository's current established command(s), plus the dedicated TASK-018 tests.

Run:

```text
git diff --check
```

Run changed-file formatting checks. If full `format:check` fails only on pre-existing develop documents, prove they are byte-identical to the execution base and report them separately; do not call a failing full-format run PASS.

## 14.5 Secret / client-boundary regression

Inspect actual production browser chunks after build.

Prove they do not contain:

- `SUPABASE_SECRET_KEY`
- `DATABASE_URL`
- server-only auth helper implementation
- private provider secrets
- hard-coded access/refresh tokens

The publishable key is allowed by design; do not falsely report its presence as a secret leak.

---

# 15. Build behavior with missing real cloud credentials

The repository must continue to support local/static quality checks without real Production secrets.

`npm run build` must not require a real remote Supabase Secret merely because an auth module is imported.

If auth routes require runtime configuration, fail safely when invoked with missing configuration rather than crashing unrelated static pages during module import/build.

---

# 16. WBS / Result / tracking rules

When actual implementation begins:

- update WBS 8.3 from `未开始` to `进行中` on the feature branch.
- do not modify unrelated WBS ownership/status.

When implementation and local verification finish:

- create `docs/tasks/RESULT-TASK-018-b-authentication-core.md`.
- update WBS 8.3 to `待审查`, **not `已完成`**.
- keep WBS 5.3 unstarted unless a separate authorized Task has begun.
- keep Issue #214 Open until user acceptance/merge closeout.
- create a **Draft PR** to `develop`.
- PR body uses `Relates to #214` rather than an automatic close claim before acceptance.

Only after explicit user acceptance and merge may 8.3 become `已完成` and Issue #214 be closed.

---

# 17. Publication / repository automation safety

The repository currently has a workflow that reacts to pushes under `feature/**`, automatically creates a PR and attempts to merge it.

For this Task:

- do not modify those workflows.
- do not rely on automatic merge.
- use the established `[skip ci]` publication safety convention for feature-branch commits where necessary so the repository automation does not merge unaccepted work.
- manually create/verify the PR is Draft.
- skipped automation is **not** CI evidence.
- do not report a skipped workflow as PASS.

Forbidden:

```text
git reset --hard
git clean -fd
git push --force
git push --force-with-lease
```

---

# 18. Result requirements

The final Result must include at least:

```md
# TASK-018-B Authentication Core Result

## Status
PASS / PARTIAL / BLOCKED

## Prerequisite / Base
- execution base SHA
- TASK-015 / TASK-016 merge ancestor checks

## Workspace
- isolated worktree path
- branch
- runtime versions

## Auth Architecture
- browser client
- server client
- proxy/session refresh
- trusted server auth verification method

## Flow Results
- email/password signup/login/logout
- phone OTP auto-signup
- email OTP no-auto-signup
- password recovery
- OAuth contract
- returnTo

## Session / Cookie Security

## TASK-016 RLS Integration

## Secrets / Client Bundle

## Runtime / Tests
- db start/status/reset/stop
- dedicated tests
- full tests
- lint
- typecheck
- build
- formatting/diff

## Known Limitations / Deferred
- real Google provider E2E if not configured
- real Apple provider E2E if not configured
- real production SMS/email provider
- WBS 5.3 visual flow
- later account security features

## Tracking
- Issue #214
- feature branch
- implementation commit
- Draft PR
- WBS 8.3 = 待审查
```

Do not hide initial failures; record material failures and their fixes when they affected the implementation.

---

# 19. Acceptance checklist

- [ ] latest clean `origin/develop` used for implementation.
- [ ] TASK-015-A / 8.1 foundation is present.
- [ ] TASK-016-B / 8.2 merge is present and not regressed.
- [ ] isolated worktree used; Planner/UI workspace untouched.
- [ ] current Next.js installed docs read before auth/request boundary implementation.
- [ ] compatible stable `@supabase/ssr` integrated without unrelated dependency upgrades.
- [ ] browser/server Supabase clients typed and correctly separated.
- [ ] cookie-based session refresh mechanism follows current Next.js/Supabase guidance.
- [ ] authorization-critical server helper uses trusted verification, not a spoofable session payload alone.
- [ ] email/password signup/signin/signout PASS on Local Supabase.
- [ ] MVP password policy is consistently enforced.
- [ ] phone OTP new-user auto-signup PASS using Local deterministic test OTP and no real SMS.
- [ ] existing-phone login does not duplicate user.
- [ ] email OTP unregistered address does **not** create an Auth user.
- [ ] email OTP registered address can authenticate.
- [ ] password recovery/update core verified locally to a clearly documented extent.
- [ ] Google/Apple OAuth initiation/callback core exists without committed provider credentials.
- [ ] no custom silent account merge behavior added.
- [ ] safe returnTo rejects open redirects.
- [ ] TASK-016 owner-only RLS remains effective using real Auth users/sessions.
- [ ] browser build contains no server Secret or server-only auth implementation.
- [ ] no credential material copied into public business schema.
- [ ] no unrelated UI / Planner changes.
- [ ] no WBS 5.3 visual implementation claimed.
- [ ] dedicated auth tests PASS.
- [ ] full actual test suite PASS, or unrelated baseline failures are precisely separated.
- [ ] lint PASS.
- [ ] typecheck PASS.
- [ ] build PASS without real Production secrets.
- [ ] diff check PASS.
- [ ] Local Supabase cleanly stopped after verification.
- [ ] Result written.
- [ ] WBS 8.3 set to `待审查`, not `已完成`.
- [ ] Draft PR created and verified unmerged.
- [ ] Issue #214 remains Open awaiting user acceptance.

---

# 20. Stop condition

After TASK-018-B is delivered in a Draft PR, stop.

Do **not** automatically start:

- WBS 5.3
- WBS 5.15
- TASK-017-B / Issue #207
- any downstream preference/trip/auth-security task

Wait for explicit user acceptance of WBS 8.3.
