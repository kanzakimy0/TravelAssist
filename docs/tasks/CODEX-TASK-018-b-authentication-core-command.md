# CODEX COMMAND — TASK-018-B Authentication Core

请在 B 工作站完整执行 TravelAssist `TASK-018-B — Authentication Core`。

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

Issue:

```text
#214
```

Spec branch:

```text
task/b-authentication-core
```

Planned implementation branch:

```text
feature/b-authentication-core
```

Target:

```text
develop
```

---

## 1. 开始前检查

先进入 B 当前 TravelAssist 仓库，但**不要在当前 Planner/UI 工作目录直接切换到 Auth 分支**。

执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

禁止：

```text
git reset --hard
git clean -fd
git push --force
git push --force-with-lease
```

如果当前工作目录有任何用户未提交工作，不要 stash/delete/clean 它；使用独立 Worktree。

---

## 2. 读取远端完整 Task

不要依赖聊天摘要。读取 GitHub 上的正式规格：

```bash
git show origin/task/b-authentication-core:docs/tasks/TASK-018-b-authentication-core.md
```

同时读取本命令文件：

```bash
git show origin/task/b-authentication-core:docs/tasks/CODEX-TASK-018-b-authentication-core-command.md
```

读取 Issue #214，并读取 Task 指定的全部仓库文档。

特别必须读取：

```text
CONTRIBUTING.md
AGENTS.md
docs/project/WBS-TravelAssist.md
docs/ui/authentication.md
docs/ui/account-security-data-privacy.md
docs/architecture/db-foundation-bootstrap-plan.md
docs/architecture/db-orm-migration-standards.md
docs/architecture/cross-module-contract-handoff.md
docs/tasks/RESULT-TASK-016-b-user-profile-schema.md
```

因为项目是 Next.js 16.3.4，在写 Auth / Cookie / Proxy / Route Handler 代码前，还必须读取当前安装包：

```text
node_modules/next/dist/docs/
```

中与 Proxy、cookies、redirect、Route Handler、Server/Client boundaries 相关的现行文档。

如果本机依赖尚未安装，先在隔离 Worktree 中按 Task 执行 `npm ci` 后再读。

---

## 3. 前置验证

确认：

1. WBS 8.1 / 8.4 的 TASK-015-A 已在 `origin/develop`。
2. TASK-016-B / PR #209 已合并，merge 是当前 `origin/develop` 的祖先。
3. 当前 develop 仍包含：
   - `profiles`
   - `profile_settings`
   - `emergency_contacts`
   - owner-only RLS
   - generated database types
4. 不存在另一份有效的 `feature/b-authentication-core` 实现或未完成 PR；若存在，先审计并复用，不要重复建立。
5. Local Supabase / Docker 可用。

如果硬前置不满足：

```text
Status = Blocked
```

返回实际证据并停止，不得从旧 feature branch 堆叠实现。

---

## 4. 建立隔离 Worktree

从**最新 clean `origin/develop`**建立独立 Worktree，并在其中创建：

```text
feature/b-authentication-core
```

不要修改当前 Planner/UI 工作树。

记录：

```text
Worktree path
origin/develop SHA
feature branch
Node/npm version
Docker version
Supabase CLI version
```

开始实际代码修改时，把 WBS 8.3 从：

```text
未开始
```

更新为：

```text
进行中
```

只修改 8.3 的状态，不覆盖其他 Owner / Task 的 WBS 更新。

---

## 5. 实施范围

严格按正式 Task 实施，核心包括：

```text
Supabase Auth
+ @supabase/ssr
+ Next.js Cookie Session
+ current Proxy/session refresh contract
+ trusted server-side current-user/claims verification
```

以及：

```text
Email + Password signup/login
Phone OTP login + new-phone auto signup
Email OTP login + MUST NOT auto signup
Current session signout
Password recovery / reset core
Google / Apple OAuth initiation + callback core
Safe returnTo / redirect intent
Reusable server auth guard primitives
```

冻结规则：

### Phone OTP

```text
未注册手机号 + OTP 成功
→ 自动创建最小 Auth 账户
→ 登录
```

### Email OTP

```text
未注册邮箱 + OTP
→ 不得创建账户
```

必须使用当前 Supabase SDK 的：

```text
shouldCreateUser: false
```

或当前文档中完全等价的实现，并用真实 Local Auth 测试证明 Auth user count 不增加。

### Password MVP

```text
>= 8 characters
至少 1 个字母
至少 1 个数字
```

不得增加复杂密码评分器或擅自扩大产品要求。

### returnTo

只允许安全站内目标；必须拒绝：

