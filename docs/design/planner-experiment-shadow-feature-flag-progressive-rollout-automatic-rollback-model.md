# TravelAssist — Planner Experiment / Shadow / Feature Flag / Progressive Rollout / Automatic Rollback Model

> 状态：建议冻结为 Planner 安全发布与实验治理 v1  
> 适用范围：Planner Engine、Planner Validator、Candidate Ranking、Weight Profile、43维推荐接入、Realtime Replan、AI Orchestrator  
> 上游依赖：
> - Planner Evaluation / Benchmark / Regression Gate Model
> - Planner Decision / Candidate Ranking / Trade-off & Explanation Model
> - Realtime Impact Analysis / Replan Policy / Change Set Model
> - Event Bus / Background Worker / Audit
>
> 核心目标：
> - 让 Planner 新版本从测试环境进入生产时具备可控的渐进式发布流程
> - 将“实验”“灰度”“功能开关”“版本选择”“自动回滚”统一到同一治理模型
> - 支持 Shadow Run：新 Planner 在真实流量上计算，但不影响用户
> - 支持按用户、Trip、地区、场景、版本进行稳定分桶
> - 所有 Rollout 都必须有质量指标、停止条件和回滚路径
> - Hard Gate 异常优先于增长或体验指标
> - 实验不得让同一个 Trip 在处理中途随机切换 Planner 版本

---

# 1. 总体发布链路

```text
Code / Data / Weight Change
        ↓
Offline Benchmark
        ↓
CI Quality Gate
        ↓
Staging
        ↓
Shadow
        ↓
Internal / Allowlist
        ↓
1%
        ↓
5%
        ↓
10%
        ↓
25%
        ↓
50%
        ↓
100%
```

任意阶段出现异常：

```text
Pause
↓
Rollback
↓
Baseline Planner
```

---

# 2. 五个核心模块

```text
Experiment Registry
Feature Flag Service
Version Router
Progressive Rollout Controller
Automatic Rollback Controller
```

---

# 3. Experiment Registry

负责：

- 实验定义
- 假设
- 对照组 / 实验组
- Target Population
- 分桶
- Metrics
- Guardrail
- 开始 / 结束
- 结果
- 决策记录

---

# 4. Feature Flag Service

负责：

```text
某个功能 / Planner Version 当前是否允许启用
```

典型 Flag：

```text
planner.v2.enabled
planner.ranking.v3.enabled
planner.realtime_replan.v2.enabled
planner.new_fatigue_model.enabled
planner.weather_substitution.v2.enabled
```

---

# 5. Version Router

负责：

```text
这个请求最终应该使用哪一版 Planner / Validator / Ranking / Weight
```

不能让页面自己决定。

---

# 6. Progressive Rollout Controller

负责：

```text
Shadow → 1% → 5% → 10% → 25% → 50% → 100%
```

以及：

- 是否允许升档
- 是否暂停
- 是否回退

---

# 7. Automatic Rollback Controller

负责监控 Guardrail。

当触发明确阈值时：

```text
自动阻止新流量
或
回到 Approved Baseline
```

---

# 8. Planner Release Bundle

Planner 不应只用一个版本号。

建议定义完整 Bundle：

```ts
interface PlannerReleaseBundle {
  bundleId: string;
  version: string;

  plannerVersion: string;
  validatorVersion: string;
  rankingVersion: string;
  featureVersion: string;
  weightProfileVersion: string;

  promptVersion?: string;
  toolsetVersion?: string;

  poiDataCompatibility?: string;
  featureDataCompatibility?: string;

  createdAt: string;
}
```

---

# 9. 为什么需要 Bundle

如果只记录：

```text
planner=v2
```

但：

```text
Validator
Ranking
Weight
43D Feature
```

已经变化，则无法复现。

因此生产请求必须能够知道：

```text
完整 Release Bundle
```

---

# 10. Approved Baseline

任何时间必须存在：

```text
approved_baseline_bundle
```

它是：

- 回滚目标
- Shadow 对照组
- Regression Comparison Base

不得把“最新版本”自动等同于 Baseline。

