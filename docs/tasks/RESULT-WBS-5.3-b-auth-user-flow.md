# WBS-5.3-B Result

## Status

已完成 — the user accepted the onsite registration follow-up (“通过”), then explicitly authorized merging PR #222, updating WBS and pulling develop (“是”). PR #222 is merged and Issue #219 is Closed / completed. Earlier follow-up and runtime sections below are historical execution snapshots, not current pending-acceptance or live-service claims. External-provider/production-delivery and legal/physical-device Deferred items remain as documented; no subsequent task started.

## Final user acceptance and merge closeout (2026-09-09)

- User acceptance: PASS, including the final registration confirmation follow-up; password reset had already been accepted. This records the user's actual instruction, not an independent GitHub APPROVED review.
- Accepted Auth head: `694e7e30936024d05e825dee14aacc17590cf52b`. Latest pre-merge develop: `74bc3cccf8bcfd603706e2b96d4072076191f308`. Integration head: `b571a55ac9303c0c14b92fc3d7e0a6742d2e68bb`. Only Master WBS conflicted; both complete progress sections were retained. Auth/Personal Center code is identical to the accepted head; Planner/navigation code and A's Task/Result are identical to latest develop.
- PR #222 was marked ready and merged with an exact expected-head guard. Merge commit: `b1066abaaaed8e8b8aaa6dbacf39c041c9e776ac`. Actual ancestry check confirms the accepted implementation is in develop; `git diff --exit-code` confirms the merge tree exactly equals the integration-tested head.
- Integration rerun: `npm run lint`, `npm run typecheck`, `node --test tests/*.test.mjs` (**651/651**), `npm run build`, `node tests/task-018-client-bundle.mjs` (**34 chunks / 64 dependency modules**, no private secrets/server helpers) and diff checks PASS. Full `npm run format:check` remains FAIL for **27 documents**, each unchanged from `74bc3cc`; no other Owner formatting repair. Logs: `F:\TravelAssist-wbs53-evidence\merge222-{lint,typecheck,tests,build,client-audit,format-full}.log`.
- Current environment limitation: `docker ps` in the WSL distro reports Docker unavailable / WSL integration not active. No GUI change, DB reset, user deletion, service installation or new real Auth browser run was performed in this merge-only turn. The prior real Chromium/Edge **50/50 each** evidence and user acceptance remain valid for the unchanged Auth implementation; no live preview availability is claimed here.
- First merge attempt stopped before modifying files because the isolated worktree had no committer identity; the existing task identity was supplied only to the subsequent command, without global config changes. The WBS conflict was resolved explicitly, not with whole-file ours/theirs replacement. No forced Git operation.
- WBS 5.3 and this Task/Result: 已完成 only after actual merge. Issue #219: Closed / completed. Closeout edits only these three documentation files; source/dependencies/workflows and other Owner records are untouched. Original `README.txt`, `asset-contact-sheet.jpg`, `publish_assets.py` remain unmodified and uncommitted. Final documentation SHA and local/remote develop equality are reported in the delivery and Issue because a commit cannot contain its own SHA.

## Onsite acceptance follow-up — registration confirmation flow isolation (2026-09-09)

