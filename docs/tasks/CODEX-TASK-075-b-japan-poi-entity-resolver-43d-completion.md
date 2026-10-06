# CODEX — TASK-075-B Japanese POI Entity Resolver + Final Identity Adjudication + 43D Completion

请在 `kanzakimy0/TravelAssist` 完整执行 TASK-075-B。

Issue: #416

Authoritative Task:
`docs/tasks/TASK-075-b-japan-poi-entity-resolver-43d-completion.md`

Mandatory Result:
`docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md`

这次目标不是再做一轮“搜索后仍 unresolved”，而是构建 Japanese POI Entity Resolver，把剩余 5,920 条全部做最终裁决，并在同一任务里完成43维补证据、Visit/Access 和 canonical integration。

用户要求无人值守；Routine 问题必须自己诊断、修复、重跑、继续。

## 0. 开始前

执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/codex/b-task-074-poi-final-unattended-closure
git rev-parse origin/task/b-task-075-japan-poi-entity-resolver-43d-completion
git log --oneline -15 origin/task/b-task-075-japan-poi-entity-resolver-43d-completion
```

确认 upstream 当前 accepted head 是：

```text
6f5526897212605ba918d676a430404d23153ece
```

读取：

```bash
git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/TASK-075-b-japan-poi-entity-resolver-43d-completion.md

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md

git show origin/codex/b-task-074-poi-final-unattended-closure:docs/tasks/RESULT-TASK-074-b-poi-final-unattended-closure.md
```

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
history rewrite
```

不要删除：
- outputs/
- source cache
- retained evidence
- 本地 296MB inspect 文件
- 已生成的 POI-IDENTITY-REGISTRY-AUDIT

不要把 296MB 原始 inspect 文件提交 GitHub。

## 1. Execution branch

如果不存在，创建：

```text
codex/b-task-075-japan-poi-entity-resolver-43d-completion
```

从：

```text
origin/task/b-task-075-japan-poi-entity-resolver-43d-completion
```

开始。

PR #415 未合并期间，本任务 Draft PR：

```text
base = codex/b-task-074-poi-final-unattended-closure
head = codex/b-task-075-japan-poi-entity-resolver-43d-completion
```

不要修改 PR #415 本身。

## 2. 无人值守授权

本 TASK-075 生命周期内已明确授权：

- one heartbeat automation
- auto-next
- checksum resume
- routine self-healing
- failed-batch rerun
- bounded source/network retry
- ordinary non-force push 到 TASK-075 execution branch
- safe normal merge of expected upstream without history rewrite
- Result/QA/PR updates

正常 batch 不得询问用户。

只有以下才属于 true hard blocker：
- 必须 force/history rewrite
- 缺 repository credential/permission
- 需要新的 paid provider authorization
- 需要正式 Registry/Master Code governance 决策
- 基础设施 bounded retries 后完全不可用

即使单个 candidate 有 blocker，也继续处理其他 candidates。

## 3. Phase 0 — authoritative baseline + local audit ingest

先重建 current candidate view。

必须至少确认：

```text
population = 10369
working population = 10097
scored POIs = 2519
non-null 43D = 6209
Visit = 23
Access/static links = 1538
residual identity population = 5920
```

冻结 5920 candidate membership/order/checksum。

查找本地文件：

```text
travelassist-japan-poi-master-registry-v1.52-social-inbound-core-gaps-b235.xlsx.inspect.ndjson
```

如果存在：
- 只能 streaming/line-by-line
- 不整文件读内存
- 不修改
- 不提交

读取或重新生成：

```text
docs/qa/POI-IDENTITY-REGISTRY-AUDIT/
```

已知 audit：
- exact/high potential 很少
- 5891 条无法靠这个文件直接 join
- 因此它只能是 auxiliary source

Phase 0 结束必须写 Result。

## 4. Phase 1 — 构建 Japanese POI Entity Resolver

核心原则：

```text
prefecture
→ municipality
→ normalized Japanese name / alias
→ candidate set
→ address/type/URL/operator/station/locality/context
→ Top1/Top2
→ score + margin + hard conflicts
→ final adjudication
```

县+市是 strong blocking，不是普通15%/10%加分项。

同名 POI 在其他县市：
默认不是 competing target。

