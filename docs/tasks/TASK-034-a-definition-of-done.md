# TASK-034-A — WBS 0.6 Definition of Done

- Issue: #264
- Owner: A / Project Governance
- WBS: 0.6
- Planned branch: `docs/a-definition-of-done`
- Status: Ready
- Type: Governance specification

## Objective

Create a single repository-wide Definition of Done that makes future Codex results auditable and prevents Partial/Deferred/Mock/local evidence from being mislabeled as production completion.

## Required sections

- status definitions and transitions;
- design-only DoD;
- frontend/runtime DoD;
- shared Contract/schema DoD;
- database/migration/RLS DoD;
- Provider/live-integration DoD;
- AI DoD;
- security/privacy DoD;
- performance/observability DoD;
- browser/accessibility/responsive DoD;
- CI/deployment DoD;
- evidence retention and Result format;
- baseline debt vs new regression;
- explicit Deferred/Blocked/Partial rules;
- merge + user acceptance requirement for `已完成`;
- A/B ownership and cross-module handoff rule;
- prohibited evidence claims.

## Deliverables

- `docs/development/definition-of-done.md`
- reusable acceptance checklist
- TASK-034 Result

## Boundaries

No runtime/workflow permission changes, no mass status rewrite of historical tasks.

## Final result rules

Before returning:
- update the task Result;
- update the current Master WBS truthfully;
- synchronize Issue/PR tracking;
- commit and push all task-owned changes;
- report exact commands/tests run and exact Deferred items;
- stop. Do not start the next task automatically.
