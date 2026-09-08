# TASK-016-B — User / Profile Schema

## 1. Metadata

- Task ID: `TASK-016-B`
- WBS: `8.2`
- Owner: `B`
- Priority: `P0`
- Issue: `#200`
- Spec branch: `task/b-user-profile-schema`
- Implementation branch: `feature/b-user-profile-schema`
- Hard dependency: `TASK-015-A / WBS 8.1 + 8.4 / PR #186 merged into origin/develop`
- Architecture roadmap: `docs/architecture/business-data-schema-roadmap.md`
- DB standards: `docs/architecture/db-orm-migration-standards.md`
- DB bootstrap plan: `docs/architecture/db-foundation-bootstrap-plan.md`
- Contract rules: `docs/architecture/cross-module-contract-handoff.md`
- UI sources:
  - `docs/ui/profile-account.md`
  - `docs/ui/authentication.md`
  - `docs/ui/account-security-data-privacy.md`
  - `docs/ui/personal-center-design-freeze-v1.md`

---

## 2. Objective

在已经冻结的 Supabase PostgreSQL / SQL Migration / Drizzle 基础上实现 TravelAssist 第一组正式业务 Schema：User / Profile 数据域。

本 Task 只建立：

```text
auth.users                         ← Supabase Auth identity source of truth
    │
    ├── public.profiles            ← TravelAssist product profile
    ├── public.profile_settings    ← account/display settings
    └── public.emergency_contacts  ← optional emergency contacts
```

不得提前实现 Auth 用户流程、Preference、Companion、Trip、POI 或 Booking。

---

## 3. Hard Prerequisite

开始任何实现前必须执行并记录：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

检查 PR #186 是否已经合并，且最新 `origin/develop` 中真实存在至少：

```text
supabase/config.toml
supabase/migrations/
supabase/seed.sql
src/db/index.ts
src/db/schema/index.ts
drizzle.config.ts
tools/db/local.mjs
```

### 如果 PR #186 未合并

必须：

1. 输出 `Status: Blocked`；
2. 记录当前 `origin/develop` SHA；
3. 记录 PR #186 状态；
4. 不创建 `feature/b-user-profile-schema`；
5. 不从 `feature/a-db-orm-migration-foundation` 叠分支；
6. 不修改业务代码；
7. 停止。

### 如果 PR #186 已合并

从最新 clean `origin/develop` 创建：

```text
feature/b-user-profile-schema
```

不得从旧本地 develop、Planner 分支或 TASK-015 feature branch 创建。

---

## 4. Source-of-Truth Boundary

### 4.1 Auth identity

Supabase：

```text
auth.users
```

是以下内容的唯一身份真源：

- auth user id
- verified email
- verified phone
- password credential
- OAuth identities
- session / auth tokens
- auth provider metadata

`public.profiles` 不得复制这些字段作为第二份身份真源。

### 4.2 Product Profile

Profile 保存 TravelAssist 产品资料，而不是认证凭证。

UI 已冻结 Profile 字段：

- 昵称 / Display Name
- 姓名
- 出生日期
- 性别（可选）
- 居住国家 / 地区
- 常住城市
- Avatar reference

注册流程只收最小认证信息，不要求用户注册时完成 Profile。因此 Schema 必须支持 progressive onboarding。

---

## 5. Required Tables

字段命名可以在实现时做轻微 SQL 风格调整，但必须保持以下领域边界。

### 5.1 `public.profiles`

推荐最小结构：

```text
id                       uuid PK / auth user id
display_name             text nullable during progressive onboarding
full_name                text nullable
birth_date               date nullable
gender_code              text nullable
residence_country_code   text nullable
residence_city           text nullable
avatar_path              text nullable
created_at               timestamptz not null
updated_at               timestamptz not null
```

约束：

- `id` 必须关联 `auth.users(id)`；
- Auth user 删除后 Profile 不得成为孤儿；
- country code 若存在应采用可验证的标准格式；
- 字符串应设置合理长度 / check，避免无限自由文本；
- `gender_code` 本 Task 不冻结最终产品枚举，不要为了当前 UI 猜测完整性别选项；
- Avatar 只保存 provider-neutral reference/path，不在本 Task 实现上传系统。

