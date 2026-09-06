# WBS-5.6-B — 同行人管理 UI

## Metadata

- Task ID: `WBS-5.6-B`
- WBS ID: `5.6`
- Owner: `B`
- Responsibility: `Personal Center`
- Priority: `P1`
- Status: `待验收`
- Depends On: `1.26`, `5.5`
- Dependency State at execution:
  - `1.26 = 已完成`
  - `5.5 = 已完成`
- GitHub Issue: `#107`
- Repository: `https://github.com/kanzakimy0/TravelAssist.git`
- Workspace: `F:\TravelAssist`
- Base Branch: `develop`
- Proposed Implementation Branch: `feature/b-account-wbs-5-6-companion-management-ui`
- Proposed Issue: `[WBS 5.6][B] 同行人管理 UI`
- Task File: `docs/tasks/TASK-WBS-5.6-b-companion-management-ui.md`
- Result File: `docs/tasks/RESULT-WBS-5.6-b-companion-management-ui.md`
- Implementation Commit: `PENDING`
- Pull Request: Draft PR `PENDING`

> 本 Task 可以提前存档，但不得绕过 WBS 5.5 前置。只有 5.5 已合入 `develop` 且验收为“已完成”后，5.6 才能进入“进行中”。

---

# 1. Dependency Gate

执行前必须读取最新：

```text
docs/project/WBS-TravelAssist.md
```

必须确认：

```text
1.26 = 已完成
5.5  = 已完成
```

如果 `5.5` 仍为：

```text
未开始 / 进行中 / 待审查 / 阻塞
```

则返回：

```text
# WBS-5.6-B Result

## Status
Blocked

## Reason
WBS 5.6 depends on WBS 5.5, and WBS 5.5 has not reached 已完成 on develop.
```

然后停止。

禁止：

- 因为 5.5 已有本地实现就提前开始 5.6；
- 从 5.5 feature branch 派生 5.6；
- cherry-pick 未合并的 5.5；
- 手动把 WBS 5.5 改成已完成绕过依赖。

---

# 2. Objective

把：

```text
/personal-center/companions
```

从当前 `PersonalPlaceholder` 实现为正式的 **同行人管理中心 UI**。

核心结构：

```text
同行人摘要
+
我的同行人
+
添加 / 编辑同行人 Drawer
+
常用出行组合
+
特殊需求摘要
```

目标是让用户保存和管理长期可复用的同行人资料，并为未来 Planner 的 Trip Companion Snapshot 提供 UI 基础。

本 Task 是 **UI / Interaction Task**。

---

# 3. Design Authority

执行前必须读取最新 `develop`：

```text
docs/project/WBS-TravelAssist.md
docs/ui/companion-management.md
docs/ui/preference-center.md
docs/preferences/preference-system.md
docs/ui/personal-center.md
docs/ui/personal-center-shell.md
docs/ui/personal-center-responsive-states.md
docs/ui/design-system.md
docs/development/task-tracking.md
```

并读取已经合入的最终 WBS 5.5 Task / Result / runtime，继承其 Personal Center 视觉和模块边界。

优先级：

```text
用户最新确认决定
>
docs/ui/companion-management.md
>
已验收并合入 develop 的 5.5 / Personal Center runtime
>
personal-center-responsive-states.md
>
design-system.md
>
当前 Placeholder
>
Codex 自行推导
```

不得从未合并 feature branch 反推设计。

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

要求：

- working tree clean；
- local develop 与 origin/develop 一致；
- 记录真实 Base Commit；
- Dependency Gate 通过；
- 搜索最新 A/B Task / Issue / PR；
- 搜索是否已有等价 WBS 5.6 实现。

建议：

```bash
gh issue list --state all --search "WBS 5.6" --limit 30
gh pr list --state all --search "WBS 5.6" --limit 30
git branch -a | findstr /I "5-6 companion"
```

如已有等价实现，停止并报告，不得重复创建。

---

# 5. Tracking / Branch

Dependency Gate 通过后，如果已有本 Task 的 Blocked Issue，则复用并更新，不新建重复 Issue。

实现分支：

```text
feature/b-account-wbs-5-6-companion-management-ui
```

必须从执行时最新：

```text
origin/develop
```

创建。

正式开始后：

```text
WBS 5.6 = 进行中
Task = 进行中
Issue = Open
```

