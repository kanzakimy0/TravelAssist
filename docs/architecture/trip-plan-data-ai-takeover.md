# TravelAssist — 方案数据模型与 AI 接管架构设计书

> 状态：v1.0 / 建议冻结  
> 日期：2026-09-05  
> 适用范围：Web、后续 iOS / Android、AI 行程生成、AI 行程调整、PRO 实时旅行助手、多人同行、离线行程、外部订单导入  
> 依赖规范：
> - `docs/architecture/db-orm-migration-standards.md`
> - `docs/ai/trip-generation-flow.md`
> - `docs/ai/trip-judgement-two-phase.md`

---

# 1. 设计目标

本设计解决四个核心问题：

1. **一个旅行方案到底以什么形式保存在服务器。**
2. **Web、App、同行人设备如何共享同一份方案。**
3. **AI 如何读取、判断、建议、修改方案，而不直接获得数据库任意写权限。**
4. **如何同时支持版本回退、实时状态、外部订单、离线使用与会员差异。**

最终原则：

> **数据库保存事实，Trip Engine 执行业务规则，AI 管理意图、判断和变更建议。**

AI 不直接把聊天文字当作行程，也不得绕过业务层直接修改核心数据库。

---

# 2. 总体结论

TravelAssist 的行程方案采用：

```text
服务器主数据
=
Supabase PostgreSQL
+
结构化关系数据
+
JSONB 扩展属性
+
版本 / ChangeSet
+
AI Decision Log
+
Runtime State
+
Booking / External Order Reference
```

客户端采用：

```text
Web
  → 服务器实时数据 / 缓存

App
  → 服务器实时数据
  → 本地离线 Snapshot
  → 恢复联网后增量同步
```

服务器是最终事实源（Source of Truth）。

手机、平板、Web 不各自维护独立“真版本”。

---

# 3. 与现有架构的关系

本规格不重新定义数据库基础。

继续使用已冻结的：

- Supabase PostgreSQL（Tokyo）
- Supabase Auth
- PostgreSQL RLS
- Drizzle ORM
- SQL Migration
- PostGIS
- Supabase Realtime
- 服务端可信逻辑通过 Drizzle / Server API 执行

行程数据属于核心业务数据，必须进入 PostgreSQL，而不是：

- 仅存在聊天记录；
- 仅存在模型上下文；
- 仅保存一整个 Markdown；
- 仅保存一个不可查询的大 JSON 文件；
- 仅存在用户设备。

---

# 4. 核心领域模型

TravelAssist 的层级定义为：

```text
User
  ↓
Trip
  ↓
Trip Plan
  ↓
Plan Day
  ↓
Itinerary Item
```

同时存在：

```text
Trip
 ├─ Trip Members
 ├─ External Orders / Bookings
 ├─ Runtime State
 └─ AI Decisions

Trip Plan
 ├─ Plan Versions
 ├─ ChangeSets
 └─ Current Active Version
```

## 4.1 Trip

`Trip` 代表“一次旅行项目”。

例如：

```text
2027 欧洲自驾
2027-03-17 → 2027-04-04
```

它不是某一种具体行程排列。

一个 Trip 可以存在多个候选 Plan。

---

## 4.2 Trip Plan

`Trip Plan` 代表该旅行的一套具体方案。

例如：

```text
推荐方案 1：经典均衡
推荐方案 2：摄影优先
推荐方案 3：轻松少移动
```

用户选择其中一套后：

```text
is_active = true
```

其他方案仍可保留，用于：

- 比较；
- 重新选择；
- 从旧方案复制；
- AI 重新规划；
- 方案 A/B。

---

## 4.3 Plan Day

按旅行当地日期组织行程。

不要只使用“第几天”。

同时保存：

```text
day_number
local_date
timezone
```

因为跨国、跨时区旅行可能出现：

- 日期变化；
- 夜间航班；
- 夏令时；
- 跨国际日期变更线。

---

## 4.4 Itinerary Item

所有行程节点统一称为 `Itinerary Item`。

基础类型建议：

```text
PLACE
ACTIVITY
TRANSPORT
MEAL
HOTEL
CHECK_IN
CHECK_OUT
FLIGHT
TRAIN
CAR_RENTAL
FERRY
FREE_TIME
CUSTOM
```

UI 可以把部分类型合并显示，但数据库应保持足够明确的语义。

---

# 5. 推荐数据库表

第一阶段建议至少建立以下表。

```text
profiles
trips
trip_members

trip_plans
trip_days
itinerary_items

bookings
external_orders

plan_versions
plan_change_sets
plan_change_operations

ai_decisions
trip_runtime_states
trip_runtime_events

offline_sync_cursors
```

