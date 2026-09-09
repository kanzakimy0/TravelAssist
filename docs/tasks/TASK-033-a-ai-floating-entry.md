# TASK-033-A — WBS 3.5 AI Floating Entry

- Issue: #263
- Owner: A / Website Entry / AI Shell
- WBS: 3.5
- Planned branch: `codex/a-ai-floating-entry`
- Status: Ready after TASK-030 and TASK-031
- Prefer TASK-032 design if available
- Serial lane: third of 030 → 031 → 033

## Objective

Implement the accessible AI floating entry and non-live frontend shell on the current main system. The shell must be explicit about placeholder/offline state until a real AI backend task is separately authorized.

## Acceptance

- floating entry does not overlap CTA, account controls, Planner right rail or Detail bottom actions;
- `aria-expanded`, `aria-controls`, accessible label;
- keyboard open, Escape close, focus enters shell and returns to trigger;
- desktop floating panel and mobile bottom-sheet behavior;
- safe-area handling and 320px minimum viewport;
- no fake AI response presented as live;
- no network request to AI providers;
- Home/Start/Planner/Detail layout regression;
- reduced-motion and browser console/hydration checks;
- full tests/lint/typecheck/build.

## Boundaries

No OpenAI/AI SDK/API, no conversation persistence, no Agent/Tool, no Home redesign, no auto merge.

## Final result rules

Before returning:
- update the task Result;
- update the current Master WBS truthfully;
- synchronize Issue/PR tracking;
- commit and push all task-owned changes;
- report exact commands/tests run and exact Deferred items;
- stop. Do not start the next task automatically.
