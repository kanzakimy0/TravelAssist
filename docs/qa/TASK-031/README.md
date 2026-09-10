# TASK-031-B QA / 视觉验收

执行基线 7f0c292186079cca7ad639ceb550f7d0e4f43cc7；实现提交 18dd0bbcbef1b77717f3898a68a0c5598b59e77b。

- [完整 Result](../../tasks/RESULT-TASK-031-b-main-account-entry-closeout.md)
- [账户行为 64/64](account-browser-report.json)；[冻结区域几何 36/36 一致](geometry-report.json)；[测试及两项旧 baseline failures](test-report.json)。
- production Edge / Chromium；以下均为实际页面截图。已验证账户使用仅限本地 QA 的演示资料和已有头像，不代表线上 Provider 验收。
- WebP 由原始 PNG 编码，未修改内容；[evidence.json](evidence.json) 保存双方 hash。原始 PNG 本地 .cache/qa/task031/current/ 与 interaction/。

## 四尺寸截图

| 尺寸 | Home Guest | Start Verified | Planner Menu | Detail Verified | Personal Center |
| --- | --- | --- | --- | --- | --- |
| 1440×900 | [Home](screenshots/1440-guest-home.webp) | [Start](screenshots/1440-verified-start.webp) | [账户菜单](screenshots/1440-planner-account-menu.webp) | [Detail](screenshots/1440-verified-detail.webp) | [PC](screenshots/1440-verified-personal.webp) |
| 1024×768 | [Home](screenshots/1024-guest-home.webp) | [Start](screenshots/1024-verified-start.webp) | [账户菜单](screenshots/1024-planner-account-menu.webp) | [Detail](screenshots/1024-verified-detail.webp) | [PC](screenshots/1024-verified-personal.webp) |
| 390×844 | [Home](screenshots/390-guest-home.webp) | [Start](screenshots/390-verified-start.webp) | [账户菜单](screenshots/390-planner-account-menu.webp) | [Detail](screenshots/390-verified-detail.webp) | [PC](screenshots/390-verified-personal.webp) |
| 320×568 | [Home](screenshots/320-guest-home.webp) | [Start](screenshots/320-verified-start.webp) | [账户菜单](screenshots/320-planner-account-menu.webp) | [Detail](screenshots/320-verified-detail.webp) | [PC](screenshots/320-verified-personal.webp) |

完整 Guest / Verified 共 40 张见 [screenshots](screenshots)。

## 本地复现

1. npm ci；设置 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54224、NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_task031_local_fixture、AUTH_SITE_URL=http://localhost:3134。这些仅为本地 fixture 配置。
2. 独立终端设置 TASK_031_AUTH_FIXTURE=1，运行 node tools/qa/task-024-visual-auth-fixture.mjs。保持回环地址绑定，不向公网部署 fixture。
3. npm run build；npm run start -- -p 3134。
4. 将 PLAYWRIGHT_MODULE 指向本机已安装 Playwright 模块。运行 node tools/qa/task-031-main-account-check.mjs。脚本使用明确的本地验收账号经过原有邮箱登录表单、菜单退出、Back/Forward。
5. 设置 QA_PHASE=current；运行 node tools/qa/task-031-account-geometry.mjs；默认 localhost:3134。对照基线在未修改 execution base 单独 build/start 3135 后，设置 TASK_031_URL=http://localhost:3135、QA_PHASE=baseline 运行同一脚本。
6. Detail 首次确认使用现有“保存到浏览器并进入详情”按钮；非云端保存，也不需要登录。

基线 worktree 的 dependency junction 曾触发 Turbopack root 限制；移除 junction 链接本身并在基线独立 npm ci 后标准 build 通过。测试不依赖修改 next.config 或运行时代码。
