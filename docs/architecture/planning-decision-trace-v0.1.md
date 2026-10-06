# TravelAssist Planning Decision Trace / Explainability / Cost Telemetry v0.1

> 日期：2026-09-10  
> 状态：Freeze Candidate / 待 Consumer Review  
> 分支：`design/a-trip-engine-poi-ai-architecture-v2`  
> 关联设计：`preference-state-v0.1.md`、`poi-scoring-spec-v0.2.md`、`itinerary-feasibility-spec-v0.1.md`、`travel-region-graph-codebook-v0.1.md`、`candidate-pipeline-contract-v0.1.md`、`ai-compact-context-v1.md`、`ai-decision-contract-v1.md`、`replanning-contract-v0.1.md`、`planning-fact-freshness-policy-v0.1.md`、`travelassist-engine-contract.md`  
> 本文件冻结候选范围：Planning / Replanning 的 Decision Run、阶段 Trace、候选淘汰、评分与 Fact 引用、AI / Provider 使用、成本/延迟、最终 Proposal / ChangeSet 关联、用户可解释性与隐私边界。  
> 本文件不冻结 Telemetry retention 天数、采样率、具体模型价格、Provider 费率、Alert 阈值、Dashboard 实现或数据库物理表。

---

# 1. 核心结论

TravelAssist 必须能重现“系统为什么做出这个决定”，但**不保存模型私有推理链，也不靠自由文本日志解释系统**。

标准关系：

```text
User / Runtime / Provider Trigger
              ↓
         Decision Run
              ↓
       Input Snapshot Refs
              ↓
       Candidate Pipeline
              ↓
      Scores / Facts / Gates
              ↓
 Deterministic Repair / AI Call
              ↓
       Domain Proposal
              ↓
      Engine Revalidate
              ↓
 ChangeSet / Preview / Apply
              ↓
        User Outcome
```

一个 `DecisionRun` 是一次完整业务决策的关联根。即使完全没有调用 AI，也必须可以产生 Decision Trace。

核心原则：

> **Decision Trace 记录“可验证输入、规则结果、结构化原因与执行结果”；AI trace 只记录调用事实和结构化输出，不保存隐藏思维过程。**

---

# 2. 四种记录必须分开

系统必须区分：

```text
Decision Trace
Audit Log
Operational Telemetry
Analytics Aggregate
```

## 2.1 Decision Trace

回答：

> 这一次规划 / 重规划为什么得到这个结果？

面向：

- Engine QA；
- 用户解释；
- 评分校准；
- Replanning 调试；
- A/B 对比。

## 2.2 Audit Log

回答：

> 谁在什么时候实际改变了什么？

最终写操作仍由 Trip Mutation Engine / ChangeSet / Version History 拥有。

Decision Trace 不替代权限审计、版本审计或 booking/payment 审计。

## 2.3 Operational Telemetry

回答：

> 这次运行花了多少时间、Token、Provider 调用和资源？有没有失败 / 超时 / fallback？

它可以高频、可采样，不应被当作 Canonical Business State。

## 2.4 Analytics Aggregate

回答：

> 大量运行整体表现如何？

例如：

```text
平均 Candidate 漏斗比例
AI 使用率
fallback 率
route provider failure rate
平均 tokens / decision
用户接受率
replan success rate
```

聚合分析不需要长期保留每份原始高基数 Context。

---

# 3. DecisionRunV1

建议逻辑结构：

```ts
type DecisionRunV1 = {
  traceVersion: "1.0"
  decisionRunId: string

  kind: DecisionRunKindV1
  trigger: DecisionTriggerRefV1
  scope: DecisionScopeRefV1

  tripRef: string
  planRef: string | null

  inputVersionRefs: InputVersionRefsV1
  policyVersionRefs: PolicyVersionRefsV1

  startedAt: Instant
  completedAt: Instant | null
  outcome: DecisionOutcomeV1

  stageRefs: string[]
  finalDecisionRef: string | null
  changeSetRef: string | null
}
```

`decisionRunId` 必须：

- opaque；
- 全局或业务域内稳定唯一；
- 贯穿 Candidate / Provider / AI / Replan / Engine Preview；
- 不复用 AI `runId`、Provider request ID 或 ChangeSet ID。

必须区分：

```text
DecisionRun ID
≠ AI Run ID
≠ Provider Request ID
≠ ChangeSet ID
≠ Runtime Event ID
```

