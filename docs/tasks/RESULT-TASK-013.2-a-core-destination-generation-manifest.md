# TASK-013.2-A Result

## Status

Partial — Japan-only 生产清单实现完成，待审查；不是图片生产完成。300 个目的地仍需生产实体复核，9,000 个景点全部为明确 unresolved 槽位。不得将这些数量宣称为已核实景点或可用照片。

## Prerequisites

- TASK-013-A / #112：已合并并最终验收。PR #166 merge `aee2eaec3ac841395de1737a3042a112ad6fa6ea`。
- TASK-013.1-A / #116：用户授权验收合并；PR #172 merge `b635465c623a4e628c9c9986253ee9266be39541`。最终验收记录 PR #188 merge `95311fcbdc3432eb4b75cb0644cad7783fad7415`；Issue #116 已关闭。
- #172 验收：406/406 全仓测试、95 素材测试、lint/typecheck/build、桌面/手机浏览器、两次完整运行 no-op 与 resume。30 份既有文档格式债明确记录，未伪报全通过。
- 当前实现基线：`origin/develop = 95311fcbdc3432eb4b75cb0644cad7783fad7415`。
- develop 已具备父任务 Result、WBS 2.13/2.14 已完成、Asset Manifest、Registry、rights policy、size profiles、variant registry 与 nightly pipeline。

## Tracking

