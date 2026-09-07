# WBS-5.10-B — 我的旅行 / Trip Library UI

## Metadata

- Task ID: `WBS-5.10-B`
- WBS ID: `5.10`
- Owner: `B`
- Responsibility: `Personal Center / Trip Library`
- Priority: `P0`
- Status: `已完成（用户验收通过）`
- Depends On: `1.27, 5.1`
- Dependency State at authoring: `1.27 = 已完成`, `5.1 = 已完成`
- Repository: `https://github.com/kanzakimy0/TravelAssist.git`
- Workspace: `F:\TravelAssist`
- Base Branch: `develop`
- Authoring Base: `dc65b8c5324ef18e7af08d0788f9b0aa993c52af` or newer `origin/develop`
- Proposed Implementation Branch: `feature/b-account-wbs-5-10-trip-library-ui`
- Proposed Issue: `[WBS 5.10][B] 我的旅行 / Trip Library UI`
- GitHub Issue: `#143`
- User Acceptance: `通过（2026-09-06）`
- Task File: `docs/tasks/TASK-WBS-5.10-b-trip-library-ui.md`
- Result File: `docs/tasks/RESULT-WBS-5.10-b-trip-library-ui.md`

---

# 1. Objective

把当前 `/personal-center/trips` 从 Placeholder 升级为正式的 **我的旅行 / Trip Library 顶层 UI**。

本 Task 实现：

```text
全部 / 即将出发 / 草稿 / 历史 / 收藏
Next Trip Hero
搜索 / 目的地筛选 / 排序
旅行卡
草稿删除确认
历史年份分组
收藏分类
新建旅程入口
```

本 Task 仍然是 `Mock / in-memory UI`，不得提前实现真实 Trip 数据层、保存 API、Reservation Hub、Partner 同步或 Planner Contract。

---

# 2. Source of Truth

执行前完整读取最新 `develop`：

```text
docs/project/WBS-TravelAssist.md
docs/ui/trip-library.md
docs/ui/personal-center-responsive-states.md
docs/ui/personal-center.md
docs/ui/personal-center-shell.md
docs/ui/personal-center-design-freeze-v1.md
docs/ui/navigation-flow.md
docs/ui/trip-detail.md
src/app/(account)/personal-center/trips/page.tsx
src/features/personal-center/**
```

需要了解但不得越界实现：`docs/ui/trip-planner.md`。

优先级：用户最新决定 > 1.27 冻结 Trip Library 设计 > 1.29 响应式规范 > 已合入 Personal Center Shell / Navigation > 当前 Trips Placeholder > Codex 推导。

---

# 3. TASK-010-B Is Not This Task

仓库已有 `TASK-010-B / PR #108`，它只完成 WBS 5.10 的**导航子集**，包括：

```text
开始新旅行 → /start?entry=step3
返回当前规划 → /planner
```

它不是 `WBS-5.10-B` 的完整 Trip Library 实现。

因此：

- 不把 PR #108 当重复实现；
- 不重新打开 / 覆盖 TASK-010-B；
- 复用已验证的 `/start?entry=step3` 导航契约；
- 只有发现真正等价的 `WBS-5.10-B full Trip Library UI` 才 Block。

---

# 4. Preflight

```bash
cd F:\TravelAssist
git status --short --untracked-files=all
git branch --show-current
git fetch --all --prune
git switch develop
git pull --ff-only origin develop
git log -1 --oneline

gh issue list --state all --search "WBS 5.10" --limit 30
gh pr list --state all --search "WBS 5.10" --limit 30
git branch -a | findstr /I "5-10 trip library"
```

必须保留本地未追踪素材。禁止 `git clean -fd`、`git reset --hard`、force push。

---

# 5. Dependency Gate

Master WBS 正式依赖：

```text
1.27 = 已完成
5.1 = 已完成
```

真实持久化相关的 `5.18 / 5.19 / 8.1 / 4.17` 尚未完成，不阻塞 5.10 UI，但决定本 Task 只能使用：

```text
typed fixture + pure functions + React in-memory state
```

---

# 6. Tracking

若无等价 Issue，创建：

