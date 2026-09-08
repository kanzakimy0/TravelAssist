# TASK-021-A — 路线系统主线（7.3 → 7.5 → 7.8）

## Metadata

- Task ID: `TASK-021-A`
- WBS: `7.3 / 7.5 / 7.8`
- Owner: `A`
- Responsibility: `Main Travel System / Routing`
- Priority: `P0`
- Status: `Ready / 分阶段 Gate 执行`
- GitHub Issue: `#229`
- Spec branch: `task/a-route-system-mainline`
- Planned implementation branch: `codex/a-route-system-mainline`
- Authoring base: `develop@74bc3cccf8bcfd603706e2b96d4072076191f308`
- Dependencies:
  - `7.3 Route / Transit Provider 选型` depends on `4.7`：已满足。
  - `7.5 Route Schema` depends on `7.3`：本 Task Stage 1 通过后才可继续。
  - `7.8 路线计算 API` depends on `7.3 + 7.5`：Stage 2 通过后才可继续。
- Parallel work: `TASK-019-A / #226`、`TASK-020-A / #228` 可并行；最终必须整合最新 `origin/develop` 并回归。

## Objective

把当前 Planner 中已经存在的交通视觉、本地估算、连接失效与 Mapbox 地图能力推进成正式的 **Japan-first 路线系统基础**：

```text
Stage 1 — 7.3 Provider Selection
        ↓ Freeze Gate
Stage 2 — 7.5 Provider-independent Route Schema
        ↓ Contract Gate
Stage 3 — 7.8 Route Calculation Service/API
```

本 Task 不允许从某个 Provider SDK/payload 反向定义 TravelAssist 的公共 Route Schema。公共 Route Contract 必须 provider-independent，Provider adapter 是边缘层。

## Canonical Sources

执行前必须读取：

- `CONTRIBUTING.md`
- `AGENTS.md`
- `docs/development/task-tracking.md`
- `docs/project/WBS-TravelAssist.md`
- `docs/architecture/cross-module-contract-handoff.md`
- `docs/architecture/trip-plan-data-ai-takeover.md`
- 当前 Planner / Detail 交通模型、时间轴交通段、地图 source/layer、fallback 逻辑
- Mapbox 当前配置与既有 7.1 / 7.12 Result
- `src/shared/contracts/trips/**`，确认 Route reference 与 Trip Plan 边界
- `.env.example` 与环境变量规范
- 现有 server/API/provider 抽象
- Open PR #226 / #228 / #221，确认共享文件冲突

## Start Gate / Git Rules

开始前记录：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

要求：

1. 从最新干净 `origin/develop` 创建独立 Worktree / `codex/a-route-system-mainline`。
2. 不从 Planner 历史 feature branch、TASK-019、TASK-020 或 B branch 叠加。
3. 不覆盖用户未提交工作区。
4. 最终交付前再次 fetch + 安全整合最新 develop，重新跑全部 route tests / lint / typecheck / build。

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

## Stage 1 — WBS 7.3 Route / Transit Provider Selection

### Goal

用 **当前官方资料**（执行时重新联网核验）完成 Japan-first Provider 评估，冻结 TravelAssist 路线能力的 primary / fallback 策略，或者准确返回 Blocked。

不得依赖模型记忆中的价格、套餐、覆盖范围或旧 API 文档。

### Required Candidate Classes

至少评估足以覆盖以下能力的候选；可以是单一 Provider，也可以是组合：

- walking
- driving
- cycling（若产品首期需要）
- Japan public transit：rail / subway / bus
- multimodal / transfer itinerary
- schedule-aware transit
- departure / arrival time routing
- traffic-aware driving（如果 Provider 支持）
- alternatives
- waypoint / via point
- route geometry
- duration / distance
- fare（若可合法稳定取得）
- wheelchair / accessibility metadata（若可用）

候选可包括 Mapbox、Google Routes/Maps Platform、HERE、NAVITIME/日本本地交通数据源或其他可靠 Provider，但 **不得预设赢家**。

### Official-source Research Matrix

每个候选至少核验：

- 官方产品/API名称与当前版本。
- 日本覆盖范围。
- rail / subway / bus 的实际支持。
- walking / driving / cycling 支持。
- transit departure/arrival time。
- multimodal / transfer 语义。
- waypoint limits / route alternatives。
- traffic / incidents 能力。
- geometry/polyline 格式。
- fare / transit line / agency / station metadata。
- rate limit / quota。
- 价格/计费单位和免费额度（如官方明确）。
- ToS / attribution / display restrictions。
- data caching / retention restrictions。
- server API / web SDK / mobile suitability。
- API key restriction 能力。
- status page / reliability signal。
- Japan-specific caveats。

研究证据必须保存到：

```text
docs/architecture/route-provider-selection.md
```

要求引用官方 URL、访问日期、关键结论；不要长段复制官方文字。

### Hard Selection Gates

进入 Stage 2 前，至少必须满足：

