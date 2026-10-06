# TravelAssist POI Scoring / Matching Spec v0.1

> 日期：2026-09-10  
> 状态：Freeze Candidate / 待 Consumer Review  
> 分支：`design/a-trip-engine-poi-ai-architecture-v2`  
> 关联设计：`trip-engine-poi-ai-provider-design-v0.3.md`、`poi-feature-preference-codebook-v0.1.md`、`preference-state-v0.1.md`  
> 本文件冻结候选范围：43 维 Feature 与 1–9 Preference 的计算方向、Hard Constraint 前置、Context Fit、多人合并、unknown / confidence / coverage、Score Breakdown，以及 `matchScore / dayFit / weatherFit / seasonFit / routeFit / currentSuitability` 的职责边界。  
> 本文件不冻结最终 Feature 权重、Trip Style 权重、Daily Top-N、CorridorScore、StopValue、HiddenGem 权重或最终模型阈值。

---

# 1. 核心结论

TravelAssist 不应把 43 维简单做统一点积，也不应把“用户喜欢”“当前天气”“同行人”“路线”全部混成一个不可解释总分。

标准计算链路：

```text
POI Facts / POIFeatureV1
        +
Effective Preference
        +
Party / Schedule / Weather / Season Context
        +
Hard Constraints
        ↓
Constraint Gate
        ↓ pass only
Feature Matching
        ↓
matchScore
partyFit
seasonFit
weatherFit
dayFit
        +
Canonical Route Fact
        ↓
routeFit
        ↓
currentSuitability
        ↓
Candidate / Optimization Layer
```

核心原则：

> **Hard Constraint 先决定“能不能去”；Scoring 再决定“多适合”；Route / Weather / Season 等动态维度各算各的，最后组合，不重复加分。**

---

# 2. Score 的职责边界

## 2.1 matchScore

`matchScore` 回答：

> **这个 POI 本身，与当前用户 / 当前 Trip 的软偏好有多匹配？**

主要读取：

- Effective Preference；
- POIFeatureV1 中与软偏好相关的维度；
- Feature Kind；
- Feature confidence / provenance。

默认不包含：

- 当前天气事实；
- 当前季节事实；
- 当前时段可执行性；
- Live Route；
- 门票 / 交通总成本；
- 当日累计疲劳；
- 当前实时拥挤事实（如已有 live fact，应进入 dynamic risk / day context）。

## 2.2 partyFit

`partyFit` 回答：

> 当前同行人构成与需求是否适合这个 POI？

主要来自：

```text
16 family
17 senior
18 couple
19 solo
29 wheelchair
30 stroller
```

其中实际无障碍“必须满足”条件应先进入 Hard Constraint，不能只靠 partyFit。

## 2.3 seasonFit

`seasonFit` 回答：

> 在当前旅行日期 / 季节，这个 POI 的体验是否合适？

主要使用：

```text
40 spring
41 summer
42 autumn
43 winter
```

具体“日期如何映射季节”由独立 Season Context / Config 提供，本文件不写死月份边界。

## 2.4 weatherFit

`weatherFit` 回答：

> 在当前或预测天气下，这个 POI 是否适合？

主要使用：

```text
35 rain
36 heat
37 cold
38 snow
39 weather_sensitive
```

Weather Provider Raw JSON 不直接参与评分；必须先经过 Provider Adapter / Weather Context 归一化。

## 2.5 dayFit

`dayFit` 回答：

> 把这个 POI 放到“这一天 / 这个时段”是否合适？

主要考虑：

- morning / daytime / sunrise / sunset；
- night 体验价值；
- 当日累计活动负担；
- rest 价值；
- 当前可用时间窗；
- 营业时间 / 最后入场等硬事实。

营业时间本身先做 feasibility；不能因为 dayFit 高就安排在闭馆后。

## 2.6 routeFit

`routeFit` 回答：

> 从当前路线把这个 POI 接进去是否合理？

只读取 Canonical Route Fact / Planning Route Fact，不从 POI Feature 猜实时交通。

典型变量：

```text
travelTime
walkTime
transfers
fare
detour
reliability
arrivalWindow
```

POI `walking` 表示游览本体负担；Route `walkTime` 表示移动负担。两者不能混成一个字段。

## 2.7 currentSuitability

