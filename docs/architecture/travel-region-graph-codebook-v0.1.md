# TravelAssist Travel Region Graph Schema / Codebook v0.1

> 日期：2026-09-10  
> 状态：Freeze Candidate / 待 Consumer Review  
> 分支：`design/a-trip-engine-poi-ai-architecture-v2`  
> 关联设计：`trip-engine-poi-ai-provider-design-v0.3.md`、`poi-master-schema-v0.2.md`、`poi-scoring-spec-v0.2.md`、`itinerary-feasibility-spec-v0.1.md`、`route-contract.md`  
> 本文件冻结候选范围：Region Node、Region Type、RegionRelation、Gateway、TravelEdge、TravelEdgeVariant、方向性、规划先验、版本/证据与图质量规则。  
> 本文件不修改既有 Master Code 编号体系，不冻结最终 Region 数量、每节点 Edge 数量、Corridor 权重或数据库物理表。

---

# 1. 核心结论

TravelAssist 的地区体系不能只是一棵行政树，也不能把实时路线结果直接存成“地区之间的边”。

必须分三层：

```text
Region Structure
= 这个地区是什么、包含什么、和谁相邻

Travel Graph
= 哪些地区适合作为连续旅行节点，以及典型移动先验

Live Route Fact
= 某一天、某时间、某用户真正怎么从 A 到 B
```

标准关系：

```text
RegionNode
   │
   ├─ RegionRelation
   │    contains / adjacent / overlaps / gateway_of
   │
   └─ TravelEdge (directed planning prior)
          └─ TravelEdgeVariant[]
                 ↓ runtime verify
          Canonical Route Fact
```

核心原则：

> **RegionRelation 负责“空间/旅游结构”；TravelEdge 负责“旅行组合先验”；Route Provider 负责“当天真实路线”。三者不得互相冒充。**

---

# 2. Region Identity

Region 使用稳定身份：

```text
region_id
master_code
```

规则：

- `region_id` 为 opaque stable internal identity；
- `master_code` 使用当前并行工作的既有 Master Code 体系；
- 本文件不重新编号；
- 改名、边界小调整、Provider 变化不应自动换 `region_id`；
- Region 合并 / 拆分必须有显式 lifecycle / migration 记录；
- 行政代码（都道府县、市町村 code）属于外部事实，不等于 Region Internal ID。

必须区分：

```text
Region Internal ID
≠ Master Code
≠ Administrative Code
≠ Transport Node ID
≠ POI ID
≠ AI Local ID
```

---

# 3. Region Type Codebook

v0.1 建议使用以下逻辑类型：

```text
country
macro_area
prefecture
municipality
travel_region
district
stay_cluster
onsen_resort
gateway
```

## 3.1 country

日本首版根节点：

```text
Japan
```

不代表未来全球版已经实现。

## 3.2 macro_area

产品级大区域，例如：

```text
Hokkaido
Tohoku
Kanto
Chubu
Kansai
Chugoku
Shikoku
Kyushu-Okinawa
```

主要用于覆盖、导航、搜索裁剪；不是用户行程必须停留的节点。

## 3.3 prefecture

47 都道府县行政层。

行政事实来自权威数据源；旅游规划可以跨 prefecture 组成其他 `travel_region`。

## 3.4 municipality

市 / 区 / 町 / 村等行政实体。

例如：

```text
Kyoto City
Takayama City
```

## 3.5 travel_region

**Macro Corridor 的主要旅行节点。**

定义：

> 对游客而言值得作为连续停留、住宿、日游基点或明确转场节点的区域。

例如：

```text
Tokyo
Hakone
Kawaguchiko
Kyoto
Nara
Takayama
Shirakawa-go
Kanazawa
```

Travel Region 不要求与行政边界一一相等。

## 3.6 district

Region 内的主要游览片区，例如：

```text
Asakusa / Ueno
Shibuya / Harajuku
Higashiyama
Arashiyama
Namba / Dotonbori
```

用于 Daily Planning / POI 聚类。

## 3.7 stay_cluster

住宿规划区域。

