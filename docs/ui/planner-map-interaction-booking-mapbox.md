# TravelAssist Planner 地图、详情、预约与 Mapbox 统一设计书

> 文档状态：v1.0 / 本聊天内地图相关决策合并版  
> 更新日期：2026-09-05  
> Owner：A / Main Travel System  
> 适用：Web Planner；后续 Mobile App 复用业务模型  
> 关联基础设计：`docs/ui/trip-planner.md`  
> 本文优先级：**本文 > `trip-planner.md` 中与地图范围、Pin/区域详情、预约联动、Mapbox 有冲突的旧描述 > 旧概念图**

---

# 1. 文档目的

本文合并本轮关于 Planner 地图页的全部新决策，统一覆盖以下内容：

1. `1日 / 3日 / 全日（全行程）` 三种地图观察尺度；
2. 非选择日期路线的灰线显示规则；
3. 底部 6 Tab 在三种时间尺度下的信息变化；
4. 景点 Pin 的快速卡与详细页；
5. 住宿区域点击后的解释、酒店推荐与酒店详情；
6. 餐饮区域点击后的解释、餐厅推荐与餐厅详情；
7. Booking.com / Agoda 等住宿预约渠道的接入边界；
8. TableCheck / OpenTable / 官方预约等餐饮预约渠道的接入边界；
9. 景点门票与外部预约渠道；
10. “加入预约 → 底部行程出现 → 右侧完成预约 → 已预约状态回写”的统一状态流；
11. Mapbox 在 TravelAssist 中的职责、数据边界与技术接入方式；
12. 后续 Directions / Matrix / Isochrone / Search / Transit 的阶段划分。

本文不重新定义已经冻结的 Planner 页面整体布局。基础布局继续保持：

```text
地图工作区 ≈ 75%
右侧栏 ≈ 25%
右侧栏上 / 下 ≈ 1 : 1
底部信息栏 ≈ 页面高度 25%，只覆盖左侧地图工作区
```

---

# 2. 核心产品原则

## 2.1 三个区域的职责

```text
地图
= 空间关系、位置、区域、路线

底部信息栏
= 时间、顺序、执行、状态、数据

右侧栏
= 整趟旅行的设置、方案、待完成任务
```

## 2.2 Mapbox 的职责

Mapbox 是：

> **空间可视化 + 道路路线能力提供者**

而不是：

> 行程系统、预约系统、推荐系统、订单系统。

TravelAssist 决定：

- 去哪里；
- 什么时候去；
- 哪些地点属于哪一天；
- 哪条路线高亮；
- 哪条路线标灰；
- 住哪个区域；
- 在哪里吃；
- 是否已经预约；
- 哪个方案是当前方案；
- 推荐原因与替代方案。

Mapbox 决定：

- 地图怎么渲染；
- 坐标在哪里；
- 道路几何怎么画；
- 步行 / 自驾 / 骑行等道路路线；
- 点到点距离与时间；
- 可达区域等空间结果。

## 2.3 预约的产品定义

预约不是一套独立于行程之外的清单。

> **预约 = 行程节点的状态。**

酒店、餐厅、景点门票、长途交通，一旦用户加入当前方案，就成为 Trip State 的正式节点。

---

# 3. 1日 / 3日 / 全日 地图观察尺度

三种模式不是单纯缩放地图，而是三套不同的信息颗粒度。

| 模式 | 定位 | 用户主要问题 |
|---|---|---|
| 1日 | 执行模式 | 今天具体怎么走、几点去哪、吃什么、住哪里 |
| 3日 | 调整模式 | 连续几天是否合理、是否折返、住宿是否顺 |
| 全日 / 全行程 | 规划模式 | 整趟旅行城市顺序、停留天数、长距离移动是否合理 |

---

# 4. 日程范围选择器

位置继续保持：

> 地图最右侧、右侧栏左边。

基础：

```text
1日
3日
全日
```

## 4.1 1日

点击后，按钮原位变成：

```text
第5天 ▼
3日
全日
```

下拉允许选择任意 Day。

切换后：

- 地图突出该日；
- 底部栏切换该日；
- 当前方案不变化；
- 右侧设置不变化；
- 当前底部 Tab 尽量保持；
- 地图平滑调整视野。

## 4.2 3日

点击后按钮原位变成：

```text
Day 4–6 ▼
```

或：

```text
从第4天开始的3天 ▼
```