`currentSuitability` 是“当前上下文综合适合度”，建议由已经计算好的组件组合：

```text
matchScore
partyFit
seasonFit
weatherFit
dayFit
```

不得重新读取同一批 43 维再算一次，否则容易重复计分。

`routeFit` 默认保持单独组件，留给 Candidate / Optimization Layer 与 `currentSuitability` 一起做最终排序。

## 2.8 不在本文件冻结的分数

以下概念继续保留，但最终公式属于后续 Candidate / Optimization Spec：

```text
experienceValue
moneyValue
timeValue
overallValue
detourValue
stopValue
```

特别是：

> `overallValue ≠ matchScore`，不得把所有概念都做成同一个总分的别名。

---

# 3. 输入模型

每次 POI Scoring 至少需要：

```text
POI Feature Snapshot
Effective Preference
Context Snapshot
Constraint Snapshot
Scoring Config Version
```

建议概念结构：

```ts
type ScoreInputV1 = {
  poiRef: string
  featureVersion: string
  features: FeatureValue43
  featureConfidence: Partial<Record<FeatureCode, number>>

  effectivePreference: EffectivePreferenceVNext

  context: {
    party: PartyContext
    schedule: ScheduleContext | null
    weather: WeatherContext | null
    season: SeasonContext | null
    dayLoad: DayLoadContext | null
  }

  constraints: HardConstraint[]
  scoringConfigVersion: string
}
```

实际 TypeScript Contract 后续实现时不得复制 Trip / Provider 已冻结的 canonical 类型，只引用或 Adapter 投影。

---

# 4. Step 0 — Hard Constraint Gate

任何软评分之前先执行：

```text
Constraint Gate
```

结果只有三类：

```text
PASS
REJECT
NEEDS_FACT
```

## PASS

所有硬要求已满足，允许进入 Scoring。

## REJECT

已知事实明确违反硬约束，例如：

```text
必须轮椅可达 + 官方确认无障碍不可达
必须 13:00 参加预约 + POI 无法在时间窗内到达
儿童年龄不符合活动规则
闭馆 / 休息日
末班交通无法完成
```

此时：

```text
score 不得救回来
AI 不得覆盖
```

## NEEDS_FACT

某关键事实未知，例如：

```text
requiresWheelchairAccess=true
但 wheelchair 可达事实 unknown
```

不得把 unknown 当作“应该可以”。

处理：

```text
有 Provider / 官方来源可查 → 先补 Fact
无法补证 → Candidate 暂不进入正式可执行方案
```

---

# 5. 统一归一化

## 5.1 POI Feature

POI Feature：

```text
f ∈ 0..9
```

归一化：

```text
x = f / 9
```

因此：

```text
x ∈ [0,1]
```

`null` 不参与归一化。

## 5.2 Preference

用户 Preference：

```text
p ∈ 1..9
5 = 中性
```

Signed Preference：

```text
q = (p - 5) / 4
```

得到：

```text
1 → -1.00
2 → -0.75
3 → -0.50
4 → -0.25
5 →  0.00
6 → +0.25
7 → +0.50
8 → +0.75
9 → +1.00
```

Engine 可以直接计算，不要求 AI 做换算。

---

# 6. Benefit Function

适用于：

```text
01–15 benefit
```

基础贡献：

```text
contribution = q × x
```

范围：

```text
[-1,1]
```

示例：

```text
photo Preference = 9
POI photo = 9
q=1, x=1
→ contribution = +1
```

```text
shopping Preference = 1
POI shopping = 9
q=-1, x=1
→ contribution = -1
```

```text
shopping Preference = 1
POI shopping = 0
→ contribution = 0
```

重要：

> 用户不喜欢购物时，“没有购物”应主要是“不扣分”，而不是凭空获得巨大正奖励。

因此不使用“离用户目标越近就一定给正分”的对称距离公式处理 benefit。

---

# 7. Suitability Function

Suitability 分两类来源。

## 7.1 Preference-driven Suitability

例如用户明确表达：

```text
relax
adventure
educational
interactive
morning
sunrise
sunset
snow
```

可使用与 benefit 相同的 signed 逻辑：

```text
contribution = q × x
```

因为这些是明确“喜欢 / 不喜欢”的软倾向。

## 7.2 Context-driven Suitability

