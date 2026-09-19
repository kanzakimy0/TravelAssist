# TravelAssist Trip Engine 设计待办清单 v0.9

> 日期：2026-09-10  
> 状态：P0 Design Complete / 待 Consumer Review 与 Pilot  
> Supersedes：`trip-engine-design-backlog-v0.8.md` 的优先顺序  
> 分支：`design/a-trip-engine-poi-ai-architecture-v2`

---

# 1. P0 设计完成状态

```text
P0-1 Preference State / Merge
→ preference-state-v0.1.md

P0-2 POI Scoring / Matching
→ poi-scoring-spec-v0.2.md

P0-3 POI Master / Feature / Fact / Visit Profile
→ poi-master-schema-v0.2.md

P0-4 Itinerary Feasibility / Rationality
→ itinerary-feasibility-spec-v0.1.md

P0-5 Travel Region Graph Schema / Codebook
→ travel-region-graph-codebook-v0.1.md

P0-6 Candidate Pipeline Contract
→ candidate-pipeline-contract-v0.1.md

P0-7 AI Compact Context Contract V1
→ ai-compact-context-v1.md

P0-8 AI Decision / Patch Contract V1
→ ai-decision-contract-v1.md

P0-9 Replanning Contract
→ replanning-contract-v0.1.md

P0-10 Fact Freshness / Provenance Policy
→ planning-fact-freshness-policy-v0.1.md

P0-11 Decision Trace / Explainability / Cost Telemetry
→ planning-decision-trace-v0.1.md
```

本轮 P0 设计链已经闭合：

```text
Preference
↓
POI Master / Feature
↓
Scoring
↓
Itinerary Feasibility
↓
Region Graph
↓
Candidate Pipeline
↓
AI Input
↓
AI Output
↓
Replanning
↓
Fresh Facts
↓
Decision Trace
↓
ChangeSet / Trip Mutation Engine
```

---

# 2. P0-11 已冻结候选的关键规则

```text
DecisionRun
= Planning / Replanning 一次完整业务决策的关联根
```

必须区分：

```text
Decision Trace
≠ Audit Log
≠ Operational Telemetry
≠ Analytics Aggregate
```

并明确：

- deterministic Engine 即使不调用 AI 也必须可解释；
- AI Usage 只是 DecisionRun 的可选子 Trace；
- 不保存模型私有 chain-of-thought / hidden reasoning；
- Candidate Pipeline 保存阶段 counts + rejection reason counts；
- 重要候选保存 disposition / reason / score / fact refs；
- Fact Usage 保存决策当时 freshness / usability；
- Replanning 保存 deterministic repair attempts；
- AI / Provider 调用分别统计 Token、latency、cache、cost、error/fallback；
- AI decision 与最终 applied outcome 必须分开；
- 最终关联 Domain Proposal / Engine Validation / ChangeSet / Preview / Apply；
- 用户解释优先由 Structured Trace + ReasonCode Template 生成；
- Telemetry 不得保存 secrets、Provider Raw、完整聊天、隐藏推理或不必要位置历史。

---

# 3. 下一阶段：P0 Implementation & Pilot

现在不建议继续扩展新的 P0 架构概念，也不建议直接把所有权重/阈值写死。

下一阶段建议按以下顺序：

```text
I0-1 Contract Schema / Validator / Fixtures
↓
I0-2 100 POI Master + Feature Pilot Dataset
↓
I0-3 Scoring / Visit Load / Feasibility Reference Engine
↓
I0-4 Region Graph Pilot
↓
I0-5 Candidate Pipeline Reference Implementation
↓
I0-6 AI Compact Context / Decision Adapter Pilot
↓
I0-7 Replanning Scenario Harness
↓
I0-8 Freshness / Decision Trace QA
↓
I0-9 Benchmark / Calibration
↓
Consumer Review
↓
Freeze v1
```

## I0-1 Contract Schema / Validator / Fixtures

优先把设计候选变成可执行 Contract，而不是立即接 UI。

至少包括：

```text
POI Master V2 validator
POIFeature43 validator
Visit Profile validator
Region Graph validator
Candidate Stage DTO validator
AiCompactContextV1 validator
AiDecisionResponseV1 validator
Replan DTO validator
PlanningFactRefV1 validator
DecisionTraceV1 validator
```

并建立 positive / negative fixtures。

## I0-2 100 POI Pilot

先选覆盖足够差异的日本 POI：

```text
寺社
博物馆
城市景观
自然
高步行/爬坡
亲子
夜间
温泉
雨天友好
季节型
预约型
```

