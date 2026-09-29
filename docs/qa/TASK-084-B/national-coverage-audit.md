# TASK-084-B national coverage audit — 2026-09-28

Status: **PARTIAL**. The 244 accepted nodes are a selected network seed. This audit checks Node inventory only, with no route times, fares, timetable, frequency or walking edges. Node expansion is frozen pending the N03/GSI rights and administrative gates.

## Layer audit

| Layer | Accepted | Remaining national gap |
| --- | ---: | --- |
| Shinkansen station components | 110 | Of 94 previously unclassified components, 14 are operator-supported standalone gateways and 80 require further Hub/transfer review |
| Conventional rail / metro / private rail | 40 / 20 / 9 | Selected 21 Hub areas, not all major intercity or metro networks |
| Airports | 47 | 28 A plus 19 tourism-relevant B; airport-to-city bus/rail readiness incomplete; C28 coordinates historical |
| Major bus terminals | 5 | Nagasaki selection only; Tokyo, Shinjuku, Nagoya, Osaka, Kyoto, Hiroshima, Fukuoka, Kumamoto and other regions need licensed facility sources |
| Ferry gateways | 7 | Fukuoka City only; Okinawa, Setouchi, Goto, Amami, Yakushima/Tanegashima and Hokkaido islands unresolved |
| Tourism special transport | 6 | Selected Takao, Tsukuba, Hiei funiculars; ropeways, other mountain/volcano/onsen and tourist shuttles unresolved |

Twenty-one reviewed Hub identities have 85 explicitly linked station components and T0/T1 counts of 10/11. There are 79 self gateways, including 65 airport, bus, ferry and cable gateways and 14 reviewed Shinkansen standalone stations. The 80 `HUB_REVIEW_REQUIRED` records have per-ID reasons and proximity evidence; no parent is assigned from proximity or name alone. The original 110 node and five Hub IDs remain immutable. TransportNode T0/T1/T2/T3 counts are 8/40/196/0; they are separate from Hub hierarchy.

## Administrative coverage: all 47 prefectures

Current prefecture and municipality fields are **0/244**. The third column below is only a historical C28 airport crosswalk count and must not be treated as current assignment or as complete transport coverage. Every prefecture remains unverified at the current administrative gate.

| Code | Prefecture | Current assigned nodes | Historical C28 airport crosswalks |
| --- | --- | ---: | ---: |
| 01 | 北海道 | 0 | 8 |
| 02 | 青森 | 0 | 1 |
| 03 | 岩手 | 0 | 0 |
| 04 | 宮城 | 0 | 1 |
| 05 | 秋田 | 0 | 1 |
| 06 | 山形 | 0 | 1 |
| 07 | 福島 | 0 | 0 |
| 08 | 茨城 | 0 | 0 |
| 09 | 栃木 | 0 | 0 |
| 10 | 群馬 | 0 | 0 |
| 11 | 埼玉 | 0 | 0 |
| 12 | 千葉 | 0 | 1 |
| 13 | 東京 | 0 | 2 |
| 14 | 神奈川 | 0 | 0 |
| 15 | 新潟 | 0 | 1 |
| 16 | 富山 | 0 | 1 |
| 17 | 石川 | 0 | 0 |
| 18 | 福井 | 0 | 0 |
| 19 | 山梨 | 0 | 0 |
| 20 | 長野 | 0 | 1 |
| 21 | 岐阜 | 0 | 0 |
| 22 | 静岡 | 0 | 1 |
| 23 | 愛知 | 0 | 1 |
| 24 | 三重 | 0 | 0 |
| 25 | 滋賀 | 0 | 0 |
| 26 | 京都 | 0 | 0 |
| 27 | 大阪 | 0 | 2 |
| 28 | 兵庫 | 0 | 1 |
| 29 | 奈良 | 0 | 0 |
| 30 | 和歌山 | 0 | 0 |
| 31 | 鳥取 | 0 | 0 |
| 32 | 島根 | 0 | 1 |
| 33 | 岡山 | 0 | 1 |
| 34 | 広島 | 0 | 1 |
| 35 | 山口 | 0 | 1 |
| 36 | 徳島 | 0 | 0 |
| 37 | 香川 | 0 | 1 |
| 38 | 愛媛 | 0 | 1 |
| 39 | 高知 | 0 | 1 |
| 40 | 福岡 | 0 | 2 |
| 41 | 佐賀 | 0 | 0 |
| 42 | 長崎 | 0 | 3 |
| 43 | 熊本 | 0 | 1 |
| 44 | 大分 | 0 | 1 |
| 45 | 宮崎 | 0 | 1 |
| 46 | 鹿児島 | 0 | 4 |
| 47 | 沖縄 | 0 | 5 |

The [N03/GSI decision](n03-gsi-rights-decision.md) is `APPROVAL_REQUIRED` as an internal fail-closed gate pending written GSI confirmation for the exact derived-attribute operation. No N03 polygon or persisted spatial join is in the production master. Until that rights gate or an admissible alternative source and validated assignment are available, the 47-prefecture gate cannot PASS.

## Tourism and intermodal spot checks

| Gateway or corridor | Accepted evidence | Open question |
| --- | --- | --- |
| Tokyo / Shinjuku / Ueno / Shibuya / Ikebukuro | Reviewed rail Hub components and Tokyo-area airports | Airport-to-city links and major bus terminal identities |
| Sapporo / Sendai / Kanazawa / Nagoya / Yokohama | Reviewed rail Hub components; selected airports | Metro breadth, airport access and bus terminal facilities |
| Osaka / Umeda / Kyoto / Kobe / Nara | Separate reviewed rail Hub identities, regional airports | Airport-to-city and tourism corridor access |
| Hiroshima / Kumamoto / Kagoshima-Chuo | Reviewed rail Hub components and airports | Setouchi/island ferries and bus transfers |
| Nagasaki / Sasebo / Goto | Five licensed bus/airport terminals; selected airports | Goto ferry gateways and corridor readiness |
| Takao / Tsukuba / Hiei | Six funicular station identities | Ropeway continuation and walking transfers remain outside this task |
| Okinawa / Amami / Setouchi / Hokkaido islands | Selected airport identities | Licensed ferry gateway feeds and port terminal coordinates |

The [Nagasaki Prefecture bus GTFS](https://data.bodik.jp/dataset/420000_nagasakikeneibus) permits attributed reuse and supports five facility identities. [Sakurajima Ferry](https://ckan.odpt.org/dataset/kagoshima_city_maritime_bureau_all_lines) has CC BY 4.0 terms but its feed needs developer registration before source and stop validation. [N09](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N09.html) is noncommercial; [Shimoden ODPT](https://ckan.odpt.org/dataset/shimoden_shimoden_bus_gtfs_realtime) has provider-specific restrictions. These are source gates, not rejected candidate identities.

TASK-084 nationalMasterStatus stays PARTIAL. TASK-086-B and TASK-085-B require NATIONAL_MASTER_PASS. PR #444 merged into develop on 2026-09-29; the current runtime-authorized Canonical POI scope is Pilot-100 (100 records), while the candidate corpus is unauthorized. When TASK-085-B is permitted to start, it must read the then-current runtime manifest and use exactly the formally authorized set.