---

# 11. Feature Flag 类型

```ts
type FeatureFlagType =
  | "boolean"
  | "percentage"
  | "variant"
  | "kill_switch";
```

---

# 12. Boolean / Percentage / Variant / Kill Switch

Boolean：控制功能开关。

Percentage：控制灰度比例。

Variant：控制 A/B 版本。

Kill Switch：最高优先级紧急关闭。

例如：

```text
planner.bundle.v2.rollout = 10%
planner.v2.kill_switch = true
```

---

# 13. Flag Evaluation Context

```ts
interface FlagEvaluationContext {
  userId: string;
  tripId?: string;
  country?: string;
  region?: string;
  clientVersion?: string;
  subscriptionPlan?: string;
  tripState?: string;
  environment: string;
}
```

Feature Flag 必须由服务端确定性判断，禁止让 AI 决定是否启用新版。

---

# 14. Stable Bucketing

实验分桶建议：

```text
hash(experiment_id + stable_subject_id)
```

Planner 场景优先以 `trip_id` 为稳定主体。

这样一个 Trip 不会在不同请求之间随机切换 A/B。

---

# 15. User vs Trip Bucketing

```text
Trip-specific Planner Experiment
→ trip_id

跨 Trip 的长期用户体验实验
→ user_id
```

必须在 Experiment Definition 中明确。

---

# 16. Version Stickiness

Trip 一旦分配到某 Bundle：

```text
assigned_bundle_id
```

正常情况下后续继续使用该 Bundle。

旅行进行中尤其禁止无理由切换 Planner / Ranking。

例外：

- Emergency rollback
- Bundle 被 Kill Switch 禁用
- 明确兼容迁移

---

# 17. Shadow Mode

```text
Baseline Planner
→ 用户真实结果

Candidate Planner
→ 同一 Request Snapshot 并行计算
→ 不影响用户
```

Shadow 用于验证：

- Feasibility
- Candidate Difference
- Ranking Difference
- Replan Scope
- Latency
- Cost
- Error Rate
- Tool Usage

---

# 18. Shadow 禁止副作用

Shadow Planner 禁止：

- Action Router
- Trip Mutation
- Notification
- Booking
- External Message
- 用户可见 Proposal

Shadow 结果只进入实验与质量分析。

---

# 19. Shadow Request Snapshot

建议固定：

```text
trip_version
realtime_state_version
context_profile
user_preference_version
poi_data_version
weather_snapshot_id
transport_snapshot_id
```

保证 Baseline 和 Candidate 输入一致。

---

# 20. Shadow Output

记录：

```text
candidate set
preferred candidate
change set
validator result
ranking
latency
tool calls
estimated cost
```

---

# 21. Shadow Diff

比较：

```text
Baseline
vs
Candidate
```

核心维度：

```text
hard gate
quality
change magnitude
preferred candidate
latency
cost
```

---

# 22. Shadow Budget

Shadow 本身也有成本。

必须设置：

```text
sample rate
max requests
max daily compute
max API cost
```

Shadow 不计入用户 AI 使用额度，应计入内部 Experiment Cost。

---

# 23. Internal Allowlist

Shadow 通过后，先给：

```text
internal users
test accounts
team allowlist
```

真实使用 Candidate Result。

---

# 24. Rollout Stages

默认建议：

```text
shadow
internal
1%
5%
10%
25%
50%
100%
```

每一阶段都必须有 Gate，不只是等待时间。

---

# 25. Rollout Stage Model

```ts
interface RolloutStage {
  name: string;
  trafficPercent: number;
  minimumSampleSize?: number;
  minimumDurationMinutes?: number;
  promotionCriteria: string[];
  rollbackCriteria: string[];
}
```

---

# 26. Promotion Criteria

升档至少同时考虑：

```text
minimum sample
minimum duration
correctness guardrail
reliability guardrail
quality
latency
cost
```

避免“跑了一个小时没出错就直接 100%”。

---

# 27. Guardrail Types

统一：

```text
Correctness Guardrail
Reliability Guardrail
Performance Guardrail
Cost Guardrail
```

