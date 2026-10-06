# TravelAssist — AI Orchestrator / Tool Router / Context Builder 设计

> 状态：建议冻结为 AI 编排核心 v1  
> 适用范围：主系统 AI、Planner AI、实时旅行助手、酒店/交通/天气助手、翻译助手  
> 上游依赖：
> - AI 能力边界定义
> - AI Conversation Message Model
> - Prompt / System Instruction v1
> - AI API 接入层
>
> 下游依赖：
> - Planner Engine / Planner Validator
> - POI / 43D Recommendation Engine
> - Traffic / Route Engine
> - Weather Provider
> - Hotel / Order / Translation Service

---

# 1. 总体目标

这三层共同解决一个问题：

> 用户说一句自然语言之后，系统到底应该读取哪些上下文、调用哪些工具、按什么顺序执行、哪些结果可信、哪些动作需要确认，以及最终怎样形成结构化 AI 回复。

推荐链路：

```text
User
  ↓
Conversation Service
  ↓
Context Builder
  ↓
AI Orchestrator
  ↓
Tool Router
  ↓
Read Tools / Planner / Realtime APIs
  ↓
AI Orchestrator
  ↓
Planner Validator / Action Router
  ↓
Structured AI Message
  ↓
User Confirmation
  ↓
Execution
```

---

# 2. 三层职责

## 2.1 Context Builder

负责回答：

```text
这次 AI 到底应该知道什么？
```

职责：

- 当前用户
- 当前 Conversation
- 当前 Trip
- 当前 Day
- 当前页面
- 当前 POI
- 用户偏好
- 已确认约束
- 最近聊天
- 对话摘要
- 必要实时信息
- 上下文裁剪
- Context Token Budget
- 数据新鲜度

它不负责：

- 决定调用哪个 Tool
- 直接修改 Trip
- 直接调用模型
- 自己产生业务结论

## 2.2 AI Orchestrator

负责回答：

```text
这次任务应该怎么完成？
```

职责：

- 判断意图
- 选择 Assistant Role
- 决定是否需要工具
- 安排 Tool 调用顺序
- 管理多步 Tool Loop
- 处理工具结果
- 判断是否需要 Planner
- 判断是否需要二次模型调用
- 生成 Proposal
- 合并最终 Structured Message
- 管理失败 / 重试 / Fallback
- 控制最大循环次数
- 防止 Tool 无限调用

它是 AI 系统的流程控制器。

## 2.3 Tool Router

负责回答：

```text
模型请求调用这个工具时，系统允不允许，怎么调用？
```

职责：

- Tool Registry
- Schema Validation
- Permission Check
- 参数标准化
- Tool 调用
- Timeout
- Retry Policy
- Cache
- Result Normalization
- Source Freshness
- Audit
- Error Mapping

Tool Router 不让模型直接拥有数据库、订单、支付、Trip 写权限。

---

# 3. 推荐目录

```text
src/server/ai/
  orchestrator/
    ai-orchestrator.ts
    intent-router.ts
    execution-plan.ts
    loop-controller.ts
    response-assembler.ts

  context/
    context-builder.ts
    context-budget.ts
    conversation-context.ts
    trip-context.ts
    preference-context.ts
    page-context.ts
    realtime-context.ts

  tools/
    tool-router.ts
    tool-registry.ts
    tool-permissions.ts
    tool-cache.ts
    tool-normalizer.ts
    definitions/

  actions/
    action-router.ts
    action-permissions.ts
    confirmations.ts

  prompts/
  providers/
  usage/
  telemetry/
  errors/
```

---

# 4. AI Orchestrator 输入

```ts
export interface AIOrchestrationRequest {
  conversationId: string;
  turnId: string;
  userId: string;
  userMessage: string;
  tripId?: string;
  clientContext?: {
    screen?: string;
    selectedDayId?: string;
    entityType?: string;
    entityId?: string;
  };
  attachmentIds?: string[];
  stream: boolean;
}
```

