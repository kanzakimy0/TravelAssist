# Route / Transit Provider Selection — TASK-021-A

## Decision and evidence boundary

- Status: **Blocked / 待确认**. WBS 7.3 is not frozen; 7.5 and 7.8 remain **未开始**.
- Research date: **2026-09-09, Asia/Tokyo**. URLs below were checked online on this date; published versions are identified separately.
- Issue: [#229](https://github.com/kanzakimy0/TravelAssist/issues/229).
- Base: `origin/develop@74bc3cccf8bcfd603706e2b96d4072076191f308`.
- Specification: [TASK-021-A](https://github.com/kanzakimy0/TravelAssist/blob/bbe077a22d5b57fe0752a868d5b135c57454fc77/docs/tasks/TASK-021-a-route-system-mainline.md), with its companion Codex command at the same spec commit.
- Method: current official API documentation, country exceptions, pricing and terms. No consumer-app behavior, model memory or third-party pricing was accepted as coverage evidence. No paid API calls, account creation, supplier contact, contract acceptance or secret access.
- “Supported” below means documented capability, **not a live Japan smoke PASS**. “Unverified” is not “unsupported.” Marketing coverage is not purchased entitlement.
- Legal findings are implementation risk flags, not a substitute for the applicable signed agreement and legal review.

**结论：不能自动选定 Provider。** Google 明确排除日本 Transit；HERE 日本步行/骑行不支持，Transit 日本班次覆盖未确认；Mapbox 无 Transit profile。NAVITIME 是值得进一步询价的日本交通候选，但不能把平均时间套餐当作时刻表套餐，也不能默认获准将其数据长期保存、混合显示在 Mapbox 或用于未来手机助手。

## Existing repository boundary

| Inspected area                 | Actual develop behavior / consequence                                                                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Planner transport and timeline | `src/features/planner/model/planner-route.ts` uses local mode, manual/estimated minutes, buffer and connection invalidation. Existing visual modes do not prove any provider supports them.                        |
| Map lifecycle                  | `src/features/planner/map/map-provider.ts` owns a single Mapbox map with three GeoJSON collections and source updates. The style is `light-v11`; routes are local data, not Directions results.                    |
| Fallback / credentials         | Map shell has an interactive schematic fallback. `NEXT_PUBLIC_MAPBOX_TOKEN` is for browser map display, not permission to expose a server route credential.                                                        |
| Prior acceptance               | 7.1 `RESULT-TASK-008.1-a-planner-mapbox-interactions.md` and 7.12 `RESULT-planner-local-integration.md` verify maps/local interaction, not live route calculation.                                                 |
| Trip contract                  | All files under `src/shared/contracts/trips/` were inspected: versioned snapshot, validators, synthetic fixtures; no frozen Route contract or route persistence hook. No Trip schema or B-owned data changes here. |
| Server conventions             | Existing Auth route handlers delegate to server modules; Supabase server client uses `server-only`. No existing production routing adapter was found.                                                              |
| Ownership / tracking           | CONTRIBUTING, AGENTS, task-tracking, Master WBS, cross-module handoff, trip-plan-data-ai-takeover, env example and setup guide reviewed. 4.7 prerequisite is satisfied as local transport UI, not live API.        |
| Scope                          | No Planner/Detail/Start/Personal Center edits, no 8.5 hook, no POI, Engine, AI, booking or complete cache/failover implementation.                                                                                 |

## 1. Capability matrix

### Mapbox

| Requirement                    | Official finding                                                                                                                                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product / version              | Directions API **v5**, REST; Navigation changelog remains active. [M1][M1], [M2][M2]                                                                                                                                                                       |
| Japan coverage                 | Japan navigation offering describes local road-data integration. This supports evaluation of road routing, not a nationwide quality guarantee. Walking/cycling country-level completeness and Japan traffic coverage remain unverified. [M3][M3], [M4][M4] |
| Modes / public transit         | Four profiles: driving, driving-traffic, walking, cycling. **No rail/subway/bus timetable transit profile**. [M1][M1]                                                                                                                                      |
| Time / multimodal              | Driving depart/arrive options; traffic profile has departure prediction. These are road timing, not scheduled transfers. [M1][M1]                                                                                                                          |
| Waypoints / alternatives       | 2–25 coordinates; alternatives supported, availability route-dependent. Do not promise a fixed count. [M1][M1]                                                                                                                                             |
| Traffic / incidents            | Traffic-aware profile and incident information; static driving fallback where traffic coverage is absent. Japan-specific completeness unverified. [M1][M1], [M4][M4]                                                                                       |
| Geometry / units               | GeoJSON, polyline or polyline6; route/legs/steps; meters and seconds. [M1][M1]                                                                                                                                                                             |
| Transit / fare / accessibility | No transit line, agency, station or transit fare contract. No verified wheelchair routing guarantee. [M1][M1]                                                                                                                                              |
| Server / Web / Mobile          | REST can be called from a server; Web/Mobile map and Navigation SDK billing are separate. Public/secret token scopes and URL restrictions exist; server deployment restriction policy still requires selection. [M5][M5], [M6][M6]                         |

### Google Maps Platform

| Requirement                       | Official finding                                                                                                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product / version                 | Routes API, Compute Routes **v2**. General TRANSIT capabilities below do not establish Japan availability. [G1][G1]                                                                           |
| Japan walking / driving / cycling | Official country table marks driving and walking available; cycling is not marked available. Transit is not covered by that table. [G2][G2]                                                   |
| Japan rail / subway / bus         | **FAIL:** official FAQ excludes partners in Japan from Routes API transit support. Google Maps consumer transit cannot be substituted as evidence. FAQ update shown: 2026-09-01 UTC. [G3][G3] |
| Departure / arrival / multimodal  | Globally, TRANSIT supports departure or arrival, walking transfers and transit preferences; past 7 / future 100-day query window. [G1][G1]                                                    |
| Waypoints / alternatives          | TRANSIT does not support intermediate waypoints; up to three additional alternatives. Non-transit allows up to 25 intermediates, with SKU effects. [G1][G1], [G4][G4]                         |
| Traffic / incidents               | Road traffic features depend on routing preference/SKU. A Japan incident-feed entitlement was not verified; no separate traffic API selected. [G4][G4]                                        |
| Geometry / units                  | Encoded polyline, legs/steps, distance meters and duration; transit adds scheduled times. [G1][G1]                                                                                            |
| Fare / line / agency / station    | Global transit response provides line, agency and stop metadata; fare may be absent if full fare information is unavailable. Japan remains excluded. [G1][G1]                                 |
| Accessibility                     | No Japan wheelchair route guarantee verified.                                                                                                                                                 |
| Server / Web / Mobile / key       | Server web service; API plus application restrictions should match deployment (IP restrictions for server keys). This does not override map display restrictions. [G5][G5]                    |

### HERE

| Requirement                       | Official finding                                                                                                                                                                                                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product / version                 | Routing API **v8**, Public Transit API **v8**, with separate Intermodal product. [H1][H1], [H2][H2]                                                                                                                                                                                      |
| Japan walking / driving / cycling | Japan country exceptions explicitly exclude pedestrian and bicycle routing. Car routing has Japan exceptions; not a single-provider walking/driving solution. [H1][H1]                                                                                                                   |
| Japan rail / subway / bus         | **Unverified.** Coverage distinguishes real-time, timetable and estimated service; estimated service may omit buses. Public Transit country detail link could not be retrieved in this run. Japan map-rendering transit layers are not routing entitlement. [H3][H3], [H4][H4], [H5][H5] |
| Departure / arrival / multimodal  | Global transit endpoint supports depart/arrive, rail/metro/bus filters and walking transfers; changes can be capped 0–6. [H6][H6]                                                                                                                                                        |
| Waypoints / alternatives          | Transit alternatives exist; exact via limit and Japan-supported alternative count unverified. Do not copy car-routing limits into transit. [H6][H6]                                                                                                                                      |
| Traffic / incidents               | Endpoint can request incidents; Japan real-time completeness unverified. [H6][H6]                                                                                                                                                                                                        |
| Geometry / units                  | Flexible Polyline; summaries distinguish total duration from travel-only duration; lengths in meters. [H6][H6], [H7][H7]                                                                                                                                                                 |
| Fare / line / agency / station    | Stops, transport metadata and optional source data exist. The reference still labels fare support forthcoming: not a stable fare guarantee. [H6][H6]                                                                                                                                     |
| Accessibility                     | Global wheelchair vehicle/station filter documented; Japan completeness unverified. [H6][H6]                                                                                                                                                                                             |
| Server / Web / Mobile / key       | REST service and app API keys documented. Exact production key restrictions and Japan Web/Mobile license combination need confirmation. [H8][H8], [H11][H11]                                                                                                                             |

### NAVITIME JAPAN

| Requirement                       | Official finding                                                                                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product / version                 | **NAVITIME API 2.0**, Total Navi and mode-specific route/shape APIs. Current specification changelog checked. [N1][N1], [N2][N2]                                                                                          |
| Japan walking / driving / cycling | Official route product lists all three. [N1][N1]                                                                                                                                                                          |
| Japan rail / subway / bus         | Total Navi supports Japanese multimodal transport; however actual operators and bus exclusions must be reconciled with the order form. Marketing coverage alone is not acceptance. [N3][N3], [N7][N7]                     |
| Schedule / depart / arrive        | Route API takes start/goal time or first/last operation. **Default routing uses average times; real timetable search is individually quoted.** Consumer NAVITIME results can differ. [N3][N3], [N4][N4]                   |
| Waypoints / alternatives          | Via and multiple results documented, with mode restrictions; selected package's exact limits remain unverified. [N3][N3]                                                                                                  |
| Traffic / incidents               | Traffic/operation information exists as additional services/options; not assumed included with Total Navi. [N5][N5]                                                                                                       |
| Geometry / units                  | Separate shape endpoints supply GeoJSON; journey response has sections, duration/distance and fare fields. Exact purchased response, coordinate/unit/time mapping must be frozen only after Gate PASS. [N1][N1], [N3][N3] |
| Fare / line / agency / station    | Fare, route/line, company and station data documented; no guarantee every requested journey returns every optional field. [N3][N3]                                                                                        |
| Accessibility                     | Product supports route preferences such as avoiding steps; not evidence of universally verified wheelchair accessibility. [N1][N1]                                                                                        |
| Server / Web / Mobile / key       | REST and server-side signature authentication documented; IP/host restrictions can be requested. These mechanisms do not waive future Mobile use restrictions. [N6][N6], [N9][N9]                                         |

## 2. Price, quota, rights and reliability matrix

Prices are public list observations, not a purchase approval. Taxes, exchange rates, account-specific agreements, map loads and separate API products are excluded. Free quota is not an availability/SLA promise.

| Provider | Price / quota evidence                                                                                                                                                                                                                                                                                                               | Display / attribution / retention                                                                                                                                                                                                                                                                                                                                                                                                               | Reliability and unresolved scope                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mapbox   | Directions monthly first 100,000 requests free; next tier to 500,000: USD 2/1,000; 500,001–1,000,000: 1.60/1,000; subsequent published tier 1.20/1,000. 300 requests/min; multi-coordinate request billed once. [M5][M5], [M1][M1]                                                                                                   | Applicable global/Japan Product Terms must be checked against account jurisdiction. Current landing page links July 21, 2026 PDFs; both PDF fetches failed. **No retention TTL or off-map storage permission verified**, no older terms substituted. [M7][M7]                                                                                                                                                                                   | Public status page checked; Navigation reported operational in fetched snapshot, not an SLA. Japan traffic scope unresolved. [M8][M8]                                     |
| Google   | Compute Routes Essentials: 10,000 free monthly / USD 5 per 1,000 first paid tier; Pro: 5,000 / 10; Enterprise: 1,000 / 15. SKU depends on features. Compute Routes quota 3,000 QPM. [G6][G6], [G4][G4]                                                                                                                               | Routes shown on a map must use Google Maps under the reviewed policy; off-map display needs attribution. Caching generally restricted, place-ID exception does not authorize retaining route geometry. EEA terms may differ by billing account. Incompatible with assuming existing Mapbox display permission. [G7][G7]                                                                                                                         | Official status dashboard checked, but no Japan transit entitlement. [G8][G8]                                                                                             |
| HERE     | Limited Plan: 1,000 requests/day; Routing/Public Transit 10 RPS, Intermodal 5. Excluded use cases apply. Current Japan pricing page did not expose usable per-transaction prices; **paid route/transit cost not verified**, not presumed free. [H9][H9], [H10][H10]                                                                  | Reviewed indexed current terms (effective 2023-09-18): Japan results generally limited to 24h storage; narrowly qualified subscription/device exception 30 days. Japan content mixing and attribution have additional conditions. Mapbox composition and saved trips require review, not a blanket 30-day cache. [H11][H11]                                                                                                                     | Public SLA/status evidence for the selected Japan service not verified. No measured uptime/latency claim. Coverage detail retrieval failed.                               |
| NAVITIME | Direct: minimum 10,000 monthly accesses, startup/monthly fees and tariff quoted. Marketplace: Basic 500/month hard cap; Pro USD 200 / 5,000 hard cap; Ultra USD 300 / 10,000 then 0.05/access. Limits 50/100/150 per minute respectively. These are not a quote for timetable options; separate services billed separately. [N5][N5] | Direct order form determines permitted data/purpose; default no caching beyond that permission. Origin or destination must be from customer's location DB; specified bus exclusions and Mobile navigation restrictions exist. RapidAPI terms also prohibit caching and impose use limits. Attribution must remain. Written Mapbox/Web/Mobile scope, operator coverage and storage permission are **unresolved**. [N7][N7], [N8][N8], [N10][N10] | Timetable updates follow operator data; no guaranteed real-time disruption coverage or contracted SLA verified. Procurement must specify support/availability. [N11][N11] |

### Important document conflicts / retrieval limitations

- NAVITIME broad bus coverage descriptions and direct terms §6(2) exclusions are not interchangeable. Obtain an explicit operator/transport inclusion schedule, including local buses, community buses, JR/highway/shuttle buses and relevant islands. Do not silently choose the most permissive page.
- Direct NAVITIME §3/§5/§6 governs purchased scope; a quote without storage/display/use terms does not resolve the Gate. Zero cache TTL alone does not resolve endpoint-origin restrictions or future Mobile behavior.
- HERE global API reference does not prove Japan coverage. Coverage index and pricing pages were reached, but the linked country detail/pricing payload was unavailable through the research tool. The indexed legal text was available while direct open intermittently failed.
- Mapbox Product Terms landing page is not the legal PDF itself. Failed current PDF retrieval is recorded as an unresolved authorization/retention check, not as an API outage.
- Optional fields (fare, platform, accessibility, live delay) must remain unknown when not supplied. No candidate's optional data is promoted to guaranteed truth.
- No key absence is claimed: this task deliberately did not inspect private env files because Stage 1 was already blocked.

## 3. Hard Selection Gates

| Gate                                        | Status                           | Reason / evidence needed                                                                                                                            |
| ------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1: lawful Japan route source               | BLOCKED                          | Legitimate vendors identified, but no verified complete licensed product bundle for TravelAssist's actual use.                                      |
| G2: walking + driving                       | CONDITIONAL                      | Mapbox/NAVITIME document these modes; Japan deployment acceptance and applicable rights remain outstanding. HERE alone fails Japanese walking.      |
| G3: Japan rail/subway/bus                   | BLOCKED                          | Google excludes Japan; Mapbox has no transit; HERE unverified; NAVITIME timetable package/operator scope needs written confirmation.                |
| G4: Web / future Mobile display and storage | BLOCKED                          | Mapbox-mixed display, snapshot retention, attribution and future assistant uses are not jointly cleared.                                            |
| G5: server-side key management              | PASS (technical capability only) | Server REST/auth options exist. No credentials provisioned and no provider selected.                                                                |
| G6: bounded viable cost                     | BLOCKED                          | NAVITIME timetable/shape/access bundle and restrictions require quotation; product budget, volume cap and intended Mobile scope undecided.          |
| G7: minimum Route semantics                 | CONDITIONAL                      | Public examples expose candidate geometry/legs/timing metadata; actual licensed Japan scheduled-transit response is not accepted. No schema frozen. |

**Freeze Gate: BLOCKED. Primary: not selected. Transit/fallback: not selected.**
There is no authorized fallback that turns a denied/unsupported service into a Japan timetable route.

## 4. Recommendation for product-owner decision (not implemented)

1. **Preferred inquiry:** retain existing Mapbox rendering, evaluate Mapbox walking/driving plus NAVITIME direct-contract timetable transit. Ask for explicit cross-map display and Web/Mobile rights; this is a conditional inquiry option, not a procurement or provider freeze.
2. **Compare:** NAVITIME direct all-mode routing behind existing Mapbox display, if the written scope permits it. Compare cost/semantics of one vendor against two-vendor boundaries.
3. **Not a substitute:** Google transit cannot fill Japan; HERE needs Japan transit proof and a walking provider. Changing basemap/product scope is a product decision, outside this execution.
4. Until cleared, existing local estimates remain explicitly illustrative. No fabricated “live” adapter, no silent downgrade from schedules to average-time routing.

### Written answers needed before resuming

| Decision owner              | Required answer / acceptance evidence                                                                                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product owner               | Initial monthly spend ceiling, expected users/route recalculations, acceptable unsupported regions, whether real scheduled bus/rail is mandatory at launch, exact future Mobile assistant/offline needs.    |
| NAVITIME                    | Quote for timetable rail/subway/bus, operator/exclusion list, fares/shape endpoints, request accounting, monthly overages and hard-stop options, production rate/concurrency limits.                        |
| NAVITIME + product/legal    | Mapbox Web overlay and future Mobile permitted; allowed retained fields/TTL and derived facts; saved trip redisplay; customer location-DB origin rule; guidance/tracking restrictions; attribution wording. |
| Mapbox + product/legal      | Applicable current product terms based on contracting entity; Directions output retention/redisplay and Japan traffic coverage.                                                                             |
| Engineering after approvals | Recheck current official docs and signed scope, obtain redacted permissible examples, verify schedule/geometry/error semantics; only then freeze split and run Stage 2 → Stage 3.                           |

No supplier emails/forms were sent. No user budget or contract was invented.

### Cost-risk worksheet for the decision (illustrative arithmetic only)

Let monthly billable route calls be:

`active users × route edits/user × affected legs/edit × provider calls/leg × attempts/call`.

For example, **1,000 × 20 × 2 × 1 × 1 = 40,000** calls. A separate shape call and one retry for every call would make **160,000**, before any separate station requests. This is a sensitivity example, not a forecast or prescribed retry strategy. Compare the actual purchased billable units; do not assume a map load, transit journey, shape request and matrix element cost the same.

Quote-dependent inputs remain unset. No positive cache hit-rate assumption is allowed until retention/redisplay rights are cleared. Future service must bound requests/retries and recalculate affected legs rather than every drag frame; implementing that policy is gated Stage 3 work, not delivered here.

## 5. Source register

All following URLs were accessed or attempted on **2026-09-09 JST**. “Attempted” is not full-text legal verification. Technical/legal matrices above identify which claims each source supports.

| IDs            | Official source / evidence state                                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 / M2        | Directions v5 reference / Navigation changelog; read.                                                                                                     |
| M3 / M4        | Japan navigation offering / Traffic guide; read; not nationwide traffic acceptance.                                                                       |
| M5 / M6        | Pricing Navigation section / access-token guide; read.                                                                                                    |
| M7             | Product Terms landing page read; current global/Japan PDF bodies unavailable.                                                                             |
| M8             | Mapbox status page read.                                                                                                                                  |
| G1–G8          | Routes transit, country coverage, FAQ, billing/quota, key security, pricing, policy and status; read.                                                     |
| H1–H8          | Japan routing exceptions, Transit intro/coverage/reference, map-layer distinction, summary units, app-key setup; read. H4 child country page unavailable. |
| H9 / H10 / H11 | Limited restrictions read; Japan pricing page reached but tariff absent; current indexed Platform Terms read, direct fetch intermittent.                  |
| N1–N11         | Official API specification, average-time notice, pricing, authentication, direct/marketplace terms, restrictions, attribution and update guide; read.     |

[M1]: https://docs.mapbox.com/api/navigation/directions/
[M2]: https://docs.mapbox.com/api/navigation/changelog/
[M3]: https://www.mapbox.com/ja/navigation
[M4]: https://docs.mapbox.com/data/traffic/guides/
[M5]: https://www.mapbox.com/pricing
[M6]: https://docs.mapbox.com/help/dive-deeper/access-tokens/
[M7]: https://www.mapbox.com/legal/product-terms
[M8]: https://status.mapbox.com/
[G1]: https://developers.google.com/maps/documentation/routes/transit-route
[G2]: https://developers.google.com/maps/coverage
[G3]: https://developers.google.com/maps/faq
[G4]: https://developers.google.com/maps/documentation/routes/usage-and-billing
[G5]: https://developers.google.com/maps/api-security-best-practices
[G6]: https://developers.google.com/maps/billing-and-pricing/pricing
[G7]: https://developers.google.com/maps/documentation/routes/policies
[G8]: https://status.cloud.google.com/maps-platform/
[H1]: https://docs.here.com/routing/docs/routing-v8-country-exceptions
[H2]: https://docs.here.com/transit/docs/readme-public-transit-api-v8
[H3]: https://docs.here.com/transit/docs/coverage
[H4]: https://docs.here.com/coverage/docs/here-coverage-information
[H5]: https://docs.here.com/map-rendering/docs/transit
[H6]: https://docs.here.com/transit/reference/public-transit-api-v8-getroutes
[H7]: https://docs.here.com/routing/ja/v1.0/docs/routing-v8-route-summary
[H8]: https://docs.here.com/routing/ja/v1.0/docs/routing-v8-get-started
[H9]: https://www.here.com/jp/get-started/pricing/limited-plan-restrictions
[H10]: https://www.here.com/jp/get-started/pricing
[H11]: https://legal.here.com/us-en/terms/here-platform-terms
[N1]: https://api-sdk.navitime.co.jp/api/
[N2]: https://api-sdk.navitime.co.jp/api/specs/
[N3]: https://api-sdk.navitime.co.jp/api/specs/api_guide/route_transit.html
[N4]: https://api-sdk.navitime.co.jp/api/specs/tips/averagetime.html
[N5]: https://api-sdk.navitime.co.jp/api/specs/description/about_navitime_api.html
[N6]: https://api-sdk.navitime.co.jp/api/specs/description/about_signature.html
[N7]: https://api-sdk.navitime.co.jp/api/specs/description/ntj_tou.html
[N8]: https://api-sdk.navitime.co.jp/api/specs/description/rapid_tou.html
[N9]: https://api-sdk.navitime.co.jp/api/specs/description/about_restrict.html
[N10]: https://api-sdk.navitime.co.jp/api/specs/description/about_usepolicy.html
[N11]: https://api-sdk.navitime.co.jp/api/specs/tips/data_update.html

## 6. Research validation / stop condition

- Four candidates, all Task matrix dimensions and all seven hard gates accounted for.
- Capability, commercial entitlement, optional metadata, live smoke and failed retrieval are separated.
- No copied long source passages, vendor payload fixtures, speculative Route Schema or production authorization.
- Follow-up evidence checklist above is required to reopen selection, not permission to start 7.5/7.8.
- See [TASK-021-A Result](../tasks/RESULT-TASK-021-a-route-system-mainline.md) and Master WBS for actual branch/commit/PR state.
