# TASK-035-A 补充任务 — B 执行 WBS 9.1 第二阶段：统一测试入口、受控 CI 接线与实际验证

## 1. 身份、授权与停止点

| 字段 | 约定 |
| --- | --- |
| Parent Task / WBS | TASK-035-A / WBS 9.1 测试框架与全局基线 |
| Canonical Owner | A / Shared Infrastructure / QA，不更改 Owner |
| 本次执行支持 | B；人工、Codex 或其他开发工具均可 |
| 唯一 Issue / 实现 PR | #265 / #272；沿用，不另建替代实现 |
| 唯一实现分支 | `codex/a-test-baseline-freeze` |
| 本 Task 发布分支 | `docs/b-wbs-9-1-phase2-task-20261006`；仅发布说明，不在这里开发实现 |
| 发布起点 | 第一阶段交付 `dbf8875250bb22ec8f9d647c84bf7e438aee12d7` |
| 发布日期 / 状态 | 2026-10-06（Asia/Tokyo）/ READY FOR PHASE 2 |
| 完成目标 | 提交代码和实际验证证据，PR #272 保持 Draft / 待人工审查 |

用户在第一阶段审查后要求本 Task。本阶段授权 B 刷新原实现分支、执行下文限定的测试基础设施改动、必要的本地/托管验证、普通 commit/push，以及更新原 Issue/PR 的说明。**不是合并 PR、关闭 Issue、部署生产、修改 WBS Owner 或接手 POI 数据生产的授权。**

第一阶段审计作为输入，不整体返工。487 个待核候选不是本阶段必须全部清零的指标。第二阶段不再停在纯建议清单：应完成最小实现及实际验证；发生真实阻塞则交付已完成部分和具体证据，不以另写一轮计划代替实现。

本补充 Task 是第二阶段范围的执行依据；第一阶段“不改 runner/CI”的限制只适用于已经结束的审计阶段。其他不越界、不伪造证据、不自动合并规则继续有效。历史 Task/Result/审计快照不得重写成当前成功记录。

## 2. 已核实快照与执行时复核

| 对象 | 发布时快照 |
| --- | --- |
| develop | `4888b4d507ee75d4f6b9914eb1a8d5661813f64b` |
| 原 PR #272 head | `f157f23ba1b93def006c2703ea8f42dcd9266c01`；Open / Draft / 未合并 |
| 第一阶段审计提交 | `dbf8875250bb22ec8f9d647c84bf7e438aee12d7` |
| 第一阶段统计 | 586 候选；183 测试文件；152 直接 + 4 间接静态选择；27 未证明 CI 选择 |
| 其他审计项 | 487 候选有待核维度、200 个非唯一 Owner、15 个文本引用待复核 |
| 验证语义 | 第一阶段 auditValidation PASS；业务测试和构建 NOT_EXECUTED，不是当前全绿证据 |
| WBS 状态差异 | develop 主表仍写未开始；审计分支已记录进行中。以事实补追踪，不忽略旧 #272 |

上述数量只描述受审 SHA，不是永久验收阈值。整合原 PR、增加治理测试及同步 develop 后，文件数量应动态变化。

执行前必须读取：根及相关目录 `AGENTS.md`、最新 WBS、原 Task/Command/Result、#265 与 #272 的完整相关讨论、第一阶段 README/清单/复用分析、现有 package/workflows、两份 TS loader、TASK-055/059 入口、TASK-086 regression/validation/revision 及保护测试。凡触及 Next.js 相关代码，按仓库 AGENTS 阅读安装版本的指南。

安全 fetch 后重新记录 develop、原实现分支、PR head、发布分支 SHA。发现引用前进时做差分审查；不能把发布快照当执行时最新值。若出现 A 正在修改同一实现分支、已有替代 Task 或 PR 已合并等冲突，停止受影响写入并报告，不擅自建立第二套实现。

## 3. 工作树与整合方式

