# TASK-015-A — DB / ORM / Migration 基础工程初始化

> Issue：#173  
> Owner：A / Shared Infrastructure  
> WBS：8.1 / 8.4  
> Priority：P0  
> Base at creation：`develop@707bcc8d2af14a86032181be63573beb3aea3e17`  
> Branch：`feature/a-db-orm-migration-foundation`  
> Status：Ready to Start  
> Design：`docs/architecture/db-orm-migration-standards.md`  
> Freeze Plan：`docs/architecture/db-foundation-bootstrap-plan.md`

---

## 1. Objective

把 TravelAssist 的数据库基础工程真正接入代码仓库，使后续业务 Schema 可以基于统一的 Supabase PostgreSQL + SQL Migration + Drizzle ORM 开发。

本 Task 只建立 **Database Foundation**；禁止提前创建用户、偏好、同行人、行程、POI、订单等业务表。

完成后，新的开发者 / Codex 在具备 Docker-compatible runtime 的机器上，应能从一个全新的仓库 clone 出发，通过仓库内命令启动 Local Supabase、重放 Migration、生成数据库 TypeScript Types，并通过项目既有质量门禁。

---

## 2. Hard Preconditions

### 2.1 Repository / WBS

- `WBS 2.6` 已完成。
- `origin/develop` 必须包含：
  - `docs/architecture/db-orm-migration-standards.md`
  - `docs/architecture/cross-module-contract-handoff.md`
  - 当前工程版本固定规则
  - 当前环境变量规范
- Issue #173 仍为 Open。
- 本 Task 分支为 `feature/a-db-orm-migration-foundation`。

### 2.2 不要求的前置

以下 **不是** 本 Task 前置：

- 真实 Supabase Production Project
- Staging Project
- Supabase Access Token
- Database Password
- Secret Key
- User / Profile Schema
- Authentication Core

不得因为没有真实远端 Secret 而阻塞整个 Task。

---

## 3. 开始前必须执行

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

然后确认远端 Task 分支存在：

```bash
git ls-remote --heads origin feature/a-db-orm-migration-foundation
```

如果当前不在 Task 分支，且工作区干净：

```bash
git switch feature/a-db-orm-migration-foundation
```

如果本地没有：

```bash
git switch -c feature/a-db-orm-migration-foundation --track origin/feature/a-db-orm-migration-foundation
```

再次执行：

```bash
git status --short
git branch --show-current
git log --oneline -5
```

### 禁止执行

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

不得覆盖用户未提交修改；若工作区存在无关改动，必须保留并在 Result 中说明。

---

## 4. 必读文件

完整读取：

```text
README.md
CONTRIBUTING.md
docs/README.md
docs/architecture/db-orm-migration-standards.md
docs/architecture/db-foundation-bootstrap-plan.md
docs/architecture/cross-module-contract-handoff.md
docs/development/setup.md
.env.example
.gitignore
package.json
package-lock.json
docs/project/WBS-TravelAssist.md
```

同时读取 Issue #173 的完整内容。

若仓库中已有其他 DB / Supabase / Drizzle 文件，先审计后复用，不重复建立第二套结构。

---

## 5. 冻结技术决策

本 Task 不得自行更换：

```text
Database            = Supabase PostgreSQL
Local DB             = Supabase Local
Migration Truth      = supabase/migrations/*.sql
Migration Runner     = Supabase CLI
Server ORM           = Drizzle ORM
PostgreSQL Driver    = postgres / postgres.js
Spatial              = PostGIS
Browser/Mobile Data  = Supabase Data API + RLS（后续业务 Task）
Auth                 = Supabase Auth（WBS 8.3）
```

### 5.1 API Key 命名

新代码使用 2026 Supabase publishable / secret key 体系：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_SECRET_KEY
DATABASE_URL
```

不得新建以 legacy key 为标准的：

```text
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

如果未来真实项目只存在 legacy keys，另建迁移 Task。

---

## 6. Scope A — Dependency Baseline

在保持当前 Node / npm / TypeScript 固定规则的前提下，使用 npm 安装 **稳定版**：

### Runtime

```text
drizzle-orm
postgres
@supabase/supabase-js
```

### Dev

```text
drizzle-kit
supabase
```

要求：

1. 不使用 beta / rc / canary。
2. 修改 `package.json` 与 `package-lock.json`。
3. 不顺手升级 Next.js / React / TypeScript / ESLint / Tailwind / Mapbox。
4. 实际解析版本必须记录到 Result。
5. 如果稳定版与 Node 24 / TypeScript 6 基线存在真实不兼容，停止并准确报告，不要通过大规模依赖升级绕过。

