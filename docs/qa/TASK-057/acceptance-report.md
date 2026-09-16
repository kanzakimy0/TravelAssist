# TASK-057-B 独立验收报告

Recommendation: **ACCEPT**

## 审查对象和有效期

- A implementation：[TASK-045-A / PR #352](https://github.com/kanzakimy0/TravelAssist/pull/352)，Issue #349，仍为 Open / Draft。
- 实际重新获取的 head：`fb6f2e44d6207a241a84410bc2fd588fcc378c18`；本次与 publication head 相同，但结论来自重新获取，不来自该假设。
- 最新 develop：`d23dedef1b6ecf9133fb544451d8b6789482213e`。Merge-base：`166f996eab3d75fb5afabc4ad7cb9f3d265c54c1`；A ahead 3 / behind 24。
- B branch：`codex/b-wbs-4-48-independent-acceptance-review`，由上述最新干净 develop 创建。WBS 4.48 Owner 始终是 **A**，B 仅 Independent Review / QA Support。
- 最终化前检查时间：`2026-09-13T05:27:58.938Z`。完整 changed-file list 仍为 13 个文件，SHA-256：`dc4c98e44f8be17c0055c2a8d181bd52342ff0643387883832dc39b4c1da94ed`（排序路径，以 LF 分隔并以 LF 结尾）。

本结论只接受这里的精确 A head 及已测 develop 组合，不是合并授权。A 一旦再 push，新 head 立即使本结论失效；必须更新保护清单、重新运行至少全部 focused acceptance gates、独立计算及相应兼容性/CI，才能重新给出 ACCEPT。

## 独立验证方法

[verify-candidate.mjs](verify-candidate.mjs) 从 Git merge-base 读取三个原始图文件，直接导入候选生产 generator 的 runtime graph，并从原始 `src/shared/data/master-code-registry.v1.json` 自行建立 code/entity/lifecycle 对应关系。不读取 A 的 TASK-045 JSON 来决定结果，不使用 A 的 topology hash 常量，也不调用 A 的集成判定或 registry resolver 来计算验收数字。

比较会递归排序对象键、保留数组顺序，仅去掉 node.masterCode。除逐项比较完整节点、Relation、Edge、Variant 外，还独立建立有向邻接表、BFS 重算全部 2,500 对节点可达性和五条历史必需路径。使用原始 registry 的 entityType/entityRef/active 唯一匹配以及 provenance/sourceRefs 排除行政、destination、transport、POI、DB 和旧 JP-* 代用品。Registry 文件在 base、develop、A head 的 Git blob 完全一致。

生产 runtime graph 与已发布图数据逐字段一致。完整规划先验、variant 的时间字段、证据来源政策、corridor definitions 都保持原样；src 下的 Planning/Prior/Fact/Provider 实现和合同无变化。11 组独立负向控制分别注入 null、legacy、unknown、cross-entity/duplicate、deprecated、superseded、Region ID、Relation、Edge prior、Variant 和必需走廊边缺失，全部被 B 的计算器拒绝。每个工作区均重新执行一次。

## 独立重算结果（精确候选及当前 develop 集成结果相同）

| 指标                                                           |      结果 |
| -------------------------------------------------------------- | --------: |
| Region nodes                                                   |        50 |
| regionId preserved，含顺序                                     |     50/50 |
| canonical Master Code populated                                |     50/50 |
| production masterCode null                                     |         0 |
| active canonical registry resolution                           |     50/50 |
| duplicate / unknown allocations                                |     0 / 0 |
| deprecated-invalid / superseded-invalid                        |     0 / 0 |
| 其他 lifecycle-invalid / entity mismatch                       |     0 / 0 |
| legacy / destination / admin / transport / POI / DB substitute |         0 |
| 非 Master Code 节点语义差异                                    |         0 |
| RegionRelation semantic diff（53 条）                          |         0 |
| TravelEdge semantic diff（58 条）                              |         0 |
| TravelEdgeVariant semantic diff（90 个）                       |         0 |
| 2,500 对节点可达性差异                                         |         0 |
| 五条走廊可达且所需每条边仍存在                                 |       5/5 |
| Planning Prior / Live Route Fact boundary                      | unchanged |
| unrelated scope changes                                        |         0 |

B 独立 canonical serialization 的 topology SHA-256，before = after：`8f78281330be519c7fe5cf3e6338608f2314a129f2852fdea160600612ec50df`。可达性矩阵 SHA-256，before = after：`8caaf16d7862b2a2f311b00332f9ea9b3cbd33bd0884190cda0c8b801fd674b4`。B 采用不同序列化算法，数值不要求等于 A 的 hash；各自 before/after 完全一致并且 deep comparison 相等才通过。

## 最新 develop 兼容性

分别建立精确 A head 和本地临时集成的 detached worktree。临时合并 `3c5dbb553715d6839838e0f49528d67c756c85c3` 的两个 parent 是 A head 和 `d23dedef1b6ecf9133fb544451d8b6789482213e`，冲突 0。WBS/package 的 Git 自动合并保留双方变更，未手工修复 A 文件。临时合并只存在本地，未 push 到 A 分支，也未进入 B 文档分支。两个工作区分别 npm ci、完整 focused/full regression、lint、typecheck、build 以及部署制品验证，全部通过。

## Mandatory QA

| Gate / canonical npm alias            | 精确 A candidate                      | A + 最新 develop                      |
| ------------------------------------- | ------------------------------------- | ------------------------------------- |
| `npm ci`                              | PASS；395 packages；0 vulnerabilities | PASS；395 packages；0 vulnerabilities |
| `test:region-graph-pilot`             | 17/17；skip 0                         | 17/17；skip 0                         |
| `test:region-master-code-integration` | 6/6；skip 0                           | 6/6；skip 0                           |
| `qa:region-graph-pilot`               | PASS (exit 0)                         | PASS (exit 0)                         |
| `qa:region-master-code-integration`   | PASS (exit 0)                         | PASS (exit 0)                         |
| `test:master-code-registry`           | 15/15；skip 0                         | 15/15；skip 0                         |
| `qa:master-code-registry`             | PASS (exit 0)                         | PASS (exit 0)                         |
| `test:planning-contracts`             | 21/21；skip 0                         | 21/21；skip 0                         |
| `test:planning-soak`                  | 6/6；skip 0                           | 6/6；skip 0                           |
| `qa:planning-soak`                    | PASS (exit 0)                         | PASS (exit 0)                         |
| `test:routing`                        | 28/28；skip 0                         | 28/28；skip 0                         |
| `trip-engine-regression`              | 839/839；skip 0                       | 839/839；skip 0                       |
| `full-repository`                     | 2482/2482；skip 0                     | 2499/2499；skip 0                     |
| `lint`                                | PASS (exit 0)                         | PASS (exit 0)                         |
| `typecheck`                           | PASS (exit 0)                         | PASS (exit 0)                         |
| `build`                               | PASS (exit 0)                         | PASS (exit 0)                         |
| `deploy:validate:local`               | PASS (exit 0)                         | PASS (exit 0)                         |
| `deploy:build:local`                  | PASS (exit 0)                         | PASS (exit 0)                         |
| `deploy:verify-artifact`              | PASS (exit 0)                         | PASS (exit 0)                         |
| B independent recomputation           | PASS；11 negative controls rejected   | PASS；11 negative controls rejected   |
| 提交范围 `git diff --check`           | PASS                                  | PASS                                  |

Planning Soak 每组真实运行 4,000 cases，并内部重复以核对确定性；unexpected accept/throw/unsafe issue 均 0，9 个 scale checks 通过。两组 sequence digest 一致：`df528cbfbd5b96c61f098d4afdb9b1069d4f98d4f62fda552293e43924f294ae`。两份 standalone artifact 均验证 1,871 个文件，无 failure，并分别记录各自候选/临时 merge SHA。

Trip / Engine 的 839 项使用既有 4.17/4.21、Trip persistence/library、Preference read contract、browser-save domain、trip-preparation 测试；完整文件命令记录在 [acceptance-evidence.json](acceptance-evidence.json)。只回归已有行为，没有实现 Engine 4.22–4.24。测试计数互有重叠，不能相加当作独立覆盖率。

两个干净 worktree 的 `npm run lint` 均 exit 0，没有使用主工作区旧缓存的 lint 债务例外。Node 的 MODULE_TYPELESS_PACKAGE_JSON 性能提示和 npm allow-scripts 提示未影响执行；没有为了消除提示修改 A 的 package.json。B 自有脚本另行通过 scoped ESLint；全部 TASK-057 文件在交付前执行 scoped Prettier 与 diff 检查。

## 保护 A 文件及执行可复现性

A 的生成测试会写回 TASK-041/045 的受保护证据，故 canonical 命令保持原样，并通过 [preserve-review-inputs.mjs](preserve-review-inputs.mjs) 设置 NODE_OPTIONS preload。写入前必须证明新生成内容与现有文件一致（仅正规化 checkout CRLF）；一致时验证但不落盘，不一致时立即失败。没有让输出漂移通过，没有 patch A 的源码或测试。两工作区 13 个保护文件的原始字节 hash 均 before = after，实际保护路径写入 0；候选验证 40 次、集成验证 40 次。A 自身 GitHub CI 同时提供正常未加保护的原始写入路径通过证据。

Soak 在 disposable worktree 生成的三个 TASK-037 诊断文件另存 ignored B 日志后恢复到原 review HEAD；没有提交或保留 A 文件修改。两个 review worktree 最终 clean，未启动任务服务或 Production/Staging。原始日志、性能观测和临时工作区只用于本地复核；可提交证据仅 TASK-057 路径。

复现独立重算：在精确 review checkout 完成 npm ci 后执行（output 置于非保护路径）：

```sh
node --import ./tests/register-route-ts.mjs <B-repo>/docs/qa/TASK-057/verify-candidate.mjs 166f996eab3d75fb5afabc4ad7cb9f3d265c54c1 d23dedef1b6ecf9133fb544451d8b6789482213e <output.json>
```

复现 canonical matrix：使用 evidence 中每个 snapshot.commands 的 command；先把 protectedChangedFiles.files[].path 导出为 JSON 数组，设置 TASK057_PROTECTED_LIST 指向它、TASK057_REVIEW_ROOT 为 checkout 绝对路径、NODE_OPTIONS 为 `--import=<preserve-review-inputs.mjs 的 file URL>`。TASK057_GUARD_LOG 可指向非保护目录的 JSONL 文件。先执行 npm ci，再启用只读输出保护。两个 checkout 的命令各自串行，避免生成证据互相覆盖。

## Exact-head GitHub gate

[Quality Gate run 34728276406](https://github.com/kanzakimy0/TravelAssist/actions/runs/34728276406)：SUCCESS，event = pull_request，check-run headSha = `fb6f2e44d6207a241a84410bc2fd588fcc378c18`。仓库 workflow 使用 pull_request 事件 merge revision；这个较早的 CI 结果不被误当成最新 develop 的集成验证，后者由本次独立临时合并和完整 QA 补齐。A 的 Result 中旧 CI 简写不是本审查的 CI 来源，本次直接读取最新 head 的 GitHub checks。

## Scope audit / protected changed-file list

- `docs/project/WBS-TravelAssist.md`
- `docs/qa/TASK-041/graph-validation.json`
- `docs/qa/TASK-041/master-code-audit.json`
- `docs/qa/TASK-041/pilot-report.md`
- `docs/qa/TASK-041/region-nodes.json`
- `docs/qa/TASK-045/region-master-code-integration-report.md`
- `docs/qa/TASK-045/region-master-code-integration.json`
- `docs/tasks/RESULT-TASK-045-a-task-041-region-master-code-integration.md`
- `package.json`
- `tests/task-041-region-graph-pilot.test.mjs`
- `tests/task-045-region-master-code-integration.test.mjs`
- `tools/qa/region-graph-pilot.mjs`
- `tools/qa/region-master-code-integration.mjs`

上述 13 个变化均属于既有 50-node 图的 canonical code population、校验/证据、两个 QA aliases 和 A 的 tracking；无 Region taxonomy 替换、registry 改配号、Planner UI、Provider、DB migration、AI、Candidate Pipeline、POI scoring 或 Engine 新工作。Registry 的 governanceStatus 仍保留其已合并来源的 candidate 标签，本验收不擅自修改治理状态。

## 结论与停止条件

Recommendation: **ACCEPT**。Required corrections：**无**。B 不合并 PR #352、不关闭 Issue #349、不修改 4.48 Owner、不标记 4.48 完成、不执行取消的 TASK-056-B，也不启动任何下游任务。Issue #359 只追踪独立 review，保留用户验收流程。