- Task：TASK-013.2-A；Issue [#152](https://github.com/kanzakimy0/TravelAssist/issues/152)；父任务 #112 / #116。
- Branch：`feature/a-core-destination-generation-manifest`。
- WBS：2.15，日本国内核心目的地素材生成单（300目的地 / 9,000景点）。
- 复用既有 [Draft PR #187](https://github.com/kanzakimy0/TravelAssist/pull/187) → develop。保持 Draft，不自动合并。
- 本记录覆盖此前 Blocked Result；历史阻塞已通过 #172 / #188 解除。

## Conflict Audit

- 独立 worktree 执行，未覆盖主工作区未提交的 Planner/UI 修改。
- 从已有任务分支安全合并最新 develop，集成提交 `2faed32`。
- 唯一冲突为 WBS 三处记录；保留两边记录并更新当前状态，没有 Planner / DB /业务代码冲突。
- 相对验收基线：`src/`、`public/`、`assets/`、`package-lock.json` 无修改。
- 未使用 clean/reset/force push；未新增 npm 依赖。package.json 仅增加五个任务脚本。

## Japan-only Audit

- 冻结 Japan-only Seed SHA-256：`67c60cf45e9744ffcc48f4d9f2fee8bdd8cd4eb8164fc4b8ebfc584b331b5132`。
- JP country rows = 300；non-JP rows = 0；jp-* destination IDs = 300；JP-* batches = 40。
- 校验 country、region、ID、名称冻结哈希和批次，而不是只相信 JP 前缀。测试包含“仍写 JP、把 Tokyo 改为 Seoul”的拒绝案例。
- 未恢复全球 Seed/海外批次。上述是冻结输入的范围校验，不等于 300 个目的地已全部完成外部实体解析。

## Seed Validation

300 unique destinations；S100 × 40 = 4000；A200 × 25 = 5000；quota = 9000。八个冻结日本区域、优先顺序和每目的地配额通过。

## Prefecture Coverage

prefecture_count = 47；missing_prefectures = 0。

从 [JNTO 官方目的地目录](https://www.japan.travel/en/destinations/)及其 47 个都道府县目录提取名称和 URL 元数据，不下载任何图片或文章正文。124 个目的地有单一县级目录匹配；176 个未匹配目的地不计入覆盖数量。

`prefecture_code` 明确采用 JNTO 英文 slug，不冒充 ISO 编号。集群的行政边界、跨县范围和精确中心仍待复核。全部 47 县逐项统计见 `prefecture-coverage.md`。官方目录是身份线索，不是照片授权。

## Batch Validation

40 JSON：JP-S-01..10、JP-A-01..30，顺序 1..40。每批 ≤10 destinations、≤420 variants。S 批次各 420；A 前20批各189、后10批各162。总 destinations300 / attractions9000 / source jobs9300 / variants9600。过期或海外 batch 文件会导致校验失败。

## Destination Manifest

300 行；三语字段、归属、实体类型、坐标、provider、source、md/lg、status、coverage note 和 provenance 均有结构。

仅复用父任务东京/京都/大阪的已有中日译名。未知名称、类型、坐标、Provider ID 留空或显式待解析，不复制英文伪装完成。所有目的地在生产前仍需正式实体验收。

## Attraction Manifest

9000 行全部为 `unresolved:{destination_id}:{selection_order}`。精确保留 S/A 八类别配额。status=entity_resolution_required、source_mode=acquisition_required、rights_status=unresolved。

父任务 125 个 acquisition requests 和符号 SVG 不是 POI Master，本任务没有将它们转成真实景点。未虚构名称、经纬度、Provider ID 或官网。

## Source Jobs

9300：destination_master300 + poi_photo9000。包含来源、真实性、rights、provider/model 空值、prompt version、审核状态、源尺寸和预期 variant 引用。

全部 execution_allowed=false，五项明确阻塞：实体、权利、Provider、预算、存储。公开网页不能自动授予商业使用/缓存/衍生权限。

## Variant Matrix

9600 expected_only：md300 / lg300 / sm9000。复用父尺寸 Profile：480/960/1600 最大边框、inside、no-upscale；物理路径与实际字节为空。没有新增 Hero/分享图/弹窗等特殊尺寸。

## Prompts

五种模式模板齐备：illustrative_city、documentary_photo、provider_only、symbolic_placeholder、acquisition_required。

城市氛围为 illustrative；真实 POI 获取和审核模板禁止 AI 冒充实拍。包含日本范围、无文字/Logo/水印、中心70%安全区域、2048×1365 城市源建议。Provider/model、生成时间和商业许可未选定，不伪造完成状态。

## Cost / Storage

- 本轮图片生成/下载：0；新增图片字节：0；未执行付费操作。
- Provider 未选定，金额为 unknown，不写虚构单价或 0 元采购成本。
- 按父 Profile maxBytes 计算的基础 variant 上限为 2,205,000,000 bytes（十进制，约2.205GB）；这不是实际产出，也不包含未知 master 存储。
- 后续批次须单独审批单价、重试、存储、egress 和 Provider 缓存权限。

## Reports

55 个确定性产物：6 catalog 输出、40 batch JSON、9 Markdown 报告。另有官方目录元数据快照、格式基线审计和重复运行证据。

包含 summary、batch index、validation、47县覆盖、未解析目的地/景点、重复实体、rights blocked、成本/体积报告。

技术 ID 重复为0；已核实 POI 为0，因此语义去重尚不能宣称完成。集群重叠继续待复核。

## Validation

| Command                    | Result                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| npm ci                     | PASS，362 packages；没有新增依赖                                                            |
| assets:core-manifest       | PASS，300/9000/9300/9600                                                                    |
| assets:core-batches        | PASS，40                                                                                    |
| assets:core-estimate       | PASS，未知价格明确标记                                                                      |
| assets:core-validate       | PASS，55 个产物逐文件比对                                                                   |
| test:core-generation       | PASS，23/23                                                                                 |
| assets:validate            | PASS，0 errors                                                                              |
| test:assets                | PASS，44/44                                                                                 |
| test:asset-variants        | PASS，51/51                                                                                 |
| lint                       | PASS                                                                                        |
| typecheck                  | PASS                                                                                        |
| format:check               | FAIL：28份未修改的 develop 文档格式债，新增失败0；详见 core-generation-format-baseline.json |
| build                      | PASS，21 个静态页面生成完成                                                                 |
| git diff --check           | PASS                                                                                        |
| 第二次 manifest + validate | PASS，55 文件 SHA 和 mtime 全不变，changed_files=0                                          |

`core-generation-repeat-verification.json` 保存逐文件哈希。变异测试覆盖海外伪装、重复 ID、错误批次/配额、缺县、虚构 POI、权利升级、损坏产物、禁止执行模式。没有声称整体 format:check 全绿。

## Files Changed

- `package.json`：五个 Node 任务脚本；lockfile 不变。
- `tools/assets/`：共享 manifest 构建/校验、四个命令入口、显式官方目录元数据刷新、no-op 验证、格式基线审计。
- `tests/task-013-2-core-generation-manifest.test.mjs`。
- `docs/assets/catalog/core-*`：Japan-only Seed/批次（保留既有任务分支版本）、目录证据、Manifest/Jobs/Variant/Policy/Prompt。
- `docs/assets/generated/core-*`、`core-batches/*`、覆盖/未解析/重复/权利报告。
- Task、Codex command、Japan-only design、Result 和 Master WBS。无业务 UI 改动。

## WBS Update

2.15 → 待审查（Partial；实体解析未完成）。2.13 / 2.14 保持已完成。没有覆盖其他 WBS 项目或提前执行后续 Task。

## First Executable Batch

首个可准备批次为 JP-S-01：`RUN_MODE=batch-prepare BATCH_ID=JP-S-01`。当前没有可执行图片批次；此模式只输出准备摘要，仍 execution_allowed=false。

不得运行 batch-execute；后续须先解析实体、取得权利、审批 Provider/预算/存储，并单独建立 child task。

## Commit(s)

集成最新验收基线：`2faed32`。实现和最终记录提交 SHA 见 Issue #152 与 Draft PR #187 的提交记录；Result 不伪造尚未产生的自引用 SHA。

## Draft PR

[#187](https://github.com/kanzakimy0/TravelAssist/pull/187)，`feature/a-core-destination-generation-manifest → develop`。复用已有 PR，保持 Draft，不自动合并；关联 #152 / #112 / #116。

## Follow-ups

1. 人工复核176个尚无官方县级匹配的目的地，并补齐300个目的地的中心、三语名称与精确范围。
2. 按40批解析9000个真实 POI，记录官方/批准 Provider 证据，跨目的地去重。
3. 单独审批图片权利、Provider、预算、存储，之后建立批次 child task。
4. 单独清理 develop 既有文档格式债。此次不修改无关文档。

本轮到 Draft 交付停止，未开始后续图片生产或其他 WBS。

## Known Limitations

Partial 是正式结论，不是 Completed：9000个景点是 unresolved 槽位；300个目的地尚未生产验收；124个县级目录匹配只是覆盖证据。无实际新图片、无图片使用权、无已批准 Provider/费用，暂不能执行生成批次。代码当前冻结清单，未来实体解析/权利放行必须经过显式审核更新。全仓格式检查仍有既有失败。
