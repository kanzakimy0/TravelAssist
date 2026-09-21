# TravelAssist — Candidate Retrieval / Query Planning / Geo Search / POI Pre-filter Model

> 状态：冻结为 Planner 候选检索层 v1  
> 目标：在 10 万级 POI 中，先用确定性检索与预过滤缩小到可控候选集，再交给 43维推荐、Planner 与路线优化。

## 1. 总体链路

```text
User / Trip Context
↓
Query Planner
↓
Geo Scope
↓
Hard Pre-filter
↓
Search / Index Retrieval
↓
Candidate Expansion
↓
Cheap Feature Pre-score
↓
Diversity / Coverage Guard
↓
Candidate Pool
↓
43D Recommendation
↓
Planner Optimization
```

## 2. 核心原则

- 不允许 Planner 对全国 10 万 POI 全量做路径优化。
- Search Index 负责“找候选”，不负责最终 Planner 排名。
- Hard Filter 必须先于个性化评分。
- Candidate Pool 必须保留多样性，避免热门 POI 把小众/本地候选全部挤掉。
- 所有检索结果绑定 `data_bundle_id`、`search_index_version`、`query_plan_version`。
- 无结果时允许逐级扩大检索范围，但必须受预算与范围上限控制。

## 3. Query Planner

输入：

```ts
interface CandidateQueryInput {
  tripId?: string;
  dayId?: string;
  regionIds: string[];
  timeWindow: { start: string; end: string };
  currentLocation?: { lat: number; lng: number };
  nextAnchorLocation?: { lat: number; lng: number };
  userPreferenceVersion: string;
  dataBundleId: string;
  purpose: "initial_plan" | "replan" | "nearby" | "replacement";
}
```

输出 Query Plan：

```text
geo_scope
time_scope
category_allowlist / denylist
hard constraints
candidate budget
retrieval lanes
fallback policy
```

## 4. Geo Scope

支持：

```text
city
prefecture
geohash cells
radius
bounding box
route corridor
anchor-to-anchor corridor
```

实时替代 POI 优先使用当前点到下一个硬 Anchor 的 corridor，而不是整座城市。

## 5. Hard Pre-filter

先过滤：

- 已关闭 / retired POI
- 明确不营业
- 不满足最低可用时间窗
- 明显超出可达范围
- 与硬约束冲突
- 明确不适用人群约束
- 数据质量为 quarantined / rejected
- 用户显式排除

Hard Filter 失败的 POI 不进入 43维评分。

## 6. Retrieval Lanes

建议并行多路：

```text
A. iconic / first-visit lane
B. preference-match lane
C. local / hidden lane
D. nearby / geo-efficient lane
E. weather-compatible lane
F. reservation / anchor-support lane
```

每路取 Top-K 后合并去重，避免单一排序造成候选塌缩。

## 7. Candidate Budget

建议分层预算：

```text
retrieval raw: 300~1000
cheap pre-filter: 100~300
43D deep score: 50~150
planner optimization: 20~80
final candidates: 3~10
```

具体数值由城市密度、Planner 模式和性能预算配置。

## 8. Cheap Pre-score

只使用低成本 Feature：

```text
distance
opening feasibility
category
iconic bucket
hidden bucket
basic user match
weather suitability
duration class
```

不在此阶段运行完整路线优化。

## 9. Diversity Guard

Candidate Pool 至少保证一定比例的：

```text
iconic
local
hidden
indoor/outdoor
different categories
different neighborhoods
```

避免只返回同质 POI。

## 10. Duplicate / Near-duplicate

通过：

```text
canonical poi_id
parent attraction
same complex / same building
same experience family
```

去重或设上限。

## 11. Anchor-aware Retrieval

有硬 Anchor 时：

```text
Current → Candidate → Anchor
```

必须满足基础时空可达性。

候选不能只看离当前位置近，而忽略后续预约。

## 12. Replacement Retrieval

替代某 POI 时优先保持：

```text
similar duration
similar theme
nearby geography
same time window
weather compatibility
user preference fit
```

并输出 replacement reason codes。

## 13. Fallback Expansion

若候选不足：

```text
same neighborhood
→ wider radius
→ adjacent districts
→ wider category
→ city-wide
```

禁止无限扩大到完全不相关区域。

## 14. Query Cost Budget

每次检索限制：

```text
max index queries
max geo cells
max retrieved docs
max deep-score candidates
max route prechecks
```

## 15. Candidate Pool Record

```text
candidate_pool_id
query_plan_version
data_bundle_id
search_index_version
retrieval_lane
poi_ids
pre_scores
filter_reason_codes
created_at
```

## 16. Observability

指标：

```text
retrieval_latency
raw_candidate_count
post_filter_count
deep_score_count
zero_candidate_rate
fallback_expansion_rate
lane_coverage
duplicate_suppression_rate
```

## 17. Quality Gate

必须满足：

- quarantined POI 不可进入生产候选池
- Hard Constraint 过滤先于 Ranking
- Candidate Pool 有版本
- 无结果时 Fallback 有上限
- Candidate Retrieval 与 Planner Ranking 分离
- 城市/区域密集场景不会返回无界候选
- 替代 POI 检索考虑后续 Anchor

## 18. 最终冻结原则

> 先检索，再深度评分，再规划。

> 检索阶段负责“别漏掉值得考虑的”，Planner 阶段负责“最终选哪些”。

> Candidate Pool 必须兼顾效率与覆盖，不追求单一 Top-K 排名。

> Geo、时间窗、硬约束和数据质量必须在昂贵计算之前处理。

> Candidate Retrieval 是 10 万级 POI 能否进入生产 Planner 的第一道性能与质量边界。
