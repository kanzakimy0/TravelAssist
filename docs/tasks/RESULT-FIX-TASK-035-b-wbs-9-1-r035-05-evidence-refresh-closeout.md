# RESULT-FIX-TASK-035-B — R035-05 派生报告刷新与最终集成验证

- Canonical Owner：A；执行：B；TASK-035-A / WBS 9.1 / Issue #265 / Draft PR #272。
- 当前结论：R035-05 在本地候选中 **FIXED**；完整集成验证 **PENDING**，暂不具备人工验收条件。
- 起点：`48bac2f2184c352b3d829165b2597851b4dbf45a`；develop：`4888b4d507ee75d4f6b9914eb1a8d5661813f64b`。
- 授权来源：`f3cfc08ff86f31ce1ba2224716360c655c62d049`；本轮只刷新已有生成器产生的必要派生报告，保留原数据、算法和人工裁决。

## 修复和业务结果

R035-01～04 没有回退：原实现及测试未改，本轮治理测试18/18通过；原真实 Windows/clean checkout 证据见 [core-fix Result](RESULT-FIX-TASK-035-b-wbs-9-1-r035-core-fixes.md)。R035-05 的三个旧失败已在本轮21/21认证聚焦测试中消失；错误来源/哈希/权利/方向/上下车权限的负向断言仍通过。

已先写逐文件输入输出计划，再在独立 staging checkout 调用未修改的 `certify()`、`generateCloseout()`、`generateRepairReport()`。两轮都使用新的隔离输出，pass-A 使用原保留的2个MLIT source supplements及空 capabilityReviews；final 使用同样 supplements 和原已审核 ODbL review。pass-A为4060节点/9407边/1072换乘，final为4061/9409/1072，未把final冒充pass-A。

543项currentBinding输入、552项实际读取输入均未改变；33项派生输出两轮逐字节相同。仅9个JSON变化，允许差异逐路径明确为inputSha256，以及closeout-summary内新eligibility文件的哈希引用；其他字段全量相等。route-enabled字节、节点/边/换乘ID集合、可路由/禁用状态、required facts/reasons、来源权限、方向、上下车限制、换乘条件、指标、走廊路径和projectionSha256全部保持不变。没有全局忽略hash、状态或时间字段。既有6项原业务obligations仍保留，不宣称数据业务验收完成。

更新的派生文件：

- `docs/qa/TASK-086/readmittable-closeout/routing-eligibility.json`
- `docs/qa/TASK-086/readmittable-closeout/closeout-summary.json`
- `docs/qa/TASK-086/readmittable-closeout/terminal-entities.jsonl-index.json`
- `docs/qa/TASK-086/certification-engine-repair/quarantine-recertification-diff.json`
- `docs/qa/TASK-086/certification-engine-repair/corridor-cut-audit.json`
- `docs/qa/TASK-086/certification-engine-repair/tokyo-ueno-acceptance.json`
- `docs/qa/TASK-086/certification-engine-repair/source-family-recovery-summary.json`
- `docs/qa/TASK-086/certification-engine-repair/remaining-original-obligations.json`
- `docs/qa/TASK-086/certification-engine-repair/recertification-summary.json`

手工审阅文件、previous-*、历史证据、生产数据、认证算法、package/lockfile/workflow均未改。没有Provider调用、POI生产或db:reset。

## 本地验证与完整验收

每条命令独立检查退出码，完整日志压缩归档并记录原字节哈希：

| 检查 | 本轮结果 |
| --- | --- |
| npm ci（锁定依赖，专用缓存，关闭审计网络请求） | PASS / exit 0 |
| inventory --check | PASS / exit 0 |
| TASK-035 baseline + runner | PASS / 18/18，0 fail/skip/cancel/todo |
| TASK-086 engine-repair + readmittable-closeout | PASS / 21/21，0 fail/skip/cancel/todo |
| 两轮隔离生成、输入保护和业务等价对照 | PASS |
| 新helper ESLint / Prettier、git diff --check | PASS |
| 完整npm test、所有分片与TASK-086完整证明链 | PENDING，交由本轮正常push触发的托管流水线 |
| lint/typecheck/format/deploy build/artifact/diff完整quality | PENDING，交由同一托管流水线 |
| 分支exact-head / PR merge-result / 完整聚合 | PENDING，必须逐一绑定真实checkout、run、attempt |

本地聚焦测试运行在提交前候选工作树，不写成新SHA的clean exact-head验证。旧48bac托管两类运行均为3905项中3项失败，保留于before-*-failures.json，只作修复前证据。后续文档提交的新head仍须取得自己的远端结果；最终自身SHA及远端回执写入原Issue/PR。

WBS 9.1保持进行中，等待完整集成结果。PR保持Open/Draft，尚未合入develop；不合并、不auto-merge、不APPROVE、不转Ready、不关闭Issue、不启动下游。

证据与复跑方式：[QA README](../qa/TASK-035/r035-05-closeout/README.md)。
