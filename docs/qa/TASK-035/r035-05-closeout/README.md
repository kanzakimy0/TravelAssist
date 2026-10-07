# TASK-035 / R035-05 closeout evidence

Canonical Owner A，B执行。当前完整验收状态见 [Result](../../../tasks/RESULT-FIX-TASK-035-b-wbs-9-1-r035-05-evidence-refresh-closeout.md) 和 `validation-summary.json`。本地修复验证通过，完整新候选CI尚待执行；旧run结果不能转用为新候选PASS。

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
