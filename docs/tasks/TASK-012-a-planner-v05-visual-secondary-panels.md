# TASK-012-A — Planner v0.5 视觉融合、更多行程设置与辅助 Tab

## Metadata

- Task ID：`TASK-012-A`
- Owner：`A / Main Travel System`
- GitHub Issue：`#111`
- Status：`待验收`（用户明确授权按当前实现合并；1180px 保留 Drawer，原侧栏条目差异留档）
- Design Source：`docs/ui/planner-right-panel-secondary-tabs.md` v0.5
- Design Freeze Commit：`adb0ec680f96857ca5ace4ccd54979d2dd3ddee2`
- Depends On：
  - `TASK-008.3-A / PR #85`：已合并；
  - `TASK-011-A / Issue #86 / PR #102`：已合并到 develop（4c1d9bb），集成验证通过；
  - `TASK-010-A/B` 的 Logo → `/` 导航契约：必须保留。
- Planned Branch：`feature/a-planner-v05-visual-secondary-panels`
- Target Branch：`develop`
- Base Commit：`4c1d9bbf1311a10b1e9db5bde00fe2e7b12fccab`
- Integrated develop：`e725d21821107414a4551427d315aa55cfab7903`；集成提交 `0b93d57`，无冲突，114/114 tests 及构建复验通过。
- Commit：`64e53b3b3d8c5adeaeb867d00e8d581384a6f2c2`（实现；追踪提交见 PR）
- Pull Request：[\#124](https://github.com/kanzakimy0/TravelAssist/pull/124)（本次用户明确授权合并）
- Merge revalidation：整合 develop `364ed22`；139 tests、lint / typecheck / build / diff-check、六尺寸双地图 QA 与 48 次 Logo QA 通过。推荐卡 geometry/content 冻结不变。1180px 保留 Drawer，不声称原侧栏验收通过；下文不得自行合并的规则不覆盖此次用户明确合并授权。
- Planned Result：`docs/tasks/RESULT-TASK-012-a-planner-v05-visual-secondary-panels.md`
- WBS：Planner / 地图 / 路线主系统的视觉整合、右侧设置与底部执行信息精修

---

# 1. 任务目标

在 TASK-011 共用 Trip Workspace 的最终代码之上，把 Planner 的现有功能内容与已确认的原版视觉语言合并，形成正式 v0.5：

```text
原版粉白珊瑚视觉
+ 现有 Mapbox / 路线 / Trip State
+ 更详细的更多行程设置
+ 五个可执行辅助 Tab
+ 不改变右栏下半推荐方案
```

本 Task 的完成结果必须是实际可运行的 Planner 页面，不是静态概念图，也不能用截图替代真实组件。

核心结果：

1. 地图铺到页面顶部，左上仅保留 Logo；
2. 右上搜索 / 通知 / 头像作为地图悬浮层，周边背景向右渐变进入右栏；
3. 地图左侧保留可开关小图层栏，右上保留 `第N天 / 3日 / 全日`；
4. 右栏上半改为突出同行人 / 日期双卡与景点 / 餐饮 / 住宿三卡；
5. 删除“其他条件”，高级设置只保留“更多行程设置”一个入口；
6. 将更多设置升级为七分类工作台，并支持设置草稿与重新规划影响预览；
7. 右栏下半推荐方案保持原样；
8. 底部栏固定约四分之一高度，恢复原版六 Tab 按钮样式；
9. 实装移动、预约·票务、天气·备选、住宿·餐饮、详细五个辅助页面；
10. 底部栏周边使用地图向下渐变，消除纯白硬缝；
11. 保持 Planner → Detail、Map ↔ Bottom、预约与住宿保护以及 Provider 边界。

---

# 2. 前置阻塞检查

本 Task 与 PR #102 修改同一批高冲突文件，因此 **不得在 PR #102 合并前开始业务代码实现**。

执行第一步必须运行：

```bash
git status
git fetch origin --prune
git switch develop
git pull --ff-only origin develop
gh pr view 102 --json state,isDraft,mergedAt,mergeCommit,headRefName,baseRefName
```

必须确认：

```text
PR #102 state = MERGED
mergedAt != null
baseRefName = develop
```

若 PR #102 仍未合并：

- 返回 `Blocked`；
- 明确记录 PR #102 当前状态；
- 不创建 `feature/a-planner-v05-visual-secondary-panels`；
- 不修改 Planner 业务代码；
- 不从 PR #102 feature 分支直接继续叠加；
- 不 cherry-pick PR #102 的部分提交；
- 不创建一个与 PR #102 并行冲突的实现 PR。

只有前置合并后才能继续。

---

# 3. 开始实现前必须阅读

按顺序阅读：

```text
README.md
CONTRIBUTING.md
docs/README.md
docs/ui/planner-right-panel-secondary-tabs.md
docs/ui/trip-planner.md
docs/ui/planner-map-interaction-booking-mapbox.md
docs/ui/trip-detail.md
docs/tasks/TASK-011-a-planner-to-trip-detail-workspace.md
docs/tasks/RESULT-TASK-011-a-planner-to-trip-detail-workspace.md
docs/project/WBS-TravelAssist.md
GitHub Issue #111
```

还必须检查 PR #102 合并后的实际文件与组件边界，不得根据本 Task 编写时的旧 develop 猜测 TASK-011 最终结构。

冲突优先级：

```text
planner-right-panel-secondary-tabs.md v0.5
> 本 Task
> trip-planner.md v0.3
> planner-map-interaction-booking-mapbox.md
> design-system.md
> 旧概念图 / 旧截图
```

但 TASK-011 已实现的共用工作区、单一地图生命周期和 Planner → Detail 状态迁移属于硬约束，不能用视觉规格覆盖。

---

# 4. 分支与追踪

前置满足后：

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/a-planner-v05-visual-secondary-panels
```

任务追踪必须保持一致：

```text
Task：TASK-012-A
Issue：#111
Branch：feature/a-planner-v05-visual-secondary-panels
PR Base：develop
Result：RESULT-TASK-012-a-planner-v05-visual-secondary-panels.md
```

功能开发不得直接提交到 `develop`。

---

# 5. 冻结边界

## 5.1 右栏下半推荐方案

`PlanRecommendations` / `plan-recommendation-list.tsx` 及其可见输出为冻结区。

不得改变：

- 方案 1 / 2 / 3 顺序；
- 当前方案状态；
- 缩略图；
- 标题、副标题、天数、预算、标签；
- 排名角标；
- 卡片高宽、间距、滚动行为；
- 点击方案切换；
- 与地图、底栏同步。

原则上不要修改该组件。若 TASK-011 合并后确有接线需要：

- 只允许无视觉变化的 Props / type 调整；
- 必须提供修改前后截图；
- 必须在 Result 中逐项说明为什么不是设计改动。

## 5.2 行程 Tab

行程 Tab 的真实比例时间轴、三日共轴和现有状态不重做。只允许：

- 应用 v0.5 色彩 Token；
- 恢复原版 Tab 外形；
- 适配固定 25% 底栏高度；
- 适配底部渐变；
- 保留进入 Trip Detail 的现有动作。

## 5.3 系统能力

不得破坏：

- Mapbox Token / fallback；
- Map Provider 生命周期；
- Trip State / Reducer；
- `tripItemId` / `segmentId`；
- fixedTime；
- 已预约与已确认住宿保护；
- 现有日期修改保护；
- Provider 白名单与降级；
- Planner / Detail 浏览器 Back / Forward；
- Personal Center 与 Start Wizard。

---

# 6. 实现阶段 A — 页面壳层与顶部地图

## 6.1 地图到页面顶部

将 Planner 地图工作区铺到 viewport 顶部：

- 不再保留一条完整不透明 Header 占据地图高度；
- 地图实际 canvas 的 top 应为 `0`；
- Header 能力拆为悬浮 Logo 与右上搜索用户簇；
- 不产生新的 document 级滚动；
- TASK-011 共用 `TripWorkspace` 不得被复制成 Planner 专用第二套壳层。

## 6.2 左上 Logo

左上仅显示 TravelAssist Logo：

- 点击目标为 `/`；
- 使用现有 Guard / Link 契约；
- 删除 Planner 顶部中间导航项的可见输出；
- 不删除其他页面的导航；
- Logo 后可加小范围玻璃底，但不能形成全宽 Header。

## 6.3 右上搜索与用户动作

保留：

```text
搜索框 + 通知 + 头像 + 展开
```

搜索本 Task 只实现现有 Mock / UI 行为；不得在本 Task 接新搜索 API。

## 6.4 顶部向右渐变

新增纯视觉层，例如：

```text
PlannerTopFade
```

要求：

- 从搜索框左侧附近开始透明；
- 向右逐步过渡到右栏暖白背景；
- `pointer-events: none`；
- 不建立点击遮罩；
- 不遮挡地图顶部交互；
- 不出现硬白色矩形；
- 使用 CSS Gradient，不用导出位图。

浏览器测试必须验证该层计算后的 `pointer-events` 为 `none`。

---

# 7. 实现阶段 B — 地图控件

## 7.1 左侧小图层栏

复用现有 `map-layer-toolbar.tsx`，视觉改为原版窄竖栏：

```text
图层 / 景点 / 交通 / 酒店 / 美食 / 更多
```

要求：

- 支持开关 / 收起；
- 收起不导致地图 re-mount；
- 当前开关状态继续使用既有 state；
- 不能新增一套与地图 Provider 脱节的本地 layer state；
- 原有地图点击与键盘操作不受遮挡。

## 7.2 右上日期范围

复用 `day-range-selector.tsx`：

```text
第N天
3日
全日
```

- 移到地图右上；
- 不放入顶部 Header；
- 不与搜索框重叠；
- 继续使用现有范围 state；
- 保留数字快捷与有效三日窗口；
- 所有底部 Tab 响应该范围。

## 7.3 地图右下控制

根据底栏固定高度与 36–48px 渐变带动态上移，确保定位、缩放与比例尺始终可点击可见。

---

# 8. 实现阶段 C — 右栏上半

## 8.1 一级双卡

将同行人与旅行日期设为 2 列高优先级卡：

```text
[同行人] [旅行日期]
```

- 高 `88–104px`；
- 大图标；
- 两行摘要；
- 整卡点击；
- 焦点可见；
- 调用现有同行人与日期编辑流程；
- 不重写日期保护或人员语义。

## 8.2 二级三卡

下一行固定为：

```text
[景点偏好] [餐饮偏好] [住宿偏好]
```

每卡只显示 1–2 行摘要，点击继续进入已有偏好编辑能力。

## 8.3 删除重复入口

右栏不得再渲染：

```text
其他条件
```

检查对象包括：

- 桌面右栏；
- Compact Drawer；
- 移动 Sheet；
- aria-label；
- 菜单项；
- 测试 fixture 文案。

不要删除实际高级设置数据，只删除重复的一级入口。

## 8.4 操作区

固定为：

```text
[更多行程设置] [重新生成路线]
```

设置有草稿时：

```text
[更多行程设置] [预览 N 项变更]
```

不得每次切换设置立即调用昂贵规划逻辑。

---

# 9. 实现阶段 D — 更多行程设置工作台

## 9.1 从小 Popover 升级为工作台

现有 `more-trip-settings-popover.tsx` 可重构或由新组件替代，但应复用现有偏好数据和控制逻辑。

桌面形态：

- 仅覆盖左侧工作区；
- 宽约 `760–840px`；
- 高不超过 `640px`；
- 左侧分类导航；
- 右侧内容；
- 固定底部操作；
- 右栏推荐方案不移动、不变暗、不重排；
- 左侧地图与底栏进入轻遮罩和不可交互状态；
- Esc / Close / 遮罩关闭；
- 焦点陷阱与恢复。

Compact / Mobile 使用既有 Sheet / Drawer 体系，不新增第二套 Modal 基础设施。

## 9.2 七分类

必须且仅包含：

```text
预算与节奏
移动与体力
每日时间
人流与天气
摄影与体验
行李与无障碍
锁定与预约
```

字段依据设计书 v0.5 和现有 `planner-preferences.ts`。

不得为完成 UI 随意发明后端字段。现有模型没有持久化能力的字段可以保留为页面内 Mock / draft，但必须用现有 Trip preference state 或明确的 ViewModel，不要散落在多个组件的硬编码 `useState` 中。

## 9.3 草稿语义

需要明确：

```text
openingSnapshot
settingsDraft
settingsDirtyCount
```

行为：

- 打开时建立快照；
- 修改只影响 Draft；
- 取消恢复快照；
- 保存写回当前 Planner preference state；
- 保存后不立刻重算路线；
- 右栏显示未规划数量；
- 点击预览后显示影响范围；
- 确认后才调用已有 Mock 重新规划动作。

## 9.4 保护规则

预览必须明确列出：

- 受影响 Day；
- 普通节点；
- fixedTime；
- 已预约活动；
- 已确认酒店；
- 已锁定交通；
- 预计移动 / 步行 / 费用变化。

不得解除现有预约和住宿保护。

---

# 10. 实现阶段 E — 底部栏框架与渐变

## 10.1 高度

默认 CSS：

```css
height: clamp(200px, 25dvh, 252px);
```

像素验收：

```text
1600×900 = 225px ±1px
1440×900 = 225px ±1px
1280×800 = 200px ±1px
1180×800 = 200px ±1px
```

- 任何 Tab 都不能改变外框高度；
- 内部使用 `min-height: 0`、内部滚动或横向轨道；
- 不设置会把外框撑开的内容高度；
- 不允许 document 滚动条因 Tab 内容出现。

## 10.2 原版 Tab 视觉

Tab 文案与顺序固定：

```text
行程
移动
预约·票务
天气·备选
住宿·餐饮
详细
```

样式：

- 六等分；
- 图标 + 文字；
- 细竖分隔线；
- Active 极淡粉背景；
- Active 珊瑚色文字 / 图标；
- 底部 2–3px Active Line；
- 正确 `tablist / tab / tabpanel`；
- 左右方向键切换；
- 不改成六个大胶囊；
- 不使用 v0.4 的短名称。

## 10.3 地图向下渐变

在地图与底栏之间加入视觉过渡层：

- 高 `36–48px`；
- 顶部透明；
- 向下逐步变为暖粉白；
- 可有最多 4px blur；
- `pointer-events: none`；
- 不遮住关键 Pin；
- 左右外缘避免硬矩形；
- 不用图片；
- 地图控件上移。

建议单独组件或伪元素：

```text
PlannerBottomFade
```

不得通过给地图底部直接覆盖一条不透明白条来伪装渐变。

---

# 11. 实现阶段 F — 五个辅助 Tab

优先复用 `bottom-execution-panel.tsx` 与已有 `booking-checklist.tsx`，可以拆分子组件，避免单文件继续膨胀。

所有辅助 Tab 共用：

```text
摘要区 22–25%
主信息区 50–56%
提醒 / 动作区 22–25%
```

## 11.1 移动

一日：

- 总移动时间；
- 步行；
- 换乘；
- 费用；
- 路线链；
- 末班车 / 步行过长 / 换乘复杂 / 停车 / 行李提醒。

三日：

- 三天比较行；
- 使用共同信息结构；
- 标出跨城和异常日。

全日：

- 只显示城市间主干交通；
- 普通市内段折叠。

移动段点击继续使用已有 Segment / Map selection，不创建第二套选中状态。

## 11.2 预约·票务

一日：

- 完成度；
- 待处理数；
- 最近截止；
- 按时间排序的票券 / 预约；
- 冲突、支付、凭证、取消截止；
- 打开凭证 / 完成预约 / 上传订单 / 联系商家 Mock 动作。

三日 / 全日：

- 按 Day 或类型汇总；
- 保留原有预约状态与 `fixedTime`；
- 不伪造真实支付或凭证后端。

## 11.3 天气·备选

一日：

- 天气摘要；
- 活动时段条；
- 受影响节点；
- 最多两个备选；
- 预览替换影响。

三日：

- 对齐三天；
- 可显示跨日互换建议。

全日：

- 只显示会改变跨城和大型活动结构的风险。

若仍是 Mock，页面必须显示“示例 / 季节参考”，不得声称实时。

## 11.4 住宿·餐饮

一日：

- 今晚住宿；
- 午餐；
- 晚餐；
- 预约状态；
- 顺路程度；
- 预算；
- 饮食限制；
- 查看相似酒店 / 附近餐厅 / 完成预约。

三日：

- 住宿跨日轨道；
- 餐饮缺口；
- 换宿节点。

全日：

- 按城市汇总晚数；
- 换宿频率；
- 尚未确认的住宿夜。

确认住宿后隐藏对应推荐区域和次日出发锚点逻辑必须保持。

## 11.5 详细

Tab 文案保持 `详细`，内容为：

```text
行程体检 + 数据分析 + 优化建议
```

一日：

- 可解释的体检结果；
- 游玩 / 交通时长；
- 步行；
- 预计费用；
- 时间构成；
- 最多三个优化项。

三日 / 全日：

- 忙闲比较；
- 连续高强度；
- 折返；
- 换宿；
- 跨城；
- 预约缺口；
- 预算结构。

建议只能使用当前 Trip data 能推导的本地规则，不得伪装真实 AI 返回。

---

# 12. 数据与组件规则

## 12.1 单一状态源

必须继续使用：

```text
activePlanId
plannerScope
selectedTripItemId
selectedSegmentId
activeBottomTab
trip preference state
booking state
```

不得为每个 Tab 创建一套相互不同步的旅行数据副本。

## 12.2 ViewModel

允许增加纯函数 selector / ViewModel：

```text
selectMobilitySummary
selectBookingSummary
selectWeatherImpactView
selectStayDiningView
selectTripHealthView
```

要求：

- 从现有 Trip / Preference / Booking state 派生；
- 无副作用；
- 可单元测试；
- 不将演示文案硬编码到 JSX 的多个分支中；
- 不假装调用不存在的 Provider。

## 12.3 建议组件边界

TASK-011 合并后按实际结构调整，预期可能涉及：

```text
src/features/planner/components/trip-workspace.tsx
src/features/planner/components/planner-page.tsx
src/features/planner/components/planner-right-panel.tsx
src/features/planner/components/planner-map-shell.tsx
src/features/planner/components/map-layer-toolbar.tsx
src/features/planner/components/day-range-selector.tsx
src/features/planner/components/bottom-execution-panel.tsx
src/features/planner/components/more-trip-settings-popover.tsx
src/features/planner/components/booking-checklist.tsx
src/features/planner/data/planner-preferences.ts
src/features/planner/model/trip-model.ts
src/features/planner/planner.module.css
src/features/planner/planner-interactions.module.css
src/features/planner/detail-workspace.module.css
```

可新建：

```text
planner-top-overlay.tsx
more-trip-settings-workbench.tsx
mobility-panel.tsx
weather-alternative-panel.tsx
stay-dining-panel.tsx
trip-health-panel.tsx
planner-view-selectors.ts
```

不得为了避免理解现有结构而复制整个 Planner 页面。

---

# 13. 响应式

## 13.1 桌面

- 1600×900；
- 1440×900；
- 1280×800；
- 1180×800。

必须保持：

- 左 75 / 右 25 的视觉职责；
- 推荐方案不重排；
- Bottom 25% 高度；
- 右栏上半无内部纵向滚动；
- 搜索与日期控件不重叠。

## 13.2 1024×768

- 使用 TASK-011 / 现有 Compact 规则；
- 允许右栏 Drawer；
- 更多设置使用 Sheet；
- Tab 保留文字；
- 不产生横向 document overflow。

## 13.3 390×844

本 Task 不重新设计手机视觉，但必须验证：

- 新入口可到达；
- 更多设置可滚动；
- Tab 可横向访问；
- Planner → Detail 仍可用；
- 无遮挡、无法关闭或焦点丢失。

---

# 14. 可访问性

必须验证：

- Logo、搜索、通知、头像、图层、日期范围均有可访问名称；
- Tab 使用正确 ARIA；
- 键盘可切换 Tab；
- 更多设置有焦点陷阱；
- Esc 关闭并恢复焦点；
- 关闭嵌套层时不误关闭父层；
- 状态有文本，不仅颜色；
- `prefers-reduced-motion` 下取消抬升和大位移动画；
- 顶部与底部 Gradient 不进入 Tab 顺序；
- 对比度不因浅粉降低到不可读。

---

# 15. 测试要求

## 15.1 静态与单元测试

至少覆盖：

1. 右栏不存在“其他条件”；
2. 同行人 / 日期为一级卡，三类偏好存在；
3. 七个更多设置分类顺序正确；
4. 设置取消恢复快照；
5. 设置保存产生 dirty / pending replan 状态；
6. 重新规划前存在影响预览；
7. 六个 Tab 文案与顺序固定；
8. 五个辅助 Panel 使用同一 scope；
9. 移动 Segment 选中与现有 Map state 同步；
10. 预约 fixedTime / 已确认状态未丢失；
11. 已确认住宿保护未退化；
12. 详细体检只使用可推导本地数据；
13. 推荐方案数据、顺序与 current selection 未变化；
14. Planner → Detail URL / state 测试继续通过。

## 15.2 命令

```bash
npm ci
npm run lint
npm run typecheck
npm run test --if-present
npm run format:check
npm run build
git diff --check
```

若仓库没有 `test` script，必须显式运行所有相关 `tests/*.test.mjs`，并在 Result 中诚实写明 `npm run test --if-present` 没有执行测试。

不得修改 Prettier ignore 或无关旧文件来掩盖 format baseline。

---

# 16. 浏览器 QA

同时验证真实 Mapbox 与强制 fallback。

## 16.1 主要尺寸

```text
1600×900
1440×900
1280×800
1180×800
1024×768
390×844
```

## 16.2 必测场景

- 地图 top = 0；
- 左上仅 Logo；
- Logo → `/`；
- 搜索区向右渐变无硬边；
- Gradient 不拦截地图点击；
- 左图层栏开关与收起；
- 第 N 天 / 3 日 / 全日；
- 同行人 / 日期编辑；
- 三类偏好编辑；
- 无“其他条件”；
- 更多设置七分类；
- 取消、保存、Esc、焦点恢复；
- 变更影响预览；
- 六个 Tab 键盘切换；
- 五个辅助页面；
- 一日、三日、全日内容；
- 底栏像素高度；
- 地图向下渐变；
- 地图控制不被遮挡；
- Map ↔ Bottom 选中；
- 方案 1 / 2 / 3 切换；
- 推荐方案截图回归；
- Planner → Detail、Back / Forward；
- reduced motion；
- 无 hydration / console application error；
- 无 document overflow。

## 16.3 截图证据

至少保存：

```text
planner-default-1600x900.png
planner-default-1440x900.png
planner-mobility-1440x900.png
planner-booking-1440x900.png
planner-weather-1440x900.png
planner-stay-dining-1440x900.png
planner-detail-health-1440x900.png
planner-more-settings-1440x900.png
planner-three-days-1280x800.png
planner-all-days-1180x800.png
planner-compact-1024x768.png
planner-mobile-390x844.png
planner-fallback-1440x900.png
recommendations-before-after.md
```

建议目录：

```text
docs/qa/TASK-012/
```

`recommendations-before-after.md` 必须列出旧 / 新截图与结论，证明推荐方案没有结构改版。

---

# 17. 性能与实现限制

- 不引入大型动画库；
- 不引入大型图表库；
- 简单图表使用 CSS / SVG；
- 顶部与底部过渡使用 CSS Gradient；
- 不把概念图作为页面背景；
- 不增加第二个 Mapbox 实例；
- 不因 Tab 切换重新创建地图；
- 不为每个 Tab 请求不存在的远程服务；
- 缩略图复用现有白名单资源 / 本地资源；
- 不提交 Token、Cookie、订单隐私或用户数据。

---

# 18. 明确不包含

- 新地图 Provider；
- 新路线 Provider；
- 实时天气 API；
- 真实票务支付；
- Auth；
- DB；
- Saved Trips；
- Personal Center；
- Start Wizard；
- Trip Detail 业务重构；
- 推荐算法重构；
- 右栏下半推荐方案重新设计；
- 移动 App 正式设计；
- 自动合并 PR。

---

# 19. Definition of Done

只有全部满足才能标记完成：

- [ ] PR #102 已先合并；
- [ ] 从最新 develop 创建独立 feature；
- [ ] 设计书 v0.5 全部关键项落地；
- [ ] 地图到顶、Logo only、搜索向右渐变完成；
- [ ] 左图层与右上日期范围保留；
- [ ] 右栏双卡 + 三卡完成；
- [ ] “其他条件”完全删除；
- [ ] 七分类更多设置完成；
- [ ] 设置草稿与影响预览完成；
- [ ] 推荐方案冻结通过截图回归；
- [ ] 底栏四分之一像素验收通过；
- [ ] 原版六 Tab 样式完成；
- [ ] 五个辅助 Tab 完成；
- [ ] 地图向下渐变完成且不拦截点击；
- [ ] Map ↔ Bottom / Planner → Detail 未退化；
- [ ] Mapbox / fallback 均通过；
- [ ] lint / typecheck / build / tests / diff-check 完成；
- [ ] 桌面、Compact、Mobile QA 完成；
- [ ] Task / Result / WBS / Issue / Branch / Commit / PR 一致；
- [ ] PR 保持 Draft，未自动合并。

---

# 20. 完成后的 Git / GitHub 动作

1. 更新：

```text
docs/tasks/TASK-012-a-planner-v05-visual-secondary-panels.md
docs/tasks/RESULT-TASK-012-a-planner-v05-visual-secondary-panels.md
docs/project/WBS-TravelAssist.md
GitHub Issue #111
```

2. 创建 Draft PR：

```text
feature/a-planner-v05-visual-secondary-panels → develop
```

3. PR 标题：

```text
[TASK-012-A] Implement Planner v0.5 visual shell and secondary panels
```

4. PR Body 必须包含：

- `Closes #111`；
- base / branch / commits；
- 实现摘要；
- 冻结推荐方案证明；
- 测试与浏览器 QA；
- 已知限制；
- 真实 Provider / Mock 边界；
- 截图索引；
- 不自动 merge 声明。

不得自行把 Draft 改为 Ready，不得自动合并。

---

# 21. Codex 最终返回格式

```markdown
# TASK-012-A Result

## Status

Completed / Blocked

## Prerequisite

- TASK-011 PR #102 merged: Yes / No
- Base commit:
- Design source:

## Tracking

- Issue: #111
- Task File:
- Branch:
- Commits:
- Pull Request:
- WBS updated: Yes / No

## Implemented

- Top shell / gradient
- Map controls
- Right settings
- More settings
- Bottom tabs
- Secondary panels
- State and navigation preservation

## Frozen Area Verification

- Recommendation component changed: Yes / No
- Visible structure changed: Yes / No
- Screenshot regression:

## Validation

- npm ci:
- lint:
- typecheck:
- tests:
- format:
- build:
- diff-check:
- browser QA:

## Known Limitations

## Ready For Review

Yes / No
```

若前置未满足，只返回 Blocked，不继续实现其他任务。
