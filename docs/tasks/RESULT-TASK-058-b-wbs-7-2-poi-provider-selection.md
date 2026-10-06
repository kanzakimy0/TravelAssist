# RESULT-TASK-058-B

TASK-058-B — WBS 7.2 Places / POI Provider Selection

## 验收收尾（2026-09-13）

用户明确批准：`验收通过，允许合并 PR #362，并完成 WBS 7.2 收尾`。

- PR [#362](https://github.com/kanzakimy0/TravelAssist/pull/362) 已合并到 `develop`，merge commit：`07335833ccd2a7b0f4dd0c5a21ba5e094c9b49eb`。
- Issue [#361](https://github.com/kanzakimy0/TravelAssist/issues/361) 已于 `2026-09-13T08:27:31Z` 关闭为 **Completed**。
- Master WBS 7.2 = **B / 已完成**；其他 WBS Owner/status 不变。
- 完整合并、QA、范围与后续条件记录见 [WBS 7.2 验收收尾](../project/WBS-7.2-provider-selection-acceptance-closeout.md)。

下文保留已验收的研究基线、交付物和 QA。Provider 决策仍为 **CONDITIONAL**；研究完成没有关闭 C1–C5，也没有批准 Production Primary 或自动外部 fallback。

## 结论

**CONDITIONAL**。

优先评估 **Geoapify 付费 Places + Place Details + Autocomplete** 作为 Primary 候选；**没有批准 Production Primary，也没有批准自动切换的外部 fallback**。Runner-up 是 **HERE Geocoding & Search v7**；NAVITIME 作为日本专用合同候选保留。

Geoapify 的官方存储许可、Mapbox GL 展示路径和付费计费模型最接近当前需求；日本商户质量、ID 生命周期、Web/iOS/Android 商业订阅范围，以及 ODbL 下的未来持久化/派生处理仍需关闭条件。研究验收不代表这些条件已通过。[官方存储说明](https://www.geoapify.com/places-api/)、[详情与地图示例](https://apidocs.geoapify.com/docs/place-details/)、[价格](https://www.geoapify.com/pricing/)。

## 基线与范围

- Repository：[kanzakimy0/TravelAssist](https://github.com/kanzakimy0/TravelAssist)。
- Issue：[#361](https://github.com/kanzakimy0/TravelAssist/issues/361)，已关闭为 Completed。
- 执行日期：2026-09-13。
- 起点：执行时最新干净 `origin/develop`，`c8290b199fad0828245b355f231743b67d2eaad2`。
- Spec revision：`6e316fc0c68fe3201903472efacfc982cd4c4031`，仅阅读，不作为开发起点。
- Branch：`codex/b-wbs-7-2-poi-provider-selection`。
- Research PR：[#362](https://github.com/kanzakimy0/TravelAssist/pull/362)，经用户验收后已合并到 `develop`。
- Owner：根据 [authoritative override](../project/WBS-7.2-owner-correction.md) 同步为 B；仅修改 Master WBS 的 7.2 行。

开始前完成规定的 status、branch、fetch/prune、develop SHA 与 20 条历史检查；完整阅读 Task、Codex、Owner correction 和最新 Master WBS，并检查冻结标签/地图规范、当前 Planner/Detail、Planning/POI 设计和图片权利。

## 交付物

| 文件                                                                      | 内容                                                                                                        |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [poi-provider-selection.md](../architecture/poi-provider-selection.md)    | 需求、hard gates、候选取舍、Primary/fallback 决策、数据生命周期、归属、跨平台及下游约束。                   |
| [provider-matrix.json](../qa/TASK-058/provider-matrix.json)               | 8 个 Provider 家族、184 条事实、70 个官方来源、110 个含变体的 gates、价格与成本情景、UNKNOWN 和下一步条件。 |
| [provider-decision-report.md](../qa/TASK-058/provider-decision-report.md) | 版本/许可交叉核查、资料限制、QA 与验收边界。                                                                |
| 本 Result                                                                 | 用户验收记录。                                                                                              |

## 主要发现

- Google 标准 Places API 不满足当前 Mapbox + 持久化用途；**UI Kit 有非 Google 地图例外**，但不能据此导出 persistent master 数据。[服务条款 §14–15](https://cloud.google.com/maps-platform/terms/maps-service-terms)。
- Mapbox Search Box 的日本支持文档存在范围歧义；数据为临时用途，永久 Geocoding v6 不含 POI。[Search Box](https://docs.mapbox.com/api/search/search-box/)、[v6](https://docs.mapbox.com/api/search/geocoding/)。
- Foursquare PAYG 除指定 ID 外不允许缓存；OS Places dataset 的 Apache 2.0 许可与 API 独立。[Usage](https://docs.foursquare.com/fsq-developers-places/reference/usage-guidelines.md)、[官方 dataset card](https://huggingface.co/datasets/foursquare/fsq-os-places)。
- HERE 日本日英能力证据充分，但持久化/派生、AI/inferencing 限制与适用商业条件未关闭。[日本覆盖](https://docs.here.com/geocoding-and-search/docs/search-local-coverage)、[Platform Terms](https://legal.here.com/us-en/terms/here-platform-terms)。
- TomTom 按当前 Orbis Places Search v3 评估；旧版地址覆盖、旧日免费额度和 automotive photos 不能直接套用。[v3](https://docs.tomtom.com/places-search-api/documentation/product-information/introduction)、[当前价格](https://docs.tomtom.com/pricing)。
- 公共 Nominatim 不适合作为生产 autocomplete 或 outage fallback；自托管 OSM 需要独立建设与运营。[公共服务政策](https://operations.osmfoundation.org/policies/nominatim/)。
- NAVITIME 的 spot、多语、可保存数据及用途依赖适用选项/订单，不能视为已获授权。[直接条款](https://api-sdk.navitime.co.jp/api/specs/description/ntj_tou.html)。

所有关键未知权利明确标记 UNKNOWN；未用总体全球 POI 数量、营销语言或官方示例假装完成日本质量实测。

## QA

| 检查                                                   | 结果                                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `npm ci`                                               | PASS，audit 0 vulnerabilities。                                         |
| Matrix 必填字段/来源/状态、110 gates、成本公式         | PASS。                                                                  |
| Canonical lint / typecheck / build                     | PASS in clean worktree。                                                |
| 全仓 Node regression                                   | **2493 passed，0 failed / skipped**。                                   |
| Deployment validate / format / build / artifact verify | PASS；1871 artifact files，0 failures。                                 |
| TASK-058 scoped Prettier / diff check / 相对链接       | PASS。                                                                  |
| Scope / WBS / credential scan                          | PASS；仅 5 个文档文件，其他 WBS 字节一致，runtime/package/lock 改动 0。 |

本地 runtime QA 基线为上述 develop SHA，与候选 runtime tree 完全一致；研究文档另经 scoped QA。已验收 head `248effee37a13534d61670c20257c7392fa11a64` 通过单独 `workflow_dispatch` 的 **exact branch-head Quality Gate**：[run 34745152774](https://github.com/kanzakimy0/TravelAssist/actions/runs/34745152774)。head SHA、run URL 和交付结论已固定于 PR 描述；不是以 PR merge-ref 或 baseline artifact 代替最终 head 验证。[QA 方法与限制](../qa/TASK-058/provider-decision-report.md)。

已识别首次工作目录 lint 的 7 个错误来自旧任务 `.cache/qa/task024-worktree`；干净 worktree 的 canonical lint/typecheck/build 通过，未改 lint 配置、历史任务文件或依赖。

## 仍需关闭的条件

1. **C1**：确认 Geoapify ID 刷新/删除/迁移、三平台订阅权利、处理地区/DPA 和支持范围。
2. **C2**：另行授权日本城市/乡村及景点、餐饮、住宿、购物、车站、温泉、娱乐、本地类别的日英搜索、联想、详情与闭店实测；本任务未运行。
3. **C3**：在 7.4 前审查实际持久化方案的 ODbL、来源分离、归属与派生数据库义务。
4. **C4**：在 7.6/7.7 前确认预算/峰值/限流/凭据与降级策略；未批准自动备用 Provider。
5. **C5**：图片权利未通过时保持 provider photo 禁用，沿用已批准 icon/asset 路径。

仅在明确官方价格下计算 Geoapify 三个假设情景：USD **59 / 109 / 179 每月**。公式、日峰值、RPS、搜索/联想/详情调用量和排除项均在 matrix；不代表采购或真实用量预测。其他未确认价格不编造估算。

## 停止状态

研究与文档已获用户验收，PR #362 已合并，Issue #361 已关闭为 Completed；WBS 7.2 为 **B / 已完成（#361 / TASK-058-B；用户验收，PR #362 已合并）**。

研究 PR 提交四份要求的研究/Result 文件及 Master WBS 7.2 行；验收收尾补充收尾记录并同步 Result、QA 报告与 WBS 7.2 状态。未修改其他 WBS Owner/status；未实施 7.4 / 7.6 / 7.7 / 7.9、UI、runtime、DB、AI、Engine、Route 或 Personal Center。未开通或购买 Provider、未调用 live Provider API、未导入 POI 数据。本次合并、Completed 关闭与 WBS 完成状态均基于用户明确授权；不启动后续任务。
