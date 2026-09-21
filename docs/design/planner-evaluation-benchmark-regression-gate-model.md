# TravelAssist — Planner Evaluation / Benchmark / Regression Gate Model

> 状态：建议冻结为 Planner 质量保障 v1  
> 适用范围：初始行程生成、实时重规划、Candidate Ranking、43维推荐、Planner Validator、Realtime Replan、CI / Quality Gate  
> 上游依赖：
> - Planner Decision / Candidate Ranking / Trade-off & Explanation Model
> - Realtime Impact Analysis / Replan Policy / Change Set Model
> - Realtime Trip State / Progress Model
> - POI 43维属性与 Recommendation Engine
> - Planner Engine / Planner Validator
>
> 核心目标：
> - 把 Planner 质量从“看起来合理”变成可重复、可量化、可回归测试
> - 对 Planner、Validator、Ranking、权重、43维数据升级建立统一 Benchmark
> - 任何版本升级都必须证明“不破坏硬约束、不显著降低用户体验”
> - 区分 correctness、quality、stability、latency、cost 五类指标
> - 建立 CI Gate、Nightly Benchmark、Release Gate 三层质量门槛
> - 所有结果可版本化、可对比、可审计

---

# 1. 总体链路

```text
Planner / Ranking / Data Change
            ↓
     Benchmark Dataset
            ↓
      Scenario Runner
            ↓
 Planner + Validator + Ranking
            ↓
       Metric Engine
            ↓
 Baseline / Candidate Comparison
            ↓
      Regression Analysis
            ↓
     Quality Gate Decision
            ↓
   CI / Nightly / Release
```

核心原则：

> Validator 正确性必须先通过，才讨论体验分数。

> Benchmark 必须固定输入，避免每次测试条件变化。

> Regression Gate 比“单次平均分”更重要。

---

# 2. 五类质量维度

统一评估：

```text
Correctness
Quality
Stability
Performance
Cost
```

---

# 3. Correctness

回答：

```text
这个方案能不能执行？
```

核心指标：

- Hard Constraint Violation
- Reservation Conflict
- Closed POI
- Transfer Infeasible
- Minimum Duration Violation
- Time Overlap
- Impossible Sequence
- Invalid Change Set
- Version Conflict Handling

Correctness 属于 Hard Gate。

---

# 4. Quality

回答：

```text
可执行方案里，体验好不好？
```

核心指标：

- Preference Match
- POI Value
- Geographic Efficiency
- Walking
- Fatigue
- Buffer Quality
- Cost
- Theme Quality
- Iconic Coverage
- Local Experience
- Duration Quality

---

# 5. Stability

回答：

```text
同样条件下，Planner 是否稳定、升级后是否乱改？
```

核心指标：

- Candidate Churn
- Replan Disruption
- Unnecessary Change Rate
- Preferred Candidate Flip Rate
- Output Variance
- Ranking Stability

---

# 6. Performance

回答：

```text
Planner 是否足够快？
```

核心指标：

```text
p50 latency
p95 latency
p99 latency
timeout rate
tool call count
candidate count
validator time
ranking time
```

---

# 7. Cost

回答：

```text
Planner / AI / Tool 调用成本是否可控？
```

核心指标：

```text
LLM token cost
route API cost
weather API cost
transport API cost
planner compute cost
cost per successful plan
cost per realtime replan
```

---

# 8. Benchmark Case

建议统一：

```ts
interface PlannerBenchmarkCase {
  caseId: string;
  caseVersion: string;

  category: string;
  city?: string;
  region?: string;

  userProfile: unknown;
  preferenceVector: unknown;

  tripInput: unknown;

  realtimeContext?: unknown;

  expectedHardConstraints: unknown[];

  evaluationProfile: string;

  tags: string[];
}
```

---

# 9. Benchmark Case 类型

至少覆盖：

```text
initial_plan
replan_delay
replan_weather
replan_transport
replan_closure
reservation_protection
fatigue_heavy
walking_sensitive
budget_sensitive
must_keep
cross_city_anchor
multi_day
```

