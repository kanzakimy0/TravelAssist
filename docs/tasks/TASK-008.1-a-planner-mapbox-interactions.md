# TASK-008.1-A — Planner Mapbox MVP 与地图预约交互升级

> Task ID：`TASK-008.1`  
> Owner：`A`  
> Responsibility：Main Travel System / Planner / Map  
> Status：`Planned / Blocked until TASK-008 merged`  
> GitHub Issue：`#60`  
> Task File：`docs/tasks/TASK-008.1-a-planner-mapbox-interactions.md`  
> Design Source：`docs/ui/planner-map-interaction-booking-mapbox.md`  
> Feature Branch：`feature/a-planner-mapbox-interactions`  
> Target Branch：`develop`

---

# 1. 任务目标

在 TASK-008-A 已完成的 Planner UI Shell 基础上，实现第一版真实 Mapbox 地图渲染边界，并把本轮最新冻结的地图交互升级落到可运行的 Mock Trip / Mock Provider 流程中。

本 Task 完成后，Planner 应从：

```text
Mock SVG / CSS Map Shell
```

升级为：

```text
Mapbox GL JS 地图
+
统一 GeoJSON Layer
+
1日 / 3日 / 全日范围显示
+
景点 / 住宿区域 / 餐饮区域详情
+
预约状态与底部行程 / 右侧当前方案联动
```

本 Task 的重点是：

> **真实地图渲染 + 正确业务交互边界。**

不是：

> 一次性接完 Booking / Agoda / TableCheck / Klook / 公共交通 / AI / 数据库。

---

# 2. 硬依赖

TASK-008-A 当前：

- Issue：#51
- PR：#59
- 状态：Open / Draft / 未合并

执行 TASK-008.1 前必须：

```bash
git status
git fetch origin
git switch develop
git pull --ff-only origin develop
git log --oneline -15
```

然后确认：

1. PR #59 已合并；
2. `origin/develop` 已包含 Planner `/planner` 页面；
3. `src/features/planner/` 中已存在 TASK-008 组件；
4. `docs/ui/planner-map-interaction-booking-mapbox.md` 存在；
5. `docs/tasks/TASK-008.1-a-planner-mapbox-interactions.md` 存在。

若 PR #59 未合并：

```text
# TASK-008.1-A Result

## Status
Blocked

## Reason
TASK-008-A PR #59 is not merged into origin/develop.

## Action
Stop. Do not branch from feature/a-trip-planner-shell-v2 and do not stack TASK-008.1 on an unmerged feature branch.
```

停止执行。

---

# 3. 设计依据与优先级

必须阅读：

```text
docs/ui/planner-map-interaction-booking-mapbox.md
docs/ui/trip-planner.md
docs/ui/design-system.md
docs/tasks/TASK-008-a-trip-planner-shell.md
docs/tasks/RESULT-TASK-008-a-trip-planner-shell.md
docs/project/WBS-TravelAssist.md
```

冲突优先级：

```text
planner-map-interaction-booking-mapbox.md
>
trip-planner.md
>
TASK-008.1
>
TASK-008 旧 Mock 细节
>
旧概念图 / 旧 Screenshot
```

TASK 文件用于执行范围；设计书用于 UX / 数据语义。

---

# 4. Git 工作流

前置检查通过后：

```bash
git switch -c feature/a-planner-mapbox-interactions
```

禁止：

- 直接在 `main` 开发；
- 直接在 `develop` 开发功能；
- force push；
- 修改 B Personal Center 业务；
- 修改 `/start` Step 1–5；
- 从未合并的 TASK-008 branch 继续堆叠；
- 提交真实 Mapbox token。

---

# 5. WBS 对应

本 Task 主要覆盖或部分覆盖：

