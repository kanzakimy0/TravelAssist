# CODEX — TASK-072-B Evidence → 43D Projection Hard-Gated Extraction

请在 kanzakimy0/TravelAssist 完整执行 TASK-072-B。

Issue: #409

Authoritative Task:
docs/tasks/TASK-072-b-evidence-to-43d-projection.md

Mandatory visible Result:
docs/tasks/RESULT-TASK-072-b-evidence-to-43d-projection.md

你必须在执行过程中持续更新这个 Result Markdown。最终没有完整 Result Markdown 时，TASK-072-B 必须判 FAIL。

## 0. 唯一目标

修复 TASK-071-B 的唯一核心问题：

已有 source discovery / full-text review / retained text / locator-hash，
但没有真正执行 43维 extraction、provenance writeback、identity disposition projection、Visit/Access projection。

本任务不是再做一轮 discovery。
本任务必须把证据真正投影到 candidate feature sidecar 和相关结构。

## 1. 开始前

执行：
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/codex/b-task-071-official-sns-43d-enrichment
git rev-parse origin/task/b-task-072-evidence-to-43d-projection
git log --oneline -15 origin/task/b-task-072-evidence-to-43d-projection

确认上游 TASK-071 head：
b3ce290e0ccaf2c9d6128e94216c6e4b2fbd46db

确认 TASK-071 exact-head Quality Gate run #35557538106 = SUCCESS。

读取：
docs/tasks/TASK-072-b-evidence-to-43d-projection.md
docs/tasks/RESULT-TASK-072-b-evidence-to-43d-projection.md
docs/tasks/RESULT-TASK-071-b-official-sns-43d-enrichment.md
docs/qa/TASK-071-B/final-aggregate.evidence-v2.json
data/poi/full/rubrics/candidate-feature-rubric.v1.json

禁止：
git clean -fd
git reset --hard
git push --force
git push --force-with-lease

## 2. 建立执行分支

若 PR #408 尚未合并：
从 origin/task/b-task-072-evidence-to-43d-projection 建立 codex/b-task-072-evidence-to-43d-projection。

最终 Draft PR：
base = codex/b-task-071-official-sns-43d-enrichment
head = codex/b-task-072-evidence-to-43d-projection

不要修改 #408 本身。

## 3. Mandatory preflight canary

在全量前必须先验证 projector 真能把证据变成43维 decision/writeback。

Positive controls：
- 至少20个已有 non-null + provenance 的候选；
- dry-run/read-only；
- 必须复现至少一个已存在 supported feature/provenance relation；
- existing supported values 保持不变。

Retained-text controls：
- 至少20个 TASK-071 retained text 候选；
- 每个必须生成 exactly 43 个 feature decisions；
- 每个 field 必须有 disposition。

Preflight PASS 必须满足：
- rubricVersion exact match
- retained evidence hash PASS
- positive control reproduction PASS
- featureDecisionCount = 43 × control candidate count
- output schema PASS
- deterministic repeated dry-run PASS
- Registry/Master Code/candidateKey unchanged

任何一项失败：
立即 STOP，更新 RESULT-TASK-072-b-evidence-to-43d-projection.md 为 BLOCKED，并明确 failed gate。
禁止启动10097全量。

## 4. 复用 frozen population / batch

严格复用 TASK-071 的 10,097 candidates 和 53 个 frozen batch membership/order。

优先级保持：
1. 6049 TARGET_IDENTITY_UNRESOLVED
2. 165 IDENTITY_CONFLICT
3. 1422 REVIEWED_TARGET_NO_SUPPORTED_FACT
4. 2461 UNSUPPORTED_FIELDS_REMAIN_NULL

不要重新随机分批，不要改变 membership/order。

## 5. 每个 candidate 必须 exactly 43 decisions

每个 candidate 对43个 feature code逐字段执行。

每个 decision 至少包含：
featureCode
currentValue
proposedValue|null
disposition
evidenceRefs
sourceTier
confidence
rationale
rubricVersion
annotationMethod
locator/hash 或 explicit no-evidence reason

