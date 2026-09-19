# TASK-072-A — WBS 9.11 Performance 最终收口

Issue: #405
WBS: 9.11 — 性能预算 / 错误监控
Owner: A / Shared Infrastructure / Observability
Priority: P2
Publication baseline: `develop@a16ea611b8fb24cfe751615d54a3828f7ef564ca`

## Existing implementation to reuse
- TASK-024-A / Issue #235
- TASK-028-A / Issue #258
- Existing implementation branch: `codex/a-performance-observability`
- Existing Draft PR: #245
- Do not create a replacement runtime or implementation PR.

## Objective
Refresh the existing performance/observability implementation against execution-time latest develop, rebuild a current reproducible performance baseline, revalidate privacy-safe browser/server error observation and workspace lifecycle behavior, and return PR #245 to final-review state.

## Scope
- current develop vs integrated-head production performance comparison;
- Home / Start / Planner / Detail desktop + mobile samples;
- cold-load runs >=3 per scenario;
- TTFB, DCL/load, transfer bytes, JS bytes, LCP, CLS, supported interaction sample, DOM nodes;
- frozen incremental performance budgets;
- compact viewport overflow regression;
- Planner ↔ Detail >=20-cycle lifecycle stress;
- browser/server error classification;
- privacy redaction and sensitive canaries;
- bounded queue / sink-failure behavior;
- disabled-export external request count;
- current repository regression.

## Measurement rules
- latest-develop baseline and integrated-head sample must run on the same machine/browser/build mode;
- bind evidence to commit, browser, viewport, cache mode, network/CPU mode and fixture;
- missing interaction data stays `null` / N/A;
- laboratory metrics are not production RUM p75;
- TBT is not INP;
- fallback Map mode is not live Mapbox performance;
- do not relax budgets or replace the baseline solely to make a regression pass.

## Forbidden scope
- new paid observability vendor;
- production Collector/RUM/alert enablement without separately approved real configuration;
- Session Replay / user behavior analytics;
- raw user/profile/preference/location/trip/provider payload telemetry;
- WBS 9.9 changes;
- a second runtime/PR;
- force push/history rewrite.

## Integration procedure
1. Fetch latest `origin/develop` and existing `origin/codex/a-performance-observability`.
2. Record old PR #245 head and latest develop SHA.
3. Work on the existing implementation branch.
4. Merge latest develop normally.
5. Resolve integration conflicts preserving both current app behavior and the frozen observability/performance semantics.
6. Regenerate latest-develop baseline and integrated-head samples in a controlled matched environment.
7. Push the same branch and update PR #245.

## Acceptance gates
- new unhandled runtime errors: 0;
- 320×740 horizontal overflow: 0;
- frozen performance budget: PASS, or explicit measured Blocked state;
- incremental first-load JS remains within frozen budget;
- Planner/Detail 20-cycle lifecycle: PASS;
- disabled external telemetry requests: 0;
- sensitive canary emitted: 0;
- recursive/sink-failure business impact: 0;
- no false claim of production RUM, alerts, or live provider performance;
- PR #245 reviewable against current develop.

## QA
Use current repository script names. At minimum:
- `npm ci`;
- observability focused tests;
- routing regression;
- Planner/Detail/Store relevant regression;
- production build;
- latest-develop performance baseline;
- integrated-head sample + budget comparison;
- compact viewport regression;
- >=20 workspace lifecycle cycles;
- browser/server error injection;
- privacy/sensitive-canary checks;
- full relevant Node regression;
- `npm run lint`;
- `npm run typecheck`;
- current deploy validate/build/artifact verification gates;
- task-owned formatting;
- `git diff --check`;
- exact final-head hosted GitHub Quality Gate.

No failed or unexecuted gate may be represented as PASS.

## Deliverables
- existing PR #245 updated;
- `docs/tasks/RESULT-TASK-072-a-performance-final-closeout.md`;
- `docs/qa/TASK-072/README.md`;
- machine-readable baseline/head/budget/lifecycle evidence under `docs/qa/TASK-072/`;
- refreshed performance/observability docs where required;
- Master WBS 9.11 status synchronized.

## WBS
Execution start:
`A / 进行中（#405 / TASK-072-A / existing PR #245）`

After implementation + QA:
`A / 待审查（#405 / TASK-072-A；Draft PR #245）`

Only explicit user acceptance plus actual merge may set 9.11 to `已完成`.

## Stop condition
Do not auto-merge. Do not activate external production telemetry. Return a complete TASK-072-A Result for owner review.
