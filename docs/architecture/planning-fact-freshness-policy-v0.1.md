# TravelAssist Planning Fact Freshness / Provenance Policy v0.1

> 日期：2026-09-10  
> 状态：Freeze Candidate / 待 Consumer Review  
> 分支：`design/a-trip-engine-poi-ai-architecture-v2`  
> 关联设计：`poi-master-schema-v0.2.md`、`route-contract.md`、`itinerary-feasibility-spec-v0.1.md`、`candidate-pipeline-contract-v0.1.md`、`ai-compact-context-v1.md`、`ai-decision-contract-v1.md`、`replanning-contract-v0.1.md`、`travelassist-engine-contract.md`  
> 本文件冻结候选范围：Planning / Replanning 所消费 Fact 的 provenance、有效区间、freshness 状态、冲突选择、刷新、失效、缓存与 fallback 边界。  
> 本文件不冻结各 Provider / Fact Kind 的最终 TTL 数值、付费 API 调用预算、供应商合同、缓存授权期限或数据库物理表；这些由 Provider Policy + Config + Pilot 决定。

---

# 1. 核心结论

TravelAssist 不能只判断“有没有数据”，还必须判断：

```text
它来自哪里？
什么时候观测？
描述的是哪个时间范围？
现在还能不能信？
这个决策是否允许使用过期数据？
如果不能刷新，应该降级还是阻断？
```

统一链路：

```text
Provider / Official / Master / Runtime Source
                  ↓
             Source Adapter
                  ↓
          Canonical Fact Envelope
                  ↓
        Freshness / Provenance Policy
                  ↓
 CURRENT / AGING / STALE / EXPIRED / UNKNOWN
                  ↓
     Decision-use Policy + Criticality
                  ↓
 USE / USE_WITH_WARNING / REFRESH / FALLBACK / BLOCK
                  ↓
 Planning / Replanning / Engine Validation
```

核心原则：

> **“过期”表示该 Fact 不再足以支撑当前决策，不等于现实世界中的事实已经反转；“最新”也不自动代表“最可信”。最终可用性必须同时考虑来源权威性、观测时间、事实适用时间、事实类型、决策风险和是否存在更具体的新事实。**

---

# 2. Fact、Prior、Inference 必须分开

系统至少区分三种数据身份：

```text
Fact
= 由可信来源观测 / 确认的现实或已发布信息

Planning Prior
= 用于候选搜索的长期经验 / 典型值 / 图谱先验

Inference
= Engine / AI 基于 Fact/Prior 推导的判断
```

例如：

```text
TravelEdge Tokyo → Osaka typicalDuration=...
= Planning Prior

2026-10-12 09:00 某班新干线的实际出发/到达
= Live Route Fact

“这个转场今天风险偏高”
= Derived Decision / Inference
```

禁止：

- TravelEdge Prior 冒充当天真实 Route；
- POI `crowd=8` Master Feature 冒充当前现场拥挤；
- AI 推断的营业状态冒充官方临时关闭公告；
- 历史票价冒充当前可购买价格；
- “没有新的失败消息”被解释为 Booking 仍然有效。

---

# 3. Canonical Fact Envelope

所有会影响 Planning / Replanning 的重要事实都应能投影为统一元数据 Envelope。

建议逻辑结构：

```ts
type PlanningFactRefV1 = {
  factId: string
  factKind: FactKindV1
  subjectRef: string

  source: {
    sourceKind: SourceKindV1
    provider?: string
    sourceRef: string
    authorityBand: AuthorityBandV1
  }

  observedAt: Instant
  effectiveAt?: Instant | null
  validFrom?: Instant | null
  validUntil?: Instant | null
  expiresAt?: Instant | null

  confidence?: number | null
  status: "active" | "superseded" | "revoked" | "unknown"
  revision?: string | number | null
}
```

含义：

```text
observedAt
= TravelAssist / Adapter 什么时候取得或确认该事实

effectiveAt
= 来源声明该事实什么时候生效（如临时停运公告）

validFrom / validUntil
= 事实本身适用的业务时间区间

expiresAt
= 从 Planning 风险角度，超过此时点后不能继续无条件依赖
```