- User report: password reset works, but registration mail displays an incomplete-verification error although the account is confirmed. Work remains within the previously authorized minimal callback repair. No accepted Login/Recovery layout, schema, provider configuration, dependency or workflow change; TASK-018's historical Task/Result is untouched.
- Reproduced on previous delivery `941d9ae376ee505f12ee025113c633e09777aa17`: register, initialize recovery in the same context before confirming, then open the registration email in a new tab. Registration failed its callback because the later operation replaced the default PKCE verifier; the shared return-intent cookie also belonged to recovery. Sanitized Auth diagnosis included `bad_code_verifier`. This proves a real overlapping-flow defect, not that every condition of the user's original click has been reconstructed. The deliberately failing pre-fix run is retained as `signup-flow-before.log`.
- Fix: registration alone opts into the installed SDK's native per-flow redirect binding (`sb_flow_id`), and callback exchange selects that exact SDK-owned verifier slot. Supplied malformed IDs are rejected before SDK exchange; missing slots fail closed with no fallback to another flow. The registration email carries its own validated same-origin routing hint instead of overwriting/consuming the recovery/OAuth intent cookie. Existing recovery/OAuth initialization and callbacks without a flow ID keep the legacy call. No token-hash fallback, manual session, implicit flow, custom authentication store or relaxed Origin check.
- Installed versions remain `@supabase/auth-js` / `@supabase/supabase-js` **2.115.0**, `@supabase/ssr` **0.12.7**. The SDK flag `experimental.appendPkceFlowIdToRedirects` is explicitly experimental and scoped to signup. The installed implementation bounds concurrent verifier slots to **5**; it is not unlimited parallel-flow support. No package/lock change. Future SDK upgrades must rerun these regressions. [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow) still requires matching original-browser verifier state; this does not enable cross-browser authentication without it.
- On a failed signup automatic login, the page now says “自动登录未完成” and explains that email confirmation and login are separate steps. Its primary action opens email/password login. It does not claim registration success from query parameters or from an account-existence guess. The verified success page and original-tab continuation still require the real server-verified session. New registrations generate the new binding; old, consumed or expired emails do not become valid retroactively.
- Actual final Chromium **151.0.7922.34** and Microsoft Edge **152.0.4191.66**: **50/50 checks each PASS**. The formerly failing signup → recovery initialization → signup mail sequence now reaches “账户创建成功 ✓”, establishes a real session, and lets the original registration tab continue. Both pending legacy verifier and recovery intent remain unchanged after signup; values are compared only in memory. Fresh recovery mail subsequently establishes a real reset session, updates the password, rejects the old password and accepts the new one. Also covered: isolated-context rejection, expired/reused links, retry via new reset mail, unauthorized password-update denial, no-session/network feedback, safe return destinations, privacy headers, unchanged API JSON errors, and direct email/password navigation.
- Additional failed experiment retained, not reported as PASS: the first post-fix test incorrectly expected a reset email issued before email confirmation to remain valid afterward (`signup-flow-chromium.log`). Diagnostics proved the verifier/intent were retained, while the backend returned `otp_expired` (`signup-flow-chromium-diagnostic.log`). The final test asserts this exact expired boundary, then requires a genuinely new reset email and actual successful password update. This behavior matches Supabase Auth's confirmation cleanup of pending one-time tokens in [the upstream User model](https://github.com/supabase/auth/blob/master/internal/models/user.go); no backend bypass was added.
- Both signup and recovery error pages pass actual 1920×1080, 1440×900, 1280×720, 1024×768, 768×1024, 390×844 and 320×740 geometry checks: no horizontal overflow, no desktop document scrollbar, actions inside the card and at least 44px high. Registration error screenshot visually inspected. Accepted Login/Recovery layout and assets are unchanged.
- Commands: `node --test tests/*.test.mjs` **641/641 PASS** (including new per-flow/fail-closed tests and unchanged TASK-018 unit security tests); `npm run lint`, `npm run typecheck`, `npm run build`, `node tests/task-018-client-bundle.mjs`, changed-file Prettier and `git diff --check`: PASS. Client audit: **34 production chunks / 64 Auth dependency modules**, no private secrets/server helpers. Full `npm run format:check`: FAIL for **27 unchanged baseline documents**, individually compared to the original develop base; no unrelated formatting repairs.
- Real browser command: `node tests/wbs-5-3-auth-callback.runtime.mjs`, sequentially with `WBS_BROWSER=chromium` and `edge`, reusing installed `WBS_WINDOWS_NODE`, `CODEX_PLAYWRIGHT_PATH` and explicit `WBS_EVIDENCE_DIR`. Runs use only two new random fictional accounts, then remove their exact IDs; final Auth/business counts match baseline. No DB reset, existing-user deletion, old destructive runtime harness, real secret files, browser storage dumps, HAR or credential-bearing screenshots. Evidence: `F:\TravelAssist-wbs53-evidence\signup-flow\{chromium-verified,edge-verified}\summary.json`, screenshots and `signup-flow-*.log`; failed runs retained separately from final `-verified` results.
- Delivery: same PR #222 Draft / Issue #219 Open / WBS 5.3 待审查. Preview uses the repaired production build at `http://127.0.0.1:3000/login`. Password-reset acceptance is recorded as user-reported; registration awaits the user's fresh-mail onsite check. No merge, completion-status change or next Task.

## Onsite acceptance follow-up — authorized callback and confirmation feedback (2026-09-09)

