# TravelAssist AI Decision / Patch Contract V1

> 日期：2026-09-10  
> 状态：Freeze Candidate / 待 Consumer Review  
> 分支：`design/a-trip-engine-poi-ai-architecture-v2`  
> 关联设计：`ai-compact-context-v1.md`、`candidate-pipeline-contract-v0.1.md`、`itinerary-feasibility-spec-v0.1.md`、`preference-state-v0.1.md`、`travelassist-engine-contract.md`、`trip-plan-contract.md`  
> 本文件冻结候选范围：AI Gateway 输出侧的 `AiDecisionResponseV1`、Decision Status、Local ID 引用、Choice / Ordering / Compact Patch / Semantic Preference Proposal、ReasonCode、上下文扩展请求、Output Validation、Domain Proposal、Engine Revalidate 与 ChangeSet Builder 交接。  
> 本文件不冻结具体 LLM 型号、供应商、AI retry 数量、confidence 阈值、最终 ReasonCode 展示优先级或 Trip Mutation Engine 的 EngineOperation 版本。

---

# 1. 核心结论

AI 输出永远是**候选决策 / Proposal**，不是事实，也不是 Trip 写操作。

标准链路：

```text
AiCompactContextV1
        ↓
LLM Provider
        ↓
Raw Model Output
        ↓
Output Parser
        ↓
AiDecisionResponseV1 Schema Validator
        ↓
Local ID / Scope / Task Validator
        ↓
Output Adapter
        ↓
Domain Proposal
        ↓
Planning Engine Revalidate
        ↓ pass only
ChangeSet Builder
        ↓
Trip Mutation Engine
validate → preview → permission/protection/revision → apply/rollback
        ↓
Canonical Trip Plan
```

核心原则：

> **AI 决定“在已经合法的候选中更偏向哪个方案”；Engine 决定“这个方案现在是否仍真实、可执行、允许修改”。AI 不直接生成 Canonical Trip、Route Fact、Provider Fact、Booking/Payment 操作或数据库写入。**

---

# 2. 与 WBS 4.20 Trip Mutation Engine 的边界

既有 WBS 4.20 已定义：

```text
ChangeSet
↓
validate
↓
preview
↓
permission / protection / revision
↓
apply / rollback
```

并定义 AI proposal 只能作为 ChangeSet 上游来源。

因此：

```text
AiCompactOpV1
≠ EngineOperation
```

AI Compact Operation 只引用当前 Decision Run 的 Local ID，不包含：

- `PlanItemV1` 完整 payload；
- Canonical Schedule；
- Canonical Place；
- Trip / Plan revision 写入；
- booking token；
- payment 状态；
- Provider Raw；
- SQL / JSON Patch path；
- 权限、owner、role；
- `confirmed: true` 等授权声明。

Output Adapter / ChangeSet Builder 才能基于 authoritative Domain Snapshot 构造受支持的 Engine Operation。

---

# 3. AiDecisionResponseV1 Envelope

每次 AI 输出必须且只能选择一个顶层状态：

```ts
type AiDecisionStatusV1 =
  | "decision"
  | "need_more_context"
  | "no_valid_choice"
  | "abstain"
```

建议逻辑结构：

```ts
type AiDecisionResponseV1 = {
  v: "1"
  runId: string
  task: TaskTypeV1
  status: AiDecisionStatusV1

  decision?: AiDecisionPayloadV1
  contextRequest?: AiContextExpansionRequestV1

  reasonCodes?: ReasonCodeV1[]
  confidenceBand?: "low" | "medium" | "high"
  uncertaintyCodes?: UncertaintyCodeV1[]
}
```

规则：

- `runId` 必须与当前 Gateway Run 一致；
- `task` 必须与输入 TaskType 一致；
- `status=decision` 时必须且只能出现合法 decision payload；
- `status=need_more_context` 时不得同时返回 mutation / choice；
- `status=no_valid_choice` 与 `abstain` 不得夹带 Compact Ops；
- 未知字段是否 fail closed 由 Serializer Schema 版本规则决定；核心执行字段默认 strict；
- AI 输出自由文本不得成为执行字段。

