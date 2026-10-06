# TravelAssist — Execution Adapter / Transaction / Compensation / Audit Model 设计

> 状态：建议冻结为 AI Action 执行可靠性 v1  
> 适用范围：Trip Mutation、Booking / Order、外部通信、Sharing、Preference、支付跳转与后续第三方执行  
> 上游依赖：
> - AI 能力边界定义
> - AI Conversation Message Model
> - Prompt / System Instruction v1
> - AI API 接入层
> - AI Orchestrator / Tool Router / Context Builder
> - Action Router / Confirmation / Permission Model
>
> 核心目标：
> - 用户完成确认后，所有 Action 都通过统一 Execution Layer 执行
> - TravelAssist 内部单系统修改尽量事务化
> - 跨数据库 / 第三方系统操作采用 Saga / Compensation，而不是假装存在分布式事务
> - 所有外部副作用必须幂等、可追踪、可恢复、可审计
> - HTTP 成功不等于业务成功，必须进行 Postcondition Verification
> - AI 只消费标准化执行结果，不直接判断“是否执行成功”

---

# 1. 总体位置

完整链路：

```text
AI Orchestrator
      ↓
Proposal
      ↓
Validator
      ↓
Action Router
      ↓
Permission
      ↓
Confirmation
      ↓
Action Request
      ↓
Execution Coordinator
      ↓
Execution Adapter
      ↓
Internal DB / External Provider
      ↓
Postcondition Verification
      ↓
Transaction Commit / Saga State
      ↓
Audit
      ↓
Normalized Action Result
      ↓
Conversation Event / UI
```

本设计重点从：

```text
Action Request 已获授权
```

开始。

---

# 2. 四个核心模块

## 2.1 Execution Adapter

负责：

```text
如何调用具体业务系统
```

例如：

- Trip Repository
- Booking Provider
- Order Service
- Messaging Provider
- Sharing Service
- Preference Service

## 2.2 Transaction Model

负责：

```text
一个逻辑操作怎样保证内部数据的一致性
```

适用于同一数据库、同一业务边界、可真正使用数据库事务的操作。

## 2.3 Compensation Model

负责：

```text
跨系统操作失败后，如何补偿已经成功的前置步骤
```

适用于 Booking Provider、外部 Message、多服务更新和无法真正回滚的第三方系统。

## 2.4 Audit Model

负责：

```text
谁在什么时候，为什么，执行了什么，结果是什么
```

必须覆盖用户、AI Turn、Proposal、Confirmation、Action、Adapter、Provider、Before / After、Error、Compensation 与 Final State。

---

# 3. Execution Layer 设计原则

必须遵守：

```text
Authorization ≠ Execution
Execution ≠ Success
Transport Success ≠ Business Success
Retry ≠ Duplicate Execution
Rollback ≠ Compensation
AI Response ≠ Audit Record
```

---

# 4. 推荐目录

```text
src/server/actions/
  execution/
    execution-coordinator.ts
    execution-context.ts
    execution-result.ts

  adapters/
    trip-action.adapter.ts
    preference-action.adapter.ts
    sharing-action.adapter.ts
    external-message.adapter.ts
    booking-action.adapter.ts
    order-action.adapter.ts
    payment-handoff.adapter.ts

  transactions/
    transaction-manager.ts
    trip-transaction.ts

  saga/
    saga-coordinator.ts
    saga-definition.ts
    compensation-runner.ts
    saga-recovery.ts

  idempotency/
    idempotency-store.ts
    idempotency-guard.ts

  verification/
    precondition-verifier.ts
    postcondition-verifier.ts

  audit/
    action-audit.service.ts
    audit-redaction.ts
    audit-query.ts

  errors/
    execution-errors.ts
```

---

# 5. Execution Coordinator

Action Router 不直接调用业务 Adapter，统一经过 Execution Coordinator。

职责：

