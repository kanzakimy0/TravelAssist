# TravelAssist POI Master / Feature / Fact Schema v0.1

> 日期：2026-09-10  
> 状态：Freeze Candidate / 待 Consumer Review  
> 分支：`design/a-trip-engine-poi-ai-architecture-v2`  
> 关联设计：`trip-engine-poi-ai-provider-design-v0.3.md`、`poi-feature-preference-codebook-v0.1.md`、`preference-state-v0.1.md`、`poi-scoring-spec-v0.1.md`  
> 关联素材生产：`docs/assets/core-destination-generation-plan.md`、`docs/assets/catalog/core-attraction-generation-manifest.v1.csv`  
> 本文件冻结候选范围：POI 身份、Facts、43 维 Feature、来源/置信度、审核状态、版本、生命周期、Region 关系、素材槽位关系和批量 JSONL 交换格式。  
> 本文件不修改既有 Master Code 编号体系，不冻结最终数据库物理表，不修改素材文件命名与图片尺寸规范。

---

# 1. 核心结论

POI Master 必须把以下概念分开：

```text
Identity
Facts
Features
Evidence / Provenance
Region Relations
Operational State
Asset Relations
```

标准关系：

```text
POI Identity
    │
    ├─ Canonical Facts
    ├─ POIFeatureV1 (43 dimensions)
    ├─ Source / Evidence
    ├─ Region Relations
    ├─ External Provider IDs
    └─ Lifecycle State
           ↓
      Trip Planning Engine
```

核心原则：

> **ID 只回答“它是谁”；Fact 回答“真实情况是什么”；Feature 回答“它具有怎样的旅行体验属性”；Score 回答“它对这次旅行有多适合”。**

四者不得互相替代。

---

# 2. 与当前 9,000 景点素材生产的关系

现有素材生产计划已冻结：

```text
300 destination
9,000 attraction slots
```

其中 `core-attraction-generation-manifest.v1.csv` 当前存在大量：

```text
unresolved:jp-tokyo:1
unresolved:jp-tokyo:2
...
```

这些 ID 是**实体解析 / 素材生产槽位**，不是 POI Master 身份。

必须区分：

```text
Asset / Resolution Slot ID
≠
POI Internal ID
≠
Master Code
≠
Provider Entity ID
≠
AI Local ID
```

解析成功后的正确关系：

```text
unresolved:jp-tokyo:17
        ↓ resolve
Canonical POI
        ↓
poi_internal_id = opaque stable ID
master_code     = 既有 Master Code 工作流分配
        ↓
asset slot 保留 source_slot_ref
```

禁止把：

```text
unresolved:jp-tokyo:17
```

直接升级为永久 POI ID。

理由：

- 一个 POI 可能被多个 destination 的素材任务引用；
- 同一实体可能跨多个旅游区域；
- 解析槽位可能被替换；
- 去重后多个槽位可能指向同一个 POI；
- POI 改名、关停、Provider ID 变化时身份仍需稳定。

另外：

> **9,000 个素材景点只是首批 asset-backed 核心子集，不等于未来完整 POI Master 规模。**

未来可扩展至 15,000+ POI；POI 可以暂时没有图片，素材槽位也可以暂时未解析。

---

# 3. Identity Layer

## 3.1 Internal ID

数据库内部主身份：

```text
poi_id
```

要求：

- opaque；
- stable；
- 不从名称、经纬度、Provider ID 推导；
- 不因改名、分类变化、Provider 更换而改变；
- 不复用已废弃 ID。

物理实现可为 UUID / bigint，由 DB / ORM 设计决定，本文件不冻结具体类型。

## 3.2 Master Code

使用现有并行工作的 Master Code 编号体系。

规则：

- 本文件不重新编号；
- Master Code 为业务可读稳定码；
- Internal ID 与 Master Code 必须一对一绑定；
- Master Code 不作为数据库物理主键的强制要求。

## 3.3 External ID

Provider / 官方系统 ID 单独保存：

```text
provider
provider_entity_id
provider_entity_type
observed_at
valid_until
```

例如：