---

# 4. Decision Status 语义

## 4.1 decision

AI 在当前合法候选和 Context 内形成了可验证的软选择。

它只表示：

> “我建议这样选。”

不表示：

- Engine 已验证；
- Route 仍最新；
- Trip revision 未变化；
- booking 可修改；
- 用户已确认；
- ChangeSet 可 apply。

## 4.2 need_more_context

AI 无法在当前最小 Context 内可靠完成任务，并请求合同允许的附加信息。

必须使用允许的 expansion code，例如：

```text
need_route_detail
need_weather_detail
need_score_detail
need_adjacent_day
need_semantic_detail
need_stay_context
```

规则：

- AI 只能请求，不得自己读取 DB / Provider；
- Gateway 决定是否批准；
- 最大 expansion round / token budget 属于 Config；
- 不允许请求 secrets、owner 数据、raw provider payload、完整数据库对象或完整 Region Graph。

## 4.3 no_valid_choice

含义限定为：

> “在**当前提供给 AI 的候选集合与软目标**内，没有我能推荐的候选。”

它不能宣称：

- 整个系统不存在合法候选；
- 某事实真实不存在；
- 某 POI 一定关闭；
- 所有 Route 都不可执行。

这些必须由 Candidate / Constraint / Provider / Feasibility Engine 判断。

收到 `no_valid_choice` 后，Orchestrator 可以：

```text
Fallback Pipeline
→ expand candidate scope
→ relax soft threshold
→ deterministic choice
→ ask user
```

但绝不能自动放宽 Hard Constraint。

## 4.4 abstain

表示：

> Context 可能已经足够，但用户目标过于模糊、候选差异无法可靠判断、语义冲突或模型不愿做该软决定。

典型后续：

- 使用 deterministic Engine 排名；
- 请求用户确认取舍；
- 更换 Task 分解；
- 在允许情况下升级模型。

`abstain` 不是错误，也不应强制模型“必须选一个”。

---

# 5. Decision Payload 类型

v1 允许四类 payload：

```text
choice
ordering
patch
semantic_preference
```

```ts
type AiDecisionPayloadV1 =
  | AiChoiceDecisionV1
  | AiOrderingDecisionV1
  | AiPatchDecisionV1
  | AiSemanticPreferenceDecisionV1
```

TaskType 必须绑定允许的 payload kind；不能任意混用。

---

# 6. Choice Decision

适合：

```text
macro_corridor_choice
region_choice
stay_cluster_choice
poi_choice
route_alternative_choice
```

建议：

```ts
type AiChoiceDecisionV1 = {
  kind: "choice"
  selectedIds: number[]
  backupIds?: number[]
}
```

规则：

- 所有 ID 必须属于当前 Run LocalIdMap；
- entityKind 必须匹配 Task；
- selected 不得重复；
- backup 不得重复；
- selected 与 backup 不得重叠；
- 数量必须符合本次 `DecisionRequest` 的 min/max 约束；
- 非 Candidate ID、已 Hard Reject ID、其他 Scope ID 一律拒绝；
- must-go / locked anchor 不由 AI choice 删除。

示例：

```json
{
  "v": "1",
  "runId": "r-123",
  "task": "poi_choice",
  "status": "decision",
  "decision": {
    "kind": "choice",
    "selectedIds": [2, 5],
    "backupIds": [7]
  },
  "reasonCodes": ["R01", "R02", "R14"],
  "confidenceBand": "high"
}
```

---

# 7. Ordering Decision

适合：

```text
poi_order
day_balance_choice（当请求为方案顺序选择时）
```

```ts
type AiOrderingDecisionV1 = {
  kind: "ordering"
  orderedIds: number[]
}
```

默认规则：

