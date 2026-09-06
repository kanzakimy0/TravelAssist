# WBS-5.8-B — 景点 / 活动偏好 UI

> Regenerated: 2026-09-06  
> This version supersedes the earlier unmerged draft branch `docs/b-wbs-5-8-attraction-activity-task`.

## Metadata

- Task ID: `WBS-5.8-B`
- WBS ID: `5.8`
- Owner: `B`
- Responsibility: `Personal Center / Preferences`
- Priority: `P0`
- Status: `进行中`
- Dependency: `5.5`
- Dependency State: `5.5 = 已完成`
- Repository: `https://github.com/kanzakimy0/TravelAssist.git`
- Workspace: `F:\TravelAssist`
- Base Branch: `develop`
- Implementation Branch: `feature/b-account-wbs-5-8-attraction-activity-preference-ui`
- Issue: `#128 — [WBS 5.8][B] 景点 / 活动偏好 UI`
- Task File: `docs/tasks/TASK-WBS-5.8-b-attraction-activity-preference-ui.md`
- Result File: `docs/tasks/RESULT-WBS-5.8-b-attraction-activity-preference-ui.md`

---

# 1. Goal

把：

```text
/personal-center/preferences/attractions
```

从 WBS 5.5 留下的通用分类壳，升级为正式的：

```text
景点 / 活动长期偏好 UI
```

页面核心解决：

```text
用户长期喜欢看什么
+
喜欢体验什么
+
这些偏好在什么程度
```

而不是：

```text
某次旅行的具体 POI 必去清单
```

---

# 2. Source of Truth

执行前完整读取：

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
冻结设计文档
>
已合入 develop 的 5.5 / 5.7 Preference UI
>
当前通用分类壳
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
- local develop 与 origin/develop 一致；
- 记录真实 Base Commit；
- 保留本地未追踪素材；
- 不执行 `git clean -fd`；
- 不执行 `git reset --hard`；
- 不 force push。

重新检查：

```bash
gh issue list --state all --search "WBS 5.8" --limit 30
gh pr list --state all --search "WBS 5.8" --limit 30
git branch -a | findstr /I "5-8 attraction activity"
```

复用唯一 Issue：

```text
#128
```

禁止创建重复 5.8 Issue。

---

# 4. Dependency Gate

WBS 5.8 的正式依赖只有：

```text
5.5
```

必须确认：

```text
5.5 = 已完成
```

5.7 已完成可作为 UI 参考，但不是 5.8 的正式依赖。

---

# 5. Start Tracking

开始实现后：

```text
WBS 5.8 = 进行中
Task = 进行中
Issue #128 = Open
```

创建：

```bash
git switch -c feature/b-account-wbs-5-8-attraction-activity-preference-ui
```

只精确修改：

```text
WBS 5.8
WBS-5.8-B Tracking Record
当前 Task
当前 Result
```

---

# 6. Hard Ownership Rule

强制规则：

> 禁止覆盖、删除、重写其他 Owner 的 Task 文件；只允许更新当前 Task ID 对应文件。涉及其他 Task 时只能读取、引用和报告差异。

同时禁止：

- 修改 A Task；
- 修改其他 B Task；
- 改 5.5 / 5.6 / 5.7 状态；
- 重写整个 WBS；
- 顺手开始 5.9 / 5.11 / 5.16；
- 修改 Planner / Map / Route / AI。

---

# 7. Route Boundary

当前动态路由已对：

```text
mobility
```

分流到 WBS 5.7 正式页面。

5.8 只增加：

```text
attractions
```

分流。

概念：

```tsx
if (category === "mobility") {
  return <MobilityPreferencePage />;
}

if (category === "attractions") {
  return <AttractionActivityPreferencePage />;
}
```

其他：

```text
dining
accommodation
budget
experience
advanced
```

保持现有通用壳。

---

# 8. Six Frozen Preference Dimensions

必须严格使用 6 个维度：

```text
自然
历史
人文
艺术
摄影
活动体验
```

语义：

