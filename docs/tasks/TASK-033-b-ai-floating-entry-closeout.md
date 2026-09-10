# TASK-033-B — WBS 3.5 AI 悬浮入口正式收口

## Metadata

- Task ID: `TASK-033-B`
- WBS: `3.5`
- Canonical Owner: **B**
- Responsibility: Main Travel System / Website Entry / AI Shell（用户明确指定 B 的单项例外）
- Priority: `P1`
- Status: `待审查`
- GitHub Issue: `#263`
- Suggested Branch: `feature/b-wbs-3-5-ai-floating-entry`
- Result File: `docs/tasks/RESULT-TASK-033-b-ai-floating-entry-closeout.md`
- Owner Correction: `docs/project/WBS-3.5-owner-correction.md`
- Depends On: `3.1 completed`, `3.3 completed`, `3.4 completed`

---

## 1. Objective

正式收口 WBS 3.5「AI 悬浮入口」。

本任务只完成 **AI 入口与前端 Shell**，不接真实 AI 后端。

目标：

```text
主系统页面
  ↓
AI 悬浮入口
  ↓
点击 / Enter / Space
  ↓
打开 AI 前端面板
  ↓
明确显示“AI 服务尚未接入”
  ↓
× / Escape / backdrop 关闭
  ↓
焦点返回入口
```

当前 `develop` 已存在 Home 侧 AI Shell，因此必须先审计现有实现，只补真实缺口，不为制造 diff 重写已正确代码。

---

## 2. Current Implementation Facts To Audit First

执行前必须审计最新实际代码，至少包括：

- `src/features/home/components/home-ai-assistant.tsx`
- `src/features/home/components/ai-entry-button.tsx`
- `src/features/home/components/ai-entry-button.module.css`
- `src/features/home/components/ai-conversation-panel.tsx`
- `src/features/home/components/ai-conversation-panel.module.css`
- `src/components/ui/floating-panel*`
- Home / Start / Planner / Detail 当前 Main Shell / Header / fixed overlay / safe-area 实现

当前已知 `develop` 基线已有：

- fixed AI 入口；
- `aria-controls` / `aria-expanded`；
- 点击打开；
- Escape 关闭；
- backdrop 关闭；
- 打开后焦点进入关闭按钮；
- 关闭后焦点返回入口；
- desktop floating panel；
- mobile 响应式 panel；
- reduced-motion 禁用进入动画；
- textarea；
- disabled “发送”按钮；
- “AI 服务将在后续接入”提示。

如果这些在最新 `origin/develop` 已正确满足本 Task，允许 **运行时代码零改动，仅补测试 / QA / tracking**。

---

