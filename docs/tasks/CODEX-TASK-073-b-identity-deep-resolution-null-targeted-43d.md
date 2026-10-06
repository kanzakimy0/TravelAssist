# CODEX — TASK-073-B Identity Deep Resolution + Null-Targeted 43D Expansion

请在 `kanzakimy0/TravelAssist` 完整执行 TASK-073-B。

Issue: #411

Authoritative Task:
`docs/tasks/TASK-073-b-identity-deep-resolution-null-targeted-43d.md`

Mandatory visible Result:
`docs/tasks/RESULT-TASK-073-b-identity-deep-resolution-null-targeted-43d.md`

这是一个新的独立执行阶段，但必须 stacked 在当前 TASK-072-B / PR #410 上，不得丢失 TASK-072 Correction v2 的当前权威数据。

## 0. 开始前

执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/codex/b-task-072-evidence-to-43d-projection
git rev-parse origin/task/b-task-073-identity-deep-null-targeted-43d
git log --oneline -15 origin/task/b-task-073-identity-deep-null-targeted-43d
```

确认当前 TASK-072 upstream head 与任务发布时记录一致或是其正常后继。

读取：

```bash
git show origin/task/b-task-073-identity-deep-null-targeted-43d:docs/tasks/TASK-073-b-identity-deep-resolution-null-targeted-43d.md

git show origin/task/b-task-073-identity-deep-null-targeted-43d:docs/tasks/RESULT-TASK-073-b-identity-deep-resolution-null-targeted-43d.md