- Authorization: after the repeated `callback_failed` report, diagnosis identified the common callback's JSON failure response and the confirmation continuation's missing no-session feedback. The user explicitly approved a minimal Auth Core callback/feedback adaptation (`允许`). This authorization is limited to this fix; TASK-018's historical Task/Result, SDK authentication operations, schema, providers and security policies are not rewritten.
- Diagnostic evidence at `F:\TravelAssist-wbs53-evidence\callback-diagnosis-result.md`: actual Chromium and Edge each passed 15 controlled assertions. Normal **shared-context new tabs** completed registration and recovery. A new independent context without the original verifier reproduced the JSON error for both flows; repeated mail then returned `otp_expired`. This reproduces the failure mechanism but does not establish which cookie/context condition affected the user's original request.
- Minimal Core HTTP change: only browser requests explicitly accepting HTML receive a private/no-store 303 to the separate visual `/auth-link-error` route on failure. Non-HTML/API requests retain the existing 401 `callback_failed` JSON contract. Successful callbacks still execute the unchanged SDK PKCE exchange, require both user and session, preserve the validated return intent, and set the existing SDK cookies. No token-hash fallback, implicit flow, manual session, looser Origin check or new authentication authority.
- Error navigation carries only allowlisted presentation reason/flow and validated relative intent. No callback code, raw provider description or incoming callback `returnTo` is copied. Explicit empty fragment clears inherited provider fragments; no-referrer/no-store headers remain. The error page has latest-mail guidance, a recovery retry link, direct email/password login, and a registration return link. It never claims confirmation/session success. Direct email-mode entry changes presentation only, with existing server identity guards unchanged.
- `我已确认邮箱，继续` now performs a bounded no-store `/auth/session` check with pending lock and safe network/no-session feedback. Only an authenticated result triggers a fresh navigation to the existing server-verified success page. No user ID, tokens or SDK state enter the new adapter's public return value. A confirmation-only reserved feedback area prevents the added error text from colliding with actions, without changing the accepted login canvas.
- Real Local regression: `tests/wbs-5-3-auth-callback.runtime.mjs` plus `.browser.mjs`, actual Chromium `151.0.7922.34` and Microsoft Edge `152.0.4191.66`, **37/37 checks per browser PASS**. Includes actual signup, no-session/network recheck feedback, valid new-tab confirmation, original-tab continuation, actual recovery/update with old-password rejection/new-password success, missing-context rejection and safe UI, consumed link guidance, and **error page → new recovery request → new mail in the same context → actual password update**. API JSON compatibility, privacy headers, hostile callback inputs and direct email-password CTA also checked.
- New error page geometry: 1920×1080, 1440×900, 1280×720, 1024×768, 768×1024, 390×844 and 320×740, both engines. No horizontal overflow, no desktop document scrollbar, all actions at least 44px, links within the card and on-origin. Empty/non-credential error screenshots saved and desktop screenshot visually inspected. Existing shared-layout harness: **165/165 checks per engine PASS** across 11 sizes and 15 states, preserving the earlier visual work.
- Data safety: this regression does **not** run the old zero-data runtime harness, start/stop/reset Supabase, touch the shared phone fixtures, or delete existing identities. It verifies the accepted Local project/loopback endpoints, proves each newly generated fictional email is absent, creates two exact test-owned identities per engine, and cleans up only those IDs. Auth/business baseline counts remain unchanged after every run. Across the initial fix run and both final runs, six temporary identities were removed; existing onsite users/passwords/sessions and business data were not modified. Credentials stayed in memory, never in logs, screenshots, HAR, traces, storageState or Result.
- Validation: new plus existing WBS-5.3/TASK-018 targeted Node tests **27/27 PASS**; full `node --test tests/*.test.mjs` **639/639 PASS**; lint, typecheck, production build, client bundle audit (**34 production chunks / 64 Auth dependency modules**) PASS. Existing full TASK-018/016 destructive fixture runtime harnesses were deliberately **not** rerun against the now-valued Local database; unchanged unit security tests plus the new isolated-fixture real callback regression provide the scoped verification. No package/dependency/workflow changes.
- Final staged-file lint/typecheck and full Node rerun: PASS, **639/639**. Changed-file Prettier and staged/unstaged `git diff --check`: PASS. Full `npm run format:check`: **FAIL, 27 pre-existing documents**, all individually verified by `git diff --exit-code 18afee5f02ed45505b81636f7b25b568270b2bf9 -- <warned paths>` as unchanged; no unrelated formatting edits. Final logs use `-final` where rerun, plus `callback-fix-format-changed.log`.
- Initial failures are retained: the diagnostic launch lacked its Windows child Playwright environment (fixed by an explicit existing path, before any account creation); the first fix browser run passed the real Auth scenarios but failed a geometry assertion because its selector assumed an obsolete CSS-module name. The selector now uses the actual Auth card structure; all final assertions pass. Neither failed run is reported as a full PASS.
- Evidence: `F:\TravelAssist-wbs53-evidence\callback-fix\{chromium,edge,chromium-layout,edge-layout}\`, per-engine `summary.json` and non-credential screenshots; `callback-fix-{chromium-final,edge,build,client-audit,lint,typecheck,all-tests,format-full}.log`. The original failed browser log remains `callback-fix-chromium.log`. Runtime reproduction uses the already installed `WBS_WINDOWS_NODE`, `CODEX_PLAYWRIGHT_PATH`, `WBS_EVIDENCE_DIR`, `WBS_BROWSER` and the existing production preview at `http://127.0.0.1:3000`.
- Delivery remains on PR #222 Draft / Issue #219 Open / WBS 5.3 待审查. No merge or next Task. This resolves the raw-error/continuation UX gap and validates the supported same-browser path; it does not make a stale or context-less email link valid. User should request a fresh email and use the same browser context for final onsite acceptance.

