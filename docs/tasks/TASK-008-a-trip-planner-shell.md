# TASK-008-A — Planner 地图主页面布局与交互壳层

> Task ID：`TASK-008`  
> Owner：`A`  
> Status：`已完成 / UI shell merged into develop via PR #59`
>
> GitHub Issue：`#51`  
> Task File：`docs/tasks/TASK-008-a-trip-planner-shell.md`  
> Feature Branch：`feature/a-trip-planner-shell-v2`  
> Target Branch：`develop`

---

## 1. 任务目标

实现 TravelAssist 最新冻结的 **Planner 地图主页面前端壳层**。

本 Task 的目的不是接入真实地图、路线、AI 或数据库，而是先用统一 Mock Trip 数据把正式 Planner 页面结构、比例、交互和响应式行为完整落地，使后续 Map Provider、Route Provider、AI、Trip State 等任务可以在不重做页面骨架的情况下继续接入。

页面职责固定为：

```text
地图 = 空间
右侧栏 = 整趟旅行的设置与方案
底部栏 = 当天执行
```

---

## 2. 当前正式设计依据

执行前必须阅读：

```text
docs/ui/trip-planner.md
docs/ui/design-system.md
docs/ui/page-overview.md
```

其中：

```text
docs/ui/trip-planner.md v0.2
```

是本 Task 的 Planner UI / UX 正式规格。

### 2.1 优先级

若内容冲突：

```text
docs/ui/trip-planner.md v0.2
> 本 Task 文件
> docs/ui/design-system.md
> docs/ui/page-overview.md
> 旧概念图 / 旧 Issue
```

### 2.2 旧规格处理

GitHub 旧 Issue：

```text
#9 [Phase 1][A] 实现行程主页面 3:1 地图 / 设置布局骨架
```

只作为早期历史记录。

**不得使用 Issue #9 覆盖 TASK-008 / trip-planner v0.2。**

旧：

```text
assets/design/trip-planner-concept.svg
```

同样不是当前像素级实现依据。

---

## 3. 执行前置检查

开始前：

```bash
git status
git remote -v
git fetch origin
git switch develop
git pull --ff-only origin develop
git log --oneline -15
```

确认：

- 当前仓库为 `kanzakimy0/TravelAssist`
- 工作树 clean
- `origin/develop` 已包含 TASK-006 成果
- `docs/ui/trip-planner.md` 存在
- `docs/ui/trip-planner.md` 顶部版本为 `v0.2`

如果 Planner 文档仍是 v0.1：

```text
Status: Blocked
Reason: Planner v0.2 design spec is not available on origin/develop.
```

停止，不自行猜测新版规格。

---

## 4. Git 工作流

前置检查通过后：

```bash
git switch -c feature/a-trip-planner-shell-v2
```

禁止：

```text
直接在 main 开发
直接在 develop 开发功能
force push
改写 B 的个人中心代码
修改 TASK-007 /start Step 1–5
```

TASK-007-B 不是本任务硬依赖，可以并行进行。

---

# 5. 页面入口

先检查仓库是否已经存在正式 Planner route。

如果已经存在：

```text
复用现有正式 route
```

如果没有：

```text
/planner
```

作为 TASK-008 独立预览页面。

本 Task **不修改 `/start` 完成后的正式跳转逻辑**。

`/start → /planner` 整合留给后续单独 Task。

---

# 6. Desktop 总体布局

主要设计画布：

```text
16:9
1600 × 900
1440 × 900
```

结构：

```text
┌──────────────────────────────────────────────────────────────┐
│ 顶部导航                                                     │
├──────────────────────────────────────────────┬───────────────┤
│                                              │               │
│                 地图主区域                   │   右侧栏      │
│               左侧工作区 ≈75%                │    ≈25%       │
│                                              │               │
│ 左侧图层栏            日程范围选择器           │ 上半：设置     │
│                                              │      50%      │
│ 地点 / 路线 / 交通 / 区域                    ├───────────────┤
│                                              │ 下半：方案     │
│                                              │      50%      │
├──────────────────────────────────────────────┤               │
│           底部执行面板 ≈ 页面高度 25%          │               │
│ 行程｜移动｜预约票务｜天气备选｜住宿餐饮｜详细 │               │
└──────────────────────────────────────────────┴───────────────┘
```

### 6.1 比例冻结

必须满足：

