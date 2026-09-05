# TravelAssist — DB / ORM / Migration 总体方案与全局规范

> 状态：建议冻结  
> 日期：2026-09-05  
> 适用范围：Web、后续 iOS / Android、后台任务、管理端、CI/CD  
> 数据库基础：Supabase PostgreSQL（Tokyo）  
> 认证：Supabase Auth  
> 空间能力：PostGIS

---

# 1. 最终技术决策

## 1.1 总体组合

| 层 | 采用方案 | 职责 |
|---|---|---|
| 云数据库 | Supabase PostgreSQL | 核心业务数据 |
| DB Schema 真源 | `supabase/migrations/*.sql` | 数据库结构唯一历史 |
| Migration 工具 | Supabase CLI | 创建、验证、执行 Migration |
| ORM / Query Builder | Drizzle ORM | Server 端类型安全 SQL |
| Browser / 用户态访问 | `@supabase/supabase-js` | 携带用户 JWT，执行 RLS |
| Auth | Supabase Auth | 登录、Session、JWT |
| Authorization | PostgreSQL RLS | 数据库级用户权限 |
| 地理空间 | PostGIS | POI、区域、距离、空间检索 |
| 数据库类型 | Supabase generated types + Drizzle schema | 应用类型安全 |
| 本地数据库 | Supabase Local | 本地开发及 Migration 验证 |
| 生产变更 | CI/CD 执行 Migration | 禁止生产库人工改 Schema |

---

# 2. 核心原则

## DB-ORM-001：数据库 SQL 是最终事实

数据库最终状态由：

```text
supabase/migrations/*.sql
```

完整重放后得到。

禁止出现：

```text
Drizzle Schema 是一份
Supabase Dashboard 是一份
生产数据库又是一份
```

的三套状态。

任何数据库结构变化都必须最终落实为 Git 中的 SQL Migration。

---

# 3. 为什么采用 Drizzle，而不是 Prisma 作为主 ORM

TravelAssist 使用：

- PostgreSQL
- Supabase
- RLS
- PostGIS
- PostgreSQL Function
- Trigger
- View / Materialized View
- JSONB
- SQL Transaction
- 复杂地理查询

因此 ORM 必须尽量贴近 PostgreSQL，而不是隐藏 PostgreSQL。

Drizzle 的定位更适合：

```text
TypeScript
   ↓
Drizzle
   ↓
接近原生 PostgreSQL SQL
```

优势：

1. SQL 心智模型清晰。
2. 类型安全。
3. 对 PostgreSQL 原生能力限制较少。
4. Serverless / Next.js 场景较轻。
5. 复杂 SQL 可以自然退回原生 SQL。
6. 不要求 Prisma Schema 成为数据库唯一真源。

---

# 4. Drizzle 的职责边界

## Drizzle 负责

- Server Component / Server Action 查询
- API Route 查询
- 后台任务
- 推荐系统数据读取
- AI 行程生成前的数据聚合
- 管理端复杂查询
- Transaction
- 批量写入
- 类型安全 Query Builder

例如：

```text
用户生成行程
    ↓
Server API
    ↓
Drizzle Transaction
    ↓
trips
trip_days
itinerary_items
trip_members
```

## Drizzle 不负责

Drizzle **不得成为 Migration 唯一真源**。

以下内容以原生 PostgreSQL SQL Migration 管理：

- RLS Policy
- PostgreSQL Function
- Trigger
- Extension
- PostGIS
- View
- Materialized View
- Constraint
- Partial Index
- GIN / GiST Index
- Database Role / Grant
- Security Definer Function
- 数据修复 Migration

---

# 5. Supabase Client 与 Drizzle 的使用边界

## 用户态请求

浏览器 / 手机 App：

```text
User
 ↓
Supabase Auth JWT
 ↓
supabase-js
 ↓
PostgREST
 ↓
RLS
 ↓
PostgreSQL
```

适合：

- 查看自己的行程
- 查看共享行程
- 更新个人偏好
- 收藏地点
- 简单 itinerary 更新
- Realtime

用户身份权限必须由 RLS 判断。

## 服务端可信逻辑

```text
Next.js Server
 ↓
Drizzle
 ↓
PostgreSQL
```

适合：

- AI 生成完整行程
- 多表 Transaction
- 后台同步
- 数据聚合
- 管理任务
- Usage 计数
- 支付 webhook
- 外部订单同步

注意：

> Server DB Connection 属于可信后端权限，不得把数据库连接字符串发送至客户端。

---

# 6. Repository 推荐结构

