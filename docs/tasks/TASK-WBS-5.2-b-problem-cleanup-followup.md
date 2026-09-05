# WBS-5.2-B Follow-up — Problems Cleanup & Ownership Handoff

## Metadata

- **Task ID:** `WBS-5.2-B-FOLLOWUP`
- **Parent WBS:** `5.2 — 头像菜单与个人中心跳转目标`
- **Parent Task:** `WBS-5.2-B`
- **Owner:** `B`
- **Type:** Completed-task follow-up / baseline cleanup
- **Parent WBS Status:** 保持 `已完成`，不得重新打开 5.2
- **Repository:** `https://github.com/kanzakimy0/TravelAssist.git`
- **Workspace:** `F:\TravelAssist`
- **Base Branch:** `develop`
- **Execution Branch:** `fix/b-wbs-5-2-problem-cleanup`
- **Task File:** `docs/tasks/TASK-WBS-5.2-b-problem-cleanup-followup.md`
- **Handoff Record:** `docs/project/WBS-5.2-PROBLEM-HANDOFF.md`
- **Issue:** [#56](https://github.com/kanzakimy0/TravelAssist/issues/56)
- **Status:** 待验收
- **Base Commit:** `96a88297196cced771f7e3bb753ade4f17f96d05`
- **Commit:** PENDING
- **Pull Request:** PENDING

---

# 1. 任务目的

清理 WBS 5.2 完成记录中真正属于 B、且当前可以安全解决的 Problems，同时把 A/全局工程或后续正式 WBS 才能解决的事项转换成明确 handoff。

原则：

```text
B 可安全解决的 → 本 Task 直接修复
A / 全局工程负责的 → 不越权修改，形成明确 Handoff
未来 WBS 本来就负责的 → Deferred by design，不伪装成缺陷
```

WBS 5.2 始终保持 `已完成`。

---

# 2. Problems 来源

读取：

`docs/tasks/TASK-WBS-5.2-b-avatar-menu-navigation.md`

当前记录的问题：

1. 全仓 Prettier / `format:check` 存在 8 个上游文档例外。
2. `unrs-resolver@1.12.2` install script 尚未列入 npm allowScripts。
3. `/favicon.ico` 404。
4. 只完成 Edge 实测，未完成 Safari / Firefox 真机验收。
5. 真实 Logout 尚未实现。
6. A Main Header 接线尚未实现。

---

# 3. Preflight

```bash
git status
git fetch --all --prune
git checkout develop
git pull --ff-only origin develop
git log -1 --oneline
```

要求：

- working tree clean
- 使用执行时最新 `origin/develop`
- 不从旧 WBS 5.2 分支继续
- 记录实际 Base Commit
- 检查最新 A/B Task、Issue、PR，确认无等价 cleanup 正在执行

如存在重叠任务：

```text
Status: Blocked
Reason: overlapping problem-cleanup task already exists
```

---

# 4. Problem A — B-owned Prettier Baseline

WBS 5.2 最终记录中的 8 个 baseline 文件：

```text
docs/project/WBS-5.1-PERSONAL-CENTER-ASSET-AUDIT.md
docs/project/WBS-5.1-VISUAL-READINESS-RECHECK-2026-09-05.md
docs/ui/authentication.md
docs/ui/personal-center-shell.md
docs/ui/personal-center.md
docs/ui/profile-account.md
docs/tasks/TASK-008-a-trip-planner-shell.md
docs/ui/preference-center.md
```

## B-owned / B-safe

确认仍然只是纯格式差异后，允许只格式化：

```text
docs/project/WBS-5.1-PERSONAL-CENTER-ASSET-AUDIT.md
docs/project/WBS-5.1-VISUAL-READINESS-RECHECK-2026-09-05.md
docs/ui/authentication.md
docs/ui/personal-center-shell.md
docs/ui/personal-center.md
docs/ui/profile-account.md
docs/ui/preference-center.md
```

## A-owned — 严禁修改

```text
docs/tasks/TASK-008-a-trip-planner-shell.md
```

强制规则：

> 禁止覆盖、删除、重写其他 Owner 的 Task 文件；只允许更新当前 Follow-up Task 自己的文件。涉及其他 Task 时只能读取、引用和报告差异。

---

# 5. Prettier 修复方法

先运行：

```bash
npm run format:check
```

然后仅对上面 7 个 B-owned 精确文件检查并格式化：

```bash
npx prettier --check <file>
npx prettier --write <file>
```

逐文件执行即可。

禁止：

```text
prettier --write .
```

禁止为了全仓通过而修改 `TASK-008-a-trip-planner-shell.md`。

格式化后：

```bash
npx prettier --check <7个B-owned文件>
npm run format:check
```

期望：

- B-owned baseline failures 全部消失。
- 若仍失败，只允许记录 A-owned / 新上游文件。
- 对任何新的非 B 文件只记录，不扩大范围。

---

# 6. Problem B — unrs-resolver allowScripts

这是 package install policy / global engineering / supply-chain security 问题，默认属于 A / Shared Infra。

本 Task：

- 运行 `npm install` 复核提示是否仍存在
- 记录是否影响 install / lint / typecheck / build
- 记录 vulnerabilities
- **不修改** `package.json`、`package-lock.json`、`.npmrc`
- **不擅自批准** install script

写入 Handoff：

```text
Owner: A / Shared Infra
Suggested WBS: 2.3 / 2.4 或执行时最新更合适的工程基础项
```

不得修改 A WBS 状态。

---

# 7. Problem C — favicon.ico 404

属于 Global App / Main Shell / Metadata，默认 A-owned。

本 Task：

- 运行 Personal Center 页面确认 404 是否仍存在
- 确认是否为唯一资源 404
- 确认不影响功能
- 写入 Handoff

禁止：

- 随意新增 favicon
- 修改 root metadata
- 修改 A Header
- 修改全局品牌素材

建议 Handoff：

```text
Owner: A
Suggested WBS: 3.1 / 10.5
```

---

# 8. Problem D — Safari / Firefox 验收

如果当前环境已经直接可用 Firefox / Playwright WebKit，且无需新增依赖或修改 package 文件，可补做 Avatar Popover smoke test：

- open
- toggle close
- outside click
- Esc
- focus return
- 5 navigation targets
- disabled logout
- no horizontal overflow

注意：

`Playwright WebKit != Safari 真机`

只能写：

`WebKit compatibility smoke test: Passed`

不能写：

`Safari validated`

如果当前环境不可用，则不阻塞本 Cleanup Task，记录：

```text
Deferred to WBS 9.12 — B 模块响应式 / 可访问性 QA
```

---

# 9. Problem E — Real Logout

真实 Logout 是 `Deferred by design`，不是 WBS 5.2 缺陷。

目标：

```text
5.3 登录 / 注册 / Session
8.3 Authentication 核心
```

本 Task 禁止：

- 修改 disabled Logout
- 清 localStorage / cookie
- 实现 mock logout
- 创建假 Session

Handoff：

```text
Owner: B
Target: 5.3 / 8.3
Classification: Deferred by design
```

---

# 10. Problem F — A Main Header 接线

同样属于 `Deferred by design`。

冻结边界：

```text
A: Main Header / Avatar Trigger placement
B: Avatar Popover content / navigation targets
```

本 Task 禁止修改：

```text
src/features/home/
Main Header
Planner Header
```

Handoff：

```text
Owner: A
Target: WBS 3.4
Prerequisite: B 5.2 reusable Avatar Popover 已完成
```

---

# 11. Handoff 文档

创建：

`docs/project/WBS-5.2-PROBLEM-HANDOFF.md`

格式：

```md
# WBS 5.2 Problem Resolution Handoff

## Resolved by B

### Prettier

- file:
- result:

## Remaining A / Shared Infra

### npm allowScripts

- status:
- evidence:
- suggested owner:
- suggested WBS:

### favicon

- status:
- evidence:
- suggested owner:
- suggested WBS:

## Deferred by Design

### Real Logout

- target: 5.3 / 8.3

### Main Header Integration

- target: 3.4

### Safari / Firefox

- current evidence:
- target QA: 9.12

## Parent WBS

WBS 5.2 remains 已完成.
```

---

# 12. GitHub Issue

执行时先搜索等价 Issue。

若无，创建：

`[Follow-up][WBS 5.2][B] Resolve baseline problems`

**不得重新打开 Issue #50。**

Issue #50 与 WBS 5.2 保持 Completed。

---

# 13. WBS 规则

本 Follow-up 不重新打开 5.2。

禁止：

```text
5.2 已完成 → 进行中
```

默认不修改 Master WBS 状态。

如最新 tracking 规范要求 Follow-up tracking row，只能新增 Follow-up tracking 记录，不得改变 5.2 Completed 状态。

---

# 14. 允许修改

```text
docs/project/WBS-5.1-PERSONAL-CENTER-ASSET-AUDIT.md
docs/project/WBS-5.1-VISUAL-READINESS-RECHECK-2026-09-05.md
docs/ui/authentication.md
docs/ui/personal-center-shell.md
docs/ui/personal-center.md
docs/ui/profile-account.md
docs/ui/preference-center.md
docs/project/WBS-5.2-PROBLEM-HANDOFF.md
docs/tasks/TASK-WBS-5.2-b-problem-cleanup-followup.md
```

前 7 个已有文档只允许纯格式化，不得改变设计语义或状态。

---

# 15. 严禁修改

```text
docs/tasks/TASK-008-a-trip-planner-shell.md
其他任何 A Task
其他任何 B Task
package.json
package-lock.json
.npmrc
src/features/home/
root app metadata
favicon assets
WBS 5.2 status
```

也不得：

- 重写整个 WBS
- 批量格式化全仓
- 开始 5.5
- 开始 5.3
- 开始 9.12
- 修 A Header
- 实现真实 Logout

---

# 16. Validation

```bash
npm install
npm run lint
npm run typecheck
npm run format:check
npm run build
git diff --check
```

并确保：

- B-owned 7 个文件 Prettier = Passed
- lint = Passed
- typecheck = Passed
- build = Passed
- git diff --check = Passed

如果全仓 `format:check` 仍失败，只记录 A-owned / 新上游路径，禁止越权修复。

---

# 17. Runtime Smoke

确认 WBS 5.2 没有被 cleanup 破坏：

`/personal-center`

至少验证：

- Avatar Popover 打开
- Esc 关闭
- `/personal-center/account` 跳转
- disabled Logout 仍 disabled

本 Task 不应产生 runtime source diff。

如果 runtime 源码发生变化，停止检查误操作。

---

# 18. Git

从最新 develop 创建：

```bash
git checkout -b fix/b-wbs-5-2-problem-cleanup
```

提交前：

```bash
git status
git diff --check
git diff --name-only
```

确认无 A Task / package / runtime code。

Commit：

```bash
git commit -m "chore(WBS-5.2-B): clean baseline docs and record handoffs"
git push -u origin fix/b-wbs-5-2-problem-cleanup
```

---

# 19. PR

Title：

`chore(WBS-5.2-B): clean baseline docs and record handoffs`

Base：`develop`

PR Body 必须包含：

```md
## Parent

- WBS 5.2 remains completed
- Issue #50 remains closed

## Resolved

- B-owned Prettier baseline files

## Not Modified / Handed Off

- TASK-008-A formatting
- npm allowScripts policy
- favicon
- A Header
- real Logout
- Safari real-device QA

## Safety

- Other Task files modified: No
- Runtime source modified: No
- package.json / lock modified: No
- WBS 5.2 reopened: No
```

---

# 20. Acceptance Criteria

- [ ] 最新 develop 已读取
- [ ] WBS 5.2 保持已完成
- [ ] Issue #50 保持 Closed
- [ ] 7 个 B-owned baseline 文档若仍失败，已仅做 Prettier 修复
- [ ] B-owned 文档 Prettier 全部 Passed
- [ ] TASK-008-A 未修改
- [ ] npm allowScripts 未擅自批准
- [ ] favicon 未由 B 随意修改
- [ ] Logout 未伪造
- [ ] A Header 未修改
- [ ] Cross-browser 如可用已补测；否则明确 Deferred 9.12
- [ ] Handoff 文档已生成
- [ ] lint Passed
- [ ] typecheck Passed
- [ ] build Passed
- [ ] git diff --check Passed
- [ ] runtime source diff = none
- [ ] Other Task files modified = No

---

# 21. Final Result

```md
# WBS-5.2-B Problems Cleanup Result

## Status

Completed / Awaiting Review / Blocked

## Parent

- WBS 5.2: 已完成（unchanged）
- Issue #50: Closed（unchanged）

## Base Commit

-

## Follow-up Issue

-

## Resolved by B

| Problem                   | Result |
| ------------------------- | ------ |
| B-owned Prettier baseline |        |
| Runtime regression smoke  |        |

## Handoff

| Problem               | Owner            | Target WBS       | Status |
| --------------------- | ---------------- | ---------------- | ------ |
| TASK-008-A formatting | A                | TASK-008-A owner |        |
| npm allowScripts      | A / Shared Infra | 2.x              |        |
| favicon 404           | A                | 3.1 / 10.5       |        |
| Safari / Firefox QA   | B QA             | 9.12             |        |
| Real Logout           | B                | 5.3 / 8.3        |        |
| A Header integration  | A                | 3.4              |        |

## Validation

- npm install:
- lint:
- typecheck:
- format:check:
- B-owned Prettier:
- build:
- git diff --check:
- runtime smoke:

## Git

- Branch:
- Commit:
- PR:
- Merge Commit:

## Ownership Safety

- A Task modified: No
- Other B Task modified: No
- Runtime source modified: No
- package files modified: No
- WBS 5.2 reopened: No

## Next

Stop. Do not automatically start 5.5.
```

---

# 22. Stop Rule

完成后停止。

不要自动执行：

- 5.5 偏好管理中心 UI
- 5.3 Auth / Session
- 9.12 QA
- 3.4 A Header

下一项必须重新检查最新 develop / WBS / Task / Issue / PR 后再开始。

---

# Execution Record

## Preflight

- 执行日期：2026-09-05；Workspace：F:\TravelAssist。
- 初始工作区 clean，origin 正确；fetch --all --prune 与 develop pull --ff-only 成功。
- Base：96a88297196cced771f7e3bb753ade4f17f96d05（PR #55，仅新增本 Follow-up 定义）。沿用当前 Task，不覆盖历史 Task。
- 最新 A Task：TASK-008-A / Issue #51，Planned；最近 B 已完成任务：WBS-5.2-B / Issue #50 Closed。
- 搜索 cleanup / baseline problems Issue、打开的 PR 和远程分支，无等价执行任务；新建独立 Issue #56 和 fix/b-wbs-5-2-problem-cleanup 分支。
- WBS 5.2 保持已完成，Issue #50 保持 Closed。根据现有 task-tracking.md，仅新增 Follow-up 独立 tracking row，不修改父项或任何其他 WBS 状态。

## Validation Evidence

| Check                | Result             | Evidence                                                                                     |
| -------------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| npm install          | Passed             | exit 0；361 packages；0 vulnerabilities；allowScripts 提示仍存在                             |
| npm run lint         | Passed             | exit 0，无 warning                                                                           |
| npm run typecheck    | Passed             | exit 0                                                                                       |
| npm run format:check | Baseline exception | exit 1，清理后仅剩 A-owned TASK-008-a-trip-planner-shell.md                                  |
| B-owned Prettier     | Passed             | 七个精确路径全部通过，未使用全仓 write                                                       |
| Markdown semantics   | Passed             | 七份格式预览及落盘结果 AST 与 Base 完全相同（仅忽略 position）                               |
| npm run build        | Passed             | exit 0；9 个静态页面生成；无 build warning                                                   |
| git diff --check     | Passed             | 无空白错误                                                                                   |
| Runtime source diff  | None               | src / public / package.json / package-lock.json / .npmrc 与 Base 一致                        |
| Other Task diff      | None               | 父 Task、TASK-008-A 与其他 A/B Task 未修改                                                   |
| Runtime smoke        | Passed             | Edge 152.0.4191.62，1440×900 / 320×740，全部五个目标及开关/外部点击/Esc/焦点/disabled Logout |
| Cross-browser        | Deferred 9.12      | Firefox / WebKit 二进制未安装，未增加任何依赖                                                |

### Resource check

favicon 显式 HTTP/fetch 请求仍为 404；浏览器 Resource Timing 记录的桌面 28 条、窄屏 26 条资源中，仅 /favicon.ico 失败。无其他资源 404、无阻塞 page error。具体归属和后续处理见 [WBS-5.2-PROBLEM-HANDOFF.md](../project/WBS-5.2-PROBLEM-HANDOFF.md)。

### Audit scope

- 七个既有 B 文档仅 Prettier 格式变化，共 107 行替换，内容/设计语义/状态不变。
- 当前 Follow-up Task 沿用 PR #55 的原任务定义，只更新自身元数据、格式与执行结果。
- 新增 Handoff；共享 WBS 仅新增当前 Follow-up tracking row，父 5.2 与其他 WBS 状态不变。
- npm 提示、favicon、A TASK-008 格式属于 Owner handoff；Logout / A Header 属于 Deferred by design，均未伪装成已修复。
- 本机非提交 smoke 脚本与 JSON 证据：F:\TravelAssist\node_modules\.cache\wbs-5.2-followup\。该脚本使用现有 bundled Playwright，不是新增工程依赖或 runtime 源码。

## Delivery

- Status: Awaiting Review；本地验收完成，等待提交、PR 合并及最终状态同步。
- Commit: PENDING
- Pull Request: PENDING
- Parent WBS 5.2: 已完成（unchanged）
- Parent Issue #50: Closed（unchanged）
- Follow-up Issue #56: Open / 待验收。
- Next: Stop. Do not automatically start 5.5 / 5.3 / 9.12 / 3.4.
