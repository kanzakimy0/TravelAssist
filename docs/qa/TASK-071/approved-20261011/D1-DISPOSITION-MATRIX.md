# D1 逐组安全处置矩阵

D1 范围批准已执行；历史处置仍为 BLOCKED_HISTORY_UNRESOLVED。以下数量是原扫描器去重后的 findings，并非原始字符串出现次数。只列路径、类别和指纹，不包含匹配值。完整对象、提交与行号见 [机器矩阵](d1-history-matrix.json)。

| 组 | 历史路径 | 类别 | SHA-256 指纹 | findings | 离线分类 | 剩余决定 |
| --- | --- | --- | --- | --- | --- | --- |
| D1-H01 | .env.example | env-template-value | d4c999ae43633bd2036188d2bca68e1be8202b2cc1f3a1c42a728eaff7d2483d | 1 | BENIGN_CONFIGURATION_LITERAL | Security Owner 审核精确、限期历史例外；未应用 |
| D1-H02 | .env.example | env-template-value | 6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b | 1 | BENIGN_CONFIGURATION_LITERAL | Security Owner 审核精确、限期历史例外；未应用 |
| D1-H03 | data/poi/full/reviews/task-071/TASK-071-A-0009.discovery-v2.jsonl | jwt-token | 851eec6558a20f2445a3d49a5ea0d21088a9c7d23d2ff7e6950ee03f71dbcb8e | 1 | SUSPECTED_EXTERNAL_CREDENTIAL | 凭据所有者事件评估；Security Owner 决定历史风险处置 |
| D1-H04 | data/poi/full/task-073-b-identity-deep-null-targeted-43d/identity-remediation/sources/japan-travel-minobusan-kuonji.html | gcp-key | 8323f4d7fa338d7c4cb0fa4991e3878233e440c919458ce9f0c01c25b483561f | 1 | SUSPECTED_EXTERNAL_CREDENTIAL | 凭据所有者事件评估；Security Owner 决定历史风险处置 |
| D1-H05 | data/transport/network/next-source-actions.jsonl | aws-access-id | 2a93ab5870ef59c9f587c7f8d62180c08215095af14a6f3c1dea1da9394b274c | 8 | SUSPECTED_EXTERNAL_CREDENTIAL | 凭据所有者事件评估；Security Owner 决定历史风险处置 |
| D1-H06 | data/transport/network/next-source-actions.jsonl | aws-access-id | 15c17790c299acd0faab9b0cc8ecc35be629f3f9bb764741fe81d16601870509 | 1 | SUSPECTED_EXTERNAL_CREDENTIAL | 凭据所有者事件评估；Security Owner 决定历史风险处置 |
| D1-H07 | data/transport/network/next-source-actions.jsonl | aws-access-id | f299de938603a713d4960956e54210af9f5b39da26cffbaaaacfb088cc817859 | 1 | SUSPECTED_EXTERNAL_CREDENTIAL | 凭据所有者事件评估；Security Owner 决定历史风险处置 |
| D1-H08 | data/transport/network/next-source-actions.jsonl | aws-access-id | fa259226a181736bb32ef1e42371401307a7b1abea770be364d1a3e73e70e87f | 1 | SUSPECTED_EXTERNAL_CREDENTIAL | 凭据所有者事件评估；Security Owner 决定历史风险处置 |
| D1-H09 | data/transport/network/next-source-actions.jsonl | aws-access-id | 758667b6c01747f27f11cfb43ed71f6989522c5d56219435672c3520a7c50372 | 9 | SUSPECTED_EXTERNAL_CREDENTIAL | 凭据所有者事件评估；Security Owner 决定历史风险处置 |
| D1-H10 | data/transport/network/next-source-actions.jsonl | azure-sas | 1cbdf4a83456130d6ce76f5159fe3784870e69d256ef6e7a39b11aefbc056a8b | 8 | SUSPECTED_EXTERNAL_CREDENTIAL | 凭据所有者事件评估；Security Owner 决定历史风险处置 |
| D1-H11 | data/transport/network/next-source-actions.jsonl | azure-sas | 6bf24abd4011d6a9de9deacc2590621c9c90b0ed75c6b6cdac9f48131591522e | 11 | SUSPECTED_EXTERNAL_CREDENTIAL | 凭据所有者事件评估；Security Owner 决定历史风险处置 |
| D1-H12 | tests/task-076-ai-runtime.test.mjs | generic-credential | 64af848afc4e507188b584e1bf9bdece3fe17bce49e77a86a6f97004fd5face5 | 2 | SYNTHETIC_TEST_FIXTURE | Security Owner 审核精确、限期历史例外；未应用 |
| D1-H13 | tests/task-077-ai-conversation.test.mjs | generic-credential | 62af8704764faf8ea82fc61ce9c4c3908b6cb97d463a634e9e587d7c885db0ef | 1 | SYNTHETIC_TEST_FIXTURE | Security Owner 审核精确、限期历史例外；未应用 |
| D1-H14 | tests/task-080-a-poi-search-api.test.mjs | generic-credential | 43ed5c457b799abe72e15e5ce574960937404f72402c5c15837044c1fc1a3a4a | 1 | SYNTHETIC_TEST_FIXTURE | Security Owner 审核精确、限期历史例外；未应用 |

当前两项来源已脱敏；原始历史回执保持原字节，并通过独立 custody sidecar 校验脱敏副本。历史中的两组模板配置与三组合成测试已核实为非真实凭据；其余九组仍不推断有效期或撤销状态。统一决策入口为 [Owner matrix](OWNER-MATRIX.md)，精确待审方案为 [proposal](history-decision-proposal.json)。没有新增 allowlist 或重写历史。
