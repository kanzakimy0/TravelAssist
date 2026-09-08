# TASK-022-A — 駅すぱあと开发期 Route Schema / Evaluation Adapter

## Metadata

- Task ID: `TASK-022-A`
- WBS: `7.5` + `7.8`（Evaluation / development subset）
- Related WBS: `7.3`（production provider selection remains pending）
- Owner: `A`
- Responsibility: `Main Travel System / Routing`
- Priority: `P0`
- Status: `Ready / 用户已明确授权先用駅すぱあと开发`
- GitHub Issue: `#232`
- Spec branch: `task/a-ekiworld-route-evaluation`
- Planned implementation branch: `codex/a-ekiworld-route-evaluation`
- Authoring base: `develop@74bc3cccf8bcfd603706e2b96d4072076191f308`
- Predecessor: `TASK-021-A / #229 / Draft PR #230` — Stage 1 research completed, production selection blocked.

## Product Decision

用户已明确决定：

> 开发阶段先用「駅すぱあと」继续日本公共交通路线系统开发，不等待最终商务报价与生产授权冻结。

该决定的含义是：

```text
7.3 Production Provider Selection
    = 仍待确认

Development Provider
    = 駅すぱあと Webサービス
      Provisional / Evaluation only

7.5 Route Schema
    = 可以立即开发

7.8 Route Calculation API
    = 只实现 Evaluation / development subset
      不得标 Production Ready
```

## Objective

建立 TravelAssist 自有、provider-independent 的路线 Contract，并实现一个 server-only 的 `EkiworldTransitAdapter`，把駅すぱあと开发/评价环境返回的数据归一化为 TravelAssist Route 模型。

核心目标：

```text
Planner / AI / Engine
        ↓
TravelAssist Route Contract
        ↓
Routing Service
        ↓
EkiworldTransitAdapter
        ↓
駅すぱあと Evaluation / development API
```

未来如改用 Jorudan / NAVITIME，只新增或替换 Adapter，不修改 Planner、AI、Engine 的公共 Route Contract。

## Canonical Sources

执行前必须读取：

- `CONTRIBUTING.md`
- `AGENTS.md`
- `docs/project/WBS-TravelAssist.md`
- `docs/development/task-tracking.md`
- `docs/architecture/cross-module-contract-handoff.md`
- `docs/architecture/route-provider-selection.md`（TASK-021 research，若尚未合入 develop，则从 PR #230 / branch 只读）
- `docs/tasks/RESULT-TASK-021-a-route-system-mainline.md`（同上）
- 当前 Planner transport / route presentation model
- 当前 Mapbox / routing helper
- 当前 `.env.example` 与 env validation
- 当前 tests / build / server-only boundary patterns
- 駅すぱあと Webサービス当前官方 API 文档、evaluation / trial 文档和利用条件

对駅すぱあと endpoint、参数名、response shape、entitlement、rate/usage 限制，不得仅凭模型记忆；必须以当前官方资料为准。

## Start Gate / Git Rules

开始前：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

要求：

1. 从最新 `origin/develop` 建立独立干净 Worktree / `codex/a-ekiworld-route-evaluation`。
2. 不从 PR #230、TASK-019-A、TASK-020-A 或其他 feature branch 叠加开发。
3. PR #230 只作为研究证据读取，不 cherry-pick 其实现分支；如果其研究文档尚未合入 develop，可通过 GitHub / `git show origin/codex/a-route-system-mainline:<path>` 只读参考。
4. 最终交付前必须重新 fetch 最新 develop；如果 TASK-019 / TASK-020 / TASK-017 或其他共享基础设施已合入，安全整合并重跑全部验证。

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

## Production-License Gate

本 Task **不得**声称以下事项已经解决：

- 正式生产合同价格
- 月调用量正式报价
- 用户 Trip 中长期保存/再展示 API 结果的正式许可
- Mapbox 底图上叠加駅すぱあと geometry / route / stop 数据的正式许可
- Web + iOS + Android 同一合同授权
- 生产 cache TTL / retention 条款
- SLA / support / commercial attribution 最终条件

因此必须在代码与文档层明确区分：

```text
Development / Evaluation Ready
vs
Production Licensed / Ready
```

不得通过环境变量默认值或 feature flag 把 Evaluation Provider 静默带入 production。

## Stage A — WBS 7.5 Provider-independent Route Schema

必须建立 TravelAssist 自有 Route Contract，建议路径：

```text
src/shared/contracts/routes/
  index.ts
  validation.ts
  fixtures.ts
```

不得导入駅すぱあと SDK / response types 到 public contract。

### Route Request

至少表达：

- origin
- destination
- optional waypoints
- requested mode / mode family
- departure-at / arrival-by intent
- locale / language hint
- timezone context
- alternatives count / preference
- accessibility / walking preference placeholder（只定义可扩展字段，不发明未冻结产品规则）