---

# 10. Golden Case

Golden Case 是长期稳定、人工审核过的代表案例。

例如：

```text
Tokyo 3-day first visit
Kyoto 2-day history/photo
Osaka family 1-day
Hakone senior relaxed
Kyoto rain replan
Tokyo train disruption
```

用于 Release Gate。

---

# 11. Edge Case

专门测试：

- POI 临时关闭
- 末班车
- 极短时间窗
- 多个预约
- must_keep 冲突
- 高步行限制
- 大雨
- 延误
- 交通中断
- 数据缺失
- ETA 低置信度

---

# 12. Adversarial Case

用于测试 Planner 是否会产生“看起来合理但实际上错误”的方案。

例如：

```text
10:00 预约 A
10:20 预约 B
两地交通 45 分钟
```

Planner 必须明确：

```text
无可行解
```

而不是硬生成。

---

# 13. No-solution Case

Benchmark 必须包含：

```text
没有合法方案
```

的输入。

关键指标：

```text
False Feasible Rate
```

即系统错误声称“有可执行方案”的比例。

目标应极低。

---

# 14. Dataset 分层

建议：

```text
smoke
core
extended
stress
golden
```

---

# 15. Smoke Suite

少量快速测试。

每次 PR / CI 执行。

覆盖：

- Validator
- 基础 Planner
- 基础 Ranking
- 核心 Change Set

目标：

```text
几分钟内完成
```

---

# 16. Core Suite

中等规模。

每次主要 Planner PR 执行。

覆盖：

- 主要城市
- 主要用户类型
- 常见 Replan

---

# 17. Extended Suite

Nightly。

覆盖更多：

- 城市
- 季节
- 天气
- 用户偏好
- 边界情况
- 多日行程

---

# 18. Stress Suite

测试：

```text
大量 POI
长行程
多 Hard Constraints
复杂实时状态
高候选数量
```

主要关注性能与退化。

---

# 19. Golden Suite

Release 前必须运行。

由人工审核与稳定历史结果构成。

任何重大变化需人工复核。

---

# 20. Benchmark 数据冻结

每次 Benchmark Run 必须记录：

```text
benchmark_dataset_version
poi_dataset_version
43d_feature_version
route_data_version
planner_version
validator_version
ranking_version
weight_profile_version
```

否则结果不可比较。

---

# 21. Dynamic Provider 问题

天气、交通等实时 Provider 会变化。

Benchmark 不直接调用实时外部数据。

使用：

```text
Frozen Fixture
```

例如：

```text
weather fixture
transport delay fixture
route fixture
```

保证可重复。

---

# 22. Fixture

建议：

```text
benchmark/fixtures/
  weather/
  transport/
  route/
  booking/
  poi/
```

CI 使用 Mock / Recorded Fixture。

---

# 23. Route Fixture

路线 Benchmark 必须固定：

```text
duration
distance
transfer count
walking
```

避免地图 Provider 数据每天变化导致误判 Regression。

---

# 24. Evaluation Metric 结构

```ts
interface PlannerEvaluationMetric {
  metricKey: string;

  value: number;

  direction:
    | "higher_is_better"
    | "lower_is_better";

  hardGate: boolean;

  threshold?: number;

  baselineValue?: number;

  delta?: number;
}
```

---

# 25. Hard Gate Metrics

第一阶段建议：

```text
hard_constraint_violation_rate
reservation_conflict_rate
closed_poi_rate
min_duration_violation_rate
transfer_infeasible_rate
time_overlap_rate
false_feasible_rate
invalid_change_set_rate
```

---

# 26. Hard Gate 原则

任何核心 Hard Gate 出现非预期 Regression：

```text
CI Fail
```

不能用：

```text
平均体验分提高
```

抵消。

---

# 27. Feasibility Rate

```text
valid generated plans
/
cases where valid solution exists
```

高是好事。

但必须与：

```text
false_feasible_rate
```

