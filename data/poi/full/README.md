# TASK-068 候选恢复数据

本目录按用户于 2026-09-18 批准的恢复方案加工，**正式编号不变**。详见 [已批准修订](../../../docs/tasks/AMENDMENT-TASK-068-candidate-recovery-v1.md)。

10,491 条原始观察组成 10,369 个固定候选组。candidateKey 是原来源键，不是 Master Code。175 个旧编号冲突和 2,979 个未知映射原样保留；历史 17,000 库完整性未认证，未知号位不能视为空闲。

## 目录

- `registry/`：无损候选 JSONL、UTF-8 BOM CSV、身份复核和旧编号声明。
- `sources/`：来源与身份决策；保留页面索引和有限事实摘要。未复制完整网页。
- `rubrics/`：单一版本的 43 维候选评分准则，复用既有 code/key/kind。
- `features/batch-*.jsonl`：每个候选均有 43-key 形状和明确结果；null 是未知。
- `visit-profiles/`：仅有数值依据的部分档案。没有默认时长或负荷比例。
- `transport-anchors/`：带地方范围的名称候选和静态接入边，尚非 Provider ID。
- `neighbors/`：共享接入点的有限候选边，不能证明可步行或当日可达。
- `manifests/`：固定清单 hash、每批结果与真实执行时间、输入 hash。

所有 sidecar 标为 CANDIDATE_ONLY。`featureSet`/`profile` 内层复用共享契约；外层是离线 QA 包装，不是产品 API。`status: active` 只表示该候选档案版本有效，不能绕过外层候选状态用于 runtime。

## TASK-070 后的当前 checkpoint

当前已完成 322 条 P0 编辑核查（200 + 122）：246 条获得支持评分、1 条无可支持属性、72 条证据不足、3 条身份冲突。全库已有评分 POI 272，非 null 字段 860，部分 Visit Profile 3，唯一 Anchor 213，静态接入 242。身份与正式编号不变。

当前重建和验收请使用 `tools/poi/review-p0.mjs --resume` / `--check` 及 `tools/poi/audit-p0.mjs`，均加 `node --import ./tests/register-route-ts.mjs` 前缀。详见 [TASK-070 QA](../../../docs/qa/TASK-070/README.md)。不要在当前 P0 sidecar 上执行下方历史生成器的写入命令。

## TASK-068 历史重建（仅限其接受版本）

在仓库根执行，使用仓库锁定的 Node/npm 版本；同一 worktree 同时只运行一个写入进程。

```sh
npm ci
node tools/poi/combine-corpus.mjs --check
node --import ./tests/register-route-ts.mjs tools/poi/enrich-candidates.mjs --dry-run
node --import ./tests/register-route-ts.mjs tools/poi/enrich-candidates.mjs --resume
node --import ./tests/register-route-ts.mjs tools/poi/enrich-candidates.mjs --check
```

每批最多 200，默认自动完成全部 52 批。`--batch batch-0001` 选择整批；`--from-id` / `--to-id` 接收 candidateKey，扩展至相交整批，先用 `--dry-run` 检查。受限运行不发布全量完成声明。输入、rubric、工具或共享契约变化会使 checkpoint 失效；输出损坏或不完整 receipt 会重建。receipt 在输出之后写入。

无网络重建只依赖提交的来源摘要。若本机保留原 JNTO 缓存，可额外用 `node tools/poi/verify-retained-evidence.mjs <cache-path>` 检查整份缓存 SHA 和字符定位；它不重新抓取网页、不验证当前营业情况。

## TASK-068 接受版本的覆盖与限制（历史）

全部清单已评估并获得明确状态；**评估完成不等于属性补齐**。82 个非空评分位来自 26 个候选，445,785 个评分位仍为 null。另有 322 个候选匹配缓存但尚无编辑评分，9,859 个没有匹配可用的保留属性来源，162 个身份候选隔离。所有人工独立验收均待进行。

1 个部分参观档案、33 个名称范围化交通点、35 条静态接入、2 条共享交通点邻接。完整时长/负荷档案为 0；没有实时票价、时刻、路况或当前交通可达性。

[完整 Result](../../../docs/tasks/RESULT-TASK-068-b-poi-partition-enrichment-transport-linkage.md) / [QA](../../../docs/qa/TASK-068/README.md) / [正式接入提案](../../../docs/architecture/poi-candidate-recovery-integration-proposal-v1.md)。

## 来源署名与使用限制

Geoshape 版本 2025-05-15，来源：

> 『日本歴史地名大系』施設・地点項目データセット（CODH作成） doi:10.20676/00000456

遵循 [CC BY 4.0 与原始数据说明](https://geoshape.ex.nii.ac.jp/nrct-poi/)。本数据选择旧工作流使用的 source IDs、调整字段并合并来源；没有导入其全部 32,038 行。历史地址和估算坐标未经当前导航验证。B 候选保留原研究来源链接；Wikidata 身份沿用 CC0 来源引用，未复制百科正文。JNTO 来源保留链接、hash 和有限事实释义，不转载完整文章，不将编辑评分表示为官方评分。

[候选 CSV](registry/combined-candidates.v1.csv) 可用 Excel 打开；旧编号列应按文本导入。CSV 防公式前缀转义，JSONL 保留原始观察文本。完整历史索引未恢复，9,000 个素材槽位不计作 POI。
