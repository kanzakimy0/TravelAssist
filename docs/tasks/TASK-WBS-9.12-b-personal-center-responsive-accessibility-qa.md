# TASK-WBS-9.12-B — Personal Center Responsive / Accessibility QA

> Issue: #181  
> WBS: 9.12 — B 模块响应式 / 可访问性 QA  
> Owner: B  
> Responsibility: Personal Center / Quality / Accessibility  
> Priority: P2  
> Dependency: WBS 5.20 = 已完成  
> Status at authoring: 可开始  
> Repository: https://github.com/kanzakimy0/TravelAssist  
> Authoring base: `develop@99f3ddb7d6bad0c5d1bf0937b310be6acc7bb031`  
> Task docs branch: `docs/b-wbs-9-12-personal-center-qa-task`  
> Planned implementation branch: `fix/b-account-wbs-9-12-responsive-accessibility-qa`  
> Result file: `docs/tasks/RESULT-TASK-WBS-9.12-b-personal-center-responsive-accessibility-qa.md`

---

# 1. Objective

对已经完成并合入 `develop` 的 TravelAssist Personal Center 做一次**独立的响应式 / 可访问性 QA 与必要修复**。

本 Task 不是重新实现 WBS 5.20，也不是重做 Personal Center 视觉，而是：

```text
已验收 Personal Center
↓
多尺寸 / 键盘 / 焦点 / 触控 / Zoom / Reduced Motion / ARIA / 状态回归
↓
发现 B-owned 问题
↓
最小修复
↓
专项自动化 + 浏览器证据
↓
待审查
```

本 Task 必须回答：

1. Personal Center 在四档响应式模式下是否稳定；
2. 是否存在 document 横向溢出、遮挡、裁切、不可点击等问题；
3. 键盘用户是否可以完成主要导航和交互；
4. Drawer / Dialog / Popover 的焦点、Escape、Focus Return 是否正确；
5. Mobile 触控目标、Bottom Navigation 与 safe-area 是否正确；
6. Loading / Empty / Error / Live Feedback 是否具有正确的可访问语义；
7. 200% Zoom / 文字放大时是否仍可操作；
8. `prefers-reduced-motion` 下是否停止非必要动画；
9. 现有 B-owned 页面是否发生响应式或可访问性回归；
10. 历史延后的 Firefox / WebKit / Safari 相关项，当前环境实际能验证到什么程度。

---

# 2. Hard Dependency Gate

Master WBS 当前依赖：

```text
9.12 → 5.20
```

执行前必须确认：

```text
5.20 = 已完成
```

如果最新 `origin/develop` 中 5.20 不再为已完成，停止执行并返回 `Blocked`。

以下不是本 Task 的依赖，不得等待它们：

```text
8.1 DB Foundation
8.2 User / Profile Schema
8.3 Authentication Core
5.11 Preference Schema
5.12 Companion Schema
5.16 Preference API
```

9.12 可以在当前 Mock / UI presentation 基线上独立完成。

---

# 3. Source of Truth

开始前必须完整读取最新 `origin/develop` 的：

```text
docs/project/WBS-TravelAssist.md

docs/ui/personal-center-design-freeze-v1.md
docs/ui/personal-center-responsive-states.md
docs/ui/personal-center.md
docs/ui/personal-center-shell.md
docs/ui/profile-account.md
docs/ui/preference-center.md
docs/ui/companion-management.md
docs/ui/trip-library.md
docs/ui/account-security-data-privacy.md
docs/ui/navigation-flow.md
docs/ui/help-icons.md

docs/tasks/TASK-WBS-5.20-b-personal-center-responsive-states.md
docs/tasks/RESULT-WBS-5.20-b-personal-center-responsive-states.md
```

同时只读检查当前实现：

```text
src/app/(account)/personal-center/**
src/features/personal-center/**
src/features/profile/**
src/features/preferences/**
src/features/companions/**
src/features/trip-library/**
src/components/ui/**
tests/**
```

设计/行为优先级：

