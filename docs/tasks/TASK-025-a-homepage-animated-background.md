# TASK-025-A — Homepage Static Background Production MVP

## Metadata

- Task ID: `TASK-025-A`
- WBS: `3.2`
- Owner: `A`
- Responsibility: `Main Travel System / Website Entry`
- Priority: `P1`
- Status: `待审查（Static MVP 已实现，未合并）`
- GitHub Issue: `#246`
- Task File: `docs/tasks/TASK-025-a-homepage-animated-background.md`
- Suggested implementation branch: `feature/a-homepage-static-background-mvp`
- Depends On: `1.16`, `3.1`
- Scope Amendment: `docs/project/WBS-3.2-static-first-amendment.md`
- Historical Result: `docs/tasks/RESULT-TASK-025-a-homepage-animated-background.md`

## Scope Revision

本 Task 已按 2026-09-09 产品决策修订。

旧定义：

```text
3.2 = 必须接入 WebM / MP4 动态背景
```

新定义：

```text
3.2 = 首页静态 Production Hero Background MVP
3.2.1 = 后续动态视频背景增强
```

旧 Result 中“缺少已授权 WebM / MP4，因此 Blocked”是当时正确的历史记录，必须保留。

本次范围修订解除 3.2 对视频素材的硬依赖；不得删除或篡改历史 Result。

## Objective

将当前首页静态背景正式收口为可发布 MVP。

现有 `home-hero-poster.webp` 可以作为正式首页背景，而不是临时错误 fallback。

本 Task 不重新设计 Home。必须保持 TASK-024-A 已通过的：

- TravelAssist Brand / Header
- `下一站，去哪里？`
- `规划行程 · 对话调整`
- `让我们开始吧`
- 登录 / 用户入口
- Personal Center 入口
- AI 浮动入口
- 暖白 / 深墨 / 朱红全站品牌语言

## Mandatory Preflight

开始前：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

读取：

```bash
git show origin/develop:docs/project/WBS-TravelAssist.md
git show origin/develop:docs/project/WBS-3.2-static-first-amendment.md
git show origin/develop:docs/tasks/TASK-025-a-homepage-animated-background.md
git show origin/develop:docs/tasks/RESULT-TASK-025-a-homepage-animated-background.md
git show origin/develop:docs/ui/home-page.md
```

确认：

- TASK-024-A / PR #244 已合入 develop；
- WBS 3.1 已完成；
- WBS 1.16 已完成；
- 当前 Poster 真实存在；
- 没有其他正在执行的 Home 背景实现 PR 与本 Task 冲突。

## Mandatory Master WBS Sync

开始实现前，必须读取**最新** `docs/project/WBS-TravelAssist.md`，安全同步本次范围修订：

### 3.2

改为：

```text
首页背景区域 — 静态 Production MVP
Owner A
依赖 1.16, 3.1
状态：正式启动后进行中
```

### 3.2.1

新增/登记：

```text
首页动态视频背景增强
Owner A
依赖 3.2 + 已授权视频素材
状态：未开始 / Deferred
```

必须保留其他工作站最新记录。

禁止：

- 整份 ours / theirs；
- 覆盖别人 Task 状态；
- 删除旧 TASK-025 阻塞历史；
- 把 3.2.1 提前写成完成。

## Git Workflow

从最新 `origin/develop` 创建：

```text
feature/a-homepage-static-background-mvp
```

正式启动后：

```text
WBS 3.2 = 进行中
```

## Static Background Requirements

### Source

默认优先复用当前：

```text
public/media/home/home-hero-poster.webp
```

除非用户另行提供并确认新的静态背景，否则不替换素材。

### Visual Direction

保持当前已确认方向：

- 日本海边小镇；
- 地方铁路 / 电车；
- 海面 / 远山；
- 少量住宅 / 植被；
- 明亮、安静、真实旅行摄影感；
- 低饱和、暖色调；
- 不做旅游符号拼贴。

### Layout Preservation

不允许因背景收口重排：

- Header；
- Logo；
- Hero 标题；
- CTA；
- Login / Avatar；
- Personal Center 入口；
- AI 入口。

TASK-024-A 已验收的几何和全站视觉优先。

### Crop / Responsive

至少处理并验证：

- 1440×900
- 1024×768
- 390×844
- 320×568

要求：

- 主体构图不出现明显错误裁切；
- 标题 / CTA 始终可读；
- 关键电车 / 海岸氛围在主要尺寸仍可辨认；
- 无横向溢出；
- 不因图片尺寸产生 layout shift；
- Mobile 可以使用与 Desktop 不同的 `object-position`，但不重新设计页面。

### Overlay

只允许做最小可读性调整。

要求：

- 暖白 / 中性浅色；
- 不用厚重纯黑遮罩；
- 不把背景洗白到无法辨识；
- 不增加大型 Hero 卡片。

