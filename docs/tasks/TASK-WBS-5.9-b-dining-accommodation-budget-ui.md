# WBS-5.9-B — 餐饮 / 住宿 / 预算偏好 UI

## Metadata

- Task ID: `WBS-5.9-B`
- WBS ID: `5.9`
- Owner: `B`
- Responsibility: `Personal Center / Preferences`
- Priority: `P1`
- Status: `已完成（用户验收通过；问题后续独立修正）`
- Depends On: `5.5`
- Dependency State: `5.5 = 已完成`
- Repository: `https://github.com/kanzakimy0/TravelAssist.git`
- Workspace: `F:\TravelAssist`
- Base Branch: `develop`
- Implementation Branch: `feature/b-account-wbs-5-9-dining-accommodation-budget-ui`
- Proposed Issue: `[WBS 5.9][B] 餐饮 / 住宿 / 预算偏好 UI`
- GitHub Issue: `#138`
- Implementation Commit: `060289fdb1d4c4f93eac4bfb7f50f46dc54ecd2e`
- Pull Request: `#140（已合入 develop）`
- Merge Commit: `3abde3df75735bb7cedda363514024a0b51d6528`
- Acceptance: `2026-09-06 用户验收通过；已知问题后续以独立 Task 修正`
- Task File: `docs/tasks/TASK-WBS-5.9-b-dining-accommodation-budget-ui.md`
- Result File: `docs/tasks/RESULT-WBS-5.9-b-dining-accommodation-budget-ui.md`

---

## 1. Goal

把以下三个通用分类壳升级为正式长期偏好页面：

- `/personal-center/preferences/dining`
- `/personal-center/preferences/accommodation`
- `/personal-center/preferences/budget`

本 Task 只实现 UI / View Model / in-memory Save，不实现 Schema、API、DB、Planner Contract、餐厅/酒店搜索或具体 Trip 金额。

---

## 2. Source of Truth

执行前读取最新 `develop`：

- `docs/project/WBS-TravelAssist.md`
- `docs/ui/preference-center.md`
- `docs/preferences/preference-system.md`
- `docs/ui/personal-center.md`
- `docs/ui/personal-center-shell.md`
- `docs/ui/personal-center-responsive-states.md`
- `docs/development/task-tracking.md`
- `src/features/preferences/preference-center.tsx`
- `src/features/preferences/preference-model.ts`
- `src/features/preferences/preference-category-page.tsx`
- `src/features/preferences/mobility-preference-page.tsx`
- `src/features/preferences/attraction-activity-preference-page.tsx`
- `src/app/(account)/personal-center/preferences/[category]/page.tsx`

优先级：用户最新决定 > 冻结设计 > 已合入 5.5/5.7/5.8 UI > 当前通用壳 > Codex 推导。

---

## 3. Dependency / Preflight

WBS 5.9 正式依赖只有 `5.5`。必须确认 `5.5 = 已完成`。

5.8 即使仍待审查也不阻塞 5.9；5.9 必须从最新 `origin/develop` 开始，不得从 5.8 分支派生。

```bash
cd F:\TravelAssist
git status --short --untracked-files=all
git branch --show-current
git fetch --all --prune
git switch develop
git pull --ff-only origin develop
git log -1 --oneline
gh issue list --state all --search "WBS 5.9" --limit 30
gh pr list --state all --search "WBS 5.9" --limit 30
git branch -a | findstr /I "5-9 dining accommodation budget"
```

禁止 `git clean -fd`、`git reset --hard`、force push。保留用户未追踪素材。

---

## 4. Tracking

如无等价 Issue，创建：

`[WBS 5.9][B] 餐饮 / 住宿 / 预算偏好 UI`

实现分支：

```bash
git switch -c feature/b-account-wbs-5-9-dining-accommodation-budget-ui
```

正式开始：

- WBS 5.9 = `进行中`
- Task = `进行中`
- Issue = Open

只允许修改 5.9 自己的 WBS/Tracking。

> 禁止覆盖、删除、重写其他 Owner 的 Task 文件；只允许更新当前 Task ID 对应文件。涉及其他 Task 时只能读取、引用和报告差异。

---

## 5. Route Boundary

当前已有：

- `mobility` → WBS 5.7
- `attractions` → WBS 5.8

5.9 只新增：

- `dining`
- `accommodation`
- `budget`

`experience` 与 `advanced` 继续保持通用壳。

不得修改 5.7 / 5.8 页面代码和状态。

---

## 6. Shared UI Rules

三个页面统一：

当前摘要 → 少量快速设置 → 边界说明 → `[恢复默认] [取消] [保存偏好]`

所有可操作项都是 `Presentation-only UI Fixture / View Model`，不得宣称为 Preference Schema、Master Data、DB Enum、API Contract 或 Planner Weight。

统一状态模型：

- `saved`
- `draft`

Save：`saved = clone(draft)`，仅页面内存并显示 `✓ 已保存`。  
Cancel：`draft = clone(saved)`。  
Restore：恢复当前页 UI fixture，只改 draft。

