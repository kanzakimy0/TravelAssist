# TravelAssist POI Scoring / Matching Spec v0.2

> 日期：2026-09-10  
> 状态：Freeze Candidate / 待 Consumer Review  
> 分支：`design/a-trip-engine-poi-ai-architecture-v2`  
> Supersedes：`poi-scoring-spec-v0.1.md`  
> 关联设计：`poi-feature-preference-codebook-v0.1.md`、`preference-state-v0.1.md`、`poi-master-schema-v0.2.md`、`itinerary-feasibility-spec-v0.1.md`  
> 本版主要修正：`walking / physical` 不再被解释为一次游览的固定总疲劳；它们是**标准推荐游览条件下的负担基准摘要**。实际行程负荷必须结合 Visit Mode、实际游览时长、固定负荷、可变负荷、地形、路线步行和当天累计状态动态计算。

---

# 1. 核心结论

TravelAssist 必须区分：

```text
POI Preference Match
≠ Visit Load
≠ Day Fatigue
≠ Route Load
```

标准链路：

```text
POI Facts / POIFeatureV1
        +
Effective Preference
        +
Party / Weather / Season Context
        +
Hard Constraints
        ↓
Constraint Gate
        ↓
POI Preference Matching
        ↓
matchScore / partyFit / seasonFit / weatherFit

POI Visit Facts
        +
Visit Mode
        +
Planned Duration
        ↓
Visit Load Model
        ↓
visitWalkingLoad / visitPhysicalLoad
        +
Day Runtime Load
        +
Route Load
        ↓
dayFit / fatigueRisk
```

核心原则：

> **`walking=7` 表示“以该 POI 的标准推荐游览方式游览时，步行负担基准较高”，不是“无论玩 30 分钟还是 90 分钟，疲劳都等于 7”。**

---

# 2. Score 职责边界

## 2.1 matchScore

回答：

> 这个 POI 本身与用户软偏好有多匹配？

主要读取：

- benefit 类 Feature；
- preference-driven suitability；
- 用户对 walking / physical / crowd / queue 的容忍目标；
- Feature confidence / coverage。

对于 `walking / physical`，matchScore 只使用**标准游览负担基准**判断“这个 POI 平时是否符合用户体力偏好”，不负责实际某次游览的总疲劳。

## 2.2 partyFit / seasonFit / weatherFit

继续独立计算，不将同行人、季节、天气重复写进 matchScore。

## 2.3 dayFit

回答：

> 把这个 Visit Instance 放进当前这一天是否合适？

必须读取：

```text
actual visit duration
visit mode
visitWalkingLoad
visitPhysicalLoad
routeWalkingLoad
routeTransferLoad
current accumulated fatigue
rest recovery
remaining day fatigue budget
```

因此 dayFit 不能只看 POI Master 的 `walking=7`。

## 2.4 routeFit

只描述把 POI 接入当前路线是否合理。

Route 的 walking 与 POI 内部 walking 必须分离：

```text
POI walking
= 游览本体负担

Route walking
= 前后移动负担
```

---

# 3. Hard Constraint Gate

任何软评分之前必须先得到：

```text
PASS
REJECT
NEEDS_FACT
```

例如：

```text
必须轮椅可达 + 已确认不可达
→ REJECT

planned full_visit duration < minimum duration
→ Schedule Feasibility CRITICAL

关键无障碍事实 unknown
→ NEEDS_FACT
```

注意：

> “游览时间太短”属于 Itinerary / Visit Feasibility，不应靠高 matchScore 抵消。

---

# 4. Benefit / Suitability / Risk 基础规则

保留 v0.1 基础方向。

用户 Preference：

```text
p ∈ 1..9
5 = 中性
q = (p - 5) / 4
```

POI Feature：

```text
f ∈ 0..9
x = f / 9
```

Benefit / preference-driven suitability：

```text
contribution = q × x
```

Risk tolerance（例如 crowd / queue）：

```text
t = (p - 1) / 8
r = f / 9
penalty = max(0, r - t)^γ
contribution = -penalty
```

高容忍度只减少 penalty，不主动奖励拥挤或排队。

---

# 5. walking / physical 的新语义

## 5.1 Master Feature 语义

```text
25 walking
= 标准推荐游览模式、推荐时长下的综合步行负担基准摘要

26 physical
= 标准推荐游览模式、推荐时长下的综合体力负担基准摘要
```

它们适合：

- 初筛；
- 用户体力偏好匹配；
- 数据不足时的 Visit Load fallback；
- POI 间快速比较。

它们不等于：

- 实际步行距离；
- 实际游览分钟数；
- 本次 Visit Instance 的总疲劳；
- 当天累计疲劳；
- 路线步行负担。

## 5.2 标准负担匹配

用户 walking tolerance：

```text
t = (p - 1) / 8
```

标准 POI burden：

```text
b = walking / 9
```

标准偏好 penalty：

```text
penalty = max(0, b - t)^γ
```

这里只回答：

> “以正常推荐方式游览这个景点，对该用户来说通常会不会偏累？”

实际安排仍必须再经过 Visit Load 计算。

---

# 6. Visit Instance

任何进入行程的 POI 都应形成一个 Visit Instance：

```ts
type VisitInstanceV1 = {
  poiRef: string
  visitMode: VisitMode
  plannedDurationMin: number
  scheduledStart: Instant | null
  scheduledEnd: Instant | null
}
```

建议 Visit Mode：

```text
full_visit
quick_visit
photo_stop
exterior_only
pass_through
custom
```

不同 Visit Mode 可以有独立：

```text
minimumDuration
recommendedDuration
maxUsefulDuration
load profile
required-path ratio
```

例如某 POI：

