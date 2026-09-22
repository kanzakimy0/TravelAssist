# TASK-078-A — AI Planner Action / Replan / Confirmation Runtime

> Issue: #420
> WBS: 6.6 / 6.8 / 6.13 mutation confirmation
> Owner: A
> Priority: P0
> Branch: `codex/a-ai-planner-action-replan`

## Gate

Do not implement until:
- TASK-077-A accepted/merged;
- WBS 4.19 / PR #406 accepted/merged;
- Planner Store/Trip persistence accepted;
- Engine 4.22–4.24 accepted.

## Goal

Connect AI structured decisions to the existing deterministic Planner/Engine mutation boundary.

```text
AI Decision
↓
strict parser
↓
proposal / preview
↓
Engine validate
↓
user confirmation
↓
revision-bound apply
↓
result / audit / UI feedback
```

## Rules

- AI never directly writes Trip.
- Only existing Engine-supported operations may be enabled.
- Unsupported AI operation = fail closed.
- Proposal binds base Trip/Plan revision, exact operation payload/hash and expiry.
- Stale proposal cannot apply.
- User confirmation must be explicit.
- Server authorization remains authoritative.
- No booking/payment/external messaging.

## Acceptance

At least one safe supported Planner mutation can be proposed by AI, previewed, explicitly confirmed and applied through the existing Engine with stale/CAS/idempotency/audit protection. Replan path uses the same boundary. UI shows proposal, confirmation, success/failure truthfully.
