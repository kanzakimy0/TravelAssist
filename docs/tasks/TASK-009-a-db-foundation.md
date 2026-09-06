# TravelAssist — TASK-009-A

## Supabase PostgreSQL / Drizzle / Migration 数据库基础搭建

> Task ID：`TASK-009`  
> Owner：`A`  
> Responsibility：`Shared Infra`  
> WBS：`8.1 / 8.4`  
> Priority：`P0`  
> Status：`Partially Completed / 本机 Docker 验收阻塞`\
> GitHub Issue：`#64`  
> Proposed Branch：`feature/a-db-foundation`  
> Created：2026-09-05

---

# 1. 目标

把已冻结的数据库技术方案真正落到 TravelAssist 仓库，使后续 A/B 都能基于同一套数据库基础开发。

最终基础组合固定为：

```text
Supabase PostgreSQL
+
Supabase CLI SQL Migrations
+
Drizzle ORM（Server Query Layer）
+
Supabase Client（Browser / App + JWT + RLS）
+
PostGIS
```

本 Task 只建立数据库基础设施和 Migration 机制，不建立具体业务 Schema。

---

# 2. 唯一设计依据

执行前必须阅读：

```text
README.md
CONTRIBUTING.md
docs/README.md
docs/project/WBS-TravelAssist.md
docs/architecture/db-orm-migration-standards.md
docs/architecture/web-architecture.md
docs/development/setup.md
.env.example
package.json
package-lock.json
.github/workflows/*
```

数据库实现与其他旧资料冲突时：

```text
docs/architecture/db-orm-migration-standards.md
>
旧数据库草稿 / 个人判断
```

不得自行切换到 Prisma、Firebase、Neon 或其他数据库方案。

---

# 3. Owner / A-B 边界

本 Task 属于 Shared Infra，因此 Owner = A。

## 本 Task 可以做

- 数据库基础目录
- Supabase CLI
- SQL Migration 基线
- PostGIS extension
- Drizzle server query layer
- Supabase client factory 基础
- 环境变量占位
- generated DB types 流程
- DB local reset / lint / test
- DB CI baseline
- 数据库开发文档

## 本 Task 不可以做

以下属于 B 或后续业务 Task：

```text
8.2 User / Profile Schema
8.3 Authentication 核心
5.11 Preference Schema
5.12 Companion Schema
5.18 Saved Trip Data Model
8.5 Main Trip Plan Schema
```

不得因为“数据库已经搭了”就顺手创建这些业务表。

---

# 4. 执行顺序硬约束：TASK-008.1

TASK-009 在产品架构上不依赖 Mapbox，但当前 `TASK-008.1-A / Issue #60` 正在执行，并可能修改：

```text
package.json
package-lock.json
.env.example
```

为避免 A 两个 feature branch 同时修改依赖与 lockfile：

## 开始前必须检查

```bash
git status
git fetch origin
git switch develop
git pull --ff-only origin develop
git log --oneline -15
```

然后检查 Issue #60 / TASK-008.1 是否已经合入 `origin/develop`。

### 如果 TASK-008.1 尚未合入 develop

必须返回：

```text
Status: Blocked
Reason: TASK-008.1 is still unmerged; TASK-009 is sequenced after it to avoid package-lock / env integration conflicts.
```

停止，不创建功能分支，不从 TASK-008.1 feature branch 叠加数据库实现。

### 如果 TASK-008.1 已合入 develop

从最新 `origin/develop` 创建：

```bash
git switch -c feature/a-db-foundation
```

这是 Git 集成顺序约束，不代表数据库业务依赖 Mapbox。

---

# 5. 开始前环境检查

记录实际结果：

```bash
node --version
npm --version
docker version
```

检查仓库固定的 Node/npm/TypeScript 版本，不得擅自升级。

Local Supabase 需要 Docker compatible runtime。

如果 Docker 不可用：

- 可以完成不依赖运行时的文件搭建；
- 但不得宣称 Local DB / reset / PostGIS 已验证；
- 最终 Status 必须是 `Partially Completed` 或 `Blocked`，并明确原因。

不要安装未知的系统级 Docker 替代品来绕过环境限制。

---

# 6. 依赖安装

在检查当前 package 后，只安装数据库基础需要的最小依赖。

预期类别：

```text
Runtime:
- @supabase/supabase-js
- @supabase/ssr
- drizzle-orm
- PostgreSQL driver compatible with Drizzle

Dev:
- drizzle-kit
- Supabase CLI（按当前官方支持且适合仓库的方式）
```

要求：

1. 选择当前稳定、与项目 Node 24 / Next.js 16 / TypeScript 6 兼容的版本。
2. 以实际 npm metadata / 官方 CLI 兼容性为准，不凭记忆猜版本。
3. 更新 `package-lock.json`。
4. 不升级无关依赖。
5. 不引入 Prisma。
6. 不引入第二个 ORM。
7. 不引入大型数据库 framework。

