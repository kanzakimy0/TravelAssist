# TASK-087-B — Canonical Feature43 Legacy Recovery Audit for Pilot-100

- Issue: #452
- Owner: B
- WBS: 7.4.2
- Priority: P0
- Base: latest `develop`
- Proposed execution branch: `feature/b-canonical-feature43-legacy-recovery`
- Depends on: TASK-083-A / PR #444 merged Canonical Pilot-100
- Related: TASK-081-B / PR #437, TASK-084-A / PR #451
- Auto-merge: No
- Runtime / scoring / Planner owner: A (unchanged)

## 1. Objective

TravelAssist 已经存在一万级 POI 候选/历史数据与多轮 Feature43 生产、enrichment、review 结果。

本 Task 不重新从零生产 100 × 43，而是：

1. 对 TASK-083-A 已正式准入的 100 个 Canonical POI 建立历史身份 crosswalk；
2. 穷举仓库内所有相关历史 Feature43 值、provenance、review、sourceRefs；
3. 对每一个 100 × 43 = 4,300 单元做“历史值能否升格 Canonical”的独立判定；
4. 只将满足当前 Feature43 语义、身份、证据、权利和可追溯要求的旧值升级；
5. 其余保持 null / review，不为了覆盖率猜值；
6. 输出可审计、可复算的 Canonical Feature43 overlay v2 candidate。

本 Task 的成功标准是“旧库回收审计完整”，不是“强行 43/43”。

## 2. Current known state

当前 develop 已有：

- 100 admitted Canonical POIs；
- 100 active POI Master Codes；
- Pilot-only runtime manifest；
- candidate corpus 继续 `runtimeImportAuthorized=false`。

TASK-081-B / PR #437 当前 Draft 结果可作为参考证据：

- 4,300 / 4,300 field decisions；
- 17 个 RESOLVED_INFERRED；
- 4,283 null unresolved；
- 84 / 100 POI 仍无任何 Feature43 数值。

PR #437 **不是本 Task 的前置合并条件**。

TASK-087-B 可以读取其 artifacts 作为一个历史/对照输入，但不得把 Draft PR 内容自动当作已验收 Canonical truth。

## 3. Hard constraints

### 3.1 不得重新造一套 Feature43

必须复用：

- `src/shared/contracts/planning/features.ts`
- 当前 Canonical POI contract
- 当前 Master Code / identity contract

不得创建：

- second Feature43 registry
- second POI identity system
- second scoring meaning

### 3.2 Candidate-only 仍不是 Canonical

历史文件中出现数值，不等于允许生产 runtime 使用。

任何 candidate / workbook / review partition：

```text
legacy value exists
!=
Canonical promotion approved
```

必须经过本 Task promotion decision。

### 3.3 禁止按名称弱匹配

历史 identity join 优先级：

1. exact internal UUID / internalId
2. exact accepted Master Code linkage
3. exact Wikidata QID
4. frozen identity-resolution artifact
5. historical candidateKey only as pointer after identity proof

不得仅按：

- 同名
- 相似名
- 坐标接近

自动绑定历史记录。

### 3.4 不得 null → 0 / 5

缺证据继续 null。

0 只能代表“有充分证据证明该特征强度为 0”，不能代表缺失。

### 3.5 不得为了覆盖率降低门槛

本 Task 不设置最低 resolved 数量。

如果最后仍只有 17 个，也可以 PASS_AUDIT，只要证明旧库没有更多可合法升格的数据。

## 4. Historical corpus inventory

必须先穷举仓库内所有可能保存 Feature43 或其来源的历史资产。

至少检查：

### 4.1 Feature partitions

```text
data/poi/full/features/batch-*.jsonl
```

### 4.2 Review / delta / pending / decision artifacts

```text
data/poi/full/reviews/**
data/poi/full/manifests/**
```

### 4.3 Historical source / provenance

```text
data/poi/full/sources/**
```

### 4.4 Registry workbook / frozen derivatives

包括当前仓库内 v1.66 registry workbook 及其派生 machine-readable artifacts。

Workbook 只可作为历史输入，不可因为它存在就获得 runtime authorization。

### 4.5 TASK-068 through TASK-075

搜索并读取这些 Task 的：

- Result
- QA
- manifests
- feature batches
- identity ledgers
- source ledgers
- review decisions

目标是避免重复做以前已做过的数据工作。

### 4.6 TASK-081-B Draft overlay

读取 PR #437 当前 artifacts 作为对照：

- 17 个 inferred values
- source capsules
- 4,300 decisions

但必须标记：

```text
SOURCE_STATUS = UNMERGED_DRAFT_REFERENCE
```

不能隐式提升其治理状态。

## 5. Canonical Pilot-100 identity crosswalk

对 100 个 Canonical POI 逐个建立：

