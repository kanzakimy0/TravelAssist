# TravelAssist Replanning Contract v0.1

> 日期：2026-09-10  
> 状态：Freeze Candidate / 待 Consumer Review  
> 分支：`design/a-trip-engine-poi-ai-architecture-v2`  
> 关联设计：`trip-plan-contract.md`、`trip-plan-data-ai-takeover.md`、`travelassist-engine-contract.md`、`itinerary-feasibility-spec-v0.1.md`、`candidate-pipeline-contract-v0.1.md`、`ai-compact-context-v1.md`、`ai-decision-contract-v1.md`  
> 本文件冻结候选范围：旅行执行期 Runtime Overlay、Replan Trigger、受影响范围、保护边界、修复顺序、AI 调用边界、版本/并发、同行人同步与 ChangeSet 交接。  
> 本文件不冻结最终 fatigue 阈值、lookahead days、repair search width、自动执行权限阈值、Provider freshness 数值或数据库物理表。

---

# 1. 核心结论

TravelAssist 的 Replanning 不是“发生任何变化就重新生成整趟旅行”。

标准原则：

```text
Runtime Event / User Request / Fact Change
                ↓
        Trigger Normalization
                ↓
        Impact Analysis
                ↓
   Earliest Mutable Boundary
                ↓
      Minimal Replan Scope
                ↓
   Deterministic Repair First
                ↓ unresolved soft choice
          Candidate Pipeline
                ↓
            AI Soft Choice
                ↓
       Engine Revalidate
                ↓
          ChangeSet Builder
                ↓
       Trip Mutation Engine
validate → preview → permission/protection/revision → apply
                ↓
         Runtime / Realtime Sync
```

核心原则：

> **只重新计算真正受影响的未来范围；已完成内容不重写，进行中内容默认不破坏，预约/付款/用户锁定内容受保护；能确定性修复的问题先由 Engine 修复，只有多个合法方案之间的软权衡才交给 AI。**

---

# 2. Canonical Plan 与 Runtime Overlay 分离

`TripPlanSnapshotV1` 是计划内容 Snapshot，不承担实时执行状态。

Runtime State 是独立 Overlay：

```text
Canonical Trip Plan
        +
Trip Runtime Overlay
        +
Fresh Facts
        ↓
Current Execution State
```

Runtime Overlay 可以记录：

```text
currentDayRef
currentItemRef
executionStateByItem
actualStart / actualEnd
currentLocation
scheduleOffsetMinutes
currentDayLoad
recentRuntimeEvents
runtimeRevision
```

禁止：

- 因为用户已经到达某 POI 就改写 POI Master；
- 因为某 item 已完成就篡改原计划历史；
- 把 Runtime Overlay 当成第二套 Canonical Trip Plan；
- 用 AI 输出代替真实 arrival / completion / provider event。

---

# 3. Runtime Execution State

Replanning 读取 Runtime Overlay 中的执行状态。

逻辑状态沿用既有架构语义：

```text
PLANNED
READY
IN_PROGRESS
COMPLETED
SKIPPED
CANCELLED
BLOCKED
```

本合同不要求把这些状态复制进公开 `TripPlanSnapshotV1`。

## 3.1 COMPLETED

已完成 item：

```text
immutable to replanning
```

规则：

- 不删除；
- 不移动；
- 不重新安排计划时间；
- 不替换成另一个 POI；
- 实际开始/结束时间和实际负荷可继续作为 Runtime Fact 记录；
- 历史修正应走专门审计/事实修正流程，不属于普通 Replan。

## 3.2 IN_PROGRESS

默认保护当前进行中项目。

一般 Replan 的最早可变边界：

```text
current item planned/estimated end
```

允许的例外：

- 用户明确要求“现在离开 / 跳过”；
- 安全 / 场所关闭 / 运营中断导致当前项目无法继续；
- 当前 transport 本身发生延误/停运，Runtime Fact 必须更新。

即使发生例外，也不能让 AI 单独决定取消付款、退款或强制解锁。

## 3.3 SKIPPED / CANCELLED

表示执行结果或计划状态变化，不自动等价于“可以删除历史”。

- 已发生的 skipped/cancelled 事件保留；
- 后续是否恢复由 Replanning + Engine policy 决定；
- 外部 Booking cancelled 必须来自可信 Booking Fact，而不是 AI 推断。