例如：

```text
family
senior
solo
wheelchair
stroller
season
weather condition
current timeslot
```

Context Producer 应先给出：

```text
strength s ∈ [0,1]
```

然后：

```text
contribution = s × (2x - 1)
```

含义：

```text
x≈1   高适配 → 正向
x≈0.5 中等   → 约中性
x≈0   低适配 → 负向
```

Hard Need 仍必须在 Constraint Gate 先处理。

---

# 8. Cost Function

适用于：

```text
25 walking
26 physical
```

用户值表示“可接受的负担程度”，不是“越高越喜欢累”。

Tolerance：

```text
t = (p - 1) / 8
```

得到：

```text
p=1 → tolerance 0.00
p=5 → tolerance 0.50
p=9 → tolerance 1.00
```

POI burden：

```text
b = f / 9
```

基础 penalty：

```text
penalty = max(0, b - t)^γ
```

Freeze Candidate 初始：

```text
γ = Config
```

不在 v0.1 写死。

贡献：

```text
contribution = -penalty
```

重要：

- 负担低于容忍度时不额外奖励；
- 高容忍度只代表减少 penalty；
- `walking=9` 的用户目标不表示系统应该主动找最长步行路线。

---

# 9. Risk Function

适用于：

```text
27 crowd
28 queue
39 weather_sensitive
```

## 9.1 用户容忍型 Risk

例如 crowd / queue：

```text
t = (p - 1) / 8
r = risk / 9
penalty = max(0, r - t)^γ
contribution = -penalty
```

因此：

```text
crowd Preference = 2
POI crowd = 9
→ 强 penalty
```

```text
crowd Preference = 9
POI crowd = 9
→ 可接受，不获得“拥挤奖励”
```

## 9.2 Runtime Risk

例如 `weather_sensitive` 应与实际天气严重度结合。

若：

```text
severity s ∈ [0,1]
weatherSensitive x ∈ [0,1]
```

则基础风险可为：

```text
penalty = s × x
contribution = -penalty
```

具体天气 severity 生成规则由 Weather Impact Spec 冻结。

---

# 10. Weather Fit

Weather Context 建议先归一化：

```text
rainSeverity
heatSeverity
coldSeverity
snowPresenceOrValue
adverseWeatherSeverity
```

均为：

```text
0..1
```

对应：

```text
rain  × rainSeverity
heat  × heatSeverity
cold  × coldSeverity
snow  × snowPresenceOrValue
weather_sensitive × adverseWeatherSeverity
```

其中：

- `rain / heat / cold / snow` 使用 context-driven suitability；
- `weather_sensitive` 使用 risk penalty；
- 没有对应天气事件时，该天气维度不应硬塞进 denominator。

---

# 11. Season Fit

Season Context 不要求一定是单一 one-hot，可允许：

```text
springStrength
summerStrength
autumnStrength
winterStrength
```

例如精确日期通常只有一个主季节；跨季月份 / 模糊日期可由 Season Resolver 给出多个强度。

计算：

```text
season contribution
= Σ seasonStrength × (2 × featureSuitability - 1)
```

归一化后映射为 `seasonFit`。

Season Resolver 的日历边界属于配置 / 独立 Codebook，不在本文件固定。

---

# 12. Party Fit

Party Context 不应只靠人数粗暴推断关系。

建议原则：

```text
solo
→ party size = 1 可确定

senior
→ 来自已知 senior / mobility need context

family
→ 可由明确 family mode 或 child/infant context触发

couple
→ 只有用户明确关系 / Trip Mode 时使用
  不得因为“2 个成人”自动认定情侣
```

Context Producer 输出：

```text
familyStrength
seniorStrength
coupleStrength
soloStrength
wheelchairNeedStrength
strollerNeedStrength
```

Hard accessibility need 先进入 Constraint Gate；Fit 只负责软适配排序。

---

# 13. Day Fit

Day Fit 至少拆成：

```text
timeSlotFit
loadFit
restFit
scheduleFit
```

## 13.1 timeSlotFit

对应：

```text
31 morning
32 daytime
33 sunrise
34 sunset
08 night（夜间体验价值，可作为特殊 context value）
```

实际日出 / 日落时刻必须由日期 + 经纬度计算，不使用 POI Feature 猜时刻。

