# TravelAssist AI Compact Context Contract V1

> 日期：2026-09-10  
> 状态：Freeze Candidate / 待 Consumer Review  
> 分支：`design/a-trip-engine-poi-ai-architecture-v2`  
> 关联设计：`trip-engine-poi-ai-provider-design-v0.3.md`、`preference-state-v0.1.md`、`poi-scoring-spec-v0.2.md`、`poi-master-schema-v0.2.md`、`itinerary-feasibility-spec-v0.1.md`、`travel-region-graph-codebook-v0.1.md`、`candidate-pipeline-contract-v0.1.md`  
> 本文件冻结候选范围：AI Gateway 输入侧的 `TaskType / ContextScope / TripCompactState / SparsePreference / CandidateProjection / RouteCompact / WeatherCompact / LocalId / TokenBudget / Progressive Context Expansion` wire contract。  
> 本文件不冻结具体模型名称、供应商、最终 Token 数值、候选数量、Model Router 阈值或 AI 输出 Patch；输出侧由 `ai-decision-contract-v1.md` 单独冻结。

---

# 1. 核心结论

AI 不应读取 TravelAssist 的完整 Domain、数据库对象、15,000+ POI、完整 Region Graph、Provider Raw JSON 或 Canonical Trip Plan。

标准输入链路：

```text
Canonical / Domain State
        ↓
Candidate Pipeline
        ↓
Context Builder
        ↓
ContextScope
        ↓
Task Projection
        ↓
Local ID Mapper
        ↓
Compact DTO
        ↓
Token Budget Guard
        ↓
Prompt Builder / Model Router
        ↓
LLM Provider
```

核心原则：

> **AI 只看到“完成当前一个决策所需的最小、已验证、可解释上下文”。Token 优化优先通过缩小 Scope、候选和字段完成，而不是依赖难懂的微型编码。**

Token 优化优先级冻结候选：

```text
Scope 裁剪
>
Candidate 裁剪
>
Field Projection
>
Output 裁剪
>
Precision 降级
>
格式微压缩
```

---

# 2. AI Gateway 输入边界

AI Gateway 是 Planning Engine 与 LLM Provider 的唯一边界。

输入侧模块：

```text
Context Builder
Input Adapter
Local ID Mapper
Prompt Builder
Model Router
Provider Adapter
```

输出侧：

```text
Output Parser
Schema Validator
Output Adapter
Planning Engine Revalidate
```

禁止：

```text
DB Row → AI
Provider Raw JSON → AI
Canonical Trip Plan entire payload → AI
Full POIFeatureV1 for all candidates → AI
Full Route geometry/steps → AI
Full Weather Provider payload → AI
```

AI Context 必须是派生 DTO，不是第二套领域真源。

---

# 3. TaskType Codebook

每次请求必须且只能有一个主 TaskType。

v1 Freeze Candidate：

```text
macro_corridor_choice
region_choice
stay_cluster_choice
poi_choice
poi_order
poi_replacement
day_balance_choice
route_alternative_choice
replan_soft_choice
semantic_preference_resolution
```

说明：

## macro_corridor_choice

从已经通过 Macro Pipeline 的少量 Corridor 中选择更符合用户旅行风格的方案。

## region_choice

在合法 Region 候选中做软偏好选择。

## stay_cluster_choice

在一个 Region 内选择住宿 / 活动基地区域；不直接选择具体酒店库存。

## poi_choice

从当前 Scope 的已验证 POI 候选中选择一个或多个。

## poi_order

对已选择且可执行的 POI 做软顺序选择；硬时序与 Route 必须由 Engine 验证。

## poi_replacement

从 replacement candidates 中选择替代项，例如雨天、临时关闭或疲劳过高。

## day_balance_choice

在多个都可执行的 Day 方案中，做节奏、体验、经典/小众等软权衡。

## route_alternative_choice

只在 Engine 已确认可执行的 Route Alternatives 中做用户体验权衡；AI 不生成新 Route Fact。

## replan_soft_choice

Replanning 已确定受影响范围和保护项后，在合法修复方案中做软选择。

## semantic_preference_resolution

