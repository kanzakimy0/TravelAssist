# TASK-004-A — Homepage Final Visual & Dynamic Background

## Metadata

- Task ID: `TASK-004-A`
- Owner: `A`
- Status: 已完成
- WBS: `1.4 / 1.16`
- GitHub Issue: `#20`
- Branch: `feature/a-homepage-final-visual`
- Depends On: Task 3 / Issue #15 merged into `develop`
- Commit: `bfa5081`
- Pull Request: `#23`
- Canonical Design: P01 主入口首页 V4｜沉浸式动态背景主设计方案

---

## Delivery Record

- Review Date: `2026-09-05`
- Automated Validation: `lint / typecheck / format:check / build` passed
- Manual Validation: `/`, `/start`, CTA navigation, AI open/close, Escape and focus restore passed
- Responsive Validation: `1600x900 / 1440x900 / 1024x768 / 390x844` passed
- Media Validation: poster active; WebM/MP4 sources are conditionally enabled when authorized files exist
- Current Review State: accepted and merged into `develop` via PR #23

---

# 1. 任务目标

将已经确认的首页主设计方案正式落地到 TravelAssist Web 首页。

本 Task 不是重新做 Marketing Landing Page，而是把现有 Task 2 首页基础壳层升级为正式首页视觉，同时保留 Task 3 已接入的 `/start` 用户路径。

核心体验：

```text
沉浸式日本旅行场景
+
极简前景 UI
+
右下角全局 AI 入口
```

首页最终只需要让用户快速理解两件事：

```text
1. 从这里开始规划旅行
2. 可以随时打开 AI 助手
```

---

# 2. 执行前置条件

开始前执行：

```bash
git status
git remote -v
git fetch origin
git log origin/develop --oneline -15
```

必须确认 Task 3 已经合入 `origin/develop`。

至少确认：

```text
src/app/start/page.tsx
```

存在，并且首页主 CTA 已经可以进入：

```text
/start
```

如果 Task 3 尚未合并：

```text
Status: Blocked
Reason: Task 3 has not been merged into develop.
```

停止执行。

禁止直接在 Task 2 或 Task 3 的旧 feature branch 上继续堆代码。

---

# 3. 必读资料

开始实现前，必须阅读当前仓库中与首页、视觉、页面结构有关的资料，至少包括：

```text
docs/ui/home-page.md
docs/ui/design-system.md
docs/ui/page-overview.md
```

如仓库中已有新的首页 V4 / 主设计方案文档，以最新确认文档为准。

设计优先级：

```text
最新冻结的首页主设计文档
>
本 Task
>
旧版概念 SVG / Task 2 临时首页
```

不要像素级复制旧 `home-concept.svg`。

---

# 4. Git 工作流

从最新 `develop` 创建：

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/a-homepage-final-visual
```

禁止直接修改：

```text
main
develop
```

---

# 5. 已冻结的首页结构

最终首页结构：

```text
HomePage
├─ ImmersiveBackground
│  ├─ VideoBackground
│  ├─ PosterFallback
│  └─ ReadabilityOverlay
├─ CompactHeader
│  ├─ Brand / Journi
│  └─ LanguageAction
├─ HomeHero
│  ├─ Headline
│  ├─ StartCTA
│  └─ LoginAction
└─ HomeAIAssistant
   ├─ AIEntryButton
   └─ AIConversationPanel