```text
4.2  地图容器与基础控件
4.3  景点 Pin 组件
4.4  住宿区域覆盖层
4.5  餐饮区域覆盖层
4.6  多日路线视觉显示
4.8  底部时间轴基础（升级）
4.9  时间轴景点卡片
4.11 时间轴餐饮段
4.12 时间轴住宿段
4.13 推荐方案列表（预约 CTA 升级）
4.14 方案切换 / 重新规划交互（固定预约保护的 Mock subset）
4.15 Planner 状态模型 / Store（仅本 Task 所需 UI state subset）

以及：

7.1 地图 Provider 选型
```

## 5.1 Provider 选型冻结

本 Task 正式将 Web Planner 第一地图 Provider 定为：

```text
Mapbox
```

但不得把：

```text
7.2 Places Provider
7.3 Route / Transit Provider
7.6 Search API
7.8 Route API
```

误标为完成。

---

# 6. Mapbox 安装

安装：

```bash
npm install mapbox-gl
```

按工程现有 package manager / lockfile 规则执行。

必须加载：

```tsx
import "mapbox-gl/dist/mapbox-gl.css";
```

具体加载位置遵循现有 App Router / global CSS 结构。

---

# 7. 环境变量

新增：

```env
NEXT_PUBLIC_MAPBOX_TOKEN=
```

更新：

```text
.env.example
docs/development/setup.md
```

或项目当前实际环境说明文档。

要求：

- 不提交真实 token；
- 不将 token 写进代码；
- token 缺失时不得导致 build failure；
- token 缺失时 `/planner` 不得白屏 / crash；
- 显示明确的 Map fallback / setup state。

如本机有真实 token，可使用本机 `.env.local` 做 live map 浏览器验证，但不得写入 Git。

---

# 8. Map Provider 边界

不得把 Mapbox 初始化散落在 Planner 各组件。

建议建立明确边界，例如：

```text
src/lib/maps/
├─ mapbox-client.ts
├─ mapbox-config.ts
└─ map-types.ts

src/features/planner/
├─ map/
│  ├─ planner-mapbox.tsx
│  ├─ planner-map-layers.ts
│  ├─ planner-map-data.ts
│  └─ planner-map-events.ts
```

路径可根据现有工程调整。

要求：

> 后续更换 / 增加地图 Provider 时，右侧栏与底部面板无需重写。

---

# 9. 不大量使用 HTML Marker

地图正式要素优先：

```text
GeoJSON Source
+
Mapbox Style Layer
```

至少建立概念上清晰的 Layer：

```text
route-context
route-selected

hotel-area
food-area

attraction-pin
hotel-pin
restaurant-pin
transport-pin

reservation-status
selected-feature
```

如果实际实现为了简化使用更少 source / layer，可以，但必须保留同等职责边界。

少量详细卡 / Popup 可以使用 DOM overlay。

---

# 10. Map View Model

不得让 Mapbox 直接读取 Booking / Agoda / Restaurant Provider 原始结构。

建立 TravelAssist Map View Model。

至少支持：

```ts
type PlannerMapFeatureType =
  | "attraction"
  | "hotel"
  | "restaurant"
  | "transport"
  | "activity"
  | "hotelArea"
  | "foodArea";

type ReservationStatus =
  | "not_required"
  | "pending"
  | "booking"
  | "booked"
  | "ticketed"
  | "pay_on_site"
  | "failed"
  | "cancelled"
  | "changed";

type PlannerMapPlace = {
  id: string;
  tripItemId?: string;
  type: PlannerMapFeatureType;
  name: string;
  coordinates: [number, number];
  day?: number;
  tripStatus: "recommended" | "selected";
  reservationStatus?: ReservationStatus;
};
```

区域可以单独使用 Polygon 类型。

---

# 11. 单一状态源

TASK-008 已有 Mock Trip / Plan State。

TASK-008.1 必须继续坚持：

```text
Map
Right Panel
Bottom Panel
Detail Overlay
Reservation State
```

读取同一个 Planner State / Mock Trip Model。

禁止：

- Map 单独维护 itinerary；
- Bottom Panel 单独复制一份 hotel / restaurant；
- Right Panel 单独维护 reservation count。

所有状态派生自一个事实源。

---

# 12. tripItemId 联动

Map feature 与行程节点使用统一：

```text
tripItemId
```

