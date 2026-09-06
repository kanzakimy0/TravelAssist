# WBS-5.20-B — Personal Center Loading / Empty / Error / Responsive closeout

## Metadata

- Task ID: `WBS-5.20-B`
- WBS ID: `5.20`
- Owner: `B`
- Responsibility: `Personal Center / Shared State & Responsive QA`
- Priority: `P1`
- Status: `待审查`
- Depends On: `1.29, 5.1`
- Dependency State at authoring: `1.29 = 已完成`, `5.1 = 已完成`
- Repository: `https://github.com/kanzakimy0/TravelAssist.git`
- Workspace: `F:\TravelAssist`
- Base Branch: `develop`
- Authoring Base: `9fded46c6c6789fc225913b65f250e5899a6fa53` or newer `origin/develop`
- Implementation Branch: `feature/b-account-wbs-5-20-personal-center-responsive-states`
- Issue: `#146 — [WBS 5.20][B] Personal Center Loading / Empty / Error / Responsive closeout`
- Task File: `docs/tasks/TASK-WBS-5.20-b-personal-center-responsive-states.md`
- Result File: `docs/tasks/RESULT-WBS-5.20-b-personal-center-responsive-states.md`

---

# 1. Objective

按照已冻结的 `docs/ui/personal-center-responsive-states.md`，对当前已经合入 `develop` 的 Personal Center 做一次统一收尾：

```text
Responsive
+
Loading / Skeleton
+
Empty
+
Error
+
Offline / Permission / Auth-expired presentation boundary
+
Keyboard / Focus / Touch / Reduced Motion
```

本 Task 的目标不是新增业务，而是让已经完成的 Personal Center UI 在不同尺寸和异常状态下保持一致、可访问、可恢复。

当前已完成的业务页面必须视为冻结输入：

```text
5.4 Profile / Account
5.5 Preference Center
5.6 Companions
5.7 Mobility Preference
5.8 Attractions Preference
5.9 Dining / Accommodation / Budget Preference
5.10 Trip Library
```

5.20 只能做状态层、响应式、可访问性与必要的共享 UI 收尾，禁止改写这些页面的业务规则。

---

# 2. Source of Truth

执行前完整读取最新 `develop`：

```text
docs/project/WBS-TravelAssist.md
docs/ui/personal-center-responsive-states.md
docs/ui/personal-center.md
docs/ui/personal-center-shell.md
docs/ui/personal-center-design-freeze-v1.md
docs/ui/profile-account.md
docs/ui/preference-center.md
docs/ui/companion-management.md
docs/ui/trip-library.md
docs/ui/navigation-flow.md
```

同时读取当前实现：

```text
src/app/(account)/personal-center/**
src/features/personal-center/**
src/features/profile/**
src/features/preferences/**
src/features/companions/**
src/features/trip-library/**
```

优先级：

```text
用户最新确认决定
>
1.29 冻结响应式 / 状态规范
>
已验收的 5.4–5.10 业务实现
>
当前 develop 代码
>
Codex 自行推导
```

---

# 3. Preflight

执行：

```bash
cd F:\TravelAssist

git status --short --untracked-files=all
git branch --show-current
git fetch --all --prune
git switch develop
git pull --ff-only origin develop
git log -1 --oneline
```

必须：

- working tree 安全；
- local develop 与 origin/develop 对齐；
- 记录真实 Base Commit；
- 保留用户所有未追踪素材；
- 禁止 `git clean -fd`；
- 禁止 `git reset --hard`；
- 禁止 force push。

重复检查：

```bash
gh issue list --state all --search "WBS 5.20" --limit 30
gh pr list --state all --search "WBS 5.20" --limit 30
git branch -a | findstr /I "5-20 responsive states"
```

复用唯一正式 Issue：

```text
#146
```

不得创建第二个 5.20 Issue。

历史 `TASK-010-B / PR #108` 只覆盖过导航子集，不属于完整 5.20，实现时不得误判为重复。

---

# 4. Dependency Gate

Master WBS 正式依赖：

```text
1.29
5.1
```

必须确认：

```text
1.29 = 已完成
5.1 = 已完成
```

