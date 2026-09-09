# TASK-024-A — Global Main Layout / Header

## Metadata

- Task ID: `TASK-024-A`
- WBS: `3.1`
- Owner: `A`
- Responsibility: `Main Travel System`
- Priority: `P1`
- GitHub Issue: `#242`
- Task File: `docs/tasks/TASK-024-a-main-layout-header.md`
- Suggested implementation branch: `feature/a-main-layout-header`
- Depends On: `1.13`, `2.7`
- Execution base: **执行时必须重新读取最新 `origin/develop`，不得使用本 Task 创建时的旧 SHA 直接开发。**

## 1. Objective

完成 WBS 3.1「全局 Main Layout / Header」的正式工程整合，为后续网站入口与主旅行系统提供单一、稳定、可复用的 Main Shell。

本 Task 同时冻结一条新的全站视觉原则：

> **TravelAssist 网站首页、Start、Planner / Detail 与 Personal Center 必须属于同一套品牌视觉体系。风格统一，但页面结构允许按照使用场景不同。**

因此：

- 个人中心的 `Sidebar + Content` 不复制到主系统。
- 首页仍可保持沉浸式 Hero / 照片入口结构。
- Start 仍可保持聚焦输入的向导结构。
- Planner / Detail 仍可保持地图主导的全屏工作台结构。
- 但 Logo、品牌色、暖白表面、字体层级、圆角、边框、阴影、按钮、浮层、Avatar、Hover / Focus、留白节奏等必须表现为同一个 TravelAssist 产品。

本 Task **不是重新设计或重写 Header**。必须审计并复用已合入的 Header / Logo / Navigation 成果，只处理 WBS 3.1 的真实缺口。

---

## 2. Source of Truth Priority

发生冲突时按以下优先级执行：

1. 用户最新决定：**整体网站与个人主页保持同一套品牌视觉体系，结构不强行一致。**
2. 最新 `origin/develop` 中已经用户验收并合并的实际页面行为。
3. `docs/ui/personal-center-shell.md`：Personal Center 已冻结的 Shell / 品牌视觉语言。
4. Personal Center 当前已验收实现及其 shared primitives / CSS / tokens。
5. TASK-010-A / TASK-010-B 已合并的 Main Header / Navigation 行为。
6. 其他 Main System 设计文档与现有实现。

不得根据旧 PR、被否决设计或历史截图覆盖最新已验收成果。

---

## 3. Existing Work That Must Be Preserved

执行前必须确认并复用：

- `TASK-004-A`：网站首页既有视觉基础。
- `TASK-010-A`：主流程导航闭环。
- `TASK-010-B`：全局 Logo / Personal Center 导航子集。
- `/start`：Step 1–5 已有向导与响应式成果。
- `/planner` 与当前 Trip Detail：已有 Planner / Detail 工作区。
- `/personal-center`：B 已完成的 Personal Center Shell / Visual System。
- 已存在的 shared UI / token / navigation primitive。

**禁止建立第二套 Header、第二套 Logo、第二套 Avatar Menu 或平行的品牌 Token。**

如果现有 Shared UI 已足够，只做复用和最小补齐，不为了“重构得更漂亮”制造大范围 diff。

---

## 4. Personal Center → Global Brand Visual Contract

### 4.1 必须继承的品牌语言

主系统 Shell 应从已完成 Personal Center 继承以下视觉基因：

- 暖米白 / 象牙白作为主要中性表面。
- 深墨色作为主要正文 / 图标基色。
- 朱红 / 珊瑚红作为主要品牌强调色。
- 极浅暖粉 / 米粉用于 Hover、Active、轻强调层。
- 低饱和、低对比、克制的旅行产品气质。
- 卡片 / Popover / 控件使用大圆角体系。
- 轻量暖色描边与柔和阴影，禁止厚重黑色 Drop Shadow。
- 浮层、菜单、设置面板使用同一类暖白表面与阴影语言。
- Logo / Brand 呈现保持一致。
- Avatar / Account 入口的尺寸、圆形语言、Popover 视觉保持一致。
- Focus 必须可见，并与 Hover / Active 处于同一视觉体系。
- 真实旅行内容继续允许使用写实照片；装饰纹理不得压过业务内容。

### 4.2 统一不等于复制布局

不得把 Personal Center 的左 Sidebar 强行加入主系统。

页面允许如下结构差异：