1. 载入 Action Request
2. 校验 authorized 状态
3. 校验 Confirmation 是否 consumed-ready
4. 取得 Idempotency Lock
5. 再次验证 Preconditions
6. 选择 Execution Strategy
7. 调用 Adapter
8. 验证 Postconditions
9. Commit / Compensation
10. 写 Audit
11. 生成标准化结果
12. 发送 Domain / Conversation Event

---

# 6. Execution Context

```ts
export interface ExecutionContext {
  actionRequestId: string;
  actionName: string;
  actionVersion: string;

  userId: string;
  actorRole: string;

  resourceType: string;
  resourceId: string;

  conversationId?: string;
  turnId?: string;
  proposalId?: string;
  confirmationId?: string;

  idempotencyKey?: string;
  baseVersion?: number;

  traceId: string;
  requestedAt: string;
}
```

Adapter 不自行猜 Actor / 权限来源。

---

# 7. Execution Adapter Interface

```ts
export interface ExecutionAdapter<TInput, TResult> {
  readonly adapterName: string;
  readonly version: string;

  validateInput(input: TInput): Promise<void>;

  precheck(
    context: ExecutionContext,
    input: TInput
  ): Promise<PrecheckResult>;

  execute(
    context: ExecutionContext,
    input: TInput
  ): Promise<TResult>;

  verify(
    context: ExecutionContext,
    input: TInput,
    result: TResult
  ): Promise<VerificationResult>;

  compensate?(
    context: ExecutionContext,
    input: TInput,
    result: TResult
  ): Promise<CompensationResult>;
}
```

---

# 8. Adapter 必须是窄接口

错误：

```text
GenericHttpAdapter
execute(url, method, body)
```

推荐：

```text
TripActionAdapter
BookingCancellationAdapter
ExternalMessageAdapter
```

这样权限、风险、审计、Retry、Compensation 与 Provider Secret 都能明确控制。

---

# 9. Execution Strategy

每个 Action Definition 指定：

```ts
type ExecutionStrategy =
  | "local_transaction"
  | "single_external"
  | "saga";
```

---

# 10. Local Transaction

适用于 Trip 内部修改、Preference 修改、Sharing DB 状态修改和内部 Order Metadata。

条件：

- 同一数据库
- 同一个事务边界
- 可以 ACID Commit / Rollback

例如一次 Planner Proposal 包含移动、删除、新增三个 Trip Mutation：

```text
BEGIN
  verify trip version = 19
  move item
  remove item
  add item
  recalculate sequence
  validate invariant
  update trip version = 20
  insert audit event
  insert outbox event
COMMIT
```

任何一步失败则 ROLLBACK。

---

# 11. Transaction Boundary

不要把第三方 API 调用放在数据库事务中长时间等待。

错误：

```text
BEGIN DB TRANSACTION
→ call hotel API for 20 seconds
→ COMMIT
```

这会长时间持锁、增加死锁风险，而且第三方动作无法被数据库回滚。

---

# 12. External Action

单个外部动作，例如：

```text
message.send_external
booking.cancel
```

通常采用：

```text
Idempotency
+
Provider Request
+
Result Verification
+
Local State Update
```

而不是 DB Rollback。

---

# 13. Saga

当一个用户动作跨多个系统时使用 Saga。

例如重新安排住宿可能涉及：

```text
1. 创建新酒店预订
2. 写入 TravelAssist Order
3. 更新 Trip
4. 取消旧酒店
5. 更新共享同行人状态
```

不能使用一个真正的数据库事务覆盖全部系统。

Saga = 一组有顺序的 Step + 每个 Step 的成功状态 + 必要时对应 Compensation。

---

# 14. Saga Definition

```ts
interface SagaDefinition {
  name: string;
  version: string;
  steps: SagaStepDefinition[];
}

interface SagaStepDefinition {
  stepName: string;
  action: string;
  compensationAction?: string;
  retryPolicy: "none" | "safe_retry";
  critical: boolean;
}
```

Saga 状态：

```ts
type SagaStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "compensating"
  | "compensated"
  | "partial_failure"
  | "manual_intervention_required";
```

Step 状态：

