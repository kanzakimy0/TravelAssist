# TravelAssist 我的旅行 / Trip Library 设计书

> 文档版本：v1.0  
> 更新日期：2026-09-05  
> 对应 WBS：**1.27 保存行程 / 历史 / 草稿 / 收藏管理设计**  
> Owner：B / Personal Center  
> 状态：**设计已确认并冻结**  
> 视觉基准：`docs/ui/personal-center.md` / 1.21 方案 D  
> 上位订单规则：`main:docs/ui/trip-external-reservations.md`（v1.0 已确认设计）

---

## 1. 页面定位

「我的旅行」是个人中心中管理用户旅行资产的统一入口。

它负责：

- 已保存旅行
- 即将出发旅行
- 草稿
- 历史旅行
- 收藏
- 旅行卡片的预订完成度与待处理摘要
- 搜索 / 筛选 / 排序
- 新建旅程入口
- 从个人中心进入单次旅行的统一入口

核心原则：

> **所有订单都是某一次旅行的一部分。**

因此不新增“外部订单 / Booking / Agoda / Klook”等 Personal Center 一级入口。Partner 只作为 Reservation 的来源属性显示。

---

## 2. 与 A 侧 `trip-external-reservations.md` 的关系

A 侧已确认的上位结构为：

```text
我的旅行
  ↓
某次旅行
  ↓
总览 ｜ 地图 ｜ 日程 ｜ 预订 ｜ 预算 ｜ 设置
```

1.27 必须遵守该结构。

因此：

- `Reservation Hub` 属于**某次旅行内部的「预订」Tab**；
- 不把「订单与预约」提升为“我的旅行”主页一级 Tab；
- Booking.com / Agoda / Trip.com / Klook / GetYourGuide / Viator / OpenTable / TableCheck / 航空公司 / 铁路 / 租车等均作为订单来源；
- 外部订单的最终库存、支付、退款、履约信息以 Partner 为 Source of Truth。

---

# 3. Information Architecture

## 3.1 Personal Center Sidebar

继续沿用 1.21：

```text
我的首页
我的旅行
旅行偏好
同行人
账户
```

本页选中：

```text
我的旅行
```

不新增：

```text
外部订单
订单中心
Booking
Agoda
```

---

## 3.2 「我的旅行」主页页内 Tab

```text
[全部] [即将出发] [草稿] [历史] [收藏]
```

Tab 含义：

- **全部**：未来旅行优先 + 最近编辑旅行；
- **即将出发**：未来有效 Trip；
- **草稿**：存在可恢复 Planner State、尚未形成稳定计划的 Trip；
- **历史**：已经结束的 Trip；
- **收藏**：用户保存的行程 / 景点 / 住宿 / 餐饮 / 活动候选。

---

# 4. Desktop 16:9 页面结构

```text
┌──────────────────────────────────────────────────────────────┐
│ Sidebar               │                          🔔  Avatar  │
│                       │                                      │
│ TravelAssist          │  我的旅行            [ + 新建旅程 ] │
│                       │  管理行程、预订与收藏                 │
│ ○ Yuki                │                                      │
│                       │ [全部][即将出发][草稿][历史][收藏]    │
│ 我的首页              │                                      │
│ 我的旅行 ← Selected   │ [搜索旅行…] [目的地▼] [排序▼]         │
│ 旅行偏好              │                                      │
│ 同行人                │ ┌──────────────────────────────────┐ │
│ 账户                  │ │ 下一次旅行 / 重点旅行 Hero       │ │
│                       │ │ 预订完成度 + 需要处理             │ │
│ [鸟居水景插画]        │ └──────────────────────────────────┘ │
│                       │                                      │
│                       │ [旅行卡] [旅行卡] [旅行卡]           │
└──────────────────────────────────────────────────────────────┘
```

---

# 5. 视觉规范

严格沿用 1.21 Personal Center 方案 D：

- 暖米白主背景；
- 极浅和纸纹理；
- 低饱和樱粉 / 珊瑚朱红强调；
- 深蓝黑正文；
- 浅粉描边 + 柔和阴影 + 圆角；
- 左侧固定 Sidebar；
- 左下继续保留低对比度鸟居水景插画；
- 旅行卡 / Hero 使用**写实旅行摄影**；
- 写实图片整体饱和度和对比度约降低 10%；
- 右侧主内容区禁止铺设大面积富士山、鸟居或装饰文字背景；
- Partner Logo / 名称只作次级来源标签，不抢占旅行主体视觉。