```text
[WBS 5.10][B] 我的旅行 / Trip Library UI
```

实现分支：

```bash
git switch -c feature/b-account-wbs-5-10-trip-library-ui
```

正式开始：

```text
WBS 5.10 = 进行中
Task = 进行中
Issue = Open
```

强制规则：

> 禁止覆盖、删除、重写其他 Owner 的 Task 文件；只允许更新当前 Task ID 对应文件。涉及其他 Task 时只能读取、引用和报告差异。

---

# 7. Frozen Information Architecture

主页 Tab 严格为：

```text
[全部] [即将出发] [草稿] [历史] [收藏]
```

不得新增一级 Tab：`外部订单 / 订单中心 / Booking / Agoda / Reservation`。

核心原则：**所有订单都是某一次旅行的一部分。** Partner 不是 Trip Library 一级导航。

---

# 8. Header / New Trip

顶部：

```text
我的旅行                    [+ 新建旅程]
管理行程、预订与收藏
```

`+ 新建旅程` 必须前往：

```text
/start?entry=step3
```

不得改成 `/start` Step 1，不创建 `/start/step3`，不修改 Start Flow，不提前创建真实 Trip。

---

# 9. Tab Semantics

- **全部**：未来旅行优先 + 最近编辑旅行；有未来 Trip 时显示 Next Trip Hero。
- **即将出发**：未来有效 Trip；默认 `出发时间近 → 远`。
- **草稿**：有可恢复 Planner State 语义但尚未形成稳定正式计划；只用 fixture 表达。
- **历史**：已结束 Trip，按年份分组。
- **收藏**：行程 / 景点 / 住宿 / 餐饮 / 活动；收藏 != Reservation。

---

# 10. Search / Filter / Sort

Search 至少支持：

```text
行程名称
目的地
```

Destination Filter 实现冻结布局中的 `目的地 ▼`，选项只从 fixture 已有目的地派生，不建立全球目的地 Master Data。

Sort 支持：

```text
最近编辑
最近创建
出发时间近 → 远
出发时间远 → 近
```

默认建议：全部=最近编辑；即将出发=近→远；草稿=最近编辑；历史=最近结束。

---

# 11. Next Trip Hero

在 `全部 / 即将出发` 存在未来 Trip 时显示，至少包含：

```text
Trip 名称
日期
天数 / 晚数
同行人数
预订完成度
住宿 / 门票 / 餐饮 / 交通摘要
需要处理数量
主 CTA
```

允许使用类似冻结设计的京都 fixture。Hero 不展开完整订单，Partner 不成为标题；Reservation 数据仅为 view fixture。

当前没有稳定动态 Trip Detail route，因此：

```text
继续规划 → /planner
```

作为明确 Mock bridge。若显示“查看旅行”，也只能使用已有 `/planner` bridge，并在 Result 写：

```text
Trip detail routing: deferred to A Trip Contract / route integration
```

禁止自行发明 `/trip/:id`、`/trips/:id`。

---

# 12. Trip Card

Trip Card 必须表达 `行程状态 + 预订执行状态摘要`，至少包括：

```text
封面
Trip 名称
日期
天数 / 晚数
同行人数
预订完成度
预订分类摘要
待处理状态
主要 CTA
更多菜单
```

允许展示的状态文案：

```text
✓ 预订完整
N 项待确认
N 项订单冲突
N 项同步失败
N 项尚未预订
退款处理中
```

这些全部是 UI fixture，不是正式 Reservation 枚举。

---

# 13. Draft UI

草稿卡显示：

```text
目的地 / 日期（若已有）
最后编辑时间
规划完成度
已关联 Reservation 数量
继续规划
删除草稿
```

`继续规划 → /planner`，仅 Mock bridge。

删除只作用于页面 in-memory fixture。

若草稿存在有效外部 Reservation，必须显示冻结警告：

```text
此草稿包含已导入的外部预订。

删除 TravelAssist 草稿不会取消合作伙伴订单。

[取消]
[仅删除草稿]
```

禁止模拟取消 Partner 订单或退款。

---

# 14. History UI