## Onsite acceptance follow-up — input surfaces, rounded crop and background (2026-09-08)

- User reported that entered email acquired a grey/blue background and the enlarged branch escaped the card's rounded corner. They additionally requested the existing background artwork and a slightly smaller two-card composition with more surrounding space.
- Auth now reuses `personal-center-surface-texture-v2.png`, already documented in the WBS-5.1 copy map and used in Personal Center. No asset, manifest, catalog or other Owner file was edited. Desktop maximum composition width is 1600px and height 820px, with increased horizontal padding and a small additional vertical inset in roomy windows; text and 44px controls are not transform-scaled. Actual 1920×1080 left margin: 88.3125 → 160px; card height: 860 → 820px. At 1440×900: left margin 66.234375 → 93.59375px; height 769 → 745px. Small/short windows retain readable controls and mobile natural scrolling.
- Input rows use a consistent `#fffdfb` surface. An inset paint layer covers the browser autofill background, with explicit readable text/caret colors; `autocomplete`, stored-credential functionality, validation and focus outlines remain enabled. Forced-colors mode removes the inset paint and uses system `FieldText`. The native autofill tint is consistent with the [MDN autofill reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:autofill); actual browser QA reproduced the UA's `rgb(232, 240, 254)` background while measuring final painted pixels as `rgb(255, 253, 251)`.
- Card radius is a shared CSS variable (desktop 30px / mobile 24px). Only the decorative layer clips to the corresponding inner upper-right radius (29px / 23px). The card itself keeps visible overflow, so form focus rings are not cut off. Branch source, enlarged crop and pointer-inert decorative semantics are preserved.
- `tests/wbs-5-3-auth-surfaces.browser.mjs`: actual Chromium `151.0.7922.34` and Microsoft Edge `152.0.4191.66` each passed 9 route/viewport cases (Login/Register/Forgot × 1440×900, 1280×720, 320×740), with **54 input paint checks per browser** for empty, manually filled, forced autofill, hover, keyboard focus and blur. Forced-colors handling also checked in every case. CDP `CSS.forcePseudoState` exercises native autofill CSS and UA painting; it is explicitly **not** saved-password-manager E2E or use of a real user's stored credentials.
- Every case also compares screenshot pixels with the decorative layer visible/hidden: nonzero visible artwork confirmed, **zero branch pixels outside the rounded corner**. Tests verify that the real background URL was loaded and that card overflow does not clip focus. Entered synthetic values exist only in memory; persisted screenshots use empty fields, not user credentials.
- Both browsers additionally passed the existing **165/165 layout checks** across 11 sizes and **6/6 delayed navigation checks**. No return of the intermediate loading screen, layout movement on errors/mode changes, horizontal overflow, desktop document scroll or undersized controls. Final desktop background/composition screenshot visually inspected.
- Actual WSL `npm run lint`, `npm run typecheck`, `node --test tests/*.test.mjs` (**635/635 PASS**), production build, client-bundle audit, targeted format and `git diff --check`: PASS. Whole-repository `npm run format:check` remains FAIL for the same 27 unchanged baseline documents; no out-of-scope formatting repair. Evidence: `F:\TravelAssist-wbs53-evidence\auth-surfaces\` (engine, layout and navigation subfolders) and `auth-surfaces-*.log`.
- Preview updated at `http://127.0.0.1:3000/login`. No Auth POSTs, real mail, DB reset/cleanup, secret files, account changes or Auth Core edits. PR #222 remains Draft/unmerged, Issue #219 Open, WBS 5.3 待审查. The earlier confirmation callback/continuation finding remains unresolved; this is a presentation follow-up, not final user acceptance or a new real Auth E2E claim.

