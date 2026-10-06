# TravelAssist Trip Engine 设计待办清单 v0.2

> 日期：2026-09-10  
> 状态：Planning / Design Backlog  
> Supersedes：`trip-engine-design-backlog-v0.1.md` 的优先顺序  
> 分支：`design/a-trip-engine-poi-ai-architecture-v2`

---

# 1. 已完成 / 已有 Freeze Candidate

```text
P0-1 Preference State / Merge
→ preference-state-v0.1.md

P0-2 POI Scoring / Matching
→ poi-scoring-spec-v0.2.md

P0-3 POI Master / Feature / Fact / Visit Profile
→ poi-master-schema-v0.2.md

P0-4 Itinerary Feasibility / Rationality
→ itinerary-feasibility-spec-v0.1.md
```

其中 P0-4 是新增的正式 P0 项，原因是：

> 正确推荐 POI 不代表行程合理。系统必须验证单景点时长、Visit Mode、转场、营业窗口、Buffer、单日疲劳和整趟旅行节奏。

---

# 2. 最新 P0 顺序

后续建议：

```text
P0-5  Travel Region Graph Schema / Codebook
P0-6  Candidate Pipeline Contract
P0-7  AI Compact Context Contract V1
P0-8  AI Decision / Patch Contract
P0-9  Replanning Contract
P0-10 Fact Freshness / Provenance Policy
P0-11 Decision Trace / Explainability / Cost Telemetry
```

依赖关系：

```text
Preference State
      ↓
POI Scoring
      ↓
POI Master / Visit Profile
      ↓
Itinerary Feasibility
      ↓
Region Graph
      ↓
Candidate Pipeline
      ↓
AI Compact Context
      ↓
AI Decision Contract
      ↓
Replanning
```

---

# 3. walking / physical 新冻结方向

后续所有 Task 必须使用：

```text
walking / physical
= 标准推荐游览条件下的负担摘要
```

禁止使用旧解释：

```text
walking=7
→ 每次游览固定疲劳7
```

实际行程：

```text
POI Visit Profile
+ Visit Mode
+ Planned Duration
+ Fixed Load
+ Variable Load
+ Terrain
+ Route Load
+ Day Accumulated Load
↓
Actual Visit / Day Fatigue
```

因此候选筛选可以使用 walking summary，但 Day Planner / Feasibility 必须使用 actual Visit Instance load。

---

# 4. Pilot 后再写死

以下仍然不能现在固定：

```text
fixed / variable load ratio
DurationCurve
Planning Buffer
fatigue budget
rest recovery
continuous activity threshold
Feature final weights
Daily Top-N
Pareto count
Corridor weights
Detour Budget
AI Token Budget numbers
Model Router thresholds
```

这些需要 100 POI + Region Graph + itinerary generation Pilot 后校准。
