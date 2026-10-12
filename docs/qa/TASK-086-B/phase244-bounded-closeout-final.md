# TASK-086 第244轮一次有界全清单收尾

本轮结束状态：**全清单已逐项处理并交接；TASK-086 整体验收未通过。** 工作树为 `F:\CodexWorktrees\TravelAssist-TASK086`，分支 `feature/b-transport-node-mobility-backbone`，HEAD `406d31f0a6b52f321b79fa4694f985709288407f`。未执行 reset、clean、推送、合并、发布或第245轮数据采集。

## 固定分母与对账

现有范围为 4,061 个必需节点（原始 1,038、新增必要 3,023、可选 0）、9,408 条有向边和 836 个服务模式；现有文件实际行数与 `stage-scope.json`、`manifest.json` 一致。完整稳定 ID 账本为 [phase244-bounded-closeout-ledger.v1.json](phase244-bounded-closeout-ledger.v1.json)，保留每项原验收 ID 映射。

| TOTAL | DONE | MANUAL | TECH_BLOCKED | PENDING |
|---:|---:|---:|---:|---:|
| 11 | 0 | 6 | 5 | 0 |

TOTAL 包含原有 9 个 OPEN 根因、一个现有但未映射到 OPEN 根因的失败检查 `mode:required-special-tourism`、以及当前输入的清洁重建证明。前者旧根因行虽标 `RESOLVED`，第244轮结构检查仍标 `FAIL`；因此单列为现有遗漏，而非新增研究范围。第244轮 `structuralChecks` 中有 19 条 FAIL，而 `fullScope.rawFailedChecks` 写 18；该未映射检查解释了两种计数不能直接混用。

## 六个需要人工补证的巴士方向