`@supabase/ssr` 默认不在本 Task 接入；Cookie / Session 属于 WBS 8.3。

---

## 7. Scope B — Supabase Local 初始化

使用项目内 CLI：

```bash
npx supabase --version
```

如果仓库尚未初始化 Supabase：

```bash
npx supabase init
```

不得使用 `supabase bootstrap` 重建或覆盖现有 Next.js App。

最终至少存在：

```text
supabase/config.toml
supabase/migrations/
supabase/seed.sql
```

### 7.1 config.toml

- 保持 Supabase CLI 生成结构。
- `project_id` 使用明确的本地项目标识，例如 `travel-assist`。
- 本地 `site_url` 与当前 Next.js 开发地址保持合理一致。
- 不写真实 Production ref、access token 或 secret。
- 不无理由开启额外实验功能。

### 7.2 seed.sql

本 Task 不创建业务 Master Data。

`seed.sql` 可以保持空的、注释化基础文件，禁止加入真实用户数据、Email、API Key、订单或外部 Provider 数据。

---

## 8. Scope C — Migration Foundation

建立并冻结：

```text
supabase/migrations/
```

作为唯一正式 Migration 历史。

### 允许

- 必要的基础 extension bootstrap；
- 为验证本地 Migration 管道所需的最小非业务 DDL；
- 可从零重放、幂等、安全的基础 SQL。

### 禁止

本 Task 不得创建：

```text
profiles
users application table
preferences
companions
trips
trip_days
itinerary_items
trip_members
places / poi
bookings
orders
payments
membership
notifications
AI conversation tables
```

Supabase 自带 `auth` / `storage` 等系统 Schema 不属于“本 Task 创建业务表”。

如果没有必要的基础 DDL，可以保留 migrations 目录作为空历史；不要为了验收数字制造无意义 migration。

若启用 PostGIS，必须在 Local Supabase 中实际 reset 验证成功；不允许只提交未经执行的 SQL。

---

## 9. Scope D — Drizzle Foundation

建立：

```text
src/db/index.ts
src/db/schema/index.ts
drizzle.config.ts
```

### 9.1 `src/db/index.ts`

目标：提供 server-only、类型安全、无 import-time 网络副作用的 Drizzle 基础连接层。

要求：

- 使用 `drizzle-orm` + `postgres`。
- 从 `DATABASE_URL` 读取连接。
- 对 Supabase Transaction Pooler 兼容：`prepare: false`。
- 不把 connection string 输出到日志。
- 不在模块加载时自动 Migration / DDL。
- 不要求 Next.js `build` 阶段必须能访问数据库。
- 环境变量缺失时应在真正调用 DB 的位置给出明确错误，而不是无关页面 build 时立即 crash。
- 明确 server-only 边界；不得被 Client Component 安全地导入。

可以使用工厂 / lazy initialization / server-only guard 中最适合当前仓库结构的一种，不要过度设计连接池框架。

### 9.2 `src/db/schema/index.ts`

只建立 ORM Schema 出口。

禁止为了演示 Drizzle 而创建示例业务表。

### 9.3 `drizzle.config.ts`

允许为 Drizzle introspection / schema tooling 配置，但正式 Migration 不走 Drizzle。

禁止增加任何会让团队误用：

```text
drizzle-kit push

drizzle-kit migrate
```

为正式 Staging / Production Migration runner 的 package script。

如果 `drizzle.config.ts` 在没有 `DATABASE_URL` 时会被普通 Next build 自动加载，应确保普通 build 不被无关阻塞。

---

## 10. Scope E — Supabase Client Dependency Boundary

安装 `@supabase/supabase-js`，但本 Task 不实现完整 Authentication / Session。

允许：

- 建立最小 typed client factory（仅当它确实有助于数据库基础验证）；
- 建立环境变量解析 / guard；
- 为后续 generated types 留出类型接点。

禁止：

- Login / Sign up / Sign out
- Cookie Session
- Middleware / Proxy Auth Guard
- OAuth
- Password Reset
- Profile 自动创建 Trigger
- Auth RLS Policy

这些属于 WBS 8.2 / 8.3。

---

## 11. Scope F — Environment Variables

更新 `.env.example`，保留现有 Mapbox 配置，并新增：

```dotenv
# Supabase public client settings; values are project-specific.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Server-only Supabase settings. Never expose these with NEXT_PUBLIC_.
SUPABASE_URL=
SUPABASE_SECRET_KEY=

# Server-only PostgreSQL connection string.
DATABASE_URL=
```

要求：

- 只写空占位或明显假值，不写真实 key。
- `.env.local` 继续被 `.gitignore` 忽略。
- 不读取开发者已有 `.env.local` 内容并复制到文档 / Result。
- 测试错误输出不得包含 Secret。