这些通过引用关联。

---

# 4. Decision Run Kind / Trigger

## 4.1 DecisionRunKindV1

Freeze Candidate：

```text
initial_plan
macro_plan
region_plan
day_plan
item_choice
route_choice
plan_review
replan
runtime_repair
user_explanation
```

`user_explanation` 可以引用原 Decision Run，而不是重新运行完整 Planning Engine。

## 4.2 Trigger

建议：

```text
user_request
trip_creation
user_edit
runtime_event
weather_change
transport_change
place_status_change
booking_change
schedule_drift
fatigue_change
fact_refresh
system_validation
```

Trigger 只存安全结构化引用，例如：

```ts
type DecisionTriggerRefV1 = {
  kind: string
  eventRef?: string | null
  userIntentCode?: string | null
  occurredAt: Instant
}
```

不要为了 Trace 永久复制整段用户聊天。

---

# 5. Input Version Refs

为了能重现当时判断，Trace 必须记录**引用与版本**，而不是复制整份 Canonical Snapshot。

建议至少：

```text
tripContractVersion
tripRevision
planRevision
runtimeRevision

preferenceSnapshotRef
preferenceOverrideRevision
preferenceMergeVersion

poiFeatureVersion
scoringConfigVersion
visitLoadConfigVersion
feasibilityConfigVersion
regionGraphVersion
candidateConfigVersion
freshnessPolicyVersion
aiContextVersion
aiDecisionContractVersion
```

原则：

> 同样的输入数据，在不同 Config / Policy Version 下可能产生不同结果；版本本身必须进入 Trace。

---

# 6. Candidate Funnel Trace

每个主要 Pipeline Stage 记录摘要：

```ts
type CandidateStageTraceV1 = {
  stage: CandidateStageCodeV1
  inputCount: number
  outputCount: number
  rejectedCount: number
  needsFactCount: number
  elapsedMs: number | null

  rejectionReasonCounts: Record<string, number>
  fallbackCodes: string[]
}
```

Freeze Candidate Stage Code：

```text
region_candidate
corridor_candidate
poi_expansion
hard_filter
poi_scoring
route_feasibility
itinerary_feasibility
pareto_prune
diversity_guard
top_n
ai_soft_choice
engine_revalidate
```

例如：

```text
poi_expansion       342 → 342
hard_filter         342 → 211
poi_scoring         211 → 80
route_feasibility    80 → 31
itinerary_feasibility31 → 18
pareto_prune         18 → 11
diversity_guard      11 → 9
top_n                 9 → 8
```

这样可以发现：

- Hard Filter 是否过严；
- route query 是否成为瓶颈；
- Pareto 是否删得过多；
- AI 是否实际上收到太多候选。

最终数量仍是 Config / Pilot，不在本文件冻结。

---

# 7. Candidate Decision Record

不是所有 15,000 POI 都需要长期保存逐条详细 Trace。

建议分层：

```text
aggregate stage trace
+
retained candidates detail
+
important rejected candidates detail
```

“important rejected”至少包括：

- 用户明确点名；
- must-go / must-not-go；
- 原计划 item；
- 用户正在问“为什么没推荐”的实体；
- 接近最终门槛的候选；
- 因 Hard Constraint / NEEDS_FACT 被阻断的候选；
- Pilot / Debug 采样候选。

建议：

```ts
type CandidateDecisionTraceV1 = {
  entityRef: string
  entityKind: "poi" | "region" | "corridor" | "route" | "stay_cluster"
  finalStage: string
  disposition: "selected" | "backup" | "rejected" | "pruned" | "needs_fact"
  reasonCodes: string[]

  scoreRefs?: string[]
  factRefs?: string[]
  constraintRefs?: string[]
}
```

禁止仅保存：

```text
"AI觉得B更好"
```

作为唯一原因。

---

# 8. Score Trace

`poi-scoring-spec-v0.2.md` 已要求 Score Breakdown。Decision Trace 不复制全部 Feature Master，而引用对应 Breakdown。

例如：

```ts
type ScoreTraceRefV1 = {
  scoreRef: string
  entityRef: string
  scoreKind:
    | "match"
    | "party_fit"
    | "season_fit"
    | "weather_fit"
    | "day_fit"
    | "route_fit"
    | "current_suitability"
  value: number
  coverage: number | null
  confidence: number | null
  configVersion: string
  breakdownRef?: string | null
}
```

