# TASK-010-B v1.1 — 全页面 Logo 返回首页与剩余迁移闭环

## Metadata

- Task ID: `TASK-010-B`
- Revision: `v1.1 / 2026-09-06`
- Owner: `A+B / Shared Navigation`
  - A：只处理首页 Brand 的一文件窄范围修正，并复验主系统
  - B：处理 Personal Center Logo 与主流程入口
- Issue: `#79`
- Status: `Ready`
- Supersedes: 本文件 v1.0 未执行版本；**不创建重复 Personal Center 导航 Task**
- Depends On:
  - `TASK-010-A / Issue #78 / PR #101` 已合入 `develop`，依赖已满足
  - `TASK-011-A / Issue #86 / Draft PR #102` 独立进行；本 Task 不修改其 Planner 高冲突文件
- Design Source:
  - `docs/ui/navigation-flow.md` v1.2
  - `docs/ui/navigation-transition-audit-2026-09-06.md`
- Proposed Branch: `fix/shared-global-logo-navigation`
- Base Branch: `develop`
- Merge Policy: 建 Draft PR；不得自动 merge

---

## 1. Objective

完成当前可运行页面中剩余的导航缺口，并固化以下全局产品规则：

```text
所有页面中的 TravelAssist 产品 Logo / Brand
→ /
```

同时补齐 Personal Center 到 Start / Planner 的主流程出口。

本 Task 完成后：

- 首页 Logo 可点击并保持在 `/`；
- Start / Planner Logo 的既有 `/` 行为不回归；
- Personal Center Desktop 与 Mobile Logo 都返回 `/`；
- Personal Home 可继续当前规划或快速开始新旅行；
- Trips 占位页不再是导航死端；
- Account、Preferences、Companions 等 Personal Center 页面自动继承统一 Logo；
- 不伪造 Auth、Saved Trips、数据库或未开发页面；
- 不重复开发 TASK-011-A 的 Planner → Detail。

---

## 2. Why This Is a Revision, Not a New Duplicate Task

原 `TASK-010-B` / Issue #79 尚未执行，其核心缺口仍存在：

- Personal Center Logo 目标错误；
- Personal Home 继续规划 disabled；
- Personal Home 缺少开始新旅行；
- Trips placeholder 没有出口。

2026-09-06 新增决策要求首页自身 Logo 也必须是 `/` 链接。因此将原 Task 升级为 v1.1，并增加一个严格受限的 A 文件例外，而不是再建立一份与 Issue #79 重叠的新任务。

---

## 3. Current Audit Snapshot

### Already Complete on `develop`

- 首页 `让我们开始吧` → `/start`
- 首页个人中心 → `/personal-center`
- Start Logo → `/`
- Start 头像 → `/personal-center`
- `/start?entry=step3` → UI Step 3
- Start 方案 → `/planner`
- Planner Logo → `/`
- Planner `新建旅行` → `/start`
- Planner Personal Center → `/personal-center`
- Personal Center 五项一级导航
- Account 三个子入口
- Account 子页 `返回账户`

### Missing on `develop`

- 首页 TravelAssist Brand 仍是不可点击 `div`
- Personal Center Desktop Logo → `/personal-center`
- Personal Center Mobile Logo → `/personal-center`
- Personal Home Hero 主按钮 disabled
- Personal Home 没有 `开始新旅行`
- Trips 页面只有纯文字 placeholder
- Planner → Detail 未在 `develop`；Draft PR #102 独立等待合入

---

## 4. Scope A — Home Logo

允许修改：

```text
src/features/home/components/compact-header.tsx
src/features/home/components/compact-header.module.css   # 仅在 Link 默认样式需要复位时
```

要求：

1. 将首页 `Brand` 从不可点击容器改成真实链接：

   ```text
   TravelAssist Logo / Wordmark → /
   ```

2. 推荐可访问名称：

   ```text
   aria-label="TravelAssist 首页"
   ```

3. 保留当前 Logo 图形、文字、尺寸、位置、布局和视觉。
4. 不修改 Hero、背景、语言菜单、AI 面板。
5. 首页点击 Logo 后 URL 仍为 `/`；不创建额外页面。