```text
用户最新已确认决定
>
Personal Center Design Freeze / 1.29
>
WBS 5.20 已验收结果
>
已完成的 5.4–5.10 业务语义
>
当前 origin/develop
>
Codex 自行推导
```

---

# 4. Preflight — 必须执行

Workspace 以当前 B 工作站为准；若实际仓库路径不同，先进入真实 TravelAssist 仓库根目录。

```bash
git status --short --untracked-files=all
git branch --show-current
git remote -v
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

然后检查重复任务：

```bash
gh issue list --state all --search "9.12 Personal Center Responsive Accessibility" --limit 30
gh pr list --state all --search "9.12 Personal Center Responsive Accessibility" --limit 30
git branch -a
```

正式 Issue 必须复用：

```text
#181
```

Task 定义从远端任务分支读取，不依赖聊天摘要：

```bash
git show origin/docs/b-wbs-9-12-personal-center-qa-task:docs/tasks/TASK-WBS-9.12-b-personal-center-responsive-accessibility-qa.md
```

Codex 命令文件：

```bash
git show origin/docs/b-wbs-9-12-personal-center-qa-task:docs/tasks/CODEX-TASK-WBS-9.12-b-personal-center-responsive-accessibility-qa-command.md
```

---

# 5. Git Safety — 强制

禁止执行：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

不得覆盖用户未提交文件。

如果 working tree 有与本 Task 无关的修改：

- 保留；
- 不格式化；
- 不删除；
- 在 Result 中明确记录。

---

# 6. Implementation Branch

必须从**执行时最新 `origin/develop`**创建新分支，而不是从 5.20 历史分支或 1.12/1.13 设计分支开发。

```bash
git switch develop
git pull --ff-only origin develop
git status --short --untracked-files=all
git rev-parse HEAD
git switch -c fix/b-account-wbs-9-12-responsive-accessibility-qa
```

如果远端已经存在同名 9.12 正式实现分支：

- 先检查 Issue / PR / commit；
- 若确认属于本 Task，则复用；
- 不创建第二套实现。

---

# 7. Start Tracking

Codex 真正开始执行后，第一阶段必须更新：

```text
WBS 9.12 = 进行中
Issue #181 = Open
Task = 进行中
```

Master WBS 必须在执行分支中同步。

只允许更新：

- WBS 9.12；
- `TASK-WBS-9.12-B` 自己的 Tracking；
- 当前 Result；
- 本 Task 必需的 B-owned QA / runtime 文件。

不得覆盖其他 Task 历史记录。

---

# 8. Hard Ownership Boundary

本 Task 属于 B Personal Center。

允许修改：

```text
src/app/(account)/personal-center/**
src/features/personal-center/**
src/features/profile/**
src/features/preferences/**
src/features/companions/**
src/features/trip-library/**

与上述 B 模块直接关联的共享 UI 小修
tests/wbs-9-12-*
docs/tasks/RESULT-TASK-WBS-9.12-*
docs/project/WBS-TravelAssist.md（仅本 Task tracking）
```

共享 UI 若被 A / 主系统同时使用：

- 先确认改动不会改变主系统行为；
- 能在 B 模块本地修复就不要改 Shared；
- 必须在 Result 中列出共享影响。

禁止修改：

```text
src/features/planner/**
src/features/home/**
src/features/start-flow/**
src/lib/maps/**
src/lib/routing/**
src/lib/ai/**
supabase/**
数据库业务 Schema
Auth Core
Provider / Booking / Payment
A-owned Task 文件
```

---

# 9. Business Freeze

以下已验收业务语义必须保持：

```text
5.4 Profile / Account UI
5.5 Preference Center
5.6 Companions
5.7 Mobility Preference
5.8 Attraction / Activity Preference
5.9 Dining / Accommodation / Budget
5.10 Trip Library
5.20 Loading / Empty / Error / Responsive Presentation
```

9.12 允许：

- 修 overflow；
- 修 focus；
- 修 ARIA；
- 修 keyboard；
- 修触控；
- 修响应式断点回归；
- 修文本裁切；
- 修状态组件的 accessibility；
- 修明显的 B-owned visual regression。

9.12 禁止：

- 改偏好项目；
- 改业务文案含义；
- 改保存/历史逻辑；
- 实现真实 Auth / API / DB；
- 重做页面视觉；
- 改 Planner；
- 引入新产品功能。

---

# 10. Mandatory Route Matrix

至少检查以下路由：

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
/personal-center/account/privacy/delete
/personal-center/account/booking-sync
```

如果最新代码新增了 B-owned Personal Center 路由，自动纳入 QA。

---

# 11. Responsive Modes — 冻结四档

必须保持 WBS 5.20 / 1.29 现有四档：

```text
Wide Desktop                  >= 1280px
Compact Desktop / Landscape   1024–1279px
Tablet Portrait               768–1023px
Mobile                        < 768px
```

不允许为了 QA 重构成另一套断点模型。

---

# 12. Mandatory Viewport Matrix

至少验证：

```text
1920 × 1080
1440 × 900
1280 × 720
1279 × 800
1024 × 768
1023 × 768
768 × 1024
767 × 900
430 × 932
390 × 844
375 × 812
320 × 740
```

每个尺寸至少检查：

- document 无横向 overflow；
- 页面主内容可访问；
- 固定导航不遮挡内容；
- 当前导航状态可识别；
- Header / Avatar / actions 不重叠；
- Card / Form / Tab 不裁切；
- 长文本不导致布局断裂；
- 主要交互目标在 viewport 内可用。

---

# 13. Wide Desktop QA

`>=1280px`：

- Full Sidebar 保持；
- Logo / Avatar / Name / 五主导航可读；
- Sidebar 不与 Content 冲突滚动；
- Content 不无限拉宽；
- 大尺寸下卡片不会异常拉伸；
- Focus ring 不被裁切；
- 页面滚动区域只有设计允许的区域；
- 无 document horizontal overflow。

---

# 14. Compact Desktop QA

`1024–1279px`：

- Compact Rail 保持；
- 每个主导航 icon 都有真实 accessible name；
- Hover Tooltip 显示；
- Keyboard Focus Tooltip 同样显示；
- Tooltip 不依赖 HTML `title`；
- Tooltip 不被 `overflow:hidden` 裁切；
- active state 不只靠颜色；
- content 不被 rail 覆盖；
- 1024 / 1279 临界点没有布局跳变。

---

# 15. Tablet Drawer QA

`768–1023px`：

Drawer 必须验证：

```text
Menu Trigger
→ Drawer Open
→ Initial Focus
→ Tab / Shift+Tab Trap
→ Escape
→ Close
→ Focus Return
```

还必须：

- backdrop click 可关闭；
- drawer 打开时背景滚动锁定；
- drawer 自身可滚动；
- 关闭后恢复背景滚动；
- `aria-expanded` / `aria-controls` 等关系正确；
- 焦点不进入被遮挡页面；
- 其他 Dialog 打开时焦点管理不互相打架；
- Drawer 不占满 Tablet 整屏；
- 1023 / 768 两侧边界均验证。

---

# 16. Mobile QA

`<768px`：

冻结结构：

```text
Mobile Top Bar
+
Content
+
5-item Bottom Navigation
```

五项必须仍是：

```text
首页
旅行
偏好
同行人
账户
```

验证：

- icon + text 同时存在；
- selected state 不只靠颜色；
- 每个主要触控目标至少约 44×44 CSS px；
- bottom safe-area 不遮挡；
- 页面 bottom padding 足够；
- Top Bar / Avatar 可操作；
- 320px 宽不发生横向 overflow；
- Form 输入 font-size 不低于 16px，避免移动浏览器自动 zoom；
- 横向 Tab / Filter 若需要，可组件自身滚动，不能推动 document。

---

# 17. Keyboard Navigation

至少覆盖：

- 从页面顶部开始连续 Tab；
- Shift+Tab 反向；
- Skip Link；
- Sidebar / Rail / Drawer / Bottom Navigation；
- Account Avatar Popover；
- Preference form controls；
- Slider；
- Checkbox / Radio / Select；
- Dialog；
- destructive confirmation；
- Error / Retry actions；
- Navigation Guard；
- Escape；
- focus return。

禁止：

- 正 tab 顺序与视觉顺序明显矛盾；
- `tabindex > 0`；
- 只有鼠标 hover 才能完成的关键操作；
- 关闭浮层后焦点丢到 `body`；
- 隐藏内容仍可被 Tab 进入。

---

# 18. Focus Visible

所有关键交互必须有非颜色-only的 `:focus-visible`。

检查：

- Button；
- Link；
- Icon button；
- Avatar；
- Navigation；
- Tabs；
- Inputs；
- Select；
- Slider；
- Checkbox；
- Dialog close；
- Drawer close；
- Popover items。

Focus ring 必须：

- 可见；
- 不被 overflow 裁掉；
- 与背景有足够分离；
- 不依赖 hover。

---

# 19. Dialog / Popover / Menu

所有 B-owned Overlay：

## Dialog

- accessible name；
- 初始焦点合理；
- Tab trap；
- Escape；
- Close；
- focus return；
- 背景不可误操作。

## Account Popover

- trigger 有 accessible name；
- open state 语义正确；
- Escape 关闭；
- 点击外部关闭；
- 关闭后 focus 回 trigger；
- Mobile 不依赖 hover。

## Help / Tooltip

遵守 `docs/ui/help-icons.md`：

- Hover / Focus 可开；
- Touch 可用；
- Escape；
- 同时只开一个；
- 不覆盖主要操作；
- 不用 `title` 代替正式说明。

---

# 20. Semantic / ARIA QA

检查：

- 每页只有合理的 heading hierarchy；
- `main` / `nav` / `aside` 使用合理；
- 导航当前页使用 `aria-current`；
- Tabs 有正确 role / selected 关系；
- Inputs 有 label；
- 图标按钮有 accessible name；
- decorative image 不污染可访问树；
- avatar / content image 有合理 alt 策略；
- error 使用 `alert` 或等价；
- normal async feedback 使用 `status` / live region；
- skeleton 不向读屏重复输出大量无意义占位；
- disabled control 的原因在上下文可理解；
- `aria-*` 不引用不存在的 id。

不允许为了“通过测试”滥加 ARIA。

---

# 21. Loading / Empty / Error QA

复验 5.20 已建立的 presentation：

## Loading

- Shell 保持；
- Content Skeleton；
- 不整页 spinner；
- skeleton 不造成读屏噪音；
- reduced motion 下 shimmer 停止。

## Empty

- 文案表达真实空状态；
- action 有明确 label；
- Empty 不与 Error 混淆。

## Error

- 用户看不到 stack / internal exception；
- Retry 可操作；
- 返回 Personal Center 可操作；
- Danger 不成为整页大红；
- Keyboard 可完成恢复。

## Module Error

- 局部错误不升级成整页不可用；
- 其他模块仍可操作。

---

# 22. Reduced Motion

必须至少验证：

```text
prefers-reduced-motion: reduce
```

要求：

- Skeleton shimmer 停止或变静态；
- Drawer / Popover / Card 非必要动画关闭或近乎立即；
- 不影响焦点；
- 不影响内容显隐；
- 不用动画作为唯一状态信号。

---

# 23. Zoom / Text Scaling

至少验证 Desktop 和 Mobile 各一组：

```text
Browser Zoom 200%
```

若自动化环境无法真实控制 browser chrome zoom：

- 使用可说明的方法模拟 200% 有效 viewport / CSS pixel 缩放；
- 在 Result 明确记录方法；
- 不把“字体 style 放大”冒充真实浏览器 Zoom。

检查：

- 不丢功能；
- 不出现双向滚动陷阱；
- 文本不被固定高度裁掉；
- Buttons 可换行；
- Dialog 可滚动；
- Bottom Nav 仍可达；
- Label 与输入不重叠。

---

# 24. Text Expansion

对关键页面做至少一次约 150%–200% 文本扩展 QA。

可以使用浏览器临时样式 / 测试夹具，但不得把测试内容写进业务代码。

重点：

- English 较长标签；
- 中文长目的地名；
- 用户名；
- Status；
- Buttons；
- Tabs；
- Dialog title。

禁止靠固定宽度 + `overflow:hidden` 隐藏关键操作文字。

---

# 25. Contrast / Non-color Signals

本 Task 不需要重新设计全站 Token，但必须发现明显可访问性问题。

目标：

- 普通正文尽量满足 WCAG AA 4.5:1；
- 大文本 3:1；
- Focus / control boundary 等非文字关键视觉信息至少有足够辨识度；
- current / selected / error 不只靠颜色；
- 透明 Glass / 图片背景必须按真实渲染检查，不能只拿纯色 Token 计算冒充。

如果涉及 1.13 待审查 Token：

- 只作为设计参考；
- 未合入 / 未验收值不能被 9.12 强行全局实装。

---

# 26. Browser Matrix

## Mandatory

当前仓库已有浏览器 QA 脚本使用：

```text
CODEX_PLAYWRIGHT_PATH
+
playwright chromium
+
channel: msedge
```

9.12 应复用现有方式。

至少：

```text
Chromium / Microsoft Edge
```

必须执行。

## Firefox / WebKit

若当前 Codex 环境已经有可用的：

```text
Firefox
WebKit
```

则执行核心 Personal Center QA。

若没有：

- 不修改 package.json 为本 Task 安装大型 browser framework；
- 不下载浏览器只为了勾选；
- Result 写 `Deferred — runtime unavailable`；
- 不把 Safari / WebKit 写成 PASS。

## Safari

Windows / 非 Safari 环境不得声称 Safari 真机通过。

可以写：

```text
Safari real-device QA: Deferred
```

---

# 27. Browser QA Harness

优先新增或扩展：

```text
tests/wbs-9-12-personal-center-qa.browser.mjs
```

要求：

- 复用 `CODEX_PLAYWRIGHT_PATH`；
- 不把 Playwright 加入 repo dependencies；
- 能指定 `WBS_BASE_URL`；
- evidence 输出到：

```text
.next/qa/WBS-9.12-B/
```

至少自动检查：

- HTTP 200；
- console errors；
- page errors；
- >=400 responses（已知允许项必须明确过滤）；
- horizontal overflow；
- viewport matrix；
- nav mode；
- drawer keyboard；
- popover escape / focus return；
- dialog focus；
- touch target；
- reduced motion；
- 关键 ARIA / role；
- route regression。

截图可作为本地证据，不要求把大量 PNG 提交到 Git。

---

# 28. Automated Tests

建议新增：

```text
tests/wbs-9-12-personal-center-qa.test.mjs
tests/wbs-9-12-personal-center-qa.browser.mjs
```

可按实际结构调整，但必须有可重复的 9.12 专项验证。

禁止只靠“看起来正常”完成 Task。

---

# 29. Required Validation

必须执行：

```bash
node --version
npm --version
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present
```

注意：

当前 `package.json` 没有通用 `test` script。

如果：

```bash
npm test --if-present
```

没有实际运行测试，必须显式执行：

- 当前全仓 Node test suite；
- 9.12 新增专项 test；
- 9.12 browser QA。

不能把 no-op 写成 tests PASS。

同时：

```bash
npm run format:check
git diff --check
```

全仓 Prettier 若仍存在已知历史 baseline：

- 记录；
- 对比最新 develop；
- 本 Task 修改文件必须独立通过；
- 不借 9.12 格式化大量无关文件。

---

# 30. Runtime Server Discipline

浏览器 QA 时：

- 使用明确端口；
- 记录 base URL；
- 测试结束关闭 dev / production server；
- 不留下后台 Node server；
- Result 记录 server 是否正常停止。

建议优先：

```text
npm run build
npm run start -- -p <port>
```

如果现有 QA harness 使用 dev server，也可复用，但必须说明。

---

# 31. Fix Rule

发现问题时：

## 可以直接修

- 明确在 B-owned Personal Center；
- 不改变业务语义；
- 属于 9.12 响应式 / accessibility / QA；
- 最小改动。

## 不可直接修

如果问题属于：

- A 主系统；
- Auth；
- DB；
- API；
- Provider；
- 跨模块 Contract；
- Design Token 全局实装；
- 新产品功能；

则：

- 不越界修改；
- 在 Result 中列为 Handoff / Deferred；
- 指定建议 Owner / WBS。

---

# 32. Evidence Matrix

Result 至少逐项给出：

```text
Responsive
Keyboard
Focus
Drawer
Popover
Dialog
Touch
Zoom
Text expansion
Reduced motion
ARIA
Loading
Empty
Error
Live feedback
Route regression
Console
Network
Browser matrix
```

每项使用：

```text
PASS
FAIL
FIXED
DEFERRED
N/A
```

不得用模糊的“基本正常”。

---

# 33. Acceptance Criteria

必须全部满足：

- [ ] WBS 5.20 依赖确认已完成。
- [ ] 9.12 无重复正式 Task / Issue / implementation PR。
- [ ] 最新 `origin/develop` 为实现基线。
- [ ] 16 个以上 B-owned Personal Center 路由完成回归。
- [ ] 12 个指定 viewport 完成 QA。
- [ ] 四档 responsive mode 全部验证。
- [ ] 无新增 document 横向 overflow。
- [ ] Keyboard 正向 / 反向导航可用。
- [ ] Drawer focus trap / Escape / focus return 正确。
- [ ] Dialog / Popover focus 生命周期正确。
- [ ] Mobile 主要触控目标符合约 44×44 CSS px 目标。
- [ ] selected / warning / error 不只靠颜色。
- [ ] Loading / Empty / Error / Live Feedback 语义正确。
- [ ] reduced-motion 验证完成。
- [ ] 200% Zoom 或等价真实方法验证完成并记录方法。
- [ ] text expansion 验证完成。
- [ ] Chromium / Edge browser QA 真实完成。
- [ ] Firefox / WebKit / Safari 未验证项明确 Deferred，不虚报。
- [ ] lint 通过。
- [ ] typecheck 通过。
- [ ] build 通过。
- [ ] 全量现有 Node tests + 9.12 专项测试真实运行。
- [ ] 修改文件 format check 通过。
- [ ] `git diff --check` 通过。
- [ ] 无 A-owned runtime / Task 越界修改。
- [ ] 无 Auth / DB / API / Provider 功能偷跑。
- [ ] Result / WBS / Issue / PR tracking 同步。

---

# 34. Result File

必须创建：

```text
docs/tasks/RESULT-TASK-WBS-9.12-b-personal-center-responsive-accessibility-qa.md
```

至少包含：

```text
Status
Base / Branch / Commits
Issue / PR
Dependency Gate
Routes Tested
Viewport Matrix
Responsive Modes
Keyboard
Focus / Escape / Focus Return
Drawer
Popover / Dialog
Touch Targets
Zoom / Text Expansion
Reduced Motion
ARIA / Semantics
Loading / Empty / Error
Browser Matrix
Console / Network
Fixes Made
Tests
lint / typecheck / build
Format / diff-check
Ownership Safety
Deferred / Handoffs
WBS Update
Working Tree / Unpushed Commits
```

---

# 35. PR Rule

实现完成后创建 **Draft PR**：

```text
base: develop
head: fix/b-account-wbs-9-12-responsive-accessibility-qa
```

PR body 使用：

```text
Relates to #181
```

不要使用：

```text
Closes #181
Fixes #181
```

原因：

> Issue 必须在用户验收且合入 develop 后再关闭。

禁止开启自动合并。

---

# 36. WBS Status Rule

开始实际执行：

```text
9.12 → 进行中
```

发现真实阻塞：

```text
9.12 → 阻塞
```

实现 / QA 完成，等待 Review：

```text
9.12 → 待审查
```

只有：

```text
PR 合入 develop
+
用户验收通过
```

才允许：

```text
9.12 → 已完成
```

Codex 返回 Final Result 前必须更新 Master WBS。

---

# 37. Completion Stop

完成 9.12 后停止。

禁止自动开始：

```text
5.11
5.12
8.2
8.3
5.3
5.16
5.17
9.5
9.6
```

即使执行过程中发现这些 Task 已解锁，也必须等待用户下一条指令。