## 12.1 点击地图

```text
Map Feature
→ tripItemId
→ selectedTripItemId
→ 底部行程滚动到对应项目
→ 卡片高亮
```

## 12.2 点击底部

```text
Trip Item
→ tripItemId
→ 查坐标
→ Mapbox easeTo / fit / highlight
```

不得建立互不一致的双向映射表。

---

# 13. 1日地图

使用 Mock GeoJSON 先实现。

必须显示：

- 当天正式路线；
- 当天正式景点；
- 起终点；
- 交通图标 / 摘要；
- 住宿；
- 午餐 / 晚餐区域；
- 少量推荐 / 备选地点；
- 预约状态轻标识。

---

# 14. 1日相邻灰线

例如选择 D5：

```text
D4 last → D5 first
```

和：

```text
D5 last → D6 first
```

使用 `route-context`。

要求：

- opacity 目标约 20%–30%；
- width 目标约主线 60%–70%；
- 不显示普通节点序号；
- 不显示细分交通图标；
- 其他日期完整路线隐藏。

不能把全程其他日路线全部灰显。

---

# 15. 3日地图

例如 D4–D6：

必须：

- D4 / D5 / D6 主路线正常；
- 核心地点带 D4 / D5 / D6 标签；
- 每天主要活动范围可理解；
- 住宿 / 换酒店可理解；
- 跨城路线突出；
- `D3→D4` 与 `D6→D7` 使用浅灰 context；
- 其他日期隐藏。

切换 3 日范围必须使用通用算法，不写死 3 天 Mock。

---

# 16. 全日地图

必须聚合为：

- 城市 / 主要区域；
- 机场 / 车站；
- 长距离路线；
- 住宿晚数摘要。

隐藏普通：

- 景点；
- 餐厅；
- 午晚餐区域；
- 市内小交通。

---

# 17. 范围切换技术规则

切换：

```text
1日
3日
全日
```

不得重新 new `mapboxgl.Map()`。

使用：

```text
State
→ selector
→ GeoJSON
→ source.setData(...)
```

地图实例保持。

也不得因为范围切换去调用真实 Route API。

本 Task 不接 Directions API。

---

# 18. 地图 fit / ease

范围切换后使用：

```text
fitBounds
easeTo
```

等 Mapbox 原生视图行为。

必须避免：

- 每次点击重新 mount 整张地图；
- 页面跳闪；
- 右侧栏 / 底部栏重排。

---

# 19. 景点 Pin 快速卡

点击景点 Pin：

一级快速卡至少显示：

- 图片 / 缩略视觉；
- 名称；
- 类型；
- 当前状态；
- 建议停留；
- 当前计划时间；
- 是否需要预约；
- 营业状态 Mock；
- 与上一 / 下一站移动摘要；
- 推荐标签。

操作：

```text
加入行程
加入预约
替换
锁定
移出
查看详细
```

按实际状态动态显示，不要求每个按钮同时存在。

---

# 20. 景点详细页 / 侧滑层

点击 `查看详细`。

必须包含：

```text
图片与基础信息
为什么推荐
游玩建议
营业时间
当前行程影响
交通
门票与预约
附近餐饮 / 住宿
```

## 20.1 为什么推荐

使用 Mock explain data，但语义必须体现：

- 为什么适合用户；
- 为什么适合今天；
- 是否顺路；
- 天气 / 同行适配。

不得只是普通百科详情。

## 20.2 当前行程影响

Mock 示例：

```text
加入后增加约 55 分钟
步行增加约 1.2 km
建议替换 X，可保持结束时间
```

这是本产品差异化核心，必须出现。

---

# 21. 住宿区域

地图使用 Polygon / Fill Layer 表达推荐住宿区域。

点击区域：

## 上半

显示区域解释：

- 为什么推荐；
- 适合 Dn–Dm；
- 连住建议；
- 交通便利；
- 晚间餐饮；
- 价格层级；
- 优点 / 缺点；
- 当前行程影响。

## 下半

显示 3–5 家 Mock 酒店推荐。

