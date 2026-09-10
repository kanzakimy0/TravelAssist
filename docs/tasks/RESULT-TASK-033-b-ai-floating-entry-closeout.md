# TASK-033-B Result

## Status

**Owner B / 待审查。实现、审计与工程 QA 完成；等待用户视觉验收，不自动合并。**

本轮运行时仅修改两份既有 AI CSS，未新增或重写 AI Entry / Panel / Auth / Header 组件，没有接 AI 后端。

## Preflight

- 执行 git status --short、git branch --show-current、git fetch --all --prune、git rev-parse origin/develop、git log --oneline -20 origin/develop。
- Execution base：`0f7955ae62e04aeacf43f56dcacf2a9249582e96`。发布前再次 fetch，develop 未变化。
- 从远端读取正式 Task、WBS-3.5-owner-correction 与 Master WBS；同时读取用户提供 launcher。
- Gate PASS：3.1 / 3.3 / 3.4 已完成；#273、#278 及收尾 #279 均在 develop。原工作区不改动，使用独立 worktree 从最新 origin/develop 创建分支。
- 在途 PR 审计：#271 是旧 TASK-033-A 阻塞文档，没有 AI Shell 源码；#248 仅修改既有背景文件，本轮不触碰该文件。未发现修改本轮 AI 组件的重叠源码 PR。不读取未合并设计为执行命令，不覆盖旧 A Task / Result / WBS 历史。

## Tracking

