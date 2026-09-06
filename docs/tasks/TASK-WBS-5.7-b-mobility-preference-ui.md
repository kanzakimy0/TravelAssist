# WBS-5.7-B — 移动偏好 UI

## Metadata

- Task ID: `WBS-5.7-B`
- WBS ID: `5.7`
- Owner: `B`
- Responsibility: `Personal Center / Preferences`
- Priority: `P1`
- Status: `已完成`
- Depends On: `5.5`
- Dependency State at authoring: `5.5 = 已完成`
- Repository: `https://github.com/kanzakimy0/TravelAssist.git`
- Workspace: `F:\TravelAssist`
- Base Branch: `develop`
- Branch: `feature/b-account-wbs-5-7-mobility-preference-ui`
- GitHub Issue: `#123`
- Task File: `docs/tasks/TASK-WBS-5.7-b-mobility-preference-ui.md`
- Result File: `docs/tasks/RESULT-WBS-5.7-b-mobility-preference-ui.md`

---

# 1. Objective

把当前：

```text
/personal-center/preferences/mobility
```

从 WBS 5.5 留下的通用分类详情壳，升级为正式的 **移动 / 交通长期偏好详细 UI**。

本 Task 只实现个人中心中的长期移动偏好编辑体验，不实现 Planner 的本次旅行临时条件，不实现正式 Preference Schema / API / DB。

核心结构：

```text
移动偏好摘要
+
中项目快速设置
+
详细限制
+
冲突提示
+
恢复默认 / 取消 / 保存
```

---

# 2. Source of Truth

执行前必须读取最新 `develop`：

```text
docs/project/WBS-TravelAssist.md
docs/ui/preference-center.md
docs/preferences/preference-system.md
docs/ui/personal-center.md
docs/ui/personal-center-shell.md
docs/ui/personal-center-responsive-states.md
docs/development/task-tracking.md
docs/tasks/RESULT-WBS-5.5-b-preference-center-ui.md
src/features/preferences/**
src/app/(account)/personal-center/preferences/**
```

优先级：

```text
用户最新决定
>
本 Task
>
docs/ui/preference-center.md
>
docs/preferences/preference-system.md
>
WBS 5.5 已完成 runtime
>
Codex 自行推导
```

不得为移动偏好另建一套与现有 Preference Center 不兼容的体系。

---

# 3. Preflight

执行：

```bash
git status --short --untracked-files=all
git fetch --all --prune
git switch develop
git pull --ff-only origin develop
git log -1 --oneline
```

必须确认：

- working tree 安全；
- local develop 与最新 origin/develop 一致；
- WBS 5.5 = 已完成；
- WBS 5.7 尚未有等价实现；
- 无重复 5.7 Issue / PR / branch / Task。

搜索：

```bash
gh issue list --state all --search "WBS 5.7" --limit 30
gh pr list --state all --search "WBS 5.7" --limit 30
git branch -a | findstr /I "5-7 mobility"
```

如果已经有等价 5.7 实现，停止并报告，不得重复创建。

---

# 4. Tracking

若不存在等价 Issue，创建：

```text
[WBS 5.7][B] 移动偏好 UI
```

然后从最新 develop 创建：

```bash
git switch -c feature/b-account-wbs-5-7-mobility-preference-ui
```

正式开始后：

```text
WBS 5.7 = 进行中
Task = 进行中
Issue = Open
```

只允许精确修改 WBS 5.7 自己的状态与 `WBS-5.7-B` Tracking Record。

---

# 5. Ownership Rule

强制规则：

> 禁止覆盖、删除、重写其他 Owner 的 Task 文件；只允许更新当前 Task ID 对应文件。涉及其他 Task 时只能读取、引用和报告差异。

同时禁止：

- 修改 A Task；
- 修改其他 B Task；
- 重写整个 WBS；
- 修改 5.5 已完成状态；
- 修改 5.6 已完成 / 待审查之外的跟踪；
- 开始 5.8 / 5.9 / 5.11 / 5.16。