酒店卡至少：

- 图片；
- 名称；
- 价格 Mock；
- 推荐理由；
- 到交通枢纽便利度；
- 早餐 / 停车 / 行李寄存摘要；
- `加入预约` / `查看详情`。

---

# 22. 餐饮区域

餐饮区域同样使用 Polygon / Fill Layer。

点击区域：

## 上半

- 午餐 / 晚餐；
- 推荐时间；
- 推荐料理；
- 人均预算；
- 排队风险；
- 是否建议预约；
- 路线绕行时间；
- 为什么顺路。

## 下半

3–5 家 Mock 餐厅：

- 图片；
- 名称；
- 料理；
- 价格；
- 推荐菜；
- 预计用餐时间；
- 预约状态；
- `加入预约` / `查看详情`。

---

# 23. Provider UI 模型

本 Task 不接真实 Booking / Agoda 等 API。

但 Mock 数据结构要能表达：

```ts
type BookingOption = {
  providerId: string;
  providerName: string;
  bookingMode: "redirect" | "embedded" | "api-book";
  price?: number;
  currency?: string;
  cancellationSummary?: string;
  deeplink?: string;
  official: boolean;
  affiliate: boolean;
};
```

Mock 酒店可以示例：

- Official；
- Booking.com；
- Agoda。

Mock 餐厅可以示例：

- Official；
- TableCheck；
- OpenTable。

Mock 景点可以示例：

- Official；
- Klook；
- GetYourGuide / Viator 之一。

不得真的发第三方网络请求。

---

# 24. “加入预约”状态流

地图酒店 / 餐厅 / 景点：

```text
加入预约
```

后必须：

1. 加入当前方案；
2. 创建 / 更新 Trip Item；
3. 底部 `行程` 立即显示具体名称；
4. 状态变为：
   - `待预约`
   - 或 `待购票`
5. 右侧当前方案 pending count +1；
6. 地图 feature 转为 selected。

---

# 25. 底部行程预约状态

必须支持 Mock 示例。

酒店：

```text
20:00
Hotel A
入住 · 连住 3 晚
待预约
```

餐厅：

```text
18:30
Restaurant B
怀石料理 · 约1.5小时
待预约
```

景点：

```text
10:00
东京晴空塔
待购票
```

完成后：

```text
✓ 已预约
✓ 已购票
```

---

# 26. 底部 6 Tab 三种颗粒度

TASK-008 的 6 Tab 外框保留。

必须升级 `1日 / 3日 / 全日` 内容。

| Tab | 1日 | 3日 | 全日 |
|---|---|---|---|
| 行程 | 小时级时间轴 | 3 个日程块 | 城市 / 行程段 |
| 移动 | 当天主要移动 | 每日主交通 / 跨日 | 跨城长距离 |
| 预约·票务 | 当天详细订单 | 3 日关键预约 | 全程结构性预约 |
| 天气·备选 | 当天执行 | 三日比较 | 全程风险摘要 |
| 住宿·餐饮 | 当晚 / 当餐 | 三日衔接 | 住宿结构 / 特别餐 |
| 详细 | 当天深度 | 三日分析 | 全程健康检查 |

至少使用 Mock 数据真实切换，不允许所有范围显示同一份文本。

---

# 27. 右侧当前方案“完成预约”

当前方案条 / 当前方案区域新增：

```text
待预约 N 项
[完成预约]
```

点击后打开浮层 / overlay。

显示按行程排序的待处理项：

```text
D1
□ 长途交通

D2
□ 景点门票
□ 晚餐

D4–D6
□ 酒店
```

每项显示 Mock 预约渠道。

完成一项：

- reservation status 更新；
- pending count -1；
- Bottom 行程更新；
- Booking Tab 更新；
- Map status 更新。

全部完成：

```text
✓ 关键预约已完成
```

---

# 28. 完成预约 Mock 行为

本 Task 不对外部网站真实下单。

允许：

```text
前往预约
```

按钮打开：

