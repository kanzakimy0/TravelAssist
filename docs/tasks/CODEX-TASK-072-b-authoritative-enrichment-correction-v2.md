# CODEX — TASK-072-B Final Correction v2: Authoritative 43D Enrichment

请继续同一个 TASK-072-B / Issue #409，不要新建业务 Task。

Repository:
kanzakimy0/TravelAssist

Existing execution branch:
codex/b-task-072-evidence-to-43d-projection

Existing Draft PR:
#410

这次目标不是重新做 discovery，而是修正此前 TASK-072 的错误基线和“机械43次判空”问题，真正把 evidence 转成 43D + provenance + Visit/Access + identity disposition。

## 0. 先同步并读取最新规则

执行：

git status --short
git branch --show-current
git fetch --all --prune

读取最新修复 Amendment：

git show origin/task/b-task-072-evidence-to-43d-projection:docs/tasks/AMENDMENT-TASK-072-b-authoritative-enrichment-correction-v2.md

读取原 TASK / Identity Amendment / Result：

git show origin/task/b-task-072-evidence-to-43d-projection:docs/tasks/TASK-072-b-evidence-to-43d-projection.md

git show origin/task/b-task-072-evidence-to-43d-projection:docs/tasks/AMENDMENT-TASK-072-b-identity-resolution-second-pass-v1.md

git show origin/task/b-task-072-evidence-to-43d-projection:docs/tasks/RESULT-TASK-072-b-evidence-to-43d-projection.md

最新 authoritative correction publication commit 包含：

435d7faee443f162d7648d2d3f49a8071ca0beda

以 correction v2 为最高优先级执行。

禁止：
git clean -fd
git reset --hard
git push --force
git push --force-with-lease

不要删除 outputs/ 或任何 source cache / retained evidence。

## 1. 当前旧 TASK-072 COMPLETE 结论作废

现有 Result 中：

scored POIs = 272
non-null = 860
new non-null = 0
provenance = 0
RESOLVED_MEDIUM = 6044

这些不能作为最终验收结果。

必须保留旧产物用于审计，但标记：

SUPERSEDED_BY_AUTHORITATIVE_ENRICHMENT_CORRECTION_V2

不要删除旧 feature-decisions / receipts / identity-projection。

## 2. 第一硬门槛：先恢复权威 current-candidate view

在任何新 enrichment 前，运行：

node --import ./tests/register-route-ts.mjs tools/poi/read-current-candidates.mjs

必须得到并保存机器输出，且权威 upstream 基线应为：

population = 10369
newScoredPois = 2238
scoredPois = 2510
nonNullFeatures = 6104
pendingCandidates = 10097
runtimeImportAuthorized = false

如果不是这些值：

STOP。

不要继续全量。
先修复 current-candidate view / manifest / delta / editorial ledger wiring。

特别检查：