git show origin/codex/b-task-072-evidence-to-43d-projection:docs/tasks/RESULT-TASK-072-b-evidence-to-43d-projection.md
```

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

不要删除 source cache / outputs / retained evidence。

## 1. 建立执行分支

如果本地/远端还没有 TASK-073 execution branch：

```text
codex/b-task-073-identity-deep-null-targeted-43d
```

从：

```text
origin/task/b-task-073-identity-deep-null-targeted-43d
```

建立。

PR #410 未合并期间，TASK-073 Draft PR：

```text
base = codex/b-task-072-evidence-to-43d-projection
head = codex/b-task-073-identity-deep-null-targeted-43d
```

不要修改 PR #410 本身。

## 2. Gate 0 — 先修复当前 Visit fixture

当前 upstream GitHub Quality Gate 已知失败：

```text
tests/poi-remaining-review.test.mjs:181
expected minimumDurationMinutes = 60
actual = null
```

在任何 POI 批量任务开始前：

1. 本地复现；
2. 找出该 candidate；
3. 找到支持原 60 分钟 minimumDuration 的权威 evidence / provenance；
4. 检查 TASK-072 projection 是否漏掉 Visit；
5. 判断是数据/投影 bug，还是测试已过期；
6. 只能根据 evidence 修复；
7. 禁止单纯把 expected 60 改成 null 来通过测试；
8. 运行 targeted Visit tests；
9. 运行完整 repository Node tests。

只有：

```text
full repository tests = PASS
```

才允许进入 Canary。

将诊断和修复结果写入 Result Markdown 的 Upstream stabilization。

## 3. 重新确认 authoritative baseline

执行 canonical current candidate reader。

至少验证：

```text
population = 10369
pending = 10097
global scored >= 2515
global non-null >= 6111
Visit >= 23
Access/static links >= 1538
```

并冻结 TASK-073 两个 population：

### Track A

```text
SECOND_PASS_REQUIRED = 5849
IDENTITY_CONFLICT = 165
Total = 6014
```

### Track B

```text
enrichment-ready = 4083
```

断言：

```text
6014 + 4083 = 10097
```

每个 population：
- candidateKey unique；
- deterministic order；
- manifest + checksum；
- 一旦执行开始不得漂移。

## 4. Mandatory Dual Canary

在 Canary PASS 前，禁止全量。

### Canary A — Identity Deep Resolution

选择 >=30 个 Track A candidates，必须覆盖：

- same-name ambiguity；
- historical / renamed；
- address mismatch；
- coordinate mismatch；
- likely official-site target；
- official SNS corroboration；
- 165 conflict population 中也要至少包含若干样本。

每个 candidate 必须：

```text
search
→ open actual source
→ retain target-scoped text
→ identity signals
→ competing targets
→ decision
```

允许：

```text
RESOLVED_HIGH
RESOLVED_MEDIUM
DEEP_RESEARCH_REQUIRED
IDENTITY_CONFLICT_HOLD
```

MEDIUM 必须：

- >=2 independent identity signals；
- >=1 discriminative signal；
- sourceRefs retained；
- no unresolved credible competing target。

Canary 必须证明：

- 不会把模糊对象默认 MEDIUM；
- 可以正常留下 DEEP_RESEARCH_REQUIRED；
- resolved candidate 会立即继续 43D/Visit/Access enrichment；
- Registry / Master Code / candidateKey 不变；
- deterministic repeat PASS。

### Canary B — Null-Targeted 43D

选择 >=30 个 Track B candidates。

不要随机选全是资料贫乏对象。

必须主动选择：

- 仍有大量 null；
- 但很可能有官网/政府/旅游局/官方来源；
- 覆盖多种 POI 类型；
- 覆盖多种 feature family。

真实执行：

```text
existing values
→ identify nulls
→ targeted official-source search
→ retain text
→ semantic annotation
→ rubric
→ ADD_SUPPORTED / preserve/null
→ provenance
```

Canary PASS 硬指标：

```text
candidates >= 30
candidatesWithADD_SUPPORTED >= 15
newNonNull >= 25
distinct featureCodes >= 5
provenanceWritten >= added/superseded count
existing values preserved
deterministic projection PASS
```

如果 Canary B 不通过：

STOP。

修 search / semantic annotation 策略。

禁止降低 threshold。
禁止直接启动全量。

将两个 Canary 完整结果写入 Result Markdown。

## 5. Track A — 6014 Identity Deep Resolution

Canary PASS 后开始无人值守。

按冻结顺序：

```text
6014
→ 200 per batch
→ 31 batches
```

每个 candidate 主动搜索：

- 日文正式名
- 英文/罗马字
- 别名/历史名
- 都道府县
- 市町村
- 地址
- 坐标/地图上下文
- owner/operator
- 官网
- 政府
- 官方旅游局/DMO
- 文化财/博物馆/公园/寺社
- 官方运营商
- 官方SNS
- authoritative secondary source

搜索摘要只能 discovery，不能 evidence。

每条必须最终：

```text
RESOLVED_HIGH
RESOLVED_MEDIUM
DEEP_RESEARCH_REQUIRED
IDENTITY_CONFLICT_HOLD
```

不能静默 unresolved。

### 如果 resolve

当场继续：

```text
43D null-targeted search
Visit extraction
Access extraction
```

不要等 Track A 全部结束。

### 如果仍不能 resolve

写：

```text
docs/qa/TASK-073-B/identity-deep-research.md
docs/qa/TASK-073-B/identity-deep-research.jsonl
```

记录：

candidateKey
names/aliases
locality/address/coordinates
queries
sources
best target
competing targets
missing discriminative signal
reason unresolved
recommended next action
confidence
enrichment blocked yes/no

普通 ambiguous candidate 不得阻断无人值守。

## 6. Track B — 4083 Null-Targeted 43D

Track A 正常完成后自动进入 Track B。

```text
4083
→ 200 per batch
→ 21 batches
```

每 candidate：

1. 加载 current authoritative featureSet/provenance；
2. preserve existing supported；
3. 获取 remaining null codes；
4. 按 feature families 主动搜证据；
5. 真正读 target-scoped source；
6. semantic annotation；
7. rubric application；
8. ADD_SUPPORTED / PRESERVE / NULL；
9. provenance；
10. Visit / Access。

禁止机械跑43个 query。

推荐搜索 family：

```text
history / architecture / art / local / educational
scenery / nature / photo / seasonality
food / shopping / entertainment / night / onsen
family / senior / couple / solo / relax / adventure
walking / physical / indoor-outdoor / weather
cost / reservation / duration / access
unique / iconic / hidden（需要comparative evidence）
```

每个 candidate 最终仍有 exactly 43 field decisions。

## 7. 评分规则

继续使用 frozen rubric。

```text
null = unknown / unsupported
0 = evidenced absence
5 != default
```

不能根据：

- 名字
- 类型
- fame
- AI常识
- search snippet
- nearby attraction

打分。

每个 ADD / SUPERSEDE 必须：

featureCode
value
sourceRefs
sourceTier
confidence
rationale
rubricVersion
annotationMethod
contentHash
locator/hash

existing supported value 默认 preserve。

## 8. 官方 SNS

只有确认 ownership 才能用。

保存：

platform
account
ownershipEvidence
accountUrl
postUrl
postDate
observedAt
targetScope
retainedText
contentHash
locator/hash

临时：

- closure
- queue
- weather
- current timetable
- one-off event

不得直接转成永久 static fact。

## 9. 每批流程

```text
active search
→ open/retain source
→ semantic annotation
→ identity decision if Track A
→ 43D
→ Visit
→ Access
→ QA
→ checkpoint/receipt
→ ordinary push
→ auto-next
```

每批 <=200。

正常 batch PASS 后不要询问用户。

## 10. 每批必须 telemetry

至少：

track
batchId
model
reasoningConfiguration
candidateCount
queryCount
officialSitePages
governmentTourismPages
officialSNSAccounts
officialSNSPosts
authoritativeSecondaryPages
retainedTextCount
semanticAnnotationAttemptedCount
identityResolvedHighCount
identityResolvedMediumCount
deepResearchRequiredCount
identityConflictHoldCount
candidatesResolvedThenEnriched
existingNonNullLoaded
preservedNonNull
newNonNull
supersededNonNull
provenanceWritten
featureDecisionCount
visitAttempted
visitAdded
accessAttempted
accessAdded
remainingNullDecisionCount
rejectedEvidenceCount
reviewErrorQueueCount
inputChecksum
evidenceChecksum
outputChecksum
elapsed

## 11. Hard FAIL gates

任意：

- candidate membership mismatch
- candidate lost
- Track A candidate no identity outcome
- resolved identity no qualifying evidence
- existing supported value silently lost
- ADD/SUPERSEDE no provenance
- semantic annotation skipped on Track B candidate
- search snippet as evidence
- featureDecisionCount != candidateCount × 43
- Registry / Master Code / candidateKey change
- non-deterministic
- checkpoint written before outputs
- resume/corruption test fail

=> BATCH FAIL。

## 12. Track A Final

必须：

```text
6014
=
RESOLVED_HIGH
+ RESOLVED_MEDIUM
+ DEEP_RESEARCH_REQUIRED
+ IDENTITY_CONFLICT_HOLD
```

并报告：

resolved then enriched
new43D from resolved candidates
Visit additions
Access additions
deep research count

## 13. Track B Final

必须：

```text
4083 / 4083 semantic annotation attempted
```

并报告：

existing non-null loaded/preserved
new non-null
superseded
provenance
remaining null
43-feature before/after
coverage bands

不要用 newNonNull >0 单独代表成功。

目标是主动搜索并最大化 evidence-backed coverage。

## 14. 全局 Final

Result 必须包含：

### Identity

before:
5849 SECOND_PASS_REQUIRED
165 conflicts

after:
HIGH
MEDIUM
DEEP_RESEARCH_REQUIRED
CONFLICT_HOLD

### 43D

global scored before >=2515
global scored after
global non-null before >=6111
global non-null after
new/superseded
per-feature before/after

coverage:
>=1
>=10
>=20
>=30
43/43

### Visit / Access

authoritative before:
Visit >=23
Access >=1538

after / additions / superseded

### Sources

official site
government/tourism
operator
official SNS
secondary
retained text
provenance
locator/hash

### Queues

deep research
conflicts
contradictory evidence
remaining null reasons

### Integrity

Registry checksum
candidate identity checksum
Master Code allocation=0
Registry rebind=0
candidateKey change=0

## 15. Visible Result Markdown

持续更新：

```text
docs/tasks/RESULT-TASK-073-b-identity-deep-resolution-null-targeted-43d.md
```

至少在：

1. stabilization
2. dual canary
3. Track A
4. Track B
5. final QA
6. final GitHub gate

更新并 push。

不能只写 JSON。
不能只写终端结果。

## 16. Unattended authorization

Stabilization + dual canary PASS 后：

明确授权 TASK-073-B 无人值守：

- one heartbeat automation
- auto-next
- ordinary non-force push to codex/b-task-073-identity-deep-null-targeted-43d
- checksum resume
- heartbeat delete on finish/hard blocker

同一 TASK-073 execution branch 的正常 ordinary push 无需每批再次询问。

如果遇：

non-fast-forward
unexpected divergence
auth failure
需要 destructive action

=> STOP。

禁止 force push。

## 17. GitHub final delivery

完成后：

1. 更新 Result Markdown；
2. commit；
3. ordinary push；
4. 创建/更新一个 Draft PR：
   base = codex/b-task-072-evidence-to-43d-projection
   head = codex/b-task-073-identity-deep-null-targeted-43d
5. 运行 exact current PR head Quality Gate；
6. PASS 后在 PR / Issue 评论记录：
   exact final head
   Quality Gate run ID
   Result path
7. 不为了把 final SHA 写回 Result 而追加自引用 commit。

## 18. Completion

只有：

- stabilization PASS
- dual canary PASS
- Track A 6014/6014
- Track B 4083/4083
- current supported values no silent regression
- all new/superseded complete provenance
- deterministic final check PASS
- exact final-head Quality Gate PASS
- complete Result Markdown

才能：

```text
TASK-073-B = COMPLETE / READY FOR USER REVIEW
```

否则：

```text
PARTIAL / BLOCKED
```

不要 merge。
不要 production import。
不要 Master Code allocation。
不要 Registry rebind。

现在从 Gate 0 Visit fixture stabilization 开始。
