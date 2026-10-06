# TravelAssist Trip Engine 设计待办清单 v0.1

> 日期：2026-09-10  
> 状态：Planning / Design Backlog  
> 分支：`design/a-trip-engine-poi-ai-architecture-v2`  
> 关联设计：`trip-engine-poi-ai-provider-design-v0.3.md`、`poi-feature-preference-codebook-v0.1.md`  
> 目的：列出当前 Trip Planning / POI / Region / AI Gateway 在进入实现前仍需设计或冻结的规格，并区分 P0 / P1 / Pilot 后校准项。

---

# 1. 已完成 / 已有候选设计

当前已经具备：

- Trip Planning Engine 与 WBS 4.20 Trip Mutation Engine 的职责边界；
- RegionRelation / TravelEdge / Live Route Fact 三层关系；
- POIFeatureV1 固定 43 维；
- Feature Kind：benefit / suitability / cost / risk；
- Sparse Preference：1–9，5 为中性，Compact 传输时省略；
- AI Gateway 总体结构；
- Local ID、Task Projection、Pareto Pruning、Patch Output、ReasonCode 等 Token 优化方向；
- Master Code 编号体系保持现有并行工作，不在本设计中改动。

这些内容足以确定总体方向，但还不足以直接冻结完整 Trip Planning Engine 实现。

---

# 2. P0：实现前必须继续设计 / 冻结

## P0-1 Preference State / Merge Contract

必须定义“偏好到底来自哪里，以及冲突时谁覆盖谁”。

建议正式区分：

```text
Long-term Preference
Trip Preference Snapshot
Trip Override
Runtime Context
Hard Constraint
```

必须冻结：

- 1–9 值的持久化语义；
- `5 = 中性` 与 `未设置` 的区别；
- Compact 中 omit-5 与数据库持久化的区别；
- 用户显式恢复为中性的表达；
- 长期偏好、当次 Override、AI 推断、同行人 Context 的优先级；
- 来源 provenance；
- 是否允许 AI 自动写长期偏好；
- Trip 完成后哪些数据可以用于更新长期偏好。

推荐文件：

`docs/architecture/preference-state-v0.1.md`

---

## P0-2 Scoring / Matching Spec

43 维有了，但“怎么算”还没有冻结。

至少需要定义：

```text
benefit      如何计算偏好匹配
suitability  如何处理适配度
cost         如何计算容忍度 / penalty
risk         如何计算风险 penalty
```

必须覆盖：

- 1–9 → Engine 权重的归一化；
- 低于 5 的 benefit 是否表示反感、低权重或排除；
- walking / crowd 等 tolerance function；
- `null` / unknown 如何处理；
- 0 与 null 的差异；
- Hard Constraint 如何在评分之前 fail closed；
- 多人同行如何合并偏好；
- family / senior / couple 等 Context 与 POI Feature 的结合；
- season / weather / time-of-day 的动态计算；
- matchScore / dayFit / routeFit / weatherFit / currentSuitability 的边界；
- score breakdown，用于解释和测试。

推荐文件：

`docs/architecture/poi-scoring-spec-v0.1.md`

注意：最终权重数值可以 Pilot 后校准，但函数方向、输入输出和缺失值规则必须先冻结。

---

## P0-3 POI Master / Feature / Fact Schema

目前有字段概念，但还需要正式数据契约。

必须定义：

```text
POI identity
POI Facts
POIFeatureV1
source / confidence
review status
validity / updatedAt
region relation
transport access facts
```

重点：

- Facts 与 Feature 分表还是逻辑分层；
- Feature 版本升级方式；
- 每个 Feature 是否可有独立 confidence/source；
- 官方事实与 AI 推断冲突时的优先级；
- 过期字段如何标记；
- POI 合并 / 去重 / 改名 / 关闭后的身份保持；
- Master Code 与内部 DB ID 的映射边界；
- 15,000 POI 批量生产 JSONL 的最终 schema。

推荐文件：

`docs/architecture/poi-master-schema-v0.1.md`

---

## P0-4 Region Graph Schema / Codebook

现在只有总体结构，还需要真正可入库的 Graph Contract。

必须定义：

```text
RegionType
RegionRelationType
TravelEdge
TravelEdgeVariant
Gateway
Directionality
source / confidence / validity
```

需要决定：

- Travel Region / District / Stay Cluster / Gateway 的正式边界；
- `contains / part_of / adjacent / overlaps / gateway_of` 的语义；
- Edge 是否有向；
- 正反方向是否可以有不同属性；
- EdgeVariant 的 mode code；
- typical time/cost 是 range、band 还是单值；
- day-trip / overnight / luggage / scenic 等先验字段；
- Graph 版本与增量更新；
- Graph 数据质量检查：孤岛、重复边、非法环、悬空节点。