disposition 只允许等价于：
PRESERVE_SUPPORTED
ADD_SUPPORTED
SUPERSEDE_SUPPORTED
UNSUPPORTED_REMAINS_NULL
IDENTITY_BLOCKED
SOURCE_CONTRADICTORY

candidate featureDecisionCount !=43 => candidate FAIL => batch FAIL。

## 6. 真正 writeback

ADD/SUPERSEDE non-null：
- 写 authoritative candidate feature sidecar
- 写 provenance
- 保存 sourceRef/content hash/locator-hash
- 保持 frozen rubric

已有 non-null：
- 默认 PRESERVE
- 只有更强且明确矛盾来源才允许 SUPERSEDE
- supersession 必须有记录

null：
- 保持 null
- 必须写 field-level reason

禁止默认 0。
禁止默认 5。

## 7. Identity projection

TASK-071 报告25个 identity decisions，但 pending counts没有变化。

本任务必须把可支持的 candidate-level identity disposition 真正投影。

必须保持：
candidateKey unchanged
Registry unchanged
formal Master Code allocation = 0
old-code claims unchanged

每个 identity transition 必须有 evidence。

最终 identityResolvedCount 与 pending/disposition before/after 必须数学对得上。

## 8. Visit / Access

对所有10097 candidates都执行：
Visit extraction attempted
Access extraction attempted

有证据才写。
无证据写 explicit no-supported-fact disposition。

不得把当前时刻/票价/延误/临时关闭/排队/天气等 dynamic fact 写成 static master truth。

## 9. Evidence-first，不再无意义重搜

优先使用 TASK-071 已有：
retained text
source cache
locator/hash
discovery inventory

只有当前 candidate/field 证据不足时才补搜：
官网
政府/旅游/文化
官方运营商
官方SNS（必须 ownership proof）
可信二级来源

任何用于 feature writeback 的新来源必须先 retain text/content hash/locator/provenance。

## 10. 每批硬性 PASS gate

每批 <=200，复用原53个 frozen batches。

流程：
load evidence
→ 43-field extraction
→ identity projection
→ Visit/Access extraction
→ writeback
→ QA
→ checkpoint/receipt
→ auto-next

以下任一成立必须 FAIL：
- candidate membership/count mismatch
- candidate missing
- 任一 candidate featureDecisionCount !=43
- featureExtractionAttemptedCount != candidateCount
- ADD/SUPERSEDE non-null 无 provenance
- 新 non-null 无 locator/hash/equivalent evidence
- score 不在0..9
- null 无证据变0/5
- identity transition 无 evidence
- candidateKey/Registry/Master Code改变
- non-deterministic
- receipt 早于 outputs
- corruption/resume test失败

Anti-repeat gate：
retainedTextCount >0 AND featureExtractionAttemptedCount==0 => FAIL。

newNonNullFeatureCount==0 不自动失败，但只有以下条件全满足才可 PASS：
- 每个 candidate exactly43 decisions
- 每个 null 有明确 reason
- positive-control projector 仍 healthy
- extraction stage 可证明已执行

## 11. Batch telemetry

每批必须记录：
phase
batchId
candidateCount
evidenceLoadedCandidateCount
retainedTextCount
featureExtractionAttemptedCount
featureDecisionCount
candidatesWithAtLeastOneSupportedFeature
preservedNonNullCount
newNonNullFeatureCount
supersededFeatureCount
provenanceWrittenCount
locatorHashValidatedCount
identityDecisionAttemptedCount
identityDispositionUpdatedCount
visitExtractionAttemptedCount
visitProfileAddedCount
accessExtractionAttemptedCount
accessAnchorAddedCount
supplementalSearchCandidateCount
supplementalOfficialSourceCount
supplementalOfficialSNSCount
unsupportedNullDecisionCount
contradictorySourceCount
reviewErrorQueueCount
inputChecksum
evidenceChecksum
outputChecksum
registryChecksumBefore/After
candidateIdentityChecksumBefore/After
model
reasoningConfiguration
elapsed

## 12. Unattended authorization

用户已明确授权：preflight PASS 后，本 TASK-072-B 无人值守执行。

