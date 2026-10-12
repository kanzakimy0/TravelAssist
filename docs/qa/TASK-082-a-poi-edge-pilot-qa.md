# TASK-082-A — POI Edge Graph Pilot QA

## Evidence and status

**BLOCKED real Pilot; partial architecture implementation.** Base develop is
ef388cdcd0ff5f15ebd404337b4ed29fb3435058. The application Master Code
Registry has 51 entries, governanceStatus=candidate, and **0 active POI codes**.
Its SHA-256 is 9efcc0b6172dacdabe846789430d1ed54de98f12827097e96a7651131bf044b2.
The candidate manifest is CANDIDATE_ONLY_NO_CANONICAL_IMPORT and
runtimeImportAuthorized=false. No accepted Canonical dataset/runtime manifest
exists on this branch. Draft PR #444's proposed 100 POIs are not in develop
and were not imported here.

The deterministic audit is npm run qa:poi-edge-pilot. It checks the forbidden
candidate manifest and active codes, requires a matching authorized Canonical
dataset and exact file hash if one exists, and compares all committed outputs
byte-for-byte. Current machine outputs:

- [Pilot POI manifest](TASK-082/pilot-poi-manifest.json): 0/500; shortfall 500.
- [Candidate directed edges](TASK-082/candidate-directed-edges.json): 0.
- [Mode status records](TASK-082/edge-mode-status.json): 0.
- [Enriched edges](TASK-082/enriched-edges.json): 0.
- [Unresolved reasons](TASK-082/unresolved-reasons.json): no per-edge rows
  because there are no legal edges; the inventory blocker is in statistics.
- [Machine statistics](TASK-082/statistics.json): degree and per-mode rates
  are null where the denominator is zero, never fabricated 0% resolution.

The synthetic, explicitly labelled fixture at
tests/fixtures/task-082-edge-replay.v1.json is **test-only** and excluded from
every Pilot count. Its asymmetric forward/reverse walking examples validate
directional behavior, not a real route claim.

## Contract and provider decision

The shared graph contract keeps straight-line distance separate from observed
walking distance/duration and detour ratio, bounds candidate degree, uses a
geographic grid rather than a nationwide all-pairs loop, and represents all
four graph layers. Walking, driving, transit and taxi remain unresolved until
actual licensed route observations exist. Typical/P90, cost, first/last
departure, transfers, frequency, elevation, stairs, accessibility and time
buckets are explicit nullable fields. Score traces are calculated only from
known components; absent required inputs leave the score null.

Existing Ekiworld configuration supports evaluation requests only under a
development gate; the Route cache policy is persistence=none, TTL=null, and
production entitlement requires separate approval. No batch, cache, retention
or production rights were proven for graph generation. This Task made **zero
Provider requests**, persisted **zero Provider responses**, and did not label
evaluation-only routes production-ready. The server Planner repository is
unavailable by default.

## Tests

- New graph contract/generator/fixture tests: 15/15 PASS.
- Existing Route tests: 28/28 PASS.
- Canonical POI contracts: 24/24 PASS.
- Planning contracts: 21/21 PASS.
- Pilot deterministic replay: PASS.
- Lint: 0 errors, 9 pre-existing warnings.
- Typecheck and Next production build: PASS.
- Full serialized Node regression: 2,767/2,767 PASS (exit 0); no baseline failure was
  encountered. The final focused suite was rerun after the server boundary
  and score changes.

Tests cover self-edge rejection, direction and asymmetry, deterministic order,
degree cap, nearest-neighbor and radius, city/area classification,
deduplication, invalid/missing coordinates, actual-vs-straight walking,
extreme detour, optional modes and unresolved preservation, score
determinism/components, three TransportNode kinds and reverse access,
transport-network layer shape, serialization, fixture replay, admission gate,
and fail-closed server lookup. No fixture enters Pilot artifacts.

## Resume gate

1. Accept and merge an authorized Canonical POI corpus with active Master Codes
   into develop; freeze Pilot membership and rerun the audit.
2. Resolve a city-level inventory sufficient for meaningful bounded degree.
3. Document Provider batch/cache/retention/production and derivative-data
   rights before any bulk route enrichment. Otherwise retain unresolved modes.
4. Review city Pilot QA before proposing regional or national expansion.