1. 核对 origin 为 `kanzakimy0/TravelAssist`；检查 `git status --porcelain=v1`、worktree 列表和远端状态。
2. 只在独立、干净且由本任务占用的 worktree 工作。其他主工作树有修改时保持原样，可以另建干净 worktree；不得自动 stash、reset、clean、提交不明文件，或强制占用另一会话正在使用的分支。
3. 保留 PR #272 的既有提交；在原 `codex/a-test-baseline-freeze` 上正常 merge 执行时最新 develop，再正常整合本 Task 发布分支（其中包含第一阶段交付）。解决冲突须逐文件依据复用审计，不整文件取旧版覆盖最新 WBS/package/workflow。
4. 保留当前 develop 的 TASK-086 全部验证链、当前 route loader 语义、既有 npm scripts、已完成 WBS；旧 typecheck 增量已被当前实现覆盖，不重复改版本。
5. 禁止 rebase/force push、直接向 develop/main 写入、合并 #231/#245 等其他实现、修改原分支历史或新建替代实现 PR。
6. 审计快照和原历史 Result 原样保留。新增阶段材料放 phase-2，不重新生成 phase-1 来掩盖数据已变化。

## 4. 第一项交付：把实际执行集合校准清楚

在 `docs/qa/TASK-035/phase-2/` 建立紧凑的规范清单及执行策略。复用第一阶段证据与当前选择器，不把 5 MB 的审计快照直接当可执行配置，也不再复制全部源码文本进新清单。

### 4.1 校准范围

必须逐项确认：当前默认 Node 集合、新增治理测试、已证明的四条间接执行边及其实际执行依赖；同时给 27 个原未证明覆盖的测试、17 个 browser harness、3 个 bundle 检查、replay 及 TASK-055/059 aggregate 明确执行分类。数字变化按当前 SHA 更新。

每个准备自动执行的入口记录：文件/入口 ID、内容哈希、维护责任证据、层级、loader/flags、解释器、工作目录、输入、输出及清理路径、DB/browser/network/secret 前置、资源/超时边界、子进程、适用事件和策略。网络区分无网络、仅 loopback、外部网络；写入区分专用临时产物与受保护数据。只记录环境变量名，不记录凭据值。

执行策略分别使用：

- `REQUIRED`：该事件/配置必须运行并成功；包含当前已有的强制义务，不得降级。
- `OPT_IN`：已有专用入口、明确环境前置，只有显式请求才运行。
- `DEFERRED`：尚缺前置或超出本阶段，记录原因、Owner/待确认责任和后续 WBS。
- `SUPPORT_ONLY` / `OUT_OF_BASELINE_WITH_REASON`：fixture/helper/生产工具等，不计测试用例，不自动运行。

对默认集合中的未知副作用必须追到实际执行路径确认；不能把 unknown 填 false，不能为了放行将原本必跑项改成 optional。外围未被执行的工具允许保留待核，并汇总可追踪原因；不要求所有候选的 Owner 都由猜测补齐。

27 项不是自动增加到普通 PR 的清单。能证明为离线、无危险副作用且输入齐备的 Python 检查，可小范围纳入 REQUIRED；需要 DB/归档的分别建模，不自动联网补源，不把“没跑”叫“通过”。有安全理由不能执行的原强制项，应阻塞其验证而不是静默移除。

### 4.2 选择器约束

用动态文件集合、哈希及并集/互斥校验，不写死 152、156、183 或旧 713 cases。保留 TASK-086 assets、regression-0..3、rebuild 的现有选择语义，新增文件不能丢失。顶层、间接测试、harness、suite、case 分开计数；同一测试由不同 alias 引用不重复计成独立覆盖。

新清单与实际 runner、工作流选择必须可互相校验。只读清单/检查模式不能 import 有副作用的目标；若复用已确认无顶层副作用的现有纯选择器，需有测试证明。

## 5. 第二项交付：最小统一入口与真实回执

优先复用现有 Node test、TS loaders、TASK-055 失败传播经验及 TASK-086 选择器/回执。**不引入第二套测试框架，不要求建设新的通用任务调度平台。**

在保持现有命令兼容的前提下实现以下稳定入口；路径名可按仓库习惯小幅调整，最终文档必须给准确命令：

| 入口 | 本阶段语义 |
| --- | --- |
| `npm test` | 当前普通 Node 回归唯一入口：与现有默认选择集合及断言等价，包含原本的重建测试；不是全环境测试成功的简称 |
| `npm run test:baseline:inventory -- --check` | 只读核对清单、分类、直接/间接选择及重复/漏项；不执行目标测试 |
| `npm run test:baseline:lane -- --lane <lane>` | 小型兼容适配器，调用现有分片入口并补全全局回执；不重写图验证，不弱化任何旧断言 |

