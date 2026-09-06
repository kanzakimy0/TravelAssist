# TASK-013.2-A — 全球核心目的地素材生成单

## Metadata

- Task ID：`TASK-013.2-A`
- Owner：`A`
- Responsibility：`Shared Asset Content Planning`
- Priority：`P1`
- Status：`待开始（前置阻塞）`
- WBS：预定 `2.15`；若已占用则使用下一个可用工程基础 ID
- GitHub Issue：`#152`
- Branch：`feature/a-core-destination-generation-manifest`
- Branch Base at Creation：`develop@0317b7ce755f201b8e5c40d9498a30f2c72f1a56`
- Hard Dependency 1：`TASK-013-A` / Issue `#112` 已合并并验收
- Hard Dependency 2：`TASK-013.1-A` / Issue `#116` 已合并并验收
- Seed：`docs/assets/catalog/core-destination-generation-seed.v1.csv`
- Batches：`docs/assets/catalog/core-destination-generation-batches.v1.csv`
- Design：`docs/assets/core-destination-generation-plan.md`
- Codex Command：`docs/tasks/CODEX-TASK-013.2-a-generation-manifest-command.md`
- Result：`docs/tasks/RESULT-TASK-013.2-a-core-destination-generation-manifest.md`
- PR：完成后创建 Draft PR → `develop`

---

## 1. 任务目标

建立完整、可验证、可版本化、可供夜间素材流水线消费的全球核心目的地素材生产单。

冻结规模：

```text
100 个 S 级目的地 × 40 个景点 = 4,000 个景点
200 个 A 级目的地 × 25 个景点 = 5,000 个景点
合计 300 个目的地、9,000 个景点

目的地 source jobs = 300
景点 source/provider jobs = 9,000
源任务总数 = 9,300

目的地 md + lg = 600
景点 sm = 9,000
基础逻辑输出总数 = 9,600
```

本 Task 的主要交付是**生成单与批次清单**，而不是一次性生成、下载或提交全部图片二进制。

必须形成：

- 300 个目的地的完整实体清单；
- 9,000 个景点实体或明确的未解析槽位；
- 9,300 个 source jobs；
- 9,600 个 variant expectations；
- 40 个夜间批次；
- Prompt 模板；
- 来源、版权、真实性和处理状态；
- 成本与体积估算；
- 未解析、重复、rights blocked 报告；
- 后续单批 Codex 可直接读取的 batch JSON。

---

## 2. 前置条件

### 2.1 必须同时满足

同步最新 `origin/develop` 后确认：

```text
A. develop 中存在 TASK-013-A Result
B. develop 中存在 TASK-013-A Asset Manifest / Registry / rights policy
C. Issue #112 对应实现已合并并验收
D. develop 中存在 TASK-013.1-A Result
E. develop 中存在尺寸 Profile、Variant Registry 与夜间流水线
F. Issue #116 对应实现已合并并验收
G. WBS 中两个父任务状态均为已完成
```

### 2.2 未满足时

任一不满足：

- 不轮询；
- 不等待；
- 不在父任务 feature branch 上实现；
- 不猜测父任务 Schema；
- 不修改 Seed；
- 创建或更新 Result 为 `Blocked`；
- 在 Issue #152 记录实际 develop SHA、缺失项、父 Issue / PR 状态；
- 不创建实现 PR。

---

## 3. Git 启动顺序

在仓库根目录执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

存在用户未提交文件时不得删除或覆盖。优先使用独立 worktree；无法安全隔离则返回 Blocked。

切换已建立分支：

```bash
git switch feature/a-core-destination-generation-manifest
git pull --ff-only origin feature/a-core-destination-generation-manifest
```

本地不存在：

```bash
git switch --track -c feature/a-core-destination-generation-manifest origin/feature/a-core-destination-generation-manifest
```

读取：

