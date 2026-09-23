# TravelAssist Route Policy Router v1.0

> 日期：2026-09-24  
> 状态：**Frozen / 可作为开发依据**  
> 适用范围：Trip Planning Engine、AI Gateway、Route Provider、Replanning、Web / App Route UX、成本治理  
> 关联：`map-routing-poi-ai-provider-policy-v1.md`、`route-contract.md`、`planning-fact-freshness-policy-v0.1.md`

---

## 1. 目标

TravelAssist 不应把所有“路线相关问题”都发送给 Google Routes。

正式采用三级 Route Resolution：

```text
User / Planner Request
        ↓
Intent + Deterministic Context
        ↓
Route Policy Router
        │
        ├─ L0  Spatial / Region Estimate
        │      └─ PostGIS / Haversine / Region Graph
        │
        ├─ L1  TravelAssist Route Prior
        │      └─ 自有 / 开放数据 / 独立授权数据
        │
        └─ L2  Live Route Provider
               └─ Google Routes API (default)
```

目标：

- 规划早期尽量用 L0 / L1；
- 只有真正需要精确、动态、可展示路线时才进入 L2；
- 不把 Google Routes 长期缓存当作 L1；
- 不让 AI 单独决定是否触发付费 API；
- 不牺牲路线正确性换成本。

---

## 2. 三层定义

### L0 — Spatial / Region Estimate

适用：

- “这两个景点远不远？”
- “能不能放同一天？”
- “这几个区域顺不顺？”
- 大范围 POI / Region 候选剪枝。

数据：

- TravelAssist 自有 POI 经纬度；
- PostGIS；
- Haversine / geodesic distance；
- Region / District / Stay Cluster；
- RegionRelation；
- 静态地理邻接与聚类。

L0 不输出“真实交通时间”，只能输出空间关系与粗粒度规划判断。

### L1 — TravelAssist Route Prior

适用：

- 行程候选生成；
- 早期时间预算；
- Macro Route；
- 多方案排序；
- 低风险“典型耗时 / 典型交通方式”判断。

L1 数据只能来自：

- TravelAssist 自有计算；
- OSM / GTFS / ODPT 等许可证允许长期使用的数据；
- 独立购买且合同允许持久化的数据；
- 人工维护 / 规则计算；
- 可追溯的历史自有观测。

**禁止用 Google Maps Content 批量或持续反向生产 L1 Route Prior。**

建议逻辑字段：

```text
origin_scope
destination_scope
mode
typical_min_sec
typical_p50_sec
typical_p90_sec
distance_band
transfer_band
walk_band
time_bucket
weekday_type
confidence
source_kind
source_ref
observed_at
valid_from
valid_until
model_version
```

L1 必须明确是 Prior / Estimate，不得冒充当前 Live Route Fact。

### L2 — Live Route Provider

默认 Provider：Google Routes API。

适用：

- 用户要求“现在 / 今天 / 实时”；
- 需要 traffic-aware 驾车时间；
- 需要具体换乘 / 班次 / route steps；
- 用户点击“查看实际路线”；
- 最终候选方案需要真实 Route Feasibility；
- 临近出行；
- Replanning 需要当前路线；
- 旧 Route Fact 已过期或不满足当前 DecisionUse。

L2 结果必须：

- 经 Provider Adapter；
- 归一化为 Canonical Route Contract；
- 带 provenance / observedAt / freshness；
- 遵守 Google Maps Platform 当前条款与 attribution。

---

## 3. 关键词的角色

关键词只作为 **Intent Signal**，不是最终判定器。

### 强 L2 信号示例

```text
现在
今天
实时
最快
堵车
路况
下一班
几点到
怎么走
导航
具体路线
换乘
发车时间
末班车
实际路线
```

自然语言层可以由 GPT-6 Luna 结构化：

```json
{
  "intent": "live_navigation",
  "requires_live_route": true,
  "requested_detail": "transit_steps"
}
```

但 Luna 的输出只是输入之一。

**最终 Route Level 必须由确定性 Route Policy Router 决定。**

---

## 4. Deterministic RouteNeedScore

初始实现采用可配置的 RouteNeedScore。

建议默认权重：

