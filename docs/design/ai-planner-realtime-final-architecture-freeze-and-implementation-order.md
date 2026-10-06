# TravelAssist — AI / Planner / Realtime Final Architecture Freeze & Implementation Order

> 状态：FINAL ARCHITECTURE FREEZE v1  
> 范围：TravelAssist 主系统 AI、Planner、Realtime Assistant、POI/43D、Data、Action、Execution、Event、Observability 与安全基础设施  
> 目标：作为后续 Task、实现、验收、Benchmark、发布与事故处理的统一上位设计。

---

# 1. 最终系统主链

```text
Data Sources
↓
Data Governance
↓
Canonical Data
↓
Data Serving Bundle
↓
Candidate Retrieval
↓
Recommendation / 43D
↓
Planner Optimization
↓
Planner Validator
↓
Candidate Ranking
↓
Trade-off / Explanation
↓
Trip Change Set
↓
Action Router
↓
Permission
↓
Confirmation
↓
Execution Adapter
↓
Transaction / Saga / Compensation
↓
Trip Version / Booking / Order
↓
Outbox / Event Bus
↓
Realtime State
↓
Impact Analysis / Replan
↓
Notification / AI Conversation
```

外围治理：

```text
Benchmark / Regression
Experiment / Shadow / Rollout
Observability / SLO / Incident
Security / Privacy
Backup / Disaster Recovery
API / Schema Compatibility
```

---

# 2. Source of Truth 最终冻结

| Domain | Source of Truth |
|---|---|
| POI Identity | Canonical POI Registry |
| 43D | Approved Versioned 43D Dataset |
| Duration | Approved POI Duration Dataset |
| Opening Hours | Canonical governed field + exceptions |
| Route | Route/Transport Engine Snapshot |
| Weather | Weather Provider Snapshot |
| Trip | Versioned Trip Aggregate |
| Realtime Progress | Realtime Trip State Engine |
| Booking | Provider + verified TravelAssist mirror |
| Payment | Payment Provider |
| User Preference | Structured confirmed preference store |
| Permission | Server-side IAM / membership / grant |
| AI Conversation | Conversation Service |
| Search | NOT source of truth |
| Cache | NOT source of truth |
| AI text | NOT source of truth |

---

# 3. AI 最终边界

AI 负责：

```text
intent understanding
coordination
tool selection
proposal generation
trade-off explanation
translation
conversation
```

AI 不负责：

```text
inventing facts
calculating exact route time
deciding permissions
direct Trip mutation
payment
booking state truth
bypassing validator
production rollback decisions
```

---

# 4. Planner 最终边界

Planner 负责：

```text
constraint construction
schedule construction
candidate generation
optimization
replan
```

Validator 负责：

```text
feasibility
hard constraints
minimum duration
reservation
opening
transfer
overlap
```

Ranking 负责：

```text
valid candidates comparison
preference / walking / fatigue / cost / stability trade-off
```

这三层不得合并成一个黑箱 LLM。

---

# 5. 数据链最终边界

```text
Raw
↓
Normalized
↓
Candidate Facts
↓
Canonical
↓
Data Bundle
↓
Serving Bundle
↓
Cache / View / Search
```

关键规则：

- Unknown ≠ 0
- Stale ≠ Current
- Cached ≠ Live
- Search ≠ Canonical
- AI-generated ≠ Authoritative
- Dataset 生产发布必须可 rollback

---

# 6. 10 万 POI 处理链

```text
100k POIs
↓
Geo / Time / Hard Filter
↓
Multi-lane Retrieval
↓
100~1000 Raw Candidates
↓
Cheap Pre-score
↓
50~150 Deep Candidates
↓
43D / Recommendation
↓
20~80 Planner Candidates
↓
Constraint Solver
↓
Valid Plans
↓
Ranking
↓
1 Preferred + ≤2 Alternatives
```

具体数值为配置，不是永久常量。

---

# 7. Route 最终策略

禁止全国 POI 两两预生成 O(N²) 路线。

采用：

```text
Region Graph
+
Transit Hubs
+
Cheap Geo Estimate
+
On-demand Route
+
Versioned Cache
+
Realtime Overlay
```

---

# 8. Trip 最终写入链

```text
AI / Planner
↓
Proposal
↓
Change Set(base_version)
↓
Validator
↓
User Confirmation
↓
Action Batch
↓
Transaction
↓
Trip Version +1
↓
Audit + Outbox
```

