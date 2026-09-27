# TASK-070-B Result — P0 POI Evidence Review

状态：322/322 已完成编辑核查，本地全部必要 gates 通过；[Draft PR #397](https://github.com/kanzakimy0/TravelAssist/pull/397) 待用户验收。

- Issue：#396；Owner：B。
- 执行分支：`codex/b-task-070-p0-evidence-review`。
- 上游：TASK-068 / Draft PR #395，`f5dcca969f72447d3f029781be0fb75ec66414f7`。
- 发布基线：`2f12bb8d8186c73b6a1bf4df9012da444b689c66`；开始时 develop：`45e9f8830ac66d03b3ace6480d36d3ee31907a2e`。
- 第一批 checkpoint commit：`6853a3041a4bb77da6a7cb0ba14b342affe810d6`；完整数据/QA commit：`d2957478f639ea91cd9b1e571a490f867cea332c`。
- Draft PR：[#397](https://github.com/kanzakimy0/TravelAssist/pull/397)，base 为 `codex/b-poi-partition-enrichment-transport-linkage`。
- 最终 head 为 PR #397 的 head（包含本交付文档提交）；精确 SHA、Quality Gate run URL 和结论记入 PR 描述及最终交付消息。最终交付必须等待该 SHA 的 Quality Gate PASS，不能使用上游或前一个提交的 PASS。

## 两批执行

固定 candidateKey 升序，第一批全部完成、QA、receipt 后自动进入第二批，没有中间人工确认。每批 receipt 最后写入；相同输入 checksum、有效 receipt 和输出自动跳过。原 52 个分区继续承载当前 sidecar，另建的 P0 manifest 只负责执行追踪，不创建第二套候选身份或属性真值。

| 指标                                 | P0-0001 | P0-0002 | 合计 |
| ------------------------------------ | ------: | ------: | ---: |
| 核查候选                             |     200 |     122 |  322 |
| REVIEWED_PARTIAL                     |     147 |      99 |  246 |
| REVIEWED_NO_SUPPORTED_ATTRIBUTE      |       1 |       0 |    1 |
| REVIEW_BLOCKED_EVIDENCE_INSUFFICIENT |      51 |      21 |   72 |
| REVIEW_BLOCKED_IDENTITY              |       1 |       2 |    3 |
| 新增非 null 43 维字段                |     446 |     332 |  778 |
| 新增部分 Visit Profile               |       2 |       0 |    2 |
| 新增静态接入关系                     |     123 |      84 |  207 |
| blocked                              |      52 |      23 |   75 |
| processing error                     |       0 |       0 |    0 |

两批 Batch QA：PASS。未处理 P0：0。review/error queue 有 76 条独立候选：75 条 blocked，加 1 条无可安全提取属性；没有未报告失败。

## 覆盖变化

| 全候选库指标                        | Before |  After | 新增 |
| ----------------------------------- | -----: | -----: | ---: |
| 候选总数                            | 10,369 | 10,369 |    0 |
| 至少一个非 null 评分的 POI          |     26 |    272 |  246 |
| 非 null 评分位                      |     82 |    860 |  778 |
| 部分 Visit Profile                  |      1 |      3 |    2 |
| Access Anchor（唯一名称范围化节点） |     33 |    213 |  180 |
| 静态接入关系                        |     35 |    242 |  207 |
| 原有邻接边                          |      2 |      2 |    0 |

P0 内有评分的候选为 **0 → 246**；P0 剩余 null 为 **13,068 / 13,846**；全库剩余 null 为 **445,007 / 445,867**。完整 Visit Profile 仍为 0，新档案仅有明确数值依据的推荐时长，其余时长与负荷未知。Anchor 是名称和地方范围标识，不是 Provider ID。

最终全库状态：原有 `PARTIAL` 26；P0 四种状态分别 246 / 1 / 72 / 3；`SOURCE_UNAVAILABLE` 9,859；`QUARANTINED` 162；`REVIEW_REQUIRED` 0。

## 证据与保守边界

仅阅读 TASK-068 保留缓存中各目标的完整 frozen target-content boundary，没有抓取新网页。原始缓存 SHA 和 861 篇索引正文 hash、322 条目标边界、987 个新增事实 locator 均已实测核验。每个非 null 评分可回溯 frozen rubric、sourceRefs、confidence、编辑理由、字符定位与 hash；分数是候选编辑标注，并非来源官方分数或独立 Human Gold。

证据不足的 72 条主要仅有地址、导航、分类元数据。3 条身份冲突保留 null；1 条主殿候选的正文描述整个寺院，不能安全把整寺事实赋给主殿。有关周边景点、可选登山、部分活动时长、模糊访问范围及旧运营信息的内容均限定用途，未自动填 0/5。定位边界之外的推荐卡片没有用于评分。

最终复核撤回位置 320 的教育评分：祭司引导准入不足以证明教育讲解，故恢复 null。另纠正了两项交通标注：位置 3 的来源只说明最近车站，没有明确 road 关系，已删除该连接；位置 201 的明确公交站修正为 `bus_stop`。第一批历史 checkpoint/proof 保留，当前 receipt 和 aggregate 已重新生成并校验。

## 身份及 Registry 保全

| 文件                          | Before SHA-256 = After SHA-256                                     |
| ----------------------------- | ------------------------------------------------------------------ |
| canonical Registry            | `9efcc0b6172dacdabe846789430d1ed54de98f12827097e96a7651131bf044b2` |
| combined candidate identity   | `4c8f6a4904cd85acafc9b355d3f5d8cf85fc6e00781751a657595db821812067` |
| 原始 observation / 旧编号声明 | `6a60eab7d673a8b706ac1c6f404380b78913fc755dec543d60c1285fe5c01e6b` |

formal Master Code 分配变更 **0**；Registry 改绑 **0**。175 个旧编号冲突和 2,979 个未知历史映射不在此任务裁决范围。既有 TASK-068 审计、rubric、证据和身份清单保持原字节；当前输出由 `p0-current.v1.json` 验证，旧 TASK-068 输出 hash 仍对应其历史接受版本。

## QA 与恢复

- 11 个 TASK-070 focused tests：覆盖精确 200+122、43-key/provenance、null、身份/locator fail-closed、单候选失败继续、真实隔离写入、自动续批、checksum skip、缺失/非法时间 receipt、损坏 JSONL 重建、编辑证据与工具 hash 变化失效。
- 独立磁盘审计：全部 10,369 候选；208 个 feature/visit/access/neighbor 分区保全检查；173 项输入/输出 checksum；173 个数据/输入文件凭据扫描，0 finding。
- 真实 retained cache 校验、两批 skip、第二批 receipt 恢复、损坏输出恢复及最终重新检查：见 `recovery-proof.json`。没有把未执行的 gate 报为 PASS。
- 最终全仓 Node：**2,677 / 2,677 PASS，0 skipped，92 个文件**；TASK-068 31、planning contract 21、planning soak 6、Registry 15、region graph 17、region integration 6、routing 28 均 PASS。npm ci、lint、typecheck、format:check:deploy、build、deploy:validate:local、deploy:build:local、deploy:verify-artifact、git diff --check 均已执行并通过。
- 首次 Windows glob 运行选中 0 个文件，不计 PASS；本地显式 runner 的文件数保护条件初设错误后修正，最终显式执行 92 个文件。失败/无效历史保留，分别由 final gate 取代。
- 全仓 gates 的命令、实际时间、退出码、测试数量和本地日志 hash：见 `gates.json`。完整日志保留在本 worktree 的 `.artifacts/task070-qa/`。
- 隔离测试临时目录在 finally 内验证路径范围后删除；正式缓存和用户文件未清理。

当前 P0 工具修复了 receipt 完成时间非法仍可能被比较式接受的问题；新增测试用 `completedAt: invalid-date` 重现并要求重建。queue 计数按独立候选统计，包含无可支持属性结果，避免 processing error 重复计数。没有修改产品 runtime。

## 交付与停止点

- [QA README](../qa/TASK-070/README.md)
- [Aggregate](../qa/TASK-070/aggregate.json)
- [P0-0001 QA](../qa/TASK-070/P0-0001.json) / [P0-0002 QA](../qa/TASK-070/P0-0002.json)
- [Recovery proof](../qa/TASK-070/recovery-proof.json) / [Independent audit](../qa/TASK-070/independent-audit.json)
- [Review/error queue](../qa/TASK-070/review-error-queue.jsonl)

[Draft PR #397](https://github.com/kanzakimy0/TravelAssist/pull/397) 按 TASK 叠在 #395 实现分支之上；[Checks](https://github.com/kanzakimy0/TravelAssist/pull/397/checks) 可核验最终提交结果。不会修改或合并 #395，不自动合并本 PR，不关闭 #396。Production DB/runtime 写入 0；live/paid Provider 调用 0；P1 **未启动**。等待用户验收。