处理 Engine 难以仅靠数值判断的自然语言旅行风格、特殊语义和偏好冲突；输出仍只能成为结构化 Proposal。

Explanation 不属于本合同主 Decision TaskType。普通解释优先 ReasonCode + Template；需要自然语言时由独立 Explanation Context 投影处理。

---

# 4. ContextScope

每次 AI 请求必须明确 Scope：

```text
trip
region
day
timeslot
item
event
```

规则：

```text
需要一个下午 → 不发整天
需要一天     → 不发十天
需要一个 Region → 不发完整日本 Region Graph
```

建议结构：

```ts
type ContextScopeV1 = {
  kind: "trip" | "region" | "day" | "timeslot" | "item" | "event"
  tripRef: string
  dayIndex?: number
  regionLocalId?: number
  itemLocalId?: number
  window?: [startMinute, endMinute]
}
```

`tripRef` 可在 Gateway 内部使用；若 AI 不需要引用它，可以不进入最终 Prompt。

## 4.1 Adjacent Context

目标 Scope 允许携带最小相邻上下文，例如调整 Day 6 下午：

```text
Day5 ending state
Day6 target window
Day7 first locked anchor
```

不得因此把 Day5/Day7 全部明细发送。

---

# 5. Compact Context Envelope

建议逻辑 Wire Shape：

```ts
type AiCompactContextV1 = {
  v: "1"
  task: TaskTypeV1
  scope: ContextScopeCompactV1

  state: TripCompactStateV1
  pref?: SparsePreferenceCompactV1
  constraints: ConstraintCompactV1[]
  candidates: CandidateProjectionV1[]

  route?: RouteCompactV1
  weather?: WeatherCompactV1

  request: DecisionRequestCompactV1
  precision: "normal" | "fine"
}
```

注意：

- 这是 AI DTO，不是持久化 Schema；
- 不要求复制 Canonical Contract 的全 Key / null 规则；
- Prompt Builder 可以把结构序列化成 JSON、tuple 或其他已验证格式；
- 语义合同不依赖某一种文本排版。

---

# 6. TripCompactStateV1

TripCompactState 只描述本 Task 需要的旅行状态摘要。

允许字段：

```text
tripDays
macroPath
currentRegion
currentDay
currentWindow
partySummary
budgetBand
tripStyle
lockedAnchors
completedRefs
inProgressRef
currentLoad
adjacentBoundary
```

概念示例：

```text
10d
Tokyo>Hakone>Kyoto>Osaka
party=2A
style=slow
budget=M
D6@780-1080
locked=d6i0,d7i0
load=[walk6,physical5]
```

TripCompactState：

- 不存储为新的 Trip 真源；
- 不复制完整 itinerary；
- 不携带 booking token、用户身份、数据库 ownership；
- 不携带完整 revision history；
- 需要版本 / protection 判断时只投影当前必要状态。

Canonical Trip Plan 仍是唯一权威 Trip 数据合同。

---

# 7. SparsePreferenceCompactV1

用户已冻结规则：

```text
Preference 1..9
5 = 明确中性
```

AI Compact 输入：

```text
值 = 5 → 省略
值 ≠ 5 → 传原始 1..9
```

示例：

```text
P=4:9,5:8,7:8,25:3,27:2
```

或结构化：

```json
[[4,9],[5,8],[7,8],[25,3],[27,2]]
```

## 7.1 省略语义必须局部定义

这是关键规则：

```text
Preference section 中 omitted
= Effective Preference 已合并后的中性 5
```

但：

```text
Candidate Projection 中 omitted
= 本 Task 不投影 / 不需要这个字段
```

两者不得混用。

## 7.2 未设置与明确中性

数据库 Preference State 中：

```text
missing ≠ explicit 5
```

必须先完成 Snapshot + Override 合并，得到 Effective Preference。

只有 Effective Preference 进入 AI Compact 后，`5` 才允许 omit。

---

# 8. Local ID Contract

所有 Candidate / Region / Corridor / Item 在单次 AI Run 中使用 Local ID。

例如：

```text
0 → POI master A
1 → POI master B
2 → POI master C
```

AI 只看到：

```text
0 / 1 / 2
```

Local ID Mapper 在 Gateway 内持有：

