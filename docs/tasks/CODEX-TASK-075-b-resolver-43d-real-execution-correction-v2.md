# CODEX — TASK-075-B Resolver / 43D Real-Execution Correction v2

继续现有 TASK-075-B / Issue #416。
不要新建 TASK-076。

本轮目标：
修正当前 TASK-075 的两个失败模式：

1. 5723/5920 被批量归为 MATCHED_PROVISIONAL，但没有证明真实外部候选+鉴别证据；
2. 10369×43 决策虽然生成，但 direct/inferred/canonical additions 全部为 0，说明43维搜索/语义抽取没有真正完成。

## 0. 同步并读取最新 Correction v2

执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
```

读取：

```bash
git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/AMENDMENT-TASK-075-b-resolver-43d-real-execution-correction-v2.md

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/TASK-075-b-japan-poi-entity-resolver-43d-completion.md

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md
```

Correction v2 publication head includes:

```text
a17edd23d990bcd2444c832cac35fc4699f4bd37
```

以 Correction v2 为最高优先级。

不要删除旧 PARTIAL 结果，保留审计历史，并在 Result 顶部标注：

```text
Previous TASK-075 partial run superseded for identity/enrichment acceptance by Resolver / 43D Real-Execution Correction v2.
```

## 1. 保持同一 TASK-075 execution work

如果本地已有：

```text
codex/b-task-075-japan-poi-entity-resolver-43d-completion
```

继续当前 branch。

如果尚未 push 到远端，允许之后 ordinary non-force push。

不要 reset/clean。
禁止 force push。

## 2. 296MB inspect 文件必须 5920/5920 lookup

如果本地存在：

```text
travelassist-japan-poi-master-registry-v1.52-social-inbound-core-gaps-b235.xlsx.inspect.ndjson
```

对全部 5920 residual 做 streamed lookup。

必须最终统计：

```text
inspectFilePresent = true
inspectLookupAttempted = 5920
inspectExactKeyMatch
inspectMunicipalityNameMatch
inspectAliasMatch
inspectAddressMatch
inspectCategoryAssist
inspectConflict
inspectNoMatch
```

不得只对19条 exact key 使用。

inspect no-match：
必须继续 external candidate generation，
不能直接 provisional / unresolved。

原始296MB文件：
- streaming读取
- 不修改
- 不提交GitHub

## 3. 重做 Resolver Calibration，禁止 easy-only holdout

之前：

```text
600 existing scored candidates with unique municipality/name/category blocks
```

不能作为最终 calibration。

重新建立 >=1000 known identities：

```text
>=600 tuning
>=400 untouched holdout
```

holdout 至少：

```text
100 municipality-unique easy positive
100 same-name / near-name hard positive
50 historical/alias/rename
50 area/district/non-point entity
50 duplicate/invalid/non-POI negative
50 wrong-municipality/prefecture/type-conflict decoy
```

真实 candidate generator 必须面对 competitors。
不能把答案作为唯一 candidate。

PASS：

```text
candidate generation Recall@5 >= 99.0%
Top1 accuracy >= 98.5%
MATCHED_HIGH precision >= 99.0%
MATCHED_MEDIUM precision >= 98.0%
MATCHED_PROVISIONAL audited precision >= 97.0%
hard-conflict auto-match = 0
deterministic repeat PASS
```

失败：
自动分析、修 resolver、重跑。
不要询问用户。

## 4. 5920 每条必须有真实 external Top-N candidate

以下 disposition：

```text
MATCHED_HIGH
MATCHED_MEDIUM
MATCHED_PROVISIONAL
HISTORICAL_OR_ALIAS_MATCH
```

每条必须：

```text
candidateSetGenerated = true
candidateSetSize >= 1
Top1 real-world target exists
top1Score exists
top2Score exists when competitor exists
margin exists
hardConflicts recorded
municipality/prefecture compatibility recorded
name/alias compatibility recorded
>=1 retained discriminative evidence source
```

不能：

```text
input row
→ 自己生成一个 pseudo candidate
→ MATCHED_PROVISIONAL
```

MATCHED_PROVISIONAL 还必须：

```text
>=1 authoritative or strong-secondary discriminative retained source
no hard conflict
one candidate clearly dominates
```

只有：

```text
input name + input municipality
```

不够 provisional。

如果没有真实 target：
最终必须：

```text
SOURCE_RECORD_AMBIGUOUS_EXCLUDE
SOURCE_RECORD_INVALID
DUPLICATE_OF_EXISTING
NOT_A_POI
AREA_OR_DISTRICT_ENTITY
```

不能改名叫 provisional。

## 5. Provisional 比例自动审计

如果：

```text
MATCHED_PROVISIONAL >25%
```

随机+分层抽 >=500 条。

如果：

```text
MATCHED_PROVISIONAL >50%
```

抽 >=1000 条。

覆盖：

```text
prefecture
municipality coverage
common/unique names
POI type
source tier
inspect match/no-match
municipality unique/non-unique
candidate set size
margin bands
```

逐条验证：
真实目标、来源、discriminative evidence。

PASS：

```text
audited provisional precision >=97%
```

如果 invalid：
- 找 failure pattern
- 重做受影响 rules/batches
- 再审计

禁止为了消灭 unresolved 批量 provisional。

## 6. 5920/5920 search trace

每条 residual 必须保存：

```text
inspectLookupResult
municipalityBlock
normalizedNamesAliases
queries
openedSources
retainedSources
TopNCandidates
discriminativeComparison
score
margin
hardConflicts
finalDisposition
```

没有 external search/source attempt：
不能 HIGH/MEDIUM/PROVISIONAL。

## 7. 在全量43维前做 WRITE-THROUGH Canary

选择 >=50 个 accepted POI：
- 有大量 null
- 有实际 retained evidence
  或明显有官网/政府/旅游局资料
- 多种 POI type
- 多 feature family

必须走与生产完全相同：

```text
search
→ open
→ retain
→ semantic annotation
→ rubric
→ projection
→ canonical apply
→ reconcile
```

这不是 dry-run。

PASS：

```text
candidates >=50
semanticAnnotationAttempted = candidates
candidatesWithNewSupported >=30
canonical new non-null >=100
>=10 distinct feature codes added
direct + inferred additions >=100
provenanceWritten >= additions
canonicalApplied = additions - explicit duplicate/rejected/superseded
unexplained delta = 0
deterministic repeat PASS
```

如果达不到：
自动修 query/source/extraction/rubric/canonical。
重跑 canary。

绝对禁止直接进入全量并再次产出 0 additions。

Canary 新增是真实 canonical 数据，保留到 final。

## 8. 全量43维必须真实 semantic annotation

对所有 accepted POI 且还有 null：

每条必须：

```text
semantic annotation attempted
review existing retained target text
search remaining feature families
open/retain actual source
rubric mapping
field decision
```

最终：

```text
UNSUPPORTED_AFTER_EXHAUSTIVE_SEARCH
```

必须 candidate+field 级保存：

```text
featureCode
sourceFamiliesAttempted
queries/search refs
opened/retained evidence refs
noSupportReason
semanticAnnotationMethod
```

一个通用 batch reason 不够。

## 9. 每批必须验证“真的搜了”

200条 enrichment batch telemetry 至少：

```text
candidateCount
sourceSearchAttemptedCandidates
sourcePagesOpened
retainedTextCandidates
semanticAnnotationAttempted
directAdded
inferredAdded
provenanceWritten
canonicalApplied
remainingNull
```

硬 gate：

```text
semanticAnnotationAttempted == acceptedCandidateCount
```

sourceSearchAttemptedCandidates 显著低于 candidateCount：
必须有 candidate-level retained-evidence justification。

否则 batch FAIL。

## 10. Near-zero/zero additions 自修复

若一个200条 batch 新增接近0：

自动：
1. 抽 >=30 条
2. 查看实际 queries
3. 查看 sources opened
4. 查看 retained text
5. 查看 semantic decisions
6. 判断 search strategy/extractor/rubric 是否失效
7. 扩 query/source family
8. 重跑 batch

zero-add 只有：
30条 saturation audit 证明真实无支持事实，
且所有 candidate-level audit 字段完整，
才能 PASS。

## 11. 使用 rubric inference，不要只等网页直接说分数

允许：

```text
ADD_DIRECT_SUPPORTED
ADD_INFERRED_SUPPORTED
```

ADD_INFERRED_SUPPORTED 必须：

```text
retained source fact
featureCode
frozen rubric rule/range
numeric value
rationale
confidence
sourceRefs
locator/hash
annotationMethod = rubric_inference
```

例如来源说：
- 国指定重要文化财
- 江户时代建筑
- 日本庭园
- 官方夜间开放
- 无障碍设施
- 大型儿童游乐区
- 登山步道/陡坡

可以依据 frozen rubric 映射到相应 feature，
不是必须网页直接写“history=8”。

禁止：
- AI memory-only
- 默认0/5
- 仅名称/类别直接评分

## 12. 43D 全量 Final 硬门槛

最终必须：

```text
write-through canary canonical additions >=100
full accepted-POI sweep complete
canonical new non-null >0
canonical provenance >0
all additions/supersedes provenance complete
remaining null only field-level UNSUPPORTED_AFTER_EXHAUSTIVE_SEARCH
unexplained canonical delta =0
```

之前：

```text
direct=0
inferred=0
canonical=0
```

绝对不能变成 COMPLETE。

## 13. Visit / Access

继续：
- preserve all current
- attempted for applicable accepted POIs
- real source-backed additions if found
- no regression

## 14. Self-healing

Routine：
- source 404/timeout
- parser fail
- low candidate margin
- stale municipality
- test fail
- projection mismatch
- artifact corruption
- low-yield batch
- transient Git/network

必须：

```text
diagnose
→ repair
→ rerun affected unit
→ QA
→ continue
```

不要回来问用户。

## 15. Result 更新

更新：

```text
docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md
```

保留旧 PARTIAL 历史。

新增 Correction v2 章节必须报告：

### Resolver
- difficult calibration corpus
- holdout composition
- Recall@5
- Top1
- HIGH/MEDIUM/PROVISIONAL precision
- inspectLookupAttempted 5920
- inspect match/no-match
- real candidate generation stats
- provisional audit

### Identity
5920 final disposition counts。

### Write-through Canary
- 50+ candidates
- new canonical fields
- feature codes
- provenance
- semantic annotation

### Full 43D
- sourceSearchAttemptedCandidates
- pages opened
- retained text
- semantic annotation count
- direct additions
- inferred additions
- canonical applied
- per-feature before/after
- coverage bands
- remaining field-level saturated nulls

### Integration
unexplained delta=0

### QA
exact final-head hosted Quality Gate PASS。

## 16. GitHub delivery

继续 TASK-075，不建 TASK-076。

如果 execution branch 尚未远端存在：
ordinary push 建立。

Draft PR：

```text
base = codex/b-task-074-poi-final-unattended-closure
head = codex/b-task-075-japan-poi-entity-resolver-43d-completion
```

最终 exact current-head Quality Gate PASS 后才可 COMPLETE。

禁止：
- force push
- history rewrite
- auto-merge
- Registry rebind
- Master Code allocation
- production import

现在从 difficult resolver recalibration 开始。
