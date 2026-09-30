# RESULT — TASK-085-B Post-Canonical Final Replay

**READY_FOR_USER_ACCEPTANCE_WITH_AUDITED_FIXPOINT_EXCEPTIONS**

WBS 7.15 = **待审查（audited fixpoint exceptions）**, not completed. Draft PR [#464](https://github.com/kanzakimy0/TravelAssist/pull/464) remains open; no merge, auto-merge or TASK-086 execution.

Canonical owner gates now PASS. Raw membership and explicit outputs remain 100; the hash-validated owner adjudication defines the 95-record general-tourist assessment subset. All 340 confirmed relationships / 680 directed edges are preserved. The only remaining failures concern the same nine audited external fixpoint cases. They remain SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF, never physical CANDIDATE_EXHAUSTION_PROOF. User acceptance is required; overall topology allPass remains false.

## Integration and authority

| Item | Value |
| --- | --- |
| Latest consumed origin/develop | `5123966f62dbe9587a3bbe38e877ccf3ea959b80` |
| Normal merge commit into B | `509c9fda40bb443b5a9c4a5e6ef36e875e713744` |
| Preserved Round-2 B checkpoint | `f70c154a881fd6aa620481639aef0b2e76ff6a46` |
| Amendment | `8ac80bf5d684a34145489f27c6cf2e6bd1e22e67`, [post-Canonical final replay](AMENDMENT-TASK-085-b-post-canonical-final-replay.md) |
| Execution comment | [Issue #442 comment 5912322940](https://github.com/kanzakimy0/TravelAssist/issues/442#issuecomment-5912322940) |
| Branch / PR | `feature/b-poi-transport-node-access-edges` / Draft #464 |
| Canonical revision | `task-083-a-pilot100-owner-adjudication-v2` |
| Runtime manifest file SHA256 | `b4f714078d2780324f9e98fbaf58001177040dbc30d9693e7bfef1019d6643df` |
| Dataset file SHA256 | `c3ed64d518913be8c9c8d4ec07ed85bf4a446228e73ca1ac19026057efd1c6af` |
| Dataset semantic SHA256 | `0a91f0ec36c193b4a95c15dcad01338286ea91afb5003f3e1abdf7c7a9366ad5` |
| Correct supporting sample SHA256 | `6d6187e53f6235abc757795896b8ba441736ce078e1e5b3e0c70df14c4709d51` |
| Owner adjudication file SHA256 | `b80ae442d6a5fe883e9491fce6d242c7edce1d4c119e03975a1df43fd0be3d85` |
| Owner adjudication revision | `task-083-a-access-adjudication-20260930-v1` |

Runtime path: `src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json`. Adjudication path: `src/shared/data/canonical-poi-pilot100.access-adjudication.v1.json`. These files and the dataset, sample, registry and original admission receipt match merged develop exactly. PR #465 is authoritative; B did not repair or rewrite them. The [supporting-hash audit](../qa/TASK-085-B/canonical-supporting-hash-audit.md) retains the original CRLF/LF finding and records its owner-authorized resolution.

The merge was conflict-free and preserved newer develop WBS facts. Final B head and exact-head CI are recorded in the existing PR body after commit/push, avoiding a self-referential committed head hash.

## Offline evidence replay

[inputs/post-canonical-replay.json](../../data/transport/access/inputs/post-canonical-replay.json) is an explicit replay receipt built from Git blobs at the frozen B checkpoint and merged develop. It verifies exact ordered membership, all 95 non-excluded records byte-semantically unchanged, and unchanged identity/name/coordinate/code fields for the five owner-adjudicated records. Source/review/license inputs are byte-identical to the frozen B checkpoint. No S12/P11/GTFS extraction, national search, web discovery or Provider query ran.

The original extraction receipts and discovery reviews keep their old dataset hash. The replay adapter first validates the old and new authority, unchanged per-record projections and every source input hash. Only then does it produce an in-memory review with the new Canonical binding. Missing/stale review, changed source/rights/config, changed non-excluded record or coordinate, or unexpected membership fails closed. It never silently replaces original review evidence or expands the physical-exhaustion claim.

[post-canonical-replay-audit.json](../../data/transport/access/post-canonical-replay-audit.json) verifies byte-identical admission records (5,200 admitted / 344 HOLD), all 680 confirmed directed edges and all candidate decisions. The existing 1,887/245 baseline and 772 directed-candidate preservation checks also PASS. The original topology fact review and its source/identity seals are revalidated without regenerating them.

The new Canonical fingerprint invalidates the intact old batch receipt, triggering normal regeneration of derived metadata. Subsequent checksum skip, full rebuild, single-batch rerun and corruption tests verify determinism. The generated timestamp retains its documented source-review snapshot meaning.

## Owner exclusions, retained in raw outputs

| Identity | Authoritative owner decision |
| --- | --- |
| J-WORLD TOKYO | permanently_closed; no Sunshine City substitution |
| レインボープール | permanently_closed; no park/new facility substitution |
| 舳倉島 | temporarily_closed for ordinary tourism; resident/recovery-only access |
| 鶴見つばさ橋 | active infrastructure, NOT_A_VISITOR_ENDPOINT |
| 我善坊谷 | active historical identity, HISTORICAL_RECORD_ONLY |

All five have FINAL owner decisions, `generalTouristAccessEligible=false`, null visitor endpoint and null replacement. They remain explicit in completeness/raw unresolved outputs with OWNER_ADJUDICATED_EXCLUDED; `canonicalAdjudicationRequired=false`. The pending owner count is zero. Under-target assessment and fixpoint proofs include only the nine remaining assessed cases. No identity was deleted, rebound or substituted.

## Nine cases requiring user acceptance

| POI | Confirmed useful nodes | Exact missing source/license/identity evidence |
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

For every case, merge-time proof validation = PASS and PR #465 introduced no blocker-releasing evidence. Exact source URLs, per-candidate/name dispositions, missing evidence types, required publisher changes and all full proof-bound hashes are in the machine audit linked above. Source/license/identity fixpoint is PROVEN within the frozen reviewed source snapshot; it is not a claim of physical non-existence or Internet-wide exhaustion.

| POI | Previous proof SHA256 | Replayed proof SHA256 | Valid after merge / new relieving evidence |
| --- | --- | --- | --- |
| 飛水峡 | `ad410860becf585c14b82095474eeb7959bc2e698370b895a779c365837f5616` | `7fbd03263004c2c99885f4b63ef987b6beb7e36286be71e905bc94e44dd1708b` | PASS / none |
| 御影大橋 | `2faee6d61b08fd2a2ef2d2345d5a2f56f7515a3c56a4e84bf9f5a9ea0d45b7a4` | `2e085d74972c00d0e23daefec94365ba4d0e46447d65af55564698787b3d8a51` | PASS / none |
| 田倉山 | `4f23caf6eb168e45b21a34f58e64d57df6b406da2052f4da3a2bfa49d415fa26` | `2d19cd7ec520d796e93db4f3717f7a8ce3aecb1bf364c38cbc6c9ba27ead3297` | PASS / none |
| 池原橋 | `3b15b92321014914c8412507c10a1098135c717a787a53952f465026a0a3f71f` | `18b8abb97e9e8af80190a435d272c6bb333ef7aed8f8beddfb299d2805e2bd16` | PASS / none |
| まほろば湖 | `f4001e9a86eee39dcee58042b425ea8c5685fae9673c07f01286bf798d60ad7c` | `d1de1c0f5147a1953a697ad0d943e0a3514b69422ba4608d6b284d232d6250d6` | PASS / none |
| みさき公園 | `e569b7f79278c0dfd74392059f3180bb73f22fa6a27526f46f315a055bfc7338` | `68b326f01f84e2ee3896b0e4969c0589c3d1f8cb796c08549d0d1423b929fe04` | PASS / none |
| 阿瀬川橋 | `972c01329edbd06383695298e083ae3c8cf7e942dc1628c6bae4aa603791f4ca` | `d0fd7917524f6d57d17366d6c3f255c9767fc92e3492e08648c4c146c164529e` | PASS / none |
| 韮崎中央公園陸上競技場 | `0f9695866e48647f0690916e0c22d491c6f978e0cf5fcfc7d537445a4522c201` | `bda516af66b7e32c23dedffd0b62f78b10057c7658f18c365dbafafda320c30c` | PASS / none |
| ミュージアム都留 | `36a75f7c32f53661add6dfa39b8765ea247256d5de3d26e290bf5f600c89e486` | `ab077dc677aa8470f132b4faaddd6b0cd2e1fa7b7d922e0e752cfcbf058a4f84` | PASS / none |

Each proof retains the original candidate-decision, named-gateway, source-scan, fact-review, source-rights, node-admission and spatial-config hashes. Only Canonical dataset binding and its resulting review/proof digests change. The shared original/new dataset hashes, every old/new inventory field and per-case validation result are recorded in the audit. No additional non-fixpoint failure exists.

## Final metrics and failed gates

| Metric | Raw corpus | Authoritative assessment |
| --- | --- | --- |
| Count / scan / explicit outcomes | 100 / 100% / 100% | 95 |
| Confirmed topology coverage | 94/100 | 94/95 = 98.9474% |
| Zero-node count | 6, including 5 owner exclusions | 1: 阿瀬川橋 |
| At least 3 useful nodes | 86/100 | 86/95 |
| Mean / median useful nodes | 3.4 / 3 | 3.578947 / 3 |
| Min / max useful nodes | 0 / 6 | 0 / 6 |
| Under-target | 14, including 5 owner exclusions | 9 audited fixpoint exceptions |
| Confirmed relationships / directed edges | 340 / 680 | 340 / 680 |
| Pending directed candidates | 638 | Quarantined, not accepted edges |
| Walking / transit / taxi resolved POIs | Each 0/100 | Each 0/95 |
| Accessibility / stairs / elevation / detour / P90 known POIs | Each 0/100 | Each 0/95 |

Local-node coverage is 70/100; major hub 1/100; tourism gateway 44/100; special access 18/100, union 45/100. Directed edges/POI mean/median/min/max = 6.8/6/0/12. All 680 edges have unresolved route metrics: 2,040 mode-specific unresolved rows. Observed extreme detours = 0 with zero assessable actual routes; this is not real-route clearance. Detailed raw unresolved reason distribution is in manifest.json; owner exclusions are separately classified from the one assessed zero-node case.

Topology gates: **21 PASS / 3 FAIL**, including all A/Canonical gates PASS. The three failures remain factual:

| Gate | Actual | Required | Audited cases |
| --- | --- | --- | --- |
| Valid Canonical POIs with confirmed useful topology | 94/95 | 95/95 | 阿瀬川橋 |
| Zero-node valid accessible POIs | 1 | 0 | 阿瀬川橋 |
| Under-target without physical exhaustion proof | 9 | 0 | All nine cases above |

Accepted node provenance 5,200/5,200; edge provenance and essential fields 680/680. Duplicate edges, invalid identities, rejected v1 usage and unreviewed v2 promotion are all zero. Graph growth PASS, 680 <= 100 × 8 × 2. One batch/receipt, configured size 200. Physical CANDIDATE_EXHAUSTION_PROOF count remains zero. `globalTopologyDiscoveryFixpoint=PROVEN`.

The exception status is available only when the failed-gate set is confined to those three gates, affected POIs equal the audited nine-case set, A/Canonical gates all PASS, and replay/provenance/identity/determinism/batch/growth checks PASS. Any new failure or stale proof produces BLOCKED_POST_CANONICAL_REPLAY_INTEGRITY. This policy does not turn failed gates into PASS or complete WBS 7.15.

## Provider, licenses and integration boundary


Source-specific rights, archive/entry hashes, retention and attribution are in [manifest.json](../../data/transport/access/manifest.json) and [source-rights.json](../../data/transport/access/inputs/source-rights.json). S12 is CC BY 4.0; P11 is PDL 1.0. Licensed community/municipal GTFS inputs provide static stop identities. Four pinned CC0 Wikidata entities supply individually reviewed terminal/port identities, joined to official sources. No GTFS snapshot is treated as evidence of current service or an unmeasured last-mile route.

S12 archive SHA-256: `0785e932a32b3ec15e1a1345537ae145eafe1c07bf38d5c16c11ee2b391e7a28`. P11 archive SHA-256: `12132cc1c349d5d84c1ae90e7e5fff7c12a79540f4487edfae46e9f640bc1c72`. National scans cover 10,534 S12 features and 278,515 P11 features; only bounded or explicitly named locality-qualified derivatives are retained.

Google Routes has no demonstrated full batch/cache/retention/production/derivative grant; Ekiworld remains evaluation-only; ODPT's inaccessible provider-specific grants were not presumed. All fail closed. **Route-provider batch requests = 0; raw route-provider payloads persisted = 0.** Official access pages contribute short reviewed facts/source links, not copied raw payloads or measured routes.

Haversine is only `straightDistanceM`. Actual walking distance, duration and detour ratio remain separate nullable fields. Directional routes must independently pass licensing, endpoints, complete last-mile and barrier checks. QA detects extreme detour, river/bridge, rail/highway, mountain, gated and impossible-route cases. Zero/estimated values are not coverage substitutes.

The task-owned additive adapter wraps TASK-082 GraphRef / PoiMobilityEdgeV1 and reuses its directed/unresolved semantics and validators. No second Planner contract, runtime/API/public behavior change, or 43-dimensional POI copy was introduced.


## Verification and handoff

Final replay inputFingerprint: `61b4cbd5425d24fc41283b448e78ccb24b4f6b63bbc81f575fcc179125ffe834`.

Focused tests: 21/21 PASS, all repeated in the final full regression: **2,850/2,850 PASS**. Lint: 0 errors / 10 existing warnings. Typecheck and formatting PASS. Deterministic filesystem rebuild, checksum skip, input invalidation, injected receipt/artifact corruption detection and single-batch rerun PASS.

Validation results and log hashes are recorded in [QA](../qa/TASK-085-B/README.md) and [local-validation.json](../qa/TASK-085-B/local-validation.json). Final code checks and exact-head Quality Gate are recorded after validation and push in Draft PR #464. The user must decide whether to accept these nine real-data boundaries before final merge/closure. This run stops at that decision; no merge, auto-merge or TASK-086.

Production build and standalone artifact re-verification: **PASS**, 1,908 files. Exact final-head CI receipt is in Draft PR #464.