客户端不得传：systemPrompt、model、tool permissions、provider API key、raw DB data。

---

# 5. Orchestrator 输出

```ts
export interface AIOrchestrationResult {
  messageId: string;
  blocks: AIContentBlock[];
  toolCalls: string[];
  proposalIds: string[];
  confirmationIds: string[];
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  traceId: string;
}
```

---

# 6. Orchestrator 执行阶段

```text
01 Authenticate
02 Load Conversation
03 Build Context
04 Classify Intent
05 Select Role
06 Select Prompt
07 Select Model
08 Build Tool Availability
09 First Model Call
10 Resolve Tool Calls
11 Tool Execution Loop
12 Planner Validation
13 Build Proposal
14 Build Final Response
15 Persist
16 Stream Completion
```

---

# 7. Intent Router

第一阶段意图：

```ts
type AIIntent =
  | "general_question"
  | "poi_recommendation"
  | "planner_generate"
  | "planner_modify"
  | "trip_question"
  | "weather_question"
  | "transport_question"
  | "hotel_question"
  | "order_question"
  | "translation"
  | "realtime_disruption"
  | "unknown";
```

Intent 只负责选择 Role、Tool Allowlist、Context Profile、Model Profile，不直接决定业务事实。

---

# 8. Execution Plan

复杂任务先生成系统内部 Execution Plan。

例如：

```json
{
  "intent": "planner_modify",
  "steps": [
    "load_trip_day",
    "load_locked_items",
    "get_weather",
    "get_candidate_pois",
    "run_planner",
    "validate_plan",
    "create_proposal"
  ],
  "write_allowed": false
}
```

Execution Plan 不直接展示给用户。

---

# 9. Tool Loop

```text
Model
  ↓
Tool Request
  ↓
Tool Router
  ↓
Normalized Tool Result
  ↓
Model
```

建议：

```text
MAX_TOOL_ROUNDS = 6
```

超过后返回 AI_TOOL_LOOP_LIMIT，禁止无限 Agent Loop。

---

# 10. Tool 类型

必须至少分：

## Read Tool

```text
poi.search
poi.get
trip.get
weather.forecast
weather.alerts
route.calculate
transport.search
hotel.search
order.get
user.preference.get
```

## Compute Tool

```text
planner.generate
planner.validate
planner.replan
fatigue.calculate
recommendation.score
route.optimize
```

## Action Tool

```text
trip.update
trip.delete_item
order.cancel
booking.modify
message.send_external
payment.create
```

Action 不得作为普通 Tool 自动执行，必须走 Action Router。

---

# 11. Tool Registry

```ts
interface ToolDefinition {
  name: string;
  version: string;
  kind: "read" | "compute" | "action";
  inputSchema: unknown;
  outputSchema: unknown;
  requiredPermissions: string[];
  cachePolicy?: ToolCachePolicy;
  timeoutMs: number;
  retryPolicy: "none" | "safe_retry";
  freshness?: {
    ttlSeconds?: number;
  };
}
```

---

# 12. Tool Allowlist

General 示例：

```text
poi.search
poi.get
route.calculate
weather.forecast
```

Planner 示例：

```text
trip.get
poi.search
poi.get
planner.generate
planner.validate
route.calculate
fatigue.calculate
weather.forecast
```

Realtime 示例：

```text
trip.get
weather.alerts
transport.search
route.calculate
planner.replan
planner.validate
```

原则：Tool 默认不可用，按 Role 显式 Allowlist。

---

# 13. Tool Permission

每次调用检查：

```text
User Permission
Conversation Permission
Trip Ownership
Subscription Entitlement
Tool Allowlist
Action Risk
```

AI 自己声明有权限不产生任何授权效果。

---

# 14. Tool Input Validation

模型生成的所有参数必须经过 Schema Validation，非法字段、类型、范围直接拒绝，不允许业务层猜测。

---

