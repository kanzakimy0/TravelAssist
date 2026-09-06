# TravelAssist 全量素材清单与尺寸衍生规范

> 文档版本：v1.0  
> 冻结日期：2026-09-06  
> 状态：待 `TASK-013-A` 合并后实施  
> Owner：A（共享基础设施）  
> 关联任务：`TASK-013.1-A` / Issue `#116`  
> 前置任务：`TASK-013-A` / Issue `#112`

---

## 1. 决策摘要

TravelAssist 素材体系继续沿用此前冻结的三层策略：

```text
L1 全局通用素材
→ L2 首发目的地素材包
→ L3 长尾 POI 按需补齐
```

本阶段增加两个能力：

1. **全量素材清单**：仓库内所有视觉素材都必须进入可查询清单；
2. **尺寸衍生体系**：符合授权与技术条件的本地栅格素材生成 `S / M / L` 三档通用尺寸，并按真实使用场景生成特殊尺寸。

重要约束：

- “所有素材进入清单”不等于“所有文件都复制三份”；
- SVG、图标、Marker 和多数占位插画保留一个矢量源，通过显示尺寸 Token 使用；
- GIF / 动画默认只登记，不破坏动画生成静态副本；
- 未确认授权、禁止缓存或禁止衍生的素材只登记，不生成衍生图；
- 不放大低分辨率原图；不足目标尺寸时建立逻辑 alias / fallback；
- 原始素材永不被流水线覆盖；
- 全部生成物写入独立目录，可删除重建；
- 本阶段不接入外部图片 Provider，不下载网络图片；
- 大量照片最终应进入对象存储 / CDN，本阶段只为现有仓库素材建立可迁移结构。

---

## 2. 与 TASK-013-A 的关系

`TASK-013-A` 负责：

- 素材库目录；
- Asset Manifest；
- 权利与真实性字段；
- 64 项通用 SVG；
- 5 个日本试点目的地 Pack；
- fallback；
- inventory / validate / index 基础。

`TASK-013.1-A` 负责：

- 将 inventory 扩展为仓库级全量素材清单；
- 建立尺寸 Profile；
- 生成栅格衍生物；
- 建立 SVG 显示尺寸 Token；
- 建立用途到尺寸的映射；
- 建立断点续跑与跳过未变化素材；
- 生成缺失尺寸、孤儿、重复、超限和处理错误报告；
- 为页面后续接入提供 TypeScript 查询 API，但不修改现有页面。

前置合并是硬条件：

```text
TASK-013-A PR merged into develop
AND Issue #112 acceptance complete
AND develop contains TASK-013-A Result
```

前置未满足时，后续 Task 不轮询、不等待、不在旧 Schema 上实现，直接返回准确的 `Blocked`。

---

## 3. “全量素材”的定义

### 3.1 必须扫描

```text
public/**
assets/design/**
docs/** 中被 Markdown / HTML 引用的本地视觉文件
src/** 中 import、require、new URL、CSS url()、字符串形式的 /media/ 引用
根目录及 app 目录中的 favicon / icon / manifest 相关素材
```

### 3.2 文件类型

至少识别：

```text
.svg
.png
.jpg
.jpeg
.webp
.avif
.gif
.ico
.bmp
.tif
.tiff
.mp4
.webm
.mov
.lottie
.woff
.woff2
```

JSON 仅在明确识别为 Lottie、Manifest 或素材配置时归入素材系统，普通业务 JSON 不算素材。

### 3.3 排除

```text
.git/**
node_modules/**
.next/**
coverage/**
dist/**
build/**
tmp/**
.cache/**
public/media/generated/**（作为 variant 扫描，不再次作为 source）
```

### 3.4 清单分类

每个源素材必须归入一种：

```text
runtime-source
brand-source
design-source
preview-only
documentation-only
legacy-protected
provider-reference
generated-variant
unknown-review-required
```

---

## 4. 清单交付物

在 `TASK-013-A` Catalog 基础上新增：

