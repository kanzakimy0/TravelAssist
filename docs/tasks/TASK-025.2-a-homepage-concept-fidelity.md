# TASK-025.2-A — Homepage Concept Fidelity Implementation

## Metadata

- Task ID: `TASK-025.2-A`
- WBS: `3.2` follow-up / visual fidelity implementation
- Owner: `A`
- Responsibility: `Main Travel System / Website Entry`
- Priority: `P1`
- Status: `进行中`
- GitHub Issue: `#251`
- Related Issue: `#246`（TASK-025-A / 3.2 static-first MVP）
- Depends On: `TASK-024-A / WBS 3.1 completed`
- Video Enhancement: `TASK-025.1-A / WBS 3.2.1` — Deferred / NOT part of this task
- Suggested Branch: `feature/a-homepage-concept-fidelity`
- Result File: `docs/tasks/RESULT-TASK-025.2-a-homepage-concept-fidelity.md`

---

# 1. Objective

将 TravelAssist 当前首页调整到用户最新确认的首页概念图风格，完成 **WBS 3.2 静态首页 MVP 的高保真实装**。

本任务不是重新设计业务，而是把：

```text
当前真实 Home runtime
+ TASK-024-A 已冻结的全站品牌视觉
+ 当前正式静态 Poster
+ 本 Task 中冻结的概念图版式规格
→ 高保真生产页面
```

要求用户并排看概念图与生产页面时，第一眼认为是同一设计，而不是旧版首页的轻微换皮。

---

# 2. Canonical Concept Specification

用户确认的概念图原始画布：

```text
1672 × 941
```

概念图本身不要求一定进入 Git 仓库；**本 Task 以下版式和视觉规格就是可独立执行的 canonical specification**。

如果本地/仓库另外存在：

```text
assets/design/homepage/homepage-concept-static-v1.png
```

则将其作为额外像素对照参考；如果不存在，不得因此 Blocked。

背景方向：

```text
日本海边小镇
+ 地方电车
+ 海面 / 远山
+ 樱花前景
+ 暖色夕阳 / 柔和空气感
```

视觉语言：

```text
极简
沉浸式
暖白
深墨
珊瑚朱红
大圆角
轻阴影
安静
高级但不奢华
```

---

# 3. Source of Truth Priority

优先级：

1. 本 TASK-025.2-A 的 Concept Specification
2. 用户已验收的 TASK-024-A Main Shell / Brand System
3. 当前 `origin/develop` 的真实 Home / Auth / Personal Center / AI 行为
4. `docs/ui/home-page.md`
5. TASK-004-A 历史首页设计

旧文档若要求 Hero 左下、靛蓝 CTA 等，与本 Task 最新视觉规格冲突时，以本 Task + TASK-024 品牌体系为准。

但不得越界实现 3.3 / 3.4 / 3.5 的新业务。

---

# 4. Target Desktop Composition

1672×941 参考画面采用以下视觉结构：

```text
┌──────────────────────────────────────────────────────────────┐
│ [ TravelAssist ]                                   [ 中文⌄ ] │
│                                                              │
│                                                              │
│               T R A V E L A S S I S T · 旅 程 规 划        │
│                            ───                               │
│                                                              │
│                    下一站，去哪里？                          │
│                                                              │
│                    规划行程 · 对话调整                       │
│                                                              │
│                 [ 让我们开始吧   → ]                         │
│                                                              │
│                  [头像  用户 · 个人中心  ›]                  │
│                                                              │
│                                                    [  AI  ]   │
└──────────────────────────────────────────────────────────────┘
```

## 4.1 Geometry Bands

以 1672×941 为 canonical desktop ratio，视觉位置控制在以下范围：

| 元素 | 目标区域 |
| --- | --- |
| Brand | 左 3%–5%，上 3%–5% |
| Language | 右 4%–6%，上 3%–5% |
| Hero 内容中心线 | x ≈ 50% |
| Eyebrow | y ≈ 22%–25% |
| 主标题 | y ≈ 29%–39% |
| 副标题 | y ≈ 42%–46% |
| CTA | y ≈ 48%–58% |
| Personal Center / Login | y ≈ 60%–68% |
| AI | 右 3%–5%，下 5%–8% |

不要求机械使用绝对像素，但相对节奏必须接近。

---

# 5. Header

## 5.1 Brand Capsule

左上：

- 复用现有 `BrandLogo`
- 不重新制作 Logo 图
- 暖白 / 象牙白半透明胶囊
- 大圆角 / pill
- 轻柔阴影
- 胶囊高度约 54–64px（1672 desktop）
- Logo 与文字垂直居中
- 不做传统整条 Navbar

## 5.2 Language Capsule

右上：

```text
中文 ⌄
```

要求：

- 暖白胶囊
- 高度与 Brand 接近
- 宽度更短
- 44px+ 可点击区域
- 保留现有语言入口行为
- 不新增完整 i18n

---

# 6. Hero

Hero 必须从旧版左下构图调整为 **真正视觉居中**。

## 6.1 Eyebrow

显示：

