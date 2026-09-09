# TASK-024-A — Global Main Layout / Header

## Metadata

- Task ID: `TASK-024-A`
- WBS: `3.1`
- Owner: `A`
- Responsibility: `Main Travel System`
- Priority: `P1`
- Status at Task creation: `可开始`
- GitHub Issue: `#242`
- Task File: `docs/tasks/TASK-024-a-main-layout-header.md`
- Suggested implementation branch: `feature/a-main-layout-header`
- Depends On: `1.13`, `2.7`
- Task creation reference develop: `30851531b94be42703b0e9f9f69ec0f506ee5a69`
- Execution base: **must re-read latest `origin/develop`; do not assume the Task creation SHA is still current**

## Objective

完成 WBS 3.1「全局 Main Layout / Header」的正式工程整合，为后续 3.2–3.7 网站入口功能提供稳定 Main Shell。

本 Task **不是重新设计或重写 Header**。仓库已经存在首页、主流程导航、Logo、Personal Center 导航等已合并成果；本次应先审计现状，然后把已有成果整理为统一、可复用、可测试的 Main Layout / Header 边界，并只补齐真实缺口。

## Existing Work That Must Be Preserved

执行前必须确认以下已合入成果，并优先复用：

- `TASK-004-A`：网站首页最终视觉基础。
- `TASK-010-A`：主流程导航闭环，关联 WBS `3.1` / `3.6`。
- `TASK-010-B`：全局 Logo / Personal Center 导航子集，关联 WBS `3.1`。
- `/start`：既有 Step 1–5 向导与响应式成果。
- `/planner` 与 Trip Detail：既有 Planner / Detail 工作区和导航成果。
- `/personal-center`：B 模块既有 Shell；本 Task 不重写其内部布局。
- 已有 shared UI / navigation primitives：存在即复用，不建立平行第二套。

如果上述实现与本 Task 的文字描述有差异，以 **最新 develop 中已验收并合并的行为** 为基线；只修复可证明属于 WBS 3.1 的缺口。

## Preflight — Mandatory

开始任何修改前执行并记录：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

然后读取：

```bash
git show origin/develop:docs/project/WBS-TravelAssist.md
git show origin/develop:docs/tasks/TASK-024-a-main-layout-header.md
```

并检查与本 Task 高关联的既有 Task / Result：

```bash
git show origin/develop:docs/tasks/TASK-010-a-main-flow-navigation.md
git show origin/develop:docs/tasks/RESULT-TASK-010-b-personal-center-navigation.md
```

如文件名在最新 develop 已调整，先搜索 `TASK-010` / `Main Layout` / `Header` / `navigation`，读取真实现有文件，不因路径差异跳过审计。

### Git Safety

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

不得删除、覆盖或打包用户未提交工作。

## Start Tracking — Mandatory

确认前置满足后：

1. 从最新 `origin/develop` 建立独立实现分支：

```text
feature/a-main-layout-header
```

2. 更新最新 `docs/project/WBS-TravelAssist.md`：
   - WBS `3.1`：`未开始/可开始` → `进行中`。
   - Owner 保持 `A`。
   - 不修改其他 Owner Task 的真实状态。
3. Issue `#242` 记录实际启动基线与 branch。
4. 不得仅因为 Task 文件已创建就提前把 3.1 标记为已完成。

## Scope

### 1. Main Layout Boundary

建立或整理主旅行系统的 Layout 边界，使首页及主系统页面有清晰、一致的外层结构。

要求：

- 优先使用 Next.js App Router 的既有 layout 结构。
- 如果当前结构已经足够，只做最小重构或补齐，不为“架构整齐”做无必要大迁移。
- Main Travel System 与 Personal Center 的边界清晰。
- 不把 B 的 Personal Center 内部布局迁入 A Main Layout。
- 不破坏 Planner 自己已有的全屏 / 地图布局需求。

### 2. Global Header Integration

统一主系统 Header 行为，至少核对并保证：

- Logo / Brand 入口行为一致。
- 首页 → Start → Planner → Detail 的现有主流程导航不回退。
- 登录按钮 / Avatar **只保留现有已接线能力和稳定占位**；完整 WBS 3.4 业务由后续 Task 处理。
- Header 的可见性、定位、层级和地图 / 浮层不发生冲突。
- 不建立第二套 Header。

### 3. Shared Shell Rules

整理可复用 Shell 规则：

- 页面最大宽度 / 全宽例外。
- Header 高度与内容避让。
- z-index / overlay 基础边界。
- 主内容区域最小高度。
- desktop / tablet / mobile 的结构行为。
- 对 Planner / Map 全屏页面允许明确例外，不强行套普通内容页宽度。

规则应尽量复用已有 Design Token / shared UI；不得在此 Task 新造完整 Design System。

### 4. Accessibility Baseline

Header / Shell 本范围至少满足：

- Landmark 语义合理（例如 header / nav / main）。
- Logo / 主导航可键盘操作。
- Focus 可见。
- 不因 sticky/fixed Header 遮挡主内容或焦点目标。
- 小屏不出现关键导航不可达的新回归。

### 5. Regression Tests

为本 Task 新增或更新针对性测试，覆盖至少：

