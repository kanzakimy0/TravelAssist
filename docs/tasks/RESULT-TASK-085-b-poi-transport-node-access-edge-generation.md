# RESULT — TASK-085-B POI → TransportNode Access Edge Full Generation

**BLOCKED_084_DOWNSTREAM_GATE** — 2026-09-30。Gate 0 已执行；接入边生成未启动。WBS 7.15 = **阻塞**。

## 基线和执行边界

- Repository: kanzakimy0/TravelAssist；Issue [#442 execution gate](https://github.com/kanzakimy0/TravelAssist/issues/442#issuecomment-5905235799)。
- 最新 origin/develop 基线：5b951195698d3e421f34a9922393b454412fa4bb。
- 独立干净 worktree 从该 SHA 创建；实现分支：feature/b-poi-transport-node-access-edges。
- 原始 Task 来自 Draft PR [#449](https://github.com/kanzakimy0/TravelAssist/pull/449)，branch docs/poi-transport-parallel-execution，head 7073c2a5501e9f7e74361fb0bdc6219a99504f87。执行以 2026-09-30 gate 为准。
- [机器审计 manifest](../../data/transport/access/manifest.json)包含 61 个 TransportNode/084 QA JSON 的路径、SHA-256 与授权字段；未发现明确授权给 TASK-085 的新机器输入。
- 本次只交付阻塞审计、空生成文件、测试和文档。没有接入边、候选节点排名、Provider 请求、batch receipt、runtime import 或 TASK-086 执行。

## Gate 0 的具体阻塞证据

| 文件 | 字段 | 当前值 |
| --- | --- | --- |
| data/transport/nodes/task-084-b-v2-amendment-review/manifest.json | downstream085Authorized | false |
| 同上 | runtimeImportAuthorized | false |
| 同上 | nationalMasterStatus | REWORK_IN_PROGRESS |
| 同上 | nationalMasterPass | false |
| 同上 | formalAcceptedV2NodeCount | 0 |
| 同上 | stage | V2_AMENDMENT_15_18_REVIEW |
| docs/qa/TASK-084-B/v2-user-acceptance-closeout.json | dataGateSnapshot.downstream085Authorized | false |
| 同上 | dataGateSnapshot.runtimeImportAuthorized | false |
| 同上 | dataGateSnapshot.nationalMasterPass | false |
| 同上 | dataGateSnapshot.nationalMasterStatus | REWORK_IN_PROGRESS |
| 同上 | dataGateSnapshot.formalAcceptedV2NodeCount | 0 |

[084 用户验收收口](RESULT-TASK-084-b-v2-user-acceptance-closeout.md)明确区分“接受当前纠错成果物 / WBS 7.14 关闭”与“逐组件正式接收 / 下游机器授权”。前者不能覆盖后者。

当前 v2 review manifest 的 revision 为 a25ebb928bb1fc8017d8d9e5c050d717ff5b118b（084 accepted deliverable head），SHA-256 为 b4ad2259b986ab34b7326c15fe5f0d80f4f5a08160c012cdb787c0ede1fb375a，与 closeout.acceptedReviewManifestSha256 一致。Closeout 文件 SHA-256 为 2f18099d0dfc53d1eaa1cbc12b5fe709368eaf3ec0c2ed10da7cae33b06b671b。

**正式 downstream TransportNode artifact / revision / hash 均为 null；获准输入节点数 = 0。** Review 文件是阻塞证据，不是已接收的 TransportNode 输入。

data/transport/nodes/task-084-b-national-master/manifest.json 仍保留历史 acceptedCount=244、nationalMasterStatus=PASS；其 SHA-256 为 8f6926e8528140dd070610c2dedb0ffef3e284828252318a3dee79b752ddd8ac。这是被撤销的 v1 历史快照，按[返工修正](AMENDMENT-TASK-084-b-transport-master-quality-rework.md)及[V1 否决审计](../qa/TASK-084-B/TRANSPORT-MASTER-V1-REJECTION-AUDIT.md)禁止使用。未将 v2 candidate、REVIEW 或 unresolved 记录改为 ACCEPT。

## Canonical POI 来源和补充完整性发现

正式 runtime manifest：src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json，SHA-256 11fd42f2ded8cc45519767ba86b97bcb1123552550c7f6af6ee60af7436cdbf0。

- runtimeImportAuthorized=true；candidateCorpusAuthorized=false。
- datasetPath：src/shared/data/canonical-poi-pilot100.v1.json。
- datasetRevision：task-083-a-pilot100-v1。
- datasetSha256（JSON 内容）：802785ddb24e720698c2813f1f9dce29fe6792cdf02dbd01e9557b385a88bda2。
- datasetFileSha256（原文件字节）：611c6e33324a35e70f1a0afbdbf86fa87ac356d53068d9e4ae95c4c12fea0ee4。
- 当前 manifest 读出的授权数量为 **100**。审计代码不硬编码数量；校验实际记录、membership、active Master Code、数据集/Registry 文件及内容 hash、admission-results hash；复用 TASK-082 admittedGraphNodes。
- **补充证据存在基线 hash 差异**：sampleManifestPath 指向 data/poi/canonical/pilot-100/sample-manifest.v1.json；manifest 声明 sampleManifestSha256=77e239e0b5092f38e85f1d4e7035cf2ece2956128b5c01dbabdffc11b08d2c82，实际字节 SHA-256=6d6187e53f6235abc757795896b8ba441736ce078e1e5b3e0c70df14c4709d51。数据集和 Registry 的正式核心校验通过，但不能宣称全部关联 provenance 校验通过；恢复生成前须由上游解释/修复该差异。TASK-085 未修改授权记录或 sample。
- 未导入 candidate corpus、enrichment workbook 或外部 POI，也未为填补 shortfall 扩大集合。

## Full-run metrics（本次停于 Gate 0）

null 表示未运行/未评估，绝不解释为 0% 或通过。processed count 只计接入边生产，不包含 manifest 审计。

| 指标 | 结果 |
| --- | --- |
| Canonical POI runtime-authorized count | 100（从 manifest 读取） |
| Canonical POI processed count | 0 |
| shortfall | 100，当前授权集合 − 实际处理数；不沿用 082 的 500 目标 |
| POIs with >=1 access node | null |
| local node coverage / major hub coverage / special tourism access coverage | null / null / null |
| total directed edges | 0 |
| mean / median / min / max edges per POI | null / null / null / null |
| walking / local transit / taxi resolved rate | null / null / null |
| accessibility known rate | null |
| extreme detour count | null，walking/barrier QA 未执行 |
| unresolved POI count / unresolved reason distribution | null / {}，没有逐 POI access assessment |
| gate-blocked POI count / reason distribution | 100 / BLOCKED_084_DOWNSTREAM_GATE: 100 |
| batch count / batch receipts | 0 / 0 |
| source/provenance coverage of generated edges | null，没有 Edge |
| deterministic preflight evidence rebuild | PASS，逐字节比对且检测审计文件损坏 |
| deterministic Edge rebuild / batch resume / single-batch rerun / corrupted batch receipt detection | NOT_RUN_GATE_0_BLOCKED |

未将未开始的 POI 写成 NO_CONFIRMED_ACCESS：该结果需要实际完成候选/接入评估。本次四个 JSONL 输出均为空；batches/ 与 batch-receipts/ 只有说明，没有伪造批次、checkpoint 或 QA PASS。

## Provider / license decision

**FAIL_CLOSED_NO_BATCH_OR_PERSISTENCE_AUTHORIZATION**。最新[供应商策略](../architecture/map-routing-poi-ai-provider-policy-v1.md)（2026-09-24）优先于早期 provider selection 和 082 Result 的供应商描述：Google Routes 是默认主 Provider，但第 5 节未授予永久保存路线距离、时间、geometry 或派生 TravelEdge Prior 的权利。批量查询、cache、retention、production batch 和 derivative persistence 权限未获得本任务明确授权，机器字段均为 null/unconfirmed。

Ekiworld 仅可按既有评估边界使用；[配置记录](../architecture/ekiworld-evaluation-routing.md)及 src/server/routing/types.ts 保持 persistence=none、ttlSeconds=null，环境开关本身不是合同证明。N03/GSI rights decision 仍为 APPROVAL_REQUIRED、formalGsiConfirmationOnFile=false、productionJoinAllowed=false。

本次 Provider 请求 **0**，raw Provider payload 保存 **0**，N03 join **0**。合法静态 topology/geodesic candidate generation 原则上可用，但 TransportNode Gate 0 阻塞，因此也未运行。没有用直线距离补成 walking distance、duration 或 detour ratio。

## TASK-082 / Route integration boundary

已读取 TASK-082 Task、当前实现、Result、QA 和 Route Schema。共享 graph contract 位于 src/shared/poi-edge-graph/index.ts：GraphRef.kind=poi|transport、两个独立 access layer、directed=true、ModeResolutionV1.metrics=null 的 unresolved 语义均保持原样。

本次复用 admittedGraphNodes 做 Canonical 核验，没有引入第二套 Planner contract，没有修改 Route Runtime/API/Planner public behavior，也没有复制 POI 43 维到 Edge。TASK-084 多模式节点转换至 TASK-082 TransportNodeV1 的 additive adapter **未实现/未运行**，须待授权数据存在后再确认；084 kind 与 082 三种 kind 不可强制无损映射。

## Validation and publication

- Focused tests：34/34 PASS（TASK-085 新增 7、TASK-082 15、TASK-084 amendment 12）。
- Full regression / lint / typecheck / build：见 [QA](../qa/TASK-085-B/README.md) 的最终执行记录。
- Exact-head Quality Gate：最终 commit 的 GitHub workflow_dispatch run 将记录在 Draft PR 的 publication receipt（PR body），以 run.head_sha 等于 final branch head 为准；不得把旧 head、PR merge ref 或本地测试当作 exact-head PASS。
- Draft PR only；不 merge，不开 auto-merge。最终 WBS 7.15 = **阻塞**，7.14 的用户验收收口不变，7.16 未开始。

## 恢复条件

上游须在新的 develop 发布明确供 TASK-085 使用的 machine-readable TransportNode artifact，包含 accepted membership、稳定 identity、revision/hash、provenance 和显式 downstream085Authorized 证据；不得恢复被否决 v1 或由本任务擅自提升 candidate。重新读取 Issue #442 最新 comments、当时 Canonical runtime manifest，并处理 sample-manifest hash 差异。之后重新执行 Gate 0 和完整原任务，而不是把本次审计工具当生成器。本次停止 TASK-085，不执行 TASK-086-B。