- `orderedIds` 必须是 `DecisionRequest.orderTargetIds` 的无重复全排列；
- 不得新增不存在 ID；
- 不得漏掉必须排序的 ID；
- locked relative order 若被 Input Contract 标为不可变，AI 不得破坏；
- AI 只给“软顺序偏好”，不直接给最终 start/end time；
- Output Adapter 后仍需 Route + Schedule + Itinerary Feasibility 重排验证。

若任何排序导致实际不可执行：

```text
Engine Revalidate → reject / repair / rerun
```

不得因为 AI 排序就篡改营业时间或 Route Fact。

---

# 8. Compact Patch Decision

适合：

```text
poi_replacement
day_balance_choice
replan_soft_choice
```

## 8.1 为什么 AI Patch 不能直接使用 Engine Operation

Engine `ADD_ITEM / MOVE_ITEM / REPLACE_ITEM` 等操作引用 Canonical Trip payload、稳定 Domain ID 与 revision。

AI 不拥有这些权威数据。

因此 AI 只输出“意图级 Patch”。

## 8.2 AiCompactOpV1

v1 Freeze Candidate：

```text
ADD
REMOVE
REPLACE
MOVE_BEFORE
MOVE_AFTER
REORDER
CHOOSE_ROUTE
SET_VISIT_MODE
```

概念结构：

```ts
type AiCompactOpV1 =
  | { op: "ADD"; candidateId: number; afterItemId?: number }
  | { op: "REMOVE"; itemId: number }
  | { op: "REPLACE"; itemId: number; candidateId: number }
  | { op: "MOVE_BEFORE"; itemId: number; anchorItemId: number }
  | { op: "MOVE_AFTER"; itemId: number; anchorItemId: number }
  | { op: "REORDER"; orderedItemIds: number[] }
  | { op: "CHOOSE_ROUTE"; routeId: number }
  | { op: "SET_VISIT_MODE"; itemId: number; visitModeCode: string }

type AiPatchDecisionV1 = {
  kind: "patch"
  ops: AiCompactOpV1[]
  backupIds?: number[]
}
```

## 8.3 禁止 AI 输出的 Patch 内容

AI 不得输出：

```text
absolute DB ID / UUID / Master Code
canonical PlanItem payload
start/end timestamps as authoritative schedule
raw coordinates
opening hours as facts
fare as facts
provider IDs not present in context
booking modification
payment action
purchase / cancel / refund
LOCK / UNLOCK system or booking protection
tripRevision / planRevision mutation
SQL
arbitrary JSON Patch path
```

如果需要具体时间，AI 可以选择候选 / 顺序 / Visit Mode；Scheduler 与 Engine 根据真实 Facts 计算时间。

## 8.4 Operation 原子性

一个 AI Patch Decision 作为一个 Proposal 单元处理。

默认：

> 任一 Compact Op 非法，则整个 AI Decision 不部分执行。

禁止“前两条非法就跳过，只执行第三条”的静默 salvage。

如需修复，必须形成新的合法 Proposal。

---

# 9. Compact Op → Domain Proposal → ChangeSet

例：

```text
AI:
REPLACE itemLocal=3 with candidateLocal=7
```

Gateway 内：

```text
Local item 3
→ domain itemRef = trip-item-abc

Local candidate 7
→ domain candidateRef = poi-candidate-xyz
```

Output Adapter 构造：

```text
DomainProposal
replace target=trip-item-abc
replacementCandidate=poi-candidate-xyz
```

然后 Planning Engine：

1. 读取 authoritative Candidate / POI / Visit Profile；
2. 检查 target 是否仍存在；
3. 检查 target 是否 locked / booking protected；
4. 重新检查 Hard Constraint；
5. 重新检查 Opening / Route / Duration / Visit Load；
6. 计算新的 Schedule；
7. 运行 Itinerary Feasibility；
8. 通过后才由 ChangeSet Builder 创建 Canonical `REPLACE_ITEM` / 相关受支持 operations；
9. 交给 Trip Mutation Engine `validate / preview / apply`。

