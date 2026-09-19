# 10,097 个 POI：逐条审查批次进度

本阶段承接已有逐条搜索回执，按用户要求逐批审读、判断和评分。搜索完成不等于本阶段完成。每个批次必须包含冻结顺序中的全部 200 条（最后一批 97 条），通过来源与 locator 哈希、候选合同、身份保护及输出校验后才写 checkpoint；下一批依赖前一批有效 checkpoint。

| 批次   | 逐条审查 | 有评分 POI | 支持的评分字段 | 静态交通关联 | 部分 Visit Profile | 批次 QA |
| ------ | -------: | ---------: | -------------: | -----------: | -----------------: | ------- |
| R-0001 |  200/200 |        186 |            538 |          131 |                  1 | PASS    |

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

当前全量任务仍在执行，尚未报告 10,097 条完成。下一批 R-0002 自动继续，无需用户确认。
