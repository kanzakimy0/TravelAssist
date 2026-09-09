# TASK-028-A Result

## Status

Partially Completed / 待验收。

The integrated local observability and performance acceptance passed against the latest `origin/develop`. External collector delivery, production RUM p75, real alert delivery and production deployment remain Deferred. The conditional live Mapbox sample was attempted but did not establish a live map in this execution environment, so it is also recorded as Deferred rather than fabricated as passing.

## Tracking

- GitHub Issue: #258（Open）
- WBS: 9.11（待审查）
- Source Task: TASK-024-A / Issue #235
- Latest Develop Baseline: `171900698180b80220017c9c4bec551b72792f27`
- Existing Branch: `codex/a-performance-observability`
- Integrated Acceptance Head: `d9be32a903f87c6096e8c1785e31baa93c7aa11c`
- Acceptance Evidence Commit: `e10df0358eeb646d166812df3c9c679c015764d4`
- Draft PR: #245 — `codex/a-performance-observability` → `develop`
- Worktree: `I:/Users/kanza/OneDrive/文档/ChatGPT/TravelAssist 2/.worktrees/task028-observability`

## Conflict Audit

- Reused the existing branch and Draft PR; no duplicate observability implementation or PR was created.
- The original preview worktree and its untracked `.codex-remote-attachments/` were not modified.
- Latest `origin/develop` merged normally with no conflicts.
- Current Planner, Detail, Home, Start, routing, auth, assets and deployment changes from develop were retained.
- No external collector, production release, secret, paid vendor or public ingest endpoint was added.

## Integrated Acceptance

- The explicit allowlist contract still rejects unknown fields and strips full URL query/fragment data.
- Browser `error` and `unhandledrejection` paths enter the controlled in-memory sink with stable codes only.
- The real Next request-error path enters the controlled server logger with a route template and non-reversible operational identifiers only.
- Raw messages, stacks, Cookie, Authorization, token/key material, database URLs, profile/preference/companion data, exact coordinates, itinerary content, DOM/form text and provider payloads remain excluded.
- Queue capacity, sampling, dedupe, batch bounds, sink timeout, bounded retry and sink-failure isolation remain covered.
- Sink failure does not recursively observe itself and cannot block business operation.
- External observation transmission remains disabled by default; the actual browser error run observed zero external observation requests.
- Root layout remains a Server Component with only the small Web Vitals client boundary.

## Performance Baseline and Budget

Environment: production Next.js build, Node `v24.19.0`, Chrome `152.0.7977.77`, cache disabled, reduced motion, no CPU/network throttling. Home, Start, Planner and Detail were each sampled three times at 1440×900 and 390×844. A separate 320×740 overflow pass and 20 Planner/Detail lifecycle rounds were executed.

| Scenario        | Baseline JS |   Head JS |    Delta | Baseline LCP | Head LCP |
| --------------- | ----------: | --------: | -------: | -----------: | -------: |
| Desktop Home    |   178,401 B | 184,405 B | +6,004 B |        88 ms |    80 ms |
| Desktop Start   |   190,680 B | 196,684 B | +6,004 B |       116 ms |   112 ms |
| Desktop Planner |   253,068 B | 259,072 B | +6,004 B |       208 ms |   220 ms |
| Desktop Detail  |   253,068 B | 259,072 B | +6,004 B |       232 ms |   236 ms |
| Mobile Home     |   178,401 B | 184,405 B | +6,004 B |        88 ms |    76 ms |
| Mobile Start    |   190,680 B | 196,684 B | +6,004 B |       108 ms |   116 ms |
| Mobile Planner  |   253,068 B | 259,072 B | +6,004 B |       140 ms |   132 ms |
| Mobile Detail   |   253,068 B | 259,072 B | +6,004 B |       152 ms |   156 ms |