## 3.4 BLOCKED

当前 item 因缺事实、交通、营业、预约或其他约束暂时不可执行。

`BLOCKED` 触发 Replan Assessment，但不能自动解释为永久取消。

---

# 4. Protection Boundary

执行状态与保护级别是两个不同维度。

保护级别沿用既有 Lock 语义：

```text
none
soft
user
booking
payment
system_hard
```

Replanning 必须计算：

```text
Execution Mutability
=
Execution State
+
Lock Level
+
Booking / Payment Fact
+
Priority / Must-Go
+
User Authorization
```

## 4.1 默认规则

```text
COMPLETED
→ immutable

IN_PROGRESS
→ protected_current

future + none/soft
→ mutable according to policy

future + user lock
→ no auto change; suggestion may require explicit user action

future + booking/payment
→ protected; no automatic cancellation / paid-order modification

system_hard
→ immutable except dedicated trusted system policy
```

## 4.2 Must-Go / Hard Anchor

`MUST_DO`、fixed arrangement、硬预约等不能因为低分或疲劳直接删除。

若不可执行：

```text
preserve as conflict
→ surface reason
→ search repair around it
```

只有明确确认 / 外部事实改变 / 专门业务流程才允许改变其保护状态。

---

# 5. Replan Trigger Codebook

v0.1 Freeze Candidate：

```text
user_request
schedule_drift
overrun
underrun
fatigue_update
location_deviation
weather_change
transport_delay
transport_cancelled
route_unavailable
place_closed
opening_fact_change
booking_fact_change
missed_anchor
constraint_change
provider_fact_change
system_feasibility_violation
```

## 5.1 user_request

用户主动要求：

```text
今天太累了
下午想轻松一点
把这个景点删掉
加一个温泉
不想再换车
```

必须先结构化为 Trip Override / Runtime Request / Hard Constraint，不直接把自然语言当 ChangeSet。

## 5.2 schedule_drift / overrun / underrun

例如：

```text
原计划清水寺 90min
实际游览 130min
```

Runtime：

```text
scheduleOffset += 40
actual visit load re-evaluate
```

随后只传播到受影响后续范围。

`underrun` 不自动意味着可以塞更多 POI；是否增加项目仍需 Candidate / fatigue / user pace 判断。

## 5.3 fatigue_update

疲劳不是简单来自 clock time。

输入至少结合：

```text
actual completed Visit Load
route walking
standing / terrain
rest recovery
current party state
```

如果实际游览比计划更长，应使用 actual load 更新 Day Runtime，而不是继续沿用原 planned walking load。

## 5.4 weather / transport / closure

Provider Fact 先归一化，再触发 Replanning。

AI 不得自己声称：

```text
train cancelled
place closed
heavy rain
```

而必须引用可信 Fact / Runtime Event。

---

# 6. Trigger Normalization / De-duplication

同一真实事件可能由多个来源重复送达。

每个标准化 Trigger 应有：

```text
triggerId
triggerType
subjectRef
effectiveAt
observedAt
sourceRef
severity
correlationId
```

规则：

- 同一 provider event 不重复执行同一 Replan；
- 相近重复 delay update 可合并到同一 active Replan Run；
- 新的更严重事实可以 supersede 旧事实；
- Replan Run 必须保留 causation / correlation，避免循环触发自己。

例如：

```text
TRAIN_DELAY +20
↓ replan
AI_AUTO_CHANGE_APPLIED
```

后者不能再次被误识别为新的独立 `schedule_drift` 无限循环。

---

# 7. Impact Analysis

Replanning 先判断“哪些东西真的被影响”。

输入：

```text
trigger
runtime state
canonical plan
fresh facts
protection state
item dependencies
route dependencies
```

输出：

```text
directlyAffectedRefs
propagatedAffectedRefs
immutableRefs
protectedRefs
nextHardAnchor
availableSlack
estimatedRecoveryPoint
```

## 7.1 传播原则

从直接受影响 item 向后传播，直到：

```text
slack / free time 吸收完偏差
或
遇到 hard anchor / booking anchor
或
Day boundary / Stay boundary 截断
或
需要扩大 Replan Scope
```

不要默认把整趟 Trip 标成 affected。

## 7.2 Route Dependency