下拉只生成有效连续 3 日窗口。

## 4.3 全日

点击后：

- 显示全行程城市 / 大区域 / 长距离主线；
- 不显示起始日下拉；
- 底部栏同步切换为全行程结构模式。

---

# 5. 1日地图内容

## 5.1 必须显示

- 当天正式主路线；
- 起点 / 终点；
- 正式景点 / 活动；
- 景点顺序；
- 主要交通方式；
- 当晚住宿 / 住宿区域；
- 午餐 / 晚餐推荐区域；
- 已确认餐厅；
- 已预约活动；
- 约 3–5 个顺路 / 备选 / 雨天替代地点。

## 5.2 正式节点

正式行程节点可显示：

- 顺序编号；
- 小型象征图；
- 预约状态轻标识。

例如：

```text
1 清水寺
2 二年坂
3 祇园
4 锦市场
```

## 5.3 默认隐藏

- 其他日期全部普通景点；
- 其他日期完整路线；
- 大量候选餐厅；
- 大量候选酒店；
- 无关 POI。

---

# 6. 3日地图内容

例如正在查看 D4–D6。

## 6.1 必须显示

- 三天各自的主路线；
- 每天主要活动区域；
- 每天 3–4 个核心地点；
- 每晚住宿；
- 连住 / 换酒店；
- 跨日移动；
- 跨城铁路 / 自驾 / 飞机 / 渡轮等重点移动；
- 住宿区域变化。

## 6.2 日期标签

地图地点明确显示：

```text
D4 · 清水寺
D5 · 岚山
D6 · 金泽站
```

不能只依赖路线颜色区分日期。

## 6.3 可显示轻量摘要

- 三天总移动；
- 换酒店次数；
- 最忙一天；
- 最长移动段；
- 是否存在明显折返。

---

# 7. 全行程地图内容

## 7.1 必须显示

- 城市 / 大区域节点；
- 城市间长距离主线；
- 每个城市停留天数 / 晚数；
- 连住与换酒店结构；
- 抵达 / 离境机场；
- 重要车站；
- 租车 / 还车点；
- 港口；
- 国家 / 大区域分组（长行程时）。

示例：

```text
东京 · 4天3晚
  ↓
箱根 · 1晚
  ↓
京都 · 4天3晚
  ↓
大阪 · 2天1晚
```

## 7.2 默认隐藏

- 普通景点；
- 普通餐厅；
- 午晚餐区域；
- 市内公交 / 地铁；
- 步行路线；
- 临时候选 POI。

---

# 8. 非选择日期路线灰线规则

不采用“其他所有日期全部铺成灰色”的方案。

冻结原则：

> **当前范围 = 主信息；相邻日期 = 灰色上下文；其他日期 = 隐藏。**

## 8.1 1日

查看 D5：

```text
D4 最后节点 ─灰→ D5 起点
D5 正式路线
D5 终点 ─灰→ D6 第一节点
```

只保留这两段上下文。

## 8.2 3日

查看 D4–D6：

```text
D3 → D4  浅灰
D4–D6    正常
D6 → D7  浅灰
```

其他日期隐藏。

## 8.3 全日

不存在“非选择日期”，所以全程主要路线正常显示。

## 8.4 视觉参考

灰色上下文路线：

- opacity：约 20%–30%；
- line width：主线路的约 60%–70%；
- 不显示普通景点编号；
- 不显示详细交通图标；
- 默认不争夺视觉注意力；
- hover 可轻微增强。

---

# 9. 底部信息栏总体规则

继续使用固定 6 Tab：

```text
行程
移动
预约·票务
天气·备选
住宿·餐饮
详细
```

切换 `1日 / 3日 / 全日`：

- 不改变 6 Tab 数量；
- 不改变整体外框；
- 不改变主视觉语言；
- 只改变内部数据颗粒度。

---

# 10. 1日模式底部信息栏

## 10.1 行程

主体为小时 / 分钟级时间轴。

例如：

```text
08:30 酒店出发
09:10–11:00 清水寺
11:15–12:00 二年坂
12:10–13:10 午餐
13:40–15:20 祇园
18:30 晚餐
20:00 入住酒店
```

节点可显示：

- 时间；
- 地点；
- 停留时长；
- 交通方式；
- 移动时间；
- 预约状态；
- 是否可调整。

## 10.2 移动

显示当天主要移动段，可展开：