如有环境变量校验模块，必须区分 public / server-only。

---

## 12. Scope G — Package Scripts

在 `package.json` 增加清晰命令，名称可以按仓库习惯微调，但语义必须覆盖：

```text
db:start
db:stop
db:status
db:reset
db:types
```

推荐：

```json
{
  "db:start": "supabase start",
  "db:stop": "supabase stop",
  "db:status": "supabase status",
  "db:reset": "supabase db reset",
  "db:types": "supabase gen types typescript --local > src/types/database.generated.ts"
}
```

npm script 自动解析 `node_modules/.bin`，无需写 `npx`。

可以增加：

```text
db:lint
```

前提是当前稳定 Supabase CLI 支持且本地验证通过。

禁止：

```text
db:push = drizzle-kit push
正式 db:migrate = drizzle-kit migrate
```

---

## 13. Scope H — Generated Database Types

目标文件：

```text
src/types/database.generated.ts
```

规则：

1. 真实内容由 `supabase gen types typescript --local` 生成。
2. 生成后可以提交 Git，便于 CI / 前端类型检查。
3. 不人工补业务表类型。
4. 如果 Docker 不可用，不得手工编造生成结果。
5. 若必须为了模块编译先放置极小 placeholder，应明确标记 generated-placeholder，并且 Task 不可宣称 `db:types` 验证通过；优先设计为不需要 placeholder。

---

## 14. Scope I — Tests

新增数据库基础专项测试，至少验证：

1. `package.json` 存在所需 DB packages。
2. 存在 `supabase/config.toml`。
3. 正式 Migration 目录唯一，仓库没有第二套 `drizzle/` migration history。
4. `.env.example` 使用 publishable / secret key 新命名。
5. `.env.example` 不含真实 Secret 格式。
6. DB module 不导出/引用 Client Component 可用的 Secret。
7. `src/db/index.ts` 使用 Drizzle + postgres.js，并兼容 `prepare: false`。
8. 不存在 `drizzle-kit push` / `drizzle-kit migrate` 的生产脚本。
9. 本 Task 没有新增禁止的业务表定义。
10. 现有 Mapbox / Planner / Personal Center 测试不回退。

测试应使用仓库现有 Node test 基线，不额外引入大型测试框架。

---

## 15. Docker / Local Supabase Preflight

先检查：

```bash
docker --version
docker info
```

或当前机器上已安装的 Docker-compatible runtime。

### Docker 可用

必须执行完整 DB runtime validation。

### Docker 不可用

不得：

- 安装未知系统级软件绕过；
- 修改 Docker daemon；
- 伪造 `supabase start` / `db reset` 成功；
- 连真实 Production DB 代替 Local 测试。

允许继续完成静态工程范围，并在 Result 中：

```text
Implementation: completed
DB runtime verification: Blocked — Docker unavailable
```

此时 Task 总状态不能写成完全通过数据库验收；保留准确的 Blocked / Partial Validation 说明。

---

## 16. Validation — 无 Docker 必须执行

```bash
node --version
npm --version
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present
```

并显式运行新增数据库专项测试与仓库当前真实 test suite。

如果 `npm test --if-present` 因项目没有 `test` script 而不执行测试，必须再运行现有 `node --test ...` 测试集合；不得把 “no test script” 误写成测试通过。

运行：

```bash
npm run format:check -- <本 Task 修改的可格式化文件>
```

若全仓已有格式基线异常，区分“本 Task 新增”与“既有”，不得借本 Task 大规模格式化无关文件。

---

## 17. Validation — Docker 可用时必须额外执行

```bash
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
npm run typecheck
npm run db:stop
```

并记录：

- Supabase CLI version
- Local Postgres / stack 是否成功启动
- migrations 数量及名称
- `db reset` 是否从零成功
- generated types 是否真实生成
- 是否启用了 Extension；如有，列出

`db:stop` 失败也必须报告，避免留下无法解释的本地容器状态。

---

## 18. Security Checks

执行 Git diff / repository search，确认没有提交：

```text
postgresql://真实账号:真实密码@
sb_secret_
真实 Supabase project password
JWT secret
access_token
service role legacy JWT
.env.local
```

Publishable key 虽然是 public credential，也不应把真实项目 key 提交到这个基础 Task；`.env.example` 保持空占位。

不得在日志 / Result 粘贴本地 CLI 输出中的完整 Secret。

---

## 19. Files Expected to Change

允许范围大致为：

