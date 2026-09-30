# TASK-084-B v2 ferry tier calibration — provisional

Status: `CALIBRATION_COMPLETE / TERMINAL_TIERING_BLOCKED` (2026-09-29)

## Official population and method

The [MLIT 2024 Port Statistics, Table 2](https://www.mlit.go.jp/k-toukei/R6kowan-datebase.html) supplies annual ship boardings plus landings. The reviewed workbook is [`001974128.xlsx`](https://www.mlit.go.jp/k-toukei/content/001974128.xlsx), SHA256 `9b301a0ad79acb77aa0e4e018fc00319c78eb6bbfa4c25adfb4e8f52fc9a9bef`. We used only `内国航路` rows and verified that every total equals boardings plus landings. We grouped by official port code. This source covers **120 class-A ports with reported domestic passengers**, not every Japanese port or ferry terminal.

The derived [machine-readable distribution](../../../data/transport/nodes/task-084-b-v2-ferry-calibration/domestic-port-passengers-2024.jsonl) is reproducible with `tools/transport/task-084-v2-ferry-calibration.py` and the pinned workbook. No N09 data is used.

| Annual passengers at port | Value |
|---|---:|
| Minimum | 63 |
| 10th percentile | 2,680 |
| 25th percentile | 26,700 |
| Median | 128,538 |
| 75th percentile | 429,355 |
| 90th percentile | 1,075,333 |
| 95th percentile | 1,279,239 |
| Maximum | 4,689,076 |

## Provisional terminal bands

For a **matched passenger terminal with a terminal-specific official annual figure**, proposed bands are T0 ≥1,000,000; T1 250,000–999,999; T2 50,000–249,999; T3 <50,000 when Planner-relevant. These align approximately with the upper decile, upper third, and below-median portions of the observed port distribution. They are calibration guidance, **not assigned levels**.

The port aggregate cannot be copied to a terminal: one port may contain several terminals and operators, and some movements may be cruise or other passenger services rather than the selected ferry. The seven v1 Fukuoka ferry terminals therefore remain `USAGE_DATA_UNAVAILABLE / TERMINAL_TIER_REVIEW_REQUIRED` until an official terminal/operator usage crosswalk is established. The class-A population also excludes many low-volume island gateways; those require operator or municipal figures. No v1 ferry T2 label is carried forward as a v2 decision.