特别注意：

> `expiresAt` 是“决策安全期限”，不是现实事实的自然终止时间。

例如营业制度可能数月不变，但如果已经长时间未核验，在临近出行时仍可能要求刷新。

---

# 4. Source Kind / Authority

## 4.1 SourceKindV1

Freeze Candidate：

```text
official
provider
open_data
human_verified
user_confirmed
runtime_observed
derived
master_prior
ai_labeled
```

其中：

```text
official
= 景点 / 运营商 / 政府等一手发布

provider
= 路线、天气、库存、价格等批准的数据服务

open_data
= 可验证开放数据集

human_verified
= 人工按证据确认

user_confirmed
= 用户本人确认的 Trip / Runtime 事实

runtime_observed
= 系统运行期由可信客户端/服务事件确认的事实

derived
= 从其他 canonical facts 确定性计算出的结果

master_prior
= POI / Region / TravelEdge 长期先验

ai_labeled
= AI 生产的 Feature / 标签；不是动态现实事实
```

## 4.2 AuthorityBandV1

建议：

```text
A  authoritative / first-party or contract-grade fact
B  approved high-quality provider / verified open data
C  human-reviewed secondary / derived from A/B
D  planning prior / weak evidence / AI label
```

Authority 不是唯一冲突决策标准。

例如：

```text
长期官网“每日开放”
vs
当天官方临时闭馆公告
```

后者虽然同属官方，但**更具体、更新、时间范围更窄**，应覆盖前者。

---

# 5. Freshness State

统一 Freshness State：

```text
CURRENT
AGING
STALE
EXPIRED
UNKNOWN
```

## CURRENT

在当前 FactKind + DecisionUse 的 freshness policy 内，可以正常用于当前决策。

## AGING

仍可使用，但已经接近刷新边界；可以用于低风险排序或临时预览，临近执行 / 高风险决策应优先刷新。

## STALE

数据已经超过正常 freshness target。

只能：

- 在 Policy 明确允许的低风险场景作为弱证据；
- 显示 warning / confidence 降级；
- 触发后台/即时 refresh；
- 作为 fallback candidate hint。

不得静默当作 CURRENT。

## EXPIRED

不允许继续支撑当前 DecisionUse。

必须：

```text
refresh
或
fallback 到允许的更弱策略
或
BLOCK / NEEDS_FACT
```

## UNKNOWN

没有可判断 freshness 的必要元数据，或事实本身 unknown。

关键执行决策中不得按 CURRENT 处理。

---

# 6. Freshness 与业务有效期是两个维度

系统必须分别判断：

```text
Temporal Applicability
= 这个事实是否描述目标时间

Observation Freshness
= 这个事实是否足够新
```

例如：

```text
来源在今天发布：
“10月1日至11月30日营业时间 08:00–18:00”
```

对于 11 月旅行：

- observedAt 很新；
- validFrom/Until 覆盖目标日期；
- 可以是 CURRENT。

而：

```text
昨天查到今天 17:00 的列车路线
```

即使 observedAt 只有一天前，目标时间已经过去，该 Fact 对明天的路线仍不可用。

因此禁止只用：

```text
now - observedAt
```

一个数字判断全部 freshness。

---

# 7. Decision Use Class

相同 Fact 在不同用途下允许的 freshness 不同。

Freeze Candidate：

```text
DISCOVERY
DRAFT_PLANNING
PLAN_CONFIRMATION
LIVE_EXECUTION
MUTATION_PROTECTION
MONEY_OR_BOOKING_ACTION
```

## DISCOVERY

发现 / 浏览候选。

允许使用较弱 Prior 和部分 STALE 数据，只要明确降权且不声称实时准确。

## DRAFT_PLANNING

初步生成行程。

可以使用适度新鲜的 Master / Provider Fact；动态事实不足时允许先产生 Draft，但必须记录需刷新项。

## PLAN_CONFIRMATION