# 15. Tool Result Normalization

供应商结果统一成内部 DTO。例如天气统一返回：

```ts
interface WeatherForecastResult {
  locationId: string;
  timezone: string;
  retrievedAt: string;
  validUntil: string;
  days: Array<{
    date: string;
    precipitationProbability: number;
    tempMinC: number;
    tempMaxC: number;
    conditionCode: string;
  }>;
}
```

AI 不直接消费供应商原始字段。

---

# 16. Freshness / Cache

所有实时 Tool Result 记录：

```text
retrieved_at
valid_until
source
```

建议：

```text
POI static           → long cache
43D score source     → medium/long
Route calculation    → contextual cache
Weather forecast     → short
Transit realtime     → very short
Hotel availability   → very short / none
Order status         → short
```

---

# 17. Tool Error

```ts
type ToolErrorCode =
  | "TOOL_INVALID_INPUT"
  | "TOOL_PERMISSION_DENIED"
  | "TOOL_TIMEOUT"
  | "TOOL_PROVIDER_ERROR"
  | "TOOL_DATA_NOT_FOUND"
  | "TOOL_DATA_STALE"
  | "TOOL_RATE_LIMIT";
```

模型仅获得规范化错误。

---

# 18. Context Builder 总体结构

```ts
interface AIContextBundle {
  system: SystemContext;
  user: UserContext;
  preferences?: PreferenceContext;
  trip?: TripContext;
  page?: PageContext;
  conversation: ConversationContext;
  realtime?: RealtimeContext;

  metadata: {
    builtAt: string;
    contextVersion: number;
    tokenEstimate: number;
  };
}
```

---

# 19. Context Priority

基础优先级：

```text
P0 System Rules
P1 Current User Message
P2 Explicit User Constraints
P3 Current Trip / Locked Items
P4 Current Page / Selected Entity
P5 Recent Conversation
P6 Conversation Summary
P7 Long-term Preference
P8 Realtime Context
P9 Older Conversation
```

Realtime Assistant 中天气/交通可动态提升优先级。

---

# 20. Context Profile

不允许每次加载全部用户/Trip 数据。

poi_question：

```text
user preferences
current POI
nearby POI
recent messages
```

planner_modify：

```text
trip
selected day
locked items
preferences
planner constraints
weather if relevant
recent decisions
```

translation：

```text
current message
target language
relevant booking name if needed
```

---

# 21. Conversation Context

只保留：

```text
Recent N Turns
+
Conversation Summary
+
Important Accepted Decisions
+
Pending Confirmation
```

结构化摘要示例：

```json
{
  "constraints": ["不早于08:30出发"],
  "accepted_decisions": ["京都酒店不更换"],
  "must_keep": ["清水寺"],
  "rejected": ["环球影城"],
  "pending": []
}
```

---

# 22. User Preference Context

只读取本次任务相关偏好字段，不应为寺庙推荐同时注入与任务无关的酒店床型等资料。

---

# 23. 43维数据接法

```text
User Intent
↓
Recommendation Engine
↓
Candidate POI IDs + Scores + Reasons
↓
AI Explanation
```

AI 负责解释推荐原因，评分仍由 Recommendation Engine 计算。

---

# 24. Trip / Page Context

Trip Context 仅保留：

```text
trip_id
trip_version
trip dates
current city
selected day
locked items
reservation items
day time window
planner constraints
```

页面 Context 例如：

```json
{
  "screen": "planner",
  "selected_day_id": "day_3",
  "selected_item_id": "item_9"
}
```

用于理解“这个换掉”等指代。

---

# 25. Realtime Context

按需读取：

```text
current_time
current_location
weather
transport status
trip progress
delay
```

位置必须遵循用户授权，不能默认读取。

---

# 26. Context Token Budget

保护顺序：

```text
system rules             fixed
current message          protected
trip constraints         protected
tool result              protected if relevant
recent conversation      bounded
summary                  bounded
older conversation       removable
```