```text
docs/assets/catalog/
├─ asset-source-catalog.v1.json
├─ asset-source-catalog.v1.csv
├─ asset-size-profiles.v1.json
├─ asset-variants.v1.json
├─ asset-usage-map.v1.json
└─ asset-processing-policy.v1.json

docs/assets/generated/
├─ all-assets-checklist.md
├─ asset-variant-matrix.md
├─ asset-usage-report.md
├─ missing-variants.md
├─ orphan-assets.md
├─ duplicate-report.md
├─ oversize-assets.md
├─ focal-point-review.md
├─ asset-processing-errors.csv
└─ nightly-run-summary.md
```

### 4.1 Source Catalog 字段

每个源文件至少记录：

```text
sourceId
assetId（能映射 Manifest 时）
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

### 4.2 Variant Catalog 字段

每个逻辑或物理尺寸至少记录：

```text
variantId
assetId
sourceId
profileId
kind = physical | alias | vector-token | source-provided | unavailable
path
format
width
height
bytes
sha256
fit
crop
focalPointApplied
focalPointDefaulted
quality
sourceSha256
profileVersion
runtimeUsable
status
errorCode
```

### 4.3 Usage Map 字段

```text
assetId / sourcePath
referenceType
route
component
sourceFile
line（可安全确定时）
usageRole
expectedProfile
resolved
```

清单必须稳定排序，禁止每次运行产生无意义重排。

---

## 5. 通用 S / M / L 栅格尺寸

通用尺寸用于响应式加载、详情页、普通卡片和低带宽降级。它们**保留源图比例，不裁切**。

| Profile | 中文 | 最大边界 | Fit | 放大 | 默认输出 | 默认质量 | 主要用途 |
|---|---|---:|---|---|---|---:|---|
| `sm` | 小 | `480×480` | inside | 禁止 | WebP | 74 | 搜索列表、地图轻量预览、低带宽 |
| `md` | 中 | `960×960` | inside | 禁止 | WebP | 78 | 默认卡片、侧栏、普通详情 |
| `lg` | 大 | `1600×1600` | inside | 禁止 | WebP | 82 | 桌面详情、大面板、放大查看 |

处理顺序：

```text
读取源图
→ EXIF auto-orient
→ 转换到 sRGB
→ 移除 EXIF / GPS / 非必要 metadata
→ inside resize
→ withoutEnlargement
→ 写入临时文件
→ 校验尺寸 / SHA / 体积
→ atomic rename
```

### 5.1 不足目标尺寸

例如源图只有 `640×400`：

- `sm` 可生成实际小图；
- `md` 不放大，允许生成不超过源尺寸的标准化文件；
- `lg` 建立到最大可用 variant 的 alias；
- Catalog 中三个逻辑 Profile 都必须可解析，但不允许保存三份相同二进制来凑数。

### 5.2 格式规则

- 不透明摄影图：WebP；
- 透明栅格：WebP alpha，出现不可接受失真时允许 PNG；
- `share-og`：JPEG，确保社交平台兼容；
- 品牌 / App 图标：PNG；
- SVG 保持 SVG，不生成普通 S/M/L 栅格副本；
- 原始格式始终保留在 source path。

---

## 6. 特殊尺寸 Profile

特殊尺寸用于有明确构图和比例要求的界面。特殊裁切必须读取 `focalPoint`；缺失时允许中心裁切生成预览，但标记 `focalPointDefaulted=true` 和 `review_required`。

| Profile ID | 尺寸 | 比例 / Fit | 格式 | 用途 |
|---|---:|---|---|---|
| `hero-desktop` | `1920×1080` | 16:9 cover | WebP | 城市 / 目的地桌面 Hero、详情头图 |
| `hero-mobile` | `1080×1440` | 3:4 cover | WebP | 手机目的地 Hero |
| `background-desktop` | `2560×1440` | 16:9 cover | WebP | 首页、Step 1–5、全屏背景 |
| `background-mobile` | `1080×1920` | 9:16 cover | WebP | 手机全屏背景、未来 App |
| `region-tile` | `800×600` | 4:3 cover | WebP | 城市区域 / 街区选择卡 |
| `card-landscape` | `960×640` | 3:2 cover | WebP | 景点、酒店、餐厅主卡片 |
| `card-wide` | `640×360` | 16:9 cover | WebP | 横向推荐条、紧凑卡片 |
| `card-square` | `720×720` | 1:1 cover | WebP | 宫格、收藏、移动端方卡 |
| `map-popup` | `640×360` | 16:9 cover | WebP | 地图地点弹窗 |
| `map-pin-thumb` | `128×128` | 1:1 cover | WebP | 带照片的 POI Pin / Cluster 预览 |
| `timeline-thumb` | `480×320` | 3:2 cover | WebP | 行程时间轴缩略图 |
| `search-thumb` | `240×160` | 3:2 cover | WebP | 搜索建议与小列表 |
| `share-og` | `1200×630` | 约 1.91:1 cover | JPEG | 行程 / 目的地分享图 |
| `favicon-32` | `32×32` | contain | PNG | 浏览器 favicon |
| `apple-touch-180` | `180×180` | contain + safe area | PNG | Apple Touch Icon |
| `pwa-192` | `192×192` | contain + safe area | PNG | PWA Icon |
| `pwa-512` | `512×512` | contain + safe area | PNG | PWA / App Icon |

特殊尺寸只对适用角色生成，禁止每张照片生成所有 Profile。

---

## 7. 素材角色与尺寸映射

| Asset Role | S/M/L | 特殊尺寸 |
|---|---|---|
| `home_background` | 是 | `background-desktop`, `background-mobile` |
| `wizard_background` | 是 | `background-desktop`, `background-mobile` |
| `destination_hero` | 是 | `hero-desktop`, `hero-mobile`, `share-og` |
| `region_cover` | 是 | `region-tile`, `card-landscape`, `card-square` |
| `poi_photo` | 是 | `card-landscape`, `card-wide`, `card-square`, `map-popup`, `map-pin-thumb`, `timeline-thumb`, `search-thumb` |
| `hotel_photo` | 是 | `card-landscape`, `card-wide`, `card-square`, `map-popup`, `timeline-thumb`, `search-thumb` |
| `restaurant_photo` | 是 | `card-landscape`, `card-wide`, `card-square`, `map-popup`, `timeline-thumb`, `search-thumb` |
| `activity_photo` | 是 | `card-landscape`, `card-wide`, `card-square`, `map-popup`, `timeline-thumb`, `search-thumb` |
| `trip_share_cover` | 是 | `share-og` |
| `profile_cover` | 是 | `card-wide`, `background-mobile`（明确需要时） |
| `brand_mark` | 否，优先 SVG | `favicon-32`, `apple-touch-180`, `pwa-192`, `pwa-512` |
| `ui_icon` | vector token | 见第 8 节 |
| `transport_icon` | vector token | 见第 8 节 |
| `poi_category_icon` | vector token | 见第 8 节 |
| `map_marker` | vector token | 见第 8 节 |
| `placeholder` | vector token；若为 raster 则 S/M/L | 使用角色对应尺寸 |
| `state_illustration` | vector token；若为 raster 则 S/M/L | `state-panel` |
| `animated_asset` | 只登记 | 默认不生成 |
| `video` | 只登记 | poster 另有明确源时才登记，不自动截帧 |
| `font` | 只登记 | 不生成尺寸 |

`assetRole=unknown` 时只进入清单和 review queue，不自动推断大量特殊尺寸。

---

## 8. SVG 与显示尺寸 Token

SVG 不复制为 `sm.svg / md.svg / lg.svg`。使用一个 source + 显示尺寸规则。

### 8.1 UI / POI / 交通图标

| Token | CSS 尺寸 | 用途 |
|---|---:|---|
| `icon-sm` | `16×16` | 行内、辅助信息、紧凑列表 |
| `icon-md` | `24×24` | 默认按钮、筛选项、卡片 |
| `icon-lg` | `32×32` | 强调入口、空状态小图标 |
| `icon-special-map-control` | `20×20` | 地图控制按钮 |
| `icon-special-navigation` | `18×18` | Header / Bottom Navigation |
| `icon-special-feature` | `40×40` | 功能说明或引导 |

### 8.2 地图 Marker

| Token | CSS 尺寸 | 用途 |
|---|---:|---|
| `marker-sm` | `24×30` | 高密度地图 / 远景 |
| `marker-md` | `32×40` | 默认 POI Marker |
| `marker-lg` | `40×50` | 当前日 / 强调地点 |
| `marker-selected` | `48×60` | 已选择地点 |
| `marker-cluster` | `44×44` | 聚合 Marker |

Marker 的 selected / warning / error 不得只依靠尺寸和颜色区分，还需 glyph 或轮廓差异。

### 8.3 占位与状态插画

| Token | CSS 尺寸 | 用途 |
|---|---:|---|
| `illustration-sm` | `120×120` | 小卡片 / 小弹窗 |
| `illustration-md` | `200×200` | 侧栏 / 空列表 |
| `illustration-lg` | `320×320` | 页面级空状态 |
| `state-panel` | 最大 `480×360` | 大型错误 / 离线状态 |

这些 Token 写入 `asset-size-profiles.v1.json` 并由 TypeScript API 返回。

---

## 9. 输出目录与命名

### 9.1 生成目录

```text
public/media/generated/v1/
└─ {asset-path-key}/
   ├─ sm.webp
   ├─ md.webp
   ├─ lg.webp
   ├─ hero-desktop.webp
   ├─ hero-mobile.webp
   └─ ...