AI 从不负责构造 `PlanItemV1`。

---

# 10. SET_VISIT_MODE

`SET_VISIT_MODE` 只允许选择 Candidate / POI Visit Profile 已声明支持的模式，例如：

```text
full_visit
quick_visit
photo_stop
```

AI 不得凭空创建 Visit Mode。

Output Adapter 必须重新读取：

```text
minimumDuration
recommendedDuration
maxUsefulDuration
loadProfile
```

然后重新计算：

```text
plannedDuration
visitWalkingLoad
visitPhysicalLoad
Day Fatigue
```

因此：

> `SET_VISIT_MODE=quick_visit` 不是“强行缩短时间”的后门；该 POI 必须真实支持 quick_visit，并通过 Feasibility。

---

# 11. Semantic Preference Decision

`semantic_preference_resolution` 不能直接修改 Long-term Preference。

允许输出两类 Proposal：

```text
soft preference proposal
hard constraint candidate
```

概念：

```ts
type AiSemanticPreferenceDecisionV1 = {
  kind: "semantic_preference"
  soft: {
    featureCode: number
    value: 1|2|3|4|5|6|7|8|9
    targetLayer: "trip_override" | "learning_proposal"
    evidenceKind: "explicit_user" | "inferred"
  }[]
  hardConstraintCandidates?: {
    constraintCode: string
    evidenceKind: "explicit_user"
  }[]
}
```

规则：

- AI inferred preference 默认只能进入 Trip Override 或 Learning Proposal，不自动写长期 Preference；
- `learning_proposal` 必须由用户确认后才能影响 Long-term Preference；
- Hard Constraint candidate 只能来自明确用户表达或可信事实，不允许从行为偏好自行推断为硬限制；
- AI 不得把 `walking=2` 自动升级成“绝对不能走路”；
- AI 不得把“这次带婴儿”写成用户永久长期属性。

---

# 12. ReasonCodeV1

Decision AI 默认不输出自由长理由。

v1 Freeze Candidate 基础 Codebook：

```text
R01 preference_match      符合偏好
R02 low_detour            绕路较少
R03 weather_fit           天气适配
R04 hidden_value          小众 / 隐藏价值
R05 iconic_anchor         经典 / 锚点价值
R06 low_fatigue           负荷较低
R07 route_continuity      路线连续
R08 budget_fit            预算适配
R09 time_fit              时间窗适配
R10 accessibility_fit     无障碍 / 行动适配
R11 party_fit             同行人适配
R12 season_fit            季节适配
R13 rest_balance          恢复 / 节奏平衡
R14 diversity_gain        增加体验多样性
R15 stay_efficiency       住宿 / 基地区域效率
R16 fewer_transfers       换乘更少
R17 shorter_walk          交通步行更少
R18 reliability           可靠性更高
R19 user_explicit         用户明确点名 / 明确要求
R20 preserve_protected    保留锁定 / 保护项
```

规则：

- ReasonCode 只解释选择，不创造事实；
- AI 不得因为输出 `R03` 就让 weatherFit 变高；
- UI 可用 Template 把 ReasonCode 转为自然语言；
- 只有复杂解释任务才调用 Explanation AI；
- ReasonCode 优先级 / 最多展示数量属于 Config / UX，不在 v1 写死。

---

# 13. Confidence / Uncertainty

模型自报 confidence 不能视为统计概率，也不能作为 Hard Constraint 通过依据。

v1 只建议：

```text
confidenceBand = low | medium | high
```

用途：

- 决定是否值得请求更多 Context；
- 是否升级 fine precision / stronger model；
- 是否建议用户确认。

禁止：

```text
confidence=0.95
→ 自动越过 Engine Validation
```

UncertaintyCode 候选：

```text
U01 candidates_close
U02 semantic_ambiguity
U03 insufficient_soft_signal
U04 route_tradeoff
U05 fatigue_tradeoff
U06 weather_tradeoff
U07 preference_conflict
U08 context_boundary_sensitive
```