1. 有明确合法的 Japan route 数据来源。
2. walking + driving 可用。
3. 首发需求中的 Japan transit 能力已经被官方资料明确确认；若主 Provider 不支持，必须有明确第二 Provider/策略。
4. 授权/展示要求可与 TravelAssist Web/未来 Mobile 架构兼容。
5. Key 可 server-side 管理，不要求把 secret 暴露到浏览器。
6. 费用模型不会因为明显不可控的单请求链路造成产品架构不可接受；若成本尚需用户商业决定，记录为 Gate。
7. API 能提供 Stage 2 所需最小 Route semantics。

### Autonomous Decision Rule

只有当存在满足全部硬门槛、并且没有需要产品负责人商业确认的重大分歧时，Codex 才可以自动冻结：

```text
primary provider
optional transit/fallback provider
capability split
```

如果出现以下任一情况：

- 日本公共交通覆盖不明确；
- 官方定价/许可无法确认；
- 两个方案之间是明显的商业偏好选择，而不是技术优劣；
- 需要购买企业合同/人工申请才知道关键能力；
- 无法确认缓存/展示限制；

则：

- `7.3 → 待确认 / Blocked`
- 输出完整矩阵和推荐选项
- **停止 TASK-021，不进入 7.5 / 7.8**
- 不编造 Provider adapter。

## Stage 2 — WBS 7.5 Route Schema

仅 Stage 1 Freeze Gate 通过后执行。

### Provider-independent Contract

建议 canonical 位置：

```text
src/shared/contracts/routes/**
```

至少定义：

### Route Request

- origin / destination
- optional waypoints
- travel mode
- transit mode preferences（如适用）
- departureAt / arrivalBy
- timezone / locale
- alternatives requested
- accessibility preferences（只表达产品可支持语义）
- avoid options（tolls/highways/ferries 等，仅在产品需要且 provider 可映射时）

### Route Response

- stable request/result version
- route alternatives
- total duration seconds
- total distance meters
- optional fare amount + currency + confidence/source semantics
- route geometry（明确 internal canonical representation；可选 encoded polyline + precision/version 或 GeoJSON-like coordinate list）
- legs
- segments/steps
- transport mode
- start/end place snapshot/reference
- scheduled departure/arrival instants + timezone
- transit metadata：line name/code, agency, headsign, stops, platform（均可 nullable/unknown）
- walking transfer segments
- realtime/static/source freshness indicator（若 provider 能提供；unknown 不冒充 realtime）
- provider reference IDs 只能出现在 provider metadata/reference slot，不污染公共业务语义

### Error Model

至少规范：

- INVALID_REQUEST
- UNSUPPORTED_MODE
- NO_ROUTE
- OUT_OF_COVERAGE
- RATE_LIMITED
- AUTH_FAILED
- PROVIDER_UNAVAILABLE
- PROVIDER_TIMEOUT
- PROVIDER_RESPONSE_INVALID
- COST_GUARD / quota guard（如需要）
- UNKNOWN

错误必须区分 retryable / non-retryable。

### Schema Rules

- 明确 null / empty / unknown semantics。
- 时间使用 instant + timezone，不用裸 local string 冒充绝对时间。
- distance 统一 meters；duration 统一 seconds；money 统一 minor units + currency。
- Route contract 不直接引用 React/Mapbox SDK types。
- Route contract 不复制 Trip Plan 主 Schema。
- Route reference 到 Trip Item 的持久化边界只记录稳定 reference / derived facts，不在本 Task 修改 8.5 Schema，除非 8.5 已合并且只需 additive compatible hook；否则 deferred。

### Validation / Fixtures

至少：

- walking simple route
- driving with alternative
- multi-leg rail/subway/bus transit
- transfer walking segment
- cross-timezone/date-boundary case
- no-route
- rate-limit
- provider malformed response
- unknown optional transit fields

必须有 runtime validation + negative tests。

## Stage 3 — WBS 7.8 Route Calculation Service / API

仅 Stage 2 Contract Gate 通过后执行。

### Architecture

建议：

```text
src/server/routing/
  service
  provider interface
  adapters/<provider>
  normalization
  cache-key
  errors
src/app/api/... (仅当当前架构需要正式 route handler)
```

原则：

```text
Planner / AI
   ↓
TravelAssist Route Request
   ↓
Routing Service
   ↓
Provider Adapter
   ↓
External API
   ↓
Normalize + Validate
   ↓
TravelAssist Route Response
```

### Provider Adapter

- Provider SDK/payload 只能存在 adapter 内。
- 将 Provider error 映射到 canonical error model。
- 严格 validate 外部 response；外部数据不可信。
- key/secret server-only。
- 不把原始 Authorization header / URL key 打日志。

### API / Service Boundary

必须：

- request validation。
- response validation。
- abort/timeout。
- retry 只针对允许的 transient errors；指数退避需有上限，避免放大成本。
- alternatives 数量上限。
- waypoint 上限。
- payload size limit。
- normalized logging（不含 key/PII）。
- stable test fixtures。

### Cache Boundary

