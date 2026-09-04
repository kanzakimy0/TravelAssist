# TravelAssist UI Design System

> 状态：v0.1 / 视觉方向与组件原则已形成；最终 Token 待 UI 实装阶段冻结。  
> 对应 WBS：P0-04 UI Design System 与组件清单。

## 1. 设计目标

TravelAssist 的视觉不是传统 OTA 搜索列表，也不是企业后台。核心体验是：

- 旅行画面 / 地图成为主背景。
- UI 像轻量工具层“浮”在旅行内容之上。
- 默认界面简单，复杂参数逐层展开。
- 圆润、轻盈、有空间感。
- 允许轻量日本视觉元素，但避免主题乐园式装饰。
- 可参考 Komoot 的沉浸式地图工具感，但不复制其品牌表现。

---

## 2. 当前视觉原则

### 已冻结

1. **不以绿色作为主色。**
2. 主界面优先使用大面积地图 / 旅行背景，而不是白底表格。
3. 卡片、按钮、面板整体偏圆润。
4. 设置、推荐方案、时间轴尽量使用浮层 / 镶嵌式表现。
5. 顶部导航尽量小。
6. 首页少宣传语，主 CTA 层级明确。
7. PC 行程主界面优先按 16:9 宽屏构图。
8. 地图区域约占主工作区 3/4，右侧工作区约 1/4。
9. 默认不展示完整高级设置。

### 方向已定

- 背景可使用动态旅行画面 / 动画。
- 轻量玻璃感、柔和阴影或半透明可以作为浮层实现方向。
- 日本元素应更接近“气质”和“细节”，而不是大量传统符号。

---

## 3. 色彩策略

最终品牌色尚未冻结，因此第一阶段禁止把临时颜色写成业务语义。

### 原则

- 不使用绿色作为品牌主色。
- 地图本身色彩复杂，因此 UI 面板背景应保持低干扰。
- 强调色用于 CTA、当前方案、当前日期、选中状态。
- 错误 / 警告 / 成功色与品牌色分离。
- 推荐住宿区、午餐区、晚餐区等地图覆盖层应互相可识别，但具体配色待地图方案冻结。

### 实现建议

开发时先用语义 Token，而不是写死颜色名称：

```text
--color-bg-canvas
--color-bg-elevated
--color-bg-overlay
--color-text-primary
--color-text-secondary
--color-border-subtle
--color-accent-primary
--color-accent-secondary
--color-status-warning
--color-status-danger
--color-map-route-active
--color-map-stay-area
--color-map-lunch-area
--color-map-dinner-area
```

具体 HEX / OKLCH 数值后续冻结。

---

## 4. 圆角与卡片

### 方向

- 大面板：明显圆角。
- 小按钮 / Chip：更强圆润感。
- 图钉 / 状态徽章：允许胶囊形。
- 不使用过多直角边框把界面切碎。

### 语义 Token 建议

```text
--radius-sm
--radius-md
--radius-lg
--radius-xl
--radius-pill
```

具体 px 值待实装比对后冻结。

---

## 5. 阴影、Blur 与层级

UI 的层级应来自：

1. 背景地图 / 动画。
2. 浮层面板。
3. 当前展开面板 / AI 对话。
4. Popover / Dialog。

推荐使用轻量阴影 + 边框 + 必要的背景模糊，避免大面积厚重阴影。

语义建议：

```text
--elevation-card
--elevation-panel
--elevation-popover
--elevation-dialog
```

---

## 6. 字体与排版

最终字体尚未冻结。

### 原则

- 中文 / 日文 / 英文混排时必须保证可读性。
- 标题不需要过度巨大。
- 地图上的文字优先短、清晰。
- 时间、交通分钟数、日期等信息应有良好数字可读性。
- 推荐方案卡片不能用大量正文淹没地图。

### 排版层级建议

```text
Display     首页主标题 / 极少使用
Heading 1   页面 / 面板主标题
Heading 2   中项目标题
Body        正文
Label       控件 / 图钉
Caption     次要说明 / 时间 / 距离
```

---

## 7. 间距

整体保持松弛，但地图工作区不能因为大间距损失过多可视面积。

建议使用统一 spacing scale：

```text
--space-1
--space-2
--space-3
--space-4
--space-6
--space-8
--space-12
```

不要在组件中出现大量随机 13px / 19px / 27px 等值。

---

## 8. 核心组件清单

### 全局

- `PrimaryButton`
- `SecondaryButton`
- `IconButton`
- `FloatingActionButton`
- `Chip`
- `Badge`
- `Card`
- `FloatingPanel`
- `Popover`
- `Drawer`
- `Dialog`
- `Tooltip`

### 首页

- `HeroStartButton`
- `LoginAction`
- `AIEntryButton`
- `AIConversationPanel`
- `DynamicBackgroundLayer`

### 行程工作区

- `MapCanvas`
- `DayRouteLayer`
- `PlaceMarker`
- `TransportSegment`
- `RecommendedAreaOverlay`
- `TripSummaryBar`
- `SettingsPanel`
- `PreferenceSection`
- `PreferenceQuickControl`
- `RecommendationCard`
- `TimelineDock`
- `TimelineNode`
- `AIEntryButton`
- `AIConversationPanel`

---

## 9. 首页组件关系

```text
HomePage
├─ DynamicBackgroundLayer
├─ CompactTopNav
│  └─ LoginAction
├─ Hero
│  └─ HeroStartButton
└─ AIEntryButton
   └─ AIConversationPanel
```

