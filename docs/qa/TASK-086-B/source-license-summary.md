# TASK-086-B source-rights checkpoint

Status: **IN_PROGRESS_AUTO_REMEDIATION**. This is an ongoing-work checkpoint under [the no-early-exit amendment](../../tasks/AMENDMENT-TASK-086-b-autonomous-source-acquisition-no-early-exit-v2.md), not a terminal Result or acceptance request. Ordinary discovery remains and the global fixpoint is not proven. Work continues on the same branch and [Draft PR #466](https://github.com/kanzakimy0/TravelAssist/pull/466).

Executed source actions: **118**. Recorded source/terms observations: **649**. Latest reviewed-action rights decisions: `{'RAW_PERSISTENCE_ALLOWED': 11, 'TOPOLOGY_FACT_ONLY_ALLOWED': 101, 'REFERENCE_ONLY_DISCOVERY': 6}`. The queue retains actual attempts, URLs, response fingerprints, rights findings, extracted fact IDs, deficit targets, results and next actions.

## Retained representations

- MLIT S12 FY2024 (published 2026): independently acquired CC BY 4.0 archive `0785e932a32b3ec15e1a1345537ae145eafe1c07bf38d5c16c11ee2b391e7a28`; station-code/operator/line/coordinate identity facts only. Spatial group codes do not establish interchange.
- MLIT C28-21: commercial-use archive `07d69353a34558d7ebd21d4b5f62b685d4f9b9d0e55c6eed6ce05aefcc6b7b35` under its dataset-specific legacy terms. Explicit polygon-to-reference-point IDs produce 97 identities; coordinates describe whole airport facilities, not precise terminal gates. The 2021 identity snapshot establishes no current manager or concessionaire claim. Current passenger access is separately reviewed.
- MLIT P36-23: CC BY 4.0 archive `50d92052dd15ccf29fa86bee74b18ce7c95fcb9cb93678395842e67658f26de4`; 9,224 operator-specific highway-stop records resolve explicit GML point references. Busta Shinjuku admission covers only the reviewed JR Bus Kanto component and its current terminal connection, without claiming platform precision or all terminal operators.
- Toei Train GTFS: CC BY 4.0 archive `dd5757062317dcf18b8eeaf8bf83f6624ecd3c9fc4fe99918981e5ec2b42d8c4`, credited to 東京都交通局・公共交通オープンデータ協議会. Feed version 20260921 and validity window 20260314–20270312 support four selected actual Mita/Oedo trips on 20261001. The separate contest-only Pathways dataset is not used.
- Kotoden airport GTFS: CC BY 4.0 archive `6c2b1c419d05b9aa3a34439509a3f038a1c516603c405275f31603fdb54b2de6`, credited to ことでんバス株式会社. Two selected 20261001 trips retain 22 distinct boarding points. Kyushu Sanko airport GTFS: CC BY 4.0 archive `78c4853f0c5d3583d33610ea46bd68dd91e3352bab0472d2f07b09ac72b8364c`, credited to 九州産交バス / 産交バス GTFS repository; two selected trips retain 31 distinct stops. Current official terminal diagrams have separate fact-only rights and are not covered by the GTFS licenses.
- Additional CC BY 4.0 airport-scope GTFS archives: Tosaden `c6c8f6b4c2f8639349591aea1d8473285be62ca5ffbb5dcdc5c6efefec6ab4ee`, Tokushima Bus `d71d6bb1743a77bb21f2d044e9ddca326cf0859b281ebc4fae57eef338ef36da`, and Oita Kotsu `981d5d85acbb3539725550eab79a2bc0fd22d8d88a0928a8f51fc47551643e3e`. Exact actual trips retain repeated calls, directional flags and separate terminal endpoints.
- Geiyo Saijo Airport Limousine GTFS archive `85778d27f8588cbe77a7bc70ba22258c2884bdd2380ab26965803b5012065fcc` is published by the Hiroshima Bus Association under **CC0 1.0**. Two selected trips are explicitly active through date exceptions. Primary terms URL/hash bind the CC0 decision; the dataset is not relabelled CC BY and does not license unrelated terminal illustrations.
- MLIT P11-22 bus-stop archive `e74da3736c56ddeb1f47c18d6e5f373f40fa7f3c7d695593029e8ac7a7f790d1` is retained under the current Public Data License 1.0 decision for this open 2022 edition. It remains research input, not admitted platform identity or route topology.
- Original Fukuoka passenger ferry and Nagasaki purpose-bounded bus CC BY 4.0 raw GTFS archives remain unchanged; extraction and exact trip/call/transfer binding are revalidated.
- Official rail/metro/private-rail sources: minimal nonexpressive static calling order, component selectors and explicitly reviewed interchange facts. No redistribution permission for expressive tables, pages or maps is asserted. Operator and third-party copyrights remain reserved. No timetable clocks, fares or service calendars are copied from fact-only sources.
- Every minimal fact source retains both the minimal-fact-set fingerprint and the observed response fingerprint. Public-reference fallbacks label their fingerprint as a reviewed observation, never raw source bytes.

## Action audit

| Action | State | Attempts | Facts | Latest rights |
| --- | --- | ---: | ---: | --- |
| official-shinkansen | PENDING_RESEARCH | 0 | 0 | Not yet reviewed |
| odpt-national-rail | PENDING_RESEARCH | 0 | 0 | Not yet reviewed |
| government-s12 | INGESTED | 1 | 1 | RAW_PERSISTENCE_ALLOWED |
| government-n02 | PENDING_RESEARCH | 0 | 0 | Not yet reviewed |
| regional-open-gtfs | PENDING_RESEARCH | 0 | 0 | Not yet reviewed |
| v2-identity | PENDING_RESEARCH | 0 | 0 | Not yet reviewed |
| alternative-network | PENDING_RESEARCH | 0 | 0 | Not yet reviewed |
| rail:jr-central | INGESTED | 1 | 6 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-west | INGESTED | 1 | 4 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-kyushu | INGESTED | 1 | 6 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-east | INGESTED | 3 | 6 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-hokkaido | INGESTED | 2 | 5 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-shikoku | INGESTED | 1 | 6 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:tokyo | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:kyoto | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:shin-osaka | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:hakata | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:kumamoto | PENDING_RESEARCH | 0 | 0 | Not yet reviewed |
| rail:jr-east:north | INGESTED | 1 | 7 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-east:joetsu | INGESTED | 1 | 4 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-east-west:hokuriku | INGESTED | 1 | 7 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-east:chuo | INGESTED | 1 | 4 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:fujikyu | INGESTED | 1 | 3 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-east:urban | INGESTED | 1 | 4 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-west:osaka | INGESTED | 1 | 10 | TOPOLOGY_FACT_ONLY_ALLOWED |
| metro:tokyo:local | INGESTED | 1 | 71 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-east:chiba-yokosuka | INGESTED | 1 | 8 | TOPOLOGY_FACT_ONLY_ALLOWED |
| metro:osaka:local | INGESTED | 1 | 17 | TOPOLOGY_FACT_ONLY_ALLOWED |
| metro:fukuoka:local | INGESTED | 1 | 7 | TOPOLOGY_FACT_ONLY_ALLOWED |
| metro:nagoya:local | INGESTED | 1 | 13 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:osaka:metro-private | INGESTED | 3 | 23 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-east:kanto-backbone | INGESTED | 1 | 8 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:tokyu:local | INGESTED | 1 | 30 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:odakyu:local | INGESTED | 1 | 16 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:keikyu:local-and-kurihama | INGESTED | 3 | 16 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:keio:branch-local | INGESTED | 1 | 22 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:seibu:local-branches | INGESTED | 1 | 24 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:tobu:official-rights-review | RIGHTS_REVIEWED | 2 | 0 | REFERENCE_ONLY_DISCOVERY |
| rail:jr-east:kanto-remaining-calls | INGESTED | 1 | 11 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-central:ordinary-tokaido-chuo | INGESTED | 1 | 8 | TOPOLOGY_FACT_ONLY_ALLOWED |
| government:c28:airport-identities | INGESTED | 1 | 1 | RAW_PERSISTENCE_ALLOWED |
| airport:haneda:rail-access | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| airport:fukuoka:metro-access | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-hokkaido:airport-special-rapid | INGESTED | 1 | 3 | TOPOLOGY_FACT_ONLY_ALLOWED |
| airport:narita:jr-terminal-access | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| airport:kansai:jr-terminal-access | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:meitetsu:mu-sky-airport-gateway | INGESTED | 1 | 3 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:hankyu:reviewed-local-patterns | INGESTED | 1 | 21 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:hanshin:reviewed-local-patterns | INGESTED | 2 | 9 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:osaka-monorail:itami-airport-gateway | INGESTED | 1 | 4 | TOPOLOGY_FACT_ONLY_ALLOWED |
| air:ana:official-rights-review | SUPERSEDED_BY_ALTERNATIVE | 1 | 0 | REFERENCE_ONLY_DISCOVERY |
| rail:yui:current-directional-service | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| airport:naha:monthly-flight-and-surface | INGESTED | 1 | 3 | TOPOLOGY_FACT_ONLY_ALLOWED |
| government:p36:highway-stop-identities | INGESTED | 1 | 1 | RAW_PERSISTENCE_ALLOWED |
| hub:busta-shinjuku:current-jr-access | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| bus:jr-kanto:busta-current-component | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-west:remaining-kansai-local | INGESTED | 1 | 6 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:kyoto-metro:local-and-interchange | INGESTED | 1 | 6 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:mm21:local-and-interchange | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:kintetsu:official-rights-review | RIGHTS_REVIEWED | 2 | 0 | REFERENCE_ONLY_DISCOVERY |
| private:hanshin:partner-nara-local-pattern | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:toei:ccby-gtfs-train | INGESTED | 1 | 4 | RAW_PERSISTENCE_ALLOWED |
| private:sotetsu:reviewed-local-branches | INGESTED | 1 | 6 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:kita-osaka:directional-boarding-and-boundary | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:nishitetsu:local-stopping-rows | INGESTED | 1 | 8 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:fukuoka:nishitetsu-yakuin-kaizuka | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:tx:ordinary-and-nagareyama-interchanges | INGESTED | 1 | 4 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:keisei:ordinary-branches-and-jr-gateways | INGESTED | 1 | 15 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:rinkai:explicit-all-stations-rule | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:jrwest:hiroshima-kokura-shinkansen-conventional | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:jreast:niigata-sendai-shinkansen-conventional | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:sendai:current-municipal-subway-guide | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:sendai-airport:explicit-ordinary-stopping-rule | INGESTED | 1 | 5 | TOPOLOGY_FACT_ONLY_ALLOWED |
| airport:sendai:explicit-terminal-rail-passage | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:nankai:koya-local-branches | INGESTED | 1 | 7 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:keihan:commercial-use-terms-alternative-review | RIGHTS_REVIEWED | 2 | 0 | REFERENCE_ONLY_DISCOVERY |
| hub:sapporo:current-jr-municipal-passage | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:yurikamome:shimbashi-gateway-and-bounded-last-train | INGESTED | 1 | 3 | TOPOLOGY_FACT_ONLY_ALLOWED |
| metro:sapporo:n06-n07-current-directional-section | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:jreast:hamamatsucho-monorail-transfer-gate | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| metro:sapporo:ekibus-restricted-alternative-review | RIGHTS_REVIEWED | 2 | 0 | REFERENCE_ONLY_DISCOVERY |
| rail:jreast:mito-hitachi-actual-trips | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:tobu:tojo-mm21-f-liner-alternative | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:keisei:matsudo-reviewed-2025-merger | INGESTED | 1 | 3 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:tobu:jr-partner-three-urban-park-gateways | INGESTED | 1 | 3 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:tobu:oshiage-metro-published-joint-station | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:kobe-portliner:ordinary-airport-branch-and-terminal | INGESTED | 1 | 3 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:nagasaki:current-kamome-traffic-plaza | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| bus:nagasaki:current-station-boarding-components | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| government:p11:reviewed-airport-bus-identities | RIGHTS_REVIEWED | 1 | 0 | RAW_PERSISTENCE_ALLOWED |
| bus:kotoden:licensed-current-airport-trips | INGESTED | 1 | 1 | RAW_PERSISTENCE_ALLOWED |
| hub:takamatsu:current-station-bus-gateway | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| airport:takamatsu:current-terminal-bus-passages | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-kyushu:miyazaki-airport-current-ordinary | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| airport:miyazaki:current-terminal-rail-passage | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| bus:sankobus:licensed-current-airport-trips | INGESTED | 1 | 1 | RAW_PERSISTENCE_ALLOWED |
| hub:kumamoto:current-jr-forecourt-gtfs-platforms | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| airport:kumamoto:current-limousine-terminal-passages | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-kyushu:kirishima-current-calls-and-kagoshima-transfer | INGESTED | 1 | 3 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:tobu:tojo-current-partner-northbound-local | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-shikoku:nanpu-current-kochi-backbone | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| bus:tosaden:licensed-current-airport-trips | INGESTED | 1 | 1 | RAW_PERSISTENCE_ALLOWED |
| hub:kochi:current-jr-north-terminal-gtfs-platforms | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| airport:kochi:current-public-terminal-bus-passages | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:shinkoshigaya:current-jr-municipal-passages | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| private:tobu:navitime-partner-restricted-alternative-review | RIGHTS_REVIEWED | 1 | 0 | REFERENCE_ONLY_DISCOVERY |
| rail:jr-shikoku:uzushio-current-tokushima-backbone | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:takamatsu:current-yosan-kotoku-common-concourse | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| bus:tokubus:licensed-current-naruto-airport-trips | INGESTED | 1 | 1 | RAW_PERSISTENCE_ALLOWED |
| hub:tokushima:current-jr-gtfs-public-forecourt | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| airport:tokushima:current-airfield-name-and-local-bus-passages | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| airport:nagasaki:current-terminal-existing-licensed-endpoints | INGESTED | 1 | 3 | TOPOLOGY_FACT_ONLY_ALLOWED |
| bus:oitakotsu:licensed-current-airport-trips | INGESTED | 1 | 1 | RAW_PERSISTENCE_ALLOWED |
| hub:oita:current-jr-airliner-public-forecourt | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| airport:oita:current-terminal-airliner-public-passage | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-kyushu:sonic-current-oita-backbone | INGESTED | 1 | 3 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:tokyo:current-metro-four-concourses | INGESTED | 1 | 4 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:ueno:current-keisei-metro-passage | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:narimasu:municipal-and-metro-public-connection | INGESTED | 1 | 1 | TOPOLOGY_FACT_ONLY_ALLOWED |
| rail:jr-west:current-saijo-airport-prerequisite | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| bus:geiyo:cc0-current-saijo-airport-trips | INGESTED | 1 | 1 | RAW_PERSISTENCE_ALLOWED |
| hub:saijo:current-joint-operator-public-terminal-passages | INGESTED | 1 | 4 | TOPOLOGY_FACT_ONLY_ALLOWED |
| airport:hiroshima:current-saijo-terminal-public-passages | INGESTED | 1 | 2 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:tokyo:current-four-remaining-metro-passages | INGESTED | 1 | 4 | TOPOLOGY_FACT_ONLY_ALLOWED |
| hub:tokyo:current-ueno-osaki-harajuku-jr-concourses | INGESTED | 1 | 3 | TOPOLOGY_FACT_ONLY_ALLOWED |

## Primary evidence ledger

The complete source URL, observation time, fingerprint, rights reason and source-specific attribution are machine-readable in [source-rights.json](../../../data/transport/network/source-rights.json) and [next-source-actions.jsonl](../../../data/transport/network/next-source-actions.jsonl). Reviewed facts are retained under [research/phases](../../../data/transport/network/research/phases); exact source-to-identity and directed-pattern binding is in [topology-evidence.jsonl](../../../data/transport/network/topology-evidence.jsonl).

The older `sources/source-review.json` remains historical checkpoint discovery context. Its broad unresolved categories are not fixpoint proofs, and old raw-timetable restrictions are not a reason to abandon lawful minimal factual topology. New layered decisions in the executable queue govern current ingestion.
