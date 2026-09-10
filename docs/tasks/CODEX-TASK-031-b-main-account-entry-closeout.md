# Codex Launcher — TASK-031-B / WBS 3.4

请完整执行 TravelAssist 的 `TASK-031-B`。

## Repository

`https://github.com/kanzakimy0/TravelAssist`

## Issue

`#261`

## Formal Task

`docs/tasks/TASK-031-b-main-account-entry-closeout.md`

## Owner Correction

`docs/project/WBS-3.4-owner-correction.md`

## 开始前

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop

git show origin/develop:docs/tasks/TASK-031-b-main-account-entry-closeout.md
git show origin/develop:docs/project/WBS-3.4-owner-correction.md
git show origin/develop:docs/project/WBS-TravelAssist.md
```

## Integration Gate

先确认 PR #273 / TASK-030-B 已合入 `develop`。

如果 #273 仍 Open / Draft / 未合并：

```text
Status: Blocked
Reason: TASK-030-B / WBS 3.3 not integrated into develop
```

停止；不得从 #273 分支叠加、cherry-pick 或并行修改 Home/Main Shell 重叠文件。

如果 #273 已合并：

- 从届时最新 `origin/develop` 创建 `feature/b-wbs-3-4-main-account-entry`
- 安全更新最新 Master WBS：`3.4 Owner = B / Status = 进行中`
- 严格按正式 Task 执行

## 核心原则

- 复用已有 Auth / Session / Personal Center，不重写认证系统。
- 先审计 Home / Start / Planner / Detail，正确实现就保留，只补真实缺口。
- Guest 可以继续规划旅行，不强制登录。
- Signed-in 必须来自可信 `auth.getUser()` / 现有 server helper，不信任 Cookie claims。
- Invalid / expired session 必须回退 Guest。
- 验证安全 `returnTo`、Personal Center、Logout 后 Guest、Back/Forward、键盘和移动端。
- 不改变 3.2 已验收首页视觉，不改变 Planner / Detail 几何。
- 不实施 3.5 / 3.7 / AI / Map / Route / DB / Engine / Payment。

## 验证

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present
git diff --check
```

如无 test script，运行全仓真实 Node tests + TASK-031-B 专项测试。

## Result

生成：

`docs/tasks/RESULT-TASK-031-b-main-account-entry-closeout.md`

同步：Task / Result / Master WBS / Issue #261 / Branch / Commit / Draft PR。

状态：

- 开始 → `3.4 = 进行中`
- 实现完成未合并 → `3.4 = 待审查`
- 用户验收 + merge develop → `3.4 = 已完成`

完成后停止，不自动执行下一 Task。

## Safety

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

WBS 冲突逐段解决，禁止整份 ours / theirs。
