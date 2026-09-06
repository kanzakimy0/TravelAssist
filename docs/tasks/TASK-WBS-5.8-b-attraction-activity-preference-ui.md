# WBS-5.8-B — 景点 / 活动偏好 UI

## Metadata

- **Task ID:** `WBS-5.8-B`
- **WBS ID:** `5.8`
- **Title:** 景点 / 活动偏好 UI
- **Owner:** `B`
- **Responsibility:** `Personal Center / Preferences`
- **Priority:** `P0`
- **Status:** `Ready / 可开始`
- **Depends On:** `5.5`
- **Dependency State at authoring:** `5.5 = 已完成`
- **Repository:** `https://github.com/kanzakimy0/TravelAssist.git`
- **Workspace:** `F:\TravelAssist`
- **Base Branch:** `develop`
- **Proposed Implementation Branch:** `feature/b-account-wbs-5-8-attraction-activity-preference-ui`
- **Proposed Issue:** `[WBS 5.8][B] 景点 / 活动偏好 UI`
- **Task File:** `docs/tasks/TASK-WBS-5.8-b-attraction-activity-preference-ui.md`
- **Result File:** `docs/tasks/RESULT-WBS-5.8-b-attraction-activity-preference-ui.md`

---

# 1. Objective

把 `/personal-center/preferences/attractions` 从 WBS 5.5 留下的通用分类详情壳升级为正式的 **景点 / 活动长期偏好 UI**。

页面用于管理用户长期默认“喜欢看什么、体验什么”，而不是某一次旅行的具体必去景点清单。

核心结构：

```text
当前景点偏好摘要
+
六个冻结偏好维度
+
快速喜好设置
+
拍照体验详细偏好
+
设置边界 / 候选项说明
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
src/features/preferences/preference-center.tsx
src/features/preferences/preference-model.ts
src/features/preferences/preference-category-page.tsx
src/features/preferences/mobility-preference-page.tsx
src/features/preferences/mobility-preference-model.ts
src/app/(account)/personal-center/preferences/[category]/page.tsx
```

优先级：

```text
用户最新确认决定
>
docs/ui/preference-center.md
>
docs/preferences/preference-system.md
>
已合入 develop 的 WBS 5.5 / 5.7 Preference UI
>
当前通用 category shell
>
Codex 自行推导
```

---

# 3. Preflight

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
- 保留用户本地未追踪素材；
- 禁止 `git clean -fd`；
- 禁止 `git reset --hard`；
- 搜索重复 Task / Issue / PR / branch。

```bash
gh issue list --state all --search "WBS 5.8" --limit 30
gh pr list --state all --search "WBS 5.8" --limit 30
git branch -a | findstr /I "5-8 attraction activity"
```

如已有等价实现，停止并报告。

---

# 4. Dependency Gate

必须确认：

```text
5.5 = 已完成
```

WBS 5.8 正式依赖只有 `5.5`。5.7 是否待审查不阻塞 5.8；5.11 / 5.16 未开始也不阻塞 UI，但意味着本 Task 只能 Mock / in-memory。

---

# 5. Tracking

如果没有等价 Issue，创建：

```text
[WBS 5.8][B] 景点 / 活动偏好 UI
```

分支：

```bash
git switch -c feature/b-account-wbs-5-8-attraction-activity-preference-ui
```

正式开始后：

```text
WBS 5.8 = 进行中
Task = 进行中
Issue = Open
```

只精确修改 WBS 5.8 与自己的 Tracking Record。

---

# 6. Ownership Rule

> 禁止覆盖、删除、重写其他 Owner 的 Task 文件；只允许更新当前 Task ID 对应文件。涉及其他 Task 时只能读取、引用和报告差异。

同时禁止：

- 修改 A Task；
- 修改其他 B Task；
- 重写整个 WBS；
- 修改 5.5 / 5.6 / 5.7 状态；
- 开始 5.9 / 5.11 / 5.16；
- 修改 Planner 业务逻辑。

---

# 7. Current Route Boundary

当前动态路由已经对 `category === "mobility"` 分流到 WBS 5.7 页面。

5.8 只允许增加：

```text
category === "attractions"
```

概念上：

```tsx
if (category === "mobility") return <MobilityPreferencePage />;
if (category === "attractions") return <AttractionActivityPreferencePage />;
```

必须保证：

```text
mobility
dining
accommodation
budget
experience
advanced
```

行为不回归。

---

# 8. Frozen Dimensions

景点偏好 6 个维度严格固定：

```text
自然
历史
人文
艺术
摄影
活动体验
```

