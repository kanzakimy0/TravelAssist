# TravelAssist Itinerary Feasibility / Rationality Spec v0.1

> 日期：2026-09-10  
> 状态：Freeze Candidate / 待 Consumer Review  
> 分支：`design/a-trip-engine-poi-ai-architecture-v2`  
> 关联设计：`poi-master-schema-v0.2.md`、`poi-scoring-spec-v0.2.md`、`preference-state-v0.1.md`、`route-contract.md`、`travelassist-engine-contract.md`  
> 目的：定义单个景点安排、景点之间转场、单日时间轴、单日体力负荷与整趟旅行的“可执行性 / 合理性”判断。  
> 本文件不冻结最终疲劳阈值、Buffer 比例、Visit Mode 全集或自动修复权重；这些通过 Pilot 校准。

---

# 1. 核心结论

“推荐了正确景点”不等于“生成了合理行程”。

必须分四层验证：

```text
Level 1  Item / Visit Feasibility
Level 2  Transition Feasibility
Level 3  Day Feasibility
Level 4  Trip Feasibility
```

标准链路：

```text
Candidate POIs
↓
Itinerary Draft
↓
Item Feasibility
↓
Transition Feasibility
↓
Day Feasibility
↓
Trip Feasibility
↓
PASS / WARNING / CRITICAL / NEEDS_FACT
↓
Deterministic Repair
↓ if unresolved
AI Soft Decision
↓
Revalidate
↓
Trip Proposal
↓
ChangeSet
```

核心原则：

> **AI 可以提出安排，但确定性事实和可执行性由 Engine 验证。高 POI 分数、AI 理由或用户偏好都不能覆盖营业时间、最短游览时长、预约冲突、真实交通和硬体力限制。**

---

# 2. Validation Status

统一状态：

```text
PASS
WARNING
CRITICAL
NEEDS_FACT
```

含义：

```text
PASS
= 当前已知事实下合理可执行

WARNING
= 可执行但明显偏紧 / 偏累 / 低效率，需要 UI 或优化器关注

CRITICAL
= 当前安排不可接受，必须修复后才能进入正式可执行方案

NEEDS_FACT
= 缺少关键事实，不能安全判断
```

一个 Day / Trip 的最终状态取最严重子项，并保留全部 issue。

---

# 3. Level 1 — Item / Visit Feasibility

每个 POI 安排必须形成 Visit Instance：

```text
poiRef
visitMode
plannedStart
plannedEnd
plannedDuration
```

并读取对应 `PoiVisitProfile`。

至少检查：

```text
Duration
Opening / Last Entry
Reservation / Booking
Age / Accessibility
Visit Mode Support
Visit Load
```

---

# 4. Duration Feasibility

设：

```text
P   = plannedDuration
MIN = minimumDuration
REC = recommendedDuration
MAX = maxUsefulDuration
```

## 4.1 基础判断

```text
P < MIN
→ CRITICAL / DURATION_TOO_SHORT

P = MIN .. REC
→ PASS 或 WARNING / COMPRESSED_VISIT

P ≈ REC
→ PASS / RECOMMENDED_DURATION

REC .. MAX
→ PASS / RELAXED_OR_DEEP_VISIT

P > MAX
→ WARNING / DURATION_OVERALLOCATED
```

具体 WARNING 边界由 Config / Pilot 决定。

## 4.2 Duration Fit

可额外派生：

```text
durationFit 0..99
```

但 `durationFit` 不是 Hard Gate 的替代品。

即使某曲线给出 20 分，只要：

```text
P < MIN
```

仍必须是 CRITICAL。

## 4.3 Visit Mode

不同 Visit Mode 使用不同 Duration Profile。

例如：

```text
full_visit  60 / 90 / 150
photo_stop  20 / 30 / 45
```

所以：

```text
30min full_visit
→ CRITICAL

30min photo_stop
→ PASS
```

用户说“只想门口拍照”应改变 Visit Mode，而不是偷偷把 full_visit 的最短时长改短。

