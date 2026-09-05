# TravelAssist — WBS 5.1 Personal Center 视觉素材审计

> 审计对象：`develop`
> WBS：5.1 — Personal Center Shell / Navigation
> 设计依据：1.21 / 1.22 / `docs/ui/design-system.md`

## 结论

WBS 5.1 不需要重新设计页面，也不需要为所有 UI 元素制作位图。

### 已有且可继续使用

| 素材 | GitHub 路径 | 状态 |
|---|---|---|
| Sidebar 鸟居水景插画 | `public/media/personal-center/sidebar-torii-watercolor.svg` | 已有正式运行时素材 |
| Sidebar 鸟居设计源 | `assets/design/personal-center/sidebar-torii-watercolor.svg` | 已有 |
| Home poster（仅 Mock 内容临时复用） | `public/media/home/home-hero-poster.webp` | 已有，但不属于 5.1 正式 Shell 素材 |

## 真正缺失的 5.1 正式素材

### 1. Personal Center 主内容背景纹理

新增建议路径：

`public/media/personal-center/personal-center-surface-texture.svg`

设计源建议路径：

`assets/design/personal-center/personal-center-surface-texture.svg`

视觉内容严格继承冻结设计：

- 暖米白 / 象牙白基底
- 极淡和纸颗粒
- 淡粉水彩云雾
- 少量花瓣
- 局部、极低对比青海波
- 极少量暖金粉点

明确禁止：

- 富士山大背景
- 大鸟居大背景
- 寺庙 / 五重塔
- 书法 / 标语 / 装饰文字
- 高饱和日式符号堆叠

## 不应制作成图片的项目

这些继续由 Codex 使用组件 / inline SVG / CSS / Design Token：

- 五个一级导航图标
- Notification 图标
- Avatar placeholder / avatar shell
- Chevron
- Button / Card / Badge
- Active / Hover / Focus 状态
- Border / Shadow / Radius
- Shell 布局和尺寸
- 更多功能模块的小图标

## 暂不在 WBS 5.1 冻结的素材

### TravelAssist 正式 Logo

设计文档要求显示 TravelAssist 品牌标志，但仓库当前没有已经冻结的正式 Logo 资产。

因此 WBS 5.1 **不得自行设计新 Logo**。在 Logo 专项冻结前，Codex只能沿用现有品牌文字/现有代码标志，不得创造新品牌图形。

### 旅行照片

Next Trip / My Trips 当前属于 Mock 内容。正式目的地照片应由 Trips / Profile / 实际内容任务拥有。

WBS 5.1 不应为了填 Mock 卡片而把伊豆、海岸慢游、周末小旅行照片冻结为全局品牌资产。

## 推荐 GitHub 目录

```text
public/media/personal-center/
├── sidebar-torii-watercolor.svg
├── personal-center-surface-texture.svg
└── README.md

assets/design/personal-center/
├── sidebar-torii-watercolor.svg
├── personal-center-surface-texture.svg
└── README.md
```

## Codex 责任边界

素材上传后 Codex 只负责：

1. 引用指定素材路径。
2. 按 1.21 / 1.22 还原布局和裁切。
3. 保持既有 Design Token / CSS 状态系统。
4. 验证 1920×1080、1440×900、1280×720。

Codex 不得：

- 重新设计图案；
- 更换背景主题；
- 自行生成新插画；
- 设计新 Logo；
- 把导航/按钮制作成图片；
- 为 Mock Trip 自行搜索或生成目的地照片。
