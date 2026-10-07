# RESULT-FIX-TASK-035-B — WBS 9.1 R035-01～04 核心修复

- Canonical Owner：**A**；本次 implementation / QA：**B**。
- 状态：**R035-01～04 已修复 / 待复核**。WBS 9.1 总体仍 **BLOCKED（R035-05）**，不具备合并条件。
- 沿用 Issue [#265](https://github.com/kanzakimy0/TravelAssist/issues/265)、Draft PR [#272](https://github.com/kanzakimy0/TravelAssist/pull/272)、`codex/a-test-baseline-freeze`。
- Task：[19c84116f1865866c61ee84a0858b0c0d557af46](https://github.com/kanzakimy0/TravelAssist/blob/19c84116f1865866c61ee84a0858b0c0d557af46/docs/tasks/FIX-TASK-035-b-wbs-9-1-r035-core-fixes.md)。Task 发布提交不是验证代码提交。
- 审核依据：[Result / 13503912](https://github.com/kanzakimy0/TravelAssist/blob/13503912bbbc163f6464457cfe820e6d748930d7/docs/tasks/RESULT-REVIEW-TASK-035-b-wbs-9-1-phase2-acceptance.md)、[findings](https://github.com/kanzakimy0/TravelAssist/blob/13503912bbbc163f6464457cfe820e6d748930d7/docs/qa/TASK-035/review-phase2/findings.md)、[review-evidence](https://github.com/kanzakimy0/TravelAssist/blob/13503912bbbc163f6464457cfe820e6d748930d7/docs/qa/TASK-035/review-phase2/review-evidence.json)。
- 原 PR head：`a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c`。
- **精确实现 / 验证 head：[116d4c66f2f0aed61527b89c703d24f93ec4a4b2](https://github.com/kanzakimy0/TravelAssist/commit/116d4c66f2f0aed61527b89c703d24f93ec4a4b2)**。
- 最新 develop / merge-base：`4888b4d507ee75d4f6b9914eb1a8d5661813f64b`，相对发布时未前进，无需新 merge。原 branch/PR 沿用；未 rebase 或 force push。

## 逐项结论

| Finding | 结论      | 修复与实际证据                                                                                                                                                                                                                                                                                            |
| ------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R035-01 | **FIXED** | `task-035-receipt.mjs:57` 按已审阅路径/哈希识别顶层 assert 脚本：文件级零注册，最终贡献 1；registered/suite/nested 按 Node v24 模型核对。真实原 rights-binding 脚本 exit 0、1/1、validator ACCEPTED；真正空文件被拒绝；原脚本隔离副本追加失败 assert 后 exit 1、validator REJECTED。原业务脚本未改。      |
| R035-02 | **FIXED** | `task-035-process.mjs:8` 集中将 Windows npm 解析为 `node.exe npm-cli.js`；argv 分离，不启用通用 shell。真实 Windows npm version/script/quality 命令通过；空格 cwd/参数、`&` 保真，exit 7 原样传播，timeout 保持失败；shim 扩展覆盖 `%PATH%`、`$()`、引号、管道、脱字符。POSIX direct spawn 解析回归通过。 |
| R035-03 | **FIXED** | `tests/task-035-runner.test.mjs:52` 对 `.artifacts` 缺失/存在进行状态比较；隔离镜像检查 sentinel 内容和禁止导入的目标。固定 SHA 新 checkout 首次按规定顺序运行 inventory、治理测试 18/18；前后 `.artifacts` 都不存在。                                                                                    |
| R035-04 | **FIXED** | `task-035-receipt.mjs:37/119/373` 校验必需非负整数、合计、success、file/final 模型和 receipt/events 重算。拒绝 missing passed、negative、passed > tests、failed/cancelled + success、final=999、receipt 不一致。完整 12 lane 合成聚合路径对旧恶意案例全部拒绝；正常模型通过。                             |

以上定位均基于实现提交 `116d4c66f`。合成 fixtures 只证明拒绝与计数行为，不充作完整业务基线。

## 工作树与变更范围

先读取 AGENTS.md、Task/审核材料、Phase 2 Task/Result/QA、WBS 和 Issue/PR 回执；核对 origin 为 `https://github.com/kanzakimy0/TravelAssist.git`，安全 fetch 后固定远端身份。保留主工作树的未提交内容，没有 stash/reset/clean。

本任务独占实现工作树 `I:/CodexWorktrees/TravelAssist-TASK035-CoreFix`；原实现分支此前占用的本任务干净工作树转为 detached，忽略文件保留。固定提交的首次验证在另一处新 checkout `I:/CodexWorktrees/TravelAssist-TASK035-CoreFixVerify` 完成。I 盘用于避免 C 盘容量限制。安装前后均未人为创建 `.artifacts`；安装使用原 lockfile，396 packages，依赖版本未变。

实现仅修改：

- `tools/qa/task-035-receipt.mjs`：执行类型与计数不变量、聚合重算、复用集中 npm 版本启动。
- `tools/qa/task-035-process.mjs`：Windows npm CLI 受控解析；逻辑 argv、实际 spawn argv、CLI 哈希记录；失败传播保留。
- `tools/qa/task-035-inventory.mjs`：必要的追加审阅补充及当前清单绑定；选择集合与原 TASK-086 分片不变。
- `tests/task-035-runner.test.mjs`：增加六项治理回归，保留原有断言；原 12 项治理集合扩为 18 项。
- `docs/qa/test-baseline.md`、本次 `core-fix/` 追加清单、QA、Result，以及 WBS 9.1 tracking。

原 Phase 2 policy、inventory 和冻结证据不覆盖。仅以 `core-fix/execution-model.json` 绑定治理测试的新旧哈希和唯一已审阅顶层脚本，以追加 snapshot 作为当前 inventory。仍为 154 direct + 4 indirect 文件；没有增加第二套框架或改变分片。

未修改 package/lockfile、workflow、既有 TASK-086 runner、正式业务测试、业务源码、POI/Transport/Asset 数据、DB migration、认证规则或冻结证据。

## 实际验证

本地 Windows `win32 x64`，Node `v24.18.0`、npm `11.16.0`、Python `3.14.6`。全部固定提交验证绑定 `BRANCH_EXACT_HEAD / 116d4c66f / local / attempt 1`；不是 PR merge-ref 验证。

| 实际命令 / 检查                                                                                                           | 结果                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm run test:baseline:inventory -- --check`                                                                              | PASS，exit 0，选择集合与补充清单一致                                                            |
| `node --import ./tests/register-route-ts.mjs --test tests/task-035-test-baseline.test.mjs tests/task-035-runner.test.mjs` | **PASS 18/18**，首次执行前后 `.artifacts` 不存在                                                |
| 单独真实 `tests/task-086-rights-binding.test.mjs`，真实 reporter + `verifyEvents`                                         | **PASS 1/1**，原脚本 SHA-256 `164e49e38f1fa2a825a6a076b32da3fd95a5854ed9f9b6035ce8a5678f296211` |
| TASK-035 两文件 + `task-086-b-ci-revision.test.mjs` + rights-binding，真实 reporter                                       | **PASS 22/22**，0 failed/skipped/todo/cancelled；nested/suite 组合在治理回归中另验              |
| 空脚本、原脚本副本故障注入                                                                                                | 预期拒绝均满足；分别 exit 0 + validator REJECTED、exit 1 + validator REJECTED                   |
| 真实 Windows npm --version / run ok / run fail                                                                            | 0 / 0 / **7**，cwd/argv/CLI/log hash 均记录；timeout 与 signal/spawn error 回归通过             |
| `npm run deploy:validate:local`                                                                                           | PASS，exit 0                                                                                    |
| `npm run lint`                                                                                                            | PASS，exit 0；0 errors / 69 warnings                                                            |
| `npm run typecheck`                                                                                                       | PASS，exit 0                                                                                    |
| `npm run format:check:deploy`                                                                                             | PASS，exit 0                                                                                    |
| `npm run deploy:build:local`                                                                                              | PASS，exit 0；通过本轮修复的 npm 启动器实际执行                                                 |
| `npm run deploy:verify-artifact`                                                                                          | PASS，exit 0；1908 files，精确实现 SHA                                                          |
| `git diff --check`                                                                                                        | PASS，exit 0                                                                                    |

最后七条由实际 `node tools/qa/task-035-baseline.mjs --job quality` 串行执行，EXPECTED_HEAD 固定；真实 quality receipt PASS，全部子进程 exit 0，无 timeout/signal/spawn error。验证工作树检查后仍 clean。

开发中有一次新增故障夹具的错误类型预期不匹配（17/18）：Node 抛错时未产出文件 summary，校验器按文件集合不完整拒绝。修正新增测试的预期分类后，固定提交在全新 checkout 首次 18/18；没有弱化既有断言。保留失败日志，不抹除开发历史。本次最终要求的验证没有新增未解决失败。

证据：[README](../qa/TASK-035/phase-2/core-fix/README.md)、[validation-summary](../qa/TASK-035/phase-2/core-fix/validation-summary.json)、[focused-results](../qa/TASK-035/phase-2/core-fix/focused-results.json)、[quality receipt](../qa/TASK-035/phase-2/core-fix/quality-receipt.json)、[原始压缩日志哈希](../qa/TASK-035/phase-2/core-fix/evidence-files.json)。gzip 保留 Windows 日志字节；哈希对解压后的原始日志验证。

## R035-05 与未验证范围

**R035-05：BLOCKED / 未处理 / 本轮范围外。** 原 package/workflow 变化造成的 TASK-086 冻结认证输入不匹配没有刷新或绕过。只读重查远端：branch run [37467190704](https://github.com/kanzakimy0/TravelAssist/actions/runs/37467190704) 与 PR run [37467203410](https://github.com/kanzakimy0/TravelAssist/actions/runs/37467203410) 均 attempt 1 / cancelled，regression-1/3 failure，原聚合门 failure。原审核已核实每事件 3895/3898、3 mandatory failures；未完成的图/证明/新聚合不计 PASS。

历史 branch checkout 是 `a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c`，PR 实际 merge checkout 是 `f15d9bfa8062605c6f13829ef70f2981d955da2b`。API PR head 字段不能当作 merge checkout 的替代。本轮 local exact-head 质量链通过不改变这条集成阻塞。

明确未执行：全仓完整回归、完整 graph rebuild/resume/proof 链、DB/Auth runtime、浏览器、真实 Provider、POI 数据生产；未调用 db:reset。Linux/macOS 本轮未实机重测，只验证 direct-spawn 解析回归。没有主动 dispatch/cancel CI。推送可能自然触发托管事件，其结果须独立检查，不预记 PASS。

## 交付与停止点

实现和验证证据分为实现提交与后续文档提交；上列固定实现 SHA 的结果不冒充文档提交或 PR merge-ref 的完整验证。正常推送原实现分支，并在原 #265/#272 发出含固定提交和报告链接的说明性回执。

PR #272 保持 **Open / Draft**，Issue #265 保持 **Open**；未合入 develop，未 merge、auto-merge、APPROVE 或关闭 Issue。WBS 9.1 仅补充“R035-01～04 已修复待复核”，总状态保留 R035-05 阻塞。交付后停止，等待人工复核，不启动其他任务。