```text
TravelAssist/
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/
│  │  ├─ 20260905000100_init_extensions.sql
│  │  ├─ 20260905000200_create_profiles.sql
│  │  ├─ 20260905000300_create_trips.sql
│  │  ├─ 20260905000400_create_trip_members.sql
│  │  └─ ...
│  └─ seed.sql
│
├─ src/
│  ├─ db/
│  │  ├─ index.ts
│  │  ├─ schema/
│  │  │  ├─ profiles.ts
│  │  │  ├─ trips.ts
│  │  │  ├─ itinerary.ts
│  │  │  ├─ bookings.ts
│  │  │  └─ index.ts
│  │  └─ queries/
│  │
│  ├─ lib/
│  │  └─ supabase/
│  │     ├─ browser.ts
│  │     ├─ server.ts
│  │     └─ admin.ts
│  │
│  └─ types/
│     └─ database.generated.ts
│
├─ drizzle.config.ts
└─ package.json
```

---

# 7. Migration 唯一真源

## DB-MIG-001

所有数据库 Schema 变更必须通过：

```text
supabase/migrations/
```

提交到 Git。

Migration 文件必须：

- 可审查
- 可重放
- 有顺序
- 不可静默修改历史
- 与业务代码一起进入 PR

---

# 8. Migration 命名规范

格式：

```text
YYYYMMDDHHMMSS_description.sql
```

例如：

```text
20260905161000_create_profiles.sql
20260905161500_create_trips.sql
20260905162500_add_trip_status.sql
20260905164000_add_trip_members_rls.sql
```

description：

- 全小写
- snake_case
- 使用动词
- 描述单一意图

推荐：

```text
create_trips
add_trip_status
create_trip_members
add_trip_members_rls
create_places_gist_index
```

禁止：

```text
update.sql
fix.sql
new.sql
final.sql
test.sql
changes.sql
```

---

# 9. 一 Migration 一主要意图

推荐：

```text
create_trips.sql
```

包含：

- trips table
- 本表 constraint
- 本表基础 indexes

然后：

```text
add_trips_rls.sql
```

处理：

- enable RLS
- policies

复杂功能应拆开。

这样 PR Review 时能够明确判断数据库变化。

---

# 10. Migration 不允许修改历史

一旦 Migration：

```text
已经进入 develop
```

或者：

```text
已经在共享数据库执行
```

就视为不可修改。

错误修复必须：

```text
旧 migration
     ↓
新的 corrective migration
```

例如：

```text
20260905150000_create_trips.sql
20260906110000_fix_trips_status_constraint.sql
```

禁止回头修改旧 Migration。

---

# 11. 禁止 Dashboard 手工修改生产 Schema

生产 Supabase Dashboard 中禁止直接：

- Create Table
- Add Column
- Delete Column
- 改 Constraint
- 改 Index
- 改 RLS
- 创建 Function
- 修改 Trigger

允许 Dashboard 用于：

- 查看数据
- 查询诊断
- Logs
- Performance
- 临时只读分析

如果确实紧急修改：

1. 记录修改内容。
2. 立即创建对应 Migration。
3. Git 中恢复数据库历史完整性。
4. PR 记录 Hotfix 原因。

---

# 12. 开发数据库环境

至少区分：

```text
Local
Staging
Production
```

推荐：

| 环境 | 用途 |
|---|---|
| Local | Codex / 开发人员本机 |
| Staging | PR 合并后集成验证 |
| Production | 正式用户 |

禁止开发人员直接连 Production 写数据。

---

# 13. Migration 标准开发流程

```text
develop
   ↓
创建 feature branch
   ↓
supabase migration new xxx
   ↓
编辑 SQL
   ↓
本地 reset
   ↓
执行全部 migrations
   ↓
测试
   ↓
更新 Drizzle schema / generated types
   ↓
lint
typecheck
test
build
   ↓
PR
   ↓
CI Migration Check
   ↓
Merge develop
   ↓
Staging Apply
   ↓
验证
   ↓
Production Deploy
```

---

# 14. 本地必须验证“从零重建”

Migration 完成后必须能够执行：

```bash
supabase db reset
```

并成功从空数据库通过全部 migrations 和 seed 重建当前正确 schema。

如果只能在开发人员当前数据库执行成功，而无法从零 reset，Migration 不合格。

---

# 15. 禁止生产使用 `drizzle-kit push`

`drizzle-kit push` 可用于个人临时实验数据库，但 TravelAssist 规定：

> Staging / Production 禁止使用 `drizzle-kit push`。

原因：会绕开 SQL Migration Review、造成环境漂移，并且无法完整承担 RLS / Function / PostGIS 等数据库设计的版本历史。

---

# 16. Drizzle Migration 策略

不使用 `drizzle-kit migrate` 作为项目正式 Migration Runner，也不维护第二套 `drizzle/` Migration 历史。

正式 Migration：

```text
Supabase CLI
+
supabase/migrations
```

Drizzle 只是应用查询层，避免 Supabase Migration 与 Drizzle Migration 双历史冲突。

