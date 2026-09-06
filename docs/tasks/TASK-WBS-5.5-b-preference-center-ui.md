# WBS-5.5-B — 偏好管理中心 UI

## Metadata

- Task ID: `WBS-5.5-B`
- WBS ID: `5.5`
- Owner: `B`
- Responsibility: `Personal Center`
- Priority: `P0`
- WBS Dependencies: `1.25`, `5.1`
- Dependency Status: 两项均已完成
- Repository: `https://github.com/kanzakimy0/TravelAssist.git`
- Workspace: `F:\TravelAssist`
- Base Branch: `develop`
- Proposed Branch: `feature/b-account-wbs-5-5-preference-center-ui`
- Proposed Issue: `[WBS 5.5][B] 偏好管理中心 UI`
- Result File: `docs/tasks/RESULT-WBS-5.5-b-preference-center-ui.md`
- Status: `Ready after coordination gate`

---

# 1. Coordination Gate — 不与 5.4 并行

用户已经明确决定不同时执行 5.4 与 5.5。

虽然 WBS 5.5 的正式依赖只有 `1.25 + 5.1`，但本 Task 增加一个执行协调 Gate：

- 如果 5.4 仍在用户布局调整 / 视觉验收阶段，例如 PR #98 仍 Draft / Open 且用户尚未结束 5.4 调整，本 Task **不得开始实现**。
- 允许开始的条件：最终 5.4 已进入 `develop`；或用户明确关闭 / 放弃当前 5.4 路线并明确允许开始 5.5。
- 5.5 必须从执行时最新 `origin/develop` 开始，不得从 5.4 feature branch 派生、cherry-pick 或复制未验收 Shell 样式。

若 Gate 未满足，返回：

```text
Status: Blocked
Reason: user requested sequential execution; WBS 5.4 visual work is still active.
```

然后停止。

---

# 2. Objective

把当前：

```text
/personal-center/preferences
```

从 `PersonalPlaceholder` 实现为正式的 **旅行偏好中心首页 UI**。

核心结构固定为：

```text
两个六边形偏好画像
+
一句自然语言旅行画像总结
+
六个详细偏好摘要卡
+
更多详细设置入口
+
重置偏好
```

本 Task 只负责 Preference Center Overview / Navigation / Presentation State，不提前吞并 5.7 / 5.8 / 5.9 的详细编辑 UI。

---

# 3. Design Authority

执行前必须读取最新 `develop`：

```text
docs/project/WBS-TravelAssist.md
docs/ui/preference-center.md
docs/preferences/preference-system.md
docs/ui/personal-center.md
docs/ui/personal-center-shell.md
docs/ui/personal-center-responsive-states.md
docs/ui/design-system.md
docs/development/task-tracking.md
```

如果最终 5.4 已经合入 `develop`，同时读取其最终 Task / Result / runtime，并继承已经验收的 Personal Center Shell 视觉。

优先级：

```text
用户最新确认决定
>
docs/ui/preference-center.md
>
docs/preferences/preference-system.md
>
最终已合入的 Personal Center Shell / 5.4 视觉
>
personal-center-responsive-states.md
>
design-system.md
>
当前 Placeholder
>
Codex 自行推导
```

不得创建第二套与 Planner 不兼容的偏好业务模型。

---

# 4. Preflight

执行：

```bash
git status
git branch --show-current
git fetch --all --prune
git switch develop
git pull --ff-only origin develop
git log -1 --oneline
```

必须确认：

- working tree clean；
- local develop 与 origin/develop 一致；
- 记录真实 Base Commit；
- 重新检查 5.4 Coordination Gate；
- 搜索最新 A/B Task、Issue、PR；
- 搜索是否已有 WBS 5.5 Task / Issue / branch / PR。

搜索示例：

```bash
gh issue list --state all --search "WBS 5.5" --limit 30
gh pr list --state all --search "WBS 5.5" --limit 30
git branch -a | findstr /I "5-5 preference"
```

如存在等价实现，停止并报告，不得重复创建。

---

# 5. Tracking

真正开始实现时，如果不存在等价 Issue，创建：

```text
[WBS 5.5][B] 偏好管理中心 UI
```

然后从最新 develop 创建：

```bash
git switch -c feature/b-account-wbs-5-5-preference-center-ui
```

正式开始：

```text
WBS 5.5 = 进行中
Task = 进行中
Issue = Open
```

只修改 WBS 5.5 自己的状态与 `WBS-5.5-B` Tracking Record。

