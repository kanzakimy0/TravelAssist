# TASK-025.2 visual comparison

## 最新背景补正

用户要求固定使用原樱花海岸电车背景，已恢复 home-hero-sakura-sunset.webp（与本次上传图转换后逐字节一致），v1.1 UI 不变。最新截图位于 .cache/qa/background-restored-home/，最新交互、布局、CLS 与请求见 background-restored-home-report.json。复现时设置 TASK_0252_REVIEW_NAME=background-restored 后执行现有 Home QA 脚本。下方 v11 同尺寸概念对照仅为历史记录。

## 最新验收：v1.1 / 2026-09-09

本节覆盖下方旧概念、disabled Login 与旧背景的阶段记录。最新版概念为用户上传的 1536×1024 PNG（SHA-256 8b5086d888d745b9be1643c4b4b1ed94c54b1d682e9fa0bbd78d39d97c0d6c95）。使用它的纯场景衍生图，真实 HTML 提供 Header、Hero、Help、账户、AI 和 Footer。

- 最终截图：F:/CodexWorktrees/TravelAssist-TASK0252/.cache/qa/v11-home/，包含 1672x941、1440x900、1024x768、390x844、320x568、reduced-motion、慢加载、五尺寸 Help / authenticated 和 1536x1024 同尺寸概念对照。
- 截图索引与哈希：v11-evidence.json。对照图左为概念、右为真实游客页面；概念内 Yuki 只出现在对照左侧，不进入运行时。
- 浏览器：v11-home-report.json；网络请求：v11-request-report.json；账户：v11-auth-report.json；其他页面几何：v11-report.json。
- Home 6/6：全尺寸无横向/纵向溢出；唯一 main/h1/主 CTA；Help open/close/Escape/focus return/outside click、完整指南及四个 Footer 链接键盘导航；AI 开关/焦点归还；登录 /start 与 back/forward；CLS=0；零视频请求。
- Auth 15/15：五尺寸 × verified/neutral/invalid。通过现有 SDK getUser 核验；不信任 Cookie 中的伪造姓名；真实资料头像显示、失败回退、中性资料、无效会话和个人中心目的地通过。仅本机合成 fixture，不声称外部认证服务验收。
- 回归 20/20：/start、/planner、/planner?view=detail&day=1（点击“保存到浏览器并进入详情”后）、/personal-center 的五尺寸，地图/右栏/底栏及 PC Sidebar/Content 与 develop 代码基线几何完全一致。da43afe 相比 d9ee82f 仅新增规格文档，代码基线仍有效。
- 原有 favicon.ico 404 如实保留，新 console/hydration 错误为 0；没有视频 404。请求报告包含验收期间导航到 Start 后加载的旧场景，不代表 Home 双背景。
- 最新原图 WebP 1536×1024 / 344676 bytes；Next 实际请求按 viewport 选择图片尺寸，详情见请求报告。blur 占位到解码后布局不变。

复现：锁定依赖安装后构建，在本机 fixture 配置下启动预览 3132 和 tools/qa/task-024-visual-auth-fixture.mjs（54224）。设置 PLAYWRIGHT_MODULE 到可用 Playwright、TASK_0252_REVIEW_NAME=v11，执行：

```text
node tools/qa/task-025-2-home-check.mjs
node tools/qa/task-025-2-auth-check.mjs
node tools/qa/task-025-2-brand-check.mjs
```

生产语义：游客显示真实登录链接；已核验账户桌面在右上、手机在 CTA 下，资料缺失使用“个人中心”/共享“旅”占位。预览截图里的验收账户是隔离测试数据。AI 入口保留真实 UI 交互但没有接 AI API。五个信息页面为静态基础说明，不宣称完成 WBS 10.6 法律审查。

---

## 历史视觉验收记录

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

## 当前追加：Start / Planner / Trip Detail 品牌同步

用户明确 Home 与 Personal Center 已统一，本轮二者保持。Start 使用同一已授权场景，Planner / Detail 仅统一工作台表面及控件语言；地图几何、右栏、时间轴不变。现有主色 `#a74739`、深墨 `#383632`、暖白 `#fffcf7`、暖粉 `#f9e7e0`、边框 `#e9dcd1`、焦点 `#954439` 为唯一来源，没有新增同义 token。保留地图和状态语义色。

- 实际截图：`F:/CodexWorktrees/TravelAssist-TASK0252/.cache/qa/brand-after/`。总览 `travelassist-brand-overview.png`，窄屏 `narrow-mobile-overview.png`，按页/宽度命名的 20 张截图，另有 8 张菜单 / 键盘焦点截图。
- `brand-report.json`：20 组固定几何对比、共享计算样式、菜单及焦点记录。
- `brand-evidence.json`：截图绝对路径 / SHA / 大小、校验结果；Home 六组、Personal Center 五组修改前后逐字节一致。
- 生产预览 `http://localhost:3132/start`、`/planner`、`/planner?view=detail&day=1`。Detail 首次需点击“保存到浏览器并进入详情”；现有浏览器保存与导航行为保持。
- 复现：启动 `tools/qa/task-024-visual-auth-fixture.mjs` 与使用该本地 fixture 的生产服务；设置 `PLAYWRIGHT_MODULE` 为可用 Playwright，`TASK_0252_URL=http://localhost:3132`，运行 `node tools/qa/task-025-2-brand-check.mjs`。默认 reduced-motion；另外 `task-025-2-home-check.mjs` 验证普通动态偏好及 reduced-motion。
- 699 全仓 + 12 专项通过；既有 favicon.ico 404 与原始基线一致。真实 Auth / Map provider 未在本轮接入或验证。

## 最新追加：全站珊瑚品牌色

用户进一步要求所有品牌红棕色改为 Home CTA 的珊瑚色，包括 PC 子页与 Auth；前节关于 Home/PC 截图不变的断言是前轮历史，本轮只保持布局和业务。颜色清单、当前截图路径与 SHA 见 `coral-evidence.json`。总览：`F:/CodexWorktrees/TravelAssist-TASK0252/.cache/qa/coral-after/travelassist-coral-overview.png`。

运行时复用 `--color-accent-primary: #e95b4b`，实心控件统一消费 `--background-accent-primary`，即原首页的 155° 珊瑚渐变。主路线纯色匹配渐变深端；旧保存数据通过只读显示适配更新。保留错误、警告、成功的语义色。

同前节本地 fixture/生产服务器前置，设置 `TASK_0252_REVIEW_NAME=coral` 后运行 `task-025-2-brand-check.mjs` 和 `task-025-2-home-check.mjs`，分别输出独立 coral 报告。再运行 `task-025-2-coral-colors.mjs` 验证 Desktop/Mobile 的 14 页面（共 28 组），包括展开的移动工作台。20/20 几何、28/28 颜色、6/6 Home 与 701/701 Node 回归通过。