用户准备采用 / 保存为正式计划，尤其临近旅行日期。

营业时间、关键 Route、预约规则等需要更严格 freshness。

## LIVE_EXECUTION

旅行正在执行。

当前路线、交通中断、天气风险、临时关闭等必须使用高 freshness；Prior 只能做 fallback hint。

## MUTATION_PROTECTION

判断是否可以改变锁定 / 预约 / 付款关联的 Item。

必须使用可信且足够新鲜的保护事实。

## MONEY_OR_BOOKING_ACTION

付款、取消、重订、改变真实外部订单。

最严格：

> 过期库存、价格、退款政策、Booking 状态不得作为执行授权。

本阶段 TravelAssist 仍以“发现 / 计算 / 建议 / 用户确认”为主，不自动执行高风险外部订单动作。

---

# 8. Fact Kind Codebook

P0 统一至少覆盖：

```text
poi_identity
poi_location
poi_operational_calendar
poi_temporary_closure
poi_price
poi_reservation_policy
poi_accessibility
poi_visit_profile

route_plan
route_disruption
transport_timetable

weather_forecast
weather_current
weather_alert

crowd_estimate
queue_estimate

booking_status
booking_policy
inventory_availability
live_price

runtime_location
runtime_item_state
runtime_schedule_offset
```

POI 43 维 Feature 与这些 Fact 是不同对象。

---

# 9. Freshness 判定算法边界

建议概念流程：

```text
1. Fact status active?
2. target time 是否在 validFrom / validUntil?
3. 是否存在 explicit revoke / superseding event?
4. provider/source 是否给出 expiresAt / validity?
5. 使用 FactKind + DecisionUse Policy 计算 freshness target
6. 比较 observedAt / expiresAt / target time
7. 结合 authority / confidence
8. 输出 FreshnessState + RequiredAction
```

统一结果建议：

```ts
type FactUsabilityV1 = {
  freshness: "current" | "aging" | "stale" | "expired" | "unknown"
  action: "use" | "use_with_warning" | "refresh" | "fallback" | "block"
  reasonCodes: string[]
}
```

最终 TTL / threshold 来自：

```text
Provider explicit validity
> Fact-kind policy config
> environment/product fallback config
```

若来源给出的有效期更短，必须尊重更短边界。

不得为了减少 API 成本自行延长 Provider 明确的业务有效期。

---

# 10. 关键 Fact 类型策略

以下冻结“方向”，不冻结最终分钟 / 小时 / 天数。

## 10.1 POI Identity / Location

通常变化慢。

```text
DISCOVERY / DRAFT
→ 较长 freshness 窗口可接受

关键地理定位用于 Route / 到达
→ 若坐标证据弱或已发现冲突，必须重新解析
```

改名一般不导致 poi_id 变化。

坐标 unknown 不允许用城市中心点伪造。

## 10.2 Operational Calendar / Last Entry

营业时间属于**中等变化、执行关键**事实。

规则：

- 远期 Draft 可使用已验证 Calendar；
- 临近目标日期提高 freshness 要求；
- 节假日 / 季节营业 / 特别夜间开放优先使用目标日期 specific rule；
- 临时关闭公告可以立即 supersede 长期 Calendar；
- 若目标日营业信息已 EXPIRED 且无法刷新，关键 Item → NEEDS_FACT / BLOCK；
- AI 不得根据通常营业时间猜当天开放。

## 10.3 Temporary Closure

高优先级事件事实。

一旦确认对目标时段有效：

```text
立即 invalidates affected operational assumption
→ Trigger Replanning
```

恢复开放也必须有新事实，不因旧 closure 的 expiresAt 到达就自动假设“已恢复”。

## 10.4 Route / Timetable

Route Fact 对目标出发时刻高度敏感。

规则：

- TravelEdge / nearest-station 等只能做 Macro / Discovery Prior；
- DRAFT 可先用 Planning Route / timetable snapshot；
- PLAN_CONFIRMATION / LIVE_EXECUTION 必须按目标时间重新确认重要 Route；
- 交通中断事件可立即 invalidate 受影响 Route alternatives；
- Provider unavailable 时，Prior 可以帮助产生“需要重新查询”的候选，不得生成虚假的具体班次 / platform / fare。

