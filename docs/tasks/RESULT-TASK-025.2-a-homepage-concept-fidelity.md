# TASK-025.2-A Result

## 2026-09-09 最新结果：全站珊瑚色

**待审查**。用户进一步要求所有位置的品牌红棕色改为首页“让我们开始吧”的珊瑚色，明确覆盖前轮保持 PC/global 颜色的范围。

- 现有 `--color-accent-primary` 改为 `#e95b4b`；原首页 CTA 的 155° 渐变提取为 `--background-accent-primary`，供 Home / 全站实心品牌按钮、步骤点、详情标签共同消费。Hover 与 focus 使用同系珊瑚色。没有新建 Header / Avatar / Design System。
- Start、Planner、Detail、Personal Center 与旅行/偏好/同行人/账户、Auth 的独立红棕品牌值收敛到共享变量；地图主路线及选中描边改为同系珊瑚。成功/警告/错误等语义仍保留，所有页面结构不变。
- 旧保存行程仍可能带旧路线色；新增仅用于显示的兼容映射，使 SVG / 原生地图数据源 / 推荐缩略图采用新颜色，不写回保存数据，不改变坐标、日程或路线几何。新增测试验证该边界；原缩略图冻结测试仅放行这一颜色包装，其他 SVG 结构仍严格比对。
- lint / typecheck / build / diff-check 通过；全仓 701/701。五尺寸几何 20/20 不变；Desktop/Mobile 14 页面共 28 组颜色检查通过，移动工作台展开后检查按钮。Home 五尺寸 + reduced-motion 6/6，CLS=0、无视频请求。npm ci 前轮同锁文件成功，本轮依赖未改。
- 本轮独立截图与报告：`docs/qa/TASK-025.2/coral-evidence.json`、`coral-report.json`、`coral-colors-report.json`、`coral-home-report.json`。已有 favicon.ico 404 保留；使用本地 visual fixture / fallback map，未声称验证 live Auth/Map。
- 继续 Draft PR #252 / Issue #251、#246，3.2 待审查。此前轮次的截图一致性和不改 PC 记录保留为历史，不代表本轮最终颜色范围。

## 2026-09-09 前轮结果：其余主系统页面品牌同步

**待审查**。用户明确 Home 与 Personal Center 已统一，本轮将它们保持为固定视觉基准，只调整 Start / Planner / Trip Detail。下方 Home-only 实装记录是此前阶段结果，本节记录最新追加范围。

- Start 复用首页已授权的樱花夕阳背景，移除深色覆盖；保持 Wizard 布局，统一标题字体、胶囊 Brand、暖白表面、选中态与键盘焦点。
- Planner / Detail 背景和半透明面板对齐同一场景；灰蓝普通文字、重复棕红/米白硬编码收敛到现有 tokens。地图着色、路线/类别/状态语义色保留。卡片、按钮、菜单、暖边框与阴影复用原体系。
- Home、Personal Center、共享 Header / Logo / Avatar、全局 CSS 和全部业务 TS/TSX 均无本轮改动。两者分别 6 / 5 组 PNG 与修改前 SHA-256 完全一致。
- 1440×900、1024×768、390×844、320×568，另加 1672×941；Start/Planner/真实 Detail/PC 共 20/20 几何与 develop 基线一致。向导继续、Logo hover、账户 Popover 边界、Escape 焦点归还与键盘焦点通过。
- lint（0 warnings）/ typecheck / build / npm test --if-present / diff-check 通过；真实 Node 全仓 699/699、Home/Shell/背景专项 12/12。npm ci 使用同一锁文件前轮成功结果，本轮未改依赖。Home 五尺寸 + reduced-motion 6/6，CLS=0、无视频请求。素材完整性检查无错误。
- 已知基线 favicon.ico 404 保留，无新增错误；Auth 使用本地合成 visual fixture，地图为既有 fallback，不声称验证真实外部服务。
- 本次实现 `b3e12361286b414c699dad0e467d8074ee2bc8db`；分支仍为 `feature/a-homepage-concept-fidelity`，Draft PR #252；证据与实际 PNG 路径见 `docs/qa/TASK-025.2/brand-evidence.json`，浏览器报告 `brand-report.json`，复现见 QA README。未合并、未启动 3.2.1 / 3.3。

## Status（首页实装阶段历史）

