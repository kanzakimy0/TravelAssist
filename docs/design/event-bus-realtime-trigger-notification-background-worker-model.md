# TravelAssist — Event Bus / Realtime Trigger / Notification / Background Worker Model

> 状态：建议冻结为实时事件基础设施 v1  
> 适用范围：主系统 AI、实时旅行助手、Planner、天气、交通、Booking / Order、位置进度、通知、Webhook、异步执行  
> 上游依赖：
> - AI 能力边界定义
> - AI Conversation Message Model
> - Prompt / System Instruction v1
> - AI API 接入层
> - AI Orchestrator / Tool Router / Context Builder
> - Action Router / Confirmation / Permission Model
> - Execution Adapter / Transaction / Compensation / Audit Model

---

# 1. 总体架构

```text
External Provider / Internal Domain
            ↓
         Event Ingest
            ↓
          Event Bus
            ↓
      Event Normalizer
            ↓
      Realtime Trigger
            ↓
   Trigger Policy / Dedup
            ↓
      Background Worker
            ↓
 ┌──────────┼────────────┐
 ↓          ↓            ↓
AI        Planner      Action
Orch.     /Validator   Router
 ↓          ↓            ↓
Result / Proposal / Execution
            ↓
       Notification
            ↓
 Web / Mobile / Push / In-app
```

核心原则：

> Event 表示“事实发生了什么”。

> Trigger 表示“这件事是否需要系统响应”。

> Worker 表示“系统怎样可靠处理”。

> Notification 表示“用户是否需要知道，以及通过什么渠道知道”。

---

# 2. 四层职责

## 2.1 Event Bus

负责事件发布、事件订阅、生产者/消费者解耦、事件持久化、消费状态、重试、Dead Letter 与可观察性。

不负责 AI 推理、用户通知策略、权限判断和 Trip Mutation。

## 2.2 Realtime Trigger

负责事件过滤、Trip/User 相关性判断、风险分级、频率控制、去重、冷却、Material Change 判断，以及决定是否需要 AI / Planner。

不直接执行 Action，不绕过 Confirmation。

## 2.3 Notification

负责是否通知、何时通知、通知级别、渠道、聚合、静默、用户偏好、去重以及已读状态。

## 2.4 Background Worker

负责异步执行、重试、延迟/定时任务、事件消费、Reconciliation、Compensation、Webhook 后处理、通知投递与 Proactive AI Task。

---

# 3. Event Source

```text
internal_domain
external_webhook
realtime_provider
scheduler
user_device
background_reconciliation
system_monitor
```

典型事件：

```text
trip.updated
trip.day.started
trip.item.completed

booking.status.changed
payment.status.changed

weather.alert.updated
transport.service.disrupted

location.updated
trip.progress.delayed

action.execution.unknown
action.compensated
```

---

# 4. Event Envelope

```ts
export interface EventEnvelope<TPayload = unknown> {
  eventId: string;
  eventType: string;
  eventVersion: string;

  source: string;
  sourceEventId?: string;

  aggregateType?: string;
  aggregateId?: string;
  aggregateVersion?: number;

  userId?: string;
  tripId?: string;

  occurredAt: string;
  receivedAt: string;
  expiresAt?: string;

  traceId: string;
  correlationId?: string;
  causationId?: string;

  chainDepth?: number;

  payload: TPayload;

  metadata?: {
    provider?: string;
    region?: string;
    schemaVersion?: string;
  };
}
```

---

# 5. Event Identity

`eventId` 由 TravelAssist 生成，全局唯一。

第三方存在唯一事件号时必须保存 `sourceEventId`，并建议唯一约束：

```text
(source, source_event_id)
```

用于防止重复 Webhook。

---

# 6. correlationId / causationId

`correlationId` 串联同一业务流程：

```text
weather alert
→ trigger
→ AI assessment
→ planner proposal
→ notification
```

`causationId` 表示当前事件由哪个前置事件造成，用于追踪与防止循环。

---

# 7. Event Type 命名

统一：

```text
domain.entity.action
```

例如：

```text
trip.item.updated
weather.alert.updated
transport.service.disrupted
booking.status.changed
notification.delivery.failed
```

---

# 8. Event Version

所有 Event Schema 必须版本化：

```text
eventVersion = "1"
```

新 Consumer 应兼容明确支持的版本，不直接依赖“当前最新 payload”。

---

# 9. Event 与 Command 分离

Event：

```text
transport.service.disrupted
```

表示事实。

Command：

```text
replan_trip
```

表示请求执行。

