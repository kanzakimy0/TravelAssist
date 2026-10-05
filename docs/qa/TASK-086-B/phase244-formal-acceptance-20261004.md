# TASK-086 单次正式验收记录（2026-10-04）

**结果：技术验收未通过；全国覆盖验收未通过。执行收尾已交接，086 未验收完成。** 本次没有追加研究、改动上下客权限或覆盖口径，也没有在失败后修改输入或重跑。完整机器记录见 `phase244-formal-acceptance-20261004.json`，唯一 11 项状态见 `phase244-bounded-closeout-ledger.v1.json`。

## 冻结现场

- 工作树 `F:/CodexWorktrees/TravelAssist-TASK086`；分支 `feature/b-transport-node-mobility-backbone`；分支 HEAD 与本地实际 checkout SHA 均为 `406d31f0a6b52f321b79fa4694f985709288407f`。这不是 PR 临时合并 checkout，也未运行远端 exact-head CI。
- 冻结时间约 2026-10-04 11:49 UTC；1,355 个输入、工具、测试及相关环境文件的汇总 SHA-256 为 `07f4e84d122b7e248937272908da56de9b491c5b7b1c2afc81c772093f2198e3`。验收后逐文件复核：**0 个冻结文件变化**。Node `v24.18.0`、Python `3.14.6`、npm `11.16.0`。
- 已保全 2,812 个当时修改／未跟踪文件及指定 GTFS 证据；备份 `.cache/task-086/formal-acceptance-20261004/frozen-working-tree-20261004T114950Z.zip`，SHA-256 `3b44974a3a872b1f40e99ce52ed89422aba9de5e6ccfbc673682b2dd1cb4654a`，ZIP CRC `PASS`。备份和输入指纹摘要保存在同目录。
- 冻结前将桜馬場的已证实单向换乘纳入 `task-086-extract-gtfs.py`；隔离提取的来源包与冻结的 `nagasaki-bus.json` 逐字节相同。此后没有修改验证输入。

## 实际命令结果

| 检查 | 实际结果 | 说明／证据日志 |
| --- | --- | --- |
| 正式图生成 `node tools/transport/task-086-remediate.mjs` | 命令退出 0，2,187.84 秒；**图集成失败** | `generate.log`；新图仍为 9,408 条边，缺预期换乘边 `transport-edge:086:82ed0dd594061301415987c9aa2168f4` |
| 完整回归 `TASK086_PUBLISH_VALIDATION=1 node --import ./tests/register-route-ts.mjs --test --test-concurrency=2 tests/*.test.mjs` | **TIMEOUT**，退出码 124，2,700.23 秒 | `full-regression.log`；无完整测试汇总，不能记 PASS |
| 当前输入清洁重建与完整确定性比较 | **未验证** | 已包含于上述完整回归尝试，但长子测试未完成；没有本次冻结输入的 PASS 证明。`deterministic-rebuild.json` 仍是第220轮、2026-10-03 的旧证明，不可复用 |
| 正式阶段 `node tools/transport/task-086-stage.mjs` | 命令退出 0；报告为 **CORE_STAGE_FAILED** | `stage.log`、`core-stage-acceptance.json`；11 个技术检查 10 PASS、1 FAIL |
| 独立三项全局审核＋特殊交通 | 四项语义审核均 `CLOSED`，退出 0；**已发布原检查均 FAIL** | `scoped-global-review.log`、`connectivity-audit.json`；不能将局部关闭冒充正式门禁通过 |
| 阶段／乘客权限／来源权利负例 | 77/77 PASS | `targeted-technical-tests.log` |
| 批次恢复、校验和、损坏负例等 | 37/37 PASS | `recovery-corruption-tests.log` |
| 类型检查；部署契约；独立构建；产物复验；空白字符 | 均退出 0 | 各同名日志及 `.result.json` |
| 完整 lint | FAIL，退出 1 | `lint.log`：1 个解析错误位于 `.cache/task-086/nagasaki-takebe-next/north-junction-next/omura-gis-launcher.js`（被识别为二进制），另有 1,132 条警告；本轮未清理或重跑 |
| 部署格式检查 | FAIL，退出 1 | `format.log`：41 个文件不符合 Prettier；本轮未修改或重跑 |
| 远端 exact-head CI／PR 合并 checkout CI | **未运行** | 本轮未推送，不把本地质量检查称为 CI |

## 技术验收

桜馬場 `886085_04→886085_01`、`transfer_type=2`、300 秒的来源记录和冻结提取包均存在，但正式重放没有生成该边。`connect:transport-node:086:7c1e88ef5a216a3e3ac7218d17dda723` 及其原走廊检查仍 FAIL，因此该根因未关闭。重放器从既有检查点继续；扩展 GTFS 适配器要求扩展包不带 transfer，需在后续单独修复跨包换乘进入重放的路径。本轮依照“失败后不修改、不重跑”保持现状。

正式阶段的唯一技术检查 FAIL 为 `raw_content_hashes_and_retained_input_versions`：`nagasaki-bus.json` 当前 SHA-256 `8bb150802f44f1fef4d07a717be761473ac0c5edb018cff99f39ff3abd60cb93`，manifest 仍绑定 `8eb3eda240f251558c5b5c8dd21655eb3f26912817782112451ff7aac577c6e9`。其余 10 个阶段技术检查 PASS，包括节点身份、方向与来源、836 个模式、1,071 条已发布换乘、乘客分量和已发布产物字节；这些通过项不能抵消哈希 FAIL 或缺失的清洁重建证明。

三项全局义务（私铁／地铁、新干线连续性、全国停站来源）和特殊交通适用性，在当前数据的独立 `reviewGlobalGaps` 中均为 `CLOSED`，阶段根因索引对应旧审核描述也为 `RESOLVED`；但 `connectivity-audit.json` 中这四个原检查仍是 `FAIL`。账本保留它们为技术受阻，直到当前输入的已发布原检查真正通过。

## 全国覆盖与唯一 11 项

必需节点 4,061、已发布有向边 9,408、服务模式 836；阶段报告仍有 **6 个 OPEN 方向根因、6 个必需节点不连通、15 条原始失败检查**。六项分别是桜馬場 `_04`、武部町 `_01/_05`、雲仙 `_01/_05`、波佐見有田インター `_05`。后五项仍缺与真实上下客限制兼容的服务或明确公共连接证据；本轮没有新增研究、伪造反向边或改变验收粒度。

唯一账本 TOTAL 11：**DONE 0、MANUAL 5、TECH_BLOCKED 6、PENDING 0**。TECH_BLOCKED 包含桜馬場正式图集成、三项全局审核发布绑定、特殊交通发布绑定及当前输入清洁重建证明。每项稳定 ID、关联原检查及后续具体动作保存在 JSON 账本。无有效当前输入清洁重建证明，完整回归超时，lint／格式检查失败；因此技术与全国覆盖都不能判为通过。报告后停止，不推送、合并或发布。