```text
TravelAssist Brand System
├── Home        → 沉浸式入口 / Hero
├── Start       → 聚焦输入 / Wizard
├── Planner     → 地图主导 / 工作台
├── Trip Detail → 执行与确认工作区
└── Personal    → Sidebar + Content 管理空间
```

但用户跨页面时应明显感知：

```text
同一个 Logo
同一套品牌色
同一套表面材质
同一套圆角 / 边框 / 阴影逻辑
同一套按钮 / 浮层 / Avatar 语言
同一套字体与留白节奏
```

### 4.3 Planner / Map 例外

Planner / Detail 的地图必须继续是视觉主角，因此允许：

- 地图全宽 / 全高。
- Header 更轻或透明化。
- 浮层镶嵌在地图上。
- 右侧栏与底部时间轴使用工作台布局。

但这些控件的边框、圆角、表面、阴影、文字、按钮和交互反馈仍应符合 TravelAssist 统一品牌体系。

**不得为了统一风格破坏地图面积、时间轴、右栏或既有 Planner 几何。**

---

## 5. Preflight — Mandatory

开始修改前执行并记录：

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
git show origin/develop:docs/tasks/TASK-024-a-main-layout-header.md
git show origin/develop:docs/ui/personal-center-shell.md
```

并查找 / 读取：

```text
TASK-010-A
TASK-010-B
Personal Center 当前实际 Shell / CSS / shared primitives
Main Header / Logo / Avatar / shared token 实现
```

如文件名变化，使用搜索找到最新真实文件，不得因为路径不同跳过审计。

### Dependency Gate

执行时必须重新核对 WBS `1.13` 与 `2.7`。

- `2.7` 必须保持已完成。
- 对 `1.13`：如果仍处于待审查但其实际设计 / Token 已进入 develop，先记录真实状态并只使用已存在、已验收或本 Task 明确冻结的品牌规则。
- 不得自行宣称 `1.13` 已完成。
- 如果缺少足够的可执行视觉基线导致无法安全实现 3.1，返回 `Blocked`，不得自行发明 Design System。

### Git Safety

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

不得删除或覆盖用户未提交工作。

---

## 6. Start Tracking — Mandatory

确认可执行后：

1. 从最新 `origin/develop` 建立：

```text
feature/a-main-layout-header
```

2. 更新最新 WBS：
   - `3.1` → `进行中`
   - Owner 保持 `A`
   - 不改其他 Owner 的真实状态
3. Issue #242 记录 execution base / branch。
4. 不因 Task 已创建就提前标记 `3.1 = 已完成`。

---

## 7. Scope

### 7.1 Main Layout Boundary

建立或整理主旅行系统的单一 Layout 边界：

- 优先复用 Next.js App Router 现有 layout。
- 首页 / Start / Planner / Detail 的 Shell 责任清楚。
- Main Travel System 与 Personal Center 路由边界清楚。
- 不把 B 的 Sidebar 迁入 A 主系统。
- 不破坏 Planner 全屏地图与已有工作台结构。

### 7.2 Global Header Integration

必须保证：

- 单一 Header / Brand 来源。
- Logo 外观与 Personal Center 品牌一致。
- Logo 行为保持已有已验收导航。
- Header 的暖白 / 半透明 / 边框 / 阴影 / typography 与统一品牌体系协调。
- 首页 → Start → Planner → Detail 现有主流程不回退。
- 登录 / Avatar 只复用已有接线能力；完整 Auth Header 逻辑留给 WBS 3.4。
- 不复制或重建 B 的 Avatar Popover 业务逻辑。
- Header 与地图、右栏、底栏、浮层无 z-index 冲突。

### 7.3 Shared Shell / Visual Tokens

审计已有 shared tokens / CSS variables / primitives，并优先复用。

需要统一的最小集合至少包括：

- brand surface / page surface
- primary text / secondary text
- accent / subtle accent
- border
- shadow
- radius family
- focus ring
- header height / shell spacing
- overlay / popover surface

如果这些规则已存在，**不要再创建另一组同义 Token**。

如果必须补齐，只补最小缺口，并说明哪些由现有 Personal Center 提升为全站共享。

### 7.4 Layout Rhythm

主系统 Shell 必须与个人中心保持相近的视觉节奏：

- 主要容器边距有统一逻辑。
- 卡片之间间距有统一层级。
- 顶部操作区不拥挤。
- Header / Content 的视觉层级明确。
- 桌面、平板、手机缩放规律一致。
- 不出现某页极密、某页极松且无场景原因的情况。

### 7.5 Accessibility Baseline

至少保证：

- `header` / `nav` / `main` landmark 合理。
- Logo / 主导航键盘可达。
- Focus 可见。
- sticky / fixed Header 不遮挡焦点目标。
- 小屏关键入口可达。
- 不仅依靠颜色表达 Hover / Active / Focus。

### 7.6 Regression Tests

测试至少覆盖：

- Main Layout / Header 正确渲染。
- Logo / 主流程导航正确。
- Personal Center 不被错误套进 Main Layout。
- `/start` / `/planner` / Trip Detail 不回归。
- 既有 Auth / Personal Center 导航测试不得删除或弱化。
- 主系统与 Personal Center 共用视觉 Token / primitive 时，不出现循环依赖或模块越界。

---

## 8. Out of Scope

本 Task 不得顺手实施：

- WBS 3.2：首页动画背景的新业务开发。
- WBS 3.3：「让我们开始吧」新业务交互。
- WBS 3.4：完整 Auth / Session Header 逻辑。
- WBS 3.5：AI 悬浮入口。
- WBS 3.7：完整 Loading / Empty / Error 系统。
- Planner 功能重设计。
- Planner 几何 / 地图面积大改。
- Mapbox / Route / POI / AI / Booking / Engine 新业务。
- Personal Center IA / Sidebar / 页面业务重构。
- 新 DB Schema / Migration。
- 全仓无关格式清理。
- 为“统一风格”大规模重画已验收页面内容。

---

## 9. Conflict Guard

1. 必须从最新 `origin/develop` 启动。
2. 不覆盖其他 A/B 工作站最新 Task / Result / WBS。
3. WBS 冲突逐段合并，禁止整份 ours / theirs。
4. 保留 TASK-010-A/B 历史追踪。
5. 保留 B 已完成 Personal Center 功能状态。
6. 若共享 Token 修改影响 Personal Center，必须实际回归 Personal Center，不得只看主系统。
7. 不把“视觉统一”理解成 A 接管 B 页面。

---

## 10. Expected Deliverables

根据真实仓库结构，交付：

- Main Layout / Header 必要源码增量。
- 现有 shared brand / shell primitive 的最小整合。
- 如确有必要，补齐最小全站共享 Token；禁止平行 Design System。
- 3.1 专项测试。
- 浏览器视觉对照证据。
- `docs/tasks/RESULT-TASK-024-a-main-layout-header.md`
- 最新 WBS 更新。
- Issue #242 更新。
- Draft PR → `develop`。

如果审计证明代码已经基本满足 3.1，可以“小范围整合 + 测试 + 视觉一致性冻结”完成，不得为了制造 diff 重写代码。

---

## 11. Validation

至少执行：

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test --if-present
git diff --check
```