```

首页不要继续增加额外 Marketing Section。

---

# 6. Canonical 首页文案

主标题使用：

```text
下一站，去哪里？
```

主 CTA：

```text
让我们开始吧 →
```

次级入口：

```text
登录
```

可保留一行极弱辅助文字：

```text
规划行程 · 对话调整
```

如果页面在实际视觉中已经足够清楚，这行辅助文字可以弱化，但不要增加新的宣传语。

禁止加入：

- 功能卖点三栏
- 客户评价
- FAQ
- 价格区
- 推荐路线列表
- 首页搜索框堆叠
- 大段 AI 宣传文案

---

# 7. 主视觉方向

视觉关键词：

```text
极简
圆润
沉浸式
大留白
安静
现代日本旅行气质
高级但不奢华
工具优先
```

不要做成：

- OTA 首页
- 日本旅游局海报
- SaaS AI 模板站
- 企业后台
- 复杂玻璃拟态展示页

---

# 8. 动态背景主场景

正式主方向：

```text
日本海边小镇 + 地方电车缓慢驶过
```

场景可包含：

- 海边道路
- 地方铁路 / 电车
- 海面
- 远山
- 少量日式住宅
- 柔和晨光或夕光
- 极少量树影 / 樱花 / 风动

日本元素必须克制。

不要同时堆：

```text
富士山 + 鸟居 + 樱花 + 和服 + 灯笼 + 日本地图
```

一次画面突出 1–2 个明显日本元素即可。

---

# 9. 动画原则

动态背景必须非常慢。

目标不是“宣传视频”，而是“旅行中的一个安静瞬间”。

推荐运动：

- 电车缓慢驶过
- 水面轻微变化
- 树叶 / 枝条微动
- 光线极轻变化
- 非必要情况下不要频繁切镜

如果使用循环视频：

```text
推荐循环长度：20–30 秒
```

必须尽量无感循环。

禁止：

- 快速镜头切换
- 快速缩放
- 高频粒子
- 强烈 parallax
- 大面积闪烁
- 自动播放有声音的视频

视频必须静音。

---

# 10. 视频技术实现

优先使用原生 `<video>`。

推荐结构：

```html
<video autoplay muted loop playsinline poster="...">
  <source src="...webm" type="video/webm" />
  <source src="...mp4" type="video/mp4" />
</video>
```

必须支持：

```text
WebM
MP4 fallback
poster 静态封面
```

不要安装 video player library。

不要使用：

- GIF
- Lottie
- Three.js
- Canvas 动画框架
- WebGL framework
- Framer Motion

---

# 11. 媒体资产边界

如果仓库当前没有最终授权视频：

不要联网下载不明版权视频并提交到仓库。

应完成：

1. 正确的视频组件结构；
2. poster fallback；
3. 清晰的媒体路径约定；
4. 在缺少视频时页面仍然完整可用。

推荐路径：

```text
public/media/home/home-hero.webm
public/media/home/home-hero.mp4
public/media/home/home-hero-poster.webp
```

如项目已有媒体目录规范，则遵守现有规范。

如果文件不存在，组件不得产生 404 噪音循环或破坏首屏。

可通过配置或存在性明确的资源策略决定是否渲染 `<video>`。

不要生成假二进制文件。

---

# 12. Poster / Fallback

视频加载前必须有稳定的静态主画面。

Poster 应与动态视频第一帧尽量一致。

当：

- 网络较慢
- 视频加载失败
- 用户 reduced motion
- 浏览器不支持相关编码

页面必须仍然看起来是完整正式首页。

静态 fallback 不是错误状态。

---

# 13. Readability Overlay

动态背景上增加非常克制的可读性覆盖层。

方向：

```text
暖白 / 柔和浅色 translucent overlay
```

目标强度约：

```text
15%–20%
```

可以按实际视觉调整。

必须保证主标题和按钮在不同视频画面帧下仍清晰。

不要用大片纯黑遮罩把背景压暗成普通 Hero。

---

# 14. Header

桌面端：

```text
左上：Journi / 当前正式品牌名
右上：语言入口
```

如果项目当前仍统一使用 `TravelAssist` 而品牌名尚未正式迁移，不要擅自全仓改名。

只在已存在的品牌组件边界内遵循当前仓库 canonical naming。

不要在本 Task 做品牌 rename migration。

Header 要求：

- 高度紧凑
- 视觉透明 / 轻量
- 不做传统大型导航栏
- 不增加产品 / 博客 / 定价 / 关于等入口

---

# 15. HomeHero

Hero 从旧版“半透明大卡片”进一步简化。

目标是让文字像直接存在于场景上，而不是再堆一个大型玻璃容器。

主要内容：

```text
下一站，去哪里？

[ 让我们开始吧 → ]