```text
ekiworld / ...
map_provider / ...
official_registry / ...
```

Provider ID 变化不得生成新的 POI Identity。

## 3.4 Asset / Resolution Slot Ref

保留素材生产来源：

```text
source_slot_refs[]
```

例如：

```text
unresolved:jp-tokyo:17
source:jp-tokyo:poi:17
```

这些引用只用于追踪生产来源，不参与 Trip Runtime 身份。

## 3.5 AI Local ID

AI Local ID 只存在于单次 AI Context：

```text
0 / 1 / 2 / ...
```

调用结束即失效，不存进 POI Master。

---

# 4. POI Master Root

建议逻辑结构：

```ts
type PoiMasterV1 = {
  schemaVersion: "1.0"

  identity: PoiIdentityV1
  names: PoiNamesV1
  classification: PoiClassificationRefV1
  location: PoiLocationV1
  lifecycle: PoiLifecycleV1

  factsRevision: number
  featureRevision: number

  facts: PoiFactsV1
  features: PoiFeatureSetV1

  regionRelations: PoiRegionRelationV1[]
  externalIds: PoiExternalIdV1[]
  sourceRefs: SourceRef[]
  sourceSlotRefs: string[]

  createdAt: Instant
  updatedAt: Instant
}
```

这是领域逻辑结构，不代表最终数据库一定存成一个 JSONB。

---

# 5. Names / Alias

建议：

```text
canonical_name_ja
canonical_name_zh_cn
canonical_name_en
aliases[]
former_names[]
```

规则：

- 日文官方名称优先保存原文；
- 中文 / 英文可以为空，不得为了完整度凭空翻译成“官方名称”；
- aliases 用于搜索 / entity resolution，不是新的 Identity；
- 改名不换 poi_id；
- 历史名称进入 former_names；
- 同名不同地点必须是不同 Identity。

名称不能单独用于去重。

---

# 6. Classification

POI 类型使用独立 POI-Type-Codebook / 既有 Master Code 工作流，不在本文件创建第二套枚举。

逻辑至少引用：

```text
primary_type
subtype
```

当前素材 Manifest 中的：

```text
landmark
museum_culture
historic_religious
nature_viewpoint
family_theme
district_neighborhood
market_shopping
food_culture_experience
```

属于素材生产配额类别，不自动等同于未来完整 `primary_type`。

因此：

> Asset Category ≠ POI Type Codebook。

Adapter 可以映射，但不得直接复制成领域枚举而不审查。

---

# 7. Location Fact

建议：

```ts
type PoiLocationV1 = {
  countryCode: "JP"
  prefectureRef: string | null
  cityRef: string | null
  primaryRegionRef: string | null

  latitude: number | null
  longitude: number | null
  geometryRef: string | null

  addressJa: string | null
  addressEn: string | null
}
```

规则：

- 坐标必须来自已验证来源；
- unknown 使用 null；
- 禁止用城市中心点冒充 POI 坐标；
- 经度 / 纬度必须是 WGS84；
- Region / District 边界由 Region Graph / Geometry 数据拥有，POI 不复制边界真源；
- area-like POI 可使用 `geometryRef` 或 Region 关联，不要求伪造一个“精确入口点”。

---

# 8. POI Facts

能保存真实值的字段，不应变成 0–9 Feature。

建议逻辑分组：

## 8.1 Identity / Official Facts

```text
official_url
official_name
address
location
operator / owner（如公开且必要）
```

## 8.2 Operational Facts

```text
opening_calendar
last_entry
closed_days / exception calendar
reservation_required
reservation_policy_ref
```

营业时间不建议只保存：

```text
opening_time
closing_time
```

因为现实中存在：

- 星期差异；
- 季节差异；
- 临时休馆；
- 分时段开放；
- 最后入场时间；
- 夜间特别开放。

建议使用独立 `OperationalCalendarV1` 或引用：

```text
timezone
regular_schedule
exception_dates
valid_from
valid_to
source_ref
observed_at
```

详细 Calendar Contract 可后续单独冻结，但 POI Master 必须预留正式结构，不把复杂营业时间压成一个字符串。

