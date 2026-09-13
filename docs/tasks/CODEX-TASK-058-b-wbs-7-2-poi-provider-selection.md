# CODEX — TASK-058-B / WBS 7.2 Places / POI Provider Selection

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

Issue:

```text
#361
```

Spec branch:

```text
task/b-wbs-7-2-poi-provider-selection
```

Planned implementation branch:

```text
codex/b-wbs-7-2-poi-provider-selection
```

## Execute

请在 TravelAssist 仓库中完整执行：

`TASK-058-B — WBS 7.2 Places / POI Provider Selection`

### 1. 开始前检查

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

### 2. 读取完整规格

```bash
git show origin/task/b-wbs-7-2-poi-provider-selection:docs/tasks/TASK-058-b-wbs-7-2-poi-provider-selection.md
```

读取 Owner correction：

```bash
git show origin/develop:docs/project/WBS-7.2-owner-correction.md
```

读取最新完整 Master WBS：

```bash
git show origin/develop:docs/project/WBS-TravelAssist.md
```

### 3. Owner 规则

用户已经明确把：

```text
WBS 7.2 Places / POI Provider 选型
Owner A → B
```

`docs/project/WBS-7.2-owner-correction.md` 是本单项 authoritative ownership override。

这只是 WBS 7.2 的单项改派；不要修改 7.3–7.11 的 Owner。

实际开始执行时，如果 Master WBS 7.2 仍显示历史 Owner=A，只机械同步这一行：

```text
| 7.2 | Places / POI Provider 选型 | B | P0 | 1.10 | 进行中（#361 / TASK-058-B） |
```

保留全部其他 WBS 最新状态。

### 4. 分支规则

从执行时最新、干净的 `origin/develop` 创建：

```bash
git switch --detach origin/develop
git switch -c codex/b-wbs-7-2-poi-provider-selection
```

不要从 spec branch 开发。

### 5. 本 Task 的性质

这是：

```text
Provider Research
+ Official-source evidence
+ Architecture decision
+ Commercial/rights gate audit
```

不是 API 实装 Task。

不要实施：

```text
7.4 POI Schema
7.6 Places Search API
7.7 POI Details API
7.9 Recommendation Scoring
```

不要修改 Planner / Map UI、Route、AI、DB、Engine 或 Personal Center。

### 6. 必须读取当前仓库上下文

至少读取：

```text
最新 Master WBS
WBS 1.10 frozen display/tag rules
WBS 1.12 Map/Pin/Region/Route visual spec
7.1 / 7.12 current Mapbox records
current Planner / Detail POI usage
current Planning / POI design docs
route-provider-selection docs as decision precedent
asset / image rights rules
```

先明确 TravelAssist 实际需求，再研究 Provider。

### 7. 外部研究要求

必须使用执行时最新的官方资料。

至少评估当前仍有真实相关产品能力的主要候选，包括但不限于：

```text
Google Maps Platform Places
Mapbox Search / Geocoding / Search Box / relevant Places offering
Foursquare Places
HERE Geocoding & Search / relevant Places capabilities
TomTom Search
realistically usable OpenStreetMap-based options
```

如果发现更适合日本市场的严肃候选，也应加入。

关键事实优先采用：

```text
official API docs
official pricing/SKU/quota docs
official terms/licensing/attribution docs
official coverage/status docs
official support/FAQ
```

第三方文章只能辅助发现线索，不能作为 hard gate 的唯一依据。

### 8. 必须评估

#### Japan / POI capability

```text
Japan POI/business coverage evidence
attraction / restaurant / hotel / shopping / station / onsen / entertainment / local categories
text search
autocomplete
nearby / category search
place details
stable place identity
coordinates
Japanese + English / multilingual fields
categories/types
opening hours/business status
contact/site/rating if supported
photos/media and rights
freshness/update model
```

#### TravelAssist architecture fit

