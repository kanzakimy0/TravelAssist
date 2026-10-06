# TravelAssist — Trip Persistence / Versioning / Save-Read / Collaboration Model

> 状态：冻结为 Trip 持久化与版本控制 v1  
> 目标：让 Planner、Realtime、AI、移动端和多人协作围绕同一个可追踪、可恢复、可并发控制的 Trip Source of Truth 工作。

## 1. 核心原则

> Trip 是业务实体，不是 AI 对话结果。

> AI / Planner 产生 Proposal，只有 Action Router 执行成功后才能形成新的 Trip Version。

> Save / Read 必须版本化，任何修改都基于明确 base_version。

## 2. Trip Aggregate

建议：

```text
Trip
├─ Trip Days
├─ Trip Items
├─ Transfers
├─ Reservations / Anchors
├─ Notes
├─ Sharing Membership
└─ Version Metadata
```

## 3. Trip 表

关键字段：

```text
id
owner_user_id
title
start_date
end_date
timezone_strategy
status
current_version
planner_bundle_id
data_bundle_id
created_at
updated_at
archived_at
```

## 4. Trip Day

```text
id
trip_id
date
timezone
day_index
planned_start
planned_end
status
```

## 5. Trip Item

```text
id
trip_id
day_id
sequence
item_type
poi_id?
reservation_id?
planned_start
planned_end
minimum_duration
recommended_duration
lock_state
priority
source
version
```

## 6. Transfer

```text
id
trip_id
day_id
from_item_id
to_item_id
route_snapshot_id
planned_departure
planned_arrival
mode
buffer_minutes
```

## 7. Trip Version

每次业务 Mutation 成功：

```text
trip.current_version += 1
```

版本不可跳过覆盖。

## 8. Version Record

建议表：

```text
trip_versions
```

字段：

```text
trip_id
version
parent_version
change_set_id
action_batch_id
actor_user_id
source
created_at
snapshot_hash
```

## 9. Diff 与 Snapshot

建议：

- 每次版本保存结构化 diff
- 定期保存完整 snapshot
- 恢复时 snapshot + diff 重建

避免每个版本都完整复制巨大 JSON。

## 10. Save API

客户端保存不提交整个 Trip 作为权威。

推荐提交：

```text
base_version
operation(s)
client_request_id
```

服务端验证后执行。

## 11. Read API

支持：

```text
current
specific version
day slice
summary
offline bundle
```

## 12. Optimistic Concurrency

若：

```text
client base_version = 21
server current_version = 22
```

返回：

```text
TRIP_VERSION_CONFLICT
```

不得静默覆盖。

## 13. Conflict Handling

客户端收到冲突：

```text
reload latest
→ inspect local pending changes
→ rebase / regenerate change set
```

AI/Planner 也必须重新读取最新版。

## 14. Planner Save Flow

```text
Planner
↓
Change Set(base_version=N)
↓
User Confirm
↓
Action Batch
↓
Transaction
↓
Trip Version N+1
↓
Outbox Event
```

## 15. Realtime Progress 与 Trip Version

Realtime State 使用独立：

```text
realtime_state_version
```

不因 GPS 每次变化递增正式 Trip Version。

只有正式规划变更才改变 Trip Version。

## 16. Lock State

Item 支持：

```text
unlocked
user_locked
reservation_locked
system_anchor
```

Planner 必须尊重锁。

## 17. Trip Status

```text
draft
planned
active
completed
archived
cancelled
```

## 18. Save / Read Cache

读取可缓存，但 Key 必须包含：

```text
trip_id + trip_version
```

## 19. Collaboration Roles

```text
owner
editor
viewer
```

权限仍由 Permission Model 执行。

## 20. Collaboration Mutation

多人编辑同样走：

```text
base_version
optimistic lock
audit
```

## 21. Presence

“谁正在看/编辑”属于临时 Presence，不写入 Trip 正式版本。

## 22. Suggestion Mode

同行人可：

```text
suggest change
```

生成 Proposal，不直接 Mutation。

## 23. Sharing

分享对象：

```text
trip membership
role
invitation
expiry
revocation
```

与公开链接分离。

## 24. Public Share

如未来支持，只提供受限只读快照，默认不暴露：

- Booking reference
- payment details
- precise realtime location
- private notes

## 25. Offline Editing

离线可创建：

```text
local pending operations
```

恢复网络后基于原 base_version 同步。

若冲突则要求 merge / rebase。

## 26. Offline Snapshot

带：

```text
trip_version
generated_at
data_bundle_id
```

## 27. Undo

内部可逆 Trip Mutation 支持：

```text
undo → new version
```

不是把数据库版本号倒退。

## 28. Restore Version

恢复旧版本应：

```text
old snapshot
→ generate new Change Set
→ validate
→ apply as latest version
```

保持历史不可变。

## 29. Delete

默认 Soft Delete / Archive。

涉及 Booking / Payment 的业务记录不能因 Trip 删除而一起物理删除。

## 30. Referential Integrity

Trip Item 的：

```text
poi_id
reservation_id
route_snapshot_id
```

必须引用合法实体或明确 Tombstone 语义。

## 31. Audit

每次正式版本记录：

```text
actor
source
change set
before/after diff
trace_id
```

## 32. Events

```text
trip.created
trip.updated
trip.version.created
trip.item.added
trip.item.removed
trip.lock.changed
trip.completed
```

## 33. API Contract

建议：

```text
GET /api/trips/:id
GET /api/trips/:id/versions/:version
POST /api/trips/:id/actions
GET /api/trips/:id/days/:dayId
POST /api/trips/:id/share
```

写操作不开放任意 JSON Patch。

## 34. Planner Read Model

Planner 读取专门 DTO：

```text
trip version
days
items
anchors
locks
reservations
constraints
```

## 35. v1 Gate

- Trip 是独立 Source of Truth
- 所有写入带 base_version
- 冲突不静默覆盖
- Realtime version 与 Trip version 分离
- Undo 产生新版本
- Collaboration 使用相同 Action / Permission
- Offline Sync 有版本冲突处理
- Delete 不破坏 Booking / Audit

## 36. 最终冻结原则

> Trip 保存的是当前正式旅行计划，Conversation 保存的是讨论过程。

> Planner 输出不是 Trip，只有执行成功的 Change Set 才形成新版本。

> 所有设备、AI、Planner 和同行人都围绕同一个版本化 Trip Aggregate 协作。

> 历史版本不可重写，恢复旧方案也应生成新的当前版本。
