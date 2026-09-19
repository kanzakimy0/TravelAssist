# WBS 4.23 Acceptance Closeout — TASK-064-B

## Decision

Effective 2026-09-17, the user explicitly accepted **TASK-064-B / WBS 4.23 — Runtime事件 / 局部重算 / 回滚契约** and authorized merge of PR #384.

## Current authoritative state

- WBS: `4.23 — Runtime事件 / 局部重算 / 回滚契约`
- Owner: **B**
- Status: **已完成**
- Task: `TASK-064-B`
- Issue: `#383`
- Accepted implementation head: `436521dec35cb12f569d4646f4bd41ac306f5dd3`
- Accepted exact-head Quality Gate: `35167240929` — PASS
- Merge PR: `#384`
- Merge commit: `5084b011f8bd1da4f9f9795b32aec681ffa0b7c7`
- Merge method: normal merge
- Merge tree: identical to accepted head tree `38fe67f36c7e52a8cf3bc1471c97ed26ca59a78c`

## Accepted scope

The accepted implementation includes:

1. server-only local consumption of accepted Engine outbox events;
2. multi-worker-safe claim / lease / retry / fencing semantics;
3. current-authoritative-state recompute through the existing 4.21 deterministic rules;
4. Route fact consumption only through the accepted WBS 7.5 contract boundary;
5. minimal reversible preimage capture for `UPDATE_TIME` and `REORDER_ITEMS`;
6. compensating rollback through a new forward ChangeSet and current revisions;
7. original receipt/audit immutability;
8. rollback idempotency, concurrency protection and state-drift rejection;
9. additive runtime/compensation persistence with no historical migration rewrites;
10. Local DB/Auth/concurrency/account-deletion regression acceptance and exact-head GitHub CI.

## Boundaries preserved

This completion does **not** start or complete WBS 4.24.

It also does not change the status of:

- WBS 7.3 Production Route Provider selection;
- WBS 7.8 Production Route API gate;
- unsupported Engine operation families;
- confirmation grants;
- AI/system/provider_event apply;
- Booking/Payment side effects;
- production worker/cron/broker deployment.

## Master WBS synchronization rule

Where `docs/project/WBS-TravelAssist.md` still shows WBS 4.23 as `未开始`, `进行中` or `待审查`, that entry is stale after this acceptance and merge. It must be mechanically interpreted/synchronized to:

```text
4.23 | Runtime事件 / 局部重算 / 回滚契约 | B | P1 | 4.22,7.5 | 已完成（TASK-064-B 用户验收；PR #384 merged）
```

The current Task tracking row must likewise be interpreted as:

```text
TASK-064-B | 4.23 | B | 已完成（用户验收；PR #384 已合并） | #383 Closed / Completed
```

Historical execution-time records that say Draft / Open / 待审查 remain valid historical snapshots and must not be rewritten as if they were wrong at the time.

## Next-stage rule

WBS 4.24 remains **未开始** until a separate explicit Task is created. This closeout does not authorize automatic implementation of 4.24.
