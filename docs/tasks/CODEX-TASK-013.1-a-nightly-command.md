# Codex 夜间执行指令 — TASK-013.1-A

将下面整段复制给 Codex。该指令适合在 `TASK-013-A` 已合并验收后，以无人值守方式连续执行。

```text
请在 TravelAssist 仓库中完整执行 TASK-013.1-A。不要只分析、不要只生成示例、不要逐项请求确认；在前置满足时完成全量扫描、尺寸流水线、生成物、测试、Result、WBS、Issue、Commit、Push 和 Draft PR。

Repository:
https://github.com/kanzakimy0/TravelAssist

Task:
TASK-013.1-A — 全量素材清单、S/M/L 与特殊尺寸衍生流水线

GitHub Issue:
#116

Hard dependency:
TASK-013-A / Issue #112 已合并到 develop 且最终验收完成

Remote branch:
feature/a-asset-catalog-derivatives

Task file:
docs/tasks/TASK-013.1-a-asset-catalog-derivatives.md

Design source:
docs/assets/asset-variant-sizing-spec.md

Result file:
docs/tasks/RESULT-TASK-013.1-a-asset-catalog-derivatives.md

一、启动安全

1. 进入 TravelAssist 仓库根目录。
2. 执行：

   git status --short
   git branch --show-current
   git fetch --all --prune
   git rev-parse origin/develop
   git log --oneline -15 origin/develop

3. 禁止执行：

   git clean -fd
   git reset --hard
   git push --force
   git push --force-with-lease

4. 存在与本 Task 无关的用户改动时不得删除或覆盖。优先使用独立 worktree；无法安全隔离则准确返回 Blocked。

5. 读取远端任务定义：

   git show origin/feature/a-asset-catalog-derivatives:docs/tasks/TASK-013.1-a-asset-catalog-derivatives.md
   git show origin/feature/a-asset-catalog-derivatives:docs/assets/asset-variant-sizing-spec.md

6. 切换已有分支，不新建重复分支：

   git switch feature/a-asset-catalog-derivatives
   git pull --ff-only origin feature/a-asset-catalog-derivatives

   本地不存在时：

   git switch --track -c feature/a-asset-catalog-derivatives origin/feature/a-asset-catalog-derivatives

二、前置条件检查

必须确认最新 origin/develop 同时满足：

- 存在 docs/tasks/RESULT-TASK-013-a-asset-library-foundation.md；
- 存在 TASK-013-A 建立的 docs/assets/catalog、src/data/assets、tools/assets、public/media/shared；
- TASK-013-A 的实现 PR 已 merged；
- Issue #112 已记录最终验收完成；
- WBS 中 TASK-013-A / 2.13 已完成。

任一条件不满足时：

- 不轮询；
- 不等待；
- 不在父任务分支上偷偷实现；
- 创建或更新本 Task Result 为 Blocked；
- 在 Issue #116 写明 develop SHA、缺失项、Issue #112 和父 PR 状态；
- 不创建实现 PR；
- 按 Result 格式返回。

前置满足后，将最新 origin/develop 安全 merge 到当前分支。不要 rebase 已推送分支，不要 force push。检查所有 Open Issue / PR，避免修改冲突路径。

三、完整执行范围

严格阅读并遵守完整 Task 与设计书。必须完成：

1. 全量素材清单

- 扫描 public、assets/design、被 docs 引用的视觉文件、src 中全部本地素材引用，以及 favicon/icon 相关素材。
- 排除 .git、node_modules、.next、coverage、dist、build、tmp、.cache。
- public/media/generated 只作为 variant，不得递归成为 source。
- 识别 SVG、PNG、JPG、JPEG、WebP、AVIF、GIF、ICO、BMP、TIFF、视频、Lottie、字体。
- 生成 JSON、CSV、Markdown 全量清单。
- 记录 path、用途、引用位置、原始尺寸、格式、字节、SHA、版权状态、处理资格、阻塞原因、重复组、protected 状态。
- 扫描到的 source 数必须等于 Catalog 唯一路径数；无法分类的素材进入 unknown-review-required，不得忽略。

2. 通用 S/M/L

- sm：最大 480×480，inside，不裁切，不放大，WebP quality 74。
- md：最大 960×960，inside，不裁切，不放大，WebP quality 78。
- lg：最大 1600×1600，inside，不裁切，不放大，WebP quality 82。
- 所有 eligible raster 必须有三个逻辑解析结果。
- 源图不足时使用 alias 或 source fallback，不生成三份相同二进制，不 upscale。

3. 特殊尺寸

按角色实现并生成适用项：

- hero-desktop 1920×1080
- hero-mobile 1080×1440
- background-desktop 2560×1440
- background-mobile 1080×1920
- region-tile 800×600
- card-landscape 960×640
- card-wide 640×360
- card-square 720×720
- map-popup 640×360
- map-pin-thumb 128×128
- timeline-thumb 480×320
- search-thumb 240×160
- share-og 1200×630 JPEG
- favicon-32 32×32 PNG
- apple-touch-180 180×180 PNG
- pwa-192 192×192 PNG
- pwa-512 512×512 PNG

特殊尺寸只能按 Task 中的 assetRole policy 生成，不能让每张图生成所有尺寸。

4. SVG 尺寸

- SVG 保持一个源文件。
- 建立 icon、marker、illustration 的 S/M/L 与特殊显示尺寸 Token。
- Variant Catalog 使用 kind=vector-token。
- 禁止复制三份相同 SVG。

5. 权利与原图保护

只有 runtime local、approved、cacheAllowed=true、derivativesAllowed=true、非动画、未超安全阈值且角色有 policy 的栅格源可以处理。

以下不得生成本地衍生物：

- provider_only
- acquisition_required
- rejected
- expired
- legacy_review_required
- unknown-review-required
- 禁止缓存或禁止衍生

不访问网络，不下载图片，不改变 rights 状态，不覆盖、移动、删除或重命名任何 source / protected asset。

6. 处理器

- 允许且只允许新增一个图像处理依赖 sharp；使用精确版本并更新 lockfile。
- 不依赖系统 ImageMagick / ffmpeg。
- auto-orient、sRGB、移除 GPS / 私密 EXIF。
- 输出到 public/media/generated/v1/{asset-path-key}/{profile}.{ext}。
- 先写临时文件，校验后 atomic rename。
- 使用 focalPoint / safeArea；缺失焦点的 cover 允许中心裁切预览，但必须标记 review_required，不自动 approved。

7. 夜间无人值守能力

必须实现：

- npm run assets:nightly
- npm run assets:nightly:resume
- checkpoint
- --resume
- --rebuild
- --verify-only
- --dry-run
- source SHA + policy 未变化时 skip
- 每项最多重试 1 次
- 每 25 个 source 输出进度
- 双进程 lock
- stale lock 安全规则
- 单项失败继续、最终准确非 0
- 第二次完整运行 no-op

默认 concurrency=2，范围 1..4；source 最大 50 MiB、80 MP。

8. 报告与预览

必须生成：

- all-assets-checklist.md
- asset-variant-matrix.md
- asset-usage-report.md
- missing-variants.md
- orphan-assets.md
- duplicate-report.md
- oversize-assets.md
- focal-point-review.md
- asset-processing-errors.csv
- nightly-run-summary.md
- assets/design/asset-library/previews/variant-review.html

Review HTML 离线可打开，不创建正式 App route，不访问第三方网络。

9. Runtime API

在父任务 Registry 上增加或扩展：

- getAssetSource
- getAssetVariant
- getResponsiveAsset
- getResponsiveImageProps
- getVectorDisplaySize
- listMissingVariants
- listAssetUsages

返回必须区分 exact、alias、degraded、fallback、review_required、unavailable。无 any，不改现有页面。

四、体积限制

严格遵守 Task 单文件预算。

整批：

- 新增 generated > 50 MiB：警告并记录；
- 新增 generated > 100 MiB：提交前 hard stop；
- 单个 Git object > 20 MiB：禁止提交。

超过 hard stop 时仍完成 Catalog 和报告，但不强行提交 generated；Result 写 Blocked/Partial，并提出对象存储或 Git LFS 后续方案。

五、必须执行的命令

先执行：

npm ci
npm install --save-dev --save-exact sharp
npm audit
npm ci

然后执行：

npm run assets:catalog
npm run assets:derive
npm run assets:verify-variants
npm run assets:review
npm run assets:nightly

第一次完成后再次执行：

npm run assets:nightly

第二次必须验证 no-op。再执行或通过自动测试模拟：

npm run assets:nightly:resume

最后执行：

npm run test:asset-variants
npm run assets:validate
npm run test:assets
npm run lint
npm run typecheck
npm run format:check
npm run build
git diff --check

父任务没有某个 script 时，使用实际等价命令并在 Result 记录，不得伪造。

全仓 format 因既有文件失败时，列出准确文件并对本 Task 文件单独检查；不得把失败写成通过，不得大范围格式化其他 Owner 文件。

六、验收数字

Result 必须真实列出：

- scanned source count
- catalog source count
- runtime / design / preview / docs / protected
- referenced / orphan / unknown
- eligible raster 与各不合格原因
- sm / md / lg physical、alias、unavailable
- 各特殊 Profile expected、physical、alias、review、unavailable
- vector token 数
- generated 文件数与总字节
- 最大文件
- duplicate / oversize / focal review / error
- source modified / deleted / renamed
- protected SHA changed
- first run / second no-op / resume / lock

必须满足：

scanSourceCount == sourceCatalogUniquePathCount
uncataloguedSourceCount == 0
eligibleRasterCount == smLogicalResolvedCount
eligibleRasterCount == mdLogicalResolvedCount
eligibleRasterCount == lgLogicalResolvedCount
source modified/deleted/renamed == 0
protected SHA changed == 0

七、追踪与交付

1. 更新 docs/project/WBS-TravelAssist.md：

   2.14 | 全量素材清单 + S/M/L / 特殊尺寸衍生流水线 | A | P1 | 2.13

   如果 2.14 已占用，使用下一个可用工程基础 ID，不覆盖已有项。

2. 在 Task 追踪表加入 TASK-013.1-A。
3. 正式执行时 WBS=进行中；实现完成但 PR 未合并时 WBS=待审查；不得提前写已完成。
4. 创建 docs/tasks/RESULT-TASK-013.1-a-asset-catalog-derivatives.md，严格按 Task 第 21 节格式写真实结果。
5. 开始与完成时更新 Issue #116。
6. Commit subject 必须包含 TASK-013.1-A。
7. Push 到 feature/a-asset-catalog-derivatives。
8. 创建 feature/a-asset-catalog-derivatives → develop 的 Draft PR。
9. PR 关联 #116 和父任务 #112，记录数量、rights、no-upscale、原图保护、体积和验证。
10. 确认 PR 保持 Draft，禁止自动 merge。

不要因为部分低分辨率图无法生成精确大图、SVG 没有三份物理文件、Provider 图片没有本地文件或某些裁切需要人工复核而停止；这些应通过 alias、fallback、unavailable、review queue 和报告处理。

最后只按完整 Task Result 返回：

Status
Prerequisite
Tracking
Conflict Audit
Full Asset Inventory
Eligibility
S / M / L
Special Profiles
Vector Tokens
Generated Output
Rights / Privacy
Original Protection
Nightly Behavior
Reports
Validation
Files Changed
WBS Update
Commit(s)
Draft PR
Follow-ups
Known Limitations

不要只返回概述，不要省略真实数量和命令结果。
```