只允许修改 WBS 5.6 自己状态和 `WBS-5.6-B` Tracking Record。

---

# 6. Ownership Rule

**强制规则：**

> 禁止覆盖、删除、重写其他 Owner 的 Task 文件；只允许更新当前 Task ID 对应文件。涉及其他 Task 时只能读取、引用和报告差异。

同时禁止：

- 修改 A Task；
- 修改其他 B Task；
- 重写整个 WBS；
- 改写 5.1 / 5.2 / 5.4 / 5.5 的历史状态；
- 修改 Planner / Start / Home / Map 主系统；
- 修改 Auth / DB / API 基础。

---

# 7. Scope Boundary

## In Scope

- `/personal-center/companions` 正式 UI；
- 顶部同行人摘要；
- 同行人卡片列表；
- 本人卡；
- 添加同行人；
- 编辑同行人；
- 删除同行人确认；
- 本人不可删除；
- 头像本地预览 / 默认头像；
- 旅行相关需求标签；
- 常用出行组合创建 / 编辑；
- 特殊需求摘要；
- Empty state；
- 本地排序可选；
- 未保存修改保护；
- Mock / in-memory state；
- 响应式 / Accessibility；
- 单元测试 / 浏览器验收。

## Out of Scope

以下属于后续 WBS：

```text
5.12 Companion Schema
5.17 Companion 持久化 API
8.6 B 数据 Migration
Planner Companion Contract / Snapshot 真正接入
同行人账号邀请 / 协作编辑
真实用户账号绑定
```

不得在本 Task 中提前实现。

---

# 8. Data Boundary

只允许：

```text
typed UI fixture
+
React / component in-memory state
+
pure functions
```

禁止：

- Supabase；
- DB / ORM；
- API / Route Handler 写入；
- localStorage；
- Cookie / Session；
- 假 Companion API；
- 假持久化；
- 真正邀请其他账号；
- 把同行人数据提交 Planner。

Result 必须明确：

```text
Persistence: Mock / in-memory only
Companion Schema: Not implemented
Planner Snapshot integration: Not implemented
```

---

# 9. UI View Model ≠ Companion Schema

WBS 5.12 尚未实现，因此 5.6 可以定义 UI 层类型，但不得把它宣称为最终数据库 Schema。

例如 UI 可使用：

```ts
type AgeGroup = "adult" | "child" | "infant" | "senior";

type CompanionViewModel = {
  id: string;
  displayName: string;
  relationship?: string;
  dateOfBirth?: string;
  ageGroup: AgeGroup;
  gender?: string;
  avatarUrl?: string;
  mobilityNeeds: string[];
  diningNeeds: string[];
  activityPreferences: string[];
  isSelf?: boolean;
};
```

仅服务 UI。

禁止冻结：

- DB 字段名；
- API payload；
- 儿童 / 幼儿最终年龄阈值；
- Planner 权重；
- 复杂健康数据模型。

---

# 10. Page Header

页面标题：

```text
同行人
```

副标题：

```text
管理常用同行人，创建旅行时快速选择。
```

不要写成：

```text
联系人管理
成员数据库
用户档案库
```

页面第一眼必须像旅行伙伴管理，而不是企业通讯录。

---

# 11. Companion Summary

顶部使用一张横向摘要卡。

显示：

```text
同行人总数
成人
儿童
幼儿
长者
```

以及：

```text
+ 添加同行人
创建常用组合
```

统计 UI 使用：

```text
成人 / 儿童 / 幼儿 / 长者
```

不要把成人统计拆成“男性 / 女性”。

性别仅为可选资料字段。

---

# 12. My Companions

页面核心区域：

```text
我的同行人
```

推荐 Desktop Grid。

每张人物卡显示：

- 头像；
- 昵称 / 称呼；
- 可用时显示当前年龄；
- 关系；
- 年龄层；
- 最多 3 个旅行相关标签；
- 超过 3 个显示 `+N`；
- 编辑菜单 / 入口。

示例：

```text
Haru · 8岁
家庭成员 · 儿童

[需儿童座椅] [喜欢动物] [少步行]
```

不要把完整隐私 / 健康信息直接铺在卡片上。

---

# 13. Self Card

当前用户本人可以显示在同行人列表中：

```text
Yuki
本人
```

