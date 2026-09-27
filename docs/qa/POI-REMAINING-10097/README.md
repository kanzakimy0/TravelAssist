# 剩余 10,097 个 POI：待查名单与补证记录

本轮由用户授权，按地点名、都道府县和分类综合查询；每批 200 条，最后一批 97 条。不确定项目保留 null，进入待查名单，供后续重复查询或人工审核。

当前工作仍在进行，实际完成范围以 `review-summary.json`、各批 search receipt 与 review receipt 为准。不能把网页成功返回、搜索结果或历史地名目录当作已完成评分。

## 查找一条待查记录

- 名单：`data/poi/full/reviews/remaining-v1/pending/R-0001.jsonl` 至 `R-0051.jsonl`。
- 每行记录保留 candidateKey、地点名、都道府县、类别、查询词、已核查来源、未解决字段与 nextAction。
- `IDENTITY_CONFLICT`：人工核实原身份冲突，禁止自动改绑。
- `HISTORICAL_METADATA_ONLY`：目录仅有历史名称/位置，需查目标官方页面与现存状态。
- `TARGET_BODY_NOT_YET_ADJUDICATED`：已取回页面，但尚未逐字段完成内容审读；不能报告为评分完成。
- `TARGET_LINK_UNPROVEN`：同名或页面目标关系未确定，需比对地址、别名、行政区域。
- `SOURCE_UNAVAILABLE`：来源失败，按 checkedSources 的具体状态重试或寻找替代官方来源。
- `UNSUPPORTED_FIELDS_REMAIN_NULL`：已有部分评分，剩余字段继续待查。
- `NOT_YET_CHECKPOINTED`：该批综合搜索尚未形成已校验回执，不代表已查询。

## 证据与当前候选数据

原 TASK-070 数据与回执保持不变。新的 `data/poi/full/manifests/current-candidate-review.v1.json` 明确指向冻结基线及本轮增量；按 candidateKey 应用 feature delta 即得当前候选视图。增量只有经过明确审读与 locator/hash 验证的字段，不能进入生产 Registry 或运行时。

审读输入：`data/poi/full/sources/remaining-v1/editorial.json`。正文不全文提交，只保留来源、内容哈希、定位、置信度与评分理由。固定 rubric 沿用 `candidate-recovery-1.0`，不是官方评分，也不是人工独立金标。本轮 0.8 表示编辑判读置信度，不是经过统计校准的概率。

原始缓存保存在主仓库下的 `outputs/poi-remaining-20260919/source-cache`，包含 raw、text、search；它不是本工作树内的临时文件。需连同 Git 证据一起备份，不能当作无用缓存清理。历史目录使用 CODH 的『日本歴史地名大系』施設・地点項目データセット（CC BY 4.0，doi:10.20676/00000456）；历史坐标不能直接用于导航。

## 复查与恢复

```powershell
python -X utf8 tools/poi/review-remaining.py --cache <source-cache>
python -X utf8 tools/poi/review-remaining.py --final --cache <source-cache>
python -X utf8 tools/poi/review-remaining.py --final --check --cache <source-cache>
```

第一条可更新进行中的名单；后两条要求全部 51 批真实来源核验和综合搜索回执齐全。相同输入自动保持已写回执与时间戳；哈希不符不能报告通过。单条审读错误进入 error queue，不为该条写分，也不阻断其他候选生成。

复查时保留原 candidateKey、旧编号声明、正式编号与 Registry；新证据追加审读记录，不能为了清空名单填默认 0/5。未安排定时任务；后续重查时间由再查询任务或人工决定。

## 人工入口与查询恢复

从 [待查索引](pending-review-index.md) 打开每批 200 条的中文名单；机器记录中的 `searchEvidencePath` 指向实际搜索索引，`queryGroup` 定位对应的四查询响应。分组返回的 URL 只作为未验证线索，不能把该组所有命中都关联给同一个地点。

搜索执行器使用固定 `queries.json` 中的查询。每次最多四个查询，写入真实工具响应后才能调用 `index-remaining-search.py <source-cache> R-xxxx`。已有同一候选、同一查询、内容校验通过的缓存自动跳过；失败或缺失缓存须重查，不能补造结果。14 个最初格式的缓存没有记录工具完成时间，索引只校验它们已有的文件和响应 SHA，不补造时间。

合并候选视图的只读校验命令：

```powershell
node --import ./tests/register-route-ts.mjs tools/poi/read-current-candidates.mjs
```

该视图保留唯一 candidateKey、原 272 个已评分候选和 165 条身份隔离。原 TASK-070 manifest 是历史基线；本轮唯一候选视图由 current-candidate-review manifest 解析，不得同时把基线与 delta 当作两个候选列表导入。

所有生成证据采用 UTF-8 / LF 并按生成器自身格式校验；不要单独格式化已写回执所引用的 JSON/JSONL/生成 Markdown。普通代码和说明文档用仓库 Prettier。运行前的缓存完整性检查已覆盖损坏正文重新获取、UTF-16 定位哈希、单条失败继续和内部地址拦截。

执行环境记录：Node 24.18.0、Python 3.14.6、requests 2.34.2。网络采集依赖锁定在 tools/poi/requirements.txt；离线回归使用模拟传输，不访问网络。
