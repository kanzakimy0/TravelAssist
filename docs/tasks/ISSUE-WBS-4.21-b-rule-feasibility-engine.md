# Issue Draft — TASK-WBS-4.21-B

## Summary

实现 TravelAssist Engine 的 Deterministic Rule / Feasibility Engine：item/day/itinerary 规则校验、冲突检查和影响预览。

## Scope

- minimum/recommended/planned duration
- DURATION_TOO_SHORT / COMPRESSED_VISIT
- physical load / fatigue impact with duration/context
- schedule conflict
- DAY_OVERLOADED
- ITINERARY_UNREASONABLE
- unknown/unsupported coverage handling
- deterministic replay

## Boundaries

- 遵守 4.20 / 4.20.1 Contract
- 4.17 canonical Trip Plan 是唯一 Schema
- 43字段仅作为可信输入，不复制进 ChangeSet
- UPDATE_DURATION 未冻结前继续 unsupported
- 不做 DB transaction / persistence / booking/payment / provider live fetch / UI redesign
- 完成后 Draft PR，等待用户验收，不自动启动 4.22
