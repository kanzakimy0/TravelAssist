# TASK-084-B CORRECTIVE REWORK — Japan TransportNode Master v2

Date: 2026-09-29  
Owner: B  
WBS: 7.14 (REOPENED / REWORK REQUIRED)  
Issue: #441 (reopened)  
Supersedes acceptance of PR #448 as a final national TransportNode master.

## 0. Why this corrective rework exists

The merged 244-node TASK-084-B artifact passed mechanical identity/checksum gates but failed a substantive transport-data quality review.

The previous `nationalMasterStatus=PASS` is revoked for planning use.

The 244-node artifact remains historical evidence and may be reused for identity/provenance where correct, but it MUST NOT be treated as the accepted national TransportNode master for TASK-085-B or TASK-086-B until this corrective rework passes.

### Confirmed defects in the merged 244-node master

1. **Degenerate hierarchy**
   - T0 = 8, and all 8 are airports.
   - T1 = 40, dominated by airports, 4 bus terminals and 3 funicular nodes.
   - All 110 Shinkansen, 40 conventional rail, 20 metro and 9 private-rail nodes are T2.
   - T3 = 0.
   - This does not represent actual station importance.

2. **Major station complexes are incomplete**
   - Tokyo has multiple accepted JR/Shinkansen/Metro components but every component is T2.
   - Shinagawa has only a Shinkansen component in the national master; major JR conventional and Keikyu components are missing.
   - Other T0/T1 hub areas also have partial component coverage.

3. **Airport ground-access station coverage is incomplete**
   - Narita International Airport exists, but Narita Airport Station / Airport Terminal 2 Station components are missing.
   - Haneda Airport exists, but Keikyu / Tokyo Monorail terminal station components are missing.
   - Kansai Airport, New Chitose, Fukuoka Airport and other rail-served airports require an explicit airport↔station component audit.

4. **Major intercity bus-terminal coverage is not nationally representative**
   - Current accepted bus terminals are five Nagasaki-area facilities.
   - Busta Shinjuku is absent despite being a nationally significant intercity terminal with official MLIT usage statistics.
   - National major metropolitan / tourism intercity terminals require a new inventory.

5. **Station inventory is too sparse**
   - 179 rail-related components is not a credible nationwide tourism-planning backbone when the national official station-ridership dataset is available.
   - Selection was driven by a small seed of reviewed hubs instead of a national utilization-based inventory.

6. **Current station identity granularity is often line-level rather than station-component-level**
   - The merged master may create one TransportNode per N02 line feature.
   - The intended model is operator / physical station / mode component, with `lineRefs` containing all served lines where appropriate.
   - Line-feature IDs must never become the conceptual station identity.

## 1. Status of the merged v1 artifact

Treat:

```text
data/transport/nodes/task-084-b-national-master/
```

as:

```text
HISTORICAL_V1_REJECTED_FOR_REWORK
```

until v2 passes.

Do not delete historical artifacts.

Do not silently mutate accepted IDs.

Where v1 identities remain correct, reuse them.
Where the identity granularity was wrong, create explicit lineage:

```text
oldTransportNodeId
→ SUPERSEDED_BY
→ newTransportNodeId
```

Never rebind an old ID to a different real-world entity.

TASK-085-B and TASK-086-B remain blocked from using v1.

## 2. Authoritative national rail utilization source

Use the latest official MLIT National Land Numerical Information **Station Passenger Counts (S12), 2024 fiscal-year edition**:

https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-S12-2024.html

Key facts to preserve in provenance:

- nationwide station passenger counts collected from railway operators
- 2024 fiscal-year passenger-count field: `S12_061`
- station/operator/line identity fields
- station and group codes are source observations only
- license: CC BY 4.0
- data is not complete for every station/operator
- operator calculation methods are not perfectly uniform

S12 is the primary nationwide **rail importance / discovery / tier evidence**.

Use operator official statistics as secondary corroboration where needed.

Examples:
- JR East 2024 station ridership:
  https://www.jreast.co.jp/company/data/passenger/
