# TravelAssist 主系统 Design Token / 色彩 / 字体 / 圆角规范

> 版本：v1.0 — 设计冻结候选，待用户审查  
> 日期：2026-09-07（Asia/Tokyo）  
> WBS：1.13；Task：WBS-1.13-B；Issue：#178  
> Owner：B（用户明确要求在未开始时执行；A 保留后续主系统实装责任）  
> 执行方式：ChatGPT 直接完成设计，不调用 Codex，不修改运行时代码  
> 基线：`develop@85675375a52a1bb1adaf37d9b8ea0a48a467eae1`  
> 分支：`docs/b-wbs-1-13-main-design-tokens`

---

# 0. 文档目的

WBS 1.13 不再重新设计页面，而是把已经在首页、Start Flow、Planner、Trip Detail 中反复确认的视觉语言收敛为一套稳定的 **Main Travel System semantic tokens**。

本文件回答：

```text
品牌强调色到底是什么？
暖白表面分几层？
正文 / 次级文字应该用什么层级？
中文、日文、英文如何共用字体栈？
Serif 到底在哪些场景使用？
按钮、卡片、面板、Popover 的圆角是否有统一尺度？
Success / Warning / Danger 是否会被品牌色污染？
Planner 的路线蓝是否需要被强制改成粉色？
现有 globals.css / wizard / planner 的局部值以后怎么收敛？
```

目标不是一次性改完所有 CSS，而是先冻结**语义和数值方向**，后续工程任务再迁移实现。

---

# 1. 范围与优先级

## 1.1 本文件负责

- 主旅行系统的 canonical semantic color tokens；
- 主动作 / 选中 / 品牌强调色；
- Surface / Border / Text 层级；
- Success / Warning / Danger / Info 状态色；
- UI Sans 与少量 Editorial Serif 字体栈；
- 排版角色与基本字号层级；
- Radius scale 与组件映射；
- Focus / Elevation / Glass / Motion 的最小支持规范；
- 现有局部 Token 的迁移映射；
- 后续 1.14 / 1.20 的引用边界。

## 1.2 本文件不负责

- 地图道路、Pin、区域、每日路线的最终专用色：由 1.12 / 后续地图实现负责；
- Personal Center `--pc-*` 的工程重命名；
- 页面布局；
- 图片 / 视频调色参数；
- Logo 重设计；
- Dark Mode；
- 字体文件采购或 Web Font 安装；
- Tailwind theme / CSS variables 的代码实装。

## 1.3 冲突优先级

本文件验收后，在“颜色 / 字体 / 圆角 / 通用 Surface”范围内：

```text
本文件 v1.0
> 已验收的页面级视觉规格中的非冲突布局规则
> docs/ui/design-system.md v0.1
> 现有 provisional globals.css 数值
> 历史概念图 / 临时实现值
```

页面专属布局和地图专属语义仍由各自专项设计拥有。

---

# 2. 已确认视觉方向汇总

从当前项目已确认设计与实现可归纳出稳定共同点：

1. **不使用绿色作为品牌主色。**
2. 主系统不是 SaaS Dashboard，也不是传统 OTA 列表页。
3. 背景地图 / 旅行场景是视觉主体，UI 是轻量工具层。
4. 暖白、象牙白、暖米色为主要 Surface。
5. 淡樱粉 / 暖珊瑚仅作为气氛与选中强调，不大面积染色。
6. 主动作逐步从早期蓝灰收敛为 **珊瑚朱红 / 柔和朱红**。
7. 正文保持深墨蓝 / 蓝灰黑，提高地图和照片上的信息稳定性。
8. Planner 路线 / 交通允许保留冷蓝等业务语义，不强制品牌化。
9. 圆角明显但不过度卡通；大面板比内部控件更圆。
10. 阴影非常轻，主要依赖边框、Surface 和空间分层。
11. 首页标题允许少量 Serif / 明朝体 / 宋体气质；数据密集 UI 必须 Sans。
12. 中文、日文、英文不能为了“品牌字体”牺牲字形覆盖和可读性。

