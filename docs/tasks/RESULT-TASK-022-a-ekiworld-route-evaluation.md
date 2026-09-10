# TASK-022-A Result

## Status

Completed — the Evaluation/development scope is implemented and ready for
review. This status does not claim production licensing or production routing
readiness.

## Base / Parallel State

- origin/develop: `74bc3cccf8bcfd603706e2b96d4072076191f308`
- TASK-019-A: PR #227 remained Open/Draft and unmerged at final integration;
  nothing was imported.
- TASK-020-A: PR #231 remained Open/Draft and unmerged at final integration;
  nothing was imported.
- TASK-017-B: PR #221 remained Open/Draft and unmerged at final integration;
  nothing was imported.
- TASK-021-A / PR #230: Open/Draft and unmerged; its research documents were
  read-only evidence and were not cherry-picked.

## Development Provider Decision

- Ekiworld provisional/evaluation: Yes; development-only Japanese public
  transit provider.
- production provider frozen: No.
- production licensing gates: price/volume, saved and redisplayed trip data,
  Mapbox mixed display, Web/iOS/Android entitlement, cache/retention, SLA,
  support, and final attribution remain open.

## WBS 7.5 Route Contract

- contract version: `1.0`, owned by TravelAssist under
  `src/shared/contracts/routes`.
- request: origin, destination, waypoints, mode family/modes,
  departure-at/arrival-by, instant plus local date/time/timezone, locale,
  alternatives, and non-invented accessibility/walking placeholders.
- route/alternative: stable IDs, sanitized provider reference, summary,
  duration, distance, departure/arrival, fare, geometry, warnings, notices,
  and source freshness.
- leg/segment/step: explicit ID graph with dangling and duplicate reference
  validation.
- transit metadata: operator, line/route/service/train, stops, platforms,
  direction, destination sign, stop count, fare, reservation, and seat facts.
- time/distance/fare: integer seconds, integer metres, integer minor units and
  ISO currency; missing values are `null`.
- geometry: provider-independent GeoJSON `LineString | null`.
- errors: all required stable error codes, retryability, safe category/message,
  redacted metadata, and diagnostic fingerprint.
- validators: invalid coordinates/units/money/times/version/geometry,
  duplicates, dangling references, and private payload injection.
- fixtures: minimal rail, mixed walk/transit, subway transfer, bus,
  alternatives, known/unknown fare, cross-midnight/timezone, optional-missing,
  future mode, and error cases.

## WBS 7.8 Evaluation Routing

- server service: server-only provider seam with response validation and caller
  AbortSignal support.
- Ekiworld adapter: `EkiworldTransitAdapter`, isolated from public contracts
  and client modules.
- request mapping: official
  `GET /v1/json/search/course/extreme` with `key`, `viaList`, `date`,
  `time`, `searchType`, `sort`, `answerCount`, and
  `resultDetail=addCorporation`.
- normalization: object-or-array compatibility; Point/Line pairing; minutes to
  seconds; 100-metre units to metres; JST to `Asia/Tokyo`; JPY
  Fare/Charge; unknown modes to `other`; raw SerializeData discarded.
- timeout/retry: 100 ms–30 s bounded timeout; at most two retries; only
  timeout/network/5xx/429 retryable; auth/validation/contract/no-route are not.
- evaluation production guard: evaluation fails closed under
  `NODE_ENV=production`; unapproved production entitlement also fails closed.
- cache boundary: canonical key capability only; default persistence
  `none`, TTL `null`; WBS 7.10 was not implemented.
- live smoke: Deferred — no Evaluation credential was exposed to the isolated
  task process and no local `.env.local` existed. Deterministic sanitized
  official-shape fixtures passed.

## Security

- credential committed: No.
- client leakage: source graph and built browser chunks passed checks for
  server routing code, provider endpoint, adapter name, and environment names.
- log redaction: no credential-bearing URL/raw payload is logged or returned;
  diagnostics contain only safe codes/counts and one-way fingerprints.

## Validation

- npm ci: Passed; 395 packages installed, 396 audited, 0 vulnerabilities.
- tests: `npm run test:routing` — 16/16 passed.
- full repository tests: `node --test "tests/*.test.mjs"` — 646/646 passed.
- lint: `npm run lint` — Passed.
- typecheck: `npm run typecheck` — Passed.
- build: `npm run build` — Passed; 23 routes generated.
- format: changed-file Prettier check passed. Full-repository
  `npm run format:check` continues to report 28 pre-existing develop
  documentation files; no TASK-022 file is in that baseline list.
- diff check: `git diff --check` — Passed.
- client bundle boundary: 3/3 checks passed after production build.

## Tracking

- Issue: #232
- Branch: `codex/a-ekiworld-route-evaluation`
- Implementation Commit: `f8855a5`
- Final Head: current head of Draft PR #233 (this metadata-only Result update
  is self-referential; the exact SHA is recorded in Issue #232 and PR #233).
- Draft PR: #233 —
  https://github.com/kanzakimy0/TravelAssist/pull/233
- WBS updated: 7.3 `待确认（开发期 Provisional Provider = 駅すぱあと）`;
  7.5 `待审查`; 7.8
  `待审查（Evaluation/development subset；Production Gate 未关闭）`.

## Production Gate Remaining

- pricing: unresolved.
- usage volume: unresolved.
- saved/re-display rights: unresolved.
- Mapbox mixed-display rights: unresolved; geometry remains `null`.
- Web/iOS/Android rights: unresolved.
- cache/retention: unresolved; no persistent cache is enabled.

## Scope Preserved

- Planner UI: unchanged; no real-route or Mapbox wiring.
- POI: unchanged.
- AI: unchanged.
- Engine: unchanged.
- Booking/Payment: unchanged.

## Ready For Review

Yes.
