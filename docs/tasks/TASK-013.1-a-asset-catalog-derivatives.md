# TASK-013.1-A — 全量素材清单、S/M/L 与特殊尺寸衍生流水线

## Metadata

- Task ID：`TASK-013.1-A`
- Owner：`A`
- Responsibility：`Shared Infrastructure / Asset Pipeline`
- Priority：`P1`
- Status：`待开始（前置阻塞）`
- WBS：`2.14`（预定；若被占用则使用下一个可用工程基础 ID）
- Depends On：`TASK-013-A` / Issue `#112` 已合并到 `develop` 且验收完成
- GitHub Issue：`#116`
- Branch：`feature/a-asset-catalog-derivatives`
- Branch Base at Creation：`develop@4c1d9bbf1311a10b1e9db5bde00fe2e7b12fccab`
- Task File：`docs/tasks/TASK-013.1-a-asset-catalog-derivatives.md`
- Design Source：`docs/assets/asset-variant-sizing-spec.md` v1.0
- Codex Command：`docs/tasks/CODEX-TASK-013.1-a-nightly-command.md`
- Result File：`docs/tasks/RESULT-TASK-013.1-a-asset-catalog-derivatives.md`
- Pull Request：完成后创建 Draft PR → `develop`

---

## 1. 任务目标

在 `TASK-013-A` 建立的 Asset Manifest、素材分类、授权状态和 fallback 基础上，完成一套可重复、可恢复、可审计、适合夜间无人值守执行的全量素材处理流水线。

最终必须做到：

1. 仓库内全部视觉素材进入 JSON、CSV、Markdown 清单；
2. 所有引用位置、用途、原始尺寸、字节数、SHA、版权状态和处理资格可查询；
3. 所有符合条件的本地栅格素材具有 `sm / md / lg` 三个逻辑尺寸；
4. 按素材角色生成 Hero、背景、卡片、地图、时间轴、搜索、分享和品牌图标等特殊尺寸；
5. SVG 不复制三份文件，而是由统一显示尺寸 Token 提供 S/M/L 和特殊尺寸；
6. 低分辨率源图不被强行放大；不足尺寸通过 alias、source fallback 或 review queue 处理；
7. 原始素材与受保护素材不会被覆盖、重命名或删除；
8. 无合法衍生权、禁止缓存、仅 Provider 引用或授权未确认的素材不生成本地衍生文件；
9. 流水线支持 checkpoint、resume、skip unchanged、lock、重试限制和确定性输出；
10. 夜间运行结束后自动产出可早晨审查的清单、矩阵、错误、体积、重复和 HTML 预览；
11. 校验、测试、WBS、Result、Issue、Commit、Draft PR 完整关联。

---

## 2. 强制前置条件

本 Task **不能与 TASK-013-A 并行实现**。

### 2.1 前置完成判定

执行前必须同步最新远端，并同时确认：

```text
A. origin/develop 中存在：
   docs/tasks/RESULT-TASK-013-a-asset-library-foundation.md

B. origin/develop 中存在 TASK-013-A 建立的实际素材库文件：
   docs/assets/catalog/**
   src/data/assets/**
   tools/assets/**
   public/media/shared/**

C. TASK-013-A 的实现 PR 已 merged 到 develop

D. Issue #112 已进入完成状态，或其评论明确记录已合并且最终验收通过

E. WBS 中 TASK-013-A / 对应 2.13 已同步为已完成
```

如果 A–E 任一不满足：

- 不轮询；
- 不等待；
- 不在 `feature/a-asset-library-foundation` 上偷偷继续；
- 不复制或猜测父任务 Schema；
- 立即创建/更新本 Task Result 为 `Blocked`；
- 在 Issue #116 记录缺失项、实际 develop SHA、Issue #112 / PR 状态；
- 不创建实现 PR。

“夜间无人值守”指前置满足后的长时间批处理，不表示可以绕过依赖。

---

## 3. 启动与 Git 安全

### 3.1 Preflight

