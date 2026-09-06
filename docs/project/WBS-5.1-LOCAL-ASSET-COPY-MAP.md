# Personal Center 本地复制素材包

解压后，将压缩包内的 `TravelAssist` 目录内容复制到：

`F:\TravelAssist\`

## 对应路径

```text
F:\TravelAssist\
├─ public\
│  └─ media\
│     └─ personal-center\
│        ├─ sidebar-torii-watercolor-v2.png
│        ├─ personal-center-surface-texture-v2.png
│        ├─ sidebar-shell-ornament-top.png
│        ├─ personal-center-corner-decorations.png
│        ├─ feature-card-inspiration-bg.png
│        ├─ feature-card-favorites-bg.png
│        └─ feature-card-discovery-bg.png
└─ docs\
   └─ project\
      └─ WBS-5.1-LOCAL-ASSET-COPY-MAP.md
```

## 素材用途

| 文件 | 用途 |
|---|---|
| `sidebar-torii-watercolor-v2.png` | 左侧 Sidebar 底部鸟居水景正式插画 |
| `personal-center-surface-texture-v2.png` | Personal Center 主内容区和纸 / 樱花底纹 |
| `sidebar-shell-ornament-top.png` | Sidebar 顶部樱花 + 金色云纹装饰 |
| `personal-center-corner-decorations.png` | 主内容区底部 / 角落透明装饰 |
| `feature-card-inspiration-bg.png` | “旅行灵感”卡片淡山景背景 |
| `feature-card-favorites-bg.png` | “我的收藏”卡片淡鸟居背景 |
| `feature-card-discovery-bg.png` | “目的地探索”卡片淡枫叶 / 流线背景 |

## 推荐接入方式

### Sidebar 鸟居

`sidebar-torii-watercolor-v2.png`

建议：

```css
object-fit: cover;
object-position: center bottom;
```

用于替换当前过于扁平的 Sidebar 底部占位插画。

### 主内容背景

`personal-center-surface-texture-v2.png`

作为 Personal Center 主内容区最底层背景，不应压过卡片和文字。

### Sidebar 顶部装饰

`sidebar-shell-ornament-top.png`

透明叠层，定位到 Sidebar 左上区域，放在品牌与头像内容之后。

### 主内容角落装饰

`personal-center-corner-decorations.png`

透明叠层，建议覆盖主内容底部区域，`pointer-events: none`。

### 更多功能卡片

三张 `feature-card-*.png` 都作为卡片内部绝对定位的透明背景装饰：

- 文字层在上
- 装饰层在下
- 不影响交互
- 可根据视觉稿降低透明度

## 不需要图片实现的部分

以下继续由代码实现：

- 导航图标
- 通知图标
- 头像框
- 按钮
- hover / active / focus
- 卡片圆角、边框、阴影

本素材包只提供视觉资源，不包含页面代码修改。