例如：

```text
Kyoto Station Area
Gion / Kawaramachi Stay Cluster
Shinjuku Stay Cluster
```

它和 district 可以空间重叠，但用途不同，因此不强行合并为同一节点。

## 3.8 onsen_resort

温泉 / 度假型旅行节点，例如：

```text
Kinosaki Onsen
Kusatsu Onsen
```

可同时承担 `travel_region` 的旅行角色；v0.1 使用明确 `region_type`，不要求复制两个身份。

## 3.9 gateway

Gateway 是**规划入口 / 出口抽象**，例如：

```text
Tokyo Air Gateway
Kyoto Rail Gateway
Hakone Main Gateway
```

Gateway 自身不复制真实车站 / 机场 / 港口数据，而是引用：

```text
transport_node_refs[]
```

真实 Transport Node 属于既有 Transport Master / Route Contract。

因此：

> `Gateway ≠ Station/Airport/Port Master`。

---

# 4. Region Node Schema

建议逻辑结构：

```ts
type TravelRegionNodeV1 = {
  schemaVersion: "1.0"

  regionId: string
  masterCode: string
  regionType: RegionTypeV1

  names: {
    nameJa: string | null
    nameZhCn: string | null
    nameEn: string | null
    aliases: string[]
  }

  administrativeRefs: {
    prefectureRefs: string[]
    municipalityRefs: string[]
    externalAdminCodes: string[]
  }

  geometry: {
    center: GeoPoint | null
    geometryRef: string | null
    geometryKind: "administrative" | "tourism" | "cluster" | "point" | "unknown"
  }

  planningProfileRef: string | null
  stayProfile: RegionStayProfileV1 | null
  gatewayProfile: GatewayProfileV1 | null

  lifecycle: RegionLifecycleV1
  sourceRefs: string[]
  revision: number
  createdAt: Instant
  updatedAt: Instant
}
```

这是领域逻辑结构，不要求数据库存成一个 JSONB。

---

# 5. Geometry / Boundary

Region 不一定都有严格行政 polygon。

例如：

```text
Higashiyama
Namba / Dotonbori
Fuji Five Lakes tourism region
```

可能是旅游概念区，而非法律边界。

因此必须保存：

```text
geometryKind
geometryRef / center
sourceRefs
```

规则：

- 行政区域可引用权威 polygon；
- 旅游区域可使用经过审查的 tourism geometry / cluster；
- 暂无边界时可以只有 center / hierarchy，不得伪造精确 polygon；
- Geometry 用于筛选 / 地图 / POI 归属辅助，不得作为唯一 POI 身份判断；
- POI 可以通过显式 `PoiRegionRelation` 加入 Region，而不要求坐标 point-in-polygon 成为唯一真相。

---

# 6. RegionRelation Codebook

RegionRelation 负责稳定结构关系，不表示实时交通。

v0.1：

```text
contains
adjacent
overlaps
gateway_of
```

## 6.1 contains

有向：

```text
parent → child
```

例如：

```text
Japan contains Kansai
Kyoto Prefecture contains Kyoto City
Kyoto Travel Region contains Higashiyama District
```

**只 canonical 存 `contains`。**

`part_of` 作为查询时的反向视图派生：

```text
child part_of parent
```

不得同时持久化 `contains` 和 `part_of` 两份边，避免双写漂移。

## 6.2 adjacent

语义：地理 / 游览空间上直接相邻。

逻辑上对称：

```text
A adjacent B
⇔
B adjacent A
```

数据库可只存 canonical unordered pair，由查询层派生双向。

`adjacent` 不代表交通方便。

## 6.3 overlaps

语义：两个不同用途的 Region 空间重叠。

例如：

```text
District overlaps Stay Cluster
```

对称关系。

## 6.4 gateway_of

有向：

```text
Gateway → Served Region
```

例如：

```text
Kyoto Rail Gateway → Kyoto Travel Region
```

真实交通能力必须进一步由 Gateway 引用 Transport Nodes + Route Provider 验证。

---

# 7. RegionRelation Schema