在仓库根目录执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
git branch -a --contains origin/develop
```

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

存在与本 Task 无关的用户改动时：

- 不删除；
- 不覆盖；
- 优先使用独立 worktree；
- 可安全隔离时使用带说明的 stash；
- 无法安全隔离则返回 Blocked。

### 3.2 读取任务分支

```bash
git switch feature/a-asset-catalog-derivatives
git pull --ff-only origin feature/a-asset-catalog-derivatives
```

本地不存在时：

```bash
git switch --track -c feature/a-asset-catalog-derivatives origin/feature/a-asset-catalog-derivatives
```

比较：

```bash
git rev-parse HEAD
git rev-parse origin/develop
git merge-base HEAD origin/develop
git log --oneline --left-right HEAD...origin/develop
```

前置满足后，将最新 `origin/develop` merge 到本 feature branch：

```bash
git merge --no-ff origin/develop
```

规则：

- 不 rebase 已推送分支；
- 不 force push；
- 冲突只能在本 Task 允许路径内解决；
- 父任务 Asset Manifest / Registry 为基线，不得用本分支旧文件覆盖；
- 无法安全合并时返回 Blocked 并列出冲突文件。

### 3.3 必须读取

```text
AGENTS.md
package.json
package-lock.json
docs/project/WBS-TravelAssist.md
docs/development/task-tracking.md
docs/assets/asset-library-strategy.md
docs/assets/asset-variant-sizing-spec.md
docs/tasks/TASK-013-a-asset-library-foundation.md
docs/tasks/RESULT-TASK-013-a-asset-library-foundation.md
docs/assets/catalog/**
docs/assets/generated/**
src/data/assets/**
tools/assets/**
assets/design/asset-library/**
```

并检查：

- Issue #112、Issue #116；
- TASK-013-A 的 merged PR；
- 所有 Open A/B Issue；
- 所有 Open / Draft PR；
- 是否有其他 Task 正在修改 `package.json`、`package-lock.json`、`docs/assets/**`、`public/media/**`、`src/data/assets/**`、`tools/assets/**`。

---

## 4. 允许修改范围

主要允许：

```text
package.json
package-lock.json
.gitignore
public/media/generated/**
docs/assets/catalog/**
docs/assets/generated/**
assets/design/asset-library/previews/**
src/data/assets/**
tools/assets/**
tests/task-013-1-asset-variants.test.mjs
docs/tasks/TASK-013.1-a-asset-catalog-derivatives.md
docs/tasks/RESULT-TASK-013.1-a-asset-catalog-derivatives.md
docs/project/WBS-TravelAssist.md
```

只读审计：

```text
public/media/home/**
public/media/start/**
public/media/personal-center/**
public/media/shared/**
public/media/destinations/**
assets/design/personal-center/**
其他 Task 的 runtime / source assets
```

除非父任务 Manifest 明确将某路径定义为本 Task 可生成目录，否则 source 路径一律视为不可改。

---

## 5. 禁止范围

本 Task 禁止：

- 修改 Planner、Start Flow、Personal Center 的页面视觉或业务逻辑；
- 批量替换现有 `img` / `Image` 调用；
- 删除、移动、重命名、覆盖原始素材；
- 修改现有素材的版权状态来让它“变得可处理”；
- 从互联网下载图片；
- 调用 Google Images、Google Maps、Tripadvisor、Booking、Agoda、Instagram、小红书、微博等来源；
- 生成新的旅行地点照片来填充缺口；
- 把 AI 图写成真实摄影；
- 给 `provider_only / acquisition_required / rejected / expired` 生成本地图片；
- 把 GIF / animated WebP 当作普通静态图覆盖；
- 自动从视频截帧；
- 强制放大低分辨率源图；
- 为 SVG 机械创建 `sm / md / lg` 三份相同文件；
- 引入图片处理以外的第三方依赖；
- 使用本机 ImageMagick 等未锁定系统工具；
- 大范围格式化其他 Owner 文件；
- 自动 merge PR。

---

## 6. 全量素材扫描与清单

### 6.1 扫描范围

实现递归扫描：

```text
public/**
assets/design/**
docs/** 中被引用的视觉文件
src/** 中所有本地素材引用
根目录 / app 目录 favicon、icon、manifest 相关文件
```

识别扩展名至少包括：

```text
.svg .png .jpg .jpeg .webp .avif .gif .ico .bmp .tif .tiff
.mp4 .webm .mov .lottie .woff .woff2
```

排除：

```text
.git/** node_modules/** .next/** coverage/** dist/** build/**
tmp/** .cache/**
```

`public/media/generated/**` 作为 variant 扫描，不得再次作为 source 输入，防止递归衍生。

### 6.2 引用扫描

至少扫描：

```text
ES import
require()
new URL(..., import.meta.url)
Next/Image src
HTML img src
CSS url()
字符串形式 /media/**
Markdown image
HTML preview image
Manifest path
```

能安全定位时记录文件与行号；无法精确定位时记录 source file 与匹配类型。

### 6.3 必须创建

```text
docs/assets/catalog/asset-source-catalog.v1.json
docs/assets/catalog/asset-source-catalog.v1.csv
docs/assets/catalog/asset-usage-map.v1.json
docs/assets/generated/all-assets-checklist.md
docs/assets/generated/asset-usage-report.md
docs/assets/generated/orphan-assets.md
```

### 6.4 覆盖率验收

定义：

```text
scanSourceCount = 排除目录后扫描到的全部源素材文件
catalogSourceCount = Source Catalog 唯一 source path 数量
```

必须满足：

```text
scanSourceCount == catalogSourceCount
uncataloguedSourceCount == 0
```

无法分类的素材必须进入：

```text
scope = unknown-review-required
processingEligibility = false
processingBlockReason = unclassified-source
```

不得通过忽略文件来达成 100%。

### 6.5 Source Catalog 字段

严格实现设计书第 4.1 节字段，至少包括：

```text
sourceId
assetId
path
scope
mediaType
mimeType
extension
bytes
sha256
width
height
aspectRatio
orientation
hasAlpha
animated
frameCount
colorSpace
entityType
entityId
assetRole
sourceType
rightsStatus
cacheAllowed
derivativesAllowed
authenticity
manifestStatus
protected
referenced
referenceCount
referenceLocations
focalPoint
safeArea
variantPolicyId
processingEligibility
processingBlockReason
duplicateGroup
notes
```

输出稳定排序，CSV 正确转义换行、引号和逗号。

---

## 7. Size Profile 配置

创建：

```text
docs/assets/catalog/asset-size-profiles.v1.json
docs/assets/catalog/asset-processing-policy.v1.json
```

配置必须是处理器唯一真实来源，不得把同一尺寸散落硬编码在多个脚本。

### 7.1 通用栅格 Profile

```text
sm: max 480×480, fit inside, no enlargement, WebP quality 74
md: max 960×960, fit inside, no enlargement, WebP quality 78
lg: max 1600×1600, fit inside, no enlargement, WebP quality 82
```

三档保留原比例，不裁切。

### 7.2 特殊 Profile

严格实现：

```text
hero-desktop       1920×1080  16:9 cover WebP
hero-mobile        1080×1440  3:4 cover WebP
background-desktop 2560×1440  16:9 cover WebP
background-mobile  1080×1920  9:16 cover WebP
region-tile         800×600   4:3 cover WebP
card-landscape      960×640   3:2 cover WebP
card-wide           640×360   16:9 cover WebP
card-square         720×720   1:1 cover WebP
map-popup           640×360   16:9 cover WebP
map-pin-thumb       128×128   1:1 cover WebP
timeline-thumb      480×320   3:2 cover WebP
search-thumb        240×160   3:2 cover WebP
share-og           1200×630   cover JPEG
favicon-32           32×32    contain PNG
apple-touch-180     180×180   contain PNG
pwa-192             192×192   contain PNG
pwa-512             512×512   contain PNG
```

### 7.3 角色映射

严格实现设计书第 7 节映射。核心规则：

- background 只生成 background profiles；
- destination hero 生成 hero + share；
- region cover 生成 region / card；
- POI、酒店、餐厅、活动图片生成卡片、地图、时间轴、搜索；
- brand mark 只在指定品牌源上生成 favicon / touch / PWA；
- unknown role 不自动生成全部特殊尺寸；
- 每个特殊 variant 都能追溯到 role policy。

---

## 8. SVG 显示尺寸 Token

SVG 保持单一 source。

创建或扩展 Registry，使以下 Token 可查询：

```text
icon-sm 16×16
icon-md 24×24
icon-lg 32×32
icon-special-map-control 20×20
icon-special-navigation 18×18
icon-special-feature 40×40

marker-sm 24×30
marker-md 32×40
marker-lg 40×50
marker-selected 48×60
marker-cluster 44×44

illustration-sm 120×120
illustration-md 200×200
illustration-lg 320×320
state-panel max 480×360
```

在 Variant Catalog 中登记：

```text
kind = vector-token
path = 原 SVG path
width / height = 显示尺寸
```

不得生成重复 SVG 文件。

---

## 9. 图像处理依赖

允许新增一个直接图像处理依赖：

```text
sharp
```

执行方式：

```bash
npm install --save-dev --save-exact sharp
```

如果项目架构要求 runtime dependency，可改为 `--save-exact`，但必须在 Result 说明理由。

要求：

- 精确版本进入 package.json / package-lock；
- 记录安装版本；
- 记录 license；
- `npm audit` 结果准确记录；
- 不新增 glob、CSV、queue、image-size 等其他包；
- 递归扫描、CSV、checkpoint、report 使用 Node.js 内置模块实现；
- 不依赖系统 ImageMagick / ffmpeg；
- sharp 不兼容锁定 Node 环境时返回真实 blocker，不使用不可复现替代方案。

---

## 10. 处理器实现

建议创建：

```text
tools/assets/build-full-catalog.mjs
tools/assets/scan-asset-usages.mjs
tools/assets/generate-asset-derivatives.mjs
tools/assets/verify-asset-derivatives.mjs
tools/assets/generate-variant-review.mjs
tools/assets/run-assets-nightly.mjs

tools/assets/lib/catalog.mjs
tools/assets/lib/image-processor.mjs
tools/assets/lib/profiles.mjs
tools/assets/lib/checkpoint.mjs
tools/assets/lib/rights.mjs
tools/assets/lib/reporting.mjs
```

允许根据父任务已有结构整合，但最终职责必须清晰，不得复制两套同功能脚本。

### 10.1 处理顺序

```text
source read
→ decode metadata
→ EXIF auto-orient
→ sRGB
→ remove GPS / private metadata
→ resolve profile
→ resize / crop
→ encode
→ write temp file
→ verify dimensions / bytes / SHA
→ atomic rename
→ update checkpoint
```

### 10.2 输出目录

```text
public/media/generated/v1/{asset-path-key}/{profile}.{ext}
```

规则：

- asset-path-key 由稳定 assetId 派生；
- 小写 kebab-case；
- 不使用随机 UUID；
- 不包含中文或空格；
- 输出与 source 路径不得相同；
- 临时文件不进入 Git；
- 失败不留下半文件。

### 10.3 衍生资格

只有同时满足：

```text
runtime.kind = local
source exists
supported raster
status = approved
cacheAllowed = true
derivativesAllowed = true
not animated
source ≤ 50 MiB
source pixels ≤ 80 MP
assetRole has policy
```

以下状态不生成：

```text
provider_only
acquisition_required
rejected
expired
legacy_review_required
unknown-review-required
```

每次跳过必须写机器可读原因。

### 10.4 无放大与 Alias

通用 `sm / md / lg` 必须有三个逻辑解析结果。

当源图不足：

- 不 upscale；
- 允许生成实际不超过源图的最大标准化版本；
- 其他 Profile 使用 alias；
- 不复制相同二进制；
- alias 不得循环；
- Registry 必须返回可用最大尺寸与 `degraded=true`。

特殊尺寸不足时：

- 不放大；
- 优先返回适用的 source / 通用 variant fallback；
- Catalog 登记 `unavailable` 或 `alias`；
- 进入 `missing-variants.md`；
- 不把降级结果标为完整的精确特殊尺寸。

### 10.5 Crop / Focal Point

- cover 优先使用 focalPoint；
- 有 safeArea 时不得切掉 safeArea；
- 无 focalPoint 可中心裁切生成 review variant；
- 此时 `focalPointDefaulted=true`、`status=review_required`；
- 不使用自动人脸识别；
- 默认中心裁切结果不自动提升为 approved。

### 10.6 Metadata / 隐私

生成物：

- 移除 GPS；
- 移除相机序列号和本地路径；
- 移除无关 EXIF；
- 保留必要 sRGB 信息；
- auto-orient 后 Catalog 写入最终宽高。

---

## 11. Variant Catalog 与报告

创建：

```text
docs/assets/catalog/asset-variants.v1.json
docs/assets/generated/asset-variant-matrix.md
docs/assets/generated/missing-variants.md
docs/assets/generated/duplicate-report.md
docs/assets/generated/oversize-assets.md
docs/assets/generated/focal-point-review.md
docs/assets/generated/asset-processing-errors.csv
docs/assets/generated/nightly-run-summary.md
```

### 11.1 Variant Kind

```text
physical
alias
vector-token
source-provided
unavailable
```

### 11.2 必须统计

```text
source count
runtime source count
design / preview / docs count
referenced / orphan count
manifested / unmanifested count
eligible raster count
ineligible count by reason
S physical / alias / unavailable
M physical / alias / unavailable
L physical / alias / unavailable
special expected / physical / alias / review / unavailable
vector token count
duplicate source groups
duplicate output groups
oversize count
focal-point review count
processing error count
new generated bytes
largest files
no-op skipped count
resume recovered count
```

### 11.3 完整性公式

```text
scanSourceCount == sourceCatalogUniquePathCount
uncataloguedSourceCount == 0

eligibleRasterCount == smLogicalResolvedCount
eligibleRasterCount == mdLogicalResolvedCount
eligibleRasterCount == lgLogicalResolvedCount

physicalVariantCount + aliasVariantCount + vectorTokenCount
+ sourceProvidedCount + unavailableRecordedCount
== totalExpectedLogicalVariantCount
```

不得通过少算 expected count 达成完整性。

---

## 12. Runtime / TypeScript API

在父任务 `src/data/assets/` 基础上增加或扩展：

```ts
getAssetSource(assetId)
getAssetVariant(assetId, profileId)
getResponsiveAsset(assetId, context)
getResponsiveImageProps(assetId, context)
getVectorDisplaySize(assetId, sizeToken)
listMissingVariants()
listAssetUsages(assetId)
```

至少支持 context：

```text
hero-desktop
hero-mobile
background-desktop
background-mobile
region-tile
card-landscape
card-wide
card-square
map-popup
map-pin-thumb
timeline-thumb
search-thumb
share-og
```

返回必须区分：

```text
exact
alias
degraded
fallback
review_required
unavailable
```

`getResponsiveImageProps` 至少返回：

```ts
{
  src,
  srcSet,
  sizes,
  width,
  height,
  alt,
  fallbackSrc,
  status
}
```

无 `any`，不得发起网络请求，不得修改现有页面。

---

## 13. 夜间无人值守入口

### 13.1 Package Scripts

在保留父任务与现有 scripts 的前提下增加：

```json
{
  "assets:catalog": "node tools/assets/build-full-catalog.mjs",
  "assets:derive": "node tools/assets/generate-asset-derivatives.mjs",
  "assets:verify-variants": "node tools/assets/verify-asset-derivatives.mjs",
  "assets:review": "node tools/assets/generate-variant-review.mjs",
  "assets:nightly": "node tools/assets/run-assets-nightly.mjs",
  "assets:nightly:resume": "node tools/assets/run-assets-nightly.mjs --resume",
  "test:asset-variants": "node --test tests/task-013-1-asset-variants.test.mjs"
}
```

如果父任务已有同名脚本，扩展而非覆盖；禁止两套冲突命令。

### 13.2 Nightly 阶段

```text
00 preflight
01 dependency / schema check
02 full source inventory
03 usage scan
04 eligibility resolution
05 S/M/L generation
06 special generation
07 catalog / alias generation
08 verify rights / integrity / size
09 review HTML / reports
10 tests / lint / typecheck / format / build
11 Result / WBS / Git summary
```

### 13.3 Checkpoint / Resume

非提交目录：

```text
.cache/asset-pipeline/
tmp/assets-nightly/
```

更新 `.gitignore`。

必须支持：

```text
--resume
--rebuild
--verify-only
--dry-run
```

Checkpoint 至少记录：

```text
runId
profileVersion
sourceCursor
completedSourceSha
completedProfiles
failedSourceAndProfile
retryCount
tempOutput
```

### 13.4 无人值守规则

- 不请求逐项确认；
- 不发起网络请求；
- 单项失败后记录并继续；
- 每项最多重试 1 次；
- 每 25 个 source 输出进度；
- 每个 source 完成后 checkpoint；
- source SHA + profile policy 未变化时 skip；
- 二次运行应为 no-op；
- 不自动 prune 不认识的文件；
- lock 防止双进程；
- stale lock 只在超过 12 小时且 PID 不存在时清除；
- 最终 required validation 失败则非 0 退出；
- 即使失败也尽量生成错误和 Summary 报告。

### 13.5 并发与资源

默认：

```text
concurrency = 2
min = 1
max = 4
max source file = 50 MiB
max source pixels = 80 MP
retry = 1
```

环境变量：

```text
ASSET_PIPELINE_CONCURRENCY
ASSET_PIPELINE_RESUME
ASSET_PIPELINE_REBUILD
ASSET_PIPELINE_MAX_NEW_BYTES
```

不得通过环境变量绕过 rights、no-upscale 或 protected source 规则。

---

## 14. 体积预算

### 14.1 单文件硬上限

```text
sm                  200 KB
md                  450 KB
lg                  900 KB
search-thumb         90 KB
map-pin-thumb        70 KB
map-popup           220 KB
timeline-thumb      160 KB
card-*              400 KB
hero-*              800 KB
background-*        1.2 MB
share-og            700 KB
PWA / Touch Icon    500 KB
single Git object    20 MiB
```

超限但有合理原因的文件不得自动放行，必须进入 exception report，并由验证决定是否失败。

### 14.2 整批上限

```text
Soft warning：新增 generated > 50 MiB
Hard stop before commit：新增 generated > 100 MiB
```

超过 hard stop：

- 完成 catalog / report；
- 不提交 generated 目录；
- 不静默删减用户要求的尺寸；
- Result 标记 `Blocked` 或 `Partial`；
- 建立对象存储 / Git LFS 后续建议；
- Issue #116 保持 Open。

---

## 15. 静态审查页面

生成：

```text
assets/design/asset-library/previews/variant-review.html
```

不得新建正式 App route。

每个 eligible source 至少展示：

- source；
- S / M / L；
- 适用特殊尺寸；
- physical / alias / unavailable；
- 实际宽高、格式和字节；
- rights / authenticity / status；
- focal point；
- default-center warning；
- missing / error；
- code usage 数量。

页面必须离线可打开，使用相对路径，不访问第三方网络。

---

## 16. Tests

新增：

```text
tests/task-013-1-asset-variants.test.mjs
```

至少覆盖：

1. 扫描结果全部进入 Source Catalog；
2. source path 唯一；
3. generated 不递归成为 source；
4. Manifest local path 全部能映射；
5. eligible raster 有 S/M/L 三个逻辑结果；
6. 小源图无 upscale；
7. alias 无循环；
8. special profile 与 role policy 匹配；
9. SVG 使用 vector-token，无三份复制；
10. physical variant 文件存在；
11. 实际宽高 / format / bytes / SHA 与 Catalog 一致；
12. protected source SHA 未变化；
13. source path 未被写入 generated；
14. rights 不合格素材无衍生文件；
15. animated / video / font 未被误处理；
16. focalPoint 缺失的 cover 标记 review；
17. 输出无 GPS / 私密 EXIF；
18. 文件名 kebab-case；
19. 单文件预算；
20. 整批预算；
21. duplicate / orphan / missing / oversize / errors 报告存在；
22. `getAssetVariant` exact / alias / fallback / unavailable；
23. `getResponsiveImageProps` 输出正确；
24. 首次完成后第二次运行为 no-op；
25. 人工模拟中断后 `--resume` 不重复已完成源；
26. lock 防止并发写；
27. temp file 最终清理；
28. 输出稳定排序；
29. Catalog 中不存在本机绝对路径；
30. 没有网络请求代码路径。

---

## 17. 执行与验证命令

### 17.1 安装与基线

```bash
npm ci
npm install --save-dev --save-exact sharp
npm audit
```

如果先执行 `npm ci` 后安装 sharp，最终应再执行一次：

```bash
npm ci
```

确认 lockfile 可复现。

### 17.2 流水线

```bash
npm run assets:catalog
npm run assets:derive
npm run assets:verify-variants
npm run assets:review
npm run assets:nightly
```

然后验证 no-op：

```bash
npm run assets:nightly
```

第二次 Summary 必须显示：

```text
source changed = 0
unnecessary regenerated = 0
skipped unchanged > 0（若存在 eligible source）
```

再运行 resume 测试或自动测试中的受控中断模拟：

```bash
npm run assets:nightly:resume
```

### 17.3 项目验证

```bash
npm run test:asset-variants
npm run assets:validate
npm run test:assets
npm run lint
npm run typecheck
npm run format:check
npm run build
git diff --check
```

父任务未提供某条 script 时：

- 不伪造执行；
- 根据实际父任务脚本映射到等价命令；
- 在 Result 记录偏差；
- 不删除本 Task 的核心验证。

全仓 format 因既有文件失败时：

- 列出准确文件；
- 对本 Task 修改文件单独 check；
- 不把失败写成通过；
- 不借机改其他 Owner 文件。

---

## 18. Git Diff 与原图保护审计

运行前保存 source snapshot：

```text
path
bytes
sha256
```

运行后比较。

必须满足：

```text
source modified count = 0
source deleted count = 0
source renamed count = 0
protected SHA changed count = 0
```

Git diff 中二进制新增只能位于：

```text
public/media/generated/**
```

以及明确允许的 brand icon 输出路径（若父任务结构要求），但不得覆盖已有文件。

任何 source 变化都必须停止提交并恢复到任务开始状态，且不得使用 destructive reset 破坏用户改动。

---

## 19. WBS / Issue / Result

### 19.1 WBS

在 `docs/project/WBS-TravelAssist.md`：

1. 确认父任务已建立 `2.13`；
2. 新增：

```text
2.14 | 全量素材清单 + S/M/L / 特殊尺寸衍生流水线 | A | P1 | 2.13 | 进行中 / 待审查
```

3. 如果 `2.14` 已被占用，使用下一个可用工程基础 ID，不覆盖已有行；
4. 在 Task 追踪表新增 `TASK-013.1-A`；
5. 正式启动为 `进行中`；
6. 实现完成、PR 未合并为 `待审查`；
7. 只有 PR 合并并验收通过才为 `已完成`；
8. 记录 Issue、Task、Branch、Commit、PR、Result。

### 19.2 Issue #116

开始时评论：

- parent prerequisite result；
- actual develop SHA；
- merged parent PR；
- branch；
- conflict audit；
- source baseline count；
- scope confirmation。

完成时评论：

- all source count；
- eligible count；
- S/M/L resolution；
- special variants；
- aliases / unavailable；
- generated bytes；
- errors；
- validations；
- WBS；
- commits；
- Draft PR。

### 19.3 Result

创建：

```text
docs/tasks/RESULT-TASK-013.1-a-asset-catalog-derivatives.md
```

必须使用第 21 节格式。

---

## 20. Commit / Push / PR

建议提交拆分：

```text
chore(TASK-013.1-A): add full asset source catalog
feat(TASK-013.1-A): add size profiles and derivative pipeline
feat(TASK-013.1-A): generate responsive asset variants
test(TASK-013.1-A): verify derivatives and unattended resume
chore(TASK-013.1-A): add reports result and WBS tracking
```

要求：

```bash
git status --short
git diff --check
git push origin feature/a-asset-catalog-derivatives
```

创建：

```text
feature/a-asset-catalog-derivatives → develop
```

的 Draft PR。

PR 必须：

- 标题带 `[TASK-013.1-A]`；
- 关联 `#116`；
- 记录父任务 `#112`；
- 列出 source / variant 数量；
- 列出 rights / no-upscale / original-protection 结果；
- 列出验证；
- 标明 generated 总字节；
- 保持 Draft；
- 不自动 merge。

如果仓库 workflow 可能自动合并，必须确认 Draft 状态确实阻止自动合并。

---

## 21. Result 文件格式

```md
# TASK-013.1-A Result

## Status
Completed / Blocked / Partial

## Prerequisite
- TASK-013-A Issue
- Parent PR
- Parent merge SHA
- Parent Result on develop
- Parent WBS status

## Tracking
- Issue
- WBS
- Branch
- Base SHA
- Develop SHA at execution
- Commit(s)
- Draft PR

## Conflict Audit
- Open tasks / PRs checked
- Shared files
- Resolution

## Full Asset Inventory
- scanned source count
- catalog source count
- runtime source
- design source
- preview / docs source
- referenced
- orphan
- unknown review
- protected
- duplicates
- total source bytes

## Eligibility
- eligible raster
- ineligible by reason
- SVG
- animated
- video
- font
- provider-only / acquisition-required

## S / M / L
- sm physical / alias / unavailable
- md physical / alias / unavailable
- lg physical / alias / unavailable
- no-upscale proof

## Special Profiles
- expected by profile
- physical
- alias / fallback
- review-required
- unavailable

## Vector Tokens
- icons
- markers
- illustrations

## Generated Output
- physical file count
- generated bytes
- largest files
- soft / hard budget
- output root

## Rights / Privacy
- rights blocked
- derivative permission
- metadata stripping
- GPS result
- AI / illustrative labels

## Original Protection
- source modified
- deleted
- renamed
- protected SHA changed

## Nightly Behavior
- concurrency
- checkpoint
- retry
- resume
- first run
- second no-op run
- lock test

## Reports
- checklist
- usage
- matrix
- orphan
- duplicate
- missing
- oversize
- focal review
- errors
- review HTML

## Validation
- npm ci
- npm audit
- assets:catalog
- assets:derive
- assets:verify-variants
- assets:review
- assets:nightly first
- assets:nightly second
- test:asset-variants
- assets:validate / test:assets
- lint
- typecheck
- format
- build
- diff-check

## Files Changed

## WBS Update

## Follow-ups

## Known Limitations
```

不得只写 “all passed”。所有数量和命令必须是真实输出。

---

## 22. Definition of Done

- [ ] TASK-013-A 已合并、Issue / WBS / Result 一致；
- [ ] 最新 develop 已安全同步；
- [ ] 全量 source 扫描覆盖率 100%；
- [ ] JSON / CSV / Markdown 清单完成；
- [ ] Usage Map 完成；
- [ ] 所有 eligible raster 有 S/M/L 逻辑结果；
- [ ] 所有适用 special profile 有明确 physical / alias / review / unavailable 状态；
- [ ] SVG vector tokens 完成；
- [ ] `sharp` 精确锁定，未新增其他依赖；
- [ ] 不存在 upscale；
- [ ] 不存在 rights 不合格 derivative；
- [ ] source / protected 文件零改动；
- [ ] checkpoint / resume / skip unchanged / lock / retry 完成；
- [ ] 第二次完整运行为 no-op；
- [ ] 体积预算通过；
- [ ] 全部报告和 review HTML 完成；
- [ ] tests / lint / typecheck / build 完成；
- [ ] format 真实记录；
- [ ] WBS 更新；
- [ ] Result 提交；
- [ ] Issue #116 更新；
- [ ] Branch push；
- [ ] Draft PR 创建；
- [ ] 未自动 merge。

---

## 23. Blocked / Partial 规则

### Blocked

可标记 Blocked：

- TASK-013-A 未合并或追踪不一致；
- 父任务素材 Schema 缺失或损坏；
- 活动 PR 正在修改同一高冲突路径且无法安全合并；
- 工作区用户文件无法安全隔离；
- `sharp` 无法在锁定 Node/npm 环境安装或运行；
- source 保护审计发现无法解释的原图变化；
- generated 预计超过 100 MiB 且没有已批准存储方案；
- GitHub 权限不足导致无法 push / 创建 Draft PR。

### Partial

仅当大部分处理成功、但少量非必需 source 因损坏或安全阈值被隔离时可标记 Partial。必须：

- Catalog 覆盖仍为 100%；
- 每个失败项有 errorCode；
- 原图未改；
- 必需 runtime assets 不缺；
- Issue 保持 Open；
- 不声称完整完成。

以下不是 blocker：

- 某些网络图片尚未采购；
- provider-only 没有本地二进制；
- 某些低分辨率素材无法生成精确大图；
- 某些 SVG 没有三份物理文件；
- 某些特殊裁切需要人工复核。

这些情况应通过 alias、fallback、unavailable、review queue 和报告正常处理。