---

# 5. Visit Load / Fatigue

时长合理性与疲劳负荷必须分开。

例如：

```text
full_visit minimum=60
planned=30
```

可能：

```text
fatigue < 90min visit
```

但仍：

```text
DURATION_TOO_SHORT
```

## 5.1 Visit Load

概念：

```text
VisitWalkingLoad =
FixedWalkingLoad
+ VariableWalkingLoad × DurationCurve(planned/recommended)
+ TerrainModifier

VisitPhysicalLoad =
FixedPhysicalLoad
+ VariablePhysicalLoad × DurationCurve(planned/recommended)
+ TerrainModifier
+ ActivityModifier
```

固定负荷可以包括：

```text
入口到核心区
必走坡道
必走台阶
上下山基础路径
固定站立 / 排队动作
```

因此负荷不要求与游览分钟完全线性。

---

# 6. Level 2 — Transition Feasibility

两个 Item 之间必须有明确 Transition。

```text
Item A end
↓
Transition
↓
Item B start
```

禁止：

```text
A 结束 11:30
B 开始 11:30
但实际路程 18min
```

至少检查：

```text
Canonical Route duration
route walking
transfers
waiting
arrival window
fixed booking time
```

## 6.1 Planning Buffer

真实 Route Fact 不得被篡改。

例如：

```text
Route Fact = 18min
```

Planning Engine 可另加：

```text
Planning Buffer = 5min
```

形成：

```text
Scheduled Transition Cost = 23min
```

Buffer 用于覆盖：

- 找出口 / 入口；
- 红绿灯；
- 短暂停留；
- 轻微迷路；
- 携带行李；
- 人群；
- 儿童 / 老人移动差异。

Buffer 的数值规则属于 Config / Pilot，不写入 Route Contract 的真实 duration。

## 6.2 Transition Issues

建议 Code：

```text
TRANSITION_TOO_SHORT
ROUTE_UNAVAILABLE
ARRIVAL_WINDOW_CONFLICT
TRANSFER_OVERLOAD
ROUTE_WALKING_OVERLOAD
LAST_SERVICE_CONFLICT
NO_BUFFER
```

---

# 7. Operational Feasibility

必须先检查真实营业事实：

```text
open / closed
opening interval
last entry
exception date
reservation slot
special opening
```

例如：

```text
Arrival 16:40
Closing 17:00
MIN visit 60
```

虽然到达时尚未闭馆，仍然：

```text
CRITICAL / INSUFFICIENT_OPEN_WINDOW
```

不能只检查“16:40 < 17:00”。

---

# 8. Booking / Locked Anchor

以下时间点优先级高于普通 POI：

```text
confirmed booking
payment protected item
user locked item
flight / train fixed departure
hotel check-in hard window
restaurant reservation
```

如果普通 POI 与固定 Anchor 冲突：

```text
普通 POI 调整
```

而不是：

```text
静默移动已确认预约
```

最终修改仍进入 WBS 4.20 ChangeSet / protection / confirmation 边界。

---

# 9. Level 3 — Day Feasibility

每个 Day 至少计算：

```text
activityMinutes
transitionMinutes
mealMinutes
restMinutes
bufferMinutes
freeMinutes
walkingLoad
physicalLoad
continuousActivityLoad
```

并检查：

```text
Day Time Budget
Day Fatigue Budget
Meal Windows
Rest Needs
Start / End Time
Party Constraints
```

---

# 10. Day Time Budget

一天总安排必须满足：

```text
Σ Activity
+ Σ Transition
+ Σ Meal
+ Σ Required Rest
+ Σ Buffer
<= Available Day Window
```

例如：

```text
5 POI × 90 = 450min
Transitions = 180min
Meals = 120min
Buffer = 60min

Total = 810min = 13.5h
```

即使每个 POI 单独都合理，整个 Day 仍可能 `DAY_OVERLOADED`。

---

# 11. Day Fatigue Model

建议维护：