---

## 5. Scope B — Personal Center Shared Logo

修改：

```text
src/features/personal-center/components/personal-sidebar.tsx
```

当前 Desktop 与 Compact Brand 都指向：

```text
/personal-center
```

全部改为：

```text
/
```

要求：

- Desktop Brand → `/`
- Mobile / Compact Brand → `/`
- `我的首页`仍 → `/personal-center`
- 继续使用 `GuardedLink`
- 未保存修改时必须触发现有 Navigation Guard
- 更新 `aria-label`，明确是返回 TravelAssist 产品首页
- 不新增“返回首页”文字菜单
- 不修改 Sidebar 插画和视觉布局

该共享改动应覆盖：

```text
/personal-center
/personal-center/trips
/personal-center/preferences
/personal-center/companions
/personal-center/account
/personal-center/account/security
/personal-center/account/privacy
/personal-center/account/booking-sync
```

---

## 6. Scope C — Personal Home Main Actions

修改：

```text
src/features/personal-center/components/personal-home-preview.tsx
src/features/personal-center/personal-center.module.css  # 仅动作布局所需
```

将当前 disabled Hero 动作调整为两个真实动作：

```text
继续规划 → /planner
开始新旅行 → /start?entry=step3
```

规则：

- `继续规划`作为当前 Mock 行程的主要动作；
- `开始新旅行`为次级动作；
- 明确标注当前行程为 Mock / 示例，不暗示 Saved Trip 已接入；
- 保留 `查看全部 → /personal-center/trips`；
- 保留旅行卡 → `/personal-center/trips`；
- `旅行灵感`与`目的地探索`仍可显示“即将开放”，不得创建假路由；
- `我的收藏`现阶段继续进入 Trips，不在本 Task 发明筛选 Contract。

---

## 7. Scope D — Trips Placeholder Exit

优先用可复用但不过度抽象的方式，为 Trips 占位页加入：

```text
开始新旅行 → /start?entry=step3
返回当前规划 → /planner
```

允许修改：

```text
src/app/(account)/personal-center/trips/page.tsx
src/features/personal-center/components/personal-placeholder.tsx
src/features/personal-center/personal-center.module.css
```

实现选择：

- 可以让 `PersonalPlaceholder`支持可选 actions；
- 或只在 Trips 页面建立一个专用轻量 Empty State；
- 不得迫使 Preferences / Companions 出现不适合它们的按钮。

文案必须说明：

- 真实 Saved Trips 尚未接入；
- 当前动作只是进入新建流程或返回当前 Mock 规划；
- 不伪造行程列表、数量、数据库保存状态。

---

## 8. Planner / Detail Conflict Guard

当前存在：

```text
TASK-011-A
Issue #86
Draft PR #102
branch: feature/a-planner-to-trip-detail-workspace
```

该 PR 修改 Planner 高冲突文件和 `tests/task-010-navigation.test.mjs`。

本 Task：

- **不得修改 `src/features/planner/**`**
- **不得修改 `src/app/planner/page.tsx`**
- **不得修改 `tests/task-010-navigation.test.mjs`**
- 不得 cherry-pick、重写或覆盖 PR #102
- 新增独立测试文件，例如：

  ```text
  tests/task-010-b-global-logo-navigation.test.mjs
  ```

若 PR #102 在本 Task 执行期间合入：

1. 安全同步最新 `origin/develop`；
2. 运行 Detail 路由 Logo 与返回 Planner 的回归；
3. 不把 TASK-011-A 的成果写成 TASK-010-B 自己实现。

若 PR #102 仍为 Draft / 未合入：

- Result 明确写 `Planner → Detail: Pending TASK-011-A`；
- TASK-010-B 可完成自身范围；
- 不把全产品迁移状态冒充为 100% 完成。

---

## 9. Tests

新增独立导航测试，至少覆盖：

### Static / Contract

- 首页 Brand 包含 `href="/"`。
- Start Brand 保持 `href="/"`。
- Planner Brand 保持 `href="/"`。
- Personal Center Desktop Brand 包含 `href="/"`。
- Personal Center Compact Brand 包含 `href="/"`。
- Personal Center `我的首页`仍为 `/personal-center`。
- Personal Home：
  - `继续规划` → `/planner`
  - `开始新旅行` → `/start?entry=step3`