超限优先删旧聊天原文，不删锁定预约和用户硬约束。

---

# 27. Context Conflict

冲突时：

```text
Current explicit instruction
>
Confirmed trip state
>
Confirmed structured preference
>
Conversation summary
>
Inferred preference
```

当前明确要求覆盖历史偏好。

---

# 28. Context Version

每次记录：

```text
context_version
trip_version
preference_version
conversation_summary_version
```

---

# 29. Planner 接线

```text
AI understands request
↓
planner.generate / planner.replan
↓
Planner Engine
↓
Planner Validator
↓
Validated Candidate
↓
AI explains
↓
Proposal
```

Orchestrator 不自行计算行程。

---

# 30. Planner Proposal

建议复用/新增：

```text
ai_planner_proposals
```

字段：

```text
proposal_id
trip_id
base_version
created_by_turn_id
planner_run_id
validation_result
risk_level
changes
expires_at
status
```

若确认时 Trip version 已变化，则 Proposal 过期并重新计算。

---

# 31. Realtime Assistant

```text
System Trigger
↓
Context Builder
↓
Trip Progress
↓
Weather / Transit
↓
Orchestrator
↓
Impact Analysis
↓
Planner Replan
↓
Validator
↓
Proactive Message
```

默认建议修改，不默认自动执行。

---

# 32. 自动修改边界

仅当用户预授权 auto_optimize=true 且风险 low 时才可自动执行低风险优化。

仍禁止自动：

- 支付
- 取消订单
- 修改酒店
- 修改付费预约
- 删除 must_keep
- 改变跨城市日期

---

# 33. Action Router 边界

```text
Tool Router   = 读取 / 计算
Action Router = 写入 / 外部副作用
```

Action：

```text
Proposal
↓
Permission
↓
Risk Classification
↓
Confirmation
↓
Idempotency
↓
Execution
↓
Audit
```

---

# 34. Orchestrator 状态机

```ts
type OrchestratorState =
  | "context_building"
  | "model_running"
  | "tool_requested"
  | "tool_running"
  | "planner_running"
  | "validating"
  | "waiting_confirmation"
  | "assembling"
  | "completed"
  | "failed";
```

---

# 35. Streaming Event

```text
turn.started
context.ready
thinking
tool.started
tool.completed
planner.started
planner.completed
validation.completed
block.created
confirmation.required
message.completed
turn.completed
```

严禁把 raw chain-of-thought、system prompt 或内部推理流暴露给用户。

---

# 36. Failure Strategy

- Tool 非核心失败：继续回答并说明缺失。
- Planner 失败：不得把未验证结果包装成可执行 Proposal。
- Weather 失败：保留静态行程，不声称天气已确认。
- AI Provider 失败：核心业务 UI 仍可继续使用。
- 支持 Partial Success。

---

# 37. Retry / Parallelism

只读幂等工具允许安全重试；写操作除非具备 idempotency_key，否则不自动重试。

互不依赖 Read Tool 可并行；存在依赖的调用必须串行。

---

# 38. 防止工具滥用

限制：

```text
max_tool_rounds
max_tool_calls_per_turn
max_same_tool_calls
cost_budget
```

建议：

```text
max_same_tool_calls = 2
```

---

# 39. Cost-aware Orchestration

优先级：

```text
DB
↓
Cache
↓
Rule Engine
↓
Tool
↓
LLM
```

能够由数据库/规则引擎确定的事实，不应浪费 LLM 推理。

---

# 40. Observability / Audit

每 Turn：

```text
trace_id
conversation_id
turn_id
intent
assistant_role
context_version
prompt_version
model
tool_calls
planner_run_id
proposal_id
token_usage
cost
latency
fallback
error
```

每 Tool：

```text
tool_name
tool_version
input_hash
user_id
trip_id
started_at
completed_at
source
cache_hit
result_hash
error_code
```

敏感值不写日志。

