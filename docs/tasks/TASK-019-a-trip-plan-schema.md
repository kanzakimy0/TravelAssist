# TASK-019-A — 主系统 Trip Plan Schema

## Metadata

- Task ID: `TASK-019-A`
- WBS: `8.5`
- Owner: `A`
- Responsibility: `Main Travel System / Trip Plan Persistence`
- Priority: `P0`
- Status: `待验收 / implementation and Local DB verified; Draft only`
- GitHub Issue: `#226` (Open)
- Implementation Commit: PENDING
- Pull Request: PENDING (Draft → develop)
- Result: `docs/tasks/RESULT-TASK-019-a-trip-plan-schema.md`
- Spec branch: `task/a-trip-plan-schema`
- Planned implementation branch: `codex/a-trip-plan-schema`
- Authoring base: `develop@74bc3cccf8bcfd603706e2b96d4072076191f308`
- Depends on:
  - `WBS 4.17 / TASK-WBS-4.17-A` 已完成并合入 `develop`，PR #216 merge `ec9b06240040881b6fdc249bf0967f820ac2406b`
  - `WBS 8.1 / TASK-015-A` 已完成并合入 `develop`，PR #186 merge `24dff4e3b74dfe01c369d2c149d37eba86ad6472`
- Related but separately owned:
  - `TASK-017-B / #207 / Draft PR #221`：B 的 Preference / Trip Draft persistence；不得从该 Draft 分支叠加，不得复制或改写其表语义
  - `WBS 5.18 / 5.19`：B 的保存行程 / 历史 / 草稿及公开保存读取 Contract
  - `WBS 4.20–4.24`：B 的 TravelAssist Engine
  - `WBS 7.4 / 7.5`：A 的 POI / Route Schema，尚未完成

## Objective

在已冻结的 Trip Plan Contract v1 与 Supabase/PostgreSQL/Drizzle 基础上，建立 A 主系统正式的 Trip Plan 数据库模型，使当前 Planner / Detail 的浏览器状态能够拥有可验证、可版本控制、可由后续 API / Engine / Saved Trips 消费的服务器持久化基础。

本 Task 只建立 **A 拥有的正式 Trip / Plan / Day / Itinerary Item 主模型及其数据库投影**，不提前实现 B 的 Trip Draft / Preference / Saved Trips，不接 AI、真实 Route/POI Provider、Booking/Payment 或 Planner UI。

目标边界：

```text
A Trip Plan Contract v1
        ↓
DB projection / transaction
        ↓
public.trips
public.trip_plans
public.trip_days
public.itinerary_items
        ↓
RLS + revision/CAS + typed repository
        ↓
read back as TripPlanSnapshotV1
```

## Canonical Sources

执行前必须读取：

- `CONTRIBUTING.md`
- `AGENTS.md`
- `docs/development/task-tracking.md`
- `docs/project/WBS-TravelAssist.md`
- `docs/architecture/db-orm-migration-standards.md`
- `docs/architecture/cross-module-contract-handoff.md`
- `docs/architecture/trip-plan-data-ai-takeover.md`
- `docs/tasks/TASK-WBS-4.17-a-trip-plan-contract.md`
- `docs/tasks/RESULT-WBS-4.17-a-trip-plan-contract.md`
- `src/shared/contracts/trips/index.ts`
- `src/shared/contracts/trips/validation.ts`
- `src/shared/contracts/trips/fixtures.ts`
- 当前 `supabase/migrations/**`
- 当前 `src/db/schema/**`
- 当前 `src/types/database.generated.ts`
- `TASK-017-B / #207 / PR #221` 的最新状态和变更文件，仅用于边界检查

若文档与已合并 4.17 Contract 冲突，以 `src/shared/contracts/trips/**` + 已合并 4.17 Task/Result + DB 全局规范为最高优先级。不得根据 Planner 私有 Store 反向发明第二套公开 Schema。

## Start Gate / Git Rules

开始前必须执行并记录：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

并验证：

1. `origin/develop` 包含 PR #216 的 4.17 merge。
2. `origin/develop` 包含 PR #186 的 DB foundation merge。
3. 当前工作树干净；若用户工作区已有未提交内容，禁止覆盖、删除、清理。
4. 从最新 `origin/develop` 建立独立 Worktree / 分支 `codex/a-trip-plan-schema`。
5. 不从 TASK-017-B / PR #221 的 feature branch、Planner 历史分支或旧 DB 分支叠加。

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

实现分支使用 `codex/**`，避免仓库既有 `feature/**` 自动化把实现误合并。最终 PR 必须是 Draft，等待用户验收。

## Cross-Module Conflict Guard

`TASK-017-B / PR #221` 当前拥有或计划拥有以下 B 数据：

```text
travel_preferences
trip_drafts
trip_preference_snapshots
trip_preference_overrides
```