---

# 17. Drizzle Schema 同步原则

每次 SQL Schema Migration 后，如果影响 ORM：

```text
SQL Migration
     ↓
Drizzle Schema 更新
     ↓
Typecheck
```

两者必须在同一个 PR 完成。

---

# 18. Supabase Generated Types

维护：

```text
src/types/database.generated.ts
```

用于 Supabase Browser Client、Server Client、RPC 及 Row / Insert / Update 类型。

生成文件不得人工编辑。

---

# 19. Schema Drift 检查

CI 逐步加入 Drift 检查：Repository migrations 创建临时 PostgreSQL，执行全部 migrations 后验证最终 schema。

目标：Git 中 migrations 可以独立构造完整数据库，不能依赖开发者曾在 Dashboard 上进行过的操作。

---

# 20. Transaction 规范

以下场景必须使用数据库 Transaction：

- 创建行程：trip + owner member + trip_days + itinerary_items
- 订单关联：booking + booking_items + commission_tracking
- AI 多日重排行程

任何一步失败，整个业务修改单元 rollback。

---

# 21. Migration 中的数据修改规范

Schema Migration 和大规模 Data Migration 尽量分离。

例如：

```text
01_add_column.sql
02_backfill_column.sql
03_add_not_null.sql
```

避免把高风险 DDL 与大批量 UPDATE 混在一个 Migration 中。

---

# 22. 新增 NOT NULL 字段规范

生产已有数据时优先：新增 nullable → backfill → 验证 → SET NOT NULL，或提供安全 default。

---

# 23. 删除字段规范

字段删除采用两阶段：Release A 让应用停止读取旧字段；Release B 再删除旧字段。后续手机 App 上线后必须考虑旧版本客户端仍可能存在。

---

# 24. Rename 字段规范

生产系统采用 Expand / Contract：新增新字段 → 双写/迁移 → 应用切换 → 观察 → 删除旧字段。

---

# 25. Index Migration 规范

核心业务表必须评估 FK index、排序 index、composite index、partial index、GIN、GiST。地图地点使用 PostGIS 时评估 GiST index。

---

# 26. RLS Migration 规范

涉及私人数据的新表默认 RLS ON，并在建表阶段明确 SELECT / INSERT / UPDATE / DELETE 权限。

---

# 27. RLS 默认拒绝

权限模型采用 default deny。Trip 等共享对象根据 `trip_members` 的 Owner / Editor / Viewer 角色放行。

---

# 28. Service Role 规范

Service Role 只能存在 Server，禁止 Browser / Mobile / `NEXT_PUBLIC_` / 日志 / Git。使用 Service Role 的代码必须自行做授权检查，因为它属于可信后端权限。

---

# 29. Database Connection 规范

至少区分：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
```

只有 `NEXT_PUBLIC_*` 可进入浏览器；Service Role 与 DATABASE_URL 绝不能进入客户端。

---

# 30. 时间规范

数据库使用 `timestamptz` 并以 UTC 保存；展示时转换为用户/目的地时区。行程业务必须区分用户本地时间、目的地时间与 UTC。

---

# 31. 金额规范

禁止 float / double。推荐：

```text
amount_minor bigint
currency char(3)
```

按最小货币单位保存金额。

---

# 32. ID 规范

业务主键统一优先 UUID，推荐 `gen_random_uuid()`。

---

# 33. Foreign Key 规范

所有核心逻辑关系尽量建立真实 FK，不依赖应用代码单独保证一致性。

---

# 34. ON DELETE 规范

必须显式设计。行程明细可按业务采用 cascade；订单、财务、佣金、支付记录通常不得因用户删除而级联消失。

---

# 35. Soft Delete

需要恢复或保留业务历史的对象使用 `deleted_at timestamptz nullable`。避免同时存在多套删除状态表达。

---

# 36. Audit 字段

核心表统一使用：

```text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

支付、订单、权限变更需单独 Audit Log。

---

# 37. Enum 使用原则

稳定状态可考虑 PostgreSQL enum；快速变化业务优先 `text + check constraint`，降低后期 Migration 成本。

---

# 38. JSONB 使用原则

适合第三方 API 原始响应、AI metadata、扩展属性；不适合 user_id、trip_id、日期、金额、核心状态等需要高频查询和约束的字段。

---

# 39. Seed 规范

`supabase/seed.sql` 仅存本地开发基础数据、Master Data 和测试 mock。禁止真实用户数据、API Key、支付敏感数据和个人信息。

---

# 40. Master Data Migration

交通方式代码、景点分类、旅行偏好分类、权限代码等系统级稳定数据可纳入 Migration / Seed 版本管理，并明确与 User Data 的边界。

---

# 41. CI 必须检查

最终至少执行：

