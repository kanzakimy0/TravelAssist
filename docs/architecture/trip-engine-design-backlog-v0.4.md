# TravelAssist Trip Engine 设计待办清单 v0.4

> 日期：2026-09-10  
> 状态：Planning / Design Backlog  
> Supersedes：`trip-engine-design-backlog-v0.3.md` 的优先顺序  
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

P0-6 Candidate Pipeline Contract
→ candidate-pipeline-contract-v0.1.md
```

Candidate Pipeline 已明确：

```text
Region Candidate
↓
Corridor Candidate
↓
POI Expansion
↓
Hard Filter
↓
Soft Scoring
↓
Route Feasibility
↓
Itinerary Feasibility
↓
Pareto Prune
↓
Diversity Guard
↓
Top-N
↓
AI Soft Choice
↓
Engine Revalidate
```

---

# 2. 最新 P0 顺序

下一步建议：

```text
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
AI Decision / Patch
      ↓
Replanning
```

---

# 3. P0-7 AI Compact Context 下一设计重点

需要冻结：

```text
ContextScope
TaskType
TripCompactState
SparsePreference
CandidateProjection
RouteCompact
WeatherCompact
LocalIdMap
TokenBudgetPolicy
```

必须解决：

- 每种 AI Task 到底允许看到哪些字段；
- `omit` 是 not-needed 还是 unknown；
- `null` 在 Compact Context 是否允许；
- Stable Prompt / Codebook 与动态 Context 的缓存边界；
- 0–9 普通精度与 0–99 fine precision 切换；
- Progressive Context Expansion；
- Candidate Pipeline 的 Top-N 如何投影成 AI Local ID；
- AI Context 超出预算时先删什么、绝不能删什么；
- 不把 Provider Raw / DB Internal Schema / 全量 Region Graph 给 AI。

推荐文件：

`docs/architecture/ai-compact-context-v1.md`

---

# 4. Pilot 后再冻结

仍保持 Config / Pilot：

```text
各阶段 Candidate 数量
Soft Score threshold
Pareto epsilon
Diversity ratio
Detour Budget
Live Route query budget
AI Top-N
Backup count
Token Budget 数值
模型路由阈值
```

这些不得在下一 AI Context Contract 中误写成永久业务常量。