```

`asset-path-key` 必须：

- 由稳定 `assetId` 派生；
- 小写 kebab-case；
- 不使用随机 UUID；
- 不包含中文、空格或文件扩展名；
- 不因源文件移动而轻易改变；
- 与 Manifest 中 assetId 保持一一映射。

### 9.2 原图规则

- existing source path 不改；
- generated 目录可完全重建；
- 流水线不得在原图旁边散落 `_small`、`-copy`、`final2`；
- 所有输出先写 `.tmp`，通过校验后 atomic rename；
- 失败时不得留下半文件。

### 9.3 Alias

Alias 只写进 `asset-variants.v1.json`，不复制物理文件：

```json
{
  "variantId": "asset.example:lg",
  "profileId": "lg",
  "kind": "alias",
  "aliasOf": "asset.example:md",
  "reason": "source-too-small-no-upscale"
}
```

---

## 10. 衍生资格判定

只有同时满足以下条件才生成本地栅格衍生物：

```text
runtime.kind = local
source file exists
supported raster format
status = approved
cacheAllowed = true
derivativesAllowed = true
not rejected / expired / acquisition_required / provider_only
not animated（除非另有明确策略）
source file ≤ 50 MiB
source pixels ≤ 80 megapixels
assetRole has a defined policy
```

以下只登记，不生成：

- 许可不明；
- `legacy_review_required`；
- 仅 Provider 引用；
- 来源文件缺失；
- 动画；
- 视频；
- 字体；
- 超过安全阈值；
- 无法解码；
- rights 禁止缓存或衍生。

处理被阻止时必须给出机器可读 `processingBlockReason`，不得静默跳过。

---

## 11. 图像处理细则

### 11.1 Crop 与焦点

`cover` 特殊尺寸：

1. 优先使用 manifest focalPoint；
2. 有 safeArea 时，裁切不得切掉 safeArea；
3. 无 focalPoint 时中心裁切，但标记 review；
4. 不使用未经审核的自动人脸识别；
5. 不自动把一个横图强行生成所有竖图并直接设为 approved。

### 11.2 隐私与 Metadata

生成物必须：

- 移除 GPS；
- 移除相机序列号、作者私密字段和编辑软件历史；
- 保留必要的 sRGB 色彩信息；
- 不在输出文件名或 metadata 中写本地绝对路径。

### 11.3 确定性

相同的：

```text
source SHA
+ profile version
+ focal point
+ safe area
+ output format / quality
+ processor version
```

必须得到相同输出。Canonical JSON 不写每次变化的随机时间；运行时间只写入 Summary。

---

## 12. 夜间无人值守执行模型

入口：

```bash
npm run assets:nightly
```

固定阶段：

```text
00 preflight
01 dependency / schema check
02 full source inventory
03 code usage scan
04 eligibility resolution
05 S/M/L generation
06 special profile generation
07 catalog / alias generation
08 integrity / size / rights verification
09 HTML review index
10 tests / lint / typecheck / build
11 Result / WBS / Git summary
```

### 12.1 无人值守规则

- 不要求用户逐文件确认；
- 不发起网络请求；
- 不自动修改授权状态；
- 单文件失败记录后继续处理其他文件；
- 必需输出失败时最终退出码非 0；
- 不无限重试；每项最多重试 1 次；
- 每处理 25 个 source 输出一次进度；
- 每完成一个 source 写 checkpoint；
- 进程中断后可使用 `--resume`；
- source SHA / policy 未变化时跳过；
- 只有显式 `--rebuild` 才重建未变化输出；
- 不自动 prune 未知文件；只报告 stale variants；
- lock 文件防止两个流水线同时运行；
- stale lock 只在明确超过 12 小时且进程不存在时解除。

### 12.2 并发与资源

默认：

```text
concurrency = 2
allowed range = 1..4
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