- 左侧工作区：约 `75%`
- 右侧栏：约 `25%`
- 右侧栏不能视觉上接近 `1/3`
- 右侧栏从 Header 下方一直到底部
- 右侧栏上半 / 下半面积约 `1 : 1`
- 上下两部分紧贴，属于同一右侧容器
- 底部栏只覆盖左侧工作区
- 底部栏高度约页面高度 `1/4`

不要用绝对比例把内容挤坏，可用合理 `min/max` 约束，但实际视觉比例必须符合上述冻结值。

---

# 7. 视觉语言

整体视觉以当前账户 / Personal Center 页面为色调基准。

## 7.1 主色调

使用：

- 暖白
- 象牙白
- 极淡樱花粉
- 淡暖灰粉边框
- 克制珊瑚红
- 深蓝灰 / 墨色正文

## 7.2 视觉原则

- 大圆角
- 低对比边框
- 轻阴影
- 轻微半透明
- 浮层像镶嵌在地图中
- 不使用强玻璃拟态
- 不做企业后台 / SaaS Dashboard
- 不做 OTA 搜索结果页
- 不使用绿色作为品牌主色

## 7.3 色彩数量

**除路线本身外，不要出现大量不同颜色。**

以下应尽量保持单色 / 低饱和：

- 图标
- Tab
- 设置卡
- 标签
- Pin 外框
- 状态提示

路线可以承担主要颜色表达。

多日路线仍必须同时有：

- Day
- 日期
- 节点标签

不能只靠颜色区分日期。

---

# 8. 地图区域

本 Task 不接真实地图 SDK。

禁止为了 Task 008 安装：

```text
Mapbox
Google Maps
Leaflet
其他大型地图 SDK
```

第一版使用：

```text
本地 SVG / CSS / Mock Map Canvas
```

完成页面与状态验证。

Mock 地图至少能够表达：

- 东京
- 河口湖
- 富士山
- 富士急 / 行程活动点
- 箱根
- 地点节点
- 路线折线
- 少量交通耗时标签

要求：

> 后续替换真实 Map Provider 时，不需要重写右侧栏与底部执行面板。

---

# 9. 地图左上角

地图左上角保持干净。

**不得显示：**

- 行程概览大卡
- 旅行封面
- 行程名称摘要
- 日期摘要
- 天气摘要
- 同行人摘要

这些信息已经由右侧栏 / 底部栏承担。

---

# 10. 左侧地图工具栏

保留地图工具栏。

可包含：

- 图层
- 景点
- 交通
- 酒店 / 住宿
- 餐饮
- 已订 / 已预约活动
- 更多
- 当前定位（如现有布局需要）

## 10.1 展开状态

显示：

```text
图标 + 文字
```

## 10.2 收起状态

只保留一个小型：

```text
展开地图工具
```

入口。

要求：

- 用户可手动收起
- 再次点击恢复
- 收起时释放地图视觉空间
- Toolbar 开关不得改变 Planner 整体 Grid

---

# 11. 日程范围选择器

位置：

> 地图最右边、右侧栏左边。

基础三个模式：

```text
1日
3日
全日
```

## 11.1 1 日模式

用户点击 `1日` 后，原 `1日` 按钮位置变为：

```text
第1天 ▼
```

例如：

```text
第1天 ▼
3日
全日
```

下拉：

```text
第1天
第2天
第3天
...
第N天
```

选择后：

- 地图只突出对应 Day
- 底部栏同步该 Day
- 时间轴同步该 Day
- 自动调整 Mock 地图高亮范围

## 11.2 3 日模式

用户点击 `3日` 后，原 3 日控件位置变为：

```text
从第1天开始的3天 ▼
```

空间不足时可显示：

```text
Day 1–3 ▼
```

下拉只生成有效连续窗口。

5 天行程应生成：

```text
第1–3天
第2–4天
第3–5天
```

不得生成：

```text
第4–6天
第5–7天
```

即：

```ts
windowCount = max(totalDays - 3 + 1, 0);
```

至少通过 unit test 或独立 5-Day fixture 的交互验证证明该逻辑不是只为 3 天 Mock 写死。

## 11.3 全日模式

点击 `全日` 后：

- 显示整趟旅行路线
- 自动适配全程范围
- 不显示“从第几天开始”下拉

---

# 12. 右侧栏总体

右侧栏约页面宽 `1/4`，从顶部导航下方一直延伸到页面底部。