```ts
type SagaStepStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "compensating"
  | "compensated"
  | "compensation_failed";
```

---

# 15. 推荐数据表

```text
action_executions
action_execution_steps

action_sagas
action_saga_steps

action_idempotency_records

action_compensations

action_audit_logs
```

与 Action Request / Confirmation 分离职责。

---

# 16. action_executions

建议字段：

```text
id
action_request_id
action_name
action_version
execution_strategy
adapter_name
adapter_version
resource_type
resource_id
status
attempt_count
provider
provider_reference_id
started_at
completed_at
failed_at
error_code
trace_id
created_at
updated_at
```

状态：

```ts
type ExecutionStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "unknown"
  | "compensating"
  | "compensated"
  | "manual_review";
```

---

# 17. 为什么需要 unknown

例如：

```text
请求发送给酒店 Provider
↓
网络超时
```

此时无法确定 Provider 没收到，还是 Provider 已执行但响应丢失。

禁止直接重试有副作用操作。

应该：

```text
status = unknown
↓
query provider by idempotency / reference
↓
resolve state
```

---

# 18. Idempotency Model

任何外部副作用必须优先设计 Idempotency。

Key 推荐来自服务端：

```text
action_request_id
+
action_name
+
provider scope
```

Idempotency Record：

```text
idempotency_key
action_request_id
payload_hash
status
provider_reference_id
result_hash
created_at
locked_at
completed_at
expires_at
```

状态：

```ts
type IdempotencyStatus =
  | "new"
  | "processing"
  | "succeeded"
  | "failed"
  | "unknown";
```

相同 key + payload_hash 已成功时返回已有结果；processing 时不重复执行；相同 key + 不同 payload 返回 IDEMPOTENCY_PAYLOAD_CONFLICT。

---

# 19. Retry

Retry 必须按 Action 分类。

Safe Retry：

- 内部只读
- 确定性计算
- Provider 明确支持 idempotency 的写操作

Unsafe Retry：

- 无 idempotency 的外部发送
- 无查询接口的取消操作
- 不明确最终状态的付款相关操作

Timeout 只能表示这次调用未在时间窗口内得到确定结果，不能等价于业务没有执行。

---

# 20. Preconditions

执行前重新检查：

- 用户仍有权限
- Confirmation 仍有效
- Action 未执行
- Resource Version 未变化
- Provider 状态仍允许此操作
- 价格 / 退款规则未发生关键变化
- 依赖资源仍存在

如果确认后发生重大变化，例如退款损失从 ¥5,000 变为 ¥25,000：

```text
ACTION_PRECONDITION_CHANGED
```

必须重新确认。

---

# 21. Postcondition Verification

任何写操作执行后必须回答：

```text
系统最终状态是否符合目标？
```

Trip 修改至少验证：

```text
trip.version
item exists
time correct
no duplicate sequence
planner invariant passes
```

Booking Cancel 不能只检查 HTTP 200，而要检查 Provider 的业务状态。

如果 Provider 返回：

```text
cancel_requested
```

UI 只能显示：

```text
取消请求已提交
```

直到状态真正成为 cancelled。

---

# 22. Normalized Execution Result

```ts
interface NormalizedExecutionResult {
  executionId: string;
  success: boolean;

  finality:
    | "final"
    | "pending"
    | "unknown";

  businessStatus: string;

  provider?: string;
  providerReferenceId?: string;

  userMessageKey: string;
  completedAt?: string;

  compensationAvailable: boolean;
}
```

AI / UI 必须按 finality 说话。

---

# 23. Compensation 与 Rollback

Rollback：

```text
事务尚未提交
→ 恢复数据库
```

Compensation：

```text
已经产生外部副作用
→ 使用另一个业务动作尽量抵消
```

禁止系统自动猜某个 Action 的逆操作。

Action Definition 必须声明：

```text
reversible
compensation_action
compensation_policy
```

---

# 24. Compensation Policy

```ts
type CompensationPolicy =
  | "automatic"
  | "manual_confirmation"
  | "manual_operator"
  | "none";
```