```text
http://...
https://...
//evil.example
encoded/open-redirect bypass
另一 origin
```

### Identity boundary

`auth.users` 是唯一认证身份真源。

不得把以下内容写入 public business tables：

```text
password/hash
access token
refresh token
session
OAuth access token
service/secret key
```

---

## 6. Local Auth 验证

使用 TravelAssist 的**可丢弃 Local Supabase**。

不得对 Staging / Production / 有价值的本地数据库运行 reset。

执行 Task 指定的：

```bash
npm run db:start
npm run db:status
npm run db:reset
```

Phone OTP 测试必须使用 Supabase Local 支持的 deterministic test OTP 与虚构测试号码，不发送真实 SMS，不配置真实 SMS Secret。

Email OTP / password recovery 优先使用 Local mail capture / Inbucket，不发送真实外部邮件。

真实 Google/Apple Provider E2E 没有 Owner 提供的合法配置时必须 Deferred，不能伪造 PASS；但是 provider initiation/callback/core contract、Secret 边界、returnTo 必须有测试。

---

## 7. 必须验证 TASK-016-B RLS 集成

创建两个真实 Local Auth 用户 A / B。

证明：

```text
A → 自己的数据：按当前 policy 允许
A → B 的 private rows：拒绝
B → A 的 private rows：拒绝
anon → private rows：拒绝
```

不得为了让测试通过而放宽 RLS。

---

## 8. 完整质量验收

实际执行专项 Auth tests 与仓库完整 tests。

至少：

```bash
npm run lint
npm run typecheck
npm run build
git diff --check
```

不要把：

```text
npm test --if-present
```

这种无实际 test script 的 NO-OP 当作完整测试。

按仓库现有真实 Node test 方式运行完整 suite。

如果 `npm run format:check` 只失败在 `origin/develop` 已存在且本 Task 未改动的历史文档，逐个比对基线并在 Result 中单独报告；不得把 exit 1 写成 PASS。

---

## 9. Client / Secret 泄漏验收

生产 build 后检查实际 browser JS chunks。

确保客户端不包含：

```text
SUPABASE_SECRET_KEY
DATABASE_URL
OAuth provider secret
hard-coded access/refresh token
server-only auth implementation
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 按设计允许进入 Browser，不要误判为 Secret。

---

## 10. 范围禁止

不要实现：

```text
WBS 5.3 完整登录/注册 UI
Profile / Account API 5.15
邮箱/手机号修改
设备 Session 管理
退出全部设备
安全活动
账户合并
数据导出
账户删除
TOTP
Passkey
Preference / Companion / Trip / POI
Booking / Payment / Membership
Production / Staging Supabase 配置
```

不要修改 Planner 或 Personal Center 视觉。

---

## 11. 完成后追踪

完成实现与 Local 验证后：

1. 生成：

```text
docs/tasks/RESULT-TASK-018-b-authentication-core.md
```

2. 将 WBS 8.3 更新为：

```text
待审查
```

不要标记 `已完成`。

3. Issue #214 保持 Open。
4. Push `feature/b-authentication-core`。
5. 仓库 `feature/**` 有自动建 PR / 自动 merge workflow，因此 publication commit 必须按仓库当前安全惯例使用 `[skip ci]`，避免未经用户验收自动合并。
6. 明确手工创建并确认 **Draft PR**：

```text
feature/b-authentication-core → develop
```

7. PR body 使用：

```text
Relates to #214
```

不要在用户验收前使用自动关闭 Issue 的 merge claim。

8. 不得修改现有 workflow 来绕过这个问题。
9. skipped workflow 不属于 PASS CI evidence。

---

## 12. 最终输出格式

返回：

```md
# TASK-018-B Result

## Status
PASS / PARTIAL / BLOCKED

## Prerequisite

## Base / Branch / Worktree

## Auth Architecture

## Email Password

## Phone OTP

## Email OTP

## Password Recovery

## OAuth Contract

## returnTo

## Session / Cookie Security

## TASK-016 RLS Integration

## Secret / Client Bundle Audit

## Local Supabase

## Tests

## Known Limitations

## Tracking
- Issue #214
- Task
- Result
- WBS 8.3
- branch
- commits
- Draft PR
```

如果所有正式验收项通过，Status 可以为 `PASS / 待用户验收`，但 WBS 8.3 仍只能是 `待审查`。

---

## 13. Stop

交付 Draft PR 后立即停止。

不得自动开始：

```text
WBS 5.3
WBS 5.15
TASK-017-B / Issue #207
其他后续 Task
```

等待用户明确验收 8.3。