首页不要为了展示功能而堆产品卖点卡片。

设计参考：`assets/design/home-concept.svg`。

---

## 10. 行程页面组件关系

```text
TripPlannerPage
├─ MapCanvas
│  ├─ DayRouteLayer
│  ├─ PlaceMarker[]
│  ├─ TransportSegment[]
│  └─ RecommendedAreaOverlay[]
├─ TripSummaryBar
├─ SettingsAndPlansPanel
│  ├─ SettingsPanel
│  └─ RecommendationCard[]
├─ TimelineDock
└─ AIEntryButton
   └─ AIConversationPanel
```

设计参考：`assets/design/trip-planner-concept.svg`。

---

## 11. Settings Panel 视觉层级

### 折叠状态

只显示必要摘要：

- 日期
- 同行人
- 节奏
- 移动偏好
- 景点偏好
- 展开按钮

### 中项目状态

显示每个中项目：

- 图标 / 名称
- 当前状态摘要
- 快速设置
- 进入详细设置按钮

### 小项目状态

使用局部展开 / 子面板，不建议把整个页面切换成巨型表单。

设计参考：`assets/design/preference-panel-concept.svg`。

---

## 12. 推荐方案卡片

### 当前主方案 / 推荐 1

允许显示：

- 方案名称
- 一句定位
- 每日摘要
- 主要移动方式
- 强度 / 节奏概要
- 推荐理由

### 非当前方案 / 推荐 2、3

默认精简：

- 名称
- 一句差异说明
- 1~3 个关键指标

选中后再展开，避免右栏同时出现三套长文。

---

## 13. 地图 Marker 原则

### 已确定方向

- 景点 Marker 可以包含象征图片。
- 已加入行程与仅推荐候选应视觉不同。
- Marker 不应遮挡地图大面积信息。
- 多点密集时未来需要聚合 / 缩放策略。

### 待确认

- Marker 尺寸。
- 图片比例。
- 聚合样式。
- 当前节点 / 必去节点 / 推荐节点的最终状态色。

---

## 14. 推荐区域 Overlay

住宿、午餐、晚餐第一层使用区域表达。

设计方向：

- 半透明区域
- 柔和边缘
- 不遮挡道路和地名
- Hover / Select 后提高强调

区域颜色尚未冻结。

---

## 15. 时间轴

时间轴是底部浮动 Dock。

### 节点信息

- 时间
- 类型
- 名称
- 移动方式
- 移动时间
- 必要的餐饮 / 住宿状态

### 视觉原则

- 横向优先适配宽屏。
- 保持地图仍可见。
- 当前节点明显，但不使用巨大卡片。
- 未来编辑功能预留拖拽手柄 / 菜单空间。

---

## 16. AI 浮层

AI 入口全局复用。

### 原则

- 首页与行程页都可打开。
- 不强制进入独立 Chat 页面。
- 对话浮层保持当前页面上下文可见。
- AI 修改后应让用户在地图 / 时间轴看到变化。
- AI 入口应容易找到，但不抢主 CTA 与地图的视觉焦点。

---

## 17. 动效

### 适合使用

- 首页背景轻量运动。
- Panel 展开 / 折叠。
- 方案切换。
- 地图节点选中。
- AI 修改后相关节点的轻量变化提示。

### 避免

- 高频大面积动画。
- 每个卡片都独立浮动。
- 影响地图操作的复杂过渡。
- 为“高级感”添加无功能意义的动效。

---

## 18. 响应式原则

### Desktop

- 16:9 是当前核心验证画布。
- 地图约 75%。
- 设置 / 方案约 25%。
- 底部横向时间轴。

### Tablet

- 允许右栏缩窄或转为 Overlay / Drawer。
- 时间轴可以缩短信息或可横向滚动。

### Mobile / App

移动端不机械缩放 PC 布局。

优先考虑：

- 地图全屏底层。
- Bottom Sheet / Drawer 承载时间轴和设置。
- AI 浮动按钮适合单手触达。
- 业务含义、Trip State 和 Preference State 与 Web 一致。

具体移动布局待 App 阶段冻结。

---

## 19. 可访问性基线

- 主要按钮必须有清晰文字或 accessible label。
- 颜色不能是唯一状态表达手段。
- 键盘可以操作主要 Web 控件。
- 浮层打开后正确管理焦点。
- 文本和背景需要足够对比度。
- 地图 Marker 应提供可访问名称。
- 动态背景需要考虑 `prefers-reduced-motion`。

---

## 20. Codex 实现规则

1. 使用语义 Token，不自行发明一套与设计文档无关的颜色系统。
2. 未冻结的视觉值允许先使用临时 Token，但必须标记为 provisional。
3. 组件优先可复用，不给每个页面复制一套按钮 / 卡片。
4. 不把传统 Admin Dashboard 组件库默认样式直接当最终 UI。
5. 实现 UI Issue 时附截图并与 `assets/design/*.svg` 对照。
6. 发现设计图与专题文档冲突时，以专题文档为准并提出更新需求。

---

## 21. 待冻结 Token

- 品牌主色 / 辅助色
- 背景明暗主题
- 字体
- 圆角数值
- 阴影 / Blur
- Map Route 颜色
- 推荐住宿 / 午餐 / 晚餐覆盖色
- Marker 尺寸
- Panel 宽度
- Timeline 高度
- 动效时长与 easing