只有在明确安全、无新增费用、Provider 支持、Compensation 本身幂等且用户授权范围覆盖时，才允许 automatic。

---

# 25. 不可补偿操作

例如：

- 已发送外部消息
- 已消费优惠券
- 某些不可退款订单
- 某些付款结算

不能假装“回滚”。

必须进入：

```text
manual_intervention_required
```

或：

```text
compensation = none
```

---

# 26. Saga Example

```text
User Confirm
↓
Saga Start

Step 1:
booking.create_new
→ success

Step 2:
trip.replace_hotel
→ success

Step 3:
booking.cancel_old
→ fail

Saga enters compensating

Compensation 2:
trip.restore_old_hotel
→ success

Compensation 1:
booking.cancel_new
→ success

Saga:
compensated
```

如果 Compensation 也失败：

```text
manual_intervention_required
```

必须向用户展示实际当前状态，而不是简单显示“操作失败”。

---

# 27. Transactional Outbox

内部数据库状态变更后需要发送 Domain Event、Conversation Event、Notification、Analytics。

推荐 Transactional Outbox：

```text
BEGIN
  UPDATE trip
  INSERT audit record
  INSERT outbox event
COMMIT
```

避免 DB Commit 成功但 Event Publish 失败。

---

# 28. Domain Event 与 Conversation Event

Domain Event 给系统消费：

```text
trip.updated
booking.cancel_requested
```

Conversation Event 给用户时间线展示：

```text
第 2 天行程已更新
酒店取消请求已提交
```

两者不要混为一个存储模型。

---

# 29. Audit Model

Audit 必须覆盖四层：

## Decision Audit

为什么产生 Proposal。

## Authorization Audit

Permission / Confirmation 如何通过。

## Execution Audit

实际调用了什么。

## Recovery Audit

发生了哪些 Retry / Compensation。

---

# 30. Action Audit Fields

建议：

```text
id
trace_id
conversation_id
turn_id
proposal_id
action_request_id
confirmation_id
execution_id
saga_id
user_id
actor_role
action_name
action_version
adapter_name
adapter_version
resource_type
resource_id
permission_decision
risk_level
payload_hash
before_state_hash
after_state_hash
idempotency_key
provider
provider_reference_id
execution_status
finality
error_code
compensation_status
created_at
```

---

# 31. Before / After

优先保存最小必要 diff，而不是完整资源快照。

例如：

```json
{
  "item_id": "item_23",
  "field": "start_time",
  "before": "15:30",
  "after": "10:00"
}
```

必要时保存 redacted snapshot。

---

# 32. Audit Immutable Principle

业务层不提供：

```text
update old audit record
```

如需更正：

```text
追加 correction / superseding record
```

避免覆盖历史。

---

# 33. Trace Correlation

同一次用户操作必须能从：

```text
Conversation
→ Turn
→ Proposal
→ Confirmation
→ Action
→ Execution
→ Provider
→ Compensation
```

通过 trace_id 串起来。

---

# 34. Error Taxonomy

```text
EXECUTION_INVALID_STATE
EXECUTION_ALREADY_RUNNING
EXECUTION_ALREADY_COMPLETED

EXECUTION_PRECONDITION_FAILED
EXECUTION_PRECONDITION_CHANGED

EXECUTION_VERSION_CONFLICT

EXECUTION_IDEMPOTENCY_CONFLICT
EXECUTION_IDEMPOTENCY_LOCKED

EXECUTION_ADAPTER_ERROR
EXECUTION_PROVIDER_TIMEOUT
EXECUTION_PROVIDER_REJECTED
EXECUTION_RESULT_UNKNOWN

EXECUTION_POSTCONDITION_FAILED

TRANSACTION_FAILED

SAGA_FAILED
COMPENSATION_FAILED
MANUAL_INTERVENTION_REQUIRED
```

Provider 原始错误转换为用户可理解信息，同时在 Audit 保留原始 Provider Code。

---