当前 develop 上 5.4–5.10 已完成，可作为本 Task 的实际 QA 基线，但它们不是 WBS 5.20 的正式依赖字段。

如果执行时某个已完成页面在最新 develop 暂时发生上游回归：

- 只报告并修复明确属于 5.20 的响应式 / 状态层问题；
- 不借 5.20 重写其业务逻辑。

---

# 5. Start Tracking

实现分支：

```bash
git switch -c feature/b-account-wbs-5-20-personal-center-responsive-states
```

正式开始：

```text
WBS 5.20 = 进行中
Task = 进行中
Issue #146 = Open
```

只精确更新：

```text
WBS 5.20
WBS-5.20-B 自己的 Tracking Record
当前 Task / Result
```

---

# 6. Hard Ownership Rule

强制：

> 禁止覆盖、删除、重写其他 Owner 的 Task 文件；只允许更新当前 Task ID 对应文件。涉及其他 Task 时只能读取、引用和报告差异。

另外禁止：

- 修改 A Task；
- 修改其他 B Task 的历史内容；
- 重写整个 WBS；
- 修改 Planner / Map / Route / Start；
- 实现 Auth Core；
- 实现 DB / API / Persistence；
- 实现 Reservation Hub；
- 改变 5.4–5.10 已冻结业务语义。

---

# 7. Four Frozen Responsive Modes

严格遵守 1.29 的四档：

```text
Wide Desktop                  >= 1280px
Compact Desktop / Landscape   1024–1279px
Tablet Portrait               768–1023px
Mobile                        < 768px
```

不能用一套简单的 `desktop / mobile` 两档替代。

---

# 8. Wide Desktop >=1280

保持当前 Full Sidebar：

```text
Logo
Avatar / Name
我的首页
我的旅行
旅行偏好
同行人
账户
Sidebar artwork
```

要求：

- Sidebar 宽度稳定；
- Content 最大宽度合理，不在超宽屏无限拉伸；
- Content 与 Sidebar 不产生冲突滚动；
- 页面切换不造成明显布局跳动；
- 当前项 selected state 清晰；
- 已验收视觉不重新设计。

---

# 9. Compact Desktop 1024–1279

当前 develop 已有约 88px Compact Rail，继续保留。

5.20 必须补齐设计要求：

## 9.1 Visual Tooltip

Rail 只显示图标时，每一个主导航项必须在：

```text
Hover
Focus
```

时显示可见 Tooltip：

```text
我的首页
我的旅行
旅行偏好
同行人
账户
```

要求：

- Tooltip 不是只靠 `title`；
- keyboard focus 也必须出现；
- 不遮挡目标本身；
- 不造成 document horizontal overflow；
- screen reader 原有 label 保留。

Touch 设备不得依赖 Hover 才能理解功能。

## 9.2 Rail QA

验证：

- 图标居中；
- active state 清晰；
- Logo 可用；
- Avatar 可用；
- Tooltip 不被 overflow 裁掉；
- 页面内容不被 Rail 覆盖。

---

# 10. Tablet Portrait 768–1023

冻结结构：

```text
Top Bar
+
Left Drawer
+
Main Content
```

当前 develop 已有 Drawer / Backdrop / Esc / Focus Return 基础。

5.20 必须补齐完整交互：

## 10.1 Focus Trap

Drawer 打开时：

- 初始焦点进入 Drawer 的第一个合理交互项；
- Tab / Shift+Tab 不得逃出 Drawer；
- Esc 关闭；
- 点击遮罩关闭；
- 关闭后焦点返回 Menu Trigger。

## 10.2 Scroll Lock

Drawer 打开时：

- 背景内容不能继续滚动；
- Drawer 自身内容仍可滚动；
- 关闭后恢复滚动状态。

## 10.3 Width

Drawer：

```text
70–80vw
max-width: 360px
```

不得占满 Tablet 整屏。

---

# 11. Mobile <768

冻结结构：

```text
Mobile Top Bar
+
Page Content
+
5-item Bottom Navigation
```

Bottom Navigation 严格五项：

```text
首页
旅行
偏好
同行人
账户
```

禁止加入：

```text
更多
AI
Booking
```

要求：