当 `draft != saved` 时，必须保护返回旅行偏好、Sidebar、Avatar Popover、beforeunload，优先复用 `usePersonalNavigationGuard` / `GuardedLink`。

禁止用 `localStorage` / Cookie / fake API / global mutable singleton 做跨路由同步。Result 写：`Overview cross-route synchronization: deferred`。

---

## 7. Dining Page

设计已明确摘要示例：

`当地料理 · 小店 · 排队接受中等`

未来可考虑菜系、预算、用餐时间、排队容忍度、儿童友好、特殊饮食，但详细枚举尚未冻结。

### Required controls

1. 当地料理倾向：presentation-only 三段式，例如 `优先 / 一般 / 不特别`
2. 小店倾向：presentation-only 三段式，例如 `喜欢 / 一般 / 不特别`
3. 排队接受度：因为现有摘要已有“中等”，允许 UI-only `较低 / 中等 / 较高`

必须在代码/Result 明确：这些不是正式业务枚举。

禁止正式实现完整菜系列表、固定用餐时段规则、儿童友好业务规则、过敏原数据库或特殊饮食 Schema。

实时摘要最多 3 项；无明确倾向时显示 `还没有明显的餐饮偏好`。

---

## 8. Accommodation Page

已明确摘要：

`交通方便 · 舒适 · 少换酒店`

至少实现三个长期倾向：

1. 交通便利
2. 舒适度
3. 少换酒店

每项使用 presentation-only 三段式，例如 `重视 / 一般 / 不特别`。

说明：

- 交通便利：重视住宿区域与交通节点/行程区域的便利性。
- 舒适度：只表达整体舒适偏好，不等价于星级、房间面积、床型。
- 少换酒店：多日行程更倾向减少住宿更换次数。

星级、房型、住宿预算、品牌、设施详细枚举尚未冻结，不得正式实现。

实时摘要最多 3 项；无明显倾向时显示 `还没有明显的住宿偏好`。

---

## 9. Budget Page

长期预算偏好已明确只表达：

- 总体消费倾向
- 更愿意把预算分配在哪些方面

首页摘要示例：

`中等预算 · 更愿意花在住宿和体验`

具体旅行预算属于具体 Trip，本页禁止精确总金额、每日金额或货币输入。

### Required controls

1. 总体消费倾向：UI-only 三段式 `较节省 / 中等 / 较宽松`（或同义自然语言），默认 fixture 可为 `中等`
2. `更愿意花在住宿`：独立 toggle
3. `更愿意花在体验`：独立 toggle

当前不要擅自增加交通、购物、餐饮、机票、纪念品等正式预算分配类别。

Summary 示例：

- `中等预算 · 更愿意花在住宿和体验`
- `中等预算 · 更愿意花在住宿`
- `中等预算`

禁止显示具体金额。

---

## 10. Candidate Details — Not Frozen

不得在本 Task 冻结为正式业务枚举：

### Dining

菜系、餐饮预算、用餐时间、儿童友好、特殊饮食明细

### Accommodation

星级、房型、住宿预算、品牌、设施

### Budget

更多分配类别、精确金额、货币、按日预算

允许页面显示一句低优先级说明：`更多详细偏好将在 Preference Schema / Master Data 冻结后继续开放。`

不要堆 disabled 假控件。

---

## 11. Assets

自动扫描：

```powershell
Get-ChildItem -Path . -Recurse -File -Include *.png,*.jpg,*.jpeg,*.webp,*.svg |
  Where-Object {
    $_.FullName -notmatch '\\(node_modules|\.git|\.next|coverage|docs\\evidence|docs\\qa)\\'
  } |
  Select-Object FullName, Length, LastWriteTime
```

优先复用已有：

- `/media/personal-center/preferences/category-dining.png`
- `/media/personal-center/preferences/category-accommodation.webp`
- `/media/personal-center/preferences/category-budget.png`

不要求写实，缺图不阻塞。不得联网找图、编造授权或删除用户原始素材。

---

## 12. Visual / Accessibility

继承 5.5 / 5.7 / 5.8：
暖米白、珊瑚朱红、樱粉、低对比度、大圆角、浅边框、轻阴影。

不要做成后台表格。

必须验证：

- 标题层级
- radio/segmented 可访问语义
- selected state 不只靠颜色
- Tab / Shift+Tab
- Focus visible
- toggle 键盘操作
- 触摸目标足够
- Action bar 顺序自然

---

## 13. Recommended Code

建议：

```text
src/features/preferences/
├─ dining-preference-page.tsx
├─ dining-preference-model.ts
├─ accommodation-preference-page.tsx
├─ accommodation-preference-model.ts
├─ budget-preference-page.tsx
├─ budget-preference-model.ts
├─ lifestyle-preference.module.css
└─ components/
```

允许 5.9 内部共享小组件，但不要重构 5.7 / 5.8。

主要允许：