如果当前仓库已有等价依赖，优先复用，不重复安装。

---

# 7. Supabase Local 初始化

建立标准目录：

```text
supabase/
├─ config.toml
├─ migrations/
├─ seed.sql
└─ tests/（若当前 CLI / 测试方案使用）
```

使用 Supabase CLI 初始化生成合理默认配置，然后只保留项目必要修改。

禁止：

- 提交本地容器数据
- 提交 `.env.local`
- 提交 access token
- 提交 production project ref secret
- 把本机绝对路径写入配置

---

# 8. 初始 Migration

创建第一条正式 Migration，例如：

```text
YYYYMMDDHHMMSS_enable_postgis.sql
```

职责只包含数据库基础 extension。

至少启用并验证：

```text
PostGIS
```

不得在本 Task 创建：

```text
profiles
users
trips
trip_members
preferences
companions
bookings
subscriptions
```

Migration 必须遵守：

```text
supabase/migrations/*.sql
```

是唯一数据库历史真源。

---

# 9. 不建立 Drizzle Migration 历史

本项目正式禁止出现第二套：

```text
drizzle/*.sql
```

正式 migration history。

不得把：

```text
drizzle-kit migrate
```

设为生产 Migration Runner。

不得在 Staging / Production 使用：

```text
drizzle-kit push
```

`drizzle.config.ts` 只服务类型映射 / 开发工具，不改变 SQL Migration 唯一真源原则。

---

# 10. Drizzle Server Layer

建立清晰的 server-only 数据库边界，建议方向：

```text
src/db/
├─ index.ts
├─ schema/
│  └─ index.ts
└─ queries/
```

当前没有业务表，因此 schema 可以保持最小，不得为了“证明 ORM 可用”创建假业务表。

要求：

- 数据库连接只在 Server 使用；
- `DATABASE_URL` 不进入 Client bundle；
- build 在没有真实云数据库 Secret 时也必须可以完成；
- 不允许 import DB client 导致 build 阶段自动联网；
- 真正调用 DB 时缺失 `DATABASE_URL` 应得到清楚错误，而不是静默使用假值。

如果需要 connection factory / lazy initialization，优先保证 Next.js build 不依赖在线数据库。

---

# 11. Supabase Client 边界

建立明确目录，建议：

```text
src/lib/supabase/
├─ browser.ts
├─ server.ts
└─ admin.ts
```

职责：

## browser

- 使用公开 URL / anon key；
- 未来给 Browser 用户态请求；
- 不使用 Service Role。

## server

- Server 环境使用；
- 为后续 B Authentication / Session 提供基础 client factory；
- 本 Task 不实现登录流程。

## admin

- 只允许 server-only；
- Service Role 只在函数真正被调用时读取；
- 不输出 key；
- 不进入客户端。

不要在本 Task 实现：

```text
login
signup
logout
OAuth
middleware auth redirect
Session UI
```

这些属于 8.3 / 5.3。

---

# 12. 环境变量

在现有 `.env.example` 上最小追加数据库基础占位。

至少考虑：

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

若 Supabase 当前 SDK/平台已采用新的 publishable / secret key 命名方式，应根据当前官方 SDK 与仓库兼容性做最小、明确选择，并在文档中解释；不要同时留下两套模糊命名。

要求：

- 无真实 Secret；
- 无本地连接密码泄漏；
- 不提交 `.env.local`；
- 不改变既有 Mapbox / AI 等环境变量含义。

---

# 13. Supabase Generated Types

建立：

```text
src/types/database.generated.ts
```

作为 Supabase Client 类型输出位置。

规则：

- 文件由 CLI 生成；
- 不人工维护字段；
- 在本地数据库 reset 后重新生成；
- 后续 Schema Task 改表时同 PR 更新。

建立可重复 npm script，例如概念：

```text
db:types
```

具体命令以当前 Supabase CLI 实际支持为准。

---

# 14. npm DB Scripts

在不破坏现有 scripts 的前提下增加清晰数据库命令。

至少覆盖等价能力：

```text
db:start
db:stop
db:status
db:reset
db:lint
db:types
db:migration:new
```

如果当前 Supabase CLI 提供 DB test 命令且本 Task 建立测试：

```text
db:test
```

命令必须可在项目根目录运行，不依赖开发者记忆长 CLI 参数。

尽量保持 Windows / Linux CI 都能执行。

---

# 15. Seed

建立最小 `supabase/seed.sql`。

当前本 Task 不需要业务 mock 数据。

可以为空或只包含安全说明；不得创建真实用户、订单、支付、Token、PII。

---

# 16. DB 验证

Local Supabase 可用时必须实际执行完整验证。

至少证明：

