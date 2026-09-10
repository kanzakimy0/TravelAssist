# TravelAssist Candidate Pipeline Contract v0.1

> 日期：2026-09-10  
> 状态：Freeze Candidate / 待 Consumer Review  
> 分支：`design/a-trip-engine-poi-ai-architecture-v2`  
> 关联设计：`preference-state-v0.1.md`、`poi-scoring-spec-v0.2.md`、`poi-master-schema-v0.2.md`、`itinerary-feasibility-spec-v0.1.md`、`travel-region-graph-codebook-v0.1.md`、`route-contract.md`  
> 本文件冻结候选范围：Region / Corridor / POI Candidate 的阶段边界、Candidate 身份、Hard Filter、Score / Route / Feasibility、Pareto、Diversity、Top-N、Fallback、AI 交接与淘汰原因。  
> 本文件不冻结最终候选数量、分数权重、Pareto 保留数、Detour Budget、Diversity 配额或 AI Token Budget；这些由 Config + Pilot 校准。

---

# 1. 核心结论

TravelAssist 不应从 15,000+ POI 直接排序后取前 10，也不应让 AI承担第一轮筛选。

标准候选漏斗：

```text
Trip Request / Effective Preference / Context
                    ↓
             Region Candidate
                    ↓
            Corridor Candidate
                    ↓
              POI Expansion
                    ↓
              Hard Filter
                    ↓
              POI Scoring
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
                    ↓
              Trip Proposal
```

核心原则：

> **Hard Filter 决定“不能去什么”；Scoring 决定“更适合什么”；Feasibility 决定“现在能不能合理安排”；Pareto / Diversity 决定“哪些候选值得继续保留”；AI 只在少量已验证候选中做高阶软选择。**

---

# 2. 两条 Pipeline：Macro 与 Daily

Candidate Pipeline 分两层运行，不应把“去哪几个地区”和“某天下午去哪个景点”混成一次巨型搜索。

## 2.1 Macro Pipeline

负责整趟旅行区域结构：

```text
Region Pool
↓
Region Candidate
↓
TravelEdge Search
↓
Corridor Candidate
↓
Macro Feasibility
↓
Pareto / Diversity
↓
Top Corridor
```

典型输出：

```text
A 東京 → 箱根 → 京都 → 大阪
B 東京 → 松本 → 高山 → 金沢 → 大阪
C 東京 → 河口湖 → 京都 → 大阪
```

## 2.2 Daily / POI Pipeline

负责某 Region / District / Day 的具体景点安排：

```text
Selected Corridor / Region
↓
POI Expansion
↓
Hard Filter
↓
POI Scoring
↓
Route Feasibility
↓
Visit / Day Feasibility
↓
Pareto / Diversity
↓
Daily Top-N
```

两层可以共享 Candidate Envelope / Reason Code，但不得把 Macro TravelEdge Prior 当成 POI Live Route Fact。

---

# 3. Candidate 身份

必须区分三种身份：

```text
Domain ID
= Region / POI / Corridor 的领域身份

Candidate ID
= 某一次 Candidate Run 内的临时候选身份

AI Local ID
= 某一次 AI Context 内进一步压缩的临时 ID
```

因此：

```text
POI poi_abc
↓ candidate run R17
candidateId = c42
↓ AI call A5
localAiId = 3
```

规则：

- `domainRef` 稳定；
- `candidateId` 仅在一个 Candidate Run 内稳定；
- `localAiId` 仅在一个 AI 调用 Context 内稳定；
- Candidate ID / AI Local ID 不得写回 POI Master；
- Array index 不得作为稳定 Candidate ID。

---

# 4. Candidate Run Envelope

每次候选计算建议拥有独立 Run：

```ts
type CandidateRunV1 = {
  runId: string
  pipelineVersion: "1.0"
  configVersion: string

  tripRef: string | null
  preferenceSnapshotRef: string
  contextSnapshotRef: string
  graphVersion: string
  poiFeatureVersion: string

  scope: "macro" | "region" | "day" | "timeslot" | "replan"

  countsByStage: Record<string, number>
  startedAt: Instant
  completedAt: Instant | null
}
```

目的：

- 可重现；
- 可比较不同 Config；
- 可统计候选漏斗；
- 可解释“为什么某 POI 消失”；
- 可做 Engine-only vs Engine+AI Pilot。