环境变量只控制运行，不得改变版权和衍生资格规则。

### 12.3 Checkpoint / Cache

本地非提交目录：

```text
.cache/asset-pipeline/
tmp/assets-nightly/
```

至少保存：

```text
run id
profile version
source cursor
completed source SHA
failed source / profile
retry count
temporary output
```

完成后提交精简 Summary，不提交巨大的逐像素日志。

---

## 13. 体积预算

### 13.1 单文件预算

| Profile | 目标 | 硬上限 |
|---|---:|---:|
| `sm` | ≤ 120 KB | 200 KB |
| `md` | ≤ 260 KB | 450 KB |
| `lg` | ≤ 550 KB | 900 KB |
| `search-thumb` | ≤ 50 KB | 90 KB |
| `map-pin-thumb` | ≤ 35 KB | 70 KB |
| `map-popup` | ≤ 120 KB | 220 KB |
| `timeline-thumb` | ≤ 90 KB | 160 KB |
| `card-*` | ≤ 220 KB | 400 KB |
| `hero-*` | ≤ 450 KB | 800 KB |
| `background-*` | ≤ 700 KB | 1.2 MB |
| `share-og` | ≤ 450 KB | 700 KB |
| PWA / Touch Icon | ≤ 250 KB | 500 KB |

含透明、高细节或特殊压缩困难素材允许进入 exception report，但不得无说明超限。