---

# 6. Scope Boundary

## In Scope

- `/personal-center/preferences/mobility` 正式 UI；
- 移动偏好摘要；
- 中项目快速设置；
- 已冻结的详细限制；
- UI 级冲突提示；
- 本地 Draft / Saved state；
- 恢复默认、取消、保存；
- 未保存离开保护；
- 响应式与可访问性；
- 测试与浏览器 QA。

## Out of Scope

```text
5.11 Preference Schema
5.13 Preference Preset / 正式默认值
5.14 Planner-readable Preference Contract
5.16 Preference persistence API
A Planner 临时移动条件
路线计算 / 交通 Provider
AI 冲突消解
```

本 Task 不得接 Supabase、DB、API 或 Planner。

---

# 7. Data Boundary

只允许：

```text
typed UI view model
+
React in-memory state
+
pure validation / conflict functions
```

必须明确：

```text
Persistence: Mock / in-memory only
Formal Preference Schema: Not implemented
Planner Contract: Not implemented
```

禁止：

- Supabase；
- DB / ORM；
- Route Handler 写入；
- localStorage；
- Cookie；
- Session；
- 假 API；
- 假持久化；
- 把 UI 类型宣称为 WBS 5.11 正式 Schema。

---

# 8. Existing 5.5 Route

当前 develop 已有通用动态 route：

```text
/personal-center/preferences/[category]
```

`mobility` 当前由通用 `PreferenceCategoryPage` 渲染。

5.7 可以采用以下任一安全方案：

1. 在现有动态 route 中仅对 `category === "mobility"` 渲染 `MobilityPreferencePage`；
2. 若 Next.js 路由结构更适合，可新增更具体的 `mobility` route，但必须验证不会与动态 route 冲突。

优先最小改动。

其他：

```text
attractions / dining / accommodation / budget / experience / advanced
```

仍保持 5.5 通用壳，不得在 5.7 中提前实现。

---

# 9. Page Structure

推荐：

```text
移动偏好
长期默认的出行方式与移动负担偏好

[返回旅行偏好]

┌ 当前移动偏好摘要 ┐

快速设置
[轻松优先] [平衡] [效率优先]

常用倾向
[少换乘] [少步行]

详细限制
[ ] 不乘坐公共交通
[ ] 不乘坐公交
[ ] 不乘坐游船

冲突 / 取舍提示

[恢复默认] [取消] [保存]
```

页面第一眼应是旅行偏好设置，不应像系统后台配置页。

---

# 10. Quick Preset

设计文档中的中项目快速设置示例包括：

```text
轻松优先
平衡
效率优先
少换乘
少步行
```

为了保持 UI 易懂，本 Task 将其分成两层 presentation control：

## 10.1 节奏 / 优先方向

单选 segmented control：

```text
轻松优先
平衡
效率优先
```

这些在 5.7 中只属于 UI View Model / Fixture，不得宣称为最终 Schema 枚举。

## 10.2 常用移动倾向

可独立切换：

```text
少换乘
少步行
```

使用 `button aria-pressed` 或等价可访问控件。

---

# 11. Detailed Restrictions

只实现当前已经明确讨论过的详细限制：

```text
不乘坐公共交通
不乘坐公交
不乘坐游船
```

禁止 Codex 自行增加：

- 不乘地铁；
- 不乘新干线；
- 不打车；
- 不坐飞机；
- 轮椅专用算法；
- 其他未经确认的交通禁用项。

未来具体交通方式扩展留给 Master Data / Schema。

---

# 12. Conflict Handling

至少识别设计文档明确示例：

```text
少步行 + 不乘公共交通
```

这种组合可能产生取舍。

UI 必须：

- 不静默忽略任何选择；
- 不自动取消用户另一个条件；
- 不假装已经由 AI 解决；
- 显示温和、明确的冲突提示。

