# CODEX — TASK-078-A AI Planner Action/Replan

Do not execute until all TASK-078 gate dependencies are merged/accepted.

Git operations are outside Codex; execute zero Git commands.

Read TASK-078-A, TASK-077 Result, PR #406 final architecture docs, Engine 4.20–4.24 contracts/runtime, Planning AI decision/replan contracts and current Planner Store.

Implement only existing Engine-supported operations. AI proposes; Engine validates/applies. Add explicit confirmation, base-revision binding, stale rejection, audit and UI feedback.

No booking/payment, no unsupported operation expansion, no second Trip/Engine model.

Run focused AI→proposal→preview→confirm→apply tests, stale/two-writer/permission/idempotency regressions, lint/typecheck/build. Report `Git operations not performed by Codex`.