任何客户端、AI、Planner 都不得直接覆盖 Trip JSON。

---

# 9. Realtime 最终链

```text
Location / Time / Weather / Transport / Booking Event
↓
Realtime Trip State
↓
Arrival / Delay / Risk
↓
Event Bus
↓
Realtime Trigger
↓
Impact Analysis
↓
Replan Policy
↓
Planner
↓
Change Set
↓
Action Router
```

Rule 能解决的优先 Rule，不无意义调用 AI。

---

# 10. 到达与迟到

GPS 单点不是 Arrival。

Arrival：

```text
geofence
+ accuracy
+ freshness
+ dwell
+ motion
+ schedule context
```

Delay / ETA 由确定性 Engine 计算，不由 LLM 猜。

---

# 11. Replan Policy

从最小修改开始：

```text
none
↓
micro
↓
local
↓
day
↓
multi_day
```

只有当前级别无法满足 Hard Constraints 时才升级。

---

# 12. Change Set

Change Set 是 Realtime/Planner 与 Action Router 之间的正式合同。

必须包含：

```text
baseTripVersion
baseRealtimeStateVersion
operations
risk
impact
validation
hash
expiry
```

---

# 13. Action / Execution 最终链

```text
Action Request
↓
Permission
↓
Risk
↓
Confirmation
↓
Idempotency
↓
Execution Coordinator
↓
Adapter
↓
Postcondition
↓
Transaction or Saga
↓
Compensation / Reconciliation
↓
Audit
```

---

# 14. 外部副作用

以下必须进入 Action / Execution：

```text
Trip mutation
Booking create/modify/cancel
External message
Sharing permission
Payment handoff
Long-term preference update
```

---

# 15. Transaction vs Saga

同数据库内部：

```text
ACID Transaction
```

跨 Provider：

```text
Saga + Compensation + Reconciliation
```

不假装存在跨系统 Rollback。

---

# 16. Event 架构

```text
Domain Mutation
↓
Transactional Outbox
↓
Event Bus
↓
Inbox / Idempotent Consumer
↓
Worker
```

默认 delivery：

```text
at-least-once
```

因此 Consumer 必须幂等。

---

# 17. Notification

```text
Notification Intent
↓
Notification Record
↓
Delivery
```

Push 不是业务事实源。

重要实时事件：

```text
Push / In-app
+
Conversation Message
```

---

# 18. Version 系统

生产行为必须可以解析到：

```text
Planner Release Bundle
Data Bundle
Data Serving Bundle
Prompt Version
Toolset Version
Trip Version
Realtime State Version
Schema Version
```

---

# 19. Benchmark / Release

```text
Implementation
↓
Smoke/Core/Golden Benchmark
↓
Regression Gate
↓
Release Bundle
↓
Shadow
↓
Internal
↓
Progressive Rollout
↓
Approved Baseline
```

---

# 20. Rollout

默认：

```text
Shadow
Internal
1%
5%
10%
25%
50%
100%
```

Correctness Guardrail 优先于所有体验提升。

---

# 21. Observability

统一：

```text
Metrics
Logs
Traces
Domain Events
Audit
```

其中 Audit 与 Observability 分工：

```text
Audit = 谁做了什么业务动作
Observability = 系统运行得怎么样
```

---

# 22. Incident

```text
Alert
↓
P1/P2/P3/P4
↓
Incident
↓
Runbook
↓
Mitigation / Rollback / Degrade
↓
Recovery
↓
Postmortem
↓
Tracked Engineering Actions
```

---

# 23. Security

最终安全原则：

- server-side authorization
- least privilege
- secrets never in client/prompt/log
- Prompt Injection 不可改变 Tool/Action Policy
- precise location 独立授权
- booking/payment data 最小暴露
- webhook signature + replay protection
- high-risk feature kill switch
- object-level authorization

---

# 24. Backup / DR

核心保护：

```text
Trip
User/Permission
Booking/Order
Action/Audit
Payment Reference
Config/Baseline
```

Cache / View / Search 作为可重建副本。

备份必须周期 Restore Test。

---

# 25. API / Contract

所有跨边界数据必须：

```text
schema
version
unit
time semantics
error contract
idempotency
compatibility window
```

禁止未版本化“临时 JSON”成为长期系统接口。

---

# 26. v1 实施阶段

## Phase 1 — 数据与 Trip 基础

优先：

