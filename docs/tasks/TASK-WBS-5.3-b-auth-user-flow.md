# WBS-5.3-B — 登录 / 注册 / Session 用户流程

## Metadata

- **Task ID:** `WBS-5.3-B`
- **WBS ID:** `5.3`
- **Title:** 登录 / 注册 / Session 用户流程
- **Owner:** `B`
- **Responsibility:** `Authentication UI / Session User Flow / Personal Center Access`
- **Priority:** `P0`
- **Status:** `Ready / 可开始`
- **Depends On:** `1.23, 8.3`
- **Dependency State at authoring:** `1.23 = 已完成`, `8.3 = 已完成`
- **Authentication Core:** `TASK-018-B`, PR `#218`, merged into `develop`
- **Issue:** `#219 — [WBS 5.3][B] 登录 / 注册 / Session 用户流程`
- **Repository:** `https://github.com/kanzakimy0/TravelAssist.git`
- **Workspace:** `F:\TravelAssist`
- **Base Branch:** `develop`
- **Task-definition Base:** `afd44f8bec2f427ee8f3a64d56db98dc3685f24d` or newer `origin/develop`
- **Implementation Branch:** `feature/b-account-wbs-5-3-auth-user-flow`
- **Task File:** `docs/tasks/TASK-WBS-5.3-b-auth-user-flow.md`
- **Result File:** `docs/tasks/RESULT-WBS-5.3-b-auth-user-flow.md`

> 5.3 is now fully unblocked. TASK-018-B already provides the technical Authentication / Cookie Session core. This Task must consume that core; it must not build a second authentication authority.

---

# 1. Objective

Implement the frozen TravelAssist authentication experience and connect it to the merged authentication core.

Deliver the real user flow:

```text
Auth Shell
├─ Login
│  ├─ Phone OTP
│  └─ Email
│     ├─ Password
│     └─ OTP
├─ Register
├─ Forgot Password
├─ Reset Password
├─ Google / Apple OAuth entry
└─ Success / Error / Pending states
        ↓
TASK-018-B Auth Core
        ↓
Cookie Session
        ↓
Safe returnTo
        ↓
Protected Personal Center / current-session Sign-out
```

This Task is complete only when the visual flow is connected to the real merged Auth Core and the required Local Supabase runtime acceptance passes.

---

# 2. Source of Truth

Before changing code, read from the latest `origin/develop`:

```text
AGENTS.md
CONTRIBUTING.md
docs/project/WBS-TravelAssist.md
docs/ui/authentication.md
docs/ui/personal-center-responsive-states.md
docs/ui/personal-center-shell.md
docs/ui/personal-center.md
docs/architecture/cross-module-contract-handoff.md
docs/tasks/RESULT-TASK-018-b-authentication-core.md
```

Read the current Auth implementation rather than reconstructing it from memory:

```text
src/lib/auth/contracts.ts
src/lib/auth/core.ts
src/lib/auth/server-user.ts
src/lib/auth/current-user.ts
src/lib/supabase/browser.ts
src/lib/supabase/server.ts
src/lib/supabase/request.ts
src/proxy.ts
src/app/auth/[operation]/**
src/app/auth/callback/**
src/app/auth/session/**
```

Also inspect the current B-owned Personal Center shell and avatar menu before integrating access/sign-out:

```text
src/app/(account)/personal-center/layout.tsx
src/features/personal-center/components/personal-center-shell.tsx
src/features/personal-center/components/personal-top-actions.tsx
src/features/personal-center/components/avatar-popover.tsx
src/features/personal-center/components/navigation-guard-context.tsx
```

Because this repository uses Next.js 16.3.4, read the relevant installed docs under `node_modules/next/dist/docs/` for current App Router, Proxy, cookies, redirects, Server/Client boundaries and forms/navigation behavior.

Priority:

```text
latest user decision
>
frozen authentication.md + responsive states
>
merged TASK-018-B behavior
>
current develop implementation
>
Codex inference
```

---

# 3. Hard Preflight

Run:

