# CODEX — TASK-075-B Correction v2.1: Path Discovery + Mandatory Semantic Review

继续现有 TASK-075-B / Issue #416。
不要新建 TASK-076。

本轮目标：
1. 自动找到或回退使用 296MB inspect 审计，不再因为路径找不到就 BLOCKED；
2. 重做 difficult resolver calibration；
3. 让 43D 真正执行 model semantic review，而不是正则命中/正则未命中；
4. 让 write-through canary 真正产生 canonical 新 non-null；
5. Canary 失败时自己诊断、修复、重跑，不要回来问用户。

## 0. 同步并读取最新 v2.1

执行：

git status --short
git branch --show-current
git fetch --all --prune

读取：

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/AMENDMENT-TASK-075-b-correction-v2.1-path-semantic-review.md

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/AMENDMENT-TASK-075-b-resolver-43d-real-execution-correction-v2.md

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/TASK-075-b-japan-poi-entity-resolver-43d-completion.md

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md

Correction v2.1 publication commit:

f69e8654636030908b7449eb0b2aa0d7b1a5e162

以 v2.1 > v2 > 原 Task 为优先级执行。

## 1. 不要把 inspect 路径缺失当 hard blocker

目标文件：

travelassist-japan-poi-master-registry-v1.52-social-inbound-core-gaps-b235.xlsx.inspect.ndjson

先检查之前实际成功审计过的绝对路径：

D:/xwechat_files/wxid_mwmxbrvhta2s22_01ed/msg/file/2026-09/travelassist-japan-poi-master-registry-v1.52-social-inbound-core-gaps-b235.xlsx.inspect.ndjson

再检查 Windows 反斜杠形式。

如果不存在，进行 bounded path discovery，只搜索：

D:/xwechat_files/
C:/Users/Administrator/Documents/ChatGPT/
C:/Users/Administrator/Downloads/
C:/Users/Administrator/Desktop/
当前 repository 的上级目录

先按 exact filename 搜索；
必要时按：

*social-inbound-core-gaps-b235.xlsx.inspect.ndjson

搜索。

记录：

pathsChecked
fileFound
resolvedAbsolutePath
fileSize
lineCountSanity

禁止整机盲目递归搜索。

## 2. 如果找到 inspect 文件

streaming / line-by-line 读取。

禁止：
- 整文件读内存
- 修改源文件
- 复制进仓库
- 提交 GitHub

必须对：

5920 / 5920 residual

执行 streamed lookup。

最终：

inspectLookupAttempted = 5920

并统计：

inspectExactKeyMatch
inspectMunicipalityNameMatch
inspectAliasMatch
inspectAddressMatch
inspectCategoryAssist
inspectConflict
inspectNoMatch

no-match 继续 external candidate generation。

## 3. 如果当前机器环境确实访问不到原文件

不要 BLOCKED。

读取已有：

docs/qa/POI-IDENTITY-REGISTRY-AUDIT/

并把它作为：

inspectLookupSource = PRECOMPUTED_AUDIT

记录：

inspectFilePresent = false
auditResidualPopulation = 5920

以及已有 audit metrics。

然后继续全部 resolver external candidate generation。

inspect 是辅助源，不是任务停止条件。

## 4. 重做 difficult resolver calibration

旧：

600 unique municipality/name/category scored candidates

不再接受。

重新建立：

>=1000 known identities
>=600 tuning
>=400 untouched holdout

holdout 至少覆盖：

100 municipality-unique easy positive
100 same-name/near-name hard positive
50 historical/alias/renamed
50 area/district/non-point
50 duplicate/invalid/non-POI negative
50 wrong municipality/prefecture/type-conflict decoy

candidate generator 必须面对多个竞争候选。

必须：

Recall@5 >=99%
Top1 accuracy >=98.5%
HIGH precision >=99%
MEDIUM precision >=98%
PROVISIONAL audited precision >=97%
hard-conflict auto-match =0
deterministic repeat PASS

不达标：
自动修 normalization / candidate generation / historical municipality / scoring / margin，
重跑，
不要询问用户。

## 5. 5920 identity 仍按 v2 hard rules

任何：

MATCHED_HIGH
MATCHED_MEDIUM
MATCHED_PROVISIONAL
HISTORICAL_OR_ALIAS_MATCH

必须有真实 external Top-N target。

不能把 input row 本身做 pseudo candidate。

必须存在：

candidateSetGenerated=true
candidateSetSize>=1
real Top1 target
top1Score
top2Score（有竞争者时）
margin
hardConflicts
retained discriminative evidence
prefecture/municipality compatibility
name/alias compatibility

PROVISIONAL >50%：
必须做 >=1000 条分层审计，
precision >=97%。

否则找 failure pattern，
重跑受影响 rule/batch。

## 6. 43D 不允许正则直接打分或判 null

Regex / keyword 只能：

- 找相关段落
- 排 source priority
- 帮助定位文本

禁止：

regex hit → feature score
regex miss → null/no-support

真正能影响43维的 annotation 必须来自：

actual retained/opened target-scoped source text

每条 semantic annotation 必须有：