这些只用于 Orchestrator / Explainability，不是事实。

---

# 14. Progressive Context Expansion Request

```ts
type AiContextExpansionRequestV1 = {
  needs: (
    | "need_route_detail"
    | "need_weather_detail"
    | "need_score_detail"
    | "need_adjacent_day"
    | "need_semantic_detail"
    | "need_stay_context"
  )[]
  targetIds?: number[]
}
```

规则：

- `targetIds` 仍必须属于当前 Run；
- 请求必须与当前 Task 有关；
- Gateway 可拒绝、缩小或改用 deterministic fallback；
- Expansion 只追加当前 Task 所需最小数据；
- 同一逻辑 Run 追加实体时 Local ID 只增不改；
- 新建 Run 时重新分配 Local ID。

---

# 15. Output Validation Pipeline

Raw 模型输出不得直接交给 Output Adapter。

必须按顺序：

```text
1. Syntax / Parser
2. Schema Version
3. runId / task binding
4. Status branch exclusivity
5. Local ID existence
6. Entity Kind
7. Candidate membership
8. Scope boundary
9. Task ↔ payload compatibility
10. Operation whitelist
11. duplicate / overlap / permutation rules
12. forbidden field / forbidden capability check
13. Domain Adapter
14. Engine Revalidate
```

任何执行语义不确定时：

> fail closed。

---

# 16. Output Validation Error Code

建议机器可读错误：

```text
OUT_PARSE_ERROR
OUT_UNSUPPORTED_VERSION
OUT_RUN_MISMATCH
OUT_TASK_MISMATCH
OUT_INVALID_STATUS_BRANCH
OUT_UNKNOWN_LOCAL_ID
OUT_DUPLICATE_ID
OUT_WRONG_ENTITY_KIND
OUT_NON_CANDIDATE_ID
OUT_SCOPE_ESCAPE
OUT_INVALID_SELECTION_COUNT
OUT_INVALID_PERMUTATION
OUT_OP_NOT_ALLOWED_FOR_TASK
OUT_UNSUPPORTED_VISIT_MODE
OUT_FORBIDDEN_CANONICAL_PAYLOAD
OUT_FORBIDDEN_PROVIDER_REFERENCE
OUT_FORBIDDEN_BOOKING_ACTION
OUT_FORBIDDEN_PAYMENT_ACTION
OUT_FORBIDDEN_LOCK_ACTION
OUT_INVALID_PREFERENCE_TARGET
OUT_HARD_CONSTRAINT_INFERENCE_FORBIDDEN
OUT_STALE_CONTEXT
OUT_REVALIDATION_FAILED
```

这些错误面向 Engine / telemetry；UI 是否直接展示由 Presentation 层决定。

---

# 17. Domain Proposal

AI 输出通过结构验证后，转换为 Provider-independent Domain Proposal。

概念结构：

```ts
type AiDomainProposalV1 = {
  proposalId: string
  sourceRunId: string
  task: TaskTypeV1
  scopeRef: string
  baseContextRevision: string

  actions: DomainProposalAction[]
  reasonCodes: ReasonCodeV1[]
  confidenceBand?: "low" | "medium" | "high"
  uncertaintyCodes?: UncertaintyCodeV1[]

  candidateSnapshotRef: string
  preferenceSnapshotRef: string
  factSnapshotRefs: string[]
}
```

注意：

- Domain Proposal 仍不是 ChangeSet；
- Proposal 保存“AI 当时基于什么候选/偏好/事实做了建议”的引用；
- 不保存 Provider Raw；
- 不保存隐藏 chain-of-thought；
- 不把自由 reasoning 作为授权依据。

---

# 18. Engine Revalidate

Domain Proposal 必须重新验证，不相信 AI Context 仍然最新。

至少检查：