仓库已有 Task-specific Node / Playwright / browser QA 时，运行与 Header / navigation / responsive / personal-center regression 有关的测试。

如果全仓已有基线失败：

- 如实列出。
- 证明本 Task 未新增失败。
- 不越界修复无关文件。

---

## 12. Browser / Visual Acceptance

至少检查：

- `1440×900`
- `1024×768`
- `390×844`
- `320×568`

至少覆盖：

```text
/
/start
/planner
一个当前真实可达的 Trip Detail
/personal-center
```

### 功能回归

检查：

- Logo / Header 位置与导航。
- Avatar / Account 入口现有行为。
- 无遮挡 / 横向溢出。
- Planner Map / overlay / right panel / bottom timeline 无几何回归。
- Personal Center Sidebar / TopActions / Content 不回归。
- console / hydration 无新增错误。

### 视觉一致性验收

必须进行 Main System ↔ Personal Center 对照，至少检查：

- Logo / Brand 是否像同一产品。
- 暖白 / 象牙白表面是否协调。
- 珊瑚朱红 / 暖粉强调是否一致。
- 正文 / 次级文字层级是否一致。
- 圆角层级是否一致。
- 边框与阴影是否一致。
- Avatar / Popover / 按钮是否来自同一视觉语言。
- Hover / Focus 是否一致。
- 页面留白节奏是否协调。

允许页面骨架不同，但不得出现“像两个不同网站”的视觉断裂。

无法运行的浏览器能力写 `Deferred`，不得伪报 PASS。

---

## 13. Acceptance Criteria