---

# 6. Ownership Rule

**强制规则：**

> 禁止覆盖、删除、重写其他 Owner 的 Task 文件；只允许更新当前 Task ID 对应文件。涉及其他 Task 时只能读取、引用和报告差异。

同时禁止：

- 修改 A Task；
- 修改其他 B Task；
- 重写整个 WBS；
- 改动 5.1 / 5.2 已完成状态；
- 开始 5.7 / 5.8 / 5.9 / 5.11 / 5.16。

---

# 7. Scope Boundary

## In Scope

- Preference Center 首页；
- 双 Radar 画像；
- Radar hover / focus 语义；
- 自然语言画像总结；
- 六个摘要卡；
- 六类详细页面的导航目标 / 最小 route shell；
- `更多详细设置`最小入口壳；
- `重置偏好`确认交互；
- Empty / Partial state 呈现能力；
- presentation-only in-memory state；
- 响应式 / 可访问性 / 测试 / 浏览器验收。

## Out of Scope

以下属于独立 WBS：

```text
5.7 移动偏好 UI
5.8 景点 / 活动偏好 UI
5.9 餐饮 / 住宿 / 预算偏好 UI
5.11 Preference Schema
5.13 Preference Preset / 默认值
5.14 Planner-readable Preference Contract
5.16 Preference persistence API
```

---

# 8. Data Boundary

本 Task 只允许：

```text
typed presentation fixture
+
React / component in-memory state
```

禁止：Supabase、DB、ORM、API、Route Handler 写入、localStorage、Cookie、Session、假持久化、假 Preference API。

Result 必须明确：

```text
Persistence: Mock / in-memory only
Schema Contract: Not implemented
```

WBS 5.11 尚未实现，因此 5.5 只能建立 UI 层 view model。例如可以使用：

```ts
type PreferenceLevel = "very_high" | "high" | "neutral" | "low" | "unset";
```

这个类型只服务 Radar display、summary、card summary 和 UI tests，不得宣称是正式 Preference Schema、API payload、DB 字段或 Planner Contract。

---

# 9. Page Header

页面标题：

```text
旅行偏好
```

副标题建议：

```text
这些是您的长期默认偏好，会用于新旅行的初始建议。
```

低优先级说明：

```text
具体旅行中的临时调整不会自动改变这里。
```

不要堆叠大量解释文字。

---

# 10. 双 Radar 画像

桌面端两个 Radar 并排；Mobile 必须纵向堆叠。

## 景点偏好画像

六轴严格固定：

```text
自然
历史
人文
艺术
摄影
活动体验
```

## 旅行风格画像

六轴严格固定：

```text
轻松
经典
计划
探索
参与
深度
```

这些维度独立存在，不做强制二元反义关系。

---

# 11. Radar Implementation

不新增 Chart npm dependency，优先用 SVG 实现。

要求：

- 六边形背景线；
- 六根轴；
- 用户画像轮廓；
- 低透明度填充；
- 珊瑚朱红 / 樱粉强调；
- 普通视图不显示百分比；
- 不显示复杂评分公式；
- 不允许拖动节点直接编辑。

Hover / Focus 时提供语义：

```text
很喜欢 / 喜欢 / 一般 / 较少 / 未设置
```

Radar 必须可访问：

- SVG 有 title / aria-label；
- 每个维度有可访问名称与级别；
- keyboard focus 可达；
- focus visible；
- 不只靠颜色表达强弱。

内部把语义级别映射为 SVG 半径只属于 presentation geometry，不是业务分数。

---

# 12. Travel Portrait Summary

双 Radar 下显示：

```text
您的旅行画像
偏爱自然与历史景点，喜欢轻松、有计划、带一点探索感的旅行方式。
```

要求：

- 只总结最显著 2–4 个维度；
- 不输出全部维度；
- 不输出百分比；
- 文案自然，像旅行顾问；
- 由 pure function 从当前 presentation state 派生；
- Reset / state change 后自动同步。

标题附近可以放小型 `?`，视觉约比正文小 20%，只在 Hover / Focus 时显示说明：

```text
画像根据您保存的长期偏好生成。具体旅行中的临时调整不会永久改变这里。
```

---

# 13. 六个摘要卡

首页固定六类且顺序保持：

```text
移动
景点与活动
餐饮
住宿
预算
旅行体验
```

每张卡只显示：