语义：

| 维度 | UI 说明 |
|---|---|
| 自然 | 山川、湖泊、海岸、公园、自然景观 |
| 历史 | 古迹、历史建筑、遗址、寺社、博物馆等历史内容 |
| 人文 | 街区、市场、当地生活、社区文化、传统生活方式 |
| 艺术 | 美术馆、设计、建筑、演出、艺术空间 |
| 摄影 | 取景价值、摄影体验、光线 / 景观导向活动 |
| 活动体验 | 手作、户外、节庆、娱乐、参与式体验 |

禁止增加第 7 个正式大维度，例如餐饮、购物、预算、亲子、夜生活、住宿。

---

# 9. Quick Preference Level

快速层只表达喜欢程度：

```text
很喜欢
喜欢
一般
不喜欢
```

内部允许 `未设置` 处理 Empty / Partial。

这些只属于 UI View Model，不是 WBS 5.11 Schema、DB Enum、API Contract、Planner Weight 或归一化算法。

禁止显示百分比、评分、内部权重。

---

# 10. Six Dimension Cards

主区域显示 6 张 Preference Dimension Card，每张包含：

```text
Icon / small media
维度标题
一句说明
当前喜好状态
[很喜欢] [喜欢] [一般] [不喜欢]
```

Desktop 可 2 列或 3 列；Mobile 单列。

不要做成后台大型表格。

---

# 11. Current Summary

顶部实时摘要，例如：

```text
当前景点偏好
自然 · 摄影 · 历史
```

规则：

- 最多 3 个显著维度；
- 同级使用固定维度顺序；
- 不显示分数；
- 一般 / 不喜欢 / 未设置不抢摘要；
- 无明显偏好时显示“还没有明显的景点偏好”。

---

# 12. Supporting Visual / Local Assets

允许继续使用：

```text
/media/personal-center/preferences/category-attractions.webp
```

也允许自动扫描本地素材：

```text
assets/**
public/**
仓库根目录近期新增图片
```

格式：png / jpg / jpeg / webp / svg。

排除：node_modules / .git / .next / coverage / docs/evidence / docs/qa。

选择原则：语义匹配 > 整体协调 > 构图 > 尺寸 > 体积 > 文件名。

不要求写实；允许照片、插画、AI 图、icon。缺图不阻塞。禁止自行上网下载或编造授权。

新增 runtime 素材建议：

```text
public/media/personal-center/preferences/attractions/
```

来源未知时 Result 写：

```text
Provenance: user-provided local asset
Production license review: pending if source metadata unavailable
```

---

# 13. Detailed Preference — 拍照体验

当前设计明确要求支持更细的行为偏好，例如“拍照”。

5.8 至少实现一个可操作的：

```text
拍照体验详细偏好
```

建议 UI：

```text
[ ] 旅行中希望主动安排拍照体验
```

说明：

```text
开启后代表您长期更重视取景价值、光线与拍照停留体验。
```

这是 UI fixture / presentation state，不得声称对应正式 Schema 字段。

---

# 14. Candidate Detailed Directions — 不得正式冻结

以下目前仍只是候选：

```text
必去 / 希望去 / 可去 / 不去
室内 / 室外倾向
热门 / 小众倾向
文化 / 自然 / 购物 / 娱乐等更多分类
```

5.8 不允许把它们做成正式业务枚举并宣称冻结。

允许页面底部低优先级说明：

```text
更多详细偏好将在偏好数据结构冻结后继续开放。
```

不要展示一堆 disabled 假控件。

---

# 15. Trip-specific Boundary

`必去 / 希望去 / 可去 / 不去` 更接近某个目的地 / 某次 Trip 对具体 POI 的优先级。

因此 5.8 不得把它错误保存为长期全局景点类型偏好，也不得修改 Planner / Trip POI preference。

---

# 16. State Model

允许建立 presentation-only `AttractionActivityPreferenceState`。

概念上：

```ts
type AttractionPreferenceLevel =
  | "veryLike"
  | "like"
  | "neutral"
  | "dislike"
  | "unset";
```

以及六个冻结维度 + `photoExperience`。不得将其宣称为正式 Schema。

---

# 17. Saved / Draft

与 5.7 一致：

```text
saved
draft
```

- 修改只改 draft；
- Save：saved = draft clone；
- Cancel：draft = saved clone；
- Restore：draft = UI fixture default。

---

# 18. Save / Cancel / Restore

底部：

```text
[恢复默认]                [取消] [保存偏好]
```