后续可增加：

```text
item_dependencies
item_constraints
plan_snapshots
provider_sync_jobs
notification_events
```

---

# 6. trips

建议字段：

```text
id
owner_user_id
title
start_date
end_date
default_timezone
status

active_plan_id

created_at
updated_at
archived_at
```

`status` 建议：

```text
DRAFT
PLANNED
PRE_TRIP
LIVE
COMPLETED
ARCHIVED
```

其中 PRE_TRIP / LIVE 的最终显示状态可由时间和实际执行状态计算，不一定全部依赖人工写入。

---

# 7. trip_plans

建议字段：

```text
id
trip_id

name
description
plan_type

is_active
status

current_version_number

generated_by
generation_source

created_by_user_id
created_at
updated_at
```

`plan_type`：

```text
PRIMARY
ALTERNATIVE
IMPORTED
SHARED_COPY
AI_GENERATED
```

`generated_by`：

```text
USER
AI
IMPORT
SHARED_TRIP
SYSTEM
```

---

# 8. trip_days

建议字段：

```text
id
plan_id

day_number
local_date
timezone

start_location_id
end_location_id

summary
metadata_jsonb

created_at
updated_at
```

---

# 9. itinerary_items

建议字段：

```text
id
trip_id
plan_id
day_id

item_type

title
description

planned_start_at
planned_end_at

actual_start_at
actual_end_at

place_id
latitude
longitude

source
status

booking_status
booking_id

priority
locked
lock_level

flexibility_before_minutes
flexibility_after_minutes

metadata_jsonb

sort_key

created_at
updated_at
deleted_at
```

## 9.1 status

```text
PLANNED
READY
IN_PROGRESS
COMPLETED
SKIPPED
CANCELLED
BLOCKED
```

## 9.2 booking_status

预约状态与 AI 状态必须分离：

```text
NOT_REQUIRED
UNKNOWN
NEEDS_BOOKING
PENDING
CONFIRMED
CANCELLED
FAILED
```

## 9.3 priority

```text
OPTIONAL
NORMAL
HIGH
MUST_DO
HARD_CONSTRAINT
```

---

# 10. 为什么采用“关系字段 + JSONB”

稳定、需要查询和约束的数据必须做正式字段。

例如：

```text
planned_start_at
booking_status
locked
latitude
longitude
```

可扩展、供应商差异大、可能频繁增加的数据进入 `metadata_jsonb`。

例如景点：

```json
{
  "weather_sensitive": true,
  "crowd_sensitive": true,
  "photo_priority": "high",
  "preferred_duration_min": 90,
  "child_friendly": true,
  "wheelchair_required": false,
  "user_reason": "特别想拍照",
  "tags": ["神社", "摄影", "文化"]
}
```

原则：

> **需要数据库直接过滤、排序、约束、关联的数据优先正式字段；变化快或 provider-specific 的属性放 JSONB。**

不要把整个 `itinerary_items` 都塞进 JSONB。

---

# 11. 地点数据

地点不能只保存：

```text
"卢浮宫"
```

至少应保留稳定地点引用：

```text
place_id
provider
provider_place_id
name
formatted_address
latitude
longitude
timezone
```

利用 PostGIS 支持：

- 距离计算；
- 区域聚类；
- 周边搜索；
- 路线顺序判断；
- 住宿区域推荐；
- 餐饮区域推荐。

第三方 Place ID 不能作为 TravelAssist 内部唯一主键。

---

# 12. 方案版本系统

任何重要修改都不得简单覆盖旧方案而完全失去历史。

每个 active plan 保留：

```text
Version 1
Version 2
Version 3
...
```

典型变化：

```text
V12 用户调整
V13 AI 建议被用户采用
V14 实时交通导致 AI 自动调整
V15 用户手动恢复某景点
```

---

# 13. plan_versions

建议字段：

```text
id
plan_id

version_number
parent_version_id

trigger_type
trigger_actor_type
trigger_actor_id

summary
reason

change_set_id

snapshot_jsonb

created_at
```

`trigger_type`：

```text
INITIAL_GENERATION
USER_EDIT
AI_SUGGESTION_ACCEPTED
AI_AUTO_EXECUTION
EXTERNAL_ORDER_SYNC
REALTIME_EVENT
IMPORT
ROLLBACK
SYSTEM_REPAIR
```

`snapshot_jsonb` 不要求每次都保存完整全量数据。

推荐：

```text
小变更
→ ChangeSet

关键版本 / 定期节点
→ ChangeSet + Snapshot
```

这样兼顾可追溯和存储成本。

---

# 14. ChangeSet

AI 和普通用户修改最终统一转换成 `ChangeSet`。

示例：