| Signal | Score |
|---|---:|
| 明确“现在 / 今天 / 实时” | +50 |
| departureTime 距当前 < 24h | +40 |
| 需要 traffic / congestion | +50 |
| 需要具体 Transit 换乘 / 班次 | +40 |
| 需要 turn-by-turn / route geometry / actual steps | +50 |
| 用户主动点击“查看实际路线” | +40 |
| 最终候选需要 Route Feasibility | +30 |
| Replanning 受当前交通影响 | +40 |
| 旧 Live Route Fact EXPIRED | +40 |
| 仅做大批量候选筛选 | -50 |
| 仅判断同日 / 同区域合理性 | -40 |
| 出行日期 > 30 天 | -20 |
| 高置信 TravelAssist Route Prior 可满足 DecisionUse | -30 |

建议默认分层：

```text
score < 20      → L0
20 <= score <60 → L1
score >= 60     → L2
```

这些数值属于 **Config Default**，不是永久业务语义。Pilot 后允许调整，不得散落硬编码在 UI / Planner / Prompt 中。

### Hard Overrides

以下条件不经过分数直接决定：

- 用户明确要求“实际路线 / 导航 / 当前路况” → L2；
- 当前决策法律 / 安全 /预约可行性依赖准确路线且 Prior 不足 → L2；
- Provider Budget Hard Cap 已到 → 不允许新 L2；按 Policy fallback / warning / blocked；
- Google Provider 不可用 → 不伪造 L2；回退 L1 或 blocked；
- 输入坐标 / mode 不合法 → invalid，不进入任何 Provider；
- 规划批处理 / 全库候选 → 禁止直接 L2。

---

## 5. Router 输入

建议领域输入：

```ts
type RoutePolicyInputV1 = {
  requestId: string
  planningRunId?: string
  decisionUse:
    | "candidate_pruning"
    | "same_day_fit"
    | "macro_planning"
    | "final_feasibility"
    | "user_route_view"
    | "live_navigation"
    | "replanning"

  origin: TravelAssistLocationRef
  destination: TravelAssistLocationRef
  mode: RouteMode

  departureAt?: string | null
  tripDate?: string | null

  intentSignals: {
    requiresLiveRoute?: boolean
    requiresTraffic?: boolean
    requiresTransitSteps?: boolean
    requiresGeometry?: boolean
    userExplicitLiveRequest?: boolean
  }

  prior?: {
    available: boolean
    confidence?: number | null
    freshness?: string | null
    supportsDecisionUse?: boolean
  }

  liveFact?: {
    available: boolean
    freshness?: "CURRENT" | "AGING" | "STALE" | "EXPIRED" | "UNKNOWN"
    supportsDecisionUse?: boolean
  }

  budget: {
    providerAllowed: boolean
    requestBudgetRemaining: number
    dailyBudgetState: "ok" | "warning" | "hard_cap"
    monthlyBudgetState: "ok" | "warning" | "hard_cap"
  }
}
```

Luna 的 intent 只填充 `intentSignals`；它不能填 `budget`、`prior.freshness` 或伪造 Live Fact。

---

## 6. Router 输出

```ts
type RoutePolicyDecisionV1 = {
  level: "L0" | "L1" | "L2"
  reasonCodes: string[]
  routeNeedScore: number
  provider?: "google_routes" | null
  allowProviderCall: boolean
  displayFreshness:
    | "spatial_only"
    | "estimate"
    | "live"
    | "degraded"
  requiresUserWarning: boolean
}
```

示例 ReasonCode：

```text
LIVE_INTENT_EXPLICIT
TRAFFIC_REQUIRED
TRANSIT_STEPS_REQUIRED
FINAL_FEASIBILITY
PRIOR_SUFFICIENT
SPATIAL_ONLY
FAR_FUTURE_TRIP
BATCH_PRUNING
LIVE_FACT_EXPIRED
PROVIDER_BUDGET_HARD_CAP
PROVIDER_UNAVAILABLE
```

Router Decision 必须进入 Decision Trace，便于分析成本、命中率和误路由。

---

## 7. 短生命周期去重

允许设计 **Planning Run 内的 Request Coalescing / Deduplication**，但不得把它等同于永久缓存。

建议 Key：

```text
hash(
  originTravelAssistId,
  destinationTravelAssistId,
  mode,
  departureBucket,
  routeOptions,
  providerPolicyVersion
)
```