```text
Local Supabase starts
↓
empty/local DB reset
↓
all migrations replay
↓
PostGIS exists
↓
DB lint passes
↓
generated TS types succeed
```

禁止只检查文件存在就宣称数据库搭建成功。

PostGIS 要通过实际数据库查询或数据库测试验证 extension 存在。

---

# 17. DB Test

优先使用 Supabase / PostgreSQL 原生可维护的数据库测试方案。

本 Task 至少需要一个基础 smoke assertion 验证：

```text
PostGIS extension installed
```

如果当前 Supabase CLI 的 DB test / pgTAP 能稳定运行，则使用它。

如果当前工具链不支持，应使用最小 SQL smoke check，并在 Result 说明实际验证方式。

不要为了一个 DB smoke test 引入大型 JS test framework。

---

# 18. CI 基线

检查现有 `.github/workflows`，不要破坏已有自动 PR / merge 逻辑。

增加数据库基础 CI，优先：

```text
PR -> develop
DB-related paths changed
↓
npm ci
↓
Local Supabase / PostgreSQL
↓
all migrations reset
↓
DB lint/test
↓
Type generation check
```

要求：

- CI 只用临时 Local DB；
- 不连接 Production；
- 不需要 Production Secret；
- 不执行 cloud migration；
- 不修改已有 auto-merge workflow；
- 尽量使用仓库已冻结 Node/npm 设置。

如果 GitHub runner / Docker / Supabase CLI 实际限制导致 CI 无法稳定建立，应记录并保留本地验证脚本，不得伪造 CI Passed。

---

# 19. `drizzle.config.ts`

建立最小、明确配置。

要求：

- PostgreSQL dialect；
- 指向 `src/db/schema`；
- 不建立第二套正式 migrations；
- 不在 import 时打印连接字符串；
- 不把生产 DB secret 写死；
- 文档明确 `drizzle-kit push` 不用于 Staging / Production。

---

# 20. 文档

增加或更新数据库开发说明，推荐：

```text
docs/development/database.md
```

至少写清：

1. 前置 Docker 要求；
2. 安装后如何启动 Local Supabase；
3. 如何 reset；
4. 如何新增 Migration；
5. 如何生成 DB types；
6. 如何跑 DB lint/test；
7. SQL Migration 是唯一真源；
8. 禁止 Dashboard 手改 Production Schema；
9. 禁止 production `drizzle-kit push`；
10. A/B 后续业务 Schema ownership。

文档中不得包含真实连接字符串或 Secret。

---

# 21. Build / Secret 安全

必须确认：

- `npm run build` 不要求连接 Supabase Cloud；
- 无真实 `DATABASE_URL` 也不会因为未使用 DB 模块而构建失败；
- Browser bundle 不含 Service Role；
- Browser bundle 不含 `DATABASE_URL`；
- `.env.example` 只有占位；
- `git diff` 中无 Token / Password。

---

# 22. 不允许做的事情

本 Task 严禁：

```text
❌ 创建 Production Supabase project
❌ 自动连接 Production
❌ 自动执行 Production migration
❌ 提交真实 Supabase key
❌ 创建 User/Profile 业务表
❌ 创建 Auth UI
❌ 创建 Preference/Companion 表
❌ 创建 Trip/Itinerary 表
❌ 创建 Membership/Booking/Payment 表
❌ 使用 Prisma
❌ 建第二套 Drizzle migration history
❌ production drizzle-kit push
❌ 修改 TASK-008.1 业务代码
❌ 修改 Planner UI
❌ 修改 B Personal Center UI
❌ 重构无关工程目录
```

云端 Tokyo Supabase Project 的创建 / linking 在后续有明确账户权限和环境信息时单独执行。

---

# 23. Validation

完成实现后至少执行并记录实际结果：

```bash
npm ci
npm run lint
npm run typecheck
npm run format:check
npm run build
git diff --check
```

并执行本 Task 新增的所有 DB commands：

```text
db:start
db:reset
db:lint
db:test / smoke check
db:types
db:status
db:stop
```

如全仓 `format:check` 受 `origin/develop` 已有基线文件影响：

1. 必须确认失败在原始 develop 同样存在；
2. 本 Task 修改文件必须单独格式通过；
3. 不顺手修改其他 Owner 的无关文档。

---

# 24. Git / PR 安全

完成前执行：

```bash
git status
git diff --check
git diff origin/develop...HEAD
```

确认：

- 没有 Secret；
- 没有本地数据库数据；
- 没有 `.env.local`；
- 没有修改业务 UI；
- 没有第二套 Migration；
- 没有无关依赖升级。

提交建议：

```text
feat(db): establish supabase and drizzle foundation
```

仓库存在自动 PR / 自动合并 workflow。必须沿用仓库当前安全惯例避免自动合并数据库基础 Task：