```ts
type LocalIdMapV1 = {
  runId: string
  entries: {
    localId: number
    entityKind: "poi" | "region" | "corridor" | "route" | "item" | "stay_cluster"
    domainRef: string
  }[]
}
```

规则：

- `LocalIdMap` 默认不发送给 AI；
- 生命周期只限一次 Decision Run；
- 不跨请求复用；
- AI 返回 unknown Local ID 必须拒绝；
- Local ID 不写入 POI / Region / Trip Master；
- 同一 Run 中不得重复映射同一 local ID 到不同实体。

Progressive Expansion 若为同一逻辑 Run，可保持既有 Local ID 稳定并只追加新 ID；若重新创建 Decision Run，则必须重新映射。

---

# 9. CandidateProjectionV1

Candidate Pipeline 已经把全库收缩成少量合法候选。AI 输入再次按 Task 做 Projection。

禁止建立一个“所有 Task 都发送全部字段”的 Candidate DTO。

## 9.1 Common Base

最小公共字段：

```text
id
status / flags（仅必要）
```

必要时增加：

```text
name
semanticTags
```

纯数值选择不要求名称。

## 9.2 poi_choice

推荐投影候选字段：

```text
id
match
currentSuitability
valueBand
visitMin
visitRec
loadSummary
routeSummary
reasonTags
```

只根据当前用户实际偏好追加相关 Feature，例如：

```text
photo
nature
hidden
walking
crowd
```

而不是发送完整 43 维。

## 9.3 poi_order

推荐：

```text
id
visitMin
visitRec
areaLocalId
openWindow
routeToNextSummary
timeFlexibility
lockedFlag
```

AI 不能改写 Hard Opening / Booking Fact；只决定合法顺序偏好。

## 9.4 poi_replacement

推荐：

```text
id
match
currentSuitability
visitMin
weatherFit
loadSummary
detour
routeSummary
replacementReasonTags
```

## 9.5 macro_corridor_choice

推荐：

```text
id
regionPathLocalIds
tripCompatibility
detourBand
transportBurden
hotelChangeCount
scenicFit
hiddenFit
paceFit
```

不发送完整 Region Graph。

## 9.6 route_alternative_choice

推荐：

```text
id
durationMin
fareMinorUnit
transfers
walkMin
reliabilityBand
comfortTags
```

---

# 10. Score Precision

Engine 内部保留：

```text
0..99
```

AI Normal Precision：

```text
0..9
```

建议稳定离散映射由 Engine Config 提供。

AI Fine Precision：

```text
0..99
```

只在以下场景升级：

- 候选分数非常接近；
- 需要高精度 Pareto 后软选择；
- normal precision 已无法稳定区分；
- Benchmark 证明 Fine 模式改善决策质量。

`precision` 必须在 Envelope 显式声明，禁止同一字段有时 0–9、有时 0–99 但不给模型说明。

---

# 11. Duration / Time

Canonical / Domain 时间保留真实分钟、日期或 Instant。

AI 默认直接使用人类可理解分钟：

```text
visitRec=90
open=[540,1020]
route=32
```

默认禁止强迫模型换算：

```text
TIME15
DUR5
```

这些编码可用于内部索引 / 批处理；只有真实 Benchmark 证明显著节省且无质量损失时，某个 Task Projection 才允许启用。

固定预约 / 交通班次等仍保持分钟级精度。

---

# 12. RouteCompactV1

完整 Route Contract 不进入 AI。

默认决策摘要：

```ts
type RouteCompactV1 = {
  id?: number
  durationMin: number
  fare?: number
  currency?: string
  transfers?: number
  walkMin?: number
  reliability?: number
  arrivalMinute?: number
  departureMinute?: number
  flags?: string[]
}
```

根据 Task 可以进一步缩减。

默认不发送：

```text
geometry
all steps
platform detail
provider raw metadata
provider request IDs
operator legal payload
```

若用户问题确实依赖运营商 / 线路语义，可由 Projection 添加最小必要字段。

Planning Prior 与 Live Route Fact 必须区分来源；最终正式执行方案不能让 AI 把 TravelEdge Prior 当成当天真实路线。

---

# 13. WeatherCompactV1