## 10.5 Weather Forecast

Forecast freshness 与：

```text
forecast horizon
observedAt
weather volatility
severity
```

共同相关。

规则：

- 远期天气只能作为低置信趋势，不应大幅改 Trip；
- 越接近执行时刻 freshness 越严格；
- Severe Alert / 高 volatility 需要缩短刷新窗口；
- STALE Forecast 不得支持“今天一定不会下雨”等确定说法；
- Weather Alert 可以 supersede 普通 forecast 的风险判断。

## 10.6 Crowd / Queue

Crowd / Queue Master Feature 是长期风险倾向，Live Crowd 是动态 Fact。

规则：

```text
Master crowd/queue
→ 排序 Prior

Live crowd/queue
→ 当前时段动态风险
```

Live 数据过期后退回 Master Prior，而不是继续假装现场仍保持同样拥挤。

## 10.7 Price / Inventory

价格与库存变化快。

规则：

- 历史 / Master Price 可以用于预算估计并明确 `estimated`；
- STALE/EXPIRED Live Price 不得显示成“当前可购买价格”；
- Inventory 必须接近实际动作时重新确认；
- 价格刷新失败时，不得把旧价格作为支付保证；
- Savings Engine 必须以两个可追溯价格快照 + 时间 + 取消成本计算净节省。

## 10.8 Booking Status / Cancellation Policy

属于高风险保护事实。

规则：

- Booking confirmed 不能仅由 UI badge / 用户历史缓存推断；
- 修改 / 取消前必须重新核验相关订单状态和政策；
- stale booking status 不得解除 Booking Lock / Payment Lock；
- Provider failure 时默认 fail closed，不把“查不到订单”解释为“没有订单”；
- 外部订单事实变化应触发 Runtime / Replanning Protection Re-evaluation。

## 10.9 Runtime Location / Item State

执行期事实变化极快。

```text
currentLocation
IN_PROGRESS
COMPLETED
scheduleOffset
```

用于 Replanning 时必须绑定 runtimeRevision / observedAt。

旧 Runtime Snapshot 不允许覆盖更新的 Runtime Revision。

---

# 11. Event-driven Invalidation

除了 TTL，还必须支持事件直接失效。

例如：

```text
PLACE_CLOSED
→ invalidate affected operational availability

TRAIN_CANCELLED / SERVICE_SUSPENDED
→ invalidate matching Route Fact

WEATHER_ALERT
→ invalidate / downgrade prior weather assumption

BOOKING_CANCELLED
→ supersede previous booking confirmed fact

USER_COMPLETED_ITEM
→ supersede planned-only runtime assumption

PLAN_REVISION_CHANGED
→ old route / feasibility result may require re-evaluation
```

因此：

> Freshness 不只是计时器，也是事件驱动状态机。

---

# 12. Fact Conflict Resolution

多个来源冲突时，不允许简单：

```text
newest wins
```

也不允许：

```text
official always wins
```

建议顺序考虑：

```text
1. target-time applicability
2. explicit revocation / superseding event
3. source scope / specificity
4. authority
5. freshness
6. confidence / verification
7. provider entitlement / contractual usability
```

示例：

```text
官方长期页面：全年 09:00–17:00
当天官方公告：暴风雨 13:00 起闭馆
```

目标 15:00：

```text
当天公告 wins
```

另例：

```text
旧官方页面
vs
批准 Transit Provider 的当前实时停运
```

对“现在能否坐这班车”问题，Transit Live Fact 更适用。

冲突无法安全解决时：

```text
CONFLICTED_FACT
→ NEEDS_FACT / BLOCK for critical use
```

不得交给 AI 猜谁对。

---

# 13. Fallback Policy

Provider 失败时必须按 FactKind 降级，不使用一个全局 fallback。

## Route

