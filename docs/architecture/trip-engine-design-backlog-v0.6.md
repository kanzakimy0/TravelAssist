# TravelAssist Trip Engine 设计待办清单 v0.6

> 日期：2026-09-10  
> 状态：Planning / Design Backlog  
> Supersedes：`trip-engine-design-backlog-v0.5.md` 的优先顺序  
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
```

AI 输出侧已明确：

```text
AiDecisionResponseV1
Decision / Need More Context / No Valid Choice / Abstain
Choice / Ordering / Compact Patch / Semantic Preference
Local-ID only
ReasonCode / UncertaintyCode
Output Validation
Domain Proposal
Engine Revalidate
ChangeSet Builder
```

关键边界：

- AI Compact Op ≠ WBS 4.20 EngineOperation；
- AI 不直接生成 Canonical PlanItem / Schedule / Place；
- AI 不写 booking / payment / system lock / revision；
- AI 不自报权限；
- AI 输出先解析、Schema、Local ID、Scope、Task、Candidate membership 验证；
- Domain Proposal 仍必须重新验证最新 Trip / Fact / Route / Feasibility；
- 只有通过后才能进入 ChangeSet Builder 与 Trip Mutation Engine。

---

# 2. 最新 P0 顺序

下一步建议：

```text
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
AI Decision / Patch
      ↓
Replanning
      ↓
Fact Freshness / Trace
```

---

# 3. P0-9 Replanning Contract 下一设计重点

需要冻结：

```text
Trip Runtime State
Completed
InProgress
Locked
BookingProtected
FutureMutable
Cancelled / Skipped

Replan Trigger
Replan Scope
Protection Boundary
Affected Range
Repair Strategy
AI Call Boundary
ChangeSet Handoff
Companion Sync
```

至少覆盖：

- 天气变化；
- 交通延误 / 停运；
- POI 临时关闭；
- 用户临时说“今天累了”；
- 用户主动删 / 加景点；
- 预约 / 付款 / 锁定项目保护；
- 当前进行中项目如何处理；
- 已完成项目永远不可被规划器重写；
- 只重算真正受影响的范围；
- rest-of-timeslot / rest-of-day / next-N-days / remaining-trip 分级 Scope；
- deterministic repair 优先，AI 只处理多个合法修复方案之间的软选择；
- 新 Proposal 必须经过 Itinerary Feasibility + Engine Revalidate + ChangeSet；
- 多设备 / 同行人状态同步与 revision 冲突不能靠 AI 解决。

推荐文件：

`docs/architecture/replanning-contract-v0.1.md`

---

# 4. Pilot 后再冻结

继续保持 Config / Pilot：

```text
AI retry count
confidence threshold
maxExpansionRounds
replan lookahead days
fatigue threshold
repair search width
candidate count
soft-score thresholds
model routing threshold
ReasonCode UI priority
```

这些不得提前变成永久业务常量。
