# REVIEW-TASK-035-B — WBS 9.1 第二阶段代码与验收审核

## 1. 任务身份与目标

- 父任务：TASK-035-A；WBS 9.1「测试框架与全局基线」。
- 沿用 Issue #265、实现 PR #272，不新建替代实现。
- Canonical Owner：A / Shared Infrastructure / QA；本次审核执行支持：B。
- 类型：独立代码审核与必要的聚焦验证；不是修复、合并或新一轮全仓盘点。
- 发布日期：2026-10-07（Asia/Tokyo）；发布状态：READY FOR REVIEW，尚未执行审核。
- 审核文档分支：`docs/b-wbs-9-1-review-task-20261007`。
- 原实现分支：`codex/a-test-baseline-freeze`，本次只读，不推送修改。

目标是直接回答三个问题：**9.1 自身实现是否合格？当前 PR 是否满足合并条件？实际上是否已经合入 develop？** 三个答案必须分别给出，不能用“代码已提交”“审核结束”或 mergeable=true 代替完成验收或已合并。

本任务只授权读取代码和远端记录、必要的隔离聚焦测试、提交审核文档及说明性评论。不继承 Phase 2 的实现修改权限，不自动修复、不 APPROVE、不合并。

## 2. 发布时核实的快照

| 对象 | 快照 |
| --- | --- |
| develop | `4888b4d507ee75d4f6b9914eb1a8d5661813f64b` |
| PR #272 head | `a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c` |
| PR 状态 | Open / Draft / merged=false |
| 实现报告 | `docs/tasks/RESULT-TASK-035-b-wbs-9-1-phase2-baseline-integration.md` |
| 实现报告状态 | 阻塞，未完成验收 |
| 相关验证记录 | develop 基线 run 37422119153；最终 branch run 37467190704；PR run 37467203410 |

执行时安全 fetch 并重新读取 PR、Issue、最新 WBS、Phase 2 Task/Result/QA 和外部交付评论，固定 `reviewedHeadSha`、`reviewedDevelopSha`、merge-base、实际集成 checkout SHA。上述 run ID 仅为查阅入口，不直接当作本次实测。

若 head 已前进，审核真实最新 head 并记录与本快照的差分，不强行退回旧版本。审核结束时再次检查远端；若又前进，说明结论只覆盖已审核 SHA，列出待增量复核范围，不把旧结论移给新 head。

## 3. 工作树与安全边界

1. 核对 origin 为 `kanzakimy0/TravelAssist`，读取根及相关目录 AGENTS.md，检查 git status 与 worktree。
2. 不改动其他工作树的未提交或未跟踪文件；不得自动 stash、reset、clean 或提交不明文件。可另建干净 worktree，不强制占用原实现分支。
3. 将“被测 checkout”和“审核报告工作树”分开：测试在固定 reviewedHeadSha 的独立 detached worktree 中进行；审核报告写入本任务文档分支。
4. 不把任务发布提交或报告提交当成原 PR 的 tested head，不为审核向原实现分支 merge/rebase/cherry-pick。
5. 审核前后核对被测源码及受保护数据没有变化。临时脚本、日志只放专用临时目录或 `.artifacts/review-task035/`，不放入默认 tests 发现目录。
6. 不提交凭据、完整环境变量、生产配置或未脱敏日志；清理仅限本任务自己创建且确认归属的临时产物。

## 4. 审核范围：只针对 9.1

不等待 POI 补齐，不启动其他业务任务，不扩充交通节点或景点，不重新调查来源，不刷新冻结认证证据，也不要求第一阶段全部外围 unknown 清零。

已有共享 CI 的失败仍须核查并记录为集成状态，不能因“不属于 9.1 的业务前置”就忽略失败、降低强制门或宣布合并安全。对相关模块只读到足以确认调用契约、输入绑定和失败原因的范围，不开展模块重做或新的认证架构设计。

重点审阅：

```text
package.json（scripts 差分）
.github/workflows/quality-gate.yml
.github/workflows/release-rehearsal.yml
tools/qa/task-035-baseline.mjs
tools/qa/task-035-inventory.mjs
tools/qa/task-035-process.mjs
tools/qa/task-035-receipt.mjs
tools/qa/task-035-reporter.mjs
tools/qa/ci-revision.mjs（本 PR 差分）
tools/qa/task-086-regression-lanes.mjs（本 PR 适配差分）
tests/task-035-test-baseline.test.mjs
tests/task-035-runner.test.mjs
tests/pr-governance.test.mjs（本 PR 差分）
docs/qa/TASK-035/phase-2/
docs/qa/test-baseline.md
```