历史按年份分组，例如 `2027 / 2026 / 2025`。

卡片操作：

```text
查看回顾
复制旅行
收藏 / 取消收藏
```

历史数据必须体现 Snapshot 语义。

`查看回顾`：使用页面内只读 Drawer / Modal / Sheet 展示 fixture snapshot，不新建服务器 route。

`复制旅行`：允许 in-memory clone 成新的 Draft fixture，并可切到草稿 Tab；原历史 Trip 必须保持不变，不写 Planner / DB。

---

# 15. Favorites UI

收藏二级筛选严格为：

```text
[全部] [行程] [景点] [住宿] [餐饮] [活动]
```

收藏卡至少显示：图片/icon、名称、类型、目的地/摘要、收藏状态。

真实可操作：`查看详情 / 取消收藏`。

设计中的 `加入行程 / 查看价格 / 预约` 若显示，必须遵守：

- 加入行程只产生 page-local UI feedback，不写 Planner；
- 没有 Provider Contract 时价格/预约必须 disabled / deferred；
- 不允许 fake Booking success。

---

# 16. Empty States

No Trips：

```text
还没有旅行

开始规划下一次旅程，
TravelAssist 会把行程、预订和收藏统一保存在这里。

[+ 新建旅程]
```

CTA → `/start?entry=step3`。

No Drafts：`没有未完成的草稿`

No History：`完成旅行后，它会出现在这里。`

No Favorites：

```text
看到喜欢的旅行或地点时，
点击 ♡ 就可以在这里找到。
```

统一 Loading / Skeleton / Error / Offline / Permission 留给 WBS 5.20。

---

# 17. Data Boundary

允许建立 UI-only：

```text
TripLibraryViewModel
TripCardViewModel
DraftTripViewModel
HistoryTripViewModel
FavoriteViewModel
ReservationSummaryViewModel
```

它们不是 `5.18 / 5.19 / 4.17` 的正式 Schema / Contract。

数据来源只能：fixture + React state + pure helpers。

禁止 Supabase / DB / ORM / API / Route Handler write / localStorage / Cookie / Session / fake persistence。

Result 必须明确：

```text
Persistence: Mock / in-memory only
Trip Data Model 5.18: Not implemented
Trip Save/Read Contract 5.19: Not implemented
A Trip Plan Contract: Not integrated
Reservation Hub: Not implemented
```

---

# 18. Reservation Boundary

Trip Library 可以显示 `预订完成度 / 分类计数 / 待处理数量` fixture，但 5.10 不实现：

```text
Reservation Hub
导入已有预订
Booking / Agoda 账户连接
确认邮件识别
PDF 上传
订单号导入
Voucher / QR
Partner API
订单同步
退款写入
```

不新增订单中心一级入口。

---

# 19. TASK-010-B Compatibility

必须保留：

```text
Personal Center Logo → /
Trips 新建旅行 → /start?entry=step3
```

不得把 Step 3 链接回退为普通 `/start`。TASK-010-B 只做回归，不修改其 Task 文件。

---

# 20. Local Asset Auto-discovery

开始前先 `git status --short --untracked-files=all`，再扫描 `assets/** / public/** / 仓库根目录用户新增图片`，格式 png/jpg/jpeg/webp/svg；排除 node_modules/.git/.next/coverage/docs/evidence/docs/qa。

优先寻找 Trip Hero / Trip Card / Favorite 主题照片。可在语义合适时复用：

```text
public/media/personal-center/hero-kyoto-sakura.webp
```

规则：旅行 Hero / Card 优先真实旅行照片；缺图不阻塞；不得联网下载、删除用户原图或编造版权。

来源未知的本地素材在 Result 写：

```text
Provenance: user-provided local asset
Production license review: pending if source metadata unavailable
```

新增 runtime 素材建议：`public/media/personal-center/trips/**`。

---

# 21. Visual Style

继承 Personal Center 方案 D：暖米白、极浅和纸感、低饱和樱粉/珊瑚朱红、深蓝黑正文、浅粉边框、柔和阴影、大圆角。

