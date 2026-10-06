# TravelAssist Trip Engine 设计待办清单 v0.7

> 日期：2026-09-10  
> 状态：Planning / Design Backlog  
> Supersedes：`trip-engine-design-backlog-v0.6.md` 的优先顺序  
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

P0-8 AI Decision / Patch Contract V1
→ ai-decision-contract-v1.md

P0-9 Replanning Contract
→ replanning-contract-v0.1.md
```

Replanning 已明确：

```text
Runtime Overlay
≠ Canonical Trip Plan

Trigger
↓
Impact Analysis
↓
Earliest Mutable Boundary
↓
Minimal Scope
↓
Deterministic Repair
↓ if needed
AI Soft Choice
↓
Engine Revalidate
↓
ChangeSet
```

关键规则：

- COMPLETED item 不被普通 Replanning 改写；
- IN_PROGRESS item 默认保护；
- execution state 与 lock / booking / payment / must-go 分开计算；
- 只重算真正 affected 的未来范围；
- buffer / free time 先吸收 schedule drift；
- actual Visit Load / route walking / rest recovery 参与实时 fatigue；
- deterministic repair 优先，AI 只在多个合法修复方案间软选择；
- Replan Proposal 同时绑定 trip / plan / runtime revision；
- Booking / Payment 外部修改不走普通 Replan 自动执行；
- 多设备 / 同行人冲突不能 last-write-wins；
- 最终仍通过 WBS 4.20 ChangeSet / validate / preview / apply。

---

# 2. 最新 P0 顺序

剩余：

```text
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
AI Decision / Patch
      ↓
Replanning
      ↓
Fact Freshness / Provenance
      ↓
Decision Trace / Telemetry
```

---

# 3. P0-10 Fact Freshness / Provenance 下一设计重点

需要冻结：

```text
FactRef
FactKind
Source / Authority
observedAt
validFrom
validUntil / expiresAt
confidence
freshnessState
fallbackPolicy
```

至少覆盖：

- POI opening / closure；
- Route / Transit；
- Weather；
- Booking / External Order；
- Price / availability；
- POI Master static facts；
- Region / TravelEdge planning prior；
- stale / expired / unknown / conflicting fact 的统一语义；
- 哪些事实可以缓存、缓存到什么边界；
- Provider unavailable 时允许使用哪些 planning prior；
- Planning Prior 永远不能冒充 Live Fact；
- AI Context 必须能追溯到哪个 normalized fact snapshot；
- Replanning 发生时哪些 fact 必须重新拉取；
- Fact conflict 的 authority + freshness + scope 解决原则。

推荐文件：

`docs/architecture/planning-fact-freshness-policy-v0.1.md`

---

# 4. P0-11 Decision Trace / Explainability / Cost Telemetry

P0-10 完成后继续冻结：

```text
trigger / request
input context version
preference snapshot ref
candidate counts
rejection reasons
score breakdown
fact refs
AI used / model class
input / output tokens
latency
provider calls
replan scope
repair candidates
final decision
ChangeSet ref
```

用于：

- 为什么推荐 / 没推荐；
- 为什么发生 Replan；
- 为什么某项被保护未修改；
- 43维评分校准；
- Engine vs Engine+AI 比较；
- Token / Provider 成本控制；
- A/B Test。

---

# 5. Pilot 后再冻结

继续保持 Config / Pilot：

```text
fact TTL 数值
replan lookahead days
fatigue threshold
repair search width
AI retry count
confidence threshold
maxExpansionRounds
candidate count
soft-score thresholds
model routing threshold
ReasonCode UI priority
```

这些不得提前变成永久业务常量。