| 维度     | 代表内容                                     |
| -------- | -------------------------------------------- |
| 自然     | 山川、湖泊、海岸、公园、自然景观             |
| 历史     | 古迹、历史建筑、遗址、寺社、博物馆等历史内容 |
| 人文     | 街区、市场、当地生活、社区文化、传统生活方式 |
| 艺术     | 美术馆、设计、建筑、演出、艺术空间           |
| 摄影     | 取景价值、摄影体验、光线 / 景观导向活动      |
| 活动体验 | 手作、户外、节庆、娱乐、参与式体验           |

禁止增加第 7 个正式大维度。

尤其不要把：

```text
餐饮
住宿
购物
预算
亲子
夜生活
```

混进这个六维结构。

---

# 9. Quick Preference Levels

每个维度提供快速喜好设置：

```text
很喜欢
喜欢
一般
不喜欢
```

内部可以有：

```text
未设置
```

用于 Empty / Partial。

这些只是：

```text
UI View Model / Presentation State
```

不是：

```text
5.11 Preference Schema
DB Enum
API Contract
Planner Weight
推荐打分
```

禁止显示：

```text
百分比
4.5/5
内部 weight
score
```

---

# 10. Main Page Layout

推荐结构：

```text
Page Header
↓
当前景点偏好摘要
↓
六个偏好维度卡
↓
拍照体验详细偏好
↓
更多详细设置边界说明
↓
恢复默认 / 取消 / 保存
```

Desktop：

```text
2 列或 3 列卡片
```

Mobile：

```text
单列
```

第一眼必须像旅行兴趣设置，不像后台配置表。

---

# 11. Dimension Card

每张卡至少包含：

```text
维度标题
一句解释
当前状态
4 个快速喜好按钮
```

例如：

```text
自然
山川、湖泊、海岸、公园与自然景观

[很喜欢] [喜欢] [一般] [不喜欢]
```

可以有 icon / 小图，但图片不是必需条件。

---

# 12. Summary

顶部实时摘要。

例如：

```text
当前景点偏好
自然 · 摄影 · 历史
```

规则：

- 最多 3 项；
- 优先 veryLike，其次 like；
- 同级按六维固定顺序；
- neutral / dislike / unset 不抢摘要；
- 没有明显喜欢项：

```text
还没有明显的景点偏好
```

---

# 13. Photo Experience

当前设计明确提出需要支持更细的：

```text
拍照
```

因此至少实现一个真实可操作的详细偏好：

```text
拍照体验
```

建议：

```text
[ ] 旅行中希望主动安排拍照体验
```

说明：

```text
更重视取景价值、光线条件和拍照停留体验。
```

该值只属于页面 presentation state。

禁止自行冻结：

```text
goldenHourWeight
photoStopMinutes
cameraType
photoScore
```

等正式字段。

---

# 14. Candidate Items Are Not Frozen

以下目前只是设计候选，不得在 5.8 中直接冻结为正式业务枚举：

```text
必去 / 希望去 / 可去 / 不去
室内 / 室外倾向
热门 / 小众倾向
文化 / 自然 / 购物 / 娱乐的更多细分类
```

页面允许显示一条低优先级说明：

```text
更多详细偏好将在偏好数据结构冻结后继续开放。
```

不要展示大量 disabled 假控件。

---

# 15. Trip-specific POI Boundary

尤其注意：

```text
必去
希望去
可去
不去
```

更接近：

```text
具体 Trip
+
具体 POI
```

不是长期全局景点类型偏好。

5.8 禁止修改：

```text
Planner
Trip POI state
Map pin preference
Route
Recommendation
```

---

# 16. Presentation State

允许建立 UI-only 类型：

```ts
type AttractionPreferenceLevel =
  "veryLike" | "like" | "neutral" | "dislike" | "unset";
```

状态至少包含：

```text
6 个冻结维度
photoExperience
```

该类型必须明确是：

```text
Presentation Model
```

不是正式 Preference Schema。

---

# 17. Saved / Draft

采用与 5.7 一致的：

```text
saved
draft
```

规则：

- 编辑只改 draft；
- Save：saved = clone(draft)；
- Cancel：draft = clone(saved)；
- Restore：draft = UI fixture default。