一起看。

---

# 28. False Feasible Rate

最危险指标之一：

```text
系统声称可执行
但 Validator / Ground Truth 判定不可执行
```

必须接近 0。

---

# 29. False No-solution Rate

系统说：

```text
无解
```

但实际 Benchmark 存在合法方案。

需要监控。

---

# 30. Preference Match Score

从 Recommendation Engine 输出聚合。

比较：

```text
baseline vs candidate
```

不是追求绝对 10 分。

---

# 31. Duration Quality

衡量：

```text
planned duration / recommended duration
```

同时确保：

```text
>= minimum duration
```

---

# 32. Geographic Efficiency

建议指标：

```text
total_transfer_distance
backtracking_ratio
cross_area_jump_count
route_compactness
```

---

# 33. Walking

指标：

```text
walking_distance_total
walking_minutes
walking_load_score
```

按用户 Profile 分桶分析。

---

# 34. Fatigue

使用 Fatigue Engine 输出：

```text
peak_fatigue
end_of_day_fatigue
fatigue_over_threshold_minutes
```

---

# 35. Reservation Protection

指标：

```text
reservation_safe_rate
reservation_buffer_minutes
late_risk_rate
```

---

# 36. Buffer Quality

衡量：

```text
too_tight_rate
reasonable_buffer_rate
excessive_idle_time
```

---

# 37. Cost

```text
trip_cost_estimate
incremental_cost
unexpected_cost_rate
```

对于 realtime：

```text
replan_cost_delta
```

特别重要。

---

# 38. Change Magnitude

Realtime Replan：

```text
moved_items
removed_items
replaced_items
time_shift_minutes
transport_changes
```

---

# 39. Unnecessary Change Rate

定义：

```text
Impact Analysis 判断无需 Replan
但 Planner 仍修改行程
```

比例。

这是实时系统的重要 Regression 指标。

---

# 40. Candidate Churn

同一输入在小版本变化后：

```text
Preferred Candidate 大幅改变
```

需监控。

不意味着一定失败，但需要解释。

---

# 41. Ranking Stability

固定 Candidates 时：

```text
Ranking Engine 升级
```

应对比：

```text
rank order
preferred candidate
score delta
```

---

# 42. Preferred Candidate Flip

如果新版本把 Preferred 从 A 改成 B：

必须记录：

```text
why
metric improvement
trade-off change
```

Golden Case 中可能需要人工 Review。

---

# 43. Ranking Accuracy

如果 Benchmark 有人工标注：

```text
acceptable candidates
preferred family
```

可计算：

```text
top1 agreement
top3 acceptable rate
```

但不要把人工偏好视为唯一绝对真值。

---

# 44. Pareto Regression

如果新 Preferred Candidate 被旧 Candidate 在：

```text
time
cost
walking
experience
```

上全面支配：

属于明显异常。

---

# 45. Explanation Evaluation

Explanation 也要测试：

- Reason Code 是否存在
- Evidence 是否匹配
- 是否引用未提供事实
- 是否正确解释 Trade-off

不对“文风”做过度严格 Golden Text 比对。

---

# 46. Explanation Hallucination Rate

结构化验证：

```text
explanation claims
```

必须能映射到：

```text
reason code / evidence
```

否则失败。

---

# 47. Realtime Evaluation

实时 Benchmark 输入：

```text
base trip
+
current progress
+
event
```

输出：

```text
impact
replan level
change set
ranking
```

---

# 48. Delay Scenarios

至少覆盖：

```text
+5m
+15m
+30m
+60m
```

以及：

```text
有 buffer
无 buffer
有预约
无预约
```

---

# 49. Transport Scenarios

```text
minor delay
major delay
partial suspension
full suspension
missed connection
last train risk
```

---

# 50. Weather Scenarios

```text
light rain
heavy rain
heat
snow
typhoon-level disruption
```

Benchmark 重点测试：

```text
outdoor substitution
indoor fallback
scope escalation
```

---

# 51. Closure Scenario

