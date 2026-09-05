# WBS-5.2-B — 头像菜单与个人中心跳转目标

## Metadata

- Task ID: WBS-5.2-B
- WBS ID: 5.2
- Owner: B
- Status: 已完成
- GitHub Issue: [#50](https://github.com/kanzakimy0/TravelAssist/issues/50)
- Branch: feature/b-account-wbs-5-2-avatar-menu
- Base Commit: e51bc89d75132df20797dff0e5b4d40405b5693d
- Depends On: 5.1（已完成）
- Commit: 6f25b259853b946dbe588b60240acf2ef69b9671
- Pull Request: [#52](https://github.com/kanzakimy0/TravelAssist/pull/52)（Merged）

## Objective

启用个人中心右上头像快捷导航，仅实现 WBS 1.22 冻结的菜单与跳转目标。

## Existing Work Checked

- 已执行 status / remote / fetch --all --prune / checkout develop / pull --ff-only，并确认初始工作区 clean。
- 最新 develop 为 e51bc89（PR #49）；WBS 1.22、5.1 已完成，5.2 未开始。
- 最新 A Task 为 TASK-004.1-A（Planned，Issue #24）；最近已完成 A Task 为 TASK-004-A。
- 最近 B 正式任务为 WBS-5.1-B；素材跟进记录已完成（PR #47）。最新 B 视觉准备文档随 PR #49 合入，但不是正式新 Task，也不实现 5.2。
- 搜索全部 Issue 标题、打开的 PR、所有远程分支文件，未发现等价 5.2 工作；各分支现存 TopActions 均为同一 disabled 占位版本。
- Issue #50 为本次新建；未覆盖历史分支或其他 Task。
- 执行期间 develop 新增 2d26861 / 4e62ec0：Planner v0.2 设计和 TASK-008-A（Planned，Issue #51）。仅上游文档变化，无个人中心代码重叠；合并后已保留并复核，不执行其任务指令。

## Scope

- 可复用 B-owned AvatarPopover 内容、五个冻结导航目标。
- Trigger、外部点击、Esc、路由变化关闭，焦点与自然 Tab 顺序。
- 既有 Mock 身份、明确 disabled 的退出登录。
- 五种指定视口验证与本 Task 三方追踪。

## Out of Scope

Auth / Session / 真实 Logout、A Header、通知、5.1 视觉、各管理页业务、新素材、新依赖。

## Design Source

- docs/ui/personal-center.md（WBS 1.21）
- docs/ui/personal-center-shell.md（WBS 1.22，最高产品设计依据）
- docs/project/WBS-TravelAssist.md
- docs/development/task-tracking.md

## Implementation

- AvatarPopover 接收 id / ref / toggle handlers / onNavigate，由宿主负责 Trigger、定位与焦点；内容与目标不依赖 TopActions 布局。未来 A 接入时提供现有 Personal Center 语义 Token，不修改 A Header。
- 使用原生 `popover="auto"` 的非模态 top layer，保留 Shell overflow 与所有 5.1 样式；支持浏览器原生外部点击 / Esc。参考 [Popover 标准](https://html.spec.whatwg.org/multipage/popover.html)。
- 使用普通 nav / Next Link，不声明 menu 角色或不完整的方向键模式。`aria-expanded` 与 toggle 事件同步；`aria-controls` 关联稳定 id。
- 按 Trigger 实际位置右对齐，宽度 292px，最少 16px 视口边距；可视高度不足时仅菜单内部滚动，监听 resize / scroll 并清理。
- onNavigate 关闭；usePathname 处理持久 Layout 的外部路由变化。关闭时保留有效外部焦点或返回 Trigger，不清理任何身份存储。
- avatar-menu.ts 复用现有 personalNavigation 路由；身份区直接使用 mockPersonalUser。
- 仅 TopActions 是新增 Client 边界，App Router layout / pages 保持 Server Components。

## Validation

验证日期：2026-09-05；Node v24.18.0 / npm 11.16.0。使用现有 bundled Playwright + 本机 Edge，无新增工程测试依赖。

| Check                | Result               | Evidence                                                                       |
| -------------------- | -------------------- | ------------------------------------------------------------------------------ |
| npm install          | Passed               | up to date，361 packages，0 vulnerabilities；allow-scripts 历史提示见 Problems |
| npm run lint         | Passed               | exit 0，无 lint warning                                                        |
| npm run typecheck    | Passed               | exit 0                                                                         |
| npm run format:check | Baseline exception   | exit 1；初验 6 个，合并后 7 个未修改的上游文档                                 |
| Task scoped Prettier | Passed               | 全部 6 个新增/修改文件（含共享 WBS）通过                                       |
| npm run build        | Passed               | 9 个静态页面生成成功，无 build warning                                         |
| git diff --check     | Passed               | 无空白错误                                                                     |
| npm run dev          | Passed               | 127.0.0.1:3000 启动，五个个人中心路由均 HTTP 200                               |
| Browser interaction  | Passed               | 56 项分组断言，5 种视口，每种视口验证全部导航和交互                            |
| Console              | Passed with baseline | 无阻塞/React/hydration 错误；仅既有 favicon.ico 404                            |

合并后复核：在 develop 84f977e 确认 src / package.json / package-lock.json 与已验证实现 6f25b25 完全一致；重新执行 lint / typecheck / format:check / diff check，并使用 `npm run start -- --hostname 127.0.0.1 --port 3001` 对生产构建重跑全部 56 项浏览器分组检查，结果 Passed。开发模式与生产模式均通过，例外仍仅为上述基线。

### Interaction

| Behavior                                        | Result                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| Trigger open / toggle close                     | Passed                                                                 |
| Outside click                                   | Passed；保留用户刚点击的有效外部焦点                                   |
| Esc / focus return                              | Passed；Tab 移出菜单后 Esc 也返回 Trigger                              |
| Tab / Shift+Tab / Enter / Space / focus-visible | Passed；自然顺序，不锁定焦点                                           |
| Same-route Home click                           | Passed；关闭且保持 /personal-center                                    |
| Route navigation / Sidebar active               | Passed；全部五个目标正确                                               |
| Browser back / forward / 外部 pathname 变化     | Passed；持久 Layout 不残留打开状态                                     |
| Disabled logout                                 | Passed；可滚动到达，无导航，无 localStorage/sessionStorage/cookie 修改 |
| Sidebar 用户摘要                                | Passed；仍跳转 /personal-center/account                                |
| Resize / 重复开关                               | Passed；实时从 1440 改为 320 宽，连续 15 次打开/Esc 无重复关闭         |

### Viewports

| Viewport  | Popover width | Initial top / bottom | Result                             |
| --------- | ------------- | -------------------- | ---------------------------------- |
| 1920×1080 | 292px         | 70 / 482.5px         | Passed                             |
| 1440×900  | 292px         | 70 / 482.5px         | Passed                             |
| 1280×720  | 292px         | 70 / 482.5px         | Passed                             |
| 390×844   | 292px         | 399 / 811.5px        | Passed                             |
| 320×740   | 288px         | 399 / 724px          | Passed；可用高度 325px，菜单可滚动 |

全部视口无横向 overflow；菜单 hit-test 确认在内容层上方且不被祖先 overflow 裁切。已检查桌面和窄屏打开/滚动后的实际截图。

本机非提交证据保存在 `F:\TravelAssist\node_modules\.cache\wbs-5.2\`：verify.cjs、report.json、各尺寸 open/logout 截图。复核可运行 `node node_modules/.cache/wbs-5.2/verify.cjs`；该临时脚本依赖本机 bundled Playwright，未作为仓库测试框架交付。

### Manual Recheck

1. 打开 /personal-center，点击右上头像，检查 Yuki / Mock 用户与五个链接。
2. 再点击关闭；重新打开，Tab 进入链接，Esc 关闭并回到头像。
3. 逐项点击链接，核对 URL、关闭状态与 Sidebar 当前项；在首页重复点击“查看个人中心”。
4. 打开后点击正文、使用浏览器后退/前进，确认不会残留菜单或隐藏焦点。
5. 320×740 下 Tab/滚动到退出登录，确认可辨认且 disabled；通知仍 disabled。

## Created

- src/features/personal-center/components/avatar-popover.tsx
- src/features/personal-center/constants/avatar-menu.ts
- docs/tasks/TASK-WBS-5.2-b-avatar-menu-navigation.md

## Modified

- personal-top-actions.tsx：仅头像交互与必要 Client 边界。
- personal-center.module.css：只新增头像菜单相关规则，没有修改任何既有 5.1 规则。
- docs/project/WBS-TravelAssist.md：仅 5.2 行与本 Task 追踪行。

## Problems

- 全仓 Prettier 例外：docs/project/WBS-5.1-PERSONAL-CENTER-ASSET-AUDIT.md、docs/project/WBS-5.1-VISUAL-READINESS-RECHECK-2026-09-05.md、docs/ui/authentication.md、docs/ui/personal-center-shell.md、docs/ui/personal-center.md、docs/ui/profile-account.md。均未修改，不为通过检查而重排其他文档。
- 合并后上游新增 docs/tasks/TASK-008-a-trip-planner-shell.md 也被 Prettier 报告，最终共 7 个基线文档；不修改 A 的 Task。
- npm 11.16.0 提示 unrs-resolver@1.12.2 install script 尚未列入 allowScripts；安装与全部构建检查成功，未擅自批准脚本或改安装策略。
- 浏览器仅有既存 /favicon.ico 404，本 Task 不修改全局图标。
- 本实现使用原生 Popover API，针对支持该标准的现代浏览器；实际执行的是 Edge，未声称完成 Safari / Firefox 真机验收。
- 真实 Logout / A Header 接线有意保持未实现，不属于本 Task 缺陷。

## Result

Completed。PR #52 已于 2026-09-05 合并到 develop，merge commit 为 84f977ea9c95841f1f83bb8d93f5f0dce201d08b，已拉取并通过合并后验收。A Main Header / 5.1 视觉 / 其他 Task / package.json / package-lock.json 均未修改，无新增图片或依赖。

## Commit

- Implementation: 6f25b259853b946dbe588b60240acf2ef69b9671
- Message: feat(WBS-5.2-B): implement avatar menu navigation
- Push: 成功，origin/feature/b-account-wbs-5-2-avatar-menu。

## Pull Request

- [PR #52](https://github.com/kanzakimy0/TravelAssist/pull/52)
- State: Merged
- Base: develop
- Merge Commit: 84f977ea9c95841f1f83bb8d93f5f0dce201d08b
- 本次完成同步为同一 feature 分支的 docs-only 后续提交，只更新本 Task 和 5.2 自己的 WBS 记录。

## WBS Sync

仅将 5.2 行及 WBS-5.2-B Tracking Record 更新为已完成，并回填真实实现 commit / PR。其他 WBS 状态保持不变。

## Issue Sync

Issue #50：已满足关闭条件；本次 docs-only 同步合入 develop 后追加完成评论并关闭，最终由 GitHub Issue 实际 Closed 状态核验。

## Next B WBS Item

重新读取合并后的 WBS：建议下一 Task 为 5.4 Profile / 账户设置 UI，其依赖 1.24、5.1 均已完成。5.3 仍依赖未完成的 8.3；5.5 / 5.11 仍受 1.25 等依赖约束。仅建议，不创建或执行后续 Task；正式开始前仍须重新检查最新 develop / WBS / Tasks / Issues / PRs。
