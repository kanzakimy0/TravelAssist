# RESULT — TASK-084-B Japan TransportNode Master

## Status

**PARTIAL.** 110 Shinkansen station components are `NODE_ACCEPTED`; the nationwide master has **not** passed. TASK-085-B and TASK-086-B remain unstarted. [Issue #441](https://github.com/kanzakimy0/TravelAssist/issues/441) and [Draft PR #448](https://github.com/kanzakimy0/TravelAssist/pull/448) remain open; do not merge this as a completed national master. Runtime integration remains `DEFERRED_TO_A`.

## Accepted rail identities

The [MLIT N02 2025 railway edition](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html) is CC BY 4.0 with reference date 2025-12-31. The source ZIP SHA-256 is `aaf76af133b2e771e538fabc4646d2e443dc1d5a67b221382a28d744e706cc9f`; its station GeoJSON entry SHA-256 is `908e2c3036e9c80760ae3514be3682c77f81f0bd60ab5fb1b3da1aa9352bbd94`. The raw ZIP stays outside Git. The extraction and identity review are TravelAssist edits, attributed in the artifacts.

The 112 Shinkansen station geometries yield 110 named operator/line station components. All 110 have a validated station-geometry representative point. This coordinate is **not** an entrance or walking route point. Two near-identical geometries at Shin-Osaka are averaged under a 100 m conflict threshold. Each component has its own accepted TransportNode identity. The committed [node identity ledger](../../data/transport/nodes/transport-node-identity-ledger.jsonl) supplies an opaque TravelAssist anchor, an immutable ID, an acceptance timestamp and evidence. N02 station and group codes remain external observations, not IDs. Changed source codes can update projected external references without changing the accepted ID; identity signature changes require explicit review.

The [core hub identity ledger](../../data/transport/nodes/transport-hub-identity-ledger.jsonl) accepts Tokyo, Shin-Osaka, Kyoto, Omiya and Hakata as five hubs, linking nine explicit Shinkansen component IDs. The links use official [JR East Tokyo](https://www.jreast.co.jp/estation/stations/1039.html), [JR West Shin-Osaka](https://eki.jr-odekake.net/premises?id=0610155), [JR West Kyoto](https://eki.jr-odekake.net/premises?id=0610116), [JR East Omiya](https://www.jreast.co.jp/estation/stations/350.html) and [JR West Hakata](https://eki.jr-odekake.net/premises?id=0910127) station guides. N02 same-name group codes alone create no hub. The hub model covers only reviewed Shinkansen components; conventional rail and metro members remain to be added.

## Metrics

| Measure | Current result |
| --- | ---: |
| Candidate observations / accepted TransportNodes | 110 / 110 |
| Accepted station components / accepted hubs | 110 / 5 |
| Components with unresolved hub relation | 101 |
| Municipality and prefecture assignment | 0 / 110 |
| Coordinate role coverage | 110 / 110 |
| N02 Shinkansen lines / operators represented | 8 / 5 |
| Broader railway and metro accepted | 0 |
| Airports / major bus terminals / ferry or island gateways accepted | 0 / 0 / 0 |
| License-blocked datasets | 2 (N03 municipality join pending secondary-use review; N09 noncommercial) |
| Candidate / accepted batch size | 200 / 200 (one batch of 110 each) |

These counts are node acceptance, not a 47-prefecture coverage or national connectivity claim. All accepted nodes currently have `nodeLevel=T2`; the five reviewed parent hubs are `T0`. The remaining hierarchy and nationwide tourism coverage have not been audited.

## Source decisions and unresolved work

- **Municipality:** [MLIT N03 2026](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html) states CC BY 4.0 but warns that GSI secondary-use procedures may apply. No N03 geometry was imported or spatial join persisted pending a documented determination against the [GSI use rules](https://www.gsi.go.jp/LAW/2930-index.html). Municipality and prefecture remain null.
- **Airports:** The [Aviation Bureau airport list](https://www.mlit.go.jp/koku/15_bf_000310.html), current as of 2026-09-01, establishes current airport identity and category, including 28 hub airports. [MLIT C28 2021](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-C28-2021.html) is marked commercially usable and contains airport reference and terminal points, but its coordinate snapshot is 2021-12-31. The downloaded ZIP was inspected (SHA-256 `07d69353a34558d7ebd21d4b5f62b685d4f9b9d0e55c6eed6ce05aefcc6b7b35`): it contains 108 airport polygons, 97 reference points and 96 terminal points. Its UTF-8 GeoJSON name attributes contain replacement characters; the GML XML has readable names but still needs a verified current-list crosswalk. No airport coordinate was imported in this checkpoint.
- **Bus:** GTFS-JP guidance [recommends CC0 or CC BY 4.0](https://www.gtfs.jp/developpers-guide/distribution_guidelines.html) for open feeds; this is not a license for every feed. No individual provider feed has passed a commercial persistence and derivative-rights check, so no bus terminal is accepted.
- **Ferry:** [MLIT N09](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N09.html) is noncommercial and excluded. No separately licensed operator or municipal feed has passed source review.
- **Provider data:** Route Provider bulk requests, retention and derivative persistence remain unconfirmed. No provider payload was used.

The next TASK-084-B work is targeted major railway and metro selection, a current airport-to-coordinate review, individual licensed GTFS source decisions, ferry/island and tourism gateways, administrative rights resolution, and national coverage/identity QA. TASK-085-B also requires an independently accepted Canonical POI Registry on `develop`; Draft PR #444 is not a formal input.

## Verification

See [TASK-084-B QA](../qa/TASK-084-B/README.md). Candidate and accepted artifacts contain checksum receipts and manifests; the acceptance script supports verified resume, deterministic rebuild, selected-batch rerun and corruption rejection. Source IDs remain external references, while the committed ledgers determine stable TravelAssist IDs.