```text
Live Route unavailable
→ 可用 TravelEdge / historical planning prior 做候选搜索
→ 不输出具体“可执行班次已确认”
→ final execution requires refresh
```

## Weather

```text
Current forecast unavailable
→ 可保留之前计划
→ 标记 weather uncertainty
→ 对天气敏感 POI 降低 confidence
→ severe-risk场景无法确认时宁可提示风险，不声称安全
```

## POI Opening

```text
fresh calendar unavailable
→ 远期 Draft 可 warning
→ 临近执行的关键 POI → NEEDS_FACT
```

## Booking / Price / Inventory

```text
Provider unavailable
→ 不自动修改订单
→ 不承诺价格/库存
→ 保持 protection
→ 请求稍后/重新验证
```

核心原则：

> **Fallback 可以降低精度和功能，但不能把低等级 Prior 升格为不存在的高等级 Fact。**

---

# 14. AI Context 边界

AI 只看到经过 Freshness Policy 处理后的 Compact Fact / Decision Summary。

例如：

```text
route=[duration=32, walk=6, freshness=current]
weather=[rainRisk=8, freshness=current]
opening=[540,1020, freshness=aging]
```

必要时可以再压缩 freshness：

```text
F=0 current
F=1 aging
F=2 stale
```

是否使用数字码由 Serializer Benchmark 决定，不在本文件冻结。

AI 不得：

- 自己把 STALE 改成 CURRENT；
- 根据无数据推断“应该没问题”；
- 请求 Provider Raw JSON；
- 用 AI confidence 替换 source confidence；
- 在 `need_more_context` 后自己访问数据库 / Provider。

若 materially important fact 为 EXPIRED / UNKNOWN：

```text
Gateway / Engine
→ refresh or NEEDS_FACT
```

而不是把事实缺口作为普通 AI 推理题。

---

# 15. Replanning 集成

Replanning 触发前后均应重新检查相关 Fact。

```text
Runtime Event
↓
Impact Analysis
↓
identify affected fact kinds
↓
Freshness Check
↓
refresh critical facts
↓
Minimal Replan Scope
↓
Repair / AI Soft Choice
↓
Engine Revalidate
```

例如：

```text
列车晚点 35min
```

至少影响：

```text
current route
arrival time
next reservation feasibility
opening / last-entry feasibility
runtime schedule offset
```

不能只更新 `scheduleOffset=+35`，却继续沿用旧的后续 Route 和 Last Entry 判断。

---

# 16. ChangeSet / Engine Protection 集成

ChangeSet 在 `validate / preview / apply` 时都必须重新检查高风险可变事实。

尤其：

```text
Trip revision
Plan revision
Runtime revision
Booking status
Payment / cancellation protection
critical route
critical opening
```

Preview 的 Fresh Fact 不自动授权之后的 Apply。

如果 Preview → 用户确认之间：

```text
Fact expired
Fact superseded
Plan revision changed
Runtime revision changed
```

则：

```text
apply must revalidate
```

必要时重新 preview / confirmation。

---

# 17. Cache 与 Provider 权利边界

“Freshness 允许缓存多久”和“Provider 合同允许缓存多久”是两个不同上限。

实际可缓存时间必须满足：

```text
min(
  business freshness allowance,
  provider contractual/cache allowance,
  privacy/security allowance
)
```

如果 Provider 禁止持久化某字段：

- 不因为 Engine 需要而违规保存；
- 可在允许的内存 / session cache 中使用；
- Canonical Contract 只存允许的 normalized fact / reference；
- attribution / display rights 独立遵守。

Raw Provider Payload 默认不进入领域对象或 AI Context。

---

# 18. Freshness Reason Codes

建议统一：

```text
F01_CURRENT
F02_AGING
F03_STALE
F04_EXPIRED
F05_UNKNOWN
F06_OUTSIDE_VALID_WINDOW
F07_SUPERSEDED
F08_REVOKED
F09_SOURCE_CONFLICT
F10_LOW_AUTHORITY
F11_LOW_CONFIDENCE
F12_PROVIDER_UNAVAILABLE
F13_REFRESH_REQUIRED
F14_FALLBACK_PRIOR_ONLY
F15_CRITICAL_FACT_MISSING
```