推荐文件：

`docs/architecture/travel-region-graph-codebook-v0.1.md`

---

## P0-5 Candidate Pipeline Contract

当前有筛选漏斗，但各阶段接口还没冻结。

建议明确：

```text
Region Candidate
↓
Corridor Candidate
↓
POI Candidate
↓
Hard Filter
↓
Preference Score
↓
Route Feasibility
↓
Pareto Prune
↓
Daily Top-N
```

需要定义：

- 每个阶段的输入 / 输出；
- 哪些条件是 hard filter；
- 哪些条件只能降分；
- 每一步是否保留 rejection reason；
- Candidate ID 与 Local AI ID 的生命周期；
- Candidate 数量上限属于 Config，不写死到业务代码；
- 如何避免热门 POI 永远霸榜；
- diversity / category / area coverage 的约束；
- fallback：候选不足时如何逐级放宽。

推荐文件：

`docs/architecture/candidate-pipeline-contract-v0.1.md`

---

## P0-6 AI Compact Context Contract V1

AI Gateway 已有模块划分，但 Compact Context 还需要正式 wire contract。

必须定义：

```text
ContextScope
TaskType
TripCompactState
SparsePreference
CandidateProjection
RouteCompact
WeatherCompact
LocalIdMap
TokenBudget
```

建议 Scope：

```text
trip
region
day
timeslot
item
event
```

还需定义：

- omit 字段表示 unknown 还是 not-needed；
- `null` 是否允许；
- 每个 Task 的 Projection；
- 不同任务最大候选数量；
- 普通 0–9 与 fine 0–99 精度切换规则；
- Stable Prompt / Codebook 缓存边界；
- Progressive Context Expansion 何时允许；
- Token Budget 超限时的降级策略。

推荐文件：

`docs/architecture/ai-compact-context-v1.md`

---

## P0-7 AI Decision Output / Patch Contract

不能只规定“AI 返回 JSON”，必须冻结 AI 可以返回什么。

建议至少包含：

```text
version
decisionType
selectedIds
orderedIds
backupIds
reasonCodes
confidence
needMoreContext
compactOps
```

必须定义：

- AI 不得返回 Master DB 写操作；
- AI 不得直接生成 Canonical Trip Plan；
- Local ID → Domain ID 的解析；
- unknown ID / duplicate ID / 非候选 ID 的拒绝；
- `need_more_context` / `no_valid_choice` / `abstain`；
- ReasonCode Codebook；
- Compact Patch → Domain Proposal → ChangeSet 的转换边界；
- 输出重试次数和 fail-safe。

推荐文件：

`docs/architecture/ai-decision-contract-v1.md`

---

## P0-8 Replanning Contract

实时改行程是产品核心，但当前只有概念。

必须定义：

```text
Completed
InProgress
Locked
BookingProtected
FutureMutable
Cancelled
```

以及重规划范围：

```text
current item
current timeslot
rest of day
next N days
whole remaining trip
```

需要冻结：

- 已完成项目永远不可被规划器重写；
- 当前进行中项目的修改规则；
- 预约 / 付款 / 用户锁定项目保护；
- 天气 / 交通 / 用户临时要求的触发输入；
- 重规划时何时调用 AI；
- 只重新计算受影响范围；
- 与 WBS 4.20 ChangeSet 的交接；
- 同行人同步和冲突处理属于 Runtime / Mutation 边界。

推荐文件：

`docs/architecture/replanning-contract-v0.1.md`

---

## P0-9 Fact Freshness / Provenance Policy

路线、天气、营业时间、酒店价格的时效不同，必须统一设计。

建议每个动态事实至少有：

```text
source
observedAt
expiresAt
confidence
fallbackPolicy
```

需要定义：

- 什么可以缓存；
- 缓存多久；
- 过期后是重新查询、降级还是阻断；
- Provider 不可用时能否使用 planning prior；
- 静态 TravelEdge 绝不能冒充 Live Route Fact；
- AI 看到的数据必须能追溯到哪个 fact snapshot。

推荐文件：

`docs/architecture/planning-fact-freshness-policy-v0.1.md`

---

## P0-10 Decision Trace / Explainability / Cost Telemetry

如果没有这一层，Pilot 很难校准，也无法判断 AI 到底值不值得调用。

建议每次规划保存可审计的：

```text
inputContextVersion
preferenceSnapshotRef
candidateCountByStage
rejectedReasonCounts
scoreBreakdown
selectedCandidate
aiUsed
modelClass
inputTokens
outputTokens
latency
providerCalls
finalDecision
```

用途：

- 调试“为什么没推荐某景点”；
- 校准 43 维评分；
- 统计 AI Token 成本；
- 比较纯 Engine vs Engine + AI；
- Premium 成本控制；
- A/B Test。

