# TASK-031-A — WBS 3.4 Main Login / Avatar Entry Closeout

- Issue: #261
- Owner: A / Website Entry
- WBS: 3.4
- Planned branch: `codex/a-main-account-entry-closeout`
- Status: Ready after TASK-030 is integrated into develop or explicitly chosen as base
- Depends: 3.1, B 5.3 Auth/User Flow
- Serial lane: second of 030 → 031 → 033

## Objective

Close the A-owned presentation/navigation boundary for signed-out login actions and signed-in avatar/Personal Center entry while reusing B-owned Auth/session contracts.

## Required work

- Audit current Header/Home session presentation.
- Signed-out entry resolves to current canonical Auth route; no invented login flow.
- Signed-in avatar resolves to Personal Center via current verified user/session path.
- Loading/unknown session state must avoid unsafe flash or hydration mismatch.
- Auth failure falls back safely without exposing server errors/secrets.
- Keyboard/focus/touch target/mobile behavior.
- Home/Start/Planner/Detail shared header regression.
- Do not move logout, registration, password reset or OAuth business logic into A.

## Boundaries

No Auth schema/core rewrite, no Personal Center redesign, no Home visual redesign, no auto merge.

## Final result rules

Before returning:
- update the task Result;
- update the current Master WBS truthfully;
- synchronize Issue/PR tracking;
- commit and push all task-owned changes;
- report exact commands/tests run and exact Deferred items;
- stop. Do not start the next task automatically.