```bash
cd F:\TravelAssist

git status --short --untracked-files=all
git branch --show-current
git fetch --all --prune
git switch develop
git pull --ff-only origin develop
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Confirm all of the following:

1. WBS `1.23 = 已完成`.
2. WBS `8.3 = 已完成`.
3. PR `#218` merge is an ancestor of latest `origin/develop`.
4. `docs/tasks/RESULT-TASK-018-b-authentication-core.md` records the accepted Auth Core.
5. No equivalent WBS-5.3 implementation Task / Issue / PR / branch already exists.
6. Issue `#219` is the unique WBS-5.3 tracking Issue.
7. The local working tree is safe and user untracked files are preserved.

Check duplicates:

```bash
gh issue list --state all --search "WBS 5.3" --limit 30
gh pr list --state all --search "WBS 5.3" --limit 30
git branch -a | findstr /I "5-3 auth login register"
```

If a true equivalent implementation already exists, stop and report it. Do not create a duplicate implementation.

Never run:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

---

# 4. Tracking

Create the implementation branch from the latest clean `origin/develop`:

```bash
git switch -c feature/b-account-wbs-5-3-auth-user-flow
```

At actual start:

```text
WBS 5.3 = 进行中
Task = 进行中
Issue #219 = Open
```

Only update the exact WBS 5.3 row and this Task's own tracking records.

Mandatory ownership rule:

> 禁止覆盖、删除、重写其他 Owner 的 Task 文件；只允许更新当前 Task ID 对应文件。涉及其他 Task 时只能读取、引用和报告差异。

---

# 5. Architecture Boundary

## 5.1 Reuse TASK-018-B

TASK-018-B is the single authentication core. Reuse its exact current contracts.

Existing technical routes include:

```text
POST /auth/[operation]
GET  /auth/callback
GET  /auth/session
```

The current `[operation]` contract includes the merged operations for signup/signin/OTP/signout/recovery/password/oauth.

Do not copy the core into UI files. Do not create another Supabase client/session authority.

## 5.2 Visual routes

Keep visual pages separate from the technical `/auth/*` HTTP contract.

Recommended public visual routes:

```text
/login
/register
/forgot-password
/reset-password
```

Use an App Router route group if helpful, for example:

```text
src/app/(auth)/layout.tsx
src/app/(auth)/login/page.tsx
src/app/(auth)/register/page.tsx
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/reset-password/page.tsx
```

Do not repurpose or replace `src/app/auth/[operation]`, `/auth/callback`, or `/auth/session` as visual pages.

## 5.3 Recommended feature boundary

Suggested:

```text
src/features/auth/
├─ auth-shell.tsx
├─ auth-client.ts
├─ auth-ui-model.ts
├─ auth.module.css
└─ components/
   ├─ login-card.tsx
   ├─ phone-otp-form.tsx
   ├─ email-login-form.tsx
   ├─ register-form.tsx
   ├─ forgot-password-form.tsx
   ├─ reset-password-form.tsx
   ├─ social-auth-buttons.tsx
   ├─ password-rules.tsx
   └─ auth-feedback.tsx
```

Names may vary. Keep request/response adaptation separate from visual components.

---

# 6. Auth Shell — Frozen Visual Structure

Authentication pages do **not** use the Personal Center Sidebar.

Desktop 16:9:

```text
TravelAssist                                   返回首页

┌──────── realistic Japan travel photo ───────┐ ┌── Auth Card ──┐
│                                              │ │                │
│ Kyoto / street / sakura / travel photography│ │ form / status  │
│                                              │ │                │
└──────────────────────────────────────────────┘ └────────────────┘
```

Frozen visual direction:

- travel photo about 55–60%; auth area 40–45%;
- warm ivory / paper texture;
- subtle sakura/warm watercolor details;
- realistic photography, natural light;
- photo saturation/contrast roughly 10% calmer than strong promotional imagery;
- warm translucent auth card, soft pink border, large radius, light shadow;
- coral/vermilion only for primary CTA/current state/key links;
- no Personal Center Sidebar;
- no generic cold SaaS/admin login style.