---

# 6. 新建旅程

页面标题右上角增加主 CTA：

```text
[ + 新建旅程 ]
```

## 6.1 点击行为

```text
我的旅行
↓
+ 新建旅程
↓
直接进入现有 Step 3
```

不经过 Step 1 / Step 2。

## 6.2 继承规则

从个人中心发起新旅程时：

- 读取已保存的长期旅行偏好；
- 读取可用同行人资料；
- 不自动替用户选择同行人；
- 不继承其他 Trip 的临时设置；
- 不提前创建新 Trip，沿用 Step 3 现有创建条件；
- 历史旅行的「复制旅行」走复制逻辑，不走「新建旅程」。

## 6.3 动作语义

```text
新建旅程
→ 新 Trip → Step 3

继续旅行
→ 打开已有 Trip

复制旅行
→ 基于旧 Trip 创建新 Trip

导入已有预订
→ 将 Reservation 加入已有 Trip
```

---

# 7. 下一次旅行 / 重点旅行 Hero

当存在未来 Trip 时，在「全部」与「即将出发」顶部显示重点 Hero。

建议展示：

```text
京都春日漫游
2027.03.18 - 03.23 · 6天5晚
12天后出发 · 2位同行人

预订完成度 72%

住宿      3/3
门票      5/7
餐饮      2/5
交通      1/3

⚠ 2项需要处理

[查看旅行] [继续规划]
```

原则：

- Hero 不展开完整订单；
- 只展示执行完成度和最高优先级异常；
- 点击「需要处理」进入该 Trip 的总览 / 预订处理入口。

---

# 8. 旅行卡 Trip Card

旅行卡必须从纯“目的地卡”升级为：

> **行程状态 + 预订执行状态的摘要卡。**

示例：

```text
京都春日漫游
2027.03.18 - 03.23
6天5晚 · 2位同行人

预订完成度 72%
住宿 3/3 · 门票 5/7 · 餐饮 2/5 · 交通 1/3

⚠ 2项需要处理

[继续旅行]  ⋯
```

卡片可出现：

- ✓ 预订完整
- N 项待确认
- N 项订单冲突
- N 项同步失败
- N 项尚未预订
- 退款处理中

Partner 品牌不得作为旅行卡主标题。

---

# 9. 搜索 / 筛选 / 排序

## 9.1 搜索

支持：

- 行程名称
- 目的地

## 9.2 筛选

候选：

- 目的地
- 年份
- 同行人
- Trip 状态

## 9.3 排序

- 最近编辑
- 最近创建
- 出发时间近 → 远
- 出发时间远 → 近

默认建议：

- 全部：最近编辑；
- 即将出发：出发时间近 → 远；
- 草稿：最近编辑；
- 历史：最近结束。

---

# 10. 草稿

Draft 定义：

> 用户已产生可恢复 Planner State，但尚未形成稳定正式计划。

草稿卡显示：

- 目的地 / 日期（若已有）；
- 最后编辑时间；
- 规划完成度；
- 已关联 Reservation 数量；
- `继续规划`；
- `删除草稿`。

草稿允许存在有效 Reservation。

删除存在有效外部订单的草稿时必须提示：

```text
此草稿包含已导入的外部预订。

删除 TravelAssist 草稿不会取消合作伙伴订单。

[取消]
[仅删除草稿]
```

---

# 11. 历史旅行

历史 Trip 建议按年份分组：

```text
2027
2026
2025
```

历史 Trip 保存：

- Trip Plan Snapshot；
- Companion Snapshot；
- Reservation Snapshot；
- Partner 来源；
- 价格 Snapshot；
- 最终订单状态。

后续长期偏好 / 同行人资料修改不得改写历史。

主要操作：

```text
查看回顾
复制旅行
收藏 / 取消收藏
```

---

# 12. 收藏

1.27 保留：

```text
我的旅行 → 收藏
```

因为 1.21 首页「我的收藏」统一进入这里。

收藏可覆盖：

- 行程
- 景点
- 住宿
- 餐饮
- 活动

建议页内筛选：

```text
[全部] [行程] [景点] [住宿] [餐饮] [活动]
```

收藏含义：

> 想去 / 想订 / 想保留以后参考。

