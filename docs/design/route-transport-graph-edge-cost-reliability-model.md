# TravelAssist — Route / Transport Graph / Edge Cost / Reliability Model

> 状态：冻结为交通与路径基础模型 v1  
> 目标：为 Planner、Realtime ETA、疲劳、成本与可达性提供统一的交通边模型。

## 1. 总体结构

```text
POI / Station / Area Nodes
        ↓
Transport Graph
        ↓
Static Edges + Timetable + Realtime Overlay
        ↓
Route Query
        ↓
Normalized Route Options
        ↓
Planner / Realtime / Ranking
```

## 2. Node

支持：

```text
poi
station
bus_stop
airport
parking
hotel
area_anchor
```

每个 Node 绑定 canonical entity id、坐标、timezone、region。

## 3. Edge

```ts
interface TransportEdge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  mode: "walk" | "train" | "bus" | "car" | "taxi" | "ferry" | "bike";
  staticDurationSec?: number;
  distanceM?: number;
  transferCount?: number;
  costEstimate?: number;
  reliability?: number;
  source: string;
  dataVersion: string;
}
```

## 4. 三层数据

```text
Static Network
Timetable / Scheduled Service
Realtime Overlay
```

Realtime 不能覆盖并销毁 Static Base。

## 5. Route Query

输入至少：

```text
origin
destination
departure time
timezone
allowed modes
walking preference
cost preference
accessibility constraints
data snapshot
```

## 6. Route Option

输出：

```text
duration
distance
walking
wait
transfers
cost
reliability
arrival time
legs
source snapshots
confidence
valid_until
```

## 7. Reliability

不能只看理论最快时间。

考虑：

```text
transfer count
historical delay
connection margin
service frequency
last train risk
realtime disruption
```

## 8. Edge Cost

Planner 可使用多维 Edge Cost：

```text
time_cost
walking_cost
money_cost
fatigue_cost
complexity_cost
uncertainty_cost
```

不要过早压成单一数字；最终由 Planner Weight Profile组合。

## 9. Walking Edge

包含：

```text
distance
estimated time
slope/elevation if available
stairs/accessibility
indoor/outdoor if useful
```

walking time 与疲劳模型联动。

## 10. Transit Edge

区分：

```text
in-vehicle
waiting
transfer walking
platform/transfer buffer
```

## 11. Car / Taxi

至少：

```text
drive time
traffic confidence
parking / dropoff overhead
estimated cost
```

## 12. Scheduled vs Realtime

```text
scheduled_departure
predicted_departure
scheduled_arrival
predicted_arrival
```

必须同时保留，不直接覆盖。

## 13. Transfer Feasibility

判断：

```text
arrival platform / station
minimum transfer time
walking transfer
provider delay
connection margin
```

## 14. Last Service

必须支持：

```text
last_service
latest_safe_departure
service_end_risk
```

对山区、温泉、乡村尤其重要。

## 15. Route Snapshot

每次 Planner 关键路线使用：

```text
route_snapshot_id
provider
request hash
retrieved_at
valid_until
options
```

支持重现。

## 16. Route Cache

Key 包含：

```text
origin
destination
mode profile
departure time bucket
provider
data version
```

Realtime disruption 会使相关 Cache 降置信度或失效。

## 17. POI Edge Strategy

不预先生成全国所有 POI 两两边。

推荐：

```text
high-value / nearby edge precompute
+
on-demand route
+
region graph
+
cache
```

避免 O(N²)。

## 18. Region Graph

对于 10万 POI：

```text
POI → local transit hub
hub → hub
hub → POI
```

可作为粗粒度剪枝层。

## 19. Planner Two-stage Route

```text
cheap geo estimate
↓
candidate prune
↓
route service
↓
final verification
```

## 20. Realtime Overlay

事件：

```text
delay
suspension
station closure
road congestion
service recovery
```

只影响当前 Snapshot / Overlay。

## 21. Confidence

Route Option 带：

```text
high
medium
low
```

低置信度路线在 Ranking 中增加 uncertainty penalty。

## 22. Fallback

Realtime Provider Down：

```text
static timetable / historical estimate
+
confidence downgrade
```

不能伪装为实时。

## 23. Quality Gate

- origin/destination canonical
- duration > 0
- legs 连续
- arrival >= departure
- cost currency明确
- realtime 有 valid_until
- static/realtime 分层
- impossible transfer 被识别

## 24. Observability

```text
route_success_rate
route_p95
cache_hit_rate
provider_error_rate
realtime_stale_rate
transfer_infeasible_rate
fallback_rate
```

## 25. 最终冻结原则

> Planner 的交通时间必须来自 Route/Transport Engine，不由 AI 猜。

> 全国 POI 不生成全量两两边，使用分层图、按需查询和缓存。

> “最快”不等于“最优”，可靠性、步行、换乘、费用和不确定性都属于路线成本。

> Static、Scheduled、Realtime 三层必须分开，Realtime 失效时可降级但不可伪装。
