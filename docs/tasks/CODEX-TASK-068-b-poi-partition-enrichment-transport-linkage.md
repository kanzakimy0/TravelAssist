# CODEX — TASK-068-B

请在 TravelAssist 仓库中完整执行 **TASK-068-B — B Partition POI Registry Merge / 43-Feature Enrichment / Transport Linkage**。

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#393

Task publication branch:
`task/b-poi-partition-enrichment-transport-linkage`

Planned implementation branch:
`codex/b-poi-partition-enrichment-transport-linkage`

开始前：

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

先读取完整 Task：

```bash
git show origin/task/b-poi-partition-enrichment-transport-linkage:docs/tasks/TASK-068-b-poi-partition-enrichment-transport-linkage.md
```

读取设计：

```bash
git show origin/task/b-poi-partition-enrichment-transport-linkage:docs/architecture/poi-b-enrichment-and-transport-linkage-v0.1.md
```

再读取 execution-time 最新 `origin/develop` 的：

```text
docs/architecture/poi-feature-preference-codebook-v0.1.md
docs/architecture/poi-scoring-spec-v0.2.md
docs/architecture/poi-master-schema-v0.2.md
docs/architecture/itinerary-feasibility-spec-v0.1.md
docs/architecture/planning-fact-freshness-policy-v0.1.md
docs/project/WBS-TravelAssist.md
```

## 第一优先级：B 名单合并审计

B 负责：

```text
60000–99999
```

先检查 B assigned POI list 是否已经存在于 canonical repository。

若不存在于 `origin/develop`：

1. 搜索所有 remote B branches / PRs / registry artifacts；
2. 找出正式 B assigned-ID source；
3. 比较版本、base、row count、duplicate、schema；
4. 在本 implementation branch 中安全整合；
5. 保留所有稳定 ID，禁止重新编号；
6. 禁止修改 A 的 `00000–59999`；
7. 如果完全找不到 B 名单来源，返回 `Blocked / Missing B Registry Source`，不要生成假名单。

## 第二优先级：循环 enrichment

只处理 occupied B POIs。

推荐每批 200 条，支持 resume。

对每一个 POI：

- canonical identity / location / type / source；
- 完整 43-key POIFeatureV1；
- 每个 Feature 值 `0..9|null`；
- non-null 必须有 annotationMethod / sourceRefs / confidence；
- 生成支持的 Visit Profile；
- 生成 access anchors；
- 生成有限 sparse neighbor edges；
- 不能建立 all-pairs POI route matrix。

43 维严格继承 canonical Codebook。

特别注意：

```text
null ≠ 0
null ≠ 5
walking / physical = standard recommended visit burden baseline
crowd / queue / weather_sensitive = risk
live transport/weather/current traffic cannot enter matchScore
```

## 交通连接

使用：

```text
POI
→ access anchor
→ regional/gateway hub
→ runtime Route Provider
```

静态数据可保存：

```text
nearest station/bus/port/trailhead/parking
last-mile difficulty
bus/car dependency
anchor links
sparse neighbor candidates
```

动态 Route Fact 留到运行时：

```text
departure-dependent transit time
driving traffic
transfer count
fare
last train
service disruption
```

## QA

每批必须验证：

- B range only；
- A partition unchanged；
- occupied-only；
- 43-key complete shape；
- values valid；
- provenance complete；
- Visit Profile ordering；
- transport anchor referential integrity；
- sparse neighbor K limit；
- no current route truth in static master；
- deterministic resume/checksum；
- no secret committed。

创建：

```text
docs/tasks/RESULT-TASK-068-b-poi-partition-enrichment-transport-linkage.md
docs/qa/TASK-068/**
```

执行仓库最新适用 tests / lint / typecheck / build / diff check。

最后：

1. push `codex/b-poi-partition-enrichment-transport-linkage`；
2. 创建 Draft PR → `develop`；
3. 同步 Task Result / WBS tracking；
4. **停止，不自动合并。**

最终回复完整 TASK-068-B Result。