Trip Hero / Card 应像旅行资产，不像后台数据表。Partner 品牌仅次级来源标签。

---

# 22. Responsive

遵守 1.29：

- ≥1280：Tabs + Search/Filter/Sort + Hero + Trip Grid。
- 1024–1279：Compact Rail；搜索合理换行；Trip Grid 2列。
- 768–1023：Tablet Drawer Shell；Trip Grid 2列或单列。
- <768：标题 + 新建旅程；五 Tab 容器可横向滚动；搜索单行，筛选/排序第二行；Hero 图片在上、状态在下、继续旅行全宽；Trip Card 单列；Bottom Nav 不被覆盖。

必须 QA：

```text
1920×1080
1440×900
1280×720
1024×768
768×1024
390×844
320×740
```

允许 Tab 容器自身横向滚动，但禁止 document 横向溢出。

---

# 23. Accessibility

必须：五主 Tab 正确 selection 语义；Search 有 label；Filter/Sort accessible name；More menu 键盘可操作；Dialog/Drawer 有 title；Esc、focus trap、focus return；删除风险不只靠红色；收藏状态不只靠颜色；Mobile 点击目标 ≥44px。

---

# 24. Recommended Structure

```text
src/features/trip-library/
├─ trip-library-page.tsx
├─ trip-library-model.ts
├─ trip-library-data.ts
├─ trip-library.module.css
└─ components/
   ├─ trip-library-tabs.tsx
   ├─ trip-library-toolbar.tsx
   ├─ next-trip-hero.tsx
   ├─ trip-card.tsx
   ├─ draft-card.tsx
   ├─ history-group.tsx
   ├─ favorite-card.tsx
   ├─ favorite-filter.tsx
   ├─ delete-draft-dialog.tsx
   └─ history-recap-dialog.tsx
```

Pure logic / fixture 尽量 React-independent，以便未来替换为 5.18 / 5.19 数据。

---

# 25. Allowed / Avoid Files

主要允许：

```text
src/app/(account)/personal-center/trips/**
src/features/trip-library/**
public/media/personal-center/trips/**
tests/*5-10*
docs/tasks/TASK-WBS-5.10-b-trip-library-ui.md
docs/tasks/RESULT-WBS-5.10-b-trip-library-ui.md
docs/evidence/WBS-5.10-B/**
docs/project/WBS-TravelAssist.md
```

默认禁止：

```text
src/features/planner/**
src/features/map/**
src/features/start-flow/**
src/features/preferences/**
src/features/companions/**
src/features/profile/**
src/app/planner/**
src/app/start/**
package.json
package-lock.json
.github/workflows/**
```

默认也不要修改 Personal Center shared Shell / Sidebar / Avatar Popover，除非有阻塞性、最小可证明 bug。

---

# 26. Explicit Out of Scope

不得提前实现：5.18、5.19、4.17、4.19、8.1、Reservation Hub、Booking Integration、真实 Favorites API、真实 Trip 删除/复制 API。

不得把 UI fixture 宣称为真实保存数据。

---

# 27. Unit Tests

至少覆盖：

1. 五个 Tab 存在且顺序固定；
2. 全部 / 即将出发 / 草稿 / 历史 / 收藏过滤；
3. Search 按名称与目的地；
4. Destination filter；
5. 最近编辑、出发近→远、远→近排序；
6. Hero 只在适用 Tab 出现；
7. Draft 普通删除；
8. 有外部 Reservation 的 Draft 显示冻结警告；
9. Draft delete 不产生 Partner cancellation；
10. History 年份分组；
11. History clone 生成 Draft 且不改原 Snapshot；
12. Favorite toggle；
13. Favorite category filter；
14. New Trip href 严格 `/start?entry=step3`；
15. no localStorage / Cookie / network write；
16. Reservation Summary 仅 view fixture；
17. Empty state 文案与 CTA。

---

# 28. Browser QA

主路径 `/personal-center/trips`。

必须测试：

- All：Hero、cards、Search、Destination、Sort、More、Continue `/planner`、New Trip Step 3。
- Upcoming：Hero、departure sort、cards。
- Draft：continue、delete、external reservation warning、cancel/confirm。
- History：year group、recap、copy trip、favorite。
- Favorites：全部/行程/景点/住宿/餐饮/活动、详情、取消收藏、deferred actions 不伪造成功。

