# CODEX — TASK-068-B Full POI Corpus Overnight Run

> 当前执行以 [已批准 Recovery Amendment v1](AMENDMENT-TASK-068-candidate-recovery-v1.md) 为准：候选层补全，正式编号不变。下文原始 occupied-only 流程保留为发布记录；冲突条款由该修订覆盖。

请在 TravelAssist 仓库中执行 **TASK-068-B**。本 Task 已更新为：**B 单独负责全部 POI 数据，范围 00000–99999，不再由 A 处理 00000–59999。**

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#393

Task branch:
`task/b-poi-partition-enrichment-transport-linkage`

Execution branch:
`codex/b-poi-partition-enrichment-transport-linkage`

先执行：

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

读取最新完整 Task：

```bash
git show origin/task/b-poi-partition-enrichment-transport-linkage:docs/tasks/TASK-068-b-poi-partition-enrichment-transport-linkage.md
```

读取设计：

```bash
git show origin/task/b-poi-partition-enrichment-transport-linkage:docs/architecture/poi-b-enrichment-and-transport-linkage-v0.1.md
```

## 重要变更

原 TASK-069-A / Issue #394 已被本 Task 取代。

**不要启动 A 的独立 POI pipeline。**

B 现在处理：

```text
00000–99999 中所有 occupied POIs
```

包括：

```text
Registry / assigned-list audit
43维完整覆盖
属性证据与置信度
Visit Profile
交通 access anchors
regional/gateway hubs
sparse neighbor edges
QA
checkpoint
resume
最终 Draft PR
```

## 连续执行

默认：

```text
200 occupied POIs / batch
```

每批：

```text
next 200 pending occupied POIs
→ audit identity/source
→ 43-key POIFeatureV1
→ provenance/confidence
→ Visit Profile
→ access anchors
→ sparse neighbors
→ QA
→ persist
→ checksum
→ checkpoint
→ automatically next 200
```

**普通批次之间不等待人工确认。**

单个 POI 的：

```text
PARTIAL
REVIEW_REQUIRED
SOURCE_UNAVAILABLE
```

进入 review queue，然后继续。

## 43维硬规则

```text
value = 0..9 | null
null != 0
null != 5

01–15 benefit
16–24,29–38,40–43 suitability
25–26 cost
27–28,39 risk
```

non-null 必须有 provenance / annotationMethod / confidence。

## Visit Profile

有证据时生成：

```text
minimumDurationMinutes
recommendedDurationMinutes
maximumUsefulDurationMinutes
fixedWalkingLoad
variableWalkingLoad
fixedPhysicalLoad
variablePhysicalLoad
```

walking/physical 是标准推荐游览负担摘要，不等于具体行程的实际疲劳。

## 交通

禁止 all-pairs。

```text
POI
→ access anchor
→ regional/gateway hub
→ runtime Route Provider
```

静态保存接入关系；实时交通、具体出发时间车程、电车时间、票价、末班车、运行中断留给 runtime Route Fact，不进入 matchScore。

Neighbor graph 保持 sparse：

```text
K <= 20 / POI
```

## Resume

每批保存 manifest + checksum + checkpoint。

重启后自动跳过 checksum/schema/rubric 一致的 completed batches，从第一个 pending batch 继续。

## 最终

全部 occupied POIs 跑完后：

```text
aggregate QA
→ RESULT-TASK-068-B
→ push branch
→ one Draft PR to develop
→ STOP
```

不得自动 merge。