当前普通入口使用 route loader；TASK-019 子进程仍按其契约使用 planner loader + react-server。不能机械替换所有 loader。`next typegen && tsc --noEmit` 保留。

不要求新增 quick/full/local 三套命令。特别不能让 quick 子集替换当前默认强制集合。Local/browser/bundle 优先保留已有专用命令并纳入清单，不借本任务重写个人中心或新增浏览器框架。

### 5.1 失败处理与资源安全

- 子进程非零、超时、signal、spawn error、空选择、日志/回执缺失、必需输入缺失、必需测试异常 skip 均不得转成 PASS。
- 不能只读 exit code；结合可验证的测试事件/报告确认真的运行了目标集合。TAP 嵌套或子进程汇总不得重复累计 case。无法解析则状态/计数明确未验证，不猜测。
- 默认不自动重试至绿；诊断性重跑保留首轮失败与原因，flaky 不等于健康基线。没有授权的历史失败豁免不生效。
- 输出使用任务专用 `.artifacts/`/临时目录，隔离 baseline/candidate、lane、run/attempt；不得互相覆盖回执或并发争用 `.next`、共享 DB、跟踪数据输出。
- timeout 保持有界，取消时清理本任务子进程。不能用无限 timeout、continue-on-error、`|| true`、禁用断言或截图覆盖来消除失败。

### 5.2 回执格式

每个实际执行入口生成机器可读回执，至少包含：schemaVersion、mode/event、被测 checkoutSha、PR head/base/event SHA（适用时）、expectedHead、工作树洁净/输入摘要、runner/config/lockfile/inventory 哈希、Node/npm/Python/OS 信息、实际 argv/cwd、选中文件及内容哈希、起止时间、退出码/signal/timeout、case/suite/pass/fail/skip 的明确口径、日志哈希及位置、未执行项目与原因。托管运行另含 runId、runAttempt、job/lane、workflow URL。

聚合必须校验：要求的 job/lane 集合完整，缺失/重复/跨 SHA/跨 run-attempt/哈希不符均失败。外层 job success 不得替代回执检查；不从上一次产物目录读取“成功”。按事件不适用的分支写 NOT_APPLICABLE，不冒充已运行 PASS。

分别报告 `inventoryValidation`、`runnerTests`、`baselineExecution`、`candidateExecution`、`deltaComparison`、`ciStatus`、`optionalEnvironmentTests`。`NEW_FAILURE=0` 不等于 REQUIRED 全部通过。最终发布 SHA 放在外部 Issue/PR 回执，不为写入“自己的最终 SHA”无限追加提交。

## 6. 第三项交付：受控 CI 接线

主要修改 `.github/workflows/quality-gate.yml`，复用当前 jobs，不另建平行质量系统。`release-rehearsal.yml` 只允许等价入口替换/证据补齐，不改变其 trusted develop / 本地演练边界，更不实际部署。

### 6.1 必须解决

1. 普通 verify 使用统一入口；现有 lint/typecheck/format/build/artifact/diff 校验全部保留。
2. 修复 verify 中 final-closeout 上传条件与 job 条件互斥造成的不可达步骤：普通运行无论成败都能保留适用的 revision/测试回执；不存在的图证明不得填充假文件。
3. 非空 expectedHead 在适用执行路径统一校验；格式错误或与实际 checkout 不符应尽早失败。明确 timeout 输入只作用于哪些 jobs，不虚报全局生效。
4. 明确 Node 基线已经间接依赖 Python；按当前脚本和实际验证固定/记录解释器前置，必要时使用官方 setup-python。不顺便升级 Node/Next/依赖锁文件。
5. 增加清单/选择一致性和回执失败传播的治理测试，不能只是比对 YAML 中是否出现某个字符串。

### 6.2 不可减弱的原有义务

TASK-086 的 regression 分片并集、graph first/second、retained extraction、resume checksum-skip、rebuild/proof、published-artifact comparison、corruption invalidation、routing eligibility、certification-engine、quality 和最终 aggregate 全部保留。

保留输入/生成器/产物哈希，checkout/run/attempt 绑定和依赖失败传播；历史 job/制品接口优先兼容。新全局回执另行表达 WBS 9.1，不把 TASK-086 收据中的阶段/WBS 文字当本任务验收结论。