同一 Planning Run 内如果多个候选重复请求同一个 Leg：

```text
第一次 → L2 Provider Call
后续相同请求 → 复用当前 Run 已取得的 Runtime Fact
```

要求：

- 生命周期必须短；
- 必须符合 Provider 当前缓存 / 使用条款；
- 不写入永久 Route Prior；
- 不跨用户把受限制的 Google Content 当长期共享缓存；
- Provider Policy 改变后旧 Cache Key 自动失效；
- 不允许以去重名义建立 Google Route 结果的永久替代数据库。

---

## 8. Google Content 持久化边界

依据当前 Google Maps Platform Service Specific Terms，Routes API 对 Google Maps Content 存在缓存限制；条款明确允许 Routes 返回的 latitude / longitude 临时缓存最多 30 个连续日历日，之后删除。其他字段必须按当时有效条款 / Documentation 处理，**不能因为数据库技术上能存就默认允许持久化**。

因此 TravelAssist：

```text
travel_edge_prior
= TravelAssist 自有 / 开放 / 独立授权
= 可作为长期 Planning Data
```

而：

```text
google_route_runtime_fact
= Runtime Provider Fact
= Provider Policy 管理
= 非永久 Master
```

严禁：

- 把 Google duration / distance / polyline 批量写成永久 Route Prior；
- 用 Google 历史结果训练 TravelAssist 的路线模型；
- 把 Google Route Result 作为长期离线替代 API 的共享数据库。

---

## 9. UI 语义

用户无需理解 L0 / L1 / L2。

建议 UI：

### L0 / L1

```text
清水寺
↓
约 30–40 分钟
↓
伏见稻荷
```

标记：

- “估算”
- “典型时间”
- 必要时显示“实际路线可能变化”

### L2

```text
清水寺
↓ 徒步
清水五条
↓ 京阪本线
伏见稻荷
↓ 徒步
目的地
```

标记：

- “实际路线”
- “更新时间”
- 必要的 Google attribution / warning。

---

## 10. Planner 标准流程

禁止：

```text
500 POI
×
500 POI
→ Google Route Matrix
```

标准流程：

```text
500 POI
↓ 43维 / Constraint
120
↓ Region / Cluster
50
↓ L0 / L1
20
↓ Feasibility / Pareto
3–5 候选
↓ Route Policy Router
必要 Leg → L2 Google Routes
```

这使 Google Routes 成为 **精确验证层**，不是全库搜索引擎。

---

## 11. Telemetry / Cost KPI

至少记录：

- route_policy_total_decisions；
- route_policy_l0_count；
- route_policy_l1_count；
- route_policy_l2_count；
- google_routes_call_count；
- google_routes_dedup_hit_count；
- live_route_user_explicit_count；
- live_route_policy_upgrade_count；
- provider_budget_block_count；
- prior_insufficient_count；
- route_policy_false_low / false_high（人工 / QA 标注）。

Pilot 成本目标：

> 在不降低关键路线正确性的前提下，让 **80–95% 的规划阶段 Route Decision 不需要调用 Google Routes**。

此值是 **Pilot Optimization Target**，不是产品正确性的硬验收门槛；如果真实路线质量需要更多 L2，应优先正确性。

---

## 12. 验收条件

- [ ] 关键词不会直接绑定 Google API Call；
- [ ] GPT-6 Luna 不能绕过 Route Policy Router；
- [ ] L0 / L1 / L2 有稳定 reasonCode；
- [ ] Hard Override 优先于 score；
- [ ] L1 数据 provenance 可追踪且不是 Google 派生；
- [ ] L2 结果经 Canonical Route Contract；
- [ ] Planner 批量候选禁止直接全量 L2；
- [ ] Planning Run 内支持短生命周期去重；
- [ ] Google Runtime Fact 不进入永久 Route Prior；
- [ ] Provider Budget Warning / Hard Cap 可配置；
- [ ] UI 能区分 Estimate 与 Live Route；
- [ ] Decision Trace 能统计 L0 / L1 / L2 与 Google 调用量；
- [ ] Pilot 可验证 80–95% 非 Google Route Decision 目标，同时单独验证路线正确率。

