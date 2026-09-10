# TASK-013.3.1-A Result

## Status

**Partial。尚未完成300/300最终验收。**

2026-09-08 用户再次明确授权后，PR #199 已合并，merge `fba4086775d54d3acfc8dd4bd472e2a7a8c89e46`。本次合并仅收录阶段证据修复；Task/WBS按追踪规则记阻塞/Partial，#189/#194保持Open。下文Draft交付表述为原阶段历史，不构成最终验收。合并前再次运行20项专项测试及diff检查通过，保护文件与重复生成no-op通过。

已合并用户批准的 PR #198，并继续正式后续 TASK-013.3.1-A。完成无效来源版本修复、严格动态补证检查、下游保护、阶段性官方来源研究和测试。不是所有目的地已补证完成；不解锁后续 POI 或图片生产。

## Prerequisite

- PR #198 已 merged，merge `3ad62711be8ab54a0c4fa039f9bd426e30128946`，也是本次 develop 基线。
- PR #192 实际已 merged，head/合入 `2ea0bbf932c547bfafe4384a9c5d128454b77bf8`，不再是旧文档描述的 Draft 未合并。
- 父 Result、manifest、aliases、boundary contract、evidence、review、reports、tools、tests 均在 develop。
- #189 保持 Open，WBS 2.16 为 Partial；下游四类资产逐字节比对通过。
- 已检查 Open PR：没有同路径的另一份 destination closure 实现；无关 B/DB Draft 未触碰。

## Tracking