只有以下才允许跨 municipality：
- 官方证明旧行政区合并/改名
- ward/city reorganization
- boundary-spanning POI
- upstream municipality 有明确错误证据

### Japanese normalization

至少实现：
- NFKC
- 全半角
- 空格/标点
- 日本/ASCII括号
- 中点
- romanization space/hyphen
- 安全的丁目数字标准化
- ヶ/ケ locality variant
- Japanese/English aliases
- former/historical names with evidence

禁止过度 normalize。

### Historical municipality

建立/读取官方支持的：
old municipality → current municipality

覆盖：
- 市町村合并
- 改名
- ward/city reorganization

### Candidate generation

来源：

1. municipality/prefecture official
2. target official site
3. tourism/DMO
4. cultural property / museum / park / religious
5. operator
6. official SNS
7. authoritative map/reference
8. reliable secondary
9. local 296MB inspect when joinable
10. existing repository source/access context

Search snippet 只能 discovery。

### Hard conflicts

以下默认 hard conflict：
- prefecture mismatch
- municipality mismatch after historical mapping
- incompatible type
- incompatible address/locality
- official domain/operator clearly different

hard conflict 不能靠高 soft score 覆盖。

## 5. Resolver calibration，必须自己调到合格

建立至少600条 known-good accepted POIs：

```text
>=400 tuning
>=200 untouched holdout
```

覆盖：
- 各地区
- urban/rural
- temple/shrine
- park/nature
- museum/cultural
- station/transport
- shopping/food/entertainment
- onsen/area entity
- common-name
- unique-name
- JP/EN alias

初始 relative weights：

```text
name/alias = 25
address/locality = 20
municipality = 15
coordinate/map context = 15
prefecture = 10
official URL/operator = 10
category/type = 5
```

缺字段时必须对 available evidence 重新归一化，不能因为字段缺失天然扣掉上限。

必须同时计算：

```text
Top1 score
Top2 score
margin
hard conflicts
```

初始阈值：

```text
HIGH:
score >= 0.90
margin >= 0.20
>=1 discriminative signal
no hard conflict

MEDIUM:
score >= 0.80
margin >= 0.12
>=2 independent signals
no hard conflict
```

这只是初始值。

Holdout 必须达到：

```text
Top1 accuracy >= 98.5%
HIGH precision >= 99.0%
MEDIUM precision >= 98.0%
hard-conflict auto-match = 0
deterministic repeat PASS
```

如果不达标：

自己：
- 分析 error
- 调 normalization
- 调 candidate generation
- 调 historical municipality
- 调 scoring/margin
- 重跑 calibration/holdout

直到 PASS。

不要问用户调权重。

## 6. Municipality-unique 自动确认规则

如果：

- authoritative prefecture + municipality 固定
- normalized name / verified alias 在该 municipality 只有一个合理 POI
- type compatible
- no hard conflict
- 至少1个 additional official/authoritative discriminative confirmation

则允许：

```text
MATCHED_HIGH
```

不需要为了形式再找两个无关网站。

“市内唯一合理候选”本身就是强 identity evidence。

## 7. Phase 2 — 5920 全部最终裁决

处理：

```text
5920
200 per batch
30 batches
```

每条必须：

1. municipality block
2. normalize
3. Top-N candidate generation
4. discriminative evidence
5. score/margin
6. hard-conflict check
7. low confidence → 自动 deep search
8. 最终裁决

最终只能是：

```text
MATCHED_HIGH
MATCHED_MEDIUM
MATCHED_PROVISIONAL
HISTORICAL_OR_ALIAS_MATCH
DUPLICATE_OF_EXISTING
AREA_OR_DISTRICT_ENTITY
NOT_A_POI
SOURCE_RECORD_INVALID
SOURCE_RECORD_AMBIGUOUS_EXCLUDE
```

最终禁止存在：

```text
DEEP_RESEARCH_REQUIRED
EVIDENCE_EXHAUSTED_UNRESOLVED
UNRESOLVED
IDENTITY_CONFLICT_HOLD
```

注意：
这不是要求乱猜。

如果查完后无法安全绑定某一个 real POI：
不要留下 unresolved，
而是对 source record 本身做最终处理：

```text
SOURCE_RECORD_AMBIGUOUS_EXCLUDE
SOURCE_RECORD_INVALID
DUPLICATE_OF_EXISTING
NOT_A_POI
AREA_OR_DISTRICT_ENTITY
```