回归：

```text
/personal-center
/personal-center/preferences
/personal-center/companions
/personal-center/account
/start
/start?entry=step3
/planner
```

以及 Sidebar / Avatar Popover。

要求：无 hydration error、React warning、blocking console error、新增 404、图片 decode error；所有修改只在页面内存，无 POST/PUT/PATCH/DELETE，无 localStorage/Cookie。

---

# 29. WBS 5.20 Boundary

5.10 只实现本页正常态、本页必需 Empty State、本页基础响应式。

统一 Loading / Skeleton / Error / Offline / Permission 与全 Personal Center responsive QA 收尾仍属于 WBS 5.20；5.10 完成不得把 5.20 标为完成。

---

# 30. Validation

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

全仓历史 Prettier baseline 只记录，不越界修复；当前 5.10 owned files targeted format 必须 Passed。

---

# 31. Git / PR

提交前：

```bash
git status
git diff --name-only
git diff --check
```

禁止 `git add .`、`git clean -fd`、`git reset --hard`、force push。

建议：

```bash
git commit -m "feat(WBS-5.10-B): implement trip library UI"
git push -u origin feature/b-account-wbs-5-10-trip-library-ui
```

PR：`feat(WBS-5.10-B): implement trip library UI`，base `develop`。

仓库可能自动建 PR / 自动合并。不得修改 workflow、不得主动开启 auto-merge。

代码完成或自动合入但用户未验收：WBS/Task=`待审查`，Issue Open。只有 develop 已含代码 + 用户验收通过，才可 WBS/Task=`已完成`、Issue Closed。

---

# 32. Required Final Result

创建：`docs/tasks/RESULT-WBS-5.10-b-trip-library-ui.md`

至少返回：

```md
# WBS-5.10-B Result

## Status

## Preflight

- origin/develop base:
- dependency 1.27:
- dependency 5.1:
- TASK-010-B navigation subset detected:
- duplicate full 5.10 Task:
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

## Trip Library

- placeholder replaced:
- tabs:
- search:
- destination filter:
- sort:
- new trip route:

## Next Trip Hero

- shown on:
- trip summary:
- booking completion:
- attention summary:
- planner bridge:

## Trip Cards

- trip status:
- reservation summary:
- partner branding boundary:
- more menu:

## Drafts

- continue planning:
- normal delete:
- external reservation warning:
- partner cancellation triggered:

## History

- year grouping:
- recap:
- copy trip:
- original snapshot mutated:
- favorite toggle:

## Favorites

- category filters:
- view detail:
- remove favorite:
- add-to-trip behavior:
- booking / price behavior:

## State Boundary

- Persistence:
- Trip Data Model 5.18:
- Trip Save/Read Contract 5.19:
- A Trip Plan Contract:
- Reservation Hub:
- localStorage / Cookie:
- network writes:

## Local Assets

- scan roots:
- candidates:
- selected:
- runtime paths:
- provenance:

## Empty States

- no trips:
- no drafts:
- no history:
- no favorites:

## Responsive

- 1920×1080:
- 1440×900:
- 1280×720:
- 1024×768:
- 768×1024:
- 390×844:
- 320×740:
- horizontal overflow:

## Regression

- Personal Home:
- Preferences:
- Companions:
- Account:
- Start:
- Start Step 3:
- Planner:
- Avatar Popover / Sidebar:

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
- TASK-010-B modified:
- Other B Task modified:
- Planner modified:
- Start business modified:
- 5.18 / 5.19 implemented:
- 5.20 marked complete:
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

Stop. Do not automatically start WBS 5.18 / 5.19 / 5.20.
```

---

# 33. Stop Rule

完成后停止。禁止自动开始 5.18 / 5.19 / 5.20，禁止接真实 Trip 数据、DB、Reservation Hub、Booking、修改 Planner / Start；用户验收前禁止关闭 Issue 或把 WBS 5.10 标为已完成。
