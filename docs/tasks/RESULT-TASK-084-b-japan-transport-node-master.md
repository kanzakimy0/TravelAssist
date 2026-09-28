# RESULT — TASK-084-B Japan TransportNode Master

## Status

**PARTIAL / BLOCKED. TASK-084-B has not passed. TASK-085-B and TASK-086-B have not started.**

- Issue: #441; WBS 7.14: 阻塞
- Base: `origin/develop@511508c9a59c3b94c7d72cedbf5ff559da69ded8`
- Branch: `feature/b-japan-transport-node-master`
- Implementation commit: `bb849c3091d53a1bd23c9b7cf9a00949a330f393`
- Review: [Draft PR #448](https://github.com/kanzakimy0/TravelAssist/pull/448); do not merge as completed national master
- Runtime integration: `DEFERRED_TO_A`
- No TransportNode ID was accepted or allocated; no runtime, Route API, Planner, Provider adapter or cache code was changed.

## Upstream gates

- TASK-082-A's shared `TransportNodeV1` and `PoiMobilityEdgeV1` are the existing A contract. Its Result says the real 500-POI pilot is blocked, the real TransportNode inventory is absent, and nationwide graph expansion must wait. B does not create a second runtime contract.
- WBS 7.5 Route Schema is complete. Route Provider bulk query, derivative persistence and production rights remain unconfirmed. No Route Provider request or payload was used.
- `develop` has zero active Canonical POI allocations. TASK-083-A / PR #444 was Draft and unmerged at this checkpoint. Candidate POI rows are not an admission source.

## Completed partial data production

The official MLIT N02 2025 railway edition is [CC BY 4.0](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html). The downloaded source ZIP (`N02-25_GML.zip`) has SHA-256 `aaf76af133b2e771e538fabc4646d2e443dc1d5a67b221382a28d744e706cc9f`; the station GeoJSON entry has SHA-256 `908e2c3036e9c80760ae3514be3682c77f81f0bd60ab5fb1b3da1aa9352bbd94`. Source reference date: 2025-12-31. TravelAssist extracted and edited the source into candidate observations; attribution and edit provenance are retained in the manifest and every candidate.

The extractor selects N02 station records whose line name contains 新幹線. It joins the two repeated source station-code/line/operator geometries as unresolved source components, without promoting group codes or same-name stations into hubs. Its output is 110 deterministic **candidates**, from 112 source geometries, over 8 lines and 5 operators. 108 have a provisional line-midpoint coordinate; 2 multi-segment candidates retain no chosen point. All 110 are `REVIEW_REQUIRED`, with explicit identity, hub and municipality reasons. These are not accepted TransportNodes.

Artifacts under `data/transport/nodes/task-084-b-candidates/` contain one 200-node batch, input manifest, records, identity decisions, unresolved ledger, receipt, hashes and aggregate manifest. The raw 14.9 MB source ZIP is kept outside Git. The standard-library extractor supports checksum resume, deterministic rebuild, a selected batch rerun and corruption detection. Fixture tests never enter the real artifact.

## Metrics

| Measure | Accepted | Candidate observation |
| --- | ---: | ---: |
| TransportNodes | 0 | 110 |
| T0 / T1 / T2 / T3 | 0 / 0 / 0 / 0 | unassigned |
| Stations / shinkansen | 0 / 0 | 110 / 110 |
| Airports / bus terminals / ferry ports | 0 / 0 / 0 | 0 / 0 / 0 |
| Operators | 0 | 5 |
| Provenance coverage | not applicable (0 accepted) | 110/110 |
| Coordinates | 0 | 108 provisional, 2 unresolved |
| Parent hubs | 0 | 0 resolved |
| Unresolved / review required | 110 / 110 | 110 / 110 |
| Batches | 1 | 1 |

No 47-prefecture coverage or national connectivity claim is made.

## Stop reasons and license decision

1. The N02 station code is assigned by latitude order and cannot by itself satisfy immutable accepted TransportNode identity. The source's group code groups same-name stations within 300 m; it is insufficient evidence for a hub or operator-component merge.
2. N02 provides station-line geometry, not a validated entrance or interchange point, and does not provide a reviewed municipality/hub mapping. Those fields remain unresolved.
3. The official [N09 passenger-route dataset](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N09.html) is marked noncommercial; it was not imported for persistent ferry data. The remaining bus, airport and tourism-node sources have not been validated into a national identity inventory. Each dataset requires its own version-specific rights check.
4. No authorized Provider bulk/cache/retention/derived persistence rights are on record. Route facts and realtime fields remain unresolved.

These stop conditions prevent TASK-084-B PASS. The next step is a reviewed, persistent node identity ledger with municipality and component-to-hub decisions, plus separately licensed airport, bus, ferry and tourism sources. Then rerun the deterministic batches and perform national coverage QA. Only after 084 passes may 085 and 086 start.

## Verification

See [TASK-084-B QA](../qa/TASK-084-B/README.md). The partial extractor's synthetic tests cover checksum skip, deterministic rebuild, a selected batch rerun, and corrupted receipt rejection. This checkpoint does not claim a completed national master.