```ts
type RegionRelationV1 = {
  relationId: string
  relationType: "contains" | "adjacent" | "overlaps" | "gateway_of"
  fromRegionRef: string
  toRegionRef: string

  confidence: number | null
  sourceRefs: string[]
  validFrom: Instant | null
  validUntil: Instant | null
  lifecycleStatus: "active" | "deprecated"
  revision: number
}
```

规则：

- `from == to` 非法；
- 悬空 Region Ref 非法；
- contains 不允许形成结构循环；
- canonical pair 不允许重复；
- 对称 Relation 不重复存反向副本；
- `contains` 与 `overlaps` 不允许仅因为坐标接近而由模型自动猜测。

---

# 8. Region Planning Profile

Region 本身可以有宏观旅行画像，但它不是第二套 POI Feature Master。

建议使用**派生 Region Planning Profile**：

```text
scenery
history
food
shopping
nature
onsen
night
local
unique
hidden
iconic
relax
adventure
family
senior
```

这些值可来自：

```text
POI aggregation
+ Region facts
+ curated region-level knowledge
```

必须保存：

```text
profileVersion
configVersion
sourceSnapshotRefs
coverage
confidence
updatedAt
```

原则：

> Region Profile 是 Candidate Search 的派生索引，不是 POIFeatureV1 的复制真源。

它必须可重算；最终维度/权重 Pilot 后校准。

---

# 9. Region Stay Profile

Macro Planning 需要知道“值得停多久”，但不要求像 POI 一样精确到分钟。

建议：

```ts
type RegionStayProfileV1 = {
  dayTripCapable: boolean | null
  minVisitDays: number | null
  recommendedVisitDays: number | null
  maxUsefulVisitDays: number | null
  recommendedNights: number | null
  confidence: number | null
  sourceRefs: string[]
}
```

示例概念：

```text
Nara
  dayTripCapable = true
  minVisitDays ≈ 0.5
  recommendedVisitDays ≈ 1

Kyoto
  dayTripCapable = true（从大阪等）
  但作为目的地区域 recommendedVisitDays 可为多个 day
```

具体数值不在本文件冻结。

重要：

- `RegionStayProfile` 是宏观规划先验；
- 不直接生成具体每天时刻；
- Day Planner 仍使用 POI Visit Profile + Itinerary Feasibility。

---

# 10. TravelEdge 定义

TravelEdge 回答：

> **把 Region B 接在 Region A 后面，作为旅行序列的一部分，通常是否合理？**

它不是：

```text
地理相邻
实时路线
实时班次
实时票价
```

TravelEdge 默认**有向**：

```text
A → B
```

即使现实路线通常对称，也必须允许：

```text
A → B attributes
≠
B → A attributes
```

原因包括：

- Gateway 结构不同；
- 行李处理不同；
- 到达后的住宿价值不同；
- 典型旅行序列不同；
- 季节 / 时段先验可能不同；
- 未来最后交通 / check-in 等规划影响。

反向路线若需要，建立独立 Edge。

---

# 11. TravelEdge Scope

建议：

```text
macro
local
gateway
```

## macro

Travel Region / 城市 / 温泉度假区之间，用于 Macro Corridor Search。

例如：

```text
Tokyo → Hakone
Tokyo → Matsumoto
Takayama → Shirakawa-go
Kyoto → Osaka
```

## local

District / Stay Cluster 之间的规划先验。

Local Edge 只用于粗筛 / 聚类，不替代真实 Route Provider。

## gateway

Travel Region 与 Gateway 的入口 / 出口规划关系。

---

# 12. TravelEdge Schema