- JR East 2024 Shinkansen station ridership:
  https://www.jreast.co.jp/company/data/passenger/2024_shinkansen.html/
- Tokyo Metro 2024 station passenger counts:
  https://www.tokyometro.jp/corporate/enterprise/passenger_rail/transportation/passengers/2024.html

Do not scrape unofficial ranking sites.

## 3. Rebuild station discovery from S12

### 3.1 Mandatory national rail candidate set

The v2 national rail candidate inventory MUST include:

1. every S12 station with valid 2024 passenger data >= 10,000 persons/day;
2. every Shinkansen station, regardless of passenger count;
3. every rail/metro/private-rail station serving an accepted T0/T1 airport;
4. every operator/mode component belonging to a reviewed T0/T1 TransportHub;
5. every station required for current formally authorized Canonical POI access where it is the meaningful tourism gateway;
6. selected tourism-relevant stations below 10,000/day for T3.

Stations below 10,000/day are not all imported. They are included only when Planner relevance is explicit.

No arbitrary target count such as 244/500/1000.

The count is an output of the evidence-based selection.

### 3.2 High-ridership omission gate

Any S12 station with 2024 ridership >= 50,000/day that is absent from the accepted master MUST have an explicit exclusion record.

Any S12 station with 2024 ridership >= 200,000/day that is absent is a hard QA failure unless identity/source data is genuinely unresolved.

## 4. Station complex / component model

Do not use one TransportNode per line feature by default.

Preferred component identity:

```text
physical station complex
  ↓
operator × physical station × mode family component
  ↓
lineRefs[]
```

Example Tokyo:

```text
Tokyo TransportHub
├ JR East conventional-rail station component
│  └ lineRefs: Tokaido, Tohoku, Sobu, Keiyo, etc.
├ JR East Shinkansen component
├ JR Central Shinkansen component
└ Tokyo Metro component
```

If geometry/operations justify separate components, keep them separate with explicit evidence.

Do not collapse different operators blindly.

### 4.1 Multi-mode completeness gate

For every accepted T0/T1 Hub:

- enumerate official operators serving the complex;
- enumerate mode families: conventional rail / Shinkansen / metro / private rail / tram / AGT where applicable;
- compare against N02/S12 plus official station guide;
- every material operator/mode component must be:
  - accepted, or
  - explicitly `COMPONENT_REVIEW_REQUIRED` with reason.

A T0/T1 Hub cannot be marked complete while known major operator/mode components are silently absent.

## 5. Mandatory airport access audit

For every accepted airport, check the official airport access page.

If the airport has an on-airport or directly serving railway/metro/monorail station, that station must exist as a TransportNode component.

Mandatory QA examples include, but are not limited to:

### Narita
Official airport access identifies:
- 成田空港駅
- 空港第2ビル駅
- JR
- Keisei / Skyliner / Access

Source:
https://www.narita-airport.jp/ja/access/train/

### Haneda
Official airport access identifies Keikyu and Tokyo Monorail facilities for T1/T2/T3 terminals.

Source:
https://www.tokyo-haneda.com/access/train/index.html

### Kansai
Official KIX access identifies Kansai Airport Station served by JR and Nankai.

Source:
https://www.kansai-airport.or.jp/access/from-airport/train

Also audit at least:
- New Chitose Airport Station
- Fukuoka Airport subway station
- Chubu Centrair station
- Sendai Airport station
- Kobe Airport transit access
- other accepted airports with fixed-guideway access

Airport node != airport railway station.

Both must exist when both real-world entities exist.

## 6. Major bus-terminal rebuild

The current 5-terminal Nagasaki-only inventory is not acceptable as a national backbone.

Create a national major-intercity-bus-terminal inventory from official operator / terminal / MLIT / municipal sources.

### 6.1 Mandatory QA example: Busta Shinjuku

Busta Shinjuku MUST be included unless an explicit identity blocker exists.

Official MLIT source:
https://www.mlit.go.jp/road/road_fr4_000091.html

The source publishes ongoing usage and departure statistics.

