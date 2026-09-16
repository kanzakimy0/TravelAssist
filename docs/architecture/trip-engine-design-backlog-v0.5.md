# TravelAssist Trip Engine 设计待办清单 v0.5

> 日期：2026-09-10  
> 状态：Planning / Design Backlog  
> Supersedes：`trip-engine-design-backlog-v0.4.md` 的优先顺序  
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

P0-7 AI Compact Context Contract V1
→ ai-compact-context-v1.md
```

AI Compact Context 已明确：

```text
ContextScope
TaskType
TripCompactState
SparsePreference
CandidateProjection
RouteCompact
WeatherCompact
ConstraintCompact
Local ID
Token Budget
Progressive Context Expansion
```

并冻结关键原则：

- AI 不读取数据库 Row、Provider Raw、全量 Region Graph 或完整 Canonical Trip；
- Preference 中 omit = Effective Preference 的中性 5；Candidate Projection 中 omit = 本 Task 不投影；
- materially important unknown 必须 NEEDS_FACT，不能靠缺字段让 AI 猜；
- Hard Constraints / locked / must-go 不允许因 Token Budget 被删除；
- normal precision 0–9 / fine precision 0–99 必须显式声明；
- Local ID 生命周期限定于 Decision Run；
- Progressive Expansion 由 Gateway 控制并受预算 / 次数限制。

---

# 2. 最新 P0 顺序

下一步建议：

```text
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
      ↓
Fact Freshness / Trace
```

---

# 3. P0-8 AI Decision / Patch 下一设计重点

需要冻结：

```text
AiDecisionResponseV1
DecisionStatus
selectedIds
orderedIds
backupIds
reasonCodes
confidence / uncertainty
needsMoreContext
abstain
noValidChoice
compactOps
```

必须解决：

- AI 只能引用当前 Run Local ID；
- unknown / duplicate / non-candidate ID 必须拒绝；
- AI 不得直接写 Canonical Trip；
- AI 不得写 POI / Region Master；
- `needs_more_context` 的合法请求类型必须与 AI Compact Context 对齐；
- `abstain / no_valid_choice / insufficient_context` 的区别；
- ReasonCode Codebook；
- Compact Operation（ADD / DEL / MOVE / REPLACE 等）如何映射为 Domain Proposal；
- Domain Proposal 如何进入 Engine Revalidate；
- Engine Revalidate 通过后才能进入 ChangeSet Builder；
- 输出 Schema 错误、非法 ID、超范围操作、Provider/Fact 幻觉时的 fail-safe；
- AI retry 是否允许、最大次数由 Config 而非业务常量控制。

推荐文件：

`docs/architecture/ai-decision-contract-v1.md`

---

# 4. Pilot 后再冻结

继续保持 Config / Pilot：

```text
每 Task maxInputTokens
reservedOutputTokens
maxCandidates
maxExpansionRounds
normal → fine precision threshold
模型路由阈值
具体 Serializer / shortened key 格式
AI retry count
Decision confidence threshold
ReasonCode 展示优先级
```

这些不得提前变成永久业务常量。