- 步行；
- 驾车；
- 电车；
- 公交；
- 换乘；
- 距离；
- 时间；
- 停车 / 通票等必要信息。

## 10.3 预约·票务

显示当天预约详细管理：

- 门票；
- 餐厅；
- 酒店；
- 固定活动；
- 长途交通；
- Provider；
- 订单号；
- 取消截止；
- 凭证；
- 修改 / 取消入口。

## 10.4 天气·备选

- 当天天气；
- 日出 / 日落；
- 风险；
- 雨天路线；
- 室内备选。

## 10.5 住宿·餐饮

住宿：

- 今晚酒店 / 区域；
- 入住时间；
- 连住晚数；
- 次日出发便利性。

餐饮：

- 午餐；
- 晚餐；
- 推荐区域；
- 具体餐厅；
- 是否预约。

## 10.6 详细

- 总移动；
- 总步行；
- 景点数；
- 体力强度；
- 营业风险；
- 费用摘要；
- 行李；
- 儿童 / 老人 / 无障碍；
- AI 说明（后续）。

---

# 11. 3日模式底部信息栏

## 11.1 行程

主体改成 3 个日程块：

```text
D4 京都东山      4个核心地点 · 高强度
D5 岚山          3个核心地点 · 中强度
D6 京都 → 金泽   跨城移动 · 换酒店
```

点击某一天：

- 地图突出该日；
- 该日卡展开；
- 其他两天保留摘要；
- 可进入该日 1日模式。

## 11.2 移动

显示：

- 每日总移动；
- 三天主要交通；
- 跨日 / 跨城移动；
- 换酒店路线。

隐藏细碎 5 分钟步行等。

## 11.3 预约·票务

按日汇总：

- 固定预约；
- 已购票；
- 长途交通；
- 时间冲突；
- 需要提前处理的项目。

## 11.4 天气·备选

强调三天比较：

- 哪天更适合户外；
- 哪天适合室内；
- 是否建议互换日程。

## 11.5 住宿·餐饮

住宿：

- 每晚住哪里；
- 是否连住；
- 是否换酒店；
- 换酒店带来的额外移动。

餐饮：

- 每天午餐 / 晚餐区域；
- 已预约重点餐厅。

## 11.6 详细

- 三天总移动；
- 总步行；
- 每日强度；
- 最忙 / 最松一天；
- 换住宿次数；
- 明显折返；
- 预约冲突；
- AI 调整建议（后续）。

---

# 12. 全行程底部信息栏

## 12.1 行程

主体改为城市 / 行程段：

```text
D1–D4 东京
D5 箱根
D6–D9 京都
D10–D11 大阪
D12 离境
```

点击城市段：

- 地图高亮对应区域；
- 显示进入 / 离开的长距离交通；
- 可进入 3日 / 1日模式。

## 12.2 移动

只显示：

- 城市 → 城市；
- 飞机；
- 长距离铁路；
- 长途自驾；
- 渡轮；
- 机场连接。

## 12.3 预约·票务

只突出结构性重要预约：

- 航班；
- 长途铁路；
- 重点景点；
- 特别餐饮；
- 影响整段路线的固定活动。

## 12.4 住宿·餐饮

住宿重点：

- 每城住几晚；
- 连住；
- 换酒店；
- 是否存在频繁一晚换宿。

普通餐饮默认不铺开，只显示特殊预约。

## 12.5 详细

全程健康检查：

- 总天数；
- 城市数；
- 国家 / 区域数；
- 换酒店次数；
- 跨城次数；
- 最长移动日；
- 连续高强度区间；
- 明显绕路；
- 城市停留过短；
- 预算结构。

---

# 13. 地图 Pin / 区域详情的两级交互

统一采用：

```text
地图 Feature
  ↓
一级：快速卡
  ↓
二级：详细页 / 侧滑层
```

避免点击一次就打开过重页面。

---

# 14. 景点 Pin

## 14.1 快速卡

至少显示：

- 名称；
- 图片；
- 类型；
- 当前状态：已加入 / 推荐 / 备选 / 已预约；
- 推荐停留时间；
- 当前计划到达时间；
- 营业状态；
- 是否需要预约；
- 门票级别；
- 与上一站 / 下一站移动时间；
- 适合摄影 / 亲子 / 雨天等标签。

操作：

```text
加入行程
加入预约（需要预约时）
替换
锁定
移出
查看详细
```

