# TASK-071-A / WBS 9.10 — B 协助 Phase 0 审计

日期：2026-10-10（Asia/Tokyo）。结论：**BLOCKED_OWNER_AUTHORIZATION**。

Canonical Owner 仍为 A。本轮仅完成隔离只读审计，未进入 Phase 1/2。报告保存在隔离副本外，未提交到任何分支、未发布评论、未修改 WBS、RESULT 或 PR 描述。

## 1. 授权与事实来源

- 已完整读取 [Amendment](https://github.com/kanzakimy0/TravelAssist/blob/docs/task-071a-b-security-closeout-20261010/docs/tasks/AMENDMENT-TASK-071-A-wbs-9-10-b-security-closeout-2026-10-10.md)，文档分支 SHA `831b70f0a3a0cd00295d3345d67127be5e260f31`，文件 blob `e299d638e5b58092632eeaaa94c865b65a9b7df5`。
- 已读取 [Issue #404](https://github.com/kanzakimy0/TravelAssist/issues/404) 正文与全部两条评论、[PR #231](https://github.com/kanzakimy0/TravelAssist/pull/231) 正文及合并讨论时间线（评论、review、inline review）。
- [2026-10-10 发布评论](https://github.com/kanzakimy0/TravelAssist/issues/404#issuecomment-6093221961) 明确要求先取得 A 授权；任务发布本身不是授权。
- [旧 PR review](https://github.com/kanzakimy0/TravelAssist/pull/231#pullrequestreview-5267029724) 仅要求刷新扫描、复用分支；没有明确同意 B 代为修复和收尾。历史 allowlist 授权也不能替代本轮代办授权。
- 已读原分支 TASK-020-A、TASK-027-A 及三个历史 RESULT、TASK-071 QA README/receipts、原安全覆盖文档。原分支和 develop 均未发现 TASK-071-A 独立任务正文文件；使用 Issue #404 的 A 任务正文，不混用同编号的 TASK-071-B POI 任务。
- 已读仓库 AGENTS.md；参考主工作区已安装 Next 的 server-and-client-boundary、environment-variables 指南。未编写应用实现代码。
- 已读取最新 WBS 9.1 正式验收文档 `docs/qa/TASK-035/WBS-9.1-final-acceptance-closeout-2026-10-10.md`。旧 Phase 2 RESULT 的历史 BLOCKED 被保留为历史，不能据此把当前已完成的 9.1 回退。

授权缺口：需要 A 明确同意“B 在原 `codex/a-global-security-baseline` / PR #231 上代为正常整合最新 develop、修复兼容并执行收尾”。当前用户请求本身也将此设为前提，因此不推定已授权。

## 2. 隔离、SHA 与审计方法

主工作区 `C:/Users/Administrator/Documents/ChatGPT/TravelAssist` 为脏工作树：默认 porcelain 汇总 207 项；展开全部未跟踪路径时为 138,987 行。没有 stash、清理、覆盖、安装、构建或生成。两种计数口径不同，不代表本轮新增文件。

隔离副本：`C:/Users/Administrator/.codex/visualizations/2026/10/10/01a123e7-19b0-7150-b5c3-33f17ad4deb3/task071-phase0`。独立 Git 对象库，HEAD detached，稀疏检出 `.github docs tools src tests` 及根文件；partial clone 为 blob:none，非 shallow。审计前后 `git status --porcelain --untracked-files=all` 均为空。

| 项目                                   | 实测值                                            |
| -------------------------------------- | ------------------------------------------------- |
| PR #231 head                           | `fa3fe589759408172c647d932d8ce477d3ae20d4`        |
| execution-time develop                 | `cfd51e42f96e43f84f406c6aab5aab6e408b713e`        |
| merge-base                             | `a16ea611b8fb24cfe751615d54a3828f7ef564ca`        |
| 两侧独有提交数（PR / develop）         | 8 / 504                                           |
| PR 状态                                | Open / Draft / unmerged / mergeable=false / dirty |
| 安全分支 / develop / 假设合并树文件数  | 2,755 / 12,334 / 12,351                           |
| develop / 假设合并树顶层 Node 测试文件 | 154 / 155（不是 cases 数）                        |

结束前 `git ls-remote` 再次确认上述三条分支未变。GitHub PR API 快照的 `base.sha` 仍返回旧 `a16ea...`；本审计使用实际远端 `refs/heads/develop=cfd51...` 计算，未把 PR API 的旧 base 当成最新 develop。

只读冲突命令：

```text
git merge-tree --write-tree fa3fe589759408172c647d932d8ce477d3ae20d4 cfd51e42f96e43f84f406c6aab5aab6e408b713e
```

退出码 1（存在冲突），结果树 `6515acc01b547c2cb1351cb5fe55f230bb8fab25`。该树含冲突标记，不是成功集成树或提交；没有修改 index/worktree/分支。前一次使用 HEAD/origin 标签的结果树为 `6a90dacd...`，差异来自冲突标签文本；证据统一采用完整 SHA 参数的结果。

本轮只取指定三个分支及其可达提交，不声称取回全部远端 refs、全部历史 blobs 或 LFS payload。稀疏副本不能直接用于最终 tracked/history 全量验收；授权后须准备完整干净检出并记录实际 fetched refs 与 exclusions。

## 3. 实际文本冲突与最小解方案

仅 **2 个文件、各 1 个 hunk**。完整标记文本和 stage blob SHA 见 `phase0-evidence.json`、`merge-tree.txt`。

### package.json（假设树第 101–111 行）

```diff
AUDIT <<<<<<< fa3fe589759408172c647d932d8ce477d3ae20d4
    "security:scan": "node tools/security/scan.mjs tracked",
    "security:history": "node tools/security/scan.mjs history",
    "security:boundary": "node tools/security/boundary.mjs",
    "security:bundle": "node tools/security/scan.mjs bundle",
    "security:build": "node tools/security/build.mjs",
    "test:security": "node --test tests/task-020-security.test.mjs"
AUDIT =======
    "test:baseline:inventory": "node tools/qa/task-035-inventory.mjs",
    "test:baseline:lane": "node tools/qa/task-035-baseline.mjs"
AUDIT >>>>>>> cfd51e42f96e43f84f406c6aab5aab6e408b713e
```

授权后的最小方案：保留两组命令，正确补逗号；保留 develop 顶部 canonical `test: node tools/qa/task-035-baseline.mjs`、新依赖版本和其他命令。不引入第二测试入口或依赖回退。现有 `typecheck` 两侧均为 `next typegen && tsc --noEmit`，没有需要恢复的旧 API。

### docs/project/WBS-TravelAssist.md（假设树第 1192–1198 行）

```text
AUDIT <<<<<<< PR #231
9.10 A / 待审查（#404 / TASK-071-A；Draft PR #231）
9.11 A / 未开始
AUDIT ======= develop
9.10 A / 待审查（#404 / TASK-071-A；PR #231；既有安全门通过，需 latest-develop 合并后完整重扫）
9.11 A / 进行中（#405 / TASK-072-A；复用 PR #245，需 latest-develop Full Refresh）
AUDIT >>>>>>> develop
```

上段为去除表格列后的语义摘录，精确原 hunk 保存在 JSON。授权后仅调整 9.10：实施中注明 A Owner/B 获授权代办；完整验证后待审查；未人工验收及真实合并前不标完成。保留 develop 的 9.11 和已完成的 9.1，不采纳旧分支的 9.11 回退。

`.env.example`、`.gitignore` 自动合并，无文本冲突。Planner 路由、quality-gate.yml 也不在真实冲突清单中，不能把语义风险冒称 Git 冲突。

## 4. 语义兼容与 Owner 决策

### S1 — 9.1 reviewed inventory 将失配（已静态证明）

`tools/qa/task-035-inventory.mjs` 对每个顶层测试验证 reviewed hash，拒绝新增未审核项和 hash drift。PR 的安全测试成为第 155 个顶层文件，但 develop policy 没有它；两个现有文件的 candidate hash 也不同：

| 测试                              | develop/policy SHA-256                                             | 假设合并树 SHA-256                                                 |
| --------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| task-013-assets.test.mjs          | `c9ed0a5cfcc8dbeb330fbe6e8d284f35c68972f68f12164a255b0100cfe434cd` | `3739b7806aa2dbe099f2b42af9218e78f3779c976b14244fcb55dc55ceb4cf3f` |
| task-025-2-coral-palette.test.mjs | `e4de924e12f332370b24e8df33ac36ee1bd50b7aecdbdbc26f0116efb846c270` | `c49997d0bc740be3850310ca3b4fdd436d4dea39d9b0af95ef0ea5e9310bc218` |
| task-020-security.test.mjs        | 未登记                                                             | `a91775124c7722764e4b90f362d342fb7ab9e86dbe6b2a5b7148a4dbe19396ce` |

不能只执行 inventory `--write`：policy hash 校验先发生；execution-model 的 requiredUpdates 当前仅允许两个 TASK-035 测试。需要 A/Shared QA 认可的追加审核记录与兼容方案，保留原 policy/历史证据，重新生成完整 partition/inventory；不删除安全测试、不跳过 hash 校验、不改为仅安全测试通过。task-016 bundle helper 的内容也改变，应复核 indirect edge/独立 bundle scope。

### S2 — TASK-086 认证绑定会因 package.json 改变而过期

`tools/transport/task-086-final-closeout.mjs::currentBinding()` 将 package.json、quality-gate.yml 全字节加入 inputSha256。`task-086-validation-lanes.mjs::validationBinding()` 也绑定它们以及 checkout/run/attempt；`assertLaneBinding` 拒绝异源回执。现有 readmittable-closeout 测试会生成输出并与 tracked certification 比较，还明确拒绝 stale eligibility。

develop 的 package SHA-256 为 `cf33b865d403a142d09bd514ba507aef0a984807f25d477bbe6cb6b1261e85ec`。在内存中只保留两侧脚本、补逗号的可解析假设文本 hash 已改变（见 JSON）；该文本没有写入检出。这证明输入变化，不是已运行认证失败的测试回执，也不是最终格式化文件的预定 hash。

复用 R035-05 的既有模式：先逐输入/输出建立绑定证据，取得相应 Owner 授权后，用未修改的 `certify()` / `generateCloseout()` / `generateRepairReport()` 刷新必要派生回执，并验证业务投影、数据、权限、算法、人工裁决等价。历史九个派生 JSON 是参考，不预先认定本轮只需同样九个。禁止放宽绑定规则或借用旧许可作为本轮授权。

### S3 — Security CI 必须适配 canonical 全仓门

旧 security.yml 使用 Node 24、15 分钟总预算和直接 glob `node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs"`。最新 canonical npm test 使用 inventory、`--test-concurrency=1`、Node 事件/summary 回执、超时/非零退出检查；Quality Gate 配置 `.nvmrc`、Python 3.12、完整 TASK-086 graph/extraction/resume/proof/aggregate。

最小方案是保留安全扫描和 canary 门，接入当前 canonical inventory/npm test 与回执，不把旧 glob 视为 9.1 验收。先实测资源需求；不能自行延长或绕过预算来凑 PASS。

quality-gate.yml 的 push 分支过滤不包含本安全分支；普通 #231 pull_request 走 verify，完整专项链按特定分支或 `task086FinalCloseout` 启用。授权后必须明确安排 exact-head 及 PR merge-result 两种实际 checkout 的完整所需门、收据和聚合。仅手动 dispatch 分支得到 branch head 不能证明 merge-result；旧绿灯、Auto-merge workflow 或跳过的强制 job 均不计通过。必要的最小 CI 接线会进一步改变 S2 的绑定，需统一处理。

### S4 — Scanner、TS resolve、Planner、Canary 与新增范围

复用 `tools/security/{scan,rules,boundary,build}.mjs`，不新增 scanner。boundary 使用 TypeScript AST/tsconfig resolve，跟踪静态/动态/re-export import、client transitive graph、server-only、公有 env 名称；其 381 模块旧统计不能迁移到当前树。Planner 的 PR delta 只有 `import "server-only"`，保留它及 develop 的路由实现，不做业务修改。

当前新增范围包括 AI runtime/provider/config、个人中心 AI history client/server 路径、POI detail API/server repository、共享 POI contracts/data、recommendation/edge graph，以及 Quality Gate/release rehearsal/自动工作流。Auth/DB/API/部署入口须按当前整棵树重审。不能以构建成功代替传递 import 或 props/序列化审查。

现有 Canary wrapper 拒绝真实私有 env 文件，只透传受限宿主变量，生成五个随机 synthetic canary；编译输出仅返回指纹。保留该隔离和非零失败语义。新 Provider/env 是否需要额外 synthetic coverage，由实际读取路径决定，未实测前不报缺陷已修复或覆盖通过。

新增大量 data/docs/tests/generated artifacts：扫描范围从 2,755 到假设 12,351 tracked paths。必须记录 decoded bytes/binary/oversized/LFS/refs；保留现有 4 MiB tracked/history、16 MiB bundle 等界限，稀疏缺失文件应 fail incomplete，不能当作无发现。

### S5 — Allowlist

仅完成元数据盘点：102 条，2026-12-09 到期 42 条、12-10 到期 32 条、12-20 到期 28 条；按本地日期无到期项、无 wildcard path。没有修改或续期。此盘点不等于逐条值来源、fingerprint 命中及历史范围重新审查；Phase 2 才可完成真实重扫与逐条有效性判断。新增例外须明确审批，真实敏感内容不得进入 allowlist。

## 5. PR 全部 26 个 diff 文件复用决策

下表以 `git diff develop...PR-head` 为 PR 引入变更，覆盖全部 26 路径。类别表示授权后的计划，不表示已实施。

| 路径                                                                  | 决策                    | 理由                                                         |
| --------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------ |
| .env.example                                                          | REUSE                   | 保留空 observability 示例值及 develop 新变量；不读取私有 env |
| .github/workflows/security.yml                                        | MINIMAL_ADAPT           | canonical inventory/npm test、运行环境与证据链兼容           |
| .gitignore                                                            | REUSE                   | 保留私有 env/key/credential/cache 防护及 develop 新规则      |
| docs/project/WBS-TravelAssist.md                                      | MINIMAL_ADAPT           | 只准确更新 9.10；保留 9.1/9.11 等最新状态                    |
| docs/qa/TASK-071/README.md                                            | MINIMAL_ADAPT           | 保留旧快照，追加新范围/实际验证状态                          |
| docs/qa/TASK-071/allowlist-review.json                                | REUSE                   | 历史授权 28 条证据不改写；新审核独立记录                     |
| docs/qa/TASK-071/security-receipts.json                               | MINIMAL_ADAPT           | 保留历史，生成绑定新 SHA 的证据                              |
| docs/security/secret-scan-report.md                                   | MINIMAL_ADAPT           | 旧统计保留历史，追加实际新扫描                               |
| docs/security/secret-scanning-baseline.md                             | MINIMAL_ADAPT           | 更新 canonical 命令、覆盖范围和当前统计                      |
| docs/tasks/RESULT-TASK-020-a-global-security-baseline.md              | REUSE                   | 原阶段事实                                                   |
| docs/tasks/RESULT-TASK-027-a-security-baseline-acceptance-closeout.md | REUSE                   | 原阶段事实                                                   |
| docs/tasks/RESULT-TASK-071-a-security-final-closeout.md               | MINIMAL_ADAPT           | 保留历史并追加本次真实结论，不覆盖旧记录                     |
| docs/tasks/TASK-020-a-global-security-baseline.md                     | REUSE                   | 原任务与边界                                                 |
| docs/tasks/TASK-027-a-security-baseline-acceptance-closeout.md        | REUSE                   | 原收尾约束                                                   |
| package.json                                                          | MINIMAL_ADAPT           | 两组 scripts 合并，触发 S2 Owner 决策                        |
| src/app/(main)/planner/page.tsx                                       | REUSE                   | 保留 server-only 标记，不改路由行为                          |
| tests/task-013-assets.test.mjs                                        | REQUIRED_OWNER_DECISION | 保留必要回归，但必须处理 9.1 reviewed hash                   |
| tests/task-016-client-bundle.mjs                                      | REUSE                   | 断言不输出整块 browser source；重核 indirect/bundle QA       |
| tests/task-020-security.test.mjs                                      | REQUIRED_OWNER_DECISION | 31 项旧安全回归保留，登记第 155 个顶层文件                   |
| tests/task-025-2-coral-palette.test.mjs                               | REQUIRED_OWNER_DECISION | resolver 兼容需重验，不能直接越过 reviewed hash              |
| tools/assets/validate-asset-library.mjs                               | REUSE                   | 同一路径去重修复与对应回归成对保留；不扩大资产域改动         |
| tools/security/allowlist.json                                         | REQUIRED_OWNER_DECISION | 原精确规则复用；新例外或扩大范围不自动授权                   |
| tools/security/boundary.mjs                                           | REUSE                   | 先重跑当前图，只有真实结构差异才最小适配                     |
| tools/security/build.mjs                                              | REUSE                   | synthetic-only 生产构建及日志隔离                            |
| tools/security/rules.mjs                                              | REUSE                   | 保留全部检测和 false-negative fixtures，适配需证据           |
| tools/security/scan.mjs                                               | REUSE                   | 保留 tracked/history/bundle 及 fail-closed limits            |

额外 REQUIRED_OWNER_DECISION：TASK-035 审核补充与 TASK-086 派生认证刷新；跨 Owner 范围若未授权就停止。DEFER/OUT_OF_SCOPE：9.9、9.11 实现、AI/POI/Transport/Planner 业务改造、DB migration、真实 Provider/secret validity/rotation/revoke、生产部署、Browser E2E/真库运行。

## 6. 后续门与停止状态

**未执行且未宣称 PASS**：npm ci、安全聚焦测试、tracked/history/boundary 扫描、canary production build/bundle、inventory command、npm test、lint/typecheck、deployment gates、Quality Gate/Security CI。本文是只读结构/哈希审计，不是安全验收；无扫描结果则 unresolved/secret/canary 数量是 NOT_RUN，不能记为零。

授权后仍按 Amendment 完整执行：普通 merge 最新 develop → 逐文件兼容和审核绑定 → 所有本地规定门 → branch exact-head 与 PR merge-result 的实际 CI/checkout/run/attempt/aggregate → RESULT/QA/WBS 9.10/原 Issue 与 PR 审查回执。若 develop 再移动，重新固定 SHA 和审计。原 #231 始终是唯一 implementation PR；保持 Draft/Open、不自动合并。

本轮保存的证据：`phase0-evidence.json`、`merge-tree.txt`、`pr231-final-snapshot.json`、`issue404-comments.jsonl`、`pr231-reviews.jsonl`。审计辅助程序位于报告目录外 `task071-audit-proof.mjs`，仅用于读取对象和生成本轮证据，不加入项目实现。

**停止原因：未取得 A 明确授权。最终状态 BLOCKED_OWNER_AUTHORIZATION。**

发布注：展示用冲突标记增加 AUDIT 前缀，避免 git diff --check 将审计样例误判为未解决冲突；精确 hunk 保存在 phase0-evidence.json。