默认不修改既有事件的强制范围。若普通 PR 串行重建确实超出既有资源预算，可复用现有分片/证明编排完成等价运行，并提交事件前后义务对照及实际证据；不允许删除重建、把强制项挪到不必跑的手动任务或仅靠提高 timeout 伪装解决。无法证明等价就报告阻塞。

不把 DB/browser/live Provider 随意加入每次 PR，不新增定时任务，不全局提升权限。禁止用 pull_request_target 执行不可信 PR 代码，禁止修改保护规则、Secrets、默认分支或自动合并设置。

### 6.3 实际 checkout 与最终验证

普通 PR 默认 merge-ref 测试保留其集成验证意义：记录为 `PR_MERGE_RESULT`，不能改称分支 head 实测。最终候选另外取得 `BRANCH_EXACT_HEAD` 证据；优先用现有手动 Quality gate 的 full-lane 模式及 expectedHead，指向最终实现 head。

若现有 workflow_dispatch 受默认分支可用性/权限限制，不为了 dispatch 合并 main/develop；可在同一工作流增加仅本实现分支的受控 push 验证，调用同等完整验证链，精确记录 push SHA。不得扩大为不受控的新事件；无合法可用路径则报告 CI_BLOCKED，不能伪报远端通过。

提交发生任何变化后，旧 head 的执行结果只作历史。最终 PR head、实际 checkout、run/attempt 与回执必须能核对；PR merge-ref 的 base 也需记录，不混用不同修订的日志。

## 7. 第四项交付：实际基线、候选与治理测试

### 7.1 clean-develop 对照

在隔离环境确认执行时最新 develop 的输入与运行前置，形成 BASELINE 证据。当前 develop 没有 npm test 时使用其现有命令/分片，而不是把候选新 runner 偷改到基线上。

允许复用同一精确 SHA 的现有托管完整运行以避免重复昂贵重建，但必须下载并验证实际 checkout、所需日志/清单、完整义务、输入哈希和环境信息；仅看到绿色图标、旧截图或旧 711/713 不合格。证据过期/不完整则实际重跑。首次运行前审查执行路径副作用；不得通过“先跑再看”访问外部服务。

### 7.2 治理测试必须覆盖的行为

使用本任务临时 synthetic fixtures/subprocess 模拟，不修改业务测试制造失败：稳定清单；新增文件被发现；重复/遗漏拒绝；未知 lane/空选择拒绝；非零/timeout/signal/spawn error；零测试与异常 skip；嵌套 TAP/间接选择不重复计数；回执缺失/串 SHA/串 attempt/哈希不符；错误 expectedHead；事件条件和不可达步骤修复；受保护链的选择/失败传播不回退。

清单重复生成验证确定性。无须为了形式要求把昂贵业务全仓重复运行两遍；完整图验证本身仍必须履行 first/second/resume 等原有义务。

### 7.3 候选实测

在最终候选运行统一 Node 入口、治理测试、适用的全部现有强制质量门，并完成一次绑定该候选的完整 TASK-086 托管验证链。需要的离线归档必须沿用已验收输入，校验前后受保护文件/产物哈希；图重建只在隔离产物目录进行，不扩展全国节点、不刷新数据、不调用 Provider。

对新增基础设施代码先跑聚焦治理测试，再跑完整验证。baseline/candidate 尽量同 OS、Node/Python 和输入；无法比较的环境差异写 NOT_COMPARABLE，不据此断言零新增失败。

Local DB、浏览器、真实设备、云环境和 live Provider 不是本阶段默认完成门。未改其实现时，记录既有入口和未执行范围即可，不因无 Docker/Safari/API Key 再卡整个基线任务。若确需修改某个 opt-in 包装器，其行为/前置必须有对应安全验证，不能用未跑实测谎称该环境成功。

本任务不授权 db:reset、共享数据库破坏性操作、生产 DB、OAuth/SMS、真实付费 Provider。npm ci、官方工具依赖下载和 GitHub 的受控读写属于工程操作，与业务 Provider 联网分开；测试阶段不继承不必要的生产凭据，凭据不得打印或提交。

发现现有失败：先用精确 clean-develop 对照判断。基础设施缺陷在本 Task 修复；业务/数据缺陷保持可见，登记证据与责任，不越界改业务。新增失败或 REQUIRED 未通过时保持阻塞/进行中，不以“已有失败”写 PASS。

