# RESULT — WBS 8.7-B Phase 1 / PR #426 Contract Gate

## 状态与停止点

**CONTRACT_REVIEW_REQUIRED / WBS_8_7_BLOCKED**。

Phase 1 的审计、Proposal 与基线证据供人工审查；不表示 6.2 持久化增量已冻结，也不表示 WBS 8.7 完成。Canonical Owner **A** 保持不变，B 是本轮授权执行人。禁止自动合并；**Phase 2 未启动**。

## 分支与 exact revision

- 独立 managed worktree：`C:\Users\Administrator\.codex\worktrees\wbs-8-7-phase1\TravelAssist`。
- B 分支：`codex/b-wbs-8-7-phase1-contract-review`，从执行时最新 develop 创建。
- Base / 两组基线测试 HEAD：`8f60c8b94d3f5148abeb414d0d8e209e5d736cea`。
- PR #426 原 head：`97a53d5f1fc1fdb5c2c445103fc4c0173be9aca1`。
- Merge-base：`f08daa9f8aa9b459fbd294f08e4bd29e16624647`。
- 任务文档分支 head：`c8c1a36d27a3314fe69fda51868092ced7bba214`，只导入本轮三个指定任务文件。
- 本轮 Draft PR：[PR #470](https://github.com/kanzakimy0/TravelAssist/pull/470) → develop，Draft / Open，等待人工审核。
- 审计内容提交：`5c42418317b6a733a6c051bf01ff1e037b28bb9f`。随后仅补发布元数据；最终远端 exact head 记录在 PR 描述和交付消息，审计及基线证据仍绑定上述不可变源 SHA。

## 已交付审查材料

1. [6.2 持久化契约 v1 Proposal](../architecture/ai-conversation-persistence-contract-v1-proposal.md)：六对象逐字段矩阵；U 已有字段与 P 待批准增量分开；12 个有选项、推荐与影响的 OPEN_DECISION。
2. [PR #426 全部 25 文件复用及冲突矩阵](../qa/TASK-WBS-8.7-B/PR-426-REUSE-CONFLICT-MATRIX.md)：每路径对应 exact source SHA，源 blob 和当前 develop blob 在 JSON 中。
3. [Baseline evidence](../qa/TASK-WBS-8.7-B/PR-426-BASELINE-EVIDENCE.md)、[机器证据](../qa/TASK-WBS-8.7-B/phase1-evidence.json)、原始 TAP/npm/merge-tree 日志与可重现 collector。
4. WBS 8.7 仅更正为 `BLOCKED_UPSTREAM_PERSISTENCE_CONTRACT`；Owner A、6.2/6.14 状态、8.8 未开始均保留。

## 审计结论

- #426 为待审查 session-only runtime，不能作为 develop 已接受持久化模型。优先复用其 parser、Orchestrator、只读 Registry、Provider 封装、SSE 和 Home Shell。
- `git merge-tree --write-tree D U` 实测退出 1，唯一文本冲突是 `docs/project/WBS-TravelAssist.md`，结果树标记区间 1086–1092。冲突涉及 6.13 状态和相邻 6.14 新旧状态；推荐保留 develop 已验收的 6.14。package.json 自动合并。没有虚构其他源码文本冲突。
- 源码无 Git 文本冲突不代表可直接持久化：owner 授权、canonical block/tool/citation refs、顺序、幂等、取消终态、恢复快照均有待批准缺口。
- exact U reducer 内存探针复现 duplicate delta `XX`、terminal 后 delta `FinalX`、tool event 不进入 aggregate。此为有限行为审计，不是上游整套新基线 QA。

## 测试事实与限制

| 检查                                              | 结果                                            |
| ------------------------------------------------- | ----------------------------------------------- |
| 锁定依赖安装                                      | PASS，396 packages；警告原样保留                |
| TASK-076 / AI Runtime 基线                        | PASS，14/14，失败 0，跳过 0                     |
| TASK-082 / 6.14 只读投影基线                      | PASS，8/8，失败 0，跳过 0                       |
| 真实冲突审计                                      | 完成；exit 1 表示识别到实际冲突，非实现测试失败 |
| 六对象提案/证据/文档格式与范围                    | 见 validation.json；不得替代运行时或数据库验收  |
| PR #426 正式兼容集成 / 全仓应用 Quality Gate 本地 | NOT_RUN；本阶段没有集成代码，历史 PASS 不移植   |
| Schema/Migration/RLS/持久化 E2E                   | NOT_RUN；本阶段明令禁止                         |
| live provider smoke                               | NOT_RUN；不使用凭据或真实会话                   |

准确命令、源树 SHA、测试时间、计数、退出码和日志 hash 都在 QA 中。loader stub 的 server-only 不能证明 bundle/DB/auth 安全；将来必须独立验证。

## 保留边界与风险

A 的 `codex/a-ai-conversation-orchestrator` 未 checkout/commit/rebase/force-push/删除；原 TASK-075 与旧 WBS 工作文件未修改。没有新增或修改 `src/`、`tests/`、`supabase/`、package/lockfile。没有持久化 repository/service、正式 Runtime 集成或数据库写入。6.14 production reader 继续 unavailable，8.8 不接线。

Proposal 只是建议，尤其 Tool/Citation canonical identity、匿名归属、terminal/partial、保留/删除、幂等冲突语义不能静默决定。没有发明合规保留天数；推荐缺少明确 retention 配置时禁用 durable 写入。SQL/Drizzle/RLS 的正式实现和真实迁移证据留在获批后的 Phase 2。

## 人工验收及下一 Gate

请 A/用户审核 Proposal D01–D12，明确批准的契约版本与 commit、身份/Tool/Citation、保留与删除、幂等和错误行为，并认可 #426 的兼容恢复方案。随后须另行明确授权 Phase 2（上游合入或显式认可分支前置风险）。仅修完文本冲突不解锁 Schema。

本轮发布一个 Draft PR → develop 后停止；不合并 #426、不自动合并本 PR、不执行 Phase 2。
