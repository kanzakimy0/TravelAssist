# TASK-025-A Result

## Current Scope Revision / Current Result — 已完成（2026-09-09）

- **Historical Blocked**：下方“缺少已授权 WebM / MP4 → Blocked”是原动态范围下正确的历史记录，完整保留。
- **Current Scope Revision**：正式 static-first Amendment 已将 WBS 3.2 定义为静态 Production Hero Background MVP；视频移至 3.2.1 / #247，仍 Deferred。
- **Current Result**：静态生产背景和最新概念 UI 已由 TASK-025.2-A / PR #252 收口。用户明确指定的 home-hero-sakura-sunset.webp 为正式背景，preload / blur / 响应式裁切及无视频环境通过验证。
- 用户已视觉验收通过；PR #252 于 2026-09-09T11:29:14Z 合入 develop，merge d2efbb69bdabc91b41994147b357c4dfad02eeee，已验收 head 85a05b787087f9a36c8c5cab40693ed06ac08764。因此 WBS 3.2 及 Issue #246 当前完成。
- 详细实现、703 项测试和浏览器证据见 RESULT-TASK-025.2-a-homepage-concept-fidelity.md 的最终状态及 background-restored-home-report.json；不把旧视频未验证项改写成通过。
- 旧独立静态草案 PR #248 未被合并或覆盖，本次已完成范围以实际合入的 PR #252 为准。不开始视频或其他 WBS。

---


## Status

**Blocked / 阻塞**。Reason：**缺少已授权首页动态背景 WebM / MP4 素材。**

Integration Gate 通过，Asset Gate 失败。仅完成前置审计和阻塞记录，未正式启动生产接入；不把已有 Poster + 条件 video 代码视为 WBS 3.2 完成。

## Preflight

- execution base: `83a25bc3a95b8e6b323f844cb8d392ae4d0cb4a7`。开始前按要求执行 git status --short、git branch --show-current、git fetch --all --prune、git rev-parse origin/develop、git log --oneline -20 origin/develop；收尾再次 fetch，基线未变化。
- TASK-024 merged: PASS。PR #244 为 MERGED / 非 Draft，2026-09-09T04:55:42Z 合并；merge `1d1e3aa9ddc33b1a69fba5e11b35980d847a05e4` 已进入 develop，WBS 3.1 已完成。
- WBS 1.16: 已完成；状态未修改。
- working tree safety: 原工作区干净，保持 `feature/b-travelassist-engine-contract`。复用已干净的独立工作目录，但从最新 origin/develop 新建仅文档分支，不从旧 feature 分支继续、不 cherry-pick。
- 已读取远端 TASK-025、最新 WBS、home-page.md、TASK-004 首页规范；TASK-024 用户已确认且合并的品牌优先级保持，不恢复旧靛蓝 CTA 方案。

## Asset Gate

| 素材                                    | 最新 develop / 本地结果               | 文件大小                          |
| --------------------------------------- | ------------------------------------- | --------------------------------- |
| public/media/home/home-hero-poster.webp | 存在，现有正式静态 fallback，保持不变 | 161854 bytes                      |
| public/media/home/home-hero.webm        | 不存在                                | N/A（文件缺失，不是 0-byte 视频） |
| public/media/home/home-hero.mp4         | 不存在                                | N/A（文件缺失，不是 0-byte 视频） |

- Poster: 1672×941；SHA-256 `7464b34430b89ea9c010242bed05156e374aff347d1d7875d5bedbb57c4a5466`；本地哈希与 catalog 一致。
- provenance / rights: 审计 `docs/assets/catalog/asset-manifest.v1.json`、`asset-source-catalog.v1.json`、`legacy-inventory.v1.json`、`asset-usage-map.v1.json`、generated asset-usage report 与 `src/data/assets/asset-registry.ts`。全仓 Git 树未发现 WebM / MP4；两个目标视频仅存在路径引用，usage report 为不存在，无可审计授权视频登记。
- Poster 现有登记为 protected / legacy_review_required、rightsStatus=unknown、sourceMetadataFound=false，inventory 明确不等于许可批准。保留已验收静态素材及其原状态，不据此推导新视频或衍生授权、不重写登记。
- gate result: **FAIL**。没有用户提供的授权视频，也未发现项目正式生产流程产出的对应视频。
- 证据命令：`git ls-tree -r -l origin/develop -- public/media/home` 仅返回 Poster；全树按 .webm / .mp4 后缀搜索无结果；本地 public/media/home 同样只有 Poster。

## Tracking

