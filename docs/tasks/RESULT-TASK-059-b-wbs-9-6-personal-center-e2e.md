# RESULT-TASK-059-B — WBS 9.6 Personal Center E2E

**结论：Completed for review。J1–J8 全部通过，WBS 9.6 进入待审查；PR #366 保持 Draft，等待用户验收。**

## Tracking 与恢复过程

- Issue：[#364](https://github.com/kanzakimy0/TravelAssist/issues/364)，保持 Open。
- 初始干净 develop：`5240ff8f7a91c1e36e90449d0f619de93f795472`；原实现分支从该 develop 创建，未从规格分支开发。
- 按本轮用户授权，TASK-060 Profile UI persistence 经 [PR #368](https://github.com/kanzakimy0/TravelAssist/pull/368) 合入 develop，merge `86585600689e3a673ba17156c2ff513db24c7a86`；TASK-061 Trip Library live data 经 [PR #370](https://github.com/kanzakimy0/TravelAssist/pull/370) 合入，merge `05cbc4ea0f771ea27d4927466d516e8ace3bce6b`。两者 source exact-head 和合并后 develop Quality Gate 均通过，链接见 `quality-gates.json`。
- 将包含上述修复、A PR #352 及其收尾的最新 develop `56901c3a18703105442f9c566406f041c0660fbe` **正常 merge** 进 `codex/b-account-wbs-9-6-personal-center-e2e`，得到源码候选 `87345968754456b4b7d7ce3ae58c84f10566853b`。已保留三项任务的全部测试命令；J3 增加真实异步保存完成等待，原持久化/隔离断言不变。
- 最终三轮 E2E 和回归使用该源码候选；后续仅更新 QA、Result 和 WBS 文档。源码哈希见 `quality-gates.json`。
- [Draft PR #366](https://github.com/kanzakimy0/TravelAssist/pull/366) → develop，使用 `Refs #364`，保持 Draft / Unmerged。**最终 PR 完整 head、相同 headSha 的 GitHub workflow URL / SUCCESS，记录在 PR 的 Exact final-head verification 记录。** 提交无法包含自身 SHA 及随后完成的 CI；该外部记录避免为写回 CI 再次改变已验 head。
- WBS 9.6：`待审查（#364 / TASK-059-B；Draft PR #366）`。只修改 9.6 状态单元格，未改其他行或 Owner。

## 框架与浏览器

复用仓库现有 Node test runner + Playwright 1.62.1、Local Supabase/Auth、Next production server 和既有启动/网络隔离/清理 helper。稳定入口为 `npm run test:personal-center:e2e`；默认 Edge，`WBS_BROWSER` 可选择已安装运行时。Mandatory failure/skip/todo/cancel/no-test、浏览器不可用或清理失败均返回非零。没有第二套框架、依赖或 lockfile 变更。

| 浏览器                 | 实际结果                                               |
| ---------------------- | ------------------------------------------------------ |
| Edge 153.0.4234.32     | 完整 J1–J8 两轮 PASS                                   |
| Chromium 151.0.7922.34 | 完整 J1–J8 一轮 PASS                                   |
| Firefox                | DEFERRED：重新检查，Playwright Firefox 1538 二进制缺失 |
| WebKit                 | DEFERRED：重新检查，Playwright WebKit 2336 二进制缺失  |

桌面 `1440×900` 和手机 `390×844` 复用 WBS 9.12 定义，三轮均执行完整导航。没有声称原生 iOS/Android、真实 Safari 或外部邮件/SMS/OAuth 服务通过；注册确认使用真实 Local 邮箱。

## J1–J8 完整结果

执行文件：`tests/task-059-personal-center-e2e.runtime.mjs`；具体行号和断言映射见 `e2e-matrix.json`。每轮使用三名不同 Local 用户 A（旅程）、B（控制）、C（独立删除），另有匿名 context；A/C 通过真实浏览器注册确认，B 使用现有 Local fixture 并通过浏览器登录。

| Journey | 结果 | 关键证据                                                                                                                       |
| ------- | ---- | ------------------------------------------------------------------------------------------------------------------------------ |
| J1      | PASS | 16 条私有路由拒绝匿名访问；returnTo、owner URL 注入、无私有 DOM 闪现；客户端无服务端凭据                                       |
| J2      | PASS | 注册/确认、多页会话、偏好保存、退出、私有路由拒绝、重登后数据恢复                                                              |
| J3      | PASS | 无效昵称校验；显式保存后跨页、硬刷新、重登均保留；真实 Profile DB 行保存，控制用户显示自己的资料                               |
| J4      | PASS | 六类偏好、显式 Save、跨页/刷新/重登、模板草稿/Cancel、保留其他键、unset Reset 和双用户隔离                                     |
| J5      | PASS | 同行人及组合/成员创建编辑、跨会话保存、隔离、删除后不再出现                                                                    |
| J6      | PASS | 现有 B API/fixture 创建真实 Draft/Saved/History；正确显示、刷新后保留、双用户各自可见且不串数据                                |
| J7      | PASS | 桌面/手机头像入口→Shell→Profile→Preferences→Companions→Trips/Drafts/History→隐私/删除入口；前进后退和用户切换                  |
| J8      | PASS | 独立用户完整注册→使用→删除；确认约束、当前 owner、DELETE 204、会话失效、旧登录失败、Auth/八类 B 数据清除，控制用户完整记录不变 |

Trip 测试只使用既有 B Contract/API/fixture；未实现 A WBS 8.5，也未执行 Planner→Save→Personal Center。TASK-061 对未提供的预订/收藏/封面保留明确不可用语义，未虚构数据。

## 两轮确定性

| 执行       | Journey  | Node TAP | fail / skip / todo / cancel |
| ---------- | -------- | -------- | --------------------------- |
| Edge run 1 | 8/8 PASS | 9/9 PASS | 0 / 0 / 0 / 0               |
| Edge run 2 | 8/8 PASS | 9/9 PASS | 0 / 0 / 0 / 0               |
| Chromium   | 8/8 PASS | 9/9 PASS | 0 / 0 / 0 / 0               |

Node 计数含八个子旅程与一个父测试。两轮 Edge 的 head、测试源码哈希、mandatory 检查列表和结果计数全部一致；每轮重新创建用户并清理到空，确定性要求满足。先前 J3/J6 失败，以及 `21b55fc` 上三轮 PASS，均保留为历史。中断期间 develop 新增变更，因此正常 merge 后再次完整执行三轮；随后规范本地测试格式至 Git 中的精确文件并再次复跑三轮，本次 PASS 对比只使用 `8734596` 的 `verified-*` 报告。

## Regression / Mandatory QA

| Gate                                                                | 结果                                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| npm ci                                                              | PASS                                                                                                   |
| 原始执行基线全仓 Node                                               | 2493/2493 PASS                                                                                         |
| 两个 Follow-up 合入时 develop 全仓 Node                             | 2504/2504 PASS；TASK-061 已验源码与 merge tree 完全一致，合并后 CI 通过                                |
| 最新 develop `56901c3` exact-head CI 全仓 Node                      | 2516/2516 PASS；[run 34769032218](https://github.com/kanzakimy0/TravelAssist/actions/runs/34769032218) |
| 恢复候选全仓 Node                                                   | 2516/2516 PASS                                                                                         |
| 9.5 non-Local                                                       | 1823/1823 PASS，28 suites                                                                              |
| 9.5 Local                                                           | 877/877 PASS，13 Node suites + 2 bundle audits                                                         |
| 既有 browser baseline                                               | PASS；重新生成 25 页面/5 viewport 的 ignored 几何基线                                                  |
| lint / typecheck / build                                            | PASS                                                                                                   |
| deploy:validate:local / deploy:build:local / deploy:verify-artifact | PASS；artifact 1869 files，0 failures                                                                  |
| canonical / TASK-059 scoped format / git diff --check               | PASS                                                                                                   |
| exact final-head GitHub Quality Gate                                | SUCCESS，实际最终 head 与 run URL 见 PR #366 的验收记录                                                |

最终有效测试的 fail/skip/todo/cancel 均为 0。9.5 Local 重跑真实 Auth、API、RLS、cascade、migration integration 和生成类型 drift 检查；未新增 migration 或无必要重放。既有 TASK-053 运行时对历史 JSON 的格式重写已恢复，内容/生成类型无差异。各聚合存在覆盖重叠，不相加宣称唯一测试总数。当前 GitHub Quality Gate 不执行 Local E2E，三轮 Local 浏览器证据另行记录。

## Safety / cleanup

每轮从空 Local 开始，结束后 synthetic Auth users、八类 B 表、Storage objects/buckets 均为 **0**。J8 删除前包含 Profile/settings/contact/preferences/companion/group/member 和三种 Trip 记录，删除后全部为 0；B 的完整记录逐行一致。

三轮 page errors、unexpected console errors、secret leaks、浏览器/服务端外部请求均为 **0**；被删除账号登录产生的预期 Auth 拒绝独立记录。测试 browser/server 已关闭，应用端口空闲；最终 9.5 Local 聚合完成同样清理并成功 `db:status` / `db:stop`。中断后 Docker 的失效零字节 runtime socket 目录已保留备份并重新创建，恢复后先验证全部 Local 数据为 0 再开始本次复跑；未执行 factory reset 或删除数据库卷。

Production mutation = No；Staging mutation = No；external booking/provider mutation = No。TASK-059 相对最新 develop 没有产品、schema、migration、生成类型或依赖改动。公开证据不含凭据、token、用户 UUID、storageState、HAR 或大体积媒体。

## 交付与停止状态

已更新 `docs/qa/TASK-059/` 的 README、browser-harness-inventory、e2e-matrix、journey-results、browser-matrix、quality-gates 和本 Result；记录真实命令、执行时间、源码/日志哈希、所有旅程和清理结果。原始日志保留在 ignored `.artifacts/task059/`。

- PR #366：Draft / Unmerged；Issue #364：Open。
- WBS 9.6：待审查，未标记已完成。
- WBS 9.7 started: No
- WBS 9.8 started: No
- Other downstream B task started: No
