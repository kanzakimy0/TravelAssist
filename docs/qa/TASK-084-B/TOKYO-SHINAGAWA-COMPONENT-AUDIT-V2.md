# TASK-084-B v2 — Tokyo / Shinagawa Component Audit

Date: 2026-09-29

Status: `COMPONENT_REVIEW_REQUIRED` (candidate evidence, not formal Master acceptance)

## Tokyo

| Component | S12 FY2024 entries + exits per day | Proposed level | Identity and service review |
| --- | ---: | --- | --- |
| JR East conventional | 869,128 | T0 | Candidate `lineRefs`: 京葉線、東北線、東海道線、総武線. JR East's station guide also names the 山手線、京浜東北線、中央本線 / 中央線、横須賀線 services. Resolve which are infrastructure `lineRefs` and which are `serviceRefs` before accepting. |
| JR East Shinkansen | S12 not available | Pending | The [JR East FY2024 Shinkansen table](https://www.jreast.co.jp/company/data/passenger/2024_shinkansen.html/) gives Tokyo **70,323 boardings/day**. This is a different metric from S12 entries + exits and is retained as secondary evidence, not substituted into the S12 threshold. |
| JR Central Shinkansen | 194,244 | T1 | Tokaido Shinkansen candidate exists. |
| Tokyo Metro | 199,232 | T1 | Marunouchi Line candidate exists. |

The [JR East Tokyo station guide](https://www.jreast.co.jp/estation/stations/1039.html), [JR East station information](https://www.jreast.co.jp/estation/station/info.aspx?StationCd=1039), [JR Central Tokyo station map](https://railway.jr-central.co.jp/shinkansenbusiness/_pdf/shinkansenbusiness_tokyo.pdf), and [Tokyo Metro station map](https://www.tokyometro.jp/station/tokyo/yardmap/index_print.html) support the four material operator/mode components above. The station complex's hub level requires a separate documented decision; component levels cannot be copied from a hub tier.

## Shinagawa

| Component | S12 FY2024 entries + exits per day | Proposed level | Identity and service review |
| --- | ---: | --- | --- |
| JR East conventional | 575,878 | T0 | Candidate `lineRefs`: 山手線、東海道線. JR East's guide also lists 京浜東北線 and 横須賀線 / 総武線 services; separate infrastructure and service refs in the acceptance record. |
| Keikyu | 241,688 | T0 | Main Line candidate exists. |
| JR Central Shinkansen | 75,403 | T1 | Tokaido Shinkansen candidate exists; v1 ID lineage must be checked. |

The [JR East Shinagawa station guide](https://www.jreast.co.jp/estation/stations/788.html), [JR East station information](https://www.jreast.co.jp/estation/station/info.aspx?StationCd=788), [Keikyu station page](https://www.keikyu.co.jp/ride/kakueki/KK01.html), and [JR Central Shinagawa station map](https://railway.jr-central.co.jp/station-guide/shinkansen/shinagawa/map.html?icon=f1) support the three material operator/mode components. The v1 national master has only the JR Central Shinkansen component, so the JR East and Keikyu candidates close the *candidate inventory* gap but are not yet accepted Master nodes.

## Open acceptance work

1. Compare all four Tokyo and three Shinagawa components against N02 station geometry and physical fare-gate boundaries.
2. Record the final `lineRefs` / `serviceRefs` distinction and official guide evidence on every accepted component.
3. Establish each hub's own tier from its components and intermodal role, independently of component tiers.
4. Accept or explicitly block each component with stable identity lineage; rerun the high-flow gate against the **accepted Master**.
