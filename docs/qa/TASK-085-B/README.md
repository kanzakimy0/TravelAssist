# TASK-085-B Gate 0 QA

**BLOCKED_084_DOWNSTREAM_GATE**。这是阻塞审计，不是 Full Generation PASS。

## Reproduce

在仓库根目录，使用 lockfile 固定依赖：

~~~sh
node --import ./tests/register-route-ts.mjs tools/transport/task-085-gate0.mjs --check
node --import ./tests/register-route-ts.mjs --test tests/task-085-b-gate0.test.mjs tests/task-082-a-poi-edge-graph.test.mjs tests/task-084-v2-amendment.test.mjs
~~~

--check 只读取并核验文件，不调用网络。--write 仅允许原始 base develop SHA 5b951195698d3e421f34a9922393b454412fa4bb，用于重建这次冻结的审计；它没有任何生成或授权路径。新的 upstream approval 会使该阻塞快照审计报错，要求重新执行 Gate 0，而不会自动开始下游生产。

## Evidence

- [Result](../../tasks/RESULT-TASK-085-b-poi-transport-node-access-edge-generation.md)列出精确阻塞字段、revision/hash、全部要求的 metrics、Provider 决定和恢复条件。
- [Machine manifest](../../../data/transport/access/manifest.json)记录两份 false downstream gate、被否决 v1、61 个检查过的 JSON 文件及 SHA-256、Canonical 身份核验和 supplemental sample hash 差异。
- 当前 runtime manifest 声明 100 个正式 POI；actual dataset / registry / admission-results hash 验证通过，sampleManifestSha256 与文件不一致。保留原始值，未修改上游事实。
- 四个生成 JSONL 均为零字节。batches/、batch-receipts/ 无 batch、receipt 或 checkpoint。
- 无 TransportNode 输入授权；accepted v2 节点 0。WBS 7.14 完成不会授予 downstream 使用权。

## Tests and limits

新测试验证：WBS 关闭和 v1 PASS 不打开 Gate；missing/string/null/true authorization 不可接受为当前 blocked snapshot；从实际 manifest 取得数量；无生成时 rates 和 route QA 为 null；确定性重建逐字节一致；审计输出损坏被识别；空生成文件和无伪造 receipt。

已执行 focused tests：**34/34 PASS**（085 7 + 082 15 + 084 12）。这些测试验证 Gate 0 停止行为，不能宣称 full generator、walking/barrier QA、batch resume、single-batch rerun 或 corrupted batch receipt detection 已实现。Edge deterministic rebuild = NOT_RUN_GATE_0_BLOCKED；preflight deterministic rebuild = PASS。

完整本地执行记录见 [local-validation.json](local-validation.json)。全量 Node regression 首次 **2,830/2,831**：唯一失败为 task-022-routing-boundary.test.mjs:53 的 files.length > 0，在并行 build 刚创建 .next/static、尚未写入 chunks 时触发；不是上游 baseline failure。build 完成后同一测试文件 **3/3 PASS**，不需代码修复。该调度失败原样记录；不把首次全量运行改写为 PASS。最终完整回归另由 exact-head CI 核验。

Lint：0 errors / 10 条既有 warnings（新文件 0）；typecheck、format:check:deploy、deploy:validate:local、deploy:build:local 均 PASS；standalone artifact 两次审计 PASS（1,908 files）。日志保留在忽略目录 .cache/qa/task085/，对应 SHA-256 存于 validation JSON。

Exact-head GitHub Quality Gate 使用最终分支 head 上的 workflow_dispatch；发布后在 Draft PR body 记录 run URL、head_sha 和 conclusion。仓库文档不预先虚报 CI 成功。PR 的合成 merge ref 检查单独区分。

## Integration / scope

复用 TASK-082 的 Canonical admission 和既有 directed/unresolved contract。没有新 Planner contract、runtime/API 行为修改、43D 复制、Provider batch 请求或 payload 持久化。没有把候选节点升为 ACCEPT；没有 TASK-086 工作。WBS 7.15 最终为 **阻塞**。

Publication: [Draft PR #464](https://github.com/kanzakimy0/TravelAssist/pull/464). The PR body is the publication receipt for the final branch SHA and exact-head Quality Gate URL/conclusion, recorded after the commit exists.