- Task：TASK-013.3.1-A；Issue #194；父 Issue #189、#152；父 PR #192。
- Branch：`feature/a-japan-destination-evidence-closure` → develop。
- 现有分支安全快进同步最新 develop，独立 worktree，未修改用户主工作区或3113预览。
- Implementation Commit：`1daafbcb0e436c2c4a3f88895d192cdc25518f8f`；文档追踪head见PR/Issue。
- PR：[#199](https://github.com/kanzakimy0/TravelAssist/pull/199) 已由用户授权合入develop；300/300最终补证仍未完成。

## Closure Targets

父结果声称254通过、46未决。但本次发现297个来源版本链接为 `oldid=undefined`，且父边界仅有通用描述，未满足新任务要求的官方 boundary_source 和经审核纳入/排除规则。

因此动态目标不是硬编码46，而是300。已修复297个版本链接缺陷；旧父门槛仍为254/46，未清空或回退目的地资料。严格最终门槛仍为0通过、300待完整补证。本轮关闭完整目的地数0；修复来源链接数297，两种计数不混淆。

`japan-destination-closure-targets.v1.json` 逐项包含候选、类型、缺失 gates、来源、坐标候选、县路径、语言、scope、alias/overlap 和建议补证源。

## Identity

父规则 identity_verified=285。保持原候选和人工 hold，不把历史町、温泉区、岛屿或单体设施强转 city。新 resolver 遇到缺失、无效版本时不给出有效来源URL，保持 unresolved。

## Prefecture

父规则 verified=284，unresolved=16，覆盖47县。跨县列表保持显式建模。没有以旅游名称猜测行政归属。

## Language Names

281行通过父三语门槛。已记录秋保、直岛、伊香保、白川乡/五箇山的官方页面线索，但未仅凭搜索摘要覆盖 canonical fields。丹波篠山官方中文PDF超出读取器大小限制，保留 discovered_not_read，而非伪报已审查。

## Coordinates

258行通过父来源坐标门槛。未知精度、多个冲突代表点、旅游区缺中心仍待补证。没有把新版本号附到旧事实：刷新时请求 info、labels、aliases、descriptions、claims，并保存同次响应的版本与允许的结构化事实。

## Coverage Scope

300条 boundary contract 增加明确字段：scope_type、parent_entity_ids、prefecture_ids、cross_prefecture、coverage_note、boundary_source、center_rule、poi_inclusion_rule、poi_exclusion_rule。

未经审查的 boundary_source 保持 null，boundary_status=official_scope_review_required。通用规则不是已核验边界，严格 coverage_scope_verified=0。后续必须逐行补入实际官方范围证据；不能用中心半径作为边界。

## Evidence

- 修复采集器漏掉 props=info 的缺陷；实体事实与lastrevid同时刷新，禁止伪造版本号。
- 297条目的地引用现为有效正整数版本链接，与本地snapshot一致。
- 请求串行、每批8实体；第一次较大请求超时后停止并保留检查点，缩小请求恢复成功；没有403/429暴力重试。
- 6条已读取官方来源研究记录、1条仅发现未读记录。只保存URL、标题、机构、日期、必要事实及尚缺证据，不镜像整页或下载图片。
- 真实官方边界及逐字段最终证据尚未审核，strict evidence_verified=0。有效Wikidata版本只能作为辅助证据，不能替代新任务的官方最终验收。

## Alias / Overlap / Duplicate

已知未决冲突对0不等于完整地理重叠审查完成。保留原别名与父子规则，新增层级循环/悬空引用检查，不自动合并同名实体。

## High-risk Entities

所有300行纳入动态检查，因此冻结高风险清单均在检查范围。白川乡/五箇山、秋保、直岛、伊香保等补入官方线索；宫古岛/市、竹富岛/町、德之岛/町、大山山岳/町等原范围hold未解除。未宣称已逐项完成高风险边界验收。

## Downstream Contract

9,000 POI、9,300 jobs、9,600 variants、40 batch JSON及批次CSV，共44个保护文件与合并基线逐字节一致。SHA和字节数列入final-acceptance报告。没有新增图片、业务UI、npm依赖、Token或Cookie；package-lock不变。

## Final Acceptance Gates

| Gate                                |   Actual |
| ----------------------------------- | -------: |
| destination total                   |      300 |
| parent fully passed / unresolved    | 254 / 46 |
| strict fully_passed / unresolved    |  0 / 300 |
| identity_verified                   |      285 |
| prefecture_verified                 |      284 |
| prefectures covered                 |       47 |
| trilingual_verified                 |      281 |
| center_coordinate_verified          |      258 |
| official coverage_scope_verified    |        0 |
| accepted final evidence_verified    |        0 |
| valid pinned source links           |      297 |
| unresolved duplicate pairs detected |        0 |
| search-only parent rows             |        3 |
| downstream unchanged                |      Yes |

所有门槛不是全绿，Status必须Partial，#189不得关闭。

## Validation

执行：npm ci、resolver、closure、父validator、closure tests、父destination tests、core validator/tests、lint、typecheck、format:check、build、git diff --check。

- npm ci、lint、typecheck、build、git diff --check：通过；build 生成21个页面。
- closure专项20测试、父destination专项26测试、core-generation专项23测试：通过；core产物校验通过。
- 重复resolver / closure / validator输出 changed=0；专项测试验证组合运行SHA与mtime均为no-op。
- format:check：失败，29个文件均为develop既有格式债，新增0；详见 `japan-destination-closure-format-baseline.json`。不将全仓格式检查写为通过。
- 结构测试通过不代表最终实体门槛通过。全部命令为本地实跑；提交使用 `[skip ci]` 防止仓库feature-push自动建非Draft PR并合并的流程误触，未宣称GitHub CI通过。

## Files Changed

- 父证据采集器和解析器：有效版本修复、缺失版本拒绝、边界字段。
- snapshot、destination manifest、aliases、evidence、boundary contract与相关报告：更新有效来源版本引用。
- 新closure工具、专项测试、2个npm scripts，无新依赖。
- closure targets/research、evidence report、final acceptance report。
- Task、Result、WBS与格式审计。

## WBS Update

沿用主项2.16，Partial /待收口；新增TASK-013.3.1-A追踪行，不重复创建主WBS。2.15注明PR #198复验已合并，但素材仍Partial。2.13/2.14及其他Owner任务不变。

## Follow-up Readiness

**TASK-013.4 allowed: No。**

本Task尚未达到300/300。阶段修复已授权合并，但未创建或执行200 POI批次，也未启动图片、付费Provider或授权采购。

## Known Limitations

本轮为部分实现，不是完整补证收口。官方证据尚未覆盖全部300行，已读页面仅为阶段研究，未升级目的地状态；坐标/同名实体/范围的旧缺口仍在。新最终验收标准比父任务更严格，不能用旧254数字宣称已经通过。需要继续逐实体核验真实官方边界与字段证据后才能完成。
