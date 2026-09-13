# RESULT-TASK-059-B — WBS 9.6 Personal Center E2E

**结论：PARTIAL / BLOCKED。** 八个 mandatory 浏览器旅程已实现并执行；J1、J2、J4、J5、J7、J8 通过，J3/J6 被既有 UI 接线缺口阻塞。不能将 WBS 9.6 宣布验收通过。

## Tracking

- Issue：[#364](https://github.com/kanzakimy0/TravelAssist/issues/364)，保持 Open。
- 执行时最新、干净的 `origin/develop`：`5240ff8f7a91c1e36e90449d0f619de93f795472`。发布前重新 fetch，develop 未变化。
- 实现分支：`codex/b-account-wbs-9-6-personal-center-e2e`，从该 develop 创建，未从规格分支开发。
- 最终测试代码候选：`6f64889b39db28a890a9e309388ab22e3063b929`。后续仅提交 QA / Result 文档；测试、runner、package 的哈希见 `quality-gates.json`。
- Draft PR：发布后补充编号，目标 develop，使用 `Refs #364`，保持 Draft / Unmerged。
- 最终 PR head 与 exact-head GitHub Quality Gate：见该 PR 的 **Exact final-head verification** 记录，包含最终完整 SHA、相同 `headSha` 的 workflow_dispatch run URL / conclusion。提交无法包含自身 SHA 和随后完成的 CI 结果，因此采用 PR 外部验收记录，避免追加文档提交再次改变已验的 head。
- WBS 9.6 保持 `进行中（#364 / TASK-059-B）`。正式 TASK §§15/20 明确：存在阻止 J1–J8 完成的真实 blocker 时返回 Partial/Blocked；必须全部通过后才可进入“待审查”。未修改其他 WBS 行或 Owner。

## Framework / runtime

复用现有 Node test runner + Playwright 1.62.1、Local Supabase/Auth、生产 Next server 和已验收启动/清理/网络隔离辅助方法。Playwright 通过 `CODEX_PLAYWRIGHT_PATH` 使用环境已有安装；没有新增第二套框架、依赖或 lockfile 改动。

稳定入口：`npm run test:personal-center:e2e`。默认 Edge，按 J1–J8 顺序执行；`WBS_BROWSER=chromium|firefox|webkit` 选择已有运行时。Mandatory fail/skip/todo/cancel/no-test 或清理失败均返回非零，不会降级为 PASS。

| Browser  | 实际版本 / 结果                                    |
| -------- | -------------------------------------------------- |
| Edge     | 153.0.4234.32；完整两轮，均因 J3/J6 FAIL           |
| Chromium | 151.0.7922.34；完整一轮，同样 J3/J6 FAIL           |
| Firefox  | DEFERRED：Playwright Firefox 1538 对应二进制不存在 |
| WebKit   | DEFERRED：Playwright WebKit 2336 对应二进制不存在  |

桌面 `1440×900`、手机 `390×844` 复用 WBS 9.12。两者完整导航均通过；没有声称真实 Safari、原生 iOS/Android 或真实外部邮件/SMS/OAuth 服务通过。

## J1–J8

测试位置：`tests/task-059-personal-center-e2e.runtime.mjs`；逐项断言及位置见 `e2e-matrix.json`。每轮使用三名不同 Local 用户：旅程用户 A、控制用户 B、独立删除用户 C，另有匿名 context。A/C 通过真实浏览器注册和 Local 邮箱确认；B 通过现有 Local fixture 创建并用浏览器登录。全部结果同时适用于上述 Edge / Chromium 最终执行。

| Journey | 结果 | 实际验证                                                                                                                                               |
| ------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| J1      | PASS | 16 条受保护路由、登录 returnTo、URL owner 注入拒绝、无私有 DOM 闪现、浏览器响应/client chunks 无服务端凭据                                             |
| J2      | PASS | 注册/确认、多页会话、真实偏好保存、退出、私有路由拒绝、重新登录后持久化恢复                                                                            |
| J3      | FAIL | 无效昵称校验和临时 UI 保存通过；离页/刷新/重登后丢失，真实 Profile 行未保存，控制用户的真实 Profile 也未显示                                           |
| J4      | PASS | 移动、自然兴趣、餐饮、住宿、预算、计划六类 UI；跨页/刷新/重登、模板仅草稿、Cancel、显式 Save、保留其他类别键、unset Reset、双用户隔离                  |
| J5      | PASS | 同行人创建/编辑、组合与成员、跨页/刷新/重登、独立浏览器隔离、组合及同行人删除后持久化                                                                  |
| J6      | FAIL | 现有 B API / contract 成功创建每用户 Draft/Saved/History；UI 未渲染任何真实当前用户记录，刷新仍是 fixture，不能证明浏览器级 Trip ownership             |
| J7      | PASS | 桌面/手机主页头像入口、Shell、Profile、Preferences、Companions、Trips/History/Drafts、隐私/删除入口、后退/前进和同一浏览器切换用户                     |
| J8      | PASS | 独立用户完整注册→使用→删除；确认文字/复选框、owner 注入保护、真实 DELETE 204、会话失效、旧用户登录失败、Auth/八类 B 数据清除、控制用户完整记录保持不变 |

## 两轮 deterministic 检查

两轮 Edge 使用同一候选 SHA 和完全相同测试源码哈希：`dcbe5b725003639df5c4f7807707fff00798240c7a0d7949e69dc274fa2a3a69`。

| 执行       | Journey            | Node TAP           | skip / todo / cancel | 结果 |
| ---------- | ------------------ | ------------------ | -------------------- | ---- |
| Edge run 1 | 8：6 PASS / 2 FAIL | 9：6 PASS / 3 FAIL | 0 / 0 / 0            | FAIL |
| Edge run 2 | 8：6 PASS / 2 FAIL | 9：6 PASS / 3 FAIL | 0 / 0 / 0            | FAIL |
| Chromium   | 8：6 PASS / 2 FAIL | 9：6 PASS / 3 FAIL | 0 / 0 / 0            | FAIL |

Node 的第三个 failure 是包含 J3/J6 的父测试，非第三个产品 blocker。两轮计数、旅程结果和源码一致，证明失败可重复；**未满足两轮全部 PASS 的验收要求**。早期三轮测试定位/断言校正不计入这两轮。

## Regression / QA

| Gate                                        | 结果                                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| npm ci                                      | PASS，使用锁定依赖                                                                                    |
| 基线全仓 Node                               | 2,493/2,493 PASS；skip/todo/cancel 0                                                                  |
| 候选全仓 Node                               | 2,493/2,493 PASS；skip/todo/cancel 0                                                                  |
| 9.5 non-Local，基线 / 候选                  | 均 PASS：28 文件，1,823 tests                                                                         |
| 9.5 Local，基线 / 候选                      | 均 PASS：13 suites，877 tests，另 2 个 bundle audits                                                  |
| lint / typecheck                            | PASS，新增代码无 lint error/warning                                                                   |
| build                                       | PASS                                                                                                  |
| deploy:validate:local                       | PASS                                                                                                  |
| deploy:build:local / deploy:verify-artifact | 均 PASS；1,871 文件，0 failures                                                                       |
| canonical format:check:deploy               | PASS                                                                                                  |
| TASK-059 scoped Prettier / git diff --check | PASS                                                                                                  |
| exact final-head GitHub Quality Gate        | 以 Draft PR 的 Exact final-head verification 记录为准；此 CI 不运行 Local E2E，不能覆盖 J3/J6 的 FAIL |

首次 9.5 Local 聚合因干净工作区缺少 ignored `task047/baseline-browser/geometry.json` 失败。执行仓库已有 `tools/qa/task-047-browser-baseline.mjs` 重新生成，完成 25 个页面/五个 viewport 的既有几何基线，然后完整重跑通过；原断言未改、旧证据未复制。首次失败和恢复日志的哈希均已记录。Migration integration/type drift 检查实际重跑；已验收双 replay 证据仍为历史引用，没有额外执行无必要的破坏性 replay。

`TASK-055` 正式 Task 文件不存在于 develop，因此从其原规格分支补读；最新 Result、inventory、matrix、gap 和 package 从当前 develop 读取。

## Blocker handoff

1. **Profile UI 尚未接入持久化。** `profile-account.tsx` 从 `initialAccountDraft` 初始化；Save 仅更新 React `saved` 状态。J3 独立验证离页、硬刷新、重登均丢失修改，DB 未保存。[已验收 TASK-050 Result](https://github.com/kanzakimy0/TravelAssist/blob/5240ff8f7a91c1e36e90449d0f619de93f795472/docs/tasks/RESULT-TASK-050-b-profile-account-api.md) 第 98 行明确未声称 UI 持久化接线完成。需要明确并授权 Profile UI 的真实数据/设置/联系人适配范围后接入既有 API。
2. **Trip Library UI 尚为 fixture。** `trip-library-page.tsx` 使用 `createTripLibraryFixture()`；真实 B owned records 未渲染。[已验收 TASK-049 Result](https://github.com/kanzakimy0/TravelAssist/blob/5240ff8f7a91c1e36e90449d0f619de93f795472/docs/tasks/RESULT-TASK-049-b-trip-save-read-history-contract.md) 第 86–88 行明确：先决定 Trip-only 展示及未持久化的预订/收藏/封面等缺失数据语义，再接入 client；不得虚构 0 值。此决定超出本 QA Task 的窄范围缺陷修复。

未把以上 mandatory FAIL 包装成 baseline debt，也未用 API PASS、mock 卡片或两边均未显示真实数据来声称浏览器隔离通过。现有可执行失败断言保留，后续接线完成后须完整复跑。

## Safety / cleanup

三次最终 E2E 均从空 Local 开始并清理到空：synthetic Auth users = 0；八类 B rows = 0；Storage objects/buckets = 0；任务 browser/server 已关闭，应用端口空闲，`db:status` / `db:stop` 成功。最终 9.5 Local 回归也完成同样清理。

C 删除前：Auth 1、Profile 1、settings 1、contact 1、Preference 1、Companion 1、group 1、member 1、Trip records 3；删除后全部为 0，B 的完整数据逐行一致。最终运行 page errors、unexpected console errors、浏览器/服务端 external requests、secret leaks 均为 0。

Production mutation = No；Staging mutation = No；external booking/provider mutation = No。未修改产品 UI、SQL/migration、generated types 或依赖；凭据、token、真实用户 UUID、storageState、HAR 和大体积媒体未提交。

## Deliverables / stop state

已生成 `docs/qa/TASK-059/` 下 README、browser-harness-inventory、e2e-matrix、journey-results、browser-matrix、quality-gates，以及本 Result。完整命令、执行时间、源码/日志哈希和清理记录位于证据 JSON；原始日志保留在 ignored `.artifacts/task059/`。

- PR 保持 Draft / Unmerged；Issue #364 保持 Open。
- WBS 9.6 = 进行中，尚不符合待审查门槛；未标记已完成。
- WBS 9.7 started: No
- WBS 9.8 started: No
- Other downstream B task started: No