## 8.3 Visit Facts

```text
stay_min_minutes
stay_max_minutes
indoor_ratio
reservation_required
age_restriction_ref
accessibility_fact_ref
```

`stay_min / max` 是规划事实 / 推荐事实，不等于 AI Compact DUR5。

## 8.4 Price Facts

```text
adult_price
child_price
is_free
currency
price_valid_from
price_valid_to
```

金额必须使用整数 minor unit + currency，不能保存格式化字符串作为 Canonical Value。

高频动态票价 / 实时库存可由 Provider Fact 覆盖，不要求全部永久写进 POI Master。

## 8.5 Access Facts

```text
nearest_station_ref
station_walk_minutes
nearest_bus_stop_ref
bus_walk_minutes
parking_summary_ref
access_notes
```

这些是 Access Prior / Master Fact。

真正某天从 A → POI 的路线仍由 Route Provider 运行时计算。

因此：

> nearest station fact ≠ Live Route Fact。

---

# 9. Fact Provenance

每个重要 Fact 必须可以追溯来源。

建议使用：

```ts
type FactEvidenceV1 = {
  factPath: string
  sourceRef: string
  sourceKind:
    | "official"
    | "provider"
    | "open_data"
    | "human_verified"
    | "derived"
  observedAt: Instant
  validFrom: Instant | null
  validUntil: Instant | null
  confidence: number | null
  reviewStatus: ReviewStatus
}
```

不要把整份第三方 Raw JSON 持久化到领域对象。

Provider Raw：

```text
Provider Raw
↓
Provider / Import Adapter
↓
Canonical Fact
↓
POI Master / Runtime Fact
```

事实冲突不能用“一律官方优先”这种单一规则解决。

应结合：

```text
authority
freshness
fact kind
source scope
verification
```

例如：

- 官方官网适合确认营业制度；
- Transit Provider 适合确认实时路线；
- 当天临时关闭公告可以比长期 Master Fact 更新。

具体 Freshness Policy 由 P0-9 冻结。

---

# 10. POIFeatureV1

POI Master 永久保留完整 43 维：

```text
01 scenery
...
43 winter
```

生产层必须显式区分：

```text
0    = 已知极低 / 无
1..9 = 有效值
null = unknown
```

Master / JSONL Canonical Record 推荐要求 43 个 Key 全部出现。

目的：

- 明确 unknown；
- 避免 missing 被误当默认值；
- 方便 coverage audit；
- 便于 Feature Version Migration。

AI Compact Context 可以按任务只传少量维度，但 Master 不做 Sparse Feature 存储语义。

---

# 11. Feature Metadata

每个 Feature 可独立保存证据状态。

建议：

```ts
type FeatureMetaV1 = {
  confidence: number | null
  featureSource:
    | "official_fact_derived"
    | "provider_fact_derived"
    | "ai_labeled"
    | "human_labeled"
    | "hybrid"
    | "unknown"
  evidenceRefs: string[]
  modelVersion: string | null
  reviewStatus: ReviewStatus
  updatedAt: Instant
}
```

Feature Set：

```ts
type PoiFeatureSetV1 = {
  featureVersion: "1.0"
  values: Record<PoiFeatureKey, 0|1|2|3|4|5|6|7|8|9|null>
  meta: Partial<Record<PoiFeatureKey, FeatureMetaV1>>
}
```

unknown Feature：

```text
value = null
```

不要求伪造 confidence。

Scoring 时：

- `null` 不参与正负贡献；
- coverage 降低；
- Hard Fact unknown 必须走 NEEDS_FACT，而不是依赖 Feature 猜测。

---

# 12. Review Status

继续沿用既有设计中的审核语义：

```text
auto_approved
second_review
human_review
verified
rejected
```

建议定义：

```text
auto_approved
= 自动流水线通过规则检查，尚非人工确认

second_review
= 进入二次 AI / 独立验证

human_review
= 已进入人工审查流程，结果尚未最终冻结

verified
= 满足当前产品的发布验证门

rejected
= 不允许进入 production candidate / recommendation
```

