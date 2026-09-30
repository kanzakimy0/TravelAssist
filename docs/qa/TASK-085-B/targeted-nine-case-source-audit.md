# TASK-085-B 九项定向补证审计（2026-10-01）

**PARTIAL_TARGETED_EVIDENCE_REQUIRED**。本轮自行检索并复核了官方场馆、旅游机构、政府、运营商、GTFS/开放数据、限定范围的地理资料。五项达到 3 个节点，四项尚缺明确证据。用户最新授权是“自己去寻找，实在找不到之后再保留交给 A 处理”；本表交接证据缺口，不请求接受未达标数据。未联系外部运营商。

上一轮把已审查的来源快照称为 fixpoint，范围不足。七宗町 2026 年 3 月发布的许可 GTFS 和其他官方接入资料已能补齐五项，说明不能继续用原九项证明作为最终验收。本轮撤销旧证明在当前输入上的有效性；没有生成新的物理穷尽证明。

| POI | 修复前 → 当前节点 | 结论 |
| --- | ---: | --- |
| 飛水峡 | 1 → 3 | 已达到目标 |
| 御影大橋 | 2 → 3 | 已达到目标 |
| 田倉山 | 2 → 3 | 已达到目标 |
| 池原橋 | 1 → 1 | 补证后仍有明确缺口，保留给 A |
| まほろば湖 | 1 → 3 | 已达到目标 |
| みさき公園 | 1 → 1 | 补证后仍有明确缺口，保留给 A |
| 阿瀬川橋 | 0 → 0 | 补证后仍有明确缺口，保留给 A |
| 韮崎中央公園陸上競技場 | 2 → 2 | 补证后仍有明确缺口，保留给 A |
| ミュージアム都留 | 2 → 3 | 已达到目标 |

## 输入与可复核性

- 基线 B：`0cae8b371b717d30d3bace3c6763b11a34e09347`。develop：`5123966f62dbe9587a3bbe38e877ccf3ea959b80`；merge：`509c9fda40bb443b5a9c4a5e6ef36e875e713744`。
- 修复收据语义 SHA256：`6e4120ec72992dade60cbba072ff8b8f33fd0aab08cebe181fb6d932771383f3`；输入 fingerprint：`4ead87f53d07f28db10bf750ab0bdc3ed6068c2cadd576348ebcea86e115e682`。
- Canonical dataset：`c3ed64d518913be8c9c8d4ec07ed85bf4a446228e73ca1ac19026057efd1c6af`，raw 100 / assessment 95 不变。
- 全部原有 5,200 admitted / 344 HOLD 记录及 680 条有向边逐条保全。新增 2 个七宗町 bus nodes、7 个关系、14 条有向边；其他来源记录保持冻结。
- [机器审计](../../../data/transport/access/post-canonical-replay-audit.json)逐项绑定当前 proof SHA256、事实收据、原因和所需证据；[输入收据](../../../data/transport/access/inputs/targeted-repair.json)保存完整 source refs、记录/行/ZIP-entry hashes 和许可。
- 旧的九项证明不因重新计算 hash 自动生效。当前四项 DISCOVERY_IN_PROGRESS 不是 SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF，更不是 CANDIDATE_EXHAUSTION_PROOF。

## 飛水峡 — 3 个确认节点

当前 proof SHA256：`none — target met`。旧 fixpoint：superseded。

### 新增：上麻生駅 / 七宗町

The existing prefectural Kami-Asou gorge approach and municipal bus interchange now join to publisher GTFS stop 1_01. The March 2026 CC BY 4.0 release was omitted in the previous discovery review. Rail and municipal bus are distinct modal access nodes; no station centroid was reused.

精确 joined source record：`0195de4f29b0410661b38a56ec7cd28cefd0ce2296c73cd60170fa5d95b21f8a`。

