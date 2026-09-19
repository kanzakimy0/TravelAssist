# Places / POI Provider Selection

TASK-058-B · WBS 7.2 · Issue #361 · Owner B · Research date: 2026-09-13

## Decision: CONDITIONAL

**Geoapify 的付费 Places + Place Details + Autocomplete 组合是优先评估的 Primary 候选；尚未批准任何 Production Primary 或自动 Provider fallback。** 条件包括日本实际业务搜索质量、ID 更新行为、Web/iOS/Android 订阅权利，以及未来持久化数据的 ODbL 处理方式。此结论允许验收选型研究，不能作为启用服务或实施下游任务的授权。

优先考虑 Geoapify 的原因是其官方文档明确允许结果保存，并给出 Mapbox GL 展示示例、可核算的商业套餐和搜索/详情接口。日本商户覆盖与双语完整度仍不能从文档推导为已验收。[存储与数据来源](https://www.geoapify.com/places-api/)、[详情与 Mapbox GL 示例](https://apidocs.geoapify.com/docs/place-details/)、[商业套餐](https://www.geoapify.com/pricing/)。

**Runner-up 为 HERE GS v7。** 它提供更明确的日本能力证据，但尚未解决所需持久化、派生使用和当前商业价格问题。日本专用候选 NAVITIME 也被纳入，其直接合同将可保存数据和用途留给订单约定。[HERE 日本覆盖](https://docs.here.com/geocoding-and-search/docs/search-local-coverage)、[HERE 条款 §6](https://legal.here.com/us-en/terms/here-platform-terms)、[NAVITIME 直接合同 §3](https://api-sdk.navitime.co.jp/api/specs/description/ntj_tou.html)。

完整事实、适用产品、官方 URL、访问日期、限制、10 个 hard gates、价格事实及假设见 [provider-matrix.json](../qa/TASK-058/provider-matrix.json)。共 8 个 Provider 家族、184 条事实、70 个官方来源，另区分 3 个产品/部署变体。状态是研究判断，不是供应商的承诺；未执行任何 live POI API、账户开通、采购、数据集导入或日本质量 benchmark。

## TravelAssist 的实际需求与冻结边界

研究基线为 `origin/develop` 的 `c8290b199fad0828245b355f231743b67d2eaad2`。依据 [单项 Owner override](../project/WBS-7.2-owner-correction.md)，仅同步 Master WBS 的 7.2 为 B。

| 当前依据                                                                                                                                                                                 | 对选型的约束                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [1.10/1.12/1.13 收尾记录](../project/WBS-1.10-1.12-1.13-final-closeout.md)、[标签规则](../ui/attraction-activity-tag-display-rules.md)                                                   | canonical 英文 ID 与显示语言分离；供应商原始分类不能直接成为 UI 标签；未知分类不猜测。                                                              |
| [Map/Pin 视觉规范](../ui/map-visual-pin-region-route-spec.md)、[当前地图实现](../../src/features/planner/map/map-provider.ts)                                                            | 保持现有 `mapbox://styles/mapbox/outdoors-v12`、单张 Mapbox 地图、低密度 Pin 与归属信息。历史 light-v11 记录不代表当前样式。                        |
| [7.1 历史 Mapbox 记录](../tasks/RESULT-TASK-008.1-a-planner-mapbox-interactions.md)、[后续本地集成记录](../tasks/RESULT-planner-local-integration.md)                                    | 区分历史 mock 验证与后续 Mapbox 集成；既有地图可用不代表 POI 数据许可已取得。                                                                       |
| [当前 Planner catalog](../../src/features/planner/data/planner-catalog.ts)、[详情组件](../../src/features/planner/components/place-details.tsx)                                          | 当前景点、时段、价格等仍有手工/mock 数据；不以样例数据覆盖范围代替 Provider 需求。                                                                  |
| [POI design candidate](poi-master-schema-v0.2.md)、[POI planning projection](../../src/shared/contracts/planning/poi.ts)、[Fact contracts](../../src/shared/contracts/planning/facts.ts) | 内部 POI identity、Provider ID、Master Code、AssetSlot 必须分离；保留来源与时效，不能把原始供应商 JSON 作为 domain contract。7.4 尚未在本任务实现。 |
| [资产权利规则](../assets/asset-library-strategy.md)                                                                                                                                      | 图片须有可验证许可；API 提供照片 URL 不等于允许下载、缓存、热链或存入资产库。                                                                       |
| [Route provider 决策先例](route-provider-selection.md)                                                                                                                                   | 沿用证据与 hard-gate 方法；不继承旧路线覆盖判断或历史 WBS 状态。                                                                                    |

需求是日本景点、餐厅、住宿、购物、车站、温泉、娱乐和本地类别的文本搜索、输入联想、附近/分类搜索及详情；需要可刷新的 identity、坐标、日文优先和英文显示路径、可用的运营字段。字段缺失必须可表达。开放时间、营业状态、排队、价格等不能因为一次抓取就成为永久事实。

## Hard-gate 比较

P = PASS；C = CONDITIONAL；F = FAIL；U = UNKNOWN。PASS 只表示所列评估面有充分文档支持；任何 material C/U 未关闭都不能无条件投产。先判断门槛，再比较适配程度，不做可掩盖许可失败的加权总分。

| Provider / 被评估产品                      | Japan | Core API | Identity | 多语言 | Mapbox | 持久化 | Attribution | Web/mobile | 商业 | 运营 |
| ------------------------------------------ | ----- | -------- | -------- | ------ | ------ | ------ | ----------- | ---------- | ---- | ---- |
| Google Places API New，标准非 EEA 服务条款 | C     | P        | P        | C      | F      | F      | P           | P          | P    | C    |
| Mapbox Search Box                          | U     | C        | C        | U      | P      | F      | C           | P          | C    | C    |
| Foursquare 当前 Places API                 | C     | P        | P        | C      | U      | F      | P           | C          | P    | C    |
| HERE Geocoding & Search v7                 | P     | P        | C        | P      | C      | U      | C           | P          | U    | C    |
| TomTom Orbis Places Search v3              | U     | P        | C        | U      | U      | U      | U           | C          | U    | U    |
| Geoapify managed OSM                       | C     | C        | C        | C      | P      | C      | P           | U          | P    | C    |
| OSM 自托管组合，当前未建设                 | C     | F        | C        | C      | P      | C      | P           | P          | U    | F    |
| NAVITIME 直接合同 spot family              | P     | P        | C        | C      | U      | U      | U           | U          | U    | U    |

表中 F 是针对当前预期用途的失败；不表示厂商所有产品都不能使用。三个例外必须单独理解：

- **Google Places UI Kit**：标准服务条款 §15.1 明确允许非 Google 地图，Web/native 组件有路径。该例外不扩展到任意 Places API 数据导出或永久 master enrichment；因此只能列作需要另行 UI 审查的展示候选。[服务条款 §14–15](https://cloud.google.com/maps-platform/terms/maps-service-terms)、[Places Library](https://developers.google.com/maps/documentation/javascript/places-js)、[UI Kit native styling](https://developers.google.com/maps/documentation/places/ios-sdk/places-ui-kit-custom-styling)。
- **Foursquare OS Places dataset**：官方数据卡标注 Apache 2.0；当前官方入口为 Places Portal/Iceberg。独立数据集的许可不能套到 Places API 返回值。数据集没有现成应用查询服务，需要自己的索引、更新与运营，也不能假定包含 API 的 Premium 照片、营业时间或评论。[官方数据卡](https://huggingface.co/datasets/foursquare/fsq-os-places)、[当前访问方式](https://docs.foursquare.com/data-products/docs/access-fsq-os-places)、[字段](https://docs.foursquare.com/data-products/docs/places-os-data-schema)。
- **公共 Nominatim 与自托管 OSM**：公共服务禁止客户端 autocomplete，整体上限 1 request/s，不能系统性抓取区域 POI，不适合作为故障时自动切换的备用服务。这些是公共服务器规则，不是对 Geoapify 或自托管的统一禁令。[公共服务政策](https://operations.osmfoundation.org/policies/nominatim/)、[Nominatim endpoints](https://nominatim.org/release-docs/latest/api/Overview/)。

## 候选取舍与版本核对

| 候选       | 有价值的能力                                                                           | 未选为无条件 Primary 的决定性原因                                                                    |
| ---------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Google     | 完整搜索/详情、多平台 SDK、可刷新的 Place ID                                           | 标准 Places API 的地图限制及持久化/派生限制不满足当前 master + Mapbox 用途；不能把 UI Kit 例外泛化。 |
| Mapbox     | 与当前地图同品牌；Search Box 有 suggest/retrieve/forward/category 和 richer attributes | 日本 guide 与支持地域列表未对齐；Search Box 临时使用。永久 Geocoding v6 **没有 POI 数据**。          |
| Foursquare | 当前 API 的分类、搜索、ID 与 Premium 信息                                              | PAYG 除特定 ID 外不允许缓存；默认 Enterprise 也不是 server cache 授权。                              |
| HERE       | 日本日英查询、Browse/Lookup 示例最明确                                                 | normalized persistence、Japan GS 例外、派生用途及费用未关闭。                                        |
| TomTom     | 新 Orbis v3 的 Suggest/Discover/Details，选择响应 attributes                           | 新版日本覆盖与适用许可未知；旧版地址覆盖表不能证明新版 POI 能力。                                    |
| Geoapify   | 明确允许存储、Mapbox GL 示例、按日 credits 的商业计划                                  | 日本质量、ID lifecycle、完整双语和 native 商业适用范围需验证；ODbL 需要兼容的后续数据设计。          |
| OSM 自托管 | 可保存的开放数据、平台中立、可控服务                                                   | 没有部署服务/成本/值守基线，不能充当立即可用 fallback；Nominatim 内部 place_id 不持久。              |
| NAVITIME   | 日本本地 spot 与日英多语选项                                                           | spot、multilingual、可保存字段/用途、Mapbox 和平台权利依赖实际合同；价格与配额不完整。               |

上述版本差异依据：[Mapbox Search Box](https://docs.mapbox.com/api/search/search-box/)、[Japan guide](https://docs.mapbox.com/help/troubleshooting/japan-specific-considerations-search-api/)、[Geocoding v6](https://docs.mapbox.com/api/search/geocoding/)、[Foursquare usage](https://docs.foursquare.com/fsq-developers-places/reference/usage-guidelines.md)、[TomTom v3](https://docs.tomtom.com/places-search-api/documentation/product-information/introduction)、[NAVITIME spot](https://api-sdk.navitime.co.jp/api/specs/api_guide/spot.html)。

Geoapify 的 autocomplete 文档包含 `amenity` 和 partial place name，不能误称仅支持地址；但其 Places `name` 过滤加 category/spatial 限制也不能在未经测试时视为完善的日本自由文本商户搜索。官方营销的分类数量和评论描述与 API schema 的证据强度不同，本决策以接口字段与限制为准。[Autocomplete](https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/)、[Places reference](https://apidocs.geoapify.com/docs/places/)。

## 允许的数据生命周期概念

本节为后续任务约束，不定义 SQL、TypeScript contract、adapter 或 category mapping。

1. **取得与分类**：任何数据进入后续系统前先确定 Provider、产品/版本、适用协议、字段许可、来源与观察时间。许可 UNKNOWN 的字段默认不落库、不进入派生处理。
2. **Identity**：内部 identity 与 vendor ID 分开；存储 ID 的权利和存储其返回内容的权利分别判断。ID 删除、合并、迁移不能静默导致不同景点共用一条记录。Nominatim 的内部 `place_id` 不能当永久 ID。[ID 文档](https://nominatim.org/release-docs/latest/api/Output/)。
3. **Geoapify/OSM 字段**：官方允许结果缓存保存；未来才能决定具体 snapshot、refresh、delete 和过期显示策略。ODbL 下的 derived database、collective database 和 produced work 应按实际输出审查；不能把“允许存储”写成“无任何责任”。[OSM license](https://www.openstreetmap.org/copyright)、[归属指南](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines)。
4. **受限数据隔离**：Google、Mapbox、Foursquare、HERE 等数据不得混入可长期保存或开放再分发的数据库来绕过原始限制。Foursquare OS dataset 必须记录独立取得路径和许可证。临时数据也不能因进入日志、备份、分析表或响应缓存而变成永久保存。
5. **时效与降级**：`fetchedAt` 不等于实际核实时间；无当前证据时营业状态保持 unknown。后续故障场景只能显示仍满足许可及其时效策略的已有记录，或明确不可用；不得自动访问未批准 Provider、复制旧值成“实时”状态。
6. **派生事实**：原始分类与未来 canonical taxonomy 分离；未经许可不能把供应商地点坐标、类别、评分用于 master enrichment/region derivation/用户画像。HERE 的 AI/inferencing 禁令以及 Mapbox POI profile 限制必须在未来用途审查时显式保留。[HERE §6.4](https://legal.here.com/us-en/terms/here-platform-terms)、[Mapbox July 2026 terms](https://www.mapbox.com/legal/product-terms)。

## Attribution、图片与跨平台

保留当前 Mapbox logo/attribution；按 POI 数据源另加相应来源和许可链接，不能认为 basemap 自带的 OSM 文案满足所有详情卡或导出场景。Geoapify 免费层还要求 Geoapify credit；本决策成本样例采用付费商业层，未开通。[Geoapify attribution](https://www.geoapify.com/places-api/)。

Provider photo 默认不选入当前可用范围。照片 binary、thumbnail、CDN URL、author credit 和数据 ID 的保留权分别核实；网站 URL、Wikidata/Commons 关联或返回的媒体链接都不是通用图片许可。缺图时沿用批准的 icon/asset fallback，不制造地点照片。[仓库图片规则](../assets/asset-library-strategy.md)、[Mapbox URL-data 条款](https://www.mapbox.com/legal/product-terms)。

Web、iOS、Android 应共享相同的来源、许可和未知状态语义，但各平台的 key 限制、端侧缓存、归属展示和订阅范围必须分别核实。对于 Geoapify，目前可确认 HTTP/GeoJSON 技术路径；**三平台商业订阅适用权仍标记 UNKNOWN**，不是从 REST 可调用推断许可。后续不得将 secret 放入浏览器/native 包或采样日志。

## 商业与成本

官方事实、TravelAssist 假设、计算结果在 matrix 中分别保存。没有把未知价格补为 0，也没有把月额度当成日额度。

以 Geoapify 为例，假定每次搜索最多 20 个结果、每次 autocomplete 会话 4 次请求、基础详情 1 credit、无额外 details features/照片/缓存节省；每月 30 日，假定峰值日为平均日的 2 倍。套餐 credits 在其他 API 间共享，RPS 需要独立控制。[Credit rules](https://www.geoapify.com/pricing-details/)、[Autocomplete accounting](https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/)、[Paid plans](https://www.geoapify.com/pricing/)。

| 假设情景 | 搜索/月 | Autocomplete 会话 / 请求 | 详情/月 | Credits/月 | 假设峰值日 | 对应商业套餐              | 估算 USD/月 |
| -------- | ------- | ------------------------ | ------- | ---------- | ---------- | ------------------------- | ----------- |
| Low      | 3,000   | 3,000 / 12,000           | 1,500   | 16,500     | 1,100      | API10，10,000/day，12 RPS | 59          |
| Medium   | 30,000  | 30,000 / 120,000         | 15,000  | 165,000    | 11,000     | API25，25,000/day，15 RPS | 109         |
| High     | 120,000 | 120,000 / 480,000        | 60,000  | 660,000    | 44,000     | API50，50,000/day，20 RPS | 179         |

公式为 `monthlyCredits = searches + autocompleteRequests + detailsCalls`。这些不是使用量预测或报价；不含税费、汇率、超额、额外字段、重试、地图、路线、照片、存储、托管与支持升级。实际高峰 QPS 和跨平台商业条件尚未验收。

HERE 当前 Base Plan widget 未能从官方页面取出数值；TomTom 已确认的是新版月免费额度，paid/attribute 费率仍未知；NAVITIME 所需选项尚无适用报价，因此三者不提供伪精确成本情景。Mapbox 同页展示 preview/standard 两套 Search Box 价格，不能未经适用性确认挑选较低值。[HERE pricing](https://www.here.com/get-started/pricing)、[TomTom pricing](https://docs.tomtom.com/pricing)、[NAVITIME options](https://api-sdk.navitime.co.jp/api/specs/description/about_navitime_api.html)、[Mapbox pricing](https://www.mapbox.com/pricing)。

## 必须关闭的条件与停止点

| 条件               | 所需证据                                                                                     | 对下游的约束                                                |
| ------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| C1 商业/平台/ID    | Geoapify 对三平台订阅、ID 变更/删除/刷新、处理地区/DPA、支持范围的明确资料                   | 不能据此宣称 native 或 identity lifecycle 已验收。          |
| C2 日本产品质量    | 另行授权并预先约定样本/阈值的城市与乡村、8 类用途、日英名与联想、附近结果、详情缺失/闭店验证 | 未运行；不以文档示例或总体 POI 数量替代实测。               |
| C3 持久化许可      | 实际 intended lifecycle 的 ODbL/归属/derived vs collective database 审查                     | 7.4 不得复制受限数据或把来源关系抹去。                      |
| C4 运营与 fallback | 峰值/预算/key/限流/支持/降级策略；单独批准备用来源                                           | 7.6/7.7 不得自动切换公共 Nominatim、未授权 API 或过期字段。 |
| C5 可选媒体        | 单张或产品级明确商业展示、缓存、作者/来源与仓库资产规则                                      | 未解决时保持无 provider photo，非强制阻塞文字/分类探索。    |

7.9 只能在之后有明确任务和权利边界时审议；本任务没有评分规则、AI、Engine、Candidate Pipeline、Master Code 或 Region Graph 改动。外部询价、发消息、开账户、调用 API 和后续 empirical evaluation 都未启动。验收本研究与关闭 Production 条件是不同的决策。
