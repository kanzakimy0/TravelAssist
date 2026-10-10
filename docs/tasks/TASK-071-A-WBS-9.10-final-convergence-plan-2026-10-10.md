# WBS 9.10 / TASK-071-A — 最终收口策略与 Codex 单轮执行规范

**版本：2026-10-10 / 审核基线固定于 90b59b57d61dfb8e05b432867bff7730422afe39**  
**当前结论：BLOCKED_TECHNICAL_AND_HOLD_OWNER；未验收、未合并。**

## 0. 来源、目标和不可伪报的状态

- Canonical Owner：A；B：已获用户转述的 9.10 执行授权。执行记录见 [Issue #404](https://github.com/kanzakimy0/TravelAssist/issues/404)；A 对安全例外、跨域认证数据的额外裁决**仍待确认**。
- 仅有一个实现 PR：[原 #231](https://github.com/kanzakimy0/TravelAssist/pull/231)，原实现分支 `codex/a-global-security-baseline`，当前远端 HEAD：`90b59b57d61dfb8e05b432867bff7730422afe39`，Draft/Open、未合并、与 develop 有冲突。
- 本次 **正式结果**：[RESULT](https://github.com/kanzakimy0/TravelAssist/blob/90b59b57d61dfb8e05b432867bff7730422afe39/docs/tasks/RESULT-TASK-071-a-security-final-closeout.md)、[QA](https://github.com/kanzakimy0/TravelAssist/blob/90b59b57d61dfb8e05b432867bff7730422afe39/docs/qa/TASK-071/one-pass-20261010/README.md)、[Owner 决策矩阵](https://github.com/kanzakimy0/TravelAssist/blob/90b59b57d61dfb8e05b432867bff7730422afe39/docs/qa/TASK-071/one-pass-20261010/OWNER-DISPOSITION-AND-REMEDIATION-MATRIX.md)。
- 未公开的独立完整 clone 候选：`7e3160ac78cb3b1dbc27b4d2194bc98ca72f5bdb`（在 `I:/Codex/TravelAssist-task071-20261010`，**仅在本地存在，不能用这个 SHA 链接 GitHub**）；其普通 develop merge：`b156425d66a04a6e13c96fe7ea01ad7e399beed8`；所整合 develop：`cfd51e42f96e43f84f406c6aab5aab6e408b713e`。执行时再次固定实际远端，禁止覆盖未提交成果。
- 当前本地候选已通过 security focused 32/32、boundary、9.1 reviewed inventory（155 direct+4 indirect）、lint（0 errors、69 existing warnings）、typecheck、build、Canary/bundle/deploy 等。**这些不属于原远端 PR #231 对当前 develop 的可合并 CI PASS。**
- 未解除：当前 tracked 两项外部来源 JWT/GCP 类别命中；reachable history 47 次未解决命中 / 14 个 path-category-fingerprint 组；Canonical Node 30 分钟重建超时；补充测试 1120/1123（三项失败，其中两项 stale binding、一项 published artifact tree hash mismatch）；新 candidate PR exact-head / PR merge-result CI 未执行。
- [Security run 38026378840](https://github.com/kanzakimy0/TravelAssist/actions/runs/38026378840) 在**文档 HEAD** `90b59b57...` 上 FAILURE（History）；不是新集成候选的门禁。

### 9.10 完成的定义

仅在全部以下事实成立后由用户正式验收并合并：当前目标分支相对最新 develop 干净可合并、无未经处置的真实敏感暴露；scanner tracked/history 根据经 Owner 审核的**逐条真实处置**结果 PASS（或以明确变更后的安全治理 Gate 验收，不得把 FAIL 叫 PASS）；Client boundary/Canary PASS；TASK-035/9.1 完整强制集和 TASK-086 证明链 PASS；分支 exact-head、PR merge-result 的最新 Quality + Security CI 都 PASS；Result/QA/WBS 状态准确。PR #231 实际合并以后，才可以把 WBS 9.10 标「已完成」、关闭 Issue #404。

## 1. 四条工作流，必须一次协调执行

| 工作流 | 已完成事实 | 尚须完成 | 是否必须 Owner 决策 |
| --- | --- | --- | --- |
| A. 当前敏感来源 | 模板/自有 synthetic 命中已最小修复；只余两项原采集文件 | 按安全治理隔离或授权脱敏当前 tracked 内容；影响 POI provenance 的依赖映射同步审核 | **D1，必需** |
| B. 历史扫描 | 完整 Git clone 已解决 INCOMPLETE；本地 47 occurrences/14 groups，CI 同样确认 47 | 14 组分类：确认误报/合规可公开/疑似或确认凭据；逐组证据和有权处置方；安全完成后保留证明 | **D1 扩展至历史所有组** |
| C. 9.1 与 Workflow | reviewed inventory 技术通过、Security workflow 适配已本地实现 | A/QA 接受四文件审核范围；确定性重建性能根因；恢复全量强制 tests/receipts；允许测试在受支持 CI lanes 上运行 | **D2 由 A/QA 批准增量，重建修复属 B 技术工作** |
| D. TASK-086 绑定 | package.json 被证实是变更的绑定输入；原 R035-05 generator 未改 | 基于最终确定的 package/workflow 字节一次性生成必要派生报告；双次重建/语义等价，修复三项失败 | **D3，必需** |

### D1：历史与当前来源的唯一可接受治理方式

1. **不直接编辑、解码、输出或外部验证疑似凭据**。以文件路径、Git object/commit、类别、scope、不可逆 fingerprint、来源权利/可公开性证据进行离线复核；原文不放 PR、Issue、日志、报告。
2. **不要把「将文件标 HOLD/quarantine」理解为 Scanner PASS**：文件如果仍然被 Git 跟踪且包含原匹配值，tracked 扫描依然会失败。获得 Owner 授权后必须把可能敏感的当前原文从公开 tracked 提交中移除或替换为允许的脱敏派生副本，并按 POI/证据链 Owner 规则完成依赖哈希与准入重审；受限的真实证据只可走获批准的非公开存放渠道，不能在 Git 仓库存「隔离但未脱敏」原文。若原值被判为有权公开且非秘密，只能在安全 Owner 逐项批准后使用 **exact path/category/fingerprint/scope/reason/expiry** 例外。
3. **历史不会因当前文件改变而消失**：47 occurrences 分 14 组列出 provenance 和单独结论。误报/安全公开的历史值可在 Owner 验证后做有期限、限定作用域的历史例外；涉嫌真实凭据则由持有者确定是否撤销/轮换和事件处置。此类值不能仅凭“旧记录/已撤销”就无审查豁免。
4. 默认不重写 Git 历史、不强推、不关闭/削弱 Scanner、不可隐去原有命中。若安全 Owner 认为真实泄漏要求仓库历史清理，**独立安全事件/破坏性治理授权**是另一个决策：当前 9.10 保持阻塞，不得以未经审查的历史白名单规避它。
5. 请 A 在 **Issue #404 一条评论**为所有 14 组（尤其两项当前来源）给出审核负责人、批准的方案和必要的来源权限/凭据事件处理路径；不能要求 B/用户一项项传话。未审项目 **HOLD_OWNER**，不擅改业务来源。

### D2：9.1 审核不应重复返工

- 当前本地 reviewed inventory 已为 155 个直接、4 个间接文件；原历史 reviewed policy 和 round-robin 分片未放宽；四文件已记录 previous/current hashes、AST 断言保留证据。请 A/QA **一次性接受或精确指出不合格文件/原因**，不重新发起从零 inventory 工作。
- `npm test` 的 30 分钟超时发生在 Windows `tests/task-086-b-rebuild.test.mjs`；它仍为 required。拆分定位单文件耗时、I/O/并发、资源、无限等待、是否与 9.1 专用 Graph First/Second/Resume 证明重复；与同系统干净 develop 的 baseline 比较。先修根因/隔离资源争抢，严格复测，不随意延时、跳过、伪造 final summary。
- **分开记录**本机 runner 诊断与支持环境的 exact-head hosted CI。若最终在支持的 Linux CI lanes 中完整通过，需让 QA Owner 明确其是否符合 **全部现行 required gates**；若要求普通单进程 `npm test` 也必须 PASS，则不能以若干补充文件 PASS 替代。
- Security workflow 和 Quality workflow 的实际 checkout SHA/run/attempt、分片与回执必须兼容。不得以旧 `fa3fe...` CI 成功或纯文档 HEAD 的结果代替正式 source candidate 验收。

### D3：先把全部代码和测试清单定稿，再做 TASK-086 派生刷新

- R035-05 当前证据表明只因最终 `package.json` 改变导致 `currentBinding` 的 SHA 不匹配，**不能先推测所有三项失败都只需更新哈希**。第三项 published artifact tree 差异须先用双次重建＋逐文件语义比较定位；若是真实数据/rights/route 差异就必须 HOLD。
- 获批后使用未修改 `tools/qa/task-035-refresh-derived.mjs`，在全新干净 staging 与外置输出执行 retained/pass-A 与 final 两轮两次重建；比较源输入 SHA、不变数据/权利/身份/边/方向、route-enabled payload、所有输出确定性。仅晋升白名单内**实际必要**的绑定/派生元数据；不手改 source hash、不替换断言、不过滤失败项。
- 切记最后才运行刷新；**刷新后不再更改 `package.json` 或任何认证输入字节**。如 CI 后又修改冻结输入，自动回到 D3 重新刷新并重新验证，不把旧绿灯套给新 head。

## 2. 防止重复返工的确定执行顺序

1. **冻结目标版本**：记录当前远端 #231/最新 develop；保留本地 `7e3160...` 候选，不碰其未提交或用户其他 worktree。先读取 Issue #404 的 D1–D3 现行回复；仅在 clean 隔离 worktree 上继续。
2. **技术工作自闭环**：先单独复现/修复 30 分钟 rebuild 的具体根因，与 clean develop baseline 比较；再次校准 9.1 reviewed inventory 及 Security workflow；运行专项负向测试及 canary，不等 A 的许可才做这些无风险工作。适度自重试 **仅针对确定性技术修复**，不把 FAIL 隐去或仅重复跑到变绿。
3. **统一 A/安全/QA 裁决**：把 D1（14 组 + current）、D2（4 文件）、D3（派生认证）放在同一份 Issue #404 决策矩阵，让 Owner **一次答复所有**。B 不去当中转；无回复只保留 Hold，不擅自做危险改动。
4. **受权安全来源处置**：根据 D1 对当前 2 项源和全部历史组做逐项治理，确保 tracked/history 真正达到获批 Gate，不自行扩大 allowlist。
5. **锁定所有实现输入**：合并最新 develop、resolve package/WBS、固定所有 npm scripts、CI workflows、9.1 reviewed inventory/tests、source redaction/allowed metadata 的最终字节。必须 preserve develop 已验收的 WBS 9.1 及 9.11 状态。
6. **一次性 D3 派生刷新**：严格运行已批准原生成器、双重确定性/投影等价审计。跑 TASK-086 聚焦；三项原冻结/assertion FAIL 必须真的消失。
7. **最终本地 QA**：Security 32/32+、tracked/history 受审结论 PASS、boundary/canary/browser bundle、inventory、全部 Node regressions、Quality/format/lint/typecheck/build/deploy。任何失败形成**唯一合并问题矩阵**，B 自修本任务范围，不来回问用户；对业务源、权限或安全模型之外的问题再一次性交 A 决定。
8. **发布到唯一 PR #231**：正常 fast-forward/普通合并远端文档提交及任何新 develop；禁止 force/rebase/破坏历史；**源安全材料及 Gates 未解除前不可将风险候选发布为 Ready**。记录新 implementation exact SHA 后分别获取 branch exact-head 和 PR merge-result 的 Security/Quality CI，核验合成 checkout、所有 mandatory jobs 和 receipts。
9. **唯一验收交接**：若全部 Gate PASS，将 #231 留 Draft/Open 请求用户验收；用户授权后普通 merge，跟踪合并后 develop CI，docs-only 状态收口 WBS 9.10=已完成，并关闭 Issue #404。若仍 BLOCKED，仅报告合并版真实阻塞，不开启新编号 Task、不自动合并。

## 3. Codex 交付契约

结果必须只有**一份最新 RESULT + 一份 machine-readable Gate matrix + 一份 Owner 决策矩阵**，历史结果只链接不覆写：

- exact develop/base/head、所有 Git 合并与工作树 clean 状态；
- 六类风险（current source、history findings、9.1 inventory、rebuild、TASK-086 binding、hosted CI）各自 `PASS/FAIL/HOLD_OWNER/NOT_RUN`，含最短可复现命令、SHA 和证据；
- 当前检测的 2 个 tracked 及历史 47 次/14 组逐项 disposition，但不输出真实 secret 内容；
- D1/D2/D3 按谁实际回复、何时、链接、适用范围记录；**一般 B 授权不等于额外安全豁免**；
- 从本地候选到原 PR #231 的实际发布路径及 result tree 比对；无 merged 时不得写 WBS complete；
- 对单个技术失败可继续修复并重跑，**只在真实凭据风险或需要跨 Owner 禁止改动时停下**，不得用「发现任何 FAIL 就停止全部独立工作」拖延其他可执行步骤。

## 4. 一次性发布给 Codex 的命令

请完整读取此收口计划、PR #231 最新 QA/RESULT 与 Issue #404 决策回复。基于已验证的本地候选 7e3160... 和目前独立完整 clone 继续执行，**不要重复 Phase 0/Phase 1、不要重新实现 Security**。先独立修复 deterministic rebuild 30min technical failure，检查 9.1 inventory 和 CI compatibility，并把所有历史/current findings 汇总为按 path/category/fingerprint 的 Owner 决策清单；不得输出 secret。A 的 D1–D3 决策直接以 Issue #404 的回复为准。获具体批准后，按源证据链与历史扫描治理完成 D1，锁定代码、workflow 和测试清单，最后只执行一次受限 TASK-086 派生认证刷新，证明 3 项失败已实际解除并跑完整 Security/Node/Quality/CI。使用唯一原 PR #231，保留 A Canonical Owner，禁止自动 merge、force push、放宽扫描或复制凭据。全套门禁通过后提交一份最终验收包；若依然 HOLD_OWNER，先完成所有独立无风险工作，再一次性列出剩余审批与证据，不逐次找用户传话。