本 Task：

- 不创建同名表。
- 不修改上述表的语义、RLS、trigger、Drizzle mirror 或 API。
- 不把 `trip_drafts` 当正式 Trip Plan 表。
- 不将长期 Preference 或 Trip Preference Snapshot 复制到 A Trip Plan 表中。
- 不把 B 的 `creation_key`、draft progress、preference revision 当 A 主模型主键。
- 不要求 PR #221 先合并，也不得 cherry-pick #221。

如果 PR #221 在 TASK-019-A 执行期间合入 `develop`：

1. 在最终交付前安全整合最新 `origin/develop`。
2. 保留 B migration 原样。
3. 重新执行 `db:reset` / `db:types` / Local RLS 与全仓回归。
4. 只解决共享 `src/db/schema/index.ts`、generated types、WBS 等必要整合，不改 B 业务实现。

如果 #221 仍为 Draft：TASK-019-A 可独立完成，但 Result 必须记录该并行状态及未来 integration gate。

## Required Database Model

### 1. `public.trips`

至少表达 4.17 Contract 中 Trip 级事实：

- `id uuid primary key`
- `owner_user_id uuid not null references auth.users(id)`
- `title`
- `status`
- `default_timezone`
- `active_plan_id`（可空；必须保证属于同一 Trip）
- `revision >= 1`
- `created_at`
- `updated_at`

要求：

- `owner_user_id` 不可在普通更新中迁移。
- Trip ID 不可更新。
- `active_plan_id` 不得指向其他 Trip 的 plan。
- status 使用 forward-compatible text/code 语义；不得因为未来新增状态导致整库不可读。对当前已知状态可提供文档/应用层 helper，但避免把 Contract 的 unknown fallback 破坏掉。
- timezone 必须是 Contract 可接受的 IANA timezone；DB 至少做非空/长度/基础约束，完整语义以 Contract/runtime validator 为准。

### 2. `public.trip_plans`

至少：

- `id uuid primary key`
- `trip_id uuid not null`
- `title`
- `revision >= 1`
- `created_at`
- `updated_at`

要求：

- Plan 必须只属于一个 Trip。
- Plan ID / trip_id 不可普通迁移。
- revision 支持 stale-write detection / CAS 语义。
- 一个 Trip 可有多个 Plan；active plan 由 `trips.active_plan_id` 指向。

### 3. `public.trip_days`

至少：

- `id uuid primary key`
- `plan_id uuid not null`
- `day_number`
- `local_date`
- `timezone`
- `created_at`
- `updated_at`

要求：

- `(plan_id, day_number)` 唯一。
- 同一 Plan 中 Day ID 唯一。
- `day_number >= 1`。
- local date 使用 `date`，不能以 UTC instant 代替。
- timezone 独立保存，支持跨时区 / 国际日期变更场景。

### 4. `public.itinerary_items`

必须同时支持 scheduled items 与 alternatives，且不建立第二套 item 表。至少：

- `id uuid primary key`
- `day_id uuid not null`
- `bucket / placement`：`scheduled | alternative`
- `position / sort_order`
- `kind`
- `title`
- Place snapshot / reference 最小字段：
  - opaque place/provider reference 可空
  - display name 可空/按 Contract 语义
  - latitude / longitude 可空
- Schedule：
  - `start_at timestamptz` 可空
  - `end_at timestamptz` 可空
  - `start_timezone` 可空
  - `end_timezone` 可空
- `lock_level`
- `assessment`
- Booking fact only：
  - `booking_status`
  - `booking_reference_id` 可空
  - `booking_verified_at` 可空
- `created_at`
- `updated_at`

必须保持 4.17 语义：

- alternative 不是第二套行程历史，只是同 Day 的候选项。
- `confirmed` booking 必须有 reference + verified time；但本 Task 不创建 Booking 业务表。
- Booking status 与 assessment / lockLevel 相互独立。
- 不伪造 Provider / POI / Route FK；因为 7.4 / 7.5 尚未完成。
- 当前没有正式 POI 表时，只保存 Contract 所需的 opaque reference / place snapshot，不建立临时 POI 主表。
- 当前没有正式 Route Schema 时，不创建 `routes` / `route_segments` 临时主表。

## ID / Ownership / Foreign-Key Rules

- 数据库实体主键使用 UUID。
- 公开 Contract 仍将 ID 作为 opaque string 消费；DB adapter 负责 UUID ↔ string 边界。
- 所有 child rows 必须不能跨 Trip 串联。
- FK delete 行为必须明确且测试：删除 owner account 后 Trip 数据可安全清理；删除 Plan / Day 时 child 行为符合设计。
- 不允许通过仅知道 child UUID 绕过 Trip ownership。

## Revision / Concurrency Rules

必须实现并测试：

