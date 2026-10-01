# TASK-085-B review corrections

Review baseline: `445fbfd57d09108b271261a3d24ba51cd83103ad`, Draft PR #464. This correction does not authorize TASK-086, runtime import, production routing, or Canonical expansion.

## Missing station identifiers

`identityFor` previously converted `null` to the nonempty string `"null"`. It now validates raw values before conversion. Missing/blank/null-like values cannot become external IDs. Mixed rows retain only genuine identifiers. Records with no genuine identifier receive a deterministic quarantined record identity and remain HOLD; that identity is not a transport admission.

The explicit, source-hash-bound migration is in `data/transport/access/reviews/identity-corrections.json`. It retains all original source rows and the old bindings, identifies the review baseline, records each new binding and decision, and validates the exact corrected baseline output hashes. It never silently accepts an unregistered new ID.

- Fourteen source records contain missing station codes.
- 須坂 retains `002014` and drops the missing value. The binding migration updates the reviewed topology join, candidate decisions, both directed edge IDs, endpoints, traces and metric-unresolved references. Two confirmed edge IDs change; their relationships and metrics do not.
- 菊水山 has no usable station code and changes from ADMIT to HOLD. It had no confirmed edge, so confirmed coverage does not fall.
- Twelve other records were already HOLD and remain HOLD. They previously collided on the same invalid operator/`"null"` key; quarantined source-record identities separate them without promoting them.

ADMIT becomes **5,201 unique nodes** (previously 5,202, also unique). HOLD becomes **345 records / 315 unique NodeIDs**, compared with **344 records / 303 unique NodeIDs** at review baseline. A HOLD record count is not a count of unique accepted stations.

`review-remediation-audit.json` binds all 694 original directions by POI, source-record identity and direction. It compares preserved relationship semantics and every route metric, while permitting only the explicit identity remap and added restriction metadata. It rejects other relationship changes. Confirmed relationships remain 347; directed records remain 694.

## Access limitations and consumer boundary

Every confirmed edge now carries the task-owned `task085Access` metadata, bound to its edge ID, POI, node and direction with a checksum. It includes each evidence ID/hash, exact `accessConditions`, prohibited directions, source links, review date and finding. New factual amendments retain their own source references and hashes. The two directions share topology restrictions only where supported; route metrics remain independent.

`readTask085Access` is the B review/export consumer. Missing metadata, changed restrictions, a metadata checksum mismatch, or metadata copied to another edge/direction fails closed. The acceptance gate checks all emitted directions against the exact evidence ID **and evidence hash**, avoiding a superseded evidence version with the same ID.

The fields `runtimeImportAuthorized=false`, `routable=false` and `consumerIntegration=NOT_CONNECTED_TO_A_RUNTIME` remain explicit. Full-journey public access and visitor endpoint validation remain unresolved. No A shared interface, Planner behavior or runtime consumer is changed. The B reader is tested; this is not a claim that A's production consumer has integrated the restrictions.

須坂/村山橋 retains onboard viewing and no boarding/alighting on the bridge. まほろば湖 retains the official Kintetsu mountain approach to the lake shore. The original long mountain trail is not deleted because an auxiliary URL discusses a different facility. Distinct railway/bus identities are not counted as independent park entrances. Historical walking events and maps do not establish 2026 full-course opening.

## Four outstanding evidence cases

| POI | Confirmed useful nodes | Current gap |
| --- | ---: | --- |
| 池原橋 | 1 | Additional named-stop-to-bridge official visitor access relationship, or reliable evidence supporting fewer useful gateways. Nearby stops and village-wide access instructions are insufficient. |
| みさき公園 | 1 | Licensed precise bus boarding coordinates and the corresponding join to the currently open A entrance. Positive 2026 opening evidence is now recorded; it is not absent. |
| 阿瀬川橋 | 0 | Legitimate current visitor endpoint and evidence linking named stops to it. Bridge ownership/inspection records and short straight distance do not establish this. |
| 韮崎中央公園陸上競技場 | 2 | Exact reusable coordinates for the boarding point at the new September 2025 arena. Official venue/operator access relationship already exists. |

The [2026 municipal Misaki notice](https://www.town.misaki.osaka.jp/soshiki/toshi_seibi/sangyo/kannkou/aratanamisakikouen/3141.html), updated July 16, and its [official area map](https://www.town.misaki.osaka.jp/material/files/group/20/areamap.pdf) establish area A (station-front plaza and the marked passage towards Nagamatsu coast), area B parking, and closed area C. Map SHA256: `9d4a0aef6c47c20a897447ed08570e625a024754e2751a43c14f24b882371fa8`. The factual summary and locator are retained, not the raw map. Parking and opening rules are not permission to derive precise bus stop coordinates from the schematic map.

On October 1, the [official Nirasaki GTFS metadata](https://api.gtfs-data.jp/v2/organizations/nirasakicity/feeds/shiminbus) still returned `gtfs_files=[]`, empty current/next URLs and CC0 metadata. Observed response SHA256: `c2fce467332e8fb0fa22a0baccd80b4092122486635f4bac769048b1867150e7`. The [municipal arena route timetable](https://www.city.nirasaki.lg.jp/material/files/group/1/uakaaaws.pdf) confirms the stop/service but does not supply boarding coordinates. The [official on-demand proposal](https://www.city.nirasaki.lg.jp/material/files/group/1/syoutaiassdf.pdf) names the arena meeting point, also without a reusable exact coordinate. These are retained as distinctions between known access and missing identity geometry, not as evidence the stop does not exist.

The [Toyooka bridge inspection inventory](https://www.city.toyooka.lg.jp/_res/projects/default_project/_page_/001/002/945/toyooka.bridge-tennkennkekka2025.pdf) and [2026 bus timetable](https://www.city.toyooka.lg.jp/kurashi/dorokotsu/buskotsu/1019743.html) establish different facts, not a visitor endpoint join. The [Shimokitayama access page](https://www.vill.shimokitayama.nara.jp/about/access.html) does not establish additional stop-to-bridge visitor relationships. No new coordinate, distance, license or exhaustion proof is fabricated.

All four remain evidence shortfalls. Canonical owner gates PASS only for the 100-record membership and 95-record assessment policy; that does not validate every tourist endpoint. No additional owner exclusion is made.

## Expansion authority

The requested 7,791 targets match the v1.66 Registry's `1xxxx`–`7xxxx` rows. The workbook is a work queue, not an admission manifest. TASK-083's current owner-authorized runtime manifest still contains 100 records, with assessment subset 95. Candidate-only rows, including workbook FROZEN rows, remain HOLD until A admits their identities and coordinates. `0xxxx` areas are excluded from attraction batches. `8xxxx` identities are node-only references and require explicit node admission, not name-only substitution.

The expansion outputs distinguish target scanning, existing verified coverage, new coverage, Canonical HOLD, owner exclusions and access shortfalls. A batch integrity PASS never promotes a held row or establishes nationwide backbone acceptance. Batch receipts bind inputs, results and edge checksums; directed restriction propagation and deterministic/resume/corruption checks remain mandatory.

## Workbook traceability

The review workbook reads `topology-evidence-export.jsonl`, the generator's complete 473-record evidence export. It no longer manually reconstructs the seven targeted facts without their Evidence IDs. Identity corrections, direction-specific restrictions, HOLD records versus unique IDs, and the 7,791-target batch dispositions are separately traceable. Reviewer opinions do not change machine acceptance.
