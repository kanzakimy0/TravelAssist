# WBS-5.10-B-FOLLOWUP-1 — Personal Center 旅行状态判定与大屏布局优化

## Metadata

- Task ID: `WBS-5.10-B-FOLLOWUP-1`
- Primary WBS: `5.10`
- Related Completed WBS: `5.1 / 5.4 / 5.6 / 5.10 / 5.20`
- Owner: `B`
- Status: `待审查`
- Repository: `https://github.com/kanzakimy0/TravelAssist.git`
- Workspace: `F:\TravelAssist`
- Base Branch: `develop`
- Authoring Base: `553b01480345a4e26bd2b7952cf917b2cbbaea4f` or newer
- Issue: `#193`
- Implementation Branch: `fix/b-personal-center-trip-status-large-screen-polish`
- Result File: `docs/tasks/RESULT-WBS-5.10-b-personal-center-trip-status-large-screen-followup.md`

> 本 Task 是用户验收后的增量优化。5.1 / 5.4 / 5.6 / 5.10 / 5.20 均保持“已完成”，不得重新打开或改写历史 Task。

## 1. Objective

优化已经完成的：

```text
/personal-center
/personal-center/trips
/personal-center/companions
/personal-center/account
```

本轮只做两类改动：

1. 我的首页 + 我的旅行：统一旅行时间状态判定，并重排“全部旅行”。
2. 同行人 + 账户：Wide Desktop 视觉平衡优化。

不做 5.3，不接 Auth / DB / API / Planner Contract。

## 2. Source of Truth

执行前读取最新 `develop`：

```text
docs/project/WBS-TravelAssist.md
docs/ui/personal-center.md
docs/ui/trip-library.md
docs/ui/companion-management.md
docs/ui/profile-account.md
docs/ui/personal-center-responsive-states.md
src/features/personal-center/components/personal-home-preview.tsx
src/features/trip-library/trip-library-page.tsx
src/features/trip-library/trip-library-model.ts
src/features/trip-library/trip-library-data.ts
src/features/trip-library/trip-library.module.css
src/features/companions/companion-center.tsx
src/features/companions/companion-center.module.css
src/features/profile/profile-account.tsx
src/features/profile/profile-account.module.css
```

用户本轮确认规则优先于旧设计中与本轮冲突的显示规则。

## 3. Preflight

```bash
cd F:\TravelAssist
git status --short --untracked-files=all
git fetch --all --prune
git switch develop
git pull --ff-only origin develop
git log -1 --oneline
gh issue view 193
gh pr list --state all --search "trip status large screen"
git branch -a | findstr /I "trip-status large-screen"
```

禁止 `git clean -fd`、`git reset --hard`、force push、`git add .`。保留用户未追踪文件。

## 4. Tracking

本 Follow-up 独立追踪：`Ready → 进行中 → 待审查 → 已完成`。

Parent WBS `5.1 / 5.4 / 5.6 / 5.10 / 5.20` 始终保持已完成，不因 Follow-up 开发重新标记。

> 禁止覆盖、删除、重写其他 Owner 的 Task 文件；只允许更新当前 Task ID 对应文件。涉及其他 Task 时只能读取、引用和报告差异。

## 5. Shared Trip Timing Classification

我的首页与我的旅行必须使用同一套 React-independent pure helper，未来便于迁移/复用到 Mobile App。建议新增：

```text
src/features/trip-library/trip-timing.ts
```

函数接受显式 `startDate / endDate / today`，测试不得依赖不可控系统时间。

冻结规则：

```text
距离出发 > 30 天
→ next
→ UI：下一次旅行

距离出发 >= 2 天 且 <= 30 天
→ upcoming
→ UI：即将出发

距离出发 < 2 天，并且 endDate 尚未结束
→ ongoing
→ UI：旅行进行中

endDate 已早于 today
→ completed
→ UI：已完成 / 历史
```

边界必须测试：31 天、30 天、2 天、1 天、当天、已开始未结束、已结束。

当前无正式 Trip timezone Contract。本 Task 使用 date-only / explicit `today` 算法，不冻结 DB timezone schema，不新增日期库依赖。

## 6. Hero Selection

我的首页和我的旅行顶部重点卡使用同一优先级：