---

# 18. Action Bar

底部：

```text
[恢复默认]              [取消] [保存偏好]
```

Save：

- 只保存页面内存；
- 显示 `✓ 已保存`；
- 不产生写请求。

Cancel：

- 回滚最近 Saved。

Restore：

- 恢复 UI fixture；
- 不代表 WBS 5.13 正式 Preset。

---

# 19. Unsaved Guard

当：

```text
draft != saved
```

必须保护：

- 返回旅行偏好；
- Sidebar；
- Avatar Popover；
- beforeunload。

复用：

```text
usePersonalNavigationGuard
GuardedLink
```

不要重构 Shared Shell。

提示：

```text
您还有尚未保存的修改。

[放弃修改] [继续编辑]
```

---

# 20. Cross-route Sync Boundary

当前 5.5 Overview 与各详细页仍没有正式持久化 Preference Store。

因此 5.8 禁止为了同步 Overview 新增：

```text
localStorage
Cookie
URL hack
fake API
global mutable singleton
```

Result 必须写：

```text
Overview cross-route synchronization: deferred
```

正式同步留给：

```text
5.11
5.16
```

---

# 21. Empty / Partial Semantics

必须支持：

```text
unset
```

并保证：

```text
unset != dislike
```

Partial 状态只总结用户明确设置的数据。

---

# 22. Local Asset Detection

开始 UI 前扫描本地已有素材：

```powershell
Get-ChildItem -Path . -Recurse -File -Include *.png,*.jpg,*.jpeg,*.webp,*.svg |
  Where-Object {
    $_.FullName -notmatch '\\(node_modules|\.git|\.next|coverage|docs\\evidence|docs\\qa)\\'
  } |
  Select-Object FullName, Length, LastWriteTime
```

重点：

```text
assets/**
public/**
仓库根目录近期新增素材
```

允许复用：

```text
/media/personal-center/preferences/category-attractions.webp
```

选择原则：

```text
语义匹配
>
整体协调
>
构图
>
尺寸
>
文件体积
```

不要求写实。

缺图不能阻塞。

不得：

- 自己上网下载；
- 编造版权；
- 为了使用素材而错误映射；
- 删除用户原图。

实际新增 runtime 素材建议：

```text
public/media/personal-center/preferences/attractions/
```

来源不明时 Result 写：

```text
Provenance: user-provided local asset
Production license review: pending if source metadata unavailable
```

---

# 23. Visual Style

继承：

```text
WBS 5.5 Preference Center
WBS 5.7 Mobility Preference
Personal Center visual baseline
```

保持：

```text
暖米白
珊瑚朱红
樱粉
低对比
大圆角
浅边框
轻阴影
```

不要做成：

```text
后台 Dashboard
评分 Excel
权限矩阵
复杂调查问卷
```

---

# 24. Accessibility

必须验证：

- 每个维度有可访问名称；
- 4 个等级使用 radio/radiogroup 或同等模式；
- selected state 不只靠颜色；
- Tab；
- Shift+Tab；
- Focus visible；
- photoExperience 可键盘操作；
- action bar 顺序合理；
- 触摸目标足够。

---

# 25. Recommended Files

建议：

```text
src/features/preferences/
├─ attraction-activity-preference-page.tsx
├─ attraction-activity-preference-model.ts
├─ attraction-activity-preference.module.css
└─ components/  # 必要时
```

业务/pure logic 不要全部塞进 page.tsx。

---

# 26. Allowed Files

主要允许：

```text
src/app/(account)/personal-center/preferences/[category]/page.tsx
src/features/preferences/attraction-activity-*
tests/*5-8*
docs/tasks/TASK-WBS-5.8-b-attraction-activity-preference-ui.md
docs/tasks/RESULT-WBS-5.8-b-attraction-activity-preference-ui.md
docs/evidence/WBS-5.8-B/**
docs/project/WBS-TravelAssist.md
public/media/personal-center/preferences/attractions/**  # 如需要
```

---

# 27. Files To Avoid

默认禁止：

