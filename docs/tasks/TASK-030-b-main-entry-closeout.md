# TASK-030-B — WBS 3.3「让我们开始吧」主入口正式收口

## Metadata

- Task ID: `TASK-030-B`
- WBS: `3.3`
- Owner: `B`
- Responsibility: `Main Travel System / Website Entry`（用户明确指定 B 执行的单项例外）
- Priority: `P0`
- Status: `可开始`
- GitHub Issue: `#260`
- Suggested Branch: `feature/b-wbs-3-3-main-entry`
- Depends On: `3.1 completed`
- Owner Correction: `docs/project/WBS-3.3-owner-correction.md`
- Result File: `docs/tasks/RESULT-TASK-030-b-main-entry-closeout.md`

---

## 1. Objective

正式收口首页主 CTA：

```text
Home
→ 「让我们开始吧」
→ /start
→ 既有 Start Wizard
```

本 Task **不是重新设计首页，也不是重新开发 Step 1–5**。

最新 develop 已确认：`HeroStartButton` 当前已经通过 shared `ButtonLink` 使用 `href="/start"`。因此执行原则是：

> 先审计现状；已有正确行为就保留，只修真实缺口，并用测试、浏览器 QA 与追踪文档完成 WBS 3.3 的正式收口。

不得为了制造代码量而重写已正常工作的入口。

---

## 2. Preflight — Mandatory

开始前执行并记录：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

读取最新：

```bash
git show origin/develop:docs/project/WBS-TravelAssist.md
git show origin/develop:docs/project/WBS-3.3-owner-correction.md
git show origin/develop:docs/tasks/TASK-030-b-main-entry-closeout.md
```

并审计实际源码：

```text
src/features/home/components/hero-start-button.tsx
src/features/home/components/home-hero.tsx
src/components/ui/button.tsx
/start 当前真实路由及 Start Flow 入口
与首页 / Start 主流程有关的已有测试
```

### Git Safety

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

不得删除、覆盖或打包用户未提交工作。

---

## 3. Start Tracking

确认 `3.1 = 已完成` 后，从最新 `origin/develop` 创建：

```text
feature/b-wbs-3-3-main-entry
```

然后更新最新 Master WBS：

```text
3.3 Owner = B
3.3 Status = 进行中
```

必须保留其他 A/B 工作站最新记录。

WBS 冲突逐段解决，禁止整份 `ours` / `theirs`。

Issue #260 同步 execution base / branch。

---

## 4. Current Baseline To Preserve

当前已知入口实现：

```tsx
<ButtonLink href="/start" ...>
  让我们开始吧 →
</ButtonLink>
```

`ButtonLink` 使用 Next.js `Link`。

如果最新 develop 仍保持该结构且实际 QA 通过：

- 不改成 `onClick + router.push`；
- 不增加无意义 Client Component；
- 不新增 loading state；
- 不增加重复跳转保护代码；
- 不引入新依赖。

只有存在真实可复现问题时才修改运行时代码。

---

## 5. Required Behavior

### 5.1 Navigation

必须确认：

```text
/ 首页
→ 点击「让我们开始吧」
→ /start
```

要求：

- 目标 URL 正确；
- 不经过假页面；
- 不跳 Planner；
- 不自动创建 Trip；
- 不产生多余 query 参数；
- 不依赖 JavaScript 手工模拟普通导航。

### 5.2 Guest / Signed-in

主 CTA 是旅行规划入口，不是登录入口。

默认要求：

```text
Guest → /start
Signed-in → /start
```

除非最新已验收产品规则明确改变，否则：

- 不强制 Guest 先登录；
- 不把 CTA 改到 `/login`；
- 不改 B Auth Core；
- 不在本 Task 增加 Session 业务。

### 5.3 Browser History

验证：

```text
Home → Start → Back → Home
Home → Start → Back → Forward → Start
```

要求：

- URL 与页面一致；
- Home 返回后正常显示；
- Start 返回后无空白 / hydration error；
- 不产生重复 history entry 的明显异常。

### 5.4 Keyboard / Accessibility

确认：

- CTA 可 Tab 聚焦；
- `Enter` 激活进入 `/start`；
- Focus ring 可见；
- accessible name 包含「让我们开始吧」；
- `aria-describedby` 如保留，应指向真实存在且有意义的说明；
- 不用 `div role=button` 替代真实 Link。

### 5.5 Touch / Responsive

至少检查：

```text
1440×900
1024×768
390×844
320×568
```

要求：

- CTA 完整可见；
- 可点击区域足够；
- 不被 Footer / Account / AI / Header 遮挡；
- 无横向溢出；
- 320px 窄屏仍可进入 `/start`。

### 5.6 Repeated Activation

验证快速连续点击 / Enter 不产生明显异常。

因为这是普通 Link 导航：

- 如果不存在真实问题，**不要自行加入防抖 / disabled / spinner**；
- 只有可复现重复副作用时才做最小修复。

---

## 6. Main-flow Regression

必须至少回归：