```text
旅行进行中 > 即将出发 > 下一次旅行
```

同状态内按 `startDate` 最近者优先。顶部最多一张 Hero。

Hero 标题动态为：

```text
旅行进行中
即将出发
下一次旅行
```

草稿永远不得成为顶部 Hero，即使草稿有日期。

## 7. Personal Home

`/personal-center` 不再硬编码 Hero 永远是“下一次旅行”。必须复用 timing helper。

首页仍保持轻量结构：

```text
Hero
+ 最多 3 张我的旅行预览
+ 更多功能
```

预览卡使用同一 timing status label；不要把首页改成完整 Trip Library，不增加草稿管理动作。

CTA 暂继续使用当前 `/planner` Mock bridge，不接真实 Trip Contract。

## 8. Trip Library Hero

`/personal-center/trips` 顶部 Hero：

- 只从正式 Trip 选择；
- 草稿不得出现；
- 已结束 Trip 不进入 Hero；
- 使用第 6 节优先级；
- Hero 已展示的 Trip 在下面“全部旅行”中不得重复。

## 9. All Tab — 全部旅行

当前“进行中的旅行”改名：

```text
全部旅行
```

Eyebrow 可从 `ACTIVE TRIPS` 改为 `ALL TRIPS`。

### 9.1 内容

`全部` Tab 的“全部旅行”卡区包含：

```text
正式 Trip + Draft
```

不包含 History / Favorites。历史仍保留独立最近完成区域和 History Tab。

### 9.2 Hero 排除

Hero 已展示的正式 Trip 不得在下面重复。Draft 从不进入 Hero。

### 9.3 8 卡槽位

“全部旅行”每页最多显示 8 张实际卡片。少于 8 条显示实际数量；超过 8 条必须有可访问分页或“查看更多”，不得静默丢弃第 9 条以后数据。

### 9.4 默认排序

`全部` Tab 默认改为：

```text
日期近 → 远
```

正式 Trip 使用 `startDate`。

Draft 可以增加 presentation-only `startDate?: string`：

- 有日期 Draft 与正式 Trip 一起按日期近→远；
- 无日期 Draft 排在所有有日期项目后；
- 多个无日期 Draft 按 `updatedAt` 最近→最远；
- 禁止从 `dateLabel` 文本解析日期。

### 9.5 Draft card

All Tab 中 Draft 必须明显标记：

```text
草稿
规划完成度
最后编辑时间
```

视觉尺寸尽量与 Trip Card 属于同一 Grid 体系，但不能让用户误认成正式保存 Trip。Draft 独立 Tab 原有继续编辑、删除、外部订单警告保持不变。

## 10. Upcoming Tab

`即将出发` Tab 严格使用 timing `upcoming`，即 2–30 天。>30 天的“下一次旅行”不属于该 Tab；`ongoing` 通过 Hero / All 显示，不新增“进行中”一级 Tab。

## 11. Companion Wide Desktop Polish

用户反馈同行人在大屏幕下过散。只做视觉布局，不改业务。

`>=1440px`：

- 页面内容建议控制在约 `1180–1240px` 并居中；
- Summary Card 左=总人数，中=成人/儿童/幼儿/长者，右=添加/组合，减少大片空白；
- Companion cards Wide Desktop 优先 3 列，卡片尺寸稳定；
- 常用组合 / 特殊需求 lower grid 保持两栏，约 60/40 或视觉等价；
- 两栏顶部对齐，不出现右侧孤立小卡；
- 不破坏 Tablet / Mobile Drawer/Sheet 行为。

禁止修改年龄层、Self 不可删除、需求标签、组合验证、Save/Delete/Unsaved Guard 等业务规则。

## 12. Account Wide Desktop Polish

用户反馈账户页在大屏幕下不协调。只改版式密度，不改字段/逻辑。

`>=1440px`：

- 主内容建议控制在约 `1180–1240px` 并居中；
- Profile 维持视觉主区；Contact + Basic Settings 为次级列；
- 推荐主次比例约 `7–8 / 12` : `4–5 / 12`；
- 避免两栏接近 1:1 后产生空洞感；
- Emergency Contact 与底部三个 Account Entry 保持全宽下层；
- Account Entry 3 卡保持紧凑，不拉成超宽条；
- 编辑/只读切换不应明显 layout jump。