禁止把两者混成同一种消息。

---

# 10. system_events

建议表：

```text
id
event_id
event_type
event_version

source
source_event_id

aggregate_type
aggregate_id
aggregate_version

user_id
trip_id

payload
payload_hash

occurred_at
received_at
expires_at

trace_id
correlation_id
causation_id
chain_depth

status
created_at
```

---

# 11. Event Payload 原则

Event Payload 保存处理事件所需的最小业务事实。不要复制完整 Trip、完整 Profile、完整 AI Context 或不必要的 Provider 原始 Payload。

---

# 12. Event Normalizer

```text
Webhook / Provider Feed
↓
Signature / Source Verify
↓
Schema Validate
↓
Provider Parser
↓
Normalizer
↓
TravelAssist Event
```

下游 Consumer 不直接依赖 Provider 原始字段。

---

# 13. Event Bus 抽象

```ts
interface EventBus {
  publish(event: EventEnvelope): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): Promise<void>;
}
```

底层可替换为 DB-backed Queue、Redis Streams、SQS / PubSub 或 Kafka。业务代码不绑定具体中间件。

---

# 14. v1 技术策略

初期推荐：

```text
PostgreSQL Transactional Outbox
+
可靠 Queue
+
Workers
```

不必为了架构完整度过早引入 Kafka。

---

# 15. Transactional Outbox

业务事务：

```text
BEGIN
  mutate state
  insert audit
  insert outbox event
COMMIT
```

Outbox Worker：

```text
Outbox
↓
Event Bus
```

避免 DB 已提交但事件丢失。

---

# 16. Inbox Pattern

Consumer 使用 Inbox 防重复：

```text
event_inbox

consumer_name
event_id
status
processed_at
result_hash
```

唯一约束：

```text
(consumer_name, event_id)
```

---

# 17. Delivery Semantics

系统默认按 `at-least-once` 设计，因此所有 Consumer 必须幂等，不得依赖“每条消息只来一次”。

---

# 18. Ordering

不追求全局顺序。同一 Aggregate 使用 `aggregate_version` 防止旧事件覆盖新状态。

例如当前 Trip Version = 21、事件 Version = 20，应跳过或仅审计。

---

# 19. Event Dedup

去重可结合：

```text
event_id
source_event_id
business_fingerprint
```

没有 sourceEventId 的实时 Provider，可用：

```text
event_type + entity + severity + time_window + provider
```

生成 fingerprint。

---

# 20. Realtime Trigger Rule

```ts
interface RealtimeTriggerRule {
  id: string;
  triggerType: string;
  eventTypes: string[];
  enabled: boolean;
  severityThreshold?: string;
  cooldownSeconds?: number;
  dedupWindowSeconds?: number;
  action:
    | "ignore"
    | "record"
    | "notify"
    | "invoke_ai"
    | "invoke_planner";
  requiresActiveTrip: boolean;
}
```

---

# 21. Trigger Pipeline

```text
Event
↓
Normalize
↓
Find Relevant User / Trip
↓
Rule Match
↓
Active Trip Check
↓
Expiry Check
↓
Dedup
↓
Cooldown
↓
Material Change
↓
Severity
↓
Trigger Decision
```

---

# 22. Trigger Decision

```ts
interface TriggerDecision {
  matched: boolean;
  decision:
    | "ignore"
    | "record_only"
    | "notify_only"
    | "invoke_ai"
    | "invoke_planner";
  severity: "info" | "low" | "medium" | "high" | "critical";
  reasonCode: string;
  userId?: string;
  tripId?: string;
}
```

---

# 23. Trigger 不直接写业务状态

禁止：

```text
Train cancelled
→ Trigger directly modifies Trip
```

正确：

```text
Train cancelled
→ Trigger Decision
→ Worker
→ AI / Planner
→ Proposal
→ Action Router
```

---

# 24. Proactive AI Request

```ts
interface ProactiveAIRequest {
  triggerId: string;
  sourceEventId: string;
  userId: string;
  tripId: string;
  assistantType: "realtime";
  contextProfile: string;
  objective:
    | "assess_impact"
    | "replan"
    | "explain"
    | "notify";
  severity: string;
}
```

---

# 25. Proactive AI Boundary

主动 AI 可以判断当前行程影响、调用 Planner、生成 Proposal、解释风险和生成通知内容；不能自动付款、自动取消高风险订单、绕过 Action Router / Permission / Confirmation，也不能无限频率调用 AI。

---

# 26. Severity

```text
info
low
medium
high
critical
```

