# TASK-071-A / B — WBS 9.10 一次性最终收尾（唯一执行入口）

**状态：READY_TO_EXECUTE_WITH_SECURITY_GATES，非已完成**  
**Issue：** [#404](https://github.com/kanzakimy0/TravelAssist/issues/404)  
**唯一实施 PR：** [#231](https://github.com/kanzakimy0/TravelAssist/pull/231) → `develop`  
**A：Canonical Owner；B：经授权代办执行人。**  
**文档发布位置：** 既有 docs-only [PR #472](https://github.com/kanzakimy0/TravelAssist/pull/472)，不得建立第二个安全实现 PR。  
**发布日期：** 2026-10-11（JST）。

## 一句话目标

在不降低 Secret/History 扫描、不伪造或重绑定旧 QA、不擅自改写 Git 历史的情况下，**完成 14 组历史安全命中的合法处置 → 原实施 PR #231 正常整合最新 develop → 跑通源码 Exact-HEAD 与 PR Merge-result 强制 CI → 交付一次人工验收**；用户另行明确授权合并后才 merge、验收 develop CI、关闭 Issue #404 并将 WBS 9.10 置「已完成」。

这是**收尾 Task**，不是重新实施 Security、TASK-086 或 WBS 9.1。**普通技术问题由 Codex 自修自测；实际安全授权问题集中一次性报 Issue #404，不得每失败一项就让 B 在 A/Codex 之间传话。**

## 0. 冻结与事实核对（仅执行一次；不要重做 Phase 0）

1. 读取 `AGENTS.md`、本 Task、Issue #404 全部最新审批和回执、原 #231 PR/branch、原 docs-only PR #472；执行时以**实际最新 GitHub refs**为准，不把本文历史 SHA 当永远不变。
2. 最后核验的原 #231 远端仅文档 HEAD：`cfac88dfcb482cc0c96b6abdd702fd7a22a926aa`；`develop=cfd51e42f96e43f84f406c6aab5aab6e408b713e`；原 PR Draft/Open/merge conflict。
3. 用户/Codex 最新报告的**本地**候选：`dd967a7e92fa4fc7350c130595347c41ea7c2374`，Node 3943/3943、canonical aggregate 12/12、Graph/Resume/Extraction/Rebuild、TASK-086 双轮确定性、tracked/boundary/canary/bundle 等 **PASS**。该 SHA **没有在 GitHub #231 上发布**，现有报告位于 B 的 Windows 本地工作区 `I:/Codex/task071-identity-20261011/`；本 Task 作者无法访问/重验这些本地文件，所以执行人必须先验证这些证据与 SHA，**不能把自述 PASS 冒称 Remote Hosted PASS**。
4. 原 Security CI [#38111442430](https://github.com/kanzakimy0/TravelAssist/actions/runs/38111442430) FAILURE 属于文档 HEAD，不能当作待发布源码的验收。
5. 用独立 clean full clone/worktree，保留既有用户脏工作树、本地候选、Git 对象和全部失败回执；**不 reset --hard、clean、stash、rebase、强推或覆盖用户文件**。必须记录父提交、commit SHA、分支 HEAD、受保护输入 hashes、工作树 clean 证明。
6. **已授权无需重复询问**：[D1–D3 决策](https://github.com/kanzakimy0/TravelAssist/issues/404#issuecomment-6104296457)；覆盖 D1 当前来源受控脱敏/历史分类、D2 四文件 reviewed inventory、D3 最终冻结后原 R035-05 的派生报告刷新。**不覆盖**未经核实的历史 allowlist、真实凭据事故决定、Git 历史重写或 PR 自动合并。

## 1. History 47 次 / 14 组：按已做好的证据立即执行的唯一收口路径

不要重复作宽泛扫描研究。完整精确证据在：

- [逐组处置主决策书](https://github.com/kanzakimy0/TravelAssist/blob/docs/task-071a-b-security-closeout-20261010/docs/qa/TASK-071/HISTORY-FINAL-DISPOSITION-DECISION-PACK-2026-10-11.md)；
- [12 组精确 history-only 例外提案 JSON](https://github.com/kanzakimy0/TravelAssist/blob/docs/task-071a-b-security-closeout-20261010/docs/qa/TASK-071/history-exact-exception-review-proposal-2026-10-11.json)，`PROPOSAL_ONLY_NOT_EFFECTIVE`，每条 `applied=false`；
- [11 个 Git blobs 的旧签名 URL 结构和到期时间实证](https://github.com/kanzakimy0/TravelAssist/blob/docs/task-071a-b-security-closeout-20261010/docs/qa/TASK-071/HISTORY-URL-STRUCTURAL-REVIEW-2026-10-11.md)；
- [原始 14 组决策机器提案](https://github.com/kanzakimy0/TravelAssist/blob/cfac88dfcb482cc0c96b6abdd702fd7a22a926aa/docs/qa/TASK-071/approved-20261011/history-decision-proposal.json)。

| 组 | 命中 | 当前证据 | 允许的下一步 |
| --- | ---: | --- | --- |
| **H01,H02,H12,H13,H14** | **6 次／5 组** | 历史数值型配置、合成/负向测试值，已有离线 review | 有实际权限的 Security Owner 逐条审核 `path/category/fingerprint/scope=history/reason/expires`；批准后才可登记精确限期 exception |
| **H05–H11** | **39 次／7 组** | 历史采集 `finalUrl` 中 AWS/Azure 预签名访问 URL；11 个不同历史 Git blob 已检查，URL 的**自述**到期时间在 2026-10-01～02 | 由 Source/Credential Owner 与 Security Owner 复核历史访问权利、潜在滥用/事件处置及时间证据；**逐组**决定是否可接受已治理的历史风险。仅「到期」不是独立审批 |
| **H03,H04** | **2 次／2 组** | 外部 POI 发现链接内 JWT-like 查询参数；外部网页 Google Maps script URL 中的 API Key-like 参数 | 由有权来源/凭据所有者或适当安全响应渠道核查权限、限制、使用风险和撤销/轮换必要性，再由 Security Owner 决定历史处置；未确认即 HOLD |

### 阶段 S1 — 审批准备与判定（Codex 不得自行扩权）

1. 从 GitHub 读取 **Issue #404 在本轮开始后所有最新评论**及 PR #472 Review，提取**实际决定**。区分 `APPROVED_D1_CLASSIFICATION`、`PROPOSED_HISTORY_EXCEPTION`、`APPROVED_EXACT_HISTORY_EXCEPTION`、`CREDENTIAL_OWNER_ASSESSED` 和 `UNRESOLVED`；**申请/赋予 reviewer ≠ 审批**，仓库 admin 身份也不能替代外部凭据 Owner 的事实认定。
2. 校验原始 scanner 的 14 组 path/category/fingerprint/scope 与现有 102 条 allowlist 是否冲突；核查 12 组提案 `applied=false` 的全部字段。禁止将 JSON 审核提案直接复制成 active allowlist。
3. 如果安全负责人已经明确逐组批准，Codex 只应用获准部分到**现有** `tools/security/allowlist.json`，每个 entry 必须带精确历史作用域、单一路径、单一 category/fingerprint、可审 reason、有效到期日期以及 Owner 评论 URL；禁止 wildcard/whole-file/provider-wide/未知凭据无条件放行。
4. 对 H03/H04 等任何未批准组，**绝不尝试线上使用凭据、打印原值、访问私有凭据存储、猜测撤销状态**。原始 Git history 和来源证据保持不变；若凭据所有者判断需要事件响应，则转为明确的 incident HOLD，而不是自动例外。
5. 若 Owner/凭据事件判断仍未到位，只在 Issue #404 **一次性发布精确剩余组与证据、可接受的决策选项、负责方和唯一下一步**，标记 `BLOCKED_HISTORY_UNRESOLVED` 并停止危险源码发布路径；其他无需授权的安全/QA 文档检查可完成。**不要启动长时的昂贵 Graph/Node/CI 重跑来等待安全审批。**

### 阶段 S2 — 获授权后最小落地与独立复扫

- 仅将实质已批准的历史限定条目写入原安全实现分支，绝不降低检测规则、扫描范围或 fail-closed 行为。
- 运行 `npm run test:security`、`npm run security:scan`、`npm run security:history`、`npm run security:boundary`，记录 actual checkout、Git reachable refs、文件/对象/字节、scope、allowlisted、unresolved、binary/oversized/LFS 排除与错误数。
- 必须 **history error=0、unresolved=0** 且全部例外有独立受理证据，才能称 History PASS。若在新 commit 下出现新的未审 groups，严格失败并汇总唯一问题矩阵，不能临时扩大豁免。
- 保留 14 组原始分类、签名 URL 到期实证和历史结果；不要把已记录的 47 次旧 finding 删除/改成历史零发生。

## 2. 复用已有本地技术成果，避免重新返工

在安全发布门槛具备后：

1. 复用本地 `dd967a7e92fa4fc7350c130595347c41ea7c2374` 的 clean candidate，先**核对 commit 是否可达、原始回执/证明内容 hash 及 actual checkout identity**，否则报告无法继承的具体材料，而不是默默编造。
2. 以正常 merge 方式纳入原 #231 最新 docs HEAD 和最新 `develop`；只解决真实文本/语义冲突，不回退 WBS 9.1 已完成、WBS 9.11 最新状态、不修改其它 Owner 的 TASK。
3. **任何 `package.json`、Security workflow、9.1 reviewed tests、transport graph 输入、认证生成器或 scanner 规则变化，均须重新生成受影响的 hash/receipt，重新核验相应 TASK-035/086 Gate**；旧 3943/3943、12/12 证明只属于它们各自的 SHA。不得伪造跨 HEAD 的 PASS。
4. 使用原 `tools/qa/task-035-refresh-derived.mjs` / R035-05 稳定版，只在冻结输入之后执行必要派生刷新；双次生成、逐文件字节和 protected business/rights/identity/route/boarding projection 比对。原算法不更改；无语义等价则 HOLD。
5. 本地分支由最初 `NATIVE_BINDING_MISMATCH` 修复到 canonical aggregate 12/12 PASS 的源码与机器负向测试必须核对已归档；**对 hosted ID 缺失/错 SHA/错 attempt/篡改 proof 的 fail-closed 不能放松**。

## 3. 本地 Gate + GitHub Gate：严格验收，不借用旧绿灯

仅在 S1/S2 完成且无危险来源阻塞后，执行**完整**门禁矩阵：

- `npm ci`，`npm run test:security`，`npm run security:scan`，`npm run security:history`，`npm run security:boundary`，`npm run security:build`，`npm run security:bundle`。
- `npm run test:baseline:inventory -- --check`，`npm test`（canonical 9.1），TASK-086 first/second/extraction/resume/rebuild/aggregate 的仓库现行命令（从 `tools/qa/task-035-baseline.mjs` 读取），`npm run lint`、`npm run typecheck`、`npm run deploy:validate:local`、`npm run format:check:deploy`、`npm run deploy:build:local`、`npm run deploy:verify-artifact`、`git diff --check`。
- Graph 阶段以已验收严格 proof-backed 执行模型在**独立、低争用**环境运行，保留原 2,400,000ms native 预算；不同时在共享机器并行重型 Graph 造成可避免的 40 分钟超时。
- 严格区分 local runId/attempt 与 Hosted runId/attempt；验证 9.1 canonical aggregate 的 `checkoutSha/inputDigest/inventoryHash/nativeReceiptSha256/runId/runAttempt`，不编辑旧证明来凑绿；不能把单项 PASS 或 3943 观测通过代替 final aggregate PASS。
- 对全部新变更，核对 Git diff、泄露防护、WBS 归属、allowlist 期限及过度修改。不引入第二安全实现或测试系统。

当真实本地 History/Quality 全 PASS 后，将**唯一**实施分支 `codex/a-global-security-baseline` 正常发布为原 #231 的新 implementation HEAD（不强推、不重写历史）；先保证 PR 最新 develop 可以无冲突合成，然后**分别**取得：

1. **branch exact-head** 的实际 Hosted Security 与 Quality Gate，带 SHA/run ID/attempt/结论。
2. **PR merge-result** 的实际 Hosted Security 与 Quality Gate，验证 checkout 是对应当前 PR head + 当前 develop base 的 merge commit，所有 required jobs 完成，不借用旧的 `4d7e348a...` stale merge ref。
3. 若 source 又修改，必须将所有需绑定的新 HEAD 回执更新至 final QA，旧 run 仅存历史。

只有全部必需 Gate **实际 PASS**，才把 WBS 9.10 更新为「待人工验收」，而**不是**「已完成」。保持 #231 Draft/Open，不 enable auto-merge。

## 4. 最终用户验收与正式完结

交付以下**一个**可复查的最终验收包（禁止十几个孤立 RESULT 反复覆盖）：

- `docs/tasks/RESULT-TASK-071-a-security-final-closeout.md`：最新状态在文首；历史记录原样保留。
- `docs/qa/TASK-071/final-closeout-20261011/README.md` 和 `gate-matrix.json`：全部本地与 Hosted Gate、exact head、merge-result、run/attempt/checkout、countStatus、耗时、failures、排除项。
- `docs/qa/TASK-071/final-closeout-20261011/history-disposition.json`：14 组逐一列明 `candidate/fingerprint/path/scope/actual Security Owner decision URL/credential owner finding link/expiry/active allowlist status/scanner result`，**不含真实凭据**。
- `docs/qa/TASK-071/final-closeout-20261011/immutable-proofs.json`：受保护输入 SHA、旧新 proof 绑定、R035-05 双轮决定性与业务语义等价核验。
- Issue #404 一条完整总回执（不要只写「全部完成」），原 PR #231 description/link 和 WBS 9.10 保留真实状态；A Canonical Owner/B authorized executor 不变。
- **最终要求用户明确授权 merge #231**。只有授权后才用普通 GitHub merge，核验合并后 `develop` 的必需 CI，再由 docs-only closeout 标 WBS 9.10「已完成」、关 Issue #404。未经最后授权 **不得**自动 merge、转 Ready、close Issue 或提前称 DONE。

## 5. Fail-closed 的一次性停止条件（避免再反复传话）

| 条件 | 正确状态 | 执行人应交付 |
| --- | --- | --- |
| 14 组中任一安全决策缺失、疑似凭据未有 Owner 处置 | `BLOCKED_HISTORY_UNRESOLVED` | 仅一次集中交付缺失组 ID + 有权处理人/官方渠道 + 决策要求；不修改 allowlist/推源码 |
| 历史 scanner error / unresolved > 0 | `BLOCKED_SECURITY_GATE` | 脱敏机器 findings 与真实 count，不把 FINDINGS 改 PASS |
| 输入/证明的 SHA 不一致或测试 FAIL | `BLOCKED_TECHNICAL` | 自主修复本任务范围的确定性错误与 rerun；不可删断言或伪造回执 |
| PR merge-result 冲突或 hosted CI FAIL | `BLOCKED_HOSTED_ACCEPTANCE` | 在唯一原分支正常修冲突/修技术问题并重新 CI，不让用户代为传话 |
| 全部 actual gates PASS，但未获得最终 merge 授权 | `READY_FOR_HUMAN_ACCEPTANCE` | 一份完整验收包及待人工操作的原 #231 链接 |
| 用户明确授权 merge，#231 已合并且合并后 develop CI PASS | `COMPLETE` | 更新 WBS、关闭 Issue、保存合并 SHA/CI |

**明令禁止**：凭据探测、输出真实 token/签名 URL、未确认的 S1/S2 历史例外、泛化 allowlist、重写历史、force push、自动合并、假造 GitHub CI、关闭原 Issue/标记完成、删除现有证据，以及碰 A 正在处理的 WBS 4.18 等无关任务。

## 6. 交给 Codex 的唯一入口

读完本 Task 后，在**本次执行**中完成全部无需额外授权的收尾；对安全 Owner/凭据 Owner 已给的批准直接实施，对仍缺的单组批准只生成**一个**集中待决清单，不要反复让用户确认 D1–D3。安全门可通过时继续到原 PR #231 Hosted 双重验收；真实所有 Gate PASS 时停在一次最终人工 merge 审核。**这是已有 TASK-071-A 的最后执行阶段，不另开 TASK、Issue 或 implementation PR。**
