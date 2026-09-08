# Codex 执行指令 — TASK-013.2-A 日本国内核心素材生成单

将下面整段复制给 Codex：

```text
请在 TravelAssist 仓库中完整执行 TASK-013.2-A，生成日本国内核心目的地与景点素材生产单。

重要：本 Task 只允许日本境内素材。旧版“全球核心目的地”范围已经废止。任何海外目的地、非 JP country_code、非 jp- destination_id、非 JP- batch_id 都必须视为错误并停止验收。

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#152 — TASK-013.2-A 日本国内核心目的地素材生成单（300目的地 / 9,000景点）

Branch:
feature/a-core-destination-generation-manifest

Task:
docs/tasks/TASK-013.2-a-core-destination-generation-manifest.md

Design:
docs/assets/core-destination-generation-plan.md

Seed:
docs/assets/catalog/core-destination-generation-seed.v1.csv

Batches:
docs/assets/catalog/core-destination-generation-batches.v1.csv

Result:
docs/tasks/RESULT-TASK-013.2-a-core-destination-generation-manifest.md

一、Git 安全启动

执行：

git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop

禁止：

git clean -fd
git reset --hard
git push --force
git push --force-with-lease

存在用户未提交文件时不得删除或覆盖。优先使用独立 worktree；无法安全隔离则返回 Blocked。

读取远端最新规格，不要使用本地旧缓存：

git show origin/feature/a-core-destination-generation-manifest:docs/tasks/TASK-013.2-a-core-destination-generation-manifest.md
git show origin/feature/a-core-destination-generation-manifest:docs/assets/core-destination-generation-plan.md
git show origin/feature/a-core-destination-generation-manifest:docs/assets/catalog/core-destination-generation-seed.v1.csv
git show origin/feature/a-core-destination-generation-manifest:docs/assets/catalog/core-destination-generation-batches.v1.csv

切换已有分支：

git switch feature/a-core-destination-generation-manifest
git pull --ff-only origin feature/a-core-destination-generation-manifest

二、强制前置条件

必须确认最新 origin/develop 同时满足：

1. TASK-013-A / Issue #112 已合并并最终验收；
2. develop 中存在 Asset Manifest、Registry、rights policy；
3. TASK-013.1-A / Issue #116 已合并并最终验收；
4. develop 中存在尺寸 Profile、Variant Registry、夜间流水线和 TASK-013.1-A Result；
5. WBS 2.13 / 2.14 均已完成。

任一条件不满足：

- 不轮询；
- 不等待；
- 不猜测父任务 Schema；
- 更新 RESULT-TASK-013.2-a-core-destination-generation-manifest.md 为 Blocked；
- 更新 Issue #152；
- 不创建实现 PR；
- 按完整 Result 格式返回。

三、Japan-only 强制审计

在任何 Manifest 构建之前先审计 Seed 与 Batch。

Seed 必须：

- 正好 300 行；
- 300 个唯一 destination_id；
- country_code=JP 正好 300；
- non-JP 行数为 0；
- 300 个 destination_id 全部以 jp- 开头；
- S=100，A=200；
- S quota=40，A quota=25；
- attraction quota 总数=9,000；
- region 只能是 hokkaido/tohoku/kanto/chubu/kansai/chugoku/shikoku/kyushu-okinawa。

Batch 必须：

- 正好 40 批；
- 全部 batch_id 以 JP- 开头；
- JP-S-01..JP-S-10 共 10 批；
- JP-A-01..JP-A-30 共 30 批；
- destination total=300；
- attraction total=9,000；
- city variants=600；
- attraction variants=9,000；
- total variants=9,600；
- 每批最多 10 个目的地；
- 每批最多 420 个基础输出。

发现任何韩国、中国、东南亚、欧洲、美洲、中东、大洋洲目的地，立即失败，不得通过把 country_code 改成 JP 来伪装日本实体。

四、47 都道府县覆盖

Destination Manifest 必须补充：

- prefecture_code
- prefecture_name_ja
- prefecture_name_en
- coverage_note

最终必须证明：

prefecture_count=47
missing_prefectures=0

生成：

docs/assets/generated/prefecture-coverage.md

列出每个都道府县的 destination 数、S/A 数和覆盖说明。

五、冻结规模

必须严格得到：

- 日本目的地 300；
- S 级 100 × 40 景点 = 4,000；
- A 级 200 × 25 景点 = 5,000；
- 景点槽位总数 9,000；
- destination source jobs 300；
- poi source/provider jobs 9,000；
- source jobs 总数 9,300；
- md=300；
- lg=300；
- sm=9,000；
- variant expectations=9,600；
- batch=40。

六、必须实现的输出

生成：

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

必须生成正好 40 个 batch JSON。

七、Destination Manifest

至少包含：

- destination_id / batch_id / tier / region / country_code
- prefecture_code / prefecture_name_ja / prefecture_name_en
- entity_type
- name_zh / name_ja / name_en
- canonical_name / aliases
- latitude / longitude
- provider_type / provider_entity_id
- attraction_quota
- source_mode / source_job_id
- md_variant_id / lg_variant_id
- status / coverage_note / review_notes

不得简单把英文名复制到中文和日文栏位。无法确认的行政归属、名称、坐标必须显式标记待复核。

八、9,000 个日本景点槽位

每个 S 级目的地 40 行；每个 A 级目的地 25 行。

实体来源顺序：

1. 仓库已有 POI Master / Provider ID；
2. 已批准地图或 POI Provider；
3. 日本官方旅游机构、都道府县 / 市町村官方旅游资料、景点官网；
4. 许可兼容开放知识实体；
5. 人工复核。

禁止只凭模型记忆捏造 9,000 个 POI、坐标或 Provider ID。

数据不足时仍创建固定槽位：

poi_id = unresolved:{destination_id}:{selection_order}
status = entity_resolution_required
source_mode = acquisition_required
rights_status = unresolved

九、景点类别配额

S 级：
landmark 10
museum_culture 6
historic_religious 6
nature_viewpoint 5
family_theme 4
district_neighborhood 4
market_shopping 3
food_culture_experience 2

A 级：
landmark 7
museum_culture 4
historic_religious 4
nature_viewpoint 3
family_theme 2
district_neighborhood 2
market_shopping 2
food_culture_experience 1

不适用时可重分配，但 quota_exception_reason 必须非空。

十、图片真实性与版权

生产单必须区分：

- illustrative_city
- documentary_photo
- provider_only
- symbolic_placeholder
- acquisition_required

城市 AI 图必须 authenticity=illustrative。

真实景点默认不能用 AI 图冒充实拍。

禁止抓取 Google Images、Google Maps、Tripadvisor、Booking、Agoda、Instagram、小红书、微博等图片。

禁止提交 Token、Cookie、账号、私有授权文件。

十一、Jobs / Variant Matrix

core-source-jobs.v1.jsonl 正好 9,300：

- 300 destination_master；
- 9,000 poi_photo/provider_reference。

core-variant-output-matrix.v1.csv 正好 9,600：

- md 300；
- lg 300；
- sm 9,000。

本 Task 不添加 Hero、分享图、地图弹窗等特殊尺寸。

十二、实现工具

优先复用父任务工具，不新增 npm 依赖。实现或整合：

- tools/assets/build-core-generation-manifest.mjs
- tools/assets/validate-core-generation-manifest.mjs
- tools/assets/export-core-generation-batches.mjs
- tools/assets/estimate-core-generation-cost.mjs
- tests/task-013-2-core-generation-manifest.test.mjs

Validator 必须显式测试 Japan-only 和 47 prefectures，不能只验证总行数。

十三、默认只生成 Manifest

RUN_MODE=manifest

本次不得一次性调用图片 Provider、不得下载 9,000 张图片、不得提交大批二进制。

首批准备：

RUN_MODE=batch-prepare
BATCH_ID=JP-S-01

十四、必须验证

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

再次执行：

npm run assets:core-manifest
npm run assets:core-validate

第二次必须确定性 no-op。

最终明确输出以下断言结果：

JP country rows
non-JP rows
jp-* destination IDs
JP-* batches
prefecture_count
missing_prefectures
S/A rows
attraction quota
source jobs
variant expectations
batch count

十五、WBS / Result / GitHub

WBS 2.15 名称必须改为：

日本国内核心目的地素材生成单（300目的地 / 9,000景点）

更新 Issue #152、Task、Result 和 WBS，不能继续写“全球”。

Commit subject 包含 TASK-013.2-A，push：

feature/a-core-destination-generation-manifest

前置满足并实现完成后创建 feature/a-core-destination-generation-manifest → develop Draft PR。

不得自动 merge。

最后按完整 Result 格式返回：

Status
Prerequisites
Tracking
Conflict Audit
Japan-only Audit
Seed Validation
Prefecture Coverage
Batch Validation
Destination Manifest
Attraction Manifest
Source Jobs
Variant Matrix
Prompts
Cost / Storage
Reports
Validation
Files Changed
WBS Update
First Executable Batch
Commit(s)
Draft PR
Follow-ups
Known Limitations
```