- icon + text 同时存在；
- 每项 touch target >= 44×44；
- safe-area 正确；
- selected state 不只靠颜色；
- Content bottom padding 不被 Bottom Nav 覆盖；
- Avatar / Notification / Logo 保持可访问；
- 不出现 document horizontal overflow。

---

# 12. Content / Card Responsive Closeout

对当前已实现页面逐页检查：

```text
/personal-center
/personal-center/trips
/personal-center/preferences
/personal-center/preferences/mobility
/personal-center/preferences/attractions
/personal-center/preferences/dining
/personal-center/preferences/accommodation
/personal-center/preferences/budget
/personal-center/preferences/experience
/personal-center/preferences/advanced
/personal-center/companions
/personal-center/account
/personal-center/account/security
/personal-center/account/privacy
/personal-center/account/booking-sync
```

要求：

- Desktop 可使用 3 / 2 列；
- Tablet 合理降为 2 / 1 列；
- Mobile 主业务卡单列；
- 不通过把正文字体压到不可读来保留 Desktop 排版；
- Mobile form input font-size >= 16px；
- Horizontal Tabs / Filter 允许自身横向滚动，但禁止 document 横向滚动；
- Status Chip 可换行；
- Button 不使用无法容纳英文长文本的固定宽度。

---

# 13. Shared Page State Model

实现一个轻量、B-owned、纯展示的 Personal Center 状态层。

统一概念：

```text
Page State
- Loading
- Ready
- Empty
- Error
- Offline
- Auth Expired presentation
- Permission unavailable presentation

Module State
- Loading
- Partial Error
- Empty
- Stale / Sync pending presentation

Action State
- Idle
- Submitting
- Success
- Error
- Disabled
```

注意：

这些是 UI presentation contracts，不是 Auth / Network / API 业务状态机。

---

# 14. Recommended Shared State Components

建议在：

```text
src/features/personal-center/states/
```

建立最小组件，例如：

```text
personal-page-skeleton.tsx
personal-empty-state.tsx
personal-error-state.tsx
personal-module-state.tsx
personal-offline-banner.tsx
personal-state.module.css
```

可根据现有架构调整文件名。

禁止创建复杂全局状态管理器。

禁止新增第三方 UI / animation library。

---

# 15. Route-level Loading

在 Personal Center segment 提供正式 Loading UI。

优先方案：

```text
src/app/(account)/personal-center/loading.tsx
```

要求：

```text
Shell 立即存在
Content 区显示 Skeleton
```

不能整页只放一个中央 Spinner。

如果 Next.js segment 行为导致 Shell 无法保持，采用最小架构调整确保：

- Sidebar / Top Bar / Bottom Nav 不消失；
- Content 使用 skeleton；
- 不建立第二套 Shell。

---

# 16. Skeleton

Skeleton 必须模仿真实布局。

至少提供可复用类型：

```text
Page header skeleton
Card grid skeleton
Form / settings skeleton
Trip card skeleton
Preference radar-like placeholder
```

规则：

- Skeleton 不显示假数据文字；
- 列表通常 3–6 个 placeholder；
- Preference Radar 使用圆形 / 多边形视觉占位，不用 6 个随意矩形；
- 不无限铺满长页面；
- `prefers-reduced-motion: reduce` 时关闭 shimmer 或使用静态 skeleton。

---

# 17. Route-level Error

为当前 Personal Center segment 提供可恢复的 Error UI。

优先：

```text
src/app/(account)/personal-center/error.tsx
```

文案遵循：

```text
暂时无法加载这个页面
您的数据没有丢失。

[重新加载]
[返回个人中心]
```

要求：

- 使用 Error Boundary 的 `reset()`；
- 返回 `/personal-center`；
- 不使用整屏大红；
- Brand Coral 与 Danger Red 分开；
- 不输出 stack / internal exception 给用户；
- console logging 若项目已有日志规范则复用，不新增 logging framework。

---

# 18. Module Error

实现可复用局部错误卡。

语义：

```text
某模块暂时不可用
其他页面内容不受影响
[重试]
```

必须保证：

> 一个局部 Provider / Module 错误不能自动升级为整页 Error。

当前没有真实 Provider 时，只实现 presentation component + tests，不伪造 Provider 请求。

