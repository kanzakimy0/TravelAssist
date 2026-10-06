# TravelAssist — Realtime Trip State / Trip Progress / Arrival & Delay Detection Model

> 状态：冻结为实时行程状态模型 v1  
> 适用范围：移动端、实时旅行助手、Planner、地图、交通、位置服务、通知、同行人同步  
> 上游：Event Bus / Realtime Trigger / Worker、AI Orchestrator、Action / Execution / Audit

## 1. 核心目标

本层连接“计划中的行程”和“现实中的旅行进度”。

~~~text
Planned Trip + Current Time + Device Location + Transport State + User Actions
                              ↓
                    Realtime Trip State Engine
                              ↓
              Progress / Arrival / Departure / Delay
                              ↓
                Feasibility / Appointment Risk
                              ↓
                        Event Bus / Trigger
                              ↓
                    AI / Planner / Notification
~~~

冻结原则：

- Planned Trip 表示原计划；Realtime State 表示当前事实，两者不相互覆盖。
- GPS 是证据，不是“已到达”的最终业务结论。
- Delay、ETA、Slack、Minimum Duration、Appointment Risk 由确定性引擎计算，不由 LLM 猜。
- Realtime State Engine 负责“现在发生了什么”；Planner 负责“接下来怎么安排”。
- 正式 Trip Mutation 仍走 Proposal → Validator → Action Router → Execution。

## 2. Planned State 与 Actual State

正式 Trip 保持 planned_start、planned_end、planned_duration、planned_route、planned_transport、reservation_time、minimum_duration、recommended_duration。

Realtime State 独立维护 actual_started_at、actual_arrived_at、actual_departed_at、actual_completed_at、actual_duration、current_position_ref、delay_minutes、progress_status、confidence。

实际状态不得直接改写正式计划字段。

## 3. 状态层级

~~~text
Trip
 └─ Trip Day
     ├─ Trip Item
     └─ Transfer Segment
~~~

Realtime Engine 维护 current_trip_item、next_trip_item、current_transfer。

建议建立 trip_day_realtime_states，至少保存 trip_id、day_id、user_id、state、current_item_id、next_item_id、current_transfer_id、delay_minutes、last_position_id、last_progress_event_id、confidence、state_version、updated_at。

## 4. 状态机

Trip Day：

~~~text
not_started → starting → in_progress → completed
                         ├─ paused
                         ├─ abandoned
                         └─ unknown
~~~

Trip Item：

~~~text
upcoming → approaching → arrived → visiting → departing → completed
                                      ├─ skipped
                                      ├─ missed
                                      └─ unknown
~~~

Transfer：

~~~text
not_started → walking / waiting / in_transit / transferring → arrived
                                ├─ delayed
                                ├─ cancelled
                                └─ unknown
~~~

## 5. Evidence Priority

实时状态证据优先级：

~~~text
Explicit User Action
> Verified Booking / Transit Event
> Multi-sample Location Evidence
> Device Motion / Route Evidence
> Single Location Sample
> AI Inference
~~~

AI inference 永远不能成为位置事实的 Source of Truth。

## 6. Position Sample

建议建立 realtime_position_samples：

~~~text
id
user_id
trip_id
lat
lng
accuracy_m
captured_at
received_at
source
speed_mps
heading
is_background
retention_class
~~~

必须保存 accuracy 和 captured_at。精度差或过期的位置样本不得用于 Arrival、Deviation 或 Delay 决策。

内部 Location Confidence 使用 high / medium / low / unusable，由 accuracy、freshness、sample count、motion consistency 等共同决定。

## 7. Arrival Detection

禁止单独使用 distance < X meters → arrived。

Arrival 应综合：

~~~text
POI geometry / geofence
+ location confidence
+ dwell time
+ movement speed
+ current schedule context
~~~

进入范围只产生 arrival_candidate；持续满足条件后才进入 arrived。

大型公园、车站、寺院、商场、街区使用不同空间模型。优先 POI polygon / geometry，无 geometry 时才使用 center + radius。

## 8. Pass-by / Station / User Check-in

如果 inside geofence + high speed + very short dwell，应识别为 pass-by，不能直接 arrived。

车站必须区分 station_arrived 与 boarded_target_train。

用户可显式操作“我到了 / 开始这一站”，作为高优先级 evidence，记录 source = user_confirmed，不伪装成 GPS 自动检测结果。

## 9. Departure 与 Hysteresis

