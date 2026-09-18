# RESULT — TASK-068-B（唯一候选列表 checkpoint）

## 状态与范围

**用户追加要求“先进行组合，生成唯一列表”：已完成。**

**完整 TASK-068-B：Blocked / Identity Conflict；未完成富集验收。** 本阶段按照 Task §3/§5 在稳定编号冲突处保存 checkpoint。没有为缺失编号猜测映射，没有把候选列表冒充正式 occupied Registry。

- Issue：[#393](https://github.com/kanzakimy0/TravelAssist/issues/393)，保持 Open。
- Owner：B，用户授权全部 00000–99999 已占用 POI；TASK-069-A / #394 已被取代。
- base：`45e9f8830ac66d03b3ace6480d36d3ee31907a2e`。
- task publication：`1622eb076a9b023a643b845d66007f4eef7f83ad`。
- branch：`codex/b-poi-partition-enrichment-transport-linkage`。
- 起始审计提交：`a120efb`；首次合并数据 checkpoint：`551a9e794a5b7b9f29fbbd0d13bec0ff648946a1`。最终内容包括后续 LF/checksum 校正与本 Result，以该执行分支 HEAD 为准。
- Draft PR：未创建。Task 要求全部 occupied POI 完成后才创建最终 Draft PR；当前没有达到该条件。

## 交付

- [唯一候选列表 CSV](../../data/poi/full/registry/combined-candidates.v1.csv)：**10,422 行**，UTF-8 BOM，12 列。
- [无损 JSONL](../../data/poi/full/registry/combined-candidates.v1.jsonl)：保留全部来源记录及地址、坐标和编号声明。
- [旧编号冲突 CSV](../../data/poi/full/registry/master-code-conflicts.v1.csv)：175 个编号，350 个绑定。
- [数据说明](../../data/poi/full/README.md)、[QA](../qa/TASK-068/README.md)、[checksum checkpoint](../../data/poi/full/manifests/combination-checkpoint.v1.json)。

CSV 可直接导入 Excel。`candidateKey` 使用已有 source ID，是本次候选组的定位键；**不是新 Master Code**。正式 `canonicalMasterCode` 全部留空，旧编号完整保留在 `legacyCodeClaims`。

## 来源审计与合并

检查了 261 个 remote refs（包含 origin 符号别名）、247 个 open/closed/merged PR metadata、32 个相关 PR exact heads，以及历史 Git 对象、Actions 制品和本地先前 POI 输出。具体 SHA、路径和制品状态见 [source-inventory.json](../qa/TASK-068/source-inventory.json)。

| 输入                                               | 唯一来源记录 |
| -------------------------------------------------- | -----------: |
| Geoshape v3.8、v3.7.1 与旧 2,979 source IDs 的并集 |        8,169 |
| 最新 B 累积候选（含原 1,355 条 proposed 编号）     |        2,138 |
| 本地跨族推荐候选                                   |           84 |
| TASK-038 Wikidata 身份样本                         |          100 |
| 合计                                               |       10,491 |
| 按明确名称、地区、地址证据合并                     |          −69 |
| 输出候选身份组                                     |   **10,422** |

同一 source ID 已去重；额外 69 次跨来源合并的双侧证据和编辑理由逐项保存。没有仅按同名、同坐标或同编号合并。全部 10,491 条原观察在 JSONL 中恰好出现一次；9 份原始输入文件的 SHA-256 均保持一致。

“唯一”只保证已明确合并规则下的候选组唯一。还有 **224 组**同名同地区线索未裁决，可能是重复，也可能是同名不同实体；该清单不是现实世界所有 POI 已完全消歧的证明。

此前提及的“9,000 + 8,000”不能作为已占用总数：实际查明仓库 9,000 条 attraction manifest 是未解析的素材配额槽位，本次没有当作 POI 导入。300 条 destination rows、50 条 canonical region allocations 和 reserved sentinel 也没有计入 POI。

## 编号保全与缺口

Canonical Registry 为 `src/shared/data/master-code-registry.v1.json`，revision `task-043-candidate-r1`，governance status `candidate`。其中 51 个 entry：50 个 active region、1 个 reserved sentinel；当前 canonical POI allocation 为 0。文件未修改。

外部表保留了 6,376 个 distinct legacy code claims：

| 声明号段    | 编号数 |
| ----------- | -----: |
| 60000–69999 |  5,670 |
| 70000–79999 |    135 |
| 80000–89999 |    571 |

这些是历史 effective/proposed 声明，**不是 6,376 个已确认 occupied POI**。声明 min/max 为 60000 / 80570。实际全库 occupied 总数、号段分布及 min/max 尚未锁定，均记为 null。

两个各 5,021 条的历史版本都使用 64409–69429，但其中 **175 个编号绑定了不同身份**。例如 64426 在 v3.8 中指向「長命寺」，在 v3.7.1 中指向「鉾ノ木貝塚」。v3.7.1 实际生成时间较晚，且被后续 enrichment workflow 使用；版本较新仍不足以授权替换既有 stable identity，因此保留两者并标冲突。

过期的 v3.7.1 制品已用原脚本和同一原始 CSV 重建，SHA-256 `e42300b3a486acb812d27928522d92db07d97dd94b0a2e65b80e634968c6fdcb` 与原 [CI run 34542822317](https://github.com/kanzakimy0/TravelAssist/actions/runs/34542822317) 完全一致。旧 2,979 条 source IDs 的名称和历史位置也已恢复，Master Code 映射未找回，保持未知。证据见 [recovery-proof.json](../qa/TASK-068/recovery-proof.json)。

Geoshape 采用 [CODH 历史地名数据与 CC BY 4.0](https://geoshape.ex.nii.ac.jp/nrct-poi/)，署名与转换说明随数据保留。历史位置不能当作当前导航/运营事实。B 来源继承原研究 URL，本次没有逐条重新抓取；pilot 只导入身份，没有导入评分。

## TASK-068 完整验收字段

| 项目                                     | 本次状态                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| total occupied POIs / remaining          | 未知；身份 gate 未通过                                                               |
| processed occupied POIs                  | 0                                                                                    |
| batch total / completed / partial        | 未定 / 0 / 0                                                                         |
| 43-key shape complete                    | 0，未运行 enrichment                                                                 |
| feature known/null coverage              | null，未测量                                                                         |
| Visit Profile coverage                   | null，未生成                                                                         |
| transport anchor coverage                | null，未生成                                                                         |
| neighbor edges                           | 0，未生成                                                                            |
| review queue                             | 400 个分组任务：175 编号组 + 224 名称组 + 1 历史映射组                               |
| source tiers                             | 历史公开研究数据、原本地官方/旅游来源研究、Wikidata pilot 身份；未宣称当前属性已验证 |
| stable IDs changed / allocated           | 0 / 0                                                                                |
| canonical / runtime / DB / Provider 修改 | 0                                                                                    |

剩余工作为权威编号裁决、历史映射恢复或正式治理决策、疑似重复复核，随后才能锁定 occupied population 并启动 43 维、Visit Profile 和 sparse transport enrichment。200 项 batch 的自动续跑尚未实现或认证。

## 实际 QA

- `npm ci`：PASS。
- TASK-068 合并测试：**11/11 PASS**；覆盖来源和声明无损、175 个编号冲突保留、同名异址分开、决策证据漂移拒绝、未知编号不补号、边界/类型校验、顺序无关、校验和篡改拒绝、CSV 转义与 LF。
- 独立 Python CSV 解析：10,422 行、12 列、10,491 个唯一 source IDs；PASS。
- `--check`：生成文件逐字节一致；Git blob 校验确保换行转换不破坏 checkpoint。
- Planning contracts **21/21**；Planning soak **6/6**；Master Code registry **15/15**；region integration **6/6**；routing **28/28**：全部 PASS。
- `npm run lint`、`npm run typecheck`、`npm run build`：PASS。后续只修改离线合并工具/报告，补跑工具 lint 与合并测试。
- Task-owned formatter、`git diff --check`：PASS。

首轮新工具测试曾发现 numeric code 被正则隐式转换，已要求五位字符串；提交审计又发现 CSV 的 CRLF 会被仓库规范转换，现统一 LF 并加入回归。上述均为本次工具修正，不涉及产品语义。

未执行的 gate 不记 PASS：完整 TASK-068 enrichment/batch 验收、全仓 Node suite、Local Supabase、部署及 GitHub final-head Quality Gate。未执行任何 paid/live Route Provider 调用。完整证据见 [gates.json](../qa/TASK-068/gates.json)。

当前停在已保存的身份合并 checkpoint；Issue #393 和 WBS 进行中状态保持，未创建最终 Draft PR、未 merge。
