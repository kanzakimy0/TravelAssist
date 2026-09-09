# TASK-025-A — Static MVP Result

## Current Status

**Static Production MVP 实现完成，待审查。** WBS 3.2 = 待审查；本轮用户视觉验收尚未进行，PR 未合并。视频缺失不再阻塞 3.2。

## Historical Blocked

2026-09-09 原范围要求正式 WebM / MP4 接入，执行基线 `83a25bc` 缺少授权视频，记录 Blocked 正确；记录提交 `5819270`。原报告在本文件末尾**完整保留**，其状态和素材门槛仅代表当时范围，未删除或回写为通过。

## Current Scope Revision

产品已批准 [Static-first 范围修订](../project/WBS-3.2-static-first-amendment.md)：3.2 改为首页背景区域 — 静态 Production MVP；3.2.1 / TASK-025.1-A / #247 为后续动态视频增强，未开始 / Deferred。本轮直接使用用户明确指定的当前 Poster，原资产登记不被改写为新的普遍版权或衍生许可。

## Preflight / Tracking

- execution base: `088f467b8ff666ddd9774f8d6b7ad351fd54f00a`；完成指定 status、branch、fetch、rev-parse、log -20，读取最新 Amendment / Task / Historical Result / Master WBS / 首页规则。收尾再次 fetch，远端未变化。
- Integration: PR #244 已合入 develop；WBS 1.16 / 3.1 已完成。已检查 Open PR，没有重叠 Home 背景实现；#239 是旧路线 / 部署规划文档，不修改 Home。
- Branch: `feature/a-homepage-static-background-mvp`，从最新 origin/develop 创建；原工作站 `feature/b-travelassist-engine-contract` 保持干净。
- 启动提交：`b483ca0`，开始实现前已同步 3.2 的新标题 / Owner A / 依赖 1.16,3.1 / 进行中，并登记 3.2.1 未开始 / Deferred；其他工作站及旧 WBS 阻塞段保留。
- 实现提交：`5b5b495`；后续提交包含专项测试、QA 证据与追踪文档。
- Issue: [#246](https://github.com/kanzakimy0/TravelAssist/issues/246)，保持 Open。
- Draft PR: STATIC_MVP_PR_PENDING。
- 工作树：`F:/CodexWorktrees/TravelAssist-TASK025`。因 C 盘空间不足，将同一分支移交至有空间的独立 F 盘工作树继续；没有改动原工作站源码或依赖。

## Current Result — Static MVP

- 当前 `public/media/home/home-hero-poster.webp` 正式用于生产首页背景，素材字节完全不变：1672×941，161854 bytes，SHA-256 `7464b34430b89ea9c010242bed05156e374aff347d1d7875d5bedbb57c4a5466`。
- 在原 ImmersiveBackground / PosterFallback 中使用 Next 静态图片 import，取得自动图片元数据、哈希资源名和微小内联 blurDataURL；保留 fill、preload 和 sizes=100vw。慢网等待期间可见同一画面的预览，图片完成后清除预览。未引入新的客户端状态、视频库或 Design Token。
- 桌面 / 平板仍为 object-position 58% center；手机 / 窄屏仍为 67% center。实际截图确认电车、海岸和远山可辨认，文字与 CTA 清楚；不为制造 diff 修改已验收裁切、Overlay 或布局。
- Home / Header / Logo / Hero / 辅助文案 / CTA / Login / Avatar / Personal Center / AI 完全沿用 TASK-024。Login 原 disabled 行为保留，不接 WBS 3.4。
- 原可选 VideoBackground 和存在性检查保留，无视频是正常生产状态。本轮没有下载、生成或接入 WebM / MP4，也没有 CSS 模拟视频。

## Validation

| 检查                  | 当前结果                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| npm ci                | PASS：F 盘隔离工作树安装 395 packages，0 vulnerabilities                                                    |
| npm run lint          | PASS（临时诊断脚本已移为非执行记录，不改 lint 配置）                                                        |
| npm run typecheck     | PASS（先由本版本 Next build 生成图片类型声明）                                                              |
| npm run build         | PASS：Next 16.3.4 Turbopack，全部原有路由正常生成                                                           |
| npm test --if-present | exit 0；无 test script，不当作执行了测试                                                                    |
| Node 全仓             | PASS：687/687，0 skipped                                                                                    |
| TASK-025 专项         | PASS：4/4，真实 Next Image SSR / preload / inline preview、无媒体静态渲染、既有可选视频组件契约、原图完整性 |
| 生产浏览器            | PASS：四尺寸 × no-preference / reduce = 8/8；既有 hash-history 组合路径例外见下文                           |
| 图片与几何            | 8/8：延迟加载与完成后几何一致，和 TASK-024 基线一致，CLS = 0，零视频请求、零媒体 404                        |
| 文档与差异            | 修改文件格式通过；git diff --check 通过；旧历史原文保留                                                     |

Browser 使用真实 Edge、DPR 1。各组均实测 skip link 焦点、真实 Tab、AI 打开 / Escape / 回焦点、普通首页 → Start → 返回、Personal Center 游客保护跳转登录 → 返回。完整 report / requests / response headers / image bytes / geometry 见 [QA](../qa/TASK-025/README.md)。不声称真实 Auth 提供方或视频播放验收。

## Visual Evidence / Image Performance

本机生产预览：`http://localhost:3128`。实际截图位于任务工作树 `.cache/qa/task025-screenshots/`：

- `1440-static.jpg`、`1024-static.jpg`、`390-static.jpg`、`320-static.jpg`。
- 对应四张 `*-reduced-motion.jpg`。
- `1440-loading.jpg`、`320-loading.jpg` 验证拦截图片响应时可见同图内联预览。
- `mobile-comparison.jpg` 并列手机与窄屏。

截图尺寸、文件大小和 SHA-256 见 [清单](../qa/TASK-025/screenshots.json)。11 张实际截图保留本地供用户查看；机器可读报告、基线、例外证据与复现脚本已提交，不把截图加入业务素材清单。

| Viewport | 背景响应 body | 正常刷新 CLS |
| -------- | ------------- | ------------ |
| 1440×900 | 77338 bytes   | 0            |
| 1024×768 | 36746 bytes   | 0            |
| 390×844  | 15548 bytes   | 0            |
| 320×568  | 15548 bytes   | 0            |

原 Poster 161854 bytes；Next 提供 WebP 响应和 srcset。正常刷新 LCP 60–80ms、图片请求约18–26ms仅为本机热服务端缓存、无网络节流的样本，不代表公网设备性能保证。受控慢加载数据与正常刷新数据在报告中分别记录。

## Problems / Deferred

- **已验证的原基线例外**：先用 skip link 进入 `/#home-content`，再进入 Start 并后退，URL 回到首页锚点但 DOM 仍显示 Start。旧 TASK-024 生产构建和当前构建均复现；普通不带锚点的往返正常。[基线对照证据](../qa/TASK-025/known-baseline-history.json)。本任务未改变路由实现，未越界修复该既有问题；8/8 不代表此组合路径也通过。
- 初次 C 盘 npm ci 因 ENOSPC 失败；在 F 盘以本任务目录内的 cache/temp 完成安装，清除的仅是旧隔离目录中本轮失败的依赖安装。原工作站未修改。初次 fresh-worktree typecheck 缺少自动生成的 Next 静态图片声明，正常 build 后重跑通过。
- 本轮仅保留必要代码增量。临时诊断脚本曾被 ESLint 扫描，保留为 .txt 记录后完整 lint 通过；未放宽项目规则。
- 现有 feature push 自动化会尝试创建并合并普通 PR；发布提交使用 [skip ci]，手工创建 Draft 防止提前合并。本地验证结果如上，不宣称 GitHub 应用 CI 已运行。
- 用户 Static MVP 视觉验收尚未进行。TASK-024 的历史用户通过不替代本 Task 验收。
- 3.2.1 / #247 动态增强 Deferred，未要求视频、未执行任何视频播放或编码生产。3.3 / 3.4 / 3.5 / 3.7、AI API、Map、Route、POI、Booking、DB、Personal Center 重构均未执行。

## WBS Updated / Stop

Yes。3.2 = 待审查；3.2.1 = 未开始 / Deferred。只有本 Task 用户视觉验收通过且 PR 合入 develop，3.2 才能已完成。TASK-025-A 完成本轮交付后停止，不自动执行 TASK-025.1-A 或 WBS 3.3。

---

# Historical Blocked — 原始报告全文（保留，不代表当前范围）

# TASK-025-A Result

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
