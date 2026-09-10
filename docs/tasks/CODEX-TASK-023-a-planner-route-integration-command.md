# Codex — TASK-023-A 执行指令

只执行 TASK-023-A / Issue #234，不要执行其他Task、自动合并或生产上线。

Repository：`https://github.com/kanzakimy0/TravelAssist.git`
Implementation branch：`codex/a-planner-route-integration`
Spec branch：`task/a-route-observability-deployment-20260909`

## 1. 先检查，不动原工作区

```bash
git status --short
git branch --show-current
git remote -v
git worktree list
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

确认origin指向上述仓库。原工作区脏时保留，不切分支、不stash/drop、不删除文件。使用独立worktree；同名分支已存在时核对本Task最新记录后安全续作，不覆盖。

禁止 `git clean -fd`、`git reset --hard`、`git push --force`、`git push --force-with-lease`。不要读取/回显未授权本机Secret，不复制整份.env.local到新工作区或日志。

## 2. 从远端读完整范围

```bash
git show origin/task/a-route-observability-deployment-20260909:docs/tasks/TASK-023-a-planner-route-integration.md
git show origin/task/a-route-observability-deployment-20260909:docs/project/A-TASK-023-025-execution-plan.md
git show origin/develop:docs/project/WBS-TravelAssist.md
git show origin/develop:docs/development/task-tracking.md
```

再读Issue #234及其评论、最新相关PR、README/CONTRIBUTING/可用AGENTS/docs索引和Task指定设计。若Issue有新的明确用户修订，按它核对范围，保留历史而非覆盖。

不要把文档分支当业务基线；独立实现worktree必须从最新origin/develop开始。仅把本Task、其command和共同执行计划复制到实现分支作为文档，不复制spec分支的旧源码/WBS/lockfile，不叠加未合并Task实现。

## 3. 执行范围

先完成合并后复验，再做开发期Planner路线接线。无合法凭据时继续fixtures，live单列Deferred；保留production禁用Evaluation；不得保存Provider结果或重做Planner。

检查前置通过后，在本实现分支把Task及Master WBS对应行/追踪记录更新为进行中，并在Issue记录真实base与计划。关键依赖未满足只暂停对应阶段，完成其他独立可做部分并准确记录；不要自行发明偏好分类、站点身份、商业授权或云平台。

只修改本Task边界允许的文件。共享文件冲突逐行合并并保留其他Owner内容；独立worktree不等于独立Local Supabase，DB和预览进程按Task隔离或串行验收。

## 4. 验证、上传与停止

执行完整Task的专项测试与真实浏览器/部署适用验收，再跑实际全仓测试、lint、typecheck、format:check、build、diff检查。保留退出码与失败原因，不把0项测试/未运行/无凭据当PASS，不批量格式化既有文档。

提交前重新fetch最新develop并核对并行合并；必要时安全整合后重跑受影响检查。若未整合，明确基线差异与阻塞，不宣称已在最新develop验证。

Result写到 `docs/tasks/RESULT-TASK-023-a-planner-route-integration.md`；同步本Task、Master WBS、Issue、commit与PR。实现通过只设待验收/待审查，Issue保持Open。commit subject包含TASK-023-A，push本实现分支，创建指向develop的Draft PR；不merge、不转ready、不启动下一Task。

最终回复至少包括：Status、base/final develop、Issue/Branch/Commit/PR、各阶段完成和Deferred、实际测试/浏览器/live/部署结果、WBS同步、保留边界、需人工操作项。没有实现就不能生成假Completed Result。