```ts
type LegacyIdentityCrosswalk = {
  canonicalPoiId: string;
  masterCode: string;
  qid?: string;

  historicalMatches: Array<{
    sourceArtifact: string;
    candidateKey?: string;
    historicalInternalUuid?: string;
    qid?: string;
    identityInputChecksum?: string;
    matchMethod: string;
    matchConfidence: number;
  }>;

  identityDecision:
    | "EXACT_MATCH"
    | "MULTIPLE_HISTORICAL_ROWS_RECONCILED"
    | "NO_LEGACY_MATCH"
    | "REVIEW_REQUIRED";
};
```

### Identity acceptance

必须输出：

- 100/100 Canonical identity decisions；
- ambiguous joins；
- duplicate historical rows；
- candidateKey changes across generations；
- any identity conflict。

如果身份不确定，该 POI 的历史 Feature43 不得升格。

## 6. Cell-level lineage inventory

每个 Canonical POI × 每个 Feature43 code，收集所有历史观测：

```ts
type LegacyFeatureObservation = {
  canonicalPoiId: string;
  featureCode: string;

  historicalValue: number | null;
  sourceArtifact: string;
  sourceScope: string;

  sourceRefs: string[];
  provenanceRefs: string[];
  evidenceLocator?: string;
  evidenceHash?: string;

  confidence?: number;
  method?: string;
  rubricVersion?: string;
  featureVersion?: string;

  observedAt?: string;
  reviewedAt?: string;

  rightsStatus?: string;
  freshnessStatus?: string;
};
```

同一 cell 可能有多个历史值，全部保留，不得只取最后一个。

## 7. 4,300 promotion decisions

必须恰好输出 4,300 个 Canonical promotion decisions。

状态至少包括：

### PROMOTE_AS_IS

仅当：

- identity exact；
- historical Feature43 definition 与 current semantic 一致；
- 值在 current 0–9 domain 合法；
- provenance 足够；
- source rights 允许；
- 无 material conflict；
- 不依赖 candidate-only governance 本身作为证据。

### PROMOTE_REVALIDATED

历史值存在，但需要：

- current rubric re-check；
- provenance re-link；
- retained source replay；
- deterministic recalculation；

验证后值仍成立。

### KEEP_CURRENT_CANONICAL

当前 Canonical overlay 已有值，旧库未提供更强或冲突证据。

### CONFLICT_REVIEW_REQUIRED

例如：

- 同一 POI / feature 多个不同历史值；
- rubric version 变化导致数值不可直接比较；
- old/current evidence conflict；
- identity lineage conflict。

不得自动取平均。

### LEGACY_VALUE_NO_PROVENANCE

历史有数值，但找不到足够字段级来源。

保持 null / current canonical，不得升格。

### LEGACY_VALUE_SCHEMA_MISMATCH

旧值对应的 Feature43 定义与当前语义不一致。

### NO_LEGACY_VALUE

旧库也没有值。

### REJECTED

已证明旧值不适合 current Canonical。

## 8. Current 17 values handling

PR #437 当前 17 个 RESOLVED_INFERRED：

- 不自动删除；
- 不自动接受；
- 作为一组独立 observation 输入本 Task。

对每个值输出：

```text
KEEP_CURRENT_CANONICAL
PROMOTE_REVALIDATED
CONFLICT_REVIEW_REQUIRED
REJECTED
```

并说明历史库是否有相同/不同值。

## 9. Historical rubric compatibility

必须查明历史 43D 数据使用的：

- featureVersion
- rubricVersion
- scale definition
- confidence rules

建立：

```text
legacy rubric
→ current rubric
```

compatibility matrix。

如果旧 rubric 的 7/8/9 与当前 7/8/9 语义不一致：

不得直接 copy。

只有确定性转换有充分依据时才允许 revalidated promotion。

## 10. Provenance recovery

“旧数值没有直接 sourceRef”不等于立刻放弃。

允许沿历史 artifact lineage 回溯：

```text
feature batch
→ review decision
→ source ledger
→ retained evidence
→ sourceRef
```

但必须机器可审计。

不得凭代码作者注释推测来源。

### Provenance quality classes

建议：

- P0: exact field-level evidence locator + hash
- P1: exact sourceRef + deterministic rubric inference
- P2: POI-level source only, field mapping weak
- P3: numeric value only / no recoverable provenance

Promotion：

- P0 / P1：可进入 promotion evaluation
- P2：通常 REVIEW / REVALIDATE
- P3：不得 Canonical promote

## 11. Rights and freshness

每个准备 promote 的值必须检查：

- persistence
- redistribution if relevant
- commercial/runtime use where applicable
- snapshot/freshness for dynamic fields

对以下高变字段特别严格：

- crowd
- queue
- accessibility
- walking burden
- seasonal / weather
- operation-dependent attributes

静态历史证据不能冒充 current live truth。

## 12. Output overlay

不要改原 TASK-083 admission dataset。

生成新的 candidate overlay，例如：

```text
src/shared/data/
  canonical-poi-pilot100.feature43-recovery-v2.json
  canonical-poi-pilot100.feature43-recovery-v2.manifest.json
```