它与 Reservation 不同：Reservation 已经与某个 Trip 产生执行关系。

收藏卡操作：

```text
加入行程
查看详情
查看价格 / 预约
取消收藏
```

---

# 13. 点击某一次旅行后的导航

进入 Trip 后使用：

```text
京都春日漫游

[总览] [地图] [日程] [预订] [预算] [设置]
```

其中：

- 地图：A；
- 日程：A；
- Planner 修改 / 重排：A；
- 预订渠道 / Deep Link：A；
- Reservation Hub 个人管理视图：B 与 A Contract 联动；
- 总览读取 Trip + Reservation 统一状态。

---

# 14. 单次旅行总览：预订摘要

总览必须有：

```text
预订状态

住宿      ✓ 3/3
门票        5/7
餐饮        2/5
交通        1/3
租车      未安排

[查看全部预订]
```

点击进入当前 Trip 的：

```text
预订
```

---

# 15. 单次旅行总览：需要处理

高优先区域：

```text
需要您处理 3

⚠ 发现一笔新的 Booking.com 酒店订单
⚠ teamLab 门票与新干线时间冲突
○ Day 5 京都 → 东京 尚未购票

[查看全部]
```

不新增独立「冲突中心」。

---

# 16. Reservation Hub

位置：

```text
某次旅行 → 预订
```

顶部状态筛选：

```text
[全部] [待处理] [已确认] [已取消]
```

分类：

```text
住宿
景点 / 门票
餐厅
交通
航班
租车
其他
```

排序：

- 按旅行日期
- 按预订日期
- 按需要处理
- 按免费取消截止时间

---

# 17. 导入已有预订

在 Trip 总览和 Reservation Hub 均可提供：

```text
+ 导入已有预订
```

入口能力：

```text
导入已有预订

○ 连接 Booking.com
○ 从确认邮件自动识别
○ 上传确认单 / PDF
○ 输入订单号
○ 手动添加
```

规则：

- **手动添加永久保留为兜底**；
- 连接 Booking / Agoda 等不是从 TravelAssist 发起预订的前置条件；
- MVP 不要求用户必须连接第三方账户。

---

# 18. 待匹配订单

外部订单发现后尝试匹配 Trip / Day / Item。

示例：

```text
发现新的预订

Booking.com
THE GATE HOTEL 京都
9/12 - 9/14
2位成人

可能对应：
Day 3-4 · 京都住宿

[确认加入]
[查看详情]
[不是这个行程]
```

匹配状态：

- 自动匹配成功
- 建议匹配
- 等待用户确认
- 无法匹配
- 重复订单
- 已忽略

匹配可参考：

- 城市 / 地点
- 日期
- 住宿夜数
- 订单类型
- Trip 中的空缺节点
- 用户 / 同行人数

---

# 19. Reservation Card

示例：

```text
京都酒店
✓ 已确认

Booking.com

9/12 - 9/14
¥38,500

免费取消至
9/10 23:59

[查看详情]
```

原则：

- 订单实体名称优先；
- Partner 只作来源标签；
- 状态必须清晰；
- 高风险 / 待处理项优先显示。

---

# 20. Reservation 详情

统一展示：

- 订单名称
- Partner
- 订单状态
- 行程日期
- 预订日期
- 人数
- 价格 / 币种
- Partner Booking ID
- Confirmation Code
- Voucher
- QR Code
- 地址 / 集合地点
- 取消政策
- 免费取消截止时间
- 最后同步时间
- TravelAssist 可执行操作
- Partner 端管理入口

按钮按 Partner 能力显示：

```text
[查看凭证]
[修改预订]
[取消预订]
[在合作伙伴中查看]
```

---

# 21. Reservation 状态标准化

沿用 A 已确认状态语言：

```text
已确认
等待确认
修改处理中
已修改
取消处理中
已取消
退款处理中
部分退款
已退款
订单失败
同步失败
```

TravelAssist 不得在 Partner 尚未确认时自行将状态写成：

```text
已取消
已退款
```

---

# 22. 来源与操作权限分离

订单详情必须明确：

```text
来源
Booking.com

TravelAssist 可执行
查看 / 同步

需要前往 Booking.com
修改 / 取消
```

如果 Partner API 支持，可显示：

```text
TravelAssist 可执行
查看 / 修改 / 取消
```