---

# 5. Candidate Envelope

候选对象不应只有一个裸分数。

建议逻辑结构：

```ts
type CandidateV1 = {
  candidateId: string
  domainRef: string
  candidateKind: "region" | "corridor" | "poi"

  stage: CandidateStage
  status: CandidateStatus

  anchor: CandidateAnchor | null

  scores: {
    matchScore: number | null
    partyFit: number | null
    seasonFit: number | null
    weatherFit: number | null
    dayFit: number | null
    routeFit: number | null
    currentSuitability: number | null
  }

  evidenceCoverage: number | null
  scoreConfidence: number | null

  feasibility: {
    constraint: "pass" | "reject" | "needs_fact" | null
    route: "pass" | "warning" | "critical" | "needs_fact" | null
    itinerary: "pass" | "warning" | "critical" | "needs_fact" | null
  }

  reasons: CandidateReason[]
  parentCandidateIds: string[]
}
```

不要求数据库按此 JSON 物理存储；这是领域契约候选。

---

# 6. Candidate Stage

建议阶段码：

```text
region_pool
region_scored
corridor_generated
corridor_validated
poi_expanded
hard_filtered
scored
route_checked
itinerary_checked
pareto_survivor
diversity_survivor
top_n
ai_shortlist
selected
backup
```

Stage 是处理位置，不等于最终状态。

---

# 7. Candidate Status

建议状态：

```text
active
selected
backup
rejected
needs_fact
dominated
pruned_by_budget
pruned_by_diversity
pruned_by_limit
```

规则：

- `rejected` 只用于确定性不可接受；
- `needs_fact` 不得偷偷变成 rejected 或 pass；
- `dominated` 表示 Pareto 明显被其他候选支配；
- `pruned_by_limit` 只是计算预算裁剪，不代表候选本身不好；
- 所有非 active 状态必须保留 reason。

---

# 8. Anchor / 用户点名边界

用户明确提到的地点不能和普通候选完全一样处理。

建议：

```text
must_go
want_go
prefer
avoid
must_avoid
```

## must_go

用户明确表示“必须去”。

规则：

- 必须进入 Candidate Set；
- 不允许因为排名低被 Top-N 裁掉；
- 仍必须经过 Hard Constraint / Route / Itinerary Feasibility；
- 若客观不可执行，应返回冲突，不得伪造可行方案。

## want_go / prefer

软锚点：

- 给予候选保留优先度；
- 仍可因明显不可行或与更高优先约束冲突而不选；
- 不自动变成高 matchScore，避免污染算法解释。

## avoid / must_avoid

- `avoid` 是强负偏好 / soft exclusion；
- `must_avoid` 进入 Hard Constraint。

> Anchor 是候选策略，不应偷偷改写 POI Master Feature。

---

# 9. Stage A — Region Candidate

输入：

```text
Trip destination facts
arrival / departure anchors
Trip duration
Effective Preference
Trip Style
Region Graph
must-go Region / POI anchors
```

处理：

- 初始目的地区域；
- 相邻 / TravelEdge 可达 Region；
- 目的地锚点所属 Region；
- Region 推荐停留范围；
- 行程天数；
- 旅行风格 / Detour Budget；
- 基础 season / party fit。

输出：

```text
RegionCandidate[]
```

Region Candidate 不能因为当前没有图片而被淘汰；素材覆盖不属于旅行价值 Hard Filter。

---

# 10. Stage B — Corridor Candidate

从 Region Candidate + TravelEdge 生成 Macro Corridor。

至少记录：

```text
orderedRegionRefs
edgeRefs
stayPlanPrior
estimatedTravelBurden
hotelChangeCount
luggageBurden
macroCompatibility
```

生成算法可为：

```text
Beam Search
A*
Yen K-shortest
Dynamic Programming
```

算法实现不在本 Contract 冻结。

必须保留：

- Corridor 来源；
- Parent Region Candidates；
- 使用的 Graph Version；
- Detour / TravelEdge Prior；
- 被剪枝原因。

---

# 11. Stage C — POI Expansion

选择 Region / District 后，从 POI Master 扩展相关 POI。

来源至少可包含：

```text
primary Region relation
secondary Region relation
District relation
explicit anchor
nearby / corridor-side candidate
```

禁止：

