# TASK-025-A — WBS 10.1 → 10.2 环境隔离与受控自动部署

## Metadata

- Task ID: TASK-025-A
- Owner: A / Shared Infrastructure / Release
- Status: 进行中
- WBS: 10.1 → 10.2（分阶段记录）
- Priority: 10.1 P0 / 10.2 P1
- GitHub Issue: #236
- Branch: `codex/a-environment-deployment`
- Spec Branch: `task/a-route-observability-deployment-20260909`
- Depends On: 10.1 依赖 2.5 / 8.1；10.2 依赖 2.8 / 10.1 的实际可用基线
- Commit: PENDING
- Pull Request: PENDING
- Authoring Base: `1af72af0d7151af4dd59073ee0b015a70b267064`
- Implementation Base: `5819270983b4682c76e9ed7c751be9e00612ca0a`
- Result File: `docs/tasks/RESULT-TASK-025-a-environment-deployment.md`

## Goal and authorization

先把 Dev / Preview / Production 的配置、资源和权限分开，再建立可验证的质量门、构建制品、健康检查与部署/回滚路径。本 Task 不授权创建云账号、购买资源、修改 DNS、执行远端业务 migration 或发布 Production。

真实非生产部署仅在已有明确批准的平台、目标、凭据和隔离权限可核验时执行；否则交付仓库内实现并将外部步骤标为 Deferred。

## Stage 0 — Actual audit

读取 Master WBS、环境变量、DB/Migration、Auth、Routing、CI 和部署配置。自动建 PR/自动合并不是质量或部署流水线。检查安全基线和观测任务的实际合并状态，不复制未合并实现。

平台/区域/预算未确认时，不任意选定 Vercel、AWS 等供应商，也不安装供应商专用部署链。

## Stage 1 — WBS 10.1

- 使用 `APP_ENV=development|preview|production` 表示应用资源环境；`NODE_ENV` 只保留工具链合法值。
- 记录变量 owner、公开/秘密、构建/运行时、启用条件、来源和验证方法。
- 保留既有 Mapbox、Supabase、Auth、Routing 和观测变量边界。
- 建立可信 target、Origin、Supabase project 和观测目的地白名单；变量本身不能新增信任。
- 检查 public/server Supabase 与数据库目标一致性；无法可靠核验时禁止外部写入。
- `AUTH_SITE_URL` 只能来自显式可信配置，不能从请求 Host 或 returnTo 推导。
- Preview/Production 禁止 Evaluation；Production routing 仍需独立批准。
- `NEXT_PUBLIC_*` 按环境独立构建；manifest 只含非敏感配置信息。
- 交付可执行校验、类型化合同、模板、正反例和环境隔离文档。

Stage 1 仓库内实现通过后才能进入 Stage 2。没有批准云目标时，记录“本地配置隔离已验证，云目标 Deferred”。

## Stage 2 — WBS 10.2

- 为未审核 PR 建立无部署 Secret 的 install/test/lint/typecheck/format/build/安全边界质量门。
- 受信 release 只消费已审查并合入的 `develop` 精确 SHA，不使用 `pull_request_target` 执行 PR head。
- 建立供应商无关的 Next standalone 制品、manifest、敏感文件审计、启动和 HTTP smoke。
- 建立最小 liveness/readiness；不调用付费服务、不写表、不迁移、不暴露配置。
- 建立 timeout、concurrency、不可变 release 和 compare-and-swap 回滚控制。
- 外部 Preview 必须满足批准目标、隔离资源、限定权限、质量/安全检查、环境/回调校验、健康与回滚全部 Gate。
- Production 工作流保持禁用；应用回滚不得自动回滚数据库。

## Acceptance and delivery

交付环境隔离文档、部署 runbook、环境校验与测试、build/artifact/smoke/rehearsal 工具、必要 workflow、Result / WBS / Issue / Draft PR。

分别报告：10.1 仓库内配置、10.1 真实云隔离、10.2 质量流水线、10.2 本机部署演练、10.2 真实 Preview、真实 Production。未运行的外部部署写 Deferred / Not authorized，不得写 PASS。

执行 `npm ci`、专项测试、全仓 Node 测试、lint、typecheck、format、build 和 `git diff --check`。完成后状态为待验收/待审查，Issue 保持 Open，PR 保持 Draft；不自动合并或启动下一 Task。