避免误导用户对订单控制权的理解。

---

# 23. 时间轴联动

时间轴实现归 A，但 1.27 / Reservation 数据必须提供统一状态。

已确认：

```text
15:00
THE GATE HOTEL 京都

✓ 已预订
Booking.com
确认号 ••••7812

[查看订单]
```

尚未预订：

```text
15:00
京都住宿

○ 尚未预订

[查看推荐酒店]
```

冲突：

```text
15:00
teamLab

⚠ 与 16:00 火车时间冲突

[查看调整建议]
```

---

# 24. 地图联动

地图 Pin 只展示轻量 Reservation 状态：

```text
✓ 已预订
○ 尚未预订
◌ 等待确认
⚠ 冲突
× 已取消
```

地图 / 时间轴 / Reservation Hub 必须读取同一 Reservation State。

---

# 25. 重复订单检测

同一订单可能同时来自：

- Partner Sync
- 确认邮件
- 手动添加

出现疑似重复时：

```text
发现可能的重复订单

THE GATE HOTEL 京都
9/12 - 9/14

Booking.com 同步
确认邮件导入

[合并]
[保留两个]
```

去重参考：

- Partner Booking ID
- Confirmation Code
- 实体名称
- 日期
- 人数
- 金额

---

# 26. 冲突与需要处理

所有异常归入：

```text
需要处理
```

例如：

- 酒店日期少 1 晚；
- 门票与火车冲突；
- 餐厅预约晚于末班车；
- 同步失败；
- 退款处理中。

基础冲突提示 Free 用户必须可见。

高级自动冲突分析 / AI 自动重排可作为 Premium 增强能力。

---

# 27. 尚未预订

Trip 总览 / Reservation Hub 可显示：

```text
尚未完成

○ Day 2 午餐
○ Day 4 京都 → 东京
○ Day 5 teamLab 门票
```

点击进入推荐 / 比价 / Partner 预订流程。

这些核心预订入口对 Free 用户开放，不能用 Premium 阻断 Partner 转化。

---

# 28. 删除规则

## 28.1 删除 Trip / 草稿

存在未来有效外部 Reservation 时必须强提示：

```text
此旅行仍有关联的有效预订。

删除 TravelAssist 行程不会取消外部平台订单。

建议先确认 Partner 订单状态。

[取消]
[继续删除 TravelAssist 行程]
```

绝不能让用户误解：

```text
删除 TravelAssist Trip = 取消 Booking / Agoda / Klook 订单
```

---

# 29. 个人中心「预订与账户同步」

该入口不放在“我的旅行”主页面一级导航。

建议进入：

```text
账户 → 预订与账户同步
```

文案：

> **预订与账户同步**

不以「绑定第三方账号」作为主文案。

状态示例：

```text
Booking.com
✓ 已连接
10分钟前同步

确认邮件
✓ 已连接
今天 13:20 扫描

Agoda
通过合作伙伴订单同步
```

账号连接为增强能力，不是预订前置条件。

---

# 30. Free / Premium 边界

## Free

必须包括：

- 酒店 / 景点 / 餐厅 / 交通搜索、比价、预订；
- Partner 跳转；
- 通过 TravelAssist 发起的 Reservation 进入 Reservation Hub；
- 查看 Voucher / QR / Confirmation；
- 基础 Reservation 状态；
- 基础冲突提示；
- 手动导入；
- 基础订单管理。

## Premium

可以增强：

- 确认邮件自动识别整理；
- 高级账号自动同步；
- 自动冲突分析；
- 异常后 AI 自动重排；
- 主动提醒；
- 价格持续监控；
- 完整离线旅行包。

核心原则：

> **会员收费不阻断任何能产生 Partner 预订与返佣的核心流程。**

---

# 31. Empty States

## 没有任何旅行

```text
还没有旅行

开始规划下一次旅程，
TravelAssist 会把行程、预订和收藏统一保存在这里。

[ + 新建旅程 ]
```

点击直接进入 Step 3。

## 没有草稿

```text
没有未完成的草稿
```

## 没有历史

```text
完成旅行后，它会出现在这里。
```

## 没有收藏

```text
看到喜欢的旅行或地点时，
点击 ♡ 就可以在这里找到。
```

---

# 32. 与 1.21 Personal Center 首页联动

Personal Center Home 的：