Save 只写页面内存并显示 `✓ 已保存`；Cancel 回滚；Restore 只恢复 UI fixture，不代表 5.13 正式 Preset。

禁止任何网络写请求。

---

# 19. Unsaved Guard

当 draft != saved 时保护：

- 返回旅行偏好；
- Sidebar；
- Avatar Popover；
- beforeunload。

提示：

```text
您还有尚未保存的修改。

[放弃修改] [继续编辑]
```

优先复用 `usePersonalNavigationGuard` / `GuardedLink`，不要重构 Shared Shell。

---

# 20. Overview Synchronization

若当前架构没有正式跨 route Preference Store，禁止为了同步 5.5 Overview 引入 localStorage、Cookie、URL hack、fake API、global mutable singleton。

Result 写：

```text
Overview cross-route synchronization: deferred
```

真正同步留给 5.11 / 5.16。

---

# 21. Empty / Partial

必须支持 `未设置`，并保证：

```text
未设置 != 不喜欢
```

Partial 只总结明确设置项，不从缺失数据推断不喜欢。

---

# 22. Accessibility

必须验证：

- 每个维度可被 screen reader 读取；
- preference choice 使用 radio/radiogroup 或等价 accessible pattern；
- selected state 不只靠颜色；
- Tab / Shift+Tab；
- Focus visible；
- 拍照详细偏好可键盘操作；
- Action bar 顺序自然。

---

# 23. Visual Style

继承 5.5 / 5.7 / Personal Center：暖米白、珊瑚朱红、樱粉、低对比度、大圆角、浅边框、轻阴影。

页面应像“旅行兴趣画像编辑”，不要像后台权限矩阵、评分 Excel、管理问卷。

---

# 24. Recommended Structure

建议：

```text
src/features/preferences/
├─ attraction-activity-preference-page.tsx
├─ attraction-activity-preference-model.ts
├─ attraction-activity-preference.module.css
└─ components/ (必要时)
```

要求 pure state logic 可测试，不污染 personal-center.module.css。

---

# 25. Allowed Files

主要允许：

```text
src/app/(account)/personal-center/preferences/[category]/page.tsx
src/features/preferences/attraction-activity-*
tests/*5-8*
docs/tasks/TASK-WBS-5.8-b-attraction-activity-preference-ui.md
docs/tasks/RESULT-WBS-5.8-b-attraction-activity-preference-ui.md
docs/evidence/WBS-5.8-B/**
docs/project/WBS-TravelAssist.md
public/media/personal-center/preferences/attractions/**  # 如有新增素材
```

---

# 26. Files To Avoid

默认禁止修改：

```text
src/features/profile/**
src/features/companions/**
src/features/home/**
src/features/planner/**
src/features/map/**
src/features/start-flow/**
src/features/preferences/mobility-preference-*
src/app/(account)/personal-center/account/**
src/app/(account)/personal-center/companions/**
package.json
package-lock.json
.github/workflows/**
src/features/personal-center/components/personal-center-shell.tsx
src/features/personal-center/components/personal-sidebar.tsx
src/features/personal-center/components/avatar-popover.tsx
src/features/personal-center/personal-center.module.css
```

---

# 27. Do Not Implement 5.9

5.8 不得实现或修改餐饮、住宿、预算偏好，只做回归测试。

---

# 28. Do Not Implement Schema / Persistence

Out of Scope：

```text
5.11 Preference Schema
5.13 Preference Preset
5.14 Planner-readable Preference Contract
5.16 Preference persistence API
```

禁止 Supabase / DB / ORM / API / localStorage / Cookie / Session / Planner write / Recommendation weight / 正式 POI taxonomy。

Result：

```text
Persistence: Mock / in-memory only
Formal Preference Schema: Not implemented
Planner Contract: Not implemented
```

---

# 29. Unit Tests

至少覆盖：

1. 六个冻结维度且顺序稳定；
2. 不存在第七个正式维度；
3. 四个快速喜好选项；
4. unset != dislike；
5. 单维度修改；
6. 多维度独立修改；
7. Summary 最多 3 项；
8. Summary 只选显著喜欢项；
9. 同级 summary 顺序稳定；
10. Photo Experience toggle；
11. Save；
12. Cancel；
13. Restore；
14. dirty detection；
15. UI 修改不产生 Trip temporary state；
16. 候选详细方向未进入正式状态枚举。

---

# 30. Browser QA

打开：

```text
/personal-center/preferences/attractions
```

验证标题、摘要、六个维度、6×4 快速选项、拍照体验、边界说明、Action bar，以及 Save / Cancel / Restore / unsaved guard。