必须支持回答：

```text
为什么清水寺 matchScore 高？
为什么下午 dayFit 低？
为什么 walking penalty 变大？
```

对 walking / physical 特别记录：

```text
Master summary baseline
Visit Mode
planned / actual duration
visit load result
route walking
current accumulated day load
```

避免把 `walking=7` 误解释成固定总疲劳。

---

# 9. Fact Usage Trace

每个影响最终决定的重要 Fact 只保存 canonical `factRef` + 当时的 usability snapshot。

建议：

```ts
type FactUsageTraceV1 = {
  factRef: string
  factKind: string
  subjectRef: string
  freshnessAtDecision: "current" | "aging" | "stale" | "expired" | "unknown"
  actionAtDecision: "use" | "use_with_warning" | "refresh" | "fallback" | "block"
  authorityBand: string | null
  confidence: number | null
  observedAt: Instant | null
  fallbackFromFactRef?: string | null
}
```

这样未来可以准确回答：

> “当时为什么认为这个景点开放？”

或：

> “当时路线为什么只作为粗估？”

Trace 不保存 Provider Raw JSON。

---

# 10. Feasibility / Protection Trace

重要 Feasibility Issue 使用稳定 Reason Code：

```text
DURATION_TOO_SHORT
OPENING_HOURS_CONFLICT
TRANSITION_TOO_SHORT
DAY_OVERLOADED
WALKING_OVERLOAD
BOOKING_CONFLICT
LOCK_PROTECTED
RUNTIME_COMPLETED_IMMUTABLE
RUNTIME_IN_PROGRESS_PROTECTED
STALE_CRITICAL_FACT
...
```

每条重要 Issue 至少保存：

```text
issueCode
targetRef
severity
sourceStage
factRefs
resolvedByRepairRef | null
```

这样用户问：

> “为什么没有把12点的餐厅往后推？”

系统可以回答：

```text
BOOKING_LOCK
+
confirmed booking fact
+
Replan scope protection rule
```

而不是再次让 AI 猜原因。

---

# 11. Replanning Repair Trace

一次 Replan 应记录 repair 尝试顺序，而不是只记录最终修改。

建议：

```ts
type RepairAttemptTraceV1 = {
  attemptRef: string
  strategyCode: string
  scope: string
  status: "accepted" | "rejected" | "partial" | "needs_ai"
  issueCodesBefore: string[]
  issueCodesAfter: string[]
  affectedRefs: string[]
  elapsedMs: number | null
}
```

典型 strategy：

```text
consume_buffer
shift_future_items
change_supported_visit_mode
reorder_mutable_items
replace_route
replace_poi
skip_optional_item
expand_replan_scope
```

这样可以判断：

- 是否频繁因为 Buffer 不足扩 Scope；
- 哪种 deterministic repair 成功率高；
- AI 是否被过早调用。

---

# 12. AI Usage Trace

AI 是 Decision Run 的可选子步骤。

建议只记录：

```ts
type AiUsageTraceV1 = {
  aiRunRef: string
  taskType: string
  contextContractVersion: string
  decisionContractVersion: string

  modelClass: "low_cost" | "standard" | "high_reasoning" | "unknown"
  providerClass?: string | null

  inputTokens: number | null
  outputTokens: number | null
  cachedInputTokens?: number | null
  latencyMs: number | null

  expansionRounds: number
  retryCount: number

  status: "decision" | "need_more_context" | "no_valid_choice" | "abstain" | "error"
  reasonCodes: string[]
}
```

领域 Trace 默认不需要永久保存具体模型 SKU；价格和型号变化快，由 Telemetry / Billing Adapter 映射。

如果需要成本核算，可以记录：

```text
costMinorUnit
currency
pricingVersion
```

但成本必须来自服务端 Usage / Billing 事实，不能让模型自报。

绝对禁止保存或输出：

- 私有 chain-of-thought；
- hidden reasoning；
- 系统提示词全文作为业务 Trace；
- Provider secret；
- 完整 raw model payload 作为唯一审计数据。

允许保存的是：

```text
结构化输入版本
TaskType
候选 IDs
结构化输出
ReasonCode
UncertaintyCode
Token / latency / error metadata
```

---

# 13. Provider Call Telemetry

Provider 调用与 AI 调用分开统计。

建议：