```ts
type TravelEdgeV1 = {
  edgeId: string
  fromRegionRef: string
  toRegionRef: string
  scope: "macro" | "local" | "gateway"

  planningPrior: {
    tripCompatibility: number | null       // 0..9
    dayTripFit: number | null              // 0..9
    sameDayTransitionFit: number | null    // 0..9
    overnightTransitionFit: number | null  // 0..9
    scenicTransition: number | null        // 0..9
    slowTravelFit: number | null           // 0..9
    luggageEase: number | null             // 0..9, 高=容易
    reliabilityPrior: number | null        // 0..9
    detourPenaltyPrior: number | null      // 0..9, 高=绕路代价高
  }

  recommendedStayAfterArrivalDays: number | null
  variants: TravelEdgeVariantV1[]

  sourceRefs: string[]
  confidence: number | null
  validFrom: Instant | null
  validUntil: Instant | null
  revision: number
  lifecycleStatus: "active" | "deprecated" | "seasonal"
}
```

规则：

- `0` 为明确极低；`null` 为 unknown；
- Edge 评分是 planning prior，不是用户动态 Score；
- 用户 / Trip Style 的真正 edgeScore 在运行时计算；
- `detourPenaltyPrior` 高代表通常不顺路，不与 `tripCompatibility` 做同义重复；
- day-trip / overnight 只是可组合性先验，必须由当天 Route Fact / schedule 再验证。

---

# 13. TravelEdgeVariant

同一个 TravelEdge 可以有多个典型方式：

```text
rail
bus
car
flight
ferry
mixed
```

`walk` 通常只用于 local edge；Macro Edge 不应为了“存在理论步行路线”创建无意义 walk variant。

建议结构：

```ts
type TravelEdgeVariantV1 = {
  variantId: string
  mode: "rail" | "bus" | "car" | "flight" | "ferry" | "walk" | "mixed" | "other"

  gatewayFromRef: string | null
  gatewayToRef: string | null

  typicalDuration: {
    lowMin: number | null
    typicalMin: number | null
    highMin: number | null
  }

  typicalCostJpy: {
    low: number | null
    typical: number | null
    high: number | null
  }

  typicalTransfers: {
    low: number | null
    typical: number | null
    high: number | null
  }

  typicalWalkMinutes: {
    low: number | null
    typical: number | null
    high: number | null
  }

  frequencyBand: "very_high" | "high" | "medium" | "low" | "very_low" | "unknown"
  reservationPrior: "usually_not_needed" | "optional" | "often_recommended" | "usually_required" | "unknown"

  seasonalAvailabilityRef: string | null
  sourceRefs: string[]
  observedAt: Instant | null
  validUntil: Instant | null
  confidence: number | null
}
```

---

# 14. 为什么使用 Range 而不是一个固定时间

不建议静态 Edge 保存：

```text
Tokyo → Hakone = 85 min
```

然后永久当真。

因为实际会受到：

- 出发 Gateway；
- 等车；
- 换乘；
- 时刻表；
- 快车 / 普通车；
- 交通季节；
- 票务；
- 用户起点；
- 行李等影响。

所以 TravelEdgeVariant 使用：

```text
low / typical / high
```

只是搜索先验。

真正进入行程前必须：

```text
TravelEdge Variant
↓ candidate
Route Provider
↓
Canonical Route Fact
↓
Itinerary Feasibility
```

---

# 15. TravelEdge 与 Live Route Fact 的硬边界

禁止：

```text
TravelEdge.typicalDuration
→ 直接写进最终 Trip Transport Item
```

必须：

```text
Macro Search
uses TravelEdge Prior

Final / Near-final Itinerary
uses Canonical Route Fact
```

如果 Route Provider 暂时不可用：

- Macro Candidate Search 可继续使用 prior；
- 正式可执行方案是否允许降级由 Fact Freshness / Fallback Policy 决定；
- UI 必须区分“估算”与“已验证路线”；
- Planning Prior 不得伪装成已确认班次。

---

# 16. Gateway Profile

```ts
type GatewayProfileV1 = {
  gatewayKind: "rail" | "airport" | "bus" | "port" | "road" | "mixed"
  transportNodeRefs: string[]
  servedRegionRefs: string[]

  luggageEasePrior: number | null
  transferEasePrior: number | null
  centralityPrior: number | null

  sourceRefs: string[]
  confidence: number | null
}
```

Gateway 可以服务多个 Region；Region 也可以有多个 Gateway。

例如：

