# TASK-086-B source-rights checkpoint

Status: **IN_PROGRESS_AUTO_REMEDIATION**. This is an ongoing-work checkpoint under [the no-early-exit amendment](../../tasks/AMENDMENT-TASK-086-b-autonomous-source-acquisition-no-early-exit-v2.md), not a terminal Result or acceptance request. Ordinary discovery remains and the global fixpoint is not proven. Work continues on the same branch and [Draft PR #466](https://github.com/kanzakimy0/TravelAssist/pull/466).

Executed source actions: **28**. Recorded source/terms observations: **221**. Latest reviewed-action rights decisions: `{'RAW_PERSISTENCE_ALLOWED': 1, 'TOPOLOGY_FACT_ONLY_ALLOWED': 27}`. The queue retains actual attempts, URLs, response fingerprints, rights findings, extracted fact IDs, deficit targets, results and next actions.

## Retained representations

- MLIT S12 FY2024 (published 2026): independently acquired CC BY 4.0 archive `0785e932a32b3ec15e1a1345537ae145eafe1c07bf38d5c16c11ee2b391e7a28`; station-code/operator/line/coordinate identity facts only. Spatial group codes do not establish interchange.
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
| private:keikyu:local-and-kurihama | INGESTED | 3 | 14 | TOPOLOGY_FACT_ONLY_ALLOWED |

## Primary evidence ledger

The complete source URL, observation time, fingerprint, rights reason and source-specific attribution are machine-readable in [source-rights.json](../../../data/transport/network/source-rights.json) and [next-source-actions.jsonl](../../../data/transport/network/next-source-actions.jsonl). Reviewed facts are retained under [research/phases](../../../data/transport/network/research/phases); exact source-to-identity and directed-pattern binding is in [topology-evidence.jsonl](../../../data/transport/network/topology-evidence.jsonl).

The older `sources/source-review.json` remains historical checkpoint discovery context. Its broad unresolved categories are not fixpoint proofs, and old raw-timetable restrictions are not a reason to abandon lawful minimal factual topology. New layered decisions in the executable queue govern current ingestion.