本轮复用保留的[长崎县营巴士 GTFS](https://data.bodik.jp/dataset/420000_nagasakikeneibus)与[四处外部地图观察](phase244-four-stop-google-maps-audit.md)，按四处共享预算核查。现有精确调用的 `pickup=1` 或 `dropoff=1` 分别禁止所缺方向的上车或下车；不可改标志、反转班次或凭同名/距离新增换乘边。外部地图观察无截图文件和精确 GTFS 对应，不能代替官方服务权限。全部验收 ID、模式、来源版本、查询结果及重试条件见 [A线证据](phase244-closeout-bus-evidence.md) 和账本。

| 稳定 ID | 站点及缺失方向 | 已查来源 | 人工仍需补的具体事实；补证后动作 |
|---|---|---|---|
| `root:direction:component:2c4972bea167f5eb11e9` | 桜馬場 `886085_04`，站点→全国锚点 | [大村—长崎线](https://www.keneibus.jp/cellular/shuttlebus/omura/) 2026-04-01、保留 GTFS、外部地图条目 | 证明 `_04` 的当前原生站台身份、允许向锚点方向上车的具体班次及所需完整公共连接；然后仅绑定该调用并跑关联 connect/corridor/mode 检查。 |
| `root:direction:component:4516374f05cda3a3809f` | 武部町 `886930_01`，全国锚点→站点 | 同一[运营商页面](https://www.keneibus.jp/cellular/shuttlebus/omura/)、GTFS、外部地图 | 证明 `_01` 站台身份、允许下车的具体班次及跨侧公共通道；不能用 `_05` 同名站台替代。 |
| `root:direction:component:bcb8e18cee0bb3319142` | 武部町 `886930_05`，站点→全国锚点 | 同上一次共享核查 | 证明 `_05` 允许上车的具体班次；若依赖 `_01`，还需完整公共过街/桥梁连接，再做窄范围绑定与检查。 |
| `root:direction:component:662a9755abeab5d52770` | 雲仙 `888190_01`，站点→全国锚点 | [雲仙特急时刻表](https://www.keneibus.jp/local/express/unzen/) 2026-04-01、GTFS、外部地图 | 证明 `_01` 原生站台对应、允许上车的具体方向性调用及必要公共路径；不能用地图线路标签覆盖 `pickup=1`。 |
| `root:direction:component:91378025a59875422ee5` | 雲仙 `888190_05`，全国锚点→站点 | 同一[雲仙时刻表](https://www.keneibus.jp/local/express/unzen/)共享核查 | 证明 `_05` 原生站台对应、允许下车的具体调用；若通过 `_01` 换乘，还需穿越前场的完整公共路径。 |
| `root:direction:component:cdb5939683ed546563ce` | 波佐見有田インター `887550_05`，全国锚点→站点 | 已缓存的[长崎—佐世保线](https://www.keneibus.jp/cellular/highway/sasebo/index.html) 2025-09-01、GTFS、外部地图 | 证明 `_05` 精确候车位置、允许下车的具体调用和连续公共入口路径；可见楼梯只是线索，不增加原要求之外的无障碍门槛。 |

大村—长崎线页面列出桜馬場、武部町双方向的站名，但未给出逐站图标与原生 stop ID 对应；链接的 19.8 MB PDF 获取返回 HTTP 400。雲仙现行时刻表列出双方向服务但不标原生站台。波佐見有田インター查询返回已有相同版本，故未重复下载。这些是来源核查的具体限制，不是地图“查无结果”。

## 五个技术受阻项

| 稳定 ID | 当前实际结果与阻塞 | 明确后续动作 |
|---|---|---|
| `root:obligation:source:national-stopping-patterns` | 当前输入的仓库审核函数返回 CLOSED；第244轮已发布结构检查仍 FAIL，绑定旧审核输入。 | 待输入稳定后由正常生成器重放并重查该原验收 ID；不手改哈希。 |
| `root:obligation:service:shinkansen-continuity` | 同一只读检查 CLOSED，已发布检查仍 FAIL。 | 同一批正常重放后重查。 |
| `root:obligation:service:major-rail-private-metro` | 同一只读检查 CLOSED，已发布检查仍 FAIL。 | 同一批正常重放后重查。 |
| `check:mode:required-special-tourism` | 现有失败检查此前漏出 OPEN 根因清单；当前输入审核函数 CLOSED，已发布结构检查仍 FAIL。 | 保留原适用范围，经同一次正常重放后重新映射检查，不删除或豁免。 |
| `proof:clean-deterministic-rebuild:phase244-current-inputs` | 当前 `global-review.v1.json` SHA-256 为 `63c6aaa0…`，manifest 绑定 `e8b60725…`，可用重建证明仍是第220轮、绑定 `bbe57e2a…`；当前技术检查明确 FAIL。 | 六个巴士硬缺口有合格证据并固定输入后，正常生成、清洁重建及完整门禁一次；旧证明作废。 |

B线只读局部命令 `node .cache/task-086/closeout-B/review-current.mjs` 实测约 2.3 秒、退出码 0，四项当前审核谓词均 CLOSED；专项“输入变化使旧检查和证明失效”单测通过。详见 [B线证据](phase244-closeout-global-review-evidence.md)。局部 CLOSED 不等于已发布验收通过；没有依据修改审核内容、图或代码。

## 备份、验证边界与执行消耗

- 开工前的[本地 ZIP 备份](</F:/CodexWorktrees/TravelAssist-TASK086/.cache/task-086/bounded-closeout-backups/phase244-precloseout-20261004T082620Z.zip>)保存了 2,800 个当时已跟踪变更/未跟踪文件及 Git index；ZIP CRC 与两份交接文件读取均 PASS，SHA-256 `f4bca6d61107f4ceeb0b9ce1f77b2cf6f712ac5863dde03d86f00d08cf263f1b`。逐文件 CRC 对比表明这 2,800 个基线文件在本轮没有被更改或丢失。
- [选定输入哈希快照](phase244-closeout-input-snapshot.json)记录当前关键代码、数据与审核输入；它是检查点，**不是**确定性重建证明。
- A线没有证据支持修改真实 GTFS 限制或添加边，故没有伪造修复后的局部 PASS。B线不需要代码补丁。没有运行正常全国生成器、清洁重建或完整回归：六个原有巴士方向硬缺口仍在，完整验收结果已知不会通过；为获得同样失败而重复运行昂贵全套不符合本轮门槛。此项为**未运行**，不是失败或超时。
- 实际指定模型：A线 `gpt-6-luna`/low；B线 `gpt-6-sol`/medium。协调会话的精确模型 ID 未暴露。未升级高能力模型，未为每站新建代理。可取得的是脚本约 2.3 秒及专项单测约 0.15 秒的记录；本轮实际 token 与计费不可得，记为**未知**，不宣称 token 硬上限或节省比例。

所有 11 个 ID 已有处置记录，PENDING 为 0，所以**本轮有界全清单处理结束**。六项 MANUAL 是具体外部事实缺口，五项 TECH_BLOCKED 是正式生成/证明绑定问题；它们都不构成全国验收豁免。TASK-086 仍未验收完成，本次交付后停止，不自动续期。

## 2026-10-04 定点 GTFS 补记

最新核对与 11 项状态见 [phase244-gtfs-20261001-directed-closeout.md](phase244-gtfs-20261001-directed-closeout.md)。执行收尾已交接，TASK-086 整体验收未完成。


## 2026-10-04 冻结输入正式验收

本次单次正式验收结果见 [phase244-formal-acceptance-20261004.md](phase244-formal-acceptance-20261004.md) 和同名 JSON。技术验收及全国覆盖均未通过；唯一 11 项账本已更新。