```text
Trip / Plan revision
item existence
candidate still active
candidate lifecycle
must-go / locked / protected
booking / payment protection
Hard Constraints
opening / last entry
Visit Mode / duration
Route Fact / arrival feasibility
weather / dynamic fact freshness
Day Fatigue / Itinerary Feasibility
budget boundary
scope boundary
```

结果建议：

```text
PASS
REPAIRABLE
STALE
BLOCKED
NEEDS_FACT
```

## PASS

允许进入 ChangeSet Builder。

## REPAIRABLE

AI 意图合理，但具体 schedule / placement 可以确定性修复。

例如：

```text
AI: ADD candidate 7
Engine: 14:00 插不下，但 14:20 可以
```

Engine 可以在保持语义意图的情况下做 deterministic repair，再重新验证。

## STALE

Decision Run 后 Trip / Fact / Candidate 已变化。

必须重新构建 Context 或明确重跑，不得把旧 Local ID Decision 硬套到新状态。

## BLOCKED

违反保护、权限、硬约束或无法修复的可执行性。

AI 分数和理由不能覆盖。

## NEEDS_FACT

关键动态事实缺失或过期，先补事实。

---

# 19. ChangeSet Builder 边界

只有 `PASS` 或经过 deterministic repair 后重新 `PASS` 的 Domain Proposal 才能进入 ChangeSet Builder。

ChangeSet Builder：

- 使用 authoritative Domain ID；
- 使用当前 canonical Trip / Plan revision；
- 使用 canonical `PlanItemV1 / schedule / place`；
- 填入可信 `factRefs`；
- `source.kind = ai`；
- `proposalRef` 指向本 Domain Proposal；
- 仅生成 WBS 4.20 当前版本明确支持的 Engine Operation；
- 不支持的 operation 必须保持 `unsupported`，不能借 AI 绕过。

生成后仍必须：

```text
Trip Mutation Engine.validate
↓
preview
↓
confirmation / permission / protection
↓
apply
```

AI 不能给 ChangeSet “预先批准”。

---

# 20. Retry / Fail-safe

AI retry 只允许用于有限的可恢复错误，例如：

```text
JSON / schema 格式错误
缺少必填执行字段
模型误用了输出分支
```

默认不应因为以下情况无限重试：

```text
no_valid_choice
abstain
Engine hard reject
locked / booking protected
facts unavailable
Trip changed
```

建议策略：

```text
parse/schema error
→ bounded retry with same authoritative context

business-invalid output
→ reject + deterministic fallback / new context

stale
→ rebuild context

no_valid_choice
→ candidate fallback policy

abstain
→ deterministic rank / user choice
```

最大 retry 次数属于 Config / Model Router，不在 v1 写死。

禁止无限 autonomous loop。

---

# 21. Raw AI Output 保存策略

生产系统的长期审计重点应保存结构化结果，而不是模型隐藏推理。

建议保存：

```text
runId
task/context version
model class
parsed decision
reasonCodes
uncertaintyCodes
input/output token counts
latency
validation result
Domain Proposal ref
final Engine result
```

原始模型文本是否短期保存、保存多久、是否脱敏由 Privacy / Observability Policy 决定。

禁止要求或保存隐藏 chain-of-thought 作为产品业务依赖。

---

# 22. 典型例子：雨天替换景点

当前 Day：

```text
item 3 = outdoor POI
天气恶化
Engine 产生 replacement candidate 7 / 8 / 9
```

Compact Context：

```text
task=poi_replacement
weather=[rain8,outdoor2]
item3=[match8,rain2,load5]
7=[match8,rain9,detour2]
8=[match9,rain7,detour6]
9=[match7,rain8,detour1]
```

AI：

```json
{
  "v":"1",
  "runId":"r77",
  "task":"poi_replacement",
  "status":"decision",
  "decision":{
    "kind":"patch",
    "ops":[{"op":"REPLACE","itemId":3,"candidateId":7}],
    "backupIds":[9]
  },
  "reasonCodes":["R03","R02","R07"]
}
```

这只表示：