## 8. 允许改动与禁止扩展

允许：本 Task/新的 Result/命令说明；`docs/qa/TASK-035/phase-2/`；更新 `docs/qa/test-baseline.md`；WBS 9.1 相关段/行；`package.json` 的必要 scripts；上述两份 workflow 的最小接线；TASK-035 的薄 runner/selector/receipt helper 和治理测试；必要时对现有 TASK-086 分片/revision helper 做兼容、无业务语义的接口补齐。

任何现有测试只为基础设施接口适配做最小变更，保留原业务断言；每项说明旧/新等价性。旧 TASK-035 browser smoke 默认不扩展或自动启用。修正旧 Command 为当前阶段或明确历史，防止误执行过期指令。

禁止：修改业务 `src` 语义、DB migrations、依赖/lockfile/Node 版本升级、POI/Transport/Asset 数据与已冻结证据、图生成/认证业务规则、TASK-085/086 等任务的新数据生产、9.2–9.11 的业务覆盖扩张、安全/性能专项重写、全仓格式清理、部署与自动合并。

本任务启动后自己生成的文件按白名单、哈希和用途审查后可提交或清理本任务专用临时产物；它们不同于启动时身份不明的脏文件。不得以“工作树必须永远零变化”为由陷入无法完成提交的循环。

## 9. 最小交付清单

```text
docs/tasks/AMENDMENT-TASK-035-b-wbs-9-1-phase2-baseline-integration.md
docs/tasks/RESULT-TASK-035-b-wbs-9-1-phase2-baseline-integration.md
docs/qa/test-baseline.md
docs/qa/TASK-035/phase-2/README.md
docs/qa/TASK-035/phase-2/execution-policy.json
docs/qa/TASK-035/phase-2/test-inventory.json
docs/qa/TASK-035/phase-2/ci-event-matrix.json
docs/qa/TASK-035/phase-2/legacy-integration-review.md
docs/qa/TASK-035/phase-2/validation-summary.json
docs/qa/TASK-035/phase-2/scope-validation.json
必要的 tools/qa/task-035-*、tests/task-035-*、scripts/workflow 改动
```

可合理合并小 JSON，但上述信息不可缺失。大日志、图重建产物和浏览器证据放受控 artifacts，Git 只提交去敏摘要、必要小回执、哈希及可追溯定位；在失效前保留验收所需关键证据，不新增未经许可的原始数据分发。

Result 必须回答：哪些旧 PR 能力复用/重做/保留历史；实际新增/修改文件；选择总量及口径；原强制义务是否保持；baseline/candidate 的精确 SHA、环境与实际结果；新增失败；哪些可选环境未运行；普通 PR 与 branch-head 分别测了什么；剩余阻塞；WBS 与 PR 状态。

## 10. 验收与 WBS 追踪

- [ ] 沿用 #265/#272/原实现分支，保留历史，无第二套实现；Owner A，B 执行支持。
- [ ] 正常整合 latest develop 与审计/Task 文档，未改其他 WBS/业务/数据。
- [ ] 实际默认执行入口前置已确认，原 27 项及 browser/bundle/replay 有明确分类和理由。
- [ ] 外围未知项不被冒充 false，也不成为全仓无限人工清零门槛。
- [ ] 动态清单与真实选择一致，无漏项/重复/旧数量硬编码；间接测试与 harness 口径正确。
- [ ] 统一 npm test/清单/分片入口可用，loader 语义正确，没有第二测试框架。
- [ ] 治理测试验证失败、超时、异常 skip、空集、假/缺/串回执及 SHA 校验，全部通过。
- [ ] verify 不可达上传条件及 expectedHead 适用面修复，Python 前置明确。
- [ ] 原 TASK-086 完整证明链及失败传播未减弱，有事件前后对照与当前实际证据。
- [ ] clean-develop 与 candidate 均有真实可核验证据；新增失败为 0；REQUIRED 全部通过，而非只报告差分。
- [ ] lint、typecheck、既有强制 format、build/deployment artifact、diff-check 通过。
- [ ] 最终 PR 集成验证与分支 exact-head 验证分开；完整强制托管检查绑定最终 head，日志/回执可核查。
- [ ] 未运行 DB/browser/设备/Provider 项如实记录；无生产凭据/敏感日志泄露。
- [ ] Result/QA/WBS 已提交推送，原 PR 保持 Draft；外部交付回执记录最终 head 与 run URL。
- [ ] 不合并、不启用 auto-merge、不关闭 Issue、不启动下游任务、不标 WBS 已完成。

