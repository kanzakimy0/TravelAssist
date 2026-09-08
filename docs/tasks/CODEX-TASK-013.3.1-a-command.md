# Codex 执行指令 — TASK-013.3.1-A

将下面整段复制给 Codex：

```text
请在 TravelAssist 仓库中完整执行 TASK-013.3.1-A：日本未决目的地补证收口。目标不是“尽量多补”，而是把父任务 TASK-013.3-A 从当前 Partial 推进到真实的 300/300 最终验收；如果仍有任一 Gate 未通过，必须保持 Partial，不得启动 9,000 POI 解析。

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#194

Parent Issue:
#189

Parent PR:
#192

Branch:
feature/a-japan-destination-evidence-closure

Task:
docs/tasks/TASK-013.3.1-a-japan-destination-evidence-closure.md

Result:
docs/tasks/RESULT-TASK-013.3.1-a-japan-destination-evidence-closure.md

一、启动安全

在仓库根目录执行：

git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop

禁止：

git clean -fd
git reset --hard
git push --force
git push --force-with-lease

存在用户未提交文件时不得删除或覆盖；优先独立 worktree，无法安全隔离则 Blocked。

读取远端完整 Task：

git show origin/feature/a-japan-destination-evidence-closure:docs/tasks/TASK-013.3.1-a-japan-destination-evidence-closure.md

切换已有分支：

git switch feature/a-japan-destination-evidence-closure
git pull --ff-only origin feature/a-japan-destination-evidence-closure

本地没有时：

git switch --track -c feature/a-japan-destination-evidence-closure origin/feature/a-japan-destination-evidence-closure

二、强制前置

必须确认：

1. PR #192 已 merged 到 develop；
2. develop 中存在 RESULT-TASK-013.3-a-japan-destination-entity-resolution.md；
3. 父任务的 manifest / aliases / boundary contract / evidence / review / audit / tools / tests 已进入 develop；
4. Issue #189 保持 Open；
5. WBS 2.16 仍为 Partial / 待收口；
6. 9,000 POI、9,300 jobs、9,600 variants、40 batches 未被其他任务改写。

任一不满足：

- 不轮询；
- 不等待；
- 不在 PR #192 未合并状态下正式实现；
- Result = Blocked；
- 更新 #194 和 #189；
- 不创建实现 PR。

前置满足后，将最新 origin/develop 安全 merge 到当前分支。该分支最初从 PR #192 head 建立，不得用旧文件覆盖新的 develop。不要 rebase 已推送分支，不要 force push。

三、读取父任务全部材料

至少读取：

AGENTS.md
package.json
docs/project/WBS-TravelAssist.md
docs/tasks/TASK-013.3-a-japan-destination-entity-resolution.md
docs/tasks/RESULT-TASK-013.3-a-japan-destination-entity-resolution.md
docs/assets/catalog/core-destination-generation-manifest.v1.csv
docs/assets/catalog/japan-destination-aliases.v1.csv
docs/assets/catalog/japan-destination-boundary-contract.v1.json
docs/assets/catalog/japan-destination-entity-evidence.v1.jsonl
docs/assets/catalog/japan-destination-open-evidence.v1.json
docs/assets/catalog/japan-destination-review.v1.json
docs/assets/generated/japan-destination-coordinate-audit.md
docs/assets/generated/japan-destination-overlap-review.md
docs/assets/generated/japan-destination-prefecture-audit.md
docs/assets/generated/japan-destination-resolution-summary.json
docs/assets/generated/japan-destination-resolution-summary.md
docs/assets/generated/japan-destination-source-evidence.md
父 resolver / validator / candidates / evidence fetcher / tests
Issue #189、#194、PR #192
所有可能修改同路径的 Open / Draft PR

四、动态计算未决集合

不要把“46”写死成唯一目标列表。必须从最新父任务结果动态计算所有未完全通过的 destination：

fully_passed != true
OR identity_verified != true
OR prefecture_verified != true
OR trilingual_verified != true
OR center_coordinate_verified != true
OR coverage_scope_verified != true
OR evidence_verified != true
OR duplicate_overlap_clear != true

先生成：

docs/assets/catalog/japan-destination-closure-targets.v1.json
docs/assets/generated/japan-destination-closure-targets.md

每个 target 记录：

destination_id
current candidate
entity_type
missing gates
current source evidence
current coordinate evidence
current prefecture evidence
current language evidence
current scope evidence
alias / overlap flags
recommended evidence sources

如果最新动态结果不是 46，以最新真实结果为准，在 Result 说明原因，不得为了匹配 46 删除或伪造记录。

五、补证要求

证据优先级：

1. 日本国家 / 都道府县 / 市町村政府官方页面；
2. JNTO；
3. 官方 DMO / 观光协会；
4. 国土地理院 / e-Stat / 政府开放数据；
5. 文化厅、环境省、国立公园、世界遗产等主管机关；
6. Wikidata 等只作辅助交叉核验；
7. 搜索结果只发现候选，不得作为唯一最终证据。

不得把博客、OTA、社交媒体、搜索摘要作为唯一 accepted evidence。

实体类型必须真实区分：

city
town
village
ward
island
peninsula
onsen_area
historic_district
resort_area
national_park
tourism_region
destination_cluster
route_corridor
other_reviewed_type

禁止把温泉区、半岛、岛屿、历史街区全部改成 city 来通过测试。

Prefecture：

- 行政实体使用当前行政归属；
- 跨都道府县区域显式建模 cross-prefecture；
- 最终 unknown prefecture = 0。

三语名称：

- ja 优先官方日文；
- en 优先官方英文；
- zh-CN 优先 JNTO / 政府中文；
- 无官方中文时允许 project_standardized，但不得直接复制英文；
- 历史旧名进入 alias。

中心坐标：

- 优先国土地理院 / 官方 GIS；
- 然后官方 area centroid / representative center；
- 最后才是经过交叉核验的开放实体坐标；
- 半岛、岛屿、旅游区、温泉乡禁止用随机酒店、车站或单一景点冒充中心；
- 每行记录 coordinate_type、coordinate_source、coordinate_verified。

Coverage Scope：

所有 300 destination 最终都要有：

scope_type
parent_entity_ids
prefecture_ids
coverage_note
boundary_source
center_rule
poi_inclusion_rule
poi_exclusion_rule

六、重点高风险项

优先复核但不限于：

白川乡
丹波篠山
郡上八幡
美山
伊香保温泉
大山
德之岛
竹富
宫古岛
知床
能登
伊豆
熊野
濑户内
清里
小笠原
ニセコ
松岛
野泽温泉
直岛
小豆岛
奥入濑
立山黑部
阿寒摩周
由布院
トマム
サホロ
越后汤泽
加贺温泉乡
石见银山
五箇山

这只是风险提示，不替代动态 unresolved target。

七、网络边界

可以低并发读取官方网页进行实体核验，但：

- 只保存 URL、标题、机构、核验日期、必要结构化事实；
- 不镜像网页全文；
- 不下载图片；
- 不保存 Cookie/Token；
- 不绕过 robots / 登录 / 访问限制；
- 403/429 不暴力重试；
- 不进行 POI 解析；
- 不生成任何图片。

八、必须保护下游

以下内容必须 byte-for-byte unchanged：

9,000 POI rows
9,300 source jobs
9,600 variants
40 batch definitions / membership / quotas

不得修改业务 UI，不得新增图片二进制，不新增 npm 依赖。

九、最终验收数字

只有全部达到才可 Completed：

destination total = 300
fully_passed = 300
unresolved = 0
identity_verified = 300
prefecture_resolved = 300
trilingual_verified = 300
coordinate_verified = 300
scope_verified = 300
evidence_verified = 300
duplicate_blockers = 0
search_only_final_evidence = 0
POI rows unchanged = true
jobs unchanged = true
variants unchanged = true
batches unchanged = true

任何一项未通过：Status = Partial；不得关闭 #189；不得创建或启动 TASK-013.4 正式 POI 解析。

十、输出与测试

新增：

docs/assets/catalog/japan-destination-closure-targets.v1.json
docs/assets/generated/japan-destination-closure-targets.md
docs/assets/generated/japan-destination-closure-evidence-report.md
docs/assets/generated/japan-destination-final-acceptance.md

允许扩展父工具或新增：

tools/assets/close-japan-destination-evidence.mjs
tests/task-013-3-1-japan-destination-closure.test.mjs

不新增 npm 依赖。

按合并后的 package.json 实际命令执行完整验证，至少覆盖：

npm ci
父 destination resolver
closure
父 destination validator
closure tests
父 destination tests
core validator
core tests
npm run lint
npm run typecheck
npm run format:check
npm run build
git diff --check

然后再次运行 resolver / closure / validator，确认 canonical 输出 SHA 与 mtime no-op。

已知 develop 有 28 个原有文档 format 债务：不要大范围格式化；新增/修改文件 format failure 必须为 0；全仓 format 失败要准确记录。

十一、WBS / Result / GitHub

WBS 主项沿用 2.16，不新建新的主 WBS 项；Task 追踪表增加 TASK-013.3.1-A。

达到 300/300、PR 未合并：2.16 = 待审查。
本 Task PR 合并并最终验收后：2.16 = 已完成。
Issue #189 只有最终验收完成后才关闭 completed。

创建：

docs/tasks/RESULT-TASK-013.3.1-a-japan-destination-evidence-closure.md

Result 必须列：

Status
Prerequisite
Tracking
Closure Targets
Identity
Prefecture
Language Names
Coordinates
Coverage Scope
Evidence
Alias / Overlap / Duplicate
High-risk Entities
Downstream Contract
Final Acceptance Gates
Validation
Files Changed
WBS Update
Follow-up Readiness
Known Limitations

其中 Follow-up Readiness 必须明确：

TASK-013.4 allowed: Yes / No

开始和结束时更新 #194 与 #189。

Commit subject 包含 TASK-013.3.1-A。
Push 到：

feature/a-japan-destination-evidence-closure

创建 Draft PR：

feature/a-japan-destination-evidence-closure → develop

关联 #194、#189、#152、PR #192。保持 Draft，不自动 merge。只有真实 300/300 后才允许转 Ready for Review。

十二、后续

只有本 Task 合并并完成 300/300 最终验收后，才允许建立：

TASK-013.4-A — JP-S-01 真实 POI 解析
Tokyo / Kyoto / Osaka / Sapporo / Fukuoka
5 destinations
200 POIs

后续 POI Task 只能读取最终验收后的 japan-destination-boundary-contract，不得自己改目的地边界。
```
