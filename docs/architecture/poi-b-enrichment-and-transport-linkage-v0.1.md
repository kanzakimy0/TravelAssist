# POI B Enrichment & Transport Linkage v0.1

## Purpose

本设计用于 TASK-068-B。核心目标是把 POI 的“景点是什么”和“怎么到达”解耦。

## Data layers

```text
POI Identity
  ↓
POI Static/Semi-static Facts
  ↓
POIFeatureV1 (43)
  ↓
Visit Profile
  ↓
Preference Matching / Visit Load

POI Identity
  ↓
Access Anchor
  ↓
Regional/Gateway Hub
  ↓
Runtime Route Provider
  ↓
Route Fact / routeFit
```

## Why not all-pairs

若 N 个 POI 全量两两生成交通边，空间复杂度为 O(N²)。

因此只保留：

1. POI → nearest/access anchors；
2. POI → 少量 neighbor POIs；
3. regional/gateway hubs；
4. 实际日期时间下由 Route Provider 动态查询。

## POI scoring boundary

43 维值仅描述 POI 静态/半静态属性：

- benefit 01–15
- suitability 16–24, 29–38, 40–43
- cost 25–26
- risk 27–28, 39

值域：

```text
0..9 | null
```

`null` = unknown。

## Transport boundary

交通不进入 `matchScore`。

运行时：

```text
matchScore
partyFit
seasonFit
weatherFit
routeFit
dayFit
Constraint Gate
```

分别负责不同问题。

### Static transport facts

可以预存：

```text
nearest station/bus stop
access anchor IDs
last-mile difficulty
car/bus dependency
barrier-free access evidence
regional hub relation
```

### Dynamic route facts

不得预存为长期真值：

```text
current traffic
today's transit time
service disruption
exact departure-dependent transfer count
current fare
last-train feasibility for a specific itinerary
```

## Example

```text
Tokyo
→ Gotemba gateway
→ POI access anchor
→ target POI

Tokyo
→ Kawaguchiko gateway
→ local bus/rail anchor
→ target POI

Kyoto Station
→ Kiyomizu area bus anchor
→ Kiyomizu-dera
```

Planner 请求具体日期时间时，再由 Route Provider 计算真正 travel duration。

## Neighbor graph

每个 POI 只保留少量：

```text
same district
walkable cluster
same attraction complex
same transport anchor
top-K nearby candidates
```

推荐 K <= 20。

该图负责 candidate generation，不负责宣称实时交通耗时。

## Visit load

`walking` / `physical` 是推荐游览条件下的基准摘要。

实际负荷：

```text
Visit Load
= fixed POI load
+ duration-scaled variable POI load
+ route walking/load
+ current day accumulated fatigue
```

因此清水寺等 POI 的 30 / 60 / 90 分钟访问不能用同一个“实际疲劳值”。

## Production implication

未来 DB/API 应通过稳定 `poi_id` 连接：

```text
poi_master
poi_features
poi_visit_profiles
poi_access_anchors
transport_anchors
poi_neighbor_edges
runtime_route_facts/cache
```

但 TASK-068-B 若当前 canonical DB schema 尚未冻结，只生成 versioned datasets，不越权执行 production migration。