- 直接把 15,000 全部送 AI；
- 因 POI 没有图片就删除；
- 使用 Asset Slot ID 替代 POI Domain ID。

POI Expansion 的目标是建立“有机会进入当前 Day / Region”的候选池，不在此阶段做最终顺序。

---

# 12. Stage D — Hard Filter

Hard Filter 只处理明确不可执行 / 明确禁止条件。

典型：

```text
lifecycle permanently_closed
must_avoid
已知闭馆 / 休息日
年龄硬限制
必须轮椅可达但已确认不可达
固定预约时间冲突
目标日期完全不开放
明确无法进入所需时间窗
```

返回：

```text
PASS
REJECT
NEEDS_FACT
```

规则：

- unknown 关键事实 → `NEEDS_FACT`；
- 不得因为 `matchScore` 低而 Hard Reject；
- 不得因为拥挤高而 Hard Reject，除非用户明确把它设为硬限制；
- AI 不得恢复 `REJECT` 候选。

---

# 13. Stage E — Soft Scoring

通过 Hard Filter 的候选进入 `poi-scoring-spec-v0.2`。

输出保留：

```text
matchScore
partyFit
seasonFit
weatherFit
currentSuitability
coverage
confidence
scoreBreakdown
```

注意：

- `walking / physical` 在此阶段只用于标准游览负担与用户容忍的先验匹配；
- 实际 Visit Load 必须到 Itinerary Feasibility 结合 Duration / Visit Mode 再算；
- 不能把当前 Live Route 重复加入 matchScore。

本阶段不要求生成一个全局永久 `overallScore`。

---

# 14. Stage F — Route Feasibility

为了控制 Provider 成本，路线检查允许两级：

## 14.1 Planning Prior Check

先使用：

```text
Region / District geometry
TravelEdge Prior
nearest station / access prior
approximate distance
```

只用于大规模早期淘汰明显不合理的候选。

它不能作为最终可执行路线证据。

## 14.2 Canonical Route Check

对缩小后的候选调用 Route Provider：

```text
Provider
↓
Provider Adapter
↓
Canonical Route Contract
↓
routeFit / Transition Feasibility
```

进入最终 Day / Trip Proposal 的移动必须以允许的实时 / 日期相关 Route Fact 验证。

因此：

> 省 API 调用可以延迟 Live Route 查询，但不能用 Planning Prior 冒充最终 Route。

---

# 15. Stage G — Itinerary Feasibility

候选准备进入某个 Day / Timeslot 时，使用：

`itinerary-feasibility-spec-v0.1.md`

检查：

```text
Visit Mode
planned duration
minimum / recommended duration
opening / last entry
transition time
planning buffer
visitWalkingLoad
visitPhysicalLoad
day accumulated fatigue
meal / hotel / booking anchors
```

可能结果：

```text
PASS
WARNING
CRITICAL
NEEDS_FACT
```

`CRITICAL` 不进入正式 Top-N 可执行集合，除非 Deterministic Repair 成功后重新验证。

---

# 16. Stage H — Pareto Pruning

不要把所有指标先强行压成一个总分再排序。

候选可在以下向量空间比较：

```text
preference value
current suitability
route burden
time cost
money cost
fatigue load
risk
unique / iconic value
```

若候选 B 在当前任务关心的主要指标上都不优于 A，并且至少一项明显更差，则 B 可标为：

```text
dominated
```

并从 AI Shortlist 移除。

规则：

- Pareto 维度由 Task / Config 决定；
- must-go anchor 不因 Pareto 被删除；
- 明显不同类别 / 体验不可轻易互相判 dominance；
- Dominance Decision 必须可追踪具体 competitorCandidateId。

---

# 17. Stage I — Diversity Guard

如果只按综合得分取前 N，很容易得到：

```text
寺庙
寺庙
寺庙
寺庙
寺庙
```

或者全部集中在同一个热门小区域。

Diversity Guard 可以考虑：

```text
POI category
experience type
region / district
iconic vs hidden
indoor vs outdoor
activity intensity
meal / rest / active balance
```

原则：

- Diversity 是候选组合质量约束，不篡改 POI 原始 matchScore；
- 不为“多样性”强塞明显不合适的低质量 POI；
- must-go / booking anchor 优先于普通 Diversity；
- 不应硬编码“经典必须 30%”之类永久比例；比例由 Trip Style Config / Pilot 调整。

