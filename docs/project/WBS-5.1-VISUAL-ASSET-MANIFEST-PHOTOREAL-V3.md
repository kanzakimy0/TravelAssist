# WBS 5.1 — Personal Center 写实素材包 v3 / Asset Manifest

> 本地交付包：`TravelAssist-PersonalCenter-Photoreal-v3.zip`  
> 解压目标：`F:\TravelAssist\`（项目根目录，与 `src`、`public` 同级）  
> 范围：补齐上一包 7 个装饰素材的摄影风格版本；不修改页面代码，不执行 5.2。  
> 状态：文件已准备并通过基本检查；待用户逐图视觉确认。不是已验收、已上线或逐像素还原。  
> 本包是本地交付，本轮不提交 GitHub、不更改任何 Task / WBS 状态。

## 1. 安装与保护现有文件

压缩包最外层直接是 `public/`、`assets/`、`docs/`，不带额外的包名文件夹。解压到项目根目录即可让素材落到指定位置。不要解压到 `public` 内，否则会形成 `public/public`。

所有 runtime 文件位于独立的新目录 `public/media/personal-center/photoreal-v3/`。本包不包含、不覆盖：

- `sidebar-torii-watercolor.svg` 及其已批准源文件；
- `personal-center-surface-texture.svg`；
- 当前京都 Hero、京都 / 大阪 / 北海道旅行照片；
- Logo、头像、`src/`、`package.json`、旧 Manifest 或 Master WBS。

**只解压完成的是“文件就位”，不是“页面已接入”。** 页面仍引用旧 SVG/PNG 时不会自动换图。后续由 Codex 根据本清单更新路径并截图验收，不得靠把 WebP 改扩展名为 SVG 来假装替换。

## 2. 视觉与来源说明

本包采用已有摄影风格原图的裁切、降饱和调色与透明度输出。没有把素材总览图上的缩略图当作生产图片，也不把位图标称为可编辑矢量图。

- `SRC-01`：本对话先前生成的独立鸟居 / 樱花 / 湖景摄影风格 AI 原图，原始文件 `a_wide_cinematic_photorealistic_landscape_scene.png`，1536×1024。原图已随包保存在 `assets/design/personal-center/photoreal-v3/sources/torii-sakura-lake-ai-source.png`。
- `SRC-02`：本对话先前生成的纸质背景中不含花枝、水彩装饰的中部材质裁切。该中部裁切已随包保存。输出进行了亮度归一及低对比处理。
- 来源性质：**AI 生成源图的衍生素材，不是实地摄影，不得作为真实景点建筑/地理关系的证明。**“写实”指摄影风格，不代表其为相机实拍。
- 未纳入任何来源不明的网络照片或付费图库预览。使用须遵循生成服务及账户所适用条款；本包不声称拥有独占版权，也不附加“保证零版权风险”的承诺。
- 本包 7 项是 Shell 与轻功能卡的装饰，同源裁切已在清单中标注。它们不是“4 张独立旅行照片”，不得用来替代用户已经在用的京都、大阪、北海道旅行封面。

## 3. 实测文件清单

| 文件名 | 尺寸 | 比例 | 格式 | 用途 |
|---|---|---|---|---|
| `sidebar-torii-photo.webp` | 960×960 | 1:1 | RGB / WEBP | 侧栏底部 SidebarArtwork |
| `personal-center-paper-surface.webp` | 1920×1080 | 16:9 | RGB / WEBP | PersonalCenterShell 主内容底层 / Main |
| `sidebar-sakura-photo-overlay.png` | 960×640 | 3:2 | RGBA / PNG | PersonalSidebar 顶部装饰层 |
| `personal-center-photo-corners.png` | 1920×1080 | 16:9 | RGBA / PNG | 主内容区边角装饰层 |
| `feature-card-inspiration-photo.png` | 800×400 | 2:1 | RGBA / PNG | 更多功能模块 / 旅行灵感卡片右侧 |
| `feature-card-favorites-photo.png` | 800×400 | 2:1 | RGBA / PNG | 更多功能模块 / 我的收藏卡片右侧 |
| `feature-card-discovery-photo.png` | 800×400 | 2:1 | RGBA / PNG | 更多功能模块 / 目的地探索卡片右侧 |

## 4. 逐项映射

### 01. sidebar-torii-photo.webp

- 项目相对路径：`public/media/personal-center/photoreal-v3/sidebar-torii-photo.webp`
- Runtime URL：`/media/personal-center/photoreal-v3/sidebar-torii-photo.webp`
- 使用位置：侧栏底部 SidebarArtwork
- 内容与文案：替换简化鸟居的候选照片版；只用于装饰，不是新的旅行目的地。
- 尺寸 / 比例：960×960 / 1:1
- Fit / Position：`contain` / `50% 100%`
- 裁切安全区：必须保留完整顶梁、两根立柱。图片为 1:1，容器不同宽高比时用 contain，底部对齐，不拉伸。
- 图层使用：无文字，不叠加正文。
- 来源：SRC-01；AI 原图衍生输出，见第 2 节。
- 用户确认：`Prepared / Awaiting visual approval`。用户已要求写实风格，但不把风格要求当作逐图验收。
- SHA-256：`ab1a6f7c7e10b40a0bf50f1b219cc8d47c5c2fcb1ba1f295ac397900a4e84739`

### 02. personal-center-paper-surface.webp

- 项目相对路径：`public/media/personal-center/photoreal-v3/personal-center-paper-surface.webp`
- Runtime URL：`/media/personal-center/photoreal-v3/personal-center-paper-surface.webp`
- 使用位置：PersonalCenterShell 主内容底层 / Main
- 内容与文案：替换过于纯色的底层视觉；自然纸质，无水彩图案。
- 尺寸 / 比例：1920×1080 / 16:9
- Fit / Position：`cover` / `50% 50%`
- 裁切安全区：可按内容区尺寸裁切；不要作为重复小贴图平铺。
- 图层使用：正文仍放在既有卡片表层。
- 来源：SRC-02；AI 原图衍生输出，见第 2 节。
- 用户确认：`Prepared / Awaiting visual approval`。用户已要求写实风格，但不把风格要求当作逐图验收。
- SHA-256：`39052b4e8d705ee278119c83720e67a84f16604ecea3f4d9da6f098dfd192f2c`

### 03. sidebar-sakura-photo-overlay.png

- 项目相对路径：`public/media/personal-center/photoreal-v3/sidebar-sakura-photo-overlay.png`
- Runtime URL：`/media/personal-center/photoreal-v3/sidebar-sakura-photo-overlay.png`
- 使用位置：PersonalSidebar 顶部装饰层
- 内容与文案：摄影风格樱花枝替换旧水彩樱花叠层。
- 尺寸 / 比例：960×640 / 3:2
- Fit / Position：`contain` / `0% 0%`
- 裁切安全区：定位侧栏左上；建议宽为侧栏宽度的 65%，最高不超过 120 CSS px。不得盖 Logo、头像、导航文字。
- 图层使用：有 alpha；建议整体 opacity 0.28。
- 来源：SRC-01；AI 原图衍生输出，见第 2 节。
- 用户确认：`Prepared / Awaiting visual approval`。用户已要求写实风格，但不把风格要求当作逐图验收。
- SHA-256：`b5d66613d15013944baee412ae09fd3a819c86d7b48d3b9f1ec36152363dbaa3`

### 04. personal-center-photo-corners.png

- 项目相对路径：`public/media/personal-center/photoreal-v3/personal-center-photo-corners.png`
- Runtime URL：`/media/personal-center/photoreal-v3/personal-center-photo-corners.png`
- 使用位置：主内容区边角装饰层
- 内容与文案：两侧下角真实质感花枝，替换水彩角框。
- 尺寸 / 比例：1920×1080 / 16:9
- Fit / Position：`contain` / `50% 100%`
- 裁切安全区：图案只在左右下角；中部留白。放在底层，不跟随每张卡片重复。
- 图层使用：已经内置低 alpha；整体 opacity 1，不再叠加旧角框。
- 来源：SRC-01；AI 原图衍生输出，见第 2 节。
- 用户确认：`Prepared / Awaiting visual approval`。用户已要求写实风格，但不把风格要求当作逐图验收。
- SHA-256：`1b83f69b40c888576275ee461b1687f20f584dde873f6d10d4bedac8edb271d2`

### 05. feature-card-inspiration-photo.png

- 项目相对路径：`public/media/personal-center/photoreal-v3/feature-card-inspiration-photo.png`
- Runtime URL：`/media/personal-center/photoreal-v3/feature-card-inspiration-photo.png`
- 使用位置：更多功能模块 / 旅行灵感卡片右侧
- 内容与文案：山景细节；替换水彩山景装饰，不引入目的地文案。
- 尺寸 / 比例：800×400 / 2:1
- Fit / Position：`contain` / `100% 100%`
- 裁切安全区：全画布左侧 0–48% 完全透明；不要裁掉左侧留白再放大图案。
- 图层使用：左侧为标题、图标、说明区；整体 opacity 1。
- 来源：SRC-01；AI 原图衍生输出，见第 2 节。
- 用户确认：`Prepared / Awaiting visual approval`。用户已要求写实风格，但不把风格要求当作逐图验收。
- SHA-256：`aed915cc75cce36f51fde8830a6259756f2f14a1fe6c4c12defea1bbfaffee2c`

### 06. feature-card-favorites-photo.png

- 项目相对路径：`public/media/personal-center/photoreal-v3/feature-card-favorites-photo.png`
- Runtime URL：`/media/personal-center/photoreal-v3/feature-card-favorites-photo.png`
- 使用位置：更多功能模块 / 我的收藏卡片右侧
- 内容与文案：鸟居照片细节，替换水彩鸟居背景。
- 尺寸 / 比例：800×400 / 2:1
- Fit / Position：`contain` / `100% 100%`
- 裁切安全区：全画布左侧 0–59% 完全透明；只装饰右侧。
- 图层使用：已内置低 alpha；整体 opacity 1。
- 来源：SRC-01；AI 原图衍生输出，见第 2 节。
- 用户确认：`Prepared / Awaiting visual approval`。用户已要求写实风格，但不把风格要求当作逐图验收。
- SHA-256：`eb1fb65a0d13fdf2a8ff8bc9ecf33afdf6fcdea51c171206a53ad438c5e21d9b`

### 07. feature-card-discovery-photo.png

- 项目相对路径：`public/media/personal-center/photoreal-v3/feature-card-discovery-photo.png`
- Runtime URL：`/media/personal-center/photoreal-v3/feature-card-discovery-photo.png`
- 使用位置：更多功能模块 / 目的地探索卡片右侧
- 内容与文案：本版为摄影质感樱花枝，不是上版水彩枫叶；这一主题细节仍需用户确认。
- 尺寸 / 比例：800×400 / 2:1
- Fit / Position：`contain` / `100% 50%`
- 裁切安全区：全画布左侧 0–52% 完全透明；不侵占标题。
- 图层使用：已内置低 alpha；整体 opacity 1。
- 来源：SRC-01；AI 原图衍生输出，见第 2 节。
- 用户确认：`Prepared / Awaiting visual approval`。用户已要求写实风格，但不把风格要求当作逐图验收。
- SHA-256：`6c3b79f48041442632773297796305739b7c6cfbcdfd0b3543d5d44bc3ae48a8`

## 5. 背景、Avatar 与代码视觉的决定

| 项目 | 本包决定 |
|---|---|
| 主背景 | 使用 `personal-center-paper-surface.webp` 作纹理底层；CSS 继续提供暖米白 fallback。角落装饰用独立透明 PNG。不可再把旧水彩底图叠上去。 |
| 鸟居 | 新照片为可选替换版本，老 SVG 保留。用户确认本版后再修改引用，绝不覆盖删除已批准 SVG。 |
| Avatar | `Deferred`；沿用现有用户头像，由 Profile / Account 管理。不生成替身头像。 |
| 更多功能模块 | 仅右侧照片装饰；图标、标题、按钮仍是代码组件。探索卡本版是樱花，不是枫叶，待确认。 |
| 导航 / 铃铛 / 按钮 / Focus | 继续代码 Icon / CSS；禁止烘焙进图片。 |
| Hero 与三张旅行封面 | `Keep existing`；当前实现已有照片，本轮不再生成或覆盖。 |

## 6. 接入层级与固定参数

Main 的纸质底图在最底层，角落 PNG 在纸质底图之上、全部卡片/文字之下。Sidebar 的樱花层不得覆盖导航和身份信息。所有装饰层均不可拦截点击；使用空 alt 或 `aria-hidden`。

功能卡 PNG 已内置低 alpha，按整体 opacity 1 使用，不叠加第二次大幅淡化；卡片文字放在左侧透明区域。Sidebar 樱花则以整体 opacity 0.28 为初始值，不让真实花枝压住 Logo。

照片由低分辨率源图裁切的装饰细节，不适合放大为全屏景点背景。功能卡装饰建议在 120–220 CSS px 高度内使用。鸟居保留整个 1:1 画面，不能为了填满超窄竖框裁掉顶梁。

## 7. 视觉还原限制

资产无法自动修复布局差异。当前实现与概念图的 Sidebar 头像位置、留白、Hero 高度、字体、按钮、卡片高度等仍需代码按已确认视觉稿还原。不要将“素材放入文件夹”标记为“视觉完全还原”。

优先级保持：**用户确认视觉稿 → 本版经确认的 Asset Manifest → 1.21 / 1.22 设计文档 → 当前代码**。遇到本清单未决定的版式细节，保留并提交差异，不允许 Codex 自行重新设计。

## 8. 已执行检查与未执行检查

已检查：文件可解码；尺寸与真实格式匹配；5 张 PNG 有有效透明通道；功能卡左側文字区透明；ZIP 根路径安全且没有额外包名目录；无页面代码、Task 和 WBS 主表；ZIP CRC 检查。

未执行：用户本地 Next.js 页面接入、浏览器截图验收、完整视觉稿逐像素对比、性能和可访问性回归。这些是接入后的验证，不在本素材交付中冒称完成。

## 9. 预览与文件校验

实际导出文件总览：`assets/design/personal-center/photoreal-v3/previews/asset-contact-sheet.jpg`。透明通道浅深底检查：`assets/design/personal-center/photoreal-v3/previews/alpha-check.jpg`。

机器可读清单：`assets/design/personal-center/photoreal-v3/asset-manifest.json`。整个包的校验列表：`assets/design/personal-center/photoreal-v3/SHA256SUMS.txt`。