建议文案：

```text
这些条件可能互相影响
“不乘坐公共交通”可能增加步行距离。生成具体行程时，TravelAssist 需要结合目的地交通条件做取舍。
```

这是 UI 级 warning，不是正式 Planner 冲突算法。

可增加 pure function：

```ts
getMobilityWarnings(state);
```

仅返回已知规则的 presentation warning。

---

# 13. Redundancy Notice

`不乘坐公共交通 + 不乘坐公交` 不是阻塞冲突，可以作为冗余 / 包含关系提示，但不得自动删除用户选择。

例如：

```text
“不乘坐公交”已包含在您更严格的“不乘坐公共交通”偏好中。
```

不要把这种提示做成错误状态。

---

# 14. Current Summary

页面顶部提供自然语言摘要，随 Draft 变化实时更新，例如：

```text
平衡 · 少换乘 · 少步行
```

有详细限制时可追加最多 1–2 条最重要限制，例如：

```text
平衡 · 少换乘 · 不乘公交
```

不要在摘要里把所有开关完整重复一遍。

5.5 Overview 当前使用静态 / in-memory fixture。

如果当前架构没有稳定的跨 route presentation provider：

- 不为了伪造持久化而引入 localStorage；
- 不强制改造 5.5 Overview；
- Result 明确记录 `Overview cross-route synchronization: deferred`。

若已有稳定的纯内存 Preference Provider，可安全复用，但不得把它升级成正式 Schema / persistence。

---

# 15. Save / Cancel / Restore

复杂详细页面遵守设计书：

```text
[恢复默认]      [取消] [保存]
```

行为：

## 保存

- 把当前 Draft 写入本页面的 in-memory Saved state；
- 显示轻量 `✓ 已保存`；
- 不弹大成功页；
- 不发送网络写请求。

## 取消

- 回滚到最近一次 Saved state；
- 若没有改动则保持无动作。

## 恢复默认

- 恢复 5.7 的 presentation default；
- 该 default 不是正式 WBS 5.13 Preset；
- UI 中应避免称其为“系统永久默认数据”。

Result 必须说明 default 仅是 UI fixture。

---

# 16. Unsaved Guard

Draft 与 Saved 不一致时：

```text
您还有尚未保存的修改。

[放弃修改] [继续编辑]
```

至少覆盖：

- 返回旅行偏好；
- Sidebar 导航；
- Avatar Popover 跳转；
- 浏览器刷新 / 关闭（`beforeunload`）。

优先复用 develop 已存在的 Personal Center navigation guard。

禁止为了 5.7 重构整个 shared Shell。

---

# 17. Visual Rules

必须继承 WBS 5.5 已完成的 Preference Center 视觉。

优先复用：

```text
/media/personal-center/preferences/category-mobility.webp
```

作为移动偏好摘要视觉或 header artwork。

不要求新增图片，不需要重新扫描素材库才能开工。

样式要求：

- 暖米白 / 暖白；
- 珊瑚朱红强调；
- 浅暖粉褐边框；
- 大圆角；
- 轻阴影；
- 快速设置像旅行产品的选择卡 / segmented control；
- 详细限制清晰但低压迫感；
- warning 使用温和琥珀 / 暖色语义，不用大面积危险红。

---

# 18. Recommended Code Structure

优先继续在：

```text
src/features/preferences/
```

增加例如：

```text
mobility-preference-page.tsx
mobility-preference.module.css
mobility-preference-model.ts
components/
  mobility-preset-selector.tsx
  mobility-tendency-options.tsx
  mobility-restrictions.tsx
  mobility-warning.tsx
  preference-save-actions.tsx
```

不要求机械遵守文件名，但必须模块化。

不要把全部逻辑塞入动态 route 的 `page.tsx`。

---

# 19. Allowed Files

主要允许：

