# FIX-TASK-035-B — WBS 9.1 / R035-05 派生认证报告刷新与最终集成验收

## 1. 身份、目标和完成边界

- 父任务：TASK-035-A；WBS 9.1「测试框架与全局基线」。
- Canonical Owner：A / Shared Infrastructure / QA；本次执行：B。
- 沿用 Issue #265、Draft PR #272、实现分支 `codex/a-test-baseline-freeze`。
- 任务发布分支：`docs/b-wbs-9-1-r03505-evidence-closeout-20261007`。
- 日期：2026-10-07（Asia/Tokyo）；状态：READY FOR EXECUTION，不是验收通过。
- 发布时 PR head：`48bac2f2184c352b3d829165b2597851b4dbf45a`；R035-01～04 实现：`116d4c66f2f0aed61527b89c703d24f93ec4a4b2`。
- 发布时 develop：`4888b4d507ee75d4f6b9914eb1a8d5661813f64b`；PR Open/Draft、未合并，Issue Open。

**目标：保留 R035-01～04 的成果，解决当前配置与已保存派生认证报告不匹配的问题，在真实最终候选上完成全部适用强制验证，将 9.1 交付到“待人工验收”。**

这不是新一轮 POI/交通数据生产，不等待 TASK-085A，不重做全仓 inventory，不新开替代实现 PR。只执行本轮修复、验证、交付；不合并、不部署、不关闭 Issue、不启动下游任务。

## 2. 本次明确授权及与旧 Task 的关系

用户在已解释 R035-05 原因和“按当前输入重新生成派生报告”的方案后，要求可执行的 Codex 收尾指令。本 Task 明确授权 B：

1. 用仓库已有认证/closeout/report 生成程序和已审核的原有输入，重新计算受 R035-05 影响的派生认证报告。
2. 在隔离输出中核对生成差异及业务等价性后，提交必要的派生报告更新。
3. 为此添加最小的隔离生成、差分检查和验证辅助脚本；执行必要本地检查和现有托管 CI，提交原实现分支及交付记录。

**仅对上述派生输出，本 Task 覆盖旧 Phase 2、审核 Task 和 R035-01～04 Fix 中“禁止刷新冻结证据／R035-05 不在范围”的限制。不得再因同一旧限制停止或要求 A 重复批准这一已限定的操作。** Owner 不变，不等于获得其他模块的无限修改权限。

本授权不允许手改输入指纹、伪造历史报告、删除认证绑定、扩大来源使用权限或修改交通业务语义。来源原文/归档、人工裁决、历史基线与“重新计算出的派生报告”必须严格区分。

## 3. 先固定真实代码与工作树

读取根及相关目录 AGENTS.md，核对 origin、git status、git worktree list；安全 fetch 最新 develop、实现分支、任务发布分支、PR #272 和 #265 讨论。

- 在本任务独占的干净 worktree 工作；已有不明未提交内容原样保留，可另建 worktree，不自动 stash/reset/clean。
- 原实现分支被其他工作树占用时，不强制双重 checkout、不替他人切分支；使用独立 detached 工作树准备后，经正常快进更新原分支，或在确认本任务自有且干净的工作树中执行。
- 发布 SHA 只是启动快照；远端已前进时审阅增量并使用真实最新版本，不退回旧 head。
- develop 前进时正常合并最新 develop，保留双方已接受的变更；不 rebase、force push 或直接写 develop/main。
- Task 文件可从发布提交 `git show <TASK_SHA>:docs/tasks/FIX-TASK-035-b-wbs-9-1-r035-05-evidence-refresh-closeout.md` 读取并原样纳入交付；不必合并整个审核文档分支。
- 将生成工作树和固定提交的验证工作树分开。生成期本任务自己产生的白名单文件不是“不明脏文件”；审查后可以正常提交。要求 clean HEAD 的 runner 应在提交后的干净验证工作树运行，不能因此陷入永远无法提交的循环。

必读资料：