```text
Canonical POI / 43D / Duration
Data Version / Manifest
Trip Aggregate / Version
Planner Serving DTO
Route Snapshot Contract
```

## Phase 2 — Planner Core

```text
Candidate Retrieval
Constraint Builder
Anchor-first Schedule
Search / Optimization
Validator
Ranking
Change Set
Benchmark Smoke
```

## Phase 3 — AI Core

```text
Conversation
Prompt Registry
AI API Layer
Context Builder
Orchestrator
Tool Router
Structured Message
```

## Phase 4 — Safe Write

```text
Action Router
Permission
Confirmation
Execution
Idempotency
Audit
Outbox
```

## Phase 5 — Realtime

```text
Event Bus
Workers
Realtime Trip State
Delay / Arrival
Impact Analysis
Replan Policy
Notification
```

## Phase 6 — Production Governance

```text
Benchmark Core/Golden
Shadow
Feature Flags
Rollout
Observability
SLO
Incident
Backup/Restore
```

---

# 27. 不建议一开始实现的内容

暂缓到系统稳定后：

```text
Kafka / huge distributed architecture
multi-region active-active
full learned ranking
advanced semantic vector retrieval
group realtime location fusion
automatic 100% promotion
complex multi-day autonomous booking mutation
```

先把确定性核心做稳。

---

# 28. v1 Definition of Done

整个 AI / Planner v1 只有同时满足以下才算完成：

### Data

- POI canonical identity 稳定
- 43维 approved version
- Duration approved version
- Data Bundle 可追踪
- Serving Bundle 可读取

### Planner

- Candidate Retrieval 可处理目标数据规模
- Hard Constraints 生效
- Minimum Duration 生效
- Route 可验证
- Validator 独立
- Ranking 独立
- No-solution 正确
- Change Set 可生成

### AI

- Conversation 持久化
- Prompt 有版本
- Context Builder
- Tool Router
- AI 不直接写 Trip

### Action

- Permission
- Confirmation
- Idempotency
- Trip transaction
- Audit

### Realtime

- Event Bus
- Worker
- Arrival/Delay 基础
- Replan local/day
- Notification

### Quality

- Smoke Benchmark
- Core Benchmark
- Hard Gate CI
- Trace / Metrics
- Rollback

### Security / Recovery

- secrets safe
- resource permission
- location consent
- backup
- restore test

---

# 29. 设计冻结后的变更规则

以下属于架构级变更：

- 修改 Source of Truth
- 绕过 Validator
- 允许 AI 直接 Mutation
- 删除 Trip Version
- 改变 Permission/Confirmation 边界
- Search/Cache 成为业务事实源
- 取消 Data/Planner Versioning
- 取消 Idempotency / Audit

这些必须更新对应设计书并进行 Architecture Review。

普通实现细节不需要反复修改上位设计。

---

# 30. 最终模块目录建议

```text
src/
  server/
    ai/
    planner/
    recommendation/
    data-serving/
    search/
    routing/
    trips/
    actions/
    execution/
    events/
    realtime/
    notifications/
    observability/
    security/
```

文档：

```text
docs/design/
docs/tasks/
docs/results/
docs/runbooks/
docs/benchmarks/
```

---

# 31. 最终设计结论

TravelAssist 不应被实现为：

```text
User
→ LLM
→ 一段旅游建议
```

而应实现为：

```text
Versioned Trusted Data
        ↓
Deterministic Retrieval / Routing / Constraints
        ↓
Planner Optimization
        ↓
Validator
        ↓
Ranking
        ↓
AI Coordination & Explanation
        ↓
Safe Action / Execution
        ↓
Realtime Event Loop
        ↓
Measured Production System
```

AI 是系统的智能协调层。

Planner 是确定性/可验证的旅行计划核心。

Data 是事实基础。

Action / Execution 是安全边界。

Realtime 是持续适应能力。

Benchmark / Observability / Rollback 是生产可信度。

---

# 32. FINAL FREEZE

截至本设计，TravelAssist 主系统 AI / Planner / Realtime 架构已形成完整闭环。

后续重点应从“继续增加上位设计”转向：

```text
1. 对照现有仓库做 Gap Audit
2. 将 Phase 1~6 映射到 WBS
3. 拆成可并行 TASK
4. 实现
5. Benchmark
6. 验收
7. Progressive Rollout
```

除非出现新的产品范围或核心约束，不再建议继续无限新增基础架构层。