## 14.2 景点详细页

顺序建议：

1. 图片与基础信息；
2. 为什么推荐；
3. 游玩建议；
4. 营业时间；
5. **当前行程影响**；
6. 交通；
7. **门票与预约**；
8. 附近餐饮 / 住宿。

### “为什么推荐”

不是只显示百科资料。

要回答：

- 为什么适合这位用户；
- 为什么适合放在今天；
- 是否顺路；
- 天气是否合适；
- 与同行人是否匹配。

### “当前行程影响”

显示：

- 加入后增加多少时间；
- 增加多少步行；
- 是否绕路；
- 是否影响固定预约；
- 是否建议替换其他点。

---

# 15. 住宿区域

地图默认优先显示：

> **住宿推荐区域**

而不是几十个酒店 Pin。

## 15.1 点击区域

出现区域说明卡：

- 区域名称；
- 为什么推荐；
- 适合哪几天；
- 建议连住几晚；
- 到主要景点平均时间；
- 到车站 / 机场便利度；
- 晚间餐饮；
- 价格层级；
- 优点 / 缺点；
- 对当前行程的影响。

例如：

> 京都站区域适合 D4–D6 连住 3 晚。与中途换住祇园相比，可减少一次行李搬运，并降低跨城日压力。

## 15.2 区域下面直接给酒店推荐

默认 3–5 家。

每张酒店卡：

- 图片；
- 名称；
- 类型 / 星级；
- TravelAssist 推荐理由；
- 当前路线便利度；
- 参考价格；
- 取消条件摘要；
- 早餐；
- 停车；
- 行李寄存；
- 亲子 / 无障碍等标签。

操作：

```text
查看酒店
加入候选
比较价格
加入预约 / 设为住宿
```

## 15.3 酒店详情

包含：

- 区域与路线关系；
- 到每日第一站 / 最后一站；
- 到交通枢纽；
- 入退房；
- 房型；
- 早餐；
- 停车；
- 取消政策；
- 预约与价格渠道。

---

# 16. 餐饮区域

同住宿逻辑：

```text
餐饮推荐区域
→ 区域解释
→ 3–5 家推荐餐厅
→ 餐厅详情
```

## 16.1 区域解释

显示：

- 午餐 / 晚餐；
- 推荐时间；
- 为什么顺路；
- 推荐料理；
- 人均预算；
- 排队风险；
- 预约必要性；
- 从上一点增加多少移动；
- 去下一点是否顺。

## 16.2 餐厅推荐

每家：

- 图片；
- 名称；
- 料理；
- 价格；
- 推荐菜；
- 用餐时间；
- 是否可预约；
- 排队风险；
- 亲子 / 素食 / 无障碍 / 景观等标签。

操作：

```text
设为午餐 / 晚餐
加入预约
查看详情
替换当前餐厅
```

---

# 17. 住宿预约渠道设计

同一家酒店在 Booking.com / Agoda / 官网中必须合并成：

> **一个 TravelAssist Canonical Hotel**

示意：

```text
CanonicalHotel
├─ travelAssistHotelId
├─ name
├─ coordinates
├─ bookingPropertyId
├─ agodaPropertyId
├─ officialWebsite
└─ otherProviderIds
```

用户看到的是酒店本身，不是三条重复酒店。

酒店详情下方加入：

## 预约与价格

示例：

```text
官方
¥21,800 / 晚
含早餐
[查看官方]

Booking.com
¥20,900 / 晚
免费取消
[前往预订]

Agoda
¥20,300 / 晚
不可退款
[前往预订]
```

排序以：

- 总价；
- 取消政策；
- 税费；
- 早餐；
- 支付方式；
- 用户偏好；
- 可靠性；
- 行程适配

为主，不以返佣作为唯一排序权重。

如为合作渠道，可显示：

```text
合作平台
```

---

# 18. 餐饮预约渠道

餐饮不能绑死一个全球 Provider。

使用区域 Provider Adapter：

```text
RestaurantProvider
├─ TableCheckAdapter
├─ OpenTableAdapter
├─ OfficialRestaurantAdapter
└─ FutureRegionalAdapter
```

日本优先支持：

- TableCheck；
- OpenTable；
- 餐厅官方预约页。

如果只有地区平台 / 电话 / 官网，则使用经过验证的外部预约入口。

MVP 不通过爬虫伪造实时桌位。