```text
Tokyo
├─ Tokyo Station gateway
├─ Shinjuku gateway
├─ Haneda gateway
└─ Narita gateway
```

但 physical station / airport 仍由 Transport Master 拥有。

---

# 17. Edge Runtime Score

TravelEdge Master 保存 planning prior；真正某次旅行的 Edge Score 动态计算。

概念：

```text
edgeScore =
TripCompatibilityPrior
+ UserTravelStyleFit
+ ScenicTransitionFit
+ DayTrip / Overnight Fit
+ LuggageFit
+ LiveRouteFit
- DetourPenalty
- HotelChangePenalty
- TransportRisk
```

其中：

```text
TravelEdge prior
= Master / Graph

UserTravelStyleFit
= Preference / Trip Context

LiveRouteFit
= Route Provider
```

最终权重属于 Corridor / Candidate Pipeline Pilot，不在本文件冻结。

---

# 18. Region Graph Versioning

Region Graph 必须可以重现历史规划。

建议：

```text
graphSchemaVersion
graphDataRevision
nodeRevision
relationRevision
edgeRevision
```

每次规划 trace 至少保存：

```text
graphDataRevision
region candidate refs
edge refs / edge revisions
```

不能只记录“当时用了最新版”。

---

# 19. Lifecycle

Region：

```text
active
deprecated
merged
split
archived
```

TravelEdge：

```text
active
seasonal
deprecated
```

规则：

- 改名不换 Region ID；
- merged Region 保留 redirect / successor refs；
- split 需要显式 successor refs；
- 已删除/废弃的 Region ID 不复用；
- 历史 Trip 引用仍可解析到旧 Identity；
- Edge 失效不删除历史 decision trace。

---

# 20. Evidence / Provenance

每个 Node / Relation / Edge 可保存：

```text
sourceRefs
sourceKind
observedAt
validFrom
validUntil
confidence
reviewStatus
```

来源可包括：

```text
official / administrative
transport provider derived
open data
human curated
derived from POI / Route snapshots
```

AI 不得只凭记忆创建“高置信度 TravelEdge”。

批量生成 Edge 时建议：

```text
candidate generation
↓
route / geography evidence
↓
rule validation
↓
AI / human review for tourism semantics
↓
approved graph
```

---

# 21. Graph Quality Gates

至少验证：

## Node

```text
unique region_id
unique master_code
valid region_type
valid lifecycle
no dangling administrative refs
```

## contains

```text
no self edge
no duplicate edge
no dangling refs
no structural cycle
```

## adjacent / overlaps

```text
canonical unordered pair unique
no reverse duplicate
```

## gateway

```text
gateway node must have gatewayProfile
gatewayProfile.transportNodeRefs non-dangling
```

## TravelEdge

```text
from != to
no duplicate active edge for same scope + semantic identity
variants have unique variantId
all gateway refs valid
range low <= typical <= high
cost >= 0
walk >= 0
transfer >= 0
prior score either 0..9 or null
```

## Connectivity

Pilot 至少报告：

```text
orphan travel_region nodes
weakly connected components
nodes with zero outgoing macro edge
nodes with zero incoming macro edge
```

不要求所有 District 建 Macro Edge。

---

# 22. 不全连接

Region Graph 必须保持稀疏。

不要：

```text
500 Region × 499
≈ 249,500 directed pairs
```

全部写 Edge。

只建立：

- 常见连续旅行关系；
- 合理直达 / 低成本连接；
- 高价值 Scenic / Slow Travel Corridor；
- Gateway 主连接；
- 必要 local planning adjacency。

不存在静态 TravelEdge 不代表现实世界“绝对不能去”。

运行时可以：

```text
Graph Search 未命中
↓
Route Provider / Fallback Discovery
↓
若事实可行
→ 临时候选
→ 后续审查是否补回 Master Graph
```

---

# 23. Region / POI 关系

POI Master v0.2 已定义多对多 Region Relation。

Region Graph 不复制 POI 数据，只引用：

```text
POI → primary tourism region
POI → district
POI → administrative region
POI → optional stay cluster relation
```