体验/质量指标主要作为 Promotion Signal。

---

# 28. Correctness Guardrail

最高优先级：

```text
hard_constraint_violation_rate
false_feasible_rate
reservation_conflict_rate
invalid_change_set_rate
```

出现严重 Regression 可立即自动回滚。

---

# 29. Reliability Guardrail

```text
planner_error_rate
timeout_rate
validator_failure_rate
tool_failure_rate
unknown_execution_trigger_rate
```

---

# 30. Performance Guardrail

```text
p95 latency
p99 latency
queue lag
tool call count
```

---

# 31. Cost Guardrail

```text
cost per plan
cost per replan
LLM tokens
route API calls
transport API calls
```

---

# 32. Quality Promotion Signal

例如：

```text
preference_match
walking
fatigue
disruption
reservation_buffer
candidate_accept_rate
unnecessary_change_rate
```

质量 Trade-off 不一定自动回滚，有些情况需要人工 Review。

---

# 33. Hard Rollback vs Soft Pause

## Hard Rollback

用于严重 Correctness / Reliability 异常：

```text
立即切回 Approved Baseline
```

## Soft Pause

停止继续扩大流量，但暂时维持当前阶段等待 Review。

---

# 34. Hard Rollback 条件

例如：

```text
False Feasible 超过 Critical Threshold
出现预约冲突
Invalid Change Set 接近执行边界
Planner Fatal Error 激增
```

---

# 35. Soft Pause 条件

例如：

```text
Walking +12%
Cost +10%
Candidate Acceptance 下滑
p95 latency 接近预算上限
Notification Rate 明显增加
```

---

# 36. Automatic Rollback

自动回滚必须使用预先声明的确定性规则。

禁止：

```text
让 AI / LLM 决定是否回滚生产 Planner
```

---

# 37. Rollback Target

默认回到：

```text
approved_baseline_bundle
```

而不是“前一个刚部署版本”。

---

# 38. Rollback Scope

支持：

```text
global
region
experiment
feature
planner_bundle
realtime_only
```

可以只关闭出现故障的能力。

---

# 39. Existing Trip Rollback

紧急回滚只影响后续 Planner 请求。

已经：

```text
用户确认
+
执行完成
```

的 Trip Change 不自动撤销。

---

# 40. Change Set Compatibility

Change Set 应记录：

```text
planner_bundle_id
```

执行时仍需验证：

```text
Trip Version
Schema Compatibility
Validator Compatibility
Critical Preconditions
```

---

# 41. Feature Flag Priority

建议：

```text
Kill Switch
>
Safety Override
>
Environment Override
>
Explicit Allowlist
>
Experiment Assignment
>
Percentage Rollout
>
Default
```

---

# 42. Safety Override

例如交通 Provider 故障时可只关闭：

```text
realtime.transport_replan
```

而不是关闭整个 Planner。

---

# 43. Experiment Model

```ts
interface PlannerExperiment {
  experimentId: string;
  version: string;
  hypothesis: string;

  status:
    | "draft"
    | "shadow"
    | "running"
    | "paused"
    | "completed"
    | "rolled_back";

  subjectType: "user" | "trip";

  controlBundleId: string;
  treatmentBundleIds: string[];

  allocation: Record<string, number>;

  metricProfile: string;
  guardrailProfile: string;

  startedAt?: string;
  endedAt?: string;
}
```

---

# 44. Experiment Hypothesis

必须提前写明：

```text
为什么做
预期改善什么
不能破坏什么
```

例如：

```text
realtime_conservative_v2
预计在 reservation_safe_rate 不下降的前提下，
把 unnecessary_change_rate 降低 15%。
```

---

# 45. Experiment 必须定义

```text
Primary Metric
Secondary Metrics
Guardrails
Stop Conditions
```

不要把所有指标都称为 Primary。

---

# 46. Guardrail 优先

即使 Primary Metric 大幅改善，只要 Safety / Correctness Guardrail 失败：

```text
不能判为成功
```

---

# 47. Experiment Assignment