---

# 19. 景点门票与预约

景点详情必须加入：

> **门票与预约**

推荐位置：

```text
基础信息
为什么推荐
游玩建议
营业时间
当前行程影响
交通
门票与预约
附近餐饮 / 住宿
```

渠道优先级：

1. 官方渠道；
2. Klook / GetYourGuide / Viator 等第三方；
3. 其他经过验证的外部入口。

官方渠道必须明确标识：

```text
官方
```

第三方排序综合：

- 价格；
- 取消灵活度；
- 即时确认；
- 票型；
- 用户语言；
- 当前行程确定程度。

---

# 20. Provider Gateway

前端不直接理解每个第三方 API。

统一：

```text
ProviderGateway
├─ AccommodationProvider
├─ RestaurantProvider
└─ AttractionProvider
```

统一返回预约渠道模型：

```ts
type BookingOption = {
  providerId: string;
  providerName: string;
  bookingMode: "redirect" | "embedded" | "api-book";
  price?: number;
  currency?: string;
  availabilityStatus?: "available" | "limited" | "unknown";
  cancellationSummary?: string;
  deeplink?: string;
  lastCheckedAt?: string;
  official: boolean;
  affiliate: boolean;
};
```

---

# 21. 预约状态联动

统一用户路径：

```text
地图发现 / 推荐
   ↓
加入预约
   ↓
加入当前方案
   ↓
底部「行程」立即显示具体名称
   ↓
待预约 / 待购票
   ↓
完成外部预约
   ↓
自动回写或手动“我已完成预约”
   ↓
已预约 / 已购票
```

---

# 22. 底部行程直接显示预约状态

## 22.1 酒店

加入前可能是：

```text
20:00
推荐住宿区域
```

加入后：

```text
20:00
京都站 Hotel A
入住 · 连住3晚
待预约
```

完成后：

```text
20:00
京都站 Hotel A
入住 · 连住3晚
✓ 已预约
```

## 22.2 餐厅

加入前：

```text
12:30 午餐
祇园推荐区域
```

加入后：

```text
12:30
Restaurant A
约1小时
待预约
```

完成后：

```text
12:30
Restaurant A
✓ 已预约 · 12:30
```

## 22.3 景点

```text
10:00 东京晴空塔
待购票
```

完成：

```text
10:00 东京晴空塔
✓ 已购票
```

## 22.4 长途交通

```text
09:10 京都 → 金泽
待购票
```

完成：

```text
09:10 京都 → 金泽
指定席 · ✓ 已购票
```

---

# 23. 预约·票务 Tab 的职责

`行程` Tab：

> 看当前路线里哪些已经订好。

`预约·票务` Tab：

> 管理所有预约细节。

预约·票务 Tab 显示：

- 日期；
- 项目；
- Provider；
- 状态；
- 订单号；
- 取消期限；
- 入场 / 入住 / 用餐时间；
- 凭证；
- 外部订单入口；
- 修改 / 取消入口。

---

# 24. 右侧当前方案的“完成预约”

当前方案卡片新增：

```text
待预约 4 项
酒店 1
餐厅 1
景点门票 1
交通 1

[完成预约]
```

点击后打开预约处理浮层：

```text
D1
□ 成田 → 东京交通

D2
□ 东京晴空塔
□ Restaurant B

D4–D6
□ 京都站 Hotel A
```

每项提供：

- 官方渠道；
- 推荐渠道；
- 价格 / 取消条件；
- 前往预约。

完成一项：

```text
待预约 4
→ 待预约 3
```

全部完成：

```text
✓ 关键预约已完成
```

---

# 25. 固定预约时间回写

如果实际预约时间与计划不同：

```text
原计划 18:30
实际餐厅预约 19:00
```

系统必须：

1. 更新 Trip State；
2. 将餐厅节点改为 19:00；
3. 检查上一站移动；
4. 检查后续冲突；
5. 必要时提示重新排程。

景点固定入场同理。

固定预约节点应：

```text
fixedTime = true
```

在重新生成路线时默认保护，除非用户明确允许修改。

---

# 26. 推荐状态模型

```ts
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

type TripItem = {
  id: string;
  type: "attraction" | "restaurant" | "hotel" | "transport" | "activity";
  date: string;
  startTime?: string;
  endTime?: string;
  title: string;
  reservationRequired: boolean;
  reservationStatus: ReservationStatus;
  reservationId?: string;
  fixedTime?: boolean;
};
```

