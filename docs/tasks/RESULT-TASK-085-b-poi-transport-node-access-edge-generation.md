# RESULT — TASK-085-B 身份校验、接入限制与扩容准入审查

**PARTIAL_TARGETED_EVIDENCE_REQUIRED**

已修复 `445fbfd57d09108b271261a3d24ba51cd83103ad` 审查发现的两项实现缺陷。数据验收仍为 PARTIAL：四项接入缺证尚未解决。WBS 7.15 = **进行中（身份及限制已修复；4项缺证；扩容7691条待A准入）**。沿用 Draft PR [#464](https://github.com/kanzakimy0/TravelAssist/pull/464)，未 merge、auto-merge 或执行 TASK-086。

此前九项 fixpoint 的来源检索范围不足，本轮找到可用官方证据，因此撤销其在当前数据上的有效性。当前 `globalTopologyDiscoveryFixpoint=IN_PROGRESS`，不再把旧快照已审计当成穷尽证明。详见 [九项补证与四项 A 交接表](../qa/TASK-085-B/targeted-nine-case-source-audit.md)。

## Integration and authority

| Item | Value |
| --- | --- |
| Latest consumed origin/develop | `5123966f62dbe9587a3bbe38e877ccf3ea959b80` |
| Normal merge commit into B | `509c9fda40bb443b5a9c4a5e6ef36e875e713744` |
| Preserved Round-2 B checkpoint | `f70c154a881fd6aa620481639aef0b2e76ff6a46` |
| Amendment | `8ac80bf5d684a34145489f27c6cf2e6bd1e22e67`, [post-Canonical final replay](AMENDMENT-TASK-085-b-post-canonical-final-replay.md) |
| Execution comment | [Issue #442 comment 5912322940](https://github.com/kanzakimy0/TravelAssist/issues/442#issuecomment-5912322940) |
| Branch / PR | `feature/b-poi-transport-node-access-edges` / Draft #464 |
| Canonical revision | `task-083-a-pilot100-owner-adjudication-v2` |
| Runtime manifest file SHA256 | `b4f714078d2780324f9e98fbaf58001177040dbc30d9693e7bfef1019d6643df` |
| Dataset file SHA256 | `c3ed64d518913be8c9c8d4ec07ed85bf4a446228e73ca1ac19026057efd1c6af` |
| Dataset semantic SHA256 | `0a91f0ec36c193b4a95c15dcad01338286ea91afb5003f3e1abdf7c7a9366ad5` |
| Correct supporting sample SHA256 | `6d6187e53f6235abc757795896b8ba441736ce078e1e5b3e0c70df14c4709d51` |
| Owner adjudication file SHA256 | `b80ae442d6a5fe883e9491fce6d242c7edce1d4c119e03975a1df43fd0be3d85` |
| Owner adjudication revision | `task-083-a-access-adjudication-20260930-v1` |

Runtime path: `src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json`. Adjudication path: `src/shared/data/canonical-poi-pilot100.access-adjudication.v1.json`. These files and the dataset, sample, registry and original admission receipt match merged develop exactly. PR #465 is authoritative; B did not repair or rewrite them. The [supporting-hash audit](../qa/TASK-085-B/canonical-supporting-hash-audit.md) retains the original CRLF/LF finding and records its owner-authorized resolution.

The merge was conflict-free and preserved newer develop WBS facts. Final B head and exact-head CI are recorded in the existing PR body after commit/push, avoiding a self-referential committed head hash.

## 本轮修复

上一轮定向补证增加两个许可 GTFS 节点、七个关系，达到 5,202 admitted、347 relationships / 694 directed edges。本轮修复在字符串化之前排除缺失站码；须坂保留有效码 `002014`，通过显式迁移 receipt 更新身份和两条方向引用。菊水山从 ADMIT 改为 HOLD，十二条原 HOLD 缺码记录解除错误 ID 冲突且仍为 HOLD。当前为 **5,201 唯一 ADMIT 节点、345 条 HOLD / 315 个唯一 HOLD NodeID**。原基线 344 是 HOLD 记录数，对应 303 个唯一 NodeID，不能混作节点数量。

全部 347 关系／694 方向均保留。新增 B 专属 `task085Access` 元数据与校验读取器，将原始限制、证据 ID/hash、方向、原文 finding 和禁止方向绑定到边。694/694 通过限制传播 gate；未接入 A runtime，`runtimeImportAuthorized=false`、`routable=false`。源文件及 Canonical 未改，须坂两个 edge ID 的变化有完整映射。详见 [审查修复与来源复核](../qa/TASK-085-B/review-445fbfd5-remediation.md)。

通用 additive receipt adapter 验证 scope、许可、ZIP/source-record/row hashes、精确 name/operator join、空间上限及重复关系，使用现有 TASK-082 graph contract 生成两个独立方向记录。route metrics 不镜像、不填估值；两个方向允许共享 topology evidence。

| POI | 原节点 → 当前 | 本轮结果 |
| --- | ---: | --- |
| 飛水峡 | 1 → 3 | 达到 3 个确认节点 |
| 御影大橋 | 2 → 3 | 达到 3 个确认节点 |
| 田倉山 | 2 → 3 | 达到 3 个确认节点 |
| 池原橋 | 1 → 1 | 来源/身份/接入证据仍不足，详见交接表 |
| まほろば湖 | 1 → 3 | 达到 3 个确认节点 |
| みさき公園 | 1 → 1 | 来源/身份/接入证据仍不足，详见交接表 |
| 阿瀬川橋 | 0 → 0 | 来源/身份/接入证据仍不足，详见交接表 |
| 韮崎中央公園陸上競技場 | 2 → 2 | 来源/身份/接入证据仍不足，详见交接表 |
| ミュージアム都留 | 2 → 3 | 达到 3 个确认节点 |

剩余四项：池原桥缺额外 stop-to-bridge 官方接入关系或可靠穷尽证明；みさき公園缺可复用 bus boarding 坐标及当前入口 join；阿瀬川桥缺公共游客 endpoint 和接入关系；韮崎竞技场已有官方 bus 接入关系，但缺新体育馆站可复用的精确 boarding 坐标。未用距离、建筑中心或远处 hub 凑数。

## 指标和门禁

| 指标 | 当前值 |
| --- | --- |
| Canonical processed / scan / explicit outputs | 100 / 100% / 100% |
| Assessment denominator | 95 |
| Confirmed topology | raw 94/100；assessment 94/95 |
| Zero-node | raw 6（5 owner exclusions + 阿瀬川桥）；assessment 1 |
| >=3 useful nodes | raw 91/100；assessment 91/95 |
| Useful-node mean / median / min / max | raw 3.47 / 3 / 0 / 6；assessment 3.652632 / 3 / 0 / 6 |
| Confirmed relationships / directed edges | 347 / 694 |
| Directed edges/POI mean / median / min / max | 6.94 / 6 / 0 / 12 |
| Under-target | raw 9（含5 owner exclusions）；assessment 4 |
| ADMIT unique nodes / HOLD records / HOLD unique NodeIDs | 5,201 / 345 / 315 |
| Unconfirmed directed candidates | 632 |
| Local node / major hub coverage | 70/100；1/100 |
| Tourism gateway / special access / union | 45/100；18/100；46/100 |
| Walking / transit / taxi resolved POIs | 各 0/100 raw、0/95 assessed |
| Accessibility / stairs / elevation / detour / P90 known POIs | 各 0/100 raw、0/95 assessed |
| Observed extreme detour | 0，实际路线可测样本为0，不能视为无绕行 |
| Unresolved POI / shortfall >=1 | raw 6；assessment 1 |
| Node / edge provenance | 5,201/5,201；694/694 |
| Batch | 1，配置每200个 POI |
| Physical exhaustion proofs | 0 |

[manifest.json](../../data/transport/access/manifest.json)保存全量 hash、分母、directional metric coverage 和 unresolved reason distribution：closed 2；identity/access join required 1；historical 1；not visitor endpoint 1；restricted 1。2,082 条方向/模式 unresolved rows；指标未解析不删除确认 topology。

21/25 topology gates PASS，新增的限制传播/runtime 禁用 gate PASS。四项 FAIL：有效 POI coverage 94/95（需95/95）；有效零节点 1（需0）；under-target 无可靠穷尽证明 4（需0）；global fixpoint IN_PROGRESS（需PROVEN）。全部 Canonical gates PASS，raw membership/owner exclusions 不变；这不代表未确认游客 endpoint 已通过。duplicate edge、accepted invalid identity、v1 usage、v2 bulk promotion 均0。确定性、batch receipt/corruption、graph-growth gates PASS。

## 7,791 目标分批准入

v1.66 Registry 的 1xxxx–7xxxx 共 7,791 条，按每批200条完成 **39 个准入批次**，最后一批191条。输出在 `data/transport/access-expansion/`。100 条与当前 A 正式 Canonical 身份一致；**7,691 条尚未正式准入，HOLD_CANONICAL_NOT_ADMITTED**。未把 workbook FROZEN、eligible pool 或 candidate-only 数据升级成 Canonical。

raw Canonical 仍100、assessment仍95；5条沿用 owner exclusion，4条接入缺证，91条达到3节点。复用94个已覆盖POI、347关系／694方向，**新增覆盖0**。39批均通过导出边身份、许可、限制传播和确定性校验，完整覆盖验收仍PARTIAL。各批新增/既有覆盖、关系/方向数、缺证清单和receipt逐项交付；局部HOLD没有阻止其他已授权关系导出。0xxxx的2,046条不作为景点；8xxxx的748条只允许用于节点身份复核，未凭名称自动接纳。扩容是POI接入任务，不代表全国交通骨干验收。

## Gate 0、许可和集成边界

TASK-084 national v2 仍没有可直接下游消费的 accepted Master；历史244-node v1未读取。按已合入 execution amendment 使用 task-owned、逐节点有 provenance/license/identity 的 additive admission，未把 v2 candidate bulk accept。

原 S12/P11/GTFS/CC0 静态授权保持冻结。新增七宗町静态 GTFS 为 CC BY 4.0，完整署名、许可、ZIP/entry/row hashes 见 [targeted-repair.json](../../data/transport/access/inputs/targeted-repair.json)。有版权的官方地图只保留事实摘要和 source URL；不持久化其原始 payload。Google Routes/Ekiworld/其他 route providers 未得到所需 batch/cache/retention/production/derivative 授权，继续 fail-closed。Provider batch requests=0；raw route payloads persisted=0。Haversine 只用于 straightDistanceM 和有界候选，不当作 walking。

## 验证与交付状态

独立双重全量重建逐字节一致。`review-remediation-audit.json` 验证原694方向的关系语义和所有metrics不变；两个须坂方向经显式身份重绑，所有方向新增限制元数据，因此不宣称新旧JSON逐字节相同。收据resume、single-batch rerun、corruption detection由实际临时文件测试覆盖。原接入生成器数据未达标返回非零，`--check` exit0只表示文件字节一致。扩容执行成功也不等于其PARTIAL状态通过。

本轮 focused/full regression、lint/typecheck/format/build 与 source extraction 校验记录见 [QA](../qa/TASK-085-B/README.md) 和 [local-validation.json](../qa/TASK-085-B/local-validation.json)。最终 commit 和 exact-head Quality Gate 在同一 Draft PR #464 body 中记录，避免把旧 head 的绿灯用于本轮。

已更新审查Excel，补齐最后七条Topology证据的Evidence ID，并增加身份迁移、双向限制及39批/7,791条准入结果。Excel明确标注PARTIAL。四项剩余证据与7,691条A准入缺口分别列出，不作为已接受例外或已完成。