```json
{
  "change_set_id": "chg_01",
  "base_version": 27,
  "reason": "10:00-12:00预计强降雨",
  "operations": [
    {
      "op": "MOVE_ITEM",
      "item_id": "item_128",
      "from_start": "2027-03-22T10:00:00+01:00",
      "to_start": "2027-03-22T14:00:00+01:00"
    },
    {
      "op": "REPLACE_TRANSPORT",
      "item_id": "item_144",
      "from_mode": "WALK",
      "to_mode": "TAXI"
    }
  ]
}
```

---

# 15. Change Operation 类型

第一阶段建议冻结：

```text
ADD_ITEM
UPDATE_ITEM
MOVE_ITEM
DELETE_ITEM
SKIP_ITEM
RESTORE_ITEM

REPLACE_ITEM
REPLACE_TRANSPORT

UPDATE_TIME
UPDATE_DURATION
UPDATE_PLACE

LINK_BOOKING
UPDATE_BOOKING_STATUS

LOCK_ITEM
UNLOCK_ITEM

REORDER_ITEMS
REPLAN_DAY
REPLAN_RANGE
```

AI 不应提交任意 SQL。

AI 只能提交白名单操作。

---

# 16. AI 接管总架构

```text
Web / App
    │
    ▼
API / Server Action
    │
    ├───────────────┐
    ▼               ▼
Trip Engine     AI Orchestrator
    │               │
    │          Context Builder
    │               │
    │          Model / Tools
    │               │
    │          Proposed ChangeSet
    │               │
    └───────◄───────┘
            │
      Policy / Validation
            │
      Transaction Apply
            │
      Version + Audit Log
            │
        PostgreSQL
            │
      Realtime / Push
            │
      Web / App / Members
```

---

# 17. AI 绝对不能直接做的事情

禁止：

```text
AI
 ↓
UPDATE itinerary_items ...
```

禁止让模型直接拥有：

- Service Role；
- 数据库连接字符串；
- 任意 SQL 工具；
- 绕过 RLS 的客户端令牌；
- 任意删除 / 修改订单能力。

AI 的职责是：

1. 理解；
2. 判断；
3. 生成结构化意图；
4. 提交候选 ChangeSet；
5. 解释理由。

Trip Engine 的职责是：

1. 验证；
2. 检查权限；
3. 检查锁定；
4. 检查预约；
5. 检查预算；
6. 检查版本；
7. 执行 Transaction；
8. 创建版本；
9. 发出同步事件。

---

# 18. AI 权限三级模型

建议产品层统一定义为：

```text
AI_LEVEL_1_REVIEW
AI_LEVEL_2_SUGGEST
AI_LEVEL_3_AUTOPILOT
```

## 18.1 Level 1 — Review

AI 只能判断。

例如：

```text
✓ 正常
⚠ 需要确认
❗ 有问题
```

不得自动更改方案。

---

## 18.2 Level 2 — Suggest

AI 可以生成 ChangeSet，但需要用户确认：

```text
[保持原计划]
[采用建议]
```

只有用户点击采用后，Trip Engine 才执行。

适合：

- 行程前优化；
- 重大变更；
- 涉及付费预约；
- 用户未授权的操作。

---

## 18.3 Level 3 — Autopilot

在用户明确授权的范围内，AI 可自动提交并执行低风险 ChangeSet。

例如：

```text
允许：
☑ 调整未预约景点顺序
☑ 调整自由时间
☑ 因天气移动户外项目
☑ 因交通延误调整后续非硬预约
☑ 调整餐饮区域建议

需确认：
□ 取消预约
□ 修改酒店
□ 修改机票
□ 产生超过阈值的新费用
```

Autopilot 永远受系统策略限制。

“用户开启自动接管”不等于“模型获得无限修改权”。

---

# 19. Lock / Constraint 模型

每个项目需要拥有明确保护级别。

建议：

```text
NONE
SOFT
USER_LOCK
BOOKING_LOCK
PAYMENT_LOCK
SYSTEM_HARD_LOCK
```

含义：

| Lock | AI 自动改 | AI 建议改 | 用户手动改 |
|---|---:|---:|---:|
| NONE | 可 | 可 | 可 |
| SOFT | 条件允许 | 可 | 可 |
| USER_LOCK | 不可 | 可提示 | 可 |
| BOOKING_LOCK | 不可 | 需明确确认 | 可 |
| PAYMENT_LOCK | 不可 | 需明确确认 | 可 |
| SYSTEM_HARD_LOCK | 不可 | 通常不可 | 受业务规则限制 |

---

# 20. AI 修改优先顺序

出现冲突时优先牺牲：