- 最新 WBS、原 TASK-035、Phase 2 Task/Result/QA。
- `docs/tasks/RESULT-FIX-TASK-035-b-wbs-9-1-r035-core-fixes.md` 与 `docs/qa/TASK-035/phase-2/core-fix/`。
- 审核来源提交 `13503912bbbc163f6464457cfe820e6d748930d7` 的 `docs/qa/TASK-035/review-phase2/findings.md`；不要求它必须已在实现分支存在。
- `docs/qa/TASK-035/phase-2/binding-blocker.json`。
- `tools/transport/task-086-final-closeout.mjs`、`task-086-routing-eligibility.mjs`、`task-086-recertification-report.mjs` 及相关导入、既有调用方式。
- 两个失败测试文件、当前 TASK-035 runner/receipt/inventory、Quality Gate。

## 4. 只复核当前阻塞，不重做前期审计

优先读取现有准确版本的日志/事件/回执：分支 run `37577152980`、PR run `37577157012`，两者对应交付 head `48bac2f21`，但 PR 实际 checkout 必须从 revision 回执确认。

既有定位：`currentBinding()` 把 package.json 和 quality-gate.yml 的完整字节纳入认证输入。旧报告 input SHA 为 `f656c16e…78305`，既有候选为 `2a36319c…73e82`。这些值只用于历史定位，**禁止用作当前输出的硬编码预期值**。

核对三项失败是否仍为：

1. `loadEligibleGraph()` 读取旧 `routing-eligibility.json` 后报 `Stale eligibility input`。
2. certification-engine-repair 的汇总/索引输入绑定与当前输入不一致。
3. 两次临时 closeout 生成相同，但与已保存 closeout 报告不一致。

最新失败数量、测试总数和失败身份从实际日志读取；不固定为 3 或 3905，不把此前结果当本轮通过。制品过期时用当前代码的聚焦验证补证，不为恢复历史材料无限重跑昂贵流水线。新失败与既有绑定失败分开定位。

输出修复前 input manifest、受保护路径哈希、当前失败清单，以及已接受业务投影快照。固定 Node/Python、换行和输入归档；使用 .nvmrc、现有 lockfile 与工作流 Python 前置，不升级版本。

## 5. 生成与保护范围

### 5.1 必须保持不变的内容

- `data/` 内 POI、Transport、Asset 的原始/正式输入与生产数据；不增删节点、边、模式、指标、来源或准入范围。
- 已有认证算法、`currentBinding()` 规则、来源权利/身份/上下车/换乘裁决，原正式业务测试及断言。
- 人工审核文件，例如 `capability-reviews.json`、`osm-terms-observation.json`、`reviewed-evidence.json`。
- 历史 `previous-*`、原始失败日志、历史 Task/Result、原 Phase 1/2 及 core-fix 的已交付证据。
- `docs/qa/TASK-086/final-blocker-inventory.json` 等被现有生成器当作历史输入读取的资料。不能因为文件名包含 final 就视为可覆盖输出。
- 依赖/lockfile、数据库迁移和所有其他 WBS 状态。

禁止真实 Provider、POI 补齐、来源发现、重新抓取网页、扩大原始资料保存权限、db:reset、部署和分支保护修改。Git/npm 锁定依赖安装及 CI 工程访问不属于业务 Provider 调用。

### 5.2 允许重新生成并更新的派生报告

以实际生成器的写入清单为准，主要为：

- `docs/qa/TASK-086/readmittable-closeout/` 中 generateCloseout 产生的当前派生报告，例如 routing-eligibility、closeout-summary、terminal-entities 索引及其必要关联产物。
- `docs/qa/TASK-086/certification-engine-repair/` 中 generateRepairReport 产生的当前汇总、再认证差分索引/分片、走廊结果和必要关联报告。
- 本轮 `docs/qa/TASK-035/r035-05-closeout/`、新的 Task/Result、WBS 9.1 追踪和必要的基线说明。

**目录许可不是整目录覆盖许可。** 先建立逐路径 manifest：输入/输出角色、生成函数、旧/新哈希、变化原因。仅推广实际重生成且通过差分审核的派生文件；不要求每新增一个已证明的关联派生文件再索取相同授权。

若生成器默认写入正式目录或混写历史输入，先读取源码明确写入集合。可在独立 staging checkout 中让未改动的生成器写它原定的路径，然后只提取获准派生输出；不要凭空传不存在的 `--output` 参数。