Departure 综合 exit geofence、dwell outside、movement、next-route direction。

Arrival Radius 和 Departure Radius 使用 Hysteresis，避免 GPS 漂移造成 arrived → departed → arrived 抖动。具体阈值由 POI 类型配置，不写进 Prompt。

## 10. Completion / Skip / Missed

completed 可来自 departure detected、用户标记完成、下一 Segment 已明确开始；不能仅因为 planned_end 已过就自动 completed。

普通 POI 若时间窗过去、位置未接近且下一 Item 已开始，可生成 skipped_candidate。

missed 主要用于固定预约/固定班次，必须依赖 latest_arrival_at、provider grace period、reservation state；AI 不自行宣布“已错过”。

## 11. Progress Snapshot

Context Builder 和 UI 读取结构化 Snapshot：

~~~text
tripId
dayId
currentItemId
nextItemId
state
delayMinutes
confidence
generatedAt
~~~

AI 不接收原始 GPS 轨迹。

## 12. Delay 分类

至少分：

~~~text
schedule_delay
arrival_delay
departure_delay
transfer_delay
reservation_risk_delay
~~~

Arrival Delay = ETA(next item) - planned arrival。  
Departure Delay = estimated departure - planned departure。  
Transfer Delay = actual/predicted transfer duration - planned transfer duration。

不同 Delay 不混成一个字段后让 AI 猜原因。

## 13. Delay 与 Downstream Impact

晚 10 分钟并不一定有问题。

系统必须结合 buffer_before、buffer_after、latest_safe_departure、latest_safe_arrival 计算 Schedule Slack。

Realtime Trigger 只在 Delay 消耗关键 Slack 或影响 Hard Constraint 后升级。

## 14. Minimum / Recommended Duration

沿用 POI minimum_duration 和 recommended_duration。

可用游览时间：

~~~text
available_visit_minutes
= next_hard_deadline
- ETA
- required_transfer_out
~~~

状态统一为 comfortable / compressed / below_minimum / impossible。

当 available_visit_minutes 低于 minimum_duration 时，不允许继续把该行程当成正常可执行状态。

## 15. Hard / Soft Constraints

Hard Constraint：

- Reservation time
- Last admission
- Last train / fixed transport
- Hotel check-in deadline
- Must-keep item
- Cross-city fixed transport

Soft Constraint：

- Recommended duration
- Ideal meal time
- Preferred pace
- Normal POI order

Realtime Feasibility 优先保护 Hard Constraints。

## 16. ETA Engine

ETA 不由 LLM 计算。

输入来自 current position、route engine、transit realtime、walking profile、traffic state。

输出必须包含 eta、confidence、source、retrieved_at、valid_until。

实时交通缺失时必须降低 ETA Confidence。

## 17. Next Stop Feasibility

下一站至少输出：

~~~text
next_item_id
eta
planned_arrival
latest_acceptable_arrival
available_visit_minutes
required_visit_minutes
risk
reasons
~~~

risk = none / low / medium / high / impossible。

这是 Realtime Trigger 的核心输入。

## 18. Appointment Risk

预约项目单独计算 ETA 与 reservation_time + provider grace period。

状态：

~~~text
on_time
tight
late_risk
late
missed_risk
~~~

Grace Period 必须来自 Provider / Reservation Record / Business Rule，禁止 AI 猜测。

## 19. Route Deviation

偏离判断结合 planned route geometry、current mode、multi-sample position、movement direction。

状态：

~~~text
on_route
minor_deviation
significant_deviation
off_route
unknown
~~~

小范围偏移只刷新 UI；持续且会影响 ETA 的偏离才进入 Event / Trigger。

## 20. Wrong Direction

多个样本同时显示 distance to next item 持续增加，且 heading 与 planned route 明显冲突时，才产生 wrong_direction_candidate。禁止单样本触发。

## 21. Realtime Snapshot / State Version

建议建立 trip_realtime_snapshots：

~~~text
trip_id
day_id
state_version
current_item_id
next_item_id
delay_minutes
route_deviation_state
next_stop_risk
reservation_risk
confidence
generated_at
~~~

使用 event-driven + bounded periodic refresh，不为每个 GPS sample 写 Snapshot。

每次 Material State Change，state_version + 1；它与正式 trip_version 分离。

## 22. Progress Events

v1 首批事件：

