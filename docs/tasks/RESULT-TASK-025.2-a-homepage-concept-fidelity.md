# TASK-025.2-A Result

## Status

**待审查** — 首页概念图实装完成，等待本轮用户视觉验收与 Draft PR 审查。没有合并 PR，没有标记 WBS 3.2 已完成。

## Preflight

- Execution base: `origin/develop@d9ee82f7515bfc09d61d07db0232a5af203c2d16`。
- 已执行 `git status --short`、`git branch --show-current`、`git fetch --all --prune`、`git rev-parse origin/develop`、`git log --oneline -20 origin/develop`。
- 已读取远端正式 TASK-025.2、Master WBS、static-first Amendment；本地 Next 16.3.4 CSS Modules / Image 指南及现有 Home、共享 Header、BrandLogo、AccountAvatar、AI、Auth 边界已审计。
- 原工作站在 `feature/b-travelassist-engine-contract`，保持不动。C 盘空间不足导致最初 fetch 失败，执行迁移至独立仓库 `F:/CodexWorktrees/TravelAssist-TASK0252`；精确 develop 对照工作树为 `F:/CodexWorktrees/TravelAssist-TASK0252-baseline`。
- WBS 3.2 before: 主表仍是旧“首页动画背景区域 / 阻塞”。已先按正式修订改为“首页背景区域 — 静态 Production MVP / A / 1.16,3.1 / 进行中”，登记 3.2.1 Deferred，启动提交 `f85af85`。
- TASK-024 merged: PR [#244](https://github.com/kanzakimy0/TravelAssist/pull/244)，merge `1d1e3aa9ddc33b1a69fba5e11b35980d847a05e4`；1.13 仍待审查。
- PR #248 仍 Open / Draft；未合并、未 cherry-pick、未从其分支继续开发。本 Task 独立从最新 develop 实施较新的概念规格，包含等价的静态导入与 blur placeholder 小改动；后续合并时需结合 #248 跟踪去重。

## Tracking

- Issue: [#251](https://github.com/kanzakimy0/TravelAssist/issues/251)
- Related: [#246](https://github.com/kanzakimy0/TravelAssist/issues/246)
- Branch: `feature/a-homepage-concept-fidelity`
- Implementation commit: `a965214b1845423d8ef263e499e8d4dca29f42b5`
- Draft PR: PENDING_PR
- WBS 3.2: **待审查**；3.2.1 / #247 **未开始 / Deferred**。

## Concept Fidelity

- Header: 复用唯一 MainHeader / BrandLogo，Home 专属暖白半透明胶囊；只在 Home 裁去同一 Logo 资产的透明留白。默认语言保持 native details，显示“中文 ⌄”。其他 Header adapters 的样式与几何不变。
- Hero center: 内容真正居中；1672×941 下 Eyebrow 起点约 y=212，标题 y=288，CTA x=646 / y=473，宽 380 / 高 84。
- Eyebrow: 大写、加宽字距、下方 52×3px 珊瑚短线。
- Title: 使用共享 `--font-heading`，桌面约 92px，深墨色，移动端自然两行。
- Subtitle: 保留“规划行程 · 对话调整”，桌面约 28px，适度字距。
- CTA: 实际 `/start` Link，保留“让我们开始吧”；暖朱红同系渐变，白字，轻阴影；Hover 不位移，键盘 focus ring 保留。
- User/login entry: CTA 下方暖白胶囊，复用 AccountAvatar 的“旅”，显示“游客 · 个人中心”；原 disabled 登录按钮及其说明保留。
- AI entry: 复用原图标与交互，桌面 92px 暖白圆环，朱红内圆；Mobile 64px；面板底部安全间距随按钮调整。
- Background/crop: 直接使用原正式 `home-hero-poster.webp`，没有新素材、视频或 CSS 假动画。Desktop 50%、Tablet 60%、Mobile 66% 水平 crop；撤除旧左侧强罩，只保留轻暖色与局部可读性雾化。
- 首屏: 静态导入提供自动 blur placeholder / preload。`sizes` 同时考虑 viewport 高度，避免纵屏 cover 时选中低分辨率小图再放大。
- Scope: `src/features/home/**` 与共享 Header 的 Home 外观适配；全局 tokens、BrandLogo/AccountAvatar 实现、其他业务页面未改变。

## Auth Boundary

- Logged-in behavior: 当前 Main Shell 尚未绑定 Session 用户信息，保留 TASK-024 的中性入口。真实 `/personal-center` 访问保护与已有 Auth 流程不变；没有扩展 WBS 3.4。
- Guest behavior: 显式游客；点击个人中心由现有保护跳到 `/login?returnTo=%2Fpersonal-center`。首页登录按钮仍 disabled，没有虚构可用性。
- Hard-coded fake identity: **No**。概念图的 Yuki / 人像不进入 runtime。PC 回归仅用已有本机视觉 fixture，不声称验证 live Auth。

## Responsive QA

- 1672×941: 中轴、字号与按钮尺寸符合正式 desktop bands。
- 1440×900: Hero 居中、海岸列车清晰，操作不重叠。
- 1024×768: Header 两端无碰撞，CTA 完整，保留中心焦点。
- 390×844: 两行标题、安全边距、纵屏列车裁切，AI 不遮挡操作。
- 320×568: 全部入口位于首屏，无水平或垂直溢出，触控区域完整。
- Reduced motion: 1440×900 单独验证；静态背景，零视频节点 / 请求。
- Six cases: CLS=0，单一 main / h1，Logo/CTA/个人中心目标正确；键盘 skip / focus、Hover 无位移、语言展开、AI open / close / Escape / focus return、浏览器 back / forward 均通过。
- 延迟 Poster 请求: blur 占位可见、无黑屏，图片完成前后标题几何完全相同。

## Regression

- Start / Planner / Detail / Personal Center：五尺寸共 **20/20** 组几何与精确 develop 基线完全一致。
- Planner 地图、右栏、底栏；Detail（实际点击“保存到浏览器并进入详情”后）工作台；PC Sidebar / Content；Start main 容器均已比较。
- 新 console / hydration errors: **0**。基线及候选首次页面加载均有 `/favicon.ico` 404，完整保留于报告；没有新背景资源错误或缺失视频 404。
- 额外修复已在 develop 与候选原版双重复现的首页 skip-link 历史问题：原生 fragment 后进入 Start 再返回会 URL/内容不一致。新的 HomeSkipLink 直接聚焦原 main，不增加 hash-only history；无 JS 时仍保留原生锚点 fallback，不修改 Start 或路由业务。

## Validation

- `npm ci`: PASS，锁定安装 395 packages，audit 0 vulnerabilities；package/lock 未改。
- `npm run lint`: PASS，0 warnings。
- `npm run typecheck`: PASS。
- `npm run build`: PASS，Next 16.3.4 Turbopack production build。
- `npm test --if-present`: PASS / 无 test script。
- `node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs`: **698/698 PASS**。
- `node --import ./tests/register-route-ts.mjs --test tests/task-025-2-concept-fidelity.test.mjs`: **5/5 PASS**。
- `git diff --check`: PASS。
- 浏览器: Microsoft Edge / Chromium，真实本机 production build；五 viewport + reduced-motion，不等同真机测试。

## Visual Evidence

见 [QA README](../qa/TASK-025.2/README.md)、[browser report](../qa/TASK-025.2/browser-report.json)、[geometry baseline](../qa/TASK-025.2/regression-baseline.json)、[geometry report](../qa/TASK-025.2/regression-report.json)、[evidence manifest](../qa/TASK-025.2/evidence-manifest.json)。

本机完整 PNG 位于 `F:/CodexWorktrees/TravelAssist-TASK0252/.cache/qa/task0252-screenshots/`，包含五尺寸、reduced-motion、加载占位，以及 concept-production-comparison.png。提交文件包含绝对路径 / SHA-256 / 复现方法，二进制不进入产品素材库。

**请用户并排查看 concept-production-comparison.png 与生产截图，进行本轮视觉验收。此前 TASK-024 的验收不代替本次验收。**

## Problems / Deferred

- Historical Blocked: 旧 TASK-025 Result 中“缺少授权视频 → 阻塞”保留原文，未删除或改写历史。
- Current Scope Revision: 视频已移至 3.2.1 / TASK-025.1 / #247；缺少视频不再阻塞当前静态 MVP。
- Current Result: 本次静态概念版式已实现，等待用户视觉确认及 PR 合并。
- 正式 Poster 和参考图同为海边列车方向，但素材不同：没有樱花前景、夕阳光斑与粉色天空。按 Task 使用已批准原图，没有把带 UI 概念截图作为背景，没有生成/下载替代素材。字体与 Logo 继续遵守共享品牌，游客形态不伪装概念图的已登录人像。
- live Auth / Map Provider、正式视频、WBS 3.3 / 3.4 / 3.5 / 3.7 均未实施。
- 本机预览使用 `next start`；当前仓库 `output: standalone` 会输出运行方式提示。本次是本地 QA，没有部署或声称完成云发布。

## WBS Updated

**Yes**。仅当前 3.2 / 3.2.1 与本任务跟踪段落更新；其他工作站与历史记录保留。PR 未合并，3.2 不标完成。

## Next Task

**Stop. Do not start automatically.** 等待用户视觉验收；不启动视频、3.3 或其他任务。
