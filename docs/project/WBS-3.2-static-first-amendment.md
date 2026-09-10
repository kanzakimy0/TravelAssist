# WBS 3.2 范围修订 — Static-first Homepage Background

> Decision date: 2026-09-09  
> Applies to: WBS 3.2 / TASK-025-A  
> Follow-up: WBS 3.2.1 / TASK-025.1-A  
> Status: Approved by product owner

## Decision

WBS 3.2 不再以“必须存在 WebM / MP4 才能完成”为 MVP 验收条件。

首页背景采用两阶段交付：

```text
WBS 3.2 / TASK-025-A
= Production Static Hero Background MVP

WBS 3.2.1 / TASK-025.1-A
= Animated Video Background Enhancement
```

当前 `home-hero-poster.webp` 可以作为正式生产背景。只要静态背景完成视觉、响应式、性能、降级和回归验收，WBS 3.2 可以独立完成。

未来获得已授权 WebM / MP4 后，由 WBS 3.2.1 在不重新设计首页的前提下增强为动态背景。

## Rationale

- 首页主流程不应因为视频素材授权阻塞 Web MVP。
- 当前运行时已具备 Poster fallback 与条件 Video 边界。
- 静态高质量背景本身是完整可用的正式体验，不是错误态。
- 动态视频属于增强体验，不是首页可用性的前置条件。
- 保留视频 follow-up 可避免未来重做 Home / Hero / Header。

## WBS 3.2 Revised Definition

**Title:** 首页背景区域 — 静态 Production MVP

**Owner:** A  
**Priority:** P1  
**Dependency:** 1.16, 3.1  

### Done means

- 使用已批准的正式静态背景图作为首页 Hero 背景；
- 视觉保持 TASK-024-A 已验收的 TravelAssist 全站品牌语言；
- Home Hero / Header / CTA / Login / Personal Center / AI 几何不重排；
- Desktop / Tablet / Mobile / narrow mobile 裁切合理；
- `prefers-reduced-motion` 与无视频环境自然使用静态背景；
- 无黑屏、无布局跳动、无横向溢出；
- lint / typecheck / build / relevant tests / browser QA 通过；
- 用户视觉验收通过并合入 develop。

### Not required for WBS 3.2

- WebM / MP4；
- 自动播放视频；
- 视频编码 fallback 实测；
- 动态帧连续性；
- 视频网络请求性能。

这些移动至 WBS 3.2.1。

## WBS 3.2.1 Definition

**Title:** 首页动态视频背景增强

未来只有在存在已授权、可审计的 WebM / MP4 素材后启动。

范围包括：

- WebM + MP4 fallback；
- Poster → Video 首帧连续性；
- Desktop 播放；
- Mobile / reduced-motion 不无意义下载视频；
- 播放失败回退；
- 视频性能与网络请求；
- 动态视觉验收。

视频增强不得重新设计首页。

## Historical Result

`RESULT-TASK-025-a-homepage-animated-background.md` 中“缺少授权视频，因此 Blocked”的结果保持为历史事实。

该 Blocked 状态由本次产品范围修订解除；它不是错误结果，不应删除或回写成当时已经通过。

## Master WBS Sync Rule

执行新版 TASK-025-A 时，Codex 必须在开始实现前读取最新 `docs/project/WBS-TravelAssist.md`，将主表中的 3.2 从旧“动画背景素材阻塞”口径同步为本修订口径，并新增/登记 3.2.1。必须保留其他工作站新增记录，禁止整份覆盖 WBS。
