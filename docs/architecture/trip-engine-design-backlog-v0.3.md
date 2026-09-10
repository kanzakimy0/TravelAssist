# TravelAssist Trip Engine 设计待办清单 v0.3

> 日期：2026-09-10  
> 状态：Planning / Design Backlog  
> Supersedes：`trip-engine-design-backlog-v0.2.md` 的优先顺序  
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

P0-5 Travel Region Graph Schema / Codebook
→ travel-region-graph-codebook-v0.1.md
```

当前底座已经覆盖：

```text
用户偏好
→ POI 匹配
→ POI 事实 / Visit Load
→ 行程合理性
→ Region / TravelEdge 图谱
```

---

# 2. 最新 P0 顺序

下一阶段：

```text
P0-6  Candidate Pipeline Contract
P0-7  AI Compact Context Contract V1
P0-8  AI Decision / Patch Contract
P0-9  Replanning Contract
P0-10 Fact Freshness / Provenance Policy
P0-11 Decision Trace / Explainability / Cost Telemetry
```

依赖：

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

# 3. 下一项：Candidate Pipeline Contract

需要正式冻结：

```text
Region Candidate
↓
Corridor Candidate
↓
POI Candidate
↓
Hard Filter
↓
Preference / Context Score
↓
Route / Itinerary Feasibility
↓
Pareto Prune
↓
Diversity / Coverage Guard
↓
Daily Top-N
↓
AI Candidate Set
```

重点：

- 每阶段输入 / 输出契约；
- hard reject 与 soft penalty 边界；
- rejection reason；
- Region / Corridor / POI Candidate ID 生命周期；
- fallback / relaxation 顺序；
- 热门景点霸榜防护；
- iconic / hidden / category / area diversity；
- Candidate 数量上限全部放 Config；
- AI 前只保留合法、非支配、足够多样的少量候选；
- 最终路线必须通过 `itinerary-feasibility-spec-v0.1.md` 再验证。

---

# 4. Region Graph Pilot 后再写死

以下继续作为 Config / Pilot 参数：

```text
全国 Region 最终数量
每 Region Edge 数量
Region Profile 权重
TravelEdge prior 分值
Edge Runtime Score 权重
Detour Budget
Corridor Score
Gateway 覆盖全集
Local Edge 深度
```

---

# 5. 仍然不能现在写死的全局参数

```text
fixed / variable visit load ratio
DurationCurve
Planning Buffer
fatigue budget
rest recovery
Feature final weights
Daily Top-N
Pareto count
Corridor weights
Detour Budget
AI Token Budget numbers
Model Router thresholds
```

这些需要 POI + Region Graph + itinerary generation Pilot 后校准。