```text
Can results be displayed on current Mapbox map?
Can responses be normalized server-side?
Can provider IDs be retained for refresh/lookup?
Which fields may be cached/stored/retained/derived?
Which fields must remain transient?
Photo attribution/display requirements
Future provider-independent 7.4 feasibility
Multi-provider/fallback feasibility
Vendor lock-in risk
```

#### Platform / product rights

```text
Web
iOS
Android
Attribution
Map display restrictions
Caching/storage/retention
Derived-data restrictions
Mixing with other map/providers
Branding/link requirements
```

#### Commercial / operational

```text
Pricing model / SKU
Field-based billing
Free/trial allowance if current
Quota/rate limits
Cost predictability
Status/reliability resources
Support model
Credential/server-side security fit
Regional/account restrictions
```

任何无法从官方资料确认的权限或限制，必须标为 `unknown`，不得猜测。

### 9. Hard gates

Primary Provider 要获得 plain recommendation，至少以下全部必须有充分证据：

```text
Japan capability
Core search/details API fit
Stable identity
Multilingual fit
Mapbox display compatibility
Retention/persistence fit
Attribution implementable
Web + future mobile path
Commercial clarity
Operational viability
```

每家 Provider 的每个 gate 必须是：

```text
PASS
CONDITIONAL
FAIL
UNKNOWN
```

存在 material UNKNOWN 时，不得写成无条件 Production Primary。

### 10. 决策方式

先 hard gates，再 comparative fit。

不要单靠一个加权总分决定。

最终必须说明：

```text
recommended primary provider or accurate blocker
fallback strategy or why none
runner-up
why runner-up lost
session-only/evaluation-only candidates if applicable
open commercial/legal questions
```

### 11. 输出

必须生成：

```text
docs/architecture/poi-provider-selection.md
docs/qa/TASK-058/provider-matrix.json
docs/qa/TASK-058/provider-decision-report.md
docs/tasks/RESULT-TASK-058-b-wbs-7-2-poi-provider-selection.md
```

`provider-matrix.json` 必须记录每个重要事实的：

```text
provider
fact/capability
status
official source URL
accessed-at
short evidence note
confidence/limitation
```

不要复制大段官方网页文本，只保存简短摘要与链接。

### 12. 成本情景

仅在官方价格足够清楚时计算 low / medium / high 使用情景。

必须明确区分：

```text
官方价格事实
vs
TravelAssist 假设
vs
计算结果
```

不清楚就写 unknown，不要猜。

### 13. Live API 规则

本 Task 不要求实际调用 Provider API。

不要：

```text
购买套餐
产生付费流量
提交 API key
要求 production account
```

如果仅靠文档无法判断日本实际质量，可以在 Result 中建议后续独立 empirical evaluation Task，但本 Task 不因此伪造质量结论。

### 14. QA

至少：

```text
npm ci
validate provider-matrix.json parses and required fields exist
repository canonical lint/typecheck/build when required by current Quality Gate
relevant docs/architecture checks
scoped Prettier
git diff --check
secret/credential scan for changed evidence
```

候选完成后创建 Draft PR → `develop`，并要求 exact final-head GitHub Quality Gate PASS（若当前工作流适用）。

若 canonical gate 存在基线债务，必须精确证明候选没有新增失败。

### 15. Result 状态

最终结论使用：

```text
RECOMMEND
CONDITIONAL
BLOCKED
```

实现完成 + QA + Draft PR 后，只把 WBS 7.2 更新为：

```text
B / 待审查（#361 / TASK-058-B；Draft PR #<number>）
```

只有用户明确验收 + merge 后才能：

```text
B / 已完成
```

### 16. 停止条件

不要自动 merge。
不要关闭 Issue #361。
不要启动 7.4 / 7.6 / 7.7 / 7.9。
不要购买或激活任何外部 Provider 服务。

最后返回完整 `RESULT-TASK-058-B` 给用户验收。