POI Closure：

系统必须：

```text
不再安排关闭 POI
```

并尽量局部替代。

---

# 52. Reservation Scenario

固定预约前延误：

验证：

```text
reservation protected
latest_safe_departure
optional item removal
```

---

# 53. Multi-day Scenario

高影响异常测试：

```text
cross-city train cancelled
hotel unavailable
```

重点验证：

```text
是否正确升级到 multi_day
```

而不是局部微调。

---

# 54. Benchmark Runner

建议：

```ts
interface PlannerBenchmarkRunner {
  runCase(
    benchmarkCase: PlannerBenchmarkCase,
    systemVersion: PlannerSystemVersion
  ): Promise<PlannerBenchmarkResult>;
}
```

---

# 55. Benchmark Result

```ts
interface PlannerBenchmarkResult {
  runId: string;
  caseId: string;

  plannerVersion: string;

  success: boolean;

  metrics: Record<string, number>;

  hardGateFailures: string[];

  preferredCandidateId?: string;

  artifacts: {
    candidates?: unknown;
    changeSets?: unknown;
    validation?: unknown;
    ranking?: unknown;
  };

  latencyMs: number;
}
```

---

# 56. Baseline

每次 Regression 比较：

```text
Candidate Version
vs
Approved Baseline
```

Baseline 不一定等于 develop 最新 commit。

建议显式记录：

```text
planner_baseline_version
```

---

# 57. Baseline 更新

只有：

```text
Benchmark Gate Passed
+
Human Review for major changes
```

后才能更新 Baseline。

防止：

```text
把 Regression 直接固化成新 Baseline
```

---

# 58. Regression Delta

每个 Metric：

```text
candidate - baseline
```

再按方向解释：

```text
higher_is_better
lower_is_better
```

---

# 59. Relative Threshold

例如：

```text
walking +2%
```

可能可接受。

```text
walking +25%
```

需要 Fail / Review。

建议同时支持：

```text
absolute threshold
relative threshold
```

---

# 60. Segment Evaluation

平均值可能掩盖某类用户变差。

必须按 Segment 看：

```text
family
senior
couple
solo

walking_sensitive
budget_sensitive
first_visit
repeat_visit

Tokyo
Kyoto
Osaka
rural
```

---

# 61. Worst-case Metric

除了平均值，还看：

```text
p10 quality
worst 5% cases
max walking regression
max reservation buffer regression
```

避免少数用户严重变差。

---

# 62. Quality Gate Levels

建议三层：

```text
PR Gate
Nightly Gate
Release Gate
```

---

# 63. PR Gate

快速。

必须：

- Smoke Suite Pass
- Hard Gate 0 Regression
- 基础 latency 不超阈值
- Ranking Schema / Version 正常
- Change Set Valid

---

# 64. Nightly Gate

运行：

```text
Core + Extended + Stress
```

检查：

- 质量均值
- Segment Regression
- Stability
- Performance
- Cost

---

# 65. Release Gate

运行：

```text
Golden + Extended + Stress
```

要求：

- 无 Hard Gate Regression
- 主要质量指标不低于门槛
- Golden Case 重大 Candidate Flip 已审核
- Performance / Cost 在预算内

---

# 66. Gate Result

统一：

```ts
type QualityGateResult =
  | "pass"
  | "pass_with_warning"
  | "review_required"
  | "fail";
```

---

# 67. Fail

以下直接 Fail：

```text
Hard Constraint Regression
False Feasible Regression
Invalid Change Set execution risk
Reservation protection broken
Critical validator failure
```

---

# 68. Review Required

例如：

```text
Preferred Candidate 在多个 Golden Case 发生明显变化
平均体验提高但 Walking 显著增加
Cost 提升明显
```

需要人工决定是否接受 Trade-off。

---

# 69. Warning

轻微：

```text
latency +4%
cost +3%
```

但仍在预算内。

可：

```text
pass_with_warning
```

---

# 70. Version Matrix

每次 Benchmark 必须记录：

