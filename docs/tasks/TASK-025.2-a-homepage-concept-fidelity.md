# TASK-025.2-A — Homepage Concept Fidelity Implementation

## Metadata

- Task ID: `TASK-025.2-A`
- WBS: `3.2` follow-up / visual fidelity implementation
- Owner: `A`
- Responsibility: `Main Travel System / Website Entry`
- Priority: `P1`
- Status: `可开始`
- Canonical Issue: `#246`
- Depends On: `TASK-024-A / WBS 3.1 completed`
- Related Task: `TASK-025-A / WBS 3.2 static background MVP`
- Video Enhancement: `TASK-025.1-A / WBS 3.2.1` — Deferred, NOT part of this task
- Suggested Branch: `feature/a-homepage-concept-fidelity`

## Objective

将 TravelAssist 首页调整到用户已确认的首页概念图视觉效果，完成 **Static-first Homepage MVP 的高保真实装**。

本任务的重点不是重新设计首页，而是：

```text
当前可用 Home runtime
+
TASK-024-A 已冻结的全站品牌视觉
+
用户确认的首页概念图
→
高保真生产页面
```

必须保持现有真实导航、Auth/Personal Center 边界和 AI 入口，不允许为了追求截图相似而把真实功能改成假的静态 UI。

---

# 1. Canonical Visual Reference

Codex 必须以仓库中的正式概念图为第一视觉参考：

```text
assets/design/homepage/homepage-concept-static-v1.png
```

如果该文件尚未进入当前执行基线，则先停止并记录 `Blocked: canonical concept image missing`，不得凭记忆重绘。

概念图尺寸：

```text
1672 × 941
```

视觉目标：

- 日本海边小镇 + 地方电车 + 樱花 + 夕阳 / 暖光
- 极简沉浸式首页
- UI 居中而不是左下角工作台式布局
- 首页没有大型 Card 容器
- 暖白 / 象牙白半透明表面
- 深墨正文
- 珊瑚朱红 / 暖红 CTA
- 个人中心入口为真实头像 + 用户名 + “个人中心”胶囊
- AI 入口为右下角圆形暖红按钮
- 顶部左侧 Brand 胶囊、右侧语言胶囊

---

# 2. Source of Truth Priority

优先级：

1. 用户已确认的 `assets/design/homepage/homepage-concept-static-v1.png`
2. TASK-024-A 已验收的 Main Shell / shared brand tokens
3. 本 Task
4. `docs/ui/home-page.md`
5. TASK-004-A 历史首页设计
6. 当前 develop Home 实现

当旧文档与用户最新概念图冲突时，以最新概念图 + TASK-024 品牌体系为准。

但不能因此越界实现其他 WBS 的真实业务。

---

# 3. Required Visual Composition

## 3.1 Desktop 目标结构

```text
┌──────────────────────────────────────────────────────────────┐
│ [TravelAssist]                                      [中文⌄] │
│                                                              │
│                                                              │
│                 TRAVELASSIST · 旅 程 规 划                   │
│                          ───                                 │
│                                                              │
│                   下一站，去哪里？                           │
│                                                              │
│                   规划行程 · 对话调整                        │
│                                                              │
│                [ 让我们开始吧  → ]                           │
│                                                              │
│                 [头像  Yuki · 个人中心  >]                   │
│                                                              │
│                                                    [ AI ]     │
└──────────────────────────────────────────────────────────────┘
```

要求整体视觉中心与概念图接近，而不是保留旧版 Hero 左下构图。

## 3.2 Brand

左上：

- 使用当前正式 TravelAssist Logo / BrandLogo
- 暖白胶囊背景
- 轻微透明感
- 大圆角
- 轻阴影
- 不能重新做 Logo 图片

## 3.3 Language

右上：

- `中文` + chevron
- 暖白胶囊
- 紧凑
- 视觉尺寸与 Brand 平衡
- 不扩展 i18n 业务

## 3.4 Eyebrow

居中小字：

```text
T R A V E L A S S I S T  ·  旅 程 规 划
```

下方一条短珊瑚红装饰线。

不增加新的营销文案。

## 3.5 Main Title

```text
下一站，去哪里？
```

要求：

- 视觉绝对第一文字焦点
- 居中
- 大字号
- 深墨 / 近黑
- 使用现有共享 heading 字体体系
- 不下载新字体
- 不做渐变文字

## 3.6 Subtitle

```text
规划行程 · 对话调整
```

居中、字距略开、明显弱于主标题。

## 3.7 Primary CTA

```text
让我们开始吧  →
```

要求：

- 大号胶囊
- 红 / 珊瑚朱红渐变或非常轻的同系层次
- 白字
- 保持现有 `/start` 真实导航
- Hover / Focus 轻量
- 不能新增动画依赖

## 3.8 Personal Center Entry

概念图中的：

```text
[头像] Yuki · 个人中心  >
```

实现要求：

- 必须复用现有 AccountAvatar / Auth / Personal Center 导航边界
- 已登录用户：使用真实 session/profile 可用数据
- 若现有生产边界只能安全显示现有已接线 identity，则复用真实数据
- 未登录用户：不得伪造 Yuki 或真实头像，应显示现有 Login / Guest 行为
- 不允许为了与概念图完全一致硬编码虚假用户
- 胶囊视觉可按概念图调整

完整登录/头像业务仍属于 WBS 3.4；本 Task 只能消费已有真实能力。

## 3.9 AI Entry

右下：

