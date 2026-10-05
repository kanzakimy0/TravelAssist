# TASK-086 第244轮定点 GTFS 收尾补记（2026-10-04）

本次仅核对长崎县营巴士 2026-10-01 GTFS 的六个原生站台、桜馬場单向换乘及关联账本；未重做全国调查、未改变上下客限制、未重建全国图。执行收尾已完成，**TASK-086 整体验收未完成**。

## 版本与证据绑定

- 工作树 `F:/CodexWorktrees/TravelAssist-TASK086`，分支 `feature/b-transport-node-mobility-backbone`，基线 HEAD `406d31f0a6b52f321b79fa4694f985709288407f`。现有未提交成果保留。
- [运营商公开 GTFS 归档](https://www.keneibus.jp/fs/2/4/5/6/6/_/GTFS_20261001.zip)：`feed_version=VER_20261001`，下载文件 SHA-256 `a49a3e3fb880aa0383e7df38cbf12e0ea145a8e69ea716be12ac2bcac91d4f6a`。本地缓存 `.cache/task-086/gtfs-20261001-directed/GTFS_20261001.zip`。
- 工程已保留并许可登记的 BODIK 同版本归档 `data/transport/network/sources/raw/nagasaki-bus.zip`，SHA-256 `add5981eb3444be32570b26785c845be582b3458fac2b3ac9830351feb0148fc`。两个 ZIP **字节不同**，未把新 ZIP 假写成旧哈希；本次被导入的换乘行和两趟指定班次的对应行逐行相同。新增证据绑定旧归档的真实内容哈希及既有 CC BY 4.0 来源决定；新归档仅作独立交叉核对，未由下载地址推断新的许可。
- 外部 Google 地图观察沿用 `phase244-four-stop-google-maps-audit.md`，未当作服务方向、上下客或完整步行连接证明。

## 定点核查与唯一修复

| 站台 | GTFS stop_times 记录数 | pickup_type | drop_off_type | 结论 |
| --- | ---: | --- | --- | --- |
| 桜馬場 `886085_04` | 21 | 全部 `1`（禁止上客） | 全部 `0` | 可下车，不能据此反向上车 |
| 武部町 `886930_01` | 17 | 全部 `0` | 全部 `1`（禁止下客） | 上客站台 |
| 武部町 `886930_05` | 23 | 全部 `1` | 全部 `0` | 下客站台 |
| 雲仙 `888190_01` | 9 | 全部 `1` | 全部 `0` | 下客站台 |
| 雲仙 `888190_05` | 9 | 全部 `0` | 全部 `1` | 上客站台 |
| 波佐見有田インター `887550_05` | 6 | 全部 `0` | 全部 `1` | 本归档只证实上客，未证实反向下车 |

`transfers.txt` 明列 `886085_04→886085_01`、`transfer_type=2`、`min_transfer_time=300`，未列该对站台的反向换乘。2026-10-04 是归档有效期内的星期日，`calendar_dates.txt` 当日无覆盖；两趟车的 `service_id` 均为“日祝”。`024721_3_001_0` 于 15:10 在 `_04` 可下车；`401261_3_001_0` 于 15:55 在 `_01` 可上车，16:12 在野岳入口 `886155_01` 可下车。45 分钟接续大于规定的 5 分钟。这证明指定日祝接续在时刻和上下客规则上成立，不证明每个时段都有服务。

工程原来源包中 `_04` 位于 `nagasaki-bus.json`，`_01` 位于 `nagasaki-local-sections184.json`；两包原本都未包含跨包换乘，已发布的 9,408 条边也无对应边。本轮仅在 `nagasaki-bus.json` 加入一条由旧归档 `transfers.txt` 原始行绑定的单向换乘及一条独立证据，源归档和六站台上下客属性未改。修复前文件备份在 `.cache/task-086/gtfs-20261001-directed/nagasaki-bus.before-directed-transfer.json`。局部模型检查调用现有 `generateTransfer` 和 `reachablePaths`，退出码 0：证据绑定通过，得到 5 分钟有向边 `transport-edge:086:82ed0dd594061301415987c9aa2168f4`；当前图 `_04→全国锚点` 为不可达，内存加入该边后为可达，首边正是该换乘；`_01→野岳入口` 也可达。**这只是针对性验证，已发布图尚未生成此边，关联验收仍为失败。**

## 验收口径

原任务第16–17节要求冻结已接纳节点，不得为了通过而删减；明文要求全部 T0 属于全国骨干、全部 T1 有通向 T0/T1 的路径，并要求无证明的必需断点为零。当前 `task-086-model.mjs` 的 `auditGraph` 对清单中每个节点（包括 T2 原生 GTFS 站台）均执行全国锚点**双向**乘客有效路径判断；`task-086-stage.mjs` 的乘客状态图会按上客、下客及连续乘坐约束过滤。原任务没有逐字规定“每个单向原生站台都须双向可达”。这项更严格粒度是否为最终必需口径，需要用户明确决定。此处只记录差异，未合并站点、删节点、修改权限、门槛或证明。

## 唯一 11 项账本状态

| 稳定 ID | 状态 | 本次后仍需处理 |
| --- | --- | --- |
| `root:direction:component:2c4972bea167f5eb11e9`（桜馬場 `_04`） | TECH_BLOCKED | 来源输入已修，待正常生成、关联检查和当前输入清洁重建；不能以局部内存路径宣告关闭 |
| `root:direction:component:4516374f05cda3a3809f`（武部町 `_01`） | MANUAL | _01 禁止下车；需合法到达服务或从其他下客站台到 _01 的有向公共连接证据 |
| `root:direction:component:bcb8e18cee0bb3319142`（武部町 `_05`） | MANUAL | _05 禁止上车；需合法离开服务或到其他上客站台的有向公共连接证据 |
| `root:direction:component:662a9755abeab5d52770`（雲仙 `_01`） | MANUAL | _01 禁止上车；需合法离开服务或通往 `_05` 的完整公共连接证据 |
| `root:direction:component:91378025a59875422ee5`（雲仙 `_05`） | MANUAL | _05 禁止下车；需合法到达服务或从 `_01` 到 `_05` 的完整公共连接证据 |
| `root:direction:component:cdb5939683ed546563ce`（波佐見有田インター `_05`） | MANUAL | 此归档无 `_05` 下车服务；需准确下车服务或其他到达点至 `_05` 的公共连接证据 |
| `root:obligation:service:major-rail-private-metro` | TECH_BLOCKED | 既有局部审核已关闭，已发布结果/绑定陈旧；待当前输入生成及证明 |
| `root:obligation:service:shinkansen-continuity` | TECH_BLOCKED | 同上 |
| `root:obligation:source:national-stopping-patterns` | TECH_BLOCKED | 同上 |
| `check:mode:required-special-tourism` | TECH_BLOCKED | 既有局部审核已关闭，已发布结果/绑定陈旧；待当前输入生成及证明 |
| `proof:clean-deterministic-rebuild:phase244-current-inputs` | TECH_BLOCKED | 修复后的来源输入没有清洁重建证明；旧版本结果不能借用 |

TOTAL 11：DONE 0、MANUAL 5、TECH_BLOCKED 6、PENDING 0。人工项保留各自原始关联验收 ID 于 JSON 账本。五个其余巴士硬缺口仍在，因此没有运行已知会失败的昂贵全套；本轮也未运行正常全国生成或最终门禁。下一次生成前须确保跨包换乘在重新提取来源包时不会丢失；随后冻结输入，运行当前版本生成、清洁重建和完整验收，只有实际命令正常结束且全部适用检查通过才可改为 DONE。

**执行收尾：**本轮结果和剩余项已交接，自动运行停止。**整体完成：**条件未满足，**已收尾交接，086未验收完成**。