- `src/app/(account)/personal-center/preferences/[category]/page.tsx`
- `src/features/preferences/dining-*`
- `src/features/preferences/accommodation-*`
- `src/features/preferences/budget-*`
- `src/features/preferences/*5-9-shared*`
- `tests/*5-9*`
- 当前 Task / Result / evidence / WBS 5.9

默认禁止：

- `src/features/preferences/mobility-preference-*`
- `src/features/preferences/attraction-activity-preference-*`
- Planner / Map / Home / Start / Profile / Companions
- Personal Center shared Shell
- `package.json` / lockfile
- `.github/workflows/**`

---

## 14. Explicit Out of Scope

禁止提前实现：

- WBS 5.10
- WBS 5.11 Preference Schema
- WBS 5.13 Preset
- WBS 5.14 Planner Contract
- WBS 5.16 Persistence API
- Supabase / DB / ORM / API
- localStorage / Cookie / Session
- Planner write
- 餐厅/酒店搜索、Booking API
- 具体 Trip 预算金额
- Recommendation weight
- 正式 Master Data

Result 必须写：

- `Persistence: Mock / in-memory only`
- `Formal Preference Schema: Not implemented`
- `Planner Contract: Not implemented`

---

## 15. Tests

至少覆盖：

### Dining

1. 默认 fixture
2. 当地料理倾向
3. 小店倾向
4. 排队接受度
5. summary
6. 无明显偏好

### Accommodation

7. 交通便利
8. 舒适度
9. 少换酒店
10. summary

### Budget

11. 总体消费倾向
12. 住宿分配 toggle
13. 体验分配 toggle
14. 两者同时开启
15. summary 不含具体金额

### Shared

16. Save
17. Cancel
18. Restore
19. dirty detection
20. in-memory only
21. 不产生 Trip temporary state
22. 未冻结候选项没有进入正式状态模型

---

## 16. Browser / Responsive QA

完整测试：

- `/personal-center/preferences/dining`
- `/personal-center/preferences/accommodation`
- `/personal-center/preferences/budget`

每页测试修改、Save、Cancel、Restore、返回、Sidebar、Avatar Popover、beforeunload。

回归：

- Preference Overview
- Mobility 5.7
- Attractions 5.8
- Experience shell
- Advanced shell
- Companions
- Account

视口：

- 1920×1080
- 1440×900
- 1280×720
- 390×844
- 320×740

三页都必须 `no horizontal overflow`，无 hydration error、React warning、blocking console error、新增 404；Save 无 POST/PUT/PATCH/DELETE。

---

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

全仓历史 Prettier baseline 只记录，不越界修复；当前 5.9 owned files targeted format 必须 Passed。

---

## 18. Commit / PR / Status

提交前：

```bash
git status
git diff --name-only
git diff --check
```

禁止 `git add .`。

建议：

```bash
git commit -m "feat(WBS-5.9-B): implement dining accommodation budget preferences"
git push -u origin feature/b-account-wbs-5-9-dining-accommodation-budget-ui
```

PR：
`feat(WBS-5.9-B): implement dining accommodation budget preferences`
Base：`develop`

仓库存在 feature push 自动建 PR / 自动合并。不得修改 workflow，也不得主动开启 auto-merge。

如果自动合入但用户未验收：

- WBS 5.9 = `待审查`
- Task = `待审查`
- Issue = Open

只有代码进入 develop + 用户验收通过后：

- WBS 5.9 = `已完成`
- Task = `已完成`
- Issue = Closed

---

## 19. Required Result

创建 `docs/tasks/RESULT-WBS-5.9-b-dining-accommodation-budget-ui.md`，至少包含：

```md
# WBS-5.9-B Result

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

## Dining UI

- generic shell replaced:
- current summary:
- local cuisine:
- small shops:
- queue tolerance:
- unfrozen detailed enum added:

## Accommodation UI

- generic shell replaced:
- current summary:
- transport convenience:
- comfort:
- fewer hotel changes:
- star/room formal enum added:

## Budget UI

- generic shell replaced:
- overall spending tendency:
- accommodation allocation:
- experience allocation:
- exact Trip amount added:

## State Boundary

- Persistence:
- Formal Preference Schema:
- Planner Contract:
- localStorage / Cookie:
- network writes:
- overview cross-route synchronization:

## Save Flow

- Dining:
- Accommodation:
- Budget:
- Cancel:
- Restore:
- dirty detection:

## Local Asset Discovery

- scan roots:
- candidates found:
- dining selected:
- accommodation selected:
- budget selected:
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
- Attractions 5.8:
- Experience shell:
- Advanced shell:
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
- 5.7 changed:
- 5.8 changed:
- 5.10 / 5.11 / 5.16 implemented:
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

Stop. Do not automatically start WBS 5.10 / 5.11 / 5.16.
```

---

## 20. Stop Rule

完成后停止。禁止自动开始 5.10 / 5.11 / 5.16，禁止接 Planner、Schema、API、Booking、餐厅/酒店搜索或具体 Trip 金额；用户未验收前禁止关闭 Issue 或把 WBS 5.9 标记为已完成。
