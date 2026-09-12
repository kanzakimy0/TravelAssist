# WBS 2.18 Amendment — Canonical Master Code Registry / Allocation Governance

## Change

在 Shared Infrastructure 下新增：

| WBS ID | 工作项                                                 | Owner | Priority | Dependency    | Status                            |
| ------ | ------------------------------------------------------ | ----- | -------- | ------------- | --------------------------------- |
| 2.18   | Canonical Master Code Registry / Allocation Governance | A     | P0       | 2.6, 2.7, 0.9 | 进行中（TASK-043-A / Issue #311） |

## Rationale

TASK-041 / WBS 4.48 在人工验收中发现：仓库不存在正式的 canonical entity → Master Code allocation registry。

因此 Region Graph 的 50 个 Region 不得继续使用：

- Pilot 临时编号；
- destination ID；
- administrative code；
- country code；
- transport identity；
- 其他旁路 ID。

WBS 2.18 负责建立全局共享治理基础，而不是由 Region Graph 自己拥有编号体系。

## Ownership

A — Shared Infrastructure / Architecture。

依据项目 v0.4 分工：Shared Infra / global architecture 默认 A。

## Dependency / Consumer

主要首个 Consumer：

- TASK-041-A / WBS 4.48 Travel Region Graph Pilot

但 Registry 必须是 generic shared infrastructure，不能写死成 Region-only registry。

## Completion Gate

WBS 2.18 只有在以下条件满足后才能从待审查升级为已完成：

1. repository-wide Master Code audit 完成；
2. canonical registry source 建立；
3. resolver / validator 完成；
4. lifecycle / immutability / no-recycling / supersession tests 通过；
5. 50 Region allocation manifest 完成；
6. shared contract nullable/non-null decision 有明确 Consumer Review 记录；
7. full regression / CI 通过；
8. human review 通过；
9. PR 合入 `develop`。

## Interaction with WBS 4.48

WBS 4.48 保持：

`Partial — Master Code registry blocked`

直到 WBS 2.18 合入后，TASK-041 单独重新集成、验证并重新接受人工审查。

## Non-goals

本 WBS 不包括：

- Candidate Pipeline；
- POI 大规模生产编号；
- Production DB migration；
- Provider ID migration；
- UI；
- 自动重编号；
- 自动 merge PR #306。
