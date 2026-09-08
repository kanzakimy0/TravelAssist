# TASK-WBS-4.17-A — Trip Plan / Planner Contract

## Metadata

- Owner: A (Producer); B is Consumer / Integration Reviewer.
- Status: 待验收（公开契约实现完成；B/集成审查及冻结尚待完成）
- WBS: 4.17; related 4.15 / 4.16 / 5.18 / 8.5.
- GitHub Issue: #215; unblocks #207 only after reviewed freeze and merge.
- Branch: `codex/a-trip-plan-contract` (avoids automatic feature-branch merge).
- Base: `39890af8c2ed137712b90f3f9d2bfdef313cfef6`.
- Depends On: merged contract-handoff rules; existing 4.15/4.16 local core audited, full server implementation still incomplete.
- Commit / Pull Request: PENDING.
- Authorization: user explicitly authorized A contract execution, gated merge, then TASK-017-B continuation on 2026-09-08.

## Scope

Publish a standalone versioned public contract for Trip Draft input/progress and Trip / Plan / Day / Item snapshot exchange. This is an additive proposed v1 contract, not SQL design or a replacement Planner Store. Include runtime validation, examples, Consumer-safe summary/resume projection, field mapping and negative/integration tests. Canonical source: `src/shared/contracts/trips/`.

Read README, CONTRIBUTING, docs index, task tracking, cross-module-contract-handoff, trip-plan-data-ai-takeover, TASK-017 command/task, current start-flow/planner models, Trip Library and Master WBS. Historical UI/Mock results are not server persistence evidence.

## Acceptance / Review Gate

1. Stable opaque IDs, local dates versus instants, timezone, minor currency units and null/empty/unknown semantics are explicit.
2. Trip facts and progress contain neither long-term preferences nor provider/Mapbox/React/DB state. B owns Preference versioned snapshots and overrides.
3. Snapshot supports multiple plans, dated days, scheduled/alternative items, unknown enums, independent booking/assessment/lock semantics; missing facts are not fabricated.
4. Validators reject invalid and dangling references, duplicates, malformed dates/times/coordinates/amounts, unknown versions and private extra fields.
5. Minimum/full/boundary fixtures and tests cover Consumer summary/resume contracts and the Step draft boundary; no claims of deployed runtime/DB integrations.
6. Run npm ci, all existing Node tests, lint, typecheck, build, new-file Prettier and diff checks. Record full-format baseline failures without unrelated edits.
7. B or designated integration reviewer reviews concrete contract and 4.15/4.16 partial-runtime boundary before freeze and merge. User merge authorization does not fabricate this review.
8. Only reviewed and merged contract can make 4.17 dependable for TASK-017. Preserve #207 Blocked until then; no cherry-picking.

## Non-goals

No UI edits or silent migration of existing local saves, no itinerary/day/item tables, no Auth, Preference Master, Companion Master, AI, Provider, Booking/Payment integration or Engine implementation. Do not mark 4.15/4.16/8.5 completed. Future public persistence APIs 5.19 and runtime adapters 4.19 remain separate work.

## Result

Status / Tracking / Contract / Mapping / Validation / Review Gate / Files / Next Gate.