---

# 19. Empty State

统一结构：

```text
small icon / lightweight decoration
Title
1–2 line description
Primary CTA if actionable
Secondary Action optional
```

不得使用巨大插画占满屏。

对已经有业务 Empty State 的页面：

- 保留冻结文案与业务动作；
- 只允许统一 layout / spacing / accessibility；
- 不重写业务规则。

至少 QA：

```text
Trip Library Empty
Companions Empty
Preferences default/partial semantics
Account partial empty sections
```

---

# 20. Offline Banner

实现 presentation-only Offline Banner：

```text
当前处于离线状态
部分信息可能不是最新内容。
```

边界：

- 不清空当前内容；
- 不实现 offline-first cache；
- 不声称数据已缓存；
- 不新增 Service Worker；
- 不新增 PWA；
- 不新增本地持久化。

如果当前应用没有正式网络状态来源：

```text
组件只接受 explicit prop / test harness state
```

Result 写：

```text
Automatic offline detection: deferred
Offline-first storage: not implemented
```

---

# 21. Auth Expired Presentation

冻结文案语义：

```text
登录状态已过期
为了保护您的账户，请重新登录。

[重新登录]
```

但当前：

```text
WBS 5.3 / 8.3 Auth 尚未完成
```

因此本 Task 只允许：

- reusable presentation state；
- accessibility；
- tests。

禁止：

- 假登录；
- 假 Session；
- 假 redirect callback；
- 修改 Auth 数据层。

Result：

```text
Real Auth Expiry integration: deferred to 5.3 / 8.3
```

---

# 22. Permission / Provider Presentation

允许 reusable presentation component：

```text
权限暂时不可用
```

或 Provider Authorization presentation。

但当前没有真实 Provider Contract 时：

- 不发真实授权请求；
- 不实现 Booking re-auth；
- 不接 Partner API。

Provider 局部失败必须保持 module-level。

---

# 23. Success / Action Feedback Boundary

1.29 规定普通成功反馈采用：

```text
✓ 已保存
```

或轻量 Toast / Inline。

5.20 只统一已有页面的 presentation / placement / accessible live region。

禁止为了统一状态而改变页面已完成的 save logic。

Toast：

```text
Desktop → 内容区右上
Mobile  → Bottom Nav 上方
```

如果当前没有统一 Toast 且引入会造成大范围业务重构，则：

- 只创建 minimal presentation primitive；
- 不强制迁移所有页面。

---

# 24. Unsaved Changes

Profile / Preferences / Companions 已经存在 Navigation Guard。

5.20 负责 QA：

```text
Desktop navigation
Tablet Drawer navigation
Mobile Bottom Navigation
Browser back
Avatar Popover
Logo navigation
```

都不能绕过已有 Guard。

不得重写 Navigation Guard 业务语义。

如发现响应式模式绕过 Guard，只做最小修复。

---

# 25. Tablet Drawer Accessibility Closeout

当前 Drawer 已有 Escape 和 Focus Return，5.20 重点补齐：

```text
Focus Trap
Initial Focus
Body Scroll Lock
aria-modal / dialog-equivalent semantics as appropriate
```

注意：

- 不必强制改成 `<dialog>`；
- 可保留现有 DOM，只要行为和可访问性满足规范；
- Mobile <768 不显示该 Drawer，仍用 Bottom Navigation。

---

# 26. Touch / Hover Conversion

审计当前 UI 中：

```text
?
Tooltip
Hover-only information
Icon-only control
```

规则：

- Desktop Hover 信息必须可通过 Focus 获取；
- Touch 不能依赖 Hover；
- 必要时 Tap → Popover / Sheet；
- 不允许手机用户无法读取说明。

特别 QA：

```text
Preference Radar / help affordance
Compact Rail tooltip
Avatar Popover
Trip Library menus
```

---

# 27. Reduced Motion

`prefers-reduced-motion: reduce` 下：

- Skeleton shimmer 关闭；
- Drawer transition 关闭或极短；
- Card hover motion 不影响理解；
- Radar motion 如存在必须关闭；
- 状态含义不依赖动画。

不得引入新的 motion library。

---

# 28. Text Expansion / Language Robustness