具体名称可按仓库规范调整。

Manifest 必须绑定：

- exact base dataset hash
- exact 100 internalIds
- exact 100 Master Codes
- exact recovery decision artifact hash
- rubric compatibility version
- source inventory hash
- promoted count
- unresolved count

在用户验收/合并前不得宣称生产 runtime 已正式授权。

## 13. Machine-readable QA

至少：

```text
docs/qa/TASK-087-B/
  source-inventory.json
  identity-crosswalk.jsonl
  historical-feature-observations.jsonl
  rubric-compatibility.json
  promotion-decisions.jsonl
  conflicts.jsonl
  unresolved.jsonl
  coverage-before-after.json
  provenance-audit.json
  deterministic-rebuild.json
```

### Coverage 必须区分

- existing Canonical values
- historical numeric values found
- historical values with provenance
- promotable values
- conflicts
- rejected values
- final proposed non-null
- unresolved

不要把“found”写成“promoted”。

## 14. Required metrics

至少报告：

- Canonical POIs = 100
- cells = 4,300
- Canonical IDs with legacy match
- Canonical IDs without legacy match
- total historical numeric observations
- unique cells with historical numeric value
- P0/P1/P2/P3 provenance counts
- PROMOTE_AS_IS
- PROMOTE_REVALIDATED
- KEEP_CURRENT_CANONICAL
- CONFLICT_REVIEW_REQUIRED
- LEGACY_VALUE_NO_PROVENANCE
- LEGACY_VALUE_SCHEMA_MISMATCH
- NO_LEGACY_VALUE
- REJECTED
- proposed final non-null count
- 43/43 POI count
- per-feature before/found/promotable/final coverage
- unexplained delta = 0

## 15. No-new-web first pass

Phase 1 必须优先只用仓库已有历史资产。

不要一开始又去重新搜索 100 POI。

只有在：

```text
legacy value found
+ provenance chain nearly complete
+ one retained source needs deterministic revalidation
```

时，才允许按现有 source policy 做最小 revalidation。

如果需要大规模新增外部证据，停止并提出后续 Task，不要把“历史回收 Task”变成新的全网 enrichment Task。

## 16. Interaction with PR #437

本 Task 不要求先合并 #437。

最终 Result 必须给出明确建议：

```text
A. TASK-087-B supersedes #437
B. merge #437 first, then apply recovery delta
C. #437 values are fully incorporated and #437 should be closed as superseded
D. recovery is insufficient; keep both Draft
```

不得出现两个互相覆盖的 Canonical Feature43 overlay 同时进入 develop。

## 17. Interaction with TASK-084-A scoring

本 Task 可以使用评分 runtime 做 **read-only compatibility smoke**。

不得在本 Task 声称：

- ranking quality
- Top-N quality
- calibration complete
- Planner recommendation quality

只有 Feature43 覆盖达到可评估水平后，再由 A 做 Real Scoring Pilot。

## 18. QA / tests

至少覆盖：

- exact 100 Canonical identity set
- no ID/Master Code rebinding
- no candidate-only implicit promotion
- no name-only identity join
- exactly 4,300 promotion decisions
- duplicate historical observation preservation
- conflict detection
- rubric version compatibility
- provenance class calculation
- null preservation
- no unexplained delta
- overlay base hash binding
- overlay reorder/tamper fail-closed
- deterministic rebuild
- repeatable artifact hashes

运行：

```text
TASK-087 targeted tests
Canonical POI tests
Feature43 tests
TASK-081 tests
TASK-083 tests
Preference tests
Recommendation Scoring tests if available on base
Planning tests
Edge tests
governance tests
full Node regression
lint
typecheck
build
deployment validate/build/artifact
format
git diff --check
```

历史 baseline failure 必须单独记录，不能伪装 PASS。

## 19. WBS state

开始：

```text
7.4.2 = 进行中
```

实现完成、Draft PR：

```text
7.4.2 = 待审查
```

只有用户验收并合入：

```text
7.4.2 = 已完成
```

注意：

`已完成` 只代表“Legacy Recovery Audit 完成”，不代表全部 POI 的 43 维已经补齐。

## 20. Stop conditions

必须 Partial / Blocked：

- 100 Canonical identity 无法稳定映射历史 corpus
- historical source lineage 损坏
- feature rubric 无法解释旧值
- source rights 不允许 promotion
- multiple conflicting overlays cannot be deterministically resolved
- candidate-only governance 被误用成 Canonical authorization
- unexplained numeric delta > 0

## 21. Deliverables

至少：

- `docs/tasks/TASK-087-b-canonical-feature43-legacy-recovery.md`
- `docs/tasks/RESULT-TASK-087-b-canonical-feature43-legacy-recovery.md`
- `docs/qa/TASK-087-B/`
- deterministic recovery tool
- tests
- proposed overlay v2 + manifest
- WBS update

Draft PR only.

不得自动 merge。