禁止修改 Profile fields、联系方式、基本设置字段、紧急联系人规则、Security/Privacy/Booking-sync 路由、Save/Cancel/Validation。

## 13. Data Boundary

仍为 Mock / in-memory only。允许 pure timing helper、fixture extension、presentation state、CSS 调整。

禁止：Supabase / DB / ORM / API / localStorage / Cookie / Session / Planner write / Start Flow modification / Auth。

## 14. Allowed / Avoid

主要允许：

```text
src/features/trip-library/**
src/features/personal-center/components/personal-home-preview.tsx
src/features/personal-center/personal-center.module.css   # 仅必要 Home layout
src/features/companions/companion-center.module.css
src/features/profile/profile-account.module.css
tests/*trip-status*
tests/*personal-center-followup*
docs/tasks/RESULT-WBS-5.10-b-personal-center-trip-status-large-screen-followup.md
docs/evidence/WBS-5.10-B-FOLLOWUP-1/**
```

默认不需要改 `companion-center.tsx` / `profile-account.tsx`，除非仅添加最小 wrapper/className 且不改变业务。

禁止：

```text
src/features/planner/**
src/features/map/**
src/features/start-flow/**
src/app/planner/**
src/app/start/**
src/features/preferences/**
package.json
package-lock.json
.github/workflows/**
```

## 15. Tests

至少覆盖：

1. 31 天 → next
2. 30 天 → upcoming
3. 2 天 → upcoming
4. 1 天 → ongoing
5. 当天 → ongoing
6. 已开始未结束 → ongoing
7. 已结束 → completed
8. Draft 不参与 Hero
9. Hero priority ongoing > upcoming > next
10. 同状态选择最近 startDate
11. All 包含正式 Trip
12. All 包含 Draft
13. All 不包含 History/Favorites
14. Hero Trip 从 8 卡区排除
15. 最多 8 卡/页
16. > 8 不静默丢失
17. 有日期按日期近→远
18. 无日期 Draft 放后
19. 无日期 Draft 按 updatedAt desc
20. Draft Tab 删除逻辑保持
21. History clone 保持
22. Favorites 保持
23. no DB/API/localStorage/Cookie

## 16. Browser QA

必须测试：

```text
/personal-center
/personal-center/trips
/personal-center/companions
/personal-center/account
```

视口：

```text
2560×1440
1920×1080
1600×900
1440×900
1280×720
1024×768
768×1024
390×844
320×740
```

重点：

- 2560/1920 Companion/Account 不再横向发散；
- Home/Trips Hero status 正确；
- Draft 不进入 Hero；
- All 标题为“全部旅行”；
- All 含 Draft；
- Hero Trip 不重复；
- 8-card behavior；
- Mobile 不回归；
- no document horizontal overflow。

## 17. Validation

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

全仓历史 format baseline 只记录，不越界修复；当前 Follow-up owned files targeted format 必须通过。

## 18. Git Safety

```bash
git switch -c fix/b-personal-center-trip-status-large-screen-polish
```

提交前：

```bash
git status
git diff --name-only
git diff --check
```

禁止 `git add .`、`git clean -fd`、`git reset --hard`、force push。

建议：

```bash
git commit -m "fix: refine personal center trip status and wide layouts"
git push -u origin fix/b-personal-center-trip-status-large-screen-polish
```

PR Title：`fix: refine personal center trip status and wide layouts`，Base=`develop`，Issue=`#193`。

## 19. Status Rule

实现完成、用户未验收：

```text
Follow-up = 待审查
Issue #193 = Open
Parent WBS = 保持已完成
```

只有用户验收后：

```text
Follow-up = 已完成
Issue #193 = Closed
```

## 20. Required Result

生成：

```text
docs/tasks/RESULT-WBS-5.10-b-personal-center-trip-status-large-screen-followup.md
```

Result 至少报告：Preflight、Trip Timing、Home、Trip Library、Companion Wide Layout、Account Wide Layout、Data Boundary、9 个视口 QA、Validation、Ownership Safety、Git、Problems。

## 21. Stop Rule

完成后停止。不要自动开始 5.3 / 5.18 / 5.19，不修改 Planner/Auth，不重开已完成 WBS。
