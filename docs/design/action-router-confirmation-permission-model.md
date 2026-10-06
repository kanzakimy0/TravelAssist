# TravelAssist — Action Router / Confirmation / Permission Model

> 状态：建议冻结为 AI 写操作安全边界 v1  
> 适用：主系统 AI、Planner AI、实时旅行助手、酒店/交通/订单/翻译助手  
> 上游：AI 能力边界、Conversation Message Model、Prompt/API Layer、AI Orchestrator / Tool Router / Context Builder

## 1. 核心目标

这一层负责所有会改变 TravelAssist 或第三方系统状态的 AI 动作。

职责边界：

    Tool Router   = Read / Compute
    Action Router = Write / External Side Effect

任何 Trip、订单、预约、支付、外部消息、共享权限、长期偏好写入，都不得绕过 Action Router。

标准执行链：

    AI Orchestrator
      ↓
    Proposal
      ↓
    Planner / Business Validator
      ↓
    Action Router
      ↓
    Permission Evaluation
      ↓
    Risk Classification
      ↓
    Confirmation Policy
      ↓
    User Confirmation / Valid Pre-authorization
      ↓
    Idempotency + Version + Preconditions
      ↓
    Execution Adapter
      ↓
    Business System
      ↓
    Postcondition + Audit + Conversation Event

## 2. Action 定义与分类

Action 是任何可能改变系统状态、外部状态、访问权限或产生业务副作用的操作。

首批 Action 建议：

| Domain | Action |
|---|---|
| Trip | trip.add_item / trip.move_item / trip.remove_item / trip.update_time / trip.lock_item |
| Preference | preference.update |
| Sharing | sharing.invite / sharing.change_role / sharing.revoke |
| Booking | booking.create / booking.modify / booking.cancel |
| Order | order.attach / order.update |
| External communication | message.send_external |
| Financial | payment.create |

非 Action，例如 trip.get、poi.search、weather.forecast、route.calculate、planner.generate、planner.validate，继续由 Tool Router 管理。

Action 建议按四类处理：

1. Local State Action：只修改 TravelAssist 内部状态。
2. External Side Effect：调用酒店、交通、消息等第三方系统。
3. Financial Action：产生费用或付款义务。
4. Access / Sharing Action：改变其他用户的数据访问范围。

## 3. Action Registry

所有可执行写操作必须注册，禁止通用的 execute、do_action、update_anything。

建议定义：

    ActionDefinition
      name
      version
      inputSchema
      outputSchema
      resourceType
      riskLevel
      requiredPermissions
      confirmationPolicy
      idempotencyRequired
      optimisticLockRequired
      reversible
      compensationAction

命名统一采用 domain.verb，例如 trip.move_item、booking.cancel。

优先使用明确业务 Action，不提供任意 SQL、任意 JSON Patch、任意 URL fetch、Shell 或任意文件路径能力。

## 4. 风险等级

统一五级：

| Risk | 典型场景 | 默认确认策略 |
|---|---|---|
| none | 已读状态、无业务影响 UI 写入 | none |
| low | 未预约 POI 顺序调整、休息时间微调 | none/session，受授权范围限制 |
| medium | 删除普通景点、大范围重排、改变某日主题 | explicit |
| high | 酒店、已预约项目、跨城市交通、外部发送、显著费用、共享权限 | explicit |
| critical | 支付、不可退款取消、重大不可逆操作 | double_confirm |

风险等级由服务器 Action Registry / Policy Engine 决定，不能由 AI 自行降低。

即使开启 realtime.auto_optimize，也只允许在授权范围内自动执行 low risk；仍禁止自动付款、取消订单、修改酒店/付费交通、删除 must_keep、改变跨城市日期及其他高风险操作。

## 5. Permission Model

Permission 回答的是：

    这个 Actor 是否有资格对这个 Resource 执行这个 Action？

采用 Actor + Resource + Action + Context 模型。

建议权限 Scope：

    trip.read
    trip.write
    trip.share
    booking.read
    booking.modify
    booking.cancel
    order.read
    order.write
    message.external.send
    preference.read
    preference.write
    realtime.auto_optimize

权限必须绑定具体 Resource，例如 trip.write on trip_123，而不是全局 trip.write。

Trip 角色建议：

