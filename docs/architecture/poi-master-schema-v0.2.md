# TravelAssist POI Master / Feature / Fact Schema v0.2

> 日期：2026-09-10  
> 状态：Freeze Candidate / 待 Consumer Review  
> 分支：`design/a-trip-engine-poi-ai-architecture-v2`  
> Supersedes：`poi-master-schema-v0.1.md`  
> 关联设计：`poi-feature-preference-codebook-v0.1.md`、`preference-state-v0.1.md`、`poi-scoring-spec-v0.2.md`、`itinerary-feasibility-spec-v0.1.md`  
> 关联素材生产：`docs/assets/core-destination-generation-plan.md`、`docs/assets/catalog/core-attraction-generation-manifest.v1.csv`  
> 本版主要修正：将 POI 的“推荐游览时间”和 walking / physical 负担建立正式关系；增加 Visit Mode、Duration Profile、Load Facts / Load Profile 边界，使 30 / 60 / 90 分钟游览可以产生不同实际疲劳。

---

# 1. 核心分层

POI Master 必须分开：

```text
Identity
Facts
Visit Profiles
Features
Evidence / Provenance
Region Relations
Lifecycle
Asset Relations
```

标准关系：

```text
POI Identity
  ├─ Canonical Facts
  ├─ Visit Facts
  ├─ Visit Profiles
  ├─ POIFeatureV1
  ├─ Evidence
  ├─ Region Relations
  └─ Lifecycle
          ↓
Trip Planning Engine
```

核心原则：

> **Fact 保存“真实可验证的数据”；Visit Profile 保存“规划这个 POI 时的标准玩法与时间/负担模型”；Feature 保存“旅行体验摘要”；实际 Visit Load 属于某次行程运行时计算结果，不永久写成一个固定 POI 疲劳值。**

---

# 2. Identity / Master Code / Asset Slot

继续保留 v0.1 边界：

```text
Asset / Resolution Slot ID
≠ POI Internal ID
≠ Master Code
≠ Provider Entity ID
≠ AI Local ID
```

现有 9,000 attraction slots 只是首批素材 / entity-resolution 子集，不等于未来 15,000+ POI Master。

`unresolved:jp-tokyo:17` 等槽位不得升级成永久 POI ID。

---

# 3. POI Root

建议逻辑结构：

```ts
type PoiMasterV2 = {
  schemaVersion: "2.0"

  identity: PoiIdentity
  names: PoiNames
  classification: PoiClassificationRef
  location: PoiLocation
  lifecycle: PoiLifecycle

  factsRevision: number
  featureRevision: number
  visitProfileRevision: number

  facts: PoiFactsV2
  visitProfiles: PoiVisitProfileV1[]
  features: PoiFeatureSetV1

  regionRelations: PoiRegionRelation[]
  externalIds: PoiExternalId[]
  sourceRefs: SourceRef[]
  sourceSlotRefs: string[]

  createdAt: Instant
  updatedAt: Instant
}
```

这是领域逻辑结构，不规定最终数据库一定存成一个 JSONB。

---

# 4. Canonical Facts

能够保存真实值的数据不应变成 0–9 Feature。

包括：

```text
名称 / alias
位置 / geometry
营业日历
最后入场
票价
预约规则
年龄限制
无障碍事实
交通入口 Facts
官方 URL
```

营业时间必须支持：

```text
regular schedule
exception dates
seasonal schedule
last entry
special night opening
validFrom / validTo
source / observedAt
```

---

# 5. Visit Facts

为了正确计算游览时间与体力，建议增加可验证或可人工校准的 Visit Facts。

## 5.1 Duration Facts

不要只保存一个 `stay_minutes`。

每个 Visit Mode 至少可以有：

```text
minimum_duration_min
recommended_duration_min
max_useful_duration_min
```

含义：

```text
minimum
= 低于该值时，该 Visit Mode 的正常体验通常不成立

recommended
= 普通情况下建议分配的标准时间

maxUseful
= 超过后体验仍可能存在，但边际收益开始明显下降
```