```text
planner_version
validator_version
ranking_version
feature_version
weight_profile_version
poi_data_version
43d_data_version
benchmark_version
```

---

# 71. Reproducibility

Benchmark 必须能通过：

```text
case_id + version matrix
```

重新运行并得到相近/一致结果。

---

# 72. Determinism

确定性模块：

```text
Validator
Ranking
Feature Normalizer
```

应尽量完全 deterministic。

---

# 73. LLM Non-determinism

AI Explanation 不进入核心 Planner Pass/Fail。

只测试：

```text
事实一致
Reason Code 覆盖
无越界
```

不要要求自然语言逐字一致。

---

# 74. Random Seed

若 Planner 使用随机搜索/启发式：

Benchmark 固定：

```text
seed
```

同时 Nightly 可增加多 Seed 稳定性测试。

---

# 75. Planner Search Stability

如果不同 Seed 输出完全不同：

需要监控：

```text
solution variance
quality variance
```

---

# 76. Performance Budget

建议每类场景设预算：

```text
simple initial plan
complex initial plan
local replan
day replan
multi_day replan
```

分别定义 p95。

不要用一个 latency 阈值覆盖全部。

---

# 77. Cost Budget

类似：

```text
AI explanation cost
route calls
candidate generation compute
external provider calls
```

设置每案例 Budget。

---

# 78. Tool Call Budget

Benchmark 检查：

```text
route calls
weather calls
transport calls
LLM calls
```

同样结果若 Tool Call 暴增，应判定成本 Regression。

---

# 79. Cache-independent Test

部分 Benchmark 必须：

```text
cold cache
```

避免全部靠缓存掩盖实际性能。

另设：

```text
warm cache
```

测试常规表现。

---

# 80. Dataset Leakage

未来若使用训练/学习 Ranking：

Golden / Evaluation Dataset 必须避免直接用于模型拟合后的自我评分。

需保留：

```text
holdout set
```

---

# 81. Human Review

Human Review 重点不是“我喜欢哪个”。

应审核：

- Hard Constraint 是否正确
- Trade-off 是否合理
- 候选是否有明显反常
- Explanation 是否忠于 Evidence
- User Segment 是否受损

---

# 82. Review UI

未来内部工具可显示：

```text
Baseline Plan
vs
Candidate Plan

Metrics Delta
Candidate Ranking
Trade-off
Change Set Diff
```

便于快速审核。

---

# 83. Benchmark Artifacts

每次失败保留：

```text
input snapshot
candidate plans
validator output
ranking
change sets
metric report
trace id
```

---

# 84. Failure Triage

Regression 自动归类：

```text
validator
planner_generation
ranking
feature_data
route_fixture
performance
cost
explanation
```

---

# 85. Data Regression

Planner 代码没改，也可能因为：

```text
POI 43维数据
营业时间
POI duration
route data
```

变化导致质量退化。

因此 Data Version 也必须进入 Benchmark。

---

# 86. 43D Regression

当 43维数据更新时专门检查：

```text
top recommended POIs
candidate preference match
iconic / hidden balance
segment consistency
```

---

# 87. POI Duration Regression

POI 最小/推荐时长改变时：

检查：

```text
planner feasibility
daily POI count
fatigue
reservation buffer
```

---

# 88. Ranking Weight Regression

Weight Profile 修改时必须专门运行：

```text
ranking benchmark
```

避免：

```text
walking 权重提高
→ 所有行程过度保守
```

---

# 89. Realtime Stability Gate

Realtime 版本升级要额外检查：

```text
unnecessary_change_rate
change_set_size
reservation_protection
replan_level_escalation_rate
```

---

# 90. Escalation Regression

例如旧版本：

```text
local replan
```

新版本大量变成：

```text
day replan
```

需要报警。

---

# 91. Notification Side Effect

Realtime Planner Benchmark 也要检查：

```text
would_notify
severity
```

避免 Planner 变化导致 Notification Spam。

---

# 92. Benchmark Storage