Place reference 至少支持：

- opaque stable/reference id（可空）
- display name（可空）
- coordinates（可空）

### Route Response / Alternative

至少：

- route id / opaque provider reference boundary
- summary
- duration seconds
- distance meters
- departure / arrival instants + timezone
- fare amount in minor units + currency（可空）
- geometry（canonical representation）
- legs
- warnings / notices
- data freshness / source metadata（不得泄漏 provider private payload）

### Leg / Segment / Step

需要覆盖：

- walking
- rail
- subway
- bus
- tram / streetcar
- ferry
- flight placeholder only if source returns it; do not implement flight booking
- transfer / waiting
- other / unknown fallback

Transit metadata 至少：

- operator
- line / route name
- service / train name where available
- origin stop / destination stop
- platform / track where available
- departure / arrival
- stop count
- direction / destination sign where available
- fare component where available
- reservation / seat requirement as informational metadata only

### Time / Money / Geometry Semantics

- duration = integer seconds
- distance = integer meters
- money = integer minor units + ISO 4217 currency
- local date and instant semantics must be explicit
- timezone must be IANA when present
- missing = null, not fabricated zero
- unknown codes must have read-side fallback, not crash future payloads
- geometry representation must be provider-independent; choose one canonical format and document it (GeoJSON LineString or encoded polyline + precision, but one public canonical source)

### Error Contract

至少：

- invalid_request
- unsupported_mode
- no_route
- provider_unavailable
- provider_timeout
- provider_rate_limited
- provider_auth
- provider_contract_error
- normalization_error
- unknown

每个错误至少包含：

- stable code
- retryable boolean
- safe user-facing category
- provider diagnostic fingerprint/redacted metadata（不得泄漏 secret/raw private payload）

## Route Validation

必须提供 runtime validator，覆盖：

- invalid coordinates
- invalid durations/distances
- invalid money
- reversed times
- dangling leg/step references
- duplicate IDs
- malformed geometry
- unknown contract version
- private extra/provider payload injection

Fixtures 至少：

- minimal walking-connection + rail route
- multi-transfer rail/subway route
- bus route
- mixed transit + walking
- multiple alternatives
- fare present / fare unknown
- cross-midnight
- timezone boundary
- missing optional station/platform metadata
- unknown future mode
- error fixtures

## Stage B — WBS 7.8 Evaluation Routing Service

建议路径：

```text
src/server/routing/
  service.ts
  types.ts
  providers/
    ekiworld.ts
```

### Server-only Boundary

- Provider credential 必须 server-only。
- 不允许 `NEXT_PUBLIC_` 暴露 private key / access key。
- browser bundle 不得包含 provider endpoint credential、secret name values 或 server-only adapter code。
- `.env.example` 只允许 placeholder / documented variable name。

### EkiworldTransitAdapter

必须：

1. 以当前官方文档定义真实 endpoint / query 参数，不猜。
2. 把 request 转换成駅すぱあと API 请求。
3. 把駅すぱあと response 归一化为 TravelAssist Route Contract。
4. raw provider payload 不向 Planner / public API 透传。
5. 未知/新增 provider 字段安全忽略或记录 redacted diagnostic。
6. provider error / HTTP error / timeout / parse error 归一成 canonical Route error。
7. support AbortSignal / bounded timeout。
8. retry 仅用于明确 retryable 的网络/5xx/429 情况，次数有限；不得对 validation/auth/contract error 重试。
9. 请求参数和日志不得含 secret。

### Evaluation Guard

必须有显式保护，避免 evaluation provider 在生产环境被无意启用。可以采用：

- env mode + explicit `ROUTING_PROVIDER_MODE=evaluation`
- server config validation
- production startup fail-closed

具体实现可由 Codex按现有 config framework 选择，但必须做到：

```text
NODE_ENV=production
+
未配置 production-approved provider entitlement
=> fail closed / adapter unavailable
```

不得默认 fallback 到 evaluation key。

## Live Evaluation Smoke

只有在当前工作站已经存在**用户合法配置且未提交 Git 的駅すぱあと Evaluation credential**时才允许执行真实 smoke。

如果没有：

- 不询问用户在聊天中粘贴 secret。
- 不创建伪造 key。
- 用官方文档结构 + sanitized fixture 完成 adapter 测试。
- Result 写 `Live Evaluation Smoke: Deferred — credential not present / entitlement not verified`。

真实 smoke 若执行：

- 只做最小调用。
- 不记录完整 credential/query。
- 结果报告只记录 route summary / status / latency / normalized field coverage，不保存受限制 raw payload，除非官方条款明确允许且 fixture 已完全脱敏。

## Cache Boundary

本 Task 不完成 WBS 7.10。

仅定义：

- canonical cache key inputs
- provider-specific cache policy capability interface
- default `no persistent cache` / conservative behavior
- production TTL 必须等待正式合同确认

