# TravelAssist — Observability / SLI / SLO / Alert / Incident & Runbook Model

> 状态：建议冻结为生产可观测性与故障治理 v1  
> 适用范围：AI API、Conversation、Planner、Validator、Ranking、Tool Router、Action Router、Execution、Event Bus、Realtime Worker、Notification、Booking / Payment Integration  
> 上游依赖：
> - Planner Experiment / Shadow / Feature Flag / Progressive Rollout / Automatic Rollback Model
> - Planner Evaluation / Benchmark / Regression Gate Model
> - Event Bus / Realtime Trigger / Notification / Background Worker Model
> - Execution Adapter / Transaction / Compensation / Audit Model
> - AI Orchestrator / Tool Router / Context Builder

---

# 1. 目标

本规范用于把 TravelAssist 已经设计完成的 AI、Planner、Tool、Action、Execution、Realtime 与 Notification 接入统一生产监控。

必须能够回答：

- 系统现在是否健康
- 哪个服务或 Provider 出现退化
- 新 Planner Bundle 是否导致 Regression
- 某次用户请求经过了哪些服务
- Booking / Action / Realtime 异常是否影响用户
- 什么时候应该 Alert
- 什么时候应该 Pause / Kill Switch / Rollback
- 事故发生后如何恢复、复盘并形成工程任务

---

# 2. 总体链路

~~~text
Application / Worker / Provider
        ↓
Metrics + Logs + Traces + Domain Events
        ↓
Observability Pipeline
        ↓
Dashboards / SLI
        ↓
SLO / Error Budget
        ↓
Alert
        ↓
Incident
        ↓
Runbook / Mitigation
        ↓
Rollback / Degrade / Recovery
        ↓
Postmortem
        ↓
Engineering Actions
~~~

---

# 3. 四类观测信号

TravelAssist 统一采用：

~~~text
Metrics
Logs
Traces
Events
~~~

职责：

- Metrics：系统整体健康趋势
- Logs：具体发生了什么
- Traces：一次请求经过了什么
- Domain Events：业务状态发生了什么变化

Audit 与 Observability 关联，但不互相替代。

---

# 4. Metrics 原则

Metrics 用于：

- Request Rate
- Error Rate
- Latency
- Queue Depth
- Planner Success
- AI Cost
- Notification Delivery
- Provider Health

禁止将 user_id、trip_id、conversation_id 等高基数字段作为普通 Metric Label。

推荐低基数字段：

~~~text
service
operation
provider
region
bundle
status
environment
~~~

---

# 5. Structured Logs

生产日志建议统一 JSON。

至少包含：

~~~text
timestamp
level
service
environment

trace_id
span_id
correlation_id

request_id
conversation_id
turn_id
trip_id

operation
status
error_code
duration_ms

metadata
~~~

完整 AI 对话正文、精确位置、Secret 不进入普通日志。

---

# 6. Tracing

核心调用链必须可在一个 Trace 中查看：

~~~text
AI API
↓
Context Builder
↓
AI Provider
↓
Tool Router
↓
Planner
↓
Validator
↓
Ranking
↓
Response
~~~

Action 链：

~~~text
Proposal
↓
Action Router
↓
Permission
↓
Confirmation
↓
Execution Adapter
↓
Provider
↓
Postcondition
~~~

Realtime 链：

~~~text
Event
↓
Trigger
↓
Worker
↓
AI / Planner
↓
Notification
~~~

---

# 7. Trace Context

内部服务统一传播：

~~~text
trace_id
span_id
correlation_id
~~~

业务实体可附：

~~~text
conversation_id
turn_id
trip_id
planner_run_id
action_request_id
execution_id
~~~

同一用户事件从 AI → Planner → Action → Worker → Event → Notification 必须可串联。

---

# 8. Service Naming

推荐统一：

~~~text
ai-api
ai-orchestrator
planner
planner-validator
planner-ranking

tool-router
action-router
execution-service

event-worker
realtime-worker
notification-service

booking-adapter
payment-adapter
~~~

---

# 9. SLI / SLO / Error Budget