# 35. Manual Intervention

建议建立：

```text
action_recovery_cases
```

字段：

```text
id
execution_id
saga_id
severity
reason
current_state
recommended_actions
status
assigned_to
created_at
resolved_at
```

状态：

```text
open
investigating
waiting_user
resolved
closed
```

第一阶段即使没有客服后台，也应先保留模型。

---

# 36. AI 对 Execution Result 的权限

AI 只能获得：

```text
NormalizedExecutionResult
```

不直接消费 raw provider payload、secret、payment token 或内部 exception stack。

规则：

```text
finality = final + success = true
→ 可说“已完成”

finality = pending
→ “请求已经提交，目前仍在处理中”

finality = unknown
→ “目前无法确认最终状态，我不会重复提交该操作”
```

---

# 37. External Messaging

发送类 Adapter 至少保存：

```text
destination identifier
provider
provider_message_id
sent_at
delivery state if available
content hash
```

如果 Provider 支持 queued / sent / delivered / failed，必须区分。

---

# 38. Payment Handoff

TravelAssist 建议只建立：

```text
Payment Handoff Adapter
```

职责：

- 创建第三方 Checkout Session
- 返回安全跳转信息
- 接收 Provider Webhook
- 更新 Order Payment State

AI 不直接处理支付凭证。

---

# 39. Webhook

外部系统异步完成时：

```text
Provider Webhook
↓
Verify Signature
↓
Idempotency
↓
Normalize Event
↓
Update Business State
↓
Audit
↓
Outbox
↓
Conversation / Notification Update
```

Webhook 是执行入口之一，不能绕过 Provider Signature Validation、Idempotency、State Machine 和 Audit。

---

# 40. Business State Machine

Booking / Order 等应有明确状态机。

例如：

```text
pending
↓
confirmed
↓
cancel_requested
↓
cancelled
```

Action State 与 Business State 分离：

```text
Action: executing / succeeded / failed
Booking: confirmed / cancelled
```

---

# 41. Concurrency

执行层必须处理：

- 同一 Action 双击
- 多设备同时确认
- 同行人同时编辑
- Webhook 与用户查询竞争

手段：

- Idempotency
- Optimistic Lock
- DB Unique Constraint
- Row Lock（必要时）
- State Machine Guard

---

# 42. Long-running Execution

外部系统操作支持：

```text
synchronous
asynchronous
```

长操作推荐：

```text
confirm
↓
Action = authorized
↓
Execution = pending
↓
Queue Worker
↓
execute
↓
event
↓
UI update
```

第一阶段可同步实现，但接口必须允许后续异步化。

---

# 43. Reconciliation

对于 Provider unknown / pending 状态，需要 Reconciliation Worker：

```text
query provider
resolve pending
resolve unknown
update local state
emit event
```

执行频率由 Provider type、Action type、SLA 与 Cost 配置，不由 AI 决定。

---

# 44. Source of Truth

最终业务状态来源：

```text
Trip            → TravelAssist DB
Booking         → Booking Provider + TravelAssist mirror
Payment         → Payment Provider
External Message→ Messaging Provider delivery state（如提供）
```

AI Conversation 永远不是最终状态源。

---

# 45. Sensitive Data

Execution / Audit 层统一 Redaction。

禁止记录：

- API Key
- OAuth Token
- Cookie
- Payment Secret
- Full Card Number
- CVV
- Password

可以记录必要的 last4、provider customer id、booking reference 等脱敏字段。

---

# 46. Observability

每个 Execution 至少记录：

```text
execution_count
success_rate
failure_rate
unknown_rate
p50_latency
p95_latency
retry_count
compensation_count
compensation_failure_rate
provider_error_rate
manual_intervention_rate
```

Provider 连续失败或 unknown 上升时，执行层应支持 Circuit Breaker：

```text
closed
open
half_open
```

---

# 47. Testability

每个 Adapter 必须支持 Mock / Fake：

```text
FakeBookingAdapter
FakeExternalMessageAdapter
FakePaymentHandoffAdapter
```