```text
自由时间
↓
Optional 项目
↓
未预约普通景点
↓
可替代餐饮
↓
可退款预约
↓
已确认预约
↓
已付款不可退款项目
↓
酒店
↓
长途铁路 / 航班 / 国际交通
↓
系统硬约束
```

同时还要考虑用户 `priority`。

例如：

```text
MUST_DO + USER_LOCK
```

即使它是普通景点，也不能被 AI 自动删除。

---

# 21. 行程前与行程中共用同一套数据

数据库不拆成两份。

使用同一 Trip State。

不同的是 AI Engine 的判断策略。

## 21.1 Planning Review

范围：

```text
Trip 创建
→ T-48h
```

重点：

- 需求匹配；
- 路线；
- 节奏；
- 营业日；
- 硬预约；
- 住宿；
- 餐饮；
- 同行人；
- 备用方案；
- 交通合理性。

---

## 21.2 Execution Monitor

默认：

```text
T-48h
→ Trip End
```

重点：

- 实时天气；
- 交通；
- 航班 / 铁路；
- 道路；
- 当前地点；
- 当前进度；
- 临时闭馆；
- 后续硬预约；
- 排队；
- 订单状态；
- 连锁延误。

---

# 22. Runtime State

“计划”与“现实正在发生什么”不能混成同一字段。

建立：

```text
trip_runtime_states
trip_runtime_events
```

## 22.1 trip_runtime_states

保存当前聚合状态：

```text
trip_id
current_day_id
current_item_id

current_latitude
current_longitude

schedule_offset_minutes

last_user_activity_at
last_runtime_eval_at

execution_status

state_jsonb

updated_at
```

---

## 22.2 trip_runtime_events

追加式保存有意义事件：

```text
USER_DEPARTED
USER_ARRIVED
ITEM_COMPLETED
USER_SKIPPED

WEATHER_ALERT
TRAIN_DELAY
TRAIN_CANCELLED
FLIGHT_DELAY
ROAD_CLOSED
PLACE_CLOSED

BOOKING_CONFIRMED
BOOKING_CANCELLED

AI_AUTO_CHANGE_APPLIED
USER_OVERRIDE
```

Runtime Event 可以触发增量判断。

不需要每分钟从头分析整趟旅行。

---

# 23. AI Context Builder

AI 不直接读取整个数据库。

服务端根据任务生成最小必要 `Trip Context`。

例如：

```json
{
  "mode": "EXECUTION_MONITOR",
  "current_time": "2027-03-22T08:42:00+01:00",
  "trip": {
    "trip_id": "trip_x",
    "day_number": 6,
    "timezone": "Europe/Paris"
  },
  "user": {
    "travel_style": "relaxed",
    "walking_tolerance": "medium"
  },
  "runtime": {
    "schedule_offset_minutes": 17
  },
  "today": [],
  "next_48_hours": [],
  "hard_constraints": [],
  "bookings": [],
  "weather": {},
  "transport_alerts": [],
  "recent_changes": []
}
```

---

# 24. 上下文窗口原则

## 行程前

可以扫描整趟结构，但分层处理：

```text
Trip Summary
+
Day Summaries
+
需要深查的 Day / Item
```

不要每次向模型发送所有第三方原始数据。

## 行程中

默认滚动窗口：

```text
当前节点
+
今天剩余节点
+
下一项硬预约
+
未来 24–48h 高风险 / 硬约束
```

这可以降低：

- Token；
- API 开销；
- 延迟；
- 模型噪声；
- 无意义告警。

---

# 25. AI Decision Log

AI 的判断不能只有 UI 上一个气泡。

建立：

```text
ai_decisions
```

建议字段：

```text
id
trip_id
plan_id
plan_version_number

mode
severity

subject_type
subject_id

reason_code
summary
explanation

confidence
evidence_jsonb

suggested_change_set_id
execution_status

model_provider
model_name
prompt_version

created_at
resolved_at
```

`severity`：

```text
INFO
OK
WARNING
CRITICAL
```

UI 映射：

```text
OK       → ✓
WARNING  → 黄色 ⚠
CRITICAL → 红色 ❗
```

预约状态仍然独立。

---

# 26. 为什么要保存 evidence

例如 AI 判断：

```text
❗ 原铁路不可执行
```

必须能够追溯依据：

```json
{
  "provider": "rail_provider_x",
  "service": "ICE 123",
  "status": "cancelled",
  "observed_at": "2027-03-22T08:31:00+01:00"
}
```

否则：

- 无法解释；
- 无法调试；
- 无法审核；
- 无法判断供应商数据是否过期。

---

# 27. AI 决策与 deterministic rules

不是所有判断都应该调用大模型。

优先：