### 13.2 整批预算

```text
Soft warning: 新增 generated 总量 > 50 MiB
Hard stop before commit: 新增 generated 总量 > 100 MiB
Single Git object hard guard: 20 MiB
```

超过 hard stop：

- 完成全部 catalog / size report；
- 不静默删除已要求的 variant；
- 不强行提交超大目录；
- Result 返回 Blocked 或 Partial，并提出对象存储 / Git LFS 后续 Task。

---

## 14. 程序接口

在 `src/data/assets/` 增加或扩展：

```ts
getAssetSource(assetId)
getAssetVariant(assetId, profileId)
getResponsiveAsset(assetId, context)
getResponsiveImageProps(assetId, context)
getVectorDisplaySize(assetId, sizeToken)
listMissingVariants()
listAssetUsages(assetId)
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

本 Task 只交付 API 与测试，不在页面中批量替换 `img` / `Image`。

---

## 15. 处理脚本

建议目录：

```text
tools/assets/
├─ build-full-catalog.mjs
├─ scan-asset-usages.mjs
├─ generate-asset-derivatives.mjs
├─ verify-asset-derivatives.mjs
├─ generate-variant-review.mjs
├─ run-assets-nightly.mjs
└─ lib/
   ├─ catalog.mjs
   ├─ image-processor.mjs
   ├─ profiles.mjs
   ├─ checkpoint.mjs
   ├─ rights.mjs
   └─ reporting.mjs