Prefer existing approved local assets. A suitable existing travel image may be reused, such as current Personal Center Kyoto travel photography, after verifying it exists in latest develop.

Do not download new web assets in this Task.

---

# 7. Responsive Auth Layout

Follow WBS 1.29.

## Desktop >=1280

Use the full photo + auth-card composition.

## 1024–1279

Keep two areas but reduce the visual panel; form remains the priority.

## Tablet 768–1023

Travel visual about 38–42% if layout remains split. If height/width makes the form cramped, transition cleanly rather than shrinking controls.

## Mobile <768

Use:

```text
[Travel photo banner 120–180px]
[Auth form]
```

Requirements:

- normal vertical scroll;
- form height is not fixed;
- software keyboard must not hide the primary CTA;
- Google / Apple buttons full width;
- input font >=16px on mobile;
- touch targets >=44×44px;
- no document horizontal overflow.

---

# 8. Login Page — Only One Top-level Switch

The only top-level login switch is:

```text
[ 手机登录 ] [ 邮箱登录 ]
```

Do **not** add a second global `密码登录 / 验证码登录` tab row.

Tabs must support keyboard operation and accessible selected state.

---

# 9. Phone Login

Phone login is OTP-only. There is no phone-password mode.

Required structure:

```text
欢迎回来
登录后继续你的旅程规划

[ 手机登录 ]   邮箱登录

手机号
[国家/地区码] [手机号]

验证码
[验证码] [获取验证码 / 重新发送]

☑ 继续即表示你同意《服务条款》和《隐私政策》
  未注册手机号验证成功后将自动创建 TravelAssist 账户

[ 登录 / 继续 ]

──────── 或 ────────
[ 使用 Google 登录 ]
[ 使用 Apple 登录 ]
```

Frozen behavior:

```text
valid phone OTP
├─ existing user → sign in
└─ new phone → create minimal Auth user → sign in
```

Requirements:

- use the merged phone OTP core;
- no fixed/mock OTP in production UI;
- no localStorage fake login;
- agreement must be explicitly checked before initiating the account-creating flow;
- required auto-signup notice must remain visible;
- if the current Auth Core can distinguish newly created account, an unobtrusive `已为你创建 TravelAssist 账户` feedback is allowed; do not invent a flag the core does not expose.

Real SMS delivery remains environment/provider-dependent. Local acceptance may use TASK-018's deterministic Local test OTP path. Do not claim real SMS provider acceptance.

---

# 10. Email Login — Password Mode by Default

Email login initially shows:

```text
邮箱地址
[ Email ]

密码
[ Password ] [显示/隐藏]

             使用验证码登录 | 忘记密码？

[ 登录 ]
```

Requirements:

- `使用验证码登录` and `忘记密码？` are outside the password input;
- password visibility control has an accessible name;
- errors are inline/field-associated, not Toast-only;
- Enter submits current form;
- duplicate submit is disabled while pending.

Use the merged password sign-in operation and its normalized error codes. Do not expose raw Supabase errors to end users.

---

# 11. Email OTP Mode

Switch in-place inside the same Auth Card:

```text
邮箱地址
[ Email ]

验证码
[ OTP                         | 重新发送 ]

                         使用密码登录

[ 登录 ]
```

Rules:

- password field is replaced by OTP field;
- forgot-password action disappears;
- `使用验证码登录` becomes `使用密码登录`;
- resend is part of OTP row;
- OTP state supports Idle / Sending / Sent / Countdown / CanResend / Verifying / Success / Error / Expired presentation.

Do not hardcode a provider expiry or rate-limit duration as a backend truth. UI countdown may use a presentation cooldown only if it is clearly bounded and backend throttling remains authoritative.

## Critical no-auto-signup rule

Email OTP must **never** create an unregistered account.

TASK-018-B already uses `shouldCreateUser: false` and returns a bounded `email_not_registered` path for unregistered email.

When that happens, show:

```text
此邮箱尚未绑定 TravelAssist 账户

[ 创建账户 ]
[ 使用其他邮箱 ]
```

Important integration correction:

