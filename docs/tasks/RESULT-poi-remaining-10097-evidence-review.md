# 剩余 10,097 POI：补证尝试与待查名单 Result

用户授权：每批 200 条处理剩余 10,097 条，按地点名、都道府县及分类综合查询；不确定项保留 null，进入后续重复查询/人工审核名单。本继续任务没有另行分配 TASK 编号。

执行分支：codex/b-poi-remaining-10097-evidence-review。基线为 TASK-070 的 302d84431158f6637e36f84a6e1ffbfb6b8af935；原 Draft PR #397 和 #395 保持不变。本次下游 [Draft PR #398](https://github.com/kanzakimy0/TravelAssist/pull/398) 以 #397 的实现分支为 base，不自动 merge 或关闭 Issue。

## 逐条审查继续执行中（2026-09-19）

按最新无人值守授权继续以 200 条为一批进行完整证据审查。R-0001、R-0002、R-0003、R-0004、R-0005 各完成 **200/200**，共 **1,000/10,097**，均获得独立 `ASSESSMENT_QA_PASS` checkpoint；相同输入重跑均实际返回 `SKIPPED_IDENTICAL_ASSESSMENT`。下一批 R-0006 自动继续。尚未将全量任务报告完成。

R-0001 有 186 个评分 POI、538 个评分字段、131 条静态交通关联和 1 个最低时长部分 Visit Profile。R-0002 有 199 个评分 POI、461 个评分字段、134 条静态交通关联，Visit Profile 新增 0。R-0003 有 189 个评分 POI、468 个评分字段、113 条静态交通关联，Visit Profile 新增 0。R-0004 有 176 个评分 POI、400 个评分字段、135 条静态交通关联，Visit Profile 新增 0；20 条无可支持属性、2 条原身份隔离、1 条地址冲突待查。R-0005 有 172 个评分 POI、477 个评分字段、80 条静态交通关联，新增 2 个部分 Visit Profile；10 条无可支持属性、11 条原身份隔离、4 条身份冲突待查。未支持字段及具体原因继续留在待查名单。当前候选视图为 1,195 个有评分 POI、3,207 个非 null 字段（含原 272 条及早先 R-0011 的 1 条评分）；累计新增 593 个候选 anchor，正式编号与 Registry 均未变。