```text
Home
→ Start
→ 既有 Wizard 可操作
→ 使用既有流程进入后续 Planner（按当前真实流程）
```

本 Task 只确认入口没有破坏现有主流程，不修改 Wizard / Planner 业务。

至少确认：

- `/start` 可正常渲染；
- Step 交互基线未回退；
- 已有草稿 / 当前状态策略未因本 Task 被清空；
- Planner 入口行为不因 3.3 修改而改变。

---

## 7. Visual Freeze

WBS 3.2 已完成并验收。

因此本 Task 原则上 **禁止修改首页视觉**：

- 背景；
- Header；
- Logo；
- Hero 布局；
- 标题 / 副标题；
- CTA 尺寸 / 颜色 / 圆角 /位置；
- Account 胶囊；
- Help；
- Footer；
- AI Entry。

如果发现无障碍或点击区域缺陷必须改 CSS：

1. 只做最小修复；
2. 在 Result 中说明原因；
3. 重新做首页五尺寸视觉对照；
4. 不借机重新设计。

---

## 8. Out of Scope

严禁顺手实施：

- WBS 3.2.1 视频背景；
- WBS 3.4 登录按钮 / Avatar 主系统完整实现；
- WBS 3.5 AI 悬浮入口新业务；
- WBS 3.7 Loading / Empty / Error 系统；
- Step 1–5 重设计；
- Planner UI / Store / Engine；
- Map / POI / Route Provider；
- AI API；
- Booking；
- DB / Schema / Migration；
- Personal Center 内部页面修改；
- 新依赖。

特别禁止为了本 Task 添加一个“进入 Start 的 loading 页面”。普通 Link 导航没有真实问题时，不需要制造额外中间状态。

---

## 9. Tests

至少新增或补齐 TASK-030-B 专项测试，覆盖：

1. `HeroStartButton` 真实目标为 `/start`；
2. 使用 shared Link/ButtonLink 语义；
3. 不指向 `/login` / `/planner`；
4. CTA accessible name；
5. Home 页面只保留一个主 Start CTA；
6. 不引入硬编码登录要求；
7. 现有主流程导航测试继续通过。

如果现有测试已完整覆盖，允许扩展现有测试而非重复建立平行测试。

不得删除或弱化已有 TASK-010 / TASK-024 / TASK-025.2 导航和视觉回归测试。

---

## 10. Validation

至少执行：

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present
git diff --check
```

如果没有 `npm test` script：

- 运行仓库真实 Node 全量测试；
- 运行 TASK-030-B 专项测试。

浏览器 QA 至少包括：

```text
1440×900
1024×768
390×844
320×568
```

覆盖：

- click；
- keyboard Enter；
- Back / Forward；
- Guest；
- 可用时的 signed-in fixture / existing auth test path；
- repeated activation；
- console / hydration error；
- horizontal overflow。

无法真实验证的能力写 `Deferred`，不得伪报 PASS。

---

## 11. Expected Deliverables

必须交付：

- 必要的最小源码修复（如果确有缺口）；
- TASK-030-B 专项测试；
- 必要 QA 报告；
- `docs/tasks/RESULT-TASK-030-b-main-entry-closeout.md`；
- 最新 Master WBS 中 3.3 Owner / Status / tracking 更新；
- Issue #260 更新；
- Draft PR → `develop`。

如果审计证明运行时代码完全正确，允许交付：

```text
0 或极少 runtime diff
+ 专项测试
+ browser QA
+ Result / WBS / Issue / PR
```

这是合法完成方式，不得为了“看起来做了功能”重写入口。

---

## 12. Status Rules

正式启动：

```text
WBS 3.3 = 进行中
```

审计 / 实现 / QA 完成但 PR 未合并：

```text
WBS 3.3 = 待审查
```

只有：

```text
用户验收通过
+
PR 合入 develop
```

才允许：

```text
WBS 3.3 = 已完成
```

Issue #260 在最终验收合并前保持 Open。

---

## 13. Result Format

```md
# TASK-030-B Result

## Status

## Preflight
- execution base:
- 3.1 dependency:
- owner correction:
- working tree safety:

## Tracking
- WBS 3.3:
- Issue: #260
- Branch:
- Commit:
- Draft PR:
- Result file:

## Existing Implementation Audit
- HeroStartButton:
- ButtonLink:
- runtime changes required: Yes / No

## Main Entry
- click → /start:
- keyboard:
- guest:
- signed-in:
- repeated activation:
- back / forward:

## Regression
- Home:
- Start Wizard:
- Planner handoff:
- visual freeze preserved:

## Validation
- npm ci:
- lint:
- typecheck:
- build:
- full tests:
- TASK-030 tests:
- browser QA:
- diff-check:

## Problems / Deferred

## WBS Updated
Yes / No

## Ready For Review
Yes / No
```

---

## 14. Stop Rule

完成 TASK-030-B 后停止。

不要自动开始：

- WBS 3.4
- WBS 3.5
- WBS 3.7
- 其他后续 Task