```text
fatigueBudgetStart
accumulatedWalkingLoad
accumulatedPhysicalLoad
continuousActivityLoad
recoveredLoad
remainingFatigueBudget
```

概念：

```text
DayFatigue =
Σ VisitLoad
+ Σ RouteLoad
+ ContinuousActivityPenalty
- RestRecovery
```

注意避免双算：

```text
POI walking Feature
→ 用于标准负担基准 / fallback

actual VisitWalkingLoad
→ 进入 DayFatigue

Route walking
→ 只进入 RouteLoad
```

不能三个都重复直接相加。

---

# 12. Continuous Activity / Recovery

同样总负荷下：

```text
连续 5 小时不休息
```

和：

```text
2 小时 + 午餐 + 2 小时
```

疲劳体验不同。

因此建议增加：

```text
continuousActiveMinutes
continuousStandingMinutes
continuousWalkingMinutes
```

超过阈值后产生：

```text
ContinuousActivityPenalty
```

休息点可产生：

```text
RestRecovery
```

`24 rest` Feature 可以参与恢复价值估计，但实际恢复量必须结合：

- 停留时长；
- 是否真正坐下；
- 餐饮 / 温泉 / 咖啡 / 公园等场景；
- 当时疲劳水平。

不应把 `rest=9` 直接视为固定减 9 点疲劳。

---

# 13. Meal Window

餐饮是时间轴组成部分，不是事后插入。

需要 Config 定义：

```text
breakfast window
lunch window
dinner window
```

并允许用户 / 文化 / 预约覆盖。

问题 Code：

```text
MEAL_WINDOW_MISSED
MEAL_DURATION_TOO_SHORT
MEAL_ROUTE_DETOUR_HIGH
```

具体时段不在本文件写死。

---

# 14. Party-aware Feasibility

多人同行时：

```text
Hard Constraints = union
```

Day Load 不应只取平均。

建议同时保留：

```text
partyMaxFatigue
partyMedianFatigue
limitingTravelerClass
```

儿童、老人、无障碍需求成员的过载不能被高体力同行者平均掉。

---

# 15. Level 4 — Trip Feasibility

整趟 Trip 还要判断跨日合理性。

至少考虑：

```text
hotel changes
long transfer days
recovery across days
consecutive heavy days
arrival / departure day load
luggage movement
must-see coverage
region continuity
booking anchors
```

典型问题：

```text
TOO_MANY_HOTEL_CHANGES
CONSECUTIVE_HEAVY_DAYS
LONG_TRANSFER_AFTER_HEAVY_DAY
ARRIVAL_DAY_OVERLOADED
DEPARTURE_DAY_RISK
LUGGAGE_TRANSFER_CONFLICT
TRIP_ROUTE_FRAGMENTED
```

例如：

```text
10天换8次酒店
```

即使每一天单独时间上都能走完，整体旅行体验仍可被判为低合理性 / WARNING 或 optimization penalty。

---

# 16. Issue Codebook v0.1

建议初始：

```text
DURATION_TOO_SHORT
DURATION_OVERALLOCATED
UNSUPPORTED_VISIT_MODE
OPENING_HOURS_CONFLICT
LAST_ENTRY_CONFLICT
INSUFFICIENT_OPEN_WINDOW
BOOKING_CONFLICT
ACCESSIBILITY_CONFLICT
AGE_RESTRICTION_CONFLICT
TRANSITION_TOO_SHORT
ROUTE_UNAVAILABLE
ARRIVAL_WINDOW_CONFLICT
LAST_SERVICE_CONFLICT
NO_BUFFER
DAY_OVERLOADED
WALKING_OVERLOAD
PHYSICAL_OVERLOAD
CONTINUOUS_ACTIVITY_OVERLOAD
MEAL_WINDOW_MISSED
REST_REQUIRED
TOO_MANY_HOTEL_CHANGES
CONSECUTIVE_HEAVY_DAYS
ARRIVAL_DAY_OVERLOADED
DEPARTURE_DAY_RISK
LUGGAGE_TRANSFER_CONFLICT
NEEDS_ROUTE_FACT
NEEDS_OPERATION_FACT
NEEDS_ACCESSIBILITY_FACT
NEEDS_VISIT_PROFILE
```