## 13.2 loadFit

当前 Day 已有负荷与 POI：

```text
walking
physical
stay duration
route walking
```

组合后判断当天是否过载。

注意：

> `matchScore` 中的 walking/physical 是“这个 POI 是否符合用户平时容忍度”；`dayFit` 中的 loadFit 是“今天已经走很多以后，现在还能不能安排”。两者语义不同。

## 13.3 restFit

`24 rest` 可以在高负荷日对恢复价值产生正向作用。

---

# 14. Feature Confidence / Unknown

## 14.1 null 不是 0，也不是 5

```text
Feature = 0
→ 已确认该特征几乎不存在 / 不适配

Feature = null
→ unknown / 未确认
```

禁止：

```text
null → 0
null → 5
```

## 14.2 Unknown Dimension

非关键 unknown：

```text
不产生正分
不产生负分
不进入已知 contribution
记录 coverage 缺口
```

关键 hard fact unknown：

```text
→ NEEDS_FACT
```

## 14.3 Confidence

每个 Feature 可附：

```text
confidence κ ∈ [0,1]
```

例如：

```text
官方明确事实 / 高等级人工验证 → 接近 1
AI 自动打标但证据较弱 → 较低
```

实际 confidence 生产规则由 POI Master Schema 冻结。

---

# 15. Coverage-aware Aggregation

为了防止“只知道一个强项就被打成 99 分”，必须记录 Evidence Coverage。

设：

```text
w_i = 当前 Config 对 signal i 的权重
κ_i = confidence
c_i = contribution ∈ [-1,1]
```

已知加权结果：

```text
knownRaw = Σ(w_i × κ_i × c_i) / Σ(w_i × κ_i)
```

当前任务应评估的总权重：

```text
requestedWeight = Σ(w_i)
```

Evidence Coverage：

```text
coverage = Σ(w_i × κ_i) / requestedWeight
```

范围：

```text
0..1
```

Shrink-to-neutral：

```text
adjustedRaw = coverage × knownRaw
```

unknown 部分自动向中性 `0` 收缩，而不是让少量已知高分无限放大。

最终映射：

```text
score = round(99 × (adjustedRaw + 1) / 2)
```

并 clamp：

```text
0..99
```

因此：

```text
raw = -1 → 0
raw =  0 → ~50
raw = +1 → 99
```

最终实现可在 Pilot 后调整映射曲线，但：

> **必须保留 unknown coverage 与向中性收缩原则。**

---

# 16. Score Envelope

不建议 Engine 只返回一个裸数字。

建议：

```ts
type ScoreResultV1 = {
  value: number            // 0..99
  coverage: number         // 0..1
  confidence: number       // 0..1
  status:
    | "scored"
    | "neutral_default"
    | "not_applicable"
    | "blocked"
    | "needs_fact"
  configVersion: string
  breakdown: ScoreBreakdownItemV1[]
}
```

`confidence` 不等于 `coverage`：

- coverage = 需要的数据有多少被覆盖；
- confidence = 已覆盖数据本身有多可信。

---

# 17. Score Breakdown

每个可审计 contribution 至少保存：

```text
featureCode
featureKey
featureKind
featureValue
featureConfidence
signalSource
preferenceValue / contextStrength
functionKind
contribution
weight
weightedContribution
provenanceRef
```

例如：

```text
04 photo
source=trip_override
preference=9
feature=8
kind=benefit
contribution=+0.889
```

```text
27 crowd
source=effective_preference
preference=2
feature=8
kind=risk
contribution=-...
```

Score Breakdown 用于：

- QA；
- Pilot 调权；
- “为什么没推荐这个景点”；
- ReasonCode 生成；
- Engine vs AI A/B Test；
- 防止重复计分。

完整 Breakdown 默认不送给 AI，只传 Task 所需摘要。

---

# 18. 多人同行合并

多人旅行必须先处理硬需求，再处理软偏好。

## 18.1 Hard Constraint

多人 Hard Constraint 使用 union：

```text
只要任一成员有硬需求
→ 整个 Group Candidate 必须满足
```

例如一人必须轮椅可达，则不能用其他成员“平均掉”。

## 18.2 Benefit / Preference-driven Suitability

若未来存在成员级 Preference：

