# TravelAssist — Planner Decision / Candidate Ranking / Trade-off & Explanation Model

> 状态：建议冻结为 Planner 决策层 v1  
> 适用范围：初次行程生成、实时重规划、候选方案比较、推荐解释、AI 对话、Planner UI  
> 上游依赖：
> - 43维 POI 属性 / Recommendation Engine
> - Planner Engine / Planner Validator
> - Realtime Impact Analysis / Replan Policy / Change Set Model
> - Realtime Trip State / Progress Model
> - AI Orchestrator / Context Builder / Tool Router
> - Action Router / Confirmation / Execution
>
> 核心目标：
> - 将“可执行”与“更适合用户”分离
> - Validator 先过滤不可执行方案，Ranking 只比较合法候选
> - Ranking 使用确定性、可版本化评分模型，而不是让 LLM 主观选一个
> - 明确多个候选之间的 Trade-off
> - AI 只负责把结构化决策原因翻译成自然语言
> - 每次候选选择都可重现、可审计、可解释

---

# 1. 总体链路

```text
Planner Candidate Generation
        ↓
Planner Validator
        ↓
Valid Candidates
        ↓
Candidate Feature Extraction
        ↓
Decision / Ranking Engine
        ↓
Score + Trade-off Profile
        ↓
Preferred Candidate + Alternatives
        ↓
Explanation Model
        ↓
AI / UI
        ↓
User Selection
        ↓
Change Set / Action Router
```

核心原则：

> Planner 负责“生成可能方案”。

> Validator 负责“方案能不能执行”。

> Ranking Engine 负责“合法方案之间怎么比较”。

> AI 负责“把原因解释给用户”。

---

# 2. 可执行性优先于评分

禁止：

```text
高偏好匹配
+
预约冲突
=
仍然排第一
```

正确顺序：

```text
Constraint / Feasibility Validation
↓
Valid Candidates only
↓
Ranking
```

---

# 3. Candidate

统一候选对象：

```ts
interface PlannerCandidate {
  candidateId: string;
  plannerRunId: string;
  tripId: string;
  dayId?: string;
  baseTripVersion: number;
  changeSetId?: string;
  itemIds: string[];
  validationStatus: "valid" | "invalid";
  features?: CandidateFeatureVector;
  score?: CandidateScore;
  createdAt: string;
}
```

Invalid Candidate 不进入 Ranking、不进入“推荐方案”、不提供“应用”按钮，只可用于内部调试或说明无解原因。

---

# 4. Candidate Feature Vector

建议统一特征：

```ts
interface CandidateFeatureVector {
  preferenceMatch: number;
  iconicCoverage: number;
  localExperience: number;
  diversity: number;
  themeConsistency: number;

  scheduleEfficiency: number;
  geographicEfficiency: number;
  transportEfficiency: number;
  transportReliability: number;

  walkingLoad: number;
  fatigueLoad: number;

  reservationProtection: number;
  mustKeepProtection: number;

  durationQuality: number;
  bufferQuality: number;

  weatherSuitability: number;
  crowdSuitability?: number;

  costLevel: number;
  costDelta?: number;

  disruptionMagnitude: number;
  uncertainty: number;
}
```

内部建议归一到统一标准区间，例如 0.0 ~ 1.0。

---

# 5. 43维偏好接入

POI 43维数据不直接由 AI 比较。

```text
User Preference Vector
+
POI 43D Vector
↓
Recommendation Engine
↓
POI Match Score
↓
Candidate Aggregation
```

Ranking Engine 消费聚合结果。

候选整体偏好匹配不能只对所有 POI 简单平均，应考虑停留时长、POI 重要度、主/次项目、用户 must/dislike 与每日主题。

---

# 6. Experience Features

## Iconic Coverage

首次访问用户可提高 iconic 权重；偏好小众或重复访问用户可降低。

原则：

```text
Feature 固定计算
Weight 随 User / Trip Profile 变化
```

## Diversity 与 Theme Consistency

防止一天高度重复，同时允许有明确主题日。

因此同时保留：

```text
diversity
theme_consistency
```

而不是把“越多样越好”作为绝对原则。

---

# 7. 时间与地理效率

## Schedule Efficiency

考虑：

- 空白等待
- 不必要 Buffer
- 时间利用
- 开闭馆窗口
- Meal Timing
- 交通衔接

不能通过低于 minimum_duration 的方式“提高效率”。

## Geographic Efficiency

考虑：

