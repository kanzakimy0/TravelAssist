# TASK-013.2-A — 日本国内核心目的地素材生成单

## Metadata

- Task ID：`TASK-013.2-A`
- Owner：`A`
- Responsibility：`Shared Asset Content Planning`
- Priority：`P1`
- Status：`Blocked / 等待 TASK-013.1-A 合并验收`
- WBS：`2.15`
- GitHub Issue：`#152`
- Branch：`feature/a-core-destination-generation-manifest`
- Hard Dependency 1：`TASK-013-A` / Issue `#112`
- Hard Dependency 2：`TASK-013.1-A` / Issue `#116`
- Seed：`docs/assets/catalog/core-destination-generation-seed.v1.csv`
- Batches：`docs/assets/catalog/core-destination-generation-batches.v1.csv`
- Design：`docs/assets/core-destination-generation-plan.md`
- Codex Command：`docs/tasks/CODEX-TASK-013.2-a-generation-manifest-command.md`
- Result：`docs/tasks/RESULT-TASK-013.2-a-core-destination-generation-manifest.md`

> 2026-09-08 范围修正：旧版“全球核心目的地”定义无效。本 Task 从现在起只允许日本境内目的地。

---

## 1. 任务目标

建立完整、可验证、可版本化、可供夜间素材流水线消费的 **日本国内** 核心目的地素材生产单。

冻结规模：

```text
100 个 S 级日本目的地 × 40 个景点 = 4,000 个景点
200 个 A 级日本目的地 × 25 个景点 = 5,000 个景点
合计 300 个日本目的地、9,000 个日本境内景点槽位

目的地 source jobs = 300
景点 source/provider jobs = 9,000
源任务总数 = 9,300

目的地 md + lg = 600
景点 sm = 9,000
基础逻辑输出总数 = 9,600
```

必须覆盖日本 47 都道府县。

本 Task 的主要交付是生成单与批次清单，不是一次性生成、下载或提交全部图片二进制。

---

## 2. Japan-only 硬边界

所有 Seed / Manifest / Batch 必须满足：

```text
country_code == JP
destination_id startsWith jp-
batch_id startsWith JP-
non-Japan destinations == 0
prefecture coverage == 47
```

禁止出现韩国、中国、东南亚、欧洲、美洲、中东、大洋洲等海外目的地。

旧全球范围的 `S-EU-*`、`S-NA-*`、`S-SEA-*`、`A-EU-*`、`A-SEA-*` 等 batch ID 全部视为废止。

未来全球扩展必须另建独立 Task 与 Seed，不得混入本 Task。

---

## 3. 前置条件

同步最新 `origin/develop` 后确认：

```text
A. TASK-013-A 已合并并最终验收
B. develop 中存在父任务 Asset Manifest / Registry / rights policy
C. TASK-013.1-A 已合并并最终验收
D. develop 中存在尺寸 Profile、Variant Registry 与夜间流水线
E. WBS 中 2.13 / 2.14 已完成
```

任一不满足：

- 不轮询；
- 不等待；
- 不猜测父任务 Schema；
- 不执行生产单实现；
- 更新 Result 为 `Blocked`；
- 更新 Issue #152；
- 不创建实现 PR。

---

## 4. Git 安全启动

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

读取远端最新规格：

```bash
git show origin/feature/a-core-destination-generation-manifest:docs/tasks/TASK-013.2-a-core-destination-generation-manifest.md
git show origin/feature/a-core-destination-generation-manifest:docs/assets/core-destination-generation-plan.md
git show origin/feature/a-core-destination-generation-manifest:docs/assets/catalog/core-destination-generation-seed.v1.csv
git show origin/feature/a-core-destination-generation-manifest:docs/assets/catalog/core-destination-generation-batches.v1.csv
```

---

## 5. Seed 校验

`docs/assets/catalog/core-destination-generation-seed.v1.csv` 必须满足：

```text
rows = 300
unique destination_id = 300
country_code JP = 300
non-JP = 0
jp-* destination IDs = 300
S rows = 100
A rows = 200
S quota = 40
A quota = 25
sum attraction_quota = 9,000
```

区域必须只使用：

```text
hokkaido
tohoku
kanto
chubu
kansai
chugoku
shikoku
kyushu-okinawa
```

Seed 是 TravelAssist 日本版内部覆盖优先级，不是公开排名。

---

## 6. Batch 校验

`docs/assets/catalog/core-destination-generation-batches.v1.csv` 必须满足：

```text
batch rows = 40
execution_order = 1..40
JP-S-01 .. JP-S-10 = 10 batches
JP-A-01 .. JP-A-30 = 30 batches
all batch_id startsWith JP-
destination total = 300
attraction total = 9,000
city variant total = 600
attraction variant total = 9,000
expected variant total = 9,600
max destinations per batch = 10
max expected variants per batch = 420
```

---

## 7. Destination Manifest

生成：

```text
docs/assets/catalog/core-destination-generation-manifest.v1.csv
```

必须恰好 300 行，字段至少包括：

```text
destination_id
batch_id
tier
region
country_code
prefecture_code
prefecture_name_ja
prefecture_name_en
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
coverage_note
review_notes
```

要求：