### Performance

检查：

- Next/Image 生产行为；
- 静态背景尺寸；
- 首屏加载；
- CLS；
- 不产生缺失 WebM / MP4 的 404 噪音；
- 无视频时不应成为 error state。

## Video Boundary

本 Task **不要求**：

```text
home-hero.webm
home-hero.mp4
```

无视频必须视为正常生产状态。

现有未来 Video runtime 可以保留，但：

- 不创建假视频；
- 不随机下载视频；
- 不用 CSS 动画冒充视频；
- 不为了 3.2 修改未来动态增强契约。

动态视频全部转移到 `TASK-025.1-A / WBS 3.2.1`。

## Accessibility

至少验证：

- 背景装饰不进入可访问内容流；
- `prefers-reduced-motion` 下仍稳定展示静态背景；
- Header / CTA / Login / AI 焦点不受影响；
- 对比度与焦点可见性不回退。

## Validation

至少执行：

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present
git diff --check
```

如果没有 npm test script，运行仓库真实 Node 全仓测试以及 TASK-025 专项测试。

## Browser / Visual QA

至少：

```text
1440×900
1024×768
390×844
320×568
```

并额外检查：

```text
prefers-reduced-motion: reduce
```

必须提供用户可查看的静态截图证据。

检查：

- Logo / Header；
- Hero；
- CTA；
- Login / Personal Center；
- AI Entry；
- 背景裁切；
- 可读性；
- 无溢出；
- console / hydration error；
- 缺失视频不产生运行时错误。

## Out of Scope

不得实施：

- WBS 3.3；
- WBS 3.4；
- WBS 3.5；
- WBS 3.7；
- AI API；
- Map / Route / POI；
- Booking；
- DB；
- Personal Center 重构；
- WebM / MP4 视频生产或接入。

## Deliverables

- 必要的静态背景运行时 / CSS 最小调整；
- TASK-025 专项测试；
- 静态四尺寸视觉 QA；
- 更新：`docs/tasks/RESULT-TASK-025-a-homepage-animated-background.md`，明确写本轮为 **Static MVP Result**，并保留旧阻塞历史摘要；
- 更新 Master WBS；
- 更新 Issue #246；
- Draft PR → develop。

## Status Rules

```text
启动实现
→ 3.2 = 进行中

静态 MVP 实现完成但 PR 未合并
→ 3.2 = 待审查

用户视觉验收通过 + PR 合入 develop
→ 3.2 = 已完成
```

视频缺失**不再阻塞 3.2**。

## Acceptance Criteria

- [x] 从最新 develop 启动。
- [x] Master WBS 已安全同步 3.2 / 3.2.1 新定义。
- [x] 历史 Blocked Result 被保留并说明范围修订。
- [x] 当前 Poster 成为明确支持的正式生产首页背景。
- [x] 无 WebM / MP4 时页面无错误、无 404 噪音。
- [x] TASK-024 首页结构和品牌视觉未回退。
- [x] 四尺寸背景裁切与可读性通过。
- [x] reduced-motion 正常。
- [x] lint / typecheck / build / relevant tests / diff-check 通过。
- [x] 用户可查看视觉证据。
- [x] Task / Result / WBS / Issue / Branch / Commit / PR 完成同步。
- [x] 未自动开始 3.2.1 / 3.3。

## Git Safety

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

## Stop Rule

完成 TASK-025-A 后停止。

**不要自动开始 TASK-025.1-A / WBS 3.2.1，也不要开始 WBS 3.3。**

## Static MVP Execution（2026-09-09）

- 基线 `088f467b8ff666ddd9774f8d6b7ad351fd54f00a`；分支 `feature/a-homepage-static-background-mvp`；启动 `b483ca0`；实现 `5b5b495`。[Draft PR #248](https://github.com/kanzakimy0/TravelAssist/pull/248)（Open / Draft，未合并）。
- 3.2 = 待审查；3.2.1 = 未开始 / Deferred；1.16 / 3.1 已完成，依赖状态未修改。旧素材阻塞历史及原 Result 全文保留，本次产品修订解除视频前置。
- 原图与全部 Home 几何不变；最小增加 Next 自动图片元数据和内联加载预览。687/687 Node、专项4/4、lint/typecheck/build通过；四尺寸 × 两种 motion 的生产验收8/8，CLS=0，无视频请求。
- [当前 Result](RESULT-TASK-025-a-homepage-animated-background.md) 和 [QA](../qa/TASK-025/README.md) 包含11张截图清单、正常/延迟资源报告、历史 hash-history 例外与复现步骤。用户 Static MVP 视觉验收仍待进行；保持 Draft，未合并。
- 不执行3.2.1 / TASK-025.1-A / #247 或3.3。