- [x] 从最新 `origin/develop` 启动并记录 execution base。
- [x] 核对 1.13 / 2.7 前置，不伪改依赖状态。
- [x] WBS 3.1 启动时同步为 `进行中`。
- [x] 复用 TASK-010-A/B，未建立第二套 Header / Navigation。
- [x] 读取并实际参考 Personal Center Shell / 当前实现。
- [x] Main System 与 Personal Center 形成同一 TravelAssist 品牌视觉体系。
- [x] 未把 Personal Center Sidebar 强行复制到主系统。
- [x] Main Layout / Header 边界单一明确。
- [x] Home / Start / Planner / Detail 主流程不回退。
- [x] Planner 地图与工作台几何不因视觉统一被破坏。
- [x] Personal Center 内部功能与布局不被 A 越界重写。
- [x] 四个指定 viewport 无关键 Shell 回归。
- [x] lint / typecheck / build / relevant tests / diff-check 通过，或基线例外证据完整。
- [x] Result 记录共享视觉规则、改动、测试、限制与 Deferred。
- [x] Issue / Task / Result / WBS / branch / commit / PR 完整同步。
- [x] 实现完成但 PR 未合并：`3.1 = 待审查`。
- [ ] 只有用户视觉验收通过且 PR 合入 develop：`3.1 = 已完成`。

---

## 14. Mandatory WBS / Tracking Update

Codex 返回最终 Result 前必须：

1. 再读取最新 `docs/project/WBS-TravelAssist.md`。
2. 保留执行期间其他工作站的新记录。
3. 更新 3.1 的真实状态、Issue、branch、commit、PR、blocker。
4. 更新 Issue #242。
5. 创建 / 更新 Result。
6. commit + push tracking。
7. 创建 Draft PR。
8. 最后才返回 Result。

不得出现“代码完成，但 WBS / Issue / Result 仍停在旧状态”。

---

## 15. Result Format

```md
# TASK-024-A Result

## Status

## Preflight

- execution base:
- dependency 1.13:
- dependency 2.7:
- working tree safety:

## Tracking

- WBS 3.1:
- Issue: #242
- Branch:
- Commit:
- Pull Request:
- Result file:

## Existing Work Reused

- TASK-010-A:
- TASK-010-B:
- Personal Center visual primitives:

## Brand Visual Alignment

- colors / surfaces:
- typography:
- radius / border / shadow:
- avatar / popover:
- spacing rhythm:
- shared tokens:

## Main Shell

- layout boundary:
- header integration:
- responsive behavior:
- planner exception:
- personal-center boundary:

## Validation

- lint:
- typecheck:
- build:
- tests:
- browser QA:
- visual comparison:
- diff-check:

## Problems / Deferred

## WBS Updated

Yes / No

## Next Task

Do not start automatically.
```

---

## 16. Stop Rule

完成 TASK-024-A 后停止。

**不要自动开始 WBS 3.2 / TASK-025。**

## 17. Execution Tracking（2026-09-09）

- 状态：实现完成，**WBS 3.1 = 待审查**；用户已于 2026-09-09 回复“验收通过”，PR 未合并。
- 最新远端执行基线：`e74904830cbf8e6745b2013b2888e38984ccf96d`。1.13 仍待审查，依据已进入 develop 的 PC 品牌实现和本 Task Dependency Gate 执行；2.7 已完成。未改依赖状态。
- Issue [#242](https://github.com/kanzakimy0/TravelAssist/issues/242)；分支 `feature/a-main-layout-header`；启动 `f75e799`；实现与验证 `c77884a0cb5ad1053e08321c36f5f8354ba46a55`。
- PR：[Draft PR #244](https://github.com/kanzakimy0/TravelAssist/pull/244)（Open / Draft，未合并）。后续提交仅同步追踪。
- 683/683 Node 测试；npm ci、lint、typecheck、正常 build、npm test --if-present、diff-check 通过。生产浏览器 20/20，8 组 Planner / Detail 几何与 develop 一致。用户已于 2026-09-09 明确回复“验收通过”；验收对象为提交 69bf4b75d2db4a085e96b2442ccba8c3eed54865，本轮仅同步文档。
- [Result](RESULT-TASK-024-a-main-layout-header.md) 记录复用、最小 token 整合、视觉对照、原工作区依赖恢复及真实 Auth / Map Deferred；[QA](../qa/TASK-024/README.md) 提供报告、截图清单与复现脚本。
- 未越界执行其他 WBS；不自动开始 TASK-025。