| Role | 能力 |
|---|---|
| owner | Trip 管理、编辑、共享管理 |
| editor | 编辑允许的行程内容，但不自动拥有 Owner 高风险权限 |
| viewer | 只读 |

同行人权限可以进一步拆成 view_trip、view_live_updates、suggest_changes、edit_unlocked_items。

权限来源只能来自服务端 Auth、Trip Membership、Resource Ownership、Subscription Entitlement、Explicit Grant。Prompt、AI Message、客户端 JSON、前端按钮可见性都不能授予权限。

AI 不是独立权限主体。AI 始终代表当前已认证用户与其明确授权的能力。

Subscription Entitlement 与 Resource Permission 必须分离。付费会员可以获得 realtime_assistant 等功能，但不因此获得修改他人 Trip 的权限。

## 6. Permission 与 Confirmation 必须分离

Permission：

    用户有没有资格执行？

Confirmation：

    用户是否同意这一次具体执行？

两个条件都必须成立。

例如 Viewer 即使点击“确认删除”，后端仍必须返回 ACTION_PERMISSION_DENIED。

执行前必须重新检查 Permission，不能只在 Proposal 创建时检查一次，因为角色、资源所有权或共享状态可能已经改变。

## 7. Confirmation Model

Confirmation 不是一个前端按钮状态，而是服务端可审计记录。

建议 ai_confirmations 字段：

    id
    user_id
    conversation_id
    turn_id
    message_id
    action_name
    action_version
    action_request_id
    resource_type
    resource_id
    payload_hash
    payload_snapshot
    base_version
    risk_level
    confirmation_policy
    status
    requested_at
    confirmed_at
    rejected_at
    expired_at
    consumed_at
    expires_at
    confirmed_by_user_id
    created_at
    updated_at

状态：

    pending
    confirmed
    rejected
    expired
    consumed
    cancelled

生命周期：

    Proposal Created
      ↓
    Validation Passed
      ↓
    Confirmation Requested
      ↓
    pending
      ├─ confirmed → execute → consumed
      ├─ rejected
      ├─ expired
      └─ cancelled

Confirmation 默认一次性消费。

## 8. Confirmation 必须绑定具体动作

一次确认必须绑定：

    action_name
    action_version
    resource_id
    payload_hash
    base_version

Payload 应先 canonicalize，再生成 hash。

如果用户确认的是“清水寺移动到 10:00”，该 Confirmation 不能被复用于“删除清水寺”。

执行前必须重算 Payload Hash；不一致时返回 ACTION_CONFIRMATION_MISMATCH 并要求重新确认。

Confirmation 必须有 expires_at。实时重规划、酒店库存、价格、付款等有效期应明显短于普通 Trip 编辑，具体 TTL 由业务配置决定，不能写死在 Prompt 中。

## 9. Confirmation UI

Medium / High / Critical 操作至少向用户展示：

- 要执行什么
- 涉及哪个 Trip / Order / Booking
- 修改前与修改后
- 修改原因
- 时间影响
- 金额影响
- 是否影响预约
- 是否影响同行人
- 是否可撤销

例如 Planner 变更：

    建议修改第 2 天行程
    原因：15:00 后降雨风险升高
    清水寺：15:30 → 10:00
    南禅寺 → 京都国立博物馆
    步行：-1.2 km
    费用：+¥0
    预计结束时间：-20 min

    [应用修改] [保持原行程]

前端按钮只提交 confirmation_id；不应重新提交一份可被篡改的完整 Action Payload 作为事实源。

Critical Action 使用 Double Confirm，例如不可退款订单取消，第二次确认必须清晰显示不可逆性和预计损失。

## 10. Action Request

建议建立 ai_action_requests：

    id
    conversation_id
    turn_id
    user_id
    action_name
    action_version
    resource_type
    resource_id
    payload
    payload_hash
    risk_level
    base_version
    status
    confirmation_id
    idempotency_key
    created_at
    executed_at
    failed_at

状态：

    proposed
    validated
    waiting_confirmation
    authorized
    executing
    succeeded
    failed
    expired
    cancelled
    compensated

Planner Proposal 与 Action Request 必须分离：

    Planner Proposal = 推荐发生什么变化
    Action Request   = 系统准备执行哪些具体 Mutation

推荐流程：

    Planner Proposal
      ↓
    User selects proposal
      ↓
    Action Request
      ↓
    Confirmation
      ↓
    Execute