## 3. Preflight — Mandatory

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
git show origin/develop:docs/project/WBS-3.5-owner-correction.md
git show origin/develop:docs/tasks/TASK-033-b-ai-floating-entry-closeout.md
```

并确认：

```text
3.1 = 已完成
3.3 = B / 已完成
3.4 = B / 已完成
```

如果 3.3 或 3.4 回退为未合并 / 未完成，停止并返回 Blocked，不从历史 feature 分支叠加开发。

---

## 4. Start Tracking

Gate 通过后：

1. 从最新 `origin/develop` 创建：

```text
feature/b-wbs-3-5-ai-floating-entry
```

2. 安全更新最新 Master WBS：
   - `3.5 Owner = B`
   - `3.5 Status = 进行中`
   - 保留 3.1 / 3.2 / 3.3 / 3.4 已完成
   - 保留 3.2.1 = A / Deferred
   - 不修改 3.7 / 6.x Owner 或状态
3. 更新 Issue #263 execution base / branch。

---

## 5. Functional Scope

### 5.1 AI Entry

必须保证：

- 使用真实 `<button>`；
- 可鼠标、触摸、键盘激活；
- `aria-label` 清楚；
- `aria-controls` 指向唯一真实 panel id；
- `aria-expanded` 与打开状态同步；
- Focus ring 可见；
- 触控目标至少 44×44 CSS px；
- desktop / tablet / mobile 均在安全区域；
- 支持 `env(safe-area-inset-*)` 场景，不贴住刘海 / Home Indicator；
- 不被 Header、Footer、CTA、Account、Planner 右栏、Detail 底栏等遮挡。

### 5.2 Open / Close / Focus

必须验证：

- 点击入口只打开一个 panel；
- 重复点击不会创建重复 panel；
- 打开后焦点进入面板中的合理首要操作；
- `Escape` 关闭；
- `×` 关闭；
- backdrop 点击关闭；
- 关闭后焦点回到原 AI 入口；
- 打开/关闭不改变当前 URL / history；
- 不清空 Start 草稿或 Planner 本地状态；
- 不触发非必要网络写请求。

### 5.3 Panel Presentation

Desktop：

- 使用当前 TravelAssist 暖白 / 珊瑚 / 深墨品牌语言；
- 作为 floating panel，不占据主页面布局流；
- 不推动 Hero / Planner / Detail 几何。

Mobile：

- 使用当前 responsive panel / bottom-sheet-like 边界；
- 不出现横向溢出；
- 不超出 `100svh`；
- 键盘可聚焦 textarea / close；
- panel 可滚动时页面底层不得造成不可控滚动或误触。

不得为了 3.5 重新设计首页、Header 或 Planner。

### 5.4 Explicit Non-Live AI State

3.5 必须明确告诉用户 AI 后端尚未接入。

允许：

- textarea 可输入；
- disabled Send；
- placeholder / note；
- fixture-only visual copy。

禁止：

- 假装 AI 已成功回复；
- fake streaming；
- 随机 hard-coded AI answer；
- 本地规则伪装成真实 AI；
- 保存聊天历史。

如果 Send 保持 disabled，应保证 accessible name 明确说明不可用原因。

---

## 6. Page Boundary / Regression

本 Task 不要求为了“全局”强行把 Home 专用组件复制到每一个页面。

必须先审计当前产品结构：

- Home：AI 入口是 3.5 正式主入口，必须完成。
- Start / Planner / Detail：主要要求验证本任务改动不遮挡、不破坏几何和主流程。
- 只有最新已验收设计 / 实际 Main Shell 明确要求这些页面也显示同一 AI 悬浮入口时，才以最小共享适配接入；不得自行扩展为全站聊天系统。

无论是否显示入口，都必须回归：

- `/`
- `/start`
- `/planner`
- `/planner?view=detail&day=1` 或最新真实 Detail URL

至少确认：

- 无横向溢出；
- fixed 层级无冲突；
- CTA / Login / Avatar / Planner 操作仍可点击；
- Header / 地图 / 右栏 / 时间轴 / Detail 底栏几何无非预期变化。

---

## 7. Accessibility / Responsive Acceptance

至少覆盖：

```text
1440×900
1024×768
390×844
320×568
```

Home 至少验证：

- pointer open/close；
- Tab 到入口；
- Enter / Space；
- Escape；
- focus return；
- `aria-expanded` true/false；
- `aria-controls` target exists；
- textarea label；
- disabled send reason；
- reduced-motion；
- no overflow；
- CTA / account / footer / AI 互不遮挡。

如果可行，额外模拟 safe-area inset 或窄屏地址栏变化。

---

## 8. No AI Backend — Hard Boundary

本 Task **不得**实施：

- OpenAI / ChatGPT / 其他 LLM API；
- API key / Secret；
- `/api/ai` Route；
- Prompt / System Prompt；
- message persistence；
- streaming；
- token/cost accounting；
- AI读取用户偏好；
- AI生成初始行程；
- AI修改 Planner；
- Agent / Tool / Function calling；
- Engine ChangeSet；
- 会员次数限制；
- AI会话历史。

这些属于 WBS 6.x / 其他后续 Task。

---

## 9. Out Of Scope

- 3.2.1 动态首页视频；
- 3.7 全局 Loading / Empty / Error；
- 6.x AI 业务；
- Auth / Profile / Personal Center 新功能；
- Planner / Detail 功能重构；
- Map / Route / POI；
- Booking / Payment；
- DB / Migration；
- 新字体 / 新 UI framework / 新动画库。

---

## 10. Tests / QA

必须至少新增或补齐 TASK-033-B 专项测试，真实覆盖当前 TSX / DOM 行为，而不是只 grep 字符串。

建议覆盖：

1. AI Entry button 语义与 ARIA contract。
2. 单 panel 打开 / 关闭状态。
3. Escape + focus restore。
4. disabled Send + non-live copy。
5. reduced-motion / mobile safe layout。
6. 无 AI API / mutation request。
7. Home visual / main pages geometry regression。

浏览器 QA 建议输出：

```text
docs/qa/TASK-033/
```

至少包含 README + machine-readable report；截图可保留本地并记录路径 / SHA-256，不要求把大量二进制截图提交到 Git。

---

## 11. Validation

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present
git diff --check
```

