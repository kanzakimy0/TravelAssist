# RESULT — TASK-085-B 九项定向补证

**PARTIAL_TARGETED_EVIDENCE_REQUIRED**

九项中五项补齐至 3 个确认节点。另四项已自行检索并记录准确缺口，依用户最新指示保留给 A 补证；没有把例外自动验收。WBS 7.15 = **进行中（5项已补齐，4项待补证）**。沿用 Draft PR [#464](https://github.com/kanzakimy0/TravelAssist/pull/464)，未 merge、auto-merge 或执行 TASK-086。

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

用户授权对九项定向补证，随后明确“自己去寻找，实在找不到之后再保留交给 A 处理”。本轮没有全国重新提取 S12/P11。新增七宗町官方许可 GTFS 的两个 boarding identities；通过官方游客路线、场馆/政府旅游说明及当前运营商资料新增七个关系。保留原有所有 5,200 admitted、344 HOLD、680 directed topology records，不修改 Canonical 或 Planner/API/runtime public behavior。

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
| Admitted / HOLD | 5,202 / 344 |
| Unconfirmed directed candidates | 632 |
| Local node / major hub coverage | 70/100；1/100 |
| Tourism gateway / special access / union | 45/100；18/100；46/100 |
| Walking / transit / taxi resolved POIs | 各 0/100 raw、0/95 assessed |
| Accessibility / stairs / elevation / detour / P90 known POIs | 各 0/100 raw、0/95 assessed |
| Observed extreme detour | 0，实际路线可测样本为0，不能视为无绕行 |
| Unresolved POI / shortfall >=1 | raw 6；assessment 1 |
| Node / edge provenance | 5,202/5,202；694/694 |
| Batch | 1，配置每200个 POI |
| Physical exhaustion proofs | 0 |

[manifest.json](../../data/transport/access/manifest.json)保存全量 hash、分母、directional metric coverage 和 unresolved reason distribution：closed 2；identity/access join required 1；historical 1；not visitor endpoint 1；restricted 1。2,082 条方向/模式 unresolved rows；指标未解析不删除确认 topology。

20/24 topology gates PASS。四项 FAIL：有效 POI coverage 94/95（需95/95）；有效零节点 1（需0）；under-target 无可靠穷尽证明 4（需0）；global fixpoint IN_PROGRESS（需PROVEN）。第四个 FAIL 是撤销旧快照的过强结论，不是数据损坏。全部 Canonical gates PASS，raw membership/owner exclusions 不变；duplicate edge、invalid identity、v1 usage、v2 bulk promotion 均0。确定性、batch receipt/corruption、graph-growth gates PASS。

## Gate 0、许可和集成边界

TASK-084 national v2 仍没有可直接下游消费的 accepted Master；历史244-node v1未读取。按已合入 execution amendment 使用 task-owned、逐节点有 provenance/license/identity 的 additive admission，未把 v2 candidate bulk accept。

原 S12/P11/GTFS/CC0 静态授权保持冻结。新增七宗町静态 GTFS 为 CC BY 4.0，完整署名、许可、ZIP/entry/row hashes 见 [targeted-repair.json](../../data/transport/access/inputs/targeted-repair.json)。有版权的官方地图只保留事实摘要和 source URL；不持久化其原始 payload。Google Routes/Ekiworld/其他 route providers 未得到所需 batch/cache/retention/production/derivative 授权，继续 fail-closed。Provider batch requests=0；raw route payloads persisted=0。Haversine 只用于 straightDistanceM 和有界候选，不当作 walking。

## 验证与交付状态

独立双重全量重建逐字节一致；原 680 条边和所有原 admission/HOLD 逐条一致。收据 resume、single-batch rerun、corruption detection 由实际临时文件测试覆盖。`--rebuild` / `--resume` 对数据未达标返回 CLI exit2；`--check` 的 exit0 只表示生成文件字节一致，输出 acceptance 仍为 PARTIAL。不能将过程成功当成 data PASS。

本轮 focused/full regression、lint/typecheck/format/build 与 source extraction 校验记录见 [QA](../qa/TASK-085-B/README.md) 和 [local-validation.json](../qa/TASK-085-B/local-validation.json)。最终 commit 和 exact-head Quality Gate 在同一 Draft PR #464 body 中记录，避免把旧 head 的绿灯用于本轮。

最终状态仍为 PARTIAL，WBS 7.15 进行中；不交付“已全部修复”的 Excel。四项所需官方/现场资料已具体化，待证据补齐后再重放验收。
