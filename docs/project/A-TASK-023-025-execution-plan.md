# TravelAssist — A 工作线 TASK-023 / 024 / 025

> 日期：2026-09-09（Asia/Tokyo）
> 状态：任务定义已建立；尚未开始工程实现。
> Repository：`kanzakimy0/TravelAssist`
> 定义基线：`develop@1af72af0d7151af4dd59073ee0b015a70b267064`
> 文档分支：`task/a-route-observability-deployment-20260909`

## 1. 本轮范围与交付

用户选定三条 A 工作线：路线合并后验收与 Planner 接线；WBS 9.11 性能预算与错误监控；WBS 10.1 → 10.2 环境隔离与自动部署。本文件是这三项任务的执行计划，不是第二份 Master WBS，也不授权自动合并或生产上线。

| Task       | Issue | 对应 WBS                                | 实现分支                            | 当前状态 |
| ---------- | ----- | --------------------------------------- | ----------------------------------- | -------- |
| TASK-023-A | #234  | 4.6 / 4.14 路线接线子集；7.5 / 7.8 复验 | `codex/a-planner-route-integration` | 待开始   |
| TASK-024-A | #235  | 9.11                                    | `codex/a-performance-observability` | 待开始   |
| TASK-025-A | #236  | 10.1 → 10.2，分阶段                     | `codex/a-environment-deployment`    | 待开始   |

完整 Task 和独立 Codex command 位于 `docs/tasks/`。本轮没有创建实现 Result，没有运行应用验收，没有改变 develop 的业务代码或 Master WBS；本表登记任务定义与 WBS 对应关系。执行开始与返回结果前必须在各自实现分支同步 Master WBS，只更新本 Task 的行和追踪记录。

## 2. 基线事实与决策边界

- PR #233 已合并；Route Contract 和 server-only 駅すぱあと Adapter 已进入 develop。原 Result 中 Draft 字样为历史，不能以旧文字否认实际合并，也不能以合并推导生产授权已完成。
- 当前 Adapter 的端点解析使用站名或 referenceId，不能把任意 POI ID、景点名或裸经纬度直接当作已经验证的站点输入。
- 当前配置在 `NODE_ENV=production` 拒绝 Evaluation；保留此边界。生产 Provider、Mapbox 混合展示、保存/再展示等授权仍未关闭。
- 9.11、10.1、10.2 在定义基线的 Master WBS 仍未开始；WBS 已登记的基础规范必须通过实际文件和可执行检查复核。
- 定义基线 `.github/workflows/` 只有 `auto-create-pr.yml` 和 `auto-merge.yml`。自动建 PR/合并不是构建测试或部署证据，025 不得假设质量流水线已存在。
- 日本境内限定；不解锁 TASK-013 系列的全量 POI 或图片生产；不等待正式偏好三级清单即可完成本轮通用工程。
- 不改变已冻结的 Planner/Detail 布局、色彩、地图生命周期与保存保护；不改 B 的偏好、同行人、账户和草稿业务；Engine 4.20–4.24 仍归 B。
- 不从未合并的 #221、#227、#231 或其他分支复制实现。执行时重新核对它们是否已合入最新 develop。

## 3. 执行顺序与并行

建议单工作站按 023 → 024 → 025 执行，每项独立分支和 Draft PR。023 的路线业务与 024 的独立观测模块可以并行；025 的配置审计、环境矩阵和文档可以并行。

这不是把任务分支串成一条 stacked branch 的许可。023 未合并时，024 在最新 develop 测已有页面；023 合并后再测接线增量。025 不依赖未合并的观测代码；已合并时接入，没有时明确 Deferred。

| 共享位置                                             | 修改规则                                                                               |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `package.json` / lockfile                            | 优先不新增依赖；确有必要时记录理由，三项串行整合，不各自升级工具链                     |
| `.env.example` / 环境解析                            | 023 只管理路线开关，024 只管理观测开关，025 负责环境总映射；保留已有名称，不整文件覆盖 |
| `src/app/layout.tsx` / instrumentation / root config | 024 负责最小观测挂载；025 仅部署必需改动，避免重复全局包装                             |
| `.github/workflows/`                                 | 024 给预算脚本；025 接质量/部署门，复用实际已合并的安全工作流                          |
| Master WBS                                           | 逐行与追踪块合并，禁止整份 ours/theirs 或重置他人状态                                  |
| Local Supabase / 端口 / 预览进程                     | 不因 worktree 独立就假定 DB 独立；隔离项目/端口或串行验收，只停止本 Task 启动的进程    |

