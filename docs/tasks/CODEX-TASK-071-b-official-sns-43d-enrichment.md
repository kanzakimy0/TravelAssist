# CODEX — TASK-071-B Official / SNS POI Evidence Expansion + 43D Completion

请在 kanzakimy0/TravelAssist 完整执行 TASK-071-B。

Issue: #407

正式 Task：docs/tasks/TASK-071-b-official-sns-43d-enrichment.md

## 核心目标

对当前 10,097 个 pending POI 做主动来源扩展，按固定优先级：
1. 6,049 TARGET_IDENTITY_UNRESOLVED
2. 165 IDENTITY_CONFLICT
3. 1,422 REVIEWED_TARGET_NO_SUPPORTED_FACT
4. 2,461 UNSUPPORTED_FIELDS_REMAIN_NULL

优先查景点/设施官网、政府/都道府县/市町村、官方旅游局/DMO、文化财/博物馆/公园/宗教设施等官方来源、官方运营商和官方 SNS（Instagram/X/Facebook/YouTube 等），之后才使用可信二级来源。

目标是尽量补齐有证据支持的 43 维、Visit Profile、Access Anchor；不得为了覆盖率强行补 43/43。

## 开始前

执行：
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/codex/b-poi-remaining-10097-evidence-review
git rev-parse origin/task/b-task-071-official-sns-43d-enrichment
git log --oneline -15 origin/task/b-task-071-official-sns-43d-enrichment

确认上游权威 head：df6d253ecba58e28afa12b79751c72414315acb2
确认上游 PR #398 的 10,097 authoritative rerun 数据与 protected checksum 没有漂移。

禁止：git clean -fd / git reset --hard / git push --force / git push --force-with-lease

## 执行分支

若 #398 仍未合并，从 origin/task/b-task-071-official-sns-43d-enrichment 建立 codex/b-task-071-official-sns-43d-enrichment。
此时 TASK-071 Draft PR base 使用 codex/b-poi-remaining-10097-evidence-review，head 使用 codex/b-task-071-official-sns-43d-enrichment。
不要修改 #398 本身。

## 读取任务与上游

