# TASK-025.1-A — Homepage Video Background Enhancement

## Metadata

- Task ID: `TASK-025.1-A`
- WBS: `3.2.1`
- Owner: `A`
- Responsibility: `Main Travel System / Website Entry`
- Priority: `P2`
- Status: `Deferred / 未开始`
- GitHub Issue: `#247`
- Task File: `docs/tasks/TASK-025.1-a-homepage-video-background-enhancement.md`
- Suggested branch: `feature/a-homepage-video-background-enhancement`
- Depends On: `3.2` completed + authorized video assets available
- Scope Amendment: `docs/project/WBS-3.2-static-first-amendment.md`

## Purpose

在 WBS 3.2 静态首页背景 MVP 已完成后，将首页从静态背景增强为可选动态视频背景。

本 Task 是增强项，不是 Web MVP 前置条件。

## Start Gate

只有以下条件全部满足才能启动：

1. WBS 3.2 已完成并合入 develop；
2. 用户已提供或项目已生产明确授权的视频素材；
3. 至少有可解码的 WebM / MP4；
4. 来源、权利、转码 / 裁切 / Poster 提取权限可审计；
5. 没有与 Home 背景重叠的执行中 PR。

任一不满足：保持 `Deferred / 未开始`，不要创建实现 PR。

## Target Assets

```text
public/media/home/home-hero.webm
public/media/home/home-hero.mp4
public/media/home/home-hero-poster.webp
```

## Visual Direction

- 与正式 Poster 同场景、同机位或高度连续；
- 日本海边小镇 + 地方电车 + 海面 / 远山；
- 单一连续慢场景；
- 建议 20–30 秒循环；
- 静音；
- 无快速切镜、强 zoom、强 parallax 或闪烁；
- 不重新设计 Home。

## Runtime Requirements

- WebM 优先；
- MP4 fallback；
- autoplay / muted / loop / playsInline；
- Poster 始终作为稳定底层；
- 视频播放失败自动保持 Poster；
- 首帧不黑屏；
- 不产生 Hero CLS；
- 背景保持 aria-hidden / 装饰性；
- 不安装大型视频播放器依赖。

## Resource Policy

### Desktop

- 动态视频实际请求并播放；
- Poster 先可见；
- 视频不阻塞 CTA。

### Mobile

允许 Poster-only；不得无意义下载完整视频。

### Reduced Motion

`prefers-reduced-motion: reduce`：

- Poster-only；
- 不播放动态；
- 尽量不请求视频主体。

## Visual QA

至少：

- 1440×900
- 1024×768
- 390×844
- 320×568
- reduced-motion

动态证据优先提供短录屏；无法录屏则提供初始 / 中段 / 循环末帧截图。

## Validation

至少：

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present
git diff --check
```

并运行真实 Node 全仓回归、专项测试、浏览器请求检查。

Result 必须记录：

- WebM size / SHA-256；
- MP4 size / SHA-256；
- Poster size / SHA-256；
- provenance / rights；
- Desktop 请求与播放；
- Mobile 请求；
- reduced-motion 请求；
- fallback 行为；
- visual evidence。

## Out of Scope

- 重做 Hero / Header / CTA；
- 修改 3.3 / 3.4 / 3.5；
- AI / Map / Route / Booking / DB；
- 随机下载版权不明视频；
- GIF / Lottie / CSS Ken Burns 代替正式视频。

## Status Rules

```text
Gate 未满足
→ Deferred / 未开始

正式启动
→ 进行中

实现完成未合并
→ 待审查

用户动态视觉验收通过 + 合入 develop
→ 已完成
```

## Stop Rule

完成 TASK-025.1-A 后停止，不自动开始其他任务。
