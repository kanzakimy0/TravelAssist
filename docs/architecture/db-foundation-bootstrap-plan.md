# TravelAssist — Database Foundation Bootstrap Plan v1.0

> 状态：**已冻结 / Frozen**  
> 冻结日期：2026-09-07  
> Owner：A / Shared Infrastructure  
> 对应 WBS：8.1 / 8.4  
> 对应 Task：TASK-015-A / Issue #173  
> 基线设计：`docs/architecture/db-orm-migration-standards.md`

---

## 1. 目的

本文件把已有的《DB / ORM / Migration 总体方案与全局规范》从“建议冻结”推进到可执行的工程基线，并明确 TASK-015-A 只负责数据库基础设施，不提前实现业务 Schema。

TravelAssist 不采用“开发者登录数据库后台，一张表一张表手工创建”的开发方式。

数据库结构必须由 Git 中的 SQL Migration 重建；本地、Staging、Production 应从同一 Migration 历史演进。

---

## 2. 冻结结论

| 层 | 冻结方案 | 说明 |
| --- | --- | --- |
| Hosted Database | Supabase PostgreSQL | 生产区域优先 Tokyo；真实项目由项目 Owner 创建 |
| Local Database | Supabase Local | 本地开发与 Migration Reset 验证 |
| Schema 真源 | `supabase/migrations/*.sql` | 唯一正式数据库历史 |
| Migration Runner | Supabase CLI | 不维护第二套正式 Migration 历史 |
| Server ORM | Drizzle ORM | 类型安全 Query Builder，不是 Migration 真源 |
| PostgreSQL Driver | `postgres` / postgres.js | 与 Drizzle 连接；Pooler Transaction 模式关闭 prepared statements |
| Browser / Mobile Data | Supabase Data API + RLS | 后续业务 Task 接入 |
| Authentication | Supabase Auth | WBS 8.3，不在 TASK-015-A 实现 |
| Next.js SSR Auth Helper | `@supabase/ssr` | WBS 8.3 再接入 Cookie / Session；本 Task 不提前实现 |
| Spatial | PostGIS | 后续 POI / Places Schema 使用 |
| Generated Types | Supabase generated TypeScript types | 自动生成，不人工编辑 |
| Production Schema Change | CI/CD + reviewed SQL Migration | 禁止 Dashboard 作为正式 Schema 编辑入口 |

---

## 3. 2026-09-07 API Key 规则修订

已有基线设计中的 `anon` / `service_role` 环境变量命名属于 Supabase legacy key 体系。Supabase 已宣布 legacy `anon` / `service_role` keys 将于 2026 年底弃用，因此 TravelAssist 新工程从现在开始使用 publishable / secret key 命名。

### 新项目标准变量

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_SECRET_KEY=
DATABASE_URL=
```

规则：

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 可以进入 Browser / Mobile bundle，但权限必须由 RLS 限制。
- `SUPABASE_SECRET_KEY` 只能存在可信后端，永远不得进入 Browser、Mobile、Git、日志或 `NEXT_PUBLIC_*`。
- `DATABASE_URL` 只能存在可信后端 / Migration / CI Secret。
- Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 不作为新代码标准。
- 如果未来接入的既有 Supabase 项目仍仅提供 legacy keys，应单独做兼容迁移 Task；不得在 TASK-015-A 中硬编码兼容逻辑。

本节在环境变量命名方面优先于 `db-orm-migration-standards.md` 中旧的 legacy key 示例；其余数据库原则仍以原规范为准。

---

## 4. TASK-015-A 的工程目标

完成后仓库应至少具备：

```text
TravelAssist/
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/
│  └─ seed.sql
├─ src/
│  ├─ db/
│  │  ├─ index.ts
│  │  └─ schema/
│  │     └─ index.ts
│  └─ types/
│     └─ database.generated.ts
├─ drizzle.config.ts
├─ .env.example
├─ package.json
└─ package-lock.json
```

注意：`src/db/schema/index.ts` 在本 Task 中只建立模块边界，不得为了“看起来完整”而创建 User、Profile、Preference、Companion、Trip、Itinerary、POI、Booking 等业务表。

---

## 5. 包与职责边界

### Runtime dependencies

```text
drizzle-orm
postgres
@supabase/supabase-js
```

### Development dependencies

```text
drizzle-kit
supabase
```

执行时由 npm 解析当前稳定且与项目 Node / TypeScript 基线兼容的版本，并把实际解析版本锁入 `package-lock.json`。不得使用 beta / rc 版本，除非现有稳定版无法与项目基线兼容且 Task Result 明确说明原因。

### 本 Task 暂不安装 / 暂不接入

`@supabase/ssr` 的 Cookie / Session 实现属于 WBS 8.3 Authentication Core。若作为依赖预装没有明确工程必要性，则留到 8.3 再安装，避免 TASK-015-A 越界。

---

## 6. Drizzle 连接规则

Server 端使用 `postgres` / postgres.js 与 Drizzle。

生产 / Staging 如果使用 Supabase Transaction Pooler：

```ts
postgres(connectionString, { prepare: false })
```

原因是 Transaction Pool 模式不支持 prepared statements。

数据库模块必须满足：

1. 仅 Server 可导入真实数据库连接。
2. `DATABASE_URL` 不存在时，项目普通 `lint` / `typecheck` / `build` 不应因为模块顶层立即连接远端数据库而失败。
3. 不在模块 import 时自动执行 Migration、DDL 或网络探测。
4. 连接生命周期要适合 Next.js / serverless 场景，后续可在真实 API Task 中完善 pooling 策略。

---

## 7. Supabase CLI 与本地环境

Supabase CLI 作为项目 dev dependency 固定在仓库中，通过：

```bash
npx supabase <command>
```

调用。

本地完整 Supabase stack 需要 Docker-compatible runtime。

TASK-015-A 应建立以下脚本或等价稳定命令：

```text
db:start
db:stop
db:status
db:reset
db:types
```

推荐语义：

```bash
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
npm run db:stop
```

禁止增加：

```text
db:push -> drizzle-kit push
db:migrate -> drizzle-kit migrate
```

作为正式数据库工作流。

---

## 8. Migration 初始边界

TASK-015-A 可以初始化 `supabase/migrations/`，但不应提前创建业务表。

允许内容：

- 为验证 Migration 管道所需的最小基础 Migration；
- 明确需要并可在 Supabase Local 重放的基础 Extension 初始化；
- 完全幂等、无业务数据、无用户数据的 bootstrap SQL。

若没有必要的基础 DDL，不要求为了产生文件而制作无意义 Migration。

PostGIS 等 Extension 的真实启用必须以 Local Supabase 可重放验证为准，不得仅凭假设提交无法执行的 SQL。

---

## 9. Generated Types

`src/types/database.generated.ts` 是自动生成物：

- 生成命令必须写入 package script 或文档；
- 文件头应标明 generated / do not edit；
- 不得手工伪造业务表类型；
- Schema 变化后必须重新生成；
- 后续 Supabase Browser / Server Client 以此提供数据库类型。

如果执行环境没有 Docker，无法从 Local Supabase 生成真实类型，则不得手工假装生成成功；应在 Result 中明确 runtime verification blocked，并保留可执行命令。

---

## 10. `.env.example` 冻结内容

只允许提交占位变量，不提交真实 Secret：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_SECRET_KEY=
DATABASE_URL=
```

