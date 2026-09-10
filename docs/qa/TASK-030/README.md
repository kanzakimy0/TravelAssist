# TASK-030-B QA

执行基线 b783a101285359a9118d224ae05b1b7c26a498f7；运行时代码零改动。

- browser-report.json：四尺寸 × Guest / 已核验本地 fixture，8 条完整 Home→Start→Planner；另有关闭 JavaScript 的原生 Home→Start 链接。包含所有 URL、CTA hit testing、focus、布局对照、console/error、mutation requests 和 40 张 PNG 路径/哈希。
- test-report.json：当前 711/713，未修改基线 708/710，相同两个资产校验失败。
- asset-baseline-diagnostic.json：四个旧设计 SVG 的已登记 / 实际哈希；记录匹配 CRLF，而仓库文件为 LF。没有改写素材或清单。
- 截图实际文件：F:/CodexWorktrees/TravelAssist-TASK030/.cache/qa/task030/screenshots/，含四尺寸的 Home、Focus、Wizard、Plans、Planner，Guest 与 fixture 分别保存。

## Reproduce

在独立本地工作区 npm ci。沿用 tools/qa/task-024-visual-auth-fixture.mjs 启动 127.0.0.1:54224；此 fixture 只返回合成测试用户，不是线上认证。

本地 .env.local 使用：NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54224、NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_task030_local_fixture、AUTH_SITE_URL=http://localhost:3133。该文件不提交；这些值均为本地测试配置。

先 npm run build，再 npm run start -- -p 3133。在另一终端设置 PLAYWRIGHT_MODULE 为本地现有 Playwright 模块路径（不新增项目依赖），运行 node tools/qa/task-030-main-entry-check.mjs。脚本只接受 localhost / 127.0.0.1。

专项：node --test --test-name-pattern='TASK-030-B' tests/task-025-2-concept-fidelity.test.mjs。
全仓：node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs。

## Limitations

线上 Auth 不在本次范围；no-JS 只验证原生导航，现有互动向导需要 JavaScript。两项资产失败是已复现的基线问题；不因此删改或弱化测试。远端发布被自动审批拒绝，当前只有本地提交，Draft PR 尚未创建。