candidateKey
sourceRef
sourceTier
retainedTextRef / locator
contentHash
facts[]
featureCode candidates[]
rubricMapping[]
proposedValue/null
rationale
confidence
annotationMethod = model_semantic_review_v2_1
reviewer/model metadata

## 7. 建立 >=50 accepted POI write-through semantic Canary

必须 evidence-rich + 多样：

至少：

10 history/architecture/cultural
10 nature/scenery
10 food/shopping/entertainment
10 family/relax/adventure/access
10 mixed/other

都必须：
- 有 meaningful null
- 有 retained text 或可获取官网/政府/旅游局/运营方来源

不要选50条弱来源只是凑数。

## 8. Canary 必须走生产全链路

每条：

load current identity/features
→ review retained target text
→ 不足则 active official/government/tourism/operator/secondary search
→ open source
→ retain text + locator/hash
→ model semantic review
→ frozen rubric mapping
→ field decisions
→ projection
→ canonical apply
→ reconcile
→ provenance validation

PASS：

candidates >=50
semanticAnnotationAttempted = candidates
candidatesWithNewSupported >=30
canonical new non-null >=100
>=10 distinct feature codes canonical added
provenanceWritten >= canonical additions
unexplained canonical delta =0
deterministic projection/rebuild PASS

## 9. Canary 失败不要直接 BLOCKED

如果没达到 threshold：

自动至少抽20条 no-add/failed rows，
判断原因：

weak source selection
source retrieval
wrong target scope
annotation schema/prompt
rubric mapping
projector
canonical gate

然后：

修 responsible layer
必要时替换真正资料贫乏的 canary rows 为 evidence-rich accepted POIs
保留 replaced-row audit
重跑 canary

继续 bounded remediation iterations。

只有真正 infrastructure/permission blocker 才允许停。

Routine low-yield 不是 hard blocker。

## 10. Canary PASS 后全量 accepted POI semantic review

所有 accepted POI 且有 null：

必须：

review existing retained evidence
→ feature-family search
→ open/retain actual source
→ model semantic review
→ rubric
→ exactly 43 decisions

最终：

UNSUPPORTED_AFTER_EXHAUSTIVE_SEARCH

必须每个 field 有：

featureCode
sourceFamiliesAttempted
queries
openedSources
retainedSources
semanticReviewRef
noSupportReason
annotationMethod = model_semantic_review_v2_1

没有 semanticReviewRef：
该 null decision 无效。

## 11. 每个 enrichment batch 强制 telemetry

必须记录：

candidateCount
acceptedCandidateCount
retainedEvidenceReviewedCandidates
sourceSearchAttemptedCandidates
sourcePagesOpened
retainedTextCandidates
semanticAnnotationAttempted
semanticAnnotationWithFacts
directAdded
inferredAdded
canonicalApplied
provenanceWritten
finalNullFieldCount

硬 gate：

semanticAnnotationAttempted == acceptedCandidateCount

retainedEvidenceReviewedCandidates == acceptedCandidateCount

每个 candidate 都有 semanticReviewRef

每个 final null 都有 semanticReviewRef

如果某 candidate 没新 search：
必须说明已有 retained evidence 足够且已 review。

## 12. 近零新增 batch 自动修复

如果一个200条 batch near-zero：

自动：

抽 >=30 条
→ 查看 queries
→ 查看 opened sources
→ 查看 retained text
→ 查看 semantic review
→ 判断 source targeting/extractor/rubric 是否失效
→ 扩 query/source families
→ 重跑 batch

zero-add 只有30条 saturation audit 证明真实无支持事实，
且 candidate-level audit 完整，
才能 PASS。

## 13. rubric inference 正式允许

允许：

ADD_DIRECT_SUPPORTED
ADD_INFERRED_SUPPORTED

ADD_INFERRED_SUPPORTED 必须有：

source fact
featureCode
frozen rubric rule/range
numeric value
rationale
confidence
sourceRefs
locator/hash
annotationMethod = rubric_inference

禁止：
AI memory-only
默认0
默认5
仅名称/类别直接评分

## 14. 最终 Completion gate

只有：

difficult resolver PASS
5920/5920 final identity
inspect live 5920 lookup 或 documented PRECOMPUTED_AUDIT fallback
semantic write-through canary PASS
full accepted-POI semantic review sweep COMPLETE
canonical new non-null >0
provenance >0
all final nulls 有 semanticReviewRef + field-level saturation audit
unexplained canonical delta =0
exact current-head GitHub Quality Gate PASS

才能：

TASK-075-B = COMPLETE / READY FOR USER REVIEW

## 15. Result

继续更新：

docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md

顶部追加：

Previous TASK-075 partial run superseded for identity/enrichment acceptance by Resolver / 43D Real-Execution Correction v2.1.

报告：

Inspect path discovery / PRECOMPUTED_AUDIT fallback
Difficult resolver calibration
Provisional audit
Semantic write-through canary
Canary remediation iterations
Full source/review telemetry
Direct/inferred/canonical additions
All43 coverage before/after
Remaining audited nulls
Visit/Access
Exact-head Quality Gate

不要创建 TASK-076。
不要 auto-merge。
不要 Master Code allocation。
不要 Registry rebind。
不要 production import。

现在从 inspect path discovery + difficult recalibration 开始。
