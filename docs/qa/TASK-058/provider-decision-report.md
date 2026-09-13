# TASK-058-B Provider Decision Report

## Research finding

**CONDITIONAL**。优先候选为 Geoapify 付费组合；Production Primary = none；自动外部 fallback = none；Runner-up = HERE。完整理由见 [架构决策](../../architecture/poi-provider-selection.md)，逐项机器证据见 [matrix](provider-matrix.json)。

研究日期为 2026-09-13，基线 develop 为 `c8290b199fad0828245b355f231743b67d2eaad2`，分支 `codex/b-wbs-7-2-poi-provider-selection`。未从 spec branch 开发。官方文本按实际访问日期记录；PDF 使用下载时间与 SHA-256。来源库不保存大段转载正文或密钥。

## Evidence method

- 审阅 Task、Codex 指令、7.2 Owner override、完整最新 Master WBS，以及 1.10/1.12、Mapbox、Planner mock/Detail、Planning/POI 与 asset rights 上下文。
- 对 8 个 Provider 家族分别记录 23 个维度，包含技术字段、许可、保留、派生、平台、配额、运营与锁定风险；总计 184 条事实、80 个家族 hard gates。
- 对 Google UI Kit、Foursquare OS dataset、公共 Nominatim 另做 3 组变体 gates，防止把同厂商/同数据源的许可混为一谈。
- 使用 70 个官方文档、价格、政策或供应商发布的数据卡。第三方页面仅作寻找官方入口的线索，不作为 hard gate 的依据。
- 文档存在不一致、HTML 没有条款/价格正文，或资料只说明技术可调用而不说明权利时，保留 UNKNOWN。没有 live API、benchmark、数据集下载、账号或采购操作。

每条事实都有 `provider / fact / status / officialSourceUrls / accessedAt / evidenceNote / confidence / limitation`。日期精度明确为 day；不编造单次网页访问的秒级时间。Gate 的 PASS 不等于日本逐商户质量已验收。

## 关键交叉核查