这些用于 Engine / Trace / QA，不要求直接原样显示给用户。

---

# 19. 例子一：清水寺营业时间

假设：

```text
Trip target = 2026-11-20 15:00

Fact A
regular calendar
observedAt = 2026-06-01
valid range covers Nov
source = official

Fact B
temporary closure notice
observedAt = 2026-11-20 11:00
effectiveAt = 2026-11-20 13:00
validUntil = 2026-11-20 18:00
source = official
```

即使 A 的长期制度仍然真实：

```text
对 15:00 的访问
→ Fact B supersedes A
→ Item unavailable
→ Replanning Trigger
```

AI 不能因为：

```text
Kiyomizu matchScore=95
```

把它重新塞回当天行程。

---

# 20. 例子二：路线 Provider 挂掉

计划京都 → 大阪。

已有：

```text
TravelEdge Prior
rail typical good

旧 Route Fact
observed several hours ago
```

执行前 Provider timeout：

```text
旧 Route Fact = EXPIRED for LIVE_EXECUTION
TravelEdge = master_prior only
```

系统可以：

```text
保留“铁路通常合理”作为 fallback hint
```

但不能显示：

```text
“17:12 的具体列车已确认正常”
```

如果这个转场是下一项硬预约的关键依赖：

```text
→ NEEDS_FACT / alert user
```

---

# 21. 例子三：酒店价格下降

昨日价格：

```text
30,000 JPY
observed yesterday
```

今日刷新：

```text
26,000 JPY
```

Savings Engine 不直接说：

```text
节省 4,000
```

还必须读取：

```text
old booking cancellation cost
new rate availability
new cancellation policy
fees/taxes normalization
freshness of both price snapshots
```

最后才得到：

```text
net saving
```

若新价格已经 EXPIRED：

```text
→ 只能显示 historical opportunity / refresh required
```

不能作为可执行重订建议的确定价格。

---

# 22. 决策记录要求

每次重要 Planning / Replanning Decision 至少应可追溯：

```text
factId / factKind
sourceRef / authorityBand
observedAt
valid window
freshnessState
freshnessReasonCodes
fallbackUsed
refreshAttempted
refreshResult
```

具体 Decision Trace 数据模型由下一项 `planning-decision-trace-v0.1.md` 冻结。

---

# 23. Validation / Test Matrix

至少覆盖：

```text
CURRENT route used in live execution
STALE route rejected for critical live connection
TravelEdge prior used only as fallback hint
old regular calendar superseded by temporary closure
closure expiry does not automatically imply reopened
weather alert overrides benign old forecast risk
stale crowd live fact falls back to master crowd prior
stale price not presented as guaranteed current price
stale booking fact cannot unlock booking/payment protection
unknown accessibility on hard wheelchair need → NEEDS_FACT
conflicting sources → critical use BLOCK
preview fact expires before apply → apply revalidation required
AI cannot promote stale fact to current
provider cache allowance shorter than business freshness → provider limit wins
```

---

# 24. Freeze Candidate 与 Pilot 参数

## 本文件建议冻结

```text
Fact / Prior / Inference 分离
Canonical Fact Envelope 元数据语义
FreshnessState 五档
DecisionUse 六类
Event-driven invalidation
Conflict Resolution 顺序
Fact-kind specific fallback
AI 不得升级 freshness
Preview / Apply 必须重新验证关键事实
Provider cache rights 是独立上限
```

## Pilot / Config 后冻结

```text
route freshness minutes
weather freshness minutes
operational-calendar refresh horizon
crowd / queue freshness seconds/minutes
live price freshness
inventory freshness
booking recheck interval
AGING threshold ratio
provider retry/backoff
refresh query budget
prefetch window
replan fact lookahead
```

这些数值必须通过 Provider 能力、成本、真实误差和用户体验 Pilot 校准，不能在架构阶段拍脑袋写死。