- 不修改 workflow 来绕过规则；
- 必要时使用仓库既有 `[skip ci]` 安全惯例；
- PR 保持 Draft / 不自动 merge；
- 最终交由用户 Review。

禁止 force push。

---

# 25. WBS 更新（强制）

Codex 开始实际开发后：

```text
8.1 -> 进行中
8.4 -> 进行中
```

如果被 TASK-008.1 前置阻塞：

```text
TASK-009 -> 阻塞
```

但不要错误把 8.1 / 8.4 标记为已完成。

实现完成、PR 未合并：

```text
8.1 / 8.4 -> 待审查
```

只有 PR 合入 `develop` 且验收通过以后才能：

```text
8.1 / 8.4 -> 已完成
```

最终返回前必须更新：

```text
docs/project/WBS-TravelAssist.md
```

并添加/更新 TASK-009 tracking row：

```text
Task
WBS
Owner
Status
Issue #64
Task File
Branch
Commit
PR
```

---

# 26. Result 文件（强制）

完成或阻塞时建立：

```text
docs/tasks/RESULT-TASK-009-a-db-foundation.md
```

必须提交 GitHub。

---

# 27. Acceptance Criteria

只有以下全部满足才能声明实现完成：

- [ ] TASK-008.1 已先合入 develop，避免 lockfile 冲突
- [ ] 从最新 develop 创建 `feature/a-db-foundation`
- [ ] Supabase CLI 基础已进入仓库
- [ ] `supabase/config.toml` 存在
- [ ] `supabase/migrations/` 成为唯一 Migration 历史
- [ ] 初始 PostGIS Migration 存在
- [ ] Local DB 可以启动
- [ ] `db reset` 从空库完整通过
- [ ] PostGIS 实际验证通过
- [ ] DB lint 通过
- [ ] DB test / smoke check 通过
- [ ] generated DB types 可生成
- [ ] Drizzle ORM server boundary 建立
- [ ] Supabase browser/server/admin 边界建立
- [ ] build 不依赖云端 DB
- [ ] `.env.example` 已更新且无 Secret
- [ ] DB npm scripts 建立
- [ ] DB CI baseline 已建立或明确记录真实环境阻塞
- [ ] 无 User/Profile/Auth 业务实现
- [ ] 无 Preference / Companion Schema
- [ ] 无 Trip / Itinerary Schema
- [ ] 无第二套 Drizzle Migration 历史
- [ ] production 禁用 `drizzle-kit push` 已文档化
- [ ] lint Passed
- [ ] typecheck Passed
- [ ] Task 修改文件 format Passed
- [ ] build Passed
- [ ] diff check Passed
- [ ] 无 Secret 泄漏
- [ ] Result 文件已写
- [ ] WBS 已同步
- [ ] feature branch 已 push
- [ ] PR 未自动合并

---

# 28. Final Report Format

完成后严格按以下格式返回：

```markdown
# TASK-009-A Result

## Status

Completed / Partially Completed / Blocked

## Prerequisite

- TASK-008.1 merged into develop:
- Issue #60 state:
- base commit:
- working tree clean before start:

## Tracking

- WBS: 8.1 / 8.4
- Issue: #64
- Task File: docs/tasks/TASK-009-a-db-foundation.md
- Result File: docs/tasks/RESULT-TASK-009-a-db-foundation.md
- Branch:
- Commit:
- PR:
- WBS updated:

## Versions Added

- Supabase CLI:
- @supabase/supabase-js:
- @supabase/ssr:
- drizzle-orm:
- drizzle-kit:
- PostgreSQL driver:

## Repository Foundation

- supabase config:
- migrations path:
- seed:
- drizzle config:
- src/db:
- src/lib/supabase:
- generated types:

## Migration

- migration file:
- PostGIS enabled:
- second Drizzle migration history created: No
- drizzle-kit push used on remote: No

## Local Database Validation

- Docker:
- db:start:
- db:reset:
- PostGIS check:
- db:lint:
- db:test / smoke:
- db:types:
- db:stop:

## CI

- workflow/file:
- local DB only:
- production credentials required: No
- migration replay:
- result:

## Environment / Security

- .env.example updated:
- real secrets committed: No
- DATABASE_URL exposed to client: No
- Service Role exposed to client: No
- build requires cloud DB: No

## Application Validation

- npm ci:
- lint:
- typecheck:
- format:check:
- build:
- git diff --check:

## Scope Preserved

- User/Profile Schema added: No
- Auth flow added: No
- Preference/Companion Schema added: No
- Trip/Itinerary Schema added: No
- Planner UI modified: No
- Personal Center UI modified: No
- production DB modified: No

## Problems / Blockers

- ...

## Ready For Review

Yes / No
```

完成 TASK-009 后停止，不继续 8.2 / 8.3 / 8.5。