当两个 item 的顺序 / 时间变化时，只重算相关 transition。

```text
A → B → C
```

若仅替换 B：

```text
recompute A→B'
recompute B'→C
```

不需要重新查询整天所有 Route。

---

# 8. Earliest Mutable Boundary

Replan 必须确定：

```text
earliestMutableAt
```

优先顺序：

1. 已完成 item 之后；
2. 当前 IN_PROGRESS item 默认结束之后；
3. 不跨越不可变 booking/payment/system-hard anchor；
4. 用户明确授权修改当前项时可建立更早边界，但仍受业务保护规则约束。

任何 Proposal 在构造时都必须证明 target 位于可变边界之后，或带有明确的用户/系统授权路径。

---

# 9. Replan Scope Codebook

使用最小足够 Scope：

```text
current_item
current_timeslot
rest_of_day
next_n_days
remaining_trip
macro_remaining_trip
```

## current_item

仅在用户明确处理当前项、当前项变为不可继续或专门 Runtime policy 时使用。

## current_timeslot

例如：

```text
下午 14:00–18:00 下雨
```

只替换当前天气窗口的活动。

## rest_of_day

用于：

- 上午严重超时；
- 当天疲劳明显升高；
- 当天交通/闭馆导致多项连锁变化。

## next_n_days

用于：

- 明后天台风；
- 跨日交通故障；
- 酒店 / 长途交通 anchor 影响 2–3 天。

`N` 是 Config / Impact Analysis 结果，不写死。

## remaining_trip

只有在多个后续日都受影响时启用。

## macro_remaining_trip

用于真正改变后续地区路径的重大事件，例如：

- 某地区长期不可达；
- 后续主要交通断开；
- 用户主动要求改掉剩余旅行方向。

这是高成本、高风险 Scope，不应由普通小事件触发。

---

# 10. Deterministic Repair Order

Replanning 默认先尝试最小破坏修复。

Freeze Candidate 顺序：

```text
0. NO_ACTION / runtime-only update
1. consume existing buffer / free time
2. shift flexible future items within valid windows
3. adjust supported Visit Mode / duration within legal profile
4. reorder mutable same-day items
5. choose validated route alternative
6. replace optional POI / meal with validated candidate
7. skip lowest-value optional item
8. insert rest / recovery item if fatigue requires
9. expand scope to next day(s)
10. macro reroute remaining trip
```

注意：

- 不能把 visit duration 压到 `minimumDuration` 以下；
- 不能使用 POI Master 不支持的 Visit Mode；
- 不允许通过删除 buffer 把计划压成没有现实余量；
- 不允许为了守住 Optional POI 而破坏 Booking / Must-Go；
- 跳过项目优先于修改付费/不可退款项目；
- 实际自动执行权限还要通过 AI Level / Engine Policy / Confirmation Gate。

---

# 11. AI Call Boundary

AI 不是每次 Replan 都要调用。

## 11.1 不需要 AI

例如：

```text
列车晚 10 分钟
后面存在 25 分钟 buffer
→ consume buffer
```

或：

```text
用户提前 20 分钟结束一个 POI
后续计划仍全部可执行
→ NO_ACTION
```

## 11.2 需要 AI 的典型场景

当 Engine 已生成多个合法 repair candidates，且需要软偏好权衡：

```text
雨天：博物馆 A vs 茶道体验 B
疲劳：删购物 vs 删夜景
交通延误：换路线 vs 放弃 Optional POI
```

使用：

```text
TaskType = replan_soft_choice
```

AI 输入仍遵守 `AI Compact Context V1`。

AI 输出仍遵守 `AI Decision / Patch V1`。

## 11.3 AI 不允许做的事

AI 不得：

- 自己扩大 Hard Constraint；
- 自己解除 user/booking/payment/system lock；
- 自己取消订单 / 退款；
- 自己制造天气 / 交通 / 关闭事实；
- 自己把 completed item 改成未完成；
- 自己改 runtime revision；
- 自己扩大 Scope 到整趟旅行而不经 Impact Analysis / Gateway。

---

# 12. Replan Assessment

每个 Trigger 先生成只读 Assessment。

建议逻辑结构：

