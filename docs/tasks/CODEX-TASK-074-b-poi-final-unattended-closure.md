# CODEX — TASK-074-B Final Unattended Closure / Self-Healing Enrichment

请在 `kanzakimy0/TravelAssist` 完整执行 TASK-074-B。

Issue: #414

Authoritative Task:
`docs/tasks/TASK-074-b-poi-final-unattended-closure.md`

Mandatory visible Result:
`docs/tasks/RESULT-TASK-074-b-poi-final-unattended-closure.md`

本次用户将离线/睡觉。除真正 hard blocker 外，不要停下来等待用户反馈。

## 0. 开始前

执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/codex/b-task-073-identity-deep-null-targeted-43d
git rev-parse origin/task/b-task-074-poi-final-unattended-closure
git log --oneline -15 origin/task/b-task-074-poi-final-unattended-closure
```

读取：

```bash
git show origin/task/b-task-074-poi-final-unattended-closure:docs/tasks/TASK-074-b-poi-final-unattended-closure.md

git show origin/task/b-task-074-poi-final-unattended-closure:docs/tasks/RESULT-TASK-074-b-poi-final-unattended-closure.md

git show origin/codex/b-task-073-identity-deep-null-targeted-43d:docs/tasks/RESULT-TASK-073-b-identity-deep-resolution-null-targeted-43d.md
```

确认 upstream exact head：

```text
061da02ec86a8c3601aaee395f811a47c5846950
```

并确认其 Quality Gate #35615144458 = SUCCESS。

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

不要删除 outputs/source-cache/retained evidence。

## 1. 建立 execution branch

如果不存在：

```text
codex/b-task-074-poi-final-unattended-closure
```

从：

```text
origin/task/b-task-074-poi-final-unattended-closure
```

建立。

PR #413 未合并期间，TASK-074 Draft PR：

```text
base = codex/b-task-073-identity-deep-null-targeted-43d
head = codex/b-task-074-poi-final-unattended-closure
```

不要修改 #413 本身。

## 2. 无人值守授权

用户明确授权 TASK-074-B 无人值守执行。

允许：

- 创建/重建一个 TASK-074 heartbeat automation
- 自动 next-batch
- 自动诊断和修复 routine code/data/test/CI failure
- 重跑失败 batch
- bounded source/network retry
- checksum resume
- 对 codex/b-task-074-poi-final-unattended-closure 做普通 non-force push
- safe normal merge of expected upstream if needed, no history rewrite
- 更新 Result / QA / PR comments
- 完成或 hard blocker 后删除 heartbeat

这些操作不需要逐批再次询问用户。

只有以下情况才允许停止：

- 必须 force push / history rewrite
- destructive reset/clean 才能继续
- 缺少 credentials/permissions
- 需要新的 paid/provider authorization
- 两个互斥 canonical identity outcome 无法安全裁决且必须由用户做治理决定
- 基础设施在 bounded retries 后仍完全不可用

以下都不是 hard blocker：

- 404/timeout/JS-only source
- 单个 candidate ambiguity
- stale fixture
- failing test
- projection/canonical mismatch
- malformed batch artifact
- incomplete receipt
- transient Git/network error
- one candidate error

这些必须自行处理后继续。

## 3. Phase 0 — authoritative baseline + 48-row reconciliation

先重建 current candidate view。

必须确认至少：

```text
population = 10369
scoredPois = 2516
nonNullFeatures = 6185
Visit = 23
Access/static links = 1538
```

然后对 TASK-073：

```text
batch-projected new non-null = 122
canonical-applied new non-null = 74
difference = 48
```

逐条建立 reconciliation。

每个差异必须唯一归入：

```text
DUPLICATE_ALREADY_CANONICAL
REJECTED_IDENTITY_BLOCK
REJECTED_EVIDENCE_GATE
REJECTED_CONTRACT
SUPERSEDED
APPLY_MISSING_CANONICAL
OTHER_EXPLAINED
```

必须生成：

```text
docs/qa/TASK-074-B/projection-canonical-reconciliation.md
docs/qa/TASK-074-B/projection-canonical-reconciliation.jsonl
```

如果有 valid supported fact 被 canonical integration 漏掉：

- 修 generator/projector/integration
- apply missing canonical fact
- preserve provenance
- rerun canonical reader
- rerun focused POI tests

Phase 0 必须做到：

```text
122 projected
=
canonical applied/preserved
+
explicit rejected/superseded/explained
```

一个都不能悬空。

失败时自己修，不要问用户。

## 4. Phase 1 — 5920 Identity closure

初始 population：

```text
5755 DEEP_RESEARCH_REQUIRED
165 IDENTITY_CONFLICT_HOLD
= 5920
```

冻结 membership/order + checksum。

按 200 一批：

```text
29 × 200 + 120
= 30 batches
```

每条主动搜索：

- Japanese/local official name
- aliases/historical names
- prefecture
- municipality
- locality/address
- coordinates/map context
- owner/operator
- official target site
- government/prefecture/municipality
- tourism/DMO
- cultural-property/museum/park/religious
- official operator
- verified official SNS
- authoritative secondary/reference
- cache/archive

搜索摘要只能用于 discovery，不能 evidence。

每条必须最终：

```text
RESOLVED_HIGH
RESOLVED_MEDIUM
EVIDENCE_EXHAUSTED_UNRESOLVED
IDENTITY_CONFLICT_HOLD
```

### HIGH

要求：
- official/authoritative source + discriminative geo/org signal
或
- multiple strong independent authoritative sources

### MEDIUM

必须全部满足：
- >=2 independent identity signals
- >=1 discriminative signal beyond name
- sourceRefs retained
- no unresolved credible competing target

否则：

```text
EVIDENCE_EXHAUSTED_UNRESOLVED
或
IDENTITY_CONFLICT_HOLD
```

禁止为了减少 unresolved 数量默认 MEDIUM。

每个 identity record 保存：

identitySignals[]
sourceRefs[]
discriminativeSignal
competingTargets[]
rejectionReasons[]
confidence
searchTrace
finalDisposition

## 5. Phase 2 — newly resolved candidate same-pass enrichment

任何 HIGH / MEDIUM：

不要等 Phase 1 完成。

当场：

```text
load current supported values
→ preserve
→ identify nulls
→ targeted official-source search
→ retain target text
→ semantic annotation
→ rubric
→ ADD/PRESERVE/SUPERSEDE/NULL
→ provenance
→ Visit
→ Access
```

一个新 resolve candidate 不能只完成 identity 而不做 enrichment。

## 6. Phase 3 — final null-targeted queue

Phase 1 完成后，重新计算：

所有 identity-resolved 且存在 >=1 null 43D 的 candidates。

包含：

- 之前已 enrichment-ready
- Phase 1 新 resolve

冻结新的 deterministic queue。

继续：

```text
200 per batch
直到 queue exhausted
```

不要预先假定 batch 数量。

按 feature family 搜，不要43个 blind queries：

```text
history / architecture / art / local / educational