CI 不调用真实供应商。

Contract Test 至少覆盖：

- input schema
- normalization
- error mapping
- idempotency
- postcondition
- webhook

Failure Injection 必须覆盖：

- Provider timeout
- Provider 500
- Response lost after provider executed
- DB update fails after provider success
- Compensation fails
- Webhook duplicate
- Webhook out-of-order
- Concurrent confirmation
- Version conflict

---

# 48. 分阶段实现

## v1 — Trip / Preference

首批：

```text
trip.add_item
trip.move_item
trip.remove_item
trip.update_time
trip.lock_item
preference.update
```

Execution Strategy：

```text
local_transaction
```

具备：

- Optimistic Lock
- Transaction
- Audit
- Outbox
- Undo / Compensation 基础

## v2 — External Message / Booking

增加：

```text
message.send_external
booking.create
booking.modify
booking.cancel
```

必须具备：

- explicit confirmation
- idempotency
- provider reference
- pending / unknown
- reconciliation
- compensation policy

## v3 — Payment

只实现：

```text
payment.create_handoff
```

TravelAssist 创建 Checkout、追踪 Provider 状态、管理订单状态；禁止自行处理卡信息或 AI 自动付款。

---

# 49. 验收 Gate — Execution Adapter

必须满足：

- 所有执行通过统一 Adapter
- Adapter 不接受任意 URL / SQL
- Adapter 有版本号
- Adapter 有标准化 Result
- Action Request 与 Execution 分离
- AI 不直接访问 Provider Secret

---

# 50. 验收 Gate — Transaction / Idempotency

必须满足：

- 同一 Trip Proposal 可原子执行
- Mutation + Audit + Outbox 同事务
- Optimistic Lock 生效
- 不把第三方 HTTP 请求塞进长 DB Transaction
- 重复确认不会重复执行
- 相同 key 不同 payload 会拒绝
- processing 状态不会重复调用 Provider

---

# 51. 验收 Gate — Verification / Compensation

必须满足：

- HTTP 成功不等于业务成功
- 执行后必须验证 Postcondition
- 支持 final / pending / unknown
- Compensation 与 Rollback 分离
- 可补偿 Action 显式定义逆业务动作
- Compensation 自身幂等
- Compensation 失败可进入 manual intervention
- 不可逆动作明确标记
- Partial Failure 展示真实当前状态

---

# 52. 验收 Gate — Audit

必须满足：

- Proposal → Confirmation → Action → Execution 可全链路追踪
- 每次执行有 trace_id
- Adapter / Provider / Version 可追踪
- 有 payload hash
- 有 before / after 或最小 diff
- Error / Retry / Compensation 有记录
- 审计记录不可由普通业务流程覆盖修改
- Secret 不进入 Audit

---

# 53. 与完整 AI 系统的关系

```text
AI Capability Boundary
        ↓
Conversation Message Model
        ↓
Prompt / System Instruction
        ↓
AI API Layer
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
Execution Coordinator
        ↓
Execution Adapter
        ↓
Transaction / Saga
        ↓
Postcondition
        ↓
Compensation / Reconciliation
        ↓
Audit / Outbox
        ↓
Business State + Conversation Event
```

---

# 54. 最终冻结原则

> Confirmation 只代表“用户授权执行”，不代表执行已经成功。

> Execution Adapter 是业务系统与 AI Action 层之间唯一允许的执行接口。

> 内部一致性用 Transaction，跨系统一致性用 Saga / Compensation。

> 第三方 Timeout 必须允许进入 unknown，不得盲目重试。

> 所有外部副作用必须优先具备 Idempotency。

> HTTP 状态码不是最终业务状态，Postcondition Verification 才决定结果。

> 无法自动恢复时必须进入明确的 Partial Failure / Manual Intervention，而不是假装回滚成功。

> Audit 必须覆盖决策、授权、执行、恢复四个阶段。

> Conversation 用来解释“发生了什么”，业务系统和 Provider 才保存“现在是什么”。