取消旧设计中的：

```text
详细设置
行程方案
```

顶部切换 Tab。

用户直接看到设置 + 推荐方案。

---

# 13. 右侧栏上半部分：50%

上半部分为本次旅行快速设置。

## 13.1 第一排

并排两个卡：

- 同行人：例如 `2位成人` / `2成人 · 1儿童`
- 旅行日期：例如 `4月10日–4月12日` / `3天2晚`

## 13.2 第二排

并排三个卡：

```text
景点偏好
餐饮偏好
住宿偏好
```

摘要示例：

- 景点偏好：自然风光 · 经典地标 · 摄影
- 餐饮偏好：当地美食 · 日料 · 咖啡
- 住宿偏好：舒适型 · 靠近车站

默认只显示摘要，不一次铺开全部详细参数。

---

# 14. 更多行程设置 + 重新生成路线

第三排：

```text
┌──────────────────┬────────────────┐
│ 更多行程设置      │ 重新生成路线    │
└──────────────────┴────────────────┘
```

要求：

- 两按钮同高
- 两按钮同视觉等级
- `更多行程设置` 可以略宽
- 不得让 `重新生成路线` 消失
- 二者总体仍接近 1 : 1

---

# 15. 更多行程设置 Popover

默认关闭。

点击 `更多行程设置`：

- 在按钮附近打开浮层
- 浮层脱离正常布局
- 不撑高上半区
- 不推动推荐方案
- 不改变右侧栏高度
- 不改变地图尺寸
- 不改变底部栏尺寸

关闭方式：

- 再次点击 Trigger
- 点击浮层外
- `Escape`

关闭后焦点应合理返回 Trigger。

## 15.1 Popover 内容

至少包括：

- 预算
- 旅行节奏
- 移动偏好
- 时间偏好
- 拥挤与排队
- 摄影与观景
- 已预约活动
- 特殊需求
- 行李设置
- 天气策略
- 方案约束
- 更多筛选

顶部优先并排：

- 预算：`中等预算` / `¥15,000–25,000 / 人 / 天`
- 旅行节奏：`偏轻松` / `每天 2–4 个主要地点`

小字必须明显小于主值。

---

# 16. 重新生成路线

按钮必须在默认页面中可见。

本 Task **不接真实路线 / AI**。

因此点击时只能表现为明确 Mock 状态，例如：

```text
正在刷新示例路线…
```

然后：

```text
示例路线预览已刷新
```

禁止：

- 调 OpenAI
- 调真实 Route API
- 假装已经使用真实 AI 优化路线
- 展示虚构实时路线数据

后续真实重新规划逻辑归 `4.14 / Route / AI` 后续任务。

---

# 17. 右侧栏下半部分：50%

下半部分固定显示三个**横向方案条**：

```text
方案1
方案2
方案3
```

不得恢复：

```text
1 张大卡 + 2 张方卡
```

每个方案横条包含：

- 缩略视觉
- 方案编号
- 方案名称
- 1 句差异 / 若干紧凑标签
- 进入 / 切换箭头

## 17.1 当前方案

当前选中项必须：

- 完整外框
- 低饱和强调边框
- `当前方案` 或 `已选中` 小字
- 方案名称
- 差异标签

不得只通过背景颜色表示。

## 17.2 方案切换

点击方案 2 / 3：

- `currentPlanId` 更新
- 当前方案边框切换
- `当前方案` 标签切换
- Mock 地图路线切换
- 底部时间轴 / 内容同步切换

所有区域必须读取同一份 Mock Trip / Plan State。

---

# 18. 底部执行面板

位置：地图区域底部，仅覆盖左侧工作区。

高度：约页面高度 `1/4`。

定位：

```text
当天执行控制台
```

---

# 19. 底部 6 个一级 Tab

固定顺序：

```text
行程
移动
预约·票务
天气·备选
住宿·餐饮
详细
```

默认：`行程`。

不减少为 5 个。

---

# 20. 今日状态行

可以加入一条紧凑状态摘要：

```text
Day 1 · 4月10日
15–22°C
电车约4小时
步行适中
1项预约
今晚住东京市区
```

不要做成第二套大行程概览。

---

# 21. 行程 Tab

示例 Mock：

```text
08:30 抵达羽田机场
10:00 浅草寺
12:30 午餐
14:00 东京晴空塔
17:00 银座
20:00 入住酒店
```

每个节点可展示：