```text
package.json
package-lock.json
.env.example
supabase/config.toml
supabase/seed.sql
supabase/migrations/**       # 仅必要基础 migration
src/db/index.ts
src/db/schema/index.ts
src/types/database.generated.ts   # 仅真实生成时
drizzle.config.ts
tests/** database foundation tests
docs/architecture/db-orm-migration-standards.md   # 仅必要同步修订
docs/architecture/db-foundation-bootstrap-plan.md
docs/project/WBS-TravelAssist.md
docs/tasks/TASK-015-a-db-orm-migration-foundation.md
docs/tasks/RESULT-TASK-015-a-db-orm-migration-foundation.md
```

若需要修改其他共享高冲突文件，必须在 Result 中逐项说明原因。

---

## 20. Explicitly Out of Scope

禁止借本 Task 实现：

- User/Profile Schema
- Supabase Auth UI / Session / Middleware
- Preference Schema
- Companion Schema
- Trip / Itinerary Schema
- Places / POI Schema
- PostGIS 业务地点数据
- Booking / External Order / Payment
- Membership / Usage
- AI conversation storage
- Realtime 业务逻辑
- Storage Bucket 业务策略
- Planner / Personal Center UI
- 真实云数据库项目创建
- Production / Staging Migration 执行
- GitHub Secrets 写入

---

## 21. WBS / Tracking Update

开始实现后：

```text
8.1 → 进行中
8.4 → 进行中
```

实现 + 所有可执行验证完成后：

```text
8.1 / 8.4 → 待审查
```

只有：

1. 实现进入 `develop`；
2. 数据库 runtime validation 在具备 Docker 的受支持环境通过；
3. 用户验收；

才允许：

```text
8.1 / 8.4 → 已完成
```

如果实现已合并但 Docker runtime validation 从未完成，不得自动写 `已完成`。

---

## 22. Result File

必须创建：

```text
docs/tasks/RESULT-TASK-015-a-db-orm-migration-foundation.md
```

至少包含：

```markdown
# TASK-015-A Result

## Status
## Base / Branch / Commits
## Issue / PR
## Installed Packages and Resolved Versions
## Supabase CLI
## Files Added / Changed
## Migration History
## Drizzle Foundation
## Environment Variable Contract
## Generated Types
## Docker Preflight
## DB Runtime Validation
## Tests
## Security / Secret Scan
## WBS Update
## Explicitly Not Implemented
## Remaining Blockers
```

任何 Blocked 项必须准确记录。

---

## 23. Commit / Push / PR

完成实现与验证后：

1. 检查：

```bash
git status --short
git diff --check
git diff --stat origin/develop...HEAD
git log --oneline --decorate -10
```

2. 创建清晰 commit。
3. Push：

```bash
git push origin feature/a-db-orm-migration-foundation
```

4. 创建：

```text
feature/a-db-orm-migration-foundation → develop
```

的 **Draft PR**。

5. PR 描述必须关联：

```text
Issue #173
TASK-015-A
WBS 8.1 / 8.4
```

6. 不自动合并。

---

## 24. Final Acceptance Checklist

### Repository

- [ ] Supabase CLI 已作为项目 dev dependency 固定。
- [ ] Drizzle ORM + postgres.js 已接入。
- [ ] `supabase/` 初始化完成。
- [ ] Migration 唯一真源规则没有第二套正式历史。
- [ ] `src/db/` foundation 完成。
- [ ] `.env.example` 使用 publishable / secret key 新命名。
- [ ] 没有真实 Secret。
- [ ] 没有新增业务表。

### Quality

- [ ] `npm ci` passed。
- [ ] lint passed。
- [ ] typecheck passed。
- [ ] build passed。
- [ ] existing tests passed。
- [ ] new DB foundation tests passed。
- [ ] changed-file formatting passed。

### Database Runtime

- [ ] Docker preflight 已真实记录。
- [ ] Docker 可用时 `db:start` passed。
- [ ] `db:reset` from zero passed。
- [ ] `db:types` real generation passed。
- [ ] `db:stop` executed。
- [ ] Docker 不可用时未伪造上述结果。

### Tracking

- [ ] Result file 完成。
- [ ] WBS 状态准确。
- [ ] Issue #173 已更新。
- [ ] Branch pushed。
- [ ] Draft PR 创建。
- [ ] 未自动 merge。

---

## 25. Stop Rule

完成 TASK-015-A 后停止。

不要自动开始：

```text
WBS 8.2 User / Profile Schema
WBS 8.3 Authentication Core
WBS 8.5 Trip Plan Schema
WBS 5.11 Preference Schema
WBS 5.12 Companion Schema
WBS 5.18 Trip Library Data Model
WBS 7.4 POI Schema
```

等待 Review / 用户验收 / 下一条明确指令。