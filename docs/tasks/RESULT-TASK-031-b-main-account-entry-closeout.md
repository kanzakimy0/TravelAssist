# RESULT — TASK-031-B / WBS 3.4 主系统账户入口

## 当前结果

**Owner B / 待审查。实现与工程 QA 完成；等待用户视觉验收，不自动合并。**

- Issue：[#261](https://github.com/kanzakimy0/TravelAssist/issues/261)。
- Branch：`feature/b-wbs-3-4-main-account-entry`。
- Execution base：`7f0c292186079cca7ad639ceb550f7d0e4f43cc7`；发布前再次 fetch，develop 仍为此版本。
- Implementation / tests / evidence commit：`18dd0bbcbef1b77717f3898a68a0c5598b59e77b`。后续追踪提交仅更新文档。
- Draft PR：[#278](https://github.com/kanzakimy0/TravelAssist/pull/278) → develop，保持 Draft。
- 正式 Task：[TASK-031-B](TASK-031-b-main-account-entry-closeout.md)；[Owner correction](../project/WBS-3.4-owner-correction.md)。

## Integration Gate 与 TASK-030-B 最终收尾

用户最终验收通过并授权后，PR #273 head 仍为已验收的 `6612b376e00668635266d8c1f9629e3d2637aac7`，GitHub MERGEABLE / CLEAN，转 Ready 后合并。

- [PR #273](https://github.com/kanzakimy0/TravelAssist/pull/273) 于 2026-09-10T02:25:19Z 合入 develop，merge `9c92ef767a6c9d1b986c581f62efcf347efdd674`。
- 对合并前最新 develop `0eb124ce4d2892ea8d1e74a5e587d745f01e8d06`，PR #273 运行时 / 素材 diff 为零；保留其他工作站最新 Planner 实现。
- 文档收尾 [PR #277](https://github.com/kanzakimy0/TravelAssist/pull/277)，merge `7f0c292186079cca7ad639ceb550f7d0e4f43cc7` 已进入 develop。
- WBS 3.3 = B / 已完成；[Issue #260](https://github.com/kanzakimy0/TravelAssist/issues/260) = Closed / Completed；[TASK-030 Result](RESULT-TASK-030-b-main-entry-closeout.md) 已写入 merge closeout。
- 3.4 先保持 B / 未开始，再重新读取 launcher / Task / Owner correction / Master WBS，从上述最新 develop 单独建本分支；3.4 转 B / 进行中。没有叠加未合并分支或 cherry-pick。

历史 Gate Blocked 当时正确；本轮由于 #273 实际合入及 3.3 收尾而解除。原始记录保留在本文末尾。

## 实现结果与复用边界

| 页面 / 能力 | 当前行为 |
| --- | --- |
| Home | 保留既有 readHomeViewer、账户胶囊、Header actions、主 CTA 和背景。仅补移动端 Login 43→44px 点击宽，末端 margin 补偿 1px，胶囊 / Hero 不移位。 |
| Start | Server Page 调用既有 readHomeViewer，经现有 StartPage / Shell / WizardLayout 传到 StartFlowHeader。Guest 显示真实 Login；已验证账户显示名称 / shared Avatar，进入现有 Personal Center。小屏保留 Avatar 和完整可访问名称。 |
| Planner / Detail | Server Page 复用同一 verifier；沿 PlannerPage / TripWorkspace 接入既有 WorkspaceHeader。已有账户 Popover 显示 Guest/Login 或已验证名称、个人中心入口，不创建第二套菜单。 |
| Identity | 仅消费 auth.getUser() 服务端验证结果。Cookie 中伪造的名称和头像不用于展示；invalid / expired / unavailable 回退 Guest。 |
| Avatar | 复用 homeViewerFromVerifiedUser 的 HTTPS / URL credential 校验和 AccountAvatar。缺失、不安全、加载失败均为中性“旅”；图片 alt 为空，不重复读屏。 |
| returnTo | 复用现有 authHref / authDestination / safeReturnTo。Home→Home、Start→Start、Planner→Planner、Detail→同一 view=detail&day=1 URL；查询参数保留，外站 / protocol-relative / scheme / auth-loop 被归一化。 |
| Logout | 原 Personal Center 退出 UI、authRequest(signout)、Auth Core 和页面导航保持。实际点击退出后 Home / Back / Forward 均显示 Guest。 |

Guest 仍可进入旅行规划，未增加 Auth Gate。Home / Start 的 MainHeader 与 BrandLogo、Planner 既有 workspace/header adapter 原样复用；没有新增 Header、Avatar、账户菜单或 Auth helper。

没有改动 Planner 地图 / 右栏 / 底栏几何、Wizard 内容几何、Personal Center Sidebar / Content；没有修改 Auth Core / Guard / Logout / DB / Provider / AI / Route / Booking 等业务。未启动 3.2.1、3.5、3.7。

## 工程验证

| 检查 | 结果 |
| --- | --- |
| npm ci | 通过，395 packages；audit 0 vulnerabilities |
| npm run lint | 通过，0 errors / 0 warnings |
| npm run typecheck | 通过 |
| npm run build | 通过，Next 16.3.4 Turbopack production |
| npm test --if-present | exit 0；仓库没有 test script，继续执行真实 Node 全仓测试 |
| Node 全仓 | **720 tests：718 pass / 2 fail** |
| 未修改 execution base 全仓 | **716 tests：714 pass / 2 fail** |
| TASK-031-B 专项 | **4/4 pass**，扩展原 TSX 测试框架，未删除或弱化既有测试 |
| git diff --check | 通过 |

Node 全仓命令：`node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs`。
专项命令：`node --import ./tests/register-route-ts.mjs --test --test-name-pattern=TASK-031-B tests/task-025-2-concept-fidelity.test.mjs`。

两项失败在当前分支和精确未修改 execution base 上一致：

1. `complete library passes file, schema, hash, rights and protected checks`
2. `nightly --verify-only does not write canonical catalogs`

原因仍是四个 design SVG 的 legacy inventory 记录为 CRLF 字节数 / hash，而仓库内容为 LF；实际文件逐字节等于 execution base，转换为 CRLF 后与既有记录吻合。**未修改资产、清单或测试预期以使其通过；不声称全仓全绿。**详见 [test-report.json](../qa/TASK-031/test-report.json)。

## 浏览器与视觉验收证据

Edge / Chromium production preview，1440×900、1024×768、390×844、320×568；reduced-motion: reduce。

- **64/64 账户检查通过**：四页面 × 四尺寸实际邮箱 Login→原页→Personal Center→现有 Logout→Guest→Back/Forward，共 16 条完整链路；另 48 条 invalid / expired / verified-neutral 页面验证。
- 检查 Tab / Enter / Escape / focus return、focus-visible、44px 点击区域、query returnTo、verified avatar、图片加载失败回退；0 console error / 0 page error（包括 hydration），无横向溢出。
- Detail 首次打开必须通过最新 develop 已有“保存到浏览器并进入详情”确认。验收点击原有按钮并保留本地保存行为，未修改或绕过此流程。
- **36/36 修改前后几何对照一致**：Guest / Signed-in 的 Home / Start / Planner / 真实 Detail，加 Signed-in Personal Center，四尺寸。覆盖 Hero、CTA、账户胶囊、Wizard 内容、地图、右栏、底部执行轨道及个人中心 Shell。
- Home 登录点击宽度的 1px 必要适配单独记录；以上冻结区域不变。
- **40 张实际截图**已归档；原始 PNG 在本地 .cache/qa/task031/，仓库 WebP 与 SHA256 索引见 [QA / 截图索引](../qa/TASK-031/README.md)。
- [账户浏览器报告](../qa/TASK-031/account-browser-report.json)；[几何报告](../qa/TASK-031/geometry-report.json)；[截图 hash](../qa/TASK-031/evidence.json)。

身份验证通过既有本地 Auth fixture 的显式 TASK_031_AUTH_FIXTURE 开关测试现有真实应用 HTTP / SDK / 页面路径。截图“验收账户”与演示头像是测试资料；不硬编码进运行时代码，不代表线上账号。**外部 OAuth / SMS / Email Provider 与真实 Supabase 服务没有在本轮验收，不声称线上 Provider 已验证。**

## 当前状态与停止点

- Master WBS：3.1 B / 已完成；3.2 B / 已完成；3.2.1 A / 未开始 / Deferred；3.3 B / 已完成；**3.4 B / 待审查**。
- Issue #261 保持 Open；Draft PR → develop；等待用户视觉验收，不自动合并。
- 历史 TASK-024-A / TASK-025-A / TASK-025.2-A、Owner 修订、分支 / PR 名称均保留；未覆盖其他工作站记录。
- TASK-031-B 到此停止，不开始后续 Task。

## Historical Blocked — 原始记录保留

以下是本轮 Gate 解除之前的原始记录，状态仅适用于当时；全文保留。

<details>
<summary>2026-09-10 原始 Gate Blocked Result（点击展开）</summary>

# TASK-031-B Result

## Status

**Blocked — Integration Gate failed.**

Reason: TASK-030-B / WBS 3.3 has not been integrated into develop.

## Gate Evidence — 2026-09-10

- Execution base: origin/develop @ 1df4604029b00a2047543b08bb4e9788e9e61652.
- Prerequisite: [PR #273](https://github.com/kanzakimy0/TravelAssist/pull/273).
- PR state: OPEN; isDraft: true; mergedAt: null; mergeCommit: null.
- PR head: e5806db560db9268fabbae424fd233cec2af928f.
- git merge-base --is-ancestor of that head against origin/develop returned 1: prerequisite is not integrated.
- WBS 3.3 completion closeout is therefore not present on develop.
- WBS 3.1 / 5.3 are completed, but this does not override the explicit PR #273 Integration Gate.
- Canonical Owner: B, per docs/project/WBS-3.4-owner-correction.md.

## Preflight

Executed git status --short, git branch --show-current, git fetch --all --prune, git rev-parse origin/develop and git log --oneline -20 origin/develop. The checked worktree was clean.

Read the latest formal Task, Owner correction and Master WBS from origin/develop; checked GitHub PR #273 and Issue #261.

## Scope / Safety

- Stopped before implementation, per formal Task section 3.
- Did not create feature/b-wbs-3-4-main-account-entry.
- Did not develop from the unmerged TASK-030-B branch, cherry-pick, stack a PR or change Home / Main Shell overlap files.
- This report is recorded locally in a detached worktree based only on latest develop. It is not added to PR #273.
- No runtime / test / asset changes. No npm install, build or browser implementation QA was run; these are not reported as PASS.
- Master WBS 3.4 was not marked in progress or completed. Task status is Blocked; implementation has not started.
- No merge action and no later Task started.

## Tracking / Resume Condition

- Issue: [#261](https://github.com/kanzakimy0/TravelAssist/issues/261), remains Open; record this blocker there.
- Result file: docs/tasks/RESULT-TASK-031-b-main-account-entry-closeout.md (local gate record, not pushed).
- Implementation branch / implementation commit / Draft PR: not created.
- Resume only after PR #273 is merged into develop and WBS 3.3 is closed out. Re-fetch latest develop, recheck the gate, then create the specified feature branch and safely update 3.4 Owner B / 进行中.

</details>