Historical MLIT evidence also records about 28,000 users/day in its first year:
https://www.mlit.go.jp/report/press/road01_hh_000884.html

### 6.2 National bus-terminal coverage

At minimum audit major intercity terminals serving the principal T0/T1 urban/tourism gateways, including examples such as:

- Shinjuku
- Tokyo / Yaesu area
- Sapporo
- Sendai
- Nagoya
- Kyoto
- Osaka / Namba / Umeda
- Hiroshima
- Hakata / Fukuoka
- Kumamoto
- Nagasaki

These are QA examples, not the only allowable terminals.

For each terminal store official evidence for:
- terminal identity
- location
- operators/services
- passenger usage when official data exists
- departure/service count when official passenger counts do not exist
- observation period

Do not invent passenger values.

## 7. Usage-based T0 / T1 / T2 / T3 hierarchy

The old tier assignment is invalid and must be rebuilt.

### 7.1 Required evidence fields

Every accepted node must contain or link to a hierarchy-decision record with:

```text
levelDecisionVersion
nodeLevel
metricMode
usageMetricType
usageValue
usageUnit
usagePeriod
usageSource
sourceObservedAt
functionalRole
promotionReason (nullable)
decisionReason
confidence
```

No node may receive T0/T1 solely from hand-written prose.

### 7.2 Rail / metro / private rail / Shinkansen

Use S12 2024 daily station passenger counts as the primary nationwide comparable metric when available.

Default bands:

```text
T0: >= 200,000 persons/day
T1: 50,000 - 199,999
T2: 10,000 - 49,999
T3: < 10,000, only when Planner-relevant
```

Because S12 notes operator calculation differences, the thresholds are broad bands.

Functional promotion is allowed by at most one tier when there is explicit evidence of a critical national/regional role, for example:

- national Shinkansen transfer
- only rail gateway for a T0/T1 airport
- major island / remote tourism gateway
- multi-operator national interchange

Any promotion must be recorded.

If official passenger data is unavailable:
- do not fabricate a value;
- use an operator official figure if it reports a compatible passenger metric;
- otherwise set `USAGE_DATA_UNAVAILABLE` and require manual tier review.

### 7.3 TransportHub tier

Hub tier is separate from component tier.

Compute from:
- highest component usage tier;
- number of operators/modes;
- Shinkansen/intercity role;
- airport/bus/ferry intermodal role.

Do not force all components to T2 merely because they belong to a T0/T1 Hub.

### 7.4 Airports

Use MLIT Airport Management Status annual passenger counts:

https://www.mlit.go.jp/koku/15_bf_000185.html

Default annual passenger bands:

```text
T0: >= 10,000,000 passengers/year
T1: 1,000,000 - 9,999,999
T2: 100,000 - 999,999
T3: < 100,000 when Planner-relevant
```

An island/remote essential-access airport may be promoted at most one tier with explicit reason.

Do not map MLIT legal airport category directly to Planner T-level.

### 7.5 Major bus terminals

Use official terminal/operator/MLIT passenger counts when available.

Default daily passenger bands:

```text
T0: >= 20,000 users/day
T1: 5,000 - 19,999
T2: 1,000 - 4,999
T3: < 1,000 when Planner-relevant
```

If passenger count is unavailable, service/departure count may support inclusion but may not by itself justify T0 without manual review.

### 7.6 Ferry / port gateways

Use official MLIT Port Statistics / official municipal/operator passenger counts where available:

https://www.mlit.go.jp/k-toukei/kouwan.html
https://www.mlit.go.jp/k-toukei/kowannenpodb.html

Use mode-specific passenger bands calibrated from the official national distribution.

Document the final ferry thresholds before assigning levels.

### 7.7 Tourism special transport

Use official operator annual/daily usage where published.

If usage is not published:
- do not invent;
- default to evidence-based T2/T3 depending Planner function;
- T0/T1 requires explicit exceptional evidence.

## 8. Tier distribution sanity gate

A national master with:

```text
all rail = T2
T3 = 0
```

automatically fails hierarchy QA.