Codebook 可 additive 扩展；breaking semantic change 需要版本升级。

---

# 17. Deterministic Repair Order

发现不合理时优先由 Engine 做确定性修复。

推荐顺序：

```text
1. 补足 required duration
2. 推迟后续时间
3. 使用合法的较短 Visit Mode（仅当用户意图允许）
4. 缩短 over-allocated item
5. 调整 Transition / Buffer
6. 移动低优先级 POI
7. 插入 Rest
8. 删除 / 替换低价值候选
9. 跨日移动可变 Item
10. 多个合法修复方案难以取舍 → AI Soft Decision
```

禁止为了“让时间轴看起来能放下”而：

- 缩短到低于 minimum；
- 篡改 Route duration；
- 忽略营业时间；
- 移动 BookingProtected Item；
- 把未知事实当成 0。

---

# 18. AI 边界

AI 可以：

- 在多个合法修复方案中选择；
- 判断用户更愿意删哪个低价值项目；
- 解释为什么调整；
- 根据自然语言识别用户想 full visit 还是 photo stop。

AI 不可以：

- 自己声明 `30min full_visit` 合法；
- 覆盖已知营业 / Route Fact；
- 修改 Hard Constraint；
- 直接写 Canonical Trip。

AI 输出仍要：

```text
Proposal
↓
Feasibility Revalidate
↓
ChangeSet
↓
Trip Mutation Engine
```

---

# 19. Feasibility Result

建议：

```ts
type FeasibilityResultV1 = {
  status: "pass" | "warning" | "critical" | "needs_fact"
  scope: "item" | "transition" | "day" | "trip"
  issues: FeasibilityIssueV1[]
  metrics: {
    scheduledMinutes?: number
    transitionMinutes?: number
    bufferMinutes?: number
    walkingLoad?: number
    physicalLoad?: number
    remainingFatigueBudget?: number
  }
  factRefs: string[]
  configVersion: string
}
```

每个 issue：

```text
code
severity
subjectRef
requiredValue
actualValue
shortfall / excess
factRefs
repairHints
```

这样 UI / AI 可以解释：

```text
清水寺安排 30 分钟
最低正常游览 60 分钟
差 30 分钟
→ DURATION_TOO_SHORT
```

---

# 20. 清水寺式完整示例

假设：

```text
Visit Mode = full_visit
MIN = 60
REC = 90
MAX = 150
walking summary = 7
```

行程：

```text
10:00–10:30
planned=30
```

Engine：

```text
Duration:
30 < 60
→ CRITICAL DURATION_TOO_SHORT

Visit Load:
30min 负荷低于90min
但仍有入口/坡道等 Fixed Load
→ fatigue not zero

Overall Item Feasibility:
CRITICAL
```

如果改成：

```text
visitMode=photo_stop
profile=20/30/45
planned=30
```

则：

```text
Duration PASS
Visit Load 根据 photo_stop profile 计算
Transition / Opening / DayFatigue 继续检查
```

这正是“玩法不同”和“时间不同”同时影响合理性的模型。

---

# 21. Pilot 后校准

以下参数不在 v0.1 写死：

```text
Duration Fit 曲线
Planning Buffer
Fixed / Variable Load 比例
DurationCurve
Fatigue Budget
Continuous Activity 阈值
Rest Recovery
Day / Trip severity 阈值
Hotel Change penalty
Visit Mode 最终全集
```

但以下架构原则冻结候选：

1. 单 POI、Transition、Day、Trip 四层验证；
2. Duration Feasibility 与 Fatigue Load 独立；
3. walking / physical 必须结合 actual duration / mode；
4. Fixed Load 不随时长线性消失；
5. Route Load 与 Visit Load 分开；
6. Engine 先确定性修复，AI 只做合法方案中的软取舍；
7. 修复后必须重新验证。