---

# 18. Popularity / Iconic Bias 防护

热门 POI 往往同时具有：

```text
iconic 高
资料 coverage 高
图片多
Provider 信息完整
```

如果直接排序，长尾 POI 容易系统性吃亏。

因此 Candidate Pipeline 必须区分：

```text
POI experience score
vs
Evidence coverage / confidence
```

Coverage 高只代表“更确定”，不能直接等价于“更值得去”。

建议策略：

- unknown 使用 coverage shrink-to-neutral；
- hidden / unique / local 作为独立体验 signal；
- Diversity Guard 保留合理的小众候选空间；
- 不因为社交曝光 / 图片数量直接加 POI 价值分；
- 用户首次日本旅行的经典锚点比例由 Trip Style Config 决定，不写死。

---

# 19. Stage J — Top-N

Top-N 是“进入下一昂贵阶段的计算预算”，不是产品价值真理。

Top-N 数量必须来自 Config：

```text
regionTopN
corridorTopN
routeCheckTopN
itineraryCheckTopN
aiTopN
backupTopN
```

不得把具体数字写死进领域逻辑。

示例漏斗仅用于理解：

```text
15,000 POI
↓ region relevant
~2,000
↓ hard / date / lifecycle
~1,500
↓ preference / context
~300–500
↓ route feasible
~40–80
↓ Pareto + Diversity
~8–20
↓ AI task projection
~5–10
```

这些数字是示意，不是 v0.1 Frozen Threshold。

---

# 20. AI 交接

AI 只接收：

```text
Top-N survivor
+ Task-specific Projection
+ Local AI ID
+ compact score / reason / constraints
```

AI 不接收：

- 15,000 POI 全库；
- Hard Reject 候选；
- Provider Raw JSON；
- 无关 Region Graph；
- 完整数据库内部 ID 字典。

AI 可以：

- 在 Pareto survivors 中做语义偏好权衡；
- 选主选 / 备选；
- 对接近候选进行高阶软判断；
- 返回 `need_more_context`。

AI 不可以：

- 恢复 `REJECT`；
- 绕过 booking / hard constraint；
- 直接写 Canonical Trip；
- 通过自然语言理由伪造 route / opening / price fact。

AI 输出完成后必须：

```text
AI Output Adapter
↓
Domain Proposal
↓
Route / Itinerary / Constraint Revalidate
↓
Trip Proposal
```

---

# 21. Fallback / 候选不足

候选不足时必须按可控层级放宽，不能直接违反硬约束。

建议顺序：

```text
1. 补查询关键 NEEDS_FACT
2. 放宽 Soft Score threshold
3. 放宽 Diversity requirement
4. 扩大 District / Nearby Region
5. 在 Trip Style 允许范围内扩大 Detour Budget
6. 扩大 Visit Mode（例如 full → quick）但重新做 Duration / Load Feasibility
7. 增加 lower-confidence candidate，但明确 coverage / confidence
8. 仍不足 → 返回 insufficient_candidates
```

永远不得自动放宽：

```text
must_avoid
booking / payment protection
age hard restriction
accessibility hard need
closed fact
不可达的固定时间窗
用户明确 must-go 的冲突事实
```

如果 must-go 本身不可行，应返回冲突让用户调整，而不是偷偷删除 must-go。

---

# 22. Deterministic Repair 与 Candidate Pipeline

如果候选本身好，但当前安排失败：

```text
DURATION_TOO_SHORT
TRANSITION_TOO_SHORT
DAY_OVERLOADED
```

优先尝试确定性 Repair：

```text
延长 duration
移动开始时间
重新排序
替换 Visit Mode
移除更低优先级 soft candidate
增加 rest / buffer
```

Repair 后重新进入：

```text
Route / Itinerary Feasibility
```

只有多个合法修复方案存在且涉及复杂软取舍时，再调用 AI。

---

# 23. Rejection / Pruning Reason Codebook

至少冻结以下大类：

## Hard / Fact

```text
LIFECYCLE_CLOSED
HARD_AVOID
OPENING_HOURS_CONFLICT
LAST_ENTRY_CONFLICT
AGE_RESTRICTION
ACCESSIBILITY_CONFLICT
BOOKING_CONFLICT
FIXED_WINDOW_CONFLICT
```

