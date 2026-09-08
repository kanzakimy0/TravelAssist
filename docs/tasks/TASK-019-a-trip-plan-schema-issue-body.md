# TASK-019-A — WBS 8.5 主系统 Trip Plan Schema

## Status
Ready / 用户已授权今晚直接执行

## Owner
A / Main Travel System / Trip Plan Persistence

## WBS
8.5 / P0

## Dependencies
- WBS 4.17 Trip Plan / Planner Contract = 已完成，PR #216 merged
- WBS 8.1 DB / ORM / Migration Foundation = 已完成，PR #186 merged

## Objective
把已冻结的 `TripPlanSnapshotV1` 落成正式 Supabase PostgreSQL / Drizzle 主系统持久化模型：`trips / trip_plans / trip_days / itinerary_items`，包含 owner-only RLS、revision/CAS、事务性 Contract ↔ DB round-trip、真实 Local Supabase 验收和 generated types。

## Boundary
- 不创建或修改 B 的 `travel_preferences / trip_drafts / trip_preference_snapshots / trip_preference_overrides`。
- TASK-017-B / PR #221 若仍 Draft，不从其分支叠加；若执行期间合入 develop，最终安全整合并重新验收。
- 不实现 Saved Trips 5.18/5.19、Engine 4.20–4.24、POI/Route Schema、AI、Booking/Payment、Planner UI。
- implementation branch: `codex/a-trip-plan-schema`
- final PR: Draft → develop；禁止自动合并。

## Canonical Files
- `docs/tasks/TASK-019-a-trip-plan-schema.md`
- `docs/tasks/CODEX-TASK-019-a-trip-plan-schema-command.md`
- `docs/tasks/RESULT-TASK-019-a-trip-plan-schema.md`
- spec branch: `task/a-trip-plan-schema`

## Acceptance Summary
- SQL migration replay from empty Local Supabase.
- `trips / trip_plans / trip_days / itinerary_items` + indexes/constraints/RLS.
- active plan cannot cross Trip; child rows cannot cross ownership tree.
- trip + plan revision and stale-write rejection.
- server-only typed `TripPlanSnapshotV1 ↔ DB` transaction projection.
- minimum/full/multi-plan/multi-day/alternatives/booking/timezone round-trip.
- two real Auth users: owner CRUD, cross-user denial, anon denial.
- real `db:start/status/reset/types/stop` and generated types.
- full tests, lint, typecheck, build, format/diff checks.
- Result / WBS / Issue / Draft PR synchronized.

Only merge + user acceptance may mark WBS 8.5 completed.
