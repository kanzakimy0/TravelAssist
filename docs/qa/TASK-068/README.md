# TASK-068 QA — 已批准候选恢复 v1

执行范围见 [已批准修订](../../tasks/AMENDMENT-TASK-068-candidate-recovery-v1.md)，完整结论见 [Result](../../tasks/RESULT-TASK-068-b-poi-partition-enrichment-transport-linkage.md)。正式编号不变；原始完整 occupied 库仍未认证。

- 10,369 条清单、52 批全部评估；26 个部分富集、322 个待编辑复核、9,859 个无匹配保留属性来源、162 个身份隔离。
- 43-key 形状完整，但只有 82 个已标注位，445,785 个仍为 null；1 个部分 Visit、33 个 Anchor、35 条接入、2 条候选邻接。
- 数据是编辑候选，非独立 Human Gold、正式编号主表或实时路线事实。

## 证据索引

| 文件                                                                | 含义                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| `gates.json` / `gates-tests.json` / `gates-build.json`              | 本阶段真实命令、退出码和日志 hash                              |
| `batch-manifest.json`                                               | 52 批清单/版本/校验和/覆盖及 1,037 项机器抽样                  |
| `batch-runtime-proof.json`                                          | 实际全量、resume、损坏检测/修复、rubric 失效、dry-run          |
| `candidate-audit.json`                                              | 独立读取磁盘验证 232 个 checksum、引用、隔离、未知值和凭据模式 |
| `retained-source-proof.json`                                        | 861 个缓存内容 hash 和已选事实定位，15 个混合尾部边界          |
| `feature-coverage.json` / `null-coverage.json`                      | 逐 code 已知/未知                                              |
| `source-coverage.json`                                              | 56 页编辑复核、26 页可挂接、24 页证据未挂接                    |
| `visit-profile-coverage.json` / `transport-anchor-coverage.json`    | 部分档案和静态交通边界                                         |
| `candidate-review-queue.jsonl`                                      | 10,369 条后续属性/身份待审项                                   |
| `review-queue.json` / `identity-review.json`                        | 保持不变的历史身份/编号问题与 63 组隔离                        |
| `identity-checkpoint-result.md` / `gates-identity-checkpoints.json` | 修订前历史阶段，仅作历史记录                                   |

## 重放

```sh
node tools/poi/combine-corpus.mjs --check
node --import ./tests/register-route-ts.mjs --test tests/task-068-candidate-enrichment.test.mjs
node --import ./tests/register-route-ts.mjs tools/poi/enrich-candidates.mjs --resume
node --import ./tests/register-route-ts.mjs tools/poi/enrich-candidates.mjs --check
node tools/poi/audit-candidate-recovery.mjs
```

缓存原文是本机已有输入，未整页提交。可用 `node tools/poi/verify-retained-evidence.mjs <cache-path>` 复核；无该缓存仍可从提交的有限事实重建候选 sidecar，但不得声称重新查阅了原文。

机器数据使用生成器规范的 LF/JSON/JSONL，而非对生成后数据再做格式化，否则 hash 会失效。手写代码、输入 rubric、说明文档运行 Prettier。单个 worktree 使用一个写入进程。

## 当前 gates

身份组合 19、新增恢复 12、Planning 21、soak 6、Registry 15、region 6、routing 28；full Node 2,666 全通过。npm ci、lint、typecheck、build、deployment local validation/build/artifact 和 deploy formatting 通过。部署命令只构建/审计本地产物，没有发布环境。

未执行本轮 DB/Auth runtime，未访问 Production/Staging；不将历史 QA 当成本轮 PASS。远端 Quality gate 必须按 Draft PR 最终 head 检查，最终外部回执见 PR checks / 交付信息。

发布：[Draft PR #395](https://github.com/kanzakimy0/TravelAssist/pull/395)，保持 Open/Draft。实现提交 `7e1f8fa84b489ec2f26ed68f0ae1075ad5900cab`；最终 head 的 Quality gate 以 PR checks / 交付回执为准。
