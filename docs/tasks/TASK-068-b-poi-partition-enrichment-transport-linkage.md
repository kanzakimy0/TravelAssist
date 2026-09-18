# TASK-068-B — B Partition POI Registry Merge / 43-Feature Enrichment / Transport Linkage

> Issue: #393  
> Owner: **B**（用户明确授权本 POI 数据生产任务由 B 执行）  
> B POI ID Range: **60000–99999**  
> Task publication branch: `task/b-poi-partition-enrichment-transport-linkage`  
> Planned execution branch: `codex/b-poi-partition-enrichment-transport-linkage`  
> Merge policy: **Draft PR only / do not auto-merge**

---

## 1. Goal

把 B 负责的 POI 名单从“只有稳定 ID + 名单”推进到可供 TravelAssist Planning Engine 使用的结构化 POI 数据集。

执行顺序必须是：

```text
确认 B 60000–99999 名单是否已进入 canonical repository
↓
若未进入：寻找 B 已有分支/PR/文档并安全整合到本 Task branch
↓
锁定 occupied POI IDs
↓
逐批生成 POI 基础属性与 43 维 Feature
↓
生成 Visit Profile
↓
生成交通接入锚点 / transport linkage
↓
批次 QA / source provenance / null coverage
↓
全量汇总 / Resume manifest
↓
Draft PR → develop
↓
STOP
```

本 Task **不是**修改推荐算法权重，也不是运行实时 Route Provider。

---

## 2. Read first

开始前必须读取最新 `origin/develop` 中存在的权威文件，包括：

```text
docs/architecture/poi-feature-preference-codebook-v0.1.md
docs/architecture/poi-scoring-spec-v0.2.md
docs/architecture/poi-master-schema-v0.2.md
docs/architecture/itinerary-feasibility-spec-v0.1.md
docs/architecture/planning-fact-freshness-policy-v0.1.md
docs/project/WBS-TravelAssist.md
```

并读取历史 Pilot：

```text
TASK-038-A — 100 POI Scoring Pilot
TASK-039-A — POI Scoring Blind Review
```

TASK-038/039 用于继承 **Feature 语义、Visit Profile、证据与 QA 方法**，不得把 Pilot 的参数/机器 benchmark 当成新 POI 的客观事实。

---

## 3. Phase 0 — B Registry Presence Audit

### 3.1 Canonical audit

先确认最新 `origin/develop` 的 POI canonical source 中是否存在 B 号段：

```text
60000 <= master_code_num <= 99999
```

至少输出：

```text
canonical registry path(s)
canonical registry version
total occupied B IDs
min B ID
max B ID
duplicate IDs
duplicate normalized identities
missing required identity fields
```

注意：检查的是 **occupied POI rows**，不是空 Code Slot。

### 3.2 Current known audit context

用户提供的 POI Registry v1.52 工作簿显示：

```text
Registry rows = 8415
Code slot sheets exist through 50000–59999
no 60000–99999 code-slot sheet was visible
```

这只能作为当前审计线索，执行时必须以 GitHub 最新 canonical source 为准。

### 3.3 If B list is not in canonical develop

不得重新生成新 ID。

必须搜索：

```text
all remote B branches
all open/closed B PRs
POI registry / list / source files
60000–99999 data artifacts
recent B workstation outputs
```

找到多个候选时，比较：

```text
base SHA
row count
ID range
source freshness
duplicate rate
schema compatibility
whether IDs were already assigned/frozen
```

选择 **最新且可证明为 B 正式名单来源** 的版本。

将它安全整合到本 Task implementation branch：

```text
do not renumber
do not rewrite A IDs 00000–59999
do not silently drop B rows
do not directly modify develop
```

若 GitHub 上完全找不到 B 的已分配名单来源：

```text
Status = Blocked / Missing B Registry Source
```

报告搜索过的 branches/PR/files 后停止，不得凭空构造 60000–99999 名单。

---

## 4. Processing population

只处理：

```text
occupied B POIs
AND master_code_num between 60000 and 99999
```

不得对：

```text
unused code slots
reserved IDs
deleted/tombstoned IDs
redirect-only alias rows
```

生成完整 43 维评分。

若 alias/child entity 是否独立评分不明确，按 canonical entity rules 处理；无法确认则进入 review queue，不猜测。