Candidate Pipeline 可以：

```text
Region Candidate
↓
District Candidate
↓
POI Relations
↓
POI Candidate
```

不要使用：

```text
Region contains raw POI array
```

作为唯一存储真源。

---

# 24. JSONL / 批量生产建议

建议 Region / Edge 批量数据使用可独立审查文件：

```text
regions.v1.jsonl
region-relations.v1.jsonl
travel-edges.v1.jsonl
```

每行一个 canonical record。

示例 TravelEdge：

```json
{
  "edgeId": "edge_tokyo_hakone_macro",
  "fromRegionRef": "tokyo",
  "toRegionRef": "hakone",
  "scope": "macro",
  "planningPrior": {
    "tripCompatibility": 9,
    "dayTripFit": 8,
    "sameDayTransitionFit": 9,
    "overnightTransitionFit": 8,
    "scenicTransition": 7,
    "slowTravelFit": 7,
    "luggageEase": 6,
    "reliabilityPrior": 8,
    "detourPenaltyPrior": 2
  },
  "variants": [],
  "sourceRefs": [],
  "confidence": null,
  "validFrom": null,
  "validUntil": null,
  "revision": 1,
  "lifecycleStatus": "active"
}
```

示例数值仅用于说明 wire shape，不是已核验东京→箱根真实评分。

---

# 25. Pilot 建议

首个 Region Graph Pilot 不做全国一次性冻结。

建议覆盖：

```text
Tokyo
Hakone
Kawaguchiko
Matsumoto
Takayama
Shirakawa-go
Kanazawa
Kyoto
Nara
Osaka
Kobe
```

至少测试两类 Corridor：

```text
Tokyo → Hakone → Kyoto → Osaka

Tokyo → Matsumoto → Takayama → Shirakawa-go → Kanazawa → Osaka
```

验证：

- 高效率 / 普通 / slow travel 用户排序是否变化；
- day-trip 与 overnight 先验是否合理；
- luggage / hotel-change penalty 是否改变路线；
- TravelEdge Prior 与 Live Route 验证是否严格分离；
- 删除某条 Edge 后 fallback discovery 是否可用；
- 不同 Graph revision 是否可重现。

---

# 26. Freeze Candidate 项

v0.1 建议冻结：

1. Region / Relation / TravelEdge / Live Route 三层分离；
2. Region Type Codebook 的语义边界；
3. `contains` canonical 存储、`part_of` 派生；
4. `adjacent / overlaps` 对称 canonical pair；
5. Gateway 引用 Transport Node，不复制交通 Master；
6. TravelEdge 默认有向；
7. TravelEdge 可含多个 Variant；
8. Variant 使用 low / typical / high 先验，不伪造实时精度；
9. dayTripFit / overnightFit / luggage / scenic / detour 等作为 Planning Prior；
10. Planning Prior 不得直接写进最终 Trip Transport；
11. Region Profile 为可重算派生索引；
12. Graph 必须版本化、可审计；
13. Graph 保持稀疏，不全连接；
14. Region / POI 使用显式关系，不依赖单一 point-in-polygon；
15. Graph Quality Gate 必须检查环、悬空、重复和孤岛。

---

# 27. 不在 v0.1 写死

```text
全国 Region 最终数量
每 Region TravelEdge 数量
Region Profile 最终维度/权重
Region Stay Profile 最终数值
TravelEdge 各 prior 最终评分
Edge Runtime Score 权重
Detour Budget
Corridor Score
Gateway 全集
Local Edge 覆盖深度
图更新频率
```

这些由 Region Graph Pilot + Candidate Pipeline Pilot 校准。

---

# 28. 下一依赖

本文件冻结候选后，下一项应进入：

```text
Candidate Pipeline Contract
```

它将正式定义：

```text
Region Candidate
↓
Corridor Candidate
↓
POI Candidate
↓
Hard Filter
↓
Preference / Context Score
↓
Route / Itinerary Feasibility
↓
Pareto Prune
↓
Daily Top-N
↓
AI Candidate Set
```