建议表：

```text
planner_benchmark_cases
planner_benchmark_runs
planner_benchmark_results
planner_metric_results
planner_regression_reports
planner_quality_gate_results
```

---

# 93. planner_benchmark_runs

字段：

```text
id
benchmark_version
system_version
baseline_version
suite
status
started_at
completed_at
git_sha
trace_id
```

---

# 94. planner_metric_results

```text
run_id
case_id
metric_key
value
baseline_value
delta
threshold
status
```

---

# 95. Regression Report

统一输出：

```text
Summary
Hard Gate Failures
Quality Improvements
Quality Regressions
Segment Regressions
Performance
Cost
Candidate Flips
Recommended Review Cases
```

---

# 96. CI Integration

建议：

```text
npm run planner:benchmark:smoke
npm run planner:benchmark:core
npm run planner:benchmark:golden
```

以及：

```text
npm run planner:regression
```

---

# 97. PR Comment

未来 CI 可在 PR 自动输出：

```text
Planner Benchmark

Hard Gates: PASS
Preference Match: +1.8%
Walking: -3.4%
Fatigue: -1.2%
p95 Latency: +4.5%
Cost: +2.0%

Golden candidate flips: 2
Review required: Yes
```

---

# 98. Nightly Trend

Nightly 保存趋势：

```text
7d
30d
90d
```

监控 Planner 是否长期慢慢退化。

---

# 99. Flaky Benchmark

Benchmark 自己不稳定也需要管理。

若同一版本重复运行变化很大：

```text
BENCHMARK_FLAKY
```

不能把结果拿来做严格 Gate。

---

# 100. Golden Case Governance

Golden Case 修改必须：

- 有理由
- 有版本
- 有 Reviewer
- 有变更记录

禁止为了让 CI 通过而随意修改预期。

---

# 101. First-stage v1

首批 Benchmark 建议至少：

```text
30 smoke cases
100 core cases
20 golden cases
```

覆盖：

```text
Tokyo
Kyoto
Osaka
Hakone / Fuji area
```

场景：

```text
initial
delay
weather
transport
reservation
walking-sensitive
senior
family
must_keep
```

数量后续扩展。

---

# 102. v2

扩展：

```text
300+ cases
seasonal cases
rural transport
multi-day
hotel anchors
group preferences
crowd
price / budget
```

---

# 103. v3

增加：

```text
production replay
shadow planner
counterfactual evaluation
learned ranking evaluation
automated anomaly clustering
```

---

# 104. Shadow Planner

未来上线新 Planner 前可：

```text
旧 Planner 服务真实用户
新 Planner Shadow Run
```

不影响用户，只比较：

```text
candidate
metrics
latency
cost
```

---

# 105. Production Replay

使用脱敏、结构化历史 Scenario：

```text
输入 Replay
```

而不是直接保存全部私人对话。

---

# 106. Release Acceptance Gate

Planner 版本进入生产前至少要求：

```text
Smoke PASS
Core PASS
Golden PASS / Reviewed
No Hard Gate Regression
No critical segment regression
Latency within budget
Cost within budget
Version metadata complete
```

---

# 107. 最终冻结原则

> Planner 的质量不能依赖人工随便点几条行程判断。

> Correctness 是硬门槛，体验评分不能抵消不可执行方案。

> Benchmark 输入、数据、Fixture、权重和版本必须被冻结，才能做真实回归比较。

> 不只看平均分，也必须看 Segment、Worst Case、Candidate Churn 与 Replan Stability。

> Realtime Planner 的核心目标之一是“少而必要地修改”，因此 Unnecessary Change Rate 必须成为正式指标。

> Explanation 的事实性需要测试，但自然语言本身不作为 Planner 核心 Golden Output。

> 所有 Planner、Validator、Ranking、43维数据、POI duration 和 Weight Profile 变更都应进入同一 Regression Framework。

> 每次重大升级都必须能够回答：比上一版哪里更好、哪里变差、是否值得接受这个 Trade-off。