## 5.2 Walking / Terrain Facts

能获得真实值时，优先保存：

```text
required_walk_distance_m
optional_walk_distance_m
estimated_internal_walk_distance_m

elevation_gain_m
elevation_loss_m
stairs_count / stairs_band
slope_band
surface_band
standing_ratio
indoor_ratio
```

并允许：

```text
null = unknown
```

不得为了完整度伪造精确距离或台阶数。

## 5.3 Required Path vs Optional Path

必须区分：

```text
required path
= 无论停留多久，通常都要承担的基础动线

optional path
= 停留更久、深入游览时逐渐增加的动线
```

例如上坡入口、必走台阶、从入口到核心区域的距离，不能因为用户只停留 30 分钟就按比例全部消失。

---

# 6. Visit Mode

建议初始 Codebook：

```text
full_visit
quick_visit
photo_stop
exterior_only
pass_through
custom
```

不是每个 POI 都必须支持全部 Mode。

例如：

```text
清水寺式 POI

full_visit
60 / 90 / 150

quick_visit
40 / 55 / 75

photo_stop
20 / 30 / 45
```

这些数字属于 POI-specific Visit Profile，不是全系统通用常数。

---

# 7. PoiVisitProfileV1

建议：

```ts
type PoiVisitProfileV1 = {
  profileVersion: "1.0"
  mode: VisitMode
  status: "active" | "deprecated"

  minimumDurationMin: number | null
  recommendedDurationMin: number | null
  maxUsefulDurationMin: number | null

  requiredPathRatio: number | null
  fixedWalkingLoadPrior: number | null
  variableWalkingLoadPrior: number | null
  fixedPhysicalLoadPrior: number | null
  variablePhysicalLoadPrior: number | null

  terrainModifierPrior: number | null
  standingModifierPrior: number | null

  sourceRefs: string[]
  confidence: number | null
  reviewStatus: ReviewStatus
  updatedAt: Instant
}
```

注意：

- `fixed*LoadPrior / variable*LoadPrior` 是**规划先验 / derived profile**，不是声称实测的物理单位；
- 有真实距离、坡度、台阶等 Facts 时，应优先由 Engine 使用 Facts 派生；
- 没有完整 Facts 时，Profile Prior 可以作为 fallback；
- 最终 fixed / variable 负荷的数值尺度和校准方法属于 Pilot。

---

# 8. POIFeatureV1 walking / physical 正式解释

43 维继续保留：

```text
25 walking
26 physical
```

v0.2 正式语义：

```text
walking
= 以 canonical / default full_visit 的推荐时长游览时，综合步行负担的 0–9 摘要

physical
= 以 canonical / default full_visit 的推荐时长游览时，综合体力负担的 0–9 摘要
```

如果 POI 没有 `full_visit`，由其 canonical default Visit Mode 定义基准。

因此：

```text
walking=7
```

不能解释成：

```text
每次来这里总疲劳固定等于7
```

而只能解释成：

> 标准推荐游览情况下，这个 POI 的步行负担偏高。

---

# 9. Feature 与 Visit Facts 的关系

推荐数据生产顺序：

```text
Raw / Official Facts
↓
Visit Facts
↓
Visit Profile Calibration
↓
walking / physical summary
```

例如：

```text
required path + optional path
+ elevation / stairs / slope
+ recommended duration
↓
walking summary = 7
```

如果只有专家 / AI 综合打标而没有完整原始 Facts：

```text
walking=7
```

仍可保存，但必须：

```text
featureSource = ai_labeled / human_labeled / hybrid
confidence < verified fact-derived case（通常）
```

具体 confidence 数值不在本文件写死。

---

# 10. Actual Visit Load 不属于 POI Master

以下数据属于 Trip / Planning Runtime：

```text
plannedDuration
actual Visit Mode
actual visitWalkingLoad
actual visitPhysicalLoad
accumulatedDayLoad
remainingFatigueBudget
```