- 空安全 mock；
- 或明确的非生产示例链接；
- 或只展示 Provider 选择层。

关键验收点是：

```text
我已完成预约 / 标记已预约
```

能够更新状态。

不得伪装为真实订单成功。

---

# 29. 固定预约时间

模拟：

```text
计划餐厅 18:30
预约结果 19:00
```

用户确认后：

- 时间轴改 19:00；
- Trip Item `fixedTime = true`；
- 显示时间变化提示；
- Mock replan 不应自动移动该节点。

景点固定入场同理。

---

# 30. More Settings / Replan 保持

TASK-008 现有：

- More Settings Popover；
- Mock Replan；
- 方案切换。

不得回归。

新增规则：

> `fixedTime = true` 的已预约节点在 Mock Replan 中保持。

至少通过测试验证。

---

# 31. Mapbox Token 缺失 fallback

CI / Codex 环境可能没有真实 token。

因此：

- build 必须通过；
- Planner 页面不得崩；
- 地图区显示明确：
  - “Mapbox token 未配置”
  - 或保持 TASK-008 fallback map；
- 其他详情 / 预约 Mock 交互仍然可测试。

如果本地有 token：

- 必须额外验证 live Mapbox；
- 最终 Result 记录：
  - `Live Mapbox verified: Yes/No`
  - `Reason if No: token unavailable`

不得因为 token 不在仓库就硬编码临时 token。

---

# 32. 当前 Task 不接的 Mapbox API

明确禁止在本 Task 顺便接：

```text
Directions API
Matrix API
Isochrone API
Search Box production API
Optimization API
```

可以定义接口边界 / TODO，但不发真实请求。

原因：

- 先稳定地图渲染和状态边界；
- 路线 Provider / Transit Provider 后续单独 Task；
- 避免一次把地图、路线、公共交通、第三方订单全部耦合。

---

# 33. 公共交通

不得用虚构 Mapbox transit profile。

本 Task 中公交 / 地铁 / 铁路继续使用 Mock Route Legs。

模型必须允许后续：

```text
Transit Provider
→ RouteLeg[]
→ GeoJSON
→ Mapbox
```

---

# 34. 响应式保护

TASK-008 已验证的布局规则必须保持：

- desktop 左侧约 75%；
- 右侧约 25%；
- 右侧上下约 1:1；
- 底部约 25% 页面高；
- `<1200px` 右栏 Drawer（以现有实际实现为准）；
- 低高度底栏 Sheet；
- mobile 不产生横向滚动。

新增详情 overlay / popup 不得破坏响应式。

---

# 35. 可访问性

至少：

- Map 区域按钮有可读 label；
- Pin / 区域可通过合理替代 UI 访问；
- Detail overlay 有标题与关闭按钮；
- Escape 关闭；
- Focus trap / restore 合理；
- `完成预约` 浮层可键盘操作；
- 预约状态不只靠颜色；
- selected feature 不只靠颜色。

Map canvas 本身无法完整键盘访问时，底部时间轴 / 推荐列表必须提供等价操作入口。

---

# 36. 测试

至少新增单元 / 组件逻辑测试：

1. `1日` 只显示当前日 + 前后 context；
2. `3日` 只显示连续三日 + 前后 context；
3. `全日` 聚合城市级数据；
4. 非选择其他日完全隐藏；
5. `加入预约` 更新 Trip Item；
6. pending count 正确；
7. 完成预约后状态同步；
8. 固定预约时间更新；
9. Mock Replan 保留 fixed item；
10. hotel area 点击展示酒店推荐；
11. food area 点击展示餐厅推荐；
12. map / timeline selection 使用同一个 `tripItemId`；
13. token 缺失不会 crash。

如果项目现有测试环境不适合 WebGL DOM，Mapbox 实例可通过 adapter/mock 测试，禁止为了测试运行真实外网地图请求。

---

# 37. 验证命令

完成后：

```bash
npm ci
npm run lint
npm run typecheck
npm run format:check
npm test
npm run build
git diff --check
```

若项目测试命令实际不是 `npm test`，读取 package.json 使用正式命令。