- 折返
- 不必要跨区
- Route Compactness
- Backtracking Ratio

## Transport Efficiency / Reliability

不仅看总分钟，还考虑：

- 换乘次数
- 等待时间
- 步行换乘
- 复杂度
- 实时可靠性

---

# 8. Walking / Fatigue

Walking Load 是客观负荷，最终 penalty 根据用户 Walking Preference 决定。

Fatigue Load 使用既有 Fatigue Engine，Ranking Engine 不重复计算疲劳公式。

---

# 9. Reservation / Must Keep

Reservation Protection 是高优先级特征。

真正预约冲突应在 Validator 阶段直接淘汰；Ranking 只比较：

```text
预约安全余量
```

删除 must_keep 的方案默认应在 Policy / Validator 阶段淘汰。

---

# 10. Duration Quality

每个 POI 比较：

```text
planned_duration
vs
minimum_duration
vs
recommended_duration
```

建议：

```text
>= recommended → full quality
minimum ~ recommended → proportional quality
< minimum → invalid
```

---

# 11. Buffer Quality

Buffer 过少会脆弱，过多则效率下降，所以采用目标区间/曲线，而不是“越多越好”。

---

# 12. Weather / Crowd

Weather Suitability 来自：

```text
Weather Context
+
POI indoor/outdoor attributes
+
weather sensitivity
```

未来 Crowd 数据可组合：

```text
predicted crowd
+
user crowd tolerance
```

v1 Crowd 可选。

---

# 13. Cost

区分：

```text
absolute_cost
incremental_cost
```

实时 Replan 重点使用：

```text
cost_delta
```

并记录 cost confidence。

---

# 14. Disruption Magnitude

实时 Replan 必须衡量相对原计划的变化：

- moved items
- removed items
- replaced items
- time shifts
- transport changes

原则：

> 两个方案体验接近时，优先改动更小的。

---

# 15. Uncertainty

如果候选依赖低置信度 ETA、估算营业时间、低可靠交通、变化较大的天气，则增加 uncertainty penalty。

数据缺失不能默认等于 0 分，应区分：

```text
known
estimated
missing
```

---

# 16. Candidate Score

```ts
interface CandidateScore {
  totalScore: number;
  components: Record<string, number>;
  weights: Record<string, number>;
  penalties: Record<string, number>;
  rankVersion: string;
  generatedAt: string;
}
```

概念上：

```text
Positive Utility
-
Penalties
```

例如：

```text
preference
+ experience
+ efficiency
+ reliability

-

walking
+ fatigue
+ cost
+ disruption
+ uncertainty
```

---

# 17. Hard Gate / Soft Score 分离

Hard Gate：

```text
opening hours
reservation
minimum duration
route feasibility
hard deadline
must_keep
```

Soft Score：

```text
preference
walking
cost
fatigue
diversity
efficiency
```

高 Soft Score 不能抵消 Hard Gate。

---

# 18. Weight Profile

```ts
interface PlannerWeightProfile {
  profileId: string;
  version: string;

  preference: number;
  iconic: number;
  local: number;
  diversity: number;
  themeConsistency: number;

  scheduleEfficiency: number;
  geography: number;
  transport: number;
  transportReliability: number;

  walking: number;
  fatigue: number;

  durationQuality: number;
  buffer: number;

  weather: number;
  cost: number;

  disruption: number;
  uncertainty: number;
}
```

来源：

```text
System Defaults
+
Travel Style
+
Explicit User Preferences
+
Trip Context
+
Replan Policy
```

---

# 19. Preference Priority

当前 Trip 的显式指令高于长期偏好。

例如：

```text
长期：喜欢散步
当前：今天尽量少走路
```

则当前 Trip Override 优先。

AI 可以解析成结构化 Priority Override，但具体 Weight 由 Weight Policy 映射，不能由 LLM 临时编造数值。

---

# 20. Versioning

所有 Ranking 必须保存：

```text
feature_version
rank_version
weight_profile_version
```

保证未来可重现。

---

# 21. Preferred Candidate

系统可以产生：

```text
preferred_candidate_id
```

但必须：

- Valid
- 通过 Policy
- Ranking 最优或符合明确 Tie-break
- Explanation 有结构化依据

它是默认推荐，不替用户做最终选择。

---

# 22. Tie-break

当候选总分非常接近，建议优先：

```text
1 lower risk
2 lower uncertainty
3 smaller disruption
4 lower cost
5 lower walking
```