禁止把这些回写成 POI 静态 Feature。

正确关系：

```text
POI Master
walking=7
recommended=90
load facts/profile
        ↓
Visit Instance: 30 / 60 / 90 min
        ↓
不同 Visit Load
```

---

# 11. Duration Feasibility 与 Load 分离

POI Master 提供时间边界，但最终判断由 Itinerary Feasibility 执行。

例如：

```text
full_visit
minimum=60
recommended=90

planned=30
```

结果：

```text
Duration Feasibility
→ CRITICAL / DURATION_TOO_SHORT
```

即使 30 分钟的疲劳低于 90 分钟，也不能把“不够游览”误判成“更合理”。

---

# 12. Example

假设：

```text
walking=7
physical=6
full_visit=60/90/150
```

并假设 Pilot 暂定：

```text
walking fixed=40%
walking variable=60%
```

则推荐游览 90 分钟对应 walking summary 7。

在一个示例线性曲线下：

```text
30min → estimated walking load ≈ 4.2
60min → ≈ 5.6
90min → 7.0
```

但：

```text
30min full_visit
```

仍因低于 minimum 60 分钟而不合法。

若：

```text
photo_stop recommended=30
```

则 30 分钟可以合法，但可能仍有显著 fixed walking load。

---

# 13. Evidence / Provenance

Facts、Visit Profile、Feature 必须独立追溯来源。

建议至少记录：

```text
sourceRef
sourceKind
observedAt
validFrom
validUntil
confidence
reviewStatus
modelVersion（如适用）
```

不要保存 Provider Raw JSON 作为领域对象。

---

# 14. Lifecycle / Merge / Rename

继续保留：

```text
rename → poi_id 不变
provider ID changed → poi_id 不变
temporarily_closed → poi_id 不变
permanently_closed → 保留历史
resolved duplicate → merged_into canonical POI
```

旧 POI ID 不复用。

---

# 15. Region / Asset Relations

POI 与 Region 允许多对多。

素材与 POI 也不是强制 1:1：

```text
POI may have 0..N assets
Asset slot may resolve to 0..1 canonical POI
Multiple asset slots may resolve to one POI
```

9,000 个素材任务不能限制未来 POI Master 扩展。

---

# 16. JSONL 交换格式

批量生产建议继续：

```text
1 POI = 1 JSONL record
```

建议顶层至少包含：

```text
schemaVersion
identity
names
classification
location
lifecycle
facts
visitProfiles
features
regionRelations
externalIds
sourceRefs
sourceSlotRefs
```

43 个 Feature Key 在 Canonical JSONL 中建议全部出现，unknown 显式为 `null`。

Visit Profile 不支持的 mode 不需要伪造空对象。

---

# 17. Quality Gates

POI Master / JSONL 至少检查：

```text
stable identity
unique Master Code
valid Japan location / unresolved handling
no asset-slot-as-poi-id
no provider-id-as-poi-id
43 Feature keys complete
0 != null
featureVersion valid
visit duration ordering:
  minimum <= recommended <= maxUseful
no negative durations
no fake exact walking facts
sourceRefs resolvable
merged POI has canonical target
```

对于 Visit Profile：

```text
recommendedDuration required before using duration-normalized load model
fixed/variable priors require provenance/confidence
unknown load facts cannot become zero silently
```

---

# 18. Pilot 后再冻结

以下现在不要写死：

```text
fixed / variable load ratio
Visit Mode 最终全集
DurationCurve
terrain / stairs / slope 权重
standing modifier
walking / physical 摘要生成公式
各类 POI 推荐时长边界
```

但以下原则可以冻结：

1. walking / physical 是标准推荐游览负担摘要；
2. POI Master 保存 duration / load 所需 Facts / Profile；
3. actual Visit Load 属于运行时；
4. Fixed Load 与 Variable Load 必须可区分；
5. 时长不足与疲劳较低是两个不同结论。