列出 PR 完整改动路径后分类；第一阶段大清单只验证来源与保留状态，不重新盘点全仓。原历史 Task/Result/browser smoke 区分原样保留和本次新增，不把历史缺口自动算成本次引入。

## 5. 必须完成的审核检查

| 检查面 | 必须回答的问题 |
| --- | --- |
| 统一入口与选择 | npm test 是否调用真实执行器；动态发现、policy、inventory 和实际分片集合是否一致；新增、重复、遗漏、空集如何处理；间接测试是否重复计数；只读检查是否真的不执行目标。 |
| 子进程与跨平台 | 非零退出、spawn error、超时、取消、日志过量和子进程树如何处理；正常结果能否写完整回执；npm 在 Windows 的启动、含空格路径和参数是否经过实际验证。 |
| 回执与聚合 | 不仅检验 PASS 字段：核对真实执行事件、文件集合、计数、日志/输入哈希、SHA、run/attempt、命令与必需 lane；缺失、重复、伪造、异常 skip 或残留回执是否会误放行。 |
| CI 接线 | 普通 PR、目标分支 push、develop push、手动执行和演练各自运行什么；expectedHead 是否真正检查；失败时上传什么；聚合是否可达且能在干净 job 中运行；超时预算、重复执行和制品覆盖是否合理。 |
| 证据与文档 | 代码、policy、命令说明及实际证据是否一致；历史与当前、PR merge-ref 与 branch head、文件数与 cases、未执行与失败是否分开；原强制义务有无被静默削弱。 |

额外重点，但不得预设缺陷成立：

- 先前提到的 Windows npm 启动只是待核风险：检查实际 spawn 路径，并在可用 Windows 环境进行最小复现；无该环境则标 NOT_VERIFIED，不能拿 Linux 通过当 Windows 通过。
- 检查治理测试是否隐含依赖预先存在的 `.artifacts` 等目录。记录真正的干净 checkout 行为与文档前置，不先修饰环境再宣称没有问题。
- 检查失败或提前取消后是否仍保留可解释的结果、counts 状态和错误信息；不要把“不误判 PASS”误写成“失败回执已完整验证”。
- 检查最终聚合器的传递导入、依赖安装、下载目录布局及制品内容是否在独立干净 job 中满足；不能仅凭几个纯函数测试认定完整流水线可运行。

发现可疑问题应给出代码位置和复现，不把上一轮助手的判断直接复制成已证实缺陷；没有新缺陷也必须如实说明。

## 6. 验证方法与执行上限

先审查命令及测试源码，再运行明确属于本任务的聚焦检查。依赖缺失时，可在隔离被测 worktree 按仓库锁定版本运行 npm ci；先检查生命周期脚本的副作用。不升级版本、不改 lockfile，不继承无关生产凭据。

建议入口，以执行时源码和实际前置核验为准：

```text
npm run test:baseline:inventory -- --check
node --import ./tests/register-route-ts.mjs --test tests/task-035-test-baseline.test.mjs tests/task-035-runner.test.mjs
```

允许增加审核专用的临时 synthetic case，对实际导出的 runner/receipt/process 函数做最小复现。不得改正式 tests、预期哈希或生产输入来制造或消除失败。每次记录实际 SHA、命令、OS/版本、前置、退出码、结果和日志哈希。

这次不要求重新运行完整 npm test、大型重建或数据认证来“完成审核”，也不主动触发、重跑或取消 GitHub 工作流。优先读取既有准确 SHA 的 runs/jobs/日志/制品，检验当前证据覆盖范围；获取不到、过期或绑定不符的证据标 NOT_VERIFIED。

对 lint/typecheck/format/build，可核验现有准确 SHA 的远端证据；必要的局部检查可现场运行。不要求为审核重复大型构建，不把未重跑伪装成现场通过。

不运行 DB/Auth、浏览器真机、Provider、云部署或 db:reset；不要求无限重试、清零全部外围待核候选或重做已完成的第一阶段。

本节是审核工作的执行范围，不是对原实现验收门的豁免。未通过或未验证的必需集成门仍阻止给出可合并结论。

## 7. Findings 必须可执行

每个问题给出：ID、P0/P1/P2、分类、`path:line`、影响、触发条件、复现命令、预期/实际、证据位置、最小修复建议、负责范围。

