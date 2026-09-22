# POI Full-Corpus Enrichment & Transport Linkage v0.2

## Ownership

TASK-068-B 中，用户明确指定 **B 处理本工作流全部 POI 内容**。

Stable ID scope：

```text
00000–99999
```

只处理 occupied POIs。

## Core separation

```text
POI Identity
→ Static/Semi-static Facts
→ POIFeatureV1 (43)
→ Visit Profile
→ Preference Matching / Visit Load

POI Identity
→ Access Anchor
→ Regional/Gateway Hub
→ Runtime Route Provider
→ Route Fact / routeFit
```

43 维描述“景点是什么”，交通系统描述“在某个具体行程时刻怎么到达”。

## 43-feature boundary

```text
benefit:     01–15
suitability: 16–24,29–38,40–43
cost:        25–26
risk:        27–28,39
value:       0..9 | null
```

`null` = unknown。

## Visit load

`walking / physical` 是标准推荐游览条件下的静态负担摘要。

实际负荷：

```text
Visit Load
= fixed POI load
+ duration-scaled variable POI load
+ route load
+ accumulated day fatigue
```

## Transport

禁止 O(N²) 全量 POI 交通矩阵。

保存：

1. POI → 1..N access anchors；
2. POI / anchor → regional or gateway hubs；
3. POI → 少量 neighbor candidates（K <= 20）；
4. 具体日期时间由 Route Provider 计算动态 Route Facts。

Dynamic Route Facts 包括：

```text
departure-specific transit/driving duration
current traffic
fare
transfer count
last train
service disruption
```

这些不进入静态 POI Master 的 `matchScore`。

## Examples

```text
Tokyo Station
→ Gotemba gateway
→ local access anchor
→ target POI

Tokyo
→ Kawaguchiko Station
→ local bus/rail anchor
→ target POI

Kyoto Station
→ Kiyomizu area anchor
→ Kiyomizu-dera
```

## Suggested future data model

```text
poi_master
poi_features
poi_visit_profiles
poi_access_anchors
transport_anchors
poi_neighbor_edges
runtime_route_facts/cache
```

TASK-068-B may generate versioned datasets before production DB schema is frozen; it must not silently introduce production migrations.