- 下一次旅行；
- 我的旅行预览；
- 我的收藏入口；

全部读取 1.27 / Trip Library 的同一数据源。

```text
Trip Library
├─ Personal Center Home Preview
└─ 我的旅行完整管理页
```

禁止首页另维护一份 Trip 列表或 Reservation 状态。

---

# 33. A / B 边界

## A 负责

```text
Planner
Map
Timeline
POI / Hotel / Restaurant Detail
预约渠道选择
Deep Link
Trip State
Reservation 对路线 / 时间的影响
冲突检查
重新规划
```

## B 负责

```text
Personal Center / 我的旅行
Trip Library
草稿 / 历史 / 收藏管理 UI
Reservation Hub 个人管理视图
导入已有预订 UI
待匹配订单 UI
重复订单 UI
个人中心 Reservation 摘要
```

## Shared Contract

```text
Trip
Trip Snapshot
Reservation Record
Canonical Entity
Provider
Reservation Status
```

---

# 34. 推荐数据关系（设计期）

```text
Trip
├─ TripPlanSnapshot
├─ CompanionSnapshot
├─ ReservationRecords[]
└─ Favorite / Candidate References

ReservationRecord
├─ tripId
├─ dayId?
├─ entityId
├─ category
├─ provider
├─ providerBookingId?
├─ confirmationCode?
├─ status
├─ paymentStatus?
├─ startAt
├─ endAt?
├─ priceSnapshot?
├─ currency?
├─ cancellationDeadline?
├─ providerManageUrl?
└─ source
   ├─ travelassist_redirect
   ├─ provider_callback
   ├─ email_import
   ├─ pdf_import
   └─ manual
```

最终字段由后续 5.18 / 5.19 冻结。

---

# 35. 已确认概念图覆盖范围

本轮概念视觉已确认覆盖以下界面类型：

1. 「我的旅行」全部 / 即将出发主页；
2. 草稿列表；
3. 历史旅行列表；
4. 收藏页；
5. 单次旅行总览（预订概览 + 需要处理）；
6. 单次旅行「预订」Reservation Hub；
7. 「导入已有预订」Drawer；
8. 待匹配 Booking.com 订单；
9. 已确认 Reservation 列表；
10. Reservation 详情 / Voucher / QR / Partner 管理入口。

所有概念图以 1.21 方案 D 为视觉基准，开发阶段不得把它们误解为新的独立视觉体系。

---

# 36. 1.27 冻结项

- [x] 「我的旅行」为 Personal Center 唯一旅行资产一级入口；
- [x] 页内 Tab：全部 / 即将出发 / 草稿 / 历史 / 收藏；
- [x] 页面右上新增「+ 新建旅程」，点击直接进入 Step 3；
- [x] 旅行卡显示 Reservation 完成度；
- [x] 旅行卡显示“需要处理 N 项”；
- [x] 点击 Trip 后进入：总览 / 地图 / 日程 / 预订 / 预算 / 设置；
- [x] Reservation Hub 属于单次 Trip 的「预订」Tab；
- [x] Partner 作为来源属性，不作为一级导航；
- [x] 支持导入已有预订；
- [x] 保留手动添加作为兜底；
- [x] 支持待匹配订单；
- [x] 支持重复订单检测；
- [x] Reservation 状态标准化；
- [x] 来源与可管理权限分离；
- [x] 时间轴 / 地图 / Reservation Hub 共用统一 Reservation State；
- [x] 草稿 / 历史保留 Snapshot；
- [x] 删除 TravelAssist Trip 不等于取消外部 Partner 订单；
- [x] 「预订与账户同步」进入账户相关页面，不占用我的旅行一级导航；
- [x] Free 用户不被阻断核心预订、订单查看、Voucher / QR、基础冲突提示；
- [x] Premium 只增强自动化、同步、AI 与监控能力。

---

# 37. 后续工程对应

设计冻结后主要进入：

- `5.10` 保存行程 / 历史 / 草稿 / 收藏 UI；
- `5.18` 保存行程 / 历史 / 草稿数据模型；
- `5.19` Trip Save / Read / History Contract；
- Reservation 相关 Contract 需要与 A 的 Trip / Planner / Booking State 对齐；
- `1.28` / Account 后续补齐「预订与账户同步」设置入口；
- `1.29` 统一处理 Personal Center 响应式 / 状态页规范。