- the email-OTP core can reject an unregistered email at request time;
- do not claim that this rejected email has already been verified;
- `创建账户` may prefill the email, but must not label it as verified or silently skip required registration confirmation.

---

# 12. Registration

Registration is explicit and minimal.

Fields:

```text
邮箱地址
密码
确认密码
服务条款 / 隐私政策同意
```

Also show Google / Apple registration entry slots.

Do not collect or require:

```text
name
gender
age
address
travel preferences
companions
budget
interests
```

Do not write profile/settings/companion records just to make registration appear complete.

## Password policy

UI feedback must match the merged TASK-018 rule exactly:

```text
至少 8 个字符
包含字母
包含数字
```

Do not add mandatory special-character or strength-score rules.

## Email confirmation-aware success

TASK-018's Local Auth has email confirmation enabled. Therefore the UI must reflect the **actual** core result:

- if confirmation is pending, show a clear `请检查邮箱` / confirmation-pending state;
- do not claim `账户创建成功` before the required confirmation/session exists;
- after a valid callback/session, the success state may show:

```text
账户创建成功 ✓
开始你的第一次旅行
[ 开始规划 ]
稍后完善个人资料
```

Do not force Profile completion.

Default first-trip CTA may use the existing `/start` entry; if a valid original `returnTo` exists, preserve the user's original intent instead of forcing `/start`.

Do not modify Start Flow business logic.

---

# 13. Forgot Password

Route:

```text
/forgot-password
```

Structure:

```text
找回密码
输入注册邮箱，我们会发送重设密码链接。

邮箱地址
[ Email ]

[ 发送重设链接 ]

← 返回登录
```

Sent state:

```text
邮件已发送 ✓
我们已向 masked-email 发送密码重设邮件。
[ 重新发送 ]
← 返回登录
```

Use the merged recovery operation. Respect backend throttling; do not weaken or bypass it.

Real hosted email delivery is not required to be claimed if provider configuration is unavailable. Local acceptance should use the established Local mail capture path.

---

# 14. Reset Password

Route:

```text
/reset-password
```

This page is entered after a valid recovery callback/session.

Structure:

```text
设置新密码

新密码
确认新密码

[ 更新密码 ]
```

Use the same password policy as registration.

Success:

```text
密码已更新 ✓
[ 返回登录 ]
```

Requirements:

- deny/update gracefully when no valid recovery/auth session is present;
- never restore or display previous password;
- no password value in logs, URL, Result, screenshots or analytics;
- do not invent a second reset-token system.

---

# 15. Google / Apple

Login and registration show:

```text
Google
Apple
```

Use TASK-018's merged OAuth initiation + PKCE callback contract.

Rules:

- do not add provider secrets;
- do not fake a successful OAuth login;
- if provider configuration is absent, display a safe actionable/configuration-unavailable error rather than pretending success;
- safe return intent must be preserved;
- do not implement app-level silent account merge/link/unlink;
- do not overwrite an existing account because provider email matches.

External Google/Apple account E2E remains Deferred unless real test provider configuration is explicitly available and authorized.

---

# 16. Safe returnTo / User Context

Login success must restore the user's intent.

Required examples:

```text
Home login
→ Login
→ original Home / original safe page

Planner authentication intent
→ Login
→ /planner?... safe original query

Direct Personal Center access
→ Login
→ intended Personal Center route
```

Use TASK-018's validated relative returnTo logic. Never implement a second weaker redirect parser.

Reject/fallback for:

```text
https://evil.example
//evil.example
encoded network-path tricks
backslash/control-character tricks
```

Auth pages must not reflect an untrusted absolute return URL into clickable navigation.

---

# 17. Personal Center Protection

After 5.3, unauthenticated users must not be able to use B-owned Personal Center pages as an authenticated account.

Implement defense in depth:

1. preserve TASK-018's cookie refresh architecture;
2. use the trusted server-side user verification primitive (`getCurrentAuthUser` / `requireAuthUser` or the exact current equivalent) for protected Personal Center access;
3. preserve the intended Personal Center path through a safe login returnTo where feasible;
4. do not treat a client cookie/session payload as final authorization proof.