- 主题 media slot；
- 大类名称；
- 当前最重要 2–3 项摘要；
- 已设置数量 / 状态语义；
- `>` 进入对应 route。

首页禁止展开大量中 / 小项目。

初始 fixture 可以使用设计书已有示例：

```text
移动：铁路优先 · 少换乘 · 步行中等
景点与活动：自然 · 历史 · 摄影
餐饮：当地料理 · 小店 · 排队接受中等
住宿：交通方便 · 舒适 · 少换酒店
预算：中等预算 · 更愿意花在住宿和体验
旅行体验：摄影 · 当地文化 · 日落夜景
```

仅用于 UI fixture，不进入正式 Schema。

---

# 14. Category Routes

5.5 负责建立稳定导航目标，但不得实现下游详细控件。

建议：

```text
/personal-center/preferences/mobility
/personal-center/preferences/attractions
/personal-center/preferences/dining
/personal-center/preferences/accommodation
/personal-center/preferences/budget
/personal-center/preferences/experience
```

如执行时已有正式 route 命名，以最新仓库为准。

子页只允许最小内容：

```text
Breadcrumb / 返回旅行偏好
分类标题
当前摘要
后续详细设置说明
```

不得实现 5.7 / 5.8 / 5.9 的具体编辑控件。

Result 必须写：

```text
Detailed category editing: Not implemented in 5.5
```

---

# 15. More Detailed Settings

首页保留：

```text
更多详细设置 >
```

建议 route：

```text
/personal-center/preferences/advanced
```

只建立最小壳，不得在 Master Data / Schema 未冻结前自行增加完整高级枚举、硬限制优先级或 Planner 规则。

---

# 16. Reset Preference

页面底部提供低视觉优先级：

```text
重置偏好
```

点击后必须二次确认：

```text
重置长期偏好？
这只会重置您的长期旅行偏好，不会删除账户、同行人或已保存的旅行。

[取消] [重置偏好]
```

本 Task 只重置 in-memory presentation fixture。

Reset 后：

- 两个 Radar；
- 旅行画像；
- 六个摘要卡

同步恢复默认 presentation state。

不得伪造数据库重置成功。

---

# 17. Empty / Partial State

Empty：

```text
还没有形成完整的旅行画像
设置几项偏好后，TravelAssist 会在这里为您整理旅行风格。

[开始设置偏好]
```

规则：

- 不伪造明确完整画像；
- `unset` 不等于最低分；
- Partial 状态不把缺失维度解释成“不喜欢”；
- summary 不描述缺失维度；
- 具体默认值与归一化留给 5.11 / 5.13。

可以主要通过 pure state tests 验证 Empty / Partial，不要给普通用户暴露 debug switch。

---

# 18. Visual Asset Gate

`docs/ui/preference-center.md` 要求 Preference 内容图片使用写实摄影。

执行时必须先检查最新 `develop` 是否已经有：

```text
preference-specific approved photoreal assets
+
manifest / source record
```

如果存在，且用途明确匹配，才能使用。

如果不存在：

禁止：

- 从 A Home 随意借图；
- 重用语义不匹配的 More Features 图片；
- Codex 自己上网找无审核图片；
- 下载无许可 / provenance 记录的图片；
- 使用水彩旅行卡；
- 伪造“已完成写实摄影”。

允许先建立稳定 media slot + 中性暖色 placeholder / icon，以确保后续换正式图片不重做布局。

Result 必须明确：

```text
Preference-specific photoreal asset gate: Pending / Passed
```

若没有正式 Preference 图片且用户未明确接受无图版本，不得声称最终摄影视觉已完成。

---

# 19. Visual Style

必须继承最终已合入的 Personal Center 视觉，不重新设计 Shell。

- 暖米白 / 象牙白；
- 极淡和纸感；
- 少量樱粉细节；
- 珊瑚朱红轻强调；
- 墨色主文字；
- 暖粉褐浅边框；
- 大圆角；
- 极轻阴影；
- 不做传统 Admin Dashboard。

禁止大红色块、巨大富士山、巨大鸟居背景、大段装饰文字、技术 Badge。

由于用户选择顺序执行，5.5 应直接消费最终 5.4 已合入 `develop` 的 Shell 视觉。默认不要修改 shared Shell / Sidebar / Avatar Popover。

---

# 20. Recommended Code Structure

建议：

