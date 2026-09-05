# TASK-008.3-A — Planner v0.3 交互升级

## Metadata

- Task ID: `TASK-008.3`
- Owner: `A`
- Issue: `#77`
- Status: `待审查`（实现与最新 develop 集成验收完成；PR #85 待合并）
- Depends On: `TASK-008.2-A / #73` merged into `develop`
- Design Source: `docs/ui/trip-planner.md` v0.3
- Branch: `feature/a-planner-v03-interactions`
- Implementation: `58932555d26b4ef5fd98848e836e985848508066`
- Latest Develop Integration: `004c40b`（基线 `43c518d`）
- PR: [#85](https://github.com/kanzakimy0/TravelAssist/pull/85)
- Result: [TASK-008.3-A Result](RESULT-TASK-008.3-a-planner-v03-interactions.md)

## 1. 目标

实现 `trip-planner.md v0.3` 中尚未被 TASK-008 / 008.1 / 008.2 覆盖的交互能力，不重做已经完成的 Mapbox / Provider / Trip State 基础。

## 2. 前置检查

```bash
git status
git fetch origin
git switch develop
git pull --ff-only origin develop
git log --oneline -15
```

必须确认 TASK-008.2 已合入、`trip-planner.md` 为 v0.3、工作树 clean；否则 Blocked。

## 3. 右侧上半部

### 同行人

与 Start Step 3 一致：成人男性、成人女性、儿童、婴儿；每类独立数量下拉/Stepper，摘要同步。

### 旅行日期

改为出发日期 + 返回日期区间；自动重算天数/夜数并检查固定预约、酒店夜数、Day 越界。

### 景点 / 餐饮 / 住宿三级偏好

统一：

1. Level 1 卡片摘要
2. Level 2 快速设置 Chips
3. Level 3 `更多设置` 二级浮层

具体枚举严格读取 `docs/ui/trip-planner.md` v0.3。

## 4. 更多行程设置

Popover 默认关闭，不产生 layout shift。

- 预算：滑轨 `节省 — 中等 — 宽松 — 高预算` + 日均预算摘要。
- 旅行节奏：滑轨 `很轻松 — 轻松 — 适中 — 紧凑 — 很紧凑` + 每日主要地点摘要。
- 其他项目统一 `项目标题 + 当前摘要 + 快速设置 + 更多设置`。

至少包括：移动偏好、时间偏好、拥挤与排队、摄影与观景、已预约活动、天气策略、行李、特殊需求、方案约束。

## 5. 日程范围选择器精简

- `1日` → `第N天`，浮层优先数字快捷 `[1][2][3][输入]`；长行程显示当前 Day 邻近数字。
- `3日` → `从第N天开始`，同样数字快捷 + 输入，只生成有效连续 3 日窗口。
- `全日` 保持紧凑单按钮。

## 6. 一日真实时间比例行程条

```text
dayStart = 最早开始
dayEnd = 最晚结束
daySpan = dayEnd - dayStart
x = (start - dayStart) / daySpan
width = duration / daySpan
```

活动块左上显示开始时间 + 持续时间，中部名称，下部显示已预约/已订票/必去/时间较紧/AI 建议等。

交通同样按真实时间比例，用细线/箭头或窄长条；真实空白/缓冲保留。

## 7. 三日比较

3日模式底部改为三条平行时间带，使用共同横轴：

```text
compareStart = 三天最早开始
compareEnd = 三天最晚结束
```

09:00 开始的一天必须自然比 08:00 开始的一天向右。

弱化单节点文字，突出景点/移动/餐饮/住宿/缓冲类别；每 Day 显示起止时间、活动时长、移动时长、步行、预约数、辛苦度，并给简洁优化建议。

## 8. 地图对象 Morph 详情

至少支持：

- itinerary-point
- recommended-poi
- recommended-dining-area
- recommended-stay-area
- confirmed-stay-point
- confirmed-restaurant-point
- transport-node

点击：小圆 → 轻微放大 → Morph 圆角长方形快速卡 → 内容渐入。

收起：地图空白、其他对象、Close、Esc。

支持 `prefers-reduced-motion`，降级为淡入淡出。

## 9. 详情结构

- 正式景点：名称/类型、Day/开始/持续、预约/门票/必去/风险、2–3 条 AI 判断、前后交通、查看详细。
- 推荐景点：推荐理由、插入时段、路线影响、天气/同行人适配、加入/替换/备选。
- 推荐餐饮区：先解释区域，再列 2–4 家餐厅。
- 推荐住宿区：先解释区域，再列 2–4 家酒店。

## 10. 已确定住宿强规则

某晚住宿确认后：

- 隐藏该晚 `recommended-stay-area`；
- 转为 `confirmed-stay-point`；
- 底部住宿块显示具体酒店；
- 右侧方案/待预约数同步；
- 次日以该酒店为出发锚点。

## 11. 必须保留

Mapbox token/fallback、现有 Trip State、预约状态、fixedTime、Map↔Bottom、Provider boundary、6 Bottom Tabs、响应式 Drawer/Sheet、TASK-008.2 视觉结果。

## 12. 不包含

新 Provider、真实新 API、Auth、DB、`/start` 修改、Personal Center 修改、Saved Trips、大型动画库。

## 13. 验证

```bash
npm ci
npm run lint
npm run typecheck
npm run test --if-present
npm run format:check
npm run build
git diff --check
```

浏览器验证：一日比例、三日共同横轴、范围快捷选择、More Settings 无 layout shift、Morph/Esc、已定住宿隐藏推荐区、Map/Bottom/Right 同步，以及 1600×900 / 1440×900 / 1280×800 / 1180×800 / 390×844。

## 14. Tracking

最终返回前更新 WBS + Result，Task / Issue / Branch / Commit / PR 一致；不自动 merge。完成后停止，不继续 TASK-010。
