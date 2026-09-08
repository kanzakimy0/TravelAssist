# WBS-5.3-B Result

## Status

待审查 — implementation and automated Local acceptance passed; user visual acceptance and merge are pending. Full-repository format check remains FAIL for 27 unchanged baseline documents, not silently counted as PASS. No subsequent task started.

## Preflight

- Executed, in order in `F:\TravelAssist`: `git status --short --untracked-files=all`, `git branch --show-current`, `git fetch --all --prune`, `git switch develop`, `git pull --ff-only origin develop`, `git rev-parse origin/develop`, `git log --oneline -15 origin/develop`.
- origin/develop base: `18afee5f02ed45505b81636f7b25b568270b2bf9`; main checkout fast-forwarded without discarding user files, then the requested feature branch was created from this base.
- dependency 1.23: 已完成. dependency 8.3: 已完成. PR #218 merge `7f805e0a1b3b6bc650293a33363c6c22cde6a360` is an ancestor (actual merge-base check exit 0).
- duplicate Task/Issue/PR: none equivalent; #219 is the unique formal 5.3 issue; #220 is the merged Task-definition PR, not an implementation. No duplicate implementation branch/PR existed at startup or pre-publication recheck.
- Fully read formal Task, authentication/responsive/shell/personal-center design, cross-module handoff, TASK-018 Result, current Auth contracts/implementation, repository instructions and relevant installed Next 16 guides before implementation.
- Existing user files `README.txt`, `asset-contact-sheet.jpg`, `publish_assets.py` preserved unmodified and uncommitted; final SHA-256 hashes match preflight.

## Tracking