- 300 行全部为日本实体；
- 47 都道府县必须全部有覆盖；
- tourism cluster / island / onsen 可作为目的地，但要写清行政归属与 coverage note；
- 三语名称不得简单复制英文伪装完成；
- 经纬度代表目的地中心，不伪装为精确 POI；
- 300 个 source_job_id 唯一；
- 每个目的地正好两个逻辑 variant：`md / lg`。

输出：

```text
docs/assets/generated/prefecture-coverage.md
```

必须列出 47 都道府县、各自目的地数量、S/A 数量和缺口；`missing_prefectures` 必须为 0。

---

## 8. Attraction Manifest

生成：

```text
docs/assets/catalog/core-attraction-generation-manifest.v1.csv
```

必须恰好 9,000 行。

字段至少包括：

```text
poi_id
destination_id
batch_id
tier
prefecture_code
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

实体来源顺序：

```text
1. 仓库已有 POI Master / Provider ID
2. 已批准地图或 POI Provider
3. 日本官方旅游机构 / 都道府县 / 市町村 / 景点官网
4. 许可兼容开放知识实体
5. 人工复核
```

无法验证时：

```text
poi_id = unresolved:{destination_id}:{selection_order}
status = entity_resolution_required
source_mode = acquisition_required
rights_status = unresolved
```

禁止凭模型记忆补齐虚构景点、坐标或 Provider ID。

---

## 9. 类别配额

S 级：

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

A 级：

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

不适用时可重分配，但必须填写 `quota_exception_reason`。

---

## 10. 图片模式与真实性

允许：

```text
illustrative_city
documentary_photo
provider_only
symbolic_placeholder
acquisition_required
```

规则：

- 城市 / 目的地 AI 氛围图必须标记 `authenticity=illustrative`；
- 真实景点默认使用 documentary/provider；
- AI 景点图不得冒充现场实拍；
- `provider_only` 不缓存违反 Provider 条款的二进制；
- 未获授权素材保持 acquisition_required / rights blocked。

禁止抓取 Google Images、Google Maps、Tripadvisor、Booking、Agoda、Instagram、小红书、微博等图片。

---

## 11. 必须输出

```text
docs/assets/catalog/core-destination-generation-manifest.v1.csv
docs/assets/catalog/core-attraction-generation-manifest.v1.csv
docs/assets/catalog/core-source-jobs.v1.jsonl
docs/assets/catalog/core-variant-output-matrix.v1.csv
docs/assets/catalog/core-generation-prompt-templates.v1.json
docs/assets/catalog/core-generation-policy.v1.json

docs/assets/generated/core-generation-summary.md
docs/assets/generated/core-generation-batch-index.md
docs/assets/generated/core-generation-validation.md
docs/assets/generated/prefecture-coverage.md
docs/assets/generated/unresolved-destinations.md
docs/assets/generated/unresolved-attractions.md
docs/assets/generated/duplicate-entities.md
docs/assets/generated/rights-blocked-jobs.md
docs/assets/generated/core-generation-cost-estimate.md

docs/assets/generated/core-batches/{batch-id}.json
```

必须生成正好 40 个 batch JSON。

---

## 12. Jobs / Variant Matrix

`core-source-jobs.v1.jsonl`：

```text
300 destination_master
9,000 poi_photo/provider_reference
总计 9,300
```

`core-variant-output-matrix.v1.csv`：

```text
md 300
lg 300
sm 9,000
总计 9,600
```

本 Task 不增加 Hero、地图弹窗、分享图等特殊尺寸；特殊尺寸由后续 batch / UI task 处理。

---

## 13. 实现工具

优先复用父任务工具，不新增 npm 依赖：

```text
tools/assets/build-core-generation-manifest.mjs
tools/assets/validate-core-generation-manifest.mjs
tools/assets/export-core-generation-batches.mjs
tools/assets/estimate-core-generation-cost.mjs
tests/task-013-2-core-generation-manifest.test.mjs
```

Validator 必须有显式 Japan-only gate，不能只验证行数。

---

## 14. 默认执行模式

```text
RUN_MODE=manifest
```

只生成清单和报告，不批量下载 / 生成图片。

首批准备：

```text
RUN_MODE=batch-prepare
BATCH_ID=JP-S-01
```

---

## 15. 必须验证

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

再次执行 manifest + validate，第二次必须确定性 no-op。

额外断言：

```text
JP country count = 300
non-JP count = 0
JP-prefixed destination IDs = 300
JP-prefixed batches = 40
prefecture count = 47
missing prefectures = 0
```

---

## 16. 状态规则

- `Completed`：所有结构、数量、Japan-only、47 都道府县、rights / duplicate / validation 全通过，且 unresolved=0；
- `Partial`：结构与 Japan-only 完整，但仍有真实实体需要人工解析；
- `Blocked`：父任务未完成、Schema 不可用或无法安全执行。

---

## 17. WBS / GitHub

WBS 2.15 名称统一为：

```text
日本国内核心目的地素材生成单（300目的地 / 9,000景点）
```

Issue #152、Task、Design、Codex command、Result 必须统一使用 Japan-only 表述。

实现完成后 push：

```text
feature/a-core-destination-generation-manifest
```

创建 Draft PR → `develop`，不得自动 merge。