这样 identity 问题必须在本任务中关闭。

### MATCHED_PROVISIONAL

只有：
- Top1 clearly dominates
- prefecture/municipality compatible
- name compatible
- >=1 discriminative signal
- no hard conflict

才能使用。

它仅用于 candidate-level enrichment。
禁止 formal Registry rebind / Master Code allocation。

## 8. Phase 3 — resolve 后当场43维/Visit/Access

以下 disposition：

```text
MATCHED_HIGH
MATCHED_MEDIUM
MATCHED_PROVISIONAL
HISTORICAL_OR_ALIAS_MATCH
AREA_OR_DISTRICT_ENTITY
```

必须当场继续：

```text
load current values
→ preserve
→ identify nulls
→ targeted search
→ retain source text
→ semantic annotation
→ rubric scoring
→ provenance
→ Visit
→ Access
→ canonical apply
→ reconcile
```

不允许 identity 完成后留给下一 task。

## 9. Phase 4 — 全 accepted POI 的最终43维 sweep

Phase 2 完成后，重新计算：

```text
所有 accepted POI
AND
至少一个43D = null
```

包括：
- 原来已 resolved
- 本次新 resolved

冻结 dynamic queue。

继续：

```text
200 per batch
直到 queue exhausted
```

每个 accepted POI 必须：

- exactly 43 field decisions
- preserve current supported
- remaining null 主动搜证据
- direct evidence 可以打分
- source-backed rubric inference 可以打分
- 所有新增必须 provenance
- null 只有 exhaustive search 后才能保留

允许：

```text
PRESERVE_SUPPORTED
ADD_DIRECT_SUPPORTED
ADD_INFERRED_SUPPORTED
SUPERSEDE_SUPPORTED
UNSUPPORTED_AFTER_EXHAUSTIVE_SEARCH
NOT_APPLICABLE_BY_ENTITY_TYPE（仅rubric明确允许）
```

### ADD_INFERRED_SUPPORTED

必须有：
- retained source facts
- explicit rubric mapping
- rationale
- confidence
- sourceRefs
- locator/hash

禁止 AI memory-only score。
禁止默认5。

## 10. Feature-family 搜索

不要机械43次搜索。

按 family：

```text
history / architecture / art / local / educational

scenery / nature / photo / seasonality

food / shopping / entertainment / night / onsen

family / senior / couple / solo / relax / adventure

walking / physical / indoor-outdoor / weather sensitivity

cost / reservation / duration / access

unique / iconic / hidden
（comparative evidence only）
```

## 11. null 之前必须 source saturation

accepted POI 某 feature family 要保留 null 前：

必须：
- review existing retained target text
- 尝试至少2类适用 source family（如果存在）
  例如 official + government/tourism
  或 official + authoritative secondary

没有 source 的例外必须记录。

## 12. Low-yield batch 不得直接 PASS

如果一个200条 enrichment batch 新增异常低：

自动：

1. 抽 >=20 low-yield rows
2. 检查 query targeting
3. 检查 source family
4. 检查 semantic extraction
5. 调整 query template/source strategy
6. 重跑当前 batch
7. 再 QA

不要回来问用户。

zero/near-zero 只有明确 evidence-saturation audit 才能 PASS。

## 13. Visit / Access 一起补

Visit：
- preserve current
- 搜官方 recommended duration / itinerary / route / facility guide
- rubric允许时可 source-backed inference
- opening hours/transport duration 不能直接当 visit duration

Access：
- preserve current
- 搜 official access page
- nearest station/bus stop/port
- last-mile walk
- static access relationships

live timetable/fare/delay 属 runtime，不写 static master。

## 14. Canonical integration 必须每批闭环

每批：

```text
evidence
→ semantic facts
→ projection
→ canonical apply
→ diff/reconcile
→ QA
→ receipt
```

每个 projected addition 最终必须：

```text
APPLIED
DUPLICATE_ALREADY_CANONICAL
REJECTED_IDENTITY
REJECTED_EVIDENCE
REJECTED_CONTRACT
SUPERSEDED
```

不允许再出现：
batch有新增，但canonical差异留到最终。

unexplained delta 必须始终 = 0。

## 15. Self-healing

