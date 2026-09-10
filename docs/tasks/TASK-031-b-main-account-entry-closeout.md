# TASK-031-B — WBS 3.4 主系统登录按钮 / 头像入口正式收口

## Metadata

- Task ID: `TASK-031-B`
- WBS: `3.4`
- Owner: `B`
- Responsibility: `Main Travel System / Auth Entry`
- Priority: `P1`
- Status: `待审查`
- GitHub Issue: `#261`
- Task File: `docs/tasks/TASK-031-b-main-account-entry-closeout.md`
- Codex Launcher: `docs/tasks/CODEX-TASK-031-b-main-account-entry-closeout.md`
- Suggested Branch: `feature/b-wbs-3-4-main-account-entry`
- Depends On: `3.1`, `5.3`
- Owner Correction: `docs/project/WBS-3.4-owner-correction.md`

---

# 1. Objective

正式收口主旅行系统中的登录按钮 / 已登录头像入口。

本 Task 不重新开发认证系统，而是把 B 已完成的 Auth / Session / Personal Center 能力稳定接到 Home / Start / Planner / Trip Detail 的主系统入口中。

目标状态：

```text
Guest
→ 显示真实登录入口 / 受保护个人中心入口按现有 Guard 处理

Signed-in
→ 显示可信 Session 派生的真实名称 / Avatar
→ 可进入 Personal Center

Expired / invalid session
→ 安全回退 Guest
→ 不残留伪登录 UI
```

---

# 2. Source of Truth

优先级：

1. 最新 `origin/develop`
2. `docs/project/WBS-3.4-owner-correction.md`
3. 已完成的 WBS `5.3` Auth User Flow / WBS `8.3` Authentication Core
4. 已验收的 WBS `3.1` / `3.2`
5. TASK-030-B / WBS 3.3 合并后的入口行为
6. 本 Task

不得根据旧截图或旧 Task 恢复伪登录、Cookie claim 信任或第二套 Avatar 逻辑。

---

# 3. Mandatory Integration Gate

TASK-031-B 实施前必须检查：

- PR `#273` 是否已合入 `develop`
- WBS `3.3` 是否完成最终收口

如果 PR #273 仍 Open / Draft / 未合并：

```text
Status: Blocked
Reason: TASK-030-B / WBS 3.3 has not been integrated into develop.
```

此时：

- 不从 `feature/b-wbs-3-3-main-entry` 继续开发
- 不 cherry-pick #273
- 不创建叠加 PR
- 不并行修改 Home / Main Shell 重叠文件
- 记录 Result / Issue 后停止

只有 #273 合并后，才从届时最新 `origin/develop` 创建本 Task 分支。

---

# 4. Current Repository Facts — Must Re-check

Task 创建时已确认：

- Home 通过 `readHomeViewer()` 读取可信用户状态。
- `homeViewerFromVerifiedUser()` 只接受 `auth.getUser()` 返回的用户元数据，不信任 Cookie claims。
- Home 已存在 `HomeAccountLink` / Login 入口。
- `MainHeader` 是共享 Header / Brand 来源。
- `HeroStartButton` 已独立完成 3.3，不属于本 Task。

Codex 必须重新检查 Start / Planner / Detail 当前 Header / Workspace adapters 的真实实现，不得假设它们已完成 3.4。

---

# 5. Required Behavior

## 5.1 Guest

- 主旅行规划流程不得被强制登录阻塞。
- Home / Start / Planner / Detail 需要账户入口的位置，按当前已冻结布局显示真实 Guest / Login 行为。
- Login 入口进入现有 `/login`。
- 需要登录后回原页面时必须使用安全 `returnTo`。
- 不得伪造用户名或 Avatar。

## 5.2 Signed-in

- 只能消费可信的服务端用户验证结果。
- 显示现有 Profile / user metadata 能安全提供的名称和 Avatar。
- Avatar URL 必须沿用现有安全校验；无有效 Avatar 时使用 shared neutral avatar。
- 点击账户入口应进入既有 Personal Center / 账户菜单逻辑，不复制第二套菜单。

## 5.3 Invalid / Expired Session

- 不能因为 Cookie 中存在旧字段就继续显示已登录 UI。
- `auth.getUser()` / 当前可信认证 helper 无有效用户时，必须退回 Guest。
- 页面不能 hydration mismatch、闪出错误用户、死循环重定向或黑屏。

## 5.4 Logout Boundary

- 不重写 Logout 实现。
- 使用 B/Auth 已有退出流程。
- 退出后返回主系统时应显示 Guest UI。
- Back / Forward 不应恢复已失效的伪登录显示。

---

# 6. Page Scope

至少审计并验证：

```text
/
/start
/planner
/planner?view=detail&day=1
```

## Home

- 保持 3.2 已验收视觉。
- 保持当前账户胶囊 / Header account action 的视觉语言。
- 只修身份状态或导航真实缺口。

## Start

- 不重做 Wizard。
- 账户入口不得遮挡 Step 内容或改变 Wizard 几何。
- Guest / Signed-in 行为与 Home 一致。

## Planner / Detail

- 地图、右栏、底栏、时间轴几何必须保持。
- 若增加/补齐账户入口，优先复用现有 workspace/header adapter。
- 不为了账户入口增加传统大 Navbar。
- 小屏不得遮挡地图关键控件、底栏或返回入口。

---

# 7. returnTo Contract

必须验证：

```text
Guest on Home    → Login → Home
Guest on Start   → Login → Start
Guest on Planner → Login → Planner
Guest on Detail  → Login → same Detail URL
```

要求：