[ 登录 ]
```

可选小辅助文案：

```text
规划行程 · 对话调整
```

要求：

- 主标题为绝对第一视觉文字
- CTA 为主要操作
- 登录弱于 CTA
- 不再出现多个信息卡
- 不出现功能图标组

---

# 16. Start CTA 必须保留 Task 3 行为

主 CTA 必须继续导航到：

```text
/start
```

不要因为视觉重构改回 placeholder。

不要使用：

```html
<a href="#"></a>
```

优先保持 Server Component 可用导航方式，例如 Next.js `Link`。

禁止为了按钮 hover 动效把整个 HomePage 改成 Client Component。

---

# 17. 登录入口

本 Task 只保留登录 UI 入口。

如果当前项目没有正式 Auth Flow：

不要创建：

- OAuth
- NextAuth/Auth.js
- Supabase Auth
- Firebase Auth
- 自制账号系统

登录按钮可以保持明确的未来接入边界。

不要制作一个假的可登录流程。

---

# 18. AI Entry

右下角保留现有 AI 浮动入口。

视觉改为更加克制的圆形按钮：

```text
圆形
轻阴影
清晰 AI 图标
尺寸不抢主 CTA
```

Desktop 固定右下。

Mobile 注意：

- 不遮挡 CTA
- 不遮挡安全区域
- 触控尺寸合理

必须保留 accessible label。

---

# 19. AIConversationPanel

保留 Task 2 已建立的 AIConversationPanel 交互壳层。

本 Task 可以根据最终视觉统一：

- 圆角
- 边框
- 背景透明度
- spacing
- typography
- 阴影

但禁止接真实 AI。

首页打开 AI 时，初始体验尽量极简：

```text
你好，想去哪里？
```

加一个输入区域即可。

不要在初始空状态就塞：

- 路线结果卡
- 景点列表
- 多个推荐方案
- 假 AI 回复流

---

# 20. AI Panel 背景响应

AI Panel 展开后：

- 背景可以轻微变暗
- 背景可以轻微 blur
- 主页面仍保持可辨识

不要把页面切换成单独 Chat Page。

关闭后恢复。

效果必须轻量。

---

# 21. AI Accessibility 必须保持

至少继续满足：

```text
aria-expanded
aria-controls
键盘打开
Escape 关闭
关闭按钮可聚焦
打开后焦点进入合理位置
关闭后焦点回到 AIEntryButton
```

如果现有实现已经正确，不要无意义重写。

---

# 22. 色彩

总体方向：

```text
暖白
纸白
墨色
日本靛蓝
极少量朱红强调
```

禁止绿色作为品牌主色。

主 CTA 使用稳定、低饱和的深蓝 / 靛蓝方向。

朱红只允许用于非常小的状态 / 地点 / 品牌细节，不要成为大面积按钮色。

继续优先使用现有 Semantic Tokens。

如果需要新增 Token：

使用语义命名，不要命名为：

```text
blue-1
japan-red
fuji-gray
```

---

# 23. 圆角规范

参考：

```text
大浮层：24–28px
普通卡片：18–22px
输入框：16–18px
主按钮：pill / 999px
AI 按钮：circle
```

不要到处使用不一致的随机圆角值。

尽量映射到现有 radius token。

---

# 24. 阴影 / 边框

整体阴影必须非常弱。

视觉层级主要依靠：

```text
留白
透明度
背景对比
轻边框
```

而不是浓重 box-shadow。

不要做夸张玻璃拟态。

---

# 25. Typography

本 Task 不负责冻结最终品牌字体。

使用现有字体栈。

如果需要优化中文标题：

优先通过：

- font-weight
- letter-spacing
- line-height
- size

调整。

不要为了一个首页安装大型新字体包。

---

# 26. Server / Client Boundary

页面主体尽量保持 Server Component。

Client Component 仅限真正需要交互的部分，例如：

```text
AI panel open/close state
```

视频 `<video>` 本身不需要为了 autoplay 变成 Client Component。

不要把 HomePage 整体加上：

```ts
"use client";
```

除非有无法避免且明确解释的原因。

---

# 27. prefers-reduced-motion

必须支持：

```css
@media (prefers-reduced-motion: reduce);
```

对于 reduced motion 用户：

- 不播放非必要背景动画，或直接使用 poster
- 关闭非必要移动 / 缩放效果
- AI panel 仍可正常使用

动态背景不能成为理解首页的必要条件。

---

# 28. Mobile 策略

移动端不应机械缩小 Desktop。

建议：

- 使用同一 poster / 场景的更合适裁切
- 主标题适当居中
- CTA 宽度适合单手操作
- AI 浮动按钮避开 safe area
- Header 保持非常薄

如果移动端自动视频明显影响性能：

允许降级为 poster。

这是正式设计策略，不算功能缺失。

---

# 29. Responsive 验证

至少验证：

```text
1600 × 900
1440 × 900
1024 × 768
390 × 844
```

要求：

Desktop：

- 背景有沉浸感
- Hero 清晰
- Header 不抢空间
- AI 入口右下稳定

Tablet：

- 标题、按钮不溢出
- AI panel 不超 viewport

Mobile：

- 无横向滚动
- CTA 易点击
- AI 入口不遮挡 CTA
- 标题在背景上仍可读

---

# 30. Loading / Layout Stability

视频加载不能导致明显 CLS。

背景容器从首帧开始就必须占满正确尺寸。

推荐：

```text
position: absolute/fixed layer
inset: 0
object-fit: cover
```

具体实现按当前架构调整。

Poster 和 video 必须使用相同容器尺寸。

---

# 31. Performance

不要因为首页视觉增加大型运行时依赖。

关注：

- 视频不要阻塞主 UI 渲染
- 前景 HTML 先可用
- poster 可快速显示
- 控制视频资源大小
- 不做 JS 帧动画

如果现有项目支持 preload / metadata 策略，可合理使用。

不要为了性能优化引入复杂自定义 loader。

---

# 32. SEO / Semantic Structure

保持合理语义：

```text
header
main
h1
nav/action semantics
button/link semantics
```

主标题只需要一个 H1。

背景视频应视为装饰内容，不应影响屏幕阅读器理解页面。

装饰性背景不需要冗长 alt 描述。

---

# 33. 不做的事情

本 Task 严禁：

```text
真实 AI API
OpenAI SDK
Auth
OAuth
数据库
Supabase
Firebase
地图 SDK
Trip Planner 主页面
推荐算法
支付
Analytics 新接入
Lottie
Three.js
Framer Motion
大型 UI library
大型 icon package
视频播放器 library
```

同时不要重构与首页无关的 Start Flow 业务逻辑。

---

# 34. Existing Content Preservation

必须保护：

- Task 3 `/start` route
- Task 3 StartFlowDraft
- Task 3 validation
- Task 3 Start Flow UI
- 现有 Design Tokens
- 现有 Button / FloatingPanel primitives
- 现有 AI panel accessibility 行为
- 工程基线 / ESLint / Prettier / TypeScript config

除非确实发现首页实现所需 bug，否则不要顺手重构。

---

# 35. 推荐目录调整

可继续使用现有：

```text
src/features/home/
```

背景推荐保持独立组件：

```text
src/features/home/components/immersive-background.tsx
```

或保留已有：

```text
dynamic-background-layer.tsx
```

并升级职责。

不要同时留下两个互相竞争的背景组件。

如果重命名，确保旧引用和死代码清理干净。

---

# 36. 媒体路径常量

如果媒体路径需要集中配置，可以使用简单常量。

不要为了 3 个路径建立复杂 configuration framework。

必须避免散落多个 magic string。

---

# 37. 手动行为验证

至少验证：

```text
首页初次加载有 poster / 背景
视频可用时正常循环
视频失败时 poster 仍然存在
主标题始终可读
CTA 点击进入 /start
登录入口不产生死链接异常
AI 按钮可以打开 panel
Escape 关闭 AI panel
关闭后焦点返回 AI 按钮
reduced motion 下不依赖视频
Mobile 无横向滚动
```

---

# 38. Accessibility 验证

至少验证：

```text
Tab
Shift+Tab
focus-visible
AI open/close keyboard
Escape close
focus restore
主 CTA link semantics
装饰背景不会抢读屏焦点
reduced motion
```

---

# 39. 视觉截图检查

如果环境支持截图，至少检查：

```text
1600x900 — 首页默认
1600x900 — AI panel opened
390x844 — 首页默认
390x844 — AI panel opened
```

截图用于检查，不必提交仓库。

重点看：

- 背景裁切
- 主标题位置
- CTA 层级
- Header 留白
- AI 入口
- AI panel 圆角与尺寸
- 移动端 safe area

---

# 40. 自动验证

完成后执行：

```bash
npm run lint
npm run typecheck
npm run format:check
npm run build
```

全部必须通过。

然后：

```bash
npm run dev
```

实际浏览器验证首页和 `/start`。

---

# 41. Git Diff 检查

完成后：

```bash
git status
git diff --check
git diff origin/develop...HEAD
```

确认：

- 没有误删 `/start`
- 没有修改不相关业务
- 没有新增大型依赖
- 没有提交 `.env.local`
- 没有 Secret
- 没有 node_modules
- 没有本地截图
- 没有未经授权的大型媒体素材
- 没有第二种 lock file

---

# 42. Commit

验证通过后：

```bash
git add .
git commit -m "feat(home): finalize immersive homepage visual"
```

然后：

```bash
git push -u origin feature/a-homepage-final-visual
```

禁止 force push。

不要自动 merge 到 `develop`。

---

# 43. Issue / Task / Branch 关联

本任务关联：

```text
Task: TASK-004-A
Issue: #20
Feature Branch: feature/a-homepage-final-visual
Base: develop
```

PR 标题建议：

```text
[TASK-004-A] Finalize immersive homepage visual
```

PR body 必须引用：

```text
Closes #20
Task: TASK-004-A
```

如果仓库已有 PR template / tracking metadata 规范，优先使用仓库最新规范。

---

# 44. Definition of Done

只有以下全部满足才算完成：

- [ ] Task 3 已合入 develop
- [ ] 从最新 develop 创建 feature branch
- [ ] 首页主视觉符合 V4 最终方案
- [ ] 主标题为「下一站，去哪里？」
- [ ] 主 CTA 为「让我们开始吧 →」
- [ ] 主 CTA 继续进入 `/start`
- [ ] 登录为弱化次级入口
- [ ] 首页没有多余 Marketing 内容
- [ ] 背景采用独立组件层
- [ ] 支持 WebM
- [ ] 支持 MP4 fallback
- [ ] 支持 poster fallback
- [ ] 视频失败时页面正常
- [ ] reduced motion 正常
- [ ] AI 入口保持右下角
- [ ] AI panel 可打开关闭
- [ ] Escape 正常
- [ ] focus restore 正常
- [ ] Desktop 正常
- [ ] Tablet 正常
- [ ] Mobile 正常
- [ ] 无横向滚动
- [ ] 不接真实 AI
- [ ] 不接 Auth
- [ ] 不接 Map
- [ ] 不接 Database
- [ ] 不引入大型依赖
- [ ] lint Passed
- [ ] typecheck Passed
- [ ] format check Passed
- [ ] build Passed
- [ ] feature branch 已 push
- [ ] PR 可创建并引用 Issue #20

---

# 45. 最终报告格式

完成后严格按照：

```markdown
# Task 4 Result