推荐文件：

`docs/architecture/planning-decision-trace-v0.1.md`

---

# 3. P1：Pilot 前后继续设计，但不必阻塞最早 Schema 实现

## P1-1 Corridor Score / Trip Style Profile

需要设计：

- efficiency / balanced / slow travel / deep exploration；
- Detour Budget；
- HotelChangePenalty；
- iconic vs hidden 比例；
- 长距离移动容忍；
- Corridor diversity。

最终权重 Pilot 后调。

## P1-2 Daily Planner / Rhythm Spec

需要定义：

- 每日开始 / 结束时间；
- breakfast / lunch / dinner window；
- 连续活动时长；
- rest slot；
- 上午 / 下午 / 夜间节奏；
- 老人 / 儿童 / 高体力用户的日负荷；
- 同区域聚类与跨区移动预算。

## P1-3 Stay Cluster / Hotel Placement

Region Level 2 目前仍较粗。

需要设计：

- Stay Cluster 定义；
- 是否换酒店；
- 酒店位置对后续路线的价值；
- luggage transfer；
- check-in / check-out anchor；
- 多城市旅行住宿策略。

## P1-4 Weather Impact Spec

需要把实时天气转换成 Engine 意义：

```text
rainRisk
heatRisk
coldRisk
snowValue
outdoorFit
transportRisk
```

并定义天气导致的 rerank / replacement 规则。

## P1-5 Provider Selection / Fallback

需要定义：

- Transit Provider Router；
- Mapbox / Transit Provider 的职责交界；
- Provider fallback；
- rate limit / timeout；
- cache；
- attribution / license；
- provider outage 时 Planning Prior 的降级规则。

## P1-6 Restaurant / Meal Planning

如果餐厅正式进入行程，需要设计：

- Restaurant Master 最小字段；
- meal window；
- reservation anchor；
- route detour；
- dietary / family / solo；
- availability query timing。

## P1-7 Premium Savings Engine Contract

需要定义：

- Savings Event；
- baseline price；
- new price；
- cancellation cost；
- net saving；
- confidence / freshness；
- 用户确认边界；
- 不自动取消 / 重订的第一阶段规则。

---

# 4. Pilot 后再冻结的参数

以下不要现在写死：

```text
43 维最终评分边界
各 Feature 的最终权重
POIProfile5 权重
matchScore 权重
CorridorScore 权重
Detour Budget 数值
Hidden Gem 公式权重
StopValue 权重
Region 最终节点数
每 Region Edge 数量
Daily Top-N
Pareto 候选数量
经典 / 小众比例
AI 普通 / Fine 精度切换阈值
不同 Task Token Budget 数值
Model Router 成本阈值
POI 自动审核比例
```

这些需要 100 POI / Region Graph / AI Decision Pilot 数据后校准。

---

# 5. 推荐设计顺序

按依赖建议：

```text
1 Preference State / Merge Contract
        ↓
2 Scoring / Matching Spec
        ↓
3 POI Master Schema
        ↓
4 Region Graph Schema / Codebook
        ↓
5 Candidate Pipeline Contract
        ↓
6 AI Compact Context V1
        ↓
7 AI Decision / Patch Contract
        ↓
8 Replanning Contract
        ↓
9 Fact Freshness / Provider Fallback
        ↓
10 Decision Trace / Token Telemetry
        ↓
100 POI + Region Graph + AI Pilot
        ↓
校准 P1 / 权重 / Token Budget / Model Router
```

其中 1–4 可以部分并行，但 Scoring 必须引用已确认的 Preference / Feature 语义，AI Context 必须建立在 Candidate Pipeline 已定义的输出之上。

---

# 6. 当前最关键的三个下一步

如果只选三个设计立即继续：

```text
A. Preference State / Merge Contract
B. Scoring / Matching Spec
C. Region Graph Schema / Codebook
```

原因：

- A 决定用户输入怎样进入 Engine；
- B 决定 43 维数据怎样产生真正的推荐结果；
- C 决定“地区与地区之间怎么走、怎么组合”；
- 三者完成后，100 POI Pilot 和 Region Graph Pilot 才真正有可验收标准。

---

# 7. 验收原则

每份后续设计至少应包含：

- 明确 Producer / Consumer；
- 输入 / 输出 Schema；
- unknown / null / default 语义；
- versioning；
- fail-closed / fallback；
- examples / fixtures；
- 与 Trip Plan / Route / Mutation Engine 的边界；
- 哪些字段是事实、哪些是评分、哪些是 AI 建议；
- 哪些参数 Frozen、哪些仅为 Pilot Config。

只有当这些边界清楚后，再让 Codex 开始实现，避免把 Pilot 参数误写成永久业务规则。