分类至少区分 `CORE_IMPLEMENTATION`、`SHARED_CI_INTEGRATION`、`ENVIRONMENT_LIMITATION`、`DOCUMENTATION`。把已证实缺陷、静态风险、环境缺失分开。已知的三项绑定失败归入实际证据支持的分类，不自动称为数据损坏或“可以无视的旧失败”。

有范围外阻塞时记录影响和建议处理点，不因此停止审核其余 9.1 代码。只输出最小问题清单，不自动修复，也不另开数据任务。

## 8. 审核结论与验收标准

报告开头必须分别给出：

```text
审核覆盖提交：<reviewedHeadSha>
审核工作：COMPLETE / PARTIAL
9.1 核心代码审核：PASS / REQUEST_CHANGES / INSUFFICIENT_EVIDENCE
当前集成质量门：PASS / BLOCKED / NOT_VERIFIED
当前 PR 合并建议：READY_FOR_HUMAN_DECISION / DO_NOT_MERGE / NOT_VERIFIED
是否实际合入 develop：YES / NO / UNKNOWN，附远端依据
必须修复的问题：<逐项列出；没有则明确无>
未验证的范围：<明确列出>
```

“核心代码审核 PASS”只表示已说明范围内的审核通过，不自动等于 WBS 已完成。核心与集成两类结果允许不同；不得为了符合用户期望预填任何 PASS。

只在所有适用验收条件有证据、没有阻断缺陷、强制集成检查通过且当前 head 未变化时，才建议 READY_FOR_HUMAN_DECISION。发现明确缺陷或必需门失败则 DO_NOT_MERGE；关键证据缺失则 NOT_VERIFIED 或明确阻塞。任何建议都不是自动合并授权。

实际合并状态读取 PR merged/merged_at，并以 develop 的提交包含关系辅助核实。把 develop 合入实现分支不等于成果已合入 develop；mergeable=true 也不等于已合并。

本审核任务交付条件：重点源码已审阅、聚焦验证已执行或明确记录限制、每个结论有证据、缺陷可定位和复现、合并状态已核实。即使最终 DO_NOT_MERGE，也可以完成本次审核交付，不能因此无限循环。

## 9. 输出、WBS 与发布

只提交以下审核材料到文档分支：

```text
docs/tasks/REVIEW-TASK-035-b-wbs-9-1-phase2-acceptance.md
docs/tasks/RESULT-REVIEW-TASK-035-b-wbs-9-1-phase2-acceptance.md
docs/qa/TASK-035/review-phase2/findings.md
docs/qa/TASK-035/review-phase2/review-evidence.json
docs/qa/TASK-035/review-phase2/（必要的小型复现脚本及去敏证据）
docs/project/WBS-TravelAssist.md（仅 9.1 的本次审核追踪）
```

在文档分支的 WBS 9.1 追踪段补审核状态、结论与链接，保留 Owner A、B 支持、#265/#272 和历史记录。不得仅因审核结束把父 WBS 改为“已完成”，不得以局部通过改写原必需门阻塞，不修改其他 WBS。

代码、CI、package/lock、已有 tests/runner、数据、冻结证据以及 Phase 1/2 历史 Result 均只读。本任务无实现修复权限；最终范围 diff 必须验证这一点。

正常 commit/push 审核文档分支，在 #265/#272 添加说明性审核回执及固定提交链接。不给 APPROVE/REQUEST_CHANGES 正式审查事件，不改变 Draft，不新建 PR/Issue、不 merge、不 auto-merge、不关闭 Issue、不改分支保护。报告里的 REQUEST_CHANGES 只是技术结论。

返回审核报告、关键缺陷、上述三个核心答案以及提交链接，然后停止。不要把已知集成阻塞写成“等 POI 补齐才能审核”，也不要为写入报告自身的最终 SHA 反复提交；最终发布 SHA 写在外部回执。

## 10. 固定来源

- [PR #272](https://github.com/kanzakimy0/TravelAssist/pull/272) / [Issue #265](https://github.com/kanzakimy0/TravelAssist/issues/265)
- [受审 Phase 2 Result](https://github.com/kanzakimy0/TravelAssist/blob/a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c/docs/tasks/RESULT-TASK-035-b-wbs-9-1-phase2-baseline-integration.md)
- [原 Phase 2 Task](https://github.com/kanzakimy0/TravelAssist/blob/a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c/docs/tasks/AMENDMENT-TASK-035-b-wbs-9-1-phase2-baseline-integration.md)
- [受审 WBS](https://github.com/kanzakimy0/TravelAssist/blob/a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c/docs/project/WBS-TravelAssist.md)

本文件只发布审核任务，不是审核结论、缺陷已证实声明或合并授权。