```text
先计算每个成员 contribution
再做 group aggregation
```

Freeze Candidate：

```text
groupMean = weighted mean(member contribution)
disagreement = max(member contribution) - min(member contribution)

groupContribution
= clamp(groupMean - λ × disagreement, -1, 1)
```

其中 `λ` 由 Group Scoring Config / Pilot 校准，不在本文件写死。

目的：

> 一个“有人特别喜欢、有人特别讨厌”的 POI，不应仅因为平均值为 0 就看起来和“大家都无所谓”完全相同。

## 18.3 Cost / Risk

对 walking / physical / crowd / queue 等群体负担：

```text
groupPenalty = max(memberPenalty)
```

优先保护最受影响成员，不用平均数掩盖问题。

## 18.4 没有成员级 Preference 时

当前阶段可以：

```text
主用户 Effective Preference
+
Party Context
+
所有成员 Hard Needs
```

不得虚构其他成员个人喜好。

---

# 19. Preference 来源与权威性

Scoring 不负责重新合并 Preference。

必须先消费 `preference-state-v0.1` 输出的 Effective Preference：

```text
Trip Override
> Trip Snapshot
> Product Default
```

因此同一 Feature 在本次 Scoring 中只出现一个最终用户 Preference 值。

来源 provenance 仍需保留，例如：

```text
trip_override
snapshot
product_default
```

但不能因为来源不同再重复贡献。

---

# 20. 5 = 中性时的计算规则

## Benefit / signed suitability

```text
p=5
q=0
→ contribution=0
```

因此可以不进入 AI Compact Context。

## Cost / risk tolerance

`p=5` 仍表示“中等容忍度”，Tolerance Function 可使用：

```text
t=0.5
```

这属于 Engine 计算，不代表 AI 必须收到 `5`。

注意：

- 数据库显式 `5` 与 missing 的持久化语义仍不同；
- Effective Preference Resolver 完成后，Scoring 只消费最终值；
- AI 的 omit-5 不影响 Engine 正确计算 cost / risk。

---

# 21. Live Fact 与 Planning Prior

如果某维度存在 fresh live fact，应按后续 Fact Freshness Policy 选择权威来源。

原则：

```text
fresh canonical fact
> verified dated fact
> master prior
> unknown
```

例如：

```text
POI crowd=7  // baseline prior

但当前已有可信 live crowd fact=3
→ 当前 day/risk 计算优先使用 live fact
```

不得同时把 baseline=7 与 live=3 都完整计入，造成重复 penalty。

---

# 22. 防重复计分规则

以下必须避免：

## 22.1 Weather

`rain=8` 已进入 weatherFit 后，不再把同一“今天下雨”信号重复塞进 matchScore。

## 22.2 Season

`autumn=9` 的当前季节适配只进入 seasonFit；用户明确“喜欢红叶”可以作为另一条兴趣信号，但不能把当前月份本身当成长期偏好。

## 22.3 Route Walking

```text
POI walking
→ onsite burden

Route walkTime
→ transit burden
```

两者分别计算，不得复制同一个分钟数。

## 22.4 Crowd

Master crowd prior 与 live crowd fact 只能按 freshness policy 选当前有效值，不双重处罚。

---

# 23. Reason / Explainability

Score Breakdown 可以派生稳定 ReasonCode，例如：

```text
PREF_STRONG_MATCH
PREF_DISLIKE_CONFLICT
LOW_WALKING_BURDEN
WALKING_OVER_TOLERANCE
LOW_CROWD_RISK
CROWD_OVER_TOLERANCE
PARTY_FIT_HIGH
PARTY_FIT_LOW
SEASON_FIT_HIGH
WEATHER_FIT_LOW
TIME_SLOT_FIT_HIGH
REST_VALUE_HIGH
LOW_DATA_COVERAGE
```

最终 ReasonCode Codebook 在 AI Decision Contract 中冻结。

用户解释优先使用：

```text
Score Breakdown
→ ReasonCode
→ Template Explanation
```

不需要每次调用 Explanation AI。

---

# 24. 示例

## 24.1 摄影强偏好 + 不喜欢拥挤

用户：

```text
photo=9
crowd=2
walking=4
```

POI A：

```text
photo=9
crowd=9
walking=7
```

POI B：

```text
photo=7
crowd=3
walking=3
```