建议表：

```text
planner_experiment_assignments
```

字段：

```text
experiment_id
subject_type
subject_id
variant
bundle_id
assigned_at
expires_at
```

建议持久化 Assignment，便于稳定体验、Audit 和 Debug。

---

# 48. Exposure

只有 Treatment 真正参与了用户结果时记录：

```text
experiment.exposed
```

仅分桶但没有进入相关功能，不算 Exposure。

---

# 49. Exposure Audit

记录：

```text
experiment_id
variant
bundle_id
user_id / trip_id
planner_run_id
occurred_at
```

---

# 50. Metric Attribution

指标链：

```text
Exposure
→ Planner Run
→ Candidate
→ User Selection / Outcome
```

必须有稳定关联。

---

# 51. Experiment Mutex

同一 Trip 不应同时进入互相干扰的实验。

建议：

```text
experiment_mutex_group
```

例如同一时间只允许一个 Ranking Experiment。

---

# 52. Feature Dependencies

Flag 可声明：

```text
planner.ranking.v3
requires
planner.feature_vector.v2
```

不兼容组合必须在路由阶段拒绝。

---

# 53. Compatibility Matrix

建议维护：

```text
Planner ↔ Validator
Planner ↔ Ranking
Ranking ↔ Feature Version
Bundle ↔ Trip Schema
Bundle ↔ Toolset
```

---

# 54. Data / Weight Rollout

以下都属于生产行为变化：

```text
43D Dataset
POI Duration Dataset
Weight Profile
Threshold
Replan Policy
Trigger Policy
Ranking Profile
```

都必须：

```text
Version
→ Shadow / Benchmark
→ Rollout
→ Rollback
```

禁止无版本热改。

---

# 55. Rollout Registry

建议表：

```text
planner_rollouts
```

字段：

```text
id
bundle_id
environment
stage
traffic_percent
status

baseline_bundle_id

started_at
promoted_at
paused_at
rolled_back_at

created_by
reason
```

---

# 56. Feature Flag Registry

建议：

```text
feature_flags
feature_flag_versions
feature_flag_rules
```

Flag 修改不能原地覆盖历史版本。

---

# 57. Planner Run Metadata

每次生产 Planner Run 应记录：

```text
bundle_id
rollout_id
experiment_id
variant
flag_snapshot_hash
```

保证可以回答：

```text
这个用户当时到底跑的是哪一套算法？
```

---

# 58. Rollback Event

回滚产生 Domain Event：

```text
planner.rollout.rolled_back
```

用于：

- Audit
- Operations
- Dashboard
- 内部告警

---

# 59. Automatic Rollback State

```text
healthy
↓
warning
↓
paused
↓
rolling_back
↓
rolled_back
```

回滚后默认：

```text
manual_review_required
```

---

# 60. Flapping Protection

禁止：

```text
异常 → rollback
恢复几分钟 → 自动开启
再次异常 → rollback
```

同一 Bundle 回滚后应进入：

```text
cooldown
```

重新上线需要 Review / 新 Rollout。

---

# 61. Emergency Kill Switch

必须不依赖代码重新部署。

例如：

```text
planner.realtime_replan.enabled = false
```

应可快速生效。

---

# 62. Flag Service Failure

高风险功能默认：

```text
fail closed
```

基础 Planner：

```text
fallback to Approved Baseline configuration
```

---

# 63. Deployment 与 Rollout 分离

允许：

```text
code deployed
feature disabled
```

部署后再逐步打开 Flag。

这使回滚不必每次重建应用。

---

# 64. DB Migration Compatibility

Planner 新 Bundle 如果依赖数据库变更：

必须保证 Rollout 期间旧 Baseline 仍可工作。

推荐：

```text
Expand
→ Migrate
→ Rollout
→ Contract
```

---

# 65. Expand / Contract

先添加向后兼容字段。

待新版 100% 稳定后，再删除旧字段。

禁止先删旧 Schema 导致 Baseline 无法回滚。

---

# 66. API / Tool Compatibility

新 Planner 依赖的新 Tool API 也必须在 Rollout 期间兼容旧 Bundle。