```text
AGENTS.md
package.json
package-lock.json
docs/project/WBS-TravelAssist.md
docs/development/task-tracking.md
docs/assets/asset-library-strategy.md
docs/assets/asset-variant-sizing-spec.md
docs/assets/core-destination-generation-plan.md
docs/assets/catalog/core-destination-generation-seed.v1.csv
docs/assets/catalog/core-destination-generation-batches.v1.csv
docs/tasks/TASK-013-a-asset-library-foundation.md
docs/tasks/RESULT-TASK-013-a-asset-library-foundation.md
docs/tasks/TASK-013.1-a-asset-catalog-derivatives.md
docs/tasks/RESULT-TASK-013.1-a-asset-catalog-derivatives.md
docs/assets/catalog/**
src/data/assets/**
tools/assets/**
```

检查 Issue #112、#116、#152，以及所有可能修改 `docs/assets/**`、`src/data/assets/**`、`tools/assets/**`、`package.json` 的 Open / Draft PR。

前置满足后，将最新 `origin/develop` 安全 merge 到当前 feature branch；不 rebase 已推送分支，不 force push。

---

## 4. Seed 不可擅自更改

已冻结：

```text
docs/assets/catalog/core-destination-generation-seed.v1.csv
docs/assets/catalog/core-destination-generation-batches.v1.csv
```

### 4.1 Seed 校验

必须满足：

```text
rows = 300
unique destination_id = 300
S rows = 100
A rows = 200
S attraction_quota = 40
A attraction_quota = 25
sum attraction_quota = 9,000
country_code = ISO-style two-letter uppercase
batch_id exists in batch file
```

### 4.2 Batch 校验

必须满足：

```text
batch rows = 40
execution_order unique = 1..40
batch_id unique = 40
destination total = 300
attraction total = 9,000
city variant total = 600
attraction variant total = 9,000
expected variant total = 9,600
max destinations per batch = 10
max expected variants per batch = 420
first four batches = JP-S-01, JP-A-01, JP-A-02, JP-A-03
```

Seed 是项目内部覆盖清单，不得在文档中声称为客观全球排名。

目的地名称或 entity type 需要调整时：

- 保留原 destination ID；
- 在 enriched manifest 写 canonical 名称与 alias；
- 若必须替换实体，创建变更提案与 supersededBy；
- 不在本 Task 中静默改 Seed 行数或配额。

---

## 5. 允许修改范围

主要允许：

```text
package.json
package-lock.json（仅脚本确有需要；本 Task 原则上不新增依赖）
docs/assets/catalog/core-*.json
docs/assets/catalog/core-*.jsonl
docs/assets/catalog/core-*.csv
docs/assets/generated/core-*.md
docs/assets/generated/core-batches/**
tools/assets/build-core-generation-manifest.mjs
tools/assets/validate-core-generation-manifest.mjs
tools/assets/export-core-generation-batches.mjs
tools/assets/estimate-core-generation-cost.mjs
tools/assets/lib/core-generation/**
src/data/assets/core-generation-types.ts
src/data/assets/core-generation-registry.ts
tests/task-013-2-core-generation-manifest.test.mjs
docs/tasks/TASK-013.2-a-core-destination-generation-manifest.md
docs/tasks/RESULT-TASK-013.2-a-core-destination-generation-manifest.md
docs/project/WBS-TravelAssist.md
```

只读：

```text
现有 source 图片
现有 generated variants
Planner / Start Flow / Personal Center 页面
父任务 Manifest / Result
```

---

## 6. 禁止范围

本 Task 禁止：

- 一次性生成 300 个城市和 9,000 个景点图片；
- 一次性下载 9,000 张第三方图片；
- 提交大规模图片二进制；
- 修改现有页面；
- 抓取 Google Images、Google Maps、Tripadvisor、Booking、Agoda、Instagram、小红书、微博等图片；
- 使用搜索结果页作为 source URL；
- 仅凭模型记忆捏造 9,000 个 POI；
- 把不同语言名当成多个景点；
- 给虚构或未核实实体填写坐标；
- 把 AI 图设置为 documentary；
- 修改 rights 状态来绕过规则；
- 提交 API Token、Cookie、账号、私有授权合同；
- 新增正式页面 route；
- 自动 merge PR。

---

## 7. 实现工具

优先使用 Node.js 内置模块，不新增 npm 依赖。

创建或整合：

