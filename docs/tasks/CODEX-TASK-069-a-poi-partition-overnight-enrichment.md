# CODEX — TASK-069-A Overnight POI Pipeline

请在 TravelAssist 仓库中完整执行 **TASK-069-A — A Partition POI 43-Feature / Visit Profile / Transport Linkage Overnight Pipeline**。

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#394

Task branch:
`task/a-poi-partition-overnight-enrichment`

Implementation branch:
`codex/a-poi-partition-overnight-enrichment`

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

读取完整 Task：

```bash
git show origin/task/a-poi-partition-overnight-enrichment:docs/tasks/TASK-069-a-poi-partition-overnight-enrichment.md
```

同时读取 TASK-068-B transport-linkage design 以保持 A/B 数据结构兼容，但不要修改 B partition。

## 执行范围

只处理：

```text
00000–59999 中的 occupied POIs
```

B 的：

```text
60000–99999
```

由 TASK-068-B 并行执行，严禁跨区写入。

## 执行模式

**连续执行，不需要每批等待人工确认。**

默认：

```text
batch size = 200 occupied POIs
```

对每批自动执行：

```text
load next 200 pending occupied POIs
→ identity/source audit
→ generate 43-key POIFeatureV1
→ provenance/confidence
→ Visit Profile
→ access anchors
→ sparse neighbors
→ validate
→ write output
→ checksum
→ checkpoint
→ continue next 200 automatically
```

完成一批后自动执行下一批，直到全部完成或遇到真正 hard blocker。

单个 POI：

```text
SOURCE_UNAVAILABLE
REVIEW_REQUIRED
PARTIAL
```

只进入 review queue，**不能让整夜任务停止**。

## 43 dimensions

严格继承 canonical Codebook。

值：

```text
0..9 | null
```

并保持：

```text
null != 0
null != 5
```

Kinds：

```text
01–15 benefit
16–24,29–38,40–43 suitability
25–26 cost
27–28,39 risk
```

所有 non-null score 必须有：

```text
annotationMethod
sourceRefs
confidence
reasonCodes
```

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

walking/physical 是标准推荐游览负担摘要，不是具体行程实际疲劳。

## Transport

不得做 all-pairs。

使用：

```text
POI
→ access anchor
→ regional/gateway hub
→ runtime Route Provider
```

可保存静态：

```text
nearest station
bus stop/terminal
port
ropeway
trailhead
parking
last-mile walk
bus/car dependency
regional gateway
```

动态：

```text
traffic
departure-specific duration
fare
transfers
last train
service disruption
```

不得进入 static POI master 或 matchScore。

## Neighbor graph

每个 POI sparse candidate neighbors：

```text
K <= 20
```

禁止 O(N²)。

## Checkpoint

每完成 200：

1. 输出 batch manifest；
2. 输出 checksum；
3. 写 resume state；
4. 完成 QA；
5. 推荐创建 checkpoint commit；
6. **立即开始下一批**。

重新启动时：

- 自动读取 completed batches；
- checksum/schema/rubric 一致则跳过；
- 从第一个 pending batch 继续；
- 不重复已完成外部数据工作。

## QA

每批检查：

```text
A range only
occupied-only
B untouched
stable IDs
43 complete keys
valid values
provenance
Visit Profile ordering
anchor refs
neighbor K
no O(N²)
no live route contamination
determinism
no secrets
```

输出：

```text
docs/qa/TASK-069/**
docs/tasks/RESULT-TASK-069-a-poi-partition-overnight-enrichment.md
```

全部 occupied A POI 跑完后：

- aggregate QA；
- push branch；
- 创建一个 Draft PR → develop；
- 返回完整 Result；
- 停止。

不要自动 merge。