- Trips：
  - `开始新旅行` → `/start?entry=step3`
  - `返回当前规划` → `/planner`
- Avatar Popover 不包含新增的“返回首页 / 返回 TravelAssist”项。
- 无无目标 `href="#"`。
- Auth 仍未被伪造启用。

### Browser QA

逐页点击可见 Logo 并确认最终 URL `/`：

```text
/
/start
/planner
/personal-center
/personal-center/trips
/personal-center/preferences
/personal-center/companions
/personal-center/account
/personal-center/account/security
/personal-center/account/privacy
/personal-center/account/booking-sync
```

Detail 路由：

```text
/planner?view=detail&day=1
```

只在 TASK-011-A 已合入当前基线时纳入通过项；否则记录为外部待合并项。

验证 Personal Home 与 Trips 的四个新动作，以及：

- Back / Forward；
- Keyboard Tab / Enter；
- focus-visible；
- 未保存 Guard；
- Desktop / Mobile Logo 可见；
- 无横向溢出；
- 控制台无新增 error / hydration error。

尺寸：

```text
1440×900
1024×768
390×844
320×740
```

---

## 10. Validation Commands

```bash
git fetch origin
git switch develop
git pull --ff-only origin develop
git status --short

npm ci
npm run lint
npm run typecheck
npm run test --if-present
npm run format:check
npm run build
git diff --check
```

如果全仓 `format:check`存在未由本 Task 引入的基线异常：

- 必须逐项与 `origin/develop`比较；
- 只允许记录真实基线；
- Task-owned 文件必须全部通过；
- 不得把 skipped 或基线失败写成 passed。

---

## 11. Non-goals

- Auth / Session / Logout
- Saved Trips backend / DB
- Profile Preference 自动预填
- Preferences / Companions 正文功能
- Trip Library 正式列表
- 旅行灵感 / 目的地探索
- Planner / Detail 功能开发
- Mapbox / Trip State / Route 重构
- 真实 AI / Weather / Traffic / Reservation Provider
- Partner Logo 跳转规则
- 视觉重做

---

## 12. Acceptance Criteria

- [ ] 首页 TravelAssist Logo / Wordmark 是 `Link → /`
- [ ] Start Logo 继续 `→ /`
- [ ] Planner Logo 继续 `→ /`
- [ ] Personal Center Desktop Logo `→ /`
- [ ] Personal Center Mobile / Compact Logo `→ /`
- [ ] Personal Center 所有当前子路由均继承该规则
- [ ] `我的首页`仍 `→ /personal-center`
- [ ] Personal Home `继续规划 → /planner`
- [ ] Personal Home `开始新旅行 → /start?entry=step3`
- [ ] Trips `开始新旅行 → /start?entry=step3`
- [ ] Trips `返回当前规划 → /planner`
- [ ] `/start?entry=step3`实测进入 UI Step 3
- [ ] Avatar Popover 没有重复首页入口
- [ ] Account 子入口和返回账户不回归
- [ ] 未保存 Guard 不回归
- [ ] 不修改 Planner / TASK-011-A 高冲突文件
- [ ] 新增独立导航测试
- [ ] Browser QA 覆盖四种尺寸
- [ ] lint / typecheck / tests / build / diff-check 通过
- [ ] Mock、disabled、外部待合并状态均诚实标注
- [ ] Result、Issue、WBS、Branch、Commit、PR 一致
- [ ] PR 保持 Draft，等待用户审查，不自动 merge

---

## 13. Tracking and Final Result

完成时创建：

```text
docs/tasks/RESULT-TASK-010-b-personal-center-navigation.md
```

Result 必须分开列出：

```text
Implemented by TASK-010-B v1.1
Verified existing navigation
Pending external task / PR
Not implemented / Non-goal
```

更新：

- Issue #79
- WBS Task 追踪
- Branch / Commit / Draft PR
- 验证命令与浏览器证据
- TASK-011-A / PR #102 当时的真实状态

完成后停止，不自动合并。