```text
确定性规则
→ 程序判断

复杂取舍 / 用户语义
→ AI
```

程序应直接判断：

- 两个时间段重叠；
- 营业时间明确冲突；
- 航班已取消；
- 当前预计到达晚于预约；
- Lock 禁止修改；
- Version 冲突；
- 预算超过硬阈值。

AI 更适合：

- 哪个替代方案更符合偏好；
- 如何重新安排剩余半天；
- 哪些 Optional 景点应该牺牲；
- 如何解释变更；
- 多种软约束之间如何取舍。

---

# 28. 外部订单模型

外部订单不能只保存一段用户粘贴文本。

建立：

```text
external_orders
bookings
```

## 28.1 external_orders

保留原始供应商信息：

```text
id
trip_id
provider

external_order_id
external_status

order_type

raw_payload_jsonb
normalized_at
last_synced_at
```

## 28.2 bookings

TravelAssist 统一标准层：

```text
id
trip_id

booking_type

provider
external_order_id

start_at
end_at

status
is_paid
is_refundable

amount
currency

confirmation_reference

linked_itinerary_item_id

metadata_jsonb
```

AI 只使用标准化 Booking 事实做规划。

原始 provider payload 用于追溯和重新解析。

---

# 29. Booking 对 AI 的影响

订单进入系统后：

```text
External Order
↓
Normalize
↓
Booking
↓
Link / Create Itinerary Item
↓
Apply Booking Lock
↓
Trip Engine Revalidate
↓
AI Review
```

例如：

```text
17:30 已购演出
```

应自动变成后续规划的硬约束或高优先约束。

---

# 30. 多人同行

建立：

```text
trip_members
```

建议：

```text
trip_id
user_id

role
permission

realtime_enabled

joined_at
```

`role`：

```text
OWNER
EDITOR
TRAVELER
VIEWER
```

权限示例：

| Role | 看行程 | 改行程 | 确认 AI 变更 | 管理成员 |
|---|---:|---:|---:|---:|
| OWNER | ✓ | ✓ | ✓ | ✓ |
| EDITOR | ✓ | ✓ | ✓ | - |
| TRAVELER | ✓ | 可限制 | 可限制 | - |
| VIEWER | ✓ | - | - | - |

---

# 31. 实时同步

服务器成功提交版本后：

```text
PostgreSQL Transaction
↓
Plan Version + ChangeSet
↓
Realtime Event
↓
Owner Web
↓
Owner App
↓
同行人 App
```

客户端收到的应是：

```text
plan_id
old_version
new_version
changed_entities
```

然后增量刷新。

不要每次完整下载整个 Trip。

---

# 32. 并发修改

必须使用 Optimistic Concurrency。

每次提交 ChangeSet 带：

```text
base_version
```

例如：

```text
客户端基于 V41 编辑
服务器已经是 V43
```

服务器不得静默覆盖。

返回：

```text
VERSION_CONFLICT
```

然后：

1. 自动判断是否可安全 rebase；
2. 不可安全 rebase 时提示用户；
3. AI 自动接管不得覆盖刚刚发生的用户修改。

---

# 33. 用户修改保护窗口

用户刚手动改过的内容需要临时提高保护优先级。

例如：

```text
用户 14:03 把卢浮宫延长到 3 小时
AI 14:04 不能因为旧建议立即改回 2 小时
```

可通过：

```text
recent_user_override_at
```

或 Runtime Event 实现。

AI Context 中必须包含最近重要人工修改。

---

# 34. App 离线模型

服务器仍是真源。

PRO App 可生成：

```text
Offline Trip Bundle
```

包含：

- Trip / Plan 基本信息；
- 指定时间范围的 Day；
- Itinerary Items；
- 地址；
- 经纬度；
-必要订单信息；
- 用户备注；
- 必要翻译文本；
- 当前版本号；
- 离线显示所需静态资源索引。

App 本地可使用：

```text
SQLite
```

---

# 35. 离线修改

离线时允许的修改必须受限制。

建议第一阶段：

允许：

```text
完成项目
跳过项目
添加个人备注
调整非锁定项目
记录实际出发 / 到达
```

不自动执行：

```text
取消供应商订单
购买票务
修改酒店
需要实时库存的预订
```

恢复联网后：

```text
Local Change Queue
+
base_version
↓
Server Conflict Resolution
↓
Accepted / Rebased / Conflict
```

---

# 36. AI 不在离线状态假装拥有实时数据

离线期间：

```text
天气
交通
营业状态
订单状态
```

可能过期。

UI 和 AI 必须明确标注数据更新时间。

禁止把缓存数据描述为“当前实时状态”。

---

# 37. 会员能力映射

业务层建议这样映射，具体价格另行定义。