```text
full_visit  60 / 90 / 150 min
photo_stop  20 / 30 / 45 min
```

因此：

```text
full_visit + 30min
→ duration infeasible

photo_stop + 30min
→ duration feasible
```

---

# 7. Visit Load Model

实际负荷至少拆成：

```text
Fixed Load
+
Variable Load(duration)
+
Terrain Modifier
+
Standing / Activity Modifier
```

概念公式：

```text
VisitWalkingLoad =
FixedWalkingLoad
+ VariableWalkingLoad × DurationCurve(r)
+ TerrainWalkingModifier

VisitPhysicalLoad =
FixedPhysicalLoad
+ VariablePhysicalLoad × DurationCurve(r)
+ TerrainPhysicalModifier
+ ActivityModifier
```

其中：

```text
r = plannedDuration / recommendedDuration
```

`DurationCurve` 属于 Config / Pilot 校准，不在 v0.2 写死。

## 7.1 为什么需要 Fixed Load

很多 POI 有无法通过缩短停留时间消失的基础成本：

- 从入口到核心区域；
- 坡道；
- 台阶；
- 必走动线；
- 上下山；
- 出入口距离。

因此：

```text
30min visit load ≠ 90min visit load × 1/3
```

短游览仍可能承担较高的固定负荷。

## 7.2 Fallback

如果没有详细 Load Facts，可使用：

```text
walking / physical summary
+
plannedDuration / recommendedDuration
+
conservative fixed-load prior
```

估算。

但必须标记：

```text
loadSource = estimated_from_feature_summary
confidence < detailed_fact_model
```

---

# 8. 清水寺式示例

假设某 POI：

```text
walking = 7
physical = 6
full_visit min = 60
full_visit rec = 90
full_visit max = 150
```

仅为示例，假设 walking 基准中：

```text
40% fixed
60% variable
```

则：

```text
Fixed = 7 × 0.4 = 2.8
Variable = 7 × 0.6 = 4.2
```

若第一版暂用线性 DurationCurve：

```text
30 min: r=.33 → load≈4.2
60 min: r=.67 → load≈5.6
90 min: r=1.0 → load=7.0
```

但：

```text
full_visit + 30 min
```

即使 fatigue 比 90 分钟低，仍因为：

```text
30 < minimum 60
```

被 Itinerary Feasibility 判为 `CRITICAL / DURATION_TOO_SHORT`。

这说明：

> **Duration Feasibility 与 Fatigue Load 是两个独立判断。**

---

# 9. Day Fatigue

单日疲劳不能把 POI Feature 简单求和。

建议：

```text
DayFatigue =
Σ VisitWalkingLoad
+ Σ VisitPhysicalLoad
+ Σ RouteWalkingLoad
+ Σ TransferLoad
+ ContinuousActivityPenalty
- Σ RestRecovery
```

其中必须避免双算。

例如：

- Route walking 只进入 Route Load；
- POI 内部游览 walking 只进入 Visit Load；
- `rest` 作为恢复价值，需要 Day Context 才能产生 recovery；
- POI Master walking 不应在 DayFatigue 中再次直接加一次。

---

# 10. Remaining Fatigue Budget

Planning Engine 应维护：

```text
fatigueBudgetStart
accumulatedLoad
recoveredLoad
remainingFatigueBudget
```

候选 POI 进入下午时，不只看自身 matchScore，而要检查：

```text
estimatedVisitLoad
+
estimatedNextTransitionLoad
<= remainingFatigueBudget ?
```

超出时：

```text
warning / reject / replace / insert_rest
```

具体阈值取决于 Trip Style、Party 和用户 mobility tolerance，数值由 Pilot 校准。

---

# 11. 多人同行

多人时：

- Hard mobility constraints 取并集；
- Visit Load 可按成员分别计算；
- Day Feasibility 应关注最容易过载的成员；
- 不能用平均值把老人、儿童、行动不便成员的负担冲掉。

建议结果保留：

```text
partyLoadMax
partyLoadMedian
limitingTravelerRef / class
```

隐私层不要求把个人敏感信息送给 AI；AI 只需要规划所需的结构化约束摘要。

---

# 12. Unknown / Confidence / Coverage

继续保留 v0.1 原则：

```text
0 ≠ null
null ≠ 5
```

若详细 walking facts 不完整：

- 不伪造 0；
- 可以使用 Feature Summary fallback；
- 标记较低 confidence；
- 对高风险 / Hard Need 场景可以返回 NEEDS_FACT。

---

# 13. Score Breakdown

Scoring / Visit Load 必须可审计。

至少保留：

```text
featureCode
preferenceValue
featureValue
contribution
confidence

visitMode
plannedDuration
minimumDuration
recommendedDuration
fixedLoad
variableLoad
terrainModifier
visitWalkingLoad
visitPhysicalLoad
loadSource
```

这样后续可以解释：

```text
为什么这个景点适合用户？
为什么今天下午不适合？
为什么安排 90 分钟而不是 30 分钟？
```

---

# 14. 不在本版写死的参数

以下必须由 Pilot 校准：

```text
fixed / variable load ratio
DurationCurve
terrain modifier weights
continuous activity penalty
rest recovery strength
fatigue budget thresholds
walking / physical feature final weights
γ
多人聚合函数细节
```

但以下方向必须冻结：

1. walking / physical 是标准游览负担基准，不是固定总疲劳；
2. 实际 Visit Load 必须依赖 duration / mode；
3. Fixed Load 与 Variable Load 必须可区分；
4. Route Load 与 POI Visit Load 分开；
5. Day Fatigue 使用实际 Visit Instance，不重复直接加 POI Feature；
6. Duration Feasibility 与 Fatigue Load 分开判断。
