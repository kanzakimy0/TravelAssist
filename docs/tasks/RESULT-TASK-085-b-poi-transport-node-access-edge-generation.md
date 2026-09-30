# RESULT — TASK-085-B POI → TransportNode Access Edge Generation, Round 2

**Status: BLOCKED_SOURCE_LICENSE_IDENTITY_FIXPOINT. WBS 7.15: 进行中.**

The topology/metrics correction is implemented and replayed across every authorized Canonical record. There are **340 confirmed relationships / 680 directed topology records**, covering **94/100 POIs** (94/95 in the explicitly reported valid-accessible assessment subset). Route metrics remain unresolved and no longer delete confirmed topology.

The remaining nine valid under-target POIs have hash-bound **SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF** records. These identify external official-access or reusable-identity evidence that is still missing. They are **not** CANDIDATE_EXHAUSTION_PROOF and do not assert that fewer than three nodes physically exist. The topology acceptance gate therefore remains FAIL. This is not READY_EXCEPT_CANONICAL_ADJUDICATION: non-Canonical gates also fail.

## Authority and preserved baseline

| Item | Revision / evidence |
| --- | --- |
| Latest fetched base develop | `5b951195698d3e421f34a9922393b454412fa4bb` |
| Continuing branch / Draft PR | `feature/b-poi-transport-node-access-edges` / [#464](https://github.com/kanzakimy0/TravelAssist/pull/464) |
| Required Amendment | [Access topology / metrics split v2](AMENDMENT-TASK-085-b-access-topology-route-metrics-split-v2.md), commit `41389de330df33091af9d33cc825ea8d4387a92d` is an ancestor of this continuation |
| Latest execution instruction read | [Issue #442 comment 5909795085](https://github.com/kanzakimy0/TravelAssist/issues/442#issuecomment-5909795085) |
| Original TASK-085-B | PR #449, branch `docs/poi-transport-parallel-execution`, revision `7073c2a5501e9f7e74361fb0bdc6219a99504f87`; original task, WBS, TASK-084 closeout, TASK-082 task/implementation/Result/QA and route/rights records reviewed |
| Baseline checkpoint | `2891bdf806536c039b1071a169e1f38b6f07d3e4` |
| Baseline admissions | All 1,887 admitted and 245 HOLD/rejected records preserved, independently revalidated; 0 missing or changed |
| Baseline candidates | Original 772 directed candidates retained as discovery evidence with per-record checksums; they need not remain quarantined after valid confirmation |
| Current task-local nodes | 5,200 admitted / 344 HOLD; 5,544 total reviewed decisions |
| Current admission artifact | `data/transport/access/node-downstream-admission.jsonl`, revision `task-085-access-topology-route-metrics-v2`, SHA-256 `46aa9adb438fb9bb6a4548adf5232a6b2a8c2c058e9dea2ce0d1daba376aa369` |

[Baseline revalidation](../../data/transport/access/baseline-revalidation.json) records all original decisions and candidate digests. Neither TASK-084 v1 nor unreviewed v2 was consumed.

### Gate 0 and Canonical hashes

The TASK-084 review manifest at `data/transport/nodes/task-084-b-v2-amendment-review/manifest.json` remains revision `a25ebb928bb1fc8017d8d9e5c050d717ff5b118b`, SHA-256 `b4ad2259b986ab34b7326c15fe5f0d80f4f5a08160c012cdb787c0ede1fb375a`. Its `downstream085Authorized=false`, `runtimeImportAuthorized=false`, `formalAcceptedV2NodeCount=0`, `nationalMasterPass=false` and `nationalMasterStatus=REWORK_IN_PROGRESS` remain unchanged. The closeout SHA-256 is `2f18099d0dfc53d1eaa1cbc12b5fe709368eaf3ec0c2ed10da7cae33b06b671b`.

The later Issue #442 authorization permits individually reviewed **TASK-085-local admission**; it does not accept the national master. The authoritative input for this run is the task-local admission artifact above, derived from attributed licensed sources and frozen identity bindings. WBS 7.14 closure was not used as authorization.

Canonical input is solely `src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json`, revision `task-083-a-pilot100-v1`, runtime file SHA-256 `11fd42f2ded8cc45519767ba86b97bcb1123552550c7f6af6ee60af7436cdbf0`. Its authorized dataset file hash is `611c6e33324a35e70f1a0afbdbf86fa87ac356d53068d9e4ae95c4c12fea0ee4`; semantic dataset hash is `802785ddb24e720698c2813f1f9dce29fe6792cdf02dbd01e9557b385a88bda2`. Runtime authorization, registry, admissions, active identities and exact membership were rechecked. Runtime membership determines the population dynamically; 100 is this snapshot's count, not a generator constant. No enrichment workbook or candidate-only POI was used.

The supporting sample byte-hash gate remains FAIL. [The TASK-083 commit-history audit](../qa/TASK-085-B/canonical-supporting-hash-audit.md) proves the declared hash equals the CRLF representation, whereas Git stores the LF representation. This originated in authorizing commit `32154893fc314844760d059d59a3ef141d462882`, not subsequent membership drift. Actual LF hash: `6d6187e53f6235abc757795896b8ba441736ce078e1e5b3e0c70df14c4709d51`; declared/CRLF hash: `77e239e0b5092f38e85f1d4e7035cf2ece2956128b5c01dbabdffc11b08d2c82`. B changed neither upstream file nor hash. A must regenerate and authorize the corrected receipt.

## General correction and full replay

Official venue, operator/government or tourism access evidence now establishes topology independently of licensed route metrics. The review joins the exact named gateway by node kind, locality and, where available, operator; it binds the reviewed fact, source hash, identity and rights. Mere proximity, S12/P11 membership, an expired event, a namesake, or access to a different facility cannot confirm a relationship. Duplicate physical bus clusters and redundant operator/line representations are not counted as extra useful gateways.

Each confirmed relationship emits POI_TO_NODE and NODE_TO_POI independently. One official source may support both topology records. Each direction's walking/transit/taxi fields starts unresolved and requires its own route observation; prohibited or unsupported direction-specific metrics do not erase the topology pair.

The rule is generic. The replay gives 増上寺 6 useful nodes, 大阪ドーム 6, 葛城市相撲館 3, and スカイビル 6 including the separately joined YCAT identity. These are reviewed source inputs, not POI-specific implementation branches.

Spatial candidate generation uses indexed 1/4/12 km stages, bounded S12 and P11 pools and exact-name searches for explicitly named official gateways. Configurable target 3–8 and role caps prevent N×N growth or distant-hub padding. All 100 POIs receive an explicit result. Batches remain 200 POIs; this snapshot has one partial batch.

The full corpus was replayed after successive official-source, named-identity, P11, GTFS and special-access expansions. The [iteration ledger](../../data/transport/access/auto-fix-iterations.jsonl) preserves observed replay fingerprints, from 570 through 680 edges, plus closure verification; unsaved earlier intermediate runs were not invented. Every remaining valid under-target POI has all nine source categories, full candidate/named-identity dispositions and hash-bound source, license, spatial and admission inventories in [discovery proofs](../../data/transport/access/candidate-exhaustion-proofs.jsonl). Stale hashes, omitted candidates, category labels without findings, or unsupported physical-exhaustion claims invalidate the proof.

`globalTopologyDiscoveryFixpoint=PROVEN` means the documented **source/license/identity boundary** has been reached for reasonable visitor gateways under this reviewed source snapshot. It does not claim all possible future publications or the whole Internet have been exhausted. New official gateway evidence or reusable node identity invalidates that boundary and requires review/replay.

## Remaining external topology boundaries

| POI | Confirmed nodes | Evidence still required after expansion |
| --- | ---: | --- |
| 飛水峡 | 1 | 上麻生 rail confirmed. Official station-bus interchange lacks an exact licensed locality-qualified identity; signal box and a different gorge viewpoint are not substitutes. |
| 御影大橋 | 2 | Official city/prefectural walk and bus map confirm two. Nearby 御影町/富本町 and other regional nodes lack an explicit bridge visitor-gateway assertion. |
| 田倉山 | 2 | 上夜久野 rail and bus confirmed. 農匠の郷/白井 and nearby basalt-park access do not establish this summit's trail gateway. |
| 池原橋 | 1 | 池原大橋 bus confirmed through current local evidence. Historical ferry and dam/park stops do not establish additional current bridge access. |
| まほろば湖 | 1 | 長谷寺 rail approach confirmed. Other stops need exact shore/trail access evidence. Off-site dam-card collection at 橿原 is not lake access. |
| みさき公園 | 1 | Current public park/path and rail access confirmed. Named station bus has no exact reusable joined identity; an expired ferry promotion cannot confirm current park access. |
| 阿瀬川橋 | 0 | Licensed nearby 栗山/三方コミセン stops and official bridge identity exist, but no official source establishes the exact visitor-gateway relationship. Proximity alone is insufficient. |
| 韮崎中央公園陸上競技場 | 2 | Rail/station bus confirmed. Current new gym/富士見ヶ丘 bus and demand points need exact licensed identities absent from reviewed P11/older GTFS; a building coordinate is not a boarding-stop identity. |
| ミュージアム都留 | 2 | 谷村町/都留市 rail confirmed. 中央道都留 bus and current demand stop 48 need exact reusable identities; an interchange entity or a different same-name operator stop cannot substitute. |

The nine machine proofs enumerate candidate decisions, concrete URLs, source-category findings, the publisher/owner boundary and the external evidence required to resume. None is relabeled as proof that a third useful node does not exist. Thus **under-target without CANDIDATE_EXHAUSTION_PROOF = 9**, still FAIL.

## Canonical adjudication

[canonical-adjudication-required.json](../../data/transport/access/canonical-adjudication-required.json) retains all five exact identities, official sources and required owner decisions:

- J-WORLD TOKYO: permanent closure; surrounding Sunshine City is a different target.
- レインボープール: ended operation/redevelopment; surrounding park is not that pool.
- 舳倉島: ordinary tourist ferry access remains restricted.
- 鶴見つばさ橋: endpoint/access semantics do not establish a pedestrian destination or safe drop-off.
- 我善坊谷: historical valley was redeveloped; B cannot silently rebind it to Azabudai Hills.

B removed or edited **zero Canonical records**. All five remain in raw corpus counts; a separately labeled 95-record assessment subset makes the owner exceptions visible. These exceptions did not stop discovery for the rest of the corpus.

## Required full-run metrics

| Metric | Result |
| --- | --- |
| Canonical processed / scan / explicit result coverage | 100 / 100% / 100% |
| POIs with ≥1 useful confirmed topology node | 94/100; 94/95 valid assessment subset |
| Zero-node shortfall | 6 overall; 1 valid subset |
| POIs reaching ≥3 nodes | 86/100; 86/95 valid subset |
| Under-target | 14 overall = 9 external topology boundaries + 5 Canonical cases |
| Local / major hub POI coverage | 70/100 / 1/100 |
| Tourism gateway / special access coverage | 44/100 / 18/100; union 45/100 |
| Confirmed directed edges / relationships | 680 / 340 |
| Pending directed candidates | 638, separate from confirmed topology |
| Useful nodes per POI, mean / median / min / max | 3.4 / 3 / 0 / 6; valid mean 3.578947, median 3 |
| Directed edges per POI, mean / median / min / max | 6.8 / 6 / 0 / 12 |
| Walking resolved POI coverage / edge rate | 0/100 / 0/680 |
| Local transit resolved POI coverage / edge rate | 0/100 / 0/680 |
| Taxi resolved POI coverage / edge rate | 0/100 / 0/680 |
| Accessibility known POI coverage / edge rate | 0/100 / 0/680 |
| Stairs / elevation / detour / P90 coverage | Each 0/100 POIs and 0/680 edges |
| Observed extreme detours | 0; assessable actual routes = 0, not a real-route clearance |
| Unresolved topology POIs | 6; 680 metric-unresolved edges / 2,040 mode-specific unresolved rows |
| Unresolved reason distribution, overlapping | VENUE_PERMANENTLY_CLOSED 2; OFFICIAL_GATEWAY_IDENTITY_JOIN_REQUIRED 6; HISTORICAL_VALLEY_REDEVELOPED_CURRENT_VISITOR_ENDPOINT_REQUIRES_OWNER 1; NO_PEDESTRIAN_OR_SAFE_DROPOFF_ENDPOINT 1; GENERAL_PUBLIC_FERRY_ACCESS_RESTRICTED 1; NO_ADMITTED_RELEVANT_NODE 1 |
| Batches / receipts | 1 / 1, batch size 200 |
| Accepted node / topology edge provenance | 5,200/5,200 / 680/680 = 100% |
| Essential topology fields / duplicates / invalid identities | 100% / 0 / 0 |
| Original v1 usage / unreviewed v2 promotion | 0 / 0 |
| Deterministic rebuild | PASS: independent full artifact builds compared before write and actual filesystem comparison |
| Resume / checksum / corruption / single-batch rerun | PASS; source invalidation and 200/201 boundary also tested |
| Graph growth guard | PASS, 680 ≤ 100 × 8 × 2 |
| Physical exhaustion proofs / external fixpoint proofs | 0 / 9 |
| Final topology gates | 17 PASS / 5 FAIL; allPass=false, nonCanonicalPass=false |
| Final WBS 7.15 | 进行中; not 待审查 |

The five failed gates are supporting Canonical hash, valid POI ≥1 coverage, zero-node valid POIs, under-target without physical exhaustion proof, and Canonical adjudication. Mean and median satisfy the thresholds for both the full corpus and labeled valid subset.

## Provider, licenses and integration boundary

Source-specific rights, archive/entry hashes, retention and attribution are in [manifest.json](../../data/transport/access/manifest.json) and [source-rights.json](../../data/transport/access/inputs/source-rights.json). S12 is CC BY 4.0; P11 is PDL 1.0. Licensed community/municipal GTFS inputs provide static stop identities. Four pinned CC0 Wikidata entities supply individually reviewed terminal/port identities, joined to official sources. No GTFS snapshot is treated as evidence of current service or an unmeasured last-mile route.

S12 archive SHA-256: `0785e932a32b3ec15e1a1345537ae145eafe1c07bf38d5c16c11ee2b391e7a28`. P11 archive SHA-256: `12132cc1c349d5d84c1ae90e7e5fff7c12a79540f4487edfae46e9f640bc1c72`. National scans cover 10,534 S12 features and 278,515 P11 features; only bounded or explicitly named locality-qualified derivatives are retained.

Google Routes has no demonstrated full batch/cache/retention/production/derivative grant; Ekiworld remains evaluation-only; ODPT's inaccessible provider-specific grants were not presumed. All fail closed. **Route-provider batch requests = 0; raw route-provider payloads persisted = 0.** Official access pages contribute short reviewed facts/source links, not copied raw payloads or measured routes.

Haversine is only `straightDistanceM`. Actual walking distance, duration and detour ratio remain separate nullable fields. Directional routes must independently pass licensing, endpoints, complete last-mile and barrier checks. QA detects extreme detour, river/bridge, rail/highway, mountain, gated and impossible-route cases. Zero/estimated values are not coverage substitutes.

The task-owned additive adapter wraps TASK-082 GraphRef / PoiMobilityEdgeV1 and reuses its directed/unresolved semantics and validators. No second Planner contract, runtime/API/public behavior change, or 43-dimensional POI copy was introduced.

## Validation and publication

Final replay input fingerprint: `de48e4d636486f60bfa50038439b0127c0acec6de894d4cf57ee1d22f750fea8`.

Focused tests: **17/17 PASS**; full regression: **2,841/2,841 PASS**. Lint (0 errors, 10 existing warnings), typecheck, formatting, deployment validation, production build and artifact verification (1,908 files) all PASS. Commands and log hashes are recorded in [QA README](../qa/TASK-085-B/README.md) and [local-validation.json](../qa/TASK-085-B/local-validation.json).

The final commit's exact-head workflow_dispatch Quality Gate URL, head SHA and conclusion are recorded in the existing Draft PR #464 body after push. A green code Quality Gate does not turn the failed topology data gates into PASS. No merge, auto-merge or TASK-086 execution.