### 5.2 `public.profile_settings`

一名用户一行，存储 Account 的国际化显示设置：

```text
user_id            uuid PK
locale             text nullable
region_code        text nullable
timezone           text nullable
currency_code      text nullable
distance_unit      text nullable
temperature_unit   text nullable
time_format        text nullable
created_at         timestamptz not null
updated_at         timestamptz not null
```

规则：

- 不得放入旅行偏好字段；
- locale 使用可扩展的 language tag 表示；
- region / currency 使用标准 code；
- distance / temperature / time format 可以使用稳定 check constraint；
- account creation 必须允许没有显式设置时使用应用 fallback，不应强制注册阶段填写这些字段。

### 5.3 `public.emergency_contacts`

建议结构：

```text
id               uuid PK
user_id          uuid not null
name             text not null
relationship     text not null
phone_e164       text not null
country_code     text nullable
email            text nullable
note             text nullable
created_at       timestamptz not null
updated_at       timestamptz not null
```

规则：

- 一名用户允许 0..N 联系人；
- 必须有 owner index；
- phone 使用可供后续 API 正规化的 canonical 字段；
- 不自动发送任何消息；
- 不与 `companions` 共表；
- Companion Schema 在 WBS 5.12 单独实现。

---

## 6. Profile Lifecycle Boundary

本 Task 不实现注册 / 登录 handler。

不要为了“自动有 Profile”而擅自冻结 Auth Core 行为。

允许：

- 建立 FK / schema / RLS；
- 建立后续 Auth Task 可以调用的最小 SQL primitive（只有明确必要且测试覆盖时）。

默认不在本 Task 建立复杂 `auth.users` signup trigger；账号创建与 Profile 初始化策略由 WBS 8.3 Authentication Core 结合手机自动注册、邮箱注册、OAuth 首次登录后统一实现。

---

## 7. RLS / Authorization

所有三张业务表默认：

```text
RLS ON
Default Deny
```

### `profiles`

Authenticated user：

- SELECT own row
- INSERT own row（如生命周期方案需要）
- UPDATE own row

不要提供普通 client DELETE policy；账户删除由后续安全 / 隐私生命周期处理。

### `profile_settings`

Authenticated user：

- SELECT own
- INSERT own
- UPDATE own

### `emergency_contacts`

Authenticated user：

- SELECT own
- INSERT own
- UPDATE own
- DELETE own

所有 policy 必须基于：

```sql
auth.uid()
```

与 row owner identity 判断。

禁止通过 `USING (true)` / `WITH CHECK (true)` 之类宽放策略让 authenticated 用户访问全表。

---

## 8. Migration Rules

正式变更只能进入：

```text
supabase/migrations/*.sql
```

命名：

```text
YYYYMMDDHHMMSS_create_user_profile_schema.sql
```

若 RLS / helper 复杂，可拆为多 Migration，但必须一 Migration 一主要意图。

禁止：

- `drizzle-kit push`
- `drizzle-kit migrate` 作为正式 runner
- 新建 `drizzle/` 正式 migration history
- 修改已经进入 develop 的旧 migration

SQL Migration 是最终事实，Drizzle schema 随后同步。

---

## 9. Drizzle Mirror

在 `src/db/schema/` 中增加清晰的业务 schema 模块，例如：

```text
src/db/schema/profiles.ts
src/db/schema/profile-settings.ts
src/db/schema/emergency-contacts.ts
src/db/schema/index.ts
```

可根据现有代码规范适当合并文件，但禁止把所有后续 Preference / Companion / Trip schema 提前塞进同一文件。

Drizzle 定义必须与 SQL 最终 Schema 一致。

---

## 10. Generated Types

完成 Migration 后必须在真实 Local Supabase 上：

```bash
npm.cmd run db:types
```

或在非 Windows shell 使用等价 npm 命令。