```text
src/features/preferences/
├─ preference-center.tsx
├─ preference-center.module.css
├─ preference-data.ts
├─ preference-view-model.ts
└─ components/
   ├─ preference-radar.tsx
   ├─ preference-portrait-section.tsx
   ├─ preference-portrait-summary.tsx
   ├─ preference-category-card.tsx
   ├─ preference-category-grid.tsx
   ├─ preference-help.tsx
   ├─ reset-preference-dialog.tsx
   └─ preference-category-shell.tsx
```

不要把全部逻辑塞入 `page.tsx`，也不要把大量 5.5 CSS 堆进 `personal-center.module.css`。

---

# 21. Allowed Files

主要允许：

```text
src/app/(account)/personal-center/preferences/**
src/features/preferences/**
tests/*5-5*
docs/tasks/TASK-WBS-5.5-b-preference-center-ui.md
docs/tasks/RESULT-WBS-5.5-b-preference-center-ui.md
docs/tasks/evidence/WBS-5.5-B/**
docs/project/WBS-TravelAssist.md
```

如果使用已批准 Preference 图片，可增加：

```text
public/media/personal-center/preferences/**
assets/design/personal-center/preferences/**
```

但必须有明确来源 / manifest。

原则上禁止修改：

```text
src/features/profile/**
src/app/(account)/personal-center/account/**
src/features/home/**
src/features/planner/**
src/features/map/**
src/features/start-flow/**
package.json
package-lock.json
.github/workflows/**
```

默认不得修改：

```text
src/features/personal-center/components/personal-center-shell.tsx
src/features/personal-center/components/personal-sidebar.tsx
src/features/personal-center/components/avatar-popover.tsx
src/features/personal-center/personal-center.module.css
```

如确有 shared-shell bug，必须先证明在最新 develop 可复现，只做最小修复，并在 Result 单独说明，不能改变 5.1 / 5.2 已验收行为。

---

# 22. Responsive

至少验证：

```text
1920×1080
1440×900
1280×720
390×844
320×740
```

Desktop：两个 Radar 并排。

Mobile：

```text
景点 Radar
↓
旅行风格 Radar
↓
旅行画像
↓
分类卡
```

禁止在 320 / 390 宽度把两个 Radar 强行并排压缩。

分类卡 Desktop 可合理 3×2，Tablet 2 列，Mobile 单列或可读双列；任何视口不得横向 overflow。

---

# 23. Accessibility

必须验证：

- Tab 顺序；
- Radar keyboard focus；
- Help tooltip keyboard focus；
- 六张卡可键盘进入；
- Reset 可键盘打开；
- Dialog focus trap；
- Esc 关闭；
- 关闭后 focus return；
- 图片不是类别唯一信息来源；
- Radar 不只靠颜色表达强弱。

---

# 24. Tests

至少覆盖：

1. 两个 Radar 六轴严格固定；
2. semantic level → display geometry；
3. `unset` 不等于 `low`；
4. summary 只选择显著 2–4 项；
5. Reset 恢复 presentation default；
6. 六个 category route 固定；
7. Trip 临时偏好不会进入长期 Preference state；
8. category fixture 不扩充未冻结枚举。

不要为了 5.5 测试引入新的大型依赖，优先复用现有 Node test runner。

---

# 25. Browser Acceptance

实际打开：

```text
/personal-center/preferences
```

并验证六个 category route 与 advanced route。

Overview 必须检查：

- Header；
- 两个 Radar；
- 12 个轴文本；
- Travel Portrait Summary；
- 六个摘要卡；
- More Detailed Settings；
- Reset。

Interaction：

- Radar hover / focus；
- Help tooltip；
- category navigation / back；
- reset confirm / cancel / confirm；
- Empty / Partial pure state tests。

Regression：

- Personal Center 五项一级导航；
- Avatar Popover；
- `/personal-center`；
- `/personal-center/account`；
- no horizontal overflow。

---

# 26. Console / Validation

要求无 blocking console error、hydration error、React warning、image decode error 或新增 404。

全局既有 `/favicon.ico` 404 如仍存在，只记录 baseline，不由 5.5 越界修复。

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

全仓 Prettier 若有历史失败：记录精确路径；当前 Task 修改文件必须 targeted Prettier Pass；禁止修改其他 Owner 文件消除 baseline。

---

# 27. Commit / Push / PR

建议实现 commit：

```bash
git commit -m "feat(WBS-5.5-B): implement preference center UI"
```

提交前检查：

```bash
git status
git diff --name-only
git diff --check
```

不要盲目 `git add .`，精确 stage 当前 Task 文件。