## Onsite acceptance follow-up — spacing, direct navigation and sakura crop (2026-09-08)

- User requested a wider bottom margin, higher Login/Google/Apple buttons, a larger/bolder Create Account footer matching the reference, no intermediate “正在准备你的旅程入口…” screen between Login and Forgot Password, and a clearer/larger upper-right sakura branch.
- Desktop shell bottom inset is now at least 24px (36–56px in taller windows). Card/form spacing was rebalanced so Login controls move upward without clipping the title or reintroducing scroll. Create Account is weight 700; footer text is 18px on taller desktop / 16px on compact desktop and mobile. Mobile retains flowing height and full-width provider buttons. The existing 11-size geometry harness compares actual CTA/card coordinates with the previous verified layout evidence to verify the requested upward movement and larger bottom gap.
- The small branch was caused by fitting a 2172×724 PNG with substantial transparent space. The unchanged approved PNG now uses a left-anchored cover crop, mirrored into the upper-right corner, in a 300×180 desktop / 160×104 mobile container with adjusted opacity. No image file, new asset or dependency was created. Desktop and 320px screenshots visually checked: the branch is clearer without covering the title or inputs; it remains decorative and pointer-inert.
- Root cause of the intermediate screen: this Task's `src/app/(auth)/loading.tsx` replaced the previous form at each dynamic route transition. Removed that presentation-only fallback (recoverable in Git history) and added `AuthNavigationLink`, using the installed Next `useLinkStatus` contract. The current form remains visible until the destination is ready; slow navigation shows a small fixed-position hint plus a polite screen-reader status inside the clicked link. No blank loading replacement, manual history manipulation, new session cache or bypass of `currentAuthUser`; `prefetch={false}` keeps these identity-sensitive navigation requests explicit. Submit pending/error behavior and the technical Auth endpoints remain unchanged.
- Final actual Chromium `151.0.7922.34` and Microsoft Edge `152.0.4191.66`: **165/165 layout checks per browser PASS**, including footer size/weight, increased outer bottom inset, CTA moved upward, card containment, stable mode/error geometry, no desktop document scroll and mobile flow. New `tests/wbs-5-3-auth-navigation.browser.mjs`: **6/6 delayed route transitions per browser PASS** at 1440×900, 1280×720 and 390×844. Each direction holds the actual read-only RSC response, waits at least 500ms while verifying the original form and inline pending feedback, then samples rendered frames through the switch: zero blank frames, intermediate-placeholder frames or photo-size changes.
- Browser contexts are fresh and anonymous. Both harnesses prohibit unmocked Auth POSTs; mail UI states are intercepted presentation responses only. No actual signup/reset/OTP mail, user cookie access, DB reset or fixture cleanup was performed. These are presentation/navigation checks, **not** a new real Auth E2E acceptance claim.
- `npm run lint`, `npm run typecheck`, final `node --test tests/*.test.mjs` (**634/634 PASS**, including 13 WBS-5.3 tests), `npm run build`, client-bundle/secret audit, changed-file Prettier and `git diff --check`: PASS. Initial full Node run had two source-inventory failures because the deleted loading file was still in Git's cached file list; explicitly staging this Task-owned deletion resolved those failures, with no old test edits. `npm run format:check` still FAILS on the same 27 unrelated baseline documents; they remain untouched.
- Evidence: `F:\TravelAssist-wbs53-evidence\auth-polish\{chromium,edge,chromium-navigation,edge-navigation}\summary.json`, empty-input / masked-feedback / delayed-transition screenshots, and `auth-polish-*.log` (final logs retain the `-final` suffix where rerun). Production preview restored at the same `http://127.0.0.1:3000/login` address. Existing onsite account preserved.
- PR #222 remains Draft / unmerged; Issue #219 Open; WBS 5.3 待审查. The earlier new-tab confirmation callback/continuation finding remains unresolved and is **not** fixed by removing the navigation placeholder. Await user visual acceptance; no next Task.

