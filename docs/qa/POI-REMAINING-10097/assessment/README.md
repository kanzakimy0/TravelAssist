# 10,097 个 POI：逐条审查批次进度

本阶段承接已有逐条搜索回执，按用户要求逐批审读、判断和评分。搜索完成不等于本阶段完成。每个批次必须包含冻结顺序中的全部 200 条（最后一批 97 条），通过来源与 locator 哈希、候选合同、身份保护及输出校验后才写 checkpoint；下一批依赖前一批有效 checkpoint。

| 批次   | 逐条审查 | 有评分 POI | 支持的评分字段 | 静态交通关联 | 部分 Visit Profile | 批次 QA |
| ------ | -------: | ---------: | -------------: | -----------: | -----------------: | ------- |
| R-0001 |  200/200 |        186 |            538 |          131 |                  1 | PASS    |
| R-0002 |  200/200 |        199 |            461 |          134 |                  0 | PASS    |
| R-0003 |  200/200 |        189 |            468 |          113 |                  0 | PASS    |
| R-0004 |  200/200 |        176 |            400 |          135 |                  0 | PASS    |

R-0001：191 条至少有一种可支持事实，7 条已读来源尚无可支持属性，2 条缺少可用正文。未支持字段保留 null，并保留逐条原因及复查入口。538 为本批总字段数，包含此前已审的 73 个字段；本阶段补充 465 个字段。之前在 R-0011 另有 1 条评分 POI、3 个字段，不计入本批完成数。

Visit Profile 只接受金泽 21 世纪美术馆来源明确给出的最低 60 分钟；推荐/最长时长与步行、体力负荷仍为 null。李禹焕美术馆 45 分钟私人导览、夜间或特别活动时长仍保留为待核范围，未泛化为普通完整游览时长。

交通关联只表示来源明确描述的连接，不证明当前班次、票价、时间、无障碍或供应商 ID。候选 anchor 按名称与地区限定，正式 Registry 不变。

- 作者记录：`data/poi/full/sources/remaining-v1/assessment/R-0001.json`
- 已校验证据：`data/poi/full/reviews/remaining-v1/assessment/R-0001.json`
- 批次 QA：`docs/qa/POI-REMAINING-10097/assessment/R-0001.json`
- Checkpoint：`data/poi/full/manifests/remaining-v1/assessment/R-0001.json`
- 待查列表：`data/poi/full/reviews/remaining-v1/pending/R-0001.jsonl`

执行命令（CACHE 为本地保留证据目录）：

```powershell
python -X utf8 tools/poi/certify-remaining-assessment.py --batch R-0001 --cache $CACHE
node --import ./tests/register-route-ts.mjs --test tests/poi-remaining-review.test.mjs
```

相同输入与输出哈希的已完成批次返回 `SKIPPED_IDENTICAL_ASSESSMENT`。缺少、乱序、伪造或越界的注释不能获得 PASS；一个记录校验失败时仍检查其余记录并写错误列表。来源获取失败可作为有原因的待查结论，不能生成默认评分。

R-0002：200 条至少有一种支持事实，其中 199 条有评分、1 条仅有静态交通关联。本批新增 461 个有依据的评分字段、134 条静态交通关联，无完整游览时长证据，Visit Profile 不新增。营业时间冲突、搬迁线索、历史公告和未来计划均写入逐条待查原因。最初 2 条缺少空 accessFacts 数组的记录已修正，之后 200 条合同/定位/身份 QA 全部通过，实际重复执行返回 SKIPPED_IDENTICAL_ASSESSMENT；生成器确定性检查为 0 changed files。

R-0003：192 条至少有一种支持事实，其中 189 条有评分、3 条仅有静态交通关联；8 条已读目标来源没有足够属性依据。新增 468 个评分字段、113 条静态交通关联，Visit Profile 新增 0。琴平神社另取神奈川县神社厅正文，并保留旧地址与候选地址差异说明。200 条来源/定位/合同/身份 QA 全部通过，实际重跑返回 SKIPPED_IDENTICAL_ASSESSMENT；确定性检查为 0 changed files。

R-0004：177 条至少有一种支持事实，其中 176 条有评分、1 条仅有静态交通关联；20 条已读目标来源没有足够属性依据、2 条原身份隔离保留、1 条地址冲突待人工复查。新增 400 个评分字段、135 条静态交通关联，Visit Profile 新增 0。长等神社原页面存在编码问题，改用同一检索返回的滋贺县神社厅正文，并记录两来源本殿构造差异，不采纳冲突描述。首次 QA 因 2 条隔离记录缺少正文获取尝试而拒绝（保留 R-0004-initial-errors.json）；随后实际获取岐阜神社厅与青森旅游页核验地址，仍不解锁身份、不评分。最终 200 条来源/定位/合同/身份 QA 全部通过，实际重跑返回 SKIPPED_IDENTICAL_ASSESSMENT；确定性检查为 0 changed files。

当前全量任务仍在执行，已完成并认证 800 / 10,097。下一批 R-0005 自动继续，无需用户确认。
