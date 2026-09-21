# TravelAssist — Realtime Impact Analysis / Replan Policy / Change Set Model

> 状态：建议冻结为实时重规划决策模型 v1  
> 适用范围：实时旅行助手、Planner、Trip Progress、交通、天气、预约、通知、Action Router  
> 上游依赖：
> - Realtime Trip State / Trip Progress / Arrival & Delay Detection Model
> - Event Bus / Realtime Trigger / Notification / Background Worker Model
> - AI Orchestrator / Tool Router / Context Builder
> - Action Router / Confirmation / Permission Model
> - Execution Adapter / Transaction / Compensation / Audit Model
>
> 核心目标：
> - 明确“发生异常后到底影响了什么”
> - 将影响分析与具体重规划动作分离
> - 优先局部修正，避免无必要的整日重排
> - 保护预约、must_keep、酒店、跨城市交通等硬约束
> - 生成结构化 Change Set，而不是让 AI 用自然语言直接改 Trip
> - 让每次 Replan 都可解释、可验证、可确认、可执行、可回滚

---

# 1. 总体链路

```text
Realtime Event
    ↓
Realtime Trip State
    ↓
Impact Analysis
    ↓
Impact Scope
    ↓
Replan Policy
    ↓
Candidate Strategies
    ↓
Planner
    ↓
Validator
    ↓
Change Set
    ↓
Proposal
    ↓
Action Router
    ↓
Confirmation / Auto-optimize Policy
    ↓
Execution
```

核心原则：

> Impact Analysis 先回答“受影响到什么程度”。

> Replan Policy 再回答“允许改到什么程度”。

> Planner 负责计算“怎么改”。

> Change Set 负责明确“实际准备改什么”。

---

# 2. Impact Analysis 与 Replan 分离

错误：

```text
列车晚点
→ 直接重排全天
```

正确：

```text
列车晚点
→ 判断当前 ETA
→ 判断后续 Slack
→ 判断预约风险
→ 判断最低游览时间
→ 确定 Impact Scope
→ 再决定是否 Replan
```

---

# 3. Impact Analysis 输入

建议：

```ts
interface RealtimeImpactInput {
  tripId: string;
  dayId: string;

  realtimeStateVersion: number;
  tripVersion: number;

  sourceEventIds: string[];

  currentItemId?: string;
  nextItemId?: string;

  delayMinutes?: number;

  routeState?: string;
  weatherState?: string;
  transportState?: string;

  hardConstraints: HardConstraint[];
  softConstraints: SoftConstraint[];

  candidateWindow?: {
    from: string;
    to: string;
  };
}
```

---

# 4. Hard Constraint

必须保护：

```text
reserved_booking
fixed_transport
hotel_checkin_deadline
ticket_entry_time
latest_entry_time
must_keep
user_locked_item
cross_city_departure
trip_end_deadline
```

---

# 5. Soft Constraint

允许优化：

```text
recommended_duration
preferred_meal_time
preferred_poi_order
walking_preference
shopping_preference
photo_preference
ideal_break_time
recommended_route
```

---

# 6. Impact Dimension

建议至少分析：

```text
time
feasibility
reservation
transport
weather
walking
fatigue
cost
experience
geography
```

---

# 7. Impact Result

```ts
interface ImpactAnalysisResult {
  impactId: string;

  severity:
    | "none"
    | "low"
    | "medium"
    | "high"
    | "critical";

  scope:
    | "none"
    | "current_item"
    | "next_item"
    | "local_window"
    | "remaining_day"
    | "multi_day";

  affectedItemIds: string[];

  hardConstraintRisks: string[];

  recoverableWithoutReplan: boolean;

  requiredReplanLevel:
    | "none"
    | "micro"
    | "local"
    | "day"
    | "multi_day";

  reasons: ImpactReason[];

  generatedAt: string;
}
```

---

# 8. Severity

## none

无实质影响，例如晚 5 分钟但后续 buffer 45 分钟，不需要 Replan。

## low

轻微偏差，可通过小幅时间调整吸收。

## medium

