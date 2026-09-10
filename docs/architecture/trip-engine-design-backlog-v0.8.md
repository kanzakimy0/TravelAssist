# TravelAssist Trip Engine 设计待办清单 v0.8

> 日期：2026-09-10  
> 状态：Planning / Design Backlog  
> Supersedes：`trip-engine-design-backlog-v0.7.md` 的优先顺序  
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

P0-10 Fact Freshness / Provenance Policy
→ planning-fact-freshness-policy-v0.1.md
```

P0-10 已明确：

```text
Fact ≠ Planning Prior ≠ Inference

Provider / Official / Runtime
↓
Canonical Fact Envelope
↓
Freshness Policy
↓
CURRENT / AGING / STALE / EXPIRED / UNKNOWN
↓
DecisionUse
↓
USE / WARNING / REFRESH / FALLBACK / BLOCK
```

关键规则：

- `observedAt` 不是唯一 freshness 判断依据；同时考虑 target-time applicability、valid window、expiresAt、superseding event、authority、confidence 与 DecisionUse；
- `expiresAt` 表示决策安全期限，不等于现实事实自动反转；
- Event 可在 TTL 到期前直接 invalidate / supersede Fact；
- TravelEdge、Master crowd 等 Prior 永远不冒充 Live Route / Live Crowd；
- stale Route 在 LIVE_EXECUTION 只能 fallback，不得声称具体班次已确认；
- stale Price / Inventory 不得作为当前可购买保证；
- stale Booking Fact 不得解除 Booking / Payment protection；
- temporary closure 可覆盖长期营业 Calendar；closure 过期也不自动推断已经恢复；
- Preview 使用过的动态 Fact 在 Apply 时仍需重新验证；
- AI 不得把 STALE / UNKNOWN 升级成 CURRENT；
- business freshness 与 Provider 允许缓存期限取更严格边界。

---

# 2. P0 最后一项

```text
P0-11 Decision Trace / Explainability / Cost Telemetry
```

完成这一项后，本轮 Trip Planning Engine 的 P0 架构链条基本闭合：

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

# 3. P0-11 下一设计重点

需要冻结：

```text
DecisionRun
Trigger
Scope
Input Versions
Preference Snapshot / Override refs
Runtime revision
Fact refs + freshness
Candidate counts by stage
Rejection reason counts
Score breakdown refs
Pareto / Diversity decisions
Repair attempts
AI usage
Model class
Input / output tokens
Latency
Provider calls
Fallbacks
Final decision
Engine validation
ChangeSet / Preview / Apply refs
```

必须支持回答：

```text
为什么推荐这个 POI？
为什么没有推荐另一个 POI？
为什么这次 Replan 只改下午？
为什么预约项目没被移动？
为什么用了 AI / 为什么没用 AI？
为什么退回 deterministic Engine？
这次请求用了多少 Token / Provider 调用？
某个分数来自哪些 Feature / Fact？
某个 Fact 当时是否 stale？
最终用户采用了哪个 Proposal？
```

同时必须避免：

- 保存模型私有推理链；
- 保存 Provider Raw payload；
- 保存 secrets / booking confirmation code / payment token；
- 把自由文本日志当成唯一审计结构；
- 为了 Telemetry 复制完整 Canonical Trip Snapshot；
- 无界保留高基数原始请求。

推荐文件：

`docs/architecture/planning-decision-trace-v0.1.md`

---

# 4. P0 完成后的下一阶段

P0-11 完成后，不建议立即把所有参数写死。

应进入：

```text
Schema / Validator / Fixtures implementation
↓
100 POI Scoring Pilot
↓
Region Graph Pilot
↓
Itinerary Feasibility Pilot
↓
Candidate + AI Compact / Decision Pilot
↓
Replanning Scenario Pilot
↓
Fact Freshness / Trace QA
↓
参数校准
```

然后再决定哪些 Freeze Candidate 可以升级为 Frozen v1。

---

# 5. Pilot 后再冻结

继续保持 Config / Pilot：

```text
fact TTL 数值
AGING threshold
Provider refresh budget
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
Telemetry retention period
sampling rate
trace detail level
```

这些不得提前变成永久业务常量。