```ts
type ReplanAssessmentV1 = {
  runId: string
  triggerId: string
  status:
    | "no_action"
    | "repairable"
    | "needs_fact"
    | "needs_user_confirmation"
    | "blocked_no_feasible_repair"

  scope: ReplanScopeV1
  earliestMutableAt: Instant

  affectedRefs: string[]
  immutableRefs: string[]
  protectedRefs: string[]
  nextHardAnchorRef: string | null

  scheduleOffsetMinutes: number
  fatigueDelta: number | null

  issues: ReplanIssueV1[]
  factRefs: string[]

  baseTripRevision: number
  basePlanRevision: number
  baseRuntimeRevision: number
}
```

Assessment 不写 Trip。

---

# 13. Replan Proposal

修复候选可以来自 deterministic Engine 或 AI Soft Choice。

```text
ReplanAssessment
↓
Repair Candidates
↓
Deterministic / AI Choice
↓
ReplanProposal
```

Proposal 至少绑定：

```text
runId
scope
baseTripRevision
basePlanRevision
baseRuntimeRevision
triggerRef
factRefs
selectedRepairCandidate
reasonCodes
```

随后：

```text
Planning Engine Revalidate
↓
Itinerary Feasibility
↓
Route / Fact freshness check
↓
ChangeSet Builder
↓
Trip Mutation Engine
```

Proposal 不是 ChangeSet，也不是 apply 权限。

---

# 14. Revision / Concurrency

Replanning 必须同时绑定：

```text
tripRevision
planRevision
runtimeRevision
```

如果任一层在 Proposal 生成后变化：

```text
stale proposal
→ discard or explicit rebase
→ re-run impact / validation
```

禁止：

```text
last-write-wins overwrite
```

例如：

```text
手机 A 因下雨生成 replan
同时同行人 B 锁定了一个晚餐
```

A 的 Proposal 不能继续按旧 protection state apply。

Trip Mutation Engine 仍负责最终 revision / permission / protection gate。

---

# 15. Companion / Multi-device Sync

同行人设备不各自生成“真行程”。

服务端 authoritative state：

```text
Canonical Plan Revision
+
Runtime Revision
+
Runtime Events
```

每次成功 apply 后：

```text
ChangeSet Applied
↓
new plan revision
↓
runtime event / sync event
↓
Supabase Realtime / Push
↓
all authorized devices
```

同行人可提交：

- runtime feedback；
- user request；
- lock / preference request（按权限）。

但权限、owner、role、最终冲突处理不能由客户端或 AI 自报。

---

# 16. Current Location / Deviation

位置只用于执行判断，不等于用户允许系统持续精确存储位置。

若用户授权 Runtime location：

```text
current location
↓
location deviation detector
↓
route / arrival feasibility update
```

原则：

- 不把用户位置写入 POI Master；
- 不因 GPS 抖动频繁 Replan；
- 使用阈值 / debounce（数值由 Config / Pilot）；
- 位置保留 / 隐私策略由独立 Privacy / Runtime Data Policy 冻结。

---

# 17. Fatigue-aware Replanning

必须使用实际执行负荷，而不是只读静态 `walking=7`。

例如：

```text
清水寺
planned full_visit = 90min
actual = 130min
```

则：

```text
actual Visit Load
>
planned Visit Load
```

随后：

```text
Day Runtime Load increases
↓
future POI Feasibility re-evaluate
↓
possible actions:
  insert rest
  switch to supported lighter visit mode
  replace high-load optional POI
  skip optional POI
```

反之，实际提前结束也只减少已发生负荷；不自动把后续时间全部塞满。

---

# 18. Booking / Payment Boundary

Replanning 可以识别：

```text
booking conflict
payment protected item
provider-cancelled booking
```

但第一阶段：

```text
no automatic external cancellation
no automatic refund
no automatic repurchase
```

如果 Provider 已经取消订单：

- 可信 Booking Fact 更新状态；
- Replan 可围绕该事实生成替代方案；
- 不需要 AI“决定订单已经取消”。

若 Replan 建议用户主动取消 / 改订：

```text
requires explicit confirmation
→ dedicated Booking / Payment capability
```

不走普通 POI Compact Patch 直接执行。

---

# 19. Example A — 清水寺超时

计划：

```text
09:00–10:30 清水寺 full_visit
10:45–11:30 二年坂
12:00 lunch reservation
```

实际：

```text
清水寺 09:00–11:10
```

Trigger：

```text
overrun +40min
```