Tie-break 同样版本化。

---

# 23. Score Margin

A/B 分差很小时，UI 不应表现为“A 明显更好”。

应表达：

```text
两种方案整体接近，主要差异在步行、费用或景点数量。
```

---

# 24. Pareto Frontier

高级阶段可剔除在时间、费用、步行、体验等主要维度上被另一方案全面支配的 Candidate，只向用户保留 Pareto-efficient options。

---

# 25. Candidate 数量与差异

v1 推荐：

```text
1 preferred
+
最多 2 alternatives
```

候选应体现真实策略差异：

```text
A 平衡
B 少走路
C 保留更多景点
```

而不是只有几分钟时间差。

---

# 26. Trade-off Model

```ts
interface CandidateTradeoffProfile {
  candidateId: string;
  strengths: TradeoffFactor[];
  weaknesses: TradeoffFactor[];
  comparedToPreferred?: TradeoffDelta[];
}
```

标准维度：

```text
time
cost
walking
fatigue
poi_count
preference_match
reservation_safety
weather_resilience
route_simplicity
disruption
finish_time
```

---

# 27. Delta 必须是真实值

例如：

```text
walking: -1.8km
cost: +¥2,400
finish_time: -35min
poi_count: -1
```

AI 不负责估算这些值。

---

# 28. Explanation Model

输入：

```text
Structured Reasons
+
Score Components
+
Trade-off Deltas
+
User Priorities
```

输出自然语言。

---

# 29. Decision Reason

```ts
interface DecisionReason {
  code: string;
  importance: "primary" | "secondary" | "minor";
  evidence: Record<string, unknown>;
}
```

标准 Reason Codes：

```text
USER_PREF_MATCH
LESS_WALKING
LOWER_FATIGUE
LOWER_COST
FASTER_ROUTE
FEWER_TRANSFERS
RESERVATION_PROTECTED
MORE_BUFFER
BETTER_WEATHER_FIT
MORE_ICONIC_COVERAGE
SMALLER_PLAN_CHANGE
HIGHER_CONFIDENCE
```

---

# 30. Evidence

例如：

```json
{
  "code": "LESS_WALKING",
  "importance": "primary",
  "evidence": {
    "delta_meters": -1800
  }
}
```

AI 可以解释：

```text
这个方案比另一个方案少走约 1.8 公里。
```

但不能生成无证据理由。

---

# 31. Why Preferred / Why Not

用户问：

```text
为什么推荐 A？
为什么不是 B？
```

系统使用 Candidate Delta 回答：

- 多/少走多少
- 多/少花多少
- 时间差多少
- 保留/删除哪些项目
- Reservation Margin 差异
- Fatigue 差异

---

# 32. Explanation Levels

## Level 1

一句话结论。

## Level 2

时间 / 费用 / 步行 / 景点 / 风险展开。

## Level 3

内部 Debug 的 Feature / Weight / Formula。

普通用户不强制展示内部数学权重。

---

# 33. Realtime Ranking

实时重规划必须增加：

```text
disruption penalty
uncertainty penalty
```

因为已经进行中的 Trip 更重视稳定性。

例如：

A：

```text
utility 更高
但改 4 个项目
```

B：

```text
utility 略低
只改 1 个项目
```

Realtime Profile 可能优先 B。

---

# 34. Initial / Realtime Profile

建议：

```text
initial_balanced_v1
realtime_conservative_v1
realtime_balanced_v1
```

---

# 35. Reliability-adjusted Ranking

理论最快不一定最好。

例如：

```text
A 换乘3次，快12分钟
B 直达，慢5分钟
```

可通过 reliability feature 使 B 在实际旅行中更优。

---

# 36. Recommendation / Ranking / Validator / AI 分离

```text
Recommendation Engine
= 某 POI 对用户有多匹配

Planner Validator
= 整个方案能不能执行

Planner Ranking
= 合法候选中哪个整体更合适

AI
= 如何向用户解释差异
```

四者不得合并。

---

# 37. Ranking Records

建议表：

```text
planner_candidate_rankings
```

字段：

```text
id
planner_run_id
candidate_id

feature_version
rank_version
weight_profile_id
weight_profile_version

total_score
rank_position

component_scores
penalties

is_preferred

created_at
```

---

# 38. Tradeoff Records

```text
planner_candidate_tradeoffs
```

字段：

```text
candidate_id
baseline_candidate_id

time_delta
cost_delta
walking_delta
fatigue_delta
poi_count_delta
finish_time_delta

strength_codes
weakness_codes

created_at
```