## 4. 通用 Git 与权限规则

开始前执行并记录：

```bash
git status --short
git branch --show-current
git remote -v
git worktree list
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

确认正式 remote 后，从最新 `origin/develop` 创建独立 worktree。原工作树不干净时保留不动，不在该处切分支。已有同名任务分支时检查归属和状态后续作，不盲目覆盖或重复建 Issue。

禁止 `git clean -fd`、`git reset --hard`、`git push --force`、`git push --force-with-lease`；禁止复制未提交的个人环境、凭据、Cookie 或生产数据到任务工作树/日志。只读取执行所需、已经明确允许的本机配置；没有就走 fixture / Deferred。

`feature/**` 会触发当前自动建 PR/合并 workflow；本轮采用 `codex/**` 实现分支并从创建时就设 Draft。现有全局 auto-merge 会遍历非 Draft PR，不把实现 PR 转成 ready-for-review 来“试一下”。不修改自动合并 workflow，也不批量处理其他 PR。

文档分支仅供取出本 Task、command 与本执行计划；不要从它复制业务源码、lockfile、旧 WBS 或其他 Task 的实现。文档尚未合并不构成工程启动阻塞；实现基线始终是最新 develop。

## 5. 通用验证与追踪

先读 `README.md`、`CONTRIBUTING.md`、可用的 `AGENTS.md`、`docs/README.md`、`docs/development/task-tracking.md`、Master WBS、本 Task 与引用的设计。新 Next 接口先核对安装版本及本机随包文档，再查对应官方文档；不按最新网页盲目升级仓库版本。

执行当前实际存在的检查，至少：

```bash
npm ci
node --test "tests/*.test.mjs"
npm run lint
npm run typecheck
npm run format:check
npm run build
git diff --check
```

Windows 可用 `npm.cmd`。Node glob 或测试加载方式与当前工具链不符时，明确枚举文件/使用实际 loader；不能用 `npm test --if-present` 无测试运行冒充通过。每个 Task 的专项命令另见其定义。

格式失败必须与当次 base 逐文件核对：本 Task 新增失败要修复，既有失败单列，不批量格式化历史文档，不以忽略退出码声称全绿。CI、本地测试、浏览器测试、真实外部服务分别报告。

启动时 Task=进行中、WBS=进行中；实现完成时 Task=待验收、WBS=待审查、Issue Open、PR Draft。只在合并且用户验收后标已完成。部分子集完成但 live/部署未验证时逐阶段记录，不把大 WBS 一起关闭。文档 PR 用 Refs 关联三项，不使用 Closes 自动关闭尚未实施的 Issue。

最终 Result 写入各 Task 指定文件，至少包含 base/final develop、分支/commit/PR、实现范围、未完成项、逐项命令和退出结果、真实联网/部署证据、隐私边界、WBS 同步、下一步阻塞。禁止自动启动下一项。

## 6. 统一验收层级

| 层级              | 可以证明什么                 | 不能证明什么                     |
| ----------------- | ---------------------------- | -------------------------------- |
| fixture 测试      | 请求、状态、失败与契约行为   | 外部接口可用、真实时刻或路线正确 |
| 本地生产构建      | 可构建、bundle边界、生产保护 | 已部署、在线用户体验达标         |
| 开发期 live smoke | 当次合法 Evaluation 请求成功 | 生产授权、全日本覆盖、运营SLA    |
| 真实非生产部署    | 指定隔离目标与commit部署成功 | 生产可发布、付费服务可商用       |
| 生产发布          | 需单独授权及实际证据         | 本次任务定义不提供该授权         |

## 7. 可追溯来源

仓库事实以定义基线和执行时最新源文件为准：

- `docs/project/WBS-TravelAssist.md`
- `docs/development/task-tracking.md`
- `docs/tasks/RESULT-TASK-022-a-ekiworld-route-evaluation.md`
- `docs/architecture/route-contract.md`
- `docs/architecture/ekiworld-evaluation-routing.md`
- `src/server/routing/config.ts`
- `src/server/routing/providers/ekiworld.ts`
- `.env.example` 与 `.github/workflows/`

官方技术依据见各 Task；它们不是用户生产授权或商务合同的替代品。