允许：
- 创建/重建一个仅 TASK-072 使用的 heartbeat automation
- 正常 batch QA PASS 后 auto-next
- 对 codex/b-task-072-evidence-to-43d-projection 做普通 non-force push
- checksum resume
- 完成或 hard blocker 时删除 heartbeat

这些普通 push 在当前 TASK-072-B 生命周期内无需逐批重新请求用户授权。

如果远端出现 non-fast-forward/divergence/auth failure，需要 destructive operation：STOP，禁止 force push。

禁止：
merge
push develop/main
新建无关业务Task
Master Code allocation
Registry rebind
production import
issue closure

## 13. Result Markdown 必须实时可见

必须持续更新：
docs/tasks/RESULT-TASK-072-b-evidence-to-43d-projection.md

至少在以下节点 commit/push 更新该文件：
1. preflight PASS/BLOCKED
2. 每完成一个 phase
3. 发生 hard blocker
4. 最终53/53完成
5. final-head Quality Gate 后

不能只在终端打印 Result。
不能只生成 JSON。
不能只写 QA README。
必须有这个 Markdown 文件。

## 14. Final acceptance exact gates

只有全部满足才可写 COMPLETE：
10,097/10,097 processed
featureExtractionAttemptedCount = 10,097
total feature decisions = 434,171
所有 new/superseded non-null 有 provenance
identity counts reconcile
Visit extraction attempted = 10,097
Access extraction attempted = 10,097
Registry checksum unchanged
candidate identity integrity preserved
deterministic final check PASS
exact final-head GitHub Quality Gate PASS
visible Result Markdown complete

任一不满足：
Result 必须写 BLOCKED/PARTIAL，禁止写 COMPLETE。

## 15. Final Result 内容

最终 RESULT-TASK-072-b-evidence-to-43d-projection.md 必须包含：
Status
branch
Draft PR
final head
Quality Gate run/conclusion
preflight controls
53-batch summary
434171 decision total
scored POI before/after
non-null before/after
new/superseded/preserved feature counts
all 43 per-feature coverage
>=1 / >=10 / >=20 / >=30 / 43-of-43 coverage
identity unresolved/conflict before/after
identity disposition updates
Visit before/after
Access before/after
provenance / locator stats
supplemental source stats
remaining null reasons
errors/review queue
Registry/candidate checksums
heartbeat deleted
explicit COMPLETE or BLOCKED statement

完成后停止。
不要自动 merge。
不要启动 production import。

## 16. Identity Resolution Amendment — mandatory

Before Phase A execution, read:

`docs/tasks/AMENDMENT-TASK-072-b-identity-resolution-second-pass-v1.md`

This amendment is authoritative and must be applied.

For each of the 6,049 `TARGET_IDENTITY_UNRESOLVED` candidates:

1. actively search and evaluate identity signals;
2. do not require a perfect retained official page if the total evidence reasonably establishes the target;
3. assign exactly one:
   - `RESOLVED_HIGH`
   - `RESOLVED_MEDIUM`
   - `SECOND_PASS_REQUIRED`
   - `IDENTITY_CONFLICT_HOLD`
4. if HIGH/MEDIUM, immediately continue 43D / Visit / Access extraction;
5. if unresolved, write the candidate to both:
   - `docs/qa/TASK-072-B/identity-second-pass.md`
   - `docs/qa/TASK-072-B/identity-second-pass.jsonl`
6. do not stop unattended execution for an ordinary ambiguous candidate.

Required Phase A reconciliation:

```text
6049
= RESOLVED_HIGH
+ RESOLVED_MEDIUM
+ SECOND_PASS_REQUIRED
+ IDENTITY_CONFLICT_HOLD
```

No candidate may silently remain in the old broad `TARGET_IDENTITY_UNRESOLVED` bucket after Phase A.

Additional batch telemetry:

```text
identityResolvedHighCount
identityResolvedMediumCount
secondPassRequiredCount
identityConflictHoldCount
identitySignalsEvaluatedCount
competingTargetsDetectedCount
candidatesResolvedThenEnrichedCount
```

This is candidate-level enrichment resolution only:
- no Master Code allocation;
- no Registry rebind;
- no candidateKey change.