```text
T R A V E L A S S I S T  ·  旅 程 规 划
```

要求：

- 大写英文字距拉开
- 中文也适度增加字距
- 深墨 / 次级墨色
- 居中
- 下方短珊瑚红装饰线
- 装饰线约 48–64px 宽、2–3px 高

## 6.2 Main Title

```text
下一站，去哪里？
```

要求：

- 页面第一文字焦点
- 居中
- 深墨 / 近黑
- 中文人文感 heading 字体，必须复用 shared heading stack
- 不下载新字体
- 1672 desktop 视觉字号目标约 72–92px
- `line-height` 约 1.05–1.12
- 不用粗黑 SaaS 风格
- 不用渐变文字

## 6.3 Subtitle

```text
规划行程 · 对话调整
```

要求：

- 居中
- 明显弱于主标题
- 字距略开
- 1672 desktop 约 24–32px 视觉量级
- 不增加第三行营销文案

---

# 7. Primary CTA

文案：

```text
让我们开始吧  →
```

行为：

```text
/start
```

视觉：

- 大型水平胶囊
- 1672 desktop 目标宽约 360–390px
- 高约 76–88px
- 珊瑚朱红 / 暖红，可用克制的同系渐变
- 白色文字
- 字号约 24–30px
- 轻阴影
- 背景可有非常轻微和风纹理感，但不能增加复杂图片资产
- Hover / Focus 只做轻量亮度 / 阴影 / focus ring
- 禁止明显弹跳或位移动画

不得把 CTA 改为假按钮。

---

# 8. Personal Center / Login Entry

概念图登录后形态：

```text
[头像] 用户名 · 个人中心  ›
```

视觉：

- CTA 正下方
- 暖白 / 半透明胶囊
- 高度约 58–68px（1672 desktop）
- 头像圆形
- 用户名深墨
- “个人中心”作为同一行次级说明
- 右侧 chevron
- 轻描边 / 轻阴影

## Critical Auth Rule

**禁止硬编码 `Yuki`、假头像或假登录态。**

必须：

- 复用当前真实 Auth / Session / AccountAvatar / Personal Center 路由能力
- 已登录：显示当前生产能力允许的真实用户信息
- 未登录：显示当前已有 Login / Guest 入口，不制造登录成功假象

如果 TASK-024 目前只有“旅”占位而 3.4 尚未完成：

- 可以按概念图把入口做成同样的暖白胶囊结构
- 但内容必须仍是真实 Guest/Login 状态
- 完整 Session-based Avatar 统一留给 WBS 3.4

本 Task 只改视觉适配，不扩展 Auth 业务。

---

# 9. AI Entry

右下保留现有 AI Entry 行为。

视觉目标：

- 圆形
- 暖白外圈
- 珊瑚红内部圆
- 白色 AI 图形 / 现有可访问图标
- 1672 desktop 外径约 84–100px
- 右边距约 45–65px
- 下边距约 45–65px
- 柔和阴影

必须保留：

- accessible label
- open
- close
- Escape
- focus return

不接真实 AI API。

---

# 10. Background

正式静态背景 runtime：

```text
public/media/home/home-hero-poster.webp
```

当前该 Poster 与概念图画布同为 1672×941，应优先审计它是否就是概念图对应的无 UI 场景素材。

必须区分：

```text
纯背景 Poster
≠
完整 UI 概念图截图
```

**禁止把完整概念图截图作为页面 background**，否则会重复 Logo / 标题 / CTA。

如果当前 Poster 已是同一海边列车场景：

- 直接复用
- 调整 `object-position` / crop / overlay 即可

如果不是：

- 先搜索仓库已有正式授权的同场景 Home 素材
- 没有则保持当前正式 Poster，并记录视觉差异
- 不联网随机下载
- 不生成视频

---

# 11. Overlay / Readability

概念图整体是：

- 明亮
- 暖色
- 低压迫
- 背景清楚可辨

Overlay 只做最小可读性增强。

要求：

- 不用大片黑色遮罩
- 不把背景洗成纯白
- 不增加 Hero Card
- 主标题区域可以有极轻暖白雾化
- Header / CTA / Personal Center 胶囊本身负责局部可读性

---

# 12. Preserve TASK-024 Brand System

必须继续使用：

