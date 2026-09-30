# TASK-084-B v2 全国扩审与纠错成果物

日期：2026-09-30。规则基线：`168149d0fc5570f5ed55297937c806bdf290d6b3`。

**REWORK_IN_PROGRESS。尚未形成可导入的全国 Master，正式 v2 accepted nodes = 0。**

此报告取代 2026-09-29 的 47-airport / 16-bus 中间规模作为当前审核入口。机场身份筛查、候选存在、官方字段核实、实体去重和最终接收分别统计。

## 本轮结果

| 项目                 | 当前结果                                                                       | 尚未通过                                                                 |
| -------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 轨道组件             | 2228                                                                           | 全部保留 COMPONENT_REVIEW_REQUIRED                                       |
| 机场身份审核         | 97 / 97                                                                        | 当前服务与完整接入审核仍有缺口                                           |
| 机场决定             | {'CLOSED/INACTIVE': 1, 'DEFER_NOT_PLANNER_RELEVANT': 9, 'REVIEW_REQUIRED': 87} | 不能将 97 身份筛查当作 97 个机场接收                                     |
| 机场规划候选         | 86                                                                             | 年旅客量至少 1,000 人；10 个低于阈值排除（含礼文停用），1 个未知继续待核 |
| 官方机场年度统计     | 96 / 97                                                                        | 千歳无独立年度值，不能套用新千歳                                         |
| 机场接入指南         | 49                                                                             | 48 待核                                                                  |
| 已核轨道机场         | 13                                                                             | expected 21 / present 21 / missing 0，仍为候选                           |
| BUS 审核记录         | 212                                                                            | 跨来源实体去重未完成，不能称为独立物理终端数量                           |
| NAVITIME 发现        | 191                                                                            | 全国分类及可用都道府县分页已遍历至末页                                   |
| BUS 已附部分官方证据 | 42                                                                             | NAVITIME 对应 21；完整官方字段验证 0                                     |
| BUS 决定             | ACCEPT 0 / REVIEW 211 / DEFER 0 / INACTIVE 1                                   | 坐标、服务、统计和物理终端去重仍未齐备                                   |
| Hub 审核范围         | 104                                                                            | complete 0 / component-review-required 104                               |
| 所列最小组件缺口     | 0                                                                              | 缺口计数仅限所列期望清单，不代表全国 Hub 完整                            |
| 高等级组件 Hub Gate  | 519                                                                            | 370 尚未建立官方 Hub 审核范围                                            |

## 本轮 Hub 与机场更正

- Hub 范围 104 个、期望组件 270 个；其中大阪相关 52 个范围。85 个范围有官方换乘边界证据，200 个组件写入 proposedParentHubId；正式 parentHubId 授权仍为 false。
- 大阪・梅田统一为 7 个组件：JR 大阪、JR 北新地、阪急大阪梅田、阪神大阪梅田、Metro 梅田、东梅田、西梅田。旧范围及旧 Hub ID 显式保留沿革。
- 押上・とうきょうスカイツリー保留 5 个组件（东武两个物理站）；练马 2 个；难波 5 个；天王寺・大阪阿部野桥 4 个。
- 官方读取 Osaka Metro 134 个站点页，并用联络出口资料确认不同站名；JR 野田与阪神野田保留在不同换乘区，浅草不含独立的 TX 浅草。
- 泉北高速 2025-04-01 并入南海的运营方沿革单列，旧 S12 保留历史来源且不静默重绑身份。近铁京阪奈线按实际快速铁路归 private_rail，不因法定代码 21 误标 tram。
- 年旅客量 <1,000 的机场不进入 airport-planning-candidates.jsonl，97 身份台账完整保留；恰好 1,000 可入候选，null 为未知。

## 既有纠错继续保留

- 新增横浜 × 横浜高速鉄道、新宿 × 東京都、北鉄金沢 × 北陸鉄道、熊本駅前 × 熊本市、鹿児島中央駅前 × 鹿児島市五个候选组件。来源为各运营方车站/时刻表和 S12，不以数量目标扩张。
- 札幌地下铁、神户地下铁按实际地铁模式归类；Osaka Metro 的法定轨道代码 21 不等于路面电车，仍保留 metro，New Tram 保留 fixed_guideway。路面电车候选单列 tram。
- `candidate-revision-lineage.jsonl` 明示候选模式纠正和新增记录。v1 轨道 lineage 仍为 123 复用候选、54 显式替代、2 待核，尚未作最终 Master 接收。
- 正式 parentHubId 未改动；本轮 proposedParentHubId 只由官方换乘证据建立。东京 4 个 operator/mode 组件、品川 3 个组件保留，`lineRefs` 可以包含多条线路。
- 美保（米子）机场补入 JR 米子空港站步行接入审核。札幌丘珠的地铁接驳需要巴士，未冒记为机场直达轨道。