本 Task可以定义和实现最小 cache abstraction / key policy，但不要提前完成 WBS 7.10 全局缓存策略。

至少定义 cache key inputs：

- normalized coordinates/place IDs
- mode
- departure/arrival time bucket（transit/traffic-sensitive）
- waypoints
- provider capability/version
- relevant preferences

TTL 必须遵守 Provider ToS；无法确认的内容不缓存。

### Real Provider Smoke

- 只有本机已经存在合法、未提交的 Provider key 时才运行真实联网 smoke。
- 不要求用户把 key 发到聊天或写入仓库。
- 不存在 key：用官方 response examples + contract fixtures 完成 deterministic tests，并把 live smoke 标 `Deferred`。
- 不得伪造 live provider PASS。

## Explicitly Out of Scope

- `7.2` Places/POI Provider selection。
- `7.4` POI Schema。
- `7.6` Places search API。
- `7.7` POI detail API。
- `7.9` recommendation scoring。
- `7.10` 完整缓存策略。
- `7.11` 全局 Provider failover 策略（本 Task 仅 route-specific normalized failure/minimal fallback boundary）。
- `6.x` AI。
- `4.20–4.24` Engine。
- Booking / payment。
- Planner visual redesign。
- 生产购买/签约/secret 创建。

## Integration With Existing Planner

本 Task 的完成不等于 4.6 / 4.14 已完成。

允许做：

- provider-independent adapter / test bridge，证明当前 Planner 未来可消费 RouteResponse。
- 纯函数 mapping / fixture integration test。

不允许：

- 大改 Planner UI。
- 把真实 Provider 直接绑进 React component。
- 自动将 4.6 / 4.14 标 completed。

真实 Planner wiring 另建后续 Task。

## Validation

根据实际 Stage 执行：

```text
Stage 1 official-source research validation
route contract tests
provider adapter fixture tests
API/service tests
invalid external response tests
timeout/retry tests
secret/client-boundary tests
all Node tests
lint
typecheck
build
changed-file prettier / format audit
git diff --check
optional live provider smoke
```

如果 Stage 1 Blocked，不要求虚构 Stage 2/3 验收，只完成研究、tracking、Result。

## Deliverables

若 Stage 1 通过并完成全线，至少：

```text
docs/architecture/route-provider-selection.md
src/shared/contracts/routes/**
src/server/routing/**
tests/task-021-route*.mjs
docs/tasks/RESULT-TASK-021-a-route-system-mainline.md
docs/project/WBS-TravelAssist.md
.env.example 最小 provider placeholders（无真实 secret）
必要的 package scripts / server route handler
```

如果 Stage 1 Blocked：只提交 provider matrix / Task Result / WBS/Issue tracking，不提交虚构 adapter。

## WBS / Tracking Rules

### Stage 1
- 开始：`7.3 → 进行中`
- 研究完成但需用户决定：`7.3 → 待确认/阻塞`，7.5/7.8 保持未开始
- 技术/商业门槛明确通过：7.3 实现范围进入 `待审查`

### Stage 2
- 启动后：`7.5 → 进行中`
- contract完成：`7.5 → 待审查`

### Stage 3
- 启动后：`7.8 → 进行中`
- service/API完成：`7.8 → 待审查`

只有对应成果合入 `develop` 且用户验收后，才分别标 `已完成`。

Issue #229 在整个路线主线最终验收前保持 Open。
最终实现 PR 必须 Draft → develop，不自动 merge。

## Required Final Result

```markdown
# TASK-021-A Result

## Status
Completed / Partially Completed / Blocked

## Base / Parallel State
- origin/develop base:
- TASK-019-A state:
- TASK-020-A state:
- final develop integration:

## Stage 1 — WBS 7.3
- official sources checked:
- candidate providers:
- Japan walking/driving:
- Japan rail/subway/bus transit:
- pricing/quota verified:
- licensing/cache restrictions verified:
- selected primary:
- selected fallback/transit provider:
- selection gate: PASS / BLOCKED
- blocker requiring user decision:

## Stage 2 — WBS 7.5
- executed: Yes / No
- canonical contract path:
- schema version:
- route/leg/segment/step:
- transit metadata:
- time/distance/fare semantics:
- error model:
- validator/fixtures:

## Stage 3 — WBS 7.8
- executed: Yes / No
- service/API path:
- provider adapters:
- request/response validation:
- timeout/retry:
- cache boundary:
- secret boundary:
- live smoke: PASS / DEFERRED / FAIL

## Validation
- route tests:
- all tests:
- lint:
- typecheck:
- build:
- format/diff:

## Tracking
- Issue: #229
- Branch:
- Commit:
- Draft PR:
- WBS 7.3:
- WBS 7.5:
- WBS 7.8:

## Scope Preserved
- Planner UI unchanged:
- POI 7.2/7.4 untouched:
- AI/Engine/Booking untouched:
- no real secret committed:

## Ready For Review
Yes / No
```

完成或命中 Stage Gate 后停止，不自动启动 7.6、7.9、7.10、7.11 或 Planner wiring。