- 时间
- 地点 / 活动
- 停留时间
- 必要的小图
- 下一段交通摘要

## 21.1 Map ↔ Timeline 联动

必须实现最小前端联动：

```text
点击时间轴节点 → 地图节点高亮
点击地图节点 → 底部时间轴对应项高亮
```

不要求真实地图移动 / zoom。

---

# 22. 移动 Tab

至少显示有意义的 Mock 信息：

- 移动方式
- 预计时间
- 距离
- 换乘
- 步行
- 驾车 / 电车 / 公交等

不能是空白占位。

---

# 23. 预约·票务 Tab

至少显示：

- 固定时间活动
- 已预约 / 待确认
- 门票
- 报到提前量
- 城市卡 / 通票等 Mock 信息

---

# 24. 天气·备选 Tab

至少显示：

- 当天天气
- 日出 / 日落
- 雨天备选
- 天气变化后可切换的 Mock 路线说明

不接真实天气 API。

---

# 25. 住宿·餐饮 Tab

至少显示：

### 住宿

- 今晚住宿
- 入住时间
- 区域

### 餐饮

- 午餐
- 晚餐
- 推荐区域
- 是否预约

---

# 26. 详细 Tab

用于承载：

- 当天完整说明
- 地址
- 营业时间
- 联系方式
- 费用摘要
- 注意事项
- AI 说明占位
- 其他不适合挤入前五个 Tab 的信息

不得把 `详细` 再做成右侧设置页。

---

# 27. Responsive

本 Task 第一轮实现建议：

```text
width < 1200px
→ 右侧栏折叠为单一按钮
```

点击后以 Overlay / Drawer 展开。

要求：

- 不再永久占 25%
- 不把地图挤压成窄列
- 可关闭
- Escape 可关闭

## 27.1 Bottom Panel

第一轮建议：

```text
height < 700px
```

或实际内容无法合理显示时，底部栏折叠为单一按钮，点击后以 Overlay / Bottom Sheet 展开。

## 27.2 Mobile

Mobile：

- 右侧栏默认折叠
- 底部栏默认折叠
- 地图为主
- 不产生横向页面滚动
- Overlay 不超 viewport

阈值允许通过真实实现微调。

如果修改建议值，最终报告必须写实际断点、修改原因、测试结果。

---

# 28. 必测尺寸

至少验证：

```text
1600 × 900
1440 × 900
1280 × 800
1180 × 800
1024 × 768
390 × 844
1440 × 650
```

重点：

- 1600×900 / 1440×900：右侧 ≈25%，上下 ≈1:1，底部 ≈25% 高，地图为绝对视觉主体。
- 1180×800：右栏自动折叠。
- 1440×650：底部自动折叠。
- 390×844：两个大面板均不永久挤压地图，无横向溢出。

---

# 29. State 与组件边界

建议：

```text
src/features/planner/
├─ components/
│  ├─ planner-page.tsx
│  ├─ planner-map-shell.tsx
│  ├─ map-layer-toolbar.tsx
│  ├─ day-range-selector.tsx
│  ├─ planner-right-panel.tsx
│  ├─ trip-quick-settings.tsx
│  ├─ more-trip-settings-popover.tsx
│  ├─ plan-recommendation-list.tsx
│  ├─ bottom-execution-panel.tsx
│  └─ itinerary-timeline.tsx
├─ data/
│  └─ planner-mock-data.ts
└─ ...
```

具体路径可按现有工程结构调整。

但必须遵守：

> Mock Trip / Plan 数据只有一份事实源。

禁止 Map / Right Panel / Bottom Panel 各维护一份互不一致的 itinerary。

---

# 30. 最小状态模型

本 Task 不需要提前实现完整 `4.15 Planner Store`。

可以先用页面局部 state / reducer。

至少表达：

```ts
type RangeMode = "day" | "threeDays" | "all";

type PlannerUiState = {
  currentPlanId: string;
  rangeMode: RangeMode;
  selectedDay: number;
  threeDayStart: number;
  selectedStopId: string | null;
  activeBottomTab:
    "itinerary" | "movement" | "booking" | "weather" | "stayFood" | "details";
  isLayerToolbarCollapsed: boolean;
  isMoreSettingsOpen: boolean;
  isRightPanelOverlayOpen: boolean;
  isBottomPanelOverlayOpen: boolean;
};
```

