# TASK-084-B 结果总表（供 A 查阅）

> **当前状态（2026-09-30）：v2 纠错成果物已获用户验收并合入 develop，WBS 7.14 已完成。** 请以 [v2 验收收口与完整 Excel](RESULT-TASK-084-b-v2-user-acceptance-closeout.md) 为准。以下内容是历史 v1 记录，其全国 Master PASS 已在返工时撤销，不作为当前可导入数据。

**截至 2026-09-29：MERGED / PASS。** 本文件是已完成的 B 离线数据任务的只读交接清单，不新增 A 的执行事项。详细定义见[原始 Task](TASK-084-b-japan-transport-node-master.md)和[最终收口 Amendment](AMENDMENT-TASK-084-b-final-closeout.md)；逐项证据见[Result](RESULT-TASK-084-b-japan-transport-node-master.md)及[QA](../qa/TASK-084-B/README.md)。

## 1. 合并与跟踪

| 项目                                                                | 最终结果                                                                                     |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| TASK-084-B / WBS 7.14                                               | 全国规划骨架 **PASS / 已完成**                                                               |
| [PR #448](https://github.com/kanzakimy0/TravelAssist/pull/448)      | MERGED；合并前 head `de3fa9dd7f11c391678b2fdbc792a3753267182d`                               |
| 精确 head Quality Gate                                              | [#36564684778](https://github.com/kanzakimy0/TravelAssist/actions/runs/36564684778)：SUCCESS |
| normal merge commit                                                 | `e3fdef378615f29eb41e6221d3fd46e2e87ac545`；两个父提交，已进入 develop                       |
| 合并后文档收口                                                      | `aa175c80b9489eaece9843e1dd514815c64a7528`；WBS 7.14、Result、QA 已同步                      |
| [Issue #441](https://github.com/kanzakimy0/TravelAssist/issues/441) | CLOSED / COMPLETED                                                                           |
| TASK-085-B / TASK-086-B                                             | 均未在 TASK-084-B 中启动                                                                     |

## 2. 已交付数据

| 指标                            |                           结果 |
| ------------------------------- | -----------------------------: |
| `NODE_ACCEPTED` TransportNodes  |                        **244** |
| TransportHubs                   |         **21**（T0 10、T1 11） |
| TransportNode T0 / T1 / T2 / T3 |           **8 / 40 / 196 / 0** |
| 新干线站组件                    |                            110 |
| 普通铁路站                      |                             40 |
| 地铁站                          |                             20 |
| 私铁站                          |                              9 |
| 机场                            |                             47 |
| 主要巴士终端                    |                              5 |
| 渡船网关                        |                              7 |
| 旅游登山缆车站                  |                              6 |
| 实际批次                        | **200 + 44**；均有回执和校验和 |

Hub 状态：`ACCEPTED=85`、`HUB_REVIEW_REQUIRED=80`、`SELF_GATEWAY=79`、`NOT_APPLICABLE=0`、`UNRESOLVED=0`。80 条待审记录保留显式证据和原因；原始验收要求关系可表达，未要求每个组件立即取得父 Hub。既有 110 个节点 ID 和 5 个 Hub ID 均保持不变。

## 3. 原始 Acceptance 逐项判定

| 原始 §16 条件                        | 结论                 | 核心证据                                                                                 |
| ------------------------------------ | -------------------- | ---------------------------------------------------------------------------------------- |
| 全国规划骨架所需 T0/T1 节点          | PASS                 | 8 个 T0、40 个 T1；新干线骨架、21 个铁路换乘 Hub，以及机场、巴士、渡船和旅游特殊交通能力 |
| TransportNode 与 POI 身份分离        | PASS                 | 独立 ID 命名空间；与当前 runtime 授权的 Canonical POI ID、Master Code 进行冲突检查       |
| identity 可追溯                      | PASS                 | 8 份 accepted 节点身份账本；244/244 记录能追溯来源及接受时间                             |
| IDs deterministic 且 accepted 后不变 | PASS                 | 原始账本哈希锁定、各阶段账本集合校验；无 ID 重新分配                                     |
| hub/stop 关系可表达                  | PASS                 | 85 个显式父 Hub；80 个需复核、79 个独立网关均有明确状态；禁止同名或距离自动合并          |
| 200/batch 可恢复                     | PASS                 | 200+44 两批；resume、单批重跑、校验和复算、损坏回执拒绝均通过                            |
| accepted provenance 完整             | PASS                 | `sourceRefs`、外部引用、坐标角色和 `generatedAt` 均为 244/244；运营方引用为 197/244      |
| 动态数据未冒充静态数据               | PASS                 | 未持久化实时班次、票价、延误或运营状态；机场坐标注明历史参考点角色和日期                 |
| 未修改 A Route/Planner runtime       | PASS                 | B 的实现限定在离线 TransportNode 数据、生成器、测试和跟踪文档                            |
| WBS / Result / QA 同步               | PASS                 | develop 中 WBS 7.14 已完成；Result 与 QA 记录相同的 PASS 和延期边界                      |
| PR review 与合并门受控               | PASS（执行偏差见下） | 最终精确 head Quality Gate 成功、无阻塞 review thread、结果为 normal two-parent merge    |

`generatedAt` 的原有缺口为 134 条；已逐条从不可变 identity ledger 的 `acceptedAt` 确定性回填。最终 **244/244** 存在且一致，重建结果稳定，未改节点 ID 或来源引用。[机器 manifest](../../data/transport/nodes/task-084-b-national-master/manifest.json)记录 `nationalMasterStatus=PASS`。

## 4. 来源、权限与明确延期

| 范围                                   | 最终判定                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 已持久化节点来源                       | N02、C28／航空局、福冈市营渡船、长崎县交通局 GTFS 及官方运营方资料；244/244 有 `sourceRefs`，许可与来源校验通过          |
| N09、Shimoden 受限来源                 | 未进入 accepted master                                                                                                   |
| N03/GSI 行政区派生                     | `APPROVAL_REQUIRED`；`productionJoinAllowed=false`、`formalGsiConfirmationOnFile=false`；未导入 polygon、未执行生产 join |
| 行政区状态                             | prefecture 0/244、municipality 0/244；全部 244 条显式 `UNRESOLVED`，归入 `DEFERRED_ADMINISTRATIVE_ENRICHMENT`            |
| 更多地方巴士、岛屿渡船、ropeway 等覆盖 | `DEFERRED_PLANNER_EXPANSION`；不改变本次全国规划骨架 PASS                                                                |

## 5. QA 与下游边界

本地 `npm ci`、Python **13/13**、POI Edge Graph **15/15**、Routing **28/28**、lint（0 错误）、typecheck、production build、CI 格式检查、确定性重建、批次重跑、损坏回执拒绝、secret pattern scan 和 `git diff --check` 均通过。最终精确 head 的 GitHub Quality Gate 也为 SUCCESS。当前离线主库的 runtime integration 标记为 `DEFERRED_TO_A`，本交接不要求 A 在 TASK-084-B 中追加开发。

TASK-085-B 与 TASK-086-B 仍是各自独立的后续任务。085 执行时应读取**当时**正式 runtime 授权 manifest，只使用其授权集合；当前 Pilot-100 授权 100 条 Canonical POI，candidate corpus 未授权。此处的 100 是当前状态，不是永久语料数量常量。

**合并执行记录：**精确 head Gate 成功后，PR 从 Draft 切换为 Ready for Review；仓库 GitHub Actions 随即抢先执行了 normal merge。因此合并满足精确 head 与 normal two-parent 结果，但未由执行代理发出计划中的带 expected SHA 手动 merge 命令。该偏差是 PR 自动化时序问题，不归因于 A。
