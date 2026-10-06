# WBS 9.1 Phase 2 — findings（2026-10-07 JST）

受审提交：`a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c`；Canonical Owner A，B 审核。以下 4 项 CORE_IMPLEMENTATION 缺陷均有本轮复现，另有 1 项已重新核验的 SHARED_CI_INTEGRATION 阻塞。未修改任何正式实现、测试、预期值或认证证据。

核心结论 **REQUEST_CHANGES**；集成门 **BLOCKED**；合并建议 **DO_NOT_MERGE**。技术结论不是 GitHub 正式 review 事件。

## R035-01 — P1 / CORE_IMPLEMENTATION / 已证实

**新事件校验拒绝既有成功的顶层断言测试，统一入口仍无法通过。**

- 定位：[task-035-receipt.mjs:37](https://github.com/kanzakimy0/TravelAssist/blob/a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c/tools/qa/task-035-receipt.mjs#L37)；被误判的原文件 `tests/task-086-rights-binding.test.mjs:6`（只导入 `after`，断言位于顶层）。
- 触发与影响：该原必跑文件在 regression-1 和 ordinary 集合中，使用真实顶层 `assert`，没有 `test()` 注册。Node 成功执行后，文件 summary 为 `tests=0`，最终 summary 将该脚本计为 `tests=1, passed=1`；当前代码对每个文件要求 `tests>0`，必定抛 `ZERO_TESTS`。即使先解决认证绑定失败，这个独立阻断仍存在。不能移除或跳过该文件来过门。
- 本轮复现命令：在报告 worktree 执行 `node docs/qa/TASK-035/review-phase2/assertion-file-probe.mjs I:/CodexWorktrees/TravelAssist-TASK035-ReviewCode docs/qa/TASK-035/review-phase2`。脚本记录完整实际 argv：只执行未修改的这个测试，使用相同 loader/reporter，然后调用实际 `verifyEvents()`。已先读源码：network 为 mock，queue 为独立临时镜像，正式数据仅只读。
- 预期：保留该脚本所有原断言和失败传播；正确识别此已审阅执行类型，并保持对真正空集/空测试的拒绝。
- 实际：子进程 exit 0、最终 1/1 PASS；校验 `accepted=false / ZERO_TESTS`。最终两个远端 run 中也保留该文件的零文件计数事件；远端 lane 当时先因认证非零退出失败，未执行到本项校验，不能声称远端已出现第四项业务失败。
- 证据：[本轮结果](assertion-file-result.json)、[真实事件](assertion-file-events.jsonl)、[日志](assertion-file.log)；[远端核验](remote-verification.json) 的 regression-1 `assertionOnlyFiles`。日志/事件哈希均已记录。
- 最小修复建议：在薄适配层/执行策略中显式区分已审阅的顶层断言脚本与注册式 Node 测试，保存文件执行成功事件/退出状态及准确计数；补一个这种实际兼容模式的治理用例。不要全局放行零 summary，也不要为此改动原业务断言或冻结文件。
- 负责范围：A 基线 Owner；TASK-035 implementation/QA 执行人。无需等待 POI 数据任务。

## R035-02 — P2 / CORE_IMPLEMENTATION / 已证实

**Windows 的 quality 入口直接启动 npm，无法解析 npm.cmd。**

- 定位：[task-035-baseline.mjs:63](https://github.com/kanzakimy0/TravelAssist/blob/a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c/tools/qa/task-035-baseline.mjs#L63) 与 [task-035-process.mjs:19](https://github.com/kanzakimy0/TravelAssist/blob/a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c/tools/qa/task-035-process.mjs#L19)。`versions()` 中的 Windows 适配没有用于执行实际 npm scripts。
- 触发与影响：Windows 标准 Node/npm 安装、`--job quality` 生成 `['npm','run',script]`，实际 helper 使用无 shell 的 `spawn(command,args)`。quality 在首个 npm 步骤即启动失败；Linux hosted quality 通过不能证明这个 Windows 路径可用。普通 `npm test` 的内部 Node 进程不受此 npm 子命令缺陷直接影响。
- 复现命令：`node docs/qa/TASK-035/review-phase2/probes.mjs I:/CodexWorktrees/TravelAssist-TASK035-ReviewCode docs/qa/TASK-035/review-phase2`，检查 `windows-npm`。仅执行 `npm --version`，不运行 build/部署。
- 预期：与可用 npm 一致成功启动，并保持 argv/cwd/日志及失败传播。
- 实际：Windows Node v24.18.0、npm 11.16.0，含空格 cwd；实际 `execute('npm',['--version'])` 返回 `exitCode=-4058,error=ENOENT`。同 env/cwd 下 `cmd.exe /d /s /c "npm --version"` exit 0、输出 11.16.0。绝对 Node 路径含空格、参数含空格与 `&` 的对照原样通过。
- 证据：[probes-results.json](probes-results.json) 的 `windows-npm`、`node-spaces`；[日志哈希](probe-log-hashes.json)。没有把此失败说成错误 PASS；当前 helper 正确记录了启动失败。
- 最小修复建议：集中处理 Windows npm 执行，优先使用已解析 npm CLI 的 Node 调用，或严格处理 cmd 的固定命令和参数转义；同步回执命令语义，补 Windows 含空格 cwd/参数回归。避免对任意外部字符串启用通用 shell。
- 负责范围：TASK-035 runner/QA，Canonical Owner A。

## R035-03 — P2 / CORE_IMPLEMENTATION / 已证实

**文档中的聚焦治理命令隐含依赖预先存在的 `.artifacts`。**

- 定位：[tests/task-035-runner.test.mjs:44](https://github.com/kanzakimy0/TravelAssist/blob/a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c/tests/task-035-runner.test.mjs#L44)（54 行重复读取）。
- 触发与影响：新的完整 detached checkout，安装锁定依赖后直接执行 Task 建议的聚焦命令。清单本身正确，但治理测试在验证 import 无副作用前就因缺少目录退出，无法按 README 直接复跑。CI 的 ci-revision 和完整 runner 会先创建目录，所以本发现不等于 hosted 同步失败。
- 复现命令：在新建、未运行其他入口的受审 checkout 上，`npm ci --ignore-scripts --no-audit --no-fund` 后执行 `node --import ./tests/register-route-ts.mjs --test tests/task-035-test-baseline.test.mjs tests/task-035-runner.test.mjs`；必须先确认 `.artifacts` 不存在，不删除其他工作树的目录来模拟。
- 预期：无论初始目录是否存在，都能验证只读选择器及导入没有副作用。
- 实际：首轮 12 项中 11 PASS / 1 FAIL，exit 1，`ENOENT ... scandir .../.artifacts`。后续因本次审核产物已创建目录，同一命令 12/12；这是诊断对照，不覆盖首轮失败，也不修改正式测试。
- 证据：[首轮日志](focused-clean.log)、[有目录对照](focused-with-artifacts-diagnostic.log)、[review-evidence.json](review-evidence.json)。依赖安装禁用 lifecycle，足以供这些 Node/js-yaml 聚焦检查；没有把它当全量 npm ci/build 验证。
- 最小修复建议：测试把“不存在”作为合法的初始状态，比较 import 前后存在性/目录内容；或在自己拥有的隔离夹具中验证。不要为消除本问题要求用户先运行全仓测试。
- 负责范围：TASK-035 治理测试/说明，Canonical Owner A。

## R035-04 — P2 / CORE_IMPLEMENTATION / 已证实

**计数校验不验证字段结构和事件间一致性，异常计数可进入 PASS 聚合。**

- 定位：[task-035-receipt.mjs:35](https://github.com/kanzakimy0/TravelAssist/blob/a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c/tools/qa/task-035-receipt.mjs#L35) 至返回 final counts（45 行）；聚合重新调用同一验证器。
- 触发与影响：记录的文件集合、状态、哈希和 SHA/run/attempt 一致，但 summary 的计数自身不成立。当前只要求 tests>0、success=true，并把缺少的 failed/skip 等字段默认为 0；未要求 passed 有效，也没有按照已知事件语义核对文件与最终计数。哈希只能证明字节一致，不能证明这些数值正确。
- 复现命令：同 `probes.mjs`，查看 `inconsistent-final-count`、`missing-pass-count`、`negative-pass-count`、`synthetic-aggregate-inconsistent-count`。
- 预期：拒绝两个已注册测试各 1 项而最终 999 项的输入；拒绝缺少 passed 或 passed=-7；完整聚合不得将这些不一致计数写为 PASS。
- 实际：上述三个输入均 accepted；构造完整所需 12 lanes、有效自身哈希/当前 SHA 的**审核专用合成**记录后，真实 `aggregateDirectory()` 返回 PASS，各 Node lane 最终数 999。此合成样本不是实际业务测试执行证据，也不代表 GitHub 已有制品被篡改。真实远端最终 counts 本轮另行核对，未发现这种损坏。
- 证据：[probes-results.json](probes-results.json) 与可复跑的 [probes.mjs](probes.mjs)。更改 runAttempt、checkoutSha 或 logSha256 的对照均被真实聚合器拒绝。
- 最小修复建议：验证必需计数字段为非负整数、合计关系和 success 含义；按注册测试/顶层断言脚本的明确模型核对文件级与最终计数。不能直接机械求和忽略 R035-01 中 Node 对脚本额外计 1 的语义；保留 nested TAP 不重复计数的设计。
- 负责范围：TASK-035 receipt/QA，Canonical Owner A。

## R035-05 — P1 / SHARED_CI_INTEGRATION / 已确认既有交付阻塞

**本次 package/workflow 改动使 TASK-086 冻结认证输入绑定失效，两个最终事件均有三项强制失败。**

- 定位：[tools/transport/task-086-final-closeout.mjs:79](https://github.com/kanzakimy0/TravelAssist/blob/a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c/tools/transport/task-086-final-closeout.mjs#L79) 将 workflow/package 字节绑定；失败点 `tests/task-086-certification-engine-repair.test.mjs:369`、`:409`，`tests/task-086-readmittable-closeout.test.mjs:185`。这里是关联位置，不是要求修改这些原测试。
- 触发与影响：候选改动受绑定的两个文件；冻结认证仍引用 `f656c16e...78305`，当前为 `2a36319c...73e82`。强制认证、closeout 门失败，当前 PR 不具备合并条件。不是数据损坏判断，也不是可忽略的旧失败。
- 只读复核命令：下载 run 37467190704、37467203410 的 `task035-*` artifacts，以及 37422119153 的 `task086-final-exact-head-*`、`task086-proof-*`、`task086-regression-*`；执行 `node docs/qa/TASK-035/review-phase2/verify-remote.mjs I:/CodexWorktrees/TravelAssist-TASK035-ReviewCode docs/qa/TASK-035/review-phase2`。脚本需要同目录的对应 jobs JSON；完整获取位置见 review-evidence。
- 预期：同一实际 checkout/run/attempt 的所有原强制链成功，冻结证明与真实输入一致。
- 实际：最终 branch checkout `a77ec0ae2` / run37467190704 attempt1；PR merge checkout `f15d9bfa8` / run37467203410 attempt1；每次 153 直接文件、3,898 Node final-summary tests，3,895 PASS / 3 FAIL。五分片以外的 rebuild、ordinary、完整 graph/resume/proof/aggregate 未完成；总 run cancelled，旧聚合 fail-closed 步骤为 failure，新聚合步骤 skipped。不能把“未运行新聚合”误写成“新聚合已失败或通过”。
- 证据：[remote-verification.json](remote-verification.json) 含原始失败日志节选、日志/事件/receipt 哈希、运行身份与 jobs；[branch run](https://github.com/kanzakimy0/TravelAssist/actions/runs/37467190704)、[PR run](https://github.com/kanzakimy0/TravelAssist/actions/runs/37467203410)。只在内存换入 develop 的这两项文件哈希，即重建冻结 input SHA；未替换文件/预期值或执行变换后的测试。`staleManifestBindings=[]`。
- 最小修复建议：由 A 与 TASK-086 认证证据 Owner 在单独明确授权的范围内处理绑定/证据协调，保持原失败门；完成后连同 R035-01 等 runner 修复，在新的准确 head 取得 branch 与 PR merge-ref 完整证据。当前审核不修改冻结证明，也不启动新的数据任务。
- 负责范围：A / 共享 CI 与认证证据 Owner；B 本次只审核。

## 非缺陷结论与未验证项

- **没有证实“聚合 job 缺 npm ci 导致依赖导入失败”**：实际静态导入闭包仅 Node built-ins 与 inventory/regression/ci-revision；在未安装 node_modules 时导入成功，后续真实 aggregateDirectory 的隔离合成布局也运行到 PASS/预期拒绝。完整生产制品链在该 head 未到达，仍不能称全 CI 可用。
- 子进程非零/spawn error、超时父子进程树清理、64 MiB 日志上限、缺失/重复 lane、错 SHA/attempt/日志哈希、空集/skip/缺 summary 均有聚焦证据。模拟 parent `process.emit('SIGTERM')` 的清理通过；**真实 Windows 控制台取消、Linux 实际信号进程树与 GitHub 硬取消后的完整回执均未验证**。
- 失败回执不是全信息成功回执：两个失败 regression receipts 保留 FAIL、exit 1、NONZERO_EXIT、counts=null/countStatus=UNVERIFIED 和原 events/log；可以独立解析失败数。被取消 graph 只保留部分 execution.log，没有完成 receipt。此处如实限定，不把“未误报 PASS”写成“所有取消路径回执完整”。
- ordinary runner 30 分钟上限、verify/rehearsal 35 分钟与已知串行重建耗时存在预算风险；proof job 的重复完整 Node 集合在 25 分钟内能否完成也缺该 head 的成功证据。本次不重跑昂贵链，不把时长推断升级成新已复现缺陷。
- 正式构建/lint/types/format 仅核验既有最终 quality job、argv、exit、日志哈希；本轮未重跑。DB/Auth、浏览器/真机、bundle/replay、生产 Provider、云部署、db:reset 均未执行。
