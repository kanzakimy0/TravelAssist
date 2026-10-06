# CODEX — TASK-050-B / WBS 5.15 Profile / Account API

请在 TravelAssist 仓库中完整执行 **TASK-050-B**，完成 WBS **5.15 Profile / Account API**。

## Repository

`https://github.com/kanzakimy0/TravelAssist`

## Tracking

- Issue: `#336`
- Spec branch: `task/b-wbs-5-15-profile-account-api`
- Implementation branch: `codex/b-account-wbs-5-15-profile-account-api`
- Target: `develop`

## 0. Preflight — 必须先执行

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

要求：

1. 工作区必须可安全执行，不得破坏未提交用户工作。
2. **实现必须基于执行时最新 `origin/develop`**。
3. 不得从 Spec Branch 直接开发，不得从旧 5.15/Profile feature branch 叠加。
4. 重新检查 WBS 8.2 / 8.3 均仍为已完成且其实现存在于最新 `develop`。
5. 若依赖不满足，返回 `Blocked` 并停止，不创建伪完成实现。

## 1. 读取正式规格

```bash
git show origin/task/b-wbs-5-15-profile-account-api:docs/tasks/TASK-050-b-profile-account-api.md
git show origin/task/b-wbs-5-15-profile-account-api:docs/project/WBS-5.15-profile-account-api-start.md
```

并读取最新 `origin/develop` 中：

```text
AGENTS.md
CONTRIBUTING.md
docs/project/WBS-TravelAssist.md
docs/ui/profile-account.md
docs/ui/account-security-data-privacy.md
docs/ui/authentication.md
docs/architecture/db-orm-migration-standards.md
docs/architecture/cross-module-contract-handoff.md
supabase/migrations/20260908083000_create_user_profile_schema.sql
src/lib/auth/server-user.ts
src/server/private-http.ts
src/app/api/preferences/route.ts
src/server/preferences/http.ts
当前 Companion API Route / HTTP / Repository
```

完整 Task 内容高于本 Launcher 摘要；如执行时 `develop` 出现更晚已验收规范，必须保留并适配，不得用本规格回退它。

## 2. 创建独立实现分支

确认 Gate PASS 后，从最新 `origin/develop` 创建：

```bash
git switch --create codex/b-account-wbs-5-15-profile-account-api origin/develop
```

如果该分支已由同一 Task 正常存在，则先审计其 ancestry/status，不得强制重建、reset 或覆盖。

## 3. 正式启动时更新 WBS

读取 **最新完整** `docs/project/WBS-TravelAssist.md`，只把 WBS 5.15 从：

```text
未开始
```

最小更新为：

```text
进行中（#336 / TASK-050-B）
```

不得覆盖其他 A/B 同时发生的 WBS 修改。

## 4. 必须实现的 API

```text
GET    /api/profile
PATCH  /api/profile
GET    /api/emergency-contacts
POST   /api/emergency-contacts
PATCH  /api/emergency-contacts/[id]
DELETE /api/emergency-contacts/[id]
```

### `/api/profile`

复用现有：

- `public.profiles`
- `public.profile_settings`
- `public.emergency_contacts`
- Supabase Auth trusted current user

GET 返回：

- product Profile；
- global display settings；
- trusted Auth email / phone / verification summary；
- emergency contacts。

PATCH 只修改 Profile + settings：

- missing = unchanged；
- explicit `null` = clear nullable field；
- unknown key = reject；
- caller user/owner ID = reject；
- Auth email/phone = read-only，不接受 PATCH；
- 缺少 Profile/settings row 时允许显式保存创建；
- 成功后返回刷新后的完整 aggregate。

### Emergency contacts

- 当前用户独立 CRUD；
- ID 由系统生成；
- owner 必须来自 verified Auth；
- 与 Companion 无任何自动联动；
- path UUID / body shape / E.164 / email / bounds 严格校验；
- cross-user ID 不得泄露另一用户数据。

## 5. 架构要求

沿用当前 B 私有 API 模式：

```text
thin Route Handler
  ↓
server HTTP orchestration
  ↓
strict parser / mapper / domain
  ↓
owner-scoped repository
  ↓
现有 Supabase tables + RLS
```

必须复用 `src/server/private-http.ts` 或执行时已验收替代层：