```text
tools/assets/build-core-generation-manifest.mjs
tools/assets/validate-core-generation-manifest.mjs
tools/assets/export-core-generation-batches.mjs
tools/assets/estimate-core-generation-cost.mjs

tools/assets/lib/core-generation/
├─ csv.mjs
├─ seed.mjs
├─ quotas.mjs
├─ entities.mjs
├─ jobs.mjs
├─ variants.mjs
├─ batches.mjs
├─ prompts.mjs
├─ rights.mjs
└─ reports.mjs
```

如果父任务已有通用 CSV、ID、Manifest、rights、report 工具，必须复用，避免重复实现。

Package scripts：

```json
{
  "assets:core-manifest": "node tools/assets/build-core-generation-manifest.mjs",
  "assets:core-validate": "node tools/assets/validate-core-generation-manifest.mjs",
  "assets:core-batches": "node tools/assets/export-core-generation-batches.mjs",
  "assets:core-estimate": "node tools/assets/estimate-core-generation-cost.mjs",
  "test:core-generation": "node --test tests/task-013-2-core-generation-manifest.test.mjs"
}
```

不得删除、重命名或改变父任务 scripts 的语义。

---

## 8. 目的地 Manifest

生成：

```text
docs/assets/catalog/core-destination-generation-manifest.v1.csv
```

必须恰好 300 行数据，并包含：

```text
destination_id
batch_id
tier
region
country_code
entity_type
name_zh
name_ja
name_en
canonical_name
aliases
latitude
longitude
provider_type
provider_entity_id
attraction_quota
source_mode
source_job_id
md_variant_id
lg_variant_id
status
review_notes
```

要求：

- 保留 Seed 顺序或按固定 execution order 稳定输出；
- 三语名称为真实语言名称，不通过简单罗马字重复填充；
- 经纬度代表城市/目的地中心，不伪装为精确 POI；
- provider entity ID 可为空，但必须有状态；
- entity type 可为 city、town、island、region、destination-cluster；
- Seed 中以行政城市代表旅游区域时，使用 alias / coverage note 说明；
- 300 个 source_job_id 唯一；
- 每个目的地正好有 `md / lg` 两个逻辑 variant ID。

---

## 9. 景点 Manifest

生成：

```text
docs/assets/catalog/core-attraction-generation-manifest.v1.csv
```

必须恰好 9,000 行数据，每个目的地行数等于 Seed quota。

字段：

```text
poi_id
destination_id
batch_id
tier
selection_order
category
name_zh
name_ja
name_en
canonical_name
aliases
latitude
longitude
provider_type
provider_entity_id
official_url
source_mode
source_job_id
sm_variant_id
rights_status
status
quota_exception_reason
review_notes
```

### 9.1 实体来源优先级

```text
1. 仓库已有 POI Master / Provider ID
2. 已批准地图或 POI Provider
3. 官方旅游机构 / 官方景点资料
4. 许可兼容的开放知识实体 ID
5. 人工复核
```

本 Task 不要求自行引入新的收费 Provider SDK。

### 9.2 无 Provider 或数据不足时

仍必须建立固定数量的槽位：

```text
poi_id = unresolved:{destination_id}:{selection_order}
status = entity_resolution_required
source_mode = acquisition_required
rights_status = unresolved
```

并将其写入 `unresolved-attractions.md`。

禁止用模型猜测的名称替换 unresolved 槽位。

Task 状态：

- unresolved=0 且其余验收通过：`Completed`；
- unresolved>0，但 9,000 槽位、Jobs、Variants、Batch 都完整：`Partial`；
- 无法建立稳定结构或父任务缺失：`Blocked`。

### 9.3 类别配额

S 级目标：

```text
landmark 10
museum_culture 6
historic_religious 6
nature_viewpoint 5
family_theme 4
district_neighborhood 4
market_shopping 3
food_culture_experience 2
```

A 级目标：

```text
landmark 7
museum_culture 4
historic_religious 4
nature_viewpoint 3
family_theme 2
district_neighborhood 2
market_shopping 2
food_culture_experience 1
```

不适用时允许重分配，但 `quota_exception_reason` 必须非空，最终每个目的地总数仍准确。

### 9.4 去重

至少按以下组合检测：

```text
provider_type + provider_entity_id
normalized canonical_name + geohash / coordinate radius
aliases
official URL
```