虽然当前中文优先，必须人工 / browser QA 至少模拟：

```text
英文长 30–50%
日文常规长度
```

至少检查：

```text
Primary Nav
Page Header
Buttons
Status Chips
Preference selectors
Trip Library toolbar
Dialogs / Drawers
```

要求：

- 不截断关键业务文字；
- 按钮避免固定像素宽度；
- chip 可换行；
- 不把业务文字写死进图片。

不要求本 Task 实现 i18n framework。

---

# 29. Touch Target

所有 Mobile / Touch 主要交互目标：

```text
>= 44×44px
```

包括：

```text
Bottom Nav
Top Bar actions
Icon-only buttons
Checkbox / Radio / Segmented controls
Drawer close / trigger
Trip menu
Preference controls
```

Checkbox / Radio 点击区域应包含文字 label。

---

# 30. Mobile Sticky Action

已有编辑页面如果使用 Sticky Action：

- 不得覆盖 Bottom Nav；
- 页面底部 padding 必须足够；
- 高风险 / 编辑流程可临时隐藏 Bottom Nav，但仅在对应已冻结页面行为允许时。

5.20 不主动给所有页面新增 Sticky Action。

---

# 31. Existing Business Pages — Regression Freeze

以下页面业务必须完全保持：

```text
5.4 Account
5.5 Preference Overview
5.6 Companions
5.7 Mobility
5.8 Attractions
5.9 Dining / Accommodation / Budget
5.10 Trip Library
```

5.20 可以：

- 修改 CSS / layout；
- 复用 shared state primitive；
- 修复 accessibility；
- 修复 breakpoint overflow；
- 修复 focus / keyboard；
- 统一 state presentation。

5.20 不可以：

- 改字段；
- 改业务枚举；
- 改 fixture 业务含义；
- 改 Save / Delete / Reset 语义；
- 改 Preference 规则；
- 改 Companion 规则；
- 改 Trip Library 过滤 / 复制 / 删除业务规则。

---

# 32. Explicit Deferred Pages

1.29 的完整状态矩阵还包含：

```text
Auth
Reservation Hub
完整 Security / Data / Privacy / Booking Sync
```

其中未实现的业务能力不能由 5.20 伪造。

5.20 对它们只做：

- shared state primitive readiness；
- 已存在的 minimal account subroute responsive regression。

Result 明确列出 deferred integration。

---

# 33. Recommended Files

建议新增：

```text
src/features/personal-center/states/**
src/app/(account)/personal-center/loading.tsx
src/app/(account)/personal-center/error.tsx
```

可能需要最小修改：

```text
src/features/personal-center/components/personal-sidebar.tsx
src/features/personal-center/components/personal-primary-nav.tsx
src/features/personal-center/personal-center.module.css
```

如果页面有明确 5.20 responsive bug，可最小修改其对应 CSS module。

禁止为“统一风格”把所有页面文件大规模重写。

---

# 34. Files To Avoid

默认禁止：

```text
src/features/planner/**
src/features/map/**
src/features/start-flow/**
src/app/planner/**
src/app/start/**
src/db/**
src/server/**
package.json
package-lock.json
.github/workflows/**
```

也禁止修改：

```text
Preference / Companion / Trip business model
```

除非只是明确、可证明的类型无关 presentation adjustment；若需要改业务模型，停止并报告越界依赖。

---

# 35. Unit Tests

至少覆盖：

1. 四个冻结 breakpoint 常量 / CSS 约束存在；
2. Primary Nav 严格五项；
3. Compact Rail 每项有可见 Hover/Focus tooltip affordance；
4. Tablet Drawer Escape；
5. Tablet Drawer Focus Trap helper；
6. Tablet Drawer Focus Return；
7. Tablet Drawer scroll lock；
8. Mobile Bottom Nav 五项；
9. State model presentation variants；
10. Empty State CTA optional semantics；
11. Page Error 有 retry + return；
12. Offline banner 不清空内容；
13. Auth-expired 仅 presentation，不产生 session；
14. Module Error 不升级 page error；
15. Skeleton 无 fake business text；
16. Reduced Motion class / media query；
17. Touch target constraints；
18. Navigation Guard 在 responsive nav 下仍被调用；
19. 5.4–5.10 业务模型文件未被修改；
20. no API / DB / localStorage / Cookie added。