本人卡：

- 复用执行时 `develop` 中现有 Personal Center 当前用户 identity / Mock；
- 不重复创建第二套用户身份状态；
- 可以进入旅行相关资料编辑；
- **不可删除**；
- 删除菜单不得出现。

如果 Profile 尚无真实 API，继续使用稳定 Mock / presentation state。

---

# 14. Add / Edit Companion Drawer

Desktop 推荐右侧 Drawer。

Mobile 可使用：

```text
full-height sheet / full-screen dialog
```

但业务字段保持一致。

## 基本资料

至少支持：

| 字段        | 必填 |
| ----------- | ---- |
| 昵称 / 称呼 | 是   |
| 关系        | 否   |
| 出生日期    | 否   |
| 年龄层      | 是   |
| 性别        | 否   |
| 头像        | 否   |

必填只通过 `*` + accessible required 语义表达，不要到处显示“可选”。

## Avatar

允许：

- 当前头像；
- 选择本地图片预览；
- 恢复默认头像。

禁止真实上传网络。

只允许 Blob URL / in-memory preview。

---

# 15. Date of Birth / Age Rule

设计原则：

```text
优先保存出生日期，而不是长期固定年龄。
```

但本 Task 不实现 Planner travel-date age calculation。

页面可以：

- 如果有 DOB，显示当前年龄作为 UI 信息；
- 同时保留明确的年龄层选择；
- 不根据当前年龄自动冻结未来 Schema 阈值。

如果用户不填写生日：

```text
只选年龄层
```

也必须可以正常保存 UI state。

---

# 16. Travel-related Needs

只收集与旅行规划直接相关、且由用户主动设置的信息。

## 移动 / 无障碍

候选 UI 标签可以来自已冻结设计：

```text
少步行
减少楼梯
需要婴儿车
需要儿童座椅
需要无障碍路线
需要更多休息
```

**不得因为用户是儿童 / 长者而自动开启任何需求。**

## 餐饮

UI 只需支持概括性需求，例如：

```text
饮食限制
素食
儿童餐需求
其他饮食说明
```

如 UI 提供自由文本，默认仅在 Drawer 详情中显示。

首页卡片不得展示具体过敏原、病名或私人健康说明。

## 活动 / 体验

可用设计期候选：

```text
喜欢动物
喜欢户外
喜欢博物馆
喜欢拍照
喜欢游乐设施
```

这些只作为 Companion 的个人倾向，不写入 1.25 用户长期偏好。

---

# 17. Sensitive-data Guard

必须遵守：

1. 不根据年龄、性别、关系自动推断医疗或行动能力；
2. 不生成病名、诊断、过敏原等 Mock 隐私细节；
3. 用户未设置时不自动添加需求；
4. 列表页只显示概括标签；
5. UI fixture 优先使用普通旅行需求，不使用敏感健康示例。

---

# 18. Edit / Delete

人物卡菜单至少：

```text
编辑资料
加入常用组合
删除同行人
```

`复制同行人`不是本 Task 必须项。

删除必须二次确认：

```text
删除 Haru？

删除后不会影响已经保存的历史旅行，
但未来旅行将无法再选择该同行人。

[取消] [删除]
```

当前 Task 只从 in-memory list 删除。

**本人不可删除。**

不得伪造历史 Trip 已真正保留到数据库；只需文案符合未来规则。

---

# 19. Frequent Companion Groups

必须实现：

```text
常用出行组合
```

组合卡显示：

- 名称；
- 头像叠放；
- 人数；
- 一句场景；
- 编辑入口。

创建组合 Drawer / Dialog：

```text
组合名称 *
选择同行人
[取消] [保存组合]
```

至少支持：

- 创建；
- 编辑名称；
- 增减成员；
- 保存到 in-memory state；
- 校验至少 1 位成员。

不要接 Planner。

Result 必须写：

```text
Planner group selection integration: Not implemented
```

---

# 20. Special Needs Summary

页面下方显示概括统计，例如：

```text
需要婴儿车      1 人
需要儿童座椅    2 人
饮食限制        1 人
少步行          1 人
```

点击某项时，可以用轻量 Popover / Dialog / Inline expansion 显示对应人员。

只显示：

```text
需求名称 + 人名
```

不展开敏感细节。

---

# 21. Empty State

