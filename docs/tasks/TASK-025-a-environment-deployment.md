# TASK-025-A — WBS 10.1 → 10.2 环境隔离与受控自动部署

## Metadata

- Task ID: TASK-025-A
- Owner: A / Shared Infrastructure / Release
- Status: 待开始
- WBS: 10.1 → 10.2（分阶段记录）
- Priority: 10.1 P0 / 10.2 P1
- GitHub Issue: #236
- Branch: `codex/a-environment-deployment`
- Spec Branch: `task/a-route-observability-deployment-20260909`
- Depends On: 10.1依赖2.5/8.1；10.2依赖2.8/10.1的实际可用基线
- Commit: PENDING（实现未开始）
- Pull Request: PENDING（实现 PR）
- Authoring Base: `1af72af0d7151af4dd59073ee0b015a70b267064`
- Result File: `docs/tasks/RESULT-TASK-025-a-environment-deployment.md`

## 1. 目标与授权

先把Dev/Preview/Prod的配置、资源和权限分开，再建立可验证的质量门、构建制品、健康检查与部署/回滚路径。用户本轮选定的是开发Task，不是创建云账号、开通付费服务、修改DNS或发布生产的授权。

允许完整执行仓库内Stage1和通过其验收后的Stage2。真实非生产部署仅在已有明确批准的平台、目标、凭据和隔离权限可核验时执行；否则交付仓库内实现并标外部步骤Deferred。不能因缺平台就放弃所有工程，也不能用假成功代替上线。

共同规则：`docs/project/A-TASK-023-025-execution-plan.md`。

## 2. Stage 0 — 实际前置审计

读Master WBS、环境变量/DB/Migration/模块边界规范、`.env.example`、`next.config.*`、package/lock、Auth origin/回调/Cookie、现有CI/部署配置、当前已合并安全检查。只读实际允许的非敏感配置；不打印Secret值，不搜索凭据存储。

定义基线 `.github/workflows/` 仅有auto-create-pr与auto-merge，不是已经验证的install/lint/test/build/deploy pipeline。启动时重新查最新develop及#231；若仍缺质量门，明确记录2.8“文档/记录与实际运行能力差异”，在本任务只补部署必需的无Secret质量检查，不改历史完成记录凑结论。

查已有部署平台与project配置，复用明确已批准目标；配置存在不等于已获发布许可。若平台/区域/预算未确认，记录待决矩阵和最小操作清单，不任意选定Vercel/AWS等，不安装一套未经确认的供应商专用部署链。

不依赖#221/#227未合并业务Schema。需要数据库测试时只使用当前已合并SQL和隔离本地/临时DB，不把旧分支迁移带入。

## 3. Stage 1 — WBS 10.1 环境隔离

### 3.1 环境合同

分别定义应用环境与Node运行模式。可新增明确的应用环境标识（建议 `APP_ENV=development|preview|production`，先查是否已有）；`NODE_ENV`仍只使用工具链合法模式，不设为preview/staging。

明确每个变量的owner、公开/秘密、构建期/运行时、各环境必填条件、空值行为、源和校验方法。保留已用名称：

- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL` / `SUPABASE_SECRET_KEY` / `DATABASE_URL`
- `AUTH_SITE_URL`
- `ROUTING_PROVIDER_MODE` / `EKIWORLD_ACCESS_KEY` / `ROUTING_EKIWORLD_PRODUCTION_APPROVED`

025负责映射，不把公开Key误称成服务端Secret，也不因公开可见就忽略域名/额度限制。023/024新增变量如已合并则保留；未合并只记录接口，不能复制实现。

### 3.2 隔离矩阵

| 资源 | Dev | Preview | Production |
| --- | --- | --- | --- |
| DB/Auth | 独立Local/临时测试目标 | 独立非生产项目，合成数据 | 明确批准的生产目标 |
| 应用URL/Auth origin | 显式loopback origin | 确认的HTTPS preview origin | 确认的HTTPS生产origin |
| 路线 | 明确授权才可Evaluation | 当前production build下Evaluation禁用 | 无生产授权时禁用 |
| 观测 | test sink/脱敏本地 | 默认无外传，已批准才启用 | 需独立启用与保留期确认 |
| 数据与操作 | 不读取真实用户数据 | 不共享生产Cookie/DB/凭据 | 不运行reset或试验数据脚本 |

实现可信环境清单和资源白名单校验，不能只看hostname包含preview/prod文字。核对public/server Supabase指向同一预期项目、DATABASE_URL对应目标、池化URL/项目引用的实际规则；配置无法可靠核验时禁止外部写入。拒绝缺失配置的静默生产fallback。

`AUTH_SITE_URL`显式配置，不由Host/X-Forwarded-Host/用户returnTo拼接。检查回调allowlist、Cookie范围和Secure设置，不扩大通配域名或放宽Auth保护。跨环境登录/Session不能串用。

公开变量会在构建期固化：采用按环境独立构建，或经过实际测试的安全runtime-public-config策略，不能把Dev构建直接搬Prod然后声称环境变量已切换。制品manifest含commit/环境/非敏感配置指纹，不含Secret或可反推Secret的指纹。

### 3.3 可执行验证与产物

交付环境校验脚本、类型化最小配置入口/测试、模板和操作文档。模板只存占位；真实配置留既有安全存储。校验涵盖Dev/Preview/Prod、缺配置、混用资源、非法origin、未知环境、Evaluation生产禁用、错误public/server映射和build/runtime差异。

只针对启用的能力要求其变量；禁用AI/路线/云DB时不阻塞纯构建。但执行外部部署前必须用目标环境执行强校验，不能沿用CI无配置模式。

Stage1仓库内实现和测试通过后才继续Stage2。云目标未有时不把10.1全项写完成；报告“本地配置隔离已验证，云目标Deferred”。

## 4. Stage 2 — WBS 10.2 部署工程

### 4.1 质量门与信任边界

复用最新develop真实质量检查。缺失时建立本任务所需无部署Secret的install、lint、typecheck、实际Node测试、构建、环境/路由生产保护及必要安全检查；保持现有自动建PR/合并文件原样。

未审核PR（包括同仓库PR）只运行无部署凭据的CI。部署只消费明确已审查/合并的受信ref与精确SHA，并核对同SHA检查结果。不能仅以“非fork”作为可信；不能用pull_request_target检出PR head并运行代码、借workflow_run执行不可信artifact、把下载脚本带进特权job。

Actions最小权限、固定可核验版本或完整commit SHA、明确timeout、环境concurrency、独立job与受限制品。输入验证后才使用；不把PR标题/分支/任意URL直接插入shell。优先使用平台支持且已批准的短期凭据；不擅自配置OIDC信任或新Secrets。

必要检查实际失败时禁止deploy；既有format债单列，不能continue-on-error变成“全绿”。需要窄范围例外时记录独立批准，否则停外部发布阶段，不影响已完成仓库内报告。

### 4.2 构建与可运行制品

即使云平台未确定，也要交付本机/CI可跑的build、配置校验、启动、HTTP smoke和安全检查链，不只是echo脚本或TODO。制品边界要能审计：不上传.env、数据库dump、cookie、HAR或工作目录；不把Secret透传到Docker build args/public bundle。

支持当前Next server/SSR/Auth/Route Handler能力，不擅自改为静态导出以逃避后端部署。依据已有目标选择兼容打包方式；无平台时保留供应商无关的可运行本地链，供应商adapter和实际云部署单列Deferred。

health只报告最小存活信息，readiness区分必要能力与选配能力；超时/DB不可用返回安全不可用，不泄漏版本配置细节或Provider key。不得每次健康检查调用付费路线API。健康检查不能写业务表或自动迁移。

### 4.3 非生产部署 Gate

真实Preview必须同时具有：明确批准目标与操作、可核验隔离资源、有效限定权限、当前SHA质量检查通过、适用安全扫描通过、环境和回调校验、回滚目标与健康检查。

缺任一项就不发外部写请求，列出缺项；不创建账号/付费资源，不向用户索取在聊天粘贴Secret。已有平台可使用当前可用工具查询非敏感状态；不可用就记录真实限制。

有配置并获既有许可时执行一次受控非生产部署和smoke：真实URL、部署ID、commit、环境、时间、health结果。失败时保留安全证据，执行已批准范围内的非生产回退，不留下“失败但标成功”。

### 4.4 Production与回滚

生产配置/工作流只做默认禁用的准备；本Task不触发Production发布、不启用路线生产授权、不改DNS、不运行远端业务migration。仅写 `environment: production` 不证明GitHub保护已配置；需检查实际计划/权限/保护能力，无法验证时继续禁用。

记录应用回滚到已知良好制品/SHA的步骤，并在本地或授权非生产演练。应用回滚不等于数据库回滚：禁止自动down migration/reset，schema回退、备份恢复、expand/contract另有审批。预览取消旧任务不应误取消正在进行的生产部署。

## 5. 验收与交付

至少交付：

- `docs/deployment/environment-isolation.md`：环境矩阵、构建/runtime差异、必填项和安全边界。
- `docs/deployment/deployment-runbook.md`：平台审计、可执行本地链、目标配置清单、质量门、回滚与故障排查。
- `tools/deploy/` 或既有约定目录下校验/build/smoke脚本、`tests/task-025-*.test.mjs`与必要workflow。
- Dev/Preview/Prod正反例、production路由零Evaluation出站、无Secret bundle/制品、untrusted PR无凭据、quality gate阻断、timeout/并发/回滚测试。
- Result / Issue / Master WBS / Draft PR。外部平台配置和真实凭据不提交。

按共同规则跑全仓检查；实际运行CI和本机smoke，不能只做YAML字符串断言。权限不足/网络受限时准确列出未跑项。

Result分别报告：10.1仓库内配置、10.1真实云隔离、10.2质量流水线、10.2本机部署演练、10.2真实Preview、真实Production。只完成仓库内工程时Task为待验收（部分），大WBS不标全部完成。未执行的真实Production明确Not authorized / Not run，而非PASS。

## 6. 官方参考

核对日期：2026-09-09；具体平台未在本任务中替用户选定。

- https://nextjs.org/docs/pages/guides/environment-variables
- https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments
- https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target

环境保护能力受仓库实际设置/权限/套餐影响；文档里的功能不能代替现场验证。任何Provider生产审批仍以仓库既有gate和明确授权为准。