这只是 TASK-008 UI State，不得把它冒充最终业务 `Trip Plan Contract`。

---

# 31. 可访问性

至少实现：

- 所有按钮可键盘聚焦
- `focus-visible` 清楚
- Tab 使用合理语义
- Popover Trigger 有 `aria-expanded`
- Escape 关闭 More Settings
- 关闭 Popover 后焦点恢复
- Drawer / Sheet 有关闭入口
- Day selector 可键盘操作
- 当前方案不能只靠颜色表达
- 当前 Tab 不能只靠颜色表达

---

# 32. 明确不包含

TASK-008 禁止实现：

```text
真实地图 Provider
Mapbox
Google Maps
Leaflet
Places / POI Provider
Route / Transit Provider
真实路线计算
真实天气 API
真实航班
真实酒店
真实餐厅
OpenAI
真实 AI
Authentication
Session
Database
Supabase
Firebase
支付
Analytics
正式保存行程
/start → /planner 正式整合
TASK-007 Step 1–5 修改
B Personal Center 业务修改
大型 UI framework
大型 Icon package
大型 Animation framework
```

---

# 33. 不允许越界修改

尤其不得修改：

```text
src/app/start/
TASK-007 当前实现
B account / personal-center 页面逻辑
B preferences 持久化
B companions
B trip library
```

若发现 Planner 需要 B Contract，使用本地 Mock adapter，不要在本 Task 直接定义最终跨模块 API。

---

# 34. 验证命令

完成后：

```bash
npm ci
npm run lint
npm run typecheck
npm run format:check
npm run build
git diff --check
```

如果全仓 `format:check` 因 develop 已存在的基线文档失败：

1. 不修改无关文档；
2. 记录具体失败文件；
3. 单独证明 TASK-008 修改文件格式通过。

---

# 35. 浏览器验收

必须实际打开 Planner 页面。

检查：

- 无 console error
- 无 hydration error
- 无横向滚动
- 页面不会因为 More Settings 开关发生 layout shift
- 右侧宽度 ≈25%
- 右侧上 / 下 ≈1:1
- 右侧上下紧贴
- 底部高度 ≈25%
- 地图左上角无行程概览
- 左地图栏可隐藏
- 1日切换正常
- 第 N 天下拉正常
- 3日切换正常
- 连续 3 日窗口算法正常
- 全日正常
- 3 方案横条正常
- Current Plan 外框 + 标签正常
- 6 个底栏 Tab 正常
- 地图 / 时间轴选中态同步
- More Settings Escape 正常
- 响应式折叠正常

---

# 36. WBS 更新规则

Codex 最终返回结果前必须更新：

```text
docs/project/WBS-TravelAssist.md
```

加入 TASK-008 追踪记录，包括：

- Task ID
- WBS
- Owner
- Status
- Issue
- Task File
- Branch
- Commit
- PR

### 不得误报完成

本 Task 未接真实 Provider，因此不得因为 Mock Map 完成而把：

```text
4.2 地图容器与基础控件
4.6 多日路线视觉显示
4.14 方案切换 / 重新规划交互
```

的完整业务能力直接标记为“已完成”。

可以根据实际实现记录：

```text
4.1 Planner 页面整体 Grid
4.8 底部时间轴基础
4.13 推荐方案列表
```

的 UI shell 完成度。

设计项 `1.5 / 1.6 / 1.7 / 1.11 / 1.14 / 1.17 / 1.18` 也应根据 `trip-planner.md v0.2` 的冻结情况更新真实状态，而不是机械全部完成。

---

# 37. Commit / Push

验证后：

```bash
git add .
git commit -m "feat(planner): implement planner shell"
git push -u origin feature/a-trip-planner-shell-v2
```

禁止 force push。

不要自行合并到 `develop`。

---

# 38. Definition of Done

只有以下全部满足，TASK-008 才能进入 Ready For Review：