无自定义同行人时，仍可以保留本人卡；“无同行人”语义指没有额外保存的同行者。

显示：

```text
还没有保存的同行人

添加家人、朋友或常用旅伴，
以后创建旅行时可以一键选择。

[ + 添加同行人 ]
```

如果产品当前决定完全不显示本人卡，则以执行时最新设计 / runtime 为准，但不得让“本人”变成可删除的普通同行人。

---

# 22. Sorting

MVP 不要求搜索框。

可选实现轻量排序：

```text
按添加时间
按名称
```

`按最近使用` 如果没有真实 Trip usage data，不要伪造。

排序不是 Acceptance blocker。

---

# 23. Unsaved Changes

Drawer / Dialog 中存在修改时：

- 关闭 Drawer；
- 点击 Sidebar；
- 点击 Avatar Popover 跳转；
- beforeunload

都不能静默丢失。

提示：

```text
您还有尚未保存的修改。

[放弃修改] [继续编辑]
```

优先复用执行时 `develop` 已存在、已验收的 Personal Center navigation guard。

如果没有可复用 guard，允许在 `src/features/companions/**` 内实现 page-scoped guard，但禁止为了 5.6 重构全局 Shell。

---

# 24. Local Asset Discovery

沿用用户对 Personal Center 素材的最新工作方式：素材风格不作为开发阻塞条件。

执行时先扫描本地：

```text
assets/**
public/**
仓库根目录中用户放入的未跟踪图片
```

候选格式：

```text
png / jpg / jpeg / webp / svg
```

排除：

```text
node_modules
.git
.next
coverage
docs/evidence
docs/qa
```

优先寻找：

- Companion avatar；
- group decoration；
- Empty-state 轻量素材。

规则：

- 语义合理才使用；
- 不要求写实；
- 不强制把所有素材都用上；
- 不删除用户原始文件；
- 只复制实际使用素材到正式 runtime 目录；
- 缺素材不阻塞 UI。

建议 runtime：

```text
public/media/personal-center/companions/**
```

如果来源信息缺失：

```text
Provenance: user-provided local asset
Production license review: pending if source metadata unavailable
```

不编造授权信息。

---

# 25. Visual Style

继承执行时 `develop` 已验收的 Personal Center Shell 和 5.5 视觉语言。

同行人模块自己应：

- 暖白 / 米白；
- 珊瑚朱红轻强调；
- 大圆角；
- 浅边框；
- 极轻阴影；
- 人物卡有旅行感，不像通讯录；
- 特殊需求标签清晰但克制。

禁止：

- Admin Dashboard；
- 巨大统计数字墙；
- 红色警告海洋；
- 大面积医疗 / 健康符号；
- 为 5.6 重做 Sidebar / Shell。

---

# 26. Recommended Code Structure

优先：

```text
src/features/companions/
├─ companion-center.tsx
├─ companion-center.module.css
├─ companion-data.ts
├─ companion-view-model.ts
├─ components/
│  ├─ companion-summary.tsx
│  ├─ companion-card.tsx
│  ├─ companion-list.tsx
│  ├─ companion-drawer.tsx
│  ├─ companion-form.tsx
│  ├─ companion-group-card.tsx
│  ├─ companion-group-editor.tsx
│  ├─ special-needs-summary.tsx
│  ├─ delete-companion-dialog.tsx
│  └─ unsaved-companion-guard.tsx
```

文件名可调整，但模块边界必须清楚。

禁止把所有业务、CSS 塞进：

```text
companions/page.tsx
personal-center.module.css
```

---

# 27. Allowed Files

主要允许：

```text
src/app/(account)/personal-center/companions/**
src/features/companions/**
tests/*5-6*
docs/tasks/TASK-WBS-5.6-b-companion-management-ui.md
docs/tasks/RESULT-WBS-5.6-b-companion-management-ui.md
docs/tasks/evidence/WBS-5.6-B/**
docs/project/WBS-TravelAssist.md
public/media/personal-center/companions/**
assets/design/personal-center/companions/**
```

---

# 28. Files To Avoid

默认禁止修改：

```text
src/features/profile/**
src/features/preferences/**
src/app/(account)/personal-center/account/**
src/app/(account)/personal-center/preferences/**
src/features/home/**
src/features/planner/**
src/features/map/**
src/features/start-flow/**
package.json
package-lock.json
.github/workflows/**
```