- 复用现有 Home AI Entry
- 圆形
- 暖红主体
- 外圈暖白
- 轻阴影
- 尺寸、位置接近概念图
- 原有打开 / Escape / focus return 行为必须保留
- 不接真实 AI API

---

# 4. Background Rules

本 Task 使用静态背景作为正式 MVP。

Canonical background runtime path：

```text
public/media/home/home-hero-poster.webp
```

如果用户确认概念图中的背景图已经作为正式 homepage poster 进入仓库，则优先使用该正式文件。

如果概念图本身只是完整 UI 合成图，不能直接把整张 UI 截图作为 background，否则会重复 Logo / 标题 / CTA。

必须区分：

```text
背景资产
≠
完整概念图截图
```

如果仓库没有“无 UI 的对应背景图”，使用当前 `home-hero-poster.webp`，通过 layout / crop / overlay 实现概念图构图。

不得自行联网下载背景。

不得生成视频。

---

# 5. Visual Fidelity Priorities

优先调整：

1. Hero 由左下改为视觉居中
2. 标题字号 / 行距 / 宽度
3. Eyebrow / 短装饰线
4. CTA 大小 / 胶囊比例
5. Personal Center 胶囊
6. Header 两端位置 / 尺寸
7. AI Entry 右下位置
8. 背景 crop / object-position
9. Overlay 亮度与文字可读性
10. Desktop / Tablet / Mobile 的比例

目标不是机械像素复制，而是达到：

> 用户并排看概念图和生产页面时，第一眼认为是同一设计，而不是两个版本。

---

# 6. Preserve Existing Functionality

必须保留：

- Logo → `/`
- CTA → `/start`
- Personal Center / Login 真实导航
- Avatar Popover 现有逻辑（如当前入口使用）
- AI Entry open / close / Escape / focus return
- Main Shell route boundary
- skip link / focus-visible
- Home history / browser navigation

不得把真实 Link 改成假按钮。

不得为了视觉复刻移除 accessibility。

---

# 7. Out of Scope

不得执行：

- WBS 3.3 的新业务逻辑
- WBS 3.4 的完整 Auth / Session 新实现
- WBS 3.5 的 AI 新功能
- WBS 3.7 Loading / Empty / Error 系统
- TASK-025.1-A 视频增强
- Personal Center 内部重设计
- Start Wizard 重设计
- Planner / Detail 修改
- Map / Route / POI / Booking / DB / Engine
- 新依赖 / 新字体 / 新 animation library

---

# 8. Responsive Requirements

至少验证：

```text
1672 × 941  canonical reference ratio
1440 × 900
1024 × 768
390 × 844
320 × 568
```

## Desktop

- Hero 视觉居中
- 标题不与背景高对比区域冲突
- CTA 与 Personal Center Entry 纵向节奏接近概念图
- Header 不形成传统 navbar
- AI 在右下安全区域

## Tablet

- 主标题可适当缩小
- 不允许 Hero 被 Header 压缩到过低
- 胶囊控件保持触控空间

## Mobile

概念图是 Desktop，不要求手机机械复制 Desktop。

Mobile 目标：

- 保持同一设计语言
- Hero 仍居中
- 标题分行自然
- CTA 宽度合理
- 登录 / 个人中心入口不与 CTA 冲突
- AI 不遮挡主操作
- Header Brand / Language 不碰撞
- 背景 crop 保持旅行场景识别度

---

# 9. Visual QA

必须生成并保存：

```text
docs/qa/TASK-025.2/
```

至少包括：

- 1672×941 screenshot
- 1440×900 screenshot
- 1024×768 screenshot
- 390×844 screenshot
- 320×568 screenshot
- side-by-side comparison 或明确的视觉对照说明
- browser report

用户最终视觉验收必须基于实际生产截图，不得只依据 DOM / CSS 数值。

---

# 10. Geometry Guard

只允许修改 Home 页面相关文件和必要 shared visual adapters。

必须证明：

- `/start` layout geometry 未变
- `/planner` geometry 未变
- Personal Center Shell geometry 未变

如果 shared token 修改会影响这些页面，必须回归检查；无必要不要改全局 token。

---

# 11. Validation

至少执行：

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present
git diff --check
```

如果没有 npm test script：

- 运行全仓真实 Node tests
- 运行 TASK-025.2 专项测试

浏览器必须至少覆盖：

- `/`
- CTA → `/start`
- Personal Center / Login 入口
- AI Entry

检查：

- console error
- hydration error
- horizontal overflow
- keyboard focus
- Escape / focus return

---

# 12. Git / Tracking

开始前：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

必须从最新 `origin/develop` 创建：

```text
feature/a-homepage-concept-fidelity
```

启动时：

```text
WBS 3.2 = 进行中
```

实现完成但未合并：

```text
WBS 3.2 = 待审查
```

用户视觉验收通过且 PR 合入 develop：

```text
WBS 3.2 = 已完成
```

Result：

```text
docs/tasks/RESULT-TASK-025.2-a-homepage-concept-fidelity.md
```

必须同步：

- Issue #246
- Task
- Result
- WBS
- Branch
- Commit
- Draft PR

不得覆盖其他工作站最新 WBS 记录。

---

# 13. Git Safety

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

禁止整份 ours / theirs 解决 WBS 冲突。

---

# 14. Stop Rule

完成后停止。

不要自动开始：

- TASK-025.1-A
- WBS 3.2.1
- WBS 3.3

等待用户视觉验收。