~~~text
trip.day.started
trip.item.approaching
trip.item.arrived
trip.item.departed
trip.item.completed
trip.delay.changed
trip.route.deviated
trip.appointment.at_risk
trip.progress.user_override
~~~

只有 Material Change 才发布 Event。

## 23. Material Delay

例如 +10m → +12m 通常不发布；+10m → +35m 可以发布 trip.delay.changed。

阈值属于 Rule Registry，而不是 AI Prompt。

## 24. Realtime Trigger 接线

~~~text
Progress Event
↓
Event Bus
↓
Realtime Trigger
↓
Active Trip / Expiry / Material Change / Cooldown
↓
Rule First
↓
AI / Planner only if needed
~~~

例如 delay = 5m 且 next buffer = 45m，直接 no action，不调用 AI。

## 25. Planner Trigger

若 delay = 40m、下一 POI 可用时间 35m、minimum duration = 60m，应进入 planner.replan → validator → proposal。

AI 可以解释“压缩当前景点 / 跳过普通 POI / 改交通 / 换附近景点”等候选方案的 trade-off，但可执行性由 Planner / Route / Validator 决定。

## 26. Auto-Replan Boundary

Realtime State Engine 永远不能直接 trip.update。

标准链路：

~~~text
Realtime Risk
→ Planner
→ Validator
→ Proposal
→ Action Router
→ Execution
~~~

即使用户启用 realtime.auto_optimize 且 risk <= low，也必须经过 Action Router / Permission / Execution / Audit。

## 27. User Override

用户可输入：

~~~text
我已经到了
这个景点跳过
我准备多待30分钟
今天暂停行程
~~~

这些是高优先级 Progress Input，并生成 trip.progress.user_override。

“多待30分钟”首先改变 Realtime State；是否修改正式 Timeline 仍由 Planner / Action Flow 决定。

## 28. Pause / Resume / Abandon

paused：暂停普通实时推进和普通提醒，但保留 Booking / Critical Event。  
resume：重新计算当前时间、剩余行程、Hard Constraints 和 ETA，通常触发 Planner 评估剩余 Day。  
abandoned：停止普通行程提醒，但订单、酒店和必须处理的外部状态仍独立存在。

## 29. Pace / Fatigue Integration

可维护 observed_walking_speed、transition_overrun、visit_overrun，只用于当前旅行 ETA / Planner 优化，不自动写入长期 Preference，也不做健康推断。

Realtime State 提供 Actual Facts；Fatigue Engine 继续负责疲劳计算，两者不重复实现。

## 30. Weather / Transport Integration

Weather 与 Transit 继续作为独立 Source of Truth。

Realtime State 只消费它们对 ETA / Feasibility 有用的结构化结果，不复制 Provider 原始业务状态。

## 31. Multiple Travelers

v1 建议明确一个 progress_owner_device 作为主进度来源。

共享 Trip 可共享 Progress Summary，但默认不共享精确实时坐标。同行人精确位置共享必须独立授权。

## 32. Offline

离线时保存当前 Day / Item / 最近 Snapshot，本地缓存 Progress Input，并降低 Realtime Confidence。

恢复网络后使用 captured_at + state_version 合并；旧离线样本不能覆盖服务器更晚状态。

## 33. Battery Strategy

移动端动态采样：

~~~text
远离行程开始 → low frequency
即将出发 → medium
transfer / approaching → higher
arrived + staying → reduced
~~~

禁止持续最高精度定位。

## 34. Privacy Mode

用户关闭 Realtime Location Assistance 后，基础 Trip 仍可使用。

仍可依赖手动 Check-in、Provider transport status、当前时间、Trip timeline，但 Arrival / Delay Confidence 明确降低。

## 35. Confidence / Unknown

分别维护 progress_confidence、arrival_confidence、eta_confidence、delay_confidence。

低置信度不自动执行 Action，可以提示用户确认。

Unknown 是合法状态，优于伪造确定值。

## 36. Notification Policy

不建议每到一个 POI 就 Push。

适合 Push：

- 固定预约可能赶不上
- 下一段交通停运
- 行程明显不可执行
- 高影响天气/交通需要用户决策

普通 Arrival 只更新 Trip UI。

## 37. UI Snapshot

Trip 页面可以直接展示：

~~~text
当前：清水寺
状态：游览中
预计离开：11:20
整体：晚 12 分钟
下一站：祇园
预计到达：11:43
风险：无
~~~

这些字段来自 Realtime State，而不是 AI 文案。