Weather Provider Raw JSON 不进入 AI。

Planning Engine / Weather Adapter 先产生决策语义：

```text
rainRisk
heatRisk
coldRisk
snowValue
outdoorFit
transportRisk
volatility
```

示例：

```json
{"rain":7,"outdoor":3,"heat":2,"volatility":5}
```

只有与当前 Task 有关的天气维度才投影。

例如：

```text
poi_replacement due to rain
→ rain / outdoor / weatherSensitive
```

不需要把整周天气预报发给 AI。

---

# 14. ConstraintCompactV1

Hard Constraint 永远不能为了省 Token 被删除。

AI 只需要当前 Scope 相关的最小约束摘要，例如：

```text
must_keep localId 2
must_finish_before 1080
wheelchair_required
booking_anchor localId 4 @ 780
no_bus
```

规则：

- Hard Constraint 的完整合法性由 Engine 拥有；
- AI Context 只投影当前决策需要知道的限制；
- 被 Hard Reject 的 Candidate 不应出现在普通候选列表；
- 若保留用于冲突解释，必须显式标记 `blocked`，且 AI 无权选择它。

---

# 15. Unknown / Null / Omitted 规则

AI Compact DTO 不复制 Canonical Contract 的 all-key / null shape，但必须避免歧义。

## 15.1 omitted

普通 Candidate 字段 omitted：

```text
= 当前 Task 不需要 / 未投影
```

不得自动解释为 0、5、false 或 unknown。

## 15.2 unknown

如果一个 unknown Fact 会 materially influence decision：

```text
不得静默 omit
```

处理优先级：

```text
能补 Fact → Candidate Pipeline / Provider 先补
仍无法补 → NEEDS_FACT，不进入正式 executable choice
```

若该 unknown 只影响非关键软判断并允许继续，可显式：

```text
fieldStatus=unknown
```

或使用 Task 已定义的 compact unknown marker。

## 15.3 null

默认 Compact DTO 不发送大量 null。

只有某字段“明确为空”本身具有业务语义时才允许显式 null，并必须在 Task Projection 定义。

---

# 16. Reason / Evidence Input

Decision AI 不需要完整 Score Breakdown、所有证据 URL 或 Provider Evidence。

默认只允许：

```text
reasonTags
constraintSummary
scoreSummary
```

例如：

```text
PREF_MATCH
LOW_DETOUR
LOW_FATIGUE
RAIN_FIT
ICONIC_ANCHOR
```

完整审计 Breakdown 保留在 Engine / Decision Trace，不反复送给 AI。

涉及争议或语义冲突时，Progressive Expansion 可以请求有限 `scoreBreakdownSummary`，不能直接加载所有原始证据。

---

# 17. Name / Semantic Text Policy

名称不是每个 Decision Task 的必填字段。

纯数值 / 顺序选择：

```text
只用 Local ID + compact metrics
```

需要名称 / 语义文本的场景：

- 用户明确点名某景点；
- 文化 / 语义 / 独特体验判断；
- semantic_preference_resolution；
- 用户要求自然语言解释；
- 同分候选需要语义差异辅助。

名称必须来自 Canonical / reviewed data，不要求 AI 通过 ID 猜实体。

文本描述必须裁剪为与 Task 直接相关的短语，不发送完整百科介绍。

---

# 18. Token Budget Contract

Token Budget 属于 Gateway Config，不写死到领域 Schema。

建议每个 Task 配置：

```text
maxInputTokens
reservedOutputTokens
maxCandidates
maxExpansionRounds
normalPrecision
allowFinePrecision
```

最终数值由真实 Benchmark 冻结。

## 18.1 Budget Guard

Prompt Builder 前必须先估算 / 计算输入预算。

若超预算，按固定顺序降级：

```text
1. 删除 optional semantic text / descriptions
2. 删除非必要 names
3. 删除 optional reason detail / breakdown summary
4. 将 0–99 降到 0–9（Task 允许时）
5. 进一步做 Candidate dominance / soft truncation
6. 缩短 adjacent context，只保留 boundary state
7. 拆分 Decision Task 或放弃 AI，回退 Engine deterministic choice
```

禁止为了 Token：