启动时仅在实现分支写 `进行中（TASK-035-A Phase 2；#265/#272；A Owner，B 执行）`。代码完成且本阶段强制验证均通过后写 `待审查（Phase 2 实现/验证完成，PR #272 未合并）`。必跑门未通过则写进行中或阻塞并指出原因。用户后续明确验收并正常合入 develop 后，另行收尾才能标已完成。

原 PR body 的历史测试摘要保留为标注日期/SHA的历史；添加当前摘要和证据。将自动关闭提示改为 `Refs #265`，不得误关闭；维持 Draft，不提交代替用户的 APPROVE，不自行改审查/合并授权。

先提交全部必要代码、文档和 WBS，再跑最终 head 的托管验证；验证结果在 #265/#272 外部回执引用。若为修复又提交新代码，应重新验证；不要为回填最终 SHA 自引用循环提交。完成或真正阻塞后停在人工审查点。

## 11. 可复制执行说明

```text
仓库：kanzakimy0/TravelAssist。我是 B。
执行 TASK-035-A / WBS 9.1 第二阶段，Canonical Owner 保持 A。

先安全检查工作树、worktree 和 origin，fetch 最新远端；读取发布分支：
docs/b-wbs-9-1-phase2-task-20261006
文件：docs/tasks/AMENDMENT-TASK-035-b-wbs-9-1-phase2-baseline-integration.md

读取 #265、#272、最新 WBS、原 Task/Result、第一阶段 dbf887525 的交付。
沿用 codex/a-test-baseline-freeze 和 Draft PR #272，正常整合 develop 与本发布分支。

按 Task 完成：执行集合校准、最小统一入口/回执、受控 CI 接线、真实基线/候选验证。
不要再整体返工审计，不要求把 487 个外围待核候选全部清零。
保留所有原强制测试和 TASK-086 证明链，区分 PR merge-ref 与 branch exact-head。
不要修改业务、POI/Transport/Asset 数据、数据库迁移或依赖版本。

完成后提交推送实现、Result、QA 与 WBS 9.1，更新原 #265/#272 外部回执。
强制验证通过后仅置待审查；未通过如实报告阻塞，不冒充 PASS。
不合并、不启用 auto-merge、不关闭 Issue、不另建替代实现 PR、不启动下游。
```

## 12. 依据与查阅入口

所有仓库事实均来自下列固定提交/实时 PR 读取；执行时需再次核对，源文档不是本任务实测结果。

- [第一阶段审计报告（固定 dbf887525）](https://github.com/kanzakimy0/TravelAssist/blob/dbf8875250bb22ec8f9d647c84bf7e438aee12d7/docs/qa/TASK-035/phase-1/README.md)
- [旧 PR 逐项复用审查](https://github.com/kanzakimy0/TravelAssist/blob/dbf8875250bb22ec8f9d647c84bf7e438aee12d7/docs/qa/TASK-035/phase-1/legacy-pr-reuse-review.md)
- [第一阶段下一阶段建议](https://github.com/kanzakimy0/TravelAssist/blob/dbf8875250bb22ec8f9d647c84bf7e438aee12d7/docs/qa/TASK-035/phase-1/next-phase-recommendation.md)
- [当前受审 WBS（固定 4888b4d）](https://github.com/kanzakimy0/TravelAssist/blob/4888b4d507ee75d4f6b9914eb1a8d5661813f64b/docs/project/WBS-TravelAssist.md)
- [现有 TASK-086 regression 入口](https://github.com/kanzakimy0/TravelAssist/blob/4888b4d507ee75d4f6b9914eb1a8d5661813f64b/tools/qa/task-086-regression-lanes.mjs)
- [Issue #265](https://github.com/kanzakimy0/TravelAssist/issues/265) / [原 PR #272](https://github.com/kanzakimy0/TravelAssist/pull/272)
- [GitHub 官方事件语义：pull_request 与 workflow_dispatch](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [Node.js 24 官方 Test Runner 文档](https://nodejs.org/docs/latest-v24.x/api/test.html)