如仓库无 `npm test` script，运行真实全仓 Node tests，例如：

```bash
node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs
```

另运行 TASK-033-B 专项测试。

如全仓存在与 execution base 完全相同的既有失败：

- 必须在未修改基线上复现；
- 如实记录；
- 不伪报全绿；
- 不在本 Task 越界修复。

---

## 12. Deliverables

根据真实缺口交付：

- 必要的 AI Entry / Shell 最小源码修正（允许 0 runtime diff）；
- TASK-033-B 专项测试；
- 浏览器 QA / evidence；
- `docs/tasks/RESULT-TASK-033-b-ai-floating-entry-closeout.md`；
- Master WBS 同步；
- Issue #263 同步；
- Draft PR → `develop`。

---

## 13. Status Rule

- 正式启动：`3.5 = B / 进行中`
- 实现 / 审计 / QA 完成但 PR 未合并：`3.5 = B / 待审查`
- 只有用户验收通过 + PR 合入 develop：`3.5 = B / 已完成`

不得因为现有 Home AI Shell 已存在就直接把 WBS 标为完成；仍需专项测试、浏览器 QA、Result 和追踪收口。

---

## 14. Git Safety / Conflict Guard

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

必须：

- 从执行时最新 `origin/develop` 开始；
- 不覆盖其他 A/B Task / Result / WBS；
- WBS 冲突逐段解决，禁止整份 ours / theirs；
- 不删除或覆盖用户未提交内容；
- 如果已有其他 AI/Home 同文件 PR 正在进行，先判断冲突，必要时 Blocked，不并行踩同一文件。

---

## 15. Result Format

Result 至少包含：

```md
# TASK-033-B Result

## Status
## Preflight
## Tracking
## Existing Implementation Audit
## AI Entry
## Open / Close / Focus
## Responsive / Accessibility
## Main Page Regression
## Validation
## Problems / Deferred
## WBS Updated
## Ready For Review
```

完成后停止，不自动启动 3.7 或任何 6.x AI Task。


## Execution Result — 2026-09-10

- Execution base：0f7955ae62e04aeacf43f56dcacf2a9249582e96；Gate PASS；Owner B；feature/b-wbs-3-5-ai-floating-entry；Issue #263。
- 实现 / 测试提交 79f899b4228e62f1ad7c9a3d755b3805fa36e99f；仅两份 AI CSS 最小修正，无新增运行时 TSX / AI 后端。
- ci / lint / typecheck / build / diff-check、专项 4/4、AI browser 18/18、主页面 16 组对照通过。全仓 721/724；基线 717/720，同三项资产失败，详见 Result。
- Result：[RESULT-TASK-033-b-ai-floating-entry-closeout.md](RESULT-TASK-033-b-ai-floating-entry-closeout.md)；[QA](../qa/TASK-033/README.md)。
- Draft PR 发布后登记；3.5 B / 待审查，等待用户视觉验收，不自动合并，不启动 3.7 / 6.x。