---

# 3. Token 命名规则

## 3.1 命名原则

业务组件只消费语义，不消费颜色名字。

允许：

```text
--ta-color-accent
--ta-color-surface
--ta-color-text-secondary
--ta-color-status-danger
```

禁止新增：

```text
--pink
--red-button
--gray-2
--blue-route-card
--sakura-text
```

其中 `ta` = TravelAssist；后续工程实现可选择保留现有全局变量名作为兼容 alias，但 canonical 设计名称以本文为准。

## 3.2 三层关系

```text
Primitive value
↓
Semantic token
↓
Component token（只在确有必要时）
```

例如：

```text
#B95649
↓
--ta-color-accent
↓
--button-primary-bg（如未来需要）
```

不要反向让组件名决定品牌颜色。

---

# 4. Canonical 主系统色彩

## 4.1 Core Surface / Text / Accent

| Token | 值 | 用途 |
|---|---|---|
| `--ta-color-canvas` | `#FAF6EF` | 无地图 / 无照片时的主背景与降级底色 |
| `--ta-color-surface` | `#FFFCF7` | 卡片、Panel、Popover 的默认暖白 |
| `--ta-color-surface-strong` | `#FFFDF9` | 输入、顶部搜索、需要更清晰边界的表面 |
| `--ta-color-surface-muted` | `#F7EEE7` | 次级区块、弱分组、Drawer 内侧底色 |
| `--ta-color-surface-blush` | `#FAEEEB` | 当前选择 / 珊瑚强调的轻背景 |
| `--ta-color-glass` | `rgb(255 250 244 / 88%)` | 地图/照片上的主玻璃 Surface |
| `--ta-color-text-primary` | `#283342` | 主正文、标题、数据、控件文字 |
| `--ta-color-text-secondary` | `#6F6A68` | 次级正文、辅助说明 |
| `--ta-color-text-tertiary` | `#80716B` | Caption / 非关键元数据；不得再降低 opacity |
| `--ta-color-text-on-accent` | `#FFFFFF` | 主 CTA / 强调按钮文字 |
| `--ta-color-accent` | `#B95649` | 主 CTA、当前选中、关键进度、品牌交互强调 |
| `--ta-color-accent-hover` | `#A74739` | Hover / 强化选中 |
| `--ta-color-accent-pressed` | `#963E34` | Active / Pressed |
| `--ta-color-accent-soft` | `#FAEEEB` | 选中项背景 |
| `--ta-color-accent-border` | `#C98273` | 当前项细描边、轻强调边框 |
| `--ta-color-border` | `#E6D9CF` | 默认细边框 / Separator |
| `--ta-color-border-strong` | `#D6BDB2` | 输入 Focus 邻近层、结构边界 |
| `--ta-color-focus` | `#954439` | Keyboard focus ring |
| `--ta-color-scrim` | `rgb(40 31 27 / 18%)` | Modal / Sheet 背景遮罩 |

### 4.1.1 为什么主 Accent 冻结为 `#B95649`

它位于当前多个已确认方向的交集：

- Planner v0.5 已实际使用 `#B95649` 作为主动作 / range accent；
- Start Flow 使用的 `#D86657 / #BD4F43` 属于同一珊瑚朱红家族；
- Personal Center 使用 `#A74739`，可直接作为主系统 Hover 的邻近值；
- 用户此前明确否定绿色主方案，并持续选择暖白 + 樱粉 + 珊瑚红方向。

因此本轮不再回到早期 `#56658F` 蓝灰主 CTA。

## 4.2 品牌色使用边界

`--ta-color-accent` 只用于：

- 页面唯一或主要 CTA；
- 当前方案 / 当前 Tab / 当前选择；
- 品牌级进度；
- Focus 邻近反馈；
- 极少量重要图标。

不得用于：

- 所有图标；
- 所有链接；
- 大面积页面背景；
- 地图道路；
- 成功状态；
- 警告状态；
- 错误状态。