- trusted `auth.getUser()` verification；
- Cookie mutation same-origin；
- malformed/explicit Bearer 不得 fallback Cookie；
- private no-store headers；
- bounded JSON body。

禁止：

- 第二套 Auth client/session stack；
- normal-user service-role；
- 在 Route Handler 内堆积 canonical validation；
- 创建第二套 Profile/Account schema。

## 6. 数据边界

`auth.users` 仍是认证 Source of Truth。

不得把以下写进 public Profile 作为独立真值：

```text
password / password hash
access / refresh token
session
OAuth identity
verified email / phone credential truth
```

Profile/settings/emergency contacts 必须复用 TASK-016-B 现有表。

优先 **不新增 migration**。只有发现真实事务一致性要求且现有边界无法安全满足时，才能新增最小 RPC/migration，并在 Result 解释原因；此时必须真实 `db:reset` + `db:types`，generated type 不得手工编辑。

## 7. 严格校验

至少覆盖：

- display/full name trim + bounds；
- birthDate strict YYYY-MM-DD + real date + 非未来；
- 现有 gender semantics，不发明竞争枚举；
- country/region ISO-alpha-2 + 已有 registry（如存在）；
- locale 使用当前 accepted runtime/registry；
- timezone 使用当前 accepted IANA/runtime validation；
- currency alpha-3 + 当前 registry（如存在）；
- `km | mi`；
- `celsius | fahrenheit`；
- `12h | 24h`；
- emergency contact E.164 / email / note / name / relationship bounds；
- unknown fields fail closed；
- request body size bounded。

## 8. 明确禁止提前实现

不要实现：

```text
修改邮箱 / 手机 / 密码
OAuth 连接管理
设备 / Session 管理
安全活动
数据导出
账户删除 / 用户数据删除（WBS 5.21）
Booking / Partner sync
Preference / Companion / Trip API 修改
Planner / AI / Engine / POI
个人中心视觉重设计
Avatar binary upload/storage
公开 Profile 搜索
```

特别注意：**不要启动 5.21**。

## 9. 必须真实验收

使用 Local Supabase，至少两个真实 Auth users + anon，验证：

```text
unauthenticated denied
cross-user read/write/delete denied
owner spoof rejected/ignored
Cookie mutation origin protection
explicit Bearer behavior
first GET has no write side effect
PATCH creates missing Profile/settings as needed
GET round-trip matches saved state
missing vs null semantics
unknown/invalid payload fails closed
future DOB denied
invalid locale/timezone/currency/units denied
Auth email/phone cannot be overridden
Auth contact summary comes from trusted Auth
emergency-contact CRUD
invalid UUID fails before DB lookup
cross-user contact ID does not leak data
TASK-016 RLS regression
server-only modules absent from client bundle
```

如 Local Supabase / Docker 不可用，不得把 Task 报成完成或 `待审查`。

## 10. Quality Gates

至少执行执行时仓库当前适用的：

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present
```

以及：

- TASK-050 focused tests；
- full repository tests；
- repository current deploy/format/diff gates；
- `db:start` / `db:status` / `db:reset`；
- 如果新增 migration/RPC：`db:types` 两次可重复生成比对。

任何 baseline failure 都必须有执行前同基线证据，不能把本 Task 新失败伪称为历史问题。

## 11. 完成实现后的追踪

生成：

```text
docs/tasks/RESULT-TASK-050-b-profile-account-api.md
docs/qa/TASK-050/README.md
```

读取最新 Master WBS，只将 5.15 最小更新为：

```text
待审查（#336 / TASK-050-B；Draft PR #<number>）
```

然后：

- push implementation branch；
- 创建 **Draft PR → develop**；
- PR body 使用 `Relates to #336`；
- Issue #336 保持 Open；
- 不自动 Ready for Review；
- 不自动 merge；
- 不标记 `已完成`；
- 不启动 WBS 5.21。

## 12. 禁止 Git 操作

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

## 13. 最终返回

把完整 `TASK-050-B Result` 返回给用户，至少包含：

- Status；
- execution baseline；
- dependency gate；
- Issue / branch / commits / Draft PR；
- API routes；
- validation/contract；
- Auth/RLS/security evidence；
- Local Supabase results；
- focused/full tests；
- lint/typecheck/build/deploy/diff；
- migrations/types status；
- changed files；
- blockers/deferred；
- WBS Updated；
- `5.21 not started`。