## 11. Optimistic Lock

所有 Trip Mutation 必须携带 base_version。

如果 Proposal 基于 trip version 19，但用户确认时 Trip 已是 version 20，则返回 ACTION_VERSION_CONFLICT，必须重新读取 Context / Replan / 重新确认。

同一个 Trip 的 Action Batch 应使用同一 base_version，事务成功后统一递增版本，避免中途半更新。

## 12. Idempotency

External Side Effect 与 Financial Action 必须强制 Idempotency：

    booking.create
    booking.modify
    booking.cancel
    payment.create
    message.send_external

建议记录：

    idempotency_key
    action_name
    payload_hash
    result
    status
    expires_at

规则：

- 相同 key + 相同 payload：返回原结果。
- 相同 key + 不同 payload：IDEMPOTENCY_CONFLICT。
- 用户双击、网络重试或客户端重发不得产生重复订单、重复付款或重复外部消息。

## 13. Precondition / Postcondition

执行前再次检查业务前置条件，例如 booking.cancel：

- 订单仍存在
- 当前状态仍允许取消
- 退款规则/价格是否变化
- 用户仍有 Permission
- Confirmation 未过期
- Payload 未变化

执行后必须验证业务 Postcondition。

HTTP 200 不等于业务成功。只有供应商/业务系统明确返回最终成功状态时，AI 才能告诉用户“已取消”“已预约成功”“已付款”。

否则只能说“请求已提交”“正在处理”。

## 14. Action Adapter

建议按业务域接入：

    TripActionAdapter
    PreferenceActionAdapter
    SharingActionAdapter
    BookingActionAdapter
    OrderActionAdapter
    ExternalMessageAdapter
    PaymentHandoffAdapter

Action Router 不直接拥有任意数据库写能力。

TripActionAdapter v1 可先支持：

    trip.add_item
    trip.move_item
    trip.remove_item
    trip.update_time
    trip.lock_item
    trip.unlock_item

## 15. Batch / Transaction / Compensation

一个 Planner Proposal 可以转换成多个明确 Action。

TravelAssist 内部 Trip Mutation 尽可能事务化：全部成功或全部失败。

跨第三方系统通常不能真正分布式事务，因此 ActionDefinition 需要：

    reversible
    compensationAction

若 A 成功、B 失败，系统必须知道 A 是否可以撤销。

不可逆 Action 必须在确认前明确标识。

Undo 自身也是一个 Action，也必须经过 Permission / Version / Audit。

## 16. External Message

翻译与发送必须分离：

    AI Generate Translation
      ↓
    User Review
      ↓
    message.send_external Action
      ↓
    Permission
      ↓
    Confirmation
      ↓
    Send Adapter
      ↓
    Provider Ack
      ↓
    Conversation Event

生成一段日语不等于用户授权发送。

## 17. Long-term Preference

长期偏好写入也属于 Action。

用户说“以后不要安排早于 9 点的行程”，系统可以生成 preference.update，但不应该把所有随口表达自动永久写入 Profile。

Preference Action 应保留来源、置信度和更新时间，并允许用户后续修改。

## 18. Session Grant / Auto Optimize

对于明确范围内重复的低风险操作，可提供 session grant。

建议 ai_action_grants：

    id
    user_id
    scope
    resource_type
    resource_id
    risk_ceiling
    allowed_actions
    expires_at
    revoked_at
    created_at

示例：

    本次旅行中，允许 AI 自动调整未预约景点的顺序。

Grant 必须绑定 Resource、允许 Action、Risk Ceiling 和 Expiry，不能成为永久绕过 Confirmation 的通行证。

## 19. Realtime Assistant

典型流程：

    Realtime Monitor
      ↓
    Impact Detected
      ↓
    Planner Replan
      ↓
    Validator
      ↓
    Risk Classification
      ↓
    Check realtime.auto_optimize grant
      ├─ low + allowed → Action Router execute
      └─ otherwise → Confirmation

天气、交通等系统 Trigger 也不能绕过 Permission / Risk / Action Router。

## 20. Audit

建议 ai_action_audit_logs：

    action_request_id
    user_id
    actor_role
    action_name
    resource_type
    resource_id
    permission_decision
    risk_level
    confirmation_id
    payload_hash
    before_state_hash
    after_state_hash
    idempotency_key
    provider_reference_id
    status
    error_code
    trace_id
    created_at