## Onsite acceptance follow-up — stable Auth layout (2026-09-08)

- User reported desktop scrollbar, photo zoom and form movement when switching phone/email or displaying validation, then the same photo resize on navigation to Forgot Password. The former login-only sizing was insufficient; all four visual Auth routes now share the same desktop photo/card canvas. Recovery has a reserved feedback gap between the email field and submit button. Login modes reserve equal field/action slots; alert/status content retains its ARIA/live-region/focus semantics without adding a new row.
- Fixed canvas applies at width >= 768px and height >= 660px. Short desktop windows use compact spacing and side-by-side provider buttons, keeping 44px targets and 16px inputs. Mobile and very short/zoomed windows retain natural vertical flow, not clipped or globally hidden overflow. Photo assets, authentication operations, callbacks, account data and session behavior are unchanged.
- Actual Chromium `151.0.7922.34` and Microsoft Edge `152.0.4191.66`: **165/165 presentation checks per browser PASS**, across 1920×1080, 1600×900, 1440×900, 1440×760, 1280×720, 1024×768, 1024×660, 768×1024, 390×844, 320×740 and 640×450. Each size checks 8 login modes/feedback states plus Forgot Password, empty recovery submit, sent presentation, return to Login, Register, empty registration submit and no-session Reset Password. Actual link navigation verifies shared photo/card geometry; login and empty-submit checks additionally verify unchanged CTA position/height. Desktop document scroll, horizontal overflow, overlapping fields, clipped feedback, sub-44px controls, sub-16px inputs and browser runtime errors: none in this matrix.
- `tests/wbs-5-3-login-layout.browser.mjs` uses the existing external Playwright installation, a fresh anonymous browser context, intercepted mail presentation responses and a fail-closed guard against unmocked Auth POST requests. No account creation, real email, user cookies, DB reset or fixture cleanup. The valid-session Reset form and real recovery delivery were **not** rerun during this presentation follow-up; earlier technical results remain historical evidence only. Initial test failures from viewport-vs-document scroll coordinates and an incorrect mocked Recovery state were corrected before the final runs, without altering Auth contracts.
- Actual commands in the existing WSL worktree: `npm run lint`, `npm run typecheck`, `node --test tests/*.test.mjs` (**633/633 PASS**), `node --test tests/wbs-5-3-auth-user-flow.test.mjs` (**12/12 PASS**), `npm run build`, `node tests/task-018-client-bundle.mjs` (**33 production chunks / 64 dependency modules PASS**), changed-file Prettier and `git diff --check`: PASS. `npm run format:check`: FAIL, the same 27 unrelated baseline documents; no other Owner Task was rewritten.
- Evidence: `F:\TravelAssist-wbs53-evidence\auth-layout\{chromium,edge}\summary.json`, per-viewport blank-input/feedback/recovery screenshots; `auth-layout-{lint,typecheck,all-tests,targeted,build,client-audit,format-full,chromium-verified,edge-verified}.log`. Recovery and compact desktop screenshots visually inspected. Screenshots contain no credentials; synthetic entered inputs are masked.
- Preview rebuilt at `http://127.0.0.1:3000/login`; existing Local DB and onsite account preserved. PR #222 remains Draft / unmerged, Issue #219 Open, WBS 5.3 待审查. Await the user's visual check; no merge or next Task.

## Onsite acceptance follow-up — logout presentation (2026-09-08)

