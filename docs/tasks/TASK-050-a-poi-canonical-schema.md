# TASK-050-A — WBS 7.4 Canonical POI Schema / Validator / Candidate Admission Boundary

> Owner: A — Main Travel System / Shared POI Architecture  
> WBS: 7.4 — POI 标准 Schema  
> Priority: P0  
> Issue: #399  
> Publication branch: `task/a-task-050-poi-canonical-schema`  
> Planned implementation branch: `codex/a-poi-canonical-schema`

## 1. Goal

建立 TravelAssist 唯一的 provider-independent Canonical POI Domain Contract，使以下系统最终共享同一 POI 真值边界：

```text
Places/Search Provider
B POI Candidate / Evidence Production
Master Code Registry
Region Graph
POIFeatureV1
Visit Profile
Candidate Pipeline
Scoring
Itinerary / Feasibility
Planner / POI Detail API
```

本 Task 只建立**标准模型、严格校验、fixtures、candidate→canonical 准入边界与 Planning Projection 适配**。

本 Task **不把任何候选批量升级成正式 POI**。

---

## 2. Execution-time prerequisite

开始实现前必须重新读取最新 `origin/develop` 与 Master WBS。

硬前置：

- WBS 7.2 Places / POI Provider Selection = 已完成。
- Canonical Master Code Registry 已进入 develop。
- Region Graph canonical identity / Master Code 基础可读取。
- Planning Contract / POIFeature / Visit Profile contracts 可读取。

如果 7.4 已被其他最新 Task 完成，不得重复实现；应返回 Blocked / Superseded 并停止。

B 当前 POI 数据生产 PR/Issue 是只读兼容输入，不是 7.4 实现分支依赖。不得修改、merge、retarget 或 renumber B 的 POI 工作。

---

## 3. Mandatory audit before coding

先审计当前仓库，至少覆盖：

- `docs/architecture/poi-master-schema-v0.2.md`
- `docs/architecture/poi-feature-preference-codebook-v0.1.md`
- `src/shared/contracts/planning/poi.ts`
- current Planning facts / freshness / provenance contracts
- Master Code registry / resolver / namespace rules
- Region Graph public contracts
- current assets / destination / attraction slot identities
- current Planner catalog / POI mock structures
- WBS 7.2 provider-selection decision and persistence/licensing boundaries
- B POI candidate/recovery/enrichment outputs if present on develop; if still only on Draft branches, read only for compatibility analysis and do not stack on them.

输出 machine-readable schema audit，明确：

1. 什么已有且应复用；
2. 什么是 Planning Projection，而不是 Canonical Master；
3. 什么是 candidate-only；
4. 什么属于 Provider observation；
5. 什么属于 live/runtime fact；
6. 什么不能持久化；
7. 什么缺口必须由 7.4 补齐。

---

## 4. Frozen identity boundary

必须始终保持：

```text
POI Internal ID
!= Master Code
!= candidateKey
!= destination ID
!= asset/resolution slot ID
!= Provider Entity ID
!= Region ID
!= Transport Node ID
!= AI Local ID
!= DB primary key
```

禁止：

- 把 `candidateKey` 升级为永久 `poiId`；
- 把 `jp-*` destination ID 当 POI ID；
- 把 Provider ID 当 POI ID；
- 把素材 slot 当 POI ID；
- 把行政代码 / Region code 当 POI ID；
- 通过字符串格式“看起来合法”就认定 Master Code 已分配。

---

## 5. Canonical POI contract

建立一个唯一 canonical contract source of truth。

建议逻辑能力至少包括：

### 5.1 Identity

- stable `poiId`
- canonical `masterCode` reference/value
- schema/contract version
- revision
- created/updated metadata where domain contract requires

正式 admitted canonical POI 的 Master Code 必须能够通过 canonical registry 验证。
Task 不负责给全量 POI 分配 Master Code。

### 5.2 Names

- Japanese
- Simplified Chinese
- English
- aliases
- unknown-safe semantics

不得把翻译推断当 verified name。

### 5.3 Classification

必须 provider-independent。

优先复用已有 canonical category/codebook。
如果仓库不存在已批准 detailed taxonomy：

- 只定义足够稳定的 classification reference / minimal broad kind；
- 不在本 Task 擅自冻结完整商业分类树；
- Provider category 映射放 adapter / evidence 层，不进入 canonical enum 真值。

### 5.4 Location

支持：

- point / geometry reference
- coordinates nullable / unknown
- country / region references
- source provenance

不能因为缺坐标自动写 0/0。

### 5.5 Lifecycle

至少能安全表达：

- active
- temporarily closed
- permanently closed
- merged / superseded
- deprecated

