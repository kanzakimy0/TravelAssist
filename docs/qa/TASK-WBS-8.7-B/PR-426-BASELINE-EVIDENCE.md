# PR #426 / WBS 8.7 Phase 1 — Baseline Evidence

状态：**CONTRACT_REVIEW_REQUIRED / WBS_8_7_BLOCKED**。日期：2026-10-08 JST。测试是已合并 develop 的基线健康证据，不是 #426 集成、持久化或 Phase 2 验收。

## 环境与来源

- 新建 managed worktree：`C:\Users\Administrator\.codex\worktrees\wbs-8-7-phase1\TravelAssist`。
- 创建时 `git status --short` 输出空；`git branch --show-current` 输出空（detached）；`git rev-parse HEAD` = `8f60c8b94d3f5148abeb414d0d8e209e5d736cea`。
- `git fetch origin --prune` 后 origin/develop 未变化；新建 `codex/b-wbs-8-7-phase1-contract-review`。建立前未发现同名本地/远端活动分支。
- U `origin/codex/a-ai-conversation-orchestrator` = `97a53d5f1fc1fdb5c2c445103fc4c0173be9aca1`；merge-base = `f08daa9f8aa9b459fbd294f08e4bd29e16624647`。
- 原 TASK-075 工作文件与旧 WBS 目录未改；旧 WBS 目录的两份本任务未跟踪日志保留原处，本阶段重新运行测试，不搬移旧证据。
- 本工作树的 Git 对象库由 managed worktree 共享；fetch/prune 只维护 remote-tracking metadata，不改任何原工作树文件、A 本地分支或 A 远端分支。不作 stash/reset/clean/rebase/force-push。
- `npm ci --no-audit --no-fund` 成功：396 packages；[原始日志](npm-ci.log)。存在依赖弃用及 allow-scripts 警告，未改变 lockfile 或执行全局 approve-scripts。

## 实际基线结果

两次测试运行时 HEAD 都是 exact D `8f60c8b94d3f5148abeb414d0d8e209e5d736cea`；其 tree = `8b0e2631bf365acff68551e8bfd28df3014c4443`，未改 src/tests/package。起止 UTC、exit code、测试计数、log SHA-256 见 [phase1-evidence.json](phase1-evidence.json)。JSON 的时间使用 UTC，报告日期用 JST。

| 命令                                                                                                                                  | PASS / FAIL / SKIP | 状态 | 原始输出                                  |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---- | ----------------------------------------- |
| `node --conditions=react-server --import ./tests/register-route-ts.mjs --test --test-reporter=tap tests/task-076-ai-runtime.test.mjs` | 14 / 0 / 0         | PASS | [AI Runtime TAP](baseline-ai-runtime.log) |
| `node --import ./tests/register-route-ts.mjs --test --test-reporter=tap tests/task-082-personal-ai-history.test.mjs`                  | 8 / 0 / 0          | PASS | [6.14 TAP](baseline-personal-history.log) |

第一条与 package 的 `test:ai-runtime` 相同执行入口，只显式选择 TAP reporter。现有 loader 会 stub server-only；这些单元/边界测试不证明真实网络 Auth、浏览器 bundle 或数据库 RLS。测试内的 provider 是 fixture，未访问真实模型。Node 的 MODULE_TYPELESS_PACKAGE_JSON warning 如实保留。

可重现：在此 baseline+锁定依赖上运行 `node docs/qa/TASK-WBS-8.7-B/collect-phase1-evidence.mjs`。它读取固定 D/U/M Git 对象，运行 merge-tree、内存 reducer 探针和两组基线测试，并更新本 QA 目录证据；不会合并工作树或写数据库。重跑后的执行 HEAD/时间自然不同，须保留实际事实，不伪装首次执行。

## 冲突与探针

- merge-tree exit 1 = 真实冲突；唯一路径为 WBS。详见 [矩阵](PR-426-REUSE-CONFLICT-MATRIX.md) 与 [带行号原始片段](wbs-conflict-excerpt.txt)。
- exact U reducer 合成探针：重复 delta 得 `XX`；terminal 后迟到 delta 得 `FinalX`；tool.completed 不修改 aggregate。只证明所调用 reducer 的行为，不能替代整个 #426 测试。
- U 的 8/8、旧 lint/build 等仅“历史证据读取”，本阶段没有重跑 #426 集成套件，没有据此填 PASS。

## NOT_RUN 与边界

| Gate                                                   | 状态 / 原因                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| #426 与最新 develop 的正式运行时集成测试               | NOT_RUN；Phase 1 禁止正式接线，没有解决/提交合并树                              |
| Schema / Migration / DB RLS / 并发持久化 /恢复删除 E2E | NOT_RUN；合同未批，未建表/服务，禁止提前执行                                    |
| 本地全仓 lint/typecheck/build/Quality Gate             | NOT_RUN；本轮只有审计与文档，不声称应用全 Gate PASS；远端 Draft PR 自动检查单列 |
| live provider / 浏览器烟测                             | NOT_RUN；无 runtime 集成，本任务不需要真实对话或凭据                            |
| 格式、证据完整性、diff 与范围核验                      | 交付前记录于 validation.json；不是应用集成 PASS                                 |

最终绑定：RESULT 和发布回执明确文档提交及最终远端 HEAD；不能把 GitHub PR merge-ref 检查当成分支 exact-head 证明。无真实会话/凭据进入 QA。

任务文件从固定文档 SHA 导入；只移除行尾空白以通过 diff whitespace 检查，内容与来源按行尾空白归一化比对一致。冲突片段的空行行号后空白也移除；原始 merge-tree stdout 保留。