## 新干线利用量

| 数值来源               | 组件数 |
| ---------------------- | ------ |
| S12 独立可用数值       | 48     |
| 运营方独立新干线数值   | 29     |
| STATION_COMPLEX_PROXY  | 18     |
| USAGE_DATA_UNAVAILABLE | 13     |
| manualLevelReview=true | 60     |

JR 东日本 FY2024 的数值是上车人数，未乘二。JR 东海 FY2025 括号内新干线数值以千人为公布精度，仅作千人到人的单位换算。JR 九州合并站及 JR 西日本站级总量明确保留 STATION_COMPLEX_PROXY。以上 fallback 不直接套用 S12 的乘降人数阈值，拟定 T 级保持 null 等待指标及功能审核。13 个 unavailable 的含义是本证据包尚无已接纳数值，不能宣称所有官方来源均不存在数据。

## 等级分布

以下是候选拟定等级。Hub 拟等级取已有组件最高已知 T 级，仅作审核排序；不相加旅客量，正式 v2 Hub 等级仍未授权。

| 范围                                          | 维度            | 分组              | T0  | T1  | T2  | T3  | 待核 |
| --------------------------------------------- | --------------- | ----------------- | --- | --- | --- | --- | ---- |
| RAIL_COMPONENT_CANDIDATE                      | mode            | conventional_rail | 40  | 160 | 433 | 4   | 1    |
| RAIL_COMPONENT_CANDIDATE                      | mode            | fixed_guideway    | 0   | 3   | 68  | 1   | 2    |
| RAIL_COMPONENT_CANDIDATE                      | mode            | metro             | 18  | 125 | 381 | 1   | 7    |
| RAIL_COMPONENT_CANDIDATE                      | mode            | private_rail      | 22  | 146 | 681 | 5   | 7    |
| RAIL_COMPONENT_CANDIDATE                      | mode            | shinkansen        | 0   | 5   | 8   | 35  | 60   |
| RAIL_COMPONENT_CANDIDATE                      | mode            | tram              | 0   | 0   | 8   | 7   | 0    |
| RAIL_COMPONENT_CANDIDATE                      | operator_family | JR Central        | 1   | 15  | 33  | 3   | 6    |
| RAIL_COMPONENT_CANDIDATE                      | operator_family | JR East           | 33  | 122 | 189 | 14  | 26   |
| RAIL_COMPONENT_CANDIDATE                      | operator_family | JR Hokkaido       | 0   | 1   | 13  | 3   | 1    |
| RAIL_COMPONENT_CANDIDATE                      | operator_family | JR Kyushu         | 1   | 1   | 38  | 5   | 13   |
| RAIL_COMPONENT_CANDIDATE                      | operator_family | JR Shikoku        | 0   | 0   | 3   | 0   | 0    |
| RAIL_COMPONENT_CANDIDATE                      | operator_family | JR West           | 5   | 26  | 165 | 14  | 15   |
| RAIL_COMPONENT_CANDIDATE                      | operator_family | Municipal/Metro   | 18  | 125 | 381 | 1   | 7    |
| RAIL_COMPONENT_CANDIDATE                      | operator_family | Private/Other     | 22  | 149 | 757 | 13  | 9    |
| AIRPORT_PLANNING_CANDIDATE_PROPOSED_ONLY      | mode            | airport           | 8   | 23  | 37  | 18  | 0    |
| BUS_SOURCE_REVIEW_RECORD_NOT_DEDUPED_FACILITY | mode            | bus_terminal      | 1   | 0   | 0   | 0   | 211  |
| HUB_BOUNDARY_REVIEW_SCOPE                     | entity_layer    | Hub               | 32  | 37  | 35  | 0   | 0    |

完整 operator 逐项分布见 `tier-distributions.jsonl`。Ferry 120 港口统计仍是港口汇总，不能替代码头客流；未新增已接受 Ferry/cable 节点。

## BUS 发现和官方核实边界

- NAVITIME 58 页；42 个可用都道府县入口全部遍历，另 5 个无活跃入口单独记录。全国分页与都道府县记录 ID 集合一致。不以缺少入口推断该县没有客运站。
- 官方 MLIT 一般巴士终端名录 26 条作为另一发现和设施证据源。其 berthCount 是发车泊位容量，不是发车次数或客流。
- 八重洲地下 A、地下 B 保持两条设施候选，MLIT 合并项目名录不能证明两个设施应合成同一 TransportNode。东京 JR 两条发现记录、宫交城市两条发现记录仍待物理去重。
- 札幌站旧终端依据市政府关闭说明列 INACTIVE，不能因仍出现在登记名录里就认定运营中。
- バスタ新宿保留 MLIT 2026 年 6 月第 3 周平均 23,360 人/日证据和拟定 T0，坐标等完整接收条件仍待核。
- 新宿、东京/八重洲、札幌、仙台、名古屋、京都、大阪/梅田/难波、广岛、博多/福冈、熊本、长崎均保留既有官方审核线索；这不是全国白名单。
- 本轮另核对 72 个官方证据 URL：63 个直接获取成功，9 个因 403、证书或 404 未能获取，逐项保留失败记录，不忽略证书错误。URL 获取成功本身不计为字段验证成功。