以下全部自行处理：

### source failure
404/timeout/JS-only
→ retry
→ alternate official
→ government/tourism
→ operator/SNS
→ authoritative secondary

### low identity margin
→ 更深 candidate generation
→ address/locality
→ historical municipality
→ station/nearby context
→ official URL/operator
→ comparison

### parser failure
→ fallback parser

### test failure
→ exact log
→ classify regression/stale fixture/resource flake
→ fix
→ targeted test
→ full test
→ continue

### projection/canonical mismatch
→ diff
→ contract/order/dedup/identity/evidence gate
→ fix smallest layer
→ regenerate batch
→ rerun

### corrupt artifact
→ invalidate checkpoint
→ rebuild batch
→ checksum
→ deterministic rerun

### git transient
→ bounded retry

### non-fast-forward
→ fetch/inspect
→ safe normal merge if no history rewrite
→ rerun gates

Routine 问题不得停止等用户。

## 16. 必须生成 QA

```text
docs/qa/TASK-075-B/resolver-calibration.md
docs/qa/TASK-075-B/resolver-calibration.json
docs/qa/TASK-075-B/resolver-holdout-errors.jsonl

docs/qa/TASK-075-B/residual-identity-final.md
docs/qa/TASK-075-B/residual-identity-final.jsonl

docs/qa/TASK-075-B/excluded-source-records.md
docs/qa/TASK-075-B/excluded-source-records.jsonl

docs/qa/TASK-075-B/43d-evidence-exhausted.md
docs/qa/TASK-075-B/43d-evidence-exhausted.jsonl
```

## 17. Result Markdown

持续更新：

```text
docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md
```

至少在：
1. baseline
2. calibration PASS
3. every 5 identity batches
4. identity 5920 complete
5. every major low-yield remediation
6. final43D sweep complete
7. final QA
8. exact-head GitHub gate

更新并 ordinary push。

## 18. 最终必须报告

### Identity

```text
5920/5920 final dispositions
DEEP_RESEARCH_REQUIRED = 0
EVIDENCE_EXHAUSTED_UNRESOLVED = 0
UNRESOLVED = 0
IDENTITY_CONFLICT_HOLD = 0
```

报告：
HIGH
MEDIUM
PROVISIONAL
ALIAS/HISTORICAL
DUPLICATE
AREA
NOT_POI
INVALID
AMBIGUOUS_EXCLUDE

### 43D

报告：

```text
scored POIs before / after
non-null before / after
direct additions
inferred additions
superseded
remaining null
all 43 feature before/after
>=1
>=10
>=20
>=30
43/43
```

剩余 null 只能：

```text
UNSUPPORTED_AFTER_EXHAUSTIVE_SEARCH
```

且必须有 QA audit。

### Visit / Access

before/after/additions/superseded。

### Canonical

```text
unexplained projected/canonical delta = 0
```

### Integrity

```text
Master Code allocation = 0
Registry rebind = 0
candidateKey change = 0
```

## 19. Final QA

必须：

- deterministic resolver repeat PASS
- deterministic final rebuild PASS
- targeted identity tests PASS
- targeted POI/43D tests PASS
- Visit tests PASS
- Access tests PASS
- full repository tests PASS
- lint PASS
- typecheck PASS
- format PASS
- build/deployment/artifact PASS
- whitespace PASS
- exact current-head GitHub Quality Gate PASS

## 20. Final Draft PR

创建/更新：

```text
base = codex/b-task-074-poi-final-unattended-closure
head = codex/b-task-075-japan-poi-entity-resolver-43d-completion
```

保持 Draft。
不要 auto-merge。

最终 Result commit 后：
- ordinary push
- wait exact-head Quality Gate
- PASS 后在 PR 和 Issue #416 评论：
  - exact final head
  - Quality Gate run ID
  - SUCCESS
  - Result path

不要为了把 final SHA 写回 Result 再制造 self-reference commit。

## 21. Completion

只有全部满足，才能：

```text
TASK-075-B = COMPLETE / READY FOR USER REVIEW
```

如果 source record 不能安全绑定到现实 POI，
必须已经被正式裁决为：
duplicate / invalid / ambiguous-exclude / not-a-poi / area entity，
而不是 unresolved。

不要留给下一次 Task。

现在开始 Phase 0。