Audit 与 Conversation 生命周期分离。删除聊天不等于删除订单、付款或法律/业务上必须保留的 Action 审计。

日志不得保存密码、Secret、完整卡数据、第三方 Access Token 或无必要的精确位置历史。

## 21. Conversation Event

Action 执行后写入结构化 System Event，例如：

    第 2 天行程已更新
    酒店取消请求已提交
    酒店取消已确认

必须严格区分“请求已提交”与“最终完成”。

## 22. Error Codes

统一：

    ACTION_INVALID_INPUT
    ACTION_NOT_ALLOWED
    ACTION_PERMISSION_DENIED
    ACTION_CONFIRMATION_REQUIRED
    ACTION_CONFIRMATION_EXPIRED
    ACTION_CONFIRMATION_MISMATCH
    ACTION_VERSION_CONFLICT
    ACTION_IDEMPOTENCY_CONFLICT
    ACTION_PRECONDITION_FAILED
    ACTION_PROVIDER_ERROR
    ACTION_TIMEOUT
    ACTION_PARTIAL_FAILURE
    ACTION_POSTCONDITION_FAILED

Provider 原始错误不要直接暴露给客户端。

## 23. Confirm Endpoint 推荐流程

    Authenticate
      ↓
    Load Confirmation
      ↓
    Check Ownership / Actor
      ↓
    Check Status + Expiry
      ↓
    Load Action Request
      ↓
    Recalculate Payload Hash
      ↓
    Recheck Permission
      ↓
    Recheck Resource Version
      ↓
    Recheck Preconditions
      ↓
    Mark Authorized
      ↓
    Execute Adapter
      ↓
    Verify Postcondition
      ↓
    Mark Consumed
      ↓
    Write Audit
      ↓
    Emit Conversation Event

## 24. Security

Action / Confirmation Endpoint 必须考虑：

- authenticated session
- CSRF
- replay prevention
- one-time Confirmation
- expiry
- payload hash
- optimistic lock
- idempotency
- resource-level authorization

Prompt Injection 无法修改这些后端策略。

## 25. v1 实现范围

第一阶段建议实现：

Action Router：
- Action Registry
- Schema Validation
- Permission Evaluation
- Risk Classification
- Base Version
- Idempotency
- Audit
- TripActionAdapter
- PreferenceActionAdapter

Confirmation：
- explicit
- pending / confirmed / rejected / expired / consumed
- payload_hash
- expires_at
- single-use

Permission：
- owner / editor / viewer
- resource ownership
- subscription entitlement
- action scope
- server-side enforcement

首批 Actions：

    trip.add_item
    trip.move_item
    trip.remove_item
    trip.update_time
    trip.lock_item
    preference.update

## 26. 后续阶段

第二阶段：

- session grant
- realtime.auto_optimize
- sharing actions
- message.send_external
- order.attach
- hotel / booking adapters
- undo / compensation

第三阶段：

- payment handoff
- double confirmation
- cross-provider compensation
- advanced approval policies
- high-risk action analytics

## 27. Acceptance Gates

Action Router：
- 所有写操作必须注册
- Schema / Risk / Permission / Audit 齐全
- External Side Effect 有幂等保护
- Trip Mutation 有 base_version
- 高风险 Action 不可直接执行
- AI 不能自行宣称外部操作成功

Confirmation：
- 服务端记录
- 绑定具体 Action / Resource / payload_hash / base_version
- 有 expires_at
- 单次消费
- Confirm 时重新检查 Permission / Version
- Payload 变化必须重新确认

Permission：
- 后端决定
- Resource scoped
- owner/editor/viewer 分离
- Subscription 与 Resource Permission 分离
- AI 不是权限主体
- Prompt 不能授予权限
- 系统触发器不能绕过 Permission

## 28. 最终冻结原则

> Tool Router 决定 AI 可以查询和计算什么。

> Action Router 决定 AI 可以请求改变什么。

> Permission 决定这个用户有没有资格做。

> Confirmation 决定这个用户是否同意这一次具体操作。

> Validator 决定这个变更业务上是否可执行。

> Idempotency 保证同一个副作用不会被重复执行。

> Audit 保证能够追踪谁、何时、基于什么确认、改变了什么。

> AI 永远不能凭自然语言回答绕过 Action Router、Permission、Confirmation 或业务 Validator。