SLI 表示实际测量值。

SLO 表示服务目标。

例如：

~~~text
Planner Success Rate >= target
Realtime High-Priority Event Latency <= target
Execution Unknown Rate <= target
~~~

具体数值不在设计阶段拍脑袋冻结，应在 Staging / Early Production 收集基线后确定。

Error Budget 直接与 Rollout 联动：

~~~text
Healthy
→ normal rollout

Warning
→ slower rollout

Low
→ freeze risky releases

Exhausted
→ reliability-only changes
~~~

---

# 10. SLO Tier

建议：

## Tier 0

最高关键性：

- Trip read / write consistency
- Confirmed Action consistency
- Booking / Payment state
- Critical realtime event processing

## Tier 1

核心产品：

- Planner
- AI Conversation
- Realtime Replan
- Push Notification

## Tier 2

增强：

- Analytics
- Shadow Planner
- Experiment Telemetry
- Non-critical Summary Worker

Tier 2 故障不得拖垮 Tier 0 / Tier 1。

---

# 11. AI SLI

~~~text
ai_request_success_rate
ai_provider_error_rate
ai_timeout_rate

ai_first_token_latency_ms
ai_total_latency_ms

invalid_structured_response_rate
tool_schema_rejection_rate
ai_tool_loop_limit_rate

ai_input_tokens
ai_output_tokens
ai_cost_per_turn
~~~

---

# 12. Planner SLI

~~~text
planner_success_rate
planner_no_solution_rate

planner_p50_latency
planner_p95_latency
planner_p99_latency

validator_failure_rate
invalid_candidate_rate
ranking_failure_rate
change_set_invalid_rate
~~~

运行时质量指标：

~~~text
unnecessary_replan_rate
replan_escalation_rate
reservation_at_risk_rate
reservation_protection_rate
avg_change_set_size
preferred_candidate_override_rate
~~~

---

# 13. Tool SLI

~~~text
tool_call_success_rate
tool_timeout_rate
tool_validation_failure_rate
tool_p95_latency
tool_cache_hit_rate
tool_provider_error_rate
~~~

应按 tool_name / provider 分组。

---

# 14. Action / Execution SLI

Action：

~~~text
action_confirmation_expired_rate
action_version_conflict_rate
action_idempotency_conflict_rate
action_execution_success_rate
~~~

Execution：

~~~text
execution_success_rate
execution_unknown_rate
postcondition_failure_rate
compensation_rate
compensation_failure_rate
manual_intervention_rate
~~~

execution_unknown_rate 是第三方写操作的重要健康指标。

---

# 15. Event / Worker SLI

Event：

~~~text
event_publish_success_rate
event_consume_success_rate
event_lag_seconds
event_duplicate_rate
dead_letter_rate
~~~

Worker：

~~~text
queue_depth
queue_oldest_job_age
worker_success_rate
worker_retry_rate
worker_dlq_rate
job_p95_latency
~~~

Realtime Queue 单独监控。

---

# 16. Realtime SLI

~~~text
realtime_event_to_decision_latency
realtime_trigger_match_rate
realtime_trigger_suppression_rate
stale_event_skip_rate
proactive_ai_success_rate
realtime_replan_success_rate
~~~

---

# 17. Notification SLI

~~~text
notification_create_success_rate
push_send_success_rate
push_delivery_rate
notification_duplicate_suppression_rate
notification_delivery_latency
notification_failure_rate
~~~

---

# 18. Provider SLI

每个外部 Provider：

~~~text
provider_success_rate
provider_timeout_rate
provider_p95_latency
provider_rate_limit_rate
~~~

分别监控 Weather、Transport、Booking、Payment、Push 等。

---

# 19. Availability 计算

建议：

~~~text
successful eligible requests
/
total eligible requests
~~~

必须区分：

~~~text
user_error
business_rejection
dependency_error
system_error
timeout
unknown
~~~

例如“当前没有满足全部约束的 Planner 方案”属于业务结果，不应当作系统 500。

---

# 20. Latency

统一关注：

~~~text
p50
p95
p99
~~~