## Status

Completed / Partially Completed / Blocked

## Prerequisite

- Task 3 merged into develop:
- base commit:

## Tracking

- Task: TASK-004-A
- Issue: #20
- Branch:
- Commit:
- Pushed:

## Homepage Final Visual

- headline:
- primary CTA:
- secondary action:
- header:
- AI entry:

## Background

- implementation:
- WebM:
- MP4 fallback:
- poster:
- overlay:
- video failure behavior:
- reduced motion behavior:

## Preserved From Task 3

- `/start` route:
- CTA navigation:
- Start Flow:

## AI Shell

- panel preserved:
- keyboard:
- Escape:
- focus restore:
- real AI calls added: No

## Responsive Validation

- 1600x900:
- 1440x900:
- 1024x768:
- 390x844:

## Accessibility

- keyboard:
- focus-visible:
- reduced motion:
- decorative background semantics:

## Performance

- poster first render:
- layout shift:
- media loading:

## Validation

- lint:
- typecheck:
- format check:
- build:
- dev server:
- console errors:

## Dependencies Added

- None / ...

## Media Assets Added

- None / list with source/license

## Existing Content Preserved

- Start Flow:
- design system:
- AI shell:
- docs:

## Problems Found

- ...

## Ready For Pull Request

Yes / No

## Pull Request

- URL / Not created
```

---

# 核心原则

```text
首页只做一件事：让用户开始旅行
>
背景负责情绪，UI 负责操作
>
日本感来自场景、留白和色彩，不来自符号堆叠
>
动态背景必须有可靠静态降级
>
保留 /start，不覆盖 Task 3
>
AI 是全局入口，但本 Task 不接真实 AI
>
不引入大型依赖
>
完成后停止，等待 Review
```
