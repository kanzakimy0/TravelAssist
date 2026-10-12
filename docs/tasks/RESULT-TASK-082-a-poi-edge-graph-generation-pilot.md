# RESULT — TASK-082-A POI Edge Graph Generation Pilot

## Status

**PARTIAL / BLOCKED real Pilot.** The edge architecture, generator, fixture
replay, deterministic audit and Planner read-only boundary are reviewable, but
the mandatory real 500-POI Pilot cannot start from current develop.

- Issue: #439
- Base develop: ef388cdcd0ff5f15ebd404337b4ed29fb3435058
- Branch: feature/a-poi-edge-graph-generation-pilot
- Final commit / Draft PR: recorded after publication
- WBS 7.13: **阻塞**, not 已完成

## Canonical source and scale

The application Registry at src/shared/data/master-code-registry.v1.json is
revision task-043-candidate-r1, SHA-256
9efcc0b6172dacdabe846789430d1ed54de98f12827097e96a7651131bf044b2.
It has 51 entries and **0 active POI Master Codes**. The candidate manifest
remains CANDIDATE_ONLY_NO_CANONICAL_IMPORT and
runtimeImportAuthorized=false. TASK-083-A / PR #444 is Draft, not merged
into develop; its proposed 100 records were not used. TASK-081-B has no result
file on this baseline, and its separate Draft PR is not a Canonical source.

Therefore the only legal maximum Pilot is **0/500 POIs** (shortfall 500).
Candidate directed edges = **0**, enriched edges = **0**, rejected edges = **0**.
Mean/median/min/max degree and walking/driving/transit resolution rates are
**not applicable (null denominator)**. Distance/classification distributions,
extreme-detour count, asymmetric route examples and per-edge unresolved
reasons are empty/zero, not asserted coverage. Exact machine report:
docs/qa/TASK-082/statistics.json.

## Delivered partial implementation

- Shared edge contract: directed four-layer schema; configurable
  24-nearest/16-area/16-city/64-max local candidate policy; geographic grid
  and 30-km local radius; strict coordinate, self-edge and duplicate handling;
  POI↔TransportNode access candidates; explicit walking, driving, transit
  and taxi unresolved states; actual walking distance, P90, costs, transfers,
  frequency, departures, accessibility and time-bucket fields; detour anomaly
  and explainable score-component trace.
- Server-only Planner read boundary with getPoiEdges, getPoiEdge and
  findMobilityOptions; default production repository fails closed until a
  separately authorized dataset is imported.
- Reproducible candidate-excluding Pilot gate and six machine-readable
  artifact files under docs/qa/TASK-082. Any future Canonical Pilot-100
  manifest must match exact scope, file SHA, dataset revision, membership
  and active Master Code bindings. No mock/fixture path feeds real artifacts.
- Explicit synthetic replay validates directional asymmetry and the required
  generator/contract failure cases, but is never counted as real enrichment.

No nationwide POI×POI graph, direct long-distance POI all-pairs edges, 43D
change, route Provider batch request, candidate promotion, DB import,
production route claim or national expansion was made.

## Provider/license and QA

The existing Route Provider is evaluation-gated, with conservative
persistence=none and ttlSeconds=null; production requires explicit approval.
Batch query, cache, retention and derivative-output rights are unconfirmed.
Consequently all real mode observations remain unresolved and no Provider
response was acquired or persisted. Synthetic fixture values are labelled
test-only and not included in any Pilot figure.

New focused tests 15/15; Route 28/28; POI contracts 24/24; Planning 21/21;
deterministic Pilot replay PASS. Lint 0 errors with 9 existing warnings;
typecheck and production build PASS. Full serialized Node regression
**2,767/2,767 PASS** (exit 0); baseline failures: **0 observed**. The exact-head GitHub Quality
Gate is reported with the publication receipt.

## Blockers and scaling recommendation

**B1:** zero admitted Canonical POI on develop, so no real Pilot membership.
**B2:** bulk/cache/retention/production route rights are not established.
**B3:** no real TransportNode inventory or full regional/intercity network
has been accepted; only strict test fixtures exercise access/network layers.

After a separately accepted Canonical import reaches develop, rerun the Pilot
audit against its exact manifest and inventory. Start with Tokyo or the
densest legally admitted city; do not force 40–80 neighbors where density
does not support it. Obtain explicit route-data permissions, then enrich a
bounded city sample and review detours, direction asymmetry and unresolved
coverage. Only after that city Pilot passes should regional scaling be
considered. **Do not begin nationwide expansion.**