---

# 41. Security / Prompt Injection

Tool 不接受任意 SQL、URL fetch、shell command、file path。

所有 Tool 必须是有限、命名、Schema 化能力。

来自网页、POI 描述、酒店描述、用户文件、第三方 API 的文本均视为 untrusted data，不得覆盖 System Instruction、Tool Permission 或 Action Policy。

---

# 42. Tool Trust Level

```ts
type ToolTrust =
  | "authoritative"
  | "provider"
  | "internal"
  | "derived"
  | "unverified";
```

示例：

```text
官方景点 API       authoritative
酒店供应商库存      provider
TravelAssist POI DB internal
Planner Score       derived
普通网页            unverified
```

---

# 43. 推荐数据表

复用既有 Message Model 后，建议核心表：

```text
ai_orchestration_runs
ai_tool_calls
ai_tool_results
ai_context_snapshots
ai_planner_proposals
ai_confirmations
```

避免重复建表。

---

# 44. ai_orchestration_runs

建议字段：

```text
id
conversation_id
turn_id
intent
assistant_role
context_version
prompt_version
model
status
tool_rounds
planner_run_id
started_at
completed_at
latency_ms
error_code
trace_id
```

---

# 45. 内部接口

```ts
buildContext(request)
classifyIntent(context)
resolveAssistant(intent)
resolveTools(role)
runModel(input)
executeTool(call)
validatePlannerResult(result)
assembleMessage(result)
```

接口间使用明确 DTO。

---

# 46. 第一阶段实现范围

Context Builder：

```text
Conversation Context
User Preference Context
Trip Context
Page Context
Context Budget
```

Orchestrator：

```text
Intent Router
Role Router
One Model → Tool Loop
Planner Integration
Response Assembler
Loop Limit
Basic Fallback
```

Tool Router：

```text
Tool Registry
Schema Validation
Permission Check
Read / Compute Tool
Timeout
Safe Retry
Normalized Result
Audit
```

首批 Tools：

```text
trip.get
poi.search
poi.get
route.calculate
weather.forecast
planner.generate
planner.validate
user.preference.get
```

---

# 47. 第二阶段

```text
Realtime Context
transport.search
weather.alerts
planner.replan
hotel.search
order.get
translation.generate
parallel tool execution
advanced cache
```

---

# 48. 第三阶段

```text
Proactive Orchestration
Background Realtime Trigger
Multi-provider Tool Fallback
Cost-aware Model / Tool Planning
Automatic Context Compression
Advanced Evaluation
Tool Success Analytics
```

---

# 49. 验收 Gate

AI Orchestrator：

- 不允许无限 Tool Loop
- Planner 输出未经 Validator 不可展示为可执行方案
- AI 不直接修改 Trip
- 支持部分失败与降级
- 每次运行可追踪 intent / prompt / model / tools / planner

Tool Router：

- Tool 必须注册
- Tool 必须 Schema 校验
- Tool 必须权限校验
- Read / Compute / Action 分离
- Tool 错误统一映射
- Tool Result 有 freshness / source
- Action 不得通过普通 Tool Router 绕过确认

Context Builder：

- 不把所有用户数据塞进 Prompt
- 支持 Context Profile
- 支持 Token Budget
- Trip Version 可追踪
- Preference Version 可追踪
- Current Page Context 可用
- 当前显式指令优先于旧偏好
- 实时数据有 retrieved_at / valid_until

---

# 50. 最终冻结原则

> Context Builder 决定 AI “知道什么”。

> AI Orchestrator 决定 AI “下一步做什么”。

> Tool Router 决定 AI “允许调用什么以及如何调用”。

> Action Router 决定 AI “哪些事情可以真正改变系统状态”。

> Planner Engine 决定“行程怎么算”。

> Planner Validator 决定“行程能不能执行”。

> AI 负责理解、协调与解释，而不是成为数据库、规则引擎和交易系统的替代品。
