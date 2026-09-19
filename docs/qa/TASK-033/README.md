# TASK-033-B QA

执行基线：0f7955ae62e04aeacf43f56dcacf2a9249582e96；实现提交：79f899b4228e62f1ad7c9a3d755b3805fa36e99f。

- [完整 Result](../../tasks/RESULT-TASK-033-b-ai-floating-entry-closeout.md)
- [浏览器报告](browser-report.json)：18/18 AI cases，16组主页面前后对照，0 errors / mutation requests。
- [测试报告及三项基线失败诊断](test-report.json)：724项721通过；基线720项717通过。
- [50张截图路径 / SHA-256](screenshots.json)：截图仅存当前工作站，不含在 Git 中；GitHub 无法直接显示本地文件。请在 Codex/本机打开下面路径。

## 本机实际截图

| 尺寸 | AI 打开 | AI 关闭 |
| --- | --- | --- |
| 1440 | [打开](F:/CodexWorktrees/TravelAssist-TASK033/.cache/qa/task033/screenshots/1440-reduce-guest-open.png) | [关闭](F:/CodexWorktrees/TravelAssist-TASK033/.cache/qa/task033/screenshots/1440-reduce-guest-closed.png) |
| 1024 | [打开](F:/CodexWorktrees/TravelAssist-TASK033/.cache/qa/task033/screenshots/1024-reduce-guest-open.png) | [关闭](F:/CodexWorktrees/TravelAssist-TASK033/.cache/qa/task033/screenshots/1024-reduce-guest-closed.png) |
| 390 | [打开](F:/CodexWorktrees/TravelAssist-TASK033/.cache/qa/task033/screenshots/390-reduce-guest-open.png) | [关闭](F:/CodexWorktrees/TravelAssist-TASK033/.cache/qa/task033/screenshots/390-reduce-guest-closed.png) |
| 320 | [打开](F:/CodexWorktrees/TravelAssist-TASK033/.cache/qa/task033/screenshots/320-reduce-guest-open.png) | [关闭](F:/CodexWorktrees/TravelAssist-TASK033/.cache/qa/task033/screenshots/320-reduce-guest-closed.png) |

[极限安全区 320×480](F:/CodexWorktrees/TravelAssist-TASK033/.cache/qa/task033/screenshots/safe-area-320-480.png)。

## 复现

1. 两个独立 worktree：execution base 与当前 feature；各自 npm ci / npm run build。设置 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54224、NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_task033_local_fixture，AUTH_SITE_URL 分别为 http://localhost:3137 和 http://localhost:3136。
2. 使用仓库现有 node tools/qa/task-024-visual-auth-fixture.mjs 回环 fixture（无真实密钥或 Provider），分别 npm run start -- -p 3137 和 -p 3136。
3. PLAYWRIGHT_MODULE 指向本机已有 Playwright 模块，执行 node tools/qa/task-033-ai-entry-check.mjs。浏览器使用 msedge，实际 native button / DOM / 网络事件，不模拟 React state。
4. 两个 baseline/候选服务器均需运行；脚本还验证实际 Wizard 下一步、本地保存 Detail 和返回恢复。
5. 当前结果写入 docs/qa/TASK-033/；截图写入 .cache/qa/task033/screenshots/。不要把截图新增到资产扫描目录。

Runtime diff 仅两份 AI CSS；常规页面几何保持。≤352px 的 AI 紧凑定位是有意适配，报告明确单独核对，没有弱化其他区域对照。