> “优先用候选 7 替换 item 3。”

之后 Engine 仍需：

```text
resolve local IDs
→ check locked / booking
→ opening
→ route
→ visit duration/load
→ day feasibility
→ schedule repair
→ ChangeSet
→ preview / confirm
```

---

# 23. 典型例子：清水寺时间不足

假设：

```text
清水寺 full_visit
min=60
rec=90
当前草稿只给30min
```

AI 不允许输出：

```text
"duration": 30,
"force": true
```

AI 可以在已提供合法 Visit Mode 时建议：

```text
SET_VISIT_MODE → quick_visit
```

但只有当 POI Master 明确支持 quick_visit 且对应 minimumDuration 可满足时才成立。

否则：

```text
Itinerary Feasibility → CRITICAL DURATION_TOO_SHORT
```

AI 不得覆盖。

---

# 24. 典型例子：用户说“以后旅行都少走路”

`semantic_preference_resolution`：

```text
walking preference → low tolerance
并且用户明确表达长期意图
```

AI 可以输出：

```text
soft featureCode=25 value=3 targetLayer=learning_proposal evidenceKind=explicit_user
```

但：

```text
AI Decision
↓
Preference Output Adapter
↓
用户确认长期保存
↓
Long-term Preference update
```

不能直接改 Long-term Preference。

若用户只说：

```text
这次少走路
```

目标只能是：

```text
trip_override
```

---

# 25. 验收测试矩阵

实现前至少准备：

1. valid choice；
2. unknown Local ID；
3. duplicate selected ID；
4. selected/backup overlap；
5. wrong entity kind；
6. non-candidate ID；
7. Scope escape；
8. invalid ordering permutation；
9. patch op not allowed for task；
10. AI attempts booking cancel；
11. AI attempts payment action；
12. AI attempts lock bypass；
13. AI returns canonical PlanItem payload；
14. unsupported Visit Mode；
15. `need_more_context` valid request；
16. forbidden expansion request；
17. `no_valid_choice` fallback；
18. `abstain` fallback；
19. Trip revision changes after AI run；
20. Route Fact expires before revalidate；
21. candidate becomes closed；
22. locked target replacement rejected；
23. deterministic schedule repair succeeds；
24. repair still infeasible → blocked；
25. semantic inferred preference cannot become hard constraint；
26. explicit long-term preference requires confirmation；
27. one invalid Compact Op rejects whole AI Patch；
28. repeated schema error reaches bounded fallback；
29. ReasonCode does not mutate factual score；
30. raw provider / DB / secret fields rejected.

---

# 26. Freeze Candidate Checklist

进入正式 Frozen 前应确认：

- [ ] `AiDecisionResponseV1` 四个 Status 能覆盖 Pilot；
- [ ] Choice / Ordering / Patch / Semantic Preference payload 足够；
- [ ] Compact Ops 与 WBS 4.20 EngineOperation 没有职责重叠；
- [ ] AI 无法直接生成 Canonical Trip payload；
- [ ] Local ID / Scope / Candidate membership fail closed；
- [ ] `need_more_context / no_valid_choice / abstain` 语义稳定；
- [ ] ReasonCode 足够支持 UI Template；
- [ ] Engine Revalidate 与 ChangeSet Builder 边界通过 Consumer Review；
- [ ] booking / payment / lock / provider 权限无法被 AI 绕过；
- [ ] 30+ counterexample fixtures 通过；
- [ ] 真实 Pilot 对比 deterministic-only 与 Engine+AI 的决策质量 / token / latency。

通过后再考虑：

```text
AI Decision / Patch Contract V1 → Frozen
```

---

# 27. 后续依赖

本合同冻结候选后，下一项：

```text
Replanning Contract
```

它将定义：

```text
Completed
InProgress
Locked
BookingProtected
FutureMutable
Cancelled
```

以及：

```text
current item
rest of timeslot
rest of day
next N days
whole remaining trip
```

的重规划范围与触发规则。
