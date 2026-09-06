# Codex 执行指令 — TASK-013.2-A 全球核心素材生成单

将下面整段复制给 Codex：

```text
请在 TravelAssist 仓库中完整执行 TASK-013.2-A，生成全球核心目的地与景点的素材生产单。不要只分析，不要只给示例，不要在未满足前置时猜测父任务结构，也不要一次性生成或下载全部图片。

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#152 — TASK-013.2-A 全球核心目的地素材生成单（300目的地 / 9,000景点）

Branch:
feature/a-core-destination-generation-manifest

Task:
docs/tasks/TASK-013.2-a-core-destination-generation-manifest.md

Design:
docs/assets/core-destination-generation-plan.md

Seed:
docs/assets/catalog/core-destination-generation-seed.v1.csv

Batch order:
docs/assets/catalog/core-destination-generation-batches.v1.csv

Result:
docs/tasks/RESULT-TASK-013.2-a-core-destination-generation-manifest.md

一、Git 安全启动

进入 TravelAssist 仓库根目录，执行：

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

存在与本 Task 无关的用户文件时不得删除或覆盖。优先使用独立 worktree；无法安全隔离则返回 Blocked。

从远端读取完整任务：

git show origin/feature/a-core-destination-generation-manifest:docs/tasks/TASK-013.2-a-core-destination-generation-manifest.md

git show origin/feature/a-core-destination-generation-manifest:docs/assets/core-destination-generation-plan.md

git show origin/feature/a-core-destination-generation-manifest:docs/assets/catalog/core-destination-generation-seed.v1.csv

git show origin/feature/a-core-destination-generation-manifest:docs/assets/catalog/core-destination-generation-batches.v1.csv

切换已有分支：

git switch feature/a-core-destination-generation-manifest
git pull --ff-only origin feature/a-core-destination-generation-manifest

本地没有该分支时：

git switch --track -c feature/a-core-destination-generation-manifest origin/feature/a-core-destination-generation-manifest

二、强制前置条件

必须确认最新 origin/develop 同时满足：

1. TASK-013-A / Issue #112 的实现已经合并并最终验收；
2. develop 中存在 TASK-013-A Result、Asset Manifest、rights policy 和 Registry；
3. TASK-013.1-A / Issue #116 的实现已经合并并最终验收；
4. develop 中存在尺寸 Profile、Variant Registry、夜间流水线和 TASK-013.1-A Result；
5. WBS 中两个父任务均为已完成。

任一条件不满足：

- 不轮询；
- 不等待；
- 不在父任务 feature branch 上继续；
- 不猜测 Schema；
- 创建或更新 RESULT-TASK-013.2-a-core-destination-generation-manifest.md 为 Blocked；
- 在 Issue #152 写明实际 develop SHA、缺失项、父 Issue/PR 状态；
- 不创建实现 PR；
- 按 Task Result 格式返回。

前置满足后，将最新 origin/develop 安全 merge 到本分支。不要 rebase 已推送分支，不要 force push。检查所有 Open/Draft PR，避免与 docs/assets、src/data/assets、tools/assets、package.json 的活动任务冲突。

三、冻结数字

必须严格得到：

- 300 个目的地；
- S 级 100 个，每个 40 个景点；
- A 级 200 个，每个 25 个景点；
- 景点槽位总数 9,000；
- 目的地 source jobs 300；
- 景点 source/provider jobs 9,000；
- source jobs 总数 9,300；
- 目的地 md variant 300；
- 目的地 lg variant 300；
- 景点 sm variant 9,000；
- variant expectations 总数 9,600；
- batch 总数 40；
- 每 batch 最多 10 个目的地；
- 每 batch 最多 420 个基础输出；
- 前四个 batch 必须为 JP-S-01、JP-A-01、JP-A-02、JP-A-03。

Seed 是 TravelAssist 的产品覆盖 Seed，不要声称它是客观世界旅游排名，不要擅自增加、删除或替换行。

四、必须实现的输出

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
docs/assets/generated/unresolved-destinations.md
docs/assets/generated/unresolved-attractions.md
docs/assets/generated/duplicate-entities.md
docs/assets/generated/rights-blocked-jobs.md
docs/assets/generated/core-generation-cost-estimate.md

docs/assets/generated/core-batches/{batch-id}.json

必须生成正好 40 个 batch JSON。

五、目的地清单

将 300 行 Seed 丰富为完整 Destination Manifest，至少包含：

- destination_id
- batch_id
- tier
- region
- country_code
- entity_type
- name_zh / name_ja / name_en
- canonical_name / aliases
- latitude / longitude
- provider_type / provider_entity_id
- attraction_quota
- source_mode
- source_job_id
- md_variant_id / lg_variant_id
- status / review_notes

不得简单把英文名复制到中文和日文栏位来伪装完成。无法验证时使用明确状态，不要捏造。

六、9,000 个景点槽位

每个 S 级目的地正好 40 行，每个 A 级目的地正好 25 行。

S 级类别目标：

- landmark 10
- museum_culture 6
- historic_religious 6
- nature_viewpoint 5
- family_theme 4
- district_neighborhood 4
- market_shopping 3
- food_culture_experience 2

A 级类别目标：

- landmark 7
- museum_culture 4
- historic_religious 4
- nature_viewpoint 3
- family_theme 2
- district_neighborhood 2
- market_shopping 2
- food_culture_experience 1

景点字段至少包括：

- poi_id
- destination_id
- batch_id
- tier
- selection_order
- category
- name_zh / name_ja / name_en
- canonical_name / aliases
- latitude / longitude
- provider_type / provider_entity_id
- official_url
- source_mode
- source_job_id
- sm_variant_id
- rights_status
- status
- quota_exception_reason
- review_notes

实体来源顺序：

1. 仓库已有 POI Master / Provider ID；
2. 已批准地图或 POI Provider；
3. 官方旅游机构或官方景点资料；
4. 许可兼容的开放知识实体；
5. 人工复核。

禁止仅凭模型记忆捏造 9,000 个景点、坐标或 Provider ID。

数据不足时仍创建固定槽位：

poi_id = unresolved:{destination_id}:{selection_order}
status = entity_resolution_required
source_mode = acquisition_required
rights_status = unresolved

并写入 unresolved-attractions.md。

unresolved=0 才可 Completed；有 unresolved 但结构完整则 Partial，不得冒充全量完成。

七、图片模式与真实性

生产单必须区分：

- illustrative_city：城市气氛图，可使用 AI，但必须标记 authenticity=illustrative；
- documentary_photo：真实景点图片，不由模型凭空生成；
- provider_only：只保存合法 Provider 引用，不缓存二进制；
- symbolic_placeholder：明确占位，不得作为真实 POI 图；
- acquisition_required：等待合法来源。

城市：每城只建立 1 个 master source job，之后由父流水线派生 md + lg。

景点：每个景点建立 1 个真实来源、Provider 或采购 job，之后派生 sm。

真实景点默认禁止用 AI 图冒充实拍。AI 景点图只能是 illustrative/symbolic，不能进入 documentary slot。

禁止抓取 Google Images、Google Maps、Tripadvisor、Booking、Agoda、Instagram、小红书、微博等图片。禁止提交 Token、Cookie、私有授权文件。

八、Jobs 与 Variant Matrix

core-source-jobs.v1.jsonl 必须恰好 9,300 行：

- 300 destination_master；
- 9,000 poi_photo/provider_reference。

core-variant-output-matrix.v1.csv 必须恰好 9,600 行：

- md 300；
- lg 300；
- sm 9,000。

不要在本 Task 添加 Hero、地图弹窗、分享图等特殊尺寸，避免改变 9,600 的基础口径。特殊尺寸留给后续具体 batch task。

九、工具与脚本

优先复用父任务工具，不新增 npm 依赖。实现：

- tools/assets/build-core-generation-manifest.mjs
- tools/assets/validate-core-generation-manifest.mjs
- tools/assets/export-core-generation-batches.mjs
- tools/assets/estimate-core-generation-cost.mjs
- tests/task-013-2-core-generation-manifest.test.mjs

Package scripts：

- assets:core-manifest
- assets:core-validate
- assets:core-batches
- assets:core-estimate
- test:core-generation

输出必须稳定排序，相同输入二次运行 no-op。大型 9,000 行 Catalog 不得意外打进客户端 bundle。

十、本 Task 不生成全部图片

本次只生成 Manifest、Jobs、Prompt、Batch 和报告：

RUN_MODE=manifest

不得一次性调用图片 Provider，不得下载 9,000 张图片，不得提交 1GB 图片。

后续每个 batch 单独建立 child task。Batch prepare 示例：

RUN_MODE=batch-prepare
BATCH_ID=JP-S-01

只有 Provider、商业使用规则、预算、存储和该批 manifest 全部批准后，后续 child task 才允许 batch-execute。

十一、必须验证

执行：

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

父任务没有某条 script 时，使用实际等价命令并在 Result 记录，不得伪造。

再次执行：

npm run assets:core-manifest
npm run assets:core-validate

第二次必须是确定性 no-op，除非输入明确变化。

十二、WBS / Result / GitHub

在 WBS 新增或使用下一个可用 ID：

2.15 | 全球核心目的地素材生成单（300目的地 / 9,000景点） | A | P1 | 2.13,2.14

开始执行时为进行中；实现完成但 PR 未合并时为待审查；不得提前写已完成。

创建：

docs/tasks/RESULT-TASK-013.2-a-core-destination-generation-manifest.md

严格按 Task 第 21 节写真实数字、resolved/unresolved、类别配额、重复项、rights、成本、命令结果和第一可执行批次。

开始和完成时更新 Issue #152。

Commit subject 包含 TASK-013.2-A，push 到：

feature/a-core-destination-generation-manifest

创建：

feature/a-core-destination-generation-manifest → develop

的 Draft PR。

PR 关联 #152、父任务 #112 和 #116。保持 Draft，不自动 merge。

最后只按完整 Result 格式返回：

Status
Prerequisites
Tracking
Conflict Audit
Seed Validation
Batch Validation
Destination Manifest
Attraction Manifest
Source Jobs
Variant Matrix
Prompts
Cost / Storage
Reports
Registry
Validation
Files Changed
WBS Update
First Executable Batch
Commit(s)
Draft PR
Follow-ups
Known Limitations

不要只返回概述，不要省略真实数量和命令结果。
```
