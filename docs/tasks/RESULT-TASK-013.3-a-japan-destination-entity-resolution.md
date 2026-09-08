# TASK-013.3-A Result

## Status

**Partial — 待审查，不是最终验收通过。**

300 行完成证据审查与显式状态输出，254 个目的地通过当前全部门槛，46 个保持 unresolved。不得将本 Result 当作300/300实体完成、后续POI批次解锁或图片已生产。

## Prerequisite

- PASS：PR [#187](https://github.com/kanzakimy0/TravelAssist/pull/187) merged，`2026-09-08T01:00:37Z`；合入提交 `c28c14c619e2bc51daf78f3eede4e2a218ec482d`。
- 本轮最新开发基线 `553b01480345a4e26bd2b7952cf917b2cbbaea4f`。
- develop 已有 TASK-013.2 Result、300 destination manifest、9,000 unresolved POI slots、40 batch JSON。
- WBS 2.15 保留 Partial / planning-manifest，不误记图片或全部实体已完成。
- 在独立 worktree 将最新 develop 安全 merge 到现有任务分支，未改写历史，未从旧 Planner 工作树开发。

## Tracking

- Issue：[#189](https://github.com/kanzakimy0/TravelAssist/issues/189)，保持 Open / Review / Partial。
- 父 Issue：[#152](https://github.com/kanzakimy0/TravelAssist/issues/152)，父 PR #187。
- Branch：`feature/a-japan-destination-entity-resolution` → `develop`。
- Task：`docs/tasks/TASK-013.3-a-japan-destination-entity-resolution.md`，待验收（Partial）。
- WBS：2.16，待审查（Partial）。
- Implementation Commit / Draft PR：PENDING，创建后同步；不自动合并。

## Destination Resolution

| 项目                                    |         数量 |
| --------------------------------------- | -----------: |
| Destination rows                        |          300 |
| Verified entity identity                |          285 |
| 通过全部当前门槛                        |          254 |
| Unresolved destination                  |           46 |
| city / town / village                   | 185 / 36 / 7 |
| island / region                         |      10 / 23 |
| hot_spring_area / resort_area           |       22 / 3 |
| historic_district / destination_cluster |        6 / 1 |
| other_review_required                   |            7 |

保留全部 `jp-` ID、JP country、批次、等级、配额和 source/variant 外键。东京按都域 region、石垣/屋久岛按 island、箱根按 town、由布院按温泉地区处理。古代大宰府政府机构不代替现行太宰府市；已撤销行政町不代替当前旅游地区。

46 个逐条原因见 `docs/assets/generated/japan-destination-resolution-summary.md`。维度间存在重叠，不能把“缺坐标/缺名称/待边界”的数量简单相加。

## Prefecture Audit

- Verified prefecture：284；unresolved prefecture：16。
- 47 个现行都道府县均有已核验身份的目的地覆盖。
- 沿用父任务 JNTO slug codes，不伪造 ISO 编码。
- 排除历史东京府、旧北海道行政区，以及名称以“都”结尾但并非都道府县的京都城市项。
- 当前 preferred P131 优先；不通过东北等宏观地区扩散到全部县。
- 立山黑部保留富山/长野，跨县候选有 primary/secondary 和证据路径；缺失或与 JNTO 冲突的仍 unresolved。
- 报告：`japan-destination-prefecture-audit.md`。

## Language Names

- 281 个身份已核验、非人工冻结的目的地有 ja / zh-CN / en 名称。
- 名称来自固定版本开放实体标签；中文仅做明确记录的繁简字形规范化，不从英文复制生成。
- 秋保、直岛、上山温泉、清里等缺少可直接接受的中文标签；丹波篠山市的中文旧称、伊香保混入单体旅馆名另行冻结。
- 300 行均保留种子别名及可追溯别名。缺失字段留空，不使用英文假充中日文。

## Coordinates

- 258 个身份已核验的目的地具有通过本轮规则的中心代表点。
- 坐标来源为版本固定的 Wikidata P625，Earth/WGS84，粗校验 `20..46 / 122..154`。
- 输出最多4位小数，精度不超出来源；原始点、精度和版本链接保存在 JSONL。
- 同等来源多个相距明显的点、未知精度或缺失中心点不自动二选一：manifest 留空并记录候选。未用车站、酒店、单个景点代替旅游区中心。
- 这些是来源代表点，不是行政多边形质心，也不能用中心半径推断POI边界。
- 报告：`japan-destination-coordinate-audit.md`。

## Evidence

- 300 条 JSONL 证据/候选审计记录；297 条有实体版本链接，3 条仅有未解决搜索候选审计。
- 来源优先链：122 条现有 JNTO 目录 + Wikidata 字段证据，175 条开放实体字段证据，3 条 search-only unresolved。
- JNTO目录是优先的目录/县归属证据，不宣称它验证了每个坐标或译名。Wikidata URL 使用具体 revision。
- 元数据公开 API 串行请求，附 User-Agent/maxlag。发生429时停止并留检查点，降低频率后续传；不绕过限流。
- CC0 仅指开放实体元数据，不代表任何图片版权。未保留或使用图片字段，未生成或下载图片二进制。
- 可复现输入与哈希：`japan-destination-input-provenance.json`。

## Aliases / Overlap

- 检查 canonical + prefecture、别名、相同实体ID、5公里邻近中心、P131父子链。
- 当前可判定候选中发现的未解决重复/近邻冲突对：0；**整体重复验收仍未完成**，因为尚有46个 unresolved destination，不能声称300实体全部无冲突。
- 父子区域优先把未来POI归入最具体的已验证子区域；父区域引用同一个POI ID，不重复建立实体。
- 白川乡多行政归属、岛屿与同名市町范围、泛化旅游区等保留人工审查。未取得所有旅游区精确边界多边形，不以距离无冲突冒充地理无重叠。
- 报告：`japan-destination-overlap-review.md`。

## Downstream POI Contract

- `docs/assets/catalog/japan-destination-boundary-contract.v1.json`：300条稳定destination ID、scope、prefecture、center、parent、allowed_poi_boundary_policy。
- 293条有候选scope描述；254条通过全部当前门槛。其余46条明确 BLOCKED。
- 后续必须证明POI在已冻结命名区域内，不能自行扩大范围、按中心半径猜边界或换同名行政实体。
- 9,000 POI CSV 字节不变，SHA256：`908f15006b21755f7a933f21bb8e4c16333e5edbe9b2f659c89a605cabd56929`。
- 9,300 jobs / 9,600 variants / 40 batches不变，图片权利和执行门禁继续关闭。
- 父生成器仅叠加目的地解析结果，重跑不会把已解析字段恢复成空槽。父报告保留历史规划基线，当前审计以本任务报告为准。

## Validation

| Command                                      | Result                                                    |
| -------------------------------------------- | --------------------------------------------------------- |
| `npm ci`                                     | PASS；362 packages；0 vulnerabilities；未新增依赖         |
| `npm run assets:japan-destinations`          | PASS；输出实际 Partial，未声称最终验收通过                |
| `npm run assets:japan-destinations:validate` | PASS；结构、来源引用、POI只读校验                         |
| `npm run test:japan-destinations`            | PASS，26 tests                                            |
| `npm run assets:core-validate`               | PASS，55 parent artifacts                                 |
| `npm run test:core-generation`               | PASS，23 tests                                            |
| `npm run lint`                               | PASS                                                      |
| `npm run typecheck`                          | PASS                                                      |
| `npm run format:check`                       | FAIL：28项原有文档格式债；本任务新增格式问题0，见基线审计 |
| `npm run build`                              | PASS，21 pages；无需真实数据库/图片服务                   |
| `git diff --check`                           | PASS                                                      |
| 再次 resolver + validator                    | PASS；确定性 no-op，输出 SHA256 与 mtime不变              |

格式基线逐文件对比 `553b014`，报告：`japan-destination-format-baseline.json`。没有扩大任务去重排28份无关文档。测试覆盖错误国家/ID/县码、伪造坐标、英文填充中文、未解决强制通过、历史行政实体、跨县证据、父生成器兼容和重复生成。

## Files Changed

- 更新 destination manifest CSV；新增 evidence JSONL、aliases CSV、boundary contract JSON、公开元数据 snapshot、显式 review decisions。
- 新增5项 Markdown审计、summary JSON、输入哈希和格式债报告。
- 新增 metadata acquisition、候选审查、resolver、validator、格式债审计工具。
- 新增独立 `tests/task-013-3-japan-destination-resolution.test.mjs`。
- `package.json` 仅增加3个脚本；父 `core-generation-common.mjs` 仅接入兼容目的地overlay及明确历史/当前审计输出。
- 更新 Task、Result、WBS。未修改业务UI、Planner工作树、package-lock、POI名称槽位或图片文件。

## WBS Update

- 新增且未覆盖其他项目：`2.16 | 日本300目的地实体解析与验收 | A | P1 | 2.15`。
- 状态：待审查（Partial，254/300通过当前全部门槛），不是已完成。
- 2.15/PR187实际状态校正为已合并生产清单，仍Partial；旧交付日志作为历史保留。

## Commit(s)

- `80bf8d5`：安全同步最新develop。
- 实现提交 PENDING；最终同步后填入。
- 所有推送提交使用 `[skip ci]` 防止仓库自动创建/合并feature PR的工作流抢先合并。测试已在本地执行；PR保持Draft，未变更workflow。

## Draft PR

PENDING — `feature/a-japan-destination-entity-resolution` → `develop`，关联 #189 / #152 / #187，不自动合并。

## Follow-ups

1. 逐条补齐46项剩余证据，尤其同等候选坐标的官方代表点、缺少中文标准名、温泉/旅游区域边界。
2. 复核缺失身份/县归属及同名岛屿/市町范围；完善不可由现有证据唯一确定的旅游范围。
3. 重新执行本任务全量校验，达到300/300后再最终验收。
4. 本轮不创建或开始 TASK-013.4、POI解析或图片child task。

## Known Limitations

- 未达到用户规定的300/300最终验收，不能报告Completed。
- Wikidata是可追溯开放知识，不等于日本官方行政主数据；来源中错误/历史命名/多代表点已部分检出并冻结，仍需专门补证。
- 全仓format:check存在28项已证实的原有格式债，不将其描述为通过。
- 300证据记录不等于300身份已核验；293scope描述不等于293边界已全部验收。
- 数据工具没有改变当前网页，因此本任务不会改变3113 Planner预览效果。