| 项目                         | 核查结果及对结论的影响                                                                                                                                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Google API 与 UI Kit         | [服务条款 §14.2](https://cloud.google.com/maps-platform/terms/maps-service-terms) 限制标准 Places API 与非 Google map 使用；§15.1 给 UI Kit 例外。保留此例外，未错误排除所有 Google 产品；UI Kit 仍不解决 persistent master。                                                                    |
| Google storage               | 同一[服务条款 §14.3](https://cloud.google.com/maps-platform/terms/maps-service-terms) 允许坐标最多 30 日；[Place ID](https://developers.google.com/maps/documentation/places/web-service/place-id) 有可保存与刷新路径。没有把这些例外扩展到名称/评论/全响应。                                    |
| Mapbox Japan 与 geocoding    | [Search Box](https://docs.mapbox.com/api/search/search-box/) 地域列表与[日本 beta guide](https://docs.mapbox.com/help/troubleshooting/japan-specific-considerations-search-api/) 未明确对齐；[v6 geocoding](https://docs.mapbox.com/api/search/geocoding/) 不再提供 POI。Japan gate 为 UNKNOWN。 |
| Mapbox 最新 PDF              | 从[官方产品条款页](https://www.mapbox.com/legal/product-terms) 读取 2026-07-21 global/Japan PDF 的 §2.7.1–2.7.7；存储 Feature ID 的例外不授权永久保存其他字段；URL 不授予链接内容权利。                                                                                                          |
| Foursquare current vs legacy | [迁移资料](https://docs.foursquare.com/developer/reference/upcoming-changes) 指向新服务与 2026-06 价格，未使用已淘汰的 legacy v3 方案。                                                                                                                                                          |
| Foursquare retention         | HTML reader 未显示正文，改用官方 `.md`，[usage](https://docs.foursquare.com/fsq-developers-places/reference/usage-guidelines.md) 确认 PAYG 其他属性不可缓存；Enterprise 默认仅设备 24h，并非 server cache。                                                                                      |
| Foursquare OS license        | [供应商官方数据卡](https://huggingface.co/datasets/foursquare/fsq-os-places) 标注 Apache 2.0；[当前访问文档](https://docs.foursquare.com/data-products/docs/access-fsq-os-places) 已改 portal/Iceberg。没有将开放数据许可套给 API Premium 数据。                                                 |
| HERE Japan/rights            | [日本覆盖](https://docs.here.com/geocoding-and-search/docs/search-local-coverage) 明确日英；[§6.4](https://legal.here.com/us-en/terms/here-platform-terms) 的 cache、Japan GS 例外、修改/派生、AI/inferencing 与跨用户使用限制仍需适用合同解决。                                                 |
| TomTom current version       | [当前产品](https://docs.tomtom.com/places-search-api/documentation/product-information/introduction) 是 Orbis v3；[Details](https://docs.tomtom.com/places-search-api/documentation/places-search/details) 有 attributes/语言/营业时间。旧地址覆盖表不能证明 v3 日本 POI。                       |
| Geoapify API vs marketing    | [Autocomplete](https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/) 支持 amenity，不误记为仅地址；[Details](https://apidocs.geoapify.com/docs/place-details/) 警告原始数据可缺失或过时。营销的完整度、类别数量或 reviews 文案不被当作日本字段保证。                                |
| Public OSM vs managed OSM    | [公共 Nominatim 政策](https://operations.osmfoundation.org/policies/nominatim/) 不适用于自托管服务本身，但明确使公共端点不能作为本项目生产 autocomplete/failover。                                                                                                                               |
| 日本专用候选                 | [NAVITIME 直接条款 §3](https://api-sdk.navitime.co.jp/api/specs/description/ntj_tou.html) 将可保存数据/用途/价格交由订单；[多语 spot](https://api-sdk.navitime.co.jp/api/specs/api_guide/spot.html) 是选项，不能假设 marketplace 权利相同。                                                      |

本轮不声称某 Provider 的日本覆盖率、召回率、语言完整率或延迟达到任何数值。所有图片权利未明确部分保持 UNKNOWN，未下载 Provider 照片。

## Source retrieval limitations

HERE Base Plan 页面使用价格 widget，已通过官方网页和直接下载检查，但取回内容没有数值；TomTom 当前 legal landing 的正文同样缺失。对应官方入口仍记录在 matrix，价格/许可保持 UNKNOWN，不用旧博客补值。Foursquare `.md` 文档成功取回，消除了 retention 页面空正文带来的歧义。

Mapbox global PDF SHA-256：`8462b80946abe90c4996577262928c7987ec2066e464c997869c4d82ebb9ec1c`。

Mapbox Japan PDF SHA-256：`c4be9379003f14d881bfd224fa6dd3167200aaba10f7a6d612db27366c6ceb5f`。

访问时间、直达 PDF URL 与 reviewed sections 均在 matrix 中。研究使用当天官方发布的资料，不把历史 published/updated date 冒充本日条款修订时间。

## Cost audit

仅对官方计费单位明确的 Geoapify 计算 low/medium/high 情景，详细输入与排除项在 `costScenarios`。基础公式、峰值日与套餐日额度逐项检查。三个情景均 photos = 0，extra features = 0，不假设缓存命中，不混入地图/路线费用。结果为 USD 59 / 109 / 179 每月，对应条件式容量假设，不是已采购套餐。

Google/Foursquare 保留当前 SKU/field 价格事实；Mapbox 记录 preview/standard 并存；HERE、TomTom paid attributes、NAVITIME 适用报价以及 self-host 成本不足以可靠计算，明确不估算。免费使用不被默认为无限或无条件商业生产权限。

## Repository QA

| Check                                                                   | Result                                                                                                          |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                                | PASS，locked install；audit 0 vulnerabilities。                                                                 |
| Matrix parse/required fields/unique dimensions/source references        | PASS，8 families × 23 facts；70 source entries；80 family + 30 variant gates。                                  |
| Gate enums / decision / production-off invariant                        | PASS，全部为指定状态；CONDITIONAL，productionApproved=false，fallback provider=null。                           |
| Cost arithmetic and plan capacity                                       | PASS，3 个情景的会话/请求、credits、峰值日、套餐费用均一致。                                                    |
| Local Markdown links                                                    | PASS，相对文件链接存在。                                                                                        |
| `npm run lint`                                                          | PASS in clean worktree；首次日常目录失败原因见下。                                                              |
| `npm run typecheck` / `npm run build`                                   | PASS。                                                                                                          |
| `node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs"` | PASS，2493 passed，0 failed / skipped。                                                                         |
| `npm run deploy:validate:local`                                         | PASS。                                                                                                          |
| `npm run format:check:deploy`                                           | PASS。                                                                                                          |
| `npm run deploy:build:local` / `npm run deploy:verify-artifact`         | PASS，1871 artifact files，0 audit failures。                                                                   |
| TASK-058 scoped Prettier / `git diff --check`                           | PASS。WBS 仅机械改行，不全表重排。                                                                              |
| Scope / WBS isolation                                                   | PASS，四个研究交付文件 + WBS；除 7.2 行外 WBS 字节相同；runtime/package/lock/workflow 改动 0。                  |
| Changed-evidence credential scan                                        | PASS，未发现 private key、GitHub token、Google/Mapbox credential、JWT 模式；人工确认未加入实际凭据或 API 响应。 |

可复核的本地检查程序与原始 logs 留在 ignored `.artifacts/task058/`，未提交第三方全文。结构检查使用 Python JSON parser、枚举/必填字段/唯一性断言、source URL 对照、独立成本重算、相对链接解析和 WBS baseline 字节比较；不是仅确认 JSON 可打开。

干净 worktree 的 runtime QA 位于上述 develop SHA；候选受跟踪 runtime/package/lock/workflow 与该 SHA 完全一致。此结果与研究文档的 scoped QA 分别记录，不把 baseline artifact 的 commitSha 写成候选 SHA。Draft PR 最终提交另通过 `workflow_dispatch` 运行原仓库 Quality Gate，以实际 branch head 验证；交付时在 PR 描述固定 head SHA、run URL 和结论。PR merge-ref 的绿色结果不能替代该检查。

首次在日常工作目录执行 `npm run lint` 发现 7 个 `no-require-imports` 错误，全部位于旧任务 `.cache/qa/task024-worktree/.cache/qa/*.cjs`。这些路径未被本分支修改。随后从同一 develop SHA 创建干净 disposable worktree，canonical lint/typecheck/build 均通过，证明并非 develop 受跟踪文件的 lint 失败；未更改 lint 配置来掩盖问题。

`npm ci` 提示 3 个既有依赖安装脚本尚未列入 allowScripts；安装成功且 audit 为 0 vulnerabilities。本任务不修改依赖或批准新的安装脚本。

## Acceptance and downstream constraints

待用户验收的是选型证据和 **CONDITIONAL** 决策。C1–C4 未关闭前不能宣称 Production Primary 获批；C5 图片可保持禁用。

- 7.4：保持 provider identity/source/license 与 canonical identity 分离，先关闭 persistence/ODbL 条件。
- 7.6/7.7：先关闭日本实测、平台权利、预算/限流/凭据/attribution 与 fallback 条件。
- 7.9：不得把 vendor categories/ratings/popularity 直接变成 canonical features 或评分；未来派生/AI 权利单独审议。
- 当前任务只提交研究/QA/Result 和 Master WBS 7.2 行；不实现这些边界，也不对供应商发起询价或开户。

[Draft PR #362](https://github.com/kanzakimy0/TravelAssist/pull/362) 保持未合并，Issue #361 保持 OPEN，WBS 7.2 保持 B / 待审查（#361 / TASK-058-B；Draft PR #362）。其他 WBS Owner/status 不变。