If Proxy is adjusted for unauthenticated routing convenience, it remains an optimistic routing layer only. Trusted server verification must remain authoritative.

Do not globally protect unrelated main-system public routes in this Task.

---

# 18. Auth Page Behavior for Existing Session

If a verified signed-in user visits `/login` or `/register`:

- honor a valid safe returnTo when appropriate;
- otherwise return them to a sensible existing app route rather than showing a misleading anonymous login form;
- do not redirect to external URLs;
- avoid redirect loops between Auth pages and protected pages.

---

# 19. Current-session Sign-out

Wire the existing B-owned avatar/account menu sign-out control to TASK-018's current-session sign-out operation.

Required behavior:

```text
click 退出登录
→ submitting state
→ current session signout
→ cookies cleared by existing core
→ navigate to safe public destination (default `/`)
```

Requirements:

- do not claim all-device logout;
- do not modify Supabase Auth revocation semantics;
- after signout, direct Personal Center access must require authentication again;
- signout failure must show safe feedback and must not pretend success.

Do not redesign the Avatar Popover beyond what is needed to activate the already-reserved logout flow.

---

# 20. Personal Center Identity Boundary

5.3 establishes authenticated identity/session, but **5.15 Profile / Account API is still separate**.

Therefore:

- do not bind the full Profile Account form to DB in this Task;
- do not implement profile persistence;
- do not initialize Profile/Preference/Companion records automatically;
- if Shell identity needs an authenticated fallback, it may use the verified Auth user's safe public email/phone fallback only;
- do not claim that Profile display name/avatar is now persisted unless 5.15 is explicitly implemented later.

Any existing presentation fixture remaining in Profile pages must be clearly treated as presentation data, not authenticated DB truth.

---

# 21. Main Header Ownership Boundary

A owns the main-system Header/login-avatar trigger location and visual implementation under WBS 3.4.

5.3 must **not** redesign or take ownership of the main Header.

5.3 may freeze/expose the public entry contract that A can consume later:

```text
/login?returnTo=<safe-relative-path>
```

Do not mark WBS 3.4 complete.

---

# 22. Legal Copy Boundary

The authentication design requires visible agreement text for Service Terms and Privacy Policy.

WBS 10.6 owns final legal documents/routes and may not yet be complete.

Rules:

- agreement checkbox and legal names must be visible;
- do not invent legal text;
- do not create a fake successful legal route or 404 link;
- if real legal routes are absent, render the required agreement copy without pretending the documents are already published and record `Legal document routing: deferred to WBS 10.6` in Result.

---

# 23. Form / State Requirements

Every form/input must cover relevant:

```text
Default
Focus
Filled
Error
Disabled
Pending
Success (where meaningful)
```

Global action states:

```text
Idle
Submitting
Success
Error
```

Requirements:

- errors must include readable text;
- `aria-invalid` / `aria-describedby` where appropriate;
- `role=status` / `aria-live` for OTP resend and success feedback where appropriate;
- submit button disabled while duplicate submission is unsafe;
- do not clear user-entered non-secret fields unnecessarily after service errors;
- never retain passwords after successful navigation.

---

# 24. Security Rules

Mandatory:

- no password/OTP/token in URL;
- no password/OTP/token in console logs, Result, screenshots or test artifacts;
- no Supabase Secret or DB Secret in client bundle;
- no raw access/refresh token exposed to UI state;
- no second user/session table or credential store;
- no localStorage/Cookie handcrafted auth authority;
- no client-side-only protection for Personal Center;
- no open redirect;
- no raw provider/auth exception rendered to the user;
- preserve exact-Origin / content-type / body-bound protections already implemented by TASK-018.

Do not weaken TASK-018 security merely to simplify UI calls.

---

# 25. Accessibility

Required:

- phone/email tab keyboard accessible;
- labels for every input;
- password show/hide accessible label;
- OTP resend status announced;
- errors associated with fields;
- visible focus ring;
- Enter submits current form;
- Space/Enter works for buttons and agreement control;
- touch targets >=44px;
- social login buttons accessible by provider name;
- loading state remains understandable without animation;
- no state conveyed by color alone.

