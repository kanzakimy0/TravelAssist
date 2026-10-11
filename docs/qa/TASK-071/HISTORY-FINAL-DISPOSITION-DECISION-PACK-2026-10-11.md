# TASK-071-A / WBS 9.10 — Historical Findings 最终处置决策包

> 审查基线：2026-10-11（Asia/Tokyo）  
> 状态：**SECURITY_OWNER_DECISION_REQUIRED / 尚未批准历史例外**  
> Canonical Owner：A；B：经用户确认授权执行。  
> 原执行：[Issue #404](https://github.com/kanzakimy0/TravelAssist/issues/404)；唯一安全实现 [PR #231](https://github.com/kanzakimy0/TravelAssist/pull/231)（Draft/Open/未合并）。
>
> 本文件记录**请求**，不能代替 Security Owner 或凭据所有者作出的实际决定；本文件发布也不更改 scanner/allowlist/证据/生产源码。

## 1. 固定事实与分界

- GitHub 最新可核验的原 PR 文档 HEAD：`cfac88dfcb482cc0c96b6abdd702fd7a22a926aa`；其相关 [Security CI #38111442430](https://github.com/kanzakimy0/TravelAssist/actions/runs/38111442430) = **FAILURE**，原因是 history findings。
- [D1–D3 授权记录](https://github.com/kanzakimy0/TravelAssist/issues/404#issuecomment-6104296457) 已生效：D1 **允许分类、隔离、脱敏、证据链审查**，**没有**授权未经核实的历史例外、通配白名单或改写 Git 历史。
- 当前 tracked scan：依据上一轮候选回执为 **PASS**，原 2 个当前来源敏感片段已受控脱敏（本文件未重新运行）。
- 历史扫描：**47 次 unresolved / 14 个独立 path+category+fingerprint 组**；0 scanner errors。次数不等于真实凭据数量；旧 Git 对象仍可达，改当前文件不会清除 history findings。
- 精确证据/单组 fingerprint、Git object、原始 commit 与受审理由在已提交的 [history-decision-proposal.json](https://github.com/kanzakimy0/TravelAssist/blob/cfac88dfcb482cc0c96b6abdd702fd7a22a926aa/docs/qa/TASK-071/approved-20261011/history-decision-proposal.json) 与 [d1-history-matrix.json](https://github.com/kanzakimy0/TravelAssist/blob/cfac88dfcb482cc0c96b6abdd702fd7a22a926aa/docs/qa/TASK-071/approved-20261011/d1-history-matrix.json)。这份决策包用稳定组 ID 引用，不复制任何疑似凭据、解码值或匹配上下文。
- 用户最新报告独立本地源码 `dd967a7e92fa4fc7350c130595347c41ea7c2374`：Graph/Resume/Extraction/Rebuild、Node 3943/3943 和 Aggregate 12/12 PASS。但**源码及对应机器回执尚未上传到 GitHub，不能视为 Hosted exact-head / PR merge-result 已通过**。

## 2. 类别 I — 已在原 QA 离线审查的非密钥 / 合成值候选

**总计 5 组、6 次历史命中。** 建议 Security Owner 查看已绑定的逐组离线 QA，若确认其证据充分，逐条批准**严格历史作用域、指定 path/category/fingerprint、指定理由、到期日期**的精确例外。最早提案为 `2026-11-10` 到期，Owner 可缩短但不可默认续期。以下各项均为**建议，未获批准**：

| 组 ID | 来源 | 类型 | 历史命中次数 | 既有审查结论 / 需要 Owner 确认 |
| --- | --- | --- | ---: | --- |
| D1-H01 | `.env.example` | env-template-value | 1 | 数值型 Runtime Timeout 示例，非身份验证字段；核对绑定行与字段语义 |
| D1-H02 | `.env.example` | env-template-value | 1 | 数值型 Retry 配置示例，非身份验证字段；核对绑定行与字段语义 |
| D1-H12 | `tests/task-076-ai-runtime.test.mjs` | generic-credential | 2 | 注入的 mock/fake 执行测试素材；测试不能接入真实 Provider |
| D1-H13 | `tests/task-077-ai-conversation.test.mjs` | generic-credential | 1 | 注入的 mock/fake 对话测试素材；验证单一 fixture 语义 |
| D1-H14 | `tests/task-080-a-poi-search-api.test.mjs` | generic-credential | 1 | Provider raw payload 的 fail-closed 负向测试输入 |

审批格式（由 Security Owner 在 Issue #404 回复）：**`D1-H01,H02,H12,H13,H14: APPROVE_EXACT_HISTORY_EXCEPTION`**，说明逐个受审 fingerprint 与 path/category/expiry 是否接受；任一项证据不足可指定 `REJECT` 或 `REVIEW_REQUIRED`。**不得**因为这 5 组相对低风险而默许放行，更不得添加 whole-file/whole-provider 例外。

## 3. 类别 II — 外部凭据形态，先做凭据所有者评估

**总计 9 组、41 次历史命中。** 现有 QA 仅证明 scanner 发现了凭据特征，尚未确认真实、可用、失效或已撤销。不能自行做线上有效性测试、暴露原文、尝试使用、轮换或撤销。

| 组 ID | 受审路径 | 特征 | 次数 | 必须取得的安全结论 |
| --- | --- | --- | ---: | --- |
| D1-H03 | POI 采集证据 `task-071/TASK-071-A-0009.discovery-v2.jsonl` | JWT 形态 | 1 | 来源/凭据 Owner 评估；是否需撤销、轮换、通知 |
| D1-H04 | POI 网页证据 `japan-travel-minobusan-kuonji.html` | GCP Key 形态 | 1 | 同上，证明采集来源与最小业务保留条件 |
| D1-H05 | `data/transport/network/next-source-actions.jsonl` | AWS Access ID 形态 | 8 | 来源/凭据 Owner 评估；历史残留风险处置 |
| D1-H06 | 同上 | AWS Access ID 形态 | 1 | 同上 |
| D1-H07 | 同上 | AWS Access ID 形态 | 1 | 同上 |
| D1-H08 | 同上 | AWS Access ID 形态 | 1 | 同上 |
| D1-H09 | 同上 | AWS Access ID 形态 | 9 | 同上 |
| D1-H10 | 同上 | Azure SAS 形态 | 8 | 同上 |
| D1-H11 | 同上 | Azure SAS 形态 | 11 | 同上 |

**有权安全处置流程**：

1. B 交付已记录的 group ID / 路径 / Git object / 指纹 / origin rights 等**不含原值**的证据，Security Owner 负责识别适当凭据所有者或官方安全披露渠道。不能确认所有者时明确标记 `OWNER_UNIDENTIFIED`，不可推定凭据已经过期。
2. 凭据所有者通过受控渠道判定是否是有效或需保护的凭据、是否需要安全事件响应/撤销/轮换/通知，并提供最小脱敏、可审计的结果（例如 `ROTATION_CONFIRMED_BY_OWNER` / `PUBLIC_NON_SECRET_VERIFIED` / `NOT_A_CREDENTIAL` / `ASSESSMENT_PENDING`），**不得在公开 Issue 附真实密钥或截图**。
3. Security Owner 再对**每一历史组**选择处置：`APPROVE_EXACT_HISTORY_EXCEPTION`（仅在满足安全政策、经审查的非秘密或已妥善治理历史风险情况下；记录精确 scope/path/category/fingerprint/reason/expiry）、`REJECT`、`REQUIRES_INCIDENT_REMEDIATION` 或 `HOLD`。审批不等于自动 PASS，必须 scanner 实跑通过才计。
4. 若安全处置要求**移除可达 Git 历史**，这是目前明确未授权的破坏性操作。需要另行获得具体安全/仓库治理批准和历史迁移方案；在批准之前继续 `BLOCKED_HISTORY_UNRESOLVED`。**禁止**借口安全清理而直接 force push/rebase。
5. 未有实际受审结论的组保持 BLOCKED，历史规则不关闭、不降级、不改写输出。

## 4. 汇总一次决策，不再由用户转达每条失败

请 Security Owner / A 或项目已授予其相应安全裁决权限的指定人员**直接在 [Issue #404](https://github.com/kanzakimy0/TravelAssist/issues/404) 回复一条**：

- **S1：** 五组 benign/synthetic 是否逐组批准精确历史例外；确切受审 ID、scope、expiry，附拒绝项。
- **S2：** 九组外部形态对应凭据所有者、安全事件评估责任人与安全处置状态，何种条件才允许**逐组**历史关闭。
- **S3：** 无法确认所有者/无法安全豁免的组明确保留 HOLD；若需特殊仓库历史治理，则另案申请授权，当前**没有**执行权限。

D1/D2/D3 原授权**无需再次申请**；S1–S3 是 D1 分类后发现的具体、独立历史风险处置，不可用“用户说继续”或一般代办授权代替最终凭据结论。

## 5. Codex / B 可以安全并行处理

- 继续保留原唯一 implementation PR #231 的 Draft/Open；不要推送含未判定外部凭据原文的源码候选，不开第二实现 PR。
- 获取本地 `dd967a7e92fa4fc7350c130595347c41ea7c2374` 的 QA、最终 `aggregate=12/12 PASS` native/canonical receipts、完整 Node 3943/3943、TASK-086 双重确定性回执的 SHA/hash 等**脱敏证明**，与原 Issue 的上一版 d77a 候选结果分清，不借用 GitHub 的旧验证。
- 核对原 PR 当前文档 HEAD、最新 develop 和受控源码工作树，正常 merge 文档历史；不覆盖未提交工作、不清理用户 worktree、不要 rebase/force push。
- 在 Owner 逐组决定后，仅添加**明确已准许**的精确历史条目并实跑 `npm run security:history`。必须记录当前/最终 HEAD、命中/豁免数、未决数和 run/attempt；未决 > 0 仍 FAIL。
- 若需修改 `package.json`、reviewed inventory、security tools、workflow 或任何被冻结输入，按已批准 D2/D3 规则重新绑定生成受影响的证据，不能以旧本地 aggregate PASS 作为新 HEAD 的最终证明。
- 只有 history/tracked 及所有本地强制安全门真正 PASS、无待处置敏感内容后才把**唯一原 #231** 源码正常发布。分别跑 exact-head 与当前 PR merge-result Hosted Security/Quality；失败不合并，全部通过后请用户最终验收并单独授权 merge。
- WBS 9.10 保留 `BLOCKED_HISTORY_UNRESOLVED`，Issue #404 保持 Open；实际合并与合并后 CI 成功之前绝不标 `已完成`。

## 6. 当前验收摘要

| 项目 | 现在可如实登记 |
| --- | --- |
| 本地 Node / Aggregate | 用户转达 **3943/3943 PASS / 12/12 PASS**；远端尚无相同 SHA 的机器验收文件 |
| Graph/Resume/Extraction/Rebuild | 用户转达 PASS；旧证明不得迁移到不同 SHA |
| 当前 Tracked / Boundary / Canary / Bundle | 本地先前记录 PASS，最终 HEAD 仍需绑定核验 |
| History | **47 次 / 14 组 unresolved**，当前最新远端 CI 为 FAIL |
| Source Hosted exact-head / PR merge-result | **NOT_RUN** |
| PR #231 / WBS 9.10 | Draft/Open / BLOCKED，未合并、未完成 |

**红线**：不输出秘密/不在线试密钥、不降扫描器或绕过测试、不加未经批准的例外、不改写历史、不强推、不自动合并、不虚报 PASS。