- Issue: #219, Open.
- Task File: `docs/tasks/TASK-WBS-5.3-b-auth-user-flow.md`.
- Result File: this document.
- Branch: `feature/b-account-wbs-5-3-auth-user-flow`.
- Implementation Commit: `7fd9add6713b62c8f2d48d810177eda21024c389`; initial checkpoint `170a6c2f890d80b82213aedd827671f7ca2b4478`.
- Final Head: final documentation-only delivery commit, reported in Issue #219 and the delivery response (a commit cannot contain its own SHA).
- PR: [Draft #222](https://github.com/kanzakimy0/TravelAssist/pull/222), base `develop`, title `feat(WBS-5.3-B): implement authentication user flow`, body `Relates to #219`. GitHub verified Open / isDraft=true / mergedAt=null.
- Merge Commit: none; no merge authorized for this task.
- WBS updated: 5.3 only, 进行中 → 待审查. Existing parent/dependency completion and other Owner records preserved.

## Auth Routes

- `/login`: phone/email top-level tabs only; phone OTP, default email/password, inline email OTP mode.
- `/register`: minimal email/password/confirmation/agreement; pending confirmation then verified-session success.
- `/forgot-password`: existing Recovery request, generic sent state, resend cooldown and return link.
- `/reset-password`: trusted current Auth verification; absent/invalid session gets safe error; actual captured recovery callback establishes the session used for update. No custom reset token or password in URLs.
- Technical `/auth/[operation]`, `/auth/callback`, `/auth/session`: unchanged and consumed through their existing bounded contracts. No second Auth authority.

## Auth Shell

- Desktop: independent warm-ivory, subtly paper-textured shell, 57/43 photo/card grid, rounded corners, restrained sakura ornament and contrast-conscious coral CTA. The user-supplied Kyoto reference guided composition rather than changing frozen behavior.
- 1024–1279: 42/58 grid; tablet 768–1023: 38/62 grid, form remains usable.
- Mobile: 150px travel banner then full-width flowing form; no Personal Center sidebar. Natural vertical scrolling, safe-area padding, at least 16px inputs and 44px controls.
- Approved assets reused: `hero-kyoto-sakura.webp`, `travelassist-logo-torii.png`, `sidebar-shell-ornament-top.png` under `public/media/personal-center/`. No new image dependency/download or asset-library change. Decorative SVG icons are local code, not fake provider success.

## Phone OTP

- Request/verify: real existing Core endpoints; actual Local Supabase deterministic test OTP for the pre-existing reserved fictional `+12025550181` fixture. No hard-coded OTP in production UI.
- Auto-signup: new fictional phone produced one minimal Auth identity; repeat login preserved exactly the same Auth ID.
- Agreement: required before request/verify; explicit notice that unregistered phone verification creates an account. Validation/disabled/pending/cooldown states included.
- Real SMS claim: none. External SMS delivery Deferred; no provider secret added or Local config changed.

## Email Password

- Sign-in: real correct-password login; Enter submission returns to original safe Personal Center account path.
- Errors: wrong password produced normalized inline error, not raw SDK output. No fake session on failure.
- Show/hide password: accessible toggle and appropriate autocomplete; verified in actual browser.

## Email OTP

- Mode switch: same card, no second tab group. Password mode defaults on selecting email; OTP hides forgot-password and offers “使用密码登录”.
- Resend: request/resent action, 30-second presentation cooldown, pending lock and safe service errors; explicitly not a claim about provider expiry/rate limits.
- Existing email login: actual six-digit code captured from frozen Local Mailpit template; real session established.
- Unregistered email: actual Core `email_not_registered`, inline Create Account / other email actions, Auth count unchanged.
- Automatic signup triggered: no; existing Core `shouldCreateUser: false` unchanged.
- Prefill verification claim: email prefilled only; never says that the rejected OTP request verified ownership.

## Registration

- Minimal fields: email, password, confirmation, agreement only. Password policy reuses TASK-018 (at least 8 characters, one letter, one digit; no added special-character rule).
- Email confirmation: actual signup remained unauthenticated on “请检查邮箱”; real Local verify link/PKCE callback then trusted session yielded “账户创建成功 ✓”.
- Success: “开始你的第一次旅行”, “开始规划”, “稍后完善个人资料”; default `/start` or preserved safe intent. No forced Profile onboarding.
- Profile initialization: none; profiles/profile_settings/emergency_contacts remained 0 during UI acceptance.

## Recovery

- Forgot-password → real Local captured mail → real callback → reset form → real password update: PASS.
- Weak update rejected; old password failed after update and new password succeeded with original Planner intent.
- Invalid/no-session reset displayed safe recovery error. Update-success return-to-login signs out the current session explicitly; no custom token/session handling.
- No production email delivery claim; real external email provider delivery Deferred.

## OAuth

- Google and Apple initiation: both buttons called the existing actual Core endpoint and obtained PKCE S256 initiation contracts.
- Provider availability: additive `src/lib/auth/provider-availability.ts` server-only helper reads public Auth settings and passes only booleans. No feature module imports Supabase directly; Core and its tests remain unchanged.
- No external provider configured: safe unavailable inline state, not fake redirect success. Existing TASK-018 callback error/hostile input checks passed again.
- External Google E2E: Deferred. External Apple E2E: Deferred.
- Secrets added: none. Silent account merging or OAuth identity copying: none.

## Session / returnTo

- Five Personal Center routes protected anonymously, accessible when signed in, and protected again after real current-session logout. The account layout and navigation template share request-cached trusted `currentAuthUser` verification, not client state or cookie payload claims.
- Proxy forwards an overwritten internal pathname/query for intent only; trusted server verification remains authoritative. Dynamic/no-store behavior avoids pre-auth shared rendering and cached identities.
- Home return `/` and original `/planner?intent=save` navigation passed. Public `/`, `/start`, `/planner` remain public; no Planner save semantics implemented.
- Canonical TASK-018 `safeReturnTo` reused, with additional post-validation Auth-loop prevention only. Hostile absolute/network-path/backslash/control/multi-encoded cases covered by pure and existing HTTP tests; real external intent fell back to `/`.
- Refresh regression: real expired-cookie rotation/no-store/next-request persistence passed existing TASK-018 runtime; forged cookie identity and invalid JWT failed closed.
- Current-session signout: real endpoint/cookie clearing, failed responses retain signed-in UI and show safe error. No all-device claim; existing Core test confirmed another session remains valid.
- Existing unsaved-form navigation dialog, cancel, Avatar Escape/focus return and cancel-dirty-signout were actually exercised. No navigation-guard rewrite.

## Profile Boundary

- Profile API 5.15 and DB persistence: not implemented.
- Existing Personal Center visuals/business fixtures preserved. Shell identity explicitly says “旅行者” and “头像与资料为演示”, avoiding a claim that fixture Profile data came from DB.
- No Preference/Companion/Trip creation, storage, API or business changes. No Auth credentials saved to business tables.

## Legal Boundary

- Agreement checkbox and labels 《服务条款》/《隐私政策》 present where required.
- Published legal route unavailable: labels are not broken links; UI explicitly notes pending publication.
- Legal document routing: Deferred to WBS 10.6. No fake legal document or invented consent-persistence system.

## Responsive

| Viewport  | Chromium | Microsoft Edge |
| --------- | -------- | -------------- |
| 1920×1080 | PASS     | PASS           |
| 1440×900  | PASS     | PASS           |
| 1280×720  | PASS     | PASS           |
| 1024×768  | PASS     | PASS           |
| 768×1024  | PASS     | PASS           |
| 390×844   | PASS     | PASS           |
| 320×740   | PASS     | PASS           |

- Versions: Chromium `151.0.7922.34`, Microsoft Edge `152.0.4191.66`, actual installed Windows runtimes, headless. Existing Playwright used outside package.json; no browser dependency installed.
- Each browser: 42 route/mode geometry checks across seven sizes + seven 320px pending/error/success/valid-reset states + one 390×440 keyboard-sized viewport = 50 passing checks.
- No document horizontal overflow, duplicate IDs, visible form controls below 44×44 or inputs below 16px. Tab/Shift+Tab, arrow-selected tabs, visible focus and menu Escape/focus return verified.
- React page errors/hydration/blocking warnings: 0. Missing image/CSS/JS 404 assets: 0. Expected invalid-credential/unregistered/provider-unavailable responses are test cases, not silently treated as unexpected failures.
- Safe-area and reduced-motion CSS retained; resized-viewport CTA reachability actually checked. A physical mobile keyboard, Safari real device and external provider E2E were NOT tested; no PASS claim for them.
- Redacted screenshots include all routes and relevant states; all input values are masked. No HAR, traces, videos, storageState, plaintext passwords, OTP emails, tokens or cookies included in evidence.

## Validation

| Actual command / gate                                            | Result                                                                                                                                                                 |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                         | PASS in isolated WSL runtime: 396 installed, 397 audited, 0 vulnerabilities; Windows main dependencies also restored successfully after the initial locked-DLL failure |
| `npm run db:start`                                               | PASS, reused installed pinned CLI/Docker and frozen Local config                                                                                                       |
| `npm run db:status`                                              | PASS, only loopback API 54321 / Studio 54323 / Mailpit 54324                                                                                                           |
| `npm run lint`                                                   | PASS                                                                                                                                                                   |
| `npm run typecheck`                                              | PASS                                                                                                                                                                   |
| `npm run format:check`                                           | FAIL exit 1: 27 pre-existing documents, each exact Git blob match to `18afee5`; no other Owner document changed                                                        |
| Targeted Prettier                                                | Current Task/code/tests formatted; final delivery check recorded below                                                                                                 |
| `npm run test --if-present`                                      | NO-OP, exit 0; package.json has no generic test script. Not counted as tests PASS                                                                                      |
| `node --test tests/*.test.mjs`                                   | 631/631 PASS, 0 failures/skips, including 10 current-task unit tests                                                                                                   |
| `node tests/wbs-5-3-auth-user-flow.runtime.mjs`                  | PASS, actual Chromium UI + Local DB assertions                                                                                                                         |
| `WBS_BROWSER=edge node tests/wbs-5-3-auth-user-flow.runtime.mjs` | PASS, actual Microsoft Edge UI + Local DB assertions                                                                                                                   |
| TASK-018 existing Local runtime (exact command below)            | 16/16 PASS, unchanged regression tests                                                                                                                                 |
| TASK-016 existing Local runtime (exact command below)            | 25/25 PASS, unchanged regression tests                                                                                                                                 |
| `node tests/task-018-client-bundle.mjs`                          | PASS: 33 actual production chunks, 64 browser Auth dependency modules, no private secrets/server-only helpers in client                                                |
| `npm run build`                                                  | PASS, including final production build with dynamic Auth/Personal Center routes                                                                                        |
| `git diff --check`                                               | PASS; staged and final delivery checks repeated                                                                                                                        |

Exact existing runtime commands were read from TASK-018 Result, not guessed:

```sh
node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-018-authentication.runtime.mjs
node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-016-user-profile.runtime.mjs
node tests/task-018-client-bundle.mjs
```

Runtime environment and evidence:

- F-backed WSL2 `TravelAssist-Ubuntu`, Ubuntu 24.04.4, Node 24.18.0/npm 11.16.0. Actual validation worktree `/home/oydl/TravelAssist-wbs53-b` on the requested branch/base; Windows view `\\wsl.localhost\TravelAssist-Ubuntu\home\oydl\TravelAssist-wbs53-b`. WSL/Docker data remain on F, not a newly installed C-drive image.
- Docker client/server 29.7.2, local Unix socket only. No installation, GUI/admin step, schema migration or `db:reset` was needed for this task.
- UI runner checks project label, loopback endpoints and zero Auth/business rows before proceeding. It starts/stops only its production Next process, rejects valuable/nonempty DBs, then deletes only exact test-owned identities. Final users/profiles/settings/contacts counts were `0 / 0 / 0 / 0` after each UI run and core regression.
- Evidence: `F:\TravelAssist-wbs53-evidence\` (outside Git): `npm-ci.log`, `db-start.log`, `db-status.log`, `lint.log`, `typecheck.log`, `format.log`, `all-tests.log`, `test-if-present.log`, `build-final.log`, `task-018-runtime.log`, `task-016-runtime.log`, `client-audit-final.log`, `browser-chromium-final.log`, `browser-edge.log`, and `browser/{chromium,edge}/summary.json` plus masked PNGs.
- Reproduction uses the pre-existing Windows Node and Playwright paths via `WBS_WINDOWS_NODE` / `CODEX_PLAYWRIGHT_PATH`; runtime runner documents those required environment variables and fixed Local-only origin. No package/lockfile edits.

## Ownership Safety

- A Header redesigned: no. Planner modified: no. Start business modified: no.
- TASK-018 rewritten: no. Existing Core/technical routes/Local config/tests/Result unchanged; only additive server provider-availability helper and minimal Proxy pathname forwarding/PC no-store integration.
- DB schema/migration/Drizzle/generated types modified: no. Profile API 5.15 implemented: no.
- Preference/Companion/Trip business modified: no. Workflow/package/package-lock modified: no.
- Other Owner Task/Result files changed: none. Master WBS changes limited to own 5.3 row and own tracking entry.
- No `git add .`, clean/reset/force-push, real Secret file, fake auth storage, custom token or production DB access.

## Git

- Implementation commit: `7fd9add6713b62c8f2d48d810177eda21024c389`; delivery documentation follows separately.
- Push/PR: `git push -u origin feature/b-account-wbs-5-3-auth-user-flow` succeeded; Draft #222 created and verified. Publication snapshot `1ed6990dd77a4a5bb21c53398f61a71d654e637c`; following changes are only this Task's tracking documentation.
- Merge behavior: no merge. Feature push commits use the repository's established `[skip ci]` safety marker to avoid its automatic feature merge; no workflow edits. Draft retained for user review.
- latest origin/develop at pre-publication fetch: `18afee5f02ed45505b81636f7b25b568270b2bf9`.
- Unpushed commits/tracked working tree: final local/remote SHA equality and clean tracked tree required and reported with the final SHA in Issue #219 and delivery response. The three original untracked files are intentionally retained.
- Preserved untracked files: README.txt / asset-contact-sheet.jpg / publish_assets.py; all original SHA-256 values unchanged, not staged.

## Problems

- Final `db:status` and normal `db:stop`: PASS after zero-count verification. Task-owned Next servers stopped; no reset, database-volume deletion or new permanent service. The temporary test login URL is not advertised as a still-running preview.
- Final targeted Prettier: PASS for all changed supported files; Master WBS retains the repository's existing formatting exclusion. Staged and unstaged diff checks: PASS.

- Initial Windows `npm ci` failed with EPERM on a Sharp DLL held by the identified F:\TravelAssist Next preview process (port 3001). That exact preview was stopped after reporting the interruption; Windows `npm ci` then succeeded. Validation continued in the isolated F-backed WSL worktree. The earlier commands missing dependencies were not counted as PASS.
- Initial full Node run: 620/621, direct feature-to-Supabase settings lookup violated the existing DB boundary test. Fixed by extracting the tiny server-only availability helper into shared lib/auth; no historical test was weakened. Final full suite: 631/631.
- Real browser failures found duplicate tab/input IDs and a register footer link narrower than 44px; both fixed and protected by actual geometry/keyboard assertions.
- Subsequent test harness failures: incorrect Local email subject matcher, separate APIRequestContext session-request failure, and public route navigation waiting for all external resources. Corrected to frozen mail subject, real same-origin browser session fetch, and public DOM/main readiness. Auth assertions were retained; initial/final redacted logs preserved rather than misreported as initial PASS.
- Full format remains 27 unchanged baseline documents. Current Task and new test formatting issues were fixed only within this task; no out-of-scope format rewrite.
- Existing non-blocking Node MODULE_TYPELESS_PACKAGE_JSON and pinned dependency deprecation/install-script warnings remain; no package-policy changes made to suppress them.
- External Google/Apple OAuth, production email/SMS, legal routing and physical mobile keyboard validation remain Deferred. User visual acceptance is pending; automated QA is not substituted for it.

## Next

Wait for user acceptance of this task. Do not automatically merge or start WBS 3.4 / 5.15 / 5.21 or any other Task.
