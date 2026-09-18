# RESULT — TASK-068-B 候选恢复 v1

状态：**批准修订范围的清单评估与恢复流水线完成；候选数据仍为部分覆盖，待验收。** 原始完整 occupied POI 库和旧主表没有恢复，也没有将其标为完成。

## 授权与边界

用户于 2026-09-18 明确批准“按恢复方案继续，正式编号不变”。[Recovery Amendment v1](AMENDMENT-TASK-068-candidate-recovery-v1.md) 覆盖原任务中以找回旧主表、occupied-only 和正式码排序为前置的条款。其余安全、来源、冻结语义、批次、QA 和单一 Draft PR 要求继续适用。

- Issue：[393](https://github.com/kanzakimy0/TravelAssist/issues/393)，Owner B，保持 Open。
- 执行基线：`45e9f8830ac66d03b3ace6480d36d3ee31907a2e`；执行前 fetch 已核实为 origin/develop。
- 任务发布：`1622eb076a9b023a643b845d66007f4eef7f83ad`。
- 分支：`codex/b-poi-partition-enrichment-transport-linkage`。
- 固定身份 checkpoint：`9c754136a4b2bf19a6c4e2e9a9cdbd12dc2cb1eb`，保留此前合并/来源审计提交。
- Draft PR：待创建；最终提交和 CI 以该 PR head/checks 及交付回执为准，不在提交中自引用 head。
- 没有 merge、关闭 Issue、产品导入、正式编号分配或部署。

## 身份及正式编号保全

全部 **10,491 条原观察**仍恰好保留一次，组成 **10,369 个候选组**；累计 122 条明确合并链接未改。candidateKey 是已有来源键，不是新的 Master Code。

来源为 8,169 条 Geoshape 两版/旧历史 ID 并集、2,138 条 B 累积候选、84 条跨族候选及 100 条 TASK-038 身份样本。没有采用 pilot 评分或把机器 benchmark 当成客观真值；TASK-038/039 的方法与 Human Gold 边界已复核。

Canonical Registry：`src/shared/data/master-code-registry.v1.json`，revision `task-043-candidate-r1`；50 个 active region、1 reserved，**0 个 canonical POI allocations**。这不是历史已占用 POI 总数为 0。

| 保全对象                          | 结果                                                                     |
| --------------------------------- | ------------------------------------------------------------------------ |
| Canonical Registry SHA-256        | `9efcc0b6172dacdabe846789430d1ed54de98f12827097e96a7651131bf044b2`，不变 |
| 原始观察 SHA-256                  | `6a60eab7d673a8b706ac1c6f404380b78913fc755dec543d60c1285fe5c01e6b`，不变 |
| 固定候选 JSONL SHA-256            | `4c8f6a4904cd85acafc9b355d3f5d8cf85fc6e00781751a657595db821812067`，不变 |
| 旧编号声明                        | 6,376 个不同 code claims，全部原样保留                                   |
| 两版一致声明                      | 4,846，仍非正式分配                                                      |
| 冲突                              | 175 个编号：167 个版本分配差异、8 个替换；未裁决、未改绑                 |
| 历史缺失映射                      | 2,979 个 source IDs 的旧 Master Code 仍未知                              |
| 身份隔离                          | 63 组、162 个候选；不填属性、不连交通边                                  |
| 原始 occupied 全库验收            | `NOT_SATISFIED`；历史 17,000 仅为文档声明                                |
| 本次正式码排序/occupied-only gate | `N/A_AMENDED`，采用固定候选来源键                                        |

保留的声明号段为 60000–69999：5,670；70000–79999：135；80000–89999：571，min/max 为 60000/80570。这些都不是已认证占用数。未知范围不视为空闲，不填新顺序编号。

## 批次与真实覆盖

**52/52 批已评估，10,369/10,369 条获得明确结果，尚未扫描条目为 0。** 每批最多 200，最后一批 169；全部是带待审缺口的完成状态，不是全属性完成。

| 结果                                              | 候选数 |
| ------------------------------------------------- | -----: |
| PARTIAL：有已复核来源的候选属性                   |     26 |
| REVIEW_REQUIRED：匹配保留来源，但尚无编辑属性复核 |    322 |
| SOURCE_UNAVAILABLE：没有匹配的保留属性来源        |  9,859 |
| QUARANTINED：身份隔离                             |    162 |
| 合计                                              | 10,369 |

SOURCE_UNAVAILABLE 不代表互联网不存在资料，只描述本轮保留证据覆盖。全量待审条目 **10,369**，与此前 239 组身份/编号/历史问题队列分别记录。

| 输出                                    |                                      数量 / 状态 |
| --------------------------------------- | -----------------------------------------------: |
| 完整 43-key 形状                        |                                           10,369 |
| 非 null 特征位                          |                       82 / 445,867（约 0.0184%） |
| null 特征位                             |                                          445,785 |
| 有评分的候选                            |                                  26（约 0.251%） |
| 部分 Visit Profile                      | 1；Kotokuin/Kamakura Daibutsu 的来源建议 30 分钟 |
| 完整时长上下限和负荷档案                |                                                0 |
| 名称范围化 Access Anchors               |                                               33 |
| 静态接入关系                            |                               35，覆盖 25 个候选 |
| 稀疏候选邻接                            |                 2 条有向边，共享奈良接入点；K≤20 |
| 正式导入 / live Provider / 生产 DB 写入 |                                                0 |

每个非空值均有 featureCode、冻结 kind、rubricVersion、编辑方法、sourceRefs、confidence、理由和原文本字符定位 hash。评分是候选编辑建议，**不是外部官方评分或独立人工金标准**。0 表示有依据的缺失，null 表示未知，未把缺失填为 0/5。

Visit 档案只填有依据的 recommendedDurationMinutes，其余上下限和负荷保持 null。没有从车程、登山单段时长或“全天”推算整场参观，没有固定/可变负荷比例。外层 CANDIDATE_ONLY 状态不能被内层契约 `active` 绕过。

交通点仍是限定地方范围的名称候选，没有 Provider ID；接入模式是来源描述的静态关系。时刻、票价、距离、旅程时长、换乘、无障碍、当前服务及可达性均未认证。邻接不宣称可步行，未生成 all-pairs。后续路线只能通过既有 7.5 contract 和事实新鲜度规则。

## 来源与校准限制

对 861 份本地保留 JNTO 页面建立索引，来源实际观测日期为 **2026-09-14**，未冒充当天重新联网验证。其中 737 份检测到正文，15 份有混合其他页面的尾部，字符定位必须落在本目标内容范围内。

本轮完整阅读复核 56 页：50 页形成有限事实摘要，6 页正文不足。50 页中只有 26 页能通过既有候选的 URL、名称/别名和都道府县同时匹配；24 页证据留档未挂入候选，没有新增候选或擅自做身份链接。证据表中其他 2 个时长建议亦未导入固定清单。

来源层级为官方旅游机构。保留源文件 SHA、正文 hash、有限事实释义和定位 hash；**未提交整页文章或 raw Provider payload**。没有 paid/live Provider 或无控制抓取。

43 维使用单一 versioned rubric，包括定义、0/3/5/7/9 锚点、依据、反例和 null 条件。山寺/金刀比罗宫的大量台阶采用较高标准参观负担，松本城陡峭室内楼梯采用中等负担；这不是个人疲劳估计。unique/hidden/iconic、全站无障碍、当前 crowd/queue 等缺少比较或适用范围的维度保留 null。样本有限，**不足以证明不存在地区或类型偏差**，未调推荐参数。

## QA 与可重现性

- 身份组合测试 **19/19**；新增候选恢复测试 **12/12**。
- Planning contract **21/21**；soak **6/6**；Master Registry **15/15**；region integration **6/6**；routing **28/28**。
- Candidate full Node **2,666/2,666**，0 fail、0 skipped。
- `npm ci`、lint、typecheck、build、deployment local validation/build/artifact、format deploy 均执行并通过。
- 52 批 checksum-identical resume 全部跳过；完整重建检查通过。
- 注入输出损坏与不完整 receipt：check 正确失败，指定批次 resume 重建后通过。
- 修改 rubric 输入 hash：全部 52 批失效并重算；恢复原 rubric 后再次重算，最终检查通过。
- from/to candidateKey dry-run 不写入，受限执行不冒充全量完成。
- 独立磁盘审计核对 **232 个输入/输出 checksum**，并验证保全、provenance、引用、隔离、时长和 K 上限；凭据模式扫描 218 个数据文件，0 命中。
- 原保留缓存与所有已采用定位核验通过；机器抽样每整批 20 项、尾批 17 项，共 **1,037** 项，明确不是人工验收。
- Task-owned 手写文件格式与 git diff whitespace 检查在提交前执行；机器数据采用生成器的固定 LF/JSON(JSONL) 字节格式，由重建 hash 验证。
- 没有运行或宣称本轮 Supabase/Auth runtime、Production/Staging、付费服务验收；该数据旁路没有涉及 DB/schema。

完整命令、退出码、日志 hash 见 [QA](../qa/TASK-068/README.md)、[gates](../qa/TASK-068/gates.json)、[实际批次故障/恢复记录](../qa/TASK-068/batch-runtime-proof.json)、[独立审计](../qa/TASK-068/candidate-audit.json)。GitHub Quality gate 以最终 PR head 的外部运行回执为准，本地 gate 不代替远端 PASS。

## 交付与后续

- [候选数据与运行方式](../../data/poi/full/README.md)：CSV/JSONL、43-key sidecars、Visit、Anchor、Neighbor、版本化 rubric、52 批 checkpoint。
- [正式接入提案](../architecture/poi-candidate-recovery-integration-proposal-v1.md)：引用审计、不可覆盖旧码、映射验收、属性复核、兼容与回退。
- [此前身份阶段结果](../qa/TASK-068/identity-checkpoint-result.md) 原样保留；旧文件搜索不再是候选工作的前置。

下一步是验收这套恢复旁路及其有限候选数据，再单独决定补证据和正式接入任务。本次不把 TASK-068 原始全库标为已完成，不释放未知号位，不改变现有主系统业务逻辑。