---

# 26. Recommended Files

Likely allowed scope:

```text
src/app/(auth)/**
src/features/auth/**
src/app/(account)/personal-center/layout.tsx
src/features/personal-center/components/avatar-popover.tsx
src/features/personal-center/components/personal-top-actions.tsx
src/features/personal-center/components/personal-center-shell.tsx
src/features/personal-center/components/personal-sidebar.tsx   # only if authenticated identity fallback is required
src/proxy.ts                                                   # only minimal routing integration, preserving 8.3 invariants
tests/*5-3*
docs/tasks/TASK-WBS-5.3-b-auth-user-flow.md
docs/tasks/RESULT-WBS-5.3-b-auth-user-flow.md
docs/evidence/WBS-5.3-B/**
docs/project/WBS-TravelAssist.md
```

If exact current Auth Core contract adaptation needs a very small B-owned shared helper, document why.

---

# 27. Files / Areas To Avoid

Do not modify by default:

```text
src/features/planner/**
src/features/map/**
src/features/start-flow/**
src/app/planner/**
src/app/start/**
src/features/preferences/**
src/features/companions/**
src/features/trip-library/**
Supabase SQL migrations
Drizzle schema/generated database types
.github/workflows/**
```

Do not modify TASK-018 historical Task/Result except reading them.

If an actual Auth Core defect is discovered, stop and report the defect before broadening scope. Do not silently rewrite TASK-018.

---

# 28. Explicitly Out of Scope

Not part of WBS 5.3:

```text
5.15 Profile / Account API
5.16 Preference persistence API
5.17 Companion persistence API
5.18 Trip data model
5.19 Trip Save/Read/History Contract
5.21 user/account deletion
3.4 main Header visual integration
10.6 legal documents
TOTP
Passkey
security-key login
all-device session management
account merge UI
provider unlink/link management
real hosted OAuth project setup
real SMS provider provisioning
native iOS / Android Auth UI
```

---

# 29. Unit / Contract Tests

At minimum add/extend tests for:

1. visual routes exist;
2. top-level login switch has exactly phone/email;
3. phone has no password mode;
4. phone agreement required;
5. phone OTP request/verify adapters use existing core contract;
6. email defaults to password mode;
7. email password → OTP in-place switch;
8. OTP → password switch;
9. forgot-password action absent in email OTP mode;
10. email OTP `email_not_registered` renders Create Account path and never calls signup implicitly;
11. prefilled registration email is not marked verified merely due failed email OTP request;
12. password rules exactly >=8 + letter + digit;
13. password confirmation mismatch;
14. signup pending-confirmation state;
15. forgot-password sent/error states;
16. reset-password invalid-session state;
17. safe returnTo preservation;
18. hostile returnTo rejection/fallback;
19. protected Personal Center requires verified server user;
20. current-session signout;
21. signout does not claim all-device revocation;
22. no localStorage auth;
23. no secret/token in client-visible contract;
24. legal document routing boundary does not create fake published legal content.

Do not weaken existing TASK-018 security tests.

---

# 30. Real Local Auth Browser Acceptance

This Task must test the actual UI against Supabase Local + production Next build where practical, reusing TASK-018's accepted Local Auth capabilities.

Required scenarios:

## Email password

- explicit signup;
- confirmation-pending UI;
- Local captured confirmation callback;
- real signed-in session;
- signout;
- correct password login;
- wrong password inline error.

## Phone OTP

- use reserved Local test phone/OTP fixtures already sanctioned by TASK-018;
- new phone auto-signup path;
- repeat login returns same Auth identity;
- required auto-signup notice visible;
- never claim real external SMS delivery.

## Email OTP

- existing email OTP login succeeds with Local captured mail;
- unregistered email does not create a user;
- Create Account CTA is shown without claiming email was verified.

## Password recovery

- request reset;
- Local captured recovery link/callback;
- `/reset-password` valid recovery state;
- weak password rejected;
- valid update succeeds;
- old password fails / new password succeeds through real core.

## Session / route protection