建议：

```text
info     → record
low      → silent/in-app
medium   → AI assessment / in-app
high     → Planner + push + in-app
critical → immediate attention path
```

`critical` 必须极少使用，避免 Alert Fatigue。

---

# 27. Cooldown / Material Change

同一事件类必须支持 Cooldown。例如中央线延误 12m → 14m → 13m，不应产生三次完整提醒。

只有实质变化才重新触发，例如 delay 10m → 35m。阈值由规则配置，不由 AI 自行决定。

---

# 28. realtime_trigger_states

```text
trigger_key
user_id
trip_id
last_event_id
last_severity
last_fingerprint
last_triggered_at
cooldown_until
state
updated_at
```

---

# 29. Active Trip / Relevance Gate

实时触发必须确认 Trip 正在进行、实时助手已启用、事件与当前旅行时间窗口有关且尚未过期。

历史 Trip 不触发实时 AI；用户 7 天后才乘坐某线路时，今天的线路延误默认不触发。

---

# 30. Location Event / Privacy

位置相关事件仅在用户明确授权后使用：

```text
location.updated
trip.progress.delayed
user.arrived
user.departed
```

位置数据应最小化保存、短期保留、不进入普通长期 AI Memory、不用于无关画像；同行人共享必须独立授权。

---

# 31. Background Job

```ts
interface BackgroundJob<TPayload = unknown> {
  jobId: string;
  jobType: string;
  jobVersion: string;
  payload: TPayload;
  priority: "critical" | "high" | "normal" | "low";
  runAt: string;
  attempt: number;
  maxAttempts: number;
  dedupKey?: string;
  traceId: string;
  correlationId?: string;
}
```

---

# 32. Job Types

```text
outbox.publish
event.consume
realtime.evaluate
realtime.ai_assess
realtime.replan
notification.dispatch
provider.reconcile
action.compensate
booking.sync
payment.sync
conversation.summarize
```

---

# 33. Queue Isolation

逻辑上至少区分：

```text
critical
realtime
default
notification
reconciliation
slow
```

避免低优先任务堵住实时告警。

---

# 34. Retry / DLQ

Worker 自动重试只用于安全任务，采用 exponential backoff + jitter。

超出最大尝试进入 `background_dead_letters`，关键任务进入 DLQ 时必须产生监控告警，必要时创建 Recovery Case。

---

# 35. Worker Dedup / Leasing

Job 建议具有业务 `dedup_key`，例如：

```text
realtime.evaluate:{event_id}:{trip_id}
```

多 Worker 使用 lease / visibility timeout，Worker 崩溃后 Job 可重新可见，因此 Handler 必须幂等。

---

# 36. Scheduled / Stale / Cancellation

支持 `run_at` 用于出发前天气复查、交通复查、Booking 同步、Trip Day 开始检查。

执行前再次检查 Job 是否仍相关。Trip 删除、实时助手关闭、Event 过期、Booking 进入终态时，Pending Job 应取消或 `skip_as_stale`。

---

# 37. Notification 三层模型

```text
Notification Intent
↓
Notification Record
↓
Delivery Attempt
```

Notification Intent 表示系统认为用户应知道什么，Delivery 表示具体是否通过 Push / In-app / Email 送达。

---

# 38. notifications

```text
id
user_id
trip_id
type
severity
title
body
source_event_id
trigger_id
conversation_id
message_id
status
dedup_key
created_at
read_at
dismissed_at
expires_at
```

状态：

```text
pending
delivered
read
dismissed
expired
failed
```

---

# 39. Notification Channels

v1：

```text
in_app
push
email
```

旅行中优先 in-app + push；Email 更适合非即时摘要或重要 Booking 信息。

---

# 40. Channel Policy

默认建议：

```text
info      → in_app
low       → in_app
medium    → in_app / push when relevant
high      → push + in_app
critical  → push + in_app
```

最终仍须尊重用户设置和 Quiet Hours。

---

# 41. Notification Preference / Quiet Hours

建议独立保存：

```text
realtime_transport
weather_alert
trip_delay
booking_status
price_change
push_enabled
email_enabled
quiet_hours
timezone
```

非紧急通知必须尊重静默时间；是否突破 Quiet Hours 由产品规则决定，AI 无权自行突破。

---

# 42. Notification Dedup / Aggregation

同一 Trip、同一事件类别、同一 Material State 应合并。

天气、交通、用户迟到若共同影响同一个行程，可聚合成一条综合提醒，而不是多个 Push。

---