---

# 39. Explanation Records

建议保存结构化：

```text
candidate_id
reason_codes
evidence
explanation_version
```

最终 AI 文本可重新生成。

不要只保存一段自然语言作为唯一解释源。

---

# 40. Feature Normalization

不同单位：

```text
walking meters
cost yen
delay minutes
fatigue score
```

不能直接相加。

建议集中使用：

```text
Feature Normalizer
```

管理归一化、Curve 与版本。

---

# 41. Missing / Confidence

Feature 建议同时带：

```text
value
confidence
source
```

低置信度不直接等价低分，而是通过 uncertainty penalty 处理。

---

# 42. User Override

用户可以选择非 Preferred Candidate：

```text
我选 B，虽然多走一点。
```

系统必须尊重。

一次选择不应立即永久改变 User Preference，可先记录 decision telemetry。

---

# 43. Telemetry

建议记录：

```text
shown_candidates
preferred_candidate
selected_candidate
manual_override
explicit_reason_if_available
```

用于后续优化，但不自动将一次选择固化为长期偏好。

---

# 44. Ranking Experiment

未来可通过：

```text
rank_version
weight_profile_version
```

进行受控实验。

禁止线上无版本直接调整权重。

---

# 45. Fallback

Ranking Service 不可用时：

```text
Valid Candidates
↓
Simple Deterministic Fallback
```

例如：

```text
lowest risk
smallest disruption
lowest uncertainty
```

不能让 LLM 临时接管 Ranking。

---

# 46. v1

首批核心 Feature：

```text
preference_match
schedule_efficiency
geographic_efficiency
transport_reliability
walking_load
fatigue_load
reservation_protection
duration_quality
cost_delta
disruption_magnitude
uncertainty
```

Profiles：

```text
initial_balanced_v1
realtime_conservative_v1
realtime_balanced_v1
```

---

# 47. v2

增加：

```text
iconic_coverage
local_experience
theme_consistency
diversity
weather_resilience
crowd_suitability
advanced buffer quality
```

---

# 48. v3

增加：

```text
learned ranking
personalized utility curves
contextual weighting
Pareto generation
group preference ranking
```

即使未来使用学习模型，Hard Gate 仍不可移除。

---

# 49. Candidate Ranking 验收 Gate

必须满足：

- Invalid Candidate 不参与 Ranking
- Hard Gate 与 Soft Score 分离
- Feature 有明确数据来源
- Score 有版本
- Weight Profile 有版本
- Ranking 可重现
- AI 不直接决定 Preferred Candidate
- Realtime Ranking 考虑 disruption / uncertainty / reliability

---

# 50. Trade-off 验收 Gate

必须满足：

- 候选差异使用真实 Delta
- 至少支持 time / cost / walking / fatigue / POI / reservation
- Alternative 有真实策略差异
- 避免展示大量近似 Candidate
- 分差接近时不夸大优劣

---

# 51. Explanation 验收 Gate

必须满足：

- Explanation 来自标准 Reason Codes
- Reason 带 Evidence
- AI 不生成无依据理由
- 支持 Why Preferred / Why Not Alternative
- UI 不强制展示内部权重数学
- Explanation Source 与自然语言文本分离

---

# 52. 与完整系统关系

```text
Planner
  ↓
Candidates
  ↓
Validator
  ↓
Valid Candidates
  ↓
Feature Extraction
  ↓
Ranking Engine
  ↓
Trade-off Model
  ↓
Preferred + Alternatives
  ↓
Explanation Model
  ↓
AI / UI
  ↓
User Selection
  ↓
Change Set
  ↓
Action Router
```

---

# 53. 最终冻结原则

> Validator 决定“能不能做”，Ranking 决定“合法方案中哪个更适合”。

> 推荐分数必须来自结构化 Feature 与版本化 Weight，而不是 LLM 主观判断。

> POI 43维匹配只是候选行程价值的一部分，不能替代时间、交通、疲劳、费用和预约保护。

> 实时重规划必须额外惩罚不必要的大幅改动、低可靠性和低置信度方案。

> Trade-off 必须使用可验证的真实 Delta。

> AI 负责解释决策依据，不负责制造决策依据。

> Preferred Candidate 是系统默认推荐，不替用户做最终选择。

> Ranking、Weight、Feature、Trade-off、Explanation 都必须可版本化、可审计、可重现。