不要引入新测试框架。

---

# 36. Browser QA Matrix

必须测试以下视口：

```text
1920×1080
1440×900
1280×720
1279×800
1024×768
1023×768
768×1024
767×900
390×844
320×740
```

边界尺寸必须覆盖，因为本 Task 就是响应式收尾。

重点验证断点两侧：

```text
1280 / 1279
1024 / 1023
768 / 767
```

---

# 37. Browser QA — Core Routes

每个核心页面至少做 Desktop / Tablet / Mobile smoke：

```text
/personal-center
/personal-center/trips
/personal-center/preferences
/personal-center/companions
/personal-center/account
```

详细偏好回归：

```text
/preferences/mobility
/preferences/attractions
/preferences/dining
/preferences/accommodation
/preferences/budget
/preferences/experience
/preferences/advanced
```

Account subroute smoke：

```text
/account/security
/account/privacy
/account/booking-sync
```

---

# 38. Browser QA — Required Interactions

必须实测：

## Compact Rail

- Hover tooltip；
- Keyboard focus tooltip；
- active state；
- navigation。

## Tablet Drawer

- open；
- Tab wrap；
- Shift+Tab wrap；
- Esc；
- backdrop close；
- focus return；
- background scroll lock；
- navigation guard。

## Mobile

- 5 bottom nav；
- top actions；
- safe area；
- no overlap；
- no page horizontal overflow；
- dirty guard on bottom nav。

## States

使用 deterministic test harness / component test 验证：

- Loading Skeleton；
- Empty；
- Page Error；
- Module Error；
- Offline Banner；
- Auth-expired presentation；
- Permission presentation。

不要通过修改真实生产数据或联网故障来制造测试状态。

---

# 39. State Testing Harness Boundary

如果需要让 browser QA 可稳定查看状态：

优先：

```text
测试组件挂载
Node / DOM test fixture
Playwright/现有 browser harness 内部注入
```

不要在生产路由长期增加：

```text
?debug=error
?fakeOffline=true
?mockAuthExpired=1
```

如果确实必须临时加 QA hook：

- 必须仅 test / development guard；
- production build 不可暴露；
- Result 记录并证明生产不可访问。

---

# 40. Console / Network QA

要求：

- 无 hydration error；
- 无 React warning；
- 无 blocking console error；
- 无新增 404；
- 图片无 decode error；
- 状态组件不发网络请求；
- 不新增 POST / PUT / PATCH / DELETE；
- 不新增 localStorage / Cookie；
- 不新增 Service Worker。

---

# 41. Validation Commands

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

若全仓 Prettier 仍有历史 baseline：

- 精确记录；
- 不越界修改；
- 当前 5.20 owned files targeted format 必须 Passed。

---

# 42. Git Safety

提交前：

```bash
git status
git diff --name-only
git diff --check
```

禁止：

```text
git add .
git clean -fd
git reset --hard
force push
```

精确 stage 5.20 文件。

建议：

```bash
git commit -m "feat(WBS-5.20-B): close personal center responsive states"
```

---

# 43. Push / PR

Push：

```bash
git push -u origin feature/b-account-wbs-5-20-personal-center-responsive-states
```

PR 标题：

```text
feat(WBS-5.20-B): close personal center responsive states
```

Base：

```text
develop
```

Issue：

```text
#146
```

仓库存在 branch push 自动创建 / 自动合并历史行为。

不得：

- 修改 workflow；
- 主动开启 auto-merge。

若自动合并但用户未验收：

```text
WBS 5.20 = 待审查
Task = 待审查
Issue #146 = Open
```

---

# 44. Status Rules

开始：

```text
WBS 5.20 = 进行中
Task = 进行中
Issue #146 = Open
```

代码完成 / 自动合入但用户未验收：

```text
WBS 5.20 = 待审查
Task = 待审查
Issue #146 = Open
```

只有：

```text
代码进入 develop
+
用户验收通过
```

才允许：

```text
WBS 5.20 = 已完成
Task = 已完成
Issue #146 = Closed
```

---