# 43. Notification + Conversation

重要实时事件建议同时产生：

```text
Notification
+
Conversation Message
```

Notification 负责吸引注意，Conversation Message 负责完整解释、Proposal 和 Action Buttons。

---

# 44. Push Payload

Push 只放：

```text
notification_id
type
trip_id
deep_link_context
```

禁止放完整订单、精确位置、支付信息或完整 AI 消息。

---

# 45. notification_deliveries

```text
id
notification_id
channel
provider
status
attempt_count
provider_message_id
sent_at
delivered_at
failed_at
error_code
```

Delivery Status：

```text
queued
sent
delivered
failed
unknown
```

---

# 46. Realtime Example — Transport

```text
Transport Provider
↓
transport.service.disrupted
↓
Event Bus
↓
Trigger
↓
Affected active Trip
↓
severity = high
↓
Worker
↓
Planner Replan
↓
Validator
↓
Proposal
↓
Push + In-app
↓
User opens Conversation
```

---

# 47. Realtime Example — User Delay

```text
Location / Progress
↓
trip.progress.delayed
↓
Trigger
↓
Impact exceeds threshold
↓
AI assess
↓
Planner replan
↓
Proposal
↓
Notification
```

涉及预约项目时仍需 Confirmation。

---

# 48. Realtime Example — Weather

```text
weather.alert.updated
↓
Outdoor POIs affected
↓
Trigger medium/high
↓
AI / Planner
↓
Indoor alternative proposal
```

---

# 49. Booking Webhook

```text
Provider Webhook
↓
Verify Signature
↓
booking.status.changed
↓
Event Bus
↓
Booking Sync Worker
↓
Update local mirror
↓
Audit + Outbox
↓
Notification
```

Provider 状态无需 AI 判断。

---

# 50. Unknown Execution Reconciliation

Action Result 为 `unknown` 时由 `provider.reconcile` Worker 查询最终状态，再发布新的业务 Event。

不得因 Timeout 直接重新执行外部副作用。

---

# 51. Auto Optimize

仅当用户明确启用：

```text
realtime.auto_optimize = true
```

且风险 `<= low` 时，可请求自动执行。

仍必须经过：

```text
Action Router
Permission
Execution Adapter
Audit
```

---

# 52. Event Loop Prevention

防止：

```text
trip.updated
→ realtime planner
→ trip.updated
→ realtime planner
→ ...
```

统一使用：

```text
causation_id
origin
cooldown
dedup
chain_depth
```

超过 `MAX_EVENT_CHAIN_DEPTH` 停止自动触发并记录异常。

---

# 53. Trusted Suppression

必要时可信后端内部事件可标记：

```text
suppress_realtime_trigger = true
```

客户端不可提交或控制该字段。

---

# 54. Fan-out / Failure Isolation

一个 Event 可被多个 Consumer 消费，例如 Trip 更新可触发实时状态刷新、Search Index、Analytics 和 Notification。

关键 Consumer（Booking Sync、Payment State、Action Reconciliation）失败必须 Retry/DLQ/Recovery；非关键 Analytics 失败不得阻断主业务。

---

# 55. Timezone / Expiry

数据库时间统一 UTC。

用户通知与 Trip 定时任务使用 Trip Location Timezone。

实时 Event 必须支持 `expires_at`；时间敏感 Notification 到期后也必须 Expire。

---

# 56. Cost Control / Rule First

主动 AI 必须有 per-user、per-trip、per-trigger Budget 与 Cooldown。

优先级：

```text
Rule / State Machine
↓
Planner / deterministic engine
↓
AI reasoning
```

例如 Booking 已取消无需 AI；复杂影响分析和重规划才调用 AI。

---

# 57. AI Invocation Gate

调用 Proactive AI 前至少满足：

```text
事件相关
+
有现实影响
+
超过阈值
+
未被去重
+
不在 cooldown
+
用户授权允许
```

---

# 58. Webhook Security

必须：

- HTTPS
- Signature Verification
- Timestamp / Replay Protection
- Provider Allowlist
- Payload Size Limit
- Schema Validation
- sourceEventId Idempotency

持续失败的 Poison Message 必须进入 Dead Letter。

---

# 59. Notification Security / Retention

锁屏 Notification 必须最小化敏感数据。

分别制定：

```text
system event retention
worker job retention
notification retention
delivery log retention
location event retention
```

Location Event 使用更严格、更短的保留策略。

---

# 60. Observability

Event：

```text
events_received
events_published
events_consumed
event_lag
dedup_count
dead_letter_count
```