珊瑚色是“我现在在操作什么”，不是“系统所有东西都是红色”。

---

# 5. 状态色必须与品牌色分离

| Token | 前景 | Soft Background | 语义 |
|---|---|---|---|
| `--ta-color-success` | `#256F52` | `#EAF4EF` | 已确认、已完成、可执行 |
| `--ta-color-warning` | `#9A6500` | `#FFF4D8` | 需注意、时间紧、建议提前 |
| `--ta-color-danger` | `#B6404C` | `#FCEBED` | 冲突、失败、高风险 |
| `--ta-color-info` | `#3F6F8F` | `#EAF2F7` | 信息、推荐、说明、非紧急状态 |

规则：

1. 状态必须同时有图标 / 文字，不只靠颜色。
2. “已预约”使用 Success，不使用品牌珊瑚色。
3. “迟到风险”使用 Danger，即使同一节点已经预约成功。
4. 路线蓝属于地图 / 交通语义，不等于 Info 状态色。
5. Disabled 不是一种状态色，使用 Surface + Text 层级与 disabled 规则表达。

---

# 6. 对比度设计检查

以下为本轮 sRGB 纯色计算，不等于浏览器实测；工程实现仍需在真实背景、透明度和 Blur 下复核。

| 组合 | 计算对比度 | 设计结论 |
|---|---:|---|
| `#283342` on `#FFFCF7` | `12.49:1` | 主文字充足 |
| `#6F6A68` on `#FFFCF7` | `5.21:1` | 次级正文可用 |
| `#80716B` on `#FFFCF7` | `4.57:1` | Caption 下限可用；禁止再降 opacity |
| White on `#B95649` | `4.68:1` | 主 CTA 正常文字可用 |
| White on `#A74739` | `5.83:1` | Hover 更高对比 |
| `#954439` on `#FFFCF7` | `6.49:1` | Focus / 文字型强调充足 |
| `#256F52` on `#EAF4EF` | `5.38:1` | Success 文本可用 |
| `#9A6500` on `#FFF4D8` | `4.53:1` | Warning 文本可用 |
| `#B6404C` on `#FCEBED` | `4.77:1` | Danger 文本可用 |
| `#3F6F8F` on `#EAF2F7` | `4.78:1` | Info 文本可用 |

透明 Glass 覆盖在地图或照片上时，不允许直接引用上述纯色结果宣称通过；必要时增加局部 Surface opacity / text shadow / scrim。

---

# 7. 字体系统

## 7.1 UI Sans — 默认字体

所有数据密集、操作型、可扫描 UI 默认使用 Sans：

```css
--ta-font-ui:
  Inter,
  "Noto Sans SC",
  "Noto Sans JP",
  "Hiragino Sans",
  "Yu Gothic UI",
  "Microsoft YaHei",
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

说明：

- 不要求系统一定安装 Inter / Noto；它们只是优先 fallback；
- 不提交或分发字体文件；
- Windows / macOS / 中文 / 日文都有安全退路；
- 数字、时间、价格、路线数据统一 UI Sans。

## 7.2 Editorial Serif — 少量人文标题

```css
--ta-font-editorial:
  "Noto Serif SC",
  "Noto Serif JP",
  "Songti SC",
  STSong,
  "Yu Mincho",
  "Hiragino Mincho ProN",
  serif;