预期：

- A 得到更高摄影正贡献；
- A 同时受到更强 crowd / walking penalty；
- B 不应因为摄影只有 7 就必然输给 A；
- 最终排序取决于 Config 权重，但方向必须稳定。

## 24.2 轮椅硬需求

```text
requiresWheelchairAccess=true
```

POI：

```text
wheelchair=null
```

结果：

```text
NEEDS_FACT
```

不得给一个 `wheelchair=5` 后继续排名。

## 24.3 雨天

当前：

```text
rainSeverity=0.9
```

POI A：

```text
rain=9
weather_sensitive=1
```

POI B：

```text
rain=2
weather_sensitive=9
```

预期：A weatherFit 显著高于 B。

## 24.4 数据覆盖不足

只有 1 个相关 Feature 有值，其余全部 unknown。

即使该 1 个 Feature 完美匹配：

```text
knownRaw ≈ 1
coverage 很低
```

经过 shrink-to-neutral 后不得直接得到接近 99 的最终可信评分。

---

# 25. Test Matrix

实现前至少需要这些测试：

```text
1. benefit p=9/f=9 → strong positive
2. benefit p=1/f=9 → strong negative
3. benefit p=1/f=0 → neutral, not reward
4. benefit p=5 → zero personalized contribution
5. cost burden below tolerance → no penalty
6. cost burden above tolerance → penalty
7. risk high tolerance → reduced / zero penalty, not reward
8. null feature → coverage loss, not zero
9. hard constraint violation → reject before scoring
10. critical unknown → needs_fact
11. context suitability high / low direction
12. weather_sensitive only penalizes when adverse weather active
13. multi-member hard need union
14. multi-member cost/risk uses max penalty
15. disputed group preference records disagreement
16. live fact replaces prior instead of double counting
17. low coverage shrinks toward neutral
18. same input + same configVersion → deterministic same score
19. configVersion change可改变数值但不能改变函数语义方向
20. score breakdown weighted sum与最终 raw 可复算
```

---

# 26. Config 与 Pilot 边界

现在冻结：

- Feature Kind；
- benefit / suitability / cost / risk 的方向；
- Hard Constraint 前置；
- null / 0 / 5 语义；
- coverage / confidence 必须保留；
- 多人 Hard Need 不平均；
- cost / risk 不因高容忍而奖励风险；
- 分数组件职责边界；
- Score Breakdown 可审计；
- live fact 不与 prior 双算。

Pilot 后再校准：

```text
每个 Feature 的 w_i
γ
Group disagreement λ
不同 Trip Style 的权重 profile
matchScore 各维权重
currentSuitability 组件权重
score mapping 是否继续线性
低 coverage 的淘汰 / 降权阈值
```

任何权重调整必须带 `scoringConfigVersion`。

---

# 27. 与 AI 的边界

AI 默认不需要看到完整 Scoring Breakdown。

普通 Decision AI 可以只看：

```text
localId
match
currentFit
routeFit
主要 reasonCode
必要的 Task-specific Feature
```

例如：

```text
[3,9,8,7,R04]
```

完整 0–99 精度只在候选很接近、确实需要 Fine Decision 时提供。

AI 不得：

- 修改 Scoring Config；
- 把 unknown 当已知；
- 绕过 Constraint Gate；
- 自行更改 Feature Kind；
- 直接写最终 Score 到 POI Master；
- 用自然语言理由覆盖 Engine 计算结果。

---

# 28. 推荐实现顺序

```text
1. Feature Codebook runtime constants
2. Effective Preference resolver input adapter
3. Constraint Gate interface
4. per-signal contribution functions
5. coverage / confidence aggregation
6. Score Breakdown
7. matchScore
8. party / season / weather / day component scorers
9. currentSuitability aggregator
10. routeFit interface
11. fixtures + deterministic unit tests
12. 100 POI Pilot
```

100 POI Pilot 通过后再调整数值权重，不应反向破坏已冻结的语义方向。

---

# 29. 一句话定义

> **TravelAssist Scoring 的职责不是用一个神秘总分决定一切，而是先排除不可执行项，再把“用户偏好、同行人、季节、天气、当天节奏、路线”分别算成可审计组件，最后在 Candidate / Optimization Layer 组合。**