共享 Shell 文件原则上也不改：

```text
src/features/personal-center/components/personal-center-shell.tsx
src/features/personal-center/components/personal-sidebar.tsx
src/features/personal-center/components/avatar-popover.tsx
src/features/personal-center/personal-center.module.css
```

如果存在最新 develop 可复现 bug，只允许最小修复，并在 Result 单独说明。

---

# 29. Navigation

Personal Center 一级导航保持 5 项：

```text
我的首页
我的旅行
旅行偏好
同行人
账户
```

当前页：

```text
同行人
```

必须只有一个正确 `aria-current="page"`。

不得新增新的一级导航。

---

# 30. Responsive

至少验证：

```text
1920×1080
1440×900
1280×720
390×844
320×740
```

Desktop：

- 首屏能看到摘要 + 同行人列表 + 常用组合主要内容；
- Drawer 从右侧打开。

Mobile：

- 卡片单列 / 可读双列；
- Drawer 转 full-height sheet / dialog；
- group card 不横向溢出；
- tag 可换行；
- Dialog / Sheet 不超 viewport。

全视口：

```text
no horizontal overflow
```

---

# 31. Accessibility

必须验证：

- 添加同行人按钮有 accessible name；
- 每张人物卡编辑入口有明确 label；
- Drawer / Dialog 有标题；
- required / error 与字段关联；
- Tab / Shift+Tab；
- Esc；
- Focus trap；
- 关闭后 focus return；
- 删除确认不能只靠红色；
- 头像不能作为唯一身份文字；
- 特殊需求不能只靠颜色区分。

---

# 32. Unit Tests

至少覆盖：

1. 本人不可删除；
2. 人物卡最多 3 个摘要标签，额外显示 `+N`；
3. ageGroup 统计；
4. DOB 年龄显示 pure function；
5. 未设置需求不会根据 ageGroup 自动出现；
6. 创建 / 编辑同行人校验；
7. 删除 in-memory companion；
8. group 至少 1 位成员；
9. group 创建 / 编辑；
10. 特殊需求摘要按人数统计；
11. 敏感 detail 不进入 list summary；
12. Trip temporary state 不写回长期 Companion state（通过数据边界测试表达）。

优先复用现有 Node test runner，不新增测试框架依赖。

---

# 33. Browser Acceptance

必须实测：

```text
/personal-center/companions
```

至少覆盖：

## Overview

- Header；
- Summary；
- Self Card；
- Companion Cards；
- Frequent Groups；
- Special Needs Summary；
- Empty state 可验证。

## Companion Flow

- Open add Drawer；
- required validation；
- create；
- edit；
- local avatar preview；
- restore default；
- delete cancel；
- delete confirm；
- self delete unavailable。

## Group Flow

- create group；
- select members；
- validation；
- edit group；
- update member count。

## Guard

- dirty Drawer close；
- Sidebar navigation；
- Avatar Popover navigation；
- Escape；
- focus return；
- beforeunload。

## Regression

- `/personal-center`；
- `/personal-center/preferences`；
- `/personal-center/account`；
- Avatar Popover；
- five primary nav routes。

---

# 34. Console / Network

要求：

- 无 blocking console error；
- 无 hydration error；
- 无 React warning；
- 无 image decode error；
- 本 Task 新 runtime 图片 HTTP 200；
- 无新增 404。

全局既有 favicon 404 如仍存在，只记录 baseline，不越界修复。

---

# 35. Validation Commands

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

如果全仓 format 仍存在历史失败：

- 记录精确路径；
- 当前 Task 文件 targeted Prettier 必须通过；
- 不改其他 Owner 文档。

---

# 36. Commit / Push

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

建议实现 Commit：

```bash
git commit -m "feat(WBS-5.6-B): implement companion management UI"
```

Push：

```bash
git push -u origin feature/b-account-wbs-5-6-companion-management-ui
```

Draft PR：

```text
feat(WBS-5.6-B): implement companion management UI
```

Base：

```text
develop
```

---

# 37. Status Rules

当前依赖未满足时：

```text
Task = Blocked / Waiting for 5.5
WBS 5.6 = 未开始
Issue = Open / Blocked（如已建立）
```

Dependency Gate 通过、正式开始：