```

只允许用于：

- 首页主标题；
- 旅行灵感 / 情绪型大型标题；
- 极少量目的地 Editorial 标题。

禁止用于：

- Planner 时间轴；
- 地图 Label；
- Button；
- Form；
- 价格 / 时间 / 交通数据；
- Error / Warning；
- 长正文。

> 人文感来自少量标题，而不是把整个工具界面变成杂志。

## 7.3 字重

推荐角色：

```text
400  Body
500  Secondary emphasis / input
600  Label / button / section title
700  Strong data / selected control
800  仅极少量短标签或品牌需要
```

不再依赖大量非标准 `720 / 760 / 850` 作为设计事实；现有实现可暂时保留，后续工程迁移时映射到浏览器实际可用字重。

---

# 8. 排版角色

本 WBS 冻结**角色与默认值**，页面可在自身已验收布局内使用 `clamp()` 做响应式变化。

| Role | 默认字号 | Line-height | 字体 | 用途 |
|---|---:|---:|---|---|
| `display` | `64px` | `1.08` | Editorial Serif 或 UI Sans | 首页 / 极少数大标题 |
| `h1` | `36px` | `1.20` | UI Sans；Editorial 场景可 Serif | 页面主标题 |
| `h2` | `28px` | `1.25` | UI Sans | 大面板标题 |
| `h3` | `20px` | `1.35` | UI Sans | 卡片 / Section |
| `body-lg` | `16px` | `1.60` | UI Sans | 重要说明 |
| `body` | `15px` | `1.60` | UI Sans | 默认正文 |
| `label` | `14px` | `1.40` | UI Sans | Button / Input / Tab |
| `caption` | `12px` | `1.45` | UI Sans | 时间、辅助数据 |
| `micro` | `11px` | `1.40` | UI Sans | 地图 / 高密度元数据，谨慎使用 |

## 8.1 Responsive 范围

建议：

```text
Display: 40–88px
H1:      30–48px
H2:      24–32px
H3:      18–22px
Body:    不低于 14px
Label:   不低于 13px
Micro:   仅在短标签，不能承载关键说明
```

首页既有超大 Hero 可以继续作为页面级例外，但不能因此把 Planner 标题也放大。

## 8.2 Letter spacing

- CJK 正文：默认 `0`；
- CJK 大标题：`0 ~ 0.02em`；
- 英文 Eyebrow：`0.08 ~ 0.16em`，只用于极短文字；
- 不把正文设置成大 tracking；
- 负 tracking 仅允许超大 Latin / 数字标题，中文默认不用。

---

# 9. Radius Scale

主系统统一为 7 级：

| Token | 值 | 典型组件 |
|---|---:|---|
| `--ta-radius-xs` | `8px` | 小 Badge、内部数据块 |
| `--ta-radius-sm` | `12px` | Input、小 Button、紧凑列表项 |
| `--ta-radius-md` | `16px` | 普通 Card、Map Quick Card |
| `--ta-radius-lg` | `20px` | Panel、Popover、设置卡 |
| `--ta-radius-xl` | `28px` | 大型浮层、Sidebar 主容器 |
| `--ta-radius-2xl` | `36px` | 少量 Hero / 大视觉面板 |
| `--ta-radius-pill` | `999rem` | CTA、Chip、搜索框、头像操作 |

## 9.1 圆角使用原则

```text
组件越大 → 圆角可更大
组件越密集 → 圆角应更克制
```

禁止：

- 所有卡片都 36–48px；
- 普通表单项做成巨大胶囊；
- 同一 Card 内每一层都重复大圆角；
- 用圆角代替真正的层级结构。

## 9.2 组件映射

- Primary CTA：Pill；
- Search：Pill；
- 普通 Input / Select：12px；
- Chip：Pill；
- Timeline Item：12–16px；
- Map Quick Card：16–20px；
- Planner Side / Bottom Panel：20px 左右；
- More Settings Workbench：20–28px；
- Dialog：20–28px；
- Home AI Floating Button：圆形；
- 图片卡片封面：跟随 Card 16–20px，不独立放大。

---

# 10. Border / Elevation / Glass

## 10.1 Border

默认：

```text
1px solid --ta-color-border
```

选中：

```text
1px solid --ta-color-accent-border
+ soft accent background
```

不要用 2–3px 重边框制造层级，Keyboard focus 除外。

## 10.2 Elevation

建议 canonical 值：

```css
--ta-shadow-card: 0 8px 24px rgb(74 52 42 / 7%);
--ta-shadow-panel: 0 16px 44px rgb(68 48 40 / 10%);
--ta-shadow-popover: 0 20px 56px rgb(54 39 34 / 14%);
--ta-shadow-dialog: 0 24px 72px rgb(47 34 30 / 18%);
```

原则：

- 默认卡片优先边框而不是阴影；
- 地图上的浮层才更需要 Shadow；
- 不做悬浮 3D 卡堆；
- Hover 不通过大幅抬升 / 位移制造“弹跳”。

## 10.3 Glass

允许：

```text
Surface opacity 84%–94%
Blur 8–16px
必要时 Saturation 105%–115%
```

大型 Workbench 可更强，但不建议超过 20–24px Blur。

禁止：

- 透明到文字不可读；
- 页面每张卡都 backdrop-filter；
- 玻璃层遮住路线 / 地名；
- 把 Glass 当作品牌本体。

---

# 11. Focus / Hover / Disabled

## 11.1 Keyboard Focus

统一：

```css
outline: 3px solid var(--ta-color-focus);
outline-offset: 3px;
```

在深色 / 图片背景上可增加浅色外 halo，但不能取消明确焦点。

## 11.2 Hover

推荐变化顺序：

1. Border；
2. Background；
3. Shadow 极轻变化；
4. 必要时 `translateY(-1px)`，不是必需。

禁止强缩放和大位移。

## 11.3 Disabled

Disabled：

- 文字仍可辨认；
- 降低对比与饱和，但不能消失；
- 不依赖 `opacity: 0.3` 作为唯一规则；
- Cursor / aria / disabled 属性必须与视觉一致。

---

# 12. Motion Support Tokens

Motion 不是本 WBS 主范围，但为组件一致性冻结最小支持值：

```css
--ta-motion-fast: 140ms;
--ta-motion-normal: 220ms;
--ta-motion-panel: 260ms;
--ta-motion-scene: 900ms;
```

- Hover / focus：Fast；
- Popover / Drawer：Normal / Panel；
- Planner → Detail 轻量过渡：Panel；
- 背景场景慢变化：Scene；
- `prefers-reduced-motion: reduce` 时关闭非必要运动。

---

# 13. 主系统页面应用规则

## 13.1 Home

- 背景照片 / 视频继续是主体；
- Hero 主标题可用 Editorial Serif；
- 主 CTA 使用 Accent + White；
- Login 使用 Glass / Surface + Border；
- AI Floating Button 使用 Surface + Ink，只有交互强调才用 Accent；
- 不因 Token 冻结增加 Hero Card。

## 13.2 Start Flow

- `--wizard-coral` 以后映射到 `--ta-color-accent`；
- `--wizard-coral-dark` → Accent Hover / Pressed；
- `--wizard-ink` → Text Primary；
- `--wizard-muted` → Text Secondary；
- `--wizard-cream / glass` → Surface / Glass；
- 页面现有背景调色不在本 WBS 改动。

## 13.3 Planner

- Warm surface、珊瑚选中继续保留；
- 搜索框 / Workbench / Tabs 使用本文 Surface 与 Border；
- 路线、交通、地图区域色继续由地图语义决定；
- 不把蓝色路线改为珊瑚色；
- Danger / Warning / Success 与当前方案 Accent 分离；
- 推荐方案卡布局与几何不因 Token 冻结改变。

## 13.4 Trip Detail

- 继承 Planner 的 Surface / Text / Radius；
- `当前日` 的路线视觉由地图规范决定；
- AI Normal / Warning / Error 与预约 Confirmed 使用状态色；
- 同一节点允许 Success + Danger 同时存在，不互相覆盖。

## 13.5 AI 主系统

未来 AI 对话 / 建议卡：

- AI 不拥有一套紫色渐变品牌色；
- AI 正常建议使用 Surface / Info；
- AI 主动作仍用 Accent；
- AI 风险必须用 Warning / Danger；
- 不把所有 AI 内容都做成彩色气泡。

---

# 14. Personal Center 边界

Personal Center 当前已经有独立 `--pc-*`，并形成：

```text
Canvas #FAF6EF
Card #FFFCF7
Accent #A74739
Primary Text #383632
Secondary #70665F
```

这些与本文同属一个暖色家族，但 WBS 1.13 **不越权重构 Personal Center**。

冻结规则：

1. 本 Task 不改 `--pc-*`；
2. 后续 Shared Token 工程可评估 alias；
3. Account/Personal Center 的业务 UI 不因主系统 Token 迁移发生视觉回退；
4. 主系统与个人中心可以略有“工具型深墨蓝 vs 管理型暖墨褐”的文字差异，但 Accent / Surface 应保持亲缘关系。

---

# 15. 现有实现迁移映射

本表是**后续工程 Task 的输入**，不是本 Task 已经修改代码。

| 当前值 / Token | 当前语义 | 后续目标 |
|---|---|---|
| `globals --color-bg-canvas #F4EFE9` | provisional canvas | `--ta-color-canvas #FAF6EF` |
| `globals --color-text-primary #252D43` | provisional ink | `--ta-color-text-primary #283342` |
| `globals --color-text-secondary #656D7E` | provisional secondary | `--ta-color-text-secondary #6F6A68` |
| `globals --color-accent-primary #56658F` | 早期蓝灰 CTA | `--ta-color-accent #B95649` |
| `globals --color-accent-primary-hover #49577E` | 早期蓝灰 hover | `--ta-color-accent-hover #A74739` |
| `wizard --wizard-coral #D86657` | Start accent | alias 到 Accent；页面特殊 grading 可保留 |
| `wizard --wizard-coral-dark #BD4F43` | Start active | alias 到 Hover / Pressed |
| `wizard --wizard-ink #283342` | Start ink | 与 canonical 完全一致 |
| `wizard --wizard-muted #6F6A68` | Start secondary | 与 canonical 完全一致 |
| `planner #B95649` | Planner 主动作 | 与 canonical 完全一致 |
| `planner #FFFCF7` | Planner surface | 与 canonical 完全一致 |
| `planner #384955` | Planner text | 逐步映射 Text Primary；必要的数据专属蓝灰由组件保留 |
| `pc #A74739` | Personal Center accent | 不重命名；与 Accent Hover 同色系 |
| `pc #FAF6EF / #FFFCF7` | PC canvas/card | 与 canonical surface 家族一致 |

