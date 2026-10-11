# TASK-071-A / WBS 9.10 — 历史风险离线结构复核与减量处置方案

**日期：2026-10-11（JST）。结论：运输数据 7 组共 39 次命中集中在旧采集日志中的带期限签名 URL，不是七套独立的长期明文云密钥；但这不是安全 Owner 已批准历史例外的证明。**

## 原始证据与受限方法

- 原历史决策提案：[history-decision-proposal.json](https://github.com/kanzakimy0/TravelAssist/blob/cfac88dfcb482cc0c96b6abdd702fd7a22a926aa/docs/qa/TASK-071/approved-20261011/history-decision-proposal.json)；[逐组 Git object/指纹](https://github.com/kanzakimy0/TravelAssist/blob/cfac88dfcb482cc0c96b6abdd702fd7a22a926aa/docs/qa/TASK-071/approved-20261011/d1-history-matrix.json)。
- 本轮使用 GitHub 只读 blob API 在隔离脚本中读取 **11 个不同的 transport 历史 Git blob**；不输出 URL 原值、不访问目标站点、不解码令牌、不验证可用性、不修改历史、scanner 或 allowlist。
- 仅抽取 JSON path/参数**名称**、URL 自带的时间元数据、原始字段是否为 `finalUrl`，并检查所有 11 个 blob，未以单个快照概括全体。
- 检查了 **40 个 AWS-style `finalUrl` 字段结构**以及 **38 个 Azure SAS-style `finalUrl` 字段结构**。字段在历史 JSON 的 `attempts[].sources[].finalUrl`、`sourcesChecked[].finalUrl` 重复出现；这 **78 次 URL 字段出现不等于 scanner 的 39 次 finding**（扫描对象、去重和历史文件版本口径不同）。
- 本轮检查的 78 个 `finalUrl` 结构均具有机器可解析的**URL 自述到期元数据**；推算到期范围 **2026-10-01T09:39:50Z—2026-10-02T03:05:29Z**，早于本轮 2026-10-11 检查时间。
- AWS 类查询参数结构：`AWSAccessKeyId`, `Signature`, `x-amz-security-token`, `Expires`（后者为 Unix 秒）；Azure 类结构：`st`, `se`, `sp`, `sv`, `sr`, `sig`（`se` 为 URL 自述 UTC 到期）。这些都是**参数名**，没有输出任何值。
- **不能据此声称**服务端当前确实拒绝这些 URL、相关云账户凭据已经撤销、没有滥用历史、所有归属/访问权限均合法。特别是带 `x-amz-security-token` 的历史链接属于需受控处理的历史证据；没有“自动安全”的推断。

## 把 47 次／14 组拆成三条真正不同的处置路径

| 分类 | 组 ID | 历史命中数 | 本轮可以确认的事实 | 合理的处置路径 |
| --- | --- | ---: | --- | --- |
| I 非密钥/合成值 | H01,H02,H12,H13,H14 | **6** | 已有离线 QA 证明数值型非凭据模板或 mock/fail-closed 断言 | Security Owner 可对**每个精确 fingerprint** 批准 history-only 限期例外；不能默认 |
| II 运输 URL | H05,H06,H07,H08,H09,H10,H11 | **39** | 11 个 Git blob 中的受影响值均位于 `finalUrl` 预签名访问链接；全部有已经过去的 URL 自述期限 | Security Owner 按组审查来源归属、链接权限、历史访问风险和过期元数据；由合适的源/凭据 Owner 提供无需公开秘密的历史风险评估，然后才决定精确历史处置 |
| III 外部 POI | H03,H04 | **2** | JWT-like 字符串出现在 `discoveredLeads[].url` 查询参数；GCP-like 字符串位于历史网页 **Google Maps 客户端 script URL** 的 `key` 参数 | 需要源网站/服务或凭据归属者确认访问范围、API 限制/计费、必要的撤销或轮换；无判断前 HOLD |

**注意：** 类别 II 的 `AWSAccessKeyId` 是签名 URL 查询字段中的访问 ID；并不能单凭 scanner 分类声称它是仓库的 AWS Secret Access Key。Azure `sig` 属于具有权限的签名访问证据。类别 III 中 GCP 客户端公开 API Key 也**不必然是无风险**，可能涉及项目限制和计费；JWT 不能仅靠外观判断是否失效。

## 真正能推动 9.10 结束的三步，而非再次跑测试

1. **立即做可批准性审核：** Security Owner 先独立审核 I 类五条精确历史候选；若证据充分，批准 path/category/fingerprint/scope=history/reason/expiry，不扩大扫描作用域。原 [逐组审批包](https://github.com/kanzakimy0/TravelAssist/blob/docs/task-071a-b-security-closeout-20261010/docs/qa/TASK-071/HISTORY-FINAL-DISPOSITION-DECISION-PACK-2026-10-11.md) 已逐项列出。当前仍为 `NOT_APPROVED`。
2. **对 II 类按“已过 URL 声明有效期的历史签名链接”复核，而非逐个追问 39 个云密钥：** 汇总其 11 个 blob、所属来源与采集权益、URL 到期证据；由安全治理/来源负责人确认历史残留的风险及是否需要持有者事件处理。**不能自行做网络测试**。只有有权 Security Owner 逐组批准，才可以做精确历史风险处置；否则 HOLD。
3. **III 类两条单列：** 由源网站/凭据所有者评估 JWT 链接与网页 Maps key 的限制/撤销/轮换需要。不掌握凭据所有者身份时明确记 `OWNER_UNIDENTIFIED`，不能以“访问过期”类推。若无法得到可接受的安全处置，WBS 9.10 保持 `BLOCKED_HISTORY_UNRESOLVED`；若安全政策要求改写 Git 历史，那是尚未获批的另案，不可由 Codex 擅自执行。

### 验收红线

- 本审查**不是**自动 allowlist、不是漏洞无风险证明、不是远程有效性测试，也不是 D1 原授权的扩展。
- 无法同时做到“全 Git 历史保持原样、未经批准不豁免任何历史命中”且“原 scanner history Gate 零未解决”；这三个约束本身互相冲突。必须通过**有权批准的精确历史例外**或**另案授权的历史安全治理**达成 Gate；不能绕过/抹除失败。
- 用户转达的本地候选 `dd967a7e92fa4fc7350c130595347c41ea7c2374`、Node 3943/3943、Aggregate 12/12 PASS 尚未获远端 exact-source/merge-result CI 验收。历史风险未处置前不能合并 PR #231、关闭 Issue #404 或把 WBS 9.10 标为完成。