可以保留当前 Mapbox 等既有变量。

`.env.local`、真实 URL、数据库密码、Publishable/Secret key 均不得由 Codex 提交。

---

## 11. 环境分层

```text
Local
  ↓ migrations
Staging
  ↓ same migrations
Production
```

- Local：Codex / 开发者本机，允许 reset。
- Staging：集成验证，不允许 Dashboard 漂移。
- Production：只通过审核后的 Migration 前进。

TASK-015-A **不创建远端 Staging / Production Supabase Project**。真实云项目创建属于项目 Owner 的一次性管理动作，后续把 Secret 配置到部署平台 / GitHub Secrets；不进入仓库。

---

## 12. 验证基线

### 无 Docker 也必须通过

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

并运行本 Task 新增的静态 / 单元测试。

### Docker 可用时额外必须通过

```bash
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
npm run db:stop
```

不得把“机器没有 Docker”误写为测试成功。

---

## 13. 明确禁止

- 手工在 Production Dashboard 建正式表后不写 Migration。
- 使用 `drizzle-kit push` 修改 Staging / Production。
- 同时维护 `supabase/migrations` 与 `drizzle/` 两套正式 Migration 历史。
- 提交真实 `DATABASE_URL`、DB Password、Supabase Secret Key。
- 把 Secret 放进 `NEXT_PUBLIC_*`。
- 在 TASK-015-A 创建任何业务 Domain Schema。
- 因为本地 Docker 不可用而跳过说明或伪造 DB Reset 结果。

---

## 14. 后续顺序

完成 TASK-015-A 后，数据库相关工作按 WBS 继续：

```text
8.1 / 8.4 Database Foundation
        ↓
8.2 User / Profile Schema      ← B
8.3 Authentication Core       ← B
        ↓
5.11 Preference Schema        ← B
5.12 Companion Schema         ← B
5.18 Trip Library Data Model  ← B
        ↓
8.5 Main Trip Plan Schema     ← A
7.4 POI / Place Schema        ← A
```

跨模块表和 Contract 必须继续遵守 `docs/architecture/cross-module-contract-handoff.md`。

---

## 15. 参考

- Supabase CLI: https://supabase.com/docs/guides/local-development/cli/getting-started
- Supabase + Drizzle: https://supabase.com/docs/guides/database/drizzle
- Supabase API Keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase Next.js SSR Auth: https://supabase.com/docs/guides/auth/server-side
- Drizzle PostgreSQL: https://orm.drizzle.team/docs/get-started-postgresql

---

## 16. Freeze Record

本文件确认以下决策在 TASK-015-A 及其直接后续数据库 Task 中视为冻结：

1. Supabase PostgreSQL。
2. Supabase SQL Migration 是唯一数据库历史。
3. Drizzle 是 Server Query Layer，不是正式 Migration Runner。
4. Local / Staging / Production 分离。
5. 新项目采用 Supabase Publishable / Secret API Keys，不再以 legacy anon / service_role 为标准。
6. 生产 Schema 禁止依赖手工 Dashboard 修改。
7. TASK-015-A 只搭基础，不提前设计业务表。

需要改变以上任一项时，必须建立新的 Architecture Decision / Task，不得由 Codex 在实现中自行更换技术栈。