```text
Task = 进行中
WBS 5.6 = 进行中
Issue = Open
```

实现完成但未合并：

```text
Task = 待审查
WBS 5.6 = 待审查
Issue = Open
PR = Draft / Open
```

只有：

```text
PR merged into develop
+
用户验收通过
```

才允许：

```text
Task = 已完成
WBS 5.6 = 已完成
Issue = Closed
```

---

# 38. Downstream Boundary

5.6 完成不等于：

```text
5.12 Companion Schema
5.17 Companion API
Planner Companion integration
```

这些必须继续按独立 WBS 执行。

完成 5.6 后不得自动开始任何后续 Task。

---

# 39. Acceptance Criteria

- [ ] 5.5 dependency is 已完成 on latest develop
- [ ] no duplicate 5.6 implementation
- [ ] `/personal-center/companions` no longer Placeholder
- [ ] summary counts implemented
- [ ] self card implemented and not deletable
- [ ] companion cards implemented
- [ ] max 3 summary tags + `+N`
- [ ] add companion Drawer / Sheet implemented
- [ ] edit companion implemented
- [ ] required validation implemented
- [ ] DOB optional / ageGroup required
- [ ] no age-based automatic sensitive inference
- [ ] local avatar preview implemented
- [ ] delete confirmation implemented
- [ ] frequent groups create / edit implemented
- [ ] special-needs summary implemented
- [ ] sensitive detail not exposed in list
- [ ] empty state implemented
- [ ] unsaved guard implemented
- [ ] Mock / in-memory only
- [ ] Companion Schema not implemented
- [ ] Planner integration not implemented
- [ ] five viewports passed
- [ ] accessibility passed
- [ ] lint passed
- [ ] typecheck passed
- [ ] Node tests passed
- [ ] build passed
- [ ] diff-check passed
- [ ] no A Main System modified
- [ ] no 5.5 implementation modified
- [ ] no new dependencies
- [ ] Task / Issue / WBS / PR synchronized

---

# 40. Required Final Result

返回：

```md
# WBS-5.6-B Result

## Status

Completed / Partially Completed / Awaiting Review / Blocked

## Dependency Gate

- WBS 1.26:
- WBS 5.5:
- latest develop:
- gate passed:

## Preflight

- duplicate Task:
- duplicate Issue:
- duplicate PR:
- base commit:

## Tracking

- Issue:
- Task File:
- Result File:
- Branch:
- Implementation Commit:
- Final Head:
- Draft PR:
- WBS updated:

## Companion Overview

- summary:
- self card:
- companion list:
- tag overflow:
- empty state:

## Companion Editor

- add:
- edit:
- required validation:
- DOB:
- age group:
- avatar local preview:
- delete confirm:
- self delete blocked:

## Travel Needs

- mobility:
- dining summary:
- activity preference:
- automatic sensitive inference:
- sensitive list exposure:

## Frequent Groups

- create:
- edit:
- member selection:
- validation:
- Planner integration:

## Special Needs Summary

- counts:
- people drill-down:
- sensitive details hidden:

## State Boundary

- Persistence:
- Companion Schema:
- Companion API:
- Planner Snapshot integration:
- localStorage / Cookie:

## Local Asset Discovery

- scan roots:
- candidates:
- selected:
- runtime paths:
- provenance:
- decode / browser load:

## Responsive

- 1920×1080:
- 1440×900:
- 1280×720:
- 390×844:
- 320×740:
- horizontal overflow:

## Functional Regression

- five nav routes:
- Avatar Popover:
- Home:
- Preferences:
- Account:
- unsaved guard:
- console / hydration:

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
- 5.5 implementation modified:
- A Main System modified:
- shared Shell modified:
- package/dependencies modified:
- other WBS status changed:

## Git

- Branch:
- Commit:
- Push:
- PR:
- Merge Commit:

## Three-way Sync

- Task:
- Issue:
- WBS 5.6:
- PR:

## Problems

-

## Next

Stop. Do not automatically start 5.12 / 5.17 or Planner companion integration.
```

---

# 41. Stop Rule

完成并 push 后停止。

禁止自动：

- merge PR；
- close Issue；
- 开始 5.12；
- 开始 5.17；
- 修改 Planner；
- 实现 Auth / DB / API。

等待用户验收。