酒店额外：

```ts
checkInDate
checkOutDate
nights
```

连续住 3 晚：

- 底部每天可显示住宿；
- 订单实体只是一条 AccommodationReservation；
- 不复制成 3 个酒店订单。

---

# 27. Mapbox 技术接入

## 27.1 Web 包

```bash
npm install mapbox-gl
```

CSS：

```tsx
import "mapbox-gl/dist/mapbox-gl.css";
```

## 27.2 环境变量

浏览器：

```env
NEXT_PUBLIC_MAPBOX_TOKEN=
```

禁止把真实 token 提交 GitHub。

正式 token：

- 使用项目专用 token；
- 限制 public scopes；
- 限制允许域名；
- 开发环境允许 localhost；
- 生产只允许正式域名。

后续服务端路线 API 如需要，再单独引入服务端变量；不在当前 UI 基础接入中提前暴露。

---

# 28. Mapbox 渲染架构

不建议大量 HTML Marker。

优先使用：

```text
GeoJSON Source
+
Mapbox Style Layer
```

建议 Layers：

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

## 28.1 原因

- 大量点性能更稳定；
- 易统一过滤；
- 易按 Day 显隐；
- 易做 selected / hover；
- 易在 1日 / 3日 / 全日之间切换。

少量真正需要 DOM 的浮层才使用 Popup / HTML Overlay。

---

# 29. 统一 Map View Model

Mapbox 不直接读取 Booking / Agoda / AI 原始返回。

先转换成 TravelAssist 自己的数据：

```ts
type MapPlace = {
  id: string;
  type: "attraction" | "hotel" | "restaurant" | "transport" | "activity";
  name: string;
  coordinates: [number, number];
  day?: number;
  tripStatus: "recommended" | "selected";
  reservationStatus?: "not_required" | "pending" | "booked" | "ticketed";
};
```

不同 Provider ID 留在 Canonical Entity / Backend。

---

# 30. 1日 / 3日 / 全日切换的 Mapbox 实现

切换范围时：

> **不要重新创建 Map 实例。**

使用：

```text
Trip State
↓
Map Selector
↓
GeoJSON
↓
source.setData(...)
```

也不要因为切换视图重新计算路线。

路线只在以下情况重算：

- 新增 / 删除地点；
- 修改顺序；
- 修改交通方式；
- 固定预约时间变化；
- 用户点击重新规划。

普通：

```text
1日 → 3日 → 全日
```

只是切换显示数据。

---

# 31. Mapbox ↔ 底部栏联动

所有地图要素和行程节点统一使用：

```text
tripItemId
```

点击地图：

```text
feature
→ tripItemId
→ selectedTripItemId
→ 底部卡片滚动 / 高亮
```

点击底部：

```text
tripItemId
→ 查坐标
→ map.easeTo / fit
→ feature 高亮
```

地图不维护另一份独立业务选中状态。

---

# 32. 住宿 / 餐饮区域在 Mapbox 中的实现

区域几何使用 GeoJSON Polygon / MultiPolygon。

Mapbox feature 只保存必要信息：

```text
areaId
name
geometry
type
```

点击区域：

```text
Mapbox click
→ areaId
→ TravelAssist data
→ 区域解释 + 酒店/餐厅推荐
```

注意：

> 区域解释、酒店价格、餐厅推荐不是从 Mapbox Layer 里获取。

---

# 33. Directions / Matrix / Isochrone / Search 的后续边界

这些能力属于后续 Provider Task，不要求在第一轮 Mapbox UI Task 中一次全部接完。

## 33.1 Directions

适合：

- walking；
- driving；
- cycling；
- driving traffic。

输出：

- geometry；
- distance；
- duration；
- legs。

## 33.2 Matrix

用于 AI / 排程前的点对点时间矩阵。

TravelAssist 再结合：

- 营业时间；
- 预约时间；
- 偏好；
- 体力；
- 天气；
- 酒店；
- 餐饮。

决定访问顺序。

## 33.3 Isochrone

后续可用于：

- 京都站步行 15 分钟住宿区域；
- 午餐可达区；
- 晚餐可达区；
- 车站周边推荐。

## 33.4 Search Box

用于：

- 景点搜索；
- 地址；
- 车站；
- 酒店；
- 餐厅；
- 手动加点。

---