## Missing Fact

```text
MISSING_OPENING_FACT
MISSING_ACCESSIBILITY_FACT
MISSING_ROUTE_FACT
MISSING_PRICE_FACT
```

## Route / Schedule

```text
ROUTE_INFEASIBLE
ROUTE_TOO_BURDENSOME
DURATION_TOO_SHORT
TRANSITION_TOO_SHORT
DAY_OVERLOADED
FATIGUE_OVERLOAD
```

## Optimization Prune

```text
PARETO_DOMINATED
DIVERSITY_PRUNED
COMPUTE_BUDGET_PRUNED
TOP_N_LIMIT
LOW_SOFT_FIT
```

每个 Reason 至少记录：

```text
code
stage
severity
subjectRef
relatedCandidateRef | null
factRefs[]
```

用户可读解释由 UI Template / Explanation AI 生成，领域层保存稳定 Reason Code。

---

# 24. Candidate Trace

每个 Run 至少应能回答：

```text
初始多少 Region / POI？
每一阶段剩多少？
为什么被淘汰？
哪些是 Hard Reject？
哪些只是被 Top-N 裁掉？
谁被谁 Pareto 支配？
是否调用了 Live Route？
是否调用 AI？
最终主选 / 备选是谁？
```

因此建议保存聚合 Trace：

```text
countsByStage
reasonCounts
providerCallCounts
selectedRefs
backupRefs
configVersion
```

详细 telemetry 由后续 `planning-decision-trace-v0.1.md` 冻结。

---

# 25. 版本与可重复性

Candidate Result 必须引用：

```text
pipelineVersion
graphVersion
poiFeatureVersion
scoringConfigVersion
preferenceSnapshotRef
contextSnapshotRef
```

动态 Fact 还需要：

```text
factRefs
observedAt / expiresAt
```

这样才能重现：

> 为什么同一个用户昨天推荐 A，今天改成 B？

---

# 26. 与 Token 优化的关系

Candidate Pipeline 是 AI Token 成本控制的第一道核心机制。

优先顺序：

```text
范围裁剪
↓
Hard Filter
↓
Score / Route / Feasibility
↓
Pareto
↓
Diversity
↓
Top-N
↓
Task Projection
↓
AI Compact Context
```

不要靠：

```text
把 15,000 POI 字段名缩短
```

来解决根本 Token 问题。

真正节省来自：

> **让绝大多数候选永远不进入 AI Context。**

---

# 27. Acceptance Matrix

Freeze 前至少验证：

| 场景 | 期望 |
|---|---|
| must-go 低分但可行 | 不被 Top-N / Pareto 静默删除 |
| must-go 已闭馆 | 返回冲突，不伪造可执行 |
| Hard accessibility unknown | NEEDS_FACT，不假定可达 |
| 高 match 但 route 不可行 | 不进入最终可执行 Top-N |
| walking 高但短 photo_stop 合理 | 使用 Visit Mode / Duration 重新算负荷 |
| 两个候选一个全维更差 | Pareto dominated 可追踪 competitor |
| 前 10 全是寺庙 | Diversity Guard 应保留合理体验多样性 |
| 长尾 POI coverage 低 | 收缩置信，不因数据少直接 99，也不因图片少删除 |
| Route Provider 昂贵 | 允许 Prior 先筛，但最终方案必须 Canonical Route 验证 |
| 候选不足 | 按 fallback 顺序放宽 soft，不放宽 hard |
| AI 选择 hard reject | Output Adapter / Revalidate 拒绝 |
| 用户问为何未推荐 | Trace 可定位 stage + reason code |

---

# 28. 当前不冻结的参数

以下全部属于 Config / Pilot：

```text
Region pool size
Corridor Beam width
各阶段 Top-N
Soft Score threshold
Pareto epsilon
Diversity slot / ratio
Detour Budget
Route live-check budget
Visit Mode fallback threshold
AI Top-N
Backup count
```

不得因为当前示例数字方便就固化到领域 Schema。

---

# 29. 一句话定义

> **Candidate Pipeline 的任务，是在不违反用户硬约束与现实可执行性的前提下，把日本数百个 Region 和 15,000+ POI 逐层压缩为少量高质量、互不冗余、可解释、可验证的候选，再交给 AI 做最后的软偏好选择。**
