# TASK-035-A — WBS 9.1 Test Framework / Global Baseline Audit and Freeze

- Issue: #265
- Owner: A / Shared Infrastructure / QA
- WBS: 9.1
- Branch: `codex/a-test-baseline-freeze`
- Status: Review
- Depends: 2.9 and 2.10 completed

## Objective

Inventory and normalize the testing surface that already exists. Establish canonical test layers and commands without installing a second framework unless an objectively missing capability cannot be met by the current stack.

## Required work

- inventory all test files, harnesses, scripts and workflows;
- classify unit, contract, integration, DB, browser, E2E and live-provider checks;
- map ownership A, B and shared;
- identify duplicated, orphaned and missing critical checks;
- define canonical npm commands and CI mapping;
- freeze deterministic fixture, test-data, cleanup, Deferred and flaky-test rules;
- tie measured counts and timings to a commit rather than permanent assertions;
- add only the minimal missing smoke or script needed to make the baseline runnable;
- run the canonical baseline end to end where the environment permits.

## Deliverables

- `docs/qa/test-baseline.md`
- minimal canonical script and CI changes
- `docs/tasks/RESULT-TASK-035-a-test-baseline-freeze.md`
- WBS and GitHub tracking updates

## Boundaries

No business behavior changes solely to make tests pass. No fake live-provider, Safari, cloud, browser or database PASS. No unnecessary second test framework. No automatic merge.