并增加用户感知 E2E：

~~~text
request received
→ usable result displayed
~~~

Trace 内拆：

~~~text
context
provider
tool
planner
validator
ranking
persistence
streaming
~~~

---

# 21. Alert 原则

只有需要采取行动的情况才 Alert。

不需要行动的异常进入：

~~~text
Dashboard
Log
Trend
~~~

而不是 Pager。

---

# 22. Alert Severity

## P1

- Trip 核心数据损坏
- Booking / Payment 大范围状态错误
- 高风险 Action 越权
- 大范围不可用
- Critical Realtime 链路严重失效

## P2

- Planner 大规模失败
- AI API 大面积超时
- Event Queue 严重堆积
- Booking Provider 关键故障
- Realtime 高优先 Worker 严重延迟

## P3

- 局部 Provider 退化
- Push Delivery 降低
- 某 Segment Planner Regression
- 成本明显上涨

## P4

- Shadow / Analytics / 趋势类非紧急问题

---

# 23. Alert Rule 类型

支持：

~~~text
threshold
rate-of-change
burn-rate
absence
anomaly
~~~

SLO 优先采用 Error Budget Burn Rate。

建议同时观察 short window + long window，减少瞬间抖动造成误报。

---

# 24. Alert Dedup / Grouping

同一 Provider 故障可能同时导致：

~~~text
execution error
retry spike
queue depth
notification lag
~~~

应聚合为同一个 Incident Root Cause，而不是几十个独立 Pager。

Alert 必须附：

~~~text
service
provider
region
bundle_id
rollout_stage
experiment_id
baseline_bundle_id
~~~

---

# 25. Release-aware Monitoring

Deployment / Rollout Promotion 必须在监控时间轴留下 Release Marker。

例如：

~~~text
bundle_v2 rollout 10%
↓
planner_error_rate starts rising
~~~

可以直接关联版本。

---

# 26. Automatic Mitigation

允许使用预定义确定性动作：

~~~text
Pause Rollout
Activate Kill Switch
Switch Provider
Reduce Shadow Traffic
Disable Non-critical Worker
~~~

禁止 LLM 判断生产事故应该如何处置。

所有自动 Mitigation 必须有 Audit。

---

# 27. Graceful Degradation

AI Provider Down：

~~~text
Trip / Map / Booking / POI / Manual Edit 可继续
Planner deterministic fallback 可继续
AI explanation 暂时关闭
~~~

Weather Provider Down：

~~~text
使用无实时天气模式
降低 Weather Context Confidence
关闭 weather-driven auto replan
~~~

Transport Realtime Down：

~~~text
使用 static route
降低 ETA confidence
关闭高风险自动 Replan
~~~

Planner Down：

~~~text
现有 Trip 可查看
支持手动编辑
地图 / 订单 / 基础 Tool 继续
~~~

Notification Provider Down：

~~~text
In-app 保留
Push 进入 Retry
App 打开后仍展示 Critical 状态
~~~

---

# 28. Incident Model

~~~text
incident_id
severity
status
title

started_at
detected_at
resolved_at

impacted_services
impacted_regions

related_release_bundles
trace_ids
root_cause
~~~

状态：

~~~text
investigating
identified
mitigating
monitoring
resolved
~~~

---

# 29. Incident Lifecycle

~~~text
Detected
↓
Investigating
↓
Identified
↓
Mitigating
↓
Monitoring
↓
Resolved
↓
Postmortem
~~~

P1 / P2 建议设置 Incident Commander。

---

# 30. Incident Timeline

必须记录：

~~~text
fault start
detection
first alert
acknowledgement
first mitigation
rollback
recovery
resolution
~~~

用于：

~~~text
MTTD
MTTA
MTTR
~~~

---

# 31. Runbook Registry

每个 P1 / P2 级核心 Alert 必须绑定 runbook_id。

Runbook 标准：

~~~text
Title
Symptoms
Impact
Immediate Checks
Likely Causes
Safe Mitigations
Rollback Procedure
Verification
Escalation
Related Dashboards
Related Logs / Traces
~~~

