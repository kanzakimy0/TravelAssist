# TASK-086-B connectivity replay

The national backbone gate **FAILS**. The Tokyo anchor is a held discovery identity, so there is no admitted national anchor and no required node is claimed connected to it. Local regional paths exist; these cannot stand in for national T0/T1 connectivity.

| Inventory / admission                           |         Count |
| ----------------------------------------------- | ------------: |
| All required obligations                        |          1038 |
| Admitted                                        |           327 |
| HOLD                                            |           711 |
| Rejected                                        |             0 |
| Required T0 connected                           |        0 / 89 |
| Required T1 connected                           |       0 / 462 |
| Other required connected                        |       0 / 487 |
| Disconnected required, without proof            |          1038 |
| Service patterns / lines                        |        63 / 9 |
| Service segment / hub transfer / direct service | 1314 / 25 / 0 |

The 89 T0 and 462 T1 requirements include protected v2 candidate obligations, not wholesale node admission. Every source stop used by an admitted pattern is retained, including intermediate boarding points. Cross-source identities are not joined by name or distance.

| Directed edge mode | Count |
| ------------------ | ----: |
| airport_bus        |    88 |
| ferry              |    11 |
| highway_bus        |  1059 |
| local_bus          |   156 |
| transfer           |    25 |

## Inventory kinds and operator attribution

| Required node kind      | Count |
| ----------------------- | ----: |
| rail_station            |   202 |
| private_rail_station    |   168 |
| metro_station           |   143 |
| shinkansen_station      |   108 |
| airport                 |    86 |
| bus_terminal            |     1 |
| other_tourism_transport |     3 |
| bus_stop                |   320 |
| ferry_port              |     7 |

Exact tier denominator: T0 89, T1 462, T2 374, T3 53, REVIEW_REQUIRED 60. Held obligations remain in these counts. Operators on service edges: 長崎県交通局 1,303; 福岡市営渡船 11. The 25 transfer edges have no service operator assignment (`undefined` aggregation bucket); they retain their GTFS transfer source and component identities.

## Corridor and transfer QA

Graph queries: **22/1109 PASS**. Mandatory named national corridors: **0/9 PASS**. The inventory automatically adds 1,037 anchor corridors and actual service patterns add 63 endpoint corridors. Each result records forward/reverse edge IDs; failed queries do not insert edges. The 41 failed regional endpoint queries remain visible, including direction-specific boarding points lacking an independently evidenced return transfer.

Explicit GTFS transfers: **25/25 represented**. V2 multi-component hub scopes still requiring admission/transfer review: **218**. A GTFS parent station or matching name is never sufficient transfer proof.

Airport surface: **FAIL**, 86 airport identities remain held. Licensed airport bus segments are present, but a bus stop is not automatically rebound to an airport identity. Ferry/island: **FAIL national connection**, seven licensed ferry stops form regional passenger routes. Major highway/tourism bus: **FAIL national coverage**, despite the five bounded licensed Nagasaki routes. Required special tourism modes: **FAIL**, inventory/evidence discovery remains open. Rail, Shinkansen, metro, private rail and flight production edges: **0**.

## Computed deficits

| Class                     | Count |
| ------------------------- | ----: |
| AIRPORT_SURFACE_GAP       |    86 |
| CORRIDOR_UNREACHABLE      |  1087 |
| DISCONNECTED_T0           |    89 |
| DISCONNECTED_T1           |   462 |
| DYNAMIC_METRIC_ONLY_GAP   | 13391 |
| HIGHWAY_BUS_GAP           |     2 |
| HUB_TRANSFER_GAP          |   218 |
| ISLAND_FERRY_GAP          |     7 |
| MISSING_INTERMEDIATE_NODE |   487 |
| NODE_IDENTITY_GAP         |   711 |
| SERVICE_PATTERN_GAP       |     2 |
| SOURCE_LICENSE_GAP        |     1 |
| TOURISM_SPECIAL_MODE_GAP  |     1 |

Deficit classes overlap: one held airport may generate identity, connectivity, mode and corridor failures. Counts are not distinct missing-node totals. The exact disconnected inventory IDs are in `connectivity-audit.json`; detailed failures are in `topology-unresolved.jsonl`.

## Dynamic coverage

| Field               | Resolved / all directed edges |
| ------------------- | ----------------------------: |
| accessibility       |                      0 / 1339 |
| calendar            |                   1314 / 1339 |
| durationP90Min      |                      0 / 1339 |
| durationTypicalMin  |                      0 / 1339 |
| fareTypicalYen      |                      0 / 1339 |
| firstDeparture      |                      0 / 1339 |
| frequencyTypicalMin |                      0 / 1339 |
| lastDeparture       |                      0 / 1339 |
| reservation         |                      0 / 1339 |
| seasonal            |                      0 / 1339 |
| transferTimeMin     |                     24 / 1339 |

Calendar data belongs to source snapshots and is not realtime service assurance. Transfer time is resolved for 24/25 transfer edges; the other edge remains confirmed with unknown minutes. Individual GTFS timetable/fare rows are retained as licensed source evidence but are not converted to guessed typical fare, frequency or P90. Unresolved metrics never delete topology.
