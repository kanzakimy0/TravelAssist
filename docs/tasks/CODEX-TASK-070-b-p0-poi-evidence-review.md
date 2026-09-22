# CODEX — TASK-070-B P0 REVIEW_REQUIRED POI Evidence Review

请在 `kanzakimy0/TravelAssist` 完整执行 **TASK-070-B**。

Issue: #396

Authoritative Task:

`docs/tasks/TASK-070-b-p0-poi-evidence-review.md`

## 0. 关键目标

只处理 TASK-068-B 当前 **322 个 REVIEW_REQUIRED 候选 POI**。

固定批次：

- `P0-0001` = 200
- `P0-0002` = 122

**第一批完整完成并通过 batch QA/checkpoint 后，自动继续第二批。不要等待人工确认。**

P0-0002 完成后执行总 QA、创建/更新单一 TASK-070 Draft PR，然后停止，不自动开始 P1。

## 1. 安全检查

先执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/codex/b-poi-partition-enrichment-transport-linkage
git rev-parse origin/task/b-task-070-p0-evidence-review
git log --oneline -15 origin/task/b-task-070-p0-evidence-review
```

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

确认 TASK-068 accepted candidate prerequisite：

```text
f5dcca969f72447d3f029781be0fb75ec66414f7
```

如果 upstream TASK-068 execution branch 已不再包含该提交、candidate population/hash 与 Task 描述不一致，停止并报告，不自行重建身份库。

## 2. 建立执行分支

当前 #395 若仍未合并：

从：

```text
origin/task/b-task-070-p0-evidence-review
```

建立：

```text
codex/b-task-070-p0-evidence-review
```

不得修改 TASK-068 execution branch 本身。

TASK-070 Draft PR 在 #395 未合并期间以：

```text
base: codex/b-poi-partition-enrichment-transport-linkage
head: codex/b-task-070-p0-evidence-review
```

创建，以便 PR diff 只展示 TASK-070 变更。

不要合并 #395，也不要自动合并 TASK-070。

## 3. 读取任务与上游事实

完整读取：

```bash
cat docs/tasks/TASK-070-b-p0-poi-evidence-review.md
cat docs/tasks/RESULT-TASK-068-b-poi-partition-enrichment-transport-linkage.md
cat docs/qa/TASK-068/README.md
cat data/poi/full/README.md
cat data/poi/full/rubrics/candidate-feature-rubric.v1.json
```

同时检查：

```text
data/poi/full/features/batch-*.jsonl
data/poi/full/sources/retained-article-index.v1.json
data/poi/full/sources/reviewed-enrichment-evidence.v1.json
data/poi/full/sources/source-manifest.v1.json
data/poi/full/registry/combined-candidates.v1.jsonl
docs/qa/TASK-068/*
tools/poi/*
tests/task-068-*
```

先理解当前 generator / checksum / resume / provenance 实现，再做最小扩展。不要平行创建第二套 POI truth model。

## 4. 冻结 P0 population

从全部：

```text
data/poi/full/features/batch-*.jsonl
```

选择：

```text
status === "REVIEW_REQUIRED"
```

必须断言：

```text
count == 322
duplicates == 0
SOURCE_UNAVAILABLE leakage == 0
QUARANTINED leakage == 0
```

按 candidateKey 稳定排序（除非上游存在更强冻结顺序），生成 P0 population manifest + checksum。

拆分：

```text
P0-0001: positions 1..200
P0-0002: positions 201..322
```

该名单一旦开始执行不得在本 Task 内漂移。

## 5. 编辑复核边界

P0 **禁止一般互联网/source discovery**。

只使用 TASK-068 已冻结并匹配的 retained evidence。

逐候选完整阅读目标内容边界，并严格使用当前：

```text
candidate-feature-rubric.v1.json
rubricVersion = candidate-recovery-1.0
```

规则：

- 有依据才写；
- 无依据继续 null；
- 0 只能表示“有证据支持的缺失/不存在”；
- 不因为常识、名称、类别、知名度自动给分；
- 不为了覆盖率填 5；
- 不把官方旅游机构描述当作“官方评分”；
- 不生成独立 Human Gold 声明；
- unique / hidden / iconic 等比较性维度缺少校准依据时保持 null；
- crowd / queue / 当前营业 / 当前无障碍 / 当前交通等动态事实不得由旧页面静态推断。

每个 non-null feature 必须保留：

```text
featureCode
value
kind
rubricVersion
annotationMethod
sourceRefs
confidence
rationale
locator/hash or equivalent retained evidence reference
```

Visit Profile / Access Anchor 也只填写明确支持的字段。

## 6. 候选结果状态

322 条每条都必须有明确结果，不允许静默丢失。

实现稳定 machine-readable 状态，语义至少覆盖：

```text
REVIEWED_PARTIAL
REVIEWED_NO_SUPPORTED_ATTRIBUTE
REVIEW_BLOCKED_EVIDENCE_INSUFFICIENT
REVIEW_BLOCKED_IDENTITY
```

如果 blocked，不得擅自改变 identity 或 formal code。

## 7. P0-0001 — 200 条

执行第一批 200。

要求：

1. 完整处理 200；
2. 写 deterministic outputs；
3. 跑 batch QA；
4. 验证 provenance / locator / shape / scope；
5. receipt 最后写；
6. resume checksum-identical batch 必须可 skip；
7. 输出损坏 / receipt 不完整必须可重建。

若个别候选失败，加入 review/error queue，继续其他候选。

只有以下情况可停止：

- candidate identity corruption；
- frozen source/hash corruption；
- rubric/schema contradiction；
- unsafe candidate/source link；
- unrecoverable infrastructure failure。

### P0-0001 PASS 后

**直接继续 P0-0002。不要询问用户。**

## 8. P0-0002 — 122 条

使用冻结 population 的剩余 122 条。

执行同样 QA/checkpoint。

完成后断言：

```text
reviewed outcomes == 322
unprocessed P0 candidates == 0
```

## 9. 总 QA

至少输出：

```text
P0 population
P0-0001 count/status
P0-0002 count/status
322 final outcome distribution
candidates with >=1 supported feature before/after
non-null feature positions before/after
new non-null positions
remaining nulls
Visit Profile additions
Access Anchor additions
static transport additions
blocked/error queue
canonical Registry checksum before/after
candidate population identity checksum before/after
formal allocations changed = 0
production DB writes = 0
```

必须运行 TASK-068 相关 regression，以及当前仓库 applicable gates：

- targeted TASK-070 tests；
- TASK-068 candidate/recovery tests；
- planning / master registry / region / routing regressions；
- full repository Node tests；
- lint；
- typecheck；
- formatting；
- build / deployment local validation as CI requires；
- `git diff --check`；
- deterministic rebuild/resume/fault recovery；
- credential/sensitive scan where current repo policy requires。

如果 final head 在 Quality Gate PASS 后有任何 commit，新的 final head 必须重新取得 PASS。

## 10. 交付物

必须生成：

```text
docs/tasks/RESULT-TASK-070-b-p0-poi-evidence-review.md
docs/qa/TASK-070/README.md
docs/qa/TASK-070/*
P0 frozen population manifest
P0-0001 receipt
P0-0002 receipt
review/error queue
aggregate before/after coverage
updated deterministic candidate sidecars where supported
```

不要删除或重写 TASK-068 的审计历史。

## 11. Draft PR

若 #395 仍未合并：

```text
Draft PR
base = codex/b-poi-partition-enrichment-transport-linkage
head = codex/b-task-070-p0-evidence-review
```

PR 描述明确：

- stacked downstream of #395；
- P0 only；
- 322 REVIEW_REQUIRED；
- 200 + 122 auto-next；
- no P1；
- no formal Master Code；
- no production import；
- no auto merge。

如果执行期间发现 #395 已经被用户验收并 merge，则正常 merge 最新 `origin/develop` 进入 TASK-070 branch，不 rebase/force-push，并把 PR target 调整到 develop；然后重跑 exact-head gates。

## 12. 最终返回

返回完整 TASK-070 Result，至少包含：

- branch；
- commits；
- Draft PR；
- exact final head；
- Quality Gate run；
- P0-0001 与 P0-0002 数量；
- 322 final outcomes；
- 新增 feature / Visit / Anchor 数量；
- blocked/errors；
- identity / Registry checksum preservation；
- 明确声明 P1 未启动。

完成后停止。