目的不是“先做100个正式生产数据”，而是验证 Schema、Feature、Visit Load、Scoring 和 unknown/confidence 语义。

## I0-3 Scoring / Feasibility Reference Engine

至少验证：

- benefit / cost / risk 方向；
- walking / physical 与时长/Visit Mode 动态负荷；
- minimum / recommended duration；
- Route walk 与 POI walk 分离；
- Day accumulated load；
- Hard Gate / NEEDS_FACT；
- Score coverage / confidence。

## I0-4 Region Graph Pilot

先生产有限地区图验证：

```text
Tokyo
Hakone / Fuji
Nagano / Matsumoto / Takayama / Kanazawa
Kyoto / Nara / Osaka / Kobe
```

覆盖：

```text
RegionRelation
TravelEdge
TravelEdgeVariant
Gateway
Stay Cluster
```

## I0-5 Candidate Pipeline

验证真实漏斗，而不是预设固定数量：

```text
Region
→ Corridor
→ POI Expansion
→ Hard Filter
→ Score
→ Route
→ Feasibility
→ Pareto
→ Diversity
→ AI Top-N
```

输出每阶段 Decision Trace。

## I0-6 AI Pilot

比较：

```text
Engine only
vs
Engine + AI Soft Choice
```

重点验证：

- Token 降幅；
- Local ID 稳定性；
- Task Projection 字段是否够用；
- no_valid_choice / abstain / need_more_context；
- AI proposal 被 Engine revalidate 拒绝时是否正常恢复。

## I0-7 Replanning Harness

固定场景至少覆盖：

```text
POI overrun
用户疲劳
突然下雨
景点临时关闭
列车延误
列车停运
用户临时加景点
用户删景点
预约保护
付款/锁定保护
并发 revision
```

## I0-8 Freshness / Trace QA

验证：

```text
CURRENT / AGING / STALE / EXPIRED / UNKNOWN
Event invalidation
Fallback to Prior
Provider outage
Trace redaction
Why-selected / why-not-selected explanation
```

## I0-9 Benchmark / Calibration

Pilot 后再校准：

```text
feature weights
γ / penalty curve
fixed / variable load ratio
fatigue budget
rest recovery
candidate stage limits
Pareto epsilon
Diversity ratio
Detour Budget
fact TTL / aging threshold
AI max candidates
Token budget
model router threshold
AI retry / expansion rounds
```

---

# 4. 不应在当前阶段直接冻结的数字

继续保持 Config / Pilot：

```text
POI final feature weights
match/currentSuitability weights
walking/physical load curve
minimum planning buffer
fatigue thresholds
Region final count
TravelEdge final count
Candidate Top-N
Pareto keep count
Diversity quota
Detour Budget
Fact TTL values
AI Token budgets
AI confidence thresholds
Model Router thresholds
Telemetry retention
Sampling rate
Cost alerts
```

任何实现 Task 如果需要初始值，可以使用明确标记的：

```text
PILOT_DEFAULT
```

不得把试验值称作 Frozen Business Constant。

---

# 5. P1 设计继续保留

P0 Pilot 运行期间，可以并行继续较低优先级设计，但不阻塞 P0 Reference Implementation：

```text
P1 Corridor / Trip Style tuning
P1 Daily Planner / Rhythm
P1 Stay Cluster recommendation
P1 Weather Impact detailed model
P1 Provider Selection / Fallback
P1 Restaurant / Meal Planning
P1 Premium Savings Engine
```

这些应复用 P0 已建立的：

```text
Fact
Candidate
AI Gateway
Replanning
Decision Trace
```

不得另建旁路体系。

---

# 6. P0 Design Completion Gate

P0 在“设计层”可以标记完成，但尚不能称为全部 Frozen v1。

当前状态应表述为：

```text
P0 Design Complete
+
Freeze Candidates Ready for Implementation / Consumer Review
```

升级为 Frozen v1 至少需要：

```text
Schema / Validator
Fixtures
Reference Implementation
Pilot 数据
Scenario Tests
Consumer Review
参数校准结果
Breaking-change review
```

---

# 7. 推荐下一项 Task

下一项正式工程工作建议是：

```text
Trip Planning Contracts / Validators / Fixtures Foundation
```

目标不是实现整个 Planning Engine，而是把 P0 设计转换成可以被 A/B/Codex 共同消费的版本化 TypeScript Contracts、validators 和 fixtures，为后续 100 POI Pilot 提供稳定基础。