## 37.1 免费用户

核心目标：

> 能生成、查看、编辑和使用基础行程，不阻止酒店 / 产品预订转化。

建议：

- 可保存云端行程；
- 可查看地图和行程；
- 可手动修改；
- 可使用基础订单管理；
- AI 有每日调用次数限制；
- 可获得基础 Planning Review；
- 实时执行判断受次数 / 频率限制；
- 不提供完整离线 AI 接管；
- 不提供高级多人实时协作。

---

## 37.2 付费会员

增加：

- 更高 AI 使用额度；
- AI Level 2 / Level 3；
- T-48h 实时旅行助手；
- 天气 / 交通 / 后续行程连续判断；
- 自动生成安全 ChangeSet；
- 行程自动同步到同行人；
- 一个或更多同行账号实时共享；
- 离线行程；
- 导入别人的行程；
- 导出自己的行程；
- 外部订单统一管理增强；
- 与酒店等沟通时生成 / 翻译当地语言消息；
- 更完整的版本历史与恢复。

原则：

> 不要把“酒店 / 票务等可产生返利的预订入口”硬锁在付费会员后面。

---

# 38. AI Usage 控制

建立 Usage 层，而不是直接在 UI 判断。

计量维度：

```text
user_id
subscription_tier
feature
period
count
token_estimate
provider_cost_estimate
```

AI 触发前：

```text
Auth
↓
Entitlement
↓
Usage Limit
↓
AI Request
```

这样未来：

- 免费每日 N 次；
- 会员较高限额；
- 实时监控事件不等于无限模型调用；
- 可按复杂度路由模型。

---

# 39. 实时监控不是“不断调用 AI”

推荐事件驱动：

```text
天气 provider 更新
交通状态变化
航班状态变化
当前位置产生有意义偏差
订单状态变化
用户改行程
当前节点完成
↓
Rule Engine 判断是否值得重算
↓
必要时才调用 AI
```

避免：

```text
每分钟
→ 把 20 天旅行发给模型
```

---

# 40. 数据新鲜度

所有外部动态数据建议统一携带：

```text
provider
observed_at
expires_at
confidence
```

AI Context Builder 应优先过滤过期事实。

当关键数据过期：

```text
⚠ 当前交通状态数据已超过有效期
```

而不是给出伪实时结论。

---

# 41. Transaction 规则

一次通过的 ChangeSet 必须在单个数据库事务内完成：

```text
Validate base_version
↓
Validate permission
↓
Validate locks
↓
Validate bookings
↓
Apply operations
↓
Create plan_version
↓
Write audit / AI decision link
↓
Update current_version
↓
Commit
```

任何一步失败：

```text
ROLLBACK
```

不能产生：

```text
行程改了一半
版本却没更新
```

---

# 42. Idempotency

AI、Webhook、同步任务都可能重复提交。

ChangeSet 必须带：

```text
idempotency_key
```

例如相同航班取消事件收到两次：

```text
第一次
→ 执行

第二次
→ Recognized Duplicate
→ 不再重复改方案
```

---

# 43. API 边界

建议第一阶段对外暴露领域 API，而不是直接 CRUD 所有表。

例如：

```text
GET    /api/trips/:tripId
GET    /api/trips/:tripId/plans
POST   /api/trips/:tripId/plans

GET    /api/plans/:planId
POST   /api/plans/:planId/changes
POST   /api/plans/:planId/rollback

POST   /api/trips/:tripId/ai/review
POST   /api/trips/:tripId/ai/suggest
POST   /api/trips/:tripId/ai/execute

GET    /api/trips/:tripId/runtime
POST   /api/trips/:tripId/runtime/events

POST   /api/trips/:tripId/orders/import
POST   /api/webhooks/providers/:provider
```

API Route / Server Action 最终都调用：

```text
Trip Service
Trip Engine
Booking Service
AI Orchestrator
```

---

# 44. 推荐服务边界

```text
TripService
- Trip CRUD
- Members
- Active Plan

PlanService
- Plan / Day / Item Read
- Version
- Snapshot

TripEngine
- Validate ChangeSet
- Apply ChangeSet
- Constraint Check
- Conflict Check

BookingService
- Normalize Orders
- Link Booking
- Booking Constraints

RuntimeService
- Runtime State
- Event Ingestion
- Schedule Offset

AIOrchestrator
- Intent
- Context Build
- Model Routing
- Decision
- ChangeSet Proposal

EntitlementService
- Free / Paid Feature Access
- Usage Limit

SyncService
- Realtime
- Offline Delta
```

---

# 45. AI 工具白名单

未来使用 Tool Calling / Agent 时，模型只允许调用领域工具，例如：