同一景点多入口、多个语言页或建筑内部子页面不得无说明重复占位。

---

## 10. Source Jobs

生成：

```text
docs/assets/catalog/core-source-jobs.v1.jsonl
```

必须恰好 9,300 行：

```text
300 destination_master
9,000 poi_photo / provider_reference
```

字段严格遵循设计书。

### 10.1 目的地 Job

默认：

```text
asset_role = destination_master
source_mode = illustrative_city 或 documentary_photo
requested master = 至少 2048×1365 landscape
variants = [md, lg]
authenticity = illustrative（AI 时）
```

### 10.2 景点 Job

默认：

```text
asset_role = poi_photo
source_mode = documentary_photo / provider_only / acquisition_required
minimum useful source = 640×480
variants = [sm]
```

真实景点默认不创建“生成一张看似实拍”的 AI Prompt。

### 10.3 稳定性

- job_id 唯一；
- 相同输入重复运行输出一致；
- JSONL 一行一对象；
- 不写随机运行时间进入 canonical job；
- 不写本机绝对路径；
- 不写 Token；
- status / retry_count / error_code 字段完整。

---

## 11. Variant Matrix

生成：

```text
docs/assets/catalog/core-variant-output-matrix.v1.csv
```

必须恰好 9,600 行：

```text
300 × md
300 × lg
9,000 × sm
```

字段至少包括：

```text
variant_id
source_job_id
entity_id
entity_type
asset_role
profile_id
batch_id
expected_width_rule
expected_height_rule
format_policy
output_storage
status
block_reason
```

不得创建额外 special variant 来改变本 Task 的 9,600 基础口径。Hero、地图弹窗、分享图等特殊尺寸由后续 batch task 根据实际页面需要追加。

---

## 12. Prompt Templates

生成：

```text
docs/assets/catalog/core-generation-prompt-templates.v1.json
```

至少包括：

```text
destination-illustrative-v1
poi-documentary-resolution-v1
poi-symbolic-placeholder-v1
```

规则：

- 城市 Prompt 明确 illustrative；
- 无文字、Logo、水印、UI；
- 禁止拼贴多个不相邻地标；
- 禁止虚构国旗、道路牌或建筑；
- 景点 documentary template 是来源解析任务，不是 AI 绘图 Prompt；
- symbolic placeholder 明确不能进入 documentary slot；
- 模板有版本、输入变量、negative rules 和 output mode。

---

## 13. 批次文件

生成：

```text
docs/assets/generated/core-batches/{batch-id}.json
```

必须正好 40 个文件。

每个 Batch 文件包含：

```text
batchId
executionOrder
tier
region / mixed regions
destinationIds
destinationCount
attractionCount
sourceJobIds
variantIds
sourceModeCounts
unresolvedCount
rightsBlockedCount
estimatedCalls
estimatedCost
estimatedSourceBytes
estimatedVariantBytes
status
prerequisites
```

批次文件是后续 Codex 的输入，不包含密钥和二进制。

---

## 14. 报告

生成：

```text
docs/assets/generated/core-generation-summary.md
docs/assets/generated/core-generation-batch-index.md
docs/assets/generated/core-generation-validation.md
docs/assets/generated/unresolved-destinations.md
docs/assets/generated/unresolved-attractions.md
docs/assets/generated/duplicate-entities.md
docs/assets/generated/rights-blocked-jobs.md
docs/assets/generated/core-generation-cost-estimate.md
```

Summary 至少列出：

```text
destination 300 / S 100 / A 200
attraction slots 9,000
resolved / unresolved
source jobs 9,300
variant expectations 9,600
batches 40
source modes
rights states
category quota results
duplicate count
estimated calls / cost / bytes
first executable batch
blockers
```

Cost Estimate 不得伪造单价。没有 Provider 定价配置时写 `unknown`，同时输出公式和调用数量。

---

## 15. TypeScript Registry

新增：

```text
src/data/assets/core-generation-types.ts
src/data/assets/core-generation-registry.ts
```

至少导出：

```ts
getCoreDestination(destinationId)
listCoreDestinations(filters?)
getCoreAttractions(destinationId)
getCoreSourceJob(jobId)
getCoreBatch(batchId)
getNextCoreBatch(completedBatchIds)
getCoreGenerationSummary()
```