scenery / nature / photo / seasonality

food / shopping / entertainment / night / onsen

family / senior / couple / solo / relax / adventure

walking / physical / indoor-outdoor / weather sensitivity

cost / reservation / duration / access

unique / iconic / hidden（comparative evidence only）
```

每个 candidate 仍然 exactly 43 decisions。

## 7. 43D rules

严格 frozen rubric：

```text
null = unsupported/unknown
0 = evidenced absence
5 != default
```

禁止根据：

- name
- type/category
- fame
- AI memory
- search snippet
- nearby attraction

直接打分。

每个 ADD / SUPERSEDE 必须有：

```text
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
```

existing supported value 默认 preserve。

## 8. Visit / Access

Visit：
- preserve current authoritative values
- 有明确证据才 add/supersede
- opening hours / transport duration / hike segment / event / guide segment 不自动当 whole visit duration

Access：
- preserve current authoritative static links
- add only supported named access relations
- live timetable/fare/delay/accessibility/current service 不进入 static master

## 9. Source self-healing

遇到：

```text
404
timeout
JS-only
robots
temporary failure
```

自动：

1. bounded retry/backoff
2. cache/archive
3. alternate official page
4. government/tourism
5. owner/operator
6. official SNS
7. authoritative secondary

仍无资料：
标记 evidence exhausted
继续。

不要停止 task。

## 10. Candidate self-healing

单个 candidate：

- parse fail → fallback parser
- source scope fail → alternate source
- identity ambiguous → search more discriminative signals
- still unresolved → residual queue
- continue

一个 candidate 不能卡死 batch。

## 11. Projection / canonical self-healing

如果：

```text
projected != canonical
```

自动：

- diff
- 查 contract
- 查 ordering
- 查 dedup
- 查 identity gate
- 查 evidence gate
- fix smallest responsible layer
- regenerate affected batch
- focused tests
- deterministic rerun
- continue

不能再把 discrepancy 留到最终。

## 12. Test / CI self-healing

任何 test/CI failure：

自动：

1. 获取 exact failing test/log
2. classify：
   task regression
   stale fixture
   baseline issue
   infrastructure/resource flake
3. task regression → fix
4. stale fixture → only update if authoritative evidence proves stale
5. resource flake → use deterministic/repository-approved safe test mode, then still rerun hosted exact-head CI
6. run targeted tests
7. run full relevant suite
8. continue

不要因为普通 test failure 停下来找用户。

## 13. Artifact/receipt self-healing

missing / corrupt / incomplete：

- invalidate affected checkpoint
- rebuild affected batch
- verify checksum
- verify deterministic output
- continue

## 14. Git self-healing

普通同 branch push 已授权。

Transient auth/network failure：
bounded retry。

Non-fast-forward：
fetch + inspect。

如果 safe normal merge 能解决且不 rewrite history：
允许 normal merge，之后重新 gates。

只有 force/history rewrite 才停止。

## 15. Residual queues

最终允许 unresolved/null，仅当 evidence-search policy 已 exhausted。

必须生成：

```text
docs/qa/TASK-074-B/identity-evidence-exhausted.md
docs/qa/TASK-074-B/identity-evidence-exhausted.jsonl

