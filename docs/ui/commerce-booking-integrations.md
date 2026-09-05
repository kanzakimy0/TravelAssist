# TravelAssist 商业化与预约系统接入设计

> 状态：v0.1 / 商业化接入方案草案  
> 日期：2026-09-05  
> 适用：住宿、餐饮、景点 / 活动详情页与地图区域推荐

## 1. 核心定位

TravelAssist 首先是“旅行决策与行程编排层”，初期不建议直接成为酒店、餐厅、景点票务的 Merchant of Record。

推荐分三阶段：

1. **MVP：站内推荐 + 外部预约 / 购买**
   - TravelAssist 完成推荐、解释、比较和路线影响计算。
   - 用户点击后跳转 Booking.com、Agoda、Viator、Klook、OpenTable、TableCheck 等完成交易。
   - 使用 affiliate / partner tracking 记录归因并获得佣金。
2. **第二阶段：API 搜索 + 实时价格 / 空位 + 外部结算**
   - 站内展示真实库存、价格、取消政策。
   - 仍跳转合作平台完成付款。
   - TravelAssist 不承担支付、退款和第一线客服。
3. **成熟阶段：部分品类站内完成预约**
   - 只对获得 partner approval 的渠道开放。
   - 需要额外处理支付、PCI、安全、退款、订单售后、税务和客服责任。

推荐先做第 1 + 第 2 阶段。

---

## 2. 商业化总结构

```text
TravelAssist 行程 / 地图
        │
        ├─ 景点推荐
        │    └─ 门票与预约
        │         ├─ 官方渠道
        │         ├─ Viator
        │         ├─ Klook
        │         ├─ Booking.com Attractions
        │         └─ 其他批准渠道
        │
        ├─ 住宿推荐区域
        │    └─ 推荐酒店
        │         ├─ Booking.com
        │         ├─ Agoda
        │         └─ 未来其他 OTA
        │
        └─ 餐饮推荐区域
             └─ 推荐餐厅
                  ├─ OpenTable
                  ├─ TableCheck
                  ├─ 食べログ / 本地平台
                  └─ 餐厅官网
```

TravelAssist 自己负责：

- 推荐逻辑
- 为什么推荐
- 与当前路线的关系
- 时间 / 绕路 / 预算影响
- 多渠道比较
- 商业归因

合作平台负责：

- 库存
- 最终价格
- 交易
- 支付
- 取消 / 退款
- 订单履约

---

## 3. 住宿：Booking.com / Agoda 接入

### 3.1 点击住宿区域

```text
点击“京都站住宿区域”
        ↓
区域解释
        ↓
TravelAssist 推荐酒店 3–5 家
        ↓
每家酒店显示多个可预订渠道
```

区域解释仍由 TravelAssist 生成，不由 OTA 决定。

例如：

> 京都站区域适合 D4–D6 连住 3 晚。  
> 相比祇园中途换酒店，可减少一次搬运行李，并降低跨城出发成本。

### 3.2 酒店卡推荐结构

每家酒店建议显示：

- 酒店名称 / 图片
- 推荐理由
- TravelAssist 匹配度
- 与行程关系
- 预计价格
- 取消政策摘要
- 早餐
- 房型
- 到车站距离
- 到当天第一站平均时间

下方增加“可预订渠道”：

```text
Booking.com     ¥18,600   免费取消      [查看房型]
Agoda           ¥17,900   部分退款      [查看房型]
酒店官网         ¥19,100   含早餐        [官网]
```

不要默认只显示佣金最高的渠道。

排序建议优先依据：

1. 最终总价
2. 取消政策
3. 用户需求匹配
4. 支付 / 币种便利性
5. 渠道可靠度

佣金不进入普通自然推荐排序。

如存在商业推广位，必须标记：`赞助` / `合作推广`。

### 3.3 Booking.com

推荐采用 Booking.com Demand API / Affiliate 模式。

初期：

- affiliate deep link
- 跳转 Booking.com 完成住宿预订

API 阶段可在 TravelAssist 内获取：

- 酒店内容
- 搜索结果
- 可订房型
- 实时价格
- 取消规则
- 跳转 URL

Booking.com Demand API 支持从 Content / Redirect 到站内下单等不同接入深度；站内下单能力需要对应合作资质与批准。

### 3.4 Agoda