## 逐条成果物

| 文件                                                                                                                                            | 内容                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [rail-components.jsonl](../../../data/transport/nodes/task-084-b-v2-amendment-review/rail-components.jsonl)                                     | 全部轨道组件，含本轮官方 fallback                 |
| [airport-97-audit.jsonl](../../../data/transport/nodes/task-084-b-v2-amendment-review/airport-97-audit.jsonl)                                   | 97 身份逐项状态、年度客流、接入与待核字段         |
| [airport-planning-candidates.jsonl](../../../data/transport/nodes/task-084-b-v2-amendment-review/airport-planning-candidates.jsonl)             | 年旅客量门槛通过的 86 个规划候选，仍未正式接收    |
| [airport-rail-components.jsonl](../../../data/transport/nodes/task-084-b-v2-amendment-review/airport-rail-components.jsonl)                     | 21 个已知机场轨道组件与候选 ID                    |
| [bus-candidate-official-review.jsonl](../../../data/transport/nodes/task-084-b-v2-amendment-review/bus-candidate-official-review.jsonl)         | 212 条跨来源终端审核记录                          |
| [hub-component-completeness-review.jsonl](../../../data/transport/nodes/task-084-b-v2-amendment-review/hub-component-completeness-review.jsonl) | 104 个范围、270 个期望组件、官方边界与拟 Hub 对应 |
| [high-tier-hub-coverage-gate.jsonl](../../../data/transport/nodes/task-084-b-v2-amendment-review/high-tier-hub-coverage-gate.jsonl)             | 全部 519 个高等级组件的 Hub 审核覆盖缺口          |
| [shinkansen-usage-review.jsonl](../../../data/transport/nodes/task-084-b-v2-amendment-review/shinkansen-usage-review.jsonl)                     | 108 个新干线组件逐项定量来源与人工审核状态        |
| [candidate-revision-lineage.jsonl](../../../data/transport/nodes/task-084-b-v2-amendment-review/candidate-revision-lineage.jsonl)               | 本轮候选模式更正及新增记录                        |
| [tier-distributions.jsonl](../../../data/transport/nodes/task-084-b-v2-amendment-review/tier-distributions.jsonl)                               | 模式、运营方家族、运营方及 Hub/component 分布     |
| [manifest.json](../../../data/transport/nodes/task-084-b-v2-amendment-review/manifest.json)                                                     | 校验和、200 条/批回执与不可导入 Gate              |

发现原始记录、全国分页回执与 47 都道府县遍历状态位于 `data/transport/nodes/task-084-b-v2-bus-discovery/`；官方统计事实表位于 `data/transport/nodes/task-084-b-v2-official-evidence/`。

## 可重复执行与验证

```text
python tools/transport/task-084-v2-rail.py --archive <S12-25_GML.zip> --rebuild
python tools/transport/task-084-v2-navitime-discovery.py --cache <public-category-cache>
python tools/transport/task-084-v2-amendment-review.py --rebuild
python tools/transport/task-084-v2-amendment-selftest.py
node --test tests/task-084-v2-amendment.test.mjs
python tools/transport/task-084-v2-amendment-report.py
```

轨道实际批次：200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 28。普通续跑对全部派生文件逐字节比较，遇到不一致先报错；必须显式 --rebuild 才允许刷新。

Exact-head Quality Gate 必须在本轮提交推送后独立核实。本文件不预写 CI 成功，也不随 SHA 变更单独追加追踪提交。

## 当前 Gate

- 7.14 返工中；085/086 未开始且未授权。
- N03/GSI 继续 APPROVAL_REQUIRED；未执行 production join，未写 prefecture/municipality。
- PR 不合并，不标记完成。PR #448 是已合入后撤销质量验收的历史 v1。当前纠错分支未创建新的 PR。
- 下一阶段仍需逐个补齐巴士官方身份/设施/坐标/服务/统计和实体去重、机场当前服务与余下接入资料、全国高等级 Hub 边界与组件审核，以及新干线指标/功能定级。
- PR #444 已于 2026-09-29 合入 develop。当前 Canonical runtime scope 为 Pilot-100，授权记录 100，candidate corpus 未授权。后续 085 应读取执行当时的 manifest。
