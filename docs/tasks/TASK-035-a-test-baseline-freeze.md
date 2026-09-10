# TASK-035-A — WBS 9.1 Test Framework / Global Baseline Audit and Freeze

- Issue: #265
- Owner: A / Shared Infrastructure / QA
- WBS: 9.1
- Planned branch: `codex/a-test-baseline-freeze`
- Status: Ready
- Depends: 2.9 and 2.10 completed

## Objective

Inventory and normalize the testing surface that already exists. Establish canonical test layers and commands without installing a second framework unless an objectively missing capability cannot be met by the current stack.

## Required work

- inventory all test files/harnesses/scripts/workflows;
- classify unit / contract / integration / DB / browser / E2E / live-provider;
- map ownership A/B/shared;
- identify duplicated, orphaned and missing critical checks;
- define canonical npm commands and CI mapping;
- deterministic fixture/test-data rules;
- temporary Auth/DB user cleanup rules;
- environment-required tests and explicit Deferred taxonomy;
- flaky test handling (reproduce/quarantine criteria, never silent skip);
- baseline report tied to a commit, not a permanent hard-coded count;
- add only minimal missing smoke tests/scripts needed to make the baseline runnable;
- run the canonical baseline end-to-end where the environment permits.

## Deliverables

- `docs/qa/test-baseline.md`
- optional minimal script/test changes
- TASK-035 Result and evidence

## Boundaries

No business behavior changes solely to make tests pass; no fake live-provider/Safari/cloud PASS; no unnecessary new test framework; no auto merge.

## Final result rules

Before returning:
- update the task Result;
- update the current Master WBS truthfully;
- synchronize Issue/PR tracking;
- commit and push all task-owned changes;
- report exact commands/tests run and exact Deferred items;
- stop. Do not start the next task automatically.