更新：

```text
src/types/database.generated.ts
```

规则：

- generated file 不得人工编辑；
- 如果生成失败，不得伪造；
- Result 必须记录实际生成命令与结果。

---

## 11. Tests

至少覆盖：

### Schema

- 三张表存在；
- PK / FK 正确；
- delete behavior 不产生 orphan rows；
- required checks / indexes 存在；
- Migration 可从空 Local DB 重放。

### RLS

至少使用两名测试用户证明：

```text
User A can read/update A profile
User A cannot read/update B profile
User A can manage A settings
User A cannot manage B settings
User A can CRUD A emergency contacts
User A cannot read/write B emergency contacts
Anon cannot access private rows
```

测试方式可以使用项目已有 Node/SQL/pgTAP 基线，但不得只靠字符串搜索 policy SQL 冒充真实权限验证。

### Architecture boundary

增加自动检查，防止 Profile schema 出现：

- password hash
- refresh/access token
- session token
- OAuth secret
- service role secret

同时验证 browser bundle 不引入 `DATABASE_URL` / Supabase secret。

---

## 12. Local Runtime Validation

Docker / WSL2 可用时必须实际执行：

```bash
npm.cmd ci
npm.cmd run db:start
npm.cmd run db:status
npm.cmd run db:reset
npm.cmd run db:types
```

然后运行专项数据库测试和：

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

最后：

```bash
npm.cmd run db:status
npm.cmd run db:stop
```

如果平台不是 Windows，可以使用 `npm`；Result 中记录实际命令。

---

## 13. Existing Application Compatibility

本 Task 不应改变现有 Personal Center Mock UI 视觉行为。

必须保证：

- `/personal-center`
- `/personal-center/account`
- `/personal-center/account/security`
- `/personal-center/account/privacy`
- `/personal-center/preferences`
- `/personal-center/companions`
- `/personal-center/trips`

现有 build 不因没有远端 DB Secret 而失败。

本 Task 不把 UI 从 Mock 切到真实数据；真实 Profile API 属于 WBS 5.15。

---

## 14. Explicitly Out of Scope

- WBS 8.3 Authentication Core
- WBS 5.3 Login / Registration / Session flow
- WBS 5.15 Profile / Account API
- WBS 5.11 Preference Schema
- WBS 5.12 Companion Schema
- WBS 5.18 Trip Library model
- WBS 8.5 Main Trip Plan Schema
- WBS 7.4 POI Schema
- Booking / Payment / Membership
- Account deletion implementation
- data export implementation
- avatar upload/storage provider
- OAuth implementation
- notification implementation
- any Planner visual work

---

## 15. Tracking / Result

实现结束必须创建：

```text
docs/tasks/RESULT-TASK-016-b-user-profile-schema.md
```

Result 至少记录：

- Status
- prerequisite / base commit
- branch / issue / PR
- migrations
- tables / columns
- RLS policies
- indexes / constraints
- Drizzle schema
- generated types
- Local Supabase start/reset/types evidence
- RLS isolation evidence
- lint / typecheck / tests / build
- security / secret checks
- WBS update
- known limitations

更新：

```text
docs/project/WBS-TravelAssist.md
```

WBS 8.2 在用户验收 / 合并前不得擅自写成最终已完成。

---

## 16. Git Safety

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

不得覆盖其他 Owner 未提交内容。

如当前工作目录 dirty，使用独立 worktree。

---

## 17. Completion Gate

Task 才能标记实现完成 / Ready for review，当且仅当：

- PR #186 prerequisite 已合入 develop；
- feature branch 基于最新 develop；
- Local Supabase 从零 reset PASS；
- RLS 真实跨用户隔离 PASS；
- generated types 来自真实 Local DB；
- Drizzle 与 SQL 同步；
- lint / typecheck / tests / build PASS；
- 没有 Auth secret duplication；
- 没有 UI scope creep；
- Result + WBS + Issue + Draft PR 全部同步。

完成后停止，不自动开始 Authentication Core。