- unauthenticated `/personal-center` redirects to login;
- valid login returns to intended Personal Center path;
- hostile returnTo cannot escape app;
- after signout, Personal Center is protected again;
- session refresh behavior remains compatible with TASK-018.

## OAuth

- Google / Apple UI triggers the real initiation contract;
- safe callback/return intent contract remains intact;
- if external provider credentials are absent, record Deferred/configuration state rather than faking successful provider login.

Clean up only test-owned Local Auth fixtures. Do not delete user data or reset a non-disposable database.

---

# 31. Responsive Browser QA

At minimum:

```text
1920×1080
1440×900
1280×720
1024×768
768×1024
390×844
320×740
```

Verify all visual routes and major modes:

```text
/login phone
/login email password
/login email OTP
/register
/forgot-password
/reset-password
success / error / pending states
```

Requirements:

- no document horizontal overflow;
- CTA reachable with mobile keyboard/scroll behavior;
- no hydration errors;
- no blocking React warnings;
- no new 404 asset requests from Auth UI;
- password/OTP values never appear in evidence screenshots/logs.

---

# 32. Regression QA

At minimum verify:

```text
/
/start
/planner
/personal-center
/personal-center/trips
/personal-center/preferences
/personal-center/companions
/personal-center/account
```

Auth integration must not alter Planner/Start business state.

Verify Personal Center navigation guard still works after authenticated session integration.

Do not mark WBS 3.4 or 5.15 complete.

---

# 33. Validation Commands

Run:

```bash
npm ci
npm run db:start
npm run db:status
npm run lint
npm run typecheck
npm run format:check
npm run test --if-present
node --test tests/*.test.mjs
npm run build
git diff --check
```

Also rerun the existing relevant TASK-018 real Local Auth/runtime and client-bundle/secret boundary checks using their current repository commands/harness. Do not guess command names: read the accepted TASK-018 Result/tests and execute the current canonical commands.

If whole-repository formatting still fails only on proven unchanged historical baseline files:

- list them precisely;
- byte/diff compare when necessary;
- do not mass-format unrelated files;
- current 5.3-owned files must pass targeted formatting.

---

# 34. Git Safety

Before commit:

```bash
git status
git diff --name-only
git diff --check
```

Do not use:

```text
git add .
git clean -fd
git reset --hard
force push
```

Precisely stage WBS-5.3-owned files.

Suggested implementation commit:

```bash
git commit -m "feat(WBS-5.3-B): implement authentication user flow"
```

---

# 35. Push / PR

Push:

```bash
git push -u origin feature/b-account-wbs-5-3-auth-user-flow
```

Target PR:

```text
feat(WBS-5.3-B): implement authentication user flow
```

Base:

```text
develop
```

Issue:

```text
#219
```

Repository automation may create/merge feature PRs. Preserve the repository's current safety procedure; do not modify workflows to bypass it.

If implementation enters `develop` automatically but user acceptance has not happened:

```text
WBS 5.3 = 待审查
Task = 待审查
Issue #219 = Open
```

---

# 36. Status Rules

Start:

```text
WBS 5.3 = 进行中
Task = 进行中
Issue #219 = Open
```

Implementation complete / merged, user not accepted:

```text
WBS 5.3 = 待审查
Task = 待审查
Issue #219 = Open
```

Only after:

```text
real implementation in develop
+
required acceptance evidence
+
user acceptance
```

may the tracking become:

```text
WBS 5.3 = 已完成
Task = 已完成
Issue #219 = Closed
```

---

# 37. Acceptance Checklist