重要：

> `auto_approved ≠ verified`。

Tier S / 高风险 POI 可以要求更高审核等级。

---

# 13. Overall POI Production Status

Feature Review 与 POI Entity Status 分开。

建议实体状态：

```text
active
seasonal
temporarily_closed
permanently_closed
merged
deprecated
```

`unresolved` 不属于正式 POI Master 状态；它属于 ingestion / asset resolution staging。

## active

正常可进入 Candidate Pipeline。

## seasonal

实体存在，但开放 / 价值明显季节化；运行时必须检查日期。

## temporarily_closed

暂时不进入普通可执行 Candidate，除非有未来 reopen Fact。

## permanently_closed

保留历史身份，不再生成新行程。

## merged

重复实体被合并：

```text
merged_into = canonical poi_id
```

旧 ID 永不复用。

## deprecated

实体模型发生拆分 / 替代，保留兼容解析。

---

# 14. Rename / Merge / Split Rules

## Rename

```text
same entity
→ same poi_id
→ canonical name update
→ old name → former_names
```

## Provider ID Changed

```text
same entity
→ same poi_id
→ external ID relation update
```

## Duplicate Merge

```text
POI A
POI B
↓ verified duplicate
POI A canonical
POI B status=merged
POI B.merged_into=A
```

Trip / Asset / historical references to B 仍可解析到历史身份，并由 Resolver 返回 canonical A。

## Split

如果一个旧实体实际包含两个独立可规划实体：

```text
Old POI → deprecated
New POI A
New POI B
```

不得偷偷复用旧 ID 表示其中一个新实体。

---

# 15. Region Relations

POI 与 Region 是多对多，不应只有单一 `region_id`。

建议：

```ts
type PoiRegionRelationV1 = {
  poiRef: string
  regionRef: string
  relation:
    | "located_in"
    | "primary_for"
    | "spans"
    | "gateway_to"
    | "serves"
  confidence: number | null
  sourceRef: string | null
}
```

同时允许：

```text
primaryRegionRef
```

作为快速检索入口，但它不是唯一关系真相。

例如某山岳 / 湖泊 / 步道可跨多个 Region。

---

# 16. District / Neighborhood 与 POI 的边界

现有素材 Manifest 含：

```text
district_neighborhood
```

而新架构又有 Region Level 2 / District。

为避免重复：

- 行政 / 旅游区域结构由 Region Graph 拥有；
- 如果“街区本身”是用户可安排的游览体验，可存在 area-scope POI；
- area-scope POI 必须引用对应 Region，而不是复制一套区域层级；
- 例如“道顿堀街区游览”可作为 POI-like experience，但“难波 Region”仍属于 Region Graph。

最终是否创建 area-scope POI 由 Entity Resolution / POI Type Codebook 决定。

---

# 17. Asset Relation

POI Master 不拥有图片二进制真源。

建议关系：

```text
POI Master
   ↑ poi_ref / master_code
Asset Catalog
   ↓
source / variant / rights / authenticity
```

素材系统继续负责：

```text
source_job_id
variant_id
rights_status
authenticity
image dimensions
```

POI Master 最多保留：

```text
preferred_asset_ref / asset_refs
```

作为引用，不复制 Asset Manifest。

必须允许：

```text
POI exists + no asset yet
```

也允许：

```text
asset slot exists + POI unresolved
```

---

# 18. Version / Revision

建议至少区分：

```text
schemaVersion
factsRevision
featureVersion
featureRevision
```

含义：

```text
schemaVersion
= wire / object shape

factsRevision
= canonical fact snapshot 变化

featureVersion
= 43维 Codebook / Feature Contract 版本

featureRevision
= 同一 featureVersion 下值 / confidence / evidence 更新
```

Planning Decision Trace 必须能引用：

```text
poi_id
factsRevision
featureVersion
featureRevision
scoringConfigVersion
```

这样以后才能重现：

> 为什么 2026-09-10 系统给这个景点 82 分？

---

# 19. Current + History

数据库运行时可以维护 current view，但审核 / 调试需要历史。