Agoda 可采用：

- **简单模式：Online Affiliate / MSE**：获取酒店 / 价格、展示搜索结果、跳转 Agoda。
- **更深模式：Agoda Demand Book API**：Precheck → 确认价格与库存 → Book。

更深的预订接入应在商业合作与认证完成后再做。

---

## 4. 住宿收入模型

住宿是 TravelAssist 最适合优先商业化的模块之一。

```text
区域推荐
→ 酒店详情
→ OTA 渠道点击
→ 用户完成预订
→ 完成住宿
→ OTA 确认有效订单
→ TravelAssist 获得 Affiliate Commission
```

注意：

- 通常不是用户“点击”就产生收入。
- 佣金往往需要订单有效 / 完成入住。
- 取消订单通常不产生佣金。
- 不同合作计划、地区、订单量与合同的比例不同。

后台建议记录：

- provider
- affiliate_id
- sub_id / tracking_id
- trip_id
- day_id
- hotel_id
- offer_id
- click_id
- price_snapshot
- currency
- clicked_at
- booking_status（如渠道可回传）
- commission_status

---

## 5. 餐饮：区域 → 解释 → 餐厅 → 预约渠道

餐饮沿用住宿同样逻辑。

```text
点击“祇园午餐区域”
        ↓
为什么推荐这里吃
        ↓
3–5 家餐厅
        ↓
可预约渠道
```

区域解释示例：

> 祇园适合安排 D5 午餐。  
> 从清水寺主路线仅增加约 8 分钟步行，午餐后继续前往花见小路无需折返。

---

## 6. 餐厅推荐卡

建议显示：

- 餐厅图片
- 名称
- 料理
- 人均预算
- 推荐原因
- 行程绕路时间
- 建议预约时间
- 当前可预约状态
- 儿童 / 素食 / 过敏 / 无障碍
- 排队风险

预约区示例：

```text
TableCheck        12:15 / 12:30 可订     [预约]
OpenTable         12:30 可订             [预约]
食べログ           查看空位               [预约]
餐厅官网           官方预约               [官网]
```

---

## 7. 餐饮平台建议

### 全球 / 欧美：OpenTable

适合作为核心候选。可通过 Partner API 的 Directory 能力获取餐厅资料及 reservation link。

推荐模式：

- TravelAssist 做推荐
- OpenTable 提供可预约餐厅 / 预约入口
- 用户跳转 OpenTable

是否产生 Affiliate / Referral 收入必须以双方商业合同为准，不能仅因为有 API 就假定存在佣金。

### 日本 / 亚洲：TableCheck

非常适合 TravelAssist 的日本旅行场景。

其 API 能力包括：

- Directory
- Availability
- Booking Form SDK

可用于：

- 找到 TableCheck 餐厅
- 查询实时可预约时段
- 在页面嵌入预约表单（取得对应 API / SDK 权限后）

### 食べログ

适合作为日本本地餐饮的重要补充渠道。

TravelAssist 初期可：

- 显示“食べログ预约”
- 跳转对应餐厅页面

但商业返佣和 API / 数据使用需要单独商务合作，不应假设公开预约服务自动提供第三方 Affiliate 收入。

---

## 8. 餐饮收入模型

餐饮收入不要依赖单一模式。

### A. Reservation CPA / Affiliate

用户预约并实际到店后产生 referral fee。

前提：平台有对应合作计划，TravelAssist 获得 partner agreement。

### B. 餐厅直接合作

餐厅可购买：

- 明确标记的赞助曝光
- 特定区域推广
- CPA 到店
- 固定月费

必须与自然推荐排序分开。

### C. 暂无佣金的平台

仍可以提供预约入口。

用户体验和“完整行程闭环”优先于每一次点击都变现；有用的免费预约入口可以提高留存，最终反过来提升住宿与景点转化。

---

## 9. 景点详细页：需要“门票与预约”模块

答案：**需要。**

但不建议只是最下面放一个 `去外部网站预约`。

应该做成结构化的 **门票与预约** 模块。

景点详情结构：

```text
景点图片 / 名称
↓
为什么推荐
↓
游玩建议
↓
营业 / 门票 / 拥挤
↓
当前行程影响
↓
交通
↓
附近餐饮 / 住宿
↓
门票与预约
```