```text
删除 Hard Constraints
删除 must-go / locked anchors
伪造 unknown
把实时 Route Fact 换成不标注的 prior
破坏 Local ID 映射
删除导致 Candidate 合法性无法判断的字段
```

## 18.2 Candidate Truncation

候选超预算时：

- 先删除完全支配候选；
- 再按 Candidate Pipeline 已验证排序截断；
- 保留 diversity representative；
- must-go / locked / user-mentioned 候选不允许静默删除；
- 被截断原因进入 Decision Trace。

---

# 19. Progressive Context Expansion

默认先发送最小 Context。

例如：

```text
TripCompact
+ Day5 afternoon boundary
+ Top8 POI candidates
```

只有当前 Context 无法合法决策时才扩展。

允许的标准请求类型 Freeze Candidate：

```text
need_route_detail
need_weather_detail
need_score_detail
need_adjacent_day
need_semantic_detail
need_stay_context
```

AI 只能“请求更多上下文”，不能直接访问 DB / Provider。

流程：

```text
AI requests context kind
↓
Gateway validates request
↓
Budget / permission / scope check
↓
Engine / Adapter produces compact addition
↓
same run Local ID remains stable
↓
next decision attempt
```

必须限制：

```text
maxExpansionRounds = Config
```

超出后：

```text
Engine deterministic fallback
或返回 insufficient_context
```

不得让模型无限循环自主加载数据。

---

# 20. Stable Prompt / Cache Boundary

适合稳定缓存：

```text
POIFeature Codebook
Feature Kind semantics
TaskType definitions
ReasonCode definitions
Output Schema
Planning rules
Safety / authority rules
```

动态输入：

```text
Sparse Preference
TripCompactState
Scope
Candidates
Route Summary
Weather Summary
Constraints
Current request
```

规则：

- Stable 与 Dynamic 必须逻辑分离；
- 稳定规则版本必须可追踪；
- 不因文案微调随机改变 Codebook key；
- Cache 命中与否不得改变业务语义。

---

# 21. Compact Example — POI Choice

用户：

```text
喜欢摄影 / 自然
不想多走路
讨厌拥挤
Day 3 下午选择 2 个景点
```

Engine 已完成 Candidate Pipeline。

Compact Context 可以概念化为：

```json
{
  "v":"1",
  "task":"poi_choice",
  "scope":{"k":"timeslot","d":3,"w":[780,1080]},
  "state":{"party":"2A","style":"balanced","load":[5,4]},
  "pref":[[4,9],[7,8],[25,3],[27,2]],
  "constraints":[["finish_before",1080]],
  "candidates":[
    {"id":0,"m":9,"cur":8,"visit":[60,90],"walk":7,"crowd":8,"route":[18,0,6]},
    {"id":1,"m":8,"cur":9,"visit":[45,60],"walk":3,"crowd":3,"route":[12,0,4]},
    {"id":2,"m":7,"cur":8,"visit":[30,45],"walk":2,"crowd":2,"route":[20,1,5]}
  ],
  "request":{"choose":2},
  "precision":"normal"
}
```

字段名是否进一步压缩由 Serializer / Benchmark 决定；业务语义以本合同为准。

这里的 `walk` 只能作为当前候选的 compact load summary。正式 Day Feasibility 仍必须基于 `Visit Mode + plannedDuration + Visit Load + Route Load + accumulated Day Load` 重新验证；AI 不能因为 compact `walk=3` 就自行构造疲劳事实。

---

# 22. Compact Example — Macro Corridor

Engine 已从 Region Graph 生成 4 个合法 Corridor：

```json
{
  "v":"1",
  "task":"macro_corridor_choice",
  "scope":{"k":"trip"},
  "state":{"days":10,"party":"2A","style":"slow"},
  "pref":[[7,9],[12,8],[14,8]],
  "constraints":[["must_region",3]],
  "candidates":[
    {"id":0,"path":[0,1,3,4],"compat":9,"detour":3,"scenic":8,"hidden":4,"hotelChanges":3},
    {"id":1,"path":[0,5,6,7,3,4],"compat":8,"detour":6,"scenic":9,"hidden":9,"hotelChanges":5},
    {"id":2,"path":[0,2,8,3,4],"compat":8,"detour":4,"scenic":8,"hidden":7,"hotelChanges":4}
  ],
  "request":{"choose":1},
  "precision":"normal"
}
```