## 15.1 迁移策略

后续工程应：

```text
先增加 canonical token / compatibility alias
↓
再迁共享 primitives
↓
再迁 Home / Start / Planner
↓
最后清理无引用 provisional token
```

不得一次“大替换 HEX”跨模块扫仓库。

---

# 16. Radius 现状迁移

现有 `globals.css`：

```text
sm 12px
md 20px
lg 32px
xl 48px
pill
```

当前页面又大量使用 11 / 14 / 16 / 18 / 20 / 28px。

因此 v1.0 改为：

```text
8 / 12 / 16 / 20 / 28 / 36 / pill
```

这样：

- 保留现有 12 / 20；
- 吸收 Personal Center 常用 16 / 18 / 28 的真实需求；
- 避免 48px 成为普通 Panel 默认值；
- Map Quick Card / Planner panel 有更精确的层级。

后续实现不需要机械把 18px 改成 16px；先按组件角色迁移，视觉验收后再清理例外。

---

# 17. 1.14 / 1.20 的交接

## 17.1 给 WBS 1.14

1.14 负责 responsive layout，不再重新决定：

- 颜色；
- 字体家族；
- Radius；
- Focus 颜色。

1.14 只决定：

- 不同 breakpoint 使用哪个 Type Role；
- Display/H1 clamp 范围；
- Panel 在 Drawer / Sheet 中是否降低 radius；
- Touch target 和内容密度。

