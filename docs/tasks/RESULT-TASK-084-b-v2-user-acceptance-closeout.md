# TASK-084-B v2 用户验收与合并收口

日期：2026-09-30。Owner：B。WBS 7.14：**已完成**。

## 用户验收依据

用户在交付完整 23 页 Excel、三项补查结论及明确未通过项后，回复：

> 这个被接受了，你可以merge到develop并关闭wbs了

验收对应交付 head `a25ebb928bb1fc8017d8d9e5c050d717ff5b118b`。本次记录用户对当前纠错成果物的接收和 WBS 收口；尚未取得的来源权利、逐组件正式接收和下游机器门禁继续按实际证据判断。

## 合并证据

| 项目 | 结果 |
| --- | --- |
| 原纠错分支 | `fix/b-task-084-transport-master-rework` |
| develop 合并前 | `c4f00b8d0ffe553a19eaa6086e8c0b1e9d2aec5c` |
| 整合后测试 head | `838b50d42b8bb0033b2b50d9beb708cdbd57da29` |
| 整合 Quality Gate | [36674291171](https://github.com/kanzakimy0/TravelAssist/actions/runs/36674291171) SUCCESS |
| normal merge | `db65eedd403ba9d3ee107772bb3385794b78c019`；两个父提交；文件树等于已测试整合 head |
| PR | 继续遵守此前不新建 PR 的约束，直接普通合并；#448 仅为历史 v1 |
| Issue | [#441](https://github.com/kanzakimy0/TravelAssist/issues/441)，按本次验收关闭 |

## 当前成果物

- [完整 Excel（23 页）](../../outputs/01a0e791-6e7b-71e2-9d79-cf7b4009cfa4/TASK-084-B-deliverables.xlsx)：原交付内容逐字节发布到既有仓库入口，SHA256 `bb23245c80932fd9fb652527acabbecd80b3b529ab9410dfca7c0385e0ebf27f`。
- [逐条审核成果](../qa/TASK-084-B/TRANSPORT-MASTER-V2-AMENDMENT-REVIEW.md)：2,271 个轨道候选、261 个 Hub 范围、582 个期望组件；机场 97 个身份完整保留、86 个达到年度门槛；巴士 212 条跨来源记录，含 NAVITIME 191 条。
- 武藏小杉 JR 归组和原 15 处边界补证完成；原 269 个高等级缺口中，45 个补入官方 Hub 范围，224 个仍待核。大阪保持 52 个范围。
- [机器可读验收记录](../qa/TASK-084-B/v2-user-acceptance-closeout.json)关联用户指令、提交、CI、manifest 和 Excel 哈希。

## 保留的数据门禁和后续事项

| 项目 | 本次收口后的事实 |
| --- | --- |
| 用户验收 / WBS | 已接收当前 v2 纠错成果物；7.14 已完成 |
| 已交付审核 manifest | 原字节和统计完整保留；`nationalMasterStatus=REWORK_IN_PROGRESS`、`nationalMasterPass=false` |
| runtime 正式接收 | `runtimeImportAuthorized=false`；正式 v2 接收节点 0，不把候选批量改为 ACCEPT |
| N03/GSI | `APPROVAL_REQUIRED`；没有书面批准证据；未运行生产 join 或行政区赋值 |
| 仍需证据 | 224 个高等级 Hub 范围、巴士完整字段与去重、48 个机场接入指南、60 个新干线人工定级、广岛迁站几何 |
| TASK-085/086 | 未启动；机器下游授权仍为 false；后续执行前须满足对应数据 Gate |
| Canonical 输入 | 085 执行时读取当时正式 runtime manifest；不得使用候选语料或永久硬编码 100 |

早期文档中的返工状态是交付时的数据审核快照；历史 244-node v1 的 PASS/验收结论仍已撤销。本次用户验收不恢复被否决的 v1，也不把缺失证据写成已通过。
