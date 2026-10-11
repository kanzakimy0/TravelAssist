# TASK-071-A / WBS 9.10 — B 一次性收敛与 Owner 决策包（2026-10-10）

**状态：安全 Findings 待裁决；允许非敏感兼容审计与最小修复，不允许绕过安全红线。**

- Canonical Owner：A；B 为已授权执行人（用户转述的授权已登记 Issue #404，不冒称 A 直接 GitHub 留言）。
- 唯一实现位置：原 `codex/a-global-security-baseline` / [PR #231](https://github.com/kanzakimy0/TravelAssist/pull/231)；唯一 Tracking：[Issue #404](https://github.com/kanzakimy0/TravelAssist/issues/404)。本 Task 文档属于 [docs-only PR #472](https://github.com/kanzakimy0/TravelAssist/pull/472)，**不是第二个实现 PR**。
- 事实基线（执行时须重新确认）：`develop@cfd51e42f96e43f84f406c6aab5aab6e408b713e`；PR #231 文档 head `a50239a72d7dacfdf3919222892469f55d350de5`（该 head 并无集成候选代码）。
- 当前真实门禁：Security focused 31/31 PASS，server/client boundary PASS；tracked 6 unresolved，history INCOMPLETE，9.1 inventory FAIL，其余最新集成 CI NOT_RUN；9.10 不得自报 PASS 或已完成。
- 阅读优先级：本文件 → `docs/qa/TASK-071/latest-develop-20261010/README.md` / `execution-receipt.json` → `docs/qa/TASK-071/phase0/security-latest-develop-pr231-conflict-audit.md` → 既有任务/安全规则。记录原候选和新工作树状态，不重新要求用户重复转述 A 授权。

## 1. 根因分组与默认安全处置（当前不自动批准例外）

| 分组 | 已知发现 | B 可直接完成 | 必须 A/安全 Owner 决策 |
| --- | --- | --- | --- |
| E: 环境模板 | `.env.example` 2 项 env-template-value，与 develop 字节不同 | 检查是否示例；把**真正的模板值**改成空值或显然不含凭据形态的占位值，保留变量名及用途；复跑扫描和相关配置测试 | 若审阅发现这不是模板而是实际有效凭据，进入安全事件流程，不自行旋转 |
| T: 自有测试 | `tests/poi-remaining-review.test.py`（URL-credentials）及 `tests/task-076-ai-runtime.test.mjs`（generic-credential），与 develop 字节相同 | 在授权的测试/代码范围里把可证实的 synthetic fixture 改为不可误识别的占位表示，但**保留原检测器负向测试和实际断言语义**；有必要使用运行时构造的敏感形态测试输入，不把真实形态存到 fixture；更新受影响测试证据 | 无法证明 synthetic 或需放宽检测/新增 allowlist 时才列 Owner 决策，不凭文件在 tests/ 下就自动豁免 |
| S: 外部来源 | `data/poi/full/reviews/task-071/TASK-071-A-0009.discovery-v2.jsonl` 中 JWT 特征；`data/poi/full/task-073-b-identity-deep-null-targeted-43d/identity-remediation/sources/japan-travel-minobusan-kuonji.html` 中 GCP-key 特征，均与 develop 同字节 | 不打印/解码/联网测试原值；只记录固定 path、类别、风险、hash、source provenance 与下游依赖；规划脱敏/隔离后如何保持 Canonical/POI source hashes 和业务证明链。可写非敏感修复提案，不擅改原采集证据 | **必须 Owner 选择**：对两条现有来源采取隔离/脱敏重审、拒绝准入、或在独立安全审核证明后按严格条件定点例外。默认 HOLD，不能擅用 allowlist。怀疑有效凭据时必须交由凭据所有者进行事件处置/旋转评估 |

**特别注意**：六项是 *scan matches*，并非已确认有效密钥；但未核实有效性也不表示安全。绝不复制原值进入聊天/Issue/PR、CI、测试日志或报告。对源文件的变更会影响其证据 hash/rights 和下游机器门，不能只为扫描变绿而直接改源数据。历史 Git 已包含的文本不会因本次只改当前文件而消失；不做历史重写/force push，后续 history 扫描必须独立表述遗留风险。

## 2. 本轮允许 B 连续执行的确定性技术工作

在**全新完整仓库 clone 或经过验证的独立干净 worktree** 中，顺序执行，最大化一次闭环，记录每步结果但不每步回来要求用户传话：

1. 将本 Task 的当前 GitHub Issue/安全文档作为授权上下文，保存旧 HEAD/最新 develop/工作树 clean 证据。继续使用原 #231 的历史，不用 `reset --hard`/`git clean`/force push/rebase；工作树有非本任务文件，重新建隔离目录而非清理用户成果。
2. 用既有 Phase 0 的两处文本冲突实证修复 `package.json` 和 WBS，**保留最新 develop 的 9.1 已完成和 9.11 状态**，同时保留六条 security scripts 和最新 canonical npm test。
3. 对 E/T 四项分别做静态结构性检查，能证明只是示例/fixture 才实施最小合法修复；不移除安全测试或下降扫描严格度；审查所有 6 项可识别路径时只输出 redacted metadata。S 两项只形成 Owner 决策材料，不修改/例外。
4. 修复 9.1 inventory：先记录原 policy/inventory/execution-model hash 和 test files 的差异，新增安全测试及两个既有变更的逐文件审核，**不得** 直接 `--write` 绕过 reviewed hash。保留所有必须测项、历史测试审计链及分片语义；如涉及新增跨 Owner 的执行审阅例外，标入一次性 Owner 决策列表，不静默批准。
5. 修改 Security workflow 使其消费现行 9.1 canonical inventory/test、正确的 CI checkout SHA/run/attempt 和安全门；保持现有 scanner、canary、boundary 功能，禁止增设并行第二套测试体系，不能把 skip 的 mandatory jobs 说成 PASS。
6. 准备 TASK-086 因 package/workflow 变更的 **输入绑定变更与仅派生报告修复计划**：列当前/新增文件哈希、派生产物范围、原生产数据与 rights/identity/route 投影预计零语义变更。对受冻结认证约束的实际刷新，先取得本文件第 3 节 Owner 确认，再复用 TASK-035/R035-05 已批准的未修改生成器与逐项比对机制；不得跳过 SHA 校验或更改认证器。不要预设恰好 9 个 JSON。
7. History INCOMPLETE：**禁止在 partial clone 上把失败归类为清洁**。在具备完整对象的隔离 full clone、no shallow/no promisor 缺失条件下 fetch 本 repo 可访问 heads/tags，先对对象完整性/扫描环境做只读元数据诊断（仅 OID 和计数，不打印 blob），再运行原 `security:history`。如仍 INCOMPLETE，交付确定性原因/退出码/原始完整日志的私有脱敏哈希；不能将超时放宽或错误吞掉。
8. 建立一张最终任务矩阵，每个项目带 `DONE/FAILED/HOLD_OWNER/NOT_RUN`、具体测试命令、SHA、证据地址和下一步。对非敏感技术问题可反复自修复与自验证；**不因一个已知 Hold 就停止所有无风险的独立工作**，但必须避免发布泄露或伪造完成。
9. 只有在 S 两条 Owner 处置明确且全部强制 Security 门可正常执行之后，才最终组成可推送的安全集成候选；如果已发现疑似真实泄露，不推进 PR publication，提交脱敏审计与需专业事件处理的报告。

## 3. 给 A 的一次性集中决策（直接在 Issue #404 回复，不经 B 人工转述）

请 A/指定安全 Owner **在 Issue #404 直接一次性答复 D1–D3**；未答复的项一律标 `HOLD_OWNER`，不能因 B 的一般代办授权推定批准。

- **D1 外部来源两项安全命中**：推荐选项 **A（安全优先）**——维持 quarantine / `runtimeImportAuthorized=false`（如适用），授权另案制定最小脱敏/证据保留与来源重新认证方案；不得将原 JWT/GCP 特征直接作为一般 fixture allowlist。选项 B：由 Owner 独立核验来源及性质后，针对**确认为无效/公开且允许保留**的单一 fingerprint/path 制定有期限、限定用途的例外（需安全复核；不得自动推断）。如涉嫌真实有效凭据，应让凭据所有者决定吊销/旋转而非在仓库里处理真实密钥。**默认 A/HOLD，未授权不改原采集文件。**
- **D2 9.1 测试审核增量**：推荐 **A**——允许 B 在不弱化断言的前提下，按 TASK-035 reviewed hash/新安全测试的完整文件审查方式，做受限增量 registration、动态清单及完整回归，保留原审计清单/负向测试，不绕过 validator。若不批准，则 HOLD 该部分及最后 QA。
- **D3 TASK-086 派生认证刷新**：推荐 **A**——对本次必要的 package/workflow 变更，允许 B 复用已验收 R035-05 的未修改 `certify()/generateCloseout()/generateRepairReport()` 和双重可重复/业务等价检验，只刷新必需派生报告；不得更改已审核 source、rights、实体身份、路由语义、认证算法或原始输入。若输入变化不仅是绑定元数据或业务等价不成立，则该部分恢复 HOLD 并提交具体证据。

即使 D1–D3 获批，**正式合并 PR #231、关闭 Issue #404、WBS 9.10 标“已完成”仍需项目用户最终明确验收**。三项不批准时完成所有无风险工作并出具一份合并报告，绝不每个失败分散向用户询问。

## 4. 测试与发布 Gate（一次完整矩阵）

- `npm ci`、`npm run test:security`、`npm run security:scan`、`npm run security:history`、`npm run security:boundary`、`npm run security:build`、`npm run security:bundle`。
- `npm run test:baseline:inventory -- --check`、`npm test`、`npm run lint`、`npm run typecheck`、`npm run format:check:deploy`、`npm run deploy:validate:local`、`npm run deploy:build:local`、`npm run deploy:verify-artifact`、`git diff --check`。
- PR 的 **branch exact-head** 与 **PR merge-result** 分开验证必需 Quality/Security CI 和原 TASK-086 全部强制证明链；`push`/PR 触发的 checkout SHA、运行 attempt 和 9.1 receipt 必须实际一致。旧 `fa3fe58` 和 `a50239a` 绿灯/失败都不能充当新 SHA 的完成证明。
- 不伪报 Local DB/浏览器真实用户/生产 Provider、Cloud Secret validity、penetration test、WBS 9.9 的通过状态。
- 保留 `docs/qa/TASK-071/latest-develop-20261010` 的历史报告，新增下一阶段 `OWNER-DISPOSITION-AND-REMEDIATION-MATRIX.md` 与具体 Result，**不改写旧审计结果**。
- Owner A / B executor 不变，WBS 9.10 保持阻塞或待审查的真实状态；唯一实施 PR #231 继续 Draft/Open，禁止自动合并。

## 5. 给 Codex 的本轮执行指令

读取此文档及 Issue #404 最新评论，**不再把已确认的 B 执行授权视为缺失**。接续已有 Phase 0，不重复做 Phase 0，不启动第二个 PR。完成 E/T 最小修复及 9.1 inventory、workflow、full-clone history 的独立工作；仅在 Owner 对 D1–D3 明确裁决后执行外部源处置和冻结认证派生刷新。在同一长任务中自检/自修/复测到明确终点，阶段性记录证据但不因普通失败逐次要求用户中转。若遇实际真实密钥风险、跨域未经批准修改或不可消除的强制安全门，fail closed 并在 Issue #404 集中列出唯一需 Owner 决策的清单。无权擅自合并或降低安全门禁。