不得默认长期存储 provider route response。

## Mapbox Boundary

本 Task **不把駅すぱあと线路直接接进 Planner Mapbox UI**。

只在 architecture 文档记录：

- public Route Contract 可携带 canonical geometry if provider/legal terms permit
- 正式在 Mapbox 上展示前需关闭 licensing gate
- 如果正式授权不允许保存/叠加 geometry，adapter/service 必须可降级为仅 itinerary textual transit facts，而不破坏 public Route Contract

## Required Tests

至少：

### Contract tests
- validators
- fixtures
- unknown fallback
- negative inputs
- private provider payload rejection

### Adapter tests
- request mapping
- response normalization
- mixed rail/subway/bus/walking
- fare mapping
- time mapping
- missing fields
- provider errors
- malformed payload
- timeout
- rate-limit
- retry bounds
- secret redaction

### Boundary tests
- server-only module not reachable from client graph
- client bundle no provider secret/env value
- production evaluation guard fail-closed

### Regression
- existing Planner/Mapbox UI unchanged
- existing transport presentation tests remain green

## Required Validation

执行并如实记录：

```text
npm ci（如当前独立 worktree需要）
all relevant Node tests
all repository tests
lint
typecheck
build
changed-file formatting
git diff --check
client bundle secret/server-only boundary scan
```

如果全仓 format 仍有历史基线问题，必须逐项与最新 develop 区分，不得批量格式化无关文件。

## Documentation

必须新增或更新：

```text
docs/architecture/route-contract.md
docs/architecture/ekiworld-evaluation-routing.md
```

内容至少包括：

- TravelAssist Route Contract ownership
- Provider adapter boundary
- Development provider decision
- Production unresolved license gates
- data retention/cache conservative default
- future Jorudan / NAVITIME adapter replacement path
- Mapbox display licensing gate

## WBS / Tracking Rules

启动后：

- 7.3：保持 `待确认`，但补充 `开发期 Provisional Provider = 駅すぱあと`
- 7.5：`进行中`
- 7.8：`进行中（Evaluation subset）`

实现完成但未合并：

- 7.5：`待审查`
- 7.8：`待审查（Evaluation / development subset；Production Gate 未关闭）`
- 7.3：仍 `待确认`

只有用户验收 + PR 合入 develop 后，才能将本 Task 实现子集标记为完成；不能因此把 7.3 production selection 或完整 7.8 production routing 标为完成。

## Parallel Work Integration

当前并行可能存在：

- TASK-019-A / PR #227 — Trip Plan Schema
- TASK-020-A / #228 — global security
- TASK-017-B / PR #221 — preference/draft persistence
- TASK-021-A / PR #230 — research evidence

最终交付前：

1. fetch latest `origin/develop`
2. 安全整合最新 develop
3. 不覆盖其他 Owner 的 WBS/Result
4. 如 `.env.example` / shared contracts / CI / package files发生冲突，只做最小必要整合
5. 重跑全部本 Task tests + full tests / lint / typecheck / build

## Explicitly Out of Scope

- 正式生产 Provider 商务选型完成
- 供应商询价/签约
- POI Provider / Schema / Search
- 完整 route cache
- Provider failover production orchestration
- Planner UI route replacement
- AI itinerary generation
- TravelAssist Engine
- booking/payment
- flight booking/search
- native mobile implementation
- production secret creation

## Required Final Result

```markdown
# TASK-022-A Result

## Status
Completed / Partially Completed / Blocked

## Base / Parallel State
- origin/develop:
- TASK-019-A:
- TASK-020-A:
- TASK-017-B:
- TASK-021-A / PR #230:

## Development Provider Decision
- Ekiworld provisional/evaluation:
- production provider frozen: No
- production licensing gates:

## WBS 7.5 Route Contract
- contract version:
- request:
- route/alternative:
- leg/segment/step:
- transit metadata:
- time/distance/fare:
- geometry:
- errors:
- validators:
- fixtures:

## WBS 7.8 Evaluation Routing
- server service:
- Ekiworld adapter:
- request mapping:
- normalization:
- timeout/retry:
- evaluation production guard:
- cache boundary:
- live smoke:

## Security
- credential committed: No
- client leakage:
- log redaction:

## Validation
- tests:
- lint:
- typecheck:
- build:
- format:
- diff check:

## Tracking
- Issue: #232
- Branch:
- Implementation Commit:
- Final Head:
- Draft PR:
- WBS updated:

## Production Gate Remaining
- pricing:
- usage volume:
- saved/re-display rights:
- Mapbox mixed-display rights:
- Web/iOS/Android rights:
- cache/retention:

## Scope Preserved
- Planner UI:
- POI:
- AI:
- Engine:
- Booking/Payment:

## Ready For Review
Yes / No
```

完成后停止，不自动执行 7.10 / 7.11 / Planner route integration / AI。
