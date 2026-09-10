# TASK-WBS-4.20.1-B — Engine Contract Amendment

## Metadata

- Task ID: TASK-WBS-4.20.1-B
- Owner: B（用户明确指定的 Engine 单项责任）
- Status: 待验收
- WBS: 4.20.1；父4.20保持原审查状态，4.21未开始
- GitHub Issue: [#282](https://github.com/kanzakimy0/TravelAssist/issues/282)
- Branch: `codex/b-engine-contract-amendment`
- Depends On: 已存在4.20 Contract、4.17 canonical v1.0；新增输出发布前A/B review
- Execution Base: `fe538e7093bd58e7d0fe7fd434bf907dd132277a`
- Commit: `3117af3ca734a1eab1f18ed1d0d98131c05be09d`（Amendment；后续仅追踪）
- Pull Request: [Draft PR #283](https://github.com/kanzakimy0/TravelAssist/pull/283)

## Scope

按Issue #282增量补充现有 [Engine Contract](../architecture/travelassist-engine-contract.md) §24。保留§1–23的ChangeSet、白名单、validate/preview/apply/rollback、安全与持久化边界；不重做4.20。

- 43字段属于Attraction/Profile/Rule输入引用，不复制进ChangeSet。
- 输出duration-too-short、compressed visit、physical load、fatigue impact、schedule conflict、day overload及itinerary reasonableness。
- 区分accepted、warning、needsConfirmation、blocked、unsupported；兼容顶层既有outcome。
- 审计canonical duration并保持UPDATE_DURATION unsupported。
- 提供清水寺60/90分钟阈值、30/90分钟计划和实际负荷关系的设计案例。
- 公式、阈值政策、疲劳累计及景点规则库留4.21及后续，不在此冻结或实现。

## Verification / Delivery

运行锁定依赖安装、lint、typecheck、build、Node全仓测试、仓库格式检查及修改文件格式/差异检查；既有失败单列，设计案例不冒称runtime测试。

更新本Task、4.20.1 Result、Master WBS和Issue #282，提交并建立Draft PR → develop。待用户验收，不能自动合并；4.21保持未开始。

## Audit

已完整读取Issue #282、原4.20 Task/Result、最新Master WBS与Contract、canonical PlanItemV1及协作/追踪/质量门。原Result含PENDING及历史“未合入”描述，本轮不重写其历史；以实际develop中的Contract为增量基线。PR #238仍Draft，#266/#268为未合并设计/集成审查，不把其候选公式当已冻结规则。

## Non-goals

不改Planner/Detail UI、canonical Trip Plan、Engine runtime、DB/API/AI/Mapbox/Booking/Payment、Provider或素材；不启动4.21。

## Delivery

见 [完整Result](RESULT-WBS-4.20.1-b-engine-contract-amendment.md)。Contract §24与14项增量设计验收已交付；工程检查通过项及三项资产/47项格式基线如实记录，4.21未开始。