# 45. Acceptance Checklist

- [ ] latest develop synced
- [ ] 1.29 = 已完成
- [ ] 5.1 = 已完成
- [ ] no duplicate full WBS-5.20 implementation
- [ ] four breakpoint modes preserved
- [ ] 1280 / 1279 boundary passed
- [ ] 1024 / 1023 boundary passed
- [ ] 768 / 767 boundary passed
- [ ] Compact Rail visible Hover/Focus tooltip
- [ ] Tablet Drawer focus trap
- [ ] Tablet Drawer focus return
- [ ] Tablet Drawer scroll lock
- [ ] Mobile 5-item bottom nav
- [ ] Mobile safe area / no overlap
- [ ] route-level Loading skeleton
- [ ] route-level recoverable Error UI
- [ ] reusable Empty state
- [ ] reusable Module Error
- [ ] Offline presentation
- [ ] Auth-expired presentation only
- [ ] Permission presentation only
- [ ] Reduced Motion respected
- [ ] touch targets >=44px
- [ ] no document horizontal overflow
- [ ] text expansion sanity
- [ ] existing unsaved guard works in all responsive nav modes
- [ ] 5.4–5.10 business logic unchanged
- [ ] no Auth / API / DB / persistence
- [ ] no Service Worker / PWA
- [ ] no package/dependency changes
- [ ] Task / Issue / WBS / PR synchronized

---

# 46. Required Final Result

创建：

```text
docs/tasks/RESULT-WBS-5.20-b-personal-center-responsive-states.md
```

返回：

```md
# WBS-5.20-B Result

## Status

## Preflight

- origin/develop base:
- dependency 1.29:
- dependency 5.1:
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
- Merge Commit:
- WBS updated:

## Responsive Shell

- > =1280 full sidebar:
- 1024–1279 compact rail:
- rail tooltip hover:
- rail tooltip focus:
- 768–1023 drawer:
- drawer focus trap:
- drawer scroll lock:
- drawer focus return:
- <768 mobile top bar:
- five-item bottom nav:
- safe area:

## Shared States

- Page Loading:
- Skeleton:
- Empty:
- Page Error:
- Module Error:
- Offline presentation:
- Auth Expired presentation:
- Permission presentation:
- Action feedback:

## State Boundary

- Real Auth integration:
- Automatic offline detection:
- Offline-first storage:
- API / DB:
- localStorage / Cookie:
- Service Worker:

## Accessibility

- keyboard:
- focus-visible:
- drawer focus trap:
- touch target:
- reduced motion:
- hover-to-touch conversion:
- live feedback:

## Responsive QA

- 1920×1080:
- 1440×900:
- 1280×720:
- 1279×800:
- 1024×768:
- 1023×768:
- 768×1024:
- 767×900:
- 390×844:
- 320×740:
- horizontal overflow:

## Route Regression

- Personal Home:
- Trips:
- Preferences Overview:
- Mobility:
- Attractions:
- Dining:
- Accommodation:
- Budget:
- Companions:
- Account:
- Account subroutes:
- Avatar Popover:
- Navigation Guard:

## Business Freeze

- 5.4 behavior changed:
- 5.5 behavior changed:
- 5.6 behavior changed:
- 5.7 behavior changed:
- 5.8 behavior changed:
- 5.9 behavior changed:
- 5.10 behavior changed:

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
- Planner / Start modified:
- Auth Core implemented:
- API / DB added:
- package/dependencies modified:
- workflow modified:

## Git

- Commit:
- Push:
- PR:
- Merge behavior:
- latest origin/develop:
- unpushed commits:
- tracked working tree:
- preserved untracked files:

## Problems

-

## Deferred

- Real Auth expiry integration:
- Provider authorization integration:
- Offline-first data strategy:
- Reservation Hub state integration:

## Next

Stop. Do not automatically start another WBS.
```

---

# 47. Stop Rule

完成后停止。

禁止自动：

- 开始其他 WBS；
- 实现 Auth；
- 接 DB / API；
- 接 Reservation Hub；
- 修改 Planner / Start；
- 实现 Native App；
- 用户验收前关闭 Issue #146；
- 用户验收前把 WBS 5.20 标记为已完成。
