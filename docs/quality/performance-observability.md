# Performance and Observability Baseline

Status: TASK-024-A local foundation implemented; external collector, alert delivery,
real-user percentiles, and production rollout are deferred.

## Boundaries

TravelAssist observes operational health, not user behavior. The client keeps a
maximum of 32 sanitized events in memory and sends no observation request. The
server writes controlled JSON to its local runtime logger. There is no collector
URL, browser token, session replay, persistent visitor identifier, or public
ingestion endpoint.

Never add Cookie, Authorization, API keys, database URLs, full URLs, query or
fragment values, email, phone, profile fields, preferences, companion details,
precise coordinates, itinerary content, DOM text, form values, provider payloads,
raw request/response objects, `error.message`, or stack traces to an event. The
allowlist validator rejects unknown fields. Unknown diagnostics are reduced to a
type/shape summary.

## Event contract

`ObservationEventV1` contains only:

- schema version, event type, source, stable category/severity/code;
- environment and a format-checked release SHA;
- a route template without query or fragment;
- a short random correlation ID and non-reversible operational fingerprint;
- bounded count and optional duration bucket;
- for Web Vitals only: supported metric name, numeric value, and rating.

Cancellation and validation are expected outcomes, not unexpected incidents.
Browser errors, unhandled rejections, Next request errors, and Web Vitals enter
the same contract. The Next root layout remains a Server Component; only the tiny
Web Vitals observer is a Client Component.

## Reliability controls

The in-memory queue has a 32-event client / 64-event server capacity, eight-event
batch maximum, sampling, a 60-second fingerprint dedupe window, bounded retries,
sink timeouts, and explicit drop/failure counters. Sink errors are swallowed at
the observation boundary and never recursively observed. Browser listeners are
removed on cleanup/page hide. Disabling observation requires removing the two
instrumentation hooks; no business state or saved trip data depends on them.

The controlled server fault route returns 404 unless
`TASK_024_FAULT_INJECTION=1` is explicitly set for local QA. Never set it in a
deployed environment. The route contains no user input and its error text is a
fixed safe test value.

## Performance method and budgets

Run the production build and server, then run:

```text
npm run qa:performance
npm run qa:performance:budget
```

The checked-in base is `develop@e74904830cbf8e6745b2013b2888e38984ccf96d`.
Home, Start, Planner, and Detail are measured at 1440×900 and 390×844, three
fresh cache-disabled contexts per cold scenario. A 320×740 overflow pass and 20
Planner/Detail lifecycle rounds are separate gates. The 1/3/7-day,
10/50/200-node fixtures under `tests/fixtures/` are synthetic scale fixtures and
are not product data.

Budgets:

- fixed-scenario first-load JavaScript must not grow by more than the larger of
  20 KiB or 5% of base;
- a laboratory elapsed median increase fails only when both greater than 15%
  and greater than 100 ms;
- new unhandled errors and sensitive event fields: zero;
- 20 lifecycle rounds: no extra live map canvas and no unbounded DOM growth;
- LCP 2.5 s, INP 200 ms, and CLS 0.1 are laboratory reference lines. They are
  Core Web Vitals “good” thresholds only for real-user p75 evaluation.

Do not substitute TBT for INP. A missing interaction sample is `N/A`, not zero.
Do not silently update the base to hide a failure. Reproduce a noisy elapsed
failure once, then optimize or request an explicit review.

## Current evidence and limitations

- Baseline and head reports: `docs/qa/task-024/`.
- Fallback map only: no credential was copied into the isolated worktree. Real
  Mapbox performance remains deferred.
- The baseline and head each observed one generic resource 404 console event on
  Home. It is recorded as existing baseline debt, not filtered out.
- Laboratory Chrome metrics and heap trends are not online monitoring, not
  real-user p75, and cannot prove the absence of every memory leak.
- External collector selection, retention, access control, alert routing, and
  delivery tests require separate approval and deployment work.

## Triage and rollback

For a controlled event, search by release, route template, source, stable code,
and short correlation ID. Do not request raw user payloads. Confirm whether the
event is expected cancellation/validation, availability, or an unexpected error.
If the observer itself causes trouble, remove the instrumentation imports and
rebuild; client collection is otherwise memory-only and server reporting has no
business transaction dependency.