---

# 67. Realtime Experiment Guardrails

实时系统额外监控：

```text
notification_rate
unnecessary_replan_rate
change_set_size
replan_level_escalation_rate
auto_optimize_action_rate
reservation_at_risk_rate
```

---

# 68. Notification Spam Gate

如果新版导致：

```text
notifications per active trip
```

明显增加，即使 Planner Correctness 正常，也可以暂停 Rollout。

---

# 69. Auto-optimize Boundary

实验不能偷偷扩大：

```text
auto action risk ceiling
```

除非这是一个独立、明确审批的安全实验。

---

# 70. Experiment Result

```ts
interface ExperimentResult {
  experimentId: string;

  controlMetrics: Record<string, number>;
  treatmentMetrics: Record<string, number>;

  guardrailStatus:
    | "pass"
    | "warning"
    | "fail";

  decision:
    | "promote"
    | "hold"
    | "rollback"
    | "inconclusive";

  decidedAt: string;
}
```

---

# 71. Inconclusive

样本不足时必须允许：

```text
inconclusive
```

不能为了发布进度强行宣布 Treatment 胜出。

---

# 72. Automatic Promotion

v1 不建议全面自动 Promotion。

可以自动计算：

```text
eligible_for_promotion
```

但重大 Planner 版本在关键阶段仍建议人工 Review。

---

# 73. Manual Approval Points

建议至少：

```text
Shadow → Internal
Internal → 1%
25% → 50%
50% → 100%
```

团队成熟后可调整。

---

# 74. Rollback Speed

生产架构目标：

```text
发现 Critical Guardrail
→ Kill Switch / Baseline Routing
```

应尽快完成，且不依赖重新部署。

---

# 75. Experiment UX Boundary

不得为了实验故意让某组用户使用：

```text
已知不可执行
明显低质量
安全性更差
```

的 Planner。

Treatment 必须先通过 Offline Hard Gates。

---

# 76. Shadow 不是 Safety Gate 替代品

只有：

```text
Benchmark Hard Gates PASS
```

才能进入 Shadow。

Shadow 用于真实分布验证，不负责发现最基本的 Validator 错误。

---

# 77. Shadow Privacy

Shadow 使用与真实 Planner 相同的最小 Context Snapshot。

不得为了实验读取更多用户数据。

---

# 78. User Override

用户选择非 Preferred Candidate：

记录为：

```text
selection telemetry
```

但不能简单视为 Treatment “失败”。

它用于后续 Ranking 分析。

---

# 79. Outcome Window

实验必须明确：

```text
什么时候算结果
```

例如：

- Candidate Selection：数分钟
- Realtime Replan：事件后的确定窗口
- Trip Completion：当天/行程结束

---

# 80. Planner Experiment Metrics

建议：

```text
primary_metric
quality_metrics
correctness_guardrails
reliability_guardrails
performance_guardrails
cost_guardrails
```

各自分开存储。

---

# 81. Experiment Dashboard

未来内部面板至少展示：

```text
Approved Baseline
Current Bundle
Rollout Stage
Traffic %
Shadow %
Guardrails
Quality Delta
Latency
Cost
Error Rate
Notification Rate
Rollback State
```

---

# 82. Alerting

至少对：

```text
Hard Gate breach
Error spike
Latency spike
Cost spike
Notification spike
DLQ spike
```

发内部 Alert。

---

# 83. Evaluation Worker

后台 Worker 可负责：

```text
aggregate metrics
evaluate promotion criteria
evaluate rollback criteria
```

但执行 Rollback 的 Policy 必须是确定性的。

---

# 84. Audit Events

建议：

```text
planner.experiment.created
planner.experiment.started
planner.experiment.paused
planner.experiment.completed

planner.rollout.started
planner.rollout.promoted
planner.rollout.paused
planner.rollout.rolled_back

planner.baseline.updated

planner.flag.updated
planner.kill_switch.activated
```

---

# 85. Baseline Change Audit

切换 Approved Baseline 必须记录：