```text
src/features/preferences/mobility-preference-*
src/features/profile/**
src/features/companions/**
src/features/home/**
src/features/planner/**
src/features/map/**
src/features/start-flow/**
src/app/(account)/personal-center/account/**
src/app/(account)/personal-center/companions/**
src/features/personal-center/components/personal-center-shell.tsx
src/features/personal-center/components/personal-sidebar.tsx
src/features/personal-center/components/avatar-popover.tsx
src/features/personal-center/personal-center.module.css
package.json
package-lock.json
.github/workflows/**
```

---

# 28. Out of Scope

禁止提前实现：

```text
5.9 餐饮 / 住宿 / 预算偏好 UI
5.11 Preference Schema
5.13 Preference Preset
5.14 Planner-readable Preference Contract
5.16 Preference persistence API
```

禁止：

```text
Supabase
DB
ORM
API
localStorage
Cookie
Session
Planner write
Recommendation weight
正式 POI taxonomy
```

Result：

```text
Persistence: Mock / in-memory only
Formal Preference Schema: Not implemented
Planner Contract: Not implemented
```

---

# 29. Unit Tests

至少覆盖：

1. 六个冻结维度；
2. 顺序固定；
3. 没有第七个正式维度；
4. 四个快速等级；
5. unset != dislike；
6. 单维度修改；
7. 多维度独立修改；
8. summary 最多 3 项；
9. summary 只取显著喜欢项；
10. 同级 summary 顺序稳定；
11. photoExperience toggle；
12. Save；
13. Cancel；
14. Restore；
15. dirty detection；
16. 不生成 Trip temporary state；
17. 候选详细项没有进入正式状态枚举。

---

# 30. Browser QA

主路径：

```text
/personal-center/preferences/attractions
```

必须测试：

- Header；
- 当前摘要；
- 六张维度卡；
- 24 个快速等级选项；
- 拍照体验；
- Save；
- Cancel；
- Restore；
- unsaved guard。

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

特别保证：

```text
5.7 mobility 不回归
```

---

# 31. Responsive QA

至少验证：

```text
1920×1080
1440×900
1280×720
390×844
320×740
```

Mobile：

- 卡片单列；
- 4 个等级必要时 2×2；
- 不出现文字重叠；
- action bar 不溢出；
- no horizontal overflow。

---

# 32. Console / Network

要求：

- 无 hydration error；
- 无 React warning；
- 无 blocking console error；
- 无 asset decode error；
- 无新增 404；
- Save 无网络写请求。

---

# 33. Validation

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

如果全仓 Prettier 有旧 baseline：

- 精确记录；
- 不越界修复；
- 当前 Task 文件 targeted format 必须 Passed。

---

# 34. Commit / Push

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

建议：

```bash
git commit -m "feat(WBS-5.8-B): implement attraction activity preference UI"
git push -u origin feature/b-account-wbs-5-8-attraction-activity-preference-ui
```

---

# 35. PR

目标：

```text
feat(WBS-5.8-B): implement attraction activity preference UI
```

Base：

```text
develop
```

复用：

```text
Issue #128
```

仓库 feature push 存在自动建 PR / 自动合并行为。

不得修改 workflow，也不要主动开启 auto-merge。

如果自动合并：

```text
WBS 5.8 仍 = 待审查
Issue #128 仍 Open
```

直到用户验收。

---

# 36. Status Rules

开始：

```text
WBS 5.8 = 进行中
Task = 进行中
Issue #128 = Open
```

代码完成 / 自动合入但用户未验收：

```text
WBS 5.8 = 待审查
Task = 待审查
Issue #128 = Open
```

只有：

```text
代码进入 develop
+
用户验收通过
```

才允许：

```text
WBS 5.8 = 已完成
Task = 已完成
Issue #128 = Closed
```

---

# 37. Required Result

生成：

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

# 38. Stop Rule

完成后停止。

禁止自动：

- 开始 5.9；
- 开始 5.11；
- 开始 5.16；
- 连接 Planner；
- 实现推荐权重；
- 扩充未冻结景点 Master Data；
- 用户验收前关闭 Issue #128；
- 用户验收前把 WBS 5.8 标成已完成。