```ts
type ProviderCallTraceV1 = {
  callRef: string
  providerCapability: "route" | "weather" | "poi" | "booking" | "price" | "availability" | "other"
  providerClass: string

  requestPurpose: string
  status: "ok" | "timeout" | "rate_limited" | "unavailable" | "contract_error" | "other_error"
  latencyMs: number | null

  cacheHit: boolean | null
  factRefsProduced: string[]

  billableUnits?: number | null
  costMinorUnit?: number | null
  currency?: string | null
}
```

不保存：

- Provider Raw Response；
- 请求 URL 中 token；
- Authorization header；
- 用户 booking confirmation code；
- 支付 token。

同一 Provider 请求可以为多个 Candidate 产生 Fact，因此 Call Ref 与 Fact Ref 不要求 1:1。

---

# 14. Cost Telemetry

一次 DecisionRun 可以聚合：

```text
engineCpuTime / wallTime
AI input tokens
AI output tokens
AI cached tokens
AI estimated/actual cost
Provider call count by capability
Provider cost
cache hit count
refresh count
fallback count
```

建议输出：

```ts
type DecisionCostSummaryV1 = {
  elapsedMs: number
  aiCallCount: number
  aiInputTokens: number | null
  aiOutputTokens: number | null
  providerCallCounts: Record<string, number>
  cacheHitCount: number
  refreshCount: number
  fallbackCount: number
  cost?: { amountMinor: number; currency: string; pricingVersion: string } | null
}
```

若不同 Provider / AI 以不同币种计价，原始成本先按各自 currency 记录；汇总换算必须引用明确 FX / pricing version，不能静默相加。

---

# 15. Final Decision / ChangeSet Trace

DecisionRun 最终状态建议：

```text
selected
proposal_created
needs_user_confirmation
no_valid_choice
blocked
abstained
superseded
stale_before_apply
applied
rejected_by_user
failed
```

最终引用：

```text
selectedEntityRefs
backupEntityRefs
reasonCodes
proposalRef
engineValidationRef
changeSetRef
previewRef
applyResultRef
resultingTripRevision
resultingPlanRevision
```

重要：

> `AI decision=decision` 不等于 `DecisionRun outcome=applied`。

中间可能：

```text
AI选择候选7
↓
Engine发现 Route 已失效
↓
proposal rejected / refresh
```

Trace 必须保留这个差异。

---

# 16. User Outcome

为了校准推荐质量，可记录结构化产品行为：

```text
accepted
rejected
modified_then_accepted
ignored
reverted_later
not_applicable
```

但：

- 不把“没有点击”立即解释为“不喜欢”；
- 不根据一次选择自动写长期 Preference；
- 行为学习仍受 `preference-state-v0.1.md` 的 proposal + confirmation 边界限制。

用户自由文本反馈可以单独存产品允许的安全内容，但不得把它混成机器 ReasonCode。

---

# 17. Explainability Contract

系统解释优先级：

```text
Structured Trace
↓
ReasonCode Template
↓
必要时 Explanation AI
```

而不是：

```text
重新问 AI “你当时为什么这么想？”
```

因为重新询问不能证明当时原因。

## 17.1 “为什么推荐？”

应从：

```text
selected candidate
score breakdown
route / time / weather fit
reason codes
facts used
```

生成。

例如：

```text
推荐 B，因为：
R01 偏好匹配高
R06 当日体力负荷更低
R07 路线连续性更好
```

## 17.2 “为什么没推荐 A？”

优先返回真正阻断 / 淘汰原因：

```text
Hard Reject
>
NEEDS_FACT
>
Feasibility failure
>
Pareto dominated
>
Diversity / Top-N
>
soft score difference
```

不能把 Top-N 淘汰伪装成“景点不好”。

## 17.3 “为什么发生 Replan？”

返回：

```text
trigger event
impact scope
earliest mutable boundary
protected anchors
repair attempts
final selected repair
```

---

# 18. Explanation AI 的边界

Explanation AI 如果使用，只能消费已经脱敏的结构化 Trace 投影，例如：

```text
final decision
reasonCodes
selected score summaries
rejection summaries
fact freshness summaries
```

不能：

- 读取模型隐藏推理；
- 编造 Trace 中不存在的原因；
- 把 stale Fact 描述为实时确认；
- 把 Planning Prior 描述成 Live Fact；
- 替 Engine 解释权限 / booking 状态以外的内容。