---

# 32. Planner Failure Runbook

1. 检查当前 Rollout / Bundle。
2. 与 Approved Baseline 对比。
3. 检查 DB / Tool / Provider。
4. Pause Rollout。
5. 必要时 Kill Switch / Rollback。
6. 验证 Baseline Planner Success Rate。
7. 检查 Queue / Latency。
8. 建立 Incident 与 Timeline。

---

# 33. Event Queue Lag Runbook

1. 检查 Worker 数量。
2. 检查 Poison Message。
3. 检查 Provider Slowdown。
4. 检查 DLQ。
5. 扩容或暂停低优先 Queue。
6. 验证 Critical / Realtime Queue 恢复。

---

# 34. Execution Unknown Spike Runbook

1. 检查 Provider 状态。
2. 停止 Unsafe Retry。
3. 启动 Reconciliation。
4. 检查 Idempotency。
5. 必要时暂停相关 Action。
6. 建立 Recovery Case。
7. 验证用户最终业务状态。

---

# 35. Notification Failure Runbook

1. 检查 Push Provider。
2. 检查 Token Invalid Rate。
3. 检查 Notification Queue Lag。
4. 保留 In-app。
5. Safe Retry。
6. Provider 故障时降级 Push。

---

# 36. Data Corruption Runbook

Trip / Booking 数据异常：

- 停止相关写入
- Preserve Evidence
- 不进行未经审计的大规模修复
- 使用 Audit / Event 重建
- 必要时人工 Recovery

---

# 37. Dashboard 分层

建议：

~~~text
Executive Health
Service Health
Planner Quality
AI Health
Realtime Operations
Execution / Booking
Cost
Experiment / Rollout
~~~

Executive Health 只显示：

~~~text
availability
major incidents
core SLO
error budget
active rollout
critical provider health
~~~

---

# 38. Planner Dashboard

~~~text
success rate
no-solution rate
latency
validator failures
ranking failures
replan rate
unnecessary replan
change set size
active bundle
~~~

---

# 39. AI Dashboard

~~~text
provider health
latency
tokens
cost
tool loop
structured output error
~~~

---

# 40. Realtime Dashboard

~~~text
event lag
trigger volume
trigger suppression
replan volume
notification volume
queue depth
stale event rate
~~~

---

# 41. Execution Dashboard

~~~text
action volume
execution success
execution unknown
compensation
manual intervention
provider errors
~~~

---

# 42. Cost Dashboard

~~~text
cost per active user
cost per trip
cost per AI turn
cost per plan
cost per replan
provider breakdown
~~~

---

# 43. Privacy / Security

Observability Pipeline 必须统一 Redact：

- API Key
- OAuth Token
- Cookie
- Password
- Full Card
- CVV
- Secret Header

精确位置：

- 不作为 Metric Label
- 不进入普通 Log
- 默认不写完整轨迹到 Trace

AI Conversation：

- 普通 Log 默认只保存 message_id / hash / metadata
- 不复制完整正文

---

# 44. Sampling

流量变大后允许 Trace Sampling。

但以下建议 100%：

~~~text
error traces
P1 / P2 traces
action failure
execution unknown
compensation failure
~~~

---

# 45. Synthetic Checks

周期性执行：

~~~text
Planner synthetic plan
AI basic response
Trip read
Notification test
~~~

Synthetic Planner 使用固定测试账户和 Fixture，不产生真实 Booking / Action。

---

# 46. Health Endpoint

服务建议：

~~~text
/liveness
/readiness
~~~

Liveness：进程是否存活。

Readiness：是否能安全接受流量。

核心依赖不可用时应 Not Ready，而不是继续大量接受请求。

---

# 47. Error Budget 与 Rollout

Planner Progressive Rollout 必须读取 SLO / Error Budget 状态。

例如：

~~~text
Healthy
→ allow promotion

Warning
→ slower promotion

Low
→ pause new rollout

Exhausted
→ freeze risky planner changes
~~~

---

# 48. Incident 与 Rollout

如果 Incident 明确与某 Bundle 强相关，可通过预定义 Policy：

