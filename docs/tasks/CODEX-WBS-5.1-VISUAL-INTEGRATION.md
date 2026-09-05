# Codex 指令 — WBS 5.1 Personal Center Visual Integration

## 目标

只做视觉素材接入和既有设计还原，不进行任何新设计。

## 输入素材

运行时必须使用：

```text
/media/personal-center/sidebar-torii-watercolor.svg
/media/personal-center/personal-center-surface-texture.svg
```

## 设计依据

```text
docs/ui/personal-center.md
docs/ui/personal-center-shell.md
docs/ui/design-system.md
```

## 接入要求

### Sidebar Artwork

- 使用 `sidebar-torii-watercolor.svg`
- 仅放 Sidebar 底部
- 允许 `object-fit: cover` / 裁切
- 不得侵占导航点击区域
- 视为 decorative，使用空 alt / `aria-hidden`

### Main Content Background

- 使用 `personal-center-surface-texture.svg`
- 作为整个 Personal Content Area 的低对比背景层
- 不得放大其中局部装饰成为视觉主体
- 卡片和表单继续使用既有浅色 surface
- 不叠加新的富士山、鸟居、寺庙、书法或大面积花瓣图

## 保留为代码实现

不得制作或替换为图片：

- nav icons
- notification
- avatar shell
- chevron
- buttons
- active / hover / focus
- cards
- shadows
- borders
- radius

## 禁止自行设计

- 不创建新 Logo
- 不生成旅行照片
- 不替换图片风格
- 不改变 WBS 1.21 / 1.22 IA
- 不修改 5 项一级导航
- 不增加日本符号装饰
- 不重新定义色彩体系

## 验收

- 1920×1080：Sidebar 插画完整作为底部收尾，背景纹理几乎不抢内容
- 1440×900：导航保持完整，插画允许裁切
- 1280×720：不得为了完整显示插画压缩导航
- 背景纹理对正文、卡片对比度无明显影响
- 无横向溢出
- 无新增第三方依赖