Explanation AI 输出是 Presentation 文本，不改变 DecisionRun 事实。

---

# 19. Privacy / Security / Data Minimization

Trace 默认只保存完成解释、调试与成本核算所需的最小数据。

禁止进入常规 Decision Trace：

```text
password / token / cookie
service role key
payment token
raw booking confirmation code
full provider raw payload
full user conversation transcript
exact unnecessary user location history
hidden model reasoning
system/developer prompt全文
```

对于可能敏感的：

```text
current location
party needs
accessibility context
```

Trace 应优先保存：

```text
是否影响决策的结构化 code / ref
```

而不是重复原始个人描述。

数据保留期限、删除/脱敏、Analytics 聚合策略由 Privacy / Data Retention Policy 单独冻结。

---

# 20. Trace Detail Level

为控制成本，建议支持 Config：

```text
minimal
standard
debug_sampled
```

## minimal

生产常规最小：

- run metadata；
- stage counts；
- final reasons；
- critical facts；
- AI/Provider usage summary；
- ChangeSet ref。

## standard

增加：

- 最终候选；
- important rejected candidates；
- score refs；
- repair attempts。

## debug_sampled

仅在受控采样 / 测试环境增加更细 breakdown refs。

Debug 也不得突破 secrets / raw provider / chain-of-thought 禁止线。

---

# 21. Sampling 与不可丢字段

Telemetry 可以采样，但以下业务审计关联不应因采样消失：

```text
decisionRunId
trigger
scope
input revisions
final outcome
critical block reason
changeSetRef（若有）
apply result ref（若有）
```

高频 Provider latency、详细 candidate breakdown 可以按 Config 采样 / 聚合。

用户正在查看“为什么”的某次 DecisionRun，应能提升或保留必要解释 Trace，但不得 retroactively 伪造当时未记录的事实。

---

# 22. Observability Metrics

P0 建议至少能聚合：

```text
Planning success rate
Replan success rate
No-valid-choice rate
Needs-fact rate
AI usage rate
AI abstain rate
AI schema failure rate
Engine revalidation reject rate
Provider failure / timeout / rate-limit rate
Freshness refresh rate
Fallback-to-prior rate
Average candidates per stage
Average decision latency
Tokens per AI decision
Cost per DecisionRun
User accept / reject / revert rate
```

这些 Metrics 用于系统质量，而不是直接作为用户 Preference。

---

# 23. A/B / Pilot 支持

Decision Trace 必须记录实验 / config version，才能比较：

```text
Engine only
vs
Engine + AI

Scoring config A
vs
Scoring config B

Candidate diversity A
vs
B

Fatigue curve A
vs
B
```

建议：

```text
experimentRefs[]
configVersionRefs[]
```

禁止在分析时把不同 configVersion 的结果直接混为同一算法表现。

---

# 24. 典型示例：清水寺 + 当日疲劳

假设：

```text
用户 walking tolerance=3
清水寺 full_visit recommended=90
POI walking baseline=7
当天上午已经高负荷
```

Decision Trace 可记录：

```text
score:
matchScore=82

day feasibility:
visitMode=full_visit
plannedDuration=90
visitWalkingLoadRef=load_31
currentDayLoadBefore=high
fatigueRisk=warning

candidate outcome:
selected as morning anchor
not selected as late-afternoon add-on

reasons:
R01 preference_match
R09 time_fit
DAY_OVERLOADED if inserted late
```

这样同一个清水寺可以：

- 本身 matchScore 很高；
- 上午合理；
- 下午因为累计疲劳而被拒绝。

Trace 能解释三者而不互相矛盾。

---

# 25. 典型示例：为什么没推荐某 POI

```text
POI A match=91
POI B match=84
```

A 最终没入选，Trace：

```text
A:
matchScore=91
routeFit=41
DURATION_TOO_SHORT in remaining window
final disposition=rejected at itinerary_feasibility

B:
matchScore=84
routeFit=88
feasibility=PASS
selected
```

用户解释应是：

> A 与您的偏好其实更匹配，但当前剩余时间和路线无法合理安排，因此选择了 B。

而不是：

> B 的景点质量比 A 高。

---

# 26. 典型示例：Replan

```text
13:05 TRAIN_DELAY +35min
```

Trace：