要求：

- strict TypeScript；
- 无 `any`；
- 不在 import 时加载 9,000 行 CSV 到客户端 bundle；
- 仅用于 Node / build / tooling 的大型 Catalog 不得意外进入 browser bundle；
- 如需 runtime 数据，导出轻量索引而不是整个生产 Manifest；
- 不发起网络请求；
- 不修改页面。

---

## 16. 验证脚本

`npm run assets:core-validate` 至少检查：

- Seed 300 / S100 / A200 / quota9000；
- Batch 40 / totals / first four Japan / max10 / max420；
- Destination Manifest 300；
- Attraction Manifest 9000；
- Source Jobs 9300；
- Variant Matrix 9600；
- IDs 唯一；
- 外键完整；
- 每目的地 POI 数等于 quota；
- S/A 类别配额或 exception；
- source mode / authenticity / rights 逻辑；
- AI 不得 documentary；
- unresolved 不得 approved；
- provider_only 不得写本地 source path；
- 每个 source job variant 数正确；
- 每个 batch totals 与 Manifest 相等；
- JSON / JSONL / CSV 可解析；
- CSV 转义正确；
- 输出稳定排序；
- 无重复实体；
- 无 Token、Cookie、私有 URL、本机绝对路径；
- 不包含图片二进制；
- 所有报告与 40 个 batch 文件存在。

---

## 17. Tests

新增：

```text
tests/task-013-2-core-generation-manifest.test.mjs
```

至少覆盖：

1. Seed 精确数字；
2. Seed destination ID 唯一；
3. Batch 精确数字与执行顺序；
4. Destination Manifest 300；
5. Attraction Manifest 9000；
6. Source jobs 9300；
7. Variant matrix 9600；
8. 每 destination quota；
9. S/A category quota；
10. exception reason；
11. 外键；
12. 三语字段状态；
13. 坐标范围；
14. provider ID 唯一性；
15. unresolved 槽位格式；
16. 去重规则；
17. source mode / rights；
18. AI authenticity；
19. destination md/lg；
20. POI sm；
21. 40 batch 文件；
22. Batch totals；
23. Prompt template 版本；
24. Cost unknown 不伪造；
25. 无 secrets；
26. 无本机路径；
27. 无二进制新增；
28. 稳定输出 / 二次运行 no-op；
29. Registry 查询；
30. 大 Catalog 不进入客户端 bundle 的静态检查。

---

## 18. 执行命令

```bash
npm ci
npm run assets:core-manifest
npm run assets:core-batches
npm run assets:core-estimate
npm run assets:core-validate
npm run test:core-generation
npm run assets:validate
npm run test:assets
npm run test:asset-variants
npm run lint
npm run typecheck
npm run format:check
npm run build
git diff --check
```

父任务 script 名称有差异时，使用实际等价命令并在 Result 记录，不得伪造执行。

二次执行：

```bash
npm run assets:core-manifest
npm run assets:core-validate
```

必须为确定性 no-op，除非输入明确变化。

全仓 format 因既有文件失败时：

- 列出准确文件；
- 对本 Task 文件单独检查；
- 不把失败写成通过；
- 不格式化无关 Owner 文件。

---

## 19. WBS / Issue / Result

### 19.1 WBS

在 `docs/project/WBS-TravelAssist.md`：

```text
2.15 | 全球核心目的地素材生成单（300目的地 / 9,000景点） | A | P1 | 2.13,2.14 | 进行中 / 待审查
```

若 `2.15` 被占用，使用下一个可用工程基础 ID，不覆盖现有项。

开始执行：`进行中`。实现完成但 PR 未合并：`待审查`。只有 PR 合并并验收：`已完成`。

Task 追踪表新增 `TASK-013.2-A`，记录 Issue、Branch、Commit、PR、Result。

### 19.2 Issue #152

开始评论：

- 父任务合并与验收；
- actual develop SHA；
- branch；
- conflict audit；
- Seed / Batch preflight 数字；
- 数据来源能力；
- 预计 resolved / unresolved 策略。

完成评论：