局部行程开始不可合理执行，需要局部重排。

## high

固定预约、停运、闭馆、恶劣天气等明显影响当天主体。

## critical

旅行安全、跨城市核心交通、重大订单等高影响异常。

---

# 9. Impact Scope

```text
current_item
next_item
local_window
remaining_day
multi_day
```

优先从最小 Scope 开始。

---

# 10. Local Window

v1 推荐以“接下来 3 个未完成 Item”为主要局部窗口，并结合 Hard Constraint 截断。

---

# 11. Recovery Without Replan

例如：

```text
当前晚 15 分钟
+
下一站无预约
+
后续有 40 分钟 buffer
```

可以仅更新 ETA，无需 Planner。

---

# 12. Replan Levels

```ts
type ReplanLevel =
  | "none"
  | "micro"
  | "local"
  | "day"
  | "multi_day";
```

---

# 13. Micro Replan

只允许：

- 小幅时间平移
- 缩短休息
- 调整未预约项目开始时间
- 调整交通选择
- 不改变主要 POI 集合

---

# 14. Local Replan

允许：

- 当前/下一两个普通 POI 顺序交换
- 跳过一个低优先级普通 POI
- 替换附近 POI
- 改交通方式
- 调整用餐时间
- 调整停留时间但不得低于 minimum

---

# 15. Day Replan

允许重排当天剩余全部未完成项目，但默认保护：

- 已完成项目
- 当前正在执行项目
- 所有 hard constraints
- must_keep
- confirmed reservation
- hotel / cross-city anchor

---

# 16. Multi-day Replan

仅在跨城市交通取消、酒店无法入住、台风/大规模停运、目的地重大不可用等情况下进入，并视为高风险 Proposal。

---

# 17. Replan Escalation

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

必须从最小必要范围开始；只有当前级别无法满足 Hard Constraints + Minimum Duration + Route Feasibility 时才升级。

---

# 18. Strategy Library

```text
shift_time
compress_buffer
shorten_optional_stop
swap_order
skip_optional_item
replace_with_nearby
change_transport_mode
move_meal
move_break
indoor_substitution
split_visit
end_day_early
replan_remaining_day
move_optional_item_to_other_day
```

---

# 19. 禁止自动策略

```text
remove_must_keep
move_paid_reservation
cancel_booking
change_hotel
change_cross_city_date
create_new_paid_booking
```

这些只能生成高风险 Proposal。

---

# 20. Strategy Priority

```text
1 absorb by buffer
2 adjust start/end time
3 change route / transport
4 swap optional items
5 shorten optional duration above minimum
6 skip low-priority optional item
7 replace nearby
8 day replan
9 multi-day replan
```

越少打扰用户原计划越优先。

---

# 21. Buffer / Duration Policy

优先使用 planned slack、meal flexibility、break flexibility、optional buffer，但不得侵占 reservation margin、minimum visit duration 或 last transport margin。

停留时长可以从 recommended 下调，但必须满足：

```text
duration >= minimum_duration
```

---

# 22. Skip / Replace Policy

POI 建议定义：

```text
must_keep
high
normal
low
```

自动优化最多跳过 low。

替代 POI 必须综合：

```text
location
opening hours
minimum duration
user preferences
43D score
weather suitability
fatigue
route cost
```

AI 不直接凭名称选替代。

---

# 23. Transport / Cost Policy

交通候选可以包含 walk / bus / train / taxi / rideshare，但 Planner 必须计算 time / cost / walking / availability / user preference。

Change Set 必须包含：

```text
estimated_cost_delta
cost_confidence
```

费用阈值由系统规则配置，AI 不自行判断“这点钱不重要”。

---

# 24. Change Set

Planner 输出不能直接写 Trip，必须形成 Change Set。