- WBS 3.2: 未开始 → **阻塞**，Owner A 不变；不标记进行中、待审查或已完成。
- Issue: [#246](https://github.com/kanzakimy0/TravelAssist/issues/246)，保持 Open，记录 Asset Gate blocker。
- Branch: `codex/a-homepage-background-asset-gate`，仅阻塞文档；指定实现分支 `feature/a-homepage-animated-background` 未创建，待双 Gate 通过后从届时最新 develop 创建。
- Commit: 本 Result / Task / WBS 为同一文档提交；实际 SHA 同步至 Issue #246，不创建自引用提交号。
- Pull Request: 未创建。按 Task §24 / §26，Asset Gate 失败不制造实现 Draft PR；仅将阻塞记录正常快进同步 develop。
- Result file: `docs/tasks/RESULT-TASK-025-a-homepage-animated-background.md`。

## Existing Runtime Audit

- PosterFallback: 使用现有 next/image，fill / preload / sizes=100vw，始终在背景层内渲染。
- VideoBackground: 现有服务器文件存在性检查；hasWebm 与 hasMp4 均 false 时返回 null。未创建无效二进制或新增 source。
- WebM / MP4: source 顺序为 WebM → MP4，autoPlay / muted / loop / playsInline，preload=metadata，无 controls；祖先背景 aria-hidden。仅源码审计，不代表解码或实际播放通过。
- error fallback: Poster 底层始终存在，但没有视频样本，无法验证加载失败、黑屏、播放状态或编码 fallback。
- mobile: max-width:48rem 通过 CSS display:none 隐藏 video；有素材后需实测请求，不能据此保证零下载。
- reduced motion: 同样仅 CSS 隐藏 video；未证明阻止下载或自动播放。素材到位后按真实请求结果最小修正，不把静态审计写作 PASS。
- runtime files: `src/features/home/components/immersive-background.tsx` 和 `immersive-background.module.css`。本轮没有修改运行时、Hero、Header、Logo、CTA、账户或 AI 入口。

## Production Integration

- video playback: Blocked，缺少授权媒体。
- poster continuity: Deferred，无法比对视频初始 / 中间 / 结束帧；原 Poster 不变。
- overlay / readability: 原样保留，无重新布局、重遮罩或视觉重设计。
- resource loading: Deferred，不能提供不存在视频的 Desktop 播放或 Mobile / reduced-motion 请求测量。
- file sizes: Poster 161854 bytes；WebM / MP4 缺失，N/A。

## Visual / Browser QA

- 1440×900: Deferred（Asset Gate 失败，未启动本 Task 浏览器验收）。
- 1024×768: Deferred。
- 390×844: Deferred。
- 320×568: Deferred。
- reduced-motion: Deferred，需要有真实视频后验证播放和网络请求。
- request evidence: 未生成本 Task request report，不伪报网络请求数或下载体积。
- visual evidence: 无动态录屏 / 帧序列，原因是缺少实际视频；TASK-024 的既有静态截图不冒充 TASK-025 动态验收。

## Validation

Gate 失败后按 Task §5.3 / §24 停止生产实现，本轮仅修改三份追踪文档。

- npm ci: Not run（未进入实现验证阶段，不重复安装未变依赖）。
- lint: Not run。
- typecheck: Not run。
- build: Not run。
- npm test --if-present: Not run。
- real tests: Not run；不沿用 TASK-024 的 683 项结果伪报本 Task 测试通过。
- TASK-025 tests: Not added / Not run；没有实现增量或实际视频，不制造无意义测试。
- diff-check: PASS；仅 Task / Result / WBS 文档变化；新增及修改 Task / Result 的 Prettier 检查通过。

## Problems / Deferred

解除阻塞需要以下真实交付，不需要重设计首页：

1. 同一场景、同一机位 / 构图的可解码 WebM 与 MP4，路径分别为 `public/media/home/home-hero.webm` 和 `public/media/home/home-hero.mp4`。
2. 日本海边小镇、地方电车、海面 / 远山和少量住宅 / 植被；单一连续慢场景，建议 20–30 秒循环，静音，无快速切镜、强 zoom / parallax 或闪烁。保持当前 Poster 构图；如需匹配 Poster，必须有相应衍生许可并重新全尺寸验收。
3. 可审计来源、创作者 / 权利人、用户授权或生产流程记录、项目使用许可、署名和期限、是否允许缓存 / 转码 / 裁切 / 提取 Poster，以及文件大小和 SHA-256。按现有 manifest / rights 体系登记，不建立另一套资产系统。
4. 到位后重新 fetch 最新 develop、复检两个 Gate，再创建指定实现分支并将 WBS 3.2 设为进行中；完成 WebM、MP4 fallback、失败回退、首帧连续性、返回首页、CLS、四尺寸及 reduced-motion 的实际播放 / 网络 / 视觉验收。

未搜索或下载随机旅游视频，未用 GIF / CSS Ken Burns / Canvas / WebGL 等替代方案，未调用视频生产服务。未改 1.16、3.1、其他 Owner 记录或 3.3 / 3.4 / 3.5 / 3.7 状态。

## WBS Updated

Yes。WBS 3.2 = 阻塞；原因：缺少已授权首页动态背景 WebM / MP4 素材。Issue #246 保持 Open。

## Next Task

Do not start automatically. 本次按 Asset Gate 停止，不开始 WBS 3.3。