默认不改 package/workflow 和已修复 runner。若新候选实测证明存在直接影响本轮完整验证的 TASK-035 回执、制品路径或 CI 接线缺陷，允许有复现证据的最小兼容修复，须补回归并保留原强制义务、权限与失败传播。不得把此条用于删除/跳过检查、升级框架或改变认证业务规则。改到受绑定配置时，必须先定稿，再重新生成报告。

## 6. 真实重新计算与等价性检查

1. 按函数签名和原已审核调用方式，复用 `certify()`、`generateCloseout()`、`generateRepairReport()`，不发明新认证器。
2. 对需要 retained-only/pass-A 与 final 两种输入的报告，分别从本轮已审核原始输入重建其对应认证结果；复用正确的原 sourceSupplements/能力审阅参数。不要把 final 结果充当 pass-A，不读取不明旧缓存，不将新报告搭在旧 input SHA 的缓存上。
3. 对已有可指定 outputDirectory/scratchDirectory 的函数使用独立目录；对硬编码写入路径的生成器使用 staging checkout。辅助脚本记录真实 argv、输入和输出路径、退出码、日志哈希。
4. 比较生成前后 `currentBinding().files` 与输入摘要。若有意外输入变化，定位它；不要通过替换旧 package/workflow、手工改 manifest 或反复刷报告掩盖问题。
5. 至少做必要的两次隔离派生生成，证明同一输入得到相同输出。复用已有测试已经执行的确定性证明即可，不为形式再重复整个全仓/图链。
6. 推广前比较完整业务结果：节点/边/换乘 ID 集合、可路由和禁用状态、source capability、required facts、reason codes、方向和上下车限制、换乘条件、指标值，以及既定走廊路径结果。
7. 应保持 route-enabled 投影及生产数据字节不变；报告允许改变的元数据字段必须逐路径声明，不做全局递归“忽略所有 hash/sha/时间/状态字段”。尤其来源记录哈希、权限裁决、projectionSha256 等业务完整性信息不能被掩盖。
8. 不只比较数量。出现实体解禁/禁用、线路/指标变化、来源权限扩大或其他语义差异时，保留成果并报告具体差分，不自动接受为“刷新证书”。必要的认证算法修改不在本 Task 授权中。
9. 按依赖顺序生成和推广全部必要关联报告，保留审计输入不动；不能仅全局替换旧 input SHA。

旧来源 observation 日期保持原样；本轮重新计算时间不能伪装成重新访问来源或重新确认其法律状态。

## 7. 验证与提交顺序

### 7.1 聚焦检查

先审阅入口和环境前置。下列命令均在仓库根执行；PowerShell 对每条原生命令检查 `$LASTEXITCODE`，不要用后续成功覆盖前面的失败。

```text
npm ci
npm run test:baseline:inventory -- --check
node --import ./tests/register-route-ts.mjs --test tests/task-035-test-baseline.test.mjs tests/task-035-runner.test.mjs
node --import ./tests/register-route-ts.mjs --test tests/task-086-certification-engine-repair.test.mjs tests/task-086-readmittable-closeout.test.mjs
```

保持治理 01～04 的修复及所有原业务断言。clean-checkout/Windows 的已有有效证据可以引用，涉及本轮变更时补相应复核，不要求重做无关审核。原错误输入/错误哈希仍必须被拒绝，不能只验证新报告能被接受。

需要 clean HEAD 的完整 runner 在派生输出和代码检查后正常提交，在新建的固定提交验证工作树运行。不得在验证时偷偷替换输入。

### 7.2 完整验收

执行或取得同一最终候选的：

- `npm test` 的完整实际结果；不能仅跑两个失败文件后宣称全仓通过。
- 原有完整分片、graph first/second、retained extraction、resume、rebuild、published/corruption/routing/engine proof 及最终聚合。
- 现有 quality 入口的 deploy validation、lint、typecheck、format、build、artifact verification、diff-check。
- 最终分支 exact-head 与 PR merge-result 两种托管证据，各自对应正确 checkout/run/attempt。

上述完整 npm test、quality 和图链可由现有最终托管流水线覆盖，不强制再在本机机械重复整套昂贵验证。发布时当前工作流通过原实现分支 push 和 PR 事件运行完整链；优先正常 push 后读取自然触发的 runs。