Push：

```bash
git push -u origin feature/b-account-wbs-5-5-preference-center-ui
```

创建 Draft PR：

```text
feat(WBS-5.5-B): implement preference center UI
```

Base：`develop`。

用户视觉验收前保持 Draft / Open。

---

# 28. Status Rules

正式开始：

```text
WBS 5.5 = 进行中
Task = 进行中
Issue = Open
```

实现完成但未合并：

```text
WBS 5.5 = 待审查
Task = 待审查
Issue = Open
PR = Draft / Open
```

只有：

```text
PR merged into develop
+
用户验收通过
```

之后才能：

```text
WBS 5.5 = 已完成
Task = 已完成
Issue = Closed
```

---

# 29. Acceptance Criteria

- [ ] 5.4 sequential coordination gate satisfied
- [ ] latest develop pulled
- [ ] no duplicate 5.5 task / issue / PR
- [ ] `/personal-center/preferences` no longer Placeholder
- [ ] two Radar charts implemented
- [ ] attraction Radar exactly 6 frozen axes
- [ ] travel-style Radar exactly 6 frozen axes
- [ ] no percentage scores
- [ ] no direct Radar drag editing
- [ ] semantic hover / focus works
- [ ] natural-language portrait summary implemented
- [ ] six fixed category cards implemented
- [ ] category routes established
- [ ] detailed 5.7 / 5.8 / 5.9 controls not implemented
- [ ] advanced entry shell implemented
- [ ] reset confirmation implemented
- [ ] reset only affects in-memory state
- [ ] empty / partial semantics supported
- [ ] unset != dislike
- [ ] five viewports passed
- [ ] keyboard / focus passed
- [ ] lint / typecheck / tests / build / diff-check passed
- [ ] no Auth / API / DB / persistence added
- [ ] no A Main System modified
- [ ] no 5.4 Profile implementation modified
- [ ] 5.1 / 5.2 statuses unchanged
- [ ] Task / Issue / WBS / PR synchronized
- [ ] visual asset gate reported honestly

---

# 30. Required Final Result

```md
# WBS-5.5-B Result

## Status
Completed / Partially Completed / Awaiting Review / Blocked

## Coordination Gate
- WBS 5.4 final state:
- sequential execution satisfied:

## Preflight
- origin/develop base:
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
- Draft PR:
- WBS updated:

## Overview UI
- Placeholder removed:
- Header:
- Attraction Radar:
- Travel Style Radar:
- Portrait summary:
- Six category cards:
- Advanced entry:
- Reset:

## Radar Semantics
- attraction axes:
- travel-style axes:
- semantic levels:
- percentage hidden:
- direct editing disabled:
- accessibility:

## Category Navigation
- mobility:
- attractions:
- dining:
- accommodation:
- budget:
- experience:
- advanced:
- detailed editing implemented: No

## State Boundary
- Persistence:
- Schema Contract:
- API / DB / Auth:
- localStorage / Cookie:
- Trip temporary preference isolation:

## Empty / Partial
- empty:
- partial:
- unset semantics:

## Visual Asset Gate
- approved preference-specific photos:
- asset source / manifest:
- final photography acceptance:

## Responsive
- 1920×1080:
- 1440×900:
- 1280×720:
- 390×844:
- 320×740:
- horizontal overflow:

## Functional Regression
- Personal Center navigation:
- Avatar Popover:
- Home:
- Account:
- console:
- hydration:

## Validation
- npm ci:
- lint:
- typecheck:
- format:check:
- task-targeted format:
- tests-if-present:
- Node tests:
- build:
- diff-check:

## Ownership Safety
- A Task modified:
- Other B Task modified:
- Profile 5.4 files modified:
- A Main System modified:
- shared Shell modified:
- package/dependencies modified:
- WBS 5.1 / 5.2 status changed:

## Git
- Branch:
- Commit:
- Push:
- PR:
- Merge Commit:

## Three-way Sync
- Task:
- Issue:
- WBS 5.5:
- PR:

## Problems
-

## Next
Stop. Do not automatically start 5.6 / 5.7 / 5.8 / 5.9 / 5.11 / 5.16.
```

---

# 31. Stop Rule

完成并 push 后停止。

不要自动：

- merge PR；
- close Issue；
- 开始 5.6 / 5.7 / 5.8 / 5.9 / 5.11 / 5.16；
- 修改 Planner；
- 修改 Auth / DB。

等待用户验收。
