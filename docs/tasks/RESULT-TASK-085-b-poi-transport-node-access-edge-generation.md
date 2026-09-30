# RESULT — TASK-085-B POI → TransportNode Access Edge Full Generation

**BLOCKED_CANONICAL_ACCESS_CONTRADICTION / HUMAN_REVIEW_REQUIRED** — 2026-09-30.
Final data acceptance = **FAIL**. WBS 7.15 = **进行中**. This run does not claim TASK-085 complete.

The later [#442 amendment](https://github.com/kanzakimy0/TravelAssist/issues/442#issuecomment-5906414855)
and [clarification](https://github.com/kanzakimy0/TravelAssist/issues/442#issuecomment-5906421675)
were applied: lack of national TASK-084 authorization did not stop local admission.
Licensed topology and official access research were expanded. Every authorized POI
has an explicit result, but none has a complete, legally reusable, independently
evidenced pair of usable access directions. The empty accepted-edge file is intentional.

## Execution and authoritative inputs

| Item | Evidence |
| --- | --- |
| Base develop SHA | 5b951195698d3e421f34a9922393b454412fa4bb |
| Branch | feature/b-poi-transport-node-access-edges |
| Worktree | A new clean managed worktree was created from the base; the existing task branch was continued there, preserving the prior pushed audit commit. |
| Original TASK | [PR #449](https://github.com/kanzakimy0/TravelAssist/pull/449), docs/poi-transport-parallel-execution, 7073c2a5501e9f7e74361fb0bdc6219a99504f87 |
| Draft PR | [#464](https://github.com/kanzakimy0/TravelAssist/pull/464) |
| Canonical runtime manifest | src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json |
| Manifest file SHA-256 | 11fd42f2ded8cc45519767ba86b97bcb1123552550c7f6af6ee60af7436cdbf0 |
| Canonical revision | task-083-a-pilot100-v1 |
| Dataset semantic SHA-256 | 802785ddb24e720698c2813f1f9dce29fe6792cdf02dbd01e9557b385a88bda2 |
| Dataset file SHA-256 | 611c6e33324a35e70f1a0afbdbf86fa87ac356d53068d9e4ae95c4c12fea0ee4 |
| Authorized POI count | 100, read from manifest and exact membership; no count constant in the generator |
| TASK-085 node admission artifact | data/transport/access/node-downstream-admission.jsonl |
| Admission revision | task-085-local-access-v1 |
| Admission file SHA-256 | 3dbf5706e80aff33768b34cca29c5f196757574344214cd4c7fdbaa18ce26edc |
| Admission | 2,132 source components: 1,887 ADMIT_TASK_085_TOPOLOGY, 245 HOLD |

The current [manifest](../../data/transport/access/manifest.json) pins every
task input and implementation file by SHA-256. The final commit and exact-head
Quality Gate receipt are recorded in the Draft PR body after that commit exists;
a previous commit's passing CI is not reused.

### Gate 0

The latest TASK-084 review manifest remains
data/transport/nodes/task-084-b-v2-amendment-review/manifest.json,
revision a25ebb928bb1fc8017d8d9e5c050d717ff5b118b,
SHA-256 b4ad2259b986ab34b7326c15fe5f0d80f4f5a08160c012cdb787c0ede1fb375a.
Its downstream085Authorized=false, runtimeImportAuthorized=false,
nationalMasterStatus=REWORK_IN_PROGRESS, nationalMasterPass=false and
formalAcceptedV2NodeCount=0 match the closeout snapshot. WBS 7.14 closure
does not change these fields.

The amendment authorizes a separate, explicit task-local subset. The generator
does not consume the rejected 244-node v1 or promote any v2 REVIEW rows.
A changed national authorization forces re-evaluation of this execution path.

Core Canonical dataset/registry/admission hashes and TASK-082 admission membership
pass. A pre-existing supporting-evidence mismatch remains a **failed final gate**:
sampleManifestSha256 declares
77e239e0b5092f38e85f1d4e7035cf2ece2956128b5c01dbabdffc11b08d2c82,
whereas data/poi/canonical/pilot-100/sample-manifest.v1.json hashes to
6d6187e53f6235abc757795896b8ba441736ce078e1e5b3e0c70df14c4709d51.
No upstream manifest, lifecycle, registry, candidate corpus or workbook was changed.

## Expansion, admission and selection

1. The official MLIT S12 FY2024 archive was downloaded once under its dataset-specific
   CC BY 4.0 terms. Archive SHA-256:
   0785e932a32b3ec15e1a1345537ae145eafe1c07bf38d5c16c11ee2b391e7a28.
   From 10,534 source features, spatial discovery retained 1,988 components for the
   authorized POIs. Same-name nearby ambiguity and external-ID collisions remain HOLD.
   S12 contributes 1,743 admitted topology components, not current operating-route claims.
2. All 100 POIs received official operator/government/tourism-source research,
   including island ferry, mountain, funicular, ropeway, tourist bus and airport
   leads where relevant. Each POI's actual source, finding and remaining gap is in
   [official-access-research.json](../../data/transport/access/inputs/official-access-research.json).
   This research is explicitly **not certified exhaustive**.
3. CC BY 4.0 GTFS expansion added 95 Ikoma community-bus stops and 49 Seki Itadori
   stops. Archive hashes are respectively
   b48b71fbc7896fe735a06c5eb7740f055d669e410d250d8ee8cd5423359e0971 and
   2999dfaf94dec85d11da1f75ad58e251ec894a668b825f988c30ff171acd171c.
   The latter includes the rural Monet's pond approach. Stop-to-stop timetables
   do not establish the unmeasured stop-to-POI last leg.
4. The final approved-input replay produced no new usable edges. The iteration
   ledger records three expansion stages and a fourth input/constraint recheck.
   That fourth replay is not represented as a new exhaustive web search.

Admitted kinds: railway_station 1,603; fixed_guideway_station 70; bus_stop 144;
funicular_station 22; tram_stop 48. Admission checks official source identity,
coordinates, kind, archive/source hash, license, frozen identity binding and
duplicate/rebind conflicts. Confidence distinguishes verified source identity
from unknown operation and unknown route access. Runtime import is false.

Candidate generation uses a spatial index and 1/4/12 km stages, bounded discovery,
configurable role caps, official gateway matches and operator/line usefulness.
Unproven walkability stays unresolved. Remote nodes without access relevance are
rejected. Every retained/rejected candidate has a deterministic rank and reason;
no POI×all-nodes edge product is generated. Default target is 3–8 nodes, local cap
6, major-hub cap 2, tourism cap 3, special cap 3, total cap 8.

## Exact external constraints and the limits of the fixpoint claim

| POI / Master Code | Runtime ID | Primary evidence / consequence |
| --- | --- | --- |
| J-WORLD TOKYO / 41201 | poi:1f4f9320-e27e-5ab5-9adb-e9e13a78b254 | [Operator closure release](https://am.bandainamco-am.co.jp/documents/news/2018/12/20181203_14-P-087.pdf) and [later operator history](https://bandainamco-am.co.jp/company/asobito/article25.html): closed 2019-02-17. A route to Sunshine City or a successor is not access to the unchanged venue. |
| レインボープール / 41211 | poi:208288db-abad-5e91-ab74-4a74d6a6cd68 | [Park operator](https://www.showakinen-koen.jp/facility/facility-615/) states operations ended; [government park office](https://www.ktr.mlit.go.jp/showa/) describes redevelopment of the former pool area. Park admission does not establish pool access. |
| 舳倉島 / 31513 | poi:e202dd40-4017-5b70-b5db-a8f3092bb3ca | [City tourism authority](https://wajimanavi.jp/tourism/hegurajima): resumed ferry is restricted to residents/recovery workers; general tourist access not confirmed. |
| 鶴見つばさ橋 / 11056 | poi:dd955a9f-ad96-5d8f-9bfc-87ef3e4eea32 | [Expressway operator](https://www.shutoko.co.jp/activities/database/bridge/tsubasa/) and pedestrian exclusion guidance: the bridge point is not a verified pedestrian destination or legal taxi drop-off. |

These four cases are HUMAN_REVIEW_REQUIRED; all remain in the authorized denominator.
The two permanently closed venues have scoped CANDIDATE_EXHAUSTION_PROOF records:
all discovered candidates and truncated S12 references are enumerated, and any
additional gateway still fails the same closed-target constraint. A larger radius,
new station or route license cannot reopen that exact venue.

**This proves a local, external acceptance constraint, not a global research fixpoint.**
There is no evidence that every legally usable source for the other 98 POIs has been
exhausted. Therefore globalDiscoveryFixpointProven=false, 98 under-target POIs have
NOT_ESTABLISHED exhaustion status, and this deliverable does **not** claim the user's
full automatic-discovery completion condition. It is a reviewable blocked checkpoint.
The exact 100 affected POIs, per-POI sources/reasons and incomplete fields are in
[completeness](../../data/transport/access/poi-access-completeness.json) and
[unresolved](../../data/transport/access/poi-access-unresolved.jsonl).

Canonical ownership must adjudicate the two closed lifecycle/identity records and
the supporting manifest hash. Other gaps include licensed complete last-mile routes,
independent reverse directions and verifiable entrances for rivers, lakes, summits
and redeveloped sites. B has not silently rebound those identities.

## Full-run metrics

| Metric | Result |
| --- | --- |
| Canonical scanned / explicit results | 100/100 / 100/100 |
| Canonical processed count / usable-access shortfall | 100 / 100 |
| POIs with >=1 confirmed usable access node | 0/100 |
| Local / major hub / special tourism usable coverage | 0/100 / 0/100 / 0/100 |
| Accepted directed edges | 0 |
| Quarantined independent directed candidates | 772 |
| Mean / median / min / max useful nodes per POI | 0 / 0 / 0 / 0 |
| Mean / median / min / max accepted directed edges per POI | 0 / 0 / 0 / 0 |
| Under-target POIs / scoped exhaustion-proof coverage | 100 / 2%; 98 proofs not established |
| Walking / transit / taxi resolution among candidates | 0/772 for each mode |
| Walking / transit / taxi resolution among accepted edges | null for each (0/0), never reported as 100% |
| Resolved usable-mode POI coverage | 0/100 |
| Accessibility known rate among accepted edges | null (0/0) |
| Observed extreme detours | 0; no actual routes were available to assess, so this is not real-route QA clearance |
| Unresolved POIs | 100 |
| Reason distribution (non-exclusive) | NO_LEGAL_COMPLETE_DIRECTIONAL_ROUTE 100; NO_ADMITTED_RELEVANT_NODE 14; VENUE_PERMANENTLY_CLOSED 2; NO_PEDESTRIAN_OR_SAFE_DROPOFF_ENDPOINT 1; GENERAL_PUBLIC_FERRY_ACCESS_RESTRICTED 1 |
| Batches / receipts | 1 / 1; final partial batch of 100, configured size 200 |
| Accepted-node provenance | 1,887/1,887 = 100% |
| Accepted-edge provenance | null (0/0), final gate FAIL |
| Regions | 10 regions scanned fully; each has 0% usable coverage. Tokyo 11 POIs, Yamanashi 9, other eight regions 10 each. |
| Auto-fix ledger | 3 source/research expansion stages + 1 constrained replay; global discovery fixpoint unproven |
| Deterministic rebuild | PASS, independent full artifact builds and actual filesystem byte comparison |
| Resume / checksum skip / source invalidation / single-batch repair / corruption detection | PASS in focused tests, including 201-POI fixture |
| Final acceptance | FAIL; see every numerator/denominator/threshold in final-acceptance-gate.json |
| Final WBS 7.15 | 进行中 |

## Provider/license decision and route integrity

[S12](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-S12-2024.html),
[Ikoma's dataset](https://data.bodik.jp/dataset/292095_1714108666) and
[Seki's open-data terms](https://www.city.seki.lg.jp/0000010802.html) provide the
attributed licensed topology. Archive hashes, entry hashes, extraction rules and
attribution are committed. These grants do not create measured last-mile route data.

Google Routes default selection is not a batch/cache/retention/production/derivative
persistence grant. Ekiworld remains evaluation-only with persistence none / TTL null.
Kyoto ODPT requires its basic and provider-specific terms; a usable current grant
and download were not established, so no feed was fetched. Public operator access
pages remain factual discovery references, not a blanket route-payload storage grant.
No prohibited provider batch calls, raw route-provider payload persistence or N03
production join occurred.

Every candidate starts with TASK-082 unresolved metrics=null. Haversine is only
straightDistanceM. Walking resolution requires independently traceable route distance
and time, approved source/evidence hashes, endpoint binding, last-mile completeness,
public access, direction and barrier review. Extreme detours, impossible/straight-as-route
measurements, estimated-speed fill, repeated/round-number metrics, shared remote hubs,
missing local gateways and fixed node-count concentration are checked. No synthetic
fixture observation enters the production inputs.

## Integration and validation

The additive adapter uses TASK-082 GraphRef and PoiMobilityEdgeV1 through
candidateToUnresolvedEdge, applyLicensedObservation and validateMobilityEdge.
Task-specific identity, role and decision metadata wraps that existing contract;
unsupported node kinds are not mislabeled as the three kinds in TransportNodeV1.
Independent directions are quarantined until both are evidenced. No Planner,
Route Runtime, API, shared contract or 43-dimensional POI payload changed.

Focused TASK-085 tests: **14/14 PASS**. Full regression, lint, typecheck, formatting,
build and artifact verification are recorded in
[QA](../qa/TASK-085-B/README.md) and
[local-validation.json](../qa/TASK-085-B/local-validation.json).
Exact-head CI is reported in the Draft PR publication receipt, separately from data acceptance.
A code Quality Gate PASS cannot turn the failed data acceptance into PASS.

No merge, auto-merge or TASK-086 execution. WBS 7.15 remains 进行中.