如果景点必须预约、有固定时段或容易售罄，则顶部也要显示 `建议提前预约`，并在页面底部保留固定 CTA：`查看门票与可预约时间`。

---

## 10. 景点“门票与预约”模块

示例：

```text
门票与预约

官方渠道
京都清水寺官网       ¥500      官方票价          [官网]

合作平台
Klook                ¥520      即时确认          [查看]
Viator               ¥610      免费取消至24h前   [查看]
Booking.com           ¥590      即时确认          [查看]
```

推荐比较字段：

- 总价
- 币种
- 是否含税 / 手续费
- 可预约时段
- 即时确认
- 取消政策
- 是否含导览
- 是否含接送
- 是否免排队

不能只比较首页显示的名义价格。

---

## 11. 景点收入渠道

### Viator

适合作为全球 tours / activities / ticket 商业渠道，可从 Affiliate Link、Affiliate API，再逐步升级到更深 Booking Access。

### Klook

亚洲旅行场景非常重要，可申请 Affiliate、Distributor / API 合作，用于景点门票、活动、一日游、交通票、SIM / eSIM 等附加产品。

### Booking.com Attractions

可作为 Booking.com 生态补充。当前 Attractions Demand API 为受控 / Beta 类能力，应视 Partner Access 决定是否接入。

### 官方渠道

始终保留。即使官方渠道没有佣金，也不应隐藏。

---

## 12. 推荐排序与商业收入必须分离

建议定义两个字段：

```text
recommendation_score
commercial_score
```

用户默认看到的自然推荐由以下因素决定：

- 用户偏好
- 行程顺路程度
- 价格
- 取消政策
- 可预约性
- 质量
- 风险

Affiliate Commission 不直接改变 `recommendation_score`。

如果付费曝光，必须显式标记：`[赞助]`。

---

## 13. 统一 Commerce Offer 模型

```text
CommerceOffer
├─ id
├─ category
│  ├─ accommodation
│  ├─ restaurant
│  └─ attraction
├─ entity_id
├─ provider
├─ provider_product_id
├─ price
├─ currency
├─ taxes_and_fees
├─ cancellation_policy
├─ availability
├─ booking_url
├─ affiliate_id
├─ sub_id
├─ sponsored
├─ recommendation_score
├─ last_checked_at
└─ metadata
```

这样 UI 不需要针对 Booking / Agoda / Klook / Viator 分别写一套逻辑。

---

## 14. 统一归因事件

```text
offer_impression
offer_open
offer_click
external_redirect
booking_confirmed
booking_cancelled
stay_completed
commission_confirmed
```

核心关联：

```text
user
trip
day
map_entity
provider
offer
click
booking
commission
```

后续可分析：

- 哪个地图区域产生最多收入
- 哪类推荐最容易转化
- 哪个行程阶段用户最愿意预订
- Booking 与 Agoda 在不同目的地的转化差异
- 哪些景点更适合 Klook / Viator

---

## 15. MVP 推荐接入顺序

### 第一优先：住宿

1. Booking.com Affiliate / Demand
2. Agoda Affiliate / Demand

原因：客单价高、每次旅行几乎都需要、与住宿区域推荐天然结合。

### 第二优先：景点 / 活动

1. Viator
2. Klook
3. Booking.com Attractions（视 Partner Access）
4. 官方网站

原因：与 AI 行程中的“立即预约”高度相关，固定时间票务还能反向改善路线规划。

### 第三优先：餐饮

1. TableCheck（日本）
2. OpenTable（覆盖区域）
3. 食べログ / 本地预约平台
4. 餐厅官网

餐饮优先做“预约闭环”，收入模型可以后置谈判。

---

## 16. 最终页面原则

### 住宿

```text
区域 → 为什么住这里 → 酒店推荐 → 渠道比价 → 预订
```

### 餐饮

```text
区域 → 为什么在这里吃 → 餐厅推荐 → 可预约时间 → 预约
```

### 景点

```text
Pin → 为什么值得去 → 行程影响 → 门票 / 可预约渠道 → 购买
```

最终目标不是把 TravelAssist 做成另一个 OTA，而是：

> **让用户先在 TravelAssist 完成旅行决策，再在最合适的合作渠道完成交易。**

这样商业收入来自“帮助用户做出更好的决定”，而不是让佣金反过来决定推荐结果。
