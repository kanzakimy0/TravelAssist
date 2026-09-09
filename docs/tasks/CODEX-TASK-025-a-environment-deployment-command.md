# Codex — TASK-025-A 执行指令

只执行 TASK-025-A / Issue #236，不要执行其他 Task、自动合并或生产上线。

Repository：`https://github.com/kanzakimy0/TravelAssist.git`
Implementation branch：`codex/a-environment-deployment`
Spec branch：`task/a-route-observability-deployment-20260909`

## 执行规则

保留原工作区未提交内容，确认正式 remote 后刷新最新 `origin/develop`，从其创建独立 worktree。文档分支只用于读取本 Task、command 和共同计划，不复制旧业务源码、WBS、lockfile 或未合并实现。

先完成 WBS 10.1 的实际配置/CI/平台审计、环境合同、资源白名单和正反例；仓库内验收通过后才进入 10.2。无批准云目标时完成供应商无关的本地 build、制品审计、启动、health/readiness、smoke、质量门与回滚控制，把真实 Preview/Production 单列 Deferred。

未审核 PR 不得接触部署凭据。部署只可消费经过验证的 `develop` 精确 SHA。禁止 Production 发布、DNS/付费资源、远端业务 migration、真实 Secret、Evaluation 生产放行、假 URL 或占位成功脚本。

执行专项测试、真实本机部署/浏览器验收、全仓 tests、lint、typecheck、format、build 和 diff 检查。更新 Task、Result、Master WBS、Issue，推送 `codex/a-environment-deployment` 并创建到 `develop` 的 Draft PR。保持 Issue Open，不自动合并或开始下一 Task。

禁止 `git clean -fd`、`git reset --hard`、`git push --force` 和 `git push --force-with-lease`。