- `returnTo` 只允许项目内安全路径。
- 不接受外部 URL / scheme / protocol-relative open redirect。
- query 需要保留时应保留，例如 Detail 的 `view=detail&day=1`。
- 登录成功后的浏览器历史不能形成明显 redirect loop。

如果现有 Auth 已正确处理，不重写。

---

# 8. Visual / Interaction Rules

继续使用 TASK-024 / 025.2 已冻结品牌体系：

- shared BrandLogo
- shared AccountAvatar
- 暖白 / 珊瑚色
- 圆角 / 边框 / 阴影 / focus ring

禁止：

- 第二套 Header
- 第二套 Avatar component
- 第二套账户菜单
- 重新设计 Home Hero
- 大范围 shared token 重构

账户入口至少满足：

- 44px 可点击区域
- Tab 可达
- Focus 可见
- accessible name 明确
- Avatar 装饰图不产生重复读屏名称

---

# 9. Tests

至少补/复用专项测试覆盖：

1. Guest 不显示伪用户名 / 伪 Avatar。
2. Verified user 显示可信名称。
3. Cookie claim 与 verified user 冲突时，以 verified user 为准。
4. Invalid / expired session → Guest。
5. unsafe avatar URL → neutral avatar。
6. Login `returnTo` 对 Home / Start / Planner / Detail 正确。
7. open redirect 输入被拒绝或归一化。
8. Personal Center 导航正确。
9. Logout 后主系统恢复 Guest。
10. 不产生第二套 Header / Avatar / Auth helper。

不得删除或弱化现有 TASK-018 / WBS-5.3 / TASK-024 / TASK-025.2 / TASK-030 覆盖。

---

# 10. Browser QA

至少：

```text
1440×900
1024×768
390×844
320×568
```

覆盖 Guest + Signed-in；能模拟 invalid session 时增加 invalid/expired。

验证：

- Home
- Start
- Planner
- Detail
- Login returnTo
- Personal Center
- Logout → Guest
- Back / Forward
- Tab / Enter / Escape（如有菜单）
- 无横向溢出
- 无 console / hydration error

若真实外部 OAuth / 邮件 / SMS 不可用，可继续使用仓库已有本地可信 Auth fixture；不得声称线上 Provider 已验收。

---

# 11. Geometry Guard

必须比较修改前后：

- Home 已验收 Hero / CTA / Account geometry
- Start Wizard 内容区域
- Planner 地图 / 右栏 / 底栏
- Detail 地图 / 详情 / 时间轴
- Personal Center Shell

除账户入口必要适配外，不允许结构性变化。

---

# 12. Validation

执行：

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present
git diff --check
```

若无 npm test script：

```bash
node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs
```

并运行 TASK-031-B 专项测试。

任何全仓失败必须与最新未修改 execution base 比对；只允许明确证明为既有 baseline 的失败继续交付，不得伪报全绿。

---

# 13. Git / Tracking

开始前：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Gate 通过后从最新 `origin/develop` 创建：

```text
feature/b-wbs-3-4-main-account-entry
```

并安全更新最新 Master WBS：

```text
3.4 Owner = B
3.4 Status = 进行中
```

实现 / QA 完成但未合并：

```text
3.4 = 待审查
```

只有用户验收通过且 PR 合入 develop：

```text
3.4 = 已完成
```

Result：

```text
docs/tasks/RESULT-TASK-031-b-main-account-entry-closeout.md
```

必须同步：

- Task
- Result
- Master WBS
- Issue #261
- Branch
- Commit
- Draft PR

---

# 14. Out of Scope

不得实施：

- Auth Core 重写
- 新注册 / 找回密码业务
- OAuth / SMS / Email Provider 新接入
- Profile Schema / Migration
- Personal Center 重设计
- 3.5 AI
- 3.7 全局 Loading / Error
- Planner / Map / Route / POI / Booking / Engine 新业务
- 3.2.1 视频
- 会员 / 支付

---

# 15. Git Safety

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

WBS 冲突逐段解决，禁止整份 ours / theirs。

---

# 16. Stop Rule

TASK-031-B 完成后停止。

不要自动开始：

- WBS 3.5
- WBS 3.7
- 其他后续 Task

等待用户验收。


## Execution Result — 2026-09-10

- Gate PASS：PR #273 与最终收尾 #277 均已进入 develop；执行基线 7f0c292186079cca7ad639ceb550f7d0e4f43cc7。此前 Gate Blocked 原始记录保留在 Result。
- 实现提交 18dd0bbcbef1b77717f3898a68a0c5598b59e77b；分支 feature/b-wbs-3-4-main-account-entry；Issue #261；[Draft PR #278](https://github.com/kanzakimy0/TravelAssist/pull/278) → develop，保持 Draft。
- Result：[RESULT-TASK-031-b-main-account-entry-closeout.md](RESULT-TASK-031-b-main-account-entry-closeout.md)。
- ci / lint / typecheck / build / diff-check 通过；专项 4/4；全仓 718/720（基线 714/716，同两项旧资产清单失败）。浏览器 64/64，36 组几何一致；证据 [TASK-031 QA](../qa/TASK-031/README.md)。
- B / 待审查，用户视觉验收通过；未合并，不启动 3.5 / 3.7。

## 用户验收记录

2026-09-10 用户明确回复“验收通过”；已验收 PR head：64e8d55fcab3e468474bf4a19c7e8ddfba2409a5。视觉验收通过；本次仅记录验收，不修改运行时代码，不自动合并。PR #278 保持 Draft，WBS 3.4 B / 待审查，等待单独合并授权；两项既有资产 baseline failures 保持原记录。