完整读取：
docs/tasks/TASK-071-b-official-sns-43d-enrichment.md
docs/tasks/RESULT-poi-remaining-10097-evidence-review.md
docs/qa/POI-REMAINING-10097/review-summary.json
docs/qa/POI-REMAINING-10097/pending-review-index.md
data/poi/full/rubrics/candidate-feature-rubric.v1.json
以及现有 data/poi/full/**、docs/qa/POI-REMAINING-10097/**、tools/poi/**、tests/**。

复用现有 candidate truth model、provenance、locator、cache、checkpoint、resume、QA 架构，不得创建第二套互相冲突的 POI 主模型。

## 冻结四个 population

Phase-A TARGET_IDENTITY_UNRESOLVED = 6049
Phase-B IDENTITY_CONFLICT = 165
Phase-C REVIEWED_TARGET_NO_SUPPORTED_FACT = 1422
Phase-D UNSUPPORTED_FIELDS_REMAIN_NULL = 2461
断言总数 = 10097。每个 phase candidateKey 唯一、排序 deterministic、生成 manifest + checksum，一旦开始不得漂移。

## 批次

严格 200 条一批，phase 不混批：
Phase A = 30×200 + 49 = 31 batches
Phase B = 165 = 1 batch
Phase C = 7×200 + 22 = 8 batches
Phase D = 12×200 + 61 = 13 batches
Total = 53 batches

每批执行：search → open sources → read target content → identity decision → 43D extraction → Visit/Access extraction → QA → checkpoint → receipt last → PASS 后自动下一批。
正常批次之间不要询问用户。A 完成自动 B，B 完成自动 C，C 完成自动 D。

## Phase A

对 6049 identity unresolved 逐个尽量搜索：日文正式名、英文/罗马字、别名/历史名、地址、都道府县、市町村、地区名、坐标上下文、运营机构、官方域名、官方 SNS。
优先打开并读：目标官网 → 政府 → 官方旅游局/DMO → 文化财/博物馆/公园/寺社官方页 → 官方运营商 → 官方 SNS → 高质量二级来源。
不能凭同名、近似坐标或搜索摘要解决身份。
一旦 identity resolve，立刻在同一 pass 继续做 43D / Visit / Anchor 补全。
仍 unresolved 时完整记录搜索链和无法确认原因，不评分。

## Phase B

对 165 identity conflict 核对：同名异地、搬迁、改名、合并、历史旧址 vs 现设施、主设施 vs 子设施、地址冲突、坐标冲突、运营主体变化、官方来源不一致。
只有证据足够强才解除 conflict；否则保持冲突/隔离，不自动 merge/rebind，不评分未知 target。

## Phase C

对 1422 identity 已知但无支持事实的候选主动扩展官网、政府、旅游局、官方文化机构、运营者、官方新闻/公告/介绍、官方 SNS 和可信二级来源。
过去 retained source 没提取到事实不等于网络上没有证据。

## Phase D

对 2461 partial candidates 保留所有已支持字段，专门针对剩余 null 搜证据。
除非发现新官方来源冲突、target scope 错误、旧来源过期或旧值错误，否则不要重写已有值；改值必须有 supersession/contradiction record。

## 官网 / SNS 规则

官网第一优先。
官方 SNS 只有确认账号归属后才可作为 evidence。归属可通过官网互链、政府/旅游页列出账号、认证组织账号且名称/地址/域名一致等确认。
每个 SNS 证据保留 platform、account、accountUrl、officialOwnershipEvidence、postUrl、postDate、observedAt、targetScope、locator/hash 或 preserved evidence pointer。
临时关闭、当前排队、临时活动、天气、当前时刻等不得变成永久 static master truth。

## 43维规则

严格复用现有 rubric：null=未知/证据不足；0=有证据支持不存在；5 绝不是默认值。
禁止根据名字、类别、常识、fame、搜索摘要、附近景点直接打分。
每个新增 non-null 必须有 featureCode、score、kind、rubricVersion、annotationMethod、sourceRefs、confidence、rationale、locator/hash。
unique/hidden/iconic 等比较性维度没有足够比较依据时继续 null。

## Visit / Access

Visit Profile 只有明确依据才填；不能把交通时间、开放时间、单段 hike、导览单段、活动时长自动当整个景点游玩时间。
Access 可记录最近官方车站/公交站/港口/官方 access point/shuttle/regional hub，但不要固化当前票价、实时班次、延误、换乘、驾车时间、拥堵、当前无障碍状态。

## Search depth

不能搜一次没找到就直接 null。每个 candidate 必须记录 query families、实际 search 次数、打开的官网/政府旅游页/官方 SNS/二级来源、读取正文/帖子、接受证据、拒绝证据、保留 null/unresolved 的原因。search snippet 不算 evidence。

## 每批 telemetry

至少记录 phase、batchId、model、reasoningConfiguration、start/end/elapsed、candidateCount、sourceQueryCandidateCount、totalQueryCount、officialTargetPagesOpened、governmentTourismCulturalPagesOpened、officialOperatorPagesOpened、officialSNSAccountsOpened、officialSNSPostsOpened、secondaryPagesOpened、fullTextReviewedCount、identityResolvedCount、conflictResolvedCount、identityStillUnresolvedCount、candidatesGainingFeature、newNonNullFeatureCount、provenanceCount、locatorHashValidationCount、visitProfileAdded、accessAnchorAdded、accessLinksAdded、rejectedEvidenceCount、reviewErrorQueueCount、inputChecksum、sourceArchiveChecksum、outputChecksum、registryChecksumBefore/After、candidateIdentityChecksumBefore/After。

## QA

每批必须验证：完整 candidate disposition、无重复/丢失、identity protection、43-key shape、0..9|null、provenance complete、official SNS ownership proof、locator/hash、无默认分、Visit/Access 语义、Registry/Master Code 不变、deterministic rebuild、checksum resume、损坏/不完整 receipt 拒绝。

## 最终统计

Identity：6049 unresolved before/after；165 conflict before/after；newly resolved。
43D：scored POIs before=2510 / after；non-null before=6104 / after；features added；remaining null；per-feature coverage；>=1、>=10、>=20、>=30、43/43 覆盖。
Sources：official-site candidates；government/tourism candidates；official-SNS candidates；source tier/domain/platform 分布。
Visit / Access：before/after。
Integrity：Master Code changes=0；Registry rebind=0；protected checksums before/after；errors/review queue。

## GitHub

若 #398 未合并，TASK-071 Draft PR base=codex/b-poi-remaining-10097-evidence-review，head=codex/b-task-071-official-sns-43d-enrichment，保持 Draft。
若 #398 在执行期间已正式验收并 merge，则正常 merge 最新 origin/develop 到 TASK-071 branch，不 rebase、不 force push，retarget 到 develop，并重新跑 exact-head Quality Gate。

## 最终交付

必须生成：
docs/tasks/RESULT-TASK-071-b-official-sns-43d-enrichment.md
docs/qa/TASK-071-B/README.md
docs/qa/TASK-071-B/**
four phase manifests
53 batch receipts/checkpoints
source archive manifests
official SNS evidence/ownership records
updated candidate sidecars
identity-resolution records
final aggregate QA
Draft PR / final head / exact final-head GitHub Quality Gate。

完成后停止。不要自动 merge，不要启动 production import，不要自动分配 Master Code。