```text
npm run lint
npm run typecheck
npm run build
supabase start
supabase db reset
数据库测试
RLS 测试
```

后续增加 Migration lint、Schema drift、pgTAP / DB tests。

---

# 42. Migration Review Checklist

- [ ] Migration 是否可从零建立？
- [ ] 是否修改已有 Migration？
- [ ] 是否可能丢数据？
- [ ] 是否可能长时间锁表？
- [ ] FK 是否正确？
- [ ] Index 是否充分？
- [ ] RLS 是否开启？
- [ ] Policy 是否过宽？
- [ ] Service Role 是否被误用？
- [ ] Drizzle Schema 是否同步？
- [ ] Supabase Types 是否更新？
- [ ] 是否影响旧版 App？
- [ ] 是否需要 Backfill？
- [ ] 是否有 Roll-forward 修复策略？

---

# 43. Rollback 总体策略

生产数据库不以自动 down migration 为主要恢复方式，优先 Forward Fix：创建新的修复 Migration。包含用户数据、订单、支付的数据库变化简单回滚可能造成二次损失。

---

# 44. 高风险 Migration

以下属于高风险：DROP TABLE、DROP COLUMN、ALTER TYPE、SET NOT NULL、大型 UPDATE/DELETE、修改 PK/FK、修改 RLS、修改支付/订单结构。必须特别 Review。

---

# 45. Migration 与应用发布顺序

遵守：数据库向后兼容变化 → 应用新版本 → 稳定运行 → 删除旧 Schema，即 Expand / Migrate / Contract。

---

# 46. Codex 开发规则

Codex 涉及数据库的 Task 必须：

1. 读取本规范。
2. 不直接修改远端 Production DB。
3. Schema 改动创建 Migration。
4. Migration 进入 Git。
5. 本地执行 `supabase db reset`。
6. 同步 ORM Schema。
7. 同步 generated DB types。
8. 执行 lint / typecheck / build / DB tests。
9. PR 列出 Migration 名称。
10. 明确是否存在 destructive change。

---

# 47. 禁止事项汇总

```text
❌ Production Dashboard 手工改 Schema
❌ Production 使用 drizzle-kit push
❌ 同时维护 Supabase Migration + Drizzle Migration 两套历史
❌ 修改已执行 Migration
❌ 浏览器持有 DATABASE_URL
❌ 浏览器持有 Service Role
❌ 私人业务表不开 RLS
❌ Schema 变化不进 Git
❌ Migration 不做本地 reset 测试
❌ 大规模数据迁移与高风险 DDL 随意混合
❌ 删除字段后马上发布仍依赖旧字段的应用
```

---

# 48. 最终架构

```text
                   Git Repository
                         │
               supabase/migrations
                         │
                    唯一 DB 历史
                         │
               ┌─────────┴─────────┐
               ↓                   ↓
         Local Supabase       CI / Staging / Prod
               │                   │
               └─────────┬─────────┘
                         ↓
                  PostgreSQL/PostGIS
                    ↑           ↑
                    │           │
             Supabase API     Drizzle ORM
               + RLS           Server only
                    ↑           ↑
                    │           │
             Browser / App   Next.js Server
```

---

# 49. 冻结决策

## DB-002 — ORM

> TravelAssist 服务端 ORM / Query Builder 采用 **Drizzle ORM**。Drizzle 只负责应用查询和类型安全，不作为数据库 Migration 的唯一真源。用户态浏览器及手机 App 主要通过 Supabase Client + JWT + RLS 访问数据库。

## DB-003 — Migration

> TravelAssist 数据库 Migration 统一使用 **Supabase CLI + `supabase/migrations/*.sql`**。SQL Migration 是数据库 Schema 和数据库历史的唯一真源。禁止生产环境使用 `drizzle-kit push`，禁止同时维护 Drizzle Migration 与 Supabase Migration 两套正式历史。

## DB-004 — Migration Workflow

> 所有数据库修改必须经过 Feature Branch → SQL Migration → Local Reset → ORM/Type 同步 → CI → PR Review → Staging → Production。已经进入共享环境的 Migration 不得修改，只允许通过新的 Forward Migration 修复。

## DB-005 — Compatibility

> 数据库结构变更默认采用 Expand / Migrate / Contract，保证 Web 与未来旧版手机 App 的向后兼容。破坏性删除、Rename、NOT NULL、高风险 RLS 修改必须拆分执行并经过专项 Review。

---

# 50. 下一阶段

在本规范冻结后，应依次制定：

1. Database Schema v0.1
2. Auth / Profile Schema
3. Trip / Trip Member Schema
4. RLS 权限矩阵
5. Itinerary Schema
6. Place / PostGIS Schema
7. Membership / Usage Schema
8. Booking / External Order Schema
9. Audit / Notification Schema
10. DB Test / Migration CI 规范