**待审查** — 用户要求的概念图完整视觉修正已完成，等待本轮用户视觉验收与 Draft PR 审查。没有合并 PR，没有标记 WBS 3.2 已完成。

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
- First delivery (superseded): `a965214b1845423d8ef263e499e8d4dca29f42b5`
- Concept background correction: `1ceab08315b8e82e5acbb8e8f1a8f23853dbc0b4`
- Draft PR: [#252](https://github.com/kanzakimy0/TravelAssist/pull/252)
- WBS 3.2: **待审查**；3.2.1 / #247 **未开始 / Deferred**。

## Concept Fidelity

- Header: 复用唯一 MainHeader / BrandLogo，Home 专属暖白半透明胶囊；只在 Home 裁去同一 Logo 资产的透明留白。默认语言保持 native details，显示“中文 ⌄”。其他 Header adapters 的样式与几何不变。
- Hero center: 内容真正居中；1672×941 下 Eyebrow 起点约 y=212，标题 y=288，CTA x=646 / y=463，宽 380 / 高 88。
- Eyebrow: 大写、加宽字距、下方 52×3px 珊瑚短线。
- Title: 使用共享 `--font-heading`，桌面约 92px，深墨色，移动端自然两行。
- Subtitle: 保留“规划行程 · 对话调整”，桌面约 28px，适度字距。
- CTA: 实际 `/start` Link，保留“让我们开始吧”；暖朱红同系渐变，白字，轻阴影；Hover 不位移，键盘 focus ring 保留。
- User/login entry: CTA 下方暖白胶囊，复用 AccountAvatar 的“旅”，显示“游客 · 个人中心”；原 disabled 登录按钮及其说明保留。
- AI entry: 复用原图标与交互，桌面 92px 暖白圆环，朱红内圆；Mobile 64px；面板底部安全间距随按钮调整。
- Background/crop: 用户明确要求概念图效果后，使用 built-in image_gen 从所提供概念图去除 UI 并局部补绘，接入 `public/media/home-concept/home-hero-sakura-sunset.webp`（1672×941，325542 bytes）。樱花、粉色夕阳、海面反光、住宅和列车构图保留；Desktop 50%、Tablet 60%、Mobile 72% 水平 crop。旧 Poster 原文件保持不变，已退出首页运行时接线。
- 首屏: 静态导入提供自动 blur placeholder / preload。`sizes` 同时考虑 viewport 高度，避免纵屏 cover 时选中低分辨率小图再放大。
- Scope: Home、共享 Header 的 Home 外观适配，以及新背景必需的既有资产清单登记。全局 tokens、BrandLogo/AccountAvatar 实现、其他业务页面未改变。新增背景来源、授权、完整提示词和 SHA 见 `docs/assets/home-hero-sakura-sunset.provenance.json`。

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
- `node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs`: **699/699 PASS**。
- `node --import ./tests/register-route-ts.mjs --test tests/task-025-2-concept-fidelity.test.mjs`: **6/6 PASS**。
- `git diff --check`: PASS。
- 浏览器: Microsoft Edge / Chromium，真实本机 production build；五 viewport + reduced-motion，不等同真机测试。

## Visual Evidence

见 [QA README](../qa/TASK-025.2/README.md)、[browser report](../qa/TASK-025.2/browser-report.json)、[geometry baseline](../qa/TASK-025.2/regression-baseline.json)、[geometry report](../qa/TASK-025.2/regression-report.json)、[evidence manifest](../qa/TASK-025.2/evidence-manifest.json)。

本机完整 PNG 位于 `F:/CodexWorktrees/TravelAssist-TASK0252/.cache/qa/task0252-screenshots/`，包含五尺寸、reduced-motion、加载占位，以及 concept-production-comparison.png。提交文件包含绝对路径 / SHA-256 / 复现方法，二进制不进入产品素材库。

**请用户并排查看 concept-production-comparison.png 与生产截图，进行本轮视觉验收。此前 TASK-024 的验收不代替本次验收。**

## Problems / Deferred

- Historical Blocked: 旧 TASK-025 Result 中“缺少授权视频 → 阻塞”保留原文，未删除或改写历史。
- Current Scope Revision: 视频已移至 3.2.1 / TASK-025.1 / #247；缺少视频不再阻塞当前静态 MVP。
- Current Result: 概念图背景与真实组件已共同接入，手机裁切已校准，等待用户视觉确认及 PR 合并。
- 第一版保留旧 Poster 的交付未获用户视觉认可，本版已按其明确要求接入概念图纯背景；不再以“记录背景差异”代替实现。此前版本保留在 Git 历史。图片使用 built-in image_gen 去除界面及局部补绘；原 UI 遮挡处无法声称逐像素恢复，但主体构图及樱花夕阳视觉已保留。
- 输入概念图由用户提供并明确要求项目使用；本地同名首页 ZIP 为空，因此以实际 PNG 为编辑源。生成模式及完整提示词已记录；没有联网随机下载。
- 真实游客入口继续复用 AccountAvatar，未伪造参考图 Yuki 或已登录人像。
- live Auth / Map Provider、正式视频、WBS 3.3 / 3.4 / 3.5 / 3.7 均未实施。
- 本机预览使用 `next start`；当前仓库 `output: standalone` 会输出运行方式提示。本次是本地 QA，没有部署或声称完成云发布。

## WBS Updated

**Yes**。仅当前 3.2 / 3.2.1 与本任务跟踪段落更新；其他工作站与历史记录保留。PR 未合并，3.2 不标完成。

## Next Task

**Stop. Do not start automatically.** 等待用户视觉验收；不启动视频、3.3 或其他任务。
