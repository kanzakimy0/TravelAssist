# TASK-025.2 visual comparison

本次为用户要求的概念图完整视觉修正，等待用户视觉验收。此前保留旧灰金海岸 Poster 的交付未获用户视觉认可，本版已接入从用户概念图去除 UI 后得到的樱花夕阳纯背景。正式规格见 `docs/tasks/TASK-025.2-a-homepage-concept-fidelity.md`。

## Comparison

概念原图：用户提供的 1672×941 PNG，SHA-256 `3b56571d15ff9032475e48d5f365cd099c27febff901c7f9606c108be623fecf`。

生产截图与概念在 `concept-production-comparison.png` 并排：左为用户概念，右为真实生产 Home。完整图片未作为网站背景，未进入产品素材库。

| 检查           | 实装与差异                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Header / Brand | 唯一共享 Logo，暖白胶囊；Home 专属透明边缘裁切；品牌素材沿用 TASK-024                                           |
| Hero           | 真正居中，1672×941 下标题约 92px；Eyebrow / 标题 / 副标题 / CTA / 账号纵向节奏对齐正式 bands                    |
| CTA            | 380×88px，真实 /start，28px 白字，朱红同系渐变，无 hover 位移                                                   |
| Account        | 同一暖白胶囊，真实中性“游客 · 个人中心”与当前 disabled 登录；不使用参考图假身份                                 |
| AI             | 保留原图标与全部开关、Escape 和焦点行为；92px Desktop / 64px Mobile                                             |
| Poster         | 概念图纯背景，Desktop 50%、Tablet 60%、Mobile 72%；已接入概念图中的樱花前景、粉色夕阳、海面反光、海岸住宅与列车 |
| Readability    | 最小暖白雾化，清晰背景，无大块黑色覆盖或 Hero Card                                                              |
| Mobile         | 两行标题、居中操作、AI 安全区；图片候选尺寸考虑 cover 的高度，避免放大小图                                      |
| Shared brand   | 原全局文字、表面、朱红、字体、radius / shadow / focus tokens 保持；无第二套 Header / Logo / Avatar              |

请并排比较概念和新版生产截图：背景已改为用户概念的同构图樱花夕阳场景；真实 HTML 控件仍可操作，账号显示真实游客边界。背景由 built-in image_gen 去除 UI、局部补绘，保留整体构图，不声称 UI 原遮挡区逐像素恢复。

## Screenshots and reports

二进制存于 `F:/CodexWorktrees/TravelAssist-TASK0252/.cache/qa/task0252-screenshots/`：

- `1672x941.png`
- `1440x900.png`
- `1024x768.png`
- `390x844.png`
- `320x568.png`
- `1440x900-reduced-motion.png`
- `1440x900-poster-loading.png`
- `concept.png`
- `concept-production-comparison.png`

绝对路径、大小、SHA-256：`evidence-manifest.json`。几何、计算样式、交互、CLS、资源请求、错误：`browser-report.json`。背景请求独立汇总：`request-report.json`。

## Browser acceptance

- Home 五尺寸 + 1440×900 reduced motion，6/6 PASS；无水平/垂直溢出，CLS=0，无 video 元素、请求或视频 404。
- 单一 main/h1；Brand → /；CTA → /start；游客个人中心 → 现有 `/login?returnTo=%2Fpersonal-center`。
- Tab → skip link → main → CTA，focus ring 可见；Hover 不改变 CTA 几何。
- AI open / close / Escape / focus return；native language details；back / forward 均通过。
- 将 Poster 请求延后：真实 blur placeholder 可见；释放请求、图片解码后标题几何不变，无黑屏。
- `regression-baseline.json` 来自独立的 `d9ee82f` 精确代码构建。`regression-report.json` 与基线 20/20 相同：Start 容器、Planner 地图/右栏/底栏、实际 Detail、PC Sidebar/Content。
- 基线和候选各保留一条 `/favicon.ico` 404；新 console / hydration errors = 0。没有过滤其他错误。
- Home 不伪装已登录用户；PC 几何使用仓库已有本机视觉 fixture，未调用真实 Auth / Map 服务。

## Reproduce

在新 checkout 安装锁定依赖并完成构建；原 fixture 端口为 54224。QA `.env.local` 仅含本机 fixture 地址与非 Secret publishable fixture key，见 `tools/qa/task-024-visual-auth-fixture.mjs`。不得填入/提交真实凭据。

```powershell
npm ci
npm run build
# 独立终端 1：
node tools/qa/task-024-visual-auth-fixture.mjs
# 独立终端 2：
npm run start -- -p 3132
# 独立终端 3：安装并指向外部 Playwright，不修改产品依赖。
$env:PLAYWRIGHT_MODULE = 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:TASK_0252_URL = 'http://localhost:3132'
node tools/qa/task-025-2-home-check.mjs
node tools/qa/task-025-2-regression.mjs
```

重新生成基线时：从 `d9ee82f7515bfc09d61d07db0232a5af203c2d16` 建立独立工作树，安装、构建并在 3133 启动。运行候选分支的 regression harness，设 `TASK_0252_BASELINE=true`、`TASK_0252_URL=http://localhost:3133`；再清除 BASELINE 并运行候选比较。基线记录只用于对应视口和同一浏览器/字体环境。

本站当前 `output: standalone` 下 `next start` 有方式提示；本次验证的是本机生产构建，没有进行部署。Edge viewport 仿真不声称等同真机 Safari/Android 验收。

本 Task 完成后停止；用户本轮视觉通过 + PR 合入 develop 前，WBS 3.2 保持待审查。

## Concept background production record

- Runtime: `public/media/home-concept/home-hero-sakura-sunset.webp`，1672×941 / 325542 bytes。
- 来源、用户授权、完整编辑提示词、输入/输出路径与 SHA：`docs/assets/home-hero-sakura-sunset.provenance.json`。
- 使用 built-in image_gen；无 UI 纯背景输出在本工作区 `.cache/qa/task0252-screenshots/home-hero-sakura-sunset-source.png`，WebP 正式资产已提交。旧 Poster 原样保留在受保护目录，已退出首页接线。
- 390px 视口实际背景响应 143980 bytes；其他尺寸见 request-report。