- `--color-bg-canvas`
- `--color-bg-elevated`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-accent-primary`
- `--color-accent-primary-hover`
- shared radius / border / shadow / focus
- shared `BrandLogo`
- shared AccountAvatar 能力

无必要不要修改全局 token。

不得建立第二套 Brand / Header / Avatar / Design System。

---

# 13. Functional Preservation

必须保持：

- Logo → `/`
- CTA → `/start`
- Login / Personal Center 真实导航
- Main Shell route boundary
- AI Entry 行为
- keyboard focus
- skip link
- browser back / forward

不得为了截图相似删除 accessibility 或真实 Link。

---

# 14. Scope Guard

允许主要修改：

```text
src/features/home/**
```

必要时只做最小 shared adapter 修改。

不得修改业务：

```text
src/features/start-flow/**
src/features/planner/**
src/features/routing/**
src/features/personal-center/**   # 仅允许共享组件引用所需的最小无行为适配；禁止内部重设计
src/db/**
```

不得实施：

- WBS 3.3 新业务
- WBS 3.4 完整 Auth / Session 新实现
- WBS 3.5 AI 新功能
- WBS 3.7 状态系统
- TASK-025.1-A 视频
- Map / Route / POI / Booking / DB / Engine
- 新字体
- 新动画库
- 新 UI library

---

# 15. Responsive

必须验证：

```text
1672 × 941
1440 × 900
1024 × 768
390 × 844
320 × 568
```

## Desktop

- Hero 保持视觉居中
- 背景列车 / 海岸 / 樱花仍具有识别度
- Header 两端稳定
- CTA / User Entry 纵向间距不拥挤
- AI 在右下安全区

## Tablet

- 标题缩放但保持中心焦点
- Brand / Language 不碰撞
- CTA 触控区域完整

## Mobile

Desktop 概念图不是手机机械模板。

Mobile 必须：

- 延续同一视觉语言
- Hero 居中
- 主标题自然换行（必要时两行）
- CTA 宽度不超过安全边距
- Login / User entry 不与 CTA 或 AI 重叠
- Brand / Language 不碰撞
- AI 不遮挡主要操作
- Poster crop 仍看得出日本旅行场景
- 无横向滚动

---

# 16. Visual Acceptance Evidence

必须生成：

```text
docs/qa/TASK-025.2/
```

至少包含：

- `1672x941.png`
- `1440x900.png`
- `1024x768.png`
- `390x844.png`
- `320x568.png`
- browser report / measurement report
- visual comparison README

若不适合把 PNG 二进制提交 Git，可把截图放 QA worktree/cache，但必须提交：

- 路径
- SHA-256
- 复现命令
- comparison summary

最终 Result 必须明确提示用户进行视觉验收。

---

# 17. Geometry Regression Guard

必须证明 TASK-025.2 没有把全站其它页面带坏。

至少回归：

- `/start`
- `/planner`
- 当前真实 Detail
- `/personal-center`

要求：

- Start 主要容器几何不因 Home 改动变化
- Planner 地图 / 右栏 / 底栏几何不变化
- Personal Center Sidebar / Content geometry 不变化

若修改 shared token 导致变化，必须回退不必要的全局修改。

---

# 18. Validation

至少执行：

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present
git diff --check
```

如果没有 `npm test` script：

- 运行真实全仓 Node tests
- 新增并运行 TASK-025.2 专项 tests

专项至少覆盖：

- CTA `/start`
- Brand `/`
- Personal Center / Login 真实目标
- AI Entry 交互
- 无硬编码 Yuki
- 没有第二套 Logo
- 关键结构语义

浏览器检查：

- console errors = 0 new
- hydration errors = 0 new
- horizontal overflow = none
- focus visible
- Escape / focus return

---

# 19. Git / Tracking

开始前：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

然后读取：

```bash
git show origin/develop:docs/tasks/TASK-025.2-a-homepage-concept-fidelity.md
git show origin/develop:docs/project/WBS-TravelAssist.md
git show origin/develop:docs/project/WBS-3.2-static-first-amendment.md
```

从最新 `origin/develop` 创建：

```text
feature/a-homepage-concept-fidelity
```

启动：

```text
WBS 3.2 = 进行中
```

实现完成未合并：

```text
WBS 3.2 = 待审查
```

用户视觉验收通过 + PR 合入 develop：

```text
WBS 3.2 = 已完成
```

必须同步：

- Issue #251
- Related Issue #246
- Task
- Result
- WBS
- Branch
- Commit
- Draft PR

WBS 冲突必须逐段合并，禁止整份 ours / theirs。

---

# 20. Result Format

最终返回：

```md
# TASK-025.2-A Result

## Status

## Preflight
- execution base:
- WBS 3.2 before:
- TASK-024 merged:

## Tracking
- Issue #251:
- Related #246:
- Branch:
- Commit:
- Draft PR:
- WBS 3.2:

## Concept Fidelity
- header:
- hero center:
- eyebrow:
- title:
- subtitle:
- CTA:
- user/login entry:
- AI entry:
- background/crop:

## Auth Boundary
- logged-in behavior:
- guest behavior:
- hard-coded fake identity: No

## Responsive QA
- 1672x941:
- 1440x900:
- 1024x768:
- 390x844:
- 320x568:

## Regression
- Start:
- Planner:
- Detail:
- Personal Center:

## Validation
- lint:
- typecheck:
- build:
- node tests:
- task tests:
- diff-check:

## Visual Evidence

## Problems / Deferred

## WBS Updated
Yes / No

## Next Task
Do not start automatically.
```

---

# 21. Git Safety

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

不得删除用户未提交素材。

---

# 22. Stop Rule

完成 TASK-025.2-A 后停止，等待用户视觉验收。

不要自动开始：

- TASK-025.1-A / 3.2.1 video enhancement
- WBS 3.3
- WBS 3.4
- WBS 3.5