Impact：

```text
COMPLETED 清水寺 → immutable
二年坂 → affected mutable
12:00 lunch reservation → protected hard anchor
```

Repair：

```text
不能把 lunch reservation 往后随便推
↓
尝试缩短 / 跳过 Optional 二年坂
↓
Route 重新验证
↓
如果有多个合法方案，再交 AI 软选择
```

绝不能：

```text
把清水寺 actual 130min 改回 90min
```

---

# 20. Example B — 下午强降雨

```text
14:00–17:00 outdoor weather risk critical
```

Scope：

```text
current_timeslot
```

保护：

```text
上午 completed 不动
18:00 已预约晚餐不动
```

Pipeline：

```text
outdoor POI affected
↓
indoor replacement candidates
↓
Hard Filter / Route / Duration / Fatigue
↓
Top legal candidates
↓
AI replan_soft_choice if needed
↓
Engine revalidate
```

不需要重新规划下一周。

---

# 21. Example C — 交通大规模中断

若：

```text
京都 → 金泽 长途主交通当天不可用
```

且影响：

```text
酒店
后续 Region Path
次日计划
```

则 Scope 可以升级：

```text
rest_of_day
→ next_n_days
→ macro_remaining_trip
```

但必须逐级通过 Impact Analysis，不能第一次收到延误事件就直接整趟重生成。

---

# 22. Replan Issue Codebook

Freeze Candidate：

```text
RP01 schedule_drift
RP02 duration_overrun
RP03 fatigue_overload
RP04 weather_conflict
RP05 transport_delay
RP06 transport_cancelled
RP07 place_closed
RP08 route_unavailable
RP09 booking_conflict
RP10 missed_anchor
RP11 current_item_protected
RP12 completed_item_immutable
RP13 user_locked_item
RP14 payment_protected
RP15 hard_anchor_conflict
RP16 stale_fact
RP17 missing_fact
RP18 revision_conflict
RP19 no_feasible_repair
RP20 scope_escalated
```

这些用于 Engine Trace / UI Template；不是 AI 自由事实陈述。

---

# 23. Fail-safe

以下情况不得自动 apply：

```text
critical fact missing
stale route / booking fact materially affects decision
protected item would be changed
base revision changed
runtime revision changed
current item would be interrupted without authorization
no feasible repair
AI output invalid
scope expansion exceeds policy
```

处理：

```text
NEEDS_FACT
or
NEEDS_USER_CONFIRMATION
or
BLOCKED_NO_FEASIBLE_REPAIR
```

不允许“为了保证有答案”而放宽 Hard Constraint。

---

# 24. 与下一设计的关系

P0-10 `Fact Freshness / Provenance Policy` 将继续冻结：

- weather / route / opening / booking fact 的 freshness；
- stale / expired / unknown 的统一语义；
- Provider unavailable 时是否允许 planning prior；
- Replanning 引用 fact snapshot 的版本和追踪规则。

P0-11 `Decision Trace` 将冻结：

- trigger → impact → candidate → AI → revalidate → ChangeSet 的完整审计链；
- token / latency / provider calls；
- 为什么发生 Replan、为什么改了某项、为什么没改某项。

---

# 25. Freeze Acceptance Checklist

- [ ] Runtime Overlay 与 Canonical Trip Plan 分离。
- [ ] COMPLETED item 不被普通 Replanning 改写。
- [ ] IN_PROGRESS item 默认保护。
- [ ] Lock / Booking / Payment / Must-Go 与执行状态分开计算。
- [ ] Replan Trigger 有标准化 / 去重 / correlation。
- [ ] Impact Analysis 只传播到实际受影响范围。
- [ ] Earliest Mutable Boundary 可确定。
- [ ] Scope 使用最小满足原则并支持逐级升级。
- [ ] Deterministic Repair 优先于 AI。
- [ ] actual Visit Load / fatigue 进入 Runtime Replan。
- [ ] AI 仅在合法 repair candidates 中软选择。
- [ ] Proposal 同时绑定 trip / plan / runtime revision。
- [ ] Booking / Payment 外部操作不通过普通 Replan 自动执行。
- [ ] 多设备 / 同行人并发不使用 last-write-wins。
- [ ] 最终修改仍必须通过 WBS 4.20 ChangeSet / validate / preview / apply 边界。