- [x] 从最新 `origin/develop` 开 feature branch
- [x] 已读取 `trip-planner.md v0.2`
- [x] 没有按旧 Issue #9 实现旧布局
- [x] Planner route 可独立访问
- [x] 地图工作区 ≈75%
- [x] 右侧栏 ≈25%
- [x] 右侧栏到底部
- [x] 右侧上下 ≈1:1 且紧贴
- [x] 底部栏 ≈页面高 25%
- [x] 地图左上无行程概览
- [x] 左侧地图工具栏可隐藏
- [x] 1日 / 第N天交互完成
- [x] 3日 / 从第N天开始的3天交互完成
- [x] 全日交互完成
- [x] 5天 fixture 验证 3日窗口算法
- [x] 同行人 / 日期两卡完成
- [x] 景点 / 餐饮 / 住宿三卡完成
- [x] 更多行程设置默认关闭
- [x] More Settings 以 Popover 打开，不造成布局位移
- [x] 重新生成路线按钮始终存在
- [x] 重新生成路线仅使用明确 Mock 状态
- [x] 推荐方案为 3 个横条
- [x] 当前方案有完整外框与文字标签
- [x] 切换方案同步 Mock 地图 / 底部
- [x] 底部 6 Tab 完成
- [x] 5 个非默认 Tab 有真实 Mock 内容
- [x] Map ↔ Timeline 选中状态双向联动
- [x] 右栏响应式折叠完成
- [x] 底栏响应式折叠完成
- [x] Mobile 无横向溢出
- [x] Keyboard / Focus / Escape 基础通过
- [x] npm ci 通过
- [x] lint 通过
- [x] typecheck 通过
- [x] build 通过
- [x] diff check 通过
- [x] format 状态有记录
- [x] 无真实 Map / Route / AI / Auth / DB
- [x] `/start` 未修改
- [x] B Personal Center 未越界修改
- [x] WBS 已更新
- [x] Task / Issue / Branch / Commit / PR 信息一致

---

# 39. 最终返回格式

```markdown
# TASK-008-A Result

## Status

Completed / Partially Completed / Blocked

## Prerequisite

- base commit:
- trip-planner spec:
- TASK-006 merged:
- TASK-007 required: No

## Tracking

- Issue: #51
- Task File: docs/tasks/TASK-008-a-trip-planner-shell.md
- Branch:
- Commit:
- PR:
- WBS updated:

## Route

- planner route:

## Implemented

- Planner layout:
- Mock map:
- left toolbar:
- day range selector:
- 3-day window algorithm:
- right upper settings:
- more settings popover:
- replan mock state:
- 3 recommendation rows:
- bottom 6 tabs:
- map/timeline sync:
- responsive collapse:

## Ratio Validation

- 1600×900 right panel:
- 1440×900 right panel:
- upper/lower ratio:
- bottom panel height:

## Responsive Validation

- 1600×900:
- 1440×900:
- 1280×800:
- 1180×800:
- 1024×768:
- 390×844:
- 1440×650:

## Accessibility

- keyboard:
- focus-visible:
- Escape:
- focus restore:
- tabs / selectors:

## Validation

- npm ci:
- lint:
- typecheck:
- format:check:
- build:
- diff check:
- console:
- hydration:

## Scope Preserved

- real map provider not added:
- real route API not added:
- AI/Auth/DB not added:
- /start untouched:
- B account files untouched:

## WBS

- tracking row:
- design items:
- implementation items:

## Problems / Blockers

- ...

## Ready For Review

Yes / No
```

---

# 40. 完成后停止

TASK-008 完成后停止。

不要继续：

- Map Provider
- POI Provider
- Route Provider
- 真实 AI
- Trip Store / Contract
- `/start` 整合
- TASK-009

等待 Review / 下一条正式 Task。

## 执行结果（2026-09-05）

- Result：[TASK-008-A Result](./RESULT-TASK-008-a-trip-planner-shell.md)。
- Issue：[#51](https://github.com/kanzakimy0/TravelAssist/issues/51)。
- PR：[#59](https://github.com/kanzakimy0/TravelAssist/pull/59)，Merged into develop（2026-09-05）。
- 实现提交：`e4648c031817816fb1cbd0dc44552a542d108c91`；验收记录：`f9028d84e48266e5c626414d541331b7bfd5e009`。
- WBS：已完成（UI shell 范围）。用户明确授权后解除 Draft 并合并；合并提交 `1a4201b3181460977c4f16b0c34f60c353751687`。
- 合并前安全同步最新 develop（含 TASK-007 已合入的新向导与指定背景），head `8920695`。lint / typecheck / build / 30 项 tests / 本任务 Prettier / diff check 均通过；Planner、个人中心、向导浏览器集成复验通过。
- 原 Draft / 不合并说明是交付时限制，已由本次明确授权覆盖。未开始 TASK-008.1，不接真实 Mapbox / Route / Transit / AI / Auth / DB。
