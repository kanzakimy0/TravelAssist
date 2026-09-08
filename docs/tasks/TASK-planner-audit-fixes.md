# TASK-PLANNER-AUDIT-A — Planner / Detail 七项审计修复

## Metadata

- Owner: A
- Status: 已完成（用户批准合并，本次七项修复已合入并验收）
- Issue: [#223](https://github.com/kanzakimy0/TravelAssist/issues/223)
- Branch: `codex/a-planner-audit-fixes`
- Base: `18afee5f02ed45505b81636f7b25b568270b2bf9` (`origin/develop`)
- WBS: 4.2 / 4.25 / 4.26 / 4.32 / 4.42 / 4.46（已有成果的审计修复，不另建重复业务项）
- Commit: `ecbf022ba8c8813b416afca3e4bd81947017c508`（实现；后续仅追踪文档同步）
- Pull Request: [#224](https://github.com/kanzakimy0/TravelAssist/pull/224) → `develop`；Merged，合并提交 `654dad9b8a4dbd9afb909e46f375872a7ede69d6`
- Result: `docs/tasks/RESULT-planner-audit-fixes.md`

## 正式来源与范围

2026-09-08 用户明确指示「合并」。核对 head `3db5f71` 和 develop 基线未变，无冲突；PR #224 合并后文件树与已验收 head 完全一致。此前 631 项测试、lint/typecheck/build 与浏览器验收仍适用于合并树；28 份既有格式问题不变。GitHub 未报告独立 CI checks，不宣称额外 APPROVED review。Issue #223 完成关闭；后续记录由 `codex/a-planner-audit-closeout` 仅文档收尾，不继续其他任务。下文 Draft 要求为实现阶段历史规则，本次合并以最新用户授权为准。

用户在 A 范围审计后批准「可以，全部修复」。仅修复此次确认的七项问题：

1. 保存的基线不能在进入 Detail 时被未保存 Planner 修改替换；Logo 离开仍有保护。
2. 向导新选方案与浏览器旧行程原子处理，不允许两个初始化过程竞争覆盖。冲突时明确确认，默认可先归档旧工作方案；取消保留旧保存。
3. 还原单个推荐保留当前日期范围、其他方案和偏好，仍可通过保存校验。
4. Detail 本地检查与时间建议计入已有交通耗时，未修改的 fixture 交通同样检查；未知交通不能声称可行。
5. 记录渠道取消后仍保留固定限制，另行确认才解除；保留取消记录，不发送外部请求。
6. 完成检查与可见的未安排三餐、住宿空槽共用规则；提醒可进入对应项目详情处理。
7. 图层按钮控制真实 Mapbox 的已有地理底图和 fallback；保留道路、地名、路线与项目交互，不重建 Map。

## Non-goals

不改页面布局和 B 的账号/服务端草稿实现。不接真实 AI、路线 API、预约、云保存或业务数据库。不操作真实订单。不覆盖原主目录未提交内容。Mapbox Token 仅用于本机预览，不提交。

## 验收

- 每个缺陷补充或修正回归测试，执行全部现有 Node 测试。
- `npm ci`、lint、typecheck、format:check、build、diff --check；若既有格式问题存在，单独验证基线并准确记录，不广泛重排无关文档。
- 浏览器验证保存/离开、向导新旧方案确认/归档、取消后释放保护、空槽处理、真实地图/fallback；桌面与手机检查。
- 更新 Result / WBS / Issue，提交推送并创建 Draft PR，不自动 merge。