回归：

```text
/personal-center/preferences
/personal-center/preferences/mobility
/personal-center/preferences/dining
/personal-center/preferences/accommodation
/personal-center/preferences/budget
/personal-center/preferences/experience
/personal-center/preferences/advanced
/personal-center/companions
/personal-center/account
```

尤其保证 5.7 mobility 不回归。

---

# 31. Responsive QA

至少：

```text
1920×1080
1440×900
1280×720
390×844
320×740
```

Mobile：卡片单列；4 个喜好选项必要时 2×2；不文字重叠；Action bar 不横向溢出。

必须 no horizontal overflow。

---

# 32. Console / Network

要求：无 hydration error、无 React warning、无 blocking console error、无素材 decode error、无新增 404、Save 不产生写请求。

---

# 33. Validation

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

全仓 Prettier 若有既有 baseline，只记录，不越界修复；本 Task 文件 targeted Prettier 必须 Passed。

---

# 34. Git Safety

提交前：

```bash
git status
git diff --name-only
git diff --check
```

禁止 `git add .`、`git clean -fd`、`git reset --hard`、force push。

建议：

```bash
git commit -m "feat(WBS-5.8-B): implement attraction activity preference UI"
```

---

# 35. Push / PR

```bash
git push -u origin feature/b-account-wbs-5-8-attraction-activity-preference-ui
```

目标 PR：

```text
feat(WBS-5.8-B): implement attraction activity preference UI
```

Base = `develop`。

仓库有 feature push 自动建 PR / 自动合并历史。不得修改 workflow，不主动开启 auto-merge；若自动合并，仍保持 Issue Open / WBS 待审查，直到用户验收。

---

# 36. Status Rules

开始：

```text
WBS 5.8 = 进行中
Task = 进行中
Issue = Open
```

代码实现完成或自动合入但用户未验收：

```text
WBS 5.8 = 待审查
Task = 待审查
Issue = Open
```

只有代码进入 develop + 用户验收通过后：

```text
WBS 5.8 = 已完成
Task = 已完成
Issue = Closed
```

---

# 37. Acceptance Checklist

- [ ] latest develop synced
- [ ] 5.5 = 已完成
- [ ] no duplicate 5.8 Task / Issue / PR
- [ ] attractions route no longer generic shell
- [ ] mobility unchanged
- [ ] exactly 6 frozen dimensions
- [ ] 4 semantic quick preference choices
- [ ] no percentage / numeric score
- [ ] summary live and max 3
- [ ] photo experience implemented
- [ ] candidate future enums not formalized
- [ ] trip-specific 必去 etc not misused as long-term global preference
- [ ] Save / Cancel / Restore
- [ ] in-memory only
- [ ] unset != dislike
- [ ] unsaved guard
- [ ] five viewports
- [ ] mobility regression passed
- [ ] no Planner / Auth / API / DB
- [ ] no package/dependency changes
- [ ] Task / Issue / WBS / PR synchronized

---

# 38. Required Final Result

创建：

```text
docs/tasks/RESULT-WBS-5.8-b-attraction-activity-preference-ui.md
```

至少返回：

```md
# WBS-5.8-B Result

## Status

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
- Merge Commit:
- WBS updated:

## Attraction / Activity UI
- generic shell replaced:
- current summary:
- six frozen dimensions:
- quick preference levels:
- photo experience:
- candidate future controls added:

## State Boundary
- Persistence:
- Formal Preference Schema:
- Planner Contract:
- localStorage / Cookie:
- network writes:
- overview cross-route synchronization:

## Save Flow
- Save:
- Cancel:
- Restore:
- dirty detection:

## Local Asset Discovery
- scan roots:
- candidates found:
- selected:
- runtime paths:
- provenance:

## Responsive
- 1920×1080:
- 1440×900:
- 1280×720:
- 390×844:
- 320×740:
- horizontal overflow:

## Regression
- Preference overview:
- Mobility 5.7:
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
- 5.7 code/status changed:
- 5.9 implemented:
- Planner modified:
- Auth / API / DB added:
- package/dependencies modified:
- shared Shell modified:

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

## Next
Stop. Do not automatically start WBS 5.9 / 5.11 / 5.16.
```

---

# 39. Stop Rule

完成后停止。禁止自动开始 5.9 / 5.11 / 5.16；禁止连接 Planner、实现推荐权重、扩充未冻结景点 Master Data；用户未验收前禁止关闭 Issue 或把 WBS 5.8 标记为已完成。