每批实际执行候选视图/43 维/Visit 合同、来源原文与 locator 哈希、受保护身份与原评分、确定性重跑；R-0001 工具实现还通过 14 项 Python 故障测试和 8 项 Node focused 测试。此前 checkpoint `1b43ffdb45ea0c2d7080ee0a9ab8431138c8bcf8` 的 [GitHub Quality gate](https://github.com/kanzakimy0/TravelAssist/actions/runs/35419862869/job/105835356667) 已核验 success。全量回归和最新最终提交的 GitHub gate 将在全批完成后重新执行，不以历史 PASS 代替。

[逐批 QA 与恢复入口](../qa/POI-REMAINING-10097/assessment/README.md)。下文保留上一轮搜索与 32 条初审的历史 Result，数字不代表本阶段最终验收结果。

## 执行范围与完成口径

51 批（50 × 200 + 97）已完成来源核验、实际综合搜索及待查分流。实际搜索 **10,097 / 10,097**，剩余未搜索 **0**，共 2,525 组真实工具响应。165 条原身份隔离也执行了查询，未自动关联属性或解除隔离。

编辑审读覆盖 **32 条**：27 条获得有定位依据的评分，4 条已读页面不足以评分，1 条身份隔离且地址差异待核实。**10,065 条仍待进一步内容审读/补证**，没有将检索完成等同于逐字段审读完成。

本轮新增 **76 个非 null 字段**，有评分 POI **272 → 299**，全候选非 null 字段 **860 → 936**。仍完全没有评分的候选为 **10,070**。已有部分分数的 27 条也有未知字段，因此待查名单继续保留 **10,097 条**，不代表查询未执行。

Visit Profile 新增 **0**，Access Anchor 新增 **0**：本轮未完成它们的单独事实审读，未据交通时长补造游览时长，也未推定当前服务可用。原有已支持数据全部保留。

## 待查分布

| 分类                            | 候选数 |
| ------------------------------- | -----: |
| 部分评分，其余字段待查          |     27 |
| 已读目标页面仍无可评分事实      |      4 |
| 已取回正文，待身份/字段审读     |  1,664 |
| 既有来源不可用，需重试/替代来源 |    126 |
| 页面与目标关系待确认            |    216 |
| 身份隔离，人工核验              |    165 |
| 仅历史目录，需查现状/具体属性   |  7,895 |

机器处理 error queue：**0**。待查理由、原查询词、实际来源状态、证据哈希、未解决字段、下一步动作均保留。检索分组内的 URL 只是线索，不自动认定为某一候选的证据。

案例：三户大神宫在历史目录/神社庁资料与当前县旅游页的门牌号有差异，继续保持原身份隔离与 null；秋田まるごと市場的育儿设施目录不足以判断完整游览属性；部分神社主页只有菜单和通知，需进一步审读专门页面。

## 身份、编号与证据

- 正式编号分配 **0**，Registry 改绑 **0**，candidateKey/旧编号声明变更 **0**。
- Registry before = after：9efcc0b6172dacdabe846789430d1ed54de98f12827097e96a7651131bf044b2。
- candidate identity before = after：4c8f6a4904cd85acafc9b355d3f5d8cf85fc6e00781751a657595db821812067。
- 原 272 条已评分候选逐对象保留；165 条隔离状态保留。原 TASK-068 / TASK-070 历史证据不重写。
- 沿用 43 维合同与 candidate-recovery-1.0 rubric。每个新分数都有 sourceRefs、编辑理由、confidence、UTF-16 locator 和正文/定位 SHA；未知不补默认 0/5。
- 本轮唯一候选视图由 current-candidate-review.v1.json 指向冻结基线及增量，解析后仍为唯一的 10,369 条。未导入生产 Registry 或产品 runtime。
- 历史目录来源为 CODH《日本歴史地名大系》设施地点数据，CC BY 4.0，doi:10.20676/00000456。历史坐标不作为导航依据。
- 原始网页、正文与搜索响应保存在主仓库 outputs/poi-remaining-20260919/source-cache，不在可清理工作树中。私有缓存归档和校验记录见 QA retention 文件。

## QA

本地已执行 npm ci、全仓 Node **2,683 / 2,683 PASS，0 skipped，93 个文件**、Python 10 项离线故障测试、lint、typecheck、format:check:deploy、build、deploy:validate:local、deploy:build:local、deploy:verify-artifact、git diff --check。

全仓 Node 包含原 TASK-068 / TASK-070、planning、Registry、region、routing 回归。新增检查覆盖：唯一身份、原有评分不变、null 不变默认值、隔离不能评分、错误来源/定位/置信度拒绝、损坏缓存重新取回、单条失败继续、无效 receipt 时间恢复、内网 URL 拦截。

51 批相同来源输入已实际验证全部 SKIPPED_IDENTICAL；最终审读/待查生成器重跑为 **0 changed files**，--final --check --cache 通过。所有生成文本使用 UTF-8 / LF；14 个最初搜索缓存没有完成时间字段，保留已有文件/内容哈希校验，不补造时间。

初次本地构建因共享 node_modules junction 越出构建根目录失败；已改用独立 npm ci，后续构建与制品校验通过。没有因此修改应用配置。

Exact final-head GitHub Quality Gate 的 **最终 SHA、run URL、conclusion** 在本次 Draft PR 描述与交付消息中记录；验收须核对该 run 的 headSha 与 PR head 一致。不能用上游或较早提交的 PASS 代替。

## 交付入口

- [中文待查索引](../qa/POI-REMAINING-10097/pending-review-index.md)
- [QA / 恢复指南](../qa/POI-REMAINING-10097/README.md)
- [机器汇总](../qa/POI-REMAINING-10097/review-summary.json)
- [本地执行证据](../qa/POI-REMAINING-10097/local-gates.json)
- [当前唯一候选视图 manifest](../../data/poi/full/manifests/current-candidate-review.v1.json)
- [编辑证据 ledger](../../data/poi/full/sources/remaining-v1/editorial.json)

后续重查或人工审核继续使用原 candidateKey。当前没有定时重查任务；这批待查记录不自动解除、不自动清空。