```

允许新增**一个直接图像处理依赖**：`sharp`。

要求：

- 作为直接 devDependency 或项目决定的直接 dependency 固定精确版本；
- 记录 license 与安装结果；
- 不依赖系统 ImageMagick；
- 不再额外引入 glob、CSV、队列等第三方包，递归扫描与 CSV 可用 Node 内置模块实现；
- 若 `sharp` 与锁定 Node 环境不兼容，准确返回 blocker，不退回不可复现的系统命令。

Package scripts：

```text
assets:catalog
assets:derive
assets:verify-variants
assets:review
assets:nightly
assets:nightly:resume
test:asset-variants
```

不得删除 `TASK-013-A` 或既有 scripts。

---

## 16. 审查页面

生成静态审查文件，不建立正式 App route：

```text
assets/design/asset-library/previews/variant-review.html
```

每个 eligible asset 显示：

- source；
- S / M / L；
- 适用特殊尺寸；
- 尺寸、字节、格式；
- focal point；
- rights / authenticity / status；
- default-center crop 警告；
- missing / failed / alias 状态。

页面使用相对路径，不访问网络，不依赖 CDN。

---

## 17. 验证规则

自动验证至少覆盖：

- 所有扫描到的 source 在清单中唯一出现；
- 所有 Manifest local path 能映射 source；
- 所有 eligible raster 有 `sm / md / lg` 三个逻辑解析结果；
- 不足尺寸使用 alias，不放大；
- 每个特殊 profile 只应用到允许的 assetRole；
- 所有 physical variant 文件存在；
- 实际尺寸、格式、bytes、SHA 与 Catalog 一致；
- 输出无 GPS / EXIF 私密字段；
- generated path 不与 source path 重叠；
- protected source SHA 未变化；
- generated 目录没有 source-of-source 递归；
- SVG 使用 vector token，不产生无意义三份副本；
- animated / video / font 未被错误处理；
- `provider_only / acquisition_required / rejected / expired` 无本地 derivative；
- alias 无循环；
- fallback 无循环；
- code usage 中引用不存在文件时进入 broken reference report；
- orphan / duplicate / oversize / focal review 报告生成；
- 同样输入二次执行为 no-op；
- 中断后 `--resume` 不重复已完成文件；
- 超过整批 hard limit 时禁止提交 generated 内容。

---

## 18. 完成定义

- [ ] `TASK-013-A` 已合并并通过验收；
- [ ] 仓库内全部视觉 source 已进入 JSON / CSV / Markdown 清单；
- [ ] 所有代码与文档引用已形成 Usage Map；
- [ ] 所有 eligible raster 具有 S/M/L 三个逻辑结果；
- [ ] 适用的特殊尺寸已生成；
- [ ] SVG S/M/L 与特殊尺寸 Token 已建立；
- [ ] 不存在低分辨率强制放大；
- [ ] 不存在来源或授权不合格的衍生文件；
- [ ] 原始 / protected 文件 SHA 未变化；
- [ ] Checkpoint、resume、skip unchanged、lock、retry 生效；
- [ ] 清单、矩阵、孤儿、重复、超限、错误和 review 报告完成；
- [ ] 静态 variant review 页面完成；
- [ ] 二次运行验证 no-op；
- [ ] assets pipeline tests、lint、typecheck、format、build 通过或准确记录既有例外；
- [ ] Result 与 WBS 更新；
- [ ] Branch push；
- [ ] Draft PR 创建；
- [ ] 未自动 merge。

---

## 19. 后续接入原则

后续页面接入单独开 Task，优先顺序：

```text
首页 / Step 背景
→ Planner 地图 Popup / Pin / 时间轴
→ 目的地与 POI 卡片
→ Personal Center 已有素材的只读接入
→ 分享图
→ Mobile App / 离线包
```

页面不得自行拼接 generated 路径；必须通过 Asset Registry / Variant API 获取。

当现有 Git 资产规模接近整批预算时，应优先建立：

```text
对象存储 + CDN
→ source upload
→ server-side derivative job
→ signed / public URL policy
→ cache invalidation
→ manifest versioning
```

本地与 CDN 使用相同 `assetId + profileId`，确保未来迁移不改业务组件接口。