```ts
interface TripChangeSet {
  changeSetId: string;
  tripId: string;
  dayId: string;

  baseTripVersion: number;
  baseRealtimeStateVersion: number;

  sourceImpactId: string;

  replanLevel:
    | "micro"
    | "local"
    | "day"
    | "multi_day";

  strategyCodes: string[];

  operations: TripChangeOperation[];

  impactSummary: {
    timeDeltaMinutes: number;
    walkingDeltaMeters: number;
    estimatedCostDelta: number;
    fatigueDelta?: number;
    removedItemCount: number;
    addedItemCount: number;
  };

  hardConstraintsPreserved: boolean;
  validationStatus: string;
  riskLevel: string;

  createdAt: string;
  expiresAt?: string;
}
```

---

# 25. Change Operation

只允许有限操作：

```ts
type TripChangeOperation =
  | MoveItemOperation
  | AddItemOperation
  | RemoveItemOperation
  | ReplaceItemOperation
  | UpdateTimeOperation
  | UpdateDurationOperation
  | UpdateTransportOperation;
```

每个 Operation 可包含 expected item version / state / reservation status 作为 Preconditions。

---

# 26. Change Set Validation

必须依次验证：

```text
Schema
↓
Trip Version
↓
Hard Constraints
↓
Opening Hours
↓
Minimum Duration
↓
Route / Transfer
↓
Reservation
↓
Fatigue
↓
Budget
↓
No Overlap
↓
No Impossible Sequence
```

Validation 结果：

```ts
interface ChangeSetValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  validatorVersion: string;
  validatedAt: string;
}
```

Error = 不可执行；Warning = 可执行但体验下降。

Invalid Change Set 禁止进入 Apply Changes。

---

# 27. Multiple Candidates

Planner 可返回多个独立 Change Set，例如：

```text
A 保留更多景点
B 减少步行
C 保留预约 + 提前结束
```

AI 负责解释差异，不负责判断物理可行性。

---

# 28. Replan Policy Profile

可定义：

```text
conservative
balanced
aggressive
```

但这只是修改范围偏好，不是 AI Personality。

即使 aggressive，也不能自动取消酒店、改付费预约、产生大额费用或删除 must_keep。

优先级：

```text
system safety
>
trip explicit setting
>
user preference
```

---

# 29. Anchors

必须识别：

- Reservation Anchor
- Cross-city Anchor
- Hotel Anchor
- Restaurant Reservation Anchor

例如 17:00 新干线属于高等级硬约束，所有当天重排必须保证 latest_safe_arrival_at_station。

---

# 30. Weather / Transport Impact

天气先改变 suitability / route risk / visit comfort，不直接删除 POI；只有 unsafe / closed / impossible 才变成硬性不可用。

交通异常区分：

```text
delay
partial suspension
full suspension
missed connection
last-service risk
```

对应不同 Replan 强度。

---

# 31. Change Set Expiry

实时 Change Set 必须带 expires_at，因为 ETA、交通、用户位置和 Trip 版本都可能迅速变化。

用户应用时重新检查：

```text
Trip Version
Realtime State Version
Change Set Expiry
Critical Preconditions
```

失效后返回 CHANGE_SET_STALE 并重新计算。

---

# 32. Change Set Hash

为每个 Change Set 生成：

```text
change_set_hash
```

Confirmation 绑定该 Hash，确保用户确认的是这一组具体变化。

---

# 33. Action Translation

```text
ChangeSet
↓
ActionBatch
↓
Action Router
```

同一 Trip Change Set 尽量一次 Transaction 完成，并统一 trip_version + 1。

默认禁止 Partial Apply；若用户只接受部分变化，应重新生成新的 Change Set。

---

# 34. User Modify Candidate

例如用户说：

```text
这个方案可以，但不要删南禅寺
```

流程：

```text
Original Change Set
↓
New Constraint
↓
Replan
↓
New Change Set
```

不要直接手改旧 Change Set。

---

# 35. Explainability

Change Set 保存标准化 reason_codes，例如：

```text
transport_delay
reservation_protection
minimum_duration_violation
weather_substitution
walking_reduction
```

AI 根据 reason_codes 生成人类可读解释。

---

# 36. Auto Optimize

只有同时满足：

```text
user authorized
risk <= low
valid Change Set
no reservation mutation
no material cost
no must_keep removal
```

才可自动应用。