```text
trigger=train_delay
scope initial=rest_of_timeslot
protected=completed items + in-progress + 17:00 booking

repair1 consume_buffer → partial
repair2 shift mutable items → fail booking window
repair3 skip optional POI → pass
AI used=false

changeSetRef=...
final outcome=needs_user_confirmation / applied (按权限策略)
```

这样可以明确回答：

> “为什么删了那个景点？”

因为是最小范围内第一个能保住17:00预约的合法低损失修复，不是 AI 随机删除。

---

# 27. 与现有 `ai_decisions` 的关系

旧架构已提出：

```text
ai_decisions
```

本文件不否定该表概念，但正式边界调整为：

```text
DecisionRun
├─ Candidate / Score / Fact / Repair Trace
├─ AI Usage Trace（0..N）
├─ Provider Call Trace（0..N）
└─ Final Proposal / ChangeSet refs
```

因此：

> `ai_decisions` 只能是 Decision Trace 的 AI 子域，不能承担整个 Planning / Replanning 审计。

没有 AI 的 deterministic planning 也必须可解释、可测量。

---

# 28. 物理存储建议（非冻结）

逻辑上可以最终拆为：

```text
planning_decision_runs
planning_stage_traces
planning_candidate_traces
planning_fact_usage
planning_repair_attempts
ai_decision_usage
provider_call_usage
```

或采用关系字段 + JSONB 摘要。

本文件只冻结语义，不冻结物理表。

必须保证：

- 可按 `decisionRunId` 快速关联；
- 可按 Trip / Plan / Date 查询重要 Trace；
- 大量明细可分层保留 / 采样；
- Canonical Trip / Fact 真源不复制进 Trace。

---

# 29. Acceptance Matrix

实现前至少应有 Fixture / Test 覆盖：

```text
1. deterministic POI choice with no AI
2. AI soft choice with valid Local IDs
3. AI output rejected by Engine revalidation
4. candidate hard reject + user asks why
5. NEEDS_FACT then refresh then retry
6. stale Route fallback to TravelEdge prior
7. weather-triggered Replan
8. fatigue-triggered Replan
9. completed / booking-locked item protected
10. Provider timeout with fallback
11. AI abstain and deterministic fallback
12. user rejects proposal
13. proposal applied with ChangeSet ref
14. concurrent revision makes proposal stale before apply
15. trace redaction rejects secrets/raw payload fields
```

验收重点不是“日志存在”，而是能够从结构化 Trace 重建主要业务解释。

---

# 30. 本版本冻结 / 不冻结

## Freeze Candidate

```text
DecisionRun 是 Planning / Replanning 总关联根
Decision Trace ≠ Audit Log ≠ Telemetry ≠ Analytics
AI Usage 是可选子 Trace，不等于整个 Decision Trace
不保存私有 chain-of-thought
结构化 ReasonCode / IssueCode 优先于自由文本
Input / Policy / Config Version 必须可追溯
Fact 使用必须记录当时 Freshness / Usability
Candidate Funnel 至少保留阶段 counts + rejection reason counts
重要候选保留 disposition / reason / score / fact refs
Replanning 记录 repair attempts
AI / Provider usage 分开统计
最终关联 Domain Proposal / Engine Validation / ChangeSet / Apply
Explanation 优先从 Trace + Template 生成
敏感数据最小化与 Raw Payload 禁止进入常规 Trace
```

## Pilot / Config 后冻结

```text
retention period
sampling rate
trace detail level
candidate detail retention
AI / Provider pricing mapping
cost alert thresholds
latency SLO
acceptance target
A/B experiment thresholds
具体数据库表与索引
```

---

# 31. P0 架构闭环

本文件完成后，本轮 Trip Planning Engine 的 P0 架构形成：

```text
Preference State
↓
POI Scoring
↓
POI Master / Visit Profile
↓
Itinerary Feasibility
↓
Travel Region Graph
↓
Candidate Pipeline
↓
AI Compact Context
↓
AI Decision / Patch
↓
Replanning
↓
Fact Freshness / Provenance
↓
Decision Trace / Explainability / Cost Telemetry
```

下一阶段不应继续只增加设计概念，而应进入：

```text
Contract Schema / Validator / Fixtures
↓
100 POI + Region Graph Pilot
↓
Planning / Feasibility / Candidate Pilot
↓
AI Compact / Decision Pilot
↓
Replanning Scenario Pilot
↓
Freshness / Trace QA
↓
参数校准
↓
Consumer Review
↓
Freeze v1
```
