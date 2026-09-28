# TASK-084-B national coverage audit — 2026-09-28

Status: **PARTIAL**. The 167 accepted TransportNodes are a selected network seed, not a complete national Planner inventory. This checklist is QA only; corridor examples do not drive the candidate selection scripts.

| Layer | Accepted | Remaining national gap |
| --- | ---: | --- |
| Shinkansen station components | 110 | Hub relationships unresolved for 101 |
| Major conventional JR components | 14 | Only five pre-existing Shinkansen transfer hubs reviewed |
| Metro components | 5 | Only five pre-existing hubs reviewed |
| Private railway components | 3 | Only five pre-existing hubs reviewed |
| Airports | 28 | Aviation Bureau A-class airports only; 2021 C28 reference points are explicitly historical; terminal components pending |
| Major bus terminals | 0 | No major terminal selected from a licensed feed |
| Ferry gateways | 7 | Fukuoka municipal ferry only; N09 excluded |
| Ropeway, cable car, funicular, tourist shuttle | 0 | Sources and tourism relevance pending |

The master has five accepted hub identities. The expanded view has 31 explicitly linked station components: 9 prior Shinkansen and 22 new conventional/metro/private. Its reviewed hierarchy is 3 T0 (Tokyo, Shin-Osaka, Hakata) and 2 T1 (Kyoto, Omiya). The immutable original hub ledger retains its preliminary T0 fields; the national master hierarchy decision file supersedes those fields without changing a `hubId`.

Current prefecture assignment: **0/167**. Current municipality assignment: **0/167**. C28 holds historical administrative codes for the 28 airports, spanning 21 prefecture prefixes, but these are not promoted to current administrative assignments. The N03/GSI secondary-use decision remains pending. Therefore the 47-prefecture administrative coverage gate is unverified.

## Corridor spot checks

| Corridor or gateway | Current evidence | Gap |
| --- | --- | --- |
| Tokyo | Core rail/metro hub and Tokyo international airport | More metro/private rail, airport access railway and bus |
| Yokohama, Hakone, Kawaguchiko | Shinkansen line coverage near some corridors | Local rail and tourism gateway nodes |
| Nagoya | Shinkansen components and Chubu airport | Central rail/metro hub and airport access |
| Kyoto, Osaka, Kobe, Nara | Kyoto and Shin-Osaka hubs; Kansai/Osaka airports | Osaka/Umeda, Kobe, Nara and tourism corridors |
| Hiroshima | Shinkansen components and airport | Conventional rail/bus transfer |
| Fukuoka | Hakata hub, Fukuoka airport and seven city ferry gateways | Bus and wider ferry/island networks |
| Kumamoto, Kagoshima | Shinkansen components and airports | City rail and tourism connections |
| Kanazawa, Sendai, Sapporo, Hakodate | Some Shinkansen components and regional airports | Major central rail and metro hubs |
| Okinawa and other islands | Naha airport; Fukuoka island ferry example | Okinawa and other island ferry/bus gateways |

The accepted artifacts do not assert connectivity between modes, route times, pedestrian access or service frequency. TASK-085-B and TASK-086-B remain unstarted.

Source-unresolved coverage remains explicit: major bus terminals lack a selected admissible feed; ferry and island services outside Fukuoka need provider-specific licensed sources; tourism special transport has no admitted source; and current administrative boundaries await an N03/GSI rights decision or a licensed alternative. These are coverage gaps, not rejected node identities.