- [官方来源 1](https://www.pref.gifu.lg.jp/page/367643.html)
- [官方来源 2](https://www.hichiso.jp/top/life/kurasi/bus/)
- [官方来源 3](https://api.gtfs-data.jp/v2/organizations/hichisotown/feeds/choeibus)

### 新增：木の国七宗コミュニティ－センタ－前 / 七宗町

Municipal newsletter no.621 page 15 describes the Hisuikyo visitor walk beginning at Kino-kuni Hichiso Community Centre and proceeding towards the gorge. Current licensed municipal GTFS identifies the stop at this exact named departure facility (52_01). This establishes a factual trail approach; the historical event timetable and full-course duration are not imported as current route metrics.

精确 joined source record：`ebdf2063fdbababc0ae7e0f8ee225e6e6bc83a9626b4f3f425169a994433c1a4`。

限制：Gorge trail approach; directional route metrics and current trail barrier details remain unresolved.。

- [官方来源 1](https://www.hichiso.jp/wp-content/uploads/koho/2024-12%E5%BA%83%E5%A0%B1%E3%81%B2%E3%81%A1%E3%81%9D%E3%81%86NO621.pdf)
- [官方来源 2](https://www.hichiso.jp/top/life/kurasi/bus/)
- [官方来源 3](https://api.gtfs-data.jp/v2/organizations/hichisotown/feeds/choeibus)

## 御影大橋 — 3 个确认节点

当前 proof SHA256：`none — target met`。旧 fixpoint：superseded。

### 新增：中村神社 / 西日本ジェイアールバス（株）

Visual join of municipal Mikage visitor walking guide (course through Nakamura Shrine, Kasuga Shrine and Mikage Bridge) with official tourism Flat Bus map page 2: Nagamachi stop 11 is at Nakamura Shrine on that visitor course. This is a named visitor-route entry point, not a distance-only candidate; P11 exact stop and operator identity matches.

精确 joined source record：`5b2b384459ddfbdd00cdfaa7ec879083acbb36f19bd7a63c3397335f642bbeab`。

限制：Official visitor walking-course approach; full walking route distance and duration unresolved.。

- [官方来源 1](https://www4.city.kanazawa.lg.jp/material/files/group/67/mikage.pdf)
- [官方来源 2](https://www.kanazawa-kankoukyoukai.or.jp/lsc/upfile/pamphlet/0000/0077/77_1_file.pdf)

## 田倉山 — 3 个确认节点

当前 proof SHA256：`none — target met`。旧 fixpoint：superseded。

### 新增：農匠の郷 / 福知山市

Fukuchiyama tourism association explicitly names the municipal Nosho-no-Sato bus stop as access to the Takara/Hozan trailhead. Municipal identity source establishes Takurayama/Hozan equivalence. Exact named P11 municipality/operator record already admitted; the nearby closed indoor facilities are not the endpoint.

精确 joined source record：`ee810273e5f12ac728d545f61678d34d9ad71594332b5717c1bb21076d26c60b`。

限制：Mountain trail access; route metrics and seasonal trail conditions unresolved.。

- [官方来源 1](https://dokkoise.com/spare/mountains/)
- [官方来源 2](https://www.city.fukuchiyama.lg.jp/soshiki/7/1164.html)

## 池原橋 — 1 个确认节点

当前 proof SHA256：`ca7745c47984dd804fe5353fc31851b903d6dd7a88a93ff2a4bb68026a590f91`。旧 fixpoint：superseded。

Village sources confirm pedestrian passage on Ikehara Bridge and distinguish the regional and village-loop buses. They direct park visitors to Ikehara but do not establish each additional named stop as a bridge gateway. The open-data download page is under maintenance. A university historical fieldwork report suggests a walk via the sports park but does not provide a current official stop-to-bridge access instruction. Neither a generic only-bus assertion nor a search miss proves fewer than three reasonable gateways.

缺失类型：`ADDITIONAL_OFFICIAL_VISITOR_GATEWAY_RELATIONSHIP`, `AUTHORITATIVE_EXHAUSTION_ATTESTATION`。

需要的资料：Current village/tourism bridge access map identifying the named approach stops, or a complete reviewed local gateway inventory with an authoritative fewer-than-three conclusion.

A 交接动作：A to coordinate village access/endpoint review; do not change Canonical identity or accept proximity-only relationships.

候选：池原 / 池峯公園 / スポーツ公園入口前 / スポーツ公園宿舎前。

- [已核查来源 1](https://www.vill.shimokitayama.nara.jp/about/access.html)
- [已核查来源 2](https://www.vill.shimokitayama.nara.jp/about/file/6ad29eec28d6f89d5792d9cb90d92db5fc4ce2be.pdf)
- [已核查来源 3](https://www.vill.shimokitayama.nara.jp/oshirase/2026/07/0000741.html)
- [已核查来源 4](https://www.vill.shimokitayama.nara.jp/about/post.html)
- [已核查来源 5](https://kansai-doboku-style.com/post-2275/)
- [已核查来源 6](https://nara-wu.repo.nii.ac.jp/record/2005627/files/jointreseachreport_matsuda-okajima.pdf)

## まほろば湖 — 3 个确认节点

当前 proof SHA256：`none — target met`。旧 fixpoint：superseded。

### 新增：榛原 / 近畿日本鉄道

Kintetsu Tekuteku Nara-14 map visually confirms Haibara station north exit as the start of the Torimiyama/Hase-Dam/Hasedera hiking course and labels Mahoroba Lake. Retain as a purposeful mountain hiking approach to the reservoir shore, not the water centroid or a convenient short walk. Map copyright content and full-course metrics are not persisted.

精确 joined source record：`74e9d3aad984de3fbdebe959e84da2d38eb4143c3677c6528994360f3eab095e`。

限制：MOUNTAIN_HIKING_APPROACH_NOT_SHORT_LOCAL_WALK；SHORE_TRAIL_ACCESS_NOT_WATER_CENTROID；CURRENT_TRAIL_METRICS_UNRESOLVED。

- [官方来源 1](https://www.kintetsu.co.jp/zigyou/teku2/pdf/nara14.pdf)
- [官方来源 2](https://www.pref.nara.lg.jp/n144/12718.html)

### 新增：榛原駅（北口） / 奈良交通（株）

Kintetsu visitor hiking map begins at Haibara north exit. Nara prefecture explicitly identifies the Nara Kotsu north-exit bus terminal, and the operator May 2026 timetable notice confirms service there. Exact P11 north-exit stop provides a separate bus entry to the same official shore-hiking approach; no rail coordinates copied and no remote through-station padding.

精确 joined source record：`5ba1892c337f075659946acfa6b83e55c4b0de2156318e945ac0819e66460126`。

限制：MOUNTAIN_HIKING_APPROACH_NOT_SHORT_LOCAL_WALK；SHORE_TRAIL_ACCESS_NOT_WATER_CENTROID；CURRENT_TRAIL_METRICS_UNRESOLVED。

- [官方来源 1](https://www.kintetsu.co.jp/zigyou/teku2/pdf/nara14.pdf)
- [官方来源 2](https://www.pref.nara.lg.jp/n061/43111.html)
- [官方来源 3](https://www.narakotsu.co.jp/news/general/31474/)

## みさき公園 — 1 个确认节点

当前 proof SHA256：`8b36738f3258664d72d63b91dfa18e9ec790729cc3452a0b8fe09040e7d8b1c6`。旧 fixpoint：superseded。

Current municipal bus route/timetable names the station and east-exit stops and the Yatetsu operator. The official route diagram is schematic and does not supply reproducible WGS84 boarding points. The CC BY municipal catalog has three population/cadastral datasets, no stop table. Rail-station coordinates cannot replace the bus points. The 2016 walking map and former amusement-park entrances cannot alone establish the current restricted-open park access. Bounded OSM queries returned TLS errors, HTTP 406 or timeouts; no OSM record was obtained or admitted.

缺失类型：`LICENSED_STOP_COORDINATE_IDENTITY`, `CURRENT_PUBLIC_ENTRANCE_JOIN`。

需要的资料：Attribution/derivative-permitted coordinates of both boarding locations and a current station-exit/public-park-entry join; alternatively surveyed stop identities with reuse permission.

A 交接动作：A to obtain the municipal/operator boarding-location table and confirm the current public entrance; retain the existing rail edge.

候选：みさき公園駅 / みさき公園駅東口。

- [已核查来源 1](https://www.town.misaki.osaka.jp/soshiki/shiawase/kankyou/kotsu/900.html)
- [已核查来源 2](https://www.town.misaki.osaka.jp/material/files/group/33/unnkourosenn.pdf)
- [已核查来源 3](https://www.town.misaki.osaka.jp/soshiki/soumu/digital/5582.html)
- [已核查来源 4](https://data.bodik.jp/organization/273660)
- [已核查来源 5](https://www.nankai.co.jp/traffic/station/misakikoen.html)
- [已核查来源 6](https://www.town.misaki.osaka.jp/soshiki/toshi_seibi/sangyo/kannkou/aratanamisakikouen/3141.html)

## 阿瀬川橋 — 0 个确认节点

当前 proof SHA256：`10a7af8cb4e20f2ceca17ef6f76e4284b48b2218f1a8d9ad7464d67f6a36af9d`。旧 fixpoint：superseded。

Municipal inventory identifies bridge 1148 on the Shinogaki/Kuriyama old prefectural-road route, and current bus sources establish local service. The historic shrine reference at the western abutment does not establish a current visitor access point or stop-to-endpoint approach. River-camera and similarly named gorge/bridge results do not supply that relation. Existing nearby licensed coordinates are retained as candidates; their 18-25m proximity is not a route or public-access proof.

缺失类型：`EXACT_PUBLIC_VISITOR_ENDPOINT`, `OFFICIAL_OR_LICENSED_ENDPOINT_BOUND_ACCESS`。

需要的资料：Road/venue owner confirmation of the legitimate current visitor endpoint plus an access map or legally reusable endpoint-bound route from named stops.

A 交接动作：A to coordinate road/Canonical owner endpoint evidence. No deletion, relocation, replacement or extra denominator exclusion by B.

候选：栗山 / 三方コミセン / 栗山新道。

- [已核查来源 1](https://www.city.toyooka.lg.jp/_res/projects/default_project/_page_/001/002/945/toyooka.bridge-tennkennkekka2025.pdf)
- [已核查来源 2](https://www.city.toyooka.lg.jp/_res/projects/default_project/_page_/001/002/945/toyooka.bridge2025.pdf)
- [已核查来源 3](https://www.city.toyooka.lg.jp/kurashi/dorokotsu/buskotsu/1019743.html)
- [已核查来源 4](https://www.city.toyooka.lg.jp/_res/projects/default_project/_page_/001/019/743/2026.4mikata.pdf)
- [已核查来源 5](https://web.pref.hyogo.lg.jp/ks05/gtfs-jp.html)
- [已核查来源 6](https://lib.city.toyooka.lg.jp/kyoudo/komonjo/5ae6b4a8b3124e1c9a896ee4b749641093910208.pdf)

## 韮崎中央公園陸上競技場 — 2 个确认节点

当前 proof SHA256：`6aedd539c0c0d943088ef8a528e9fa57e034aa4dd6908620684412bb3ec404a4`。旧 fixpoint：superseded。

Venue, city and tourism authority explicitly confirm the new arena stop as park/stadium access; the relationship is not missing. The official GTFS metadata is CC0 but currently returns gtfs_files=[] and empty current/next download URLs. The archived feed and P11 do not contain the new September 2025 arena boarding point. Municipal open-data facility coordinates describe buildings, not the stop. Commercial maps were not copied without persistence rights. The mini-SL is an internal attraction and cannot fill a transport access quota.

缺失类型：`LICENSED_BOARDING_COORDINATES_FOR_NEW_STOP`。

需要的资料：A current licensed stops.txt or operator/city-provided WGS84 point for the arena boarding stop, explicitly distinguishing the 2025 relocated arena from the former gym.

A 交接动作：A to obtain the new-stop location/identity from the city or operator; exact venue access evidence is already available and reusable as a factual summary.

候选：韮崎中央体育館 / 富士見ヶ丘公民館。

- [已核查来源 1](https://shisetsu.mizuno.jp/7609-1/access)
- [已核查来源 2](https://www.nirasaki-kankou.jp/kankou_spot/kouen_bijyutsukan_shiryokan/kouen_teien/4327.html)
- [已核查来源 3](https://www.city.nirasaki.lg.jp/soshikiichiran/zaimuseisakuka/seisakutyouseitanto/2/1305.html)
- [已核查来源 4](https://www.city.nirasaki.lg.jp/material/files/group/1/uakaaaws.pdf)
- [已核查来源 5](https://api.gtfs-data.jp/v2/organizations/nirasakicity/feeds/shiminbus)
- [已核查来源 6](https://www.city.nirasaki.lg.jp/soshikiichiran/digitalsenryakuka/dx/1/opendata.html)

## ミュージアム都留 — 3 个确认节点

当前 proof SHA256：`none — target met`。旧 fixpoint：superseded。

### 新增：都留市駅 / 富士急バス（株）

The official prefectural walking course connects Museum Tsuru to Tsuru-shi station; this is already an accepted pedestrian gateway. The operator explicitly confirms that the Tsuru-shi to Otsuki regional bus remains in service after the March 2026 local-bus closures. Exact licensed P11 Tsuru-shi station bus stop establishes the distinct modal arrival node at this gateway. Do not use the discontinued Yamuramachi local bus or substitute the demand-taxi operator.

精确 joined source record：`8fbda534cb754068ab88353ec548028cac5b515fdd3900bd8f315e2ab694365d`。

限制：Official pedestrian visitor-course approach; direction-specific metrics unresolved.。

- [官方来源 1](https://www.yamanashi-kankou.jp/course/study/014.html)
- [官方来源 2](https://www.city.tsuru.yamanashi.jp/soshiki/sangyo/shoko_t/1/11927.html)
- [官方来源 3](https://www.fujikyubus.co.jp/regular/)
- [官方来源 4](https://www.fujikyubus.co.jp/pdf/rosen/tsuru/tsuru-otuki_202602.pdf)

## 许可与未采用资料

- 七宗町 ZIP：CC BY 4.0；署名 七宗町 七宗町営バス GTFS，2026-03-25。仅导入两个已审查的静态站点。归档 SHA256 `2047e7b3c4c7e5072bf06339ce76ae629d40cffaab7a5e250e3b779d8ba8aaea`。`python tools/transport/task-085-targeted-source-check.py` 可离线重验 ZIP-entry、GTFS 原始行、坐标、运营商和 stop_times 存在性。
- 七宗町社区中心官方步行活动仅支持接入关系，不复用历史活动时长。榛原两个节点是官方山路徒步起点，明确标注长距离山路 approach；不宣称短途 walking，也不导入全程 12 km 为 POI walking distance。
- 都留市站仍运营的区域巴士与 2026-03-31 停止的地方巴士区分；未将已停运的谷村町巴士添加为确认节点。
- 未采用场馆建筑中心/旧体育馆坐标替代新 boarding stop；未复制无已确认留存权的商业地图坐标。
- OSM/Overpass 的限定查询发生证书链错误、HTTP 406 或超时，没有取得记录。失败响应不等于空库存，不能证明节点不存在；没有关闭 TLS 验证，也没有导入 OSM 数据。
- 池原桥 2026 年官方公告允许行人通行，不自动等于每个附近站点都是桥的游客 gateway。阿瀬川桥的桥梁台账、历史神社记录及 18–25 m 附近站点不自动证明当前游客接入。
- みさき公園旧游乐园/2016 地图不能直接证明当前开放区入口。韮崎官方 GTFS 元数据目前无下载文件，不能据此声称新站不存在。
- 所有新增 topology 的 walking/transit/taxi、detour、stairs/elevation、P90 和无障碍指标均 unresolved。官方页面只保留事实摘要和链接，不保留原始版权地图或 route Provider payload。

## 验收结论

20/24 topology gates PASS，4 FAIL：94/95 coverage、1 个零节点、4 个 under-target 无可靠物理穷尽证明，以及 global fixpoint 未确立。A/Canonical、来源、identity、确定性、batch、graph-growth gates 均 PASS。第四个 FAIL 是撤销旧 fixpoint 过强结论后如实暴露的，不是新增数据损坏。WBS 7.15 保持进行中，不是待审查/已完成。
