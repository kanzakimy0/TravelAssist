# TASK-025-A Result

## Status

Partially Completed / 待验收。

WBS 10.1 的仓库内环境隔离合同与 WBS 10.2 的无 Secret 质量门、本机 standalone 制品和部署演练已完成。真实云隔离、Preview 部署和 Production 发布因没有批准的平台、资源或权限而保持 Deferred / Not authorized，不冒充部署成功。

## Tracking

- GitHub Issue: #236（保持 Open）
- WBS: 10.1 → 10.2
- Implementation Base: `5819270983b4682c76e9ed7c751be9e00612ca0a`
- Final integrated develop: `088f467b8ff666ddd9774f8d6b7ad351fd54f00a`
- Branch: `codex/a-environment-deployment`
- Core implementation: `5185de7e959abc412473c48fa8622b6071382c12`
- Evidence: `d247037`
- Develop integration: `4f28cfb`
- Server-only boundary fix and final rehearsal: `adda614f15faa9cf713f54e73e0d90f67e3256c3`
- Commits through validation: `5185de7`, `d247037`, `4f28cfb`, `adda614`, `1a82ecf`
- Final PR tracking commit: PENDING（见 PR head）
- Draft PR: #249 — `codex/a-environment-deployment` → `develop`

## Conflict audit

- `origin` 已确认指向 `https://github.com/kanzakimy0/TravelAssist.git`。
- 原 `feature/a-planner-v03-interactions` 工作区存在大量未提交 Planner 内容，本任务没有切换、暂存、覆盖或删除这些内容。
- 从当时最新 `origin/develop@5819270` 创建独立 worktree 和实现分支；交付前安全整合执行期间的新 `origin/develop@088f467`，无冲突，并在整合后重新执行全仓测试与部署演练。
- PR #231（安全基线）、#239（Task 文档）和 #245（观测）均为 Draft / 未合并；没有复制或叠加这些实现。
- 最新 develop 同时存在另一个 `TASK-025-A Homepage Animated Background` / Issue #246。本交付按 Issue #236、WBS 10.1→10.2 和完整标题区分，未修改首页 Task 的 WBS 3.2 阻塞记录。

## Stage 0 — Actual audit

- 起始 workflow 只有 `auto-create-pr.yml` 与 `auto-merge.yml`，没有 install/test/build/deploy 质量链。
- GitHub Environments：0。
- GitHub Actions Secret 名称：0；未读取任何 Secret 值。
- 仓库没有已批准 Vercel、AWS、Cloudflare、Netlify 或其他云项目配置。
- 未发现可授权本任务执行真实 Preview 的平台、区域、预算、隔离 DB、回调域或回滚目标。
- 未启动、重置或迁移 Supabase；未修改 Planner、Personal Center 或业务 Schema。

## Stage 1 — WBS 10.1 repository configuration

Completed:

- 区分 `APP_ENV` 与 `NODE_ENV`，并建立类型化 Dev/Preview/Production 合同。
- 建立代码审查的 target、Origin、Supabase project 和 observability target 白名单。
- 当前仓库策略只允许 `development/local`；Preview/Production 默认 fail-closed。
- 校验公开/服务端 Supabase URL、项目 reference、数据库目标与 enabled capability 的一致性。
- `AUTH_SITE_URL` 必须是显式 canonical origin，不依赖 Host / forwarded header。
- `NEXT_PUBLIC_*` 明确按环境独立构建，不能通过运行时替换伪装跨环境制品。
- Evaluation routing 在 Preview、Production 和任何 production build 中继续被拒绝。
- manifest 只记录非敏感配置摘要，不使用 Secret 或 Secret fingerprint。
- 10 个 Dev/Preview/Production 正反例、混用资源、缺失配置和泄漏检查全部通过。

## Stage 1 — real cloud isolation

Deferred。GitHub 没有 Environment、Secret 或批准平台，Preview/Production policy 因此没有 target ID、HTTPS origin 或 Supabase project allowlist。环境变量本身不能绕过该 Gate。

## Stage 2 — quality pipeline

Completed in repository:

- 新增只读权限、无 deployment Secret 的 PR/develop 质量门。
- 运行 locked install、环境校验、真实全仓 Node tests、lint、typecheck、工程格式、standalone build、artifact audit 和 diff check。
- 未审核 PR 不会进入特权 job；没有 `pull_request_target`、任意 PR head + Secret 或 `workflow_run` artifact 提权路径。
- 手动 release rehearsal 只接受当前 `develop` 的完整精确 SHA，并在受信 checkout 后重新执行质量门。
- workflow 包含 timeout、concurrency 和短期受限制品；不调用云供应商。

PR 创建后仍需 GitHub 实际运行 workflow，最终状态单独同步，不以本地 YAML 检查代替 Actions 结果。

## Stage 2 — local deployment rehearsal

PASS on final committed implementation `adda614f15faa9cf713f54e73e0d90f67e3256c3`:

- Next 16.3.4 standalone artifact 构建成功。
- 制品审计：1,650 files，0 sensitive finding。
- liveness：200 / no-store。
- readiness：200 / no-store。
- Home：200。
- Planner：200。
- production route guard：503，Evaluation 未启用。
- release activation 使用 full SHA manifest 与 compare-and-swap；已知上一制品 rollback 和 stale-write 由真实文件状态测试覆盖。
- 实际本机 release pointer 已从整合制品 `4f28cfb` 回滚至已验收制品 `5185de7`，再重新激活 `4f28cfb`；随后对最终修复制品 `adda614` 完成重新构建与 smoke。

没有既存的真实云 release，因此没有伪造 live cloud rollback。数据库 rollback 明确不与应用 rollback 绑定。

## Browser QA

Chrome 152.0.7977.77 对本机 standalone artifact 执行：

| Viewport | Route      | HTTP | Page errors | Overflow | Unexpected console errors |
| -------- | ---------- | ---: | ----------: | -------: | ------------------------: |
| 1440×900 | `/`        |  200 |           0 |        0 |                         0 |
| 1440×900 | `/planner` |  200 |           0 |        0 |                         0 |
| 390×844  | `/`        |  200 |           0 |        0 |                         0 |
| 390×844  | `/planner` |  200 |           0 |        0 |                         0 |

Desktop Home 出现一条无详情的静态资源 404，与修改前基线一致；未作为本任务新增错误隐藏。

## Stage 2 — real Preview

Deferred。缺少批准平台、GitHub Environment protection、限定凭据、Preview HTTPS origin、隔离 Supabase 项目、回调 allowlist、成本/区域决策和已知良好云 rollback target。未发出外部部署写请求。

## Real Production

Not authorized / Not run。没有发布 Production、创建付费资源、修改 DNS、运行远端 migration、启用 Ekiworld Evaluation 或配置生产 Secret。

## Validation

- `npm ci`: PASS（395 packages；0 vulnerabilities）
- `npm run test:deployment`: PASS（10/10）
- `npm run test:routing`: PASS（28/28）
- `node --test "tests/*.test.mjs"`: PASS（693/693）
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run deploy:validate:local`: PASS
- `npm run deploy:build:local`: PASS
- `npm run deploy:verify-artifact`: PASS
- `npm run deploy:rehearse:local`: PASS
- `npm run format:check:deploy`: PASS
- `git diff --check`: PASS
- `npm run format:check`: existing repository documentation debt;本 Task 新增/修改工程文件全部通过，未批量格式化无关历史文档。

## WBS update

- 10.1 → 待审查：仓库内合同已验证，真实云隔离 Deferred。
- 10.2 → 待审查：质量门与本机演练已实现，真实 Preview/Production Deferred。
- 只有 PR 合入、用户验收且后续云 Gate 独立完成后，才能把对应完整 WBS 能力标记为已完成。

## Manual actions required

1. 审查 Draft PR 的环境 allowlist、workflow trust boundary、health 和 rollback 语义。
2. 确认 GitHub quality workflow 的实际运行结果。
3. 若要真实 Preview，先单独批准平台、区域/成本、GitHub Environment protection、凭据方案、Preview URL、隔离 Supabase、Auth callback 和 rollback target。
4. Production 需要新的明确发布授权；本 Result 不能作为上线许可。

## Boundaries preserved

- 无真实 Secret、Cookie、Token 或 `.env.local` 被读取、复制或提交。
- 无 Production、DNS、付费资源、远端 migration 或 Provider 授权变更。
- 无未合并 TASK-023/024/安全实现叠加。
- 未自动合并，未继续其它 Task。