---

## 5. Batch execution model

该任务必须可中断、可续跑、可审计。

推荐批次：

```text
default batch size = 200 occupied POIs
```

可根据实际仓库/网络/CI性能调整至 100–500，但必须保持 deterministic manifests。

每批记录：

```text
batchId
idRange
poiCount
sourceVersion
inputChecksum
outputChecksum
startedAt
completedAt
status
knownFeatureCoverage
nullFeatureCoverage
visitProfileCoverage
transportAnchorCoverage
reviewRequiredCount
errorCount
```

必须支持：

```text
--resume
--batch <id>
--from-id
--to-id
--dry-run
```

或仓库现有等价机制。

已经成功并 checksum 一致的批次不得重复调用外部来源。

---

## 6. POI master enrichment

每个 POI 至少维护：

```text
master_code
canonical identity
name_ja
name_en where verified
prefecture / municipality / region
entity_type
coordinates when verified
parent relationship where applicable
sourceRefs
sourceTier
lastVerifiedAt
confidence
```

来源优先级：

1. 日本政府 / 自治体 / 官方景点运营机构；
2. 官方旅游局 / 公共机构；
3. canonical repository 已有 evidence；
4. 高可信二级来源，仅用于补充且必须标注。

禁止为了填满字段而制造精确事实。

---

## 7. POIFeatureV1 — all 43 keys

每个可评分 POI 必须生成完整 key shape：

```text
01 scenery
02 history
03 architecture
04 photo
05 food
06 shopping
07 nature
08 night
09 onsen
10 art
11 entertainment
12 local
13 unique
14 hidden
15 iconic
16 family
17 senior
18 couple
19 solo
20 relax
21 adventure
22 educational
23 interactive
24 rest
25 walking
26 physical
27 crowd
28 queue
29 wheelchair
30 stroller
31 morning
32 daytime
33 sunrise
34 sunset
35 rain
36 heat
37 cold
38 snow
39 weather_sensitive
40 spring
41 summer
42 autumn
43 winter
```

### Value semantics

```text
0 = known absent / completely unsuitable
1..9 = known strength / burden / suitability
null = unknown
```

绝对禁止：

```text
null → 0
null → 5
0 → null
```

### Feature kinds

```text
benefit:     01–15
suitability: 16–24, 29–38, 40–43
cost:        25–26
risk:        27–28, 39
```

不得把 43 项当成统一“越高越好”。

---

## 8. Feature annotation provenance

每一个 non-null Feature 至少可追踪：

```json
{
  "featureCode": 1,
  "value": 9,
  "annotationMethod": "official_fact|derived_verified_fact|editorial_calibration",
  "sourceRefs": ["..."],
  "confidence": "high|medium|low",
  "reasonCodes": ["..."]
}
```

### Evidence rule

允许“基于已验证事实的结构化推导”，例如：

```text
officially documented panoramic viewpoint
→ scenery/photo can receive evidence-backed editorial score
```

但不能写成：

```text
official source said scenery=9
```

除非源本身真的提供该量表。

Feature score 是 TravelAssist 的结构化 annotation，不伪装成客观第三方 rating。

---

## 9. Scoring rubric consistency

批量生成必须使用统一 rubric，而不是逐 POI 随意打分。

至少建立：

```text
docs/data/poi/feature-rubric-v1.*
```

或项目已有等价文件，包含各 Feature：

```text
definition
0 boundary
3 boundary
5 boundary
7 boundary
9 boundary
common evidence cues
counterexamples
null conditions
```

优先对 0/3/5/7/9 建锚点，中间值按明确规则插值。

对 highly subjective features（例如 unique / hidden / iconic）必须有跨区域一致性 QA，避免东京/京都系统性偏置。

---

## 10. Visit Profile

不能只生成 43 维。

对有足够事实的 POI，至少生成默认 Visit Mode：

```text
mode = standard/full_visit
minimumDurationMinutes
recommendedDurationMinutes
maximumUsefulDurationMinutes
fixedWalkingLoad
variableWalkingLoad
fixedPhysicalLoad
variablePhysicalLoad
sourceRefs
confidence
```

质量规则：

```text
minimum <= recommended <= maximumUseful
```

### Walking / physical semantics

`25 walking`、`26 physical` 表示：

