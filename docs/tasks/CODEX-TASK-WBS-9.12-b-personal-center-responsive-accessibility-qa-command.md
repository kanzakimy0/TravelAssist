# Codex Command — TASK-WBS-9.12-B

把下面整段复制给本地 Codex：

```text
请在 TravelAssist 仓库中完整执行 TASK-WBS-9.12-B：Personal Center Responsive / Accessibility QA。

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#181

Task docs branch:
docs/b-wbs-9-12-personal-center-qa-task

Planned implementation branch:
fix/b-account-wbs-9-12-responsive-accessibility-qa

开始前必须执行：

git status --short --untracked-files=all
git branch --show-current
git remote -v
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop

禁止执行：

git clean -fd
git reset --hard
git push --force
git push --force-with-lease

必须从远端完整读取 Task：

git show origin/docs/b-wbs-9-12-personal-center-qa-task:docs/tasks/TASK-WBS-9.12-b-personal-center-responsive-accessibility-qa.md

并完整读取：

git show origin/develop:docs/project/WBS-TravelAssist.md
git show origin/develop:docs/tasks/TASK-WBS-5.20-b-personal-center-responsive-states.md
git show origin/develop:docs/tasks/RESULT-WBS-5.20-b-personal-center-responsive-states.md
git show origin/develop:docs/ui/personal-center-responsive-states.md
git show origin/develop:docs/ui/personal-center-design-freeze-v1.md
git show origin/develop:docs/ui/personal-center.md
git show origin/develop:docs/ui/personal-center-shell.md
git show origin/develop:docs/ui/profile-account.md
git show origin/develop:docs/ui/preference-center.md
git show origin/develop:docs/ui/companion-management.md
git show origin/develop:docs/ui/trip-library.md
git show origin/develop:docs/ui/account-security-data-privacy.md
git show origin/develop:docs/ui/navigation-flow.md
git show origin/develop:docs/ui/help-icons.md

先确认：
- WBS 5.20 = 已完成
- WBS 9.12 Owner = B
- Issue #181 为本 Task 唯一正式 Issue
- 没有重复 9.12 implementation PR / branch

然后从执行时最新 origin/develop 创建或安全复用：

fix/b-account-wbs-9-12-responsive-accessibility-qa

正式开始后先把 Master WBS 的 9.12 更新为“进行中”。

严格执行 Task 全文，不要只按本消息摘要开发。

核心目标：
1. 对所有 B-owned Personal Center 路由做独立 responsive / accessibility QA。
2. 覆盖四档布局和 Task 指定的 12 个 viewport。
3. 检查 keyboard、focus-visible、Tab/Shift+Tab、Escape、focus return。
4. 检查 Drawer、Popover、Dialog。
5. 检查 Mobile 44x44 touch target、safe-area、Bottom Nav。
6. 检查 Loading / Empty / Error / live-region。
7. 检查 reduced-motion。
8. 检查 200% Zoom / text expansion，并记录真实验证方法。
9. Chromium / Edge 必须实测。
10. Firefox / WebKit 只有环境已经可用才执行；不可用就 Deferred，不为本 Task 安装大型浏览器依赖。
11. Safari 未真机测试不得写 PASS。
12. 发现 B-owned QA 问题允许最小修复；禁止改业务语义。

浏览器 QA 优先复用仓库已有：
CODEX_PLAYWRIGHT_PATH
WBS_BASE_URL
WBS_EVIDENCE_DIR

不要把 Playwright 加入 package dependencies。

建议新增：
tests/wbs-9-12-personal-center-qa.test.mjs
tests/wbs-9-12-personal-center-qa.browser.mjs

浏览器证据目录：
.next/qa/WBS-9.12-B/

必须执行：
node --version
npm --version
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present

注意：package.json 当前没有通用 test script。
如果 npm test --if-present 没有真正运行测试，必须显式运行当前全仓 Node test suite + 9.12 专项测试，不能把 no-op 算 PASS。

同时：
npm run format:check
git diff --check

全仓 Prettier 历史失败只记录并对比基线，本 Task 修改文件必须独立通过，不要批量格式化无关文件。

禁止修改：
src/features/planner/**
src/features/home/**
src/features/start-flow/**
地图 / 路线 / AI
Auth Core
DB / API / Persistence
Provider / Booking / Payment
A-owned Task

必须创建：
docs/tasks/RESULT-TASK-WBS-9.12-b-personal-center-responsive-accessibility-qa.md

实现完成后：
- 更新 WBS 9.12 为“待审查”
- 更新 Issue #181
- push implementation branch
- 创建到 develop 的 Draft PR
- PR body 使用 Relates to #181
- 不自动 merge
- 不关闭 Issue
- 不启动下一个 WBS

最终返回：
1. Status
2. Base / Branch / Commit
3. Issue / Draft PR
4. Dependency Gate
5. Routes Tested
6. Viewport Matrix
7. Responsive / Keyboard / Focus / Drawer / Popover / Dialog
8. Touch / Zoom / Text Expansion / Reduced Motion
9. ARIA / Loading / Empty / Error
10. Browser Matrix（明确 Edge / Firefox / WebKit / Safari）
11. Fixes Made
12. lint / typecheck / build / tests
13. Format / diff-check
14. Ownership Safety
15. Deferred / Handoffs
16. WBS status
17. Working tree / unpushed commits

完成后停止。
```