```text
old_bundle
new_bundle
benchmark_result
rollout_result
approved_by
reason
```

---

# 86. Immutability

已经使用过的：

```text
Bundle Version
Experiment Version
Weight Profile Version
Flag Version
```

禁止原地修改。

变化创建新版本。

---

# 87. First-stage v1

先实现：

```text
Planner Release Bundle
Approved Baseline

Boolean Flag
Percentage Flag
Kill Switch

Stable Trip Bucketing
Version Stickiness

Shadow Run

1% / 10% / 50% / 100% Rollout

Correctness / Error / Latency Guardrails

Manual Pause
Manual Rollback
Automatic Hard Rollback

Audit
```

---

# 88. v2

增加：

```text
Variant Experiment
Metric Attribution
Experiment Mutex
Data / Weight Rollout
Notification Guardrail
Cost-aware Rollout
Internal Dashboard
```

---

# 89. v3

增加：

```text
statistical experiment analysis
automatic promotion
multi-region rollout
contextual experiments
adaptive rollout velocity
advanced shadow replay
```

---

# 90. Shadow 验收 Gate

必须满足：

- Treatment 不影响用户结果
- Treatment 不产生 Action
- Baseline / Candidate 使用同一 Request Snapshot
- 可对比 Validator / Ranking / Latency / Cost
- Shadow 有预算
- Shadow Run 可审计

---

# 91. Feature Flag 验收 Gate

必须满足：

- 服务端判定
- Kill Switch
- Stable Bucketing
- Trip Version Stickiness
- Flag Versioning
- 关键 Flag 修改有 Audit
- Flag Service 故障有明确 Fallback

---

# 92. Progressive Rollout 验收 Gate

必须满足：

- 存在 Approved Baseline
- 阶段化流量
- Minimum Sample
- Minimum Duration
- Promotion Criteria
- Rollback Criteria
- Hard Guardrail 优先
- 支持 Pause / Rollback
- 回滚不依赖重新部署

---

# 93. Automatic Rollback 验收 Gate

必须满足：

- 规则预先声明
- 不由 AI 决策
- Critical Correctness Regression 可自动回滚
- 回滚目标明确
- 防止 Flapping
- Rollback 后 Cooldown / Review
- 完整 Audit Event

---

# 94. Experiment 验收 Gate

必须满足：

- Treatment 已通过 Offline Hard Gate
- Hypothesis 明确
- Primary Metric 明确
- Guardrail 明确
- Stable Assignment
- Exposure 正确记录
- 允许 Inconclusive
- Experiment 不突破安全边界

---

# 95. 与完整 Planner 生命周期关系

```text
Design
  ↓
Implementation
  ↓
Offline Benchmark
  ↓
Regression Gate
  ↓
Release Bundle
  ↓
Shadow
  ↓
Experiment / Rollout
  ↓
Guardrail Monitoring
  ↓
Progressive Promotion
  ↓
100%
  ↓
Approved Baseline
```

异常：

```text
Guardrail Breach
↓
Pause / Automatic Rollback
↓
Approved Baseline
↓
Review
```

---

# 96. 最终冻结原则

> 新 Planner “部署成功”不等于“生产上线成功”。

> 所有生产 Planner 行为必须解析到一个完整 Release Bundle。

> Offline Benchmark 是进入 Shadow 的前置条件。

> Shadow 用来验证真实流量分布，但不允许产生用户副作用。

> 同一个 Trip 应保持版本稳定，尤其是在旅行进行中。

> Feature Flag 是服务端控制面，而不是前端 UI 开关。

> Correctness / Safety Guardrail 永远优先于体验指标提升。

> Kill Switch 与 Baseline Rollback 必须不依赖重新部署。

> 自动回滚使用预定义确定性规则，不由 LLM 决定。

> Planner、Validator、Ranking、Weight、43维数据与 Policy 都属于可发布版本的一部分。

> Planner 回滚不会自动撤销已经由用户确认并执行的业务历史。

> 每次生产变化都必须能够回答：谁用了哪个版本、为什么、表现如何、何时升档、为什么回退。