AI 不需要日本完整 Region Graph，也不需要每条 TravelEdge 全字段。

---

# 23. Context Validation

发给 LLM 前，Gateway 必须验证：

```text
version supported
TaskType supported
Scope valid
Local IDs unique
Candidate IDs all mapped
No Hard-Rejected ordinary candidates
Locked / must-go references preserved
Preference values are 1..9 and exclude compact 5
Precision declared
Route prior/live provenance not confused
No Provider Raw payload
No DB owner/token/private IDs leaked unnecessarily
Token Budget satisfied
```

失败：

```text
不调用 LLM
```

先由 Engine / Gateway 修复 Context。

---

# 24. Logging / Privacy Boundary

AI Context 进入日志 / Decision Trace 时必须遵循最小化原则。

建议记录：

```text
contextVersion
TaskType
Scope
candidateCount
projectionVersion
precision
inputTokenCount
expansionRounds
modelClass
```

默认不要求记录完整 Prompt 原文。

不得把：

```text
access token
session cookie
booking secret
payment data
private provider credential
```

放进 AI Context。

用户自然语言原话也不应在每层重复持久化；可保存经过产品隐私策略允许的结构化意图 / 必要审计引用。

---

# 25. 与 AI Decision Contract 的交接

本文件只冻结 AI 输入。

输出必须由下一份合同定义：

```text
ai-decision-contract-v1.md
```

输入侧承诺：

- Candidate 都来自合法 Candidate Pipeline；
- Local ID 映射存在；
- Hard Constraints 已执行；
- Compact Fact 来源清晰；
- Scope / Budget / Precision 显式。

输出侧必须承诺：

- 只引用本 Run 的 Local ID；
- 不直接写 Canonical Trip；
- 允许 abstain / needs_more_context / no_valid_choice；
- Compact Operation 必须重新映射并 Revalidate；
- 最终修改必须进入 ChangeSet / Trip Mutation Engine。

---

# 26. Validation Fixtures

实现前至少建立以下测试夹具：

```text
1. Day POI choice — Sparse Preference + 8 candidates
2. walking-sensitive choice — 30/60/90min Visit Load distinction
3. rain replacement — Weather Compact only
4. Macro Corridor choice — no full Region Graph
5. Must-go candidate — cannot be token-truncated
6. Hard Reject candidate — absent / explicitly blocked only
7. unknown critical fact — NEEDS_FACT, no AI call
8. Local ID invalid response fixture
9. Budget overflow — deterministic compression order
10. Progressive expansion — stable Local IDs
11. Fine precision escalation
12. no-name numeric decision vs semantic-name decision
```

验收重点：

> 同一个业务决策，在完整 Domain 数据与 Compact Context 下应得到业务等价的合法候选集合；Compact 化不能改变 Hard Constraint、事实状态或 Candidate Identity。

---

# 27. Freeze Candidate

建议先冻结：

- 单 TaskType；
- ContextScope 六类；
- Compact Context 为派生 DTO；
- Sparse Preference `1–9 / omit-5`；
- Preference omitted 与 Candidate omitted 语义分开；
- Local ID 单 Run 生命周期；
- Candidate Task Projection；
- Route / Weather 只传 decision summary；
- normal 0–9 / fine 0–99 精度显式声明；
- 时间默认直接使用分钟；
- Hard Constraint 永不因 Token 删除；
- Token Budget 固定降级顺序；
- Progressive Expansion 由 Gateway 控制；
- Stable / Dynamic Prompt 分离；
- AI 无 DB / Provider 直接访问权；
- 最终必须 Engine Revalidate。

Pilot 后再冻结：

- 每个 Task 的 maxInputTokens；
- reservedOutputTokens；
- maxCandidates；
- maxExpansionRounds；
- normal → fine 升级阈值；
- 具体 Serializer 是否使用 tuple / shortened keys；
- 实际模型分层与成本阈值；
- Raw JSON → Compact 的实际 Token 压缩目标。
