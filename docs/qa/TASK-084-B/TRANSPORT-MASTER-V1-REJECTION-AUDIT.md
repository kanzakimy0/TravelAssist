# TASK-084-B v1 Rejection Audit — TransportNode National Master

Date: 2026-09-29  
Status: **V1 REJECTED FOR REWORK**  
Issue: #441 (reopened)  
Merged source PR: #448  
Corrective branch: `fix/b-task-084-transport-master-rework`

## Executive finding

The merged 244-node master is mechanically reproducible but is not acceptable as the final nationwide tourism-planning TransportNode master.

The rejection is based on substantive inventory and hierarchy defects, not CI or checksum failures.

## 1. Hierarchy degeneration

Merged v1 level counts:

- T0 = 8
- T1 = 40
- T2 = 196
- T3 = 0

Mode × level audit:

- Shinkansen: 110 × T2
- conventional rail: 40 × T2
- metro: 20 × T2
- private rail: 9 × T2
- airports: 8 T0 / 33 T1 / 6 T2
- bus terminals: 4 T1 / 1 T2
- ferry: 7 T2
- funicular: 3 T1 / 3 T2

All railway-related components being T2 while T0 consists only of airports is not a credible usage/importance hierarchy.

## 2. Official utilization evidence contradicts the v1 tier model

Primary nationwide source for corrective v2:

MLIT National Land Numerical Information — Station Passenger Counts S12 2024:
https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-S12-2024.html

The dataset:
- covers nationwide station passenger counts collected from railway operators;
- includes 2024 daily passenger count field S12_061;
- is CC BY 4.0;
- warns operator calculation methods are not perfectly uniform.

Operator official examples:

JR East 2024:
https://www.jreast.co.jp/company/data/passenger/

Examples:
- Shinjuku: 666,809 average daily boardings
- Ikebukuro: 499,128
- Tokyo: 434,564
- Yokohama: 373,010
- Shibuya: 324,414
- Shinagawa: 287,939
- Omiya: 254,220
- Ueno: 170,042

JR East Shinkansen 2024:
https://www.jreast.co.jp/company/data/passenger/2024_shinkansen.html/

Tokyo Metro 2024:
https://www.tokyometro.jp/corporate/enterprise/passenger_rail/transportation/passengers/2024.html

Examples:
- Ikebukuro: 518,135 average daily entries/exits
- Tokyo: 199,232
- Shinjuku: 199,942
- Ueno: 189,373

These figures demonstrate why a blanket rail=T2 rule is invalid.

## 3. Tokyo audit

V1 does contain Tokyo components for:
- JR conventional rail
- JR East Shinkansen
- JR Central Shinkansen
- Tokyo Metro

However every component is T2.

This is a hierarchy failure, not an absence of Tokyo Shinkansen/Metro records.

V2 must:
- consolidate line-level duplicates into correct station-component identity where appropriate;
- use lineRefs[] for served lines;
- classify components using official utilization;
- keep TransportHub level separate from component level.

## 4. Shinagawa audit

V1 contains only:
- Tokaido Shinkansen / JR Central / T2

Missing material station-complex components include:
- JR East conventional station component
- Keikyu station component

Shinagawa is a major national interchange and its partial component representation is unacceptable for a T0/T1 national backbone.

## 5. Airport-access station audit

### Narita

V1 contains:
- Narita International Airport node

V1 does not contain:
- Narita Airport Station
- Airport Terminal 2 Station

Official Narita Airport access:
https://www.narita-airport.jp/ja/access/train/

The airport explicitly identifies:
- 成田空港駅
- 空港第2ビル駅
- JR
- Keisei / Skyliner / Access services

Airport identity alone cannot substitute for rail-station identity.

### Haneda

V1 contains Tokyo International Airport but no Haneda rail/monorail station components.

Official:
https://www.tokyo-haneda.com/access/train/index.html

Audit Keikyu and Tokyo Monorail stations serving T1/T2/T3.

### Kansai

Official:
https://www.kansai-airport.or.jp/access/from-airport/train

Kansai Airport Station is directly connected and served by JR and Nankai.

V1 airport access components require correction.

### Other mandatory airport-access checks

- New Chitose Airport Station
- Fukuoka Airport subway
- Chubu Centrair railway access
- Sendai Airport railway
- Kobe Airport transit
- other accepted airports with fixed-guideway service

## 6. Bus-terminal audit

V1 has only five bus terminals, all in the Nagasaki source family.

This is not nationally representative.

Busta Shinjuku is absent.

Official MLIT Busta utilization:
https://www.mlit.go.jp/road/road_fr4_000091.html

Historic MLIT first-year result:
https://www.mlit.go.jp/report/press/road01_hh_000884.html

The official first-year average was about 28,000 users/day.

The corrective inventory must audit major national/intercity terminals in principal T0/T1 urban and tourism gateways.

## 7. T3 audit

T3=0 is treated as a hierarchy sanity failure for the merged v1.

V2 should naturally include planner-relevant lower-volume local/tourism gateways below the T2 utilization threshold.

T3 must not be manufactured to satisfy a count, but the selection/ranking model must permit it.

## 8. Identity granularity defect

V1 often mirrors N02 line-feature granularity.

Correct target:

```text
TransportHub
  ↓
operator × physical station × mode-family component
  ↓
lineRefs[]
```

A separate TransportNode per line is not the default station identity.

Existing IDs must not be silently rebound.

Incorrect v1 identities require explicit supersession lineage.

## 9. Corrective hierarchy basis

Rail primary metric:
- MLIT S12 2024 S12_061 daily passenger count

Default rail bands:
- T0 >= 200,000/day
- T1 50,000–199,999/day
- T2 10,000–49,999/day
- T3 <10,000/day if Planner-relevant

Functional promotion: maximum one tier, with explicit evidence.

Airport primary metric:
MLIT Airport Management Status:
https://www.mlit.go.jp/koku/15_bf_000185.html

Bus:
official terminal/operator/MLIT passenger counts.

Ferry:
MLIT Port Statistics / official operator or municipal counts:
https://www.mlit.go.jp/k-toukei/kouwan.html
https://www.mlit.go.jp/k-toukei/kowannenpodb.html

No unofficial popularity ranking may determine node level.

## 10. V2 minimum coverage gates

- every S12 >=200k/day station present or hard blocker;
- every S12 >=50k/day station present or explicit exclusion;
- all Shinkansen stations audited;
- T0/T1 station complexes operator/mode complete;
- accepted rail-served airports have station components;
- major national intercity bus terminals audited;
- Busta Shinjuku present;
- T0/T1/T2/T3 evidence stored;
- no all-rail-T2 degeneration;
- identity lineage from v1 explicit;
- exact-head QA green;
- explicit user review before merge.

## 11. Downstream boundary

Until v2 is explicitly accepted:

- TASK-085-B must not use v1 TransportNode master.
- TASK-086-B must not use v1 TransportNode master.
- v1 remains historical evidence only.