- Performance budget: PASS; every JS delta is below `max(20 KiB, baseline × 5%)`.
- Laboratory elapsed-time regression gate: PASS.
- New runtime errors relative to the baseline: 0.
- CLS: 0 except the unchanged Desktop Planner value of approximately 0.0026.
- INP: 16 ms samples were observed for Desktop and Mobile Detail; unsupported/unobserved scenarios remain `N/A`, never zero or substituted with TBT.
- 320×740: no horizontal overflow on Home, Start, Planner or Detail.
- Planner ↔ Detail lifecycle: 20/20 rounds completed; DOM nodes were 665 at both first and final samples, and no fallback Mapbox canvas existed.
- Heap values are retained only as laboratory trend data and do not claim proof that every memory leak is absent.

Evidence:

- `docs/qa/task-024/baseline.json`
- `docs/qa/task-024/head.json`
- `docs/qa/task-024/budget.json`
- `docs/qa/task-024/observability-runtime.json`
- `docs/qa/task-024/mapbox.json`

## Browser and Server Error Evidence

- Real browser `ErrorEvent`: PASS and sanitized into the local sink.
- Real browser unhandled `AbortError`: PASS and retained as expected cancellation / info.
- Real Next request-error route: PASS and emitted one safe server event without raw request, message or stack in the observation payload.
- External observation requests: 0.
- The fixed test error remains gated by `TASK_024_FAULT_INJECTION=1`; its production default is fail-closed.

## Live Mapbox Conditional Sample

Deferred after an actual attempt. An existing locally authorized public token was injected only into a temporary build environment and was not committed or copied to evidence. The live engine did not initialize: after the bounded wait, the page moved to the operable fallback with zero page errors, two console errors and one failed external request. The request URL and credential-bearing details were deliberately not recorded.

The repository was rebuilt without the token after the attempt, proving the final production build does not require live Mapbox configuration.

## Validation

- `npm ci`: PASS; 395 packages installed, 0 vulnerabilities reported.
- `npm run test:observability`: PASS (10/10).
- `npm run test:routing`: PASS (28/28).
- `node --test "tests/*.test.mjs"`: 716/719 PASS; three failures reproduce unchanged on `origin/develop@1719006`.
- Baseline reproduction of the three failures: PASS as a comparison; same asset inventory/nightly failures and same existing extensionless `route-color` import failure.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS after the production build refreshed stale pre-merge `.next/types`; the initial stale generated-type failure is retained in this report and was not hidden.
- `npm run build`: PASS with the token absent in the final build.
- `npm run qa:performance:budget`: PASS.
- Repository-wide `npm run format:check`: 31 pre-existing failures; the exact same 31 files fail on `origin/develop`.
- Changed-file Prettier check: PASS.
- `git diff --check`: PASS.

## Pre-existing Repository Debt

The full suite is not claimed as green. The exact latest develop baseline and the integrated branch both fail the same three tests:

1. Asset nightly verify-only reports the current catalog as stale.
2. Asset library validation reports four stale legacy design SVG inventory entries.
3. The coral palette test cannot resolve the existing extensionless `route-color` import from `map-provider.ts` under the direct Node ESM runner.

These files and failures are outside the TASK-028 observability closeout. No filter, baseline rewrite or unrelated code fix was added to hide them.

## WBS Update

WBS 9.11 remains `待审查` and now references TASK-028-A / Issue #258 / Draft PR #245. This status covers the accepted local subset only. It must not become `已完成` before explicit user acceptance and merge into `develop`, and it does not imply that online collection or alerts exist.

## Deferred and Known Limitations

- External collector selection, retention, access control and transmission.
- Production RUM p75 and real-user distribution.
- Alert rules, alert delivery and production deployment.
- Successful live Mapbox performance sample in this execution environment.
- Laboratory Chrome measurements are not production telemetry.
- Fallback lifecycle tests do not substitute for a successful live Mapbox lifecycle run.

## Manual Acceptance

Review Draft PR #245, the event allowlist, fail-closed fault route, current baseline/head/budget evidence, the explicit baseline debt comparison and the Mapbox Deferred evidence. No external transmission must be enabled for acceptance of this local foundation.