具体 enum 应与仓库已有 lifecycle 规则统一。

永久关闭不删除历史 identity。
merge 必须保留 canonical target。

### 5.6 Canonical facts

Canonical Facts 与 0–9 Feature 分离。

可包含或引用：

- opening rules
- last entry
- price / admission facts
- reservation requirements
- accessibility facts
- age restrictions
- official URL
- verified access facts

必须支持：

```text
sourceRef
observedAt
validFrom / validUntil
freshness/status
confidence
review status
```

优先复用现有 Fact / Freshness contract，不建立第二套时间语义。

### 5.7 POIFeatureV1

必须直接复用现有 43-key contract/codebook。

规则不变：

```text
0..9 | null
0 != null
null = unknown / unsupported
```

不得建立 `PoiFeatureV2` 仅为了本 Task。

### 5.8 Visit Profiles

直接复用现有 `PoiVisitProfileV1` 语义。

Canonical POI 可以：

- 0 个 Visit Profile；
- 1..N active/deprecated profiles。

不得伪造空 profile 以提高完整度。

### 5.9 Region relations

POI -> Region 可多对多。

必须引用 canonical Region identity。
至少支持区分 primary / contained / tourism grouping 等现有能力或可扩展 reference semantics。

不得复制 Region Master。

### 5.10 Access Anchor / transport linkage

静态 POI Master 仅保存或引用：

```text
POI -> access anchor -> regional/gateway hub
```

不得保存：

- exact departure/arrival
- live fare
- live availability
- current service disruption
- Provider raw route payload

### 5.11 External IDs

Provider IDs 独立保存：

- provider key
- provider entity ID
- lifecycle/status if known
- source/observation metadata

Provider ID 变化不自动换 `poiId`。

### 5.12 Assets

仅引用 Asset Registry / asset identity。
POI 可以 0..N assets。
不得把 asset slot 作为 POI identity。

---

## 6. Provider / persistence / rights boundary

WBS 7.2 的 Provider 决策是 CONDITIONAL，不代表所有字段都允许长期保存。

Canonical schema / admission 必须能区分：

```text
canonical persisted fact
provider observation
transient-only provider field
unknown persistence right
```

至少满足：

- Provider Raw JSON 不进入 canonical object；
- photo URL / binary 不因 Provider 返回而自动可缓存；
- source/provider field 的 retention 未确认时不得自动 canonicalize；
- fetchedAt 不等于 verifiedAt/effectiveAt；
- 营业状态、票价、开放时间等时效事实必须服从 freshness policy；
- restricted provider fields 不得通过“derived”标签绕过许可。

可以通过 source policy / evidence metadata reference 实现，不要求把完整法律文本塞进每个 POI。

---

## 7. Candidate -> Canonical Admission

必须建立独立 Admission Boundary。

它不是第二套 POI Master。

推荐：

```text
PoiCandidate
+ evidence
+ identity resolution
+ registry resolution
+ schema validation
        ↓
Admission Evaluation
        ↓
ADMIT / REVIEW_REQUIRED / BLOCKED / MERGE_TARGET / INSUFFICIENT_EVIDENCE
        ↓
Canonical PoiMasterV1
```

最终状态名应优先复用仓库现有 conventions。

### 7.1 ADMIT gate

至少要求：

- stable canonical identity 已决；
- duplicate / merge disposition 已决；
- required location/region references 合法；
- canonical classification 合法；
- source/evidence refs 可解析；
- Master Code 已由 canonical registry 正式分配；
- lifecycle 合法；
- 43-feature shape 如存在则严格合法；
- Visit Profile 如存在则严格合法；
- candidate/provider/slot identity 未冒充 canonical identity；
- persistence rights 满足；
- material conflicting evidence = 0；
- 没有 live route/weather/crowd 等静态事实泄漏。

### 7.2 Fail closed

以下不得 ADMIT：

- identity conflict；
- duplicate unresolved；
- unknown canonical target；
- unknown Master Code；
- invalid Region ref；
- material source conflict；
- retention/persistence right unknown for required persisted field；
- malformed 43 feature；
- invalid Visit Profile；
- legacy candidate ID substitution。

---

## 8. Planning compatibility

Canonical POI 与现有：

`PoiPlanningProjectionV1`

必须保持明确单向边界：

```text
Canonical POI
     ↓ projection adapter
PoiPlanningProjectionV1
     ↓
Planning Engine
```

要求：

- deterministic；
- provider raw = 0；
- candidate-only field leakage = 0；
- Master Code / internal identity 不混用；
- Region refs 保持 canonical；
- Feature / Visit Profile 语义不变；
- Projection 缺少的 Facts 通过 factRefs 表达，不偷偷扩展旧 planning contract。