```text
标准推荐游览模式 + 推荐时长下的负担基准
```

不是：

```text
本次行程实际疲劳
```

例如清水寺推荐 90 分钟时 walking 较高，但 30/60/90/120 分钟实际负荷应由：

```text
fixed load
+
variable load × actual visit duration
+
route walking
+
day accumulated fatigue
```

动态计算。

如果 30 分钟低于 full_visit minimum，则属于 Itinerary Feasibility，而不是降低 POI master walking 分数来“适配”。

---

## 11. Transport linkage architecture

### 11.1 Do NOT generate all-pairs

B 最多 40000 个号码槽。

全量 POI 两两交通关系会接近：

```text
N × (N - 1)
```

即使只有 10000 个 occupied POI，也约为一亿量级有向关系。

本 Task 禁止建立：

```text
every POI → every POI
```

交通矩阵。

### 11.2 Three-layer transport connection

采用：

```text
POI
↓
Access Anchor
↓
Regional / Gateway Hub
↓
Route Provider runtime
```

#### Layer A — POI access anchors

每个 POI尽量记录 1–N 个：

```text
nearest rail station
nearest metro/subway station
nearest bus stop / bus terminal
ropeway/ferry terminal if relevant
parking / road access anchor if relevant
walk-only trailhead if relevant
```

建议字段：

```text
poi_id
anchor_id
anchor_type
access_mode
distance_meters (only if verified/derived from coordinates)
typical_access_minutes (only if evidence-backed)
walking_difficulty
barrier_free_notes/status
sourceRefs
confidence
```

#### Layer B — regional/gateway hubs

对跨城市/跨区域规划，连接少量稳定 hub，例如：

```text
major station
airport
regional bus terminal
port
tourist gateway
city center transport node
```

POI 不需要直接保存“东京 → 每一个景点”的全量时间。

例如：

```text
Tokyo Station
→ Gotemba Station / Gotemba Premium Outlets access hub
→ target POI

Tokyo
→ Kawaguchiko Station
→ target POI

Kyoto Station
→ Kiyomizu-michi / Gojozaka / local access anchor
→ Kiyomizu-dera
```

#### Layer C — runtime Route Fact

真正的：

```text
departure time
transit duration
driving duration
walking duration
traffic
transfer count
fare
last train
service disruption
```

由 Route Provider / runtime Route Fact 在具体日期时间查询。

不得写入 POI 43 维 matchScore。

---

## 12. Static transport suitability summary

POI 可保存少量稳定派生属性，用于候选初筛，例如：

```text
transport_access_grade
rail_accessibility
bus_dependency
car_advantage
last_mile_walk_level
transfer_complexity_baseline
remote_area_flag
access_anchor_count
```

这些不是 43 维的新 Feature，不得擅自扩展 Codebook 01–43。

若生产 Schema 尚未冻结，将这些先作为 versioned enrichment dataset，后续由 Route/POI contract 决定最终字段。

---

## 13. Neighbor edges

允许生成有限的 POI neighbor edges，用于 itinerary candidate generation，但必须是稀疏图。

例如每个 POI：

```text
top K nearby candidate POIs
same district cluster
same attraction complex
walkable neighbor
same access anchor
```

默认：

```text
K <= 20
```

边仅用于候选生成，不宣称为实时路线真值。

保存：

```text
from_poi
to_poi
edge_reason
straight_line_distance / static estimate if available
shared_anchor
source/method
confidence
```

实时 duration 仍由 Route Provider 查询。

---

## 14. Output structure

执行时先审计仓库已有 data conventions，再选最终路径。

建议逻辑结构：

```text
data/poi/b/registry/
data/poi/b/features/
data/poi/b/visit-profiles/
data/poi/b/transport-anchors/
data/poi/b/neighbors/
data/poi/b/manifests/
```

优先使用：

```text
JSONL / Parquet / repository-existing canonical format
```

大量数据不要强塞进单个 Markdown 或超大 JSON array。

Documentation / QA：

```text
docs/qa/TASK-068/
  registry-audit.json
  batch-manifest.json
  feature-coverage.json
  source-coverage.json
  null-coverage.json
  visit-profile-coverage.json
  transport-anchor-coverage.json
  duplicate-audit.json
  review-queue.json
  final-report.md
```

---

## 15. Batch QA gates