- `trips.revision` 从 1 开始。
- `trip_plans.revision` 从 1 开始。
- stale revision 写入必须失败，不能 silently last-write-wins。
- 普通 update 不允许用户直接跳跃 revision。
- revision / updated_at 的维护方式可使用 trigger / transaction，但 SQL 是唯一真源。
- 任何 CAS / trigger 错误必须有稳定、可测试的错误语义。

本 Task 不实现 B Engine 的幂等 ChangeSet，也不创建 Engine audit/event 表。

## RLS / Authorization

所有新 Trip Plan 私有表必须 `RLS ENABLED`，默认拒绝。

首期权限模型：

- Authenticated user 只能读取/写入自己 `owner_user_id` 对应 Trip 树。
- anon 不得访问私人 Trip Plan。
- child table RLS 必须通过可信 Trip ownership 链验证，不允许跨用户插入 child row。
- service role / trusted server bypass 保持后端责任；不要添加宽泛的 browser service-role policy。
- 不在本 Task 发明多人共享 Owner/Editor/Viewer 模型；正式 trip sharing / trip_members 规则未冻结时只实现 owner-only。

至少真实测试两个 Auth 用户：

- Owner 可 CRUD 自己 Trip / Plan / Day / Item（在 Task 允许的写范围内）。
- User B 不能 select / insert / update / delete User A 的任何 Trip tree。
- 不能把自己的 child row FK 到他人的 Trip / Plan / Day。
- anon 访问失败。

## Contract ↔ DB Projection

本 Task 必须提供 server-only typed projection/repository，证明 DB 模型确实是 4.17 的持久化实现，而不是孤立 SQL。

建议位置：

```text
src/server/trips/**
或
src/db/queries/trips/**
```

必须具备最小能力：

1. 将合法 `TripPlanSnapshotV1` 事务性写入/创建为 Trip tree。
2. 按 Trip ID 读取并重建 `TripPlanSnapshotV1`。
3. 读取后必须通过 `parseTripPlanSnapshot`。
4. activePlan / day order / item scheduled-vs-alternative / revision / schedule timezone / booking facts 必须 round-trip 不丢语义。
5. 写入必须在一个 transaction 内保证 Trip / Plan / Day / Item 一致性。
6. 非法 Contract 输入先被 runtime validator 拒绝，不进入 DB。
7. 不建立 HTTP API，不修改 Planner UI；4.19 / 5.19 才负责公开调用边界。

## Snapshot / History Boundary

本 Task 必须在设计文档中明确：

- normalized `trips / trip_plans / trip_days / itinerary_items` 是当前主系统 Trip Plan persistence source of truth。
- `revision` 用于当前实体并发与版本检查。
- 不为“历史/草稿/收藏”建立 B-owned second history store。
- 如果需要不可变 published snapshot / audit history，应明确未来 migration/Task 的边界；不得在本 Task 同时维护一个会与 normalized rows 形成双真源的 JSONB 全量副本，除非能证明单一写入事务和唯一真源规则且 Task 明确记录理由。

默认优先：当前 normalized state + revision；完整审计/event history Deferred。

## SQL / Migration Requirements

- `supabase/migrations/*.sql` 为唯一正式历史。
- 不修改已进入 `develop` 的历史 migration。
- 不使用 production `drizzle-kit push`。
- Migration 命名遵循 `YYYYMMDDHHMMSS_description.sql`。
- 复杂范围可拆成：
  - create trip plan schema
  - add RLS / revision guards
    但不得制造依赖顺序不清的碎片。
- migration 必须从空 Local Supabase 完整 replay。
- SQL 中为重要约束和表增加 comments。

## Drizzle / Generated Types

必须：

- 在 `src/db/schema/**` 建立与 SQL 一致的 Drizzle mirror。
- 更新 `src/db/schema/index.ts`。
- SQL 始终是 source of truth；Drizzle 不维护第二套 migration history。
- 从真实 Local Supabase 运行类型生成，更新 `src/types/database.generated.ts`。
- 禁止人工编辑 generated types。
- 提供 SQL ↔ Drizzle 关键字段一致性检查或测试。

## Tests / Validation

### Static / Unit

至少覆盖：

- Contract → DB projection mapping。
- DB → Contract round-trip。
- minimum fixture。
- full fixture。
- multi-plan + active plan。
- multi-day。
- scheduled + alternatives。
- booking confirmed evidence。
- unknown/future code read semantics不被 DB enum 锁死。
- date/time/timezone round-trip。
- duplicate day/order/item constraint。
- invalid active_plan ownership。
- stale trip revision。
- stale plan revision。

### Local DB / Auth Runtime

必须真实执行：

```text
npm.cmd run db:start
npm.cmd run db:status
npm.cmd run db:reset
npm.cmd run db:types
```

并执行专项 Runtime 测试：

