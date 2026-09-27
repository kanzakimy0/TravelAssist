# TASK-068-B Recovery Amendment v1 — 已批准

批准依据：用户于 2026-09-18 明确指示“按恢复方案继续，正式编号不变”。

本修订覆盖 TASK/CODEX 中与旧主表恢复、occupied-only 加工范围、稳定编号排序及完整旧库验收相冲突的要求。其余来源、安全、43 维语义、可复现批次、QA、单一 Draft PR 和禁止自动合并要求继续有效。

## 当前加工范围

以 checkpoint 9c754136a4b2bf19a6c4e2e9a9cdbd12dc2cb1eb 的 10,369 个候选组为固定清单。保留 10,491 条原观察、所有历史编号声明及来源。清单键为既有 candidateKey/sourceRecordId，不是正式 Master Code。

63 个待复核身份组涉及 162 个候选，维持隔离，不为其猜测或合并属性。其余候选按现有证据处理；只有历史身份而缺少充分属性来源时，明确记录 SOURCE_UNAVAILABLE/REVIEW_REQUIRED，unknown 为 null。

失踪 v4.1 压缩包不再是候选加工前置。历史 17,000 库完整性、旧 2,979 编号及 175 个编号冲突仍未解决；不得将本修订解释为批准覆盖旧编号或重新使用未知空位。

## 数据与证据

- 复用共享 POIFeatureSetV1/PoiVisitProfileV1 语义和 43 个冻结 code/key/kind，不新建产品 schema。
- 候选 sidecar 使用来源身份作 poiRef，并标 candidate-only、不可用于正式 runtime。正式导入必须先有另外验收的身份映射。
- 非 null 标注有来源、观测日期、标注方法、置信度、理由及 versioned rubric。编辑评分不是官方评分。
- 不把旧主表评分、实体类别或无来源推测直接当成已核验属性。不把数据缺失转成 0/5。
- Visit Profile 没有时长/负荷证据的字段保持 null；不得套统一最短时长、固定/可变负荷比例。
- 静态交通只记录有依据的接入关系；当日时刻、票价、时长、可达性由已有 Route contract 承担。无付费/live provider。
- 邻接仅作候选生成，K≤20；不生成 all-pairs。历史估算坐标不支持“可步行到达”的结论。

## 批次与验收

使用 candidateKey 稳定排序，每批最多 200 个候选，自动续批、checksum、断点恢复、抽样 QA。所有清单项必须得到成功/部分/来源不足/身份隔离之一的明确结果，不无限等待用户确认普通批次。

--from-id/--to-id 在本修订中表示 candidateKey 边界；所有正式码仍保持原样。旧 occupied-only、正式码完整性验收标记 N/A_AMENDED 或 NOT_SATISFIED，不伪造通过。

全候选扫描完成后报告：清单总数、已评估数、隔离数、证据支持的特征数量、null 覆盖、Visit/Anchor/Neighbor 覆盖、待审清单、代码与数据 QA。保留原阶段审计与日志。

## 不变边界与交付

正式 Registry、已冻结契约、应用 runtime、DB/schema/migration、推荐参数、生产环境均不改。B Owner 和原执行分支不变。形成独立的正式接入提案，列出编号治理、引用审计、兼容映射和回滚条件；正式编号和产品导入仍需另行验收。

完成修订范围的实现、QA、Result 后推送该执行分支并创建一个 Draft PR → develop；不自动 merge，不关闭 Issue #393。

本修订只授权候选资料生产，不宣称旧文件已恢复，不认定其由今天清理删除，不要求用户继续查找。