# 34. 公共交通的边界

Mapbox 不能作为 TravelAssist 公交 / 地铁 / 普通铁路完整换乘计算的唯一来源。

推荐：

```text
RouteService
├─ Walking → Mapbox
├─ Driving → Mapbox
├─ Cycling → Mapbox
├─ Transit → 独立 Transit Provider
└─ Flight / Long-distance Rail / Ferry → 对应 Provider
```

无论路线来自谁，统一转换为：

```ts
type RouteLeg = {
  mode:
    | "walk"
    | "drive"
    | "bike"
    | "bus"
    | "subway"
    | "rail"
    | "ferry"
    | "flight";
  geometry?: GeoJSON.LineString;
  durationMinutes: number;
  distanceMeters?: number;
  provider: string;
};
```

最终交给 Mapbox 画。

---

# 35. Provider 接入阶段

## Phase 1 — UI / Deep Link MVP

住宿：

- Booking / Agoda / 官网外跳。

餐饮：

- TableCheck / OpenTable / 官网外跳。

景点：

- 官方票务 / Klook / GYG / Viator 等外跳。

TravelAssist 不处理钱。

## Phase 2 — 实时查询

获得权限后逐步：

- 实时价格；
- 库存；
- 时段；
- 取消规则；
- Provider 比较。

订单仍可在站外完成。

## Phase 3 — 站内预订

仅对取得正式商业 / API 权限的平台开放。

需要另行设计：

- Payment；
- Refund；
- Cancellation；
- Support；
- Reconciliation；
- Fraud；
- Privacy；
- Invoice / Tax。

---

# 36. 禁止做法

不得：

- 抓取 Booking / Agoda 页面价格伪装 API；
- 抓餐厅网页伪造实时桌位；
- 把缓存价格标成实时；
- 因为返佣更高就伪装成“最佳推荐”；
- 把真实 Mapbox token 写进仓库；
- Map / Bottom / Right Panel 各维护独立行程；
- 切换 1日 / 3日 / 全日时重复计算整条路线；
- 用几十个 HTML Marker 代替大规模 Style Layer；
- 用 Mapbox 直接承载订单状态。

---

# 37. 本轮冻结决策清单

- [x] 1日 / 3日 / 全日为三种不同信息颗粒度。
- [x] 非选择日期只保留相邻前后灰线，其他隐藏。
- [x] 灰线约 20%–30% opacity、60%–70% 主线宽度。
- [x] 底部 6 Tab 外框不变，内容随时间尺度变化。
- [x] 景点 Pin 使用快速卡 → 详细页两级结构。
- [x] 景点详情必须有“为什么推荐”和“当前行程影响”。
- [x] 景点详情加入“门票与预约”。
- [x] 点击住宿区域先解释区域，再显示酒店推荐。
- [x] 点击餐饮区域先解释区域，再显示餐厅推荐。
- [x] 同一酒店在 Booking / Agoda / 官网中归并为一个 Canonical Hotel。
- [x] 餐饮使用地区 Provider Adapter。
- [x] 预约属于 Trip Item 状态。
- [x] 地图点击“加入预约”后，底部行程立即出现名称和预约状态。
- [x] 右侧当前方案增加“完成预约”入口和待预约数量。
- [x] 完成预约后 Map / Bottom / Booking Tab / Right Panel 同步。
- [x] 固定预约时间回写 Trip State。
- [x] 固定预约默认受重新规划保护。
- [x] Mapbox 作为地图渲染与道路空间能力提供者。
- [x] Mapbox 与业务使用统一 `tripItemId`。
- [x] Mapbox 优先 GeoJSON Source + Style Layer。
- [x] 1日 / 3日 / 全日切换只更新 View Data，不重新建立业务数据。
- [x] Transit 独立于 Mapbox Directions。
- [x] 第三方预约 MVP 先外跳，后续再实时 API / 站内下单。

---

# 38. 后续 Task 拆分建议

建议顺序：

```text
TASK-008
Planner UI Shell
↓
TASK-008.1
Mapbox GL + 地图详情 / 区域 / 预约状态 Mock 交互
↓
后续 Map Provider Task
Directions / Matrix / Search / Isochrone
↓
Transit Provider
↓
Booking / Agoda / Restaurant / Attraction Provider
↓
真实订单同步
```

其中 TASK-008.1 不应一次把所有第三方 Provider 真实 API 都接入。