不得顺手格式化 / 修改无关 B 文件。

---

# 38. 浏览器验收

至少：

```text
1600×900
1440×900
1280×800
1180×800
1024×768
390×844
1440×650
```

检查：

- 无 console / hydration error；
- 有 token 时真实 Mapbox 可渲染；
- 无 token 时 fallback 不崩；
- Map 不重建导致闪屏；
- 1日 / 3日 / 全日正确；
- 灰线正确；
- 景点快速卡；
- 景点详细页；
- 住宿区域解释 + 酒店列表；
- 餐饮区域解释 + 餐厅列表；
- 加入预约；
- Bottom 状态；
- Booking Tab；
- 当前方案 pending count；
- 完成预约；
- fixed time；
- 右栏 / 底栏比例不回归；
- overlay 不超 viewport；
- 无横向滚动。

---

# 39. 明确不包含

```text
真实 Booking.com API
真实 Agoda API
真实 TableCheck API
真实 OpenTable API
真实 Klook API
真实 GetYourGuide / Viator API
真实支付
真实订单创建
退款 / 取消 API
真实 Provider 订单同步
真实 Directions
真实 Matrix
真实 Search Box
真实 Isochrone
真实 Transit
AI / OpenAI
Auth
DB
保存行程
/start → planner 整合
B Personal Center
```

---

# 40. WBS 更新规则

最终返回前必须读取最新：

```text
docs/project/WBS-TravelAssist.md
```

并加入 / 更新 TASK-008.1 追踪：

- Task ID；
- WBS；
- Owner；
- Status；
- Issue #60；
- Task File；
- Branch；
- Commit；
- PR。

状态：

```text
开始开发 → 进行中
实现完成、PR 未合并 → 待审查
PR 合并 develop 且验收通过 → 已完成
依赖 #59 未合并 → 阻塞
```

不得误标：

- `7.2 Places Provider` 完成；
- `7.3 Route / Transit Provider` 完成；
- `7.8 Route API` 完成；
- 第三方 Booking Provider 完成。

---

# 41. Result 文件

Codex 必须创建：

```text
docs/tasks/RESULT-TASK-008.1-a-planner-mapbox-interactions.md
```

并与 WBS 同一分支提交。

---

# 42. 最终返回格式

```md
# TASK-008.1-A Result

## Status
Completed / Partially Completed / Blocked

## Prerequisite
- TASK-008 PR #59 merged:
- base commit:
- design source found:

## Tracking
- Issue: #60
- Task File: docs/tasks/TASK-008.1-a-planner-mapbox-interactions.md
- Branch:
- Commit:
- PR:
- WBS updated:

## Mapbox
- mapbox-gl installed:
- token env:
- real token committed: No
- live Mapbox verified:
- fallback verified:
- map re-created on range switch: No

## Range Modes
- 1-day:
- adjacent context gray routes:
- 3-day:
- all-trip:

## Details
- attraction quick card:
- attraction detail:
- hotel area detail:
- hotel recommendations:
- food area detail:
- restaurant recommendations:

## Reservation State
- add reservation:
- bottom itinerary status:
- booking tab:
- current plan pending count:
- complete booking CTA:
- fixed time:
- replan protection:

## State Integrity
- single source:
- tripItemId map/timeline sync:
- provider raw data leaked into map: No

## Responsive
- 1600×900:
- 1440×900:
- 1280×800:
- 1180×800:
- 1024×768:
- 390×844:
- 1440×650:

## Validation
- npm ci:
- lint:
- typecheck:
- format:
- tests:
- build:
- diff-check:
- console/hydration:

## Scope Preserved
- real Booking/Agoda not added:
- real restaurant providers not added:
- real attraction providers not added:
- Directions/Matrix/Search/Isochrone not added:
- Transit not added:
- AI/Auth/DB not added:
- B files untouched:

## Problems / Blockers
- ...

## Ready For Review
Yes / No
```

完成 TASK-008.1 后停止，不继续真实 Route / Transit / Provider API Task。
