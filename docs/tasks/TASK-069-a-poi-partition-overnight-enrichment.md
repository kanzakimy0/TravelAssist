# TASK-069-A — A Partition POI 43-Feature / Visit Profile / Transport Linkage Overnight Pipeline

> Issue: #394  
> Owner: **A**  
> A POI ID partition: **00000–59999**  
> Concurrent task: **TASK-068-B = 60000–99999**  
> Batch size: **200 occupied POIs**  
> Mode: **continuous / unattended batch chaining / resumable**  
> Publication branch: `task/a-poi-partition-overnight-enrichment`  
> Execution branch: `codex/a-poi-partition-overnight-enrichment`

---

## 1. Objective

对 A 负责的全部 occupied POI（00000–59999）持续生成可供 TravelAssist Engine 使用的结构化数据：

```text
canonical identity audit
→ 43-key POIFeatureV1
→ provenance / confidence
→ Visit Profile
→ transport access anchors
→ sparse neighbor edges
→ batch QA
→ checkpoint
→ next 200 automatically
```

直到：

```text
all occupied A POIs complete
OR a real hard blocker occurs
```

普通证据缺失、单个 POI 异常、少量 review item 不得停止整条夜间流水线。

---

## 2. Concurrency boundary with TASK-068-B

A 与 B 同时执行时必须严格分区：

```text
A: 00000–59999
B: 60000–99999
```

A 不得：

- 写入任何 B ID；
- 修改 `data/poi/b/**` 或 TASK-068-B outputs；
- 重新编号稳定 POI ID；
- 为了方便合并而移动 B rows；
- 覆盖 B 正在做的 Registry merge；
- 修改共享 43-feature Codebook。

优先将 A 产物写入 partition-owned paths，例如：

```text
data/poi/a/registry/
data/poi/a/features/
data/poi/a/visit-profiles/
data/poi/a/transport-anchors/
data/poi/a/neighbors/
data/poi/a/manifests/
```

如果仓库已有 canonical partition convention，则遵守现有 convention，但仍必须确保 A/B 文件写入面互不重叠。

---

## 3. Read authoritative specs first

执行前读取最新 `origin/develop`：

```text
docs/architecture/poi-feature-preference-codebook-v0.1.md
docs/architecture/poi-scoring-spec-v0.2.md
docs/architecture/poi-master-schema-v0.2.md
docs/architecture/itinerary-feasibility-spec-v0.1.md
docs/architecture/planning-fact-freshness-policy-v0.1.md
docs/project/WBS-TravelAssist.md
```

并读取 TASK-038 / TASK-039 的 Pilot / QA 方法。

还应读取 TASK-068-B 的 transport-linkage design，使 A/B 两侧输出兼容，但不得写 B partition。

---

## 4. Population

只处理：

```text
occupied POI rows
AND 0 <= master_code_num <= 59999
```

不处理：

- unused slots；
- reserved IDs；
- tombstoned/deleted entity；
- redirect-only alias（除非 canonical rules 明确要求独立实体评分）。

开始时输出 A partition audit：

```text
canonical source
registry version
occupied A count
min/max occupied ID
duplicate IDs
identity conflicts
missing canonical identity fields
```

---

## 5. Continuous batch engine

### 5.1 Batch size

默认：

```text
200 occupied POIs per batch
```

批次基于 stable ascending ID 或 repository-defined deterministic ordering。

### 5.2 Auto-chain

每批完成后必须自动：

```text
validate
→ write outputs
→ write batch manifest
→ checksum
→ persist checkpoint
→ commit checkpoint where appropriate
→ immediately start next pending batch
```

**不要在普通批次之间等待人工确认。**

### 5.3 Resume

必须支持等价能力：

```text
--resume
--batch
--from-id
--to-id
--dry-run
```

启动时检查已完成批次：

- input checksum 相同；
- output checksum 相同；
- schema version 相同；
- QA PASS/PARTIAL 可接受。

满足条件则 skip，不重复处理。

### 5.4 Failure handling

单 POI 状态至少：

```text
COMPLETE
PARTIAL
REVIEW_REQUIRED
SOURCE_UNAVAILABLE
IDENTITY_CONFLICT
```

普通失败进入 review queue，继续同批/下一批。

只有以下 hard blocker 可停止整条流水线：

- stable ID corruption / collision；
- canonical schema contradiction；
- branch conflict 可能破坏稳定 Registry；
- source/license/credential blocker 使合法执行不可能；
- deterministic output 无法恢复；
- unrecoverable repository/infrastructure failure。

---

## 6. Complete 43-key POIFeatureV1

每个可评分 POI 必须包含全部 43 keys：

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

值：

```text
0 = known absent / completely unsuitable
1..9 = known score
null = unknown
```

禁止：

```text
null → 0
null → 5
0 → null
```

Kinds：

```text
benefit:     01–15
suitability: 16–24,29–38,40–43
cost:        25–26
risk:        27–28,39
```

---

## 7. Annotation evidence

每个 non-null score 至少保留：

```text
featureCode
value
annotationMethod
sourceRefs
confidence
reasonCodes
```

annotationMethod 允许：

```text
official_fact
derived_verified_fact
editorial_calibration
```

Feature score 是 TravelAssist annotation，不得伪装成外部官方评分。

证据不足时用 `null`，不要为了覆盖率编造。

---

## 8. Consistent feature rubric

建立/复用 versioned rubric。

每一维至少定义：

```text
0 / 3 / 5 / 7 / 9 anchors
evidence cues
counterexamples
null condition
```

对：