每批必须验证：

```text
all IDs within 60000–99999
no duplicate master_code
no mutation of A 00000–59999 rows
complete 43-key shape
all Feature values ∈ 0..9|null
all non-null values have annotationMethod
all non-null values have provenance or explicit editorial basis
0/null distinction preserved
Visit Profile duration ordering valid
transport anchors reference valid POI IDs
no self neighbor edge
no duplicate directional neighbor edge
no live/current route fact stored as static master truth
no secret/API key committed
```

---

## 16. Sampling review

每个批次至少抽样：

```text
10% or 20 POIs, whichever is smaller but >=10 when batch size allows
```

重点人工/规则复核：

```text
iconic vs hidden consistency
walking/physical consistency
wheelchair/stroller claims
season scores
crowd/queue claims
remote-area transport linkage
city POI vs nature POI contrast
same-category cross-prefecture consistency
```

出现系统性偏差时：

```text
fix rubric
invalidate affected batch
rerun affected batch
do not manually patch only obvious rows
```

---

## 17. External-source safety

允许执行时访问公开官方网页来补证，但：

```text
respect robots/terms/rate limits
no paid APIs unless separately authorized
no uncontrolled scraping
cache source references/checksums
prefer null over fabrication
```

LLM 可以用于结构化辅助判断，但任何结果必须受 rubric、source evidence、schema validation 和 QA gates 约束；不得让模型自由生成不可追溯的“事实”。

---

## 18. Resume / failure behavior

长任务不能因单个 POI 失败而丢弃全批。

状态至少区分：

```text
COMPLETE
PARTIAL
REVIEW_REQUIRED
SOURCE_UNAVAILABLE
IDENTITY_CONFLICT
BLOCKED
```

失败 POI 进入 `review-queue`。

整个 Task 可在批次边界续跑。

---

## 19. Tests

至少加入 focused tests 验证：

```text
B range boundary
occupied-only processing
stable ID preservation
43-key completeness
0/null semantics
feature kind registry
provenance requirement
Visit Profile ordering
batch resume determinism
checksum stability
anchor referential integrity
neighbor sparse K limit
no O(N²) generation path
no live route fact contamination
A partition unchanged
```

并运行仓库 execution-time canonical：

```text
npm ci
relevant POI/Planning tests
routing tests
lint
typecheck
build
git diff --check
```

---

## 20. Git / integration

开始：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Implementation branch：

```text
codex/b-poi-partition-enrichment-transport-linkage
```

创建 Draft PR → `develop`。

**不得自动 merge。**

---

## 21. WBS boundary

项目默认规则中 POI/Planner/Route 属于 A 主系统。

本 Task 是用户明确授权的 **B 数据生产 exception**。

不得借此：

```text
永久把所有 7.x Owner 改成 B
修改 Route runtime ownership
修改 Planner ownership
修改 AI ownership
```

如果需要 WBS tracking，写明：

```text
TASK-068-B user-authorized data-production exception
```

而不是全局重分配 POI/Route 系统。

---

## 22. Required Result

创建：

```text
docs/tasks/RESULT-TASK-068-b-poi-partition-enrichment-transport-linkage.md
```

必须报告：

```text
Status
base SHA
B registry source located where
B list canonical before task = yes/no
integrated B row count
occupied B POI count
processed count
remaining count
batch count
43-feature complete-shape count
feature known/null coverage
Visit Profile coverage
transport anchor coverage
neighbor edge count
review queue count
source tiers
duplicate audit
A partition unchanged proof
tests
branch
commits
Draft PR
WBS synchronization
next recommended batch/action
```

---

## 23. Completion states

### Complete

```text
all occupied B POIs processed
all validation gates pass
review queue contains only explicitly accepted unknown/review items
Draft PR exists
```

### Partial

允许：

```text
some POIs remain due to evidence gaps
```

但必须保留 null/review queue，不能伪造。

### Blocked

例如：

```text
B assigned-ID list cannot be located
canonical identity conflicts cannot be safely resolved
required repository contract contradicts this Task
```

---

## 24. Stop condition

Draft PR 完成后停止。

不要自动：

```text
merge develop
start A 00000–59999 enrichment
turn transport anchors into production Route Provider calls
freeze new scoring parameters
change 43-feature codebook
deploy production DB
```