如果必须修改既有 Planning public contract，必须证明是 additive/compatible 或返回 Partial 要求独立 Contract Review，不得静默 breaking change。

---

## 9. Fixtures

至少创建以下正向 fixtures：

1. urban iconic attraction
2. temple/shrine/history
3. nature/scenic
4. onsen/resort
5. shopping/food/entertainment
6. temporarily closed
7. permanently closed historical POI
8. merged duplicate -> canonical target
9. partial feature coverage with many nulls
10. supported Visit Profile
11. no Visit Profile
12. multiple Region relations
13. Access Anchor linked
14. provider observation with transient-only field excluded from canonical persistence

Fixtures 可以使用明确 synthetic IDs / synthetic registry fixture，不得伪造生产 POI Master Code。

---

## 10. Mandatory negative tests

必须覆盖：

- duplicate poiId
- duplicate active Master Code
- POI Master Code outside allowed namespace
- unknown Master Code
- candidateKey used as poiId
- provider ID used as poiId
- asset slot used as poiId
- unknown/dangling Region ref
- invalid lifecycle transition
- merged target missing/self/cycle if applicable
- missing one of 43 Feature keys
- Feature value outside 0..9|null
- null coerced to 0
- null coerced to 5
- invalid Visit Profile duration ordering
- negative duration/load
- static POI contains exact live departure/arrival/fare/availability
- Provider Raw payload field
- dangling source/evidence ref
- transient/licensing-restricted field marked canonical persistent
- material identity conflict silently admitted
- duplicate candidate -> canonical admission race if admission helper owns idempotency semantics

---

## 11. Required deliverables

优先采用：

```text
src/shared/contracts/poi/
  index.ts
  types.ts
  validation.ts
  fixtures.ts
  admission.ts
```

如现有仓库有更强 convention，应遵循现有结构。

并生成：

```text
docs/architecture/poi-canonical-schema-v1.md
docs/qa/TASK-050/schema-audit.json
docs/qa/TASK-050/admission-fixtures.json
docs/qa/TASK-050/compatibility-report.json
docs/qa/TASK-050/pilot-report.md
tests/task-050-a-poi-schema.test.mjs
docs/tasks/RESULT-TASK-050-a-poi-schema.md
```

如实现 projection adapter，放入现有 shared/planning adapter 合理位置，不创建 circular dependency。

---

## 12. Acceptance gates

必须达到：

- one canonical POI contract source of truth
- strict parser fail-closed
- deterministic serialization / parse round-trip
- candidate admission deterministic
- implicit candidate -> canonical promotion = 0
- candidate/provider/slot identity substitution = 0
- canonical -> Planning projection deterministic
- 43 Feature semantic changes = 0
- null semantic violations = 0
- invalid Region refs = 0
- invalid Master Code refs = 0
- Provider Raw leakage = 0
- live route fact leakage = 0
- unresolved material evidence admitted = 0
- B candidate corpus mutation = 0
- Production DB writes/migrations = 0
- live Provider calls = 0
- scoring parameter changes = 0
- Planner UI changes = 0

---

## 13. Regression

至少运行执行时存在的 canonical equivalents：

```text
npm ci
TASK-050 focused tests
Planning Contracts
Planning Soak
Master Code Registry
Region Graph
Candidate Pipeline tests if present in develop
Routing
Trip / Engine focused regression
full Node regression
npm run lint
npm run typecheck
npm run build
deployment validate/build/artifact checks if current repo requires
TASK-owned Prettier
git diff --check
```

如果某个下游 Candidate Pipeline PR 尚未合入 develop，不要为了测试它而 stack/cherry-pick；记录 Deferred。

最终 Draft PR exact head 必须取得 GitHub Quality Gate PASS。

---

## 14. Out of scope

禁止：

- 批量导入 B 当前 10k+ candidates
- 批量分配 POI Master Codes
- 修改 B 的 candidateKey/旧编号
- 修改 B 的 evidence review 结果
- WBS 7.6 Places Search API
- WBS 7.7 POI Details API
- WBS 7.9 scoring production freeze
- Provider activation / purchase / credential
- Production DB schema/migration
- image acquisition
- Planner UI
- AI
- Booking/Payment
- Route system redesign

---

## 15. Tracking / completion

实施开始：

```text
WBS 7.4
未开始 -> 进行中（#399 / TASK-050-A）
```

实现、QA、Draft PR 完成：

```text
待审查（#399 / TASK-050-A；Draft PR #...）
```

只有用户明确验收并合入 `develop` 后才可：

```text
已完成
```

不要自动 merge。
不要关闭 Issue #399。
不要自动启动 7.6 / 7.7 / 7.9。