```text
src/features/preferences/**
src/app/(account)/personal-center/preferences/[category]/page.tsx
src/app/(account)/personal-center/preferences/mobility/**   # 如确有需要
tests/*5-7*
docs/tasks/TASK-WBS-5.7-b-mobility-preference-ui.md
docs/tasks/RESULT-WBS-5.7-b-mobility-preference-ui.md
docs/evidence/WBS-5.7-B/**
docs/project/WBS-TravelAssist.md
```

如复用既有素材，不新增 media 文件。

---

# 20. Files To Avoid

默认禁止修改：

```text
src/features/profile/**
src/features/companions/**
src/features/home/**
src/features/planner/**
src/features/map/**
src/features/start-flow/**
src/app/(account)/personal-center/account/**
src/app/(account)/personal-center/companions/**
package.json
package-lock.json
.github/workflows/**
```

默认也不要修改：

```text
personal-center-shell.tsx
personal-sidebar.tsx
avatar-popover.tsx
personal-center.module.css
```

除非存在最新 develop 可复现的明确 bug，且只做最小修复并在 Result 单独说明。

---

# 21. Responsive

至少验证：

```text
1920×1080
1440×900
1280×720
390×844
320×740
```

Desktop：

- 快速设置可横向分组；
- 详细限制有清晰层级；
- 保存操作固定在内容逻辑末端，不遮挡内容。

Mobile：

- segmented control 可换行或纵向；
- 所有 hit target 可点击；
- warning 不溢出；
- action buttons 不被压缩到不可读；
- no horizontal overflow。

---

# 22. Accessibility

必须验证：

- segmented control 有 group / selected 语义；
- toggle 使用 `aria-pressed`、checkbox 或 switch 等真实语义；
- label 与说明关联；
- warning 可被 screen reader 获取；
- 键盘可完成所有设置；
- focus visible；
- 保存 / 取消 / 恢复默认有明确 accessible name；
- unsaved dialog focus trap / Esc / focus return。

---

# 23. Unit Tests

至少覆盖：

1. 默认 presentation state；
2. quick preset 单选；
3. 少换乘切换；
4. 少步行切换；
5. 三个已冻结详细限制；
6. `少步行 + 不乘公共交通` 产生 warning；
7. warning 不自动修改用户 state；
8. 公共交通 + 公交产生 redundancy notice 而非 error；
9. summary 只显示主要 2–3 项；
10. Cancel 回滚；
11. Save 更新 page-local saved state；
12. Restore 恢复 UI fixture；
13. 不产生 Planner temporary preference 写入。

---

# 24. Browser Acceptance

必须实际访问：

```text
/personal-center/preferences/mobility
```

验证：

## Initial

- 标题 / 摘要；
- mobility artwork；
- 三个 quick preset；
- 少换乘 / 少步行；
- 三个详细限制；
- action buttons。

## Interaction

- 切换 preset；
- 少换乘；
- 少步行；
- 不乘公共交通；
- conflict warning；
- 不乘公交；
- redundancy notice；
- 不乘游船；
- Cancel；
- Save；
- Restore Default。

## Guard

- 返回旅行偏好；
- Sidebar；
- Avatar Popover；
- beforeunload。

## Regression

```text
/personal-center/preferences
/personal-center/preferences/attractions
/personal-center/preferences/dining
/personal-center/preferences/accommodation
/personal-center/preferences/budget
/personal-center/preferences/experience
/personal-center/companions
/personal-center/account
```

5.8 / 5.9 的 route 必须仍保持通用壳，不得被 5.7 顺带实现。

---

# 25. Console / Network

要求：

- 0 新增写请求；
- 无 hydration error；
- 无 React warning；
- 无 blocking console error；
- mobility 素材正常 200；
- 无新增 404。

既有 favicon 等 baseline 问题只记录，不越界修复。

---

# 26. Validation

执行：

```bash
npm ci
npm run lint
npm run typecheck
npm run format:check
npm run test --if-present
node --test tests/*.test.mjs
npm run build
git diff --check
```

