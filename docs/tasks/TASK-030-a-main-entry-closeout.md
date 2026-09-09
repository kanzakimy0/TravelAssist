# TASK-030-A — WBS 3.3 Main Entry Closeout

- Issue: #260
- Owner: A / Website Entry
- WBS: 3.3
- Planned branch: `codex/a-main-entry-closeout`
- Status: Ready
- Serial lane: first of 030 → 031 → 033

## Objective

Formalize the existing Home primary CTA (`让我们开始吧`) into a production-quality entry to the current Start flow without redesigning the Home or Step 1–5.

## Start with audit

Before editing, trace the current Home CTA, Start routing, guest/auth state, back/forward history, skip-link/focus behavior and Start→Planner transition. If current behavior already satisfies an acceptance item, preserve it and add regression coverage instead of rewriting it.

## Required acceptance

- semantic button/link behavior with no dead `#`;
- single activation under rapid/double click;
- correct URL/history/back-forward behavior;
- focus-visible and sensible focus after navigation;
- guest and signed-in paths follow current product rules;
- Home→Start→Planner smoke;
- Home return does not retain stale Start DOM;
- 1440×900 / 1024×768 / 390×844 / 320×568;
- reduced-motion and keyboard;
- no hydration/console errors;
- full repository tests/lint/typecheck/build plus targeted browser regression.

## Boundaries

No Home visual redesign, no background change, no Step taxonomy change, no Auth-core change, no AI, no auto merge.

## Final result rules

Before returning:
- update the task Result;
- update the current Master WBS truthfully;
- synchronize Issue/PR tracking;
- commit and push all task-owned changes;
- report exact commands/tests run and exact Deferred items;
- stop. Do not start the next task automatically.