- Issue：[#263](https://github.com/kanzakimy0/TravelAssist/issues/263)。
- Branch：`feature/b-wbs-3-5-ai-floating-entry`。
- Implementation / tests / evidence commit：`79f899b4228e62f1ad7c9a3d755b3805fa36e99f`；后续追踪提交仅文档。
- Draft PR：发布后登记，目标 develop。
- [正式 Task](TASK-033-b-ai-floating-entry-closeout.md)；[Owner correction](../project/WBS-3.5-owner-correction.md)；[QA 及截图索引](../qa/TASK-033/README.md)。

## Existing Implementation Audit

| 既有实现 | 审计 / 处理 |
| --- | --- |
| home-ai-assistant.tsx | 原 useState 单 panel、Escape listener、首次打开 close focus、关闭 launcher focus、backdrop 关闭均正确；保留。 |
| ai-entry-button.tsx | 原生 button / forwardRef / ARIA props 正确；Enter/Space 及触摸可用；保留。 |
| ai-entry-button.module.css | 四尺寸入口 ≥44px；发现 320px + 底部安全区会把原下方入口推到 Login，短视口还会覆盖 CTA；仅窄屏采用紧凑上方定位。 |
| ai-conversation-panel.tsx | 正确复用 FloatingPanel，region/label/textarea；Send disabled，accessible name 已说明“AI 服务尚未接入”，可见说明“AI 服务将在后续接入”；保留。 |
| ai-conversation-panel.module.css | 修左右 / 顶部 safe-area、短视口 max-height 与 overscroll；窄屏面板跟随入口向下展开。 |
| FloatingPanel / Button / shared tokens | 复用原实现，无新组件、tokens、字体或依赖。 |
| Home/Main Shell 与其他页面 | 不移动 Hero / CTA / Account / Header / Footer；Start / Planner / Detail 不新增 Home AI Shell。 |

## AI Entry

- 保留单一原生按钮、aria-controls / aria-expanded；关闭为 false，打开为 true。
- 1440×900 / 1024×768：原 88×88、右下位置保持。390×844：原 64×64、右下位置保持。
- **≤352px：44×44 紧凑图标入口，固定在 Header 下方右侧（普通 320px 视口 y=88），保留可访问名称。**面板在其下方展开。该必要适配仅移动 AI 自身，避免安全区导致 Login/CTA 遮挡；其余首页内容不移动。
- 保留原珊瑚 / 暖白 / 边框 / 阴影 / focus 样式；没有第二套入口。

## Open / Close / Focus

生产浏览器验证 click / tap / Enter / Space → 单一面板 → close focus；Tab 可进入带 label 的 textarea。

- 重复点击入口仍只有一个 panel，当前 textarea 内容不被重复挂载清空。
- × / Escape / backdrop 均关闭，aria-expanded=false，焦点回原入口。
- 打开/关闭 URL、history.length、localStorage 均不变化。
- textarea 可输入和换行；Send 保持 disabled；不产生假回复、streaming、历史存储或实际请求。
- 使用原有 Wizard 控件创建草稿、Detail 原“保存到浏览器并进入详情”保存工作区，再返回 Home 打开/关闭 AI，检查两份真实本地状态仍一致；返回 Start 和 Detail 继续保持原状态。

## Responsive / Accessibility

- 1440×900、1024×768、390×844、320×568 × Guest / verified fixture × normal / reduced-motion：**16/16**。
- 额外 Chromium 原生 Emulation.setSafeAreaInsetsOverride：top=24、left/right=28、bottom=34；320×568 与 320×480：**2/2**。
- 总计 **18/18 AI cases**；Tab/Enter/Space/Escape、焦点返回、textarea label、禁用 Send 原因、无横向溢出通过。
- 面板保持在视口和安全边界内；内部滚动到底后 wheel 不传递到底页。reduced-motion 下 panel/backdrop animation 为 none。
- 原始问题：320×568 + 上述安全区，旧入口 y=386、高64，命中范围覆盖 Login；旧面板左右仅12px，小于28px安全边界。当前紧凑入口和安全区边距消除两处问题。
- 面板是覆盖层；打开时可覆盖 Hero 的部分视觉区域，这是既有交互，不改变底层布局流。关闭后的主入口、账户与 Footer 可点击。

## Main Page Regression

精确未修改 execution base 独立 production build/start 与当前分支对照：

- /、/start、/planner、/planner?view=detail&day=1 × 四尺寸 = **16 组前后对照**（8 个浏览器批次、32 次页面采集）。
- Hero / CTA / Account / Login / Header / Footer、Wizard 内容、地图、右栏、底栏 / Detail 执行轨道几何一致。
- 窄屏 AI 入口自身的定位变化单独验证为44px/y88；未将其伪报为“全部像素不变”。
- CTA / Login / Account / Footer 命中、Wizard 下一步与恢复、Planner 已保存 Detail 恢复通过。
- **0 console error、0 page error（含 hydration）、0 mutation request**。
- [browser-report.json](../qa/TASK-033/browser-report.json) 保留原始尺寸、前后几何与结果；[screenshots.json](../qa/TASK-033/screenshots.json) 保存50张本地实际截图路径 / SHA-256，本轮不向 Git 添加图片。

## Validation

| 检查 | 结果 |
| --- | --- |
| npm ci | 通过；audit 0 vulnerabilities |
| npm run lint | 通过；0 errors / warnings |
| npm run typecheck | 通过 |
| npm run build | 通过；Next 16.3.4 Turbopack production |
| npm test --if-present | exit 0；无 test script，另跑真实 Node 全仓 |
| Node 全仓最终候选 | **724 tests：721 pass / 3 fail** |
| 精确未修改 execution base | **720 tests：717 pass / 3 fail** |
| TASK-033-B 专项 | **4/4**，复用真实 TSX renderer；动态行为另由生产浏览器验证 |
| git diff --check | 通过 |

全仓命令：`node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs`。
专项：`node --import ./tests/register-route-ts.mjs --test --test-name-pattern=TASK-033-B tests/task-025-2-concept-fidelity.test.mjs`。
[test-report.json](../qa/TASK-033/test-report.json) 含统计与 baseline 文件 hash 证明。

## Problems / Deferred

**不能继续沿用“当前 develop 仅有两项基线失败”的旧结论。**此次独立基线与当前候选均复现三项：

1. `nightly --verify-only does not write canonical catalogs`
2. `complete library passes file, schema, hash, rights and protected checks`
3. `full scan has 100% catalog coverage`

前两项是既有四个 design SVG 的 CRLF 清单记录 / LF 仓库内容差异。第三项来自已合入 TASK-031 的40张 QA WebP 未登记 asset-source-catalog。TASK-031 上一份718/720结果取得于截图归档之前；当时未在归档后的完整树再次运行全仓，遗漏了这项 coverage failure。本 Result 明确更正当前基线结论，保留原历史记录，不伪报全绿。

全部相关文件逐字节与 execution base 相同，本轮不修改资产、catalog 或测试预期以消除失败。新证据遵照本 Task 仅提交路径/hash/报告，截图留本地，避免扩大 coverage 缺口。

真实 AI Backend、Provider、回复、streaming、聊天存储、AI读取偏好、修改行程、6.x、DB/Map/Route/Booking/Payment 均未实施。登录态仅使用已存在本地可信 Auth fixture 做 UI 回归，不声称验收线上 Provider。手机 safe-area 与短视口使用 Chromium 模拟，不等于真实 iOS 软键盘整机测试。

## WBS Updated

- 3.5：**B / 待审查**。
- 3.1 / 3.2 / 3.3 / 3.4：B / 已完成，保持。
- 3.2.1：A / 未开始 / Deferred，保持。
- 3.7 / 6.x 的 Owner 与状态不变；其他工作站记录及历史命名不覆盖。

## Ready For Review

代码、专项、浏览器 QA 与完整 Result 已交付 Draft PR → develop。请重点验收320px紧凑入口与面板打开效果；常规三个尺寸入口位置保留。

仅用户视觉验收通过并合入 develop 后，3.5 才可已完成。本轮到此停止，不自动合并，不启动3.7或任何6.x Task。