逻辑上建议：

```text
POI Identity          stable
POI Current Facts     mutable with revision
POI Fact History      append/history
POI Current Features  mutable with revision
POI Feature History   append/history
```

本文件不冻结最终采用：

```text
history tables
version tables
event log
JSONB snapshots
```

由 DB 设计选择，但必须满足 Revision / Trace 可重现性。

---

# 20. JSONL 批量生产格式

15,000 POI 批量生产推荐使用：

```text
1 POI = 1 JSON line
```

Canonical interchange 示例：

```json
{
  "schemaVersion": "1.0",
  "identity": {
    "poiId": "opaque-poi-id",
    "masterCode": "existing-master-code"
  },
  "names": {
    "ja": "サンプル寺院",
    "zhCn": "示例寺院",
    "en": "Sample Temple",
    "aliases": []
  },
  "classification": {
    "primaryType": "type-code",
    "subtype": null
  },
  "location": {
    "countryCode": "JP",
    "prefectureRef": "...",
    "cityRef": "...",
    "primaryRegionRef": "...",
    "latitude": 35.0,
    "longitude": 135.0
  },
  "lifecycle": {
    "status": "active",
    "mergedInto": null
  },
  "factsRevision": 1,
  "featureRevision": 1,
  "facts": {
    "officialUrl": "https://example.invalid/",
    "stayMinMinutes": 60,
    "stayMaxMinutes": 90,
    "reservationRequired": false,
    "indoorRatio": 20
  },
  "features": {
    "featureVersion": "1.0",
    "values": {
      "scenery": 8,
      "history": 9,
      "architecture": 8,
      "photo": 8,
      "food": 1,
      "shopping": 0,
      "nature": 6,
      "night": 2,
      "onsen": 0,
      "art": 5,
      "entertainment": 2,
      "local": 8,
      "unique": 7,
      "hidden": 5,
      "iconic": 8,
      "family": 7,
      "senior": 6,
      "couple": 7,
      "solo": 8,
      "relax": 7,
      "adventure": 2,
      "educational": 9,
      "interactive": 2,
      "rest": 4,
      "walking": 5,
      "physical": 4,
      "crowd": 6,
      "queue": 4,
      "wheelchair": null,
      "stroller": null,
      "morning": 8,
      "daytime": 8,
      "sunrise": 2,
      "sunset": 5,
      "rain": 4,
      "heat": 5,
      "cold": 5,
      "snow": 5,
      "weather_sensitive": 5,
      "spring": 8,
      "summer": 6,
      "autumn": 9,
      "winter": 5
    },
    "meta": {}
  },
  "regionRelations": [],
  "externalIds": [],
  "sourceRefs": [],
  "sourceSlotRefs": []
}
```

上例为结构示例，不代表任何真实景点评分。

推荐按都道府县 / 批次拆分文件，但最终仓库路径由数据生产 Task 冻结，本文件不强制路径。

---

# 21. Ingestion Staging

正式 POI Master 与生产 Staging 必须分离。

Staging 可以存在：

```text
unresolved
candidate
conflict
duplicate_suspected
rights_blocked
source_missing
low_confidence
```

但只有满足发布门的 resolved entity 才进入 Production POI Master。

因此：

```text
Asset Manifest unresolved slot
↓
Entity Resolution Staging
↓
Fact / Source Validation
↓
Feature Production
↓
Quality Gate
↓
POI Master
```

---

# 22. Validation Gates

Production POI 至少验证：

## Identity

```text
unique poi_id
unique master_code
no unresolved:* as poi_id
merged_into target exists
no ID reuse
```

## Japan Scope

日本首发版：

```text
countryCode = JP
```

跨境实体未来另设扩展规则。

## Location

```text
lat/lng either both valid or both null
WGS84 bounds valid
no fabricated centroid
region refs valid when present
```

## Feature

```text
exact 43 known keys
value in 0..9 or null
featureVersion supported
confidence in 0..1 when present
unknown != 0
```

## Facts

```text
currency / amount valid
opening fact structured / referenced
reservation semantics valid
sourceRefs resolve
```

