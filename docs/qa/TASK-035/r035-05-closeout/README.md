# TASK-035 / R035-05 closeout evidence

Canonical Owner A，B执行。当前完整验收状态见 [Result](../../../tasks/RESULT-FIX-TASK-035-b-wbs-9-1-r035-05-evidence-refresh-closeout.md) 和 `validation-summary.json`。实现候选3b3c0359c的两类完整CI均通过；本报告提交自身的最终HEAD结果写入原Issue/PR最终交付回执，不把候选绿灯转用给后续SHA。

- `input-output-plan.json`：生成前建立的33项派生输出白名单、生成函数、输入/人工资料保护哈希。
- `input-binding-before-after.json`：543项绑定输入及552项实际读取输入，生成前后均相等。
- `generated-change-manifest.json`：两轮真实调用、输出哈希、9个必要变化及逐字段原因。
- `semantic-diff.json`：完整实体ID集合、业务负载等价结果；仅允许逐路径声明的顶层绑定元数据变化。
- `promotion-check.json`：仅逐文件推广9项，核验生成hash及受保护路径无diff。
- `before-branch-failures.json` / `before-pr-failures.json`：历史48bac的分支37577152980、PR37577157012 attempt1，三个失败及日志/event哈希核验；非本轮通过证据。
- `validation-summary.json` / `logs/*.gz`：实际命令、独立退出码、环境、原日志SHA256及压缩文件SHA256。gzip避免Git换行转换破坏原日志字节。

复跑生成（使用本任务源码，STAGING_ROOT必须是固定提交的干净独立checkout，NEW_EXTERNAL_OUTPUT必须不存在且在checkout外）：

```text
node tools/qa/task-035-refresh-derived.mjs STAGING_ROOT NEW_EXTERNAL_OUTPUT
```

脚本只调用原生成器：retained/pass-A显式使用空capabilityReviews，final保留原人工review。它先写计划，拦截越界写入，验证输入不变、两轮确定性、业务负载相等后才输出manifest；正式推广仍逐文件比较旧/新hash。证据中的I:路径是当次实际生成路径，不是复跑机器的固定路径要求。未修改来源observation日期，也没有重新访问来源。

历史core-fix证据和TASK-086历史输入保持原样；本轮不关闭原有业务obligations。完整npm test、图证明链与quality通过与否，以最终候选的两类托管运行及完整聚合为准。


## 完整候选证据

`candidate-remote/<run>/verification.json`保存实际checkout、head/base、run/attempt、每条必需job/step、12类回执的事件计数、命令和哈希。`raw/**/*.gz`保存原始小型回执、日志、events、完整proof及两类最终聚合；`archived-hashes.json`可验证压缩前后字节。大型图产物未重复提交仓库，下载后已逐一核验核心文件、manifest、全部batch字节及签名，记录于verification.json；GitHub原制品ID、归档digest、大小、有效期在artifact-metadata.json。

只读复核命令（RUN_DIRECTORY含run.json、jobs.json、artifact-metadata.json与gh run download得到的artifacts/；CHECKOUT必须干净且等于EXPECTED_HEAD）：

```text
node docs/qa/TASK-035/r035-05-closeout/verify-remote.mjs CHECKOUT RUN_DIRECTORY EXPECTED_HEAD EXPECTED_BASE
```

校验脚本不执行认证器、不触发CI、不修改数据或报告；只在RUN_DIRECTORY写verification.json。最终文档HEAD的结果通过同样检查后写入原#265/#272最终交付回执，避免提交自身SHA引起无限循环。

原始归档使用短哈希前缀文件名以兼容Windows路径长度；`archived-hashes.json`的`originalArtifactPath`保留下载制品内的原路径，压缩前字节及SHA256不变。