全仓 `format:check` 若有历史 baseline：

- 如实记录；
- 不修改其他 Owner 文件；
- 当前 Task 自己修改的 TS / TSX / CSS / MJS / Task / Result 必须 targeted Prettier 通过。

---

# 27. Git / Workflow Safety

提交前：

```bash
git status
git diff --name-only
git diff --check
```

禁止盲目：

```text
git add .
```

精确 stage 当前 Task 文件。

建议实现 commit：

```bash
git commit -m "feat(WBS-5.7-B): implement mobility preference UI"
```

Push：

```bash
git push -u origin feature/b-account-wbs-5-7-mobility-preference-ui
```

仓库已有 feature push 自动建 PR / 自动合并 workflow 的历史行为。

执行时必须先检查当前 workflow 行为，但：

- 禁止修改 `.github/workflows/**`；
- 禁止主动启用 auto-merge；
- 目标仍是 Draft / Open 等待用户验收；
- 如果 workflow 在人工转换 Draft 前自动合并，必须在 Result 如实记录，并保持 Issue / WBS 不自动标记已完成，等待用户验收。

---

# 28. PR

目标 PR：

```text
feat(WBS-5.7-B): implement mobility preference UI
```

Base：

```text
develop
```

实现完成但用户未验收时：

```text
WBS 5.7 = 待审查
Task = 待审查
Issue = Open
PR = Draft / Open（如 workflow 允许）
```

只有：

```text
代码进入 develop
+
用户验收通过
```

才允许：

```text
WBS 5.7 = 已完成
Task = 已完成
Issue = Closed
```

---

# 29. Required Final Result

必须生成：

```text
docs/tasks/RESULT-WBS-5.7-b-mobility-preference-ui.md
```

并返回：

```md
# WBS-5.7-B Result

## Status

Completed / Awaiting Review / Partially Completed / Blocked

## Preflight

- origin/develop base:
- dependency 5.5:
- duplicate Task:
- duplicate Issue:
- duplicate PR:

## Tracking

- Issue:
- Task File:
- Result File:
- Branch:
- Implementation Commit:
- Final Head:
- PR:
- WBS updated:

## Mobility UI

- generic shell replaced:
- current summary:
- preset selector:
- fewer transfers:
- less walking:
- detailed restrictions:
- save / cancel / restore:

## Conflict UX

- lessWalking + noPublicTransit:
- redundancy notice:
- silent state mutation: No

## State Boundary

- Persistence:
- Formal Preference Schema:
- Planner Contract:
- localStorage / Cookie:
- network writes:
- overview cross-route synchronization:

## Unsaved Guard

- back to preferences:
- Sidebar:
- Avatar Popover:
- beforeunload:

## Responsive

- 1920×1080:
- 1440×900:
- 1280×720:
- 390×844:
- 320×740:
- horizontal overflow:

## Regression

- Preference overview:
- other category shells:
- Companions:
- Account:
- Avatar Popover:

## Validation

- npm ci:
- lint:
- typecheck:
- format:check:
- targeted format:
- tests-if-present:
- Node tests:
- build:
- diff-check:
- browser QA:

## Ownership Safety

- A Task modified:
- Other B Task modified:
- 5.5 status changed:
- 5.8 / 5.9 implemented:
- Planner modified:
- Auth / API / DB added:
- package/dependencies modified:
- shared Shell modified:

## Git

- Commit:
- Push:
- PR:
- Merge behavior:

## Problems

-

## Next

Stop. Do not automatically start WBS 5.8 / 5.9 / 5.11 / 5.16.
```

---

# 30. Stop Rule

完成并 push 后停止。

禁止自动：

- 开始 5.8；
- 开始 5.9；
- 开始 5.11；
- 开始 5.16；
- 接 Planner；
- 实现 DB / API；
- 修改 workflow；
- 在未获用户验收时自行关闭 Issue / 标记 WBS 已完成。