## Lifecycle

```text
merged requires mergedInto
active cannot mergedInto
rejected staging record cannot publish as active
permanently_closed excluded from new itinerary candidate
```

## Source

```text
critical facts traceable
AI label modelVersion recorded
no raw provider secret / token / private payload
```

---

# 23. Data Quality Reports

批量生产至少输出：

```text
coverage_report
unknown_feature_report
low_confidence_report
source_gap_report
duplicate_entity_report
invalid_region_ref_report
lifecycle_conflict_report
feature_distribution_report
```

推荐同时检测：

```text
大量 Feature 全为 5
同一模型批次异常集中 9
同类 POI 分布异常
iconic / hidden 极端冲突
walking / physical 与 Facts 明显矛盾
```

这些属于异常检测，不表示自动改值。

---

# 24. Logical DB Boundary

后续数据库可按下列逻辑边界实现：

```text
poi_master
poi_names / aliases
poi_external_ids
poi_region_relations
poi_facts
poi_fact_evidence
poi_feature_sets
poi_feature_meta / evidence
poi_lifecycle_history
```

但：

> 本文件冻结的是领域契约与语义，不冻结最终 SQL 表数量。

实现可以在性能、版本历史与查询便利之间选择规范化 / JSONB 混合方案。

---

# 25. AI Boundary

AI 不直接读取完整 POI Master。

标准：

```text
POI Master
↓
Scoring / Candidate Engine
↓
Task Projection
↓
AI Compact Context
```

AI 不需要：

- Internal DB ID 全字典；
- source evidence 全文；
- 43维全部字段（除非任务明确需要）；
- raw opening calendar；
- raw Provider JSON；
- revision history。

AI 输出也不得直接修改 POI Master。

POI 数据生产 AI 与在线 Trip Decision AI 是不同工作流。

---

# 26. 与 Scoring Spec 的关系

Scoring Input 应读取一个明确版本的：

```text
POI Feature Snapshot
+ Feature Confidence
+ Fact Snapshot
```

例如：

```text
poi_id = P123
factsRevision = 7
featureVersion = 1.0
featureRevision = 12
```

Score Breakdown 保存这些引用。

这样当后续 Feature 更新为 revision 13 时，不会反过来改变旧 Decision Trace 的解释。

---

# 27. 当前冻结候选

以下建议进入 v0.1 Freeze Candidate：

- Asset / Resolution Slot ID 不得成为 POI Master ID；
- Internal ID / Master Code / Provider ID / Local AI ID 分离；
- POI Identity 稳定，改名 / Provider ID 变化不换 ID；
- permanently closed 不删除身份；
- duplicate merge 使用 `merged_into`，旧 ID 不复用；
- Facts 与 Feature 分离；
- 43 Feature 全量保存，unknown = null；
- Feature 可独立 confidence / source / review；
- Region 为多对多 relation；
- Asset Catalog 与 POI Master 解耦；
- 9,000 asset-backed subset ≠ 未来完整 15,000+ POI Master；
- factsRevision / featureVersion / featureRevision 可追溯；
- JSONL 1 POI / line 作为批量交换格式；
- unresolved / duplicate / conflict 保留在 Staging，不进入 Production Master。

---

# 28. 仍待后续设计

本文件不冻结：

- 最终 POI-Type-Codebook；
- 最终 SQL / Drizzle 物理表；
- OperationalCalendar 详细 Wire Contract；
- Fact Freshness TTL；
- 票价 / 实时库存 Provider Contract；
- 15,000 POI 最终生产路径 / batch size；
- Feature 自动审核比例；
- Tier S/A/B/C 最终人工审核门槛；
- 最终素材覆盖率。

这些分别由后续 DB / Provider / P0-9 / POI Production Task 冻结。

---

# 29. 一句话定义

> **POI Master 是 TravelAssist 对“一个真实旅行实体是谁、已知事实是什么、旅行体验特征是什么、这些判断来自哪里”的长期稳定记录；它不是素材清单、不是 Provider Raw JSON、不是 AI Prompt，也不是当前用户的推荐分数。**
