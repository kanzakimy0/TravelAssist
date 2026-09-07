# Codex Command — TASK-015-A DB / ORM / Migration 基础工程初始化

把下面整段复制给 Codex 执行。

```text
请在 TravelAssist 仓库中完整执行 TASK-015-A：DB / ORM / Migration 基础工程初始化。

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#173
https://github.com/kanzakimy0/TravelAssist/issues/173

Task Branch:
feature/a-db-orm-migration-foundation

Base at task creation:
develop@707bcc8d2af14a86032181be63573beb3aea3e17

开始前必须执行：

git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
git ls-remote --heads origin feature/a-db-orm-migration-foundation

禁止执行：

git clean -fd
git reset --hard
git push --force
git push --force-with-lease

如果当前工作区干净且不在 Task 分支：

git switch feature/a-db-orm-migration-foundation

如果本地没有该分支：

git switch -c feature/a-db-orm-migration-foundation --track origin/feature/a-db-orm-migration-foundation

然后再次确认：

git status --short
git branch --show-current
git log --oneline -5

必须从远端完整读取 Task，不要依赖本消息摘要：

git show origin/feature/a-db-orm-migration-foundation:docs/tasks/TASK-015-a-db-orm-migration-foundation.md

必须完整读取冻结方案：

git show origin/feature/a-db-orm-migration-foundation:docs/architecture/db-foundation-bootstrap-plan.md

必须完整读取数据库总规范：

git show origin/feature/a-db-orm-migration-foundation:docs/architecture/db-orm-migration-standards.md

必须完整读取跨模块 Contract 规则：

git show origin/feature/a-db-orm-migration-foundation:docs/architecture/cross-module-contract-handoff.md

同时读取：

README.md
CONTRIBUTING.md
docs/README.md
docs/development/setup.md
.env.example
.gitignore
package.json
package-lock.json
docs/project/WBS-TravelAssist.md

并读取 GitHub Issue #173 的完整内容。

核心冻结决策：

1. Database = Supabase PostgreSQL。
2. Local DB = Supabase Local。
3. DB Schema / Migration 唯一真源 = supabase/migrations/*.sql。
4. Migration Runner = Supabase CLI。
5. Server ORM = Drizzle ORM。
6. PostgreSQL Driver = postgres / postgres.js。
7. 新项目 Supabase API key 标准 = publishable / secret keys，不再以 legacy anon / service_role 为新代码标准。
8. Production / Staging 禁止 drizzle-kit push。
9. 不维护 drizzle/ 与 supabase/migrations 两套正式 Migration 历史。
10. TASK-015-A 只搭基础设施，不提前创建业务表。

本 Task 必做：

- 安装稳定版 runtime dependencies：drizzle-orm、postgres、@supabase/supabase-js。
- 安装稳定版 dev dependencies：drizzle-kit、supabase。
- 不升级无关 Next.js / React / TypeScript / ESLint / Tailwind / Mapbox。
- 初始化 supabase/config.toml、supabase/migrations/、supabase/seed.sql。
- 不使用 supabase bootstrap 覆盖现有 Next.js App。
- 建立 src/db/index.ts、src/db/schema/index.ts、drizzle.config.ts。
- Drizzle + postgres.js 连接要兼容 Supabase Transaction Pooler：prepare: false。
- DB module 不得在 import 时主动连接远端数据库或执行 DDL。
- 普通 npm run build 不得依赖真实 DATABASE_URL 才能完成。
- 更新 .env.example，新增且仅新增占位：
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
  SUPABASE_URL=
  SUPABASE_SECRET_KEY=
  DATABASE_URL=
- 不提交真实 Supabase URL/key/password/secret/.env.local。
- 增加 package scripts：db:start / db:stop / db:status / db:reset / db:types（名称如按仓库习惯微调，语义必须一致）。
- 不增加正式 db:push = drizzle-kit push。
- 不增加正式 db:migrate = drizzle-kit migrate。
- 建立 src/types/database.generated.ts 的真实生成流程；不能生成时不得手工伪造通过。
- 新增数据库基础专项测试，验证依赖、目录、Migration 单一真源、env 命名、Secret 安全、Drizzle prepare:false、无业务表、无 drizzle migration runner。
- 更新 Task / Result / WBS / Issue tracking。
- 完成后 push feature/a-db-orm-migration-foundation，创建到 develop 的 Draft PR，不自动 merge。

明确禁止本 Task 创建这些业务表或业务 Schema：

profiles
application users
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
AI conversation storage

明确禁止实现：

Authentication / Session / Login / Sign up / OAuth
Profile 自动创建 Trigger
业务 RLS Policy
Preference / Companion persistence
Trip persistence
Places / POI business schema
Booking / payment
Planner / Personal Center UI 修改
真实 Production / Staging Supabase project 创建
GitHub Secrets 写入
Production / Staging Migration 执行

Docker / Supabase Local 预检：

docker --version
docker info
npx supabase --version

如果 Docker-compatible runtime 可用，必须真实执行：

npm run db:start
npm run db:status
npm run db:reset
npm run db:types
npm run typecheck
npm run db:stop

并记录 Supabase CLI version、Migration 数量/名称、reset 是否从零成功、generated types 是否真实生成、Extension 情况。

如果 Docker 不可用：

- 不要安装未知系统级软件；
- 不要连接 Production DB 代替 Local；
- 不要伪造 supabase start / db reset / db:types 成功；
- 继续完成静态工程范围和所有不依赖 Docker 的测试；
- Result 必须明确写：DB runtime verification: Blocked — Docker unavailable；
- 不能把 Task 写成“数据库完整验收通过”。

无论 Docker 是否可用，都必须执行：

node --version
npm --version
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present

如果 npm test --if-present 因为没有 test script 而没有真正执行测试，必须显式运行仓库当前 Node test suite和新增 DB foundation tests，不能把“没有 test script”算测试通过。

执行 changed-file format check、git diff --check，并区分既有全仓格式异常与本 Task 新问题；不要借本 Task 格式化大量无关文件。

做 Secret 扫描，确保 diff / repo 中没有真实：

postgresql://账号:密码@
sb_secret_
Supabase project password
JWT secret
access token
legacy service role JWT
.env.local

真实 publishable key 也不要在本基础 Task 提交；.env.example 保持空占位。

必须创建：

docs/tasks/RESULT-TASK-015-a-db-orm-migration-foundation.md

Result 至少包含：

Status
Base / Branch / Commits
Issue / PR
Installed Packages and Resolved Versions
Supabase CLI
Files Added / Changed
Migration History
Drizzle Foundation
Environment Variable Contract
Generated Types
Docker Preflight
DB Runtime Validation
Tests
Security / Secret Scan
WBS Update
Explicitly Not Implemented
Remaining Blockers

WBS 状态规则：

实现开始：8.1 / 8.4 → 进行中。
实现完成但等待审查：8.1 / 8.4 → 待审查。
只有进入 develop + DB runtime validation 在支持环境通过 + 用户验收后，才允许 → 已完成。

完成后停止，不要自动开始 WBS 8.2 / 8.3 / 8.5 / 5.11 / 5.12 / 5.18 / 7.4。

最终返回：

1. Status
2. Base / Branch / Commit
3. Issue / Draft PR
4. Installed package versions
5. Supabase CLI / Docker preflight
6. Files changed
7. Migration / Drizzle / env setup summary
8. DB runtime validation results
9. lint / typecheck / build / tests
10. Secret scan result
11. WBS status
12. Remaining blockers
13. Explicit statement that no business schema/auth/production DB was implemented
```