docs/qa/TASK-074-B/null-evidence-exhausted.md
docs/qa/TASK-074-B/null-evidence-exhausted.jsonl
```

每条说明：

candidateKey
searches attempted
sources opened
evidence missing
best target / field evidence
blocker
future source/action that could change result

这些是最终可接受 residual queue，不需要因此继续无限循环。

## 16. Batch telemetry

每批至少：

phase
batchId
model
reasoning
candidateCount
queryCount
officialSitePages
governmentTourismPages
officialSNSAccounts
officialSNSPosts
authoritativeSecondaryPages
retainedTextCount
semanticAnnotationAttemptedCount
identityHighCount
identityMediumCount
identityEvidenceExhaustedCount
identityConflictHoldCount
resolvedThenEnriched
existingNonNullLoaded
preservedNonNull
newNonNull
supersededNonNull
provenanceWritten
featureDecisionCount
visitAttempted
visitAdded
visitPreserved
accessAttempted
accessAdded
accessPreserved
canonicalAppliedCount
canonicalRejectedCountByReason
remainingNullDecisionCount
candidateErrorCount
retryCount
recoveryActions
inputChecksum
evidenceChecksum
outputChecksum
elapsed

## 17. Hard batch gates

Batch 不可 PASS：

- membership/count mismatch
- candidate lost
- resolved identity lacks evidence
- existing supported value disappears
- ADD/SUPERSEDE no provenance
- semantic annotation skipped where allowed
- search snippet used as evidence
- featureDecisionCount != candidateCount*43
- projected/canonical remains unreconciled
- Visit/Access regression
- Registry/Master Code/candidateKey change
- non-deterministic rerun
- receipt before outputs
- corruption/resume validation fail

失败后：
自动 repair + rerun current batch。

## 18. Result Markdown

持续更新：

```text
docs/tasks/RESULT-TASK-074-b-poi-final-unattended-closure.md
```

至少更新：

1. baseline
2. Phase 0 reconciliation
3. every major recovery incident
4. Phase 1 completion
5. Phase 3 completion
6. final QA
7. final GitHub gate

不能只写 JSON。
不能只输出 terminal。

## 19. Final authoritative verification

最终必须：

- current population = 10369
- all 10097 working candidates final disposition
- every supported 43D/Visit/Access reconciled
- all projected/canonical differences closed
- scored before/after
- non-null before/after
- all 43 feature before/after
- >=1 / >=10 / >=20 / >=30 / 43/43
- identity final outcomes
- residual evidence-exhausted queues
- deterministic rebuild PASS
- targeted POI tests PASS
- full repository tests PASS
- lint PASS
- typecheck PASS
- format PASS
- build/deploy/artifact PASS
- git diff --check PASS
- exact current-head hosted Quality Gate PASS

## 20. Final Draft PR

完成后：

创建/更新一个 TASK-074 Draft PR：

```text
base = codex/b-task-073-identity-deep-null-targeted-43d
head = codex/b-task-074-poi-final-unattended-closure
```

保持 Draft。
不要 auto-merge。

Result 提交后：

- ordinary push
- wait exact-head Quality Gate
- PASS 后在 PR # / Issue #414 评论写：
  exact final head
  Quality Gate run ID
  SUCCESS
  Result path

不要为了把 final SHA 写回 Result 再追加自引用 commit。

## 21. Completion

如果所有执行工作完成、只有真正 evidence-exhausted residual cases：

可以：

```text
TASK-074-B = COMPLETE / READY FOR USER REVIEW
```

不要求伪造43/43。
不要求凭空 resolve 无证据身份。

但必须：
- 每条 work 已 dispositioned
- 所有可支持数据已写入
- 所有残留均有 exhaustive audit
- exact-head Quality Gate PASS

除真正 hard blocker 外，不要在用户睡觉期间停下来等待反馈。

现在开始 Phase 0。
