# WBS 5.2 Problem Resolution Handoff

- Follow-up: WBS-5.2-B-FOLLOWUP
- Owner: B
- Issue: [#56](https://github.com/kanzakimy0/TravelAssist/issues/56)
- Task: [TASK-WBS-5.2-b-problem-cleanup-followup.md](../tasks/TASK-WBS-5.2-b-problem-cleanup-followup.md)
- Base: 96a88297196cced771f7e3bb753ade4f17f96d05
- Evidence date: 2026-09-05
- 本记录是交接，不代表已执行 A / Shared Infra 或后续正式 WBS 的工作。

## Resolved by B

### Prettier

| File                                                        | Result |
| ----------------------------------------------------------- | ------ |
| docs/project/WBS-5.1-PERSONAL-CENTER-ASSET-AUDIT.md         | Passed |
| docs/project/WBS-5.1-VISUAL-READINESS-RECHECK-2026-09-05.md | Passed |
| docs/ui/authentication.md                                   | Passed |
| docs/ui/personal-center-shell.md                            | Passed |
| docs/ui/personal-center.md                                  | Passed |
| docs/ui/profile-account.md                                  | Passed |
| docs/ui/preference-center.md                                | Passed |

逐文件执行 Prettier check / write，再联合 check。修改仅为 Markdown 表格对齐、空白与末尾换行；七份文件共 107 行格式替换。对格式化前预览及落盘后结果分别进行 Markdown parser AST 比对，仅忽略源码位置 position，七份 AST 均完全相同，因此文字、链接、代码块、设计状态与文档结构未变。

初始全仓 format:check 报告 9 个文件（原 8 个基线文件 + 本次上游新建的 Follow-up Task 定义）。完成 B 文档及本 Follow-up 自身格式整理后，只剩下方 A-owned TASK-008-A。

### Runtime regression

- Edge 152.0.4191.62，1440×900 与 320×740：Passed。
- /personal-center HTTP 200；打开、再次点击关闭、外部点击、Esc 关闭和焦点返回：Passed。
- 五个导航目标及 Sidebar active：Passed；包含 /personal-center/account 与首页同路由跳转。
- Logout 保持 disabled；未实现 Logout、Auth 或 Session。
- 两种视口均无横向 overflow，菜单留在可视区域。
- src / public / package.json / package-lock.json / .npmrc 与 Base 无差异。

## Remaining A / Shared Infra

### TASK-008-A formatting

- Status: Open handoff；本 Follow-up 验证时唯一剩余全仓格式失败。
- Evidence: `npm run format:check` exit 1，仅报告 `docs/tasks/TASK-008-a-trip-planner-shell.md`。
- Suggested owner: A / TASK-008-A owner（已有 Issue #51）。
- Target: TASK-008-A owner 在自己的 Task / 分支内处理，保持任务语义。
- Safety: B 未修改该文件，也未修改任何其他 Owner 的 Task。

### npm allowScripts

- Status: Open handoff；提示仍存在，不阻塞本次验证。
- Evidence: Node v24.18.0 / npm 11.16.0；`npm install` exit 0，up to date，audited 361 packages，0 vulnerabilities。提示 `unrs-resolver@1.12.2` install script 尚未列入 allowScripts。
- Impact: lint / typecheck / build 均 exit 0；未观察到安装或构建失败。提示是否可长期接受应由全局工程负责人决定，不由本次通过结果代替安全审批。
- Suggested owner: A / Shared Infra。
- Suggested WBS: 2.3 / 2.4 工程基线的安装策略 follow-up；这些 WBS 当前已完成，本记录不重开、不改其状态。
- Next action for owner: 审查脚本来源、必要性与仓库/CI 安装策略，再决定显式拒绝、批准或其他有记录的处理。
- Safety: 未运行 approve-scripts，未修改 package.json、package-lock.json、.npmrc 或全局 npm 策略。

### favicon

- Status: Open handoff；`/favicon.ico` 仍返回 HTTP 404。
- Evidence: PowerShell HTTP 请求及浏览器显式 fetch 均为 404。浏览器资源时序审计在桌面/窄屏分别记录 28 / 26 条资源，唯一失败路径为 `/favicon.ico`，未发现其他资源 404。
- Observation: 浏览器 response 事件未报告 icon 404，因此同时检查 Resource Timing 的 responseStatus 和显式 fetch；未将“事件中没有 404”误写为 favicon 已修复。
- Impact: 头像菜单与全部导航 smoke Passed，无阻塞异常或其他 console error。
- Suggested owner: A。
- Suggested WBS: 3.1 / 10.5。
- Next action for owner: 在全局 Main Shell / Metadata 范围统一处理 favicon 与品牌素材引用。
- Safety: 未新增 favicon，未修改 root metadata、A Header 或品牌素材。

## Deferred by Design

### Real Logout

- Classification: Deferred by design，不是 WBS 5.2 缺陷。
- Owner: B。
- Target: 5.3 / 8.3。
- Current evidence: 菜单“退出登录”仍 disabled，提示登录功能接入后开放；源码无变化。
- Boundary: 等真实认证与 Session 工作完成后接入，不清 localStorage/cookie、不制造 mock logout。

### Main Header Integration

- Classification: Deferred by design。
- Owner: A。
- Target: 3.4。
- Prerequisite: B 5.2 reusable AvatarPopover / navigation targets 已完成；3.4 自身的 3.1 / 5.3 依赖仍按最新 WBS 处理。
- Contract: A 负责 Header / Avatar Trigger 摆放；B 负责 Popover 内容与跳转目标。
- Safety: src/features/home/、Main Header、Planner Header 均未修改。

### Safari / Firefox

- Current evidence: 本次 Edge smoke Passed；现有 Playwright 1.62.1 的 Firefox 1538 / WebKit 2336 浏览器二进制不存在，两个标准 Program Files 位置也没有原生 Firefox。
- Status: Deferred to WBS 9.12 — B 模块响应式 / 可访问性 QA；不阻塞本 Follow-up。
- Owner: B QA。
- Target QA: 9.12。
- Safety: 未下载浏览器，未安装依赖，未开始完整 9.12 Task。
- Naming: 未执行 Firefox / WebKit smoke，不声称 Safari validated。未来即使 WebKit smoke 通过，也不能等同于 Safari 真机验收。

## Parent WBS

WBS 5.2 remains 已完成. Issue #50 remains Closed.

只新增 WBS-5.2-B-FOLLOWUP 独立 tracking 记录，不改变父项或任何其他 WBS 状态；其他剩余事项按上述 Owner / WBS 交接，不扩大本次范围。