- schema exists
- FK / unique / check constraints
- RLS owner-only
- cross-user denial
- anon denial
- transaction rollback
- revision conflict
- contract round-trip
- generated types matches real Local DB

完成后：

```text
npm.cmd run db:stop
```

如果当前环境没有可工作的 Docker / Supabase Local，不得伪造 PASS；静态实现可完成，但 Task 必须返回 `Partial / Runtime Blocked`，不得标 Ready for review。

### Repository Regression

必须执行并如实记录：

```text
npm ci
npm run lint
npm run typecheck
npm run build
```

并执行仓库已有全部 Node tests / 当前项目定义的 test 命令。

格式规则：

- Task 修改文件必须通过 formatter / diff check。
- 全仓已有格式债必须与最新 `origin/develop` 对照；不得为本 Task 批量格式化无关历史文件。

## Required Deliverables

至少包括：

```text
supabase/migrations/<timestamp>_create_trip_plan_schema.sql
[可选] supabase/migrations/<timestamp>_add_trip_plan_rls_revision.sql
src/db/schema/trips.ts
src/db/schema/index.ts
src/server/trips/** 或 src/db/queries/trips/**
src/types/database.generated.ts
tests/TASK-019 专项静态测试
tests/TASK-019 Local DB/Auth runtime 测试
docs/architecture/trip-plan-persistence.md
docs/tasks/RESULT-TASK-019-a-trip-plan-schema.md
docs/project/WBS-TravelAssist.md
```

文件名可按现有仓库风格小幅调整，但职责和证据不可缺失。

## Explicitly Out of Scope

本 Task 不实现：

- B 的 `travel_preferences / trip_drafts / trip_preference_snapshots / trip_preference_overrides`
- WBS 5.18 / 5.19 Saved Trips / History / Draft public persistence contract
- Companion / trip member sharing schema
- Planner 页面改造
- `/start` 页面改造
- 真实 AI / OpenAI API
- TravelAssist Engine 4.20–4.24
- Places / POI production schema 7.4
- Route schema 7.5 / route calculation 7.8
- Booking / Payment / Membership schema
- 外部 Provider IDs 的强 FK
- Production / Staging 手工数据库变更
- Production secret / Service Role 提交
- 自动合并 PR

## Completion / Tracking Rules

启动时：

```text
8.5 → 进行中
```

实现 + 本机真实 DB/Auth 验证完成，但用户未验收：

```text
8.5 → 待审查
Issue 保持 Open
Draft PR 保持 Open
```

只有：

```text
代码合入 develop
+
用户验收通过
```

才允许：

```text
8.5 → 已完成
Issue Close
```

不得因为 migration 已创建、CI 通过或 PR 已推送而提前写 `已完成`。

## Final Integration Gate

最终返回 Result 前再次：

1. `git fetch --all --prune`
2. 检查最新 `origin/develop`
3. 检查 PR #221 是否在执行期间合并
4. 检查 A/B 其他 DB migration 是否进入 develop
5. 必要时安全整合最新 develop
6. 重新运行 Local `db:reset` / `db:types` /专项 DB-RLS 测试
7. 重新运行 lint / typecheck / full tests / build
8. 更新 WBS / Issue / Result
9. push `codex/a-trip-plan-schema`
10. 创建或保持 Draft PR → `develop`

不得覆盖其他 Owner 的 WBS / Task / Result 历史。

## Required Final Result Format

```markdown
# TASK-019-A Result

## Status

Completed / Partially Completed / Blocked

## Prerequisite

- origin/develop base:
- 4.17 present:
- 8.1 present:
- TASK-017-B / PR #221 state at start:
- TASK-017-B / PR #221 state at finish:

## Tracking

- Issue:
- Task File:
- Branch:
- Implementation Commit:
- Final Head:
- Draft PR:
- WBS updated:

## Schema

- trips:
- trip_plans:
- trip_days:
- itinerary_items:
- indexes / constraints:
- delete behavior:

## Contract Projection

- TripPlanSnapshotV1 → DB:
- DB → TripPlanSnapshotV1:
- round-trip fixtures:
- unknown code handling:

## Revision / Concurrency

- trip revision:
- plan revision:
- stale write:
- transaction rollback:

## RLS

- owner access:
- cross-user denial:
- anon denial:
- child ownership escape attempts:

## Local Supabase

- start:
- status:
- reset:
- types:
- runtime tests:
- stop:

## Validation

- npm ci:
- lint:
- typecheck:
- full tests:
- format / diff check:
- build:

## Scope Preserved

- TASK-017-B tables untouched:
- Preference / Companion untouched:
- Planner UI untouched:
- POI / Route schema not invented:
- Booking / Payment not implemented:
- no secrets:

## Ready For Review

Yes / No
```

完成后停止，不自动执行 4.18、4.19、5.19、4.20、7.4、7.5、6.x 或其他后续 Task。