The final distribution does not need a predetermined count, but it must be explainable from official utilization data.

Required checks:

- at least one rail/metro/private/Shinkansen node appears in T0/T1 when official usage supports it;
- T3 exists when low-usage Planner-relevant stations are included;
- no mode is mechanically forced to one level;
- level distribution by mode is reported.

## 9. Current merged v1 examples that MUST be re-audited

### Tokyo
Current v1 has multiple JR/Shinkansen/Metro components but all are T2.

Recalculate each component from official usage data and verify full operator/mode coverage.

### Shinagawa
Current v1 has only the Tokaido Shinkansen component.

Add/review:
- JR East conventional component
- Keikyu component
- Shinkansen component
- shared Hub

### Narita Airport
Current v1 has the airport but no airport rail stations.

Add/review:
- 成田空港駅
- 空港第2ビル駅
- JR component(s)
- Keisei component(s)
- airport/terminal relationship

### Haneda Airport
Review:
- Keikyu terminal station components
- Tokyo Monorail terminal station components
- airport terminal relationship

### Kansai Airport
Review:
- JR Kansai Airport station component
- Nankai Kansai Airport station component

### New Chitose
Review:
- JR New Chitose Airport Station

### Shinjuku
Current rail hub is incomplete without national bus terminal coverage.

Add/review:
- Busta Shinjuku
- relation to Shinjuku transport complex

## 10. Batch and provenance

Keep:
- 200 accepted nodes / batch
- deterministic rebuild
- resume
- checksum
- corruption detection
- immutable accepted IDs where identity remains valid

New S12 utilization artifacts must record:
- source archive checksum
- source year
- S12 record identity
- passenger-count field
- duplicate/data-availability codes
- crosswalk decision
- hierarchy decision

## 11. Required v2 QA

At minimum:

### Coverage
- all S12 >= 200k/day stations present or explicit hard-block record
- all S12 >= 50k/day stations present or explicit exclusion record
- all Shinkansen stations audited
- every T0/T1 Hub mode/operator completeness audited
- every rail-served accepted T0/T1 airport access station audited
- national major intercity bus-terminal inventory audited
- Busta Shinjuku present
- major ferry/tourism gateway coverage reviewed

### Hierarchy
- 100% accepted nodes have hierarchy evidence
- no all-rail-T2 degeneration
- T3 sanity
- mode-level distribution
- official usage source coverage rate
- promotion/demotion audit

### Identity
- no source code used as TravelAssist immutable identity
- old IDs reused only for same real entity
- bad v1 line-level identities explicitly superseded, never silently rebound
- Hub/components explicit

### Regression
- all existing non-TransportNode tests
- exact-head Quality Gate

## 12. Acceptance

TASK-084-B corrective rework may pass only if:

- national station inventory is rebuilt from official utilization evidence;
- major station complexes are materially complete by operator/mode;
- airport ground-access station coverage passes;
- major intercity bus-terminal coverage passes;
- T0/T1/T2/T3 are usage-based and explainable;
- T3 is not structurally suppressed;
- official passenger/utilization evidence is retained;
- v1 defects are recorded and superseded;
- no downstream TASK-085/086 uses rejected v1 artifacts;
- exact-head QA is green.

## 13. Merge policy

Draft PR only until user reviews the new inventory summary and tier distribution.

Do NOT auto-merge.

Do NOT mark WBS 7.14 completed before explicit user acceptance of v2.

Do NOT start TASK-085-B or TASK-086-B.

## 14. Final result required

Return:

- total v2 nodes
- old v1 reused / superseded / rejected counts
- counts by nodeKind
- counts by T0/T1/T2/T3
- counts by mode × tier
- S12 official passenger coverage
- top 50 rail hubs with official utilization evidence
- missing high-ridership stations, must be zero or explicit blockers
- airport access station completeness
- major bus-terminal inventory
- Busta Shinjuku evidence
- ferry/special transport coverage
- identity-lineage audit
- deterministic batch results
- exact-head CI
- PR
- WBS 7.14 state

No merge without user review.