```text
get_trip_context
get_item_details
get_booking_constraints
get_weather_context
get_transport_status

propose_change_set
validate_change_set

search_alternative_places
search_alternative_transport
```

对高风险操作：

```text
cancel_booking
modify_paid_booking
purchase_ticket
```

必须通过额外权限、用户确认和 provider-specific 业务层。

不能直接暴露：

```text
execute_sql
database_admin
supabase_service_role
```

---

# 46. AI 输出 Schema

AI 重要输出必须结构化校验。

例如：

```json
{
  "decision": {
    "severity": "WARNING",
    "summary": "下午强降雨可能影响户外景点"
  },
  "proposed_change_set": {
    "base_version": 27,
    "operations": []
  },
  "requires_user_confirmation": true
}
```

服务端使用 Schema Validator 拒绝：

- 未知 operation；
- 缺字段；
- 非法 ID；
- 非法金额；
- 不允许的执行级别。

---

# 47. 用户看到的 UI 与后台状态

UI 不应该显示技术表名。

例如一条行程：

```text
10:00 卢浮宫
✅ 门票已确认
⚠ 当前预计晚到 12 分钟
```

后台可能对应：

```text
itinerary_item
+
booking
+
runtime_state
+
ai_decision
```

UI 是多数据源的合成视图。

---

# 48. AI 解释原则

每次调整要回答：

```text
发生了什么
为什么影响当前方案
AI 改了什么
哪些项目没动
有什么取舍
是否可恢复
```

例如：

```text
由于 RER B 延误约 25 分钟，
系统将未预约的塞纳河散步移至傍晚。

17:30 已确认演出未修改。
卢浮宫为用户锁定项目，未修改。

当前方案：V28
可恢复：V27
```

---

# 49. 典型流程：用户自然语言改行程

```text
用户：
“第二天下午轻松一点”
↓
AI Intent Extraction
↓
target = Day 2 PM
constraint = lower intensity
↓
读取 Day 2 + Preferences + Locks
↓
AI 生成 Proposed ChangeSet
↓
Trip Engine Validate
↓
用户采用 / 自动执行（按权限）
↓
Transaction
↓
V13 → V14
↓
Realtime 同步
↓
地图 / 时间轴 / 同行人更新
```

---

# 50. 典型流程：旅行中铁路取消

```text
Rail Provider
↓
TRAIN_CANCELLED
↓
Runtime Event
↓
Rule Engine
↓
判断影响下一站 / 硬预约
↓
AI Context Builder
↓
生成替代交通 + 后续 ChangeSet
↓
检查：
- Lock
- Booking
- Cost Limit
- User Autopilot Permission
↓
低风险且已授权
→ 自动执行

高风险
→ 请求用户确认
↓
新 Version
↓
同行人实时同步
```

---

# 51. 典型流程：外部酒店订单导入

```text
Email / Provider / User Import
↓
external_order
↓
Normalize
↓
booking: HOTEL
↓
匹配 Trip 日期 / 城市
↓
关联或创建 HOTEL itinerary item
↓
Booking Lock
↓
重新检查前后交通
↓
Planning Review
```

---

# 52. 典型流程：恢复旧版本

```text
用户选择 V24
↓
系统不直接删除 V25~V28
↓
以 V24 为目标状态计算 Reverse / Restore ChangeSet
↓
生成 V29
trigger_type = ROLLBACK
↓
V29 成为 Current
```

历史保持完整。

---

# 53. 隐私与最小化

Trip Context 只发送当前 AI 请求需要的数据。

例如判断某班火车是否能赶上：

不需要发送：

- 用户所有历史旅行；
- 与本 Trip 无关的联系人；
- 所有聊天记录；
- 无关支付信息。

需要长期偏好的，只发送必要字段。

---

# 54. 数据保留边界

建议区分：

```text
长期 Profile
当前 Trip
短期 Runtime
AI Decision Log
Provider Raw Data
```

不要把临时实时状态永久混入 Profile。

Provider Raw Payload 可根据合规、调试需要制定独立保留周期。

---

# 55. 索引建议

首阶段重点索引：

```text
trips(owner_user_id)
trip_members(user_id, trip_id)

trip_plans(trip_id, is_active)
trip_days(plan_id, local_date)

itinerary_items(plan_id, planned_start_at)
itinerary_items(day_id, sort_key)
itinerary_items(booking_id)
itinerary_items(status)

bookings(trip_id, start_at)
bookings(external_order_id)

plan_versions(plan_id, version_number)

ai_decisions(trip_id, created_at)
trip_runtime_events(trip_id, created_at)
```

地点使用 PostGIS GiST。

JSONB 仅对实际查询频繁的路径建立 GIN / expression index。