## 17.2 给 WBS 1.20

1.20 Loading / Empty / Error / Skeleton 必须直接使用：

```text
Surface
Text Primary / Secondary
Info / Warning / Danger
Border
Radius
```

Skeleton 新增的灰阶不能形成第二套独立色系。

---

# 18. 后续工程实现建议

本 WBS 完成后仍**不代表 CSS 已实装**。

建议未来单独建立 A 的工程 Task：

```text
Main Design Token Implementation
```

范围：

1. 更新 `src/app/globals.css`；
2. 保留兼容 alias；
3. 更新共享 Button / FloatingPanel / Input 等 primitive；
4. 分批迁 Home / Start / Planner；
5. 截图比对；
6. 对比度浏览器实测；
7. lint / typecheck / build / E2E；
8. 检查 Personal Center 无视觉回退。

不得把本设计 PR 直接变成运行时代码 PR。

---

# 19. 验收矩阵

| ID | 验收项 |
|---|---|
| DT-01 | 主品牌色不是绿色、蓝紫 AI 渐变或旧蓝灰 CTA |
| DT-02 | Accent 固定为珊瑚朱红家族，主值 `#B95649` |
| DT-03 | 主 CTA 白字 / Accent 纯色计算达到 AA 正常文字目标 |
| DT-04 | 主正文与暖白 Surface 有明显高对比 |
| DT-05 | Secondary 正文不是通过 opacity 叠加实现 |
| DT-06 | Tertiary `#80716B` 不允许再降低 opacity 承载正文 |
| DT-07 | Success / Warning / Danger / Info 与 Accent 分离 |
| DT-08 | 状态不只靠颜色表达 |
| DT-09 | Planner 路线 / 交通色不被品牌 Accent 覆盖 |
| DT-10 | Home 允许 Serif，Planner 数据 UI 禁止大范围 Serif |
| DT-11 | CJK + Latin 有完整系统 fallback |
| DT-12 | 不新增字体文件 / 字体包 |
| DT-13 | Body 不低于 14px；关键说明不使用 Micro |
| DT-14 | Radius 使用 8/12/16/20/28/36/pill 角色尺度 |
| DT-15 | 普通 Card 不默认使用超大 36px 圆角 |
| DT-16 | Focus ring 清晰且不依赖 box-shadow 隐式反馈 |
| DT-17 | Glass 在地图/照片上必须重新验证真实对比 |
| DT-18 | Home / Start / Planner 现有值有迁移映射 |
| DT-19 | Personal Center 不被本 Task 越权重构 |
| DT-20 | 1.14 / 1.20 可直接引用本文而不重定义视觉基础 |
| DT-21 | 本 Task 不修改任何 runtime CSS / TS / package / workflow |
| DT-22 | 后续实装需独立工程 Task 和浏览器视觉回归 |

---

# 20. 本轮待用户确认的新增冻结值

本轮新增并等待用户验收的核心数值：

```text
Accent         #B95649
Hover          #A74739
Pressed        #963E34
Canvas         #FAF6EF
Surface        #FFFCF7
Surface Strong #FFFDF9
Surface Muted  #F7EEE7
Text Primary   #283342
Text Secondary #6F6A68
Text Tertiary  #80716B
Border         #E6D9CF
Focus          #954439

Radius
8 / 12 / 16 / 20 / 28 / 36 / pill
```

如果本设计通过验收，这些值成为 Main Travel System v1 的 canonical reference；如果后续品牌升级，只允许通过新的 Design Token 版本调整，不再由单个页面自行改变品牌色。

---

# 21. 最终冻结原则

```text
TravelAssist 主系统
= 暖白旅行空间
+ 珊瑚朱红交互强调
+ 深墨蓝数据文字
+ 少量淡樱粉气氛
+ 独立状态色
+ 克制玻璃 / 阴影
+ UI Sans 为主
+ 少量 Editorial Serif
+ 角色化圆角
```

最重要的统一规则：

> **背景可以丰富，工具层必须安静；品牌可以温暖，状态语义必须准确；页面可以有个性，Design Token 不能各写一套。**