- 300 / 9000 / 9300 / 9600 / 40；
- resolved / unresolved；
- category quotas；
- duplicate / rights blocked；
- scripts / tests；
- WBS；
- commits；
- Draft PR；
- status Completed / Partial / Blocked。

### 19.3 Result

创建：

```text
docs/tasks/RESULT-TASK-013.2-a-core-destination-generation-manifest.md
```

格式见第 21 节。

---

## 20. Commit / Push / PR

建议提交：

```text
feat(TASK-013.2-A): build core destination manifest
feat(TASK-013.2-A): add attraction slots and source jobs
feat(TASK-013.2-A): export variants batches and prompts
test(TASK-013.2-A): validate generation manifest
docs(TASK-013.2-A): record reports result and WBS
```

执行：

```bash
git status --short
git diff --check
git push origin feature/a-core-destination-generation-manifest
```

创建：

```text
feature/a-core-destination-generation-manifest → develop
```

的 Draft PR。

PR 必须关联 `#152`、父任务 `#112` 和 `#116`，列出真实数字、unresolved、rights、成本、验证和后续第一批。不得自动 merge。

---

## 21. Result 格式

```md
# TASK-013.2-A Result

## Status
Completed / Partial / Blocked

## Prerequisites
- TASK-013-A Issue / PR / merge / Result / WBS
- TASK-013.1-A Issue / PR / merge / Result / WBS

## Tracking
- Issue
- WBS
- Branch
- Base SHA
- Develop SHA
- Commit(s)
- Draft PR

## Conflict Audit

## Seed Validation
- destinations
- S / A
- quotas
- duplicates

## Batch Validation
- batches
- max size
- first four
- totals

## Destination Manifest
- total
- entity types
- three-language completion
- provider IDs
- unresolved

## Attraction Manifest
- total
- resolved
- unresolved
- category distribution
- quota exceptions
- duplicates

## Source Jobs
- destination
- attraction
- source modes
- rights states
- total

## Variant Matrix
- md
- lg
- sm
- total

## Prompts

## Cost / Storage

## Reports

## Registry

## Validation
- commands and actual results

## Files Changed

## WBS Update

## First Executable Batch

## Follow-ups

## Known Limitations
```

不得只写 “all passed”。

---

## 22. Definition of Done

- [ ] 两个父任务已合并并验收；
- [ ] Seed=300、S=100、A=200、quota=9000；
- [ ] Batch=40、总计一致、每批≤10；
- [ ] Destination Manifest=300；
- [ ] Attraction Manifest=9000；
- [ ] Source Jobs=9300；
- [ ] Variant Matrix=9600；
- [ ] 40 个 batch JSON；
- [ ] 三语、实体、坐标、类别、来源模式状态完整；
- [ ] 未解析槽位未被捏造；
- [ ] 城市 illustrative 与景点 documentary 分离；
- [ ] Prompt templates 完成；
- [ ] 成本、缺口、重复、rights blocked 报告完成；
- [ ] 无图片二进制新增；
- [ ] 无 secrets；
- [ ] 二次运行 no-op；
- [ ] tests / lint / typecheck / build 完成；
- [ ] WBS / Result / Issue 完成；
- [ ] Branch push；
- [ ] Draft PR；
- [ ] 未自动 merge。

---

## 23. 状态规则

### Completed

- 300 目的地已验证；
- 9,000 景点已验证；
- unresolved=0；
- 所有结构、Jobs、Variants、Batch、报告和验证通过。

### Partial

- 300/9000/9300/9600/40 结构全部完成；
- 有一部分景点是 `entity_resolution_required`；
- 未捏造实体；
- unresolved 和下一步清楚；
- Issue 保持 Open，不声称全量完成。

### Blocked

- 父任务未合并；
- 父任务 Schema 缺失；
- Seed / Batch 数字损坏；
- 工作区无法安全隔离；
- 高冲突 PR 无法安全同步；
- GitHub 权限导致无法 push / Draft PR。

以下不是 blocker：

- 某些景点尚未找到合法图片；
- Provider 只允许动态引用；
- 图片 Provider 尚未配置；
- 尚未执行任何图片生成；
- 某些景点实体等待人工复核。

这些应通过 source mode、unresolved、rights blocked 和后续 batch task 正常记录。
