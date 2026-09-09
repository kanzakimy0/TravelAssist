# Codex — TASK-024-A 执行指令

只执行 TASK-024-A / Issue #235，不要执行其他Task、自动合并或生产上线。

Repository：`https://github.com/kanzakimy0/TravelAssist.git`
Implementation branch：`codex/a-performance-observability`
Spec branch：`task/a-route-observability-deployment-20260909`

## 1. 先检查，不动原工作区

执行并记录工作区、分支、remote、worktree、最新develop与15条日志。确认origin后保留原工作区的未提交内容，使用独立worktree；不得clean/reset/force push，不得复制或回显未授权Secret。

## 2. 从远端读完整范围

完整读取本Task、共同执行计划、最新Master WBS、task tracking、Issue #235及评论、README/CONTRIBUTING/AGENTS/docs索引。文档分支不是业务基线；只复制本Task、command和共同计划，实施始终从最新origin/develop开始。

## 3. 执行范围

先测未改动base，再建立脱敏观测与性能回归预算。外传默认关闭；不得把实验室结果、TBT、fixture或本地sink冒充真实用户INP/p75或线上监控。

前置通过后将Task与WBS更新为进行中，并在Issue记录真实base与计划。共享文件逐行合并；不叠加未合并Task，不发明商业授权、偏好分类或云平台。

## 4. 验证、上传与停止

执行专项测试、真实浏览器/服务端错误、production性能和全仓测试、lint、typecheck、format、build、diff。提交前重新fetch最新develop，必要时安全整合并重跑。

Result写到 `docs/tasks/RESULT-TASK-024-a-performance-observability.md`；同步Task、WBS、Issue、commit和PR。实现完成只设待验收/待审查，Issue Open，PR Draft；不得merge、转Ready或启动下一Task。

最终回复包含Status、base/final develop、Issue/Branch/Commit/PR、完成/Deferred、测试/浏览器/live/部署、WBS、边界与人工操作。
