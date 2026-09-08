# TASK-013.3.1-A — 日本 46 个未决目的地补证收口

## Metadata

- Task ID：`TASK-013.3.1-A`
- Owner：`A`
- Priority：`P1`
- Status：`待验收（Partial；版本证据修复与严格收口检查已实现，官方边界补证未完成）`
- Execution Base：`3ad62711be8ab54a0c4fa039f9bd426e30128946`
- Prerequisite：PR #192 与 PR #198 已实际合并；#189 保持 Open / Partial。
- Implementation Commit：`1daafbcb0e436c2c4a3f88895d192cdc25518f8f`；后续文档追踪head见PR/Issue。
- Pull Request：[#199](https://github.com/kanzakimy0/TravelAssist/pull/199)（Draft → develop；Partial，不自动合并）
- Current audit：父门槛254 verified /46 unresolved；修复297个无效版本链接。新增官方边界来源/规则验收不能沿用父通用描述，动态最终目标300、严格 fully_passed=0。不是目的地数据被清空。TASK-013.4 allowed: No。
- Parent：`TASK-013.3-A` / Issue `#189`
- Parent PR：`#192`
- Issue：`#194`
- Branch：`feature/a-japan-destination-evidence-closure`
- Branch Base at Creation：`2ea0bbf932c547bfafe4384a9c5d128454b77bf8`（PR #192 head）
- WBS：沿用 `2.16` 收口；Task 追踪表增加子任务行
- Task File：`docs/tasks/TASK-013.3.1-a-japan-destination-evidence-closure.md`
- Codex Command：`docs/tasks/CODEX-TASK-013.3.1-a-command.md`
- Result：`docs/tasks/RESULT-TASK-013.3.1-a-japan-destination-evidence-closure.md`

## 1. 任务目标

承接 `TASK-013.3-A` Partial 结果，仅处理剩余未通过全部门槛的日本目的地，把目的地实体层从 Partial 收口到真正的 `300/300` 可验收状态。

父任务当前基线：destination total 300；verified identity 285；fully passed 254；unresolved 46；verified prefecture 284；unresolved prefecture 16；verified trilingual names 281；verified source-backed coordinates 258；source/evidence rows 300；pinned source links 297；search-only unresolved records 3。9,000 POI、9,300 jobs、9,600 variants、40 batches 均保持不变。

Definition of Done：fully passed 300；unresolved 0；identity 300；prefecture 300；trilingual 300；source-backed coordinates 300；coverage_scope 300；accepted source evidence 300；duplicate/overlap blockers 0。

未达到上述数字前，不得宣称 `TASK-013.3-A` 最终完成，也不得进入 9,000 POI 正式解析。

## 2. 强制前置条件

执行前必须确认：PR #192 已 merged 到 develop；父 Result 与 26 个父任务文件已进入 develop；WBS 2.16 仍是 Partial/待收口；Issue #189 保持 Open；9,000 POI、9,300 jobs、9,600 variants、40 batches 未被其他任务重写。

任一不满足：不轮询、不等待、不在未合并 PR #192 head 上正式实现；Result=Blocked；更新 #194 和 #189；不创建实现 PR。

## 3. Git 安全

开始执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

切换已有分支 `feature/a-japan-destination-evidence-closure`。前置满足后安全 merge 最新 origin/develop；不得用旧父任务文件覆盖 develop。无法安全解决的非追踪冲突返回 Blocked。

## 4. 必须读取

AGENTS.md、package.json、WBS、父 Task/Result、core destination manifest、aliases、boundary contract、entity evidence、open evidence、review、coordinate/overlap/prefecture/source reports、父 resolver/validator/tools/tests、Issue #189、#194、PR #192 和所有相关 Open/Draft PR。

## 5. 动态计算未决集合

不得永久硬编码“46”。从父任务真实结果动态选择所有未完全通过的 destination。先生成：

- `docs/assets/catalog/japan-destination-closure-targets.v1.json`
- `docs/assets/generated/japan-destination-closure-targets.md`

每项记录 destination_id、当前候选、entity_type、缺失 gates、现有证据、坐标证据、prefecture 证据、语言证据、scope 证据、alias/overlap flags、建议补证源。

若动态结果不是 46，以最新结果为准，并在 Result 解释。

## 6. 补证优先级

1. 日本政府 / 都道府县 / 市町村官方页面；2. JNTO；3. 官方 DMO / 观光协会；4. 国土地理院 / e-Stat / 政府开放数据；5. 文化厅、环境省、国立公园等主管机关；6. Wikidata 等开放实体只作辅助交叉核验；7. 搜索结果只作发现，不可作为最终唯一证据。

不得把博客、OTA、社交媒体或搜索摘要作为唯一 accepted evidence。

必须区分 city/town/village/ward/island/peninsula/onsen_area/historic_district/resort_area/national_park/tourism_region/destination_cluster/route_corridor 等，不得全部写成 city。

跨都道府县旅游区域要显式建模 cross-prefecture scope，不得强塞唯一 prefecture。

三语名称：日文优先官方日文，英文优先官方英文，中文优先 JNTO/政府中文；无官方中文时可使用 `translation_source=project_standardized`，不得把英文原样复制进中文栏。

中心坐标优先官方 GIS/国土地理院，其次官方 centroid/representative center，再其次经过交叉核验的开放实体坐标。旅游区域、半岛、岛屿、温泉乡不得用随机车站/酒店/单一景点代替中心点。

所有 300 行最终必须具备 scope_type、parent_entity_ids、prefecture_ids、coverage_note、boundary_source、center_rule、poi_inclusion_rule、poi_exclusion_rule。

## 7. 已知高风险实体

至少重点复核：白川乡、丹波篠山、郡上八幡、美山、伊香保温泉、大山、德之岛、竹富、宫古岛、知床、能登、伊豆、熊野、濑户内、清里、小笠原、ニセコ、松岛、野泽温泉、直岛、小豆岛、奥入濑、立山黑部、阿寒摩周、由布院、トマム、サホロ、越后汤泽、加贺温泉乡、石见银山、五箇山。此列表只作风险提示，不替代动态 unresolved set。

## 8. 网络边界

允许受控读取网页用于实体核验，只保存 URL、标题、机构、核验日期和必要结构化事实；不镜像整页、不下载图片、不保存 Cookie/Token、不绕过登录/robots/访问控制、低并发、403/429 不暴力重试。不得生成图片或解析 POI。

## 9. 输出

更新父任务相关 manifest/evidence/boundary/reports，并新增：

- `docs/assets/catalog/japan-destination-closure-targets.v1.json`
- `docs/assets/generated/japan-destination-closure-targets.md`
- `docs/assets/generated/japan-destination-closure-evidence-report.md`
- `docs/assets/generated/japan-destination-final-acceptance.md`

不得修改 9,000 POI rows、9,300 source jobs、9,600 variants、40 batch membership/quotas、图片二进制和业务 UI。

## 10. 工具与测试

优先扩展父工具，不新增 npm 依赖。允许新增 `tools/assets/close-japan-destination-evidence.mjs` 与 `tests/task-013-3-1-japan-destination-closure.test.mjs`，以及 `assets:japan-destinations:close`、`test:japan-destination-closure` scripts。

专项测试至少覆盖：300 rows、300 fully passed、0 unresolved、300 identity、300 prefecture、47 prefectures、300 trilingual、300 coordinates+source、300 scope、300 accepted evidence、0 search-only final evidence、0 unresolved duplicate、0 alias/hierarchy cycle、跨府区域显式建模、非行政目的地不被静默改 city、9,000 POI/9,300 jobs/9,600 variants/40 batches byte-for-byte unchanged、无图片新增、二次运行 no-op、无 secrets/绝对本机路径。

## 11. 验证

按合并后 package.json 实际 scripts 执行等价命令，至少包含：npm ci、destination resolver、closure、validator、closure tests、parent destination tests、core validate/tests、lint、typecheck、format:check、build、git diff --check。二次执行 resolver/closure/validator 必须 SHA + mtime no-op。

父任务已有 28 个 develop 文档格式债务：不大范围格式化；本 Task 新增格式失败必须为 0。

## 12. 最终验收门

只有 destination=300、fully_passed=300、unresolved=0、identity=300、prefecture=300、trilingual=300、coordinate=300、scope=300、evidence=300、duplicate blockers=0、search-only final evidence=0，且 POI/jobs/variants/batches unchanged 全部通过，才可 Completed。

任一失败：Status 仍为 Partial，Issue 不关闭，不允许启动 TASK-013.4。

## 13. WBS / Result / PR

WBS 主项沿用 2.16；Task 追踪表新增 `TASK-013.3.1-A`。达到 300/300 且 PR 未合并时 2.16=待审查；本 Task PR 合并验收后 2.16 才可已完成；Issue #189 只有最终验收后才关闭。

创建 `docs/tasks/RESULT-TASK-013.3.1-a-japan-destination-evidence-closure.md`，列出初始未决数、动态目标数、关闭数、剩余数、各 Gate、下游四类文件 byte-for-byte unchanged、验证命令、WBS、`TASK-013.4 allowed: Yes/No`。

Push 当前分支，创建 Draft PR → develop，关联 #194、#189、#152、PR #192。保持 Draft，不自动 merge。只有 300/300 后才允许转 Ready for Review。

## 14. 后续解锁

本 Task 合并且 300/300 验收后，才允许建立/执行 `TASK-013.4-A — JP-S-01 真实 POI 解析`：Tokyo / Kyoto / Osaka / Sapporo / Fukuoka，5 个目的地、200 POI。后续只能消费已验收 boundary contract，不得自行重定义目的地边界。
