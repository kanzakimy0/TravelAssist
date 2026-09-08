# CODEX — TASK-022-A 执行命令

请在 TravelAssist 仓库中完整执行：

`TASK-022-A — 駅すぱあと开发期 Route Schema / Evaluation Adapter`

Repository:
`https://github.com/kanzakimy0/TravelAssist`

Issue:
`#232`

Task spec branch:
`task/a-ekiworld-route-evaluation`

Implementation branch:
`codex/a-ekiworld-route-evaluation`

开始前执行并记录：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

读取远端完整 Task：

```bash
git show origin/task/a-ekiworld-route-evaluation:docs/tasks/TASK-022-a-ekiworld-route-evaluation.md
```

严格按照远端 Task 完整执行。

## Git / Worktree

必须从最新 `origin/develop` 创建独立干净 Worktree / 分支：

```text
codex/a-ekiworld-route-evaluation
```

不得从以下分支叠加：

- `codex/a-route-system-mainline` / PR #230
- TASK-019-A / PR #227
- TASK-020-A
- TASK-017-B / PR #221
- Task spec branch
- Planner 历史工作区

PR #230 只作为 TASK-021 官方研究证据读取，不 cherry-pick。

## 用户已确认的产品决策

```text
日本公共交通开发期 Provider：駅すぱあと
状态：Provisional / Evaluation

生产 Provider：尚未冻结
生产授权/价格/缓存/Mapbox叠加/Web+iOS+Android：仍待商务确认
```

不得重新把开发任务因“生产合同未签”整体 Blocked。

只有以下情况可以 Block 本 Task：

- 当前官方 API 文档无法确认必要 endpoint / request / response 语义，导致无法安全实现 adapter；或
- 发现 public Route Contract 本身存在无法绕开的产品决策冲突。

没有真实 Evaluation credential **不是 Blocker**：没有 credential 时用官方文档 + sanitized deterministic fixtures 实现并测试，Live Smoke 标 `Deferred`。

## 必做 1 — WBS 7.5 Route Contract

建立 provider-independent：

```text
src/shared/contracts/routes/**
```

至少包含：

- RouteRequest
- RouteResponse / Alternatives
- Route
- Leg
- Segment
- Step
- Transit operator / line / service / stop metadata
- departure / arrival + timezone
- duration seconds
- distance meters
- fare minor units + ISO currency
- canonical geometry
- unknown/null semantics
- versioning
- stable canonical error model + retryable
- runtime validators
- minimum/full/transit/bus/multi-transfer/multi-alternative/cross-midnight/error fixtures
- negative tests

严禁把駅すぱあと SDK type / raw response type 作为 TravelAssist public contract。

## 必做 2 — WBS 7.8 Evaluation Routing Service

建立 server-only routing service，例如：

```text
src/server/routing/**
src/server/routing/providers/ekiworld.ts
```

实现：

- provider interface
- EkiworldTransitAdapter
- request mapping
- response normalization
- timeout / AbortSignal
- bounded retry
- normalized errors
- secret-safe config
- evaluation-only production fail-closed guard
- conservative cache policy boundary（默认不可长期持久化 provider raw data）
- deterministic provider fixtures/tests

駅すぱあと endpoint、参数、response shape 必须读取执行时最新官方文档确认，不得凭记忆猜。

## Evaluation Credential Rule

若本机已有合法、未提交的駅すぱあと Evaluation credential：

- 可执行最小真实 smoke。
- 不显示/记录/提交 credential。
- 不提交 raw private response，除非官方条款明确允许且已完全脱敏。

若没有：

- 不要求用户在聊天中粘贴 key。
- 不伪造 key。
- 不把任务 Blocked。
- adapter 用官方文档 + sanitized fixtures 验证。
- `Live Evaluation Smoke: Deferred`。

## Production Gate

实现中必须显式防止 Evaluation Provider 静默进入 production。

例如：

```text
NODE_ENV=production
+
只配置 evaluation entitlement
=> fail closed
```

不能默认 fallback 到 evaluation key。

本 Task 完成后仍不得声称：

- 生产价格已确认
- 正式保存/再展示权已确认
- Mapbox叠加展示许可已确认
- Web+iOS+Android正式许可已确认
- production cache TTL 已确认

## 不得实现

- 7.2 / 7.4 / 7.6 / 7.7 / 7.9 POI线
- 完整 7.10 cache
- 完整 7.11 provider failover
- Planner视觉/真实路线接线
- AI 6.x
- Engine 4.20–4.24
- Booking/Payment
- Production purchase/contract
- 真实 secret 创建或提交

## Validation

至少执行：

```text
all route contract tests
all adapter tests
all repository tests
lint
typecheck
build
changed-file format check
git diff --check
client bundle server-only/secret leakage check
```

如全仓 format 有历史债，必须与最新 develop 对比后如实记录，不批量格式化无关文件。

## Final Integration

完成实现后：

1. `git fetch --all --prune`
2. 检查最新 `origin/develop`
3. 如 TASK-019-A / TASK-020-A / TASK-017-B / 其他共享基础设施已合入，安全整合最新 develop
4. 保留其他 Owner WBS/Result
5. 重跑本 Task 全部 tests + full tests / lint / typecheck / build
6. 更新：
   - `docs/tasks/RESULT-TASK-022-a-ekiworld-route-evaluation.md`
   - `docs/project/WBS-TravelAssist.md`
   - Issue #232
7. push `codex/a-ekiworld-route-evaluation`
8. 创建 Draft PR → `develop`
9. 禁止自动 merge

WBS 最终状态必须准确：

```text
7.3 = 待确认（开发期 Provisional Provider = 駅すぱあと）
7.5 = 待审查（实现完成时）
7.8 = 待审查（Evaluation/development subset；Production Gate未关闭）
```

完成后按 Task 的 `Required Final Result` 格式返回，并停止，不自动执行后续 Task。

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```
