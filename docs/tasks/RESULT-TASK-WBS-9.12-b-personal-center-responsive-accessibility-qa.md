# RESULT-TASK-WBS-9.12-B — Personal Center Responsive / Accessibility QA

## Status

- WBS 9.12: 待审查
- Issue: #181（保持 Open）
- Draft PR: [#184](https://github.com/kanzakimy0/TravelAssist/pull/184)（base: develop）
- Merge: 未执行
- User acceptance: 待完成

## Base / Branch / Commits

- Base: origin/develop@99f3ddb7d6bad0c5d1bf0937b310be6acc7bb031
- Branch: fix/b-account-wbs-9-12-responsive-accessibility-qa
- Implementation / QA commit: 8285665
- Initial Result / tracking commit: 492929f
- PR tracking sync: 本提交（branch HEAD）

## Dependency Gate

- WBS 5.20 已完成并通过用户验收。
- WBS 9.12 Owner 为 B。
- GitHub 检查只找到正式 Issue #181；PR #182 是 Task docs PR，不是 implementation PR。
- 远端不存在同名 implementation branch，也不存在 9.12 implementation PR。

## Routes Tested

以下 16 个 B-owned Personal Center 路由均在完整 route regression 中返回 HTTP 200，并通过主内容、当前导航、ARIA 引用和 document overflow 检查：

1. /personal-center
2. /personal-center/trips
3. /personal-center/preferences
4. /personal-center/preferences/mobility
5. /personal-center/preferences/attractions
6. /personal-center/preferences/dining
7. /personal-center/preferences/accommodation
8. /personal-center/preferences/budget
9. /personal-center/preferences/experience
10. /personal-center/preferences/advanced
11. /personal-center/companions
12. /personal-center/account
13. /personal-center/account/security
14. /personal-center/account/privacy
15. /personal-center/account/privacy/delete
16. /personal-center/account/booking-sync

## Viewport Matrix

Edge 与 Chromium 均真实执行以下 12 个 viewport：

| Viewport    | Band             | Result |
| ----------- | ---------------- | ------ |
| 1920 × 1080 | Wide             | PASS   |
| 1440 × 900  | Wide             | PASS   |
| 1280 × 720  | Wide boundary    | PASS   |
| 1279 × 800  | Compact boundary | PASS   |
| 1024 × 768  | Compact boundary | PASS   |
| 1023 × 768  | Tablet boundary  | PASS   |
| 768 × 1024  | Tablet boundary  | PASS   |
| 767 × 900   | Mobile boundary  | PASS   |
| 430 × 932   | Mobile           | PASS   |
| 390 × 844   | Mobile           | PASS   |
| 375 × 812   | Mobile           | PASS   |
| 320 × 740   | Mobile minimum   | PASS   |

## Responsive Modes

- Wide (>=1280px): full sidebar、五项主导航、内容栅格和 Top Actions 保持可读可操作。
- Compact (1024–1279px): rail 宽度、accessible name、hover/focus tooltip、非纯颜色 active state 均通过。
- Tablet (768–1023px): Drawer trigger、closed inert、modal semantics、滚动锁与焦点生命周期通过。
- Mobile (<768px): 五项 bottom navigation、safe-area clearance、输入字号、320px overflow 与主要触控目标通过。
- 全矩阵未发现新增 document/body 横向 overflow；允许的组件内部滚动未推动 document。

## Keyboard / Focus / Drawer

- Tab: 首个站点内焦点为“跳到主要内容”；激活后焦点进入 #personal-content。
- Shift+Tab: 可逆向返回 skip link；未使用正 tabindex。
- focus-visible: skip link、导航和 Popover 内交互控件有可见焦点样式。
- Tablet Drawer: 初始焦点、Tab / Shift+Tab 圈闭、Escape、backdrop close、触发按钮 focus return、document/body/content scroll lock 均通过。

## Account Popover / Dialog

- Account Popover: 原生 popover 打开/关闭状态与 aria-expanded 同步；Tab 可进入菜单；Escape 与 light-dismiss 均返回触发按钮焦点。
- Profile 原生 Dialog: 初始焦点、modal sequential focus、Escape、focus return 通过。
- Navigation Guard Dialog: 继续编辑、放弃修改与 Drawer 叠层焦点顺序通过。
- Companion editor / delete / discard: 初始焦点、Tab / Shift+Tab 圈闭、Escape、取消及 focus return 通过。

## Touch Targets / Safe Area

- Mobile bottom navigation 与抽查的 Trips、Mobility、Companions、Account、Delete Account 主要交互目标满足约 44 × 44 CSS px。
- 修复紧急联系人编辑/删除按钮宽度仅 28px 的问题，mobile 现为 44 × 44px。
- 修复头像操作被裁为 1px 但仍可进入焦点/可访问性树的问题；仅真实可见状态恢复可见与可点击。
- bottom navigation 使用 env(safe-area-inset-bottom)，主内容 bottom clearance 通过。

## Zoom / Text Expansion

- Desktop 200% 等效方法：以 1440 × 900 的一半 CSS viewport（720 × 450）模拟 browser chrome 200% zoom 的有效布局 viewport；Delete Account 页面保持无 document overflow、主操作可达。
- Mobile 200%：Chromium DevTools Protocol Emulation.setPageScaleFactor=2，实际记录 window.visualViewport.scale=2；Companions 页面与 bottom navigation 可达且无 document overflow。
- Text expansion：Desktop 1440px 与 Mobile 390px 对关键文本使用基于 computed font size 的 150% 临时测试样式，并加入长英文标题；无 document overflow，主内容保持可用。
- 临时缩放/扩展样式只存在于 QA runner，未写入业务代码。

## Reduced Motion

- prefers-reduced-motion: reduce 下对 Personal Center 页面可见元素扫描；未发现大于 0.01s 的非必要 animation / transition。
- Loading skeleton shimmer 的静态回归检查确认 reduced-motion 下关闭。

## ARIA / Semantics

- 所有已渲染 aria-controls、aria-describedby、aria-labelledby 引用均指向存在的 ID。
- 每个 route 保持单一 h1 与单一当前主导航项。
- Drawer、Dialog、alertdialog、tabpanel、status、alert 与 polite live region 语义均完成静态/动态检查。
- selected / warning / error 状态保留文字、图标、边框或字重等非纯颜色表达。

## Loading / Empty / Error / Live Feedback

- Loading: Shell 保持，主内容使用结构化 skeleton；无业务数据伪装和 central spinner 回归。
- Empty: Trips 搜索无结果时动态渲染 polite live region；通用空状态 action 仍由调用方提供。
- Error: route error 支持 retry，未向 UI 暴露内部 error message / stack / digest；字段错误使用 role="alert"。
- Live feedback: Trips 收藏操作动态产生 role="status" 文案；Companions toast 与 shared action feedback 语义回归通过。

## Browser Matrix

| Browser            | Runtime                                                   | Result                         |
| ------------------ | --------------------------------------------------------- | ------------------------------ |
| Microsoft Edge     | 152.0.4191.66, Playwright chromium channel msedge         | PASS — full matrix             |
| Chromium           | Playwright Chromium / Chrome Headless Shell 151.0.7922.34 | PASS — full matrix             |
| Firefox            | Runtime unavailable                                       | Deferred — runtime unavailable |
| WebKit             | Runtime unavailable                                       | Deferred — runtime unavailable |
| Safari real device | Windows 环境，无 Safari 真机                              | Deferred                       |

未修改 package.json，未把 Playwright 加入项目依赖；runner 复用 CODEX_PLAYWRIGHT_PATH、WBS_BASE_URL、WBS_EVIDENCE_DIR。

## Console / Network

- Edge: console error/warning []，page error []，HTTP >=400 response []。
- Chromium: console error/warning []，page error []，HTTP >=400 response []。
- QA 操作未触发业务写请求；未新增 API / DB / persistence / Auth / Provider integration。

## Fixes Made

1. 将动态 preference route props 改为本地显式 Promise params 类型，使干净 npm ci 后无需先生成 .next/types 即可独立通过 tsc --noEmit。
2. Companion delete / discard alertdialog 增加 Tab / Shift+Tab 圈闭、Escape、描述关联与触发点 focus return。
3. 将 Companion editor 的初始聚焦从持续变化的 editor state effect 拆出，避免字段编辑或确认框开关时抢夺焦点。
4. 删除同行人后将焦点移至稳定存在的“添加同行人”操作，而不是已从 DOM 移除的删除触发按钮。
5. 隐藏的头像操作从 keyboard / accessibility tree 中移除，并仅在真实可见状态恢复。
6. Mobile 紧急联系人编辑/删除按钮修正为 44 × 44px。

## Tests

- node --version: v24.18.0
- npm --version: 11.16.0
- npm ci: PASS
- npm run lint: PASS（0 warning）
- npm run typecheck: PASS
- npm run build: PASS（21/21 pages generated）
- npm test --if-present: exit 0，但没有执行任何测试；未记为测试 PASS。
- node --test tests/*.test.mjs: PASS，279 tests / 0 failed；包含 12 项 WBS 9.12 专项 Node tests。
- 9.12 browser runner with WBS_BROWSER=edge: PASS。
- 9.12 browser runner with WBS_BROWSER=chromium: PASS。
- npm run format:check: 已执行；全仓因 31 个既有、与 9.12 无关的 Markdown 文件返回非零，本 Task 文件不在剩余清单中。
- 9.12 修改文件 Prettier check: PASS。
- git diff --check: PASS。

## Evidence

- Local evidence root: .next/qa/WBS-9.12-B/
- Edge: edge/summary.json、12 viewport PNG、Desktop/Mobile zoom PNG、Desktop/Mobile text-expansion PNG。
- Chromium: chromium/summary.json、12 viewport PNG、Desktop/Mobile zoom PNG、Desktop/Mobile text-expansion PNG。
- 大量 PNG 为本地 QA 证据，不提交到 Git。

## Scope Check / Deferred Items

- 修改仅限 B-owned Personal Center route/component/style、9.12 tests、当前 Result 与 Master WBS tracking。
- 未修改 src/features/planner/**、src/features/home/**、src/features/start-flow/**，未修改 Map / Route / AI、Auth Core、DB / API / Persistence、Provider / Booking / Payment 或 A-owned Task。
- WBS 5.4–5.10 与 5.20 的已冻结业务语义保持不变。
- Firefox / WebKit / Safari real-device 项明确 Deferred；不得据此写 PASS。
- PR 合入 develop 且用户验收通过前，WBS 9.12 不得标记为“已完成”，Issue #181 不得关闭。
