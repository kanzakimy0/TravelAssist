# TASK-018-B Authentication Core Result

## Status

**PASS / 待用户验收。WBS 8.3 = 待审查，不是已完成。**

- Date: 2026-09-08; Owner B; Issue #214 remains Open.
- All implemented Auth core/Local acceptance gates passed. Full formatting remains a separately reported, proven develop baseline failure.
- No WBS 5.3 UI, WBS 5.15 API, TASK-017-B, or downstream task was started.
- Publication metadata will be filled after the manually created Draft PR is verified.

## Prerequisite / Base

- Execution base: `39890af8c2ed137712b90f3f9d2bfdef313cfef6`; fetched again before publication and still current.
- TASK-015 PR #186 merge `24dff4e3b74dfe01c369d2c149d37eba86ad6472`: ancestor check exit 0.
- TASK-016 PR #209 merge `d118d4d0ad5b3b031e1bca6121f36b555c046216`: ancestor check exit 0.
- Existing profiles/profile_settings/emergency_contacts, SQL migration, Drizzle mirror and generated types retained.
- No pre-existing implementation branch or PR for `feature/b-authentication-core` was found at start or the pre-publication recheck.
- Formal [Task](https://github.com/kanzakimy0/TravelAssist/blob/task/b-authentication-core/docs/tasks/TASK-018-b-authentication-core.md) and [Codex Command](https://github.com/kanzakimy0/TravelAssist/blob/task/b-authentication-core/docs/tasks/CODEX-TASK-018-b-authentication-core-command.md) were read fully, together with Issue #214 and all ten required repository documents.
- Installed Next 16.3.4 guides for Proxy, async cookies, Route Handlers, redirects and Server/Client boundaries were read before Auth code.

Actual opening commands in `F:\TravelAssist`:

```text
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
git show origin/task/b-authentication-core:docs/tasks/CODEX-TASK-018-b-authentication-core-command.md
git show origin/task/b-authentication-core:docs/tasks/TASK-018-b-authentication-core.md
```

## Workspace

- Original Planner/UI worktree: `F:\TravelAssist`, stays on `develop@39890af`.
- Execution worktree: `/home/oydl/TravelAssist-task018-b`, created using real `git worktree add -b feature/b-authentication-core ... refs/remotes/origin/develop`.
- Linux Git common directory: `/home/oydl/.local/share/travelassist-db-acceptance/repository-bundle.git`; fresh develop history transferred by verified Git bundle, not cherry-picking/stacking an old feature.
- Publication worktree: `F:\TravelAssist-task018-b` (same verified feature commits; Windows GitHub credentials only used for publication).
- Runtime storage is F-backed: WSL `F:\WSL\TravelAssistUbuntu\ext4.vhdx`, Docker `F:\DockerDesktopWSL\disk\docker_data.vhdx`.
- WSL distro `TravelAssist-Ubuntu`, Ubuntu 24.04.4; Docker client/server 29.7.2; Node 24.18.0; npm 11.16.0; Supabase CLI 2.116.0.
- Existing runtime/cache reused. No new browser, WSL, Docker installation or C-drive database placement.
- Original untracked `README.txt`, `asset-contact-sheet.jpg`, `publish_assets.py` remain untouched/uncommitted.
- Evidence logs remain outside Git at `F:\TravelAssist-task018-evidence\`. No credential-bearing CLI JSON or real secrets were written there.

## Auth Architecture

- `src/lib/supabase/browser.ts`: lazy typed Browser client, SDK-managed cookie storage, public URL/publishable key only.
- `src/lib/supabase/server.ts`: typed, server-only factory; new client per request, no server-global auth instance.
- `src/lib/supabase/request.ts`: getAll/setAll adapter updates both request cookies and outgoing cookies, retaining SSR 0.12.7's second-argument cache headers.
- `src/proxy.ts`: Next 16 Proxy (no competing middleware); uses `getClaims()` for optimistic refresh only. It does not authorize or globally protect pages. Auth technical routes manage their own cookie response.
- `src/lib/auth/server-user.ts`: `getCurrentAuthUser / requireAuthUser` use actual `getUser()` verification; a client cookie's user object or `getSession()` is never authorization proof.
- `src/lib/auth/current-user.ts`: async-cookie Server Component read primitive; Proxy owns refresh persistence, request adapter owns mutations.
- `src/lib/auth/contracts.ts`: provider/React-independent AuthResult, CurrentAuthUser, UserSessionPublicView, error codes and Google/Apple provider types. Public results expose an Auth user ID, not SDK sessions/tokens/identities.
- `src/lib/auth/core.ts`: reusable non-visual operations. SDK/transport failures become bounded error codes without raw credential-bearing exceptions.
- Only new dependency: exact `@supabase/ssr@0.12.7` (peer SDK ^2.114.0, existing SDK 2.115.0 compatible), plus its `cookie@1.1.1` dependency. Every pre-existing locked package entry is unchanged.
- Normal end-user paths need no service Secret or direct DB connection.
- Env validation is lazy; no app Auth client or network request is created at import/build time.

References checked: [Supabase Next SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs), [advanced SSR/PKCE](https://supabase.com/docs/guides/auth/server-side/advanced-guide). The installed SSR types were also inspected for actual setAll/cache-header behavior.

### Technical HTTP contract (not visual UI)

- POST `/auth/[operation]`: signup, signin, phone-otp, verify-phone-otp, email-otp, verify-email-otp, signout, recovery, password, oauth.
- GET `/auth/callback`: PKCE code exchange and safe return navigation.
- GET `/auth/session`: verified authenticated/unauthenticated public view.
- JSON POSTs require exact canonical Origin, JSON content type and an 8 KiB body bound. No credential-bearing GET mutation.
- New empty `AUTH_SITE_URL` placeholder specifies the canonical app origin; callback origins never come from Host/Forwarded headers. Local runner supplies loopback values in memory.
- Success responses contain state/userId/validated returnTo (and the public authorize URL for OAuth). Failures distinguish invalid credentials, unauthenticated, configuration failure, service failure, throttling and required signup.

## Email Password

**PASS — real Local Auth and production Next HTTP.**

- Explicit minimal signup; email confirmation via actual Local captured mail and PKCE callback; no automatic profile/settings/contact initialization.
- Both A and B accounts registered and confirmed; correct password succeeds, wrong password returns normalized invalid_credentials.
- Shared pure policy: at least 8 characters, one ASCII letter and one digit, no strength score/special-character requirement. Signup and update use the same rule.
- Local Auth enforces minimum_password_length=8 and letters_digits. Email confirmation was strengthened from disabled to enabled; no upstream stronger rule was weakened.
- Confirm/obfuscated duplicate signup results do not expose an Auth user ID before a valid signed-in session.

## Phone OTP

**PASS — actual deterministic Local OTP, not a mocked Auth server.**

- Reserved fictional `+12025550180` registered and authenticated with Local test OTP; repeat sign-in preserved the same Auth user and count.
- Phone signup is explicitly allowed; no business profile row was created.
- `supabase/config.toml` includes only reserved fictional 555-01xx numbers and obvious Local OTP fixtures.
- Material initial failure: CLI 2.116.0 silently disabled phone login when no SMS provider was enabled; actual error code was phone_provider_disabled.
- The [pinned official CLI validation](https://github.com/supabase/cli/blob/v2.116.0/apps/cli-go/pkg/config/config.go) confirms that behavior. The Local Twilio stanza now uses deliberately invalid TASK018_LOCAL_ONLY placeholders solely to satisfy CLI validation; configured numbers use test_otp instead of delivery. There is no real account, SMS secret, or deliverable provider credential.
- Real SMS delivery is Deferred. Do not copy these Local settings into any hosted environment.

## Email OTP

**PASS.**

- Request explicitly sets `shouldCreateUser: false`.
- Real unregistered-email request returned normalized email_not_registered and Auth user count did not increase.
- Existing email signed in using the actual six-digit code from Mailpit; invalid code was denied.
- The Local-only magic_link template exposes the OTP to captured test mail. No real external email was sent.
- UI may offer Create Account on email_not_registered; it must not claim the rejected request already verified email ownership.

## Password Recovery

**PASS — all core stages actually executed.**

- Request reset email → actual Local captured link → Supabase verify redirect → real PKCE callback with originating verifier cookie → verified recovery session → weak-password denial → valid update → new-password login.
- Old password failed after update.
- Initial request hit over_email_send_rate_limit (429) because it immediately followed email OTP. Tests now respect the existing one-second mail interval; no rate limit was relaxed.
- [Official password/recovery guide](https://supabase.com/docs/guides/auth/passwords) was checked. The final visual reset page remains WBS 5.3 work.

## OAuth Contract

**PASS for required core contract; external provider E2E Deferred.**

- Actual SDK initiation for Google and Apple generated the configured Auth-origin authorize URL, correct provider, fixed callback URL, S256 PKCE challenge and verifier cookie.
- Valid return intent persisted; invalid/missing code and provider cancellation were rejected without reflecting provider error details.
- Shared code-exchange/cookie path was exercised end-to-end by real email confirmation and recovery. This is not claimed as a real Google/Apple account login.
- Google/Apple provider projects and credentials were not configured or invented.
- Supabase's documented automatic linking can associate trusted verified same-email identities; manual linking stays disabled. See [identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking).
- No app-level account merge/link/unlink engine, profile overwrite or duplicate identity authority was added. Provider configuration/linking implications require review before external rollout.

## returnTo

**PASS.**

- Pure shared validator accepts relative app paths/query intent, e.g. `/planner?intent=save`.
- Rejects absolute URLs, protocol-relative paths, backslashes, control characters, malformed percent encoding, layered encodings and normalized network-path tricks; fallback `/`.
- Signup/OAuth/recovery persist a short-lived HttpOnly intent cookie; callback validates it again. Callback redirects use a relative Location, not untrusted request host metadata.
- Real confirmation returned to Planner save intent, recovery to Personal Center; adversarial redirect cases passed dedicated unit/HTTP tests.
- No Planner save behavior or UI was implemented.

## Session / Cookie Security

**PASS.**

- SSR cookie state uses path=/, SameSite=Lax, Secure on HTTPS. Browser-readable session cookies follow Supabase's shared Browser/Server refresh design; they are not falsely described as HttpOnly. The separate return-intent cookie is HttpOnly.
- Refresh and technical Auth responses are private/no-cache/no-store; SSR-provided cache headers are copied, preventing cross-user cached Set-Cookie responses.
- Real expired-cookie refresh rotated the refresh token, emitted cookies and preserved the next verified request.
- Tampering with cookie user.id to impersonate B still yielded verified A; invalid JWT failed closed.
- Current-session signout cleared session cookies and revoked refresh. A separate valid session for the same account remained authenticated.
- Existing access JWTs can remain valid until expiry according to Supabase's session model; this task does not claim all-device or immediate global JWT revocation.
- Missing credentials return a safe configuration_error for invoked Auth routes; ordinary pages still render.
- Cross-origin/missing-Origin POSTs, malformed bodies and oversized bodies were rejected.

## TASK-016 RLS Integration

**PASS. No SQL migration, RLS policy, Drizzle table or generated-type change.**

- Existing TASK-016 Local catalog/constraints/Drizzle/RLS/rollback suite: 25/25.
- New Auth acceptance created A/B through real signup and confirmation.
- Each user's cookie-backed publishable-key client accessed the actual Data API using that user's JWT, not service/admin privileges.
- Both users: own profile/settings/contact INSERT/SELECT/UPDATE allowed; cross-owner SELECT and UPDATE returned no private rows; cross-owner INSERT and ownership reassignment denied.
- Contact own DELETE allowed/cross DELETE denied. Profile/settings DELETE remained denied even to the owner, preserving current policy.
- Anonymous SELECT/INSERT/UPDATE/DELETE denied on all three tables.
- Admin credentials were confined to controlled cleanup; direct SQL only inspected counts/setup evidence, not substituted for user-path proof.
- Final users/profiles/settings/contacts counts: `0 / 0 / 0 / 0`.
- Generated file remains byte-identical to base, SHA-256 `6db418ccc7c731c3324a6e69154d5af2ada678d50a933b9862caebeb2e806098`. No db:types rerun because no schema/type-producing change occurred; actual types remain validated by live schema parity, typecheck and build.

## Secrets / Client Bundle

**PASS.**

- Post-build scan: 31 actual production browser JS chunks; no private key names/values, DATABASE_URL, hard-coded JWTs/private keys or application server-only auth helpers.
- Additional production-minified compile of the unused browser Auth entry: 64 dependency modules; no application server-only/DB modules. This prevents unused browser helpers from escaping the audit simply because WBS 5.3 UI is not wired yet.
- Publishable configuration is explicitly allowed and tested.
- Initial extra unminified probe flagged an SDK-owned JSDoc example mentioning SUPABASE_SECRET_KEY, not an executable env access or real secret. Production-minified probe removes documentation comments, retains strict executable/chunk checks and passes; actual production chunks passed throughout.
- No .env/.env.local/.env.production/signing-key file was created. Local CLI secret/status material stayed in memory and was not printed or committed.
- No public business table received credentials, sessions, tokens, OAuth identity copies or duplicate verified-email/phone truth.

## Runtime / Tests

Final actual results:

| Command / gate                                | Result                                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| npm ci (initial and final lockfile)           | PASS; final 396 packages installed, audit 0 vulnerabilities                                          |
| npm install --save-exact @supabase/ssr@0.12.7 | PASS; no existing package version changes                                                            |
| npm run db:start                              | PASS                                                                                                 |
| npm run db:status                             | PASS; loopback endpoints only                                                                        |
| npm run db:reset                              | PASS; performed only after container label=travelassist and zero Auth/profile rows proved disposable |
| Local config restart: db:stop then db:start   | PASS                                                                                                 |
| TASK-016 explicit Local runtime               | 25/25 PASS                                                                                           |
| TASK-018 unit suite                           | 9/9 PASS, included in full suite                                                                     |
| TASK-018 explicit Local/HTTP runtime          | Final 16/16 PASS                                                                                     |
| npm test --if-present                         | NO-OP; no generic script, not counted as PASS tests                                                  |
| node --test tests/*.test.mjs                  | 574/574 PASS, no failures/skips                                                                      |
| npm run lint                                  | PASS                                                                                                 |
| npm run typecheck                             | PASS                                                                                                 |
| npm run build                                 | PASS without cloud credentials                                                                       |
| node tests/task-018-client-bundle.mjs         | PASS: 31 production chunks, 64 browser Auth modules                                                  |
| npm run format:check                          | FAIL, exit 1: 27 existing documents; all byte-identical to execution base                            |
| Changed-file Prettier                         | PASS; all changed supported files (Master WBS keeps its existing formatting exclusion)               |
| git diff --check                              | PASS, staged and unstaged checks                                                                     |
| Final db:status then db:stop                  | PASS; no task Supabase containers left running                                                       |

Explicit runtime commands:

```sh
node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-016-user-profile.runtime.mjs
node --test tests/task-018-authentication.test.mjs
node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-018-authentication.runtime.mjs
node --test tests/*.test.mjs
node tests/task-018-client-bundle.mjs
```

The reproducible TASK-018 runtime runner starts only task-owned production Next processes on loopback ports 3000/3001, supplies Local values in memory, verifies zero-data preconditions, and removes only identities created by that run. It never resets a database itself or accepts an arbitrary remote target.

Material failures are retained in evidence: initial Auth run 13 pass / 3 fail (two failed children plus parent: phone configuration and recovery pacing); second and final runs 16/16. An in-flight test-helper formatting issue was corrected; final full formatting contains only the 27 baseline documents.

One historical assertion in `tests/task-015-db-foundation.test.mjs` required that SSR never be added. It now checks TASK-015's actual merged package.json snapshot for the original no-SSR boundary. All dependency locking, SQL source, server-only, Local-command and secret-protection assertions remain. No other Owner's Task/Result document was changed.

### Full-format baseline (all exact byte matches to 39890af)

```text
docs/ai/trip-judgement-two-phase.md
docs/architecture/cross-module-contract-handoff.md
docs/architecture/db-foundation-bootstrap-plan.md
docs/architecture/db-orm-migration-standards.md
docs/architecture/trip-plan-data-ai-takeover.md
docs/assets/asset-library-strategy.md
docs/assets/asset-variant-sizing-spec.md
docs/assets/personal-center-generated-images-20260905.md
docs/project/WBS-5.1-LOCAL-ASSET-COPY-MAP.md
docs/project/WBS-5.1-VISUAL-ASSET-MANIFEST-PHOTOREAL-V3.md
docs/README.md
docs/tasks/TASK-009-a-db-foundation.md
docs/tasks/TASK-014-b-wbs-1-10-attraction-activity-display-rules.md
docs/tasks/TASK-WBS-0.9-b-contract-handoff-rules.md
docs/tasks/TASK-WBS-5.1-b-visual-assets-integration.md
docs/tasks/TASK-WBS-5.4-5.5-acceptance-closeout.md
docs/tasks/TASK-WBS-5.4-b-personal-center-generated-assets-integration.md
docs/tasks/TASK-WBS-5.4-b-profile-account-ui.md
docs/tasks/TASK-WBS-5.5-b-preference-center-ui-amendment-local-assets.md
docs/ui/attraction-activity-tag-display-rules.md
docs/ui/companion-management.md
docs/ui/navigation-flow.md
docs/ui/personal-center-design-freeze-v1.md
docs/ui/personal-center-responsive-states.md
docs/ui/planner-map-interaction-booking-mapbox.md
docs/ui/planner-right-panel-secondary-tabs.md
docs/ui/trip-detail.md
```

## Known Limitations / Deferred

- Real Google and Apple provider E2E: Deferred, no owner-provided projects/credentials.
- Real production SMS/email delivery: Deferred; Local deterministic OTP/Mailpit only.
- Final login/signup/OTP/reset/security UI: WBS 5.3 remains unstarted; no browser visual acceptance claimed.
- Profile/Account API, security-settings reauthentication, email/phone change, account linking/deletion, all-device logout, MFA, Passkeys and other domain schemas are out of scope.
- Existing package deprecation/allow-scripts warnings and Node MODULE_TYPELESS_PACKAGE_JSON warnings retained without unrelated package/runtime policy changes. All actual required build/test commands succeeded.
- Full-format baseline failure is non-blocking per Task, not relabeled as PASS.
- No Planner/Personal Center visuals, UI runtime source, SQL schemas, migrations, generated types or workflows changed.
- CI skip required for safe Draft publication is not CI test evidence.

## Tracking

- Issue: [#214](https://github.com/kanzakimy0/TravelAssist/issues/214), Open.
- Task: TASK-018-B / WBS 8.3.
- Result: `docs/tasks/RESULT-TASK-018-b-authentication-core.md`.
- Branch: `feature/b-authentication-core`, base `develop`.
- WBS 8.3: 待审查; WBS 8.1/8.2/8.4 completed states retained; WBS 5.3/5.15 unstarted.
- Implementation commit: pending commit metadata.
- Draft PR: pending manual publication.
- Every publication commit uses [skip ci]; workflows unchanged; PR body uses Relates to #214.
- No merge, Issue closure or next task is authorized by this delivery.