即使自动执行也必须：

```text
Change Set
↓
Validator
↓
Action Router
↓
Execution
↓
Audit
```

---

# 37. Data Tables

建议：

```text
realtime_impacts
replan_runs
trip_change_sets
trip_change_operations
change_set_validations
```

核心审计记录包括 impact_id、source_event_ids、trip/realtime versions、severity、scope、policy profile、strategy codes、candidate count、selected change set 和 validator version。

---

# 38. Error Codes

```text
IMPACT_NO_MATERIAL_EFFECT
IMPACT_HARD_CONSTRAINT_AT_RISK

REPLAN_NO_VALID_SOLUTION
REPLAN_ESCALATION_REQUIRED
REPLAN_POLICY_BLOCKED

CHANGE_SET_INVALID
CHANGE_SET_STALE
CHANGE_SET_VERSION_CONFLICT
CHANGE_SET_HARD_CONSTRAINT_VIOLATION
CHANGE_SET_MIN_DURATION_VIOLATION
CHANGE_SET_ROUTE_INFEASIBLE
CHANGE_SET_RESERVATION_CONFLICT
```

---

# 39. Failure Behavior

如果没有 Valid Solution，不允许 AI 编造一个“看起来完整”的方案。

应明确说明冲突并暴露真正的人工决策点，例如：

```text
若保留 17:00 新干线，则无法同时完成清水寺最低 60 分钟与伏见稻荷。
```

---

# 40. v1

先支持：

```text
time delay
transport delay
POI closure
weather suitability
reservation risk
minimum duration
local/day replan
```

首批策略：

```text
shift_time
compress_buffer
swap_order
shorten_optional_stop
skip_optional_item
replace_with_nearby
change_transport_mode
replan_remaining_day
```

---

# 41. v2 / v3

v2：

```text
cost-aware transport substitution
cross-day optional move
adaptive policy profile
hotel / cross-city impact
multi-candidate comparison
automatic indoor substitution
```

v3：

```text
multi-day disruption planning
advanced scenario optimization
group preference reconciliation
probabilistic uncertainty planning
provider booking change integration
```

---

# 42. 验收 Gate

Impact Analysis：

- 先 Impact 后 Replan
- 分析 Hard / Soft Constraint
- 可判断无需 Replan
- 有 Severity / Scope / Required Replan Level
- 只对 Material Change 进入 Planner

Replan Policy：

- 从最小修改范围开始
- 无法满足约束才升级
- Completed Items 不可修改
- Must Keep / Reservation / Cross-city Anchor 被保护
- User Policy 不得突破安全边界
- AI 不自行扩大 Scope

Change Set：

- 有 baseTripVersion
- 有 baseRealtimeStateVersion
- Operation 类型有限
- 必须经过 Validator
- Invalid 不得执行
- 有 change_set_hash
- 有 expires_at
- Confirmation 绑定具体 Change Set
- 执行时重检 Version / Preconditions
- 同一 Trip Change Set 默认原子执行

---

# 43. 与完整系统关系

```text
Realtime Trip State
        ↓
Impact Analysis
        ↓
Replan Policy
        ↓
Planner
        ↓
Validator
        ↓
Change Set
        ↓
AI Explanation
        ↓
Proposal
        ↓
Action Router
        ↓
Permission / Confirmation
        ↓
Execution
        ↓
Trip Version +1
        ↓
Event Bus
        ↓
Realtime State Refresh
```

---

# 44. 最终冻结原则

> 异常发生后，先分析影响，不直接重排。

> 优先最小修改，只有当前级别无法满足硬约束时才扩大 Scope。

> Planner 生成 Change Set，不直接写 Trip。

> Change Set 是 Realtime Replan 与 Action Router 之间的正式合同。

> 所有 Change Set 必须可验证、可过期、可哈希、可审计。

> AI 负责解释方案差异，不负责判断物理可行性。

> 预约、must_keep、跨城市交通与高风险成本变化优先受保护。

> 如果不存在满足约束的方案，系统必须明确承认，而不是制造一个看似完整但不可执行的答案。