```text
unique
hidden
iconic
walking
physical
crowd
queue
wheelchair
season
weather
```

做跨区域一致性 QA。

若一批出现系统性 rubric 偏差，修 rubric 后 invalidate/rerun 受影响批次，不只手工修几个明显 POI。

---

## 9. Visit Profile

有足够证据的 POI 生成至少一个 standard/full visit profile：

```text
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

必须：

```text
minimum <= recommended <= maximumUseful
```

`walking / physical` 是标准推荐游览负担摘要。

实际 Visit Load：

```text
fixed POI load
+ duration-scaled variable POI load
+ route load
+ accumulated day fatigue
```

30 / 60 / 90 / 120 分钟不能简单复用同一个实际疲劳值。

---

## 10. Transport linkage

禁止 all-pairs POI matrix。

采用：

```text
POI
→ access anchor
→ regional/gateway hub
→ runtime Route Provider
```

### Static access anchors

可包含：

```text
rail station
subway/metro station
bus stop
bus terminal
airport
port/ferry
ropeway
trailhead
parking/road access
tourist gateway
```

每条关系保存可用的：

```text
poi_id
anchor_id
anchor_type
access_mode
distance/static access estimate if legitimate
last_mile_walk_level
barrier_free status/notes
sourceRefs
confidence
```

### Dynamic Route Fact

不得作为 POI master truth：

```text
current traffic
departure-specific duration
current transfer count
current fare
specific last train
service disruption
live route feasibility
```

这些由具体行程日期时间下的 Route Provider/runtime 计算。

---

## 11. Sparse neighbor graph

允许每个 POI 产生少量 candidate edges：

```text
same district
same attraction complex
walkable nearby
same access anchor
top-K nearby candidates
```

默认：

```text
K <= 20
```

不能生成 O(N²) 图。

---

## 12. Per-batch outputs

至少维护：

```text
batchId
ordered occupied ID list/range
poiCount
source/schema/rubric version
inputChecksum
outputChecksum
status
known/null feature coverage
visit profile coverage
anchor coverage
neighbor edge count
review queue count
errors
started/completed metadata
```

QA 建议：

```text
docs/qa/TASK-069/
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

## 13. Per-batch QA gates

每个 200 批次必须验证：

```text
all IDs 00000–59999
occupied-only
no duplicate master_code
stable IDs unchanged
complete 43-key shape
values 0..9|null
non-null provenance present
0/null distinction preserved
Visit Profile ordering valid
anchor refs valid
no self neighbor edge
no duplicate directional neighbor edge
neighbor K limit respected
no live route fact contamination
no secret/API key
B partition untouched
deterministic resume/checksum
```

---

## 14. Sampling

每批至少复核：

```text
min(20, 10% of batch)
```

batch 足够大时不得少于 10。

重点检查：

- iconic/hidden；
- walking/physical；
- wheelchair/stroller；
- season/weather；
- crowd/queue；
- urban vs remote access；
- same category cross-prefecture consistency。

---

## 15. Checkpoint/commit policy

为了通宵可恢复：

- 每批 200 完成后必须落盘 manifest/checksum；
- 推荐每批形成独立 checkpoint commit；
- commit message 包含 batch id / ID range；
- 不要等待 GitHub PR review 再跑下一批；
- 不要在每批创建一个 PR；
- 全部批次共用一个 implementation branch / 一个最终 Draft PR。

---

## 16. External-source rule

允许访问合法公开来源补证：

优先：

1. 官方运营方；
2. 政府/自治体；
3. 官方旅游组织；
4. repository 已有 verified evidence；
5. 必要时可信二级来源。

必须遵守 rate limits/terms。

禁止：

- 未授权付费 API；
- 无限制抓取；
- 为了“100% 非 null”虚构数据；
- 提交 API secrets。

---

## 17. Tests

至少验证：

```text
A range boundary
occupied-only
stable ID preservation
43-key completeness
0/null semantics
feature-kind registry
provenance
Visit Profile ordering
batch 200 deterministic partitioning
auto-next state transition
resume behavior
checksum stability
transport anchor integrity
neighbor K limit
no O(N²) generation
no live route contamination
B partition untouched
```

并执行 execution-time applicable：

```text
npm ci
POI / Planning tests
routing tests
lint
typecheck
build
git diff --check
```

---

## 18. Git

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

执行分支：

```text
codex/a-poi-partition-overnight-enrichment
```

---

## 19. Required Result

创建：

```text
docs/tasks/RESULT-TASK-069-a-poi-partition-overnight-enrichment.md
```

最终至少报告：

```text
Status
base SHA
canonical registry source/version
occupied A count
processed count
batch total/completed/partial
43-key shape complete count
known/null coverage
Visit Profile coverage
transport anchor coverage
neighbor edge count
review queue count
duplicate/identity conflicts
A ID stability proof
B partition untouched proof
tests
branch/commits
Draft PR
remaining work
```

---

## 20. Completion behavior

正常批次之间**自动继续**，无需人工确认。

当全部 occupied A POIs 完成后：

1. final aggregate QA；
2. write final Result；
3. push execution branch；
4. create one Draft PR → `develop`；
5. stop for review。

若发生 hard blocker：

1. persist completed batches/checkpoints；
2. record exact blocker；
3. push branch；
4. create/update Draft PR if useful；
5. return Partial/Blocked Result。

不得自动：

- merge develop；
- process B 60000–99999；
- rewrite Feature Codebook；
- deploy production DB；
- activate paid/live Route Provider；
- tune/freeze new recommendation weights。