- [ ] latest develop synced
- [ ] 1.23 completed
- [ ] 8.3 / TASK-018-B / PR #218 completed and ancestor
- [ ] no duplicate 5.3 implementation
- [ ] independent Auth Shell
- [ ] visual `/login` route
- [ ] visual `/register` route
- [ ] visual `/forgot-password` route
- [ ] visual `/reset-password` route
- [ ] exactly phone/email top-level login switch
- [ ] phone OTP only
- [ ] new phone can auto-signup via real core
- [ ] email password login
- [ ] email OTP in-place mode
- [ ] unregistered email OTP never auto-signs-up
- [ ] email-not-registered Create Account flow does not falsely claim verification
- [ ] registration minimal fields only
- [ ] password rule exactly aligned with TASK-018
- [ ] confirmation-pending registration state
- [ ] forgot-password flow
- [ ] reset-password flow
- [ ] Google/Apple real initiation contract; no fake external E2E
- [ ] safe returnTo
- [ ] Personal Center protected by trusted server verification
- [ ] current-session signout active
- [ ] no all-device logout claim
- [ ] no Profile API/persistence implemented
- [ ] no Planner/Start business modification
- [ ] no handcrafted localStorage/cookie auth
- [ ] no secret/token exposure
- [ ] seven responsive viewports passed
- [ ] real Local Auth UI acceptance passed
- [ ] existing TASK-018 security/runtime regression passed
- [ ] Task / Issue / WBS / PR synchronized

---

# 38. Required Final Result

Create:

```text
docs/tasks/RESULT-WBS-5.3-b-auth-user-flow.md
```

Return at minimum:

```md
# WBS-5.3-B Result

## Status

## Preflight
- origin/develop base:
- dependency 1.23:
- dependency 8.3:
- PR #218 ancestor:
- duplicate Task:
- duplicate Issue:
- duplicate PR:

## Tracking
- Issue:
- Task File:
- Result File:
- Branch:
- Implementation Commit:
- Final Head:
- PR:
- Merge Commit:
- WBS updated:

## Auth Routes
- /login:
- /register:
- /forgot-password:
- /reset-password:
- technical /auth routes preserved:

## Auth Shell
- desktop:
- tablet:
- mobile:
- asset:

## Phone OTP
- request:
- verify:
- auto-signup:
- agreement:
- real SMS claim:

## Email Password
- sign-in:
- errors:
- show/hide password:

## Email OTP
- mode switch:
- resend:
- existing email login:
- unregistered email behavior:
- automatic signup triggered:
- prefill verification claim:

## Registration
- minimal fields:
- password policy:
- email confirmation:
- success:
- Profile initialization:

## Recovery
- forgot-password:
- captured Local mail:
- recovery callback:
- reset password:
- old/new password verification:

## OAuth
- Google initiation:
- Apple initiation:
- PKCE / callback:
- external provider E2E:
- secrets added:
- silent account merge:

## Session / returnTo
- protected Personal Center:
- trusted server verification:
- Home return:
- Planner return intent:
- hostile returnTo:
- refresh regression:
- current-session signout:
- all-device logout claimed:

## Profile Boundary
- Profile API 5.15:
- profile persistence:
- existing presentation fixture handling:

## Legal Boundary
- agreement copy:
- published legal route:
- 10.6 deferred:

## Responsive
- 1920×1080:
- 1440×900:
- 1280×720:
- 1024×768:
- 768×1024:
- 390×844:
- 320×740:
- horizontal overflow:

## Validation
- npm ci:
- db:start/status:
- lint:
- typecheck:
- format:check:
- targeted format:
- tests-if-present:
- Node tests:
- TASK-018 runtime regression:
- client/secret audit:
- build:
- diff-check:
- browser QA:

## Ownership Safety
- A Header redesigned:
- Planner modified:
- Start business modified:
- TASK-018 rewritten:
- DB schema/migration modified:
- 5.15 implemented:
- Preference/Companion/Trip business modified:
- workflow modified:

## Git
- Commit:
- Push:
- PR:
- Merge behavior:
- latest origin/develop:
- unpushed commits:
- tracked working tree:
- preserved untracked files:

## Problems
-

## Next
Stop. Do not automatically start WBS 3.4 / 5.15 / 5.21 or any other Task.
```

---

# 39. Stop Rule

After delivery, stop.

Do not automatically:

- start WBS 3.4;
- start WBS 5.15;
- start WBS 5.21;
- bind Profile forms to DB;
- implement legal content;
- configure production OAuth/SMS/email providers;
- modify Planner/Start business;
- close Issue #219 before user acceptance;
- mark WBS 5.3 completed before accepted implementation is in develop.
