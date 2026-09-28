# RESULT — TASK-084-B Japan TransportNode Master

## Status

**PARTIAL.** The combined master now has **167 `NODE_ACCEPTED` TransportNodes**, up from 110 in the prior checkpoint. This run accepted **57 new nodes**: 22 conventional/metro/private rail components at the five existing hubs, 28 airports and 7 Fukuoka municipal ferry gateways. The national coverage gate has **not** passed. [Issue #441](https://github.com/kanzakimy0/TravelAssist/issues/441) and [Draft PR #448](https://github.com/kanzakimy0/TravelAssist/pull/448) remain open; do not merge as a completed national master. Runtime integration remains `DEFERRED_TO_A`. TASK-085-B and TASK-086-B remain unstarted.

The prior 110 TransportNode IDs and five hub IDs have **not changed**. Their original [node ledger](../../data/transport/nodes/transport-node-identity-ledger.jsonl) and [hub ledger](../../data/transport/nodes/transport-hub-identity-ledger.jsonl) retain their exact prior SHA-256 values, which the master assembler enforces. New rail, airport and ferry IDs live in additional committed identity ledgers. All source codes and feed stop IDs remain external references, never TravelAssist IDs. Rebuilds read the ledgers and fail on identity signature drift.

## Accepted layers and hierarchy

| Measure | Current result |
| --- | ---: |
| Total accepted / newly accepted this run | 167 / 57 |
| T0 / T1 / T2 / T3 TransportNodes | 0 / 28 / 139 / 0 |
| Shinkansen / conventional JR / metro / private rail | 110 / 14 / 5 / 3 |
| Airports / major bus terminals / ferry gateways / special tourism transport | 28 / 0 / 7 / 0 |
| Accepted hubs / explicitly linked components / hub-unresolved nodes | 5 / 31 / 108 |
| Hub hierarchy T0 / T1 | 3 / 2 |
| Current prefecture / municipality coverage | 0 / 167; 0 / 167 |
| Coordinate role coverage | 167 / 167 |
| License-blocked or unresolved datasets | 3 (N03 secondary-use review, N09 noncommercial, Shimoden provider-specific bus restrictions) |
| Source-unresolved coverage | Major bus terminals, other island ferries, tourism special transport and current administrative boundaries; see national coverage audit |
| Combined accepted master batches | 1 of 167, limit 200 per batch |

T0/T1 counts for **TransportNodes** and for **Hub identities** are distinct. The five hubs are not automatically all T0. The reviewed expanded hub view classifies Tokyo, Shin-Osaka and Hakata as T0; Kyoto and Omiya as T1, with [hierarchy decisions](../../data/transport/nodes/task-084-b-national-master/hub-hierarchy-decisions.jsonl). The original hub ledger keeps its preliminary levels for immutable checkpoint traceability; the combined master supersedes them. Station and ferry components remain T2; the 28 A-class airport gateways are T1. Further national hierarchy review is required.

## Source and identity decisions

- **Rail:** [MLIT N02 2025](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html) is CC BY 4.0, reference date 2025-12-31. Twenty-two selected components connect the five existing Shinkansen hubs to JR conventional lines, metro and private railway. Each link records an official operator station guide and a spatial check against an accepted Shinkansen component. A same-name Hankyu 大宮 station in Kyoto was explicitly excluded from the Saitama Omiya hub. The N02 representative point is not an entrance or walking route point. The 110 original Shinkansen components and 22 new rail components are not a national major-rail inventory.
- **Airports:** The [MLIT Aviation Bureau list](https://www.mlit.go.jp/koku/15_bf_000310.html), current 2026-09-01, supplies current identity and A-class category. [MLIT C28 2021](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-C28-2021.html) supplies historical airport reference points. Its "商用可" license, read with the [applicable MLIT terms](https://nlftp.mlit.go.jp/ksj/other/agreement_02.html), permits attributed commercial reuse and derivatives. Twenty-eight crosswalks passed exact name, current and historical category, expected prefecture prefix, unique reference-point relationship and Japan coordinate bounds. Every accepted airport records `identityObservedAt=2026-09-01`, `coordinateObservedAt=2021-12-31` and `coordinateRole=AIRPORT_REFERENCE_POINT`; no point is claimed as a current terminal entrance. The C28 UTF-8 GeoJSON names were byte checked: **they do not contain replacement characters**. The previous report's contrary claim came from terminal display encoding, and is corrected here. The GML XML was used for the reviewed crosswalk.
- **Ferry:** A [Fukuoka City municipal ferry GTFS dataset](https://data.bodik.jp/dataset/9938b52c-e54c-4d92-9975-a98c5f60e727) is published under CC BY 4.0. Its ZIP (SHA-256 `b39a7590d454e37a400f724472e4969133c7b9f54b8600dce68bc47fa0da1b9e`) has seven used passenger stops on four ferry routes, with a 2026-01-01 to 2027-12-31 feed window. All seven were accepted as ferry stop points, not walking entrances. [MLIT N09](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N09.html) remains noncommercial and excluded.
- **Bus:** The [per-feed GTFS license registry](../../data/transport/gtfs-source-license-registry.jsonl) records Fukuoka ferry as accepted, an Ikoma community bus feed as CC BY 4.0 source-pass but outside this major-terminal selection, and an ODPT/ Shimoden bus feed as blocked by provider-specific prior-approval terms. GTFS-JP as a format does not grant a feed license. No major bus terminal is accepted yet.
- **Administrative:** [MLIT N03 2026](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html) retains a GSI secondary-use caveat. No N03 polygon was imported or used for a persisted spatial join. C28's historical airport municipality code is retained as source evidence only; current prefecture and municipality fields remain null for all 167 nodes.

## National gate and integrity

The [combined master](../../data/transport/nodes/task-084-b-national-master/manifest.json) consolidates the 110 old nodes, 22 rail nodes, 28 airports and 7 ferry gateways into deterministic 200-node batches. It checks each stage's manifest, receipt and node hashes; all ledgers; duplicate IDs; previous ID immutability; and explicit hub decisions. Verified resume, deterministic rebuild, selected-batch rerun and corrupted-receipt rejection are covered by tests. Raw N02, C28 and GTFS ZIP files stay outside Git.

The [national coverage audit](../qa/TASK-084-B/national-coverage-audit.md) records the gaps: major rail and metro beyond five hubs, airport terminal and access rail, major bus terminals, other ferry/island networks, ropeway/cable/funicular gateways, and current 47-prefecture administrative coverage. Route Provider bulk, persistence and derived-use rights remain unconfirmed; no Provider payload was used. Even a future TASK-084 PASS does not start TASK-085-B until a formally accepted Canonical POI Registry is on `develop` or separately authorized. Draft PR #444 remains outside that gate.

## Verification

See [TASK-084-B QA](../qa/TASK-084-B/README.md). This checkpoint distinguishes node acceptance from the still-PARTIAL national master.