- Main Layout / Header 正确渲染。
- Logo / 主入口导航保持正确。
- Main system 与 Personal Center 路由边界不被错误嵌套。
- `/start`、`/planner`、Trip Detail 不因 Shell 整合回归。
- 已有 Auth / Personal Center 导航测试不被删除或弱化。

## Out of Scope

本 Task **不得顺手实施**：

- WBS 3.2：首页动画背景区域的新开发。
- WBS 3.3：「让我们开始吧」主入口的新交互业务。
- WBS 3.4：登录按钮 / Avatar 的完整 Auth / Session 主系统实现。
- WBS 3.5：AI 悬浮入口。
- WBS 3.7：完整 Loading / Empty / Error 系统。
- Planner UI 重设计。
- Mapbox / Route / POI / AI / Booking / Trip Engine 新业务。
- Personal Center 内部页面或 B 数据模块重构。
- 新数据库 Schema / Migration。
- 与 3.1 无关的全仓格式清理。

## Conflict Guard

由于仓库存在 A/B 并行开发，本 Task 必须遵守：

1. 先拉取最新 `origin/develop`，不要从旧本地分支继续堆叠。
2. 不覆盖他人最新 Task / Result / WBS 顶部记录。
3. WBS 冲突必须逐段合并，保留双方真实状态；禁止整份选择 ours/theirs。
4. 不把 3.1 的“导航子集已完成”误写成完整 3.1 已完成，直到本 Task 验收合并。
5. 不删除 TASK-010-A / TASK-010-B 的历史追踪。

## Expected Deliverables

根据真实仓库结构，交付物应包括：

- Main Layout / Header 的必要源码增量。
- 必要 shared layout/header primitives 的增量整理。
- 3.1 专项测试。
- `docs/tasks/RESULT-TASK-024-a-main-layout-header.md`
- 更新 `docs/project/WBS-TravelAssist.md`
- 更新 Issue `#242`
- Draft PR → `develop`

如果审计证明现有代码已基本满足 3.1，允许 Task 以“小范围整合 + 测试 + 文档冻结”的形式完成，不要求为了增加 diff 而重写代码。

## Validation

至少执行：

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present
git diff --check
```

如果仓库已有 Task-specific Node tests / Playwright / browser QA，运行与 Header / main navigation / responsive 相关的真实测试集。

### Browser Acceptance

至少检查：

- Desktop：1440×900
- Tablet：1024×768
- Mobile：390×844
- Narrow mobile：320×568

页面至少覆盖：

- `/`
- `/start`
- `/planner`
- 一个当前真实可达的 Trip Detail 路由
- `/personal-center` 仅做边界回归，不改内部布局

检查：

- Header / Logo 可见性和位置。
- 导航可达。
- 无遮挡 / 横向溢出。
- Planner 地图 / 浮层 z-index 无回归。
- console / hydration 无新增错误。

无法运行的浏览器或外部能力必须写为 `Deferred`，不得伪报 PASS。

## Acceptance Criteria

- [ ] 从最新 `origin/develop` 启动并记录真实基线。
- [ ] WBS 3.1 启动时同步为 `进行中`。
- [ ] 已审计并复用 TASK-010-A/B 现有 Header / navigation 成果。
- [ ] 主系统存在明确、单一的 Main Layout / Header 边界。
- [ ] 首页 / Start / Planner / Detail 主流程导航不回退。
- [ ] Personal Center 内部布局未被 A Main Layout 越界重写。
- [ ] Desktop / Tablet / Mobile / Narrow mobile 无关键 Shell 回归。
- [ ] lint / typecheck / build / relevant tests / diff-check 通过，或对真实基线例外有逐项证据。
- [ ] Result 文件写明修改、测试、限制与 Deferred。
- [ ] Issue #242、Task、Result、WBS、branch、commit、PR 完成同步。
- [ ] 实现完成但 PR 未合并时，WBS 3.1 为 `待审查`，不是 `已完成`。
- [ ] 只有用户验收通过且 PR 合入 `develop` 后，WBS 3.1 才可改为 `已完成`。

## Mandatory WBS Update

Codex 最终返回 Result **之前必须**：

1. 再次读取最新 `docs/project/WBS-TravelAssist.md`。
2. 保留其他工作站 / Owner 在执行期间新增的记录。
3. 更新 WBS 3.1 的真实状态、Issue、branch、commit、PR、blocker。
4. 实现完成但 PR 未合并：`待审查`。
5. 用户验收并合并 develop：`已完成`。
6. 将 WBS 更新 commit + push 后才返回最终 Result。

不得返回“Completed”而 GitHub Issue / WBS / Result 仍停留在旧状态。

## Result Format

Codex 最终返回至少包含：

```md
# TASK-024-A Result

## Status

## Preflight
- execution base:
- latest develop checked:
- working tree safety:

## Tracking
- WBS 3.1:
- Issue: #242
- Branch:
- Commit:
- Pull Request:
- Result file:

## Existing Work Reused
- TASK-010-A:
- TASK-010-B:
- other shared primitives:

## Main Shell
- layout boundary:
- header integration:
- responsive behavior:
- personal-center boundary:

## Validation
- lint:
- typecheck:
- build:
- tests:
- browser QA:
- diff-check:

## Problems / Deferred

## WBS Updated
Yes / No

## Next Task
Do not start automatically.
```

## Stop Rule

完成 TASK-024-A 后停止。

**不要自动开始 WBS 3.2 / TASK-025。**
