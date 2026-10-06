# Result — WBS 9.1 第二阶段代码与验收审核

审核覆盖提交：`a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c`。

审核工作：**COMPLETE**（完成本审核 Task 的源码、聚焦验证及报告交付；不是实现验收完成）。

9.1 核心代码审核：**REQUEST_CHANGES**。

当前集成质量门：**BLOCKED**。

当前 PR 合并建议：**DO_NOT_MERGE**。

是否实际合入 develop：**NO**。

日期：2026-10-07（Asia/Tokyo）；Canonical Owner **A**；B 本次仅承担审核。沿用 TASK-035-A / [Issue #265](https://github.com/kanzakimy0/TravelAssist/issues/265) / [Draft PR #272](https://github.com/kanzakimy0/TravelAssist/pull/272)。不改变 Draft，不提交正式 APPROVE/REQUEST_CHANGES 事件。

必须修复：R035-01 顶层断言脚本误判为空测试；R035-02 Windows npm 子命令无法启动；R035-03 干净 checkout 治理测试隐含目录前置；R035-04 异常计数可通过回执校验；R035-05 共享 CI 冻结认证输入绑定失效。每项严重级别、文件行号、触发、复现、预期/实际、证据与最小修复建议见 [findings](../qa/TASK-035/review-phase2/findings.md)。未自动修复任何一项。

未验证范围：本次不重跑完整 npm test、图重建/extraction/resume/proof、完整真实 aggregate，也不触发/重跑/取消 CI。未执行真实 Windows 控制台取消、Linux 信号清理实验、完整构建复跑、DB/Auth、浏览器/真机、bundle/replay、生产 Provider、云演练/部署或 db:reset。取消前的部分日志不等于完整回执；缺失证据未记 PASS。

## 固定边界与来源

| 对象                    | 本轮固定值                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| 审核 Task 发布提交      | `0804879aa3c7537c2048d0c309328c815e9a75b5`，仅任务文档，不是受审代码                           |
| 审核文档分支            | `docs/b-wbs-9-1-review-task-20261007`                                                          |
| 受审 PR head / 实现分支 | `a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c` / `codex/a-test-baseline-freeze`（只读）            |
| develop / merge-base    | 均为 `4888b4d507ee75d4f6b9914eb1a8d5661813f64b`                                                |
| 实際 PR 集成 checkout   | `f15d9bfa8062605c6f13829ef70f2981d955da2b`，来自下载的 PR run 回执                             |
| 被测 worktree           | `I:/CodexWorktrees/TravelAssist-TASK035-ReviewCode`，完整 detached checkout                    |
| 报告 worktree           | `I:/CodexWorktrees/TravelAssist-TASK035-ReviewDocs`，独立 docs sparse checkout，不作为测试目标 |

先读取根 AGENTS、origin/status/worktree、审核 Task、原 Task/Result、Phase 2 Task/Result/QA、最新 WBS 与 #265/#272 讨论及外部回执。默认 C 盘的两次 app worktree 创建因容量不足失败并回退；没有删改已有工作树，改在有空间的 I 盘建立专用工作树。被测 checkout 初始无 `.artifacts`、无 node_modules；报告与代码验证分开。

依赖按锁文件 `npm ci --ignore-scripts --no-audit --no-fund` 安装，关闭 lifecycle，未改版本或锁文件。正式 package 无 install 生命周期入口；本次仅需纯 Node/js-yaml 聚焦测试，不需要 native build lifecycle。Node v24.18.0、npm 11.16.0、Windows x64；现场 Python 3.14.6 只记录版本，未运行 Python 业务链。托管运行是 Linux / Node v24.21.0 / npm 11.19.0 / Python 3.12.14，不能宣称相同完整环境。

## 源码与实测结论

统一入口调用真实执行器；清单动态发现 154 个直接 Node 文件及 4 条间接边，分片互斥且并集完整。新增未审阅文件/hash 漂移被拒绝，`--check` 未导入测试目标。原 TASK-086 分片/loader/assertions 及 graph/extraction/resume/published/corruption/routing/engine 义务静态保留，原历史 Task/Result/browser smoke 与 Phase 1 来源未重写。PR 完整改动路径分类和输入哈希见 [机器证据](../qa/TASK-035/review-phase2/review-evidence.json)，没有重新盘点全仓外围候选。

但当前事件模型不能正确接受集合内已有的顶层断言脚本。原 `rights-binding` 文件实际执行成功，退出 0，最终 summary 1/1；`verifyEvents` 因该文件级 summary 为 0 拒绝它。这是 9.1 自身的确定阻断，不能由处理冻结认证失败代替。

| 本轮聚焦检查                                           | 实际结果                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| 只读 inventory（含 npm alias）                         | PASS；154 direct / 4 indirect，cases=null                    |
| Task 推荐命令，真正干净 checkout                       | **11/12，exit 1**；`.artifacts` 不存在引发 ENOENT            |
| 同一命令，有审核产物目录的诊断对照                     | 12/12，exit 0；不覆盖首轮失败                                |
| 实际未改 rights-binding 文件 + 实际 reporter/validator | 文件 exit 0；validator **ZERO_TESTS**                        |
| Windows 实际 npm helper / cmd 对照                     | 直接 npm **ENOENT**；cmd 对照 exit 0                         |
| 非零、timeout、spawn error、零集、skip、nested summary | 原聚焦对应检查通过；不泛化为全 runner 无缺陷                 |
| 超时父/子进程树、模拟 SIGTERM、64 MiB 日志上限         | 清理/失败传播通过；真实系统取消仍未验证                      |
| 错 SHA、错 attempt、日志哈希、缺/重复 lane             | 被拒绝                                                       |
| 不一致/缺少/负数 passed 计数                           | **被接受**；完整合成目录可进入 PASS 聚合                     |
| 聚合器缺 npm ci 风险                                   | 未证实；未安装依赖时实际导入成功，传递导入只有 Node 内建模块 |

仅运行许可的聚焦原测试和审核专用临时复现。顶层断言文件为确认 runner 兼容而单独执行；源码先行审查，全部 network 注入 mock，写入临时 queue，未发生 Provider 调用。脚本输出、命令、时间、版本、退出码和哈希都在 review-phase2 内，正式源码/测试/数据无变化。

## 远端证据与 CI 接线

本轮重新下载并核验准确 SHA 的现有制品，未主动触发或取消任何工作流。

| 既有运行                                                                                             | 实际 checkout / attempt | 核验结果                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| develop 基线 [37422119153](https://github.com/kanzakimy0/TravelAssist/actions/runs/37422119153)      | `4888b4d...` / 1        | 六分片 152 文件、3,887 tests；最终 proof、516 输入绑定、原生证明标记、日志哈希与必需 jobs 成功。大型 graph archive 未重新下载；原 Python 版本未知 |
| 最终 branch [37467190704](https://github.com/kanzakimy0/TravelAssist/actions/runs/37467190704)       | `a77ec0ae2...` / 1      | 五分片 153 文件、3,898 tests：3,895 PASS / 3 FAIL；整体 cancelled                                                                                 |
| 最终 PR merge-ref [37467203410](https://github.com/kanzakimy0/TravelAssist/actions/runs/37467203410) | `f15d9bfa8...` / 1      | 同样 3 项失败；PR head 是 a77ec0ae2，base 是 4888b4d；不是 branch exact-head 实测                                                                 |

最终两次运行的 log/events/receipt 哈希、file 集合及哈希、checkout/run/attempt/inputDigest/inventoryHash 都核验；成功分片的原验证器检查与独立 counts 对照通过。失败分片原 receipt 明确 `counts=null/countStatus=UNVERIFIED`，本轮从保存的真实事件独立提取 counts；没有把失败 receipt 改成 PASS。

三项认证失败重现于两次最终运行。只读内存对照再次证明 package/workflow 两个变化解释 frozen input SHA 差异；未修改认证证据、数据或输入文件来跑测试。完整 graph/resume/rebuild/ordinary/proof 未完成；旧 aggregate job 的依赖 fail-closed 检查失败，新 TASK-035 aggregate 步骤 skipped。部分 graph 有日志而无完成 receipt。

普通 PR/非特殊 dispatch 走 verify（全 Node 集合、后续质量门）；PR272/其 branch push/develop/backbone/full dispatch 走原完整分片证明链，proof 再执行全部 npm test；trusted rehearsal 仍要求当前 develop 精确 SHA。所有相关 jobs 有 expectedHead/revision 校验及 Python3.12 设置。失败上传适用回执的条件可达；本轮失败分片 artifacts 已实际保存。aggregate 保留 needs 失败传播；其新模块无需第三方运行依赖，不能仅因缺 npm ci 判错。实际完整聚合成功、普通入口/演练时长与 proof 25 分钟预算仍无当前 head 的完整运行证据。

最终 quality job 的七条命令（原 lint/types/format/build/artifact/diff 等）argv/exit/log 已验证，未在本轮重复构建。事件/依赖条件静态审阅结合原治理测试，不用 YAML 字符串出现代替完整 CI 成功。

## 文档一致性、合并状态与交付

Phase 2 Result/WBS 的“阻塞”、最终回执区分 branch 与 merge-ref、未完成链不写 PASS，与本轮远端证据一致。旧 12/12 治理通过仅代表已有目录的运行条件，不能覆盖本次 clean-checkout 失败；“已实现”也不能代替本轮发现的兼容/计数缺陷。历史候选 72fe79f29 未挪用为最终 head 通过。当前 develop WBS 尚未接收本实现追踪；审核文档分支保留真实 Phase 2 阻塞与所有历史状态，仅增加本次 9.1 审核追踪。

审核结束前再次读取远端：PR #272 **OPEN / Draft**，`mergedAt=null`、`mergeCommit=null`、`autoMergeRequest=null`；Issue #265 OPEN。远端 develop 仍 `4888b4d...`；`git merge-base --is-ancestor a77ec0ae2 origin/develop` exit **1**，实现 head 不在 develop 中。develop 是实现分支祖先，方向相反，不能称成果已合并。完整值见 [远端快照](../qa/TASK-035/review-phase2/remote-final-snapshot.json)。

报告只覆盖上述 reviewedHeadSha。提交/推送后最终发布 SHA 与同 SHA 结论写在原 Issue/PR 的说明性评论，不为自引用再提交。WBS 9.1 保持 **A Owner / B 支持 / 阻塞**，未置待审查或完成；不合并、不 auto-merge、不关闭 Issue、不启动下游。交付后停止，等待人工审查。
