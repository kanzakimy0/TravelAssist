# TASK-011-A — Planner → 正式行程详情无缝切换与 Detail Workspace

## Metadata

- Task ID: `TASK-011-A`
- Owner: `A`
- Status: `已完成`（用户授权合并，集成验收通过）
- WBS: `1.17 / 1.18 / 4.6 / 4.8 / 4.14 / 4.15`
- GitHub Issue: `#86`
- Branch: `feature/a-planner-to-trip-detail-workspace`
- Depends On:
  - `TASK-008.3-A / Issue #77` merged into `develop`
  - `TASK-010-A / Issue #78` merged into `develop`
- Commit: `7629c8c0d8952420154ee4b9c42ebc11823ac131`
- Pull Request: [#102](https://github.com/kanzakimy0/TravelAssist/pull/102)（已合并，merge `4c1d9bb`；最终集成验证提交 `b3d411b`）
- Design Source: `docs/ui/trip-detail.md` v2.0
- Supporting Design:
  - `docs/ui/trip-planner.md`
  - `docs/ai/trip-judgement-two-phase.md`
  - `docs/ui/trip-external-reservations.md`

---

## 1. 目标

在现有 Planner 地图工作区上实现正式 `Detail Mode`。

用户从已采用的 Planner 方案进入行程详情时，不进入一套完全不同的视觉页面，而是在同一 TravelAssist Trip Workspace 内无缝切换：

```text
Planner Mode
地图 + 偏好 / 推荐方案 + Planner Bottom Panel
        ↓
        ↓ 无缝切换
        ↓
Detail Mode
同一地图 + 当日执行仪表盘 + Day Selector / Horizontal Rail
```

核心要求：

> **视觉上是同一个旅行工作区；工程上 PlannerView 与 DetailView 分离并共享 Trip Workspace。**

---

## 2. 启动前硬检查

本 Task 与 Planner v0.3、主导航闭环会修改高冲突区域。

Codex 启动后必须先执行：

```bash
git fetch --all --prune
git status
git branch --show-current
git rev-parse origin/develop
```

然后读取：

```text
docs/project/WBS-TravelAssist.md
docs/development/task-tracking.md
docs/ui/trip-detail.md
docs/ui/trip-planner.md
docs/tasks/TASK-008.3-a-planner-v03-interactions.md
docs/tasks/TASK-010-a-main-flow-navigation.md
```

并核对 GitHub：

```text
Issue #77 / TASK-008.3-A
Issue #78 / TASK-010-A
Issue #86 / TASK-011-A
相关 PR
```

### 2.1 阻塞规则

必须同时满足：

```text
TASK-008.3-A 已合入 origin/develop
TASK-010-A 已合入 origin/develop
```

任一未满足：

1. 不创建实现分支；
2. 不修改业务代码；
3. 将本 Task / Issue 保持或更新为 `阻塞`；
4. 记录当前 `origin/develop` SHA、未满足前置、对应 PR；
5. 必要时同步 WBS blocker；
6. 返回 Blocked Result 后停止。

**禁止为了绕开冲突，在旧 Planner 基线上提前实现 Detail Mode。**

---

## 3. 基线与分支

前置全部合并后：

```bash
git checkout develop
git pull --ff-only origin develop
git status
git checkout -b feature/a-planner-to-trip-detail-workspace
```

分支必须从当时最新 `origin/develop` 创建。

不得从：

- TASK-008.3 feature branch；
- TASK-010 feature branch；
- 任何本地未合并 head

直接创建本 Task 分支。

---

## 4. 当前页面审计

实现前先审计最新 Planner，不假设旧文件结构仍然存在。

重点定位：

- Planner page / shell；
- Mapbox Map 实例；
- Map toolbar；
- Day range selector；
- Planner right panel；
- bottom execution panel / itinerary timeline；
- Planner store / state；
- selected plan bridge；
- current Day state；
- reservation state；
- map ↔ timeline selection state；
- existing modal / morph card / focus behavior；
- current responsive breakpoints。

输出简短审计记录到 Result，说明哪些现有组件复用、哪些新增、哪些仅重构。

---

## 5. Trip Workspace 架构

目标架构允许按最新代码调整命名，但职责必须等价：

```text
TripWorkspace
├─ TripHeader / Main Header
├─ TripMap
├─ MapToolbar
├─ RightSidebarSlot
└─ BottomPanelSlot

PlannerView
├─ PlannerSidebar
└─ PlannerBottomPanel

DetailView
├─ DetailSidebar
├─ DetailDaySelector
├─ DetailExecutionRail
└─ TripItemModal
```

### 5.1 必须共享

- 同一个 Mapbox map 生命周期；
- Trip / Plan 数据；
- Day selection；
- map selected item；
- Reservation status；
- POI / Route / Hotel / Dining 数据；
- Design Tokens；
- responsive shell。

### 5.2 禁止

- 创建第二个重复 Mapbox 工作区；
- 为 Detail 复制整份 Planner Mock；
- Planner 与 Detail 各维护一套 Day Plan；
- 将全部 Detail 条件继续堆到一个 `planner-page.tsx`；
- 为当前 UI Task 创建假 DB 或假持久化 Trip ID。

如最新架构已经有更合理的 shared shell，优先适配，不为了匹配文档文件名而强行重构。

---

## 6. 路由 / View Contract

当前 Trip ID / DB Contract 尚未冻结，因此本 Task 使用可迁移的 Detail View URL。

推荐：

```text
/planner?view=detail&day=2
```

要求：

- `/planner` 保持 Planner 默认行为；
- `view=detail` 显示 Detail Mode；
- `day=` 映射有效 Day；
- 无效 day 安全回退；
- refresh 能恢复当前 Detail Day；
- browser back / forward 正常；
- query 不进入正式 Trip data model；
- 不伪造 `/trips/123/...` 之类持久化 ID。

组件结构必须允许未来迁移到：

```text
/trips/{tripId}/plan
/trips/{tripId}/detail?day=2
```

而无需重写 Detail 组件。

---

## 7. Planner → Detail 入口

在正式方案已选中/采用后提供主动作：

```text
查看正式行程
```

或与当前文案体系一致的：

```text
进入行程详情
```

要求：

- 保留 selected plan；
- 保留当前 Day；
- 保留当前 Trip State；
- 保留地图上下文；
- 不复制数据；
- 不重新初始化成另一份 Mock。

如果 TASK-010 已建立 selected plan temporary adapter，直接复用，不创建第三套 bridge。

---

## 8. 无缝切换

切换时地图不得明显闪白或重新 Mount。

目标：

```text
Planner Sidebar
→ Detail Sidebar

Planner Bottom Panel
→ Detail Bottom Panel

Planner multi-day route style
→ selected-day + adjacent-context route style
```

过渡：

- 约 `180–260ms`；
- 使用轻微 fade / transform / layout transition；
- 不做大幅位移；
- `prefers-reduced-motion` 下关闭非必要动画。

测试需要证明：

- Map 实例不重复创建；
- 切回 Planner 状态仍可恢复；
- 无 hydration / page error。

---

## 9. Detail Map

### 9.1 删除 Planner 范围控件

在 Detail Mode 隐藏：

```text
1日
3日
全日
```

不删除 Planner Mode 中的功能。

### 9.2 当前日与前后日

当 `day=N`：

```text
Day N
- 正式彩色路线
- 正常 POI / route segment
- 可与底部轨道联动

Day N-1
- 只保留路线
- 浅灰
- 不显示推荐区 / 大照片 Pin

Day N+1
- 只保留路线
- 浅灰
- 不显示推荐区 / 大照片 Pin

其他日
- 默认隐藏
```

边界日：

- Day 1 只有 Day 2 灰线；
- 最后一天只有前一天灰线。

### 9.3 联动

必须支持：

```text
Day Selector → Map
Rail Bubble → Map selection
Map current-day item → Rail item
```

不得破坏 TASK-008.1 / 008.3 已有 Map↔Bottom 联动能力。

---

## 10. Detail Right Sidebar

右侧栏在 Detail Mode 不再显示：

- 同行人快速设置；
- 旅行日期编辑；
- 景点 / 餐饮 / 住宿偏好；
- 更多行程设置；
- 重新生成路线；
- 推荐方案 1 / 2 / 3。

改为“当日执行仪表盘”。

### 10.1 AI 分析置顶

显示：

```text
正常 / 合格
黄色警告 / 需要确认
红色错误 / 有问题
预约待确认
```

状态模型必须独立：

```text
AI:
normal / warning / error

Reservation:
confirmed / unknown
```

允许：

```text
✓ 门票已确认
❗ 预计无法按预约时间到达
```

同一 Item 同时存在。

### 10.2 当日数据

使用现有 Mock / adapter 计算或映射：

- 日期 / Day；
- 当日城市路线；
- 天气（Mock 标明 sample）；
- 行程开始 / 结束；
- 总活动时长；
- 驾驶 / 公共交通时间；
- 步行距离；
- Item 数量；
- 硬约束数量；
- 可调整 / 缓冲；
- 预计开销。

预计开销至少支持分组：

- 交通；
- 停车 / 高速；
- 门票 / 活动；
- 餐饮；
- 住宿；
- 其他；
- 总计。

不得把 estimate 显示成真实结算。

### 10.3 酒店

至少显示：

- 酒店名；
- 入住；
- 退房；
- 地址；
- 停车；
- 早餐；
- Reservation status。

### 10.4 餐饮

至少显示：

- 午餐；
- 晚餐；
- 推荐时间；
- 餐厅 / 餐饮区域；
- Reservation status。

### 10.5 预约 / 门票

今日预约列表可点击定位 Timeline item。

### 10.6 交通 / 停车 / 提醒

支持 UI：

- driving / transit；
- P+R；
- parking；
- critical transfer；
- hard constraint；
- departure reminder。

本 Task 不接真实交通 Provider。

---

## 11. Detail Bottom Panel

Detail Mode 不再把：

```text
行程 / 移动 / 预约票务 / 天气备选 / 住宿餐饮 / 详细
```

作为主要 Tab。

结构改为：

```text
Day Quick Selector
↓
Single-Day Horizontal Execution Rail
```

---

## 12. Day Quick Selector

必须放在底部面板最上方，替代旧：

```text
第2天 · 4月11日
```

位置。

形式：

```text
第1天
4/10 东京

第2天
4/11 河口湖·富士山·箱根

第3天
4/12 箱根·东京
```

要求：

- 当前日突出；
- 长行程横向 scroll；
- 键盘可达；
- 选中后 Map / Sidebar / Rail 同步；
- 不在地图复制第二套 Day selector。

---

## 13. Horizontal Execution Rail

显示当前选中 Day 的单日行程。

示意：

```text
      ┌ 酒店出发 ┐          ┌ 午餐 ┐          ┌ 前往箱根 ┐
      │ 08:30    │          │12:30 │          │17:00    │
      │ 巴士1.5h │          │ 1h   │          │ 电车1h  │
      └──────────┘          └──────┘          └─────────┘
            │                    │                  │
─────────── ● ─────── ● ─────── ● ────── ● ────── ● ──────
                      │                  │
                 ┌ 河口湖 ┐        ┌ 富士急乐园 ┐
                 │10:00   │        │14:00      │
                 │游览1.5h│        │游玩3h     │
                 └────────┘        └───────────┘
```

### 13.1 状态只在 Rail Node

状态：

- green；
- yellow；
- red；
- gray。

必须有文本 / tooltip / aria label，不能只用颜色。

### 13.2 Bubble 不显示状态

Bubble 禁止：

- 照片；
- 绿色勾；
- 黄色/红色 status badge；
- 长 AI 文本。

Bubble 只显示：

- time；
- title；
- short type/action；
- duration / travel time。

### 13.3 Bubble 分类背景

低饱和、半透明：

```text
Attraction      mint/cyan
Dining          warm orange
Transit/Drive   blue
Hotel           pink/lilac
Activity        purple
Task/Buffer     blue-gray
```

冻结原则：

> 气泡颜色 = 类型；轨道圆点颜色 = 状态。

### 13.4 时间布局

优先复用 TASK-008.3 的时间比例能力。

允许为可读性做最小间距 / collision handling，但不能把所有 Item 等距排列后谎称是真实时间比例。

---

## 14. TripItem Modal

点击 Bubble 打开居中 Dialog/Modal。

必须：

- backdrop；
- outside click close；
- `Esc` close；
- focus trap；
- close 后 focus 回原 Bubble；
- keyboard trigger；
- ARIA dialog semantics。

内容：

```text
Title / Status

详情
- 时间
- 地点
- 时长
- 类型
- 交通
- 预约
- 备注

AI 判断
- 为什么
- 影响哪些后续
- 数据/检查更新时间
- 建议

操作
- 调整时间
- 更改内容
- 锁定
- 删除
- 完成
```

Right Sidebar 仍显示 Day Summary，不被 Modal 替换。

---

## 15. `+` 新增行程

底部轨道右下提供明显但不抢视觉的 `+`。

支持 UI 类型：

```text
景点
餐饮
交通
酒店
停车
活动
任务
自定义
```

本 Task 可使用当前 client/mock state 完成添加演示。

如果真实 Day Plan mutation contract 尚未完成：

- 建立明确 `detail-draft` / temporary adapter；
- 不伪造 DB save；
- 在 Result 记录后续需要由 4.16 / 4.17 收敛的 Contract。

---

## 16. 编辑 / 保存

### 16.1 自动草稿保存

UI 状态：

```text
保存中…
已自动保存
保存失败
```

当前无 DB 时：

- local/mock draft 明确命名；
- 不显示成“云端已保存”。

### 16.2 轻量检查

编辑后本地检查：

- invalid start/end；
- overlap；
- required fields；
- obvious segment gap；
- hard reservation collision。

### 16.3 完整 AI

提供：

```text
AI 重新检查
```

本 Task 不接真实 AI API。

可使用 deterministic mock judgement adapter 展示：

```text
Planning Review
Execution Monitor
```

但 UI 必须标注模拟数据，不写“实时 AI 已分析”。

---

## 17. T-48h 双阶段 UI Contract

### Planning Review

`tripStart - now > 48h`

显示语义：

```text
AI 行程检查
```

重点：

- reasonable；
- requirement match；
- opening/closure；
- reservation completeness；
- route density；
- backup plan。

### Execution Monitor

`tripStart - now <= 48h`

显示语义：

```text
AI 实时行程
```

或产品设计同义标题。

重点：

- current progress；
- weather；
- transport；
- temporary closure；
- hard reservation；
- downstream impact。

本 Task 只实现状态/视图 contract；不创建后台定时任务。

---

## 18. AI Adjustment Preview

如果演示 AI 调整 UI，必须：

```text
Current
↓
Suggested
↓
Diff
↓
User Apply
```

不得 AI click 后立即覆盖 Timeline。

Detail 统一文案：

```text
调整后续行程
```

不得：

```text
重新生成路线
```

---

## 19. 现有能力保护

不得回归：

- Mapbox token / fallback；
- Planner fallback map；
- TASK-008.1 GeoJSON layers；
- map ↔ timeline selection；
- fixed reservation protection；
- TASK-008.3 Planner v0.3 interactions；
- TASK-010 main navigation；
- `/start`；
- `/personal-center`；
- browser keyboard support；
- responsive baseline。

---

## 20. 响应式

至少浏览器验证：

```text
1440×900
1180×800
390×844
```

Desktop：

```text
left workspace ≈ 75%
right sidebar  ≈ 25%
```

窄屏：

- Right sidebar 可 drawer；
- Rail 可 horizontal scroll；
- Bubble 不被压成不可读。

Mobile：

不要求保留桌面横轨；允许降级为同语义的纵向执行列表 / sheet。

验收重点是：

- 无横向页面级溢出；
- 控件可操作；
- Detail Day 可切换；
- Modal 可用。

---

## 21. 测试

新增/更新测试至少覆盖：

### State / URL

- default `/planner` = Planner；
- `view=detail` = Detail；
- valid/invalid `day`；
- back / forward；
- refresh。

### Map

- detail hides range selector；
- current route active；
- adjacent route gray；
- distant route hidden；
- Day switch。

### Sidebar

- AI counts；
- reservation status independent from AI status；
- day summary mapping；
- hotel/dining/reservation/transport groups。

### Rail

- day selector；
- node status；
- alternating bubbles；
- bubbles no image；
- bubbles no duplicate status；
- bubble type style；
- item selection。

### Modal

- click open；
- outside close；
- Esc close；
- focus trap / return；
- edit UI。

### Accessibility

- keyboard；
- aria label；
- status not color-only；
- reduced motion。

---

## 22. 验证命令

按仓库最新 scripts 执行，至少：

```bash
npm ci
npm run lint
npm run typecheck
npm run test --if-present
npm run format:check
npm run build
git diff --check
```

若仓库基线存在非本 Task 的格式问题：

- 不修改 ignore 来掩盖；
- 在 Result 精确列出既有文件；
- 本 Task 改动文件独立 format-check 必须通过。

---

## 23. 浏览器 QA

必须用真实浏览器检查：

### Planner

- 原 Planner 仍正常；
- `1日/3日/全日` 仍只在 Planner；
- recommended plans / preferences 不回归。

### Transition

- 点击进入 Detail；
- 地图不闪切；
- URL 更新；
- Back 回 Planner；
- Forward 回 Detail。

### Detail

- map style；
- day selector；
- rail；
- sidebar；
- modal；
- add item；
- mock save state；
- mock AI state。

记录截图/说明：

```text
docs/qa/TASK-011/
```

如项目已有 QA 约定，沿用最新目录规则。

---

## 24. Non-goals

本 Task **不实现**：

- real AI API；
- background AI monitoring；
- live weather；
- live traffic / road closure；
- live current location；
- real booking mutations；
- real DB；
- real Saved Trips；
- Auth；
- final Trip ID / Trip Contract；
- companion realtime sync；
- native mobile；
- Provider procurement。

不得用 Mock UI 声称这些能力已完成。

---

## 25. Mandatory WBS / Tracking Update

Codex 返回最终 Result 前必须：

1. 读取最新 `docs/project/WBS-TravelAssist.md`；
2. 更新 TASK-011-A 相关 WBS 状态；
3. Issue #86 与 Task 状态一致；
4. 记录真实：
   - base SHA；
   - branch；
   - commits；
   - PR；
   - validation；
   - blocker / exceptions；
5. 生成：
   ```text
   docs/tasks/RESULT-TASK-011-a-planner-to-trip-detail-workspace.md
   ```
6. Commit / push Task Result 与 WBS。
7. PR 指向 `develop`。
8. **不自动 merge。**

状态：

```text
前置未满足       → 阻塞
开始实现         → 进行中
实现完成待合并   → 待验收 / WBS 待审查
合并且验收通过   → 已完成
```

---

## 26. 最终 Acceptance Checklist

- [ ] #77 merged
- [ ] #78 merged
- [ ] 从最新 origin/develop 建分支
- [ ] Planner 默认模式无回归
- [ ] Planner → Detail 无缝切换
- [ ] 同一 Map Workspace / 不复制 Mapbox
- [ ] Detail 删除 1日/3日/全日
- [ ] 当前日彩色
- [ ] 前后日灰色路线
- [ ] 其他日隐藏
- [ ] Detail Right Sidebar
- [ ] AI 4 类状态计数
- [ ] AI / Reservation 状态独立
- [ ] 当日数据
- [ ] 开销
- [ ] 酒店
- [ ] 餐饮
- [ ] 预约
- [ ] 交通 / 停车 / 提醒
- [ ] Bottom Day Selector
- [ ] Single-Day Horizontal Rail
- [ ] Rail status nodes
- [ ] Bubble 上下交错
- [ ] Bubble 无照片
- [ ] Bubble 无重复状态
- [ ] Bubble 分类透明色
- [ ] TripItem Modal
- [ ] outside/Esc/focus return
- [ ] `+` 新增入口
- [ ] mock auto-save / lightweight validation
- [ ] explicit AI recheck UI
- [ ] no fake real-time capability
- [ ] back/forward/refresh
- [ ] reduced motion
- [ ] responsive QA
- [ ] lint/typecheck/tests/build/diff-check
- [ ] Result/WBS/Issue/PR 同步
- [ ] no auto merge

完成后停止。