data/poi/full/manifests/current-candidate-review.v1.json
data/poi/full/reviews/remaining-v1/feature-delta.jsonl
data/poi/full/sources/remaining-v1/editorial.json
data/poi/full/reviews/remaining-v1/pending/*.jsonl

TASK-072 的 10097 人口中必须识别出：

existing scored candidates = 2238
existing non-null features = 5244

另外 272 scored / 860 non-null 是 protected previous baseline，不得被当成整个 current view。

## 3. 修 projector 输入

禁止只读取旧：

data/poi/full/features/batch-*.jsonl

作为 TASK-072 当前事实。

正确输入必须是：

baseFeaturePartitions
+
verified feature delta
+
editorial ledger
=
current candidate view

所有 10097 candidates 的 currentValue 必须来自 current candidate view。

硬性 gate：

在 corrected run 开始前，
统计 pending 10097 内：

existing scored candidates == 2238
existing non-null == 5244

不满足 => BLOCKED。

## 4. 修架构：必须分 Semantic Annotation 与 Deterministic Projection

不能再用一个纯脚本把所有字段机械生成：

UNSUPPORTED_REMAINS_NULL

正确流程：

### Stage A — semantic evidence annotation

Codex/model 真正读取：

- TASK-071 retained text
- source cache
- locator/hash
- discovery inventory
- 必要时补搜官网/政府/旅游/官方SNS/可信二级来源

然后逐 candidate 输出结构化 evidence facts。

每个 fact 至少：

candidateKey
featureCode
suggestedValue
sourceRef
sourceTier
confidence
reason
rubricVersion
annotationMethod
contentHash
locator/hash

这一步必须进行语义判断。

### Stage B — deterministic projection

再由代码把已验证 evidence facts 投影成：

featureSet
provenance
Visit Profile
Access Anchor
identity disposition

脚本只能投影 Stage A 事实，不能凭空推分。

## 5. Mandatory correction canary：不通过绝对禁止全量

至少做两类 control。

### A. Preservation controls

从当前 10097 pending 人口里选 >=20 个已经有 non-null 的候选。

必须证明：

- currentValue 来自 authoritative current view
- existing provenance 能读出来
- 所有已有 non-null 都生成 PRESERVE_SUPPORTED
- 不丢任何已有值
- preservedNonNullCount > 0

### B. Evidence-to-new-value controls

选 >=20 个“当前仍有 null、但 retained text / accepted source 明确包含 rubric-supported fact”的候选。

不要随机选全是弱证据的。
必须主动选 evidence-rich cases，覆盖至少3种 feature code。

Semantic annotation 必须先人工/模型读正文，然后生成 ADD_SUPPORTED。

Canary PASS 硬门槛：

candidateCount >=20
featureExtractionAttemptedCount = candidateCount
每个 candidate exactly 43 decisions
newNonNullFeatureCount >=10
ADD_SUPPORTED 覆盖 >=10 candidates
至少 3 个不同 featureCode 有新增
provenanceWrittenCount >= newNonNullFeatureCount
每个新增有 sourceRef/rationale/confidence/rubricVersion/locator-hash
deterministic projection repeat PASS
Registry/Master Code/candidateKey unchanged

如果 canary：

newNonNull = 0
或
provenance = 0

立即 BLOCKED。

禁止开始10097全量。

## 6. 全量执行时 preserve 当前已有 5244 non-null

对于 10097 population：

existing non-null before = 5244

最终必须：

preservedExistingNonNull
+ supersededExistingNonNull
= 5244

任何已有值都不能静默消失。

Global final view：

scoredPoisAfter >= 2510
nonNullFeaturesAfter >= 6104

如果低于：
FAIL。

## 7. 每 candidate 仍然 exactly 43 decisions，但不是机械判空

每个字段必须按：

load currentValue
→ load relevant evidence
→ semantic annotation
→ rubric application
→ final decision

允许：

PRESERVE_SUPPORTED
ADD_SUPPORTED
SUPERSEDE_SUPPORTED
UNSUPPORTED_REMAINS_NULL
IDENTITY_BLOCKED
SOURCE_CONTRADICTORY

对于已有 non-null：
默认 PRESERVE_SUPPORTED。

对于当前 null：
有支持事实就 ADD_SUPPORTED。
没有才 UNSUPPORTED_REMAINS_NULL。

newNonNullFeatureCount 最终必须 > 0。

provenanceWrittenCount 最终必须 > 0。

否则 TASK-072 correction 不得 COMPLETE。

## 8. Identity 6049 必须重新审计，禁止“默认 MEDIUM”

旧结果：

RESOLVED_HIGH = 5
RESOLVED_MEDIUM = 6044
SECOND_PASS = 0

不可直接接受。

对每个 RESOLVED_MEDIUM 必须实际保存：

identitySignals[]
sourceRefs[]
discriminativeSignal
competingTargets[]
rejectionReasons[]
confidence

MEDIUM 最低条件：

- >=2 independent identity signals
- 至少一个不是 bare name，而是：
  address/locality/municipality/coordinate/operator/official domain/official account
- 无 credible competing target 未解决

如果不满足：

SECOND_PASS_REQUIRED

不要为了减少 second-pass 数量而放宽规则。

### Identity Audit

Phase A 完成后：

随机/分层抽查 >=200 个 RESOLVED_MEDIUM。

要求：

0 条缺少上述证据结构。

如果发现任何 invalid MEDIUM：
对应 batch 必须重做，重新审计。

最终仍满足：

6049
=
RESOLVED_HIGH
+ RESOLVED_MEDIUM
+ SECOND_PASS_REQUIRED
+ IDENTITY_CONFLICT_HOLD

并生成真实 second-pass：

docs/qa/TASK-072-B/identity-second-pass.md
docs/qa/TASK-072-B/identity-second-pass.jsonl

## 9. Visit / Access 也必须读取当前权威状态

不要把 TASK-072 新目录中的 0 当作 before。

从 current candidate view / upstream manifests 读取现有 Visit / Access。

要求：

existing supported Visit / Access 不能静默消失。

Result 写：

authoritative before
after
added
superseded
preserved

只有证据支持才新增。

## 10. 53个 frozen batches 无人值守执行

只有 correction canary PASS 后才允许。

继续复用原53个 batch membership/order。

每批：

load authoritative current view
→ semantic evidence annotation
→ 43D decisions
→ identity projection
→ Visit/Access extraction
→ deterministic writeback
→ QA
→ checkpoint
→ normal non-force push
→ auto-next

正常 batch PASS 后不询问用户。

已明确授权当前 TASK-072 correction 期间：

- heartbeat automation
- ordinary non-force push 到 codex/b-task-072-evidence-to-43d-projection
- checksum resume
- auto-next

如果 non-fast-forward/divergence/auth failure 需要 destructive operation：
STOP。
禁止 force push。

## 11. 每批新增硬性 telemetry

必须记录：

authoritativeCurrentViewLoaded
existingScoredCandidateCount
existingNonNullLoadedCount
semanticAnnotationAttemptedCount
semanticFactsAcceptedCount
featureExtractionAttemptedCount
featureDecisionCount
preservedNonNullCount
newNonNullFeatureCount
supersededFeatureCount
provenanceWrittenCount
identityResolvedHighCount
identityResolvedMediumCount
secondPassRequiredCount
identityConflictHoldCount
identityEvidenceCompleteCount
visitExistingLoadedCount
visitAddedCount
accessExistingLoadedCount
accessAddedCount
supplementalSearchCandidateCount
officialSourceCount
officialSNSCount
remainingNullDecisionCount
reviewErrorQueueCount
input/evidence/output checksums

## 12. 自动 FAIL 条件

以下任何一个发生：

FAIL / BLOCKED

- authoritative baseline 不是 2510 / 6104
- pending baseline 不是 2238 / 5244
- preservation canary 丢失已有 non-null
- evidence-rich canary newNonNull <10
- evidence-rich canary provenance =0
- full run newNonNull =0
- full run provenanceWritten =0
- preserved+superseded existing !=5244
- final global scoredPois <2510
- final global nonNull <6104
- 任何 ADD/SUPERSEDE 无 provenance
- MEDIUM identity 缺 qualifying signals
- current Visit/Access 静默回退
- Registry/Master Code/candidateKey 改变
- non-deterministic
- exact final-head Quality Gate failure

禁止再用“434171 decisions 已生成”单独宣布 COMPLETE。

## 13. Result Markdown 修正

持续更新：

docs/tasks/RESULT-TASK-072-b-evidence-to-43d-projection.md

顶部必须明确写：

Previous TASK-072 completion superseded by Authoritative Enrichment Correction v2.

Final Result 必须包含：

Authoritative baseline:
global scored 2510
global non-null 6104
pending scored 2238
pending non-null 5244

Canary:
preservation controls
evidence-rich controls
newNonNull
provenance
feature codes covered

Full run:
10097 candidates
434171 decisions
semanticAnnotationAttemptedCount
preserved 5244 reconciliation
new non-null
superseded
provenance
43 feature before/after
coverage bands

Identity:
HIGH
MEDIUM
SECOND_PASS
CONFLICT
200-row identity audit

Visit/Access:
authoritative before/after

Integrity:
Registry checksum
candidate identity checksum

Errors/review queues

## 14. Final GitHub delivery，避免 Result 自引用死循环

不要再要求 Result.md 写它自己的最终 commit SHA。

正确流程：

1. 完成全部 implementation/data/QA
2. 更新 Result.md，记录它验证的 implementation/evidence head 和全部指标
3. commit Result
4. 普通 push 到 PR #410 existing branch
5. 等 exact current PR head Quality Gate PASS
6. 在 PR #410 和 Issue #409 评论里写：
   - exact final PR head
   - exact Quality Gate run ID / SUCCESS
   - Result path
7. 不再为了把 final SHA 写回 Result 而追加 commit

PR comment + GitHub check 是 exact-head delivery receipt。

## 15. 最终状态

只有 correction v2 全部硬门槛通过，才可以：

TASK-072-B = COMPLETE / READY FOR USER REVIEW

否则：

BLOCKED / PARTIAL

不要 merge。
不要 production import。
不要 Master Code allocation。
不要 Registry rebind。

现在从 baseline reconciliation + correction canary 开始。