---

# 56. 第一阶段实现优先级

## P0

必须先有：

```text
trips
trip_members
trip_plans
trip_days
itinerary_items

plan_versions
plan_change_sets

基础 Lock
base_version 并发控制

Trip Engine
AI Proposed ChangeSet
```

这是 AI 可安全修改结构化行程的底座。

---

## P1

随后：

```text
bookings
external_orders
ai_decisions
Runtime State
Runtime Events
T-48h 模式
Realtime 同步
```

---

## P2

App 阶段：

```text
Offline Bundle
SQLite
Offline Change Queue
同行人实时同步增强
Push Notification
Autopilot
```

---

## P3

成熟阶段：

```text
复杂 Provider 自动订单同步
精细模型路由
成本模型
高级冲突合并
完整 Decision Explainability
更多自动交易能力
```

---

# 57. 建议冻结事项

以下建议现在直接冻结：

- [x] 服务器 PostgreSQL 为 Trip / Plan 最终事实源。
- [x] App / Web 不以聊天文本作为事实源。
- [x] 一次 Trip 可以存在多个 Trip Plan。
- [x] Plan 使用 Day + Item 结构化保存。
- [x] 核心字段关系化，扩展属性使用 JSONB。
- [x] AI 不直接写数据库。
- [x] AI 只生成结构化 Decision / ChangeSet。
- [x] Trip Engine 是方案修改的唯一业务执行入口。
- [x] 每次重要修改生成版本。
- [x] AI 三级权限：Review / Suggest / Autopilot。
- [x] Lock / Booking / Payment / User Priority 高于 AI 自动修改。
- [x] T-48h 前后共用同一数据模型，只切换判断引擎。
- [x] Runtime State 与 Planned State 分离。
- [x] Booking Status 与 AI Severity 分离。
- [x] 外部订单保存 Raw + Normalized 两层。
- [x] 多端同步使用服务器版本号。
- [x] 离线 App 只保存 Snapshot / Delta，不成为主真源。
- [x] 并发修改采用 base_version。
- [x] ChangeSet 使用 idempotency key。
- [x] 实时监控采用事件驱动，不持续无意义调用模型。
- [x] 免费会员仍可使用核心行程和预订能力。
- [x] 高成本 AI、离线、实时协作、Autopilot 作为主要会员增值能力。

---

# 58. 暂不冻结事项

以下留到后续专项设计：

- [ ] Supabase Realtime 具体 Channel / Payload 设计。
- [ ] App SQLite Schema。
- [ ] Offline Merge Algorithm。
- [ ] 各 Provider Booking Adapter。
- [ ] 航班 / 铁路 / 道路 /天气具体数据供应商。
- [ ] 大模型供应商与 Model Router。
- [ ] AI Prompt Version 管理。
- [ ] Token / 成本具体预算。
- [ ] 免费会员每日 AI 次数具体数值。
- [ ] Autopilot 金额默认阈值。
- [ ] 同行人账号数量与会员套餐数量。
- [ ] 自动取消 / 改签等高风险交易能力上线范围。

---

# 59. 最终架构图

```text
┌──────────────────────────────────────────────────────────┐
│                    TravelAssist Clients                    │
│                                                          │
│     Web                   iOS / Android                  │
│                              │                           │
│                        Offline SQLite                    │
└───────────────┬───────────────────────┬──────────────────┘
                │                       │
                └──────────┬────────────┘
                           ▼
                  API / Server Actions
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    Entitlement        Trip Engine      Booking Service
      Service              ▲                │
          │                │                │
          │        Proposed ChangeSet       │
          │                │                │
          │          AI Orchestrator        │
          │                │                │
          │          Context Builder        │
          │                │                │
          │       Rules + Model + Tools     │
          │                                 │
          └────────────────┬────────────────┘
                           ▼
                  Supabase PostgreSQL
                           │
      ┌────────────────────┼─────────────────────┐
      │                    │                     │
 Trip / Plan / Items   Version / Decisions   Runtime / Orders
      │                    │                     │
      └────────────────────┼─────────────────────┘
                           ▼
                 Realtime / Event / Push
                           │
                    All Authorized Clients
```

---

# 60. 一句话架构定义

> **TravelAssist 不是让 AI “保存一份行程文字”，而是让服务器维护一份可版本化、可同步、可约束的结构化旅行状态；AI 通过受控 ChangeSet 操作这份状态，Trip Engine 决定它能不能真正执行。**

这套结构是后续：

- AI 自动规划；
- AI 实时接管；
- 多人同行；
- 外部订单；
- 离线旅行；
- 方案导入 / 导出；
- 免费 / 付费会员分层；

共同使用的基础。