## 38. AI Context

Context Builder 只注入紧凑 Snapshot，例如 current_item、state、delay_minutes、next_item、next_eta、reservation_risk、confidence。

Raw Position 轨迹禁止进入 Prompt。

## 39. Audit / Retention

审计 Material Transition，例如 approaching → arrived、arrived → completed、delay 10 → 35、on_route → off_route。

数据保留分层：

~~~text
raw position sample → 最短
realtime snapshot   → 中等
progress event      → 业务需要
audit event         → 审计策略
~~~

## 40. Security

客户端上传 Position / Progress Input 时必须验证 Trip Membership、Resource Scope、Schema、Timestamp Sanity、Replay / Duplicate。

客户端不能直接设置 reservation_missed 等最终业务判断字段。

只做必要异常检测，例如不可能速度跳跃、极旧 sample、重复 sample、坐标格式错误；目标是提高状态质量，不是建立反作弊监控。

## 41. Error Codes

~~~text
REALTIME_POSITION_STALE
REALTIME_POSITION_LOW_CONFIDENCE
REALTIME_PROGRESS_UNKNOWN
REALTIME_ROUTE_UNAVAILABLE
REALTIME_ETA_UNAVAILABLE
REALTIME_STATE_VERSION_CONFLICT
REALTIME_EVENT_STALE
REALTIME_PERMISSION_DISABLED
~~~

## 42. v1 范围

~~~text
Trip Day Realtime State
Trip Item State
Position Sample
Arrival / Departure
Delay Minutes
Next Stop ETA
Appointment Risk
Material Delay Event
Basic Route Deviation
User Override
Pause / Resume
~~~

暂不追求复杂行为识别。

## 43. v2 / v3

v2：Transit Boarding Detection、Advanced Station State、Observed Walking Pace、Adaptive ETA、Offline Reconciliation、Group Progress Summary。

v3：Predictive Delay、Personalized Buffer、Multi-device Confidence Fusion、Adaptive Sampling、Advanced Group Travel State。

## 44. Acceptance Gates

Arrival Gate：

- 不使用单 GPS 点直接判 Arrival
- 有 Accuracy / Freshness
- 有 Geofence / Geometry
- 有 Dwell / Motion
- Arrival / Departure 有 Hysteresis
- 支持 User Confirmed Arrival
- 低 Confidence 不自动触发高影响 Action

Delay Gate：

- Delay 与 ETA 分离
- Arrival / Departure / Transfer Delay 分离
- 结合 downstream impact
- 使用 Schedule Slack
- 固定预约单独计算 Risk
- 具体分钟数不由 LLM 计算

Planner Gate：

- Realtime State 不直接 Mutation Trip
- 不可行时生成 Planner Input
- Planner Result 必须 Validator
- 正式修改走 Action Router
- trip_version 防止覆盖最新计划
- state_version 防止旧实时状态回写

Privacy Gate：

- 位置功能独立授权
- 关闭定位仍可使用基础 Trip
- Raw Position 不进 LLM Prompt
- Raw Position 不进长期 AI Memory
- 同行人精确位置共享独立授权
- Raw Position 使用更短 Retention

## 45. 最终系统关系

~~~text
Planned Trip
    +
Realtime Signals
    ↓
Realtime Trip State
    ↓
Progress / Arrival / Delay / Feasibility / Risk
    ↓
Event Bus
    ↓
Realtime Trigger
    ↓
AI / Planner
    ↓
Proposal
    ↓
Action Router
    ↓
Execution
    ↓
Trip Version Update
    ↓
Event Bus
~~~

通过 trip_version、state_version、causation_id、dedup、cooldown 防止旧状态覆盖和事件循环。

## 46. 最终冻结原则

> Planned Trip 与 Actual Trip Progress 永远分离。

> GPS 是证据，不是最终业务结论。

> Arrival 使用多信号判断，不以单点距离作为唯一依据。

> Delay / ETA / Slack / Appointment Risk 使用确定性计算，不交给 LLM 猜。

> Realtime State Engine 负责“现在发生了什么”，Planner 负责“接下来怎么安排”。

> 低置信度宁可 Unknown，也不要制造确定性。

> 只有 Material Change 才进入 Event / Trigger，避免实时系统制造噪音。

> Raw Position 只服务实时旅行功能，并遵循最小化、短保留和独立授权。

> AI 只看到结构化 Realtime Snapshot，不看到原始位置轨迹。