Trigger：

```text
triggers_evaluated
triggers_matched
triggers_suppressed
cooldown_hits
stale_skips
```

Worker：

```text
queue_depth
job_latency
retry_rate
failure_rate
dlq_rate
```

Notification：

```text
created
push_sent
delivery_rate
read_rate
dismiss_rate
duplicate_suppression_rate
```

Realtime AI：

```text
proactive_ai_runs
useful_trigger_rate
proposal_accept_rate
false_alert_rate
notification_open_rate
auto_optimize_success_rate
```

这些指标用于减少无效打扰，而不是追求更多通知。

---

# 61. 第一阶段实现范围

## Event Bus

```text
Event Envelope
Transactional Outbox
Event Store
Inbox / Dedup
At-least-once
Event Version
Basic Dead Letter
```

## Realtime Trigger

```text
Rule Registry
Active Trip Check
Severity
Dedup
Cooldown
Material Change
Expiry
```

## Background Worker

```text
Queue abstraction
Priority
Retry / Backoff
Job Dedup
Lease
Dead Letter
Scheduled Job
```

## Notification

```text
In-app
Push abstraction
User preference
Dedup
Read / Dismiss
Expiry
```

首批 Event：

```text
trip.updated
weather.alert.updated
transport.service.disrupted
booking.status.changed
action.execution.unknown
```

---

# 62. 第二阶段

增加：

```text
location.updated
trip.progress.delayed
provider reconciliation
notification aggregation
quiet hours
multi-device push
realtime proactive AI
planner proactive replan
```

---

# 63. 第三阶段

增加：

```text
dynamic trigger thresholds
adaptive notification policy
multi-region event bus
provider failover
advanced event replay
operational dashboard
automatic recovery workflows
```

---

# 64. Event Bus 验收 Gate

必须满足：

- Event 有唯一 ID
- Event 有版本
- Consumer 幂等
- 支持重复投递
- 支持 Inbox / Dedup
- 支持 Outbox
- 支持 Dead Letter
- 外部事件先 Normalize
- Event / Command 分离
- 旧 Aggregate Version 不覆盖新状态

---

# 65. Realtime Trigger 验收 Gate

必须满足：

- Trigger 与 Event 分离
- Trigger 有 Severity
- Trigger 有 Dedup
- Trigger 有 Cooldown
- 检查 Active Trip
- 检查 Expiry
- 检查 Material Change
- Rule 可解决的问题不调用 AI
- Trigger 不直接执行高风险 Action

---

# 66. Background Worker 验收 Gate

必须满足：

- Job 幂等
- Worker Crash 可恢复
- Retry 有 Backoff + Jitter
- 超限进入 DLQ
- 实时任务有独立优先级
- Stale Job 可跳过
- Pending Job 可取消
- trace_id / correlation_id 可追踪

---

# 67. Notification 验收 Gate

必须满足：

- Notification 与 Delivery 分离
- 用户偏好可控制
- 支持 Dedup
- 支持 Aggregation
- 支持 Read / Dismiss / Expiry
- Push Payload 最小化
- Conversation Message 承载完整解释
- 不把所有系统 Event 都变成用户通知

---

# 68. 与完整系统关系

```text
External / Internal Change
        ↓
Event Bus
        ↓
Realtime Trigger
        ↓
Background Worker
        ↓
Context Builder
        ↓
AI Orchestrator
        ↓
Tool Router
        ↓
Planner / Validator
        ↓
Proposal
        ↓
Action Router
        ↓
Permission
        ↓
Confirmation
        ↓
Execution Adapter
        ↓
Transaction / Saga
        ↓
Audit / Outbox
        ↓
Event Bus
        ↓
Notification
```

通过：

```text
causation_id
dedup
cooldown
chain_depth
```

形成可控闭环而不是无限循环。

---

# 69. 最终冻结原则

> Event Bus 传播事实，不负责业务决策。

> Realtime Trigger 判断“值不值得响应”，不直接改变业务状态。

> Background Worker 负责可靠异步执行，不突破 Permission / Action 边界。

> Notification 管理用户注意力，不是业务事实的 Source of Truth。

> Rule 能完成的判断优先 Rule；复杂影响分析与重规划才调用 AI。

> 所有主动 AI 都必须受到用户授权、成本预算、去重、冷却、时间相关性和风险等级约束。

> 实时旅行助手宁可少而准，也不要高频打扰。

> Webhook、Worker、AI、Action 最终都必须回到统一 Audit、Trace 和 Event 链路。