~~~text
Pause Rollout
Rollback to Approved Baseline
~~~

并写入 incident_id 和 rollback audit。

---

# 49. Postmortem

P1 / P2 必须形成 Postmortem：

~~~text
Summary
Impact
Timeline
Detection
Root Cause
Contributing Factors
Mitigation
What Went Well
What Went Poorly
Action Items
Prevention
~~~

采用 Blameless 原则：

~~~text
重点是系统为什么允许故障发生
而不是谁犯了错
~~~

---

# 50. Postmortem Action Item

必须包含：

~~~text
owner
priority
due_date
tracking_issue
~~~

禁止只记录“以后注意”。

---

# 51. Data Model

建议：

~~~text
service_level_indicators
service_level_objectives
error_budget_snapshots

alert_rules
alert_instances
alert_suppressions

incidents
incident_events
incident_actions
incident_links

runbooks
~~~

---

# 52. Incident ID

建议：

~~~text
INC-YYYY-NNN
~~~

并与：

- GitHub Issue
- Alert
- Trace
- Audit
- Rollback Event

关联。

---

# 53. First-stage v1

先实现 Metrics：

~~~text
AI success / latency / cost
Planner success / latency / validation
Tool success / latency
Execution success / unknown
Worker queue / DLQ
Notification send / failure
~~~

Trace：

~~~text
AI → Tool → Planner
Action → Execution
Event → Worker → Notification
~~~

Alerts：

~~~text
Planner error spike
AI timeout spike
Execution unknown spike
Realtime queue lag
DLQ increase
Notification provider failure
~~~

首批 Runbooks：

~~~text
Planner Failure
AI Provider Failure
Event Queue Lag
Execution Unknown
Notification Failure
Booking Provider Failure
~~~

---

# 54. v2

增加：

~~~text
SLO Dashboard
Error Budget
Burn-rate Alert
Incident Registry
Release-aware Alerting
Automatic Safe Mitigation
Cost Anomaly Detection
~~~

---

# 55. v3

增加：

~~~text
Advanced Anomaly Detection
Multi-region SLO
Automated Incident Correlation
Capacity Forecasting
Chaos Testing
~~~

---

# 56. Observability 验收 Gate

必须满足：

- 核心链路都有 Trace
- Logs 结构化
- Metrics 无高基数用户 Label
- Error Code 标准化
- Release Bundle 可关联
- Provider 故障可区分
- Secret / 位置 / 对话隐私被 Redact

---

# 57. SLI / SLO 验收 Gate

必须满足：

- 每个 SLI 有明确公式
- SLO 对应用户体验
- Business Rejection 不误计 System Error
- Error Budget 可计算
- Rollout Controller 可读取 SLO 状态

---

# 58. Alert 验收 Gate

必须满足：

- Alert 可行动
- 有 Severity
- 有 Runbook
- 有 Dedup / Grouping
- 可使用 Burn Rate
- 可关联 Bundle / Provider
- P1 / P2 可自动建立 Incident

---

# 59. Incident 验收 Gate

必须满足：

- Severity 清晰
- 有 Incident Owner / Commander
- Timeline 可追踪
- Mitigation 可验证
- Recovery 有明确标准
- P1 / P2 有 Postmortem
- Action Item 有 Tracking

---

# 60. 最终冻结原则

> 可观测性不是上线后的附加功能，而是生产架构的一部分。

> Metrics、Logs、Traces、Events、Audit 各有职责。

> SLO 应反映真实用户体验，而不是只看 HTTP 200。

> Business Rejection 与 System Failure 必须分开。

> Alert 只有在需要行动时才应该触发。

> Correctness、Booking、Action、Realtime 高风险链路优先级最高。

> Error Budget 必须直接影响 Planner Rollout。

> Kill Switch、降级与 Rollback 必须在事故发生前设计好。

> 任何 P1 / P2 都必须能够沿 Trace → Release → Provider → Action 还原事件链。

> Incident Resolved 不等于工作结束，Postmortem 必须转化为可追踪工程改进。