允许在确认支持、所需权限和明确 ref/expectedHead 后执行必要的同版本重跑/手动工程验证；不改默认分支来使 dispatch 可用，不无限重试到绿。不同 attempt 的缓存、日志和证据不得混成一次完整通过；严格遵循现有回执的绑定模型。基础设施中断与代码失败分别处理。

每次记录事件、实际 checkout SHA、PR head/base、run/attempt、必需 jobs/步骤、文件集合、用例数、日志/制品哈希和完整聚合结论。不要把 API 的 PR head_sha 当作实际 merge checkout；auto-merge 自动化作业成功不等于测试成功。

新失败必须定位；属于本轮生成/接线范围的完成最小修复后再验证，超出权限的真实问题详细交付。运行未结束就写 PENDING，失败/取消/跳过必需步骤不得写 PASS。不允许只给“BLOCKED”而没有失败定位、已完成工作和保留证据。

## 8. 必交付内容及状态

```text
docs/tasks/FIX-TASK-035-b-wbs-9-1-r035-05-evidence-refresh-closeout.md
docs/tasks/RESULT-FIX-TASK-035-b-wbs-9-1-r035-05-evidence-refresh-closeout.md
docs/qa/TASK-035/r035-05-closeout/README.md
docs/qa/TASK-035/r035-05-closeout/input-binding-before-after.json
docs/qa/TASK-035/r035-05-closeout/generated-change-manifest.json
docs/qa/TASK-035/r035-05-closeout/semantic-diff.json
docs/qa/TASK-035/r035-05-closeout/validation-summary.json
（必要的可复跑隔离脚本、小型去敏日志与校验记录）
docs/project/WBS-TravelAssist.md（仅 9.1 相关追踪）
```

Result 必须回答：R035-01～04 是否回退；R035-05 是否 FIXED；三处原失败是否消失；原数据/人工裁决是否不变；派生报告更新了哪些文件；实际业务投影是否一致；完整 npm test/质量门/两类托管验证结果；能否交人工验收；是否实际合并。

- 强制验证未通过：整体保持进行中/阻塞，并单列根因。
- 本轮全部适用强制条件通过：WBS 9.1 更新为“待审查（R035-05 已修复，完整验证通过，等待人工验收）”。
- 本任务不授权将 WBS 9.1 标为“已完成”，也不提前把四项历史修复建议变成已实际关闭的远端 review 事件。

正常提交并推送原实现分支，更新 #265/#272 说明性回执和 PR 正文的“当前状态”区，历史证据保留为历史。不要让正文永远只显示旧 a77ec0ae 的状态。

代码/报告定稿后再取得最终证据。后续文档提交产生新 head 时明确其差分，并取得该 head 所需的远端结果；不把旧 head 的绿灯挪给新 head。最终自身 SHA 与最终远端回执可写入 #265/#272，避免为自引用反复提交。状态回写需要提交时正常提交并复核，不假装仓库已同步。

交付后停止。PR #272 保持 Open/Draft，Issue #265 保持 Open；不 APPROVE、不转 Ready、不合并、不 auto-merge、不关闭 Issue、不部署、不启动其他 WBS。

## 9. 固定来源与历史资料

- PR：https://github.com/kanzakimy0/TravelAssist/pull/272
- Issue：https://github.com/kanzakimy0/TravelAssist/issues/265
- Core fix Result：https://github.com/kanzakimy0/TravelAssist/blob/48bac2f2184c352b3d829165b2597851b4dbf45a/docs/tasks/RESULT-FIX-TASK-035-b-wbs-9-1-r035-core-fixes.md
- Binding blocker：https://github.com/kanzakimy0/TravelAssist/blob/48bac2f2184c352b3d829165b2597851b4dbf45a/docs/qa/TASK-035/phase-2/binding-blocker.json
- 原 core fix Task：https://github.com/kanzakimy0/TravelAssist/blob/19c84116f1865866c61ee84a0858b0c0d557af46/docs/tasks/FIX-TASK-035-b-wbs-9-1-r035-core-fixes.md
- 既有分支运行：https://github.com/kanzakimy0/TravelAssist/actions/runs/37577152980
- 既有 PR 运行：https://github.com/kanzakimy0/TravelAssist/actions/runs/37577157012

本文件仅发布本轮操作范围和验收要求，不声称修复已执行或 CI 已通过。