- User requested removing the visible “仅退出当前会话” subtitle and adding mouse feedback. Implemented in `8733fe74de278262bd5f1bdf01ba2dbbe4cfd28d`: a single-line logout icon/menu item, coral hover background, pressed inset border, keyboard focus ring and disabled feedback. The actual Core `scope: "local"` behavior is unchanged; no all-device claim added.
- Current-task tests now verify the real local-signout invariant rather than requiring the removed subtitle. Targeted Node 11/11; isolated actual-CSS Chromium checks at 1440/390/320px PASS (44px target, hover, pressed, keyboard focus, disabled). This presentation harness does not authenticate or claim a new Auth E2E pass.
- lint/typecheck/build/changed-file format/diff-check/client-bundle audit PASS. WSL full Node suite 632/632 PASS. Windows full Node suite 629/632: three existing asset inventory/protection failures referencing four unchanged SVG files; `git ls-files --eol` shows index LF / Windows working tree CRLF. Assets and old tests were not modified to suppress the failures.
- Evidence: `logout-lint.log`, `logout-typecheck.log`, `logout-all-tests.log`, `logout-all-tests-wsl.log`, `logout-build.log`, `logout-client-audit.log` under the existing evidence directory. Initial isolated-test focus setup and disabled cursor specificity failures were corrected before the final three-size PASS.
- Site preview rebuilt/restarted at the same loopback address without resetting DB, deleting users or altering sessions. The user's manually created account remains intact.
- Important acceptance finding, NOT fixed by this styling change: user opening the confirmation email in a new tab encountered `callback_failed`, then repeated links returned `otp_expired`; confirmed email existed without a session. User subsequently confirmed email/password login succeeds. The “我已确认邮箱，继续” path lacks useful no-session feedback. Exact callback cause remains unproven; cross-tab/session handling and recovery feedback still need investigation/fix. Earlier automated same-context results must not be presented as final user acceptance of this path.
- PR #222 remains Draft; Issue #219 Open; WBS 5.3 remains 待审查. No merge or next Task.

## Preflight

- Executed, in order in `F:\TravelAssist`: `git status --short --untracked-files=all`, `git branch --show-current`, `git fetch --all --prune`, `git switch develop`, `git pull --ff-only origin develop`, `git rev-parse origin/develop`, `git log --oneline -15 origin/develop`.
- origin/develop base: `18afee5f02ed45505b81636f7b25b568270b2bf9`; main checkout fast-forwarded without discarding user files, then the requested feature branch was created from this base.
- dependency 1.23: 已完成. dependency 8.3: 已完成. PR #218 merge `7f805e0a1b3b6bc650293a33363c6c22cde6a360` is an ancestor (actual merge-base check exit 0).
- duplicate Task/Issue/PR: none equivalent; #219 is the unique formal 5.3 issue; #220 is the merged Task-definition PR, not an implementation. No duplicate implementation branch/PR existed at startup or pre-publication recheck.
- Fully read formal Task, authentication/responsive/shell/personal-center design, cross-module handoff, TASK-018 Result, current Auth contracts/implementation, repository instructions and relevant installed Next 16 guides before implementation.
- Existing user files `README.txt`, `asset-contact-sheet.jpg`, `publish_assets.py` preserved unmodified and uncommitted; final SHA-256 hashes match preflight.

## Tracking

- Issue: #219, Closed / completed after user acceptance and PR merge.
- Task File: `docs/tasks/TASK-WBS-5.3-b-auth-user-flow.md`.
- Result File: this document.
- Branch: `feature/b-account-wbs-5-3-auth-user-flow`.
- Implementation Commit: `7fd9add6713b62c8f2d48d810177eda21024c389`; initial checkpoint `170a6c2f890d80b82213aedd827671f7ca2b4478`.
- Final Head: final documentation-only delivery commit, reported in Issue #219 and the delivery response (a commit cannot contain its own SHA).
- PR: [Merged #222](https://github.com/kanzakimy0/TravelAssist/pull/222), base `develop`, body `Relates to #219`. User acceptance and explicit merge authorization recorded.
- Merge Commit: `b1066abaaaed8e8b8aaa6dbacf39c041c9e776ac`.
- WBS updated: 5.3 only, 进行中 → 待审查 → 已完成. Existing parent/dependency completion and other Owner records preserved.

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
- Merge behavior: initially Draft with `[skip ci]` feature-push safety; after user acceptance and explicit permission, PR #222 merged as `b1066abaaaed8e8b8aaa6dbacf39c041c9e776ac`. No workflow edits, bypass of merge protection or forced push.
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
- External Google/Apple OAuth, production email/SMS, legal routing and physical mobile keyboard validation remain Deferred. User onsite acceptance is now PASS; those deferred capabilities are not represented as tested production features.

## Next

Completed and merged. Stop; do not automatically start WBS 3.4 / 5.15 / 5.21 or any other Task.
