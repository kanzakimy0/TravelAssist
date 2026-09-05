# 地图区域与外部预约系统接入设计

> 状态：v0.1 / 住宿、餐饮、景点外部预约接入方向冻结  
> 更新日期：2026-09-05  
> 适用：TravelAssist Web / 后续 App  
> 关联：`docs/ui/trip-planner.md`

## 1. 设计结论

TravelAssist 不应把自己做成“又一个 Booking / Agoda / OpenTable”，而应把第三方预订能力作为行程规划的执行层。

核心结构：

```text
TravelAssist 推荐与路线判断
        ↓
区域 / 景点 / 酒店 / 餐厅详情
        ↓
统一“预约渠道”模块
        ↓
官方渠道 / Booking / Agoda / TableCheck / OpenTable / Klook / GetYourGuide / Viator ...
        ↓
站外完成预约，或在后期获得合作权限后站内完成
        ↓
预约结果回写 Trip State
```

MVP 推荐采用：

- **优先：API 搜索 / 实时价格 + 外部跳转完成订单**
- **备用：Affiliate / Deep Link 外部跳转**
- **后期：获得平台批准后，再做站内下单**

不要在早期承担支付、退款、取消和客服责任。

---

# 2. 住宿区域点击逻辑

## 2.1 点击住宿推荐区域

地图中的住宿区域使用半透明区域面。

点击后出现：

### 上半：区域解释

显示：

- 区域名称
- 为什么推荐
- 适合哪几天
- 建议连住几晚
- 到主要景点平均时间
- 到铁路 / 地铁枢纽时间
- 到机场或租车点便利度
- 晚间餐饮便利度
- 价格层级
- 优点
- 缺点
- 对当前行程的影响

示例：

> 京都站区域  
> 建议 D4–D6 连住 3 晚。  
> 与中途换住祇园相比，可减少 1 次搬运行李，并降低跨城日的移动压力。

### 下半：推荐酒店

默认显示 3–5 家。

每家酒店卡：

- 酒店图片
- 名称
- 星级 / 类型
- TravelAssist 推荐理由
- 当前行程便利度
- 参考价格
- 取消条件摘要
- 早餐
- 停车
- 行李寄存
- 亲子 / 无障碍等标签

操作：

- `查看酒店`
- `加入候选`
- `比较价格`
- `设为住宿`

---

# 3. 酒店详情中的“预约渠道”

酒店详情页下部加入统一的：

## 预约与价格

不要直接写：

> Booking.com  
> Agoda

而应先显示“同一酒店”的统一信息，然后列出渠道。

示例：

```text
预约与价格

官方酒店网站
¥21,800 / 晚
含早餐 · 18:00 前免费取消
[查看官方]

Booking.com
¥20,900 / 晚
免费取消 · 到店付款
[前往预订]

Agoda
¥20,300 / 晚
不可退款
[前往预订]
```

### 排序原则

默认排序不能只按佣金。

推荐综合：

1. 总价
2. 取消政策
3. 是否含税费
4. 早餐
5. 支付方式
6. 用户偏好
7. 平台可靠性
8. 是否存在会员价
9. 行程适配

如为合作 / 返佣渠道，应明确显示：

`合作平台`

不得把商业合作伪装成 AI 的“最佳推荐”。

---

# 4. Booking.com 接入策略

Booking.com 可分三个阶段。

## 阶段 A：Affiliate / Deep Link

最简单。

TravelAssist：

1. 推荐酒店。
2. 用户点击“前往 Booking.com”。
3. 带上酒店、入住日期、退房日期、人数等参数。
4. 用户在 Booking.com 完成预订。
5. TravelAssist 不处理付款。

适合第一版。

## 阶段 B：Demand API 搜索 + 跳转

获得合作权限后：

```text
TravelAssist
 ↓
Booking.com Demand API
 ↓
酒店内容 / 可售房型 / 实时价格
 ↓
TravelAssist 展示比较
 ↓
Booking.com URL / Deep Link
 ↓
Booking.com 完成订单
```

这是 TravelAssist 最推荐的中期模式。

## 阶段 C：Search, Look & Book

后期如果取得相应合作权限，可以让用户不离开 TravelAssist 完成预订。

但此阶段会增加：

- 支付处理
- 订单状态
- 取消
- 售后
- 客服
- 隐私与合规
- 对账

因此不列入 MVP。

---

# 5. Agoda 接入策略

Agoda 采用相同三层架构。

## MVP

优先：

- Affiliate Link
- Deep Link
- 站外完成预订

## 中期

接入 Agoda Demand Search API：

- 获取酒店
- 可售房型
- 实时价格
- 入住条件
- 取消规则

然后由用户跳转 Agoda 完成订单。

## 后期

根据 Agoda 合作模式与权限：

- Precheck
- Book API
- Post-booking

再决定是否允许 TravelAssist 内完成订单。

---

# 6. 为什么住宿必须做“统一酒店实体”

Booking.com、Agoda、酒店官网里的同一家酒店，ID 不相同。

TravelAssist 必须建立自己的酒店实体：

```text
CanonicalHotel
 ├─ travelAssistHotelId
 ├─ name
 ├─ coordinates
 ├─ address
 ├─ bookingComPropertyId
 ├─ agodaPropertyId
 ├─ officialWebsite
 └─ otherProviderIds
```

用户看到的是：

> 京都站酒店 A

而不是看到：

> Booking 酒店 A  
> Agoda 酒店 A

两次。

不同平台只是这个酒店下面的“预约渠道”。

---

# 7. 餐饮推荐区域

餐饮采用与住宿完全一致的两级逻辑。

```text
餐饮推荐区域
 ↓
为什么推荐在这里吃
 ↓
3–5 家餐厅
 ↓
餐厅详情
 ↓
预约渠道
```

---

# 8. 点击餐饮区域

## 上半：区域解释

显示：

- 午餐 / 晚餐
- 推荐时间
- 区域名称
- 为什么和当前路线匹配
- 推荐料理
- 人均预算
- 排队风险
- 预约必要性
- 从上一景点增加的移动时间
- 去下一景点是否顺路

示例：

> 祇园午餐区域  
> 适合 12:00–13:30。  
> 从清水寺主路线仅增加约 8 分钟步行，午餐后继续前往祇园核心区最顺。

## 下半：推荐餐厅

显示 3–5 家：

- 图片
- 名称
- 料理
- 价格
- 推荐菜
- 预计用餐时间
- 是否可预约
- 排队风险
- 用户适配标签

---

# 9. 餐厅应该接哪些预约系统

不能只接一个全球平台。

建议采用“地区 Provider Adapter”。

## 日本优先

### TableCheck

作为日本市场的重要预约渠道之一，可作为第一批接入对象。

适合：

- 餐厅目录
- 实时可预约时间
- Web Booking
- 预约跳转

部分直接 Booking API 权限受合作类型限制，因此 MVP 优先 Web Booking / 外部预约。

### OpenTable

覆盖多个国家和地区。

适合：

- 餐厅资料
- 预约入口
- 合作伙伴 API
- 后期实时预约能力

### 其他日本餐厅

如果餐厅只支持：

- 官方预约页
- 一休
- 食べログ
- ぐるなび
- Hot Pepper
- 电话预约

TravelAssist 可以显示经过验证的外部预约入口，但不要通过网页爬虫伪装成实时库存 API。

---

# 10. 其他国家的餐饮 Provider

架构上预留：

```text
RestaurantProvider
 ├─ TableCheckAdapter
 ├─ OpenTableAdapter
 ├─ QuandooAdapter
 ├─ OfficialRestaurantAdapter
 └─ FutureRegionalAdapter
```

例如 Quandoo 可作为欧洲等市场的补充预约 Provider。

不同国家由 Provider Router 动态选择可用渠道。

---

# 11. Google Reserve 的定位

Google Search / Maps 中存在 Reserve with Google，但其可用性取决于地区、餐厅和支持的预约服务商。

因此 TravelAssist 不把“Google Reserve”设计成唯一预约后端。

如某餐厅存在公开、有效的 Google / 合作预约入口，可作为：

`其他预约渠道`

但核心系统仍走 Provider Adapter。

---

# 12. 景点详情页是否加入外部预约

**确定加入。**

但模块名称建议：

## 门票与预约

而不是：

> 外网预约系统

位置：

```text
景点详情
├─ 图片与基础信息
├─ 为什么推荐
├─ 游玩建议
├─ 营业时间
├─ 行程影响
├─ 交通
├─ 门票与预约   ← 重要操作区
└─ 附近餐饮 / 住宿
```

即放在详情页偏下方，但在“附近推荐”之前。

---

# 13. 景点“门票与预约”模块

显示：

- 是否需要预约
- 可预约日期
- 可预约时间段
- 成人 / 儿童价格
- 即时确认
- 电子票
- 取消规则
- 支持语言
- 最晚预订时间

下方显示多个渠道。

示例：

```text
门票与预约

官方
东京晴空塔官方票
¥2,100
指定时段 · 官方渠道
[查看官方]

Klook
¥2,050
电子票 · 即时确认
[查看可预约时段]

GetYourGuide
¥2,180
24小时前可取消
[查看可预约时段]

Viator
¥2,230
英文客服
[查看可预约时段]
```

---

# 14. 景点预约 Provider 优先级

推荐优先接入：

### 第一层：官方渠道

必须尽量保存：

- 景点官方网站
- 官方购票页
- 官方预约页

官方入口需要有明显：

`官方`

标识。

### 第二层：活动 / 门票聚合平台

Provider Adapter 预留：

- Klook
- GetYourGuide
- Viator
- Booking.com Attractions
- 其他地区型票务平台

### 第三层：无 API 的渠道

只做经过验证的 Deep Link，不抓取库存。

---

# 15. 景点渠道排序不能单纯按价格

例如：

A 平台 ¥2,000，不可取消。  
B 平台 ¥2,100，24小时前免费取消。

对于“行程尚可能调整”的用户，B 可能更合适。

所以排序算法建议：

```text
BookingScore =
价格适配
+ 取消灵活度
+ 即时确认
+ 票型匹配
+ 用户语言
+ 用户年龄结构
+ 行程确定程度
+ Provider 可靠性
```

佣金不得直接成为面向用户的推荐核心权重。

---

# 16. 三类 Provider 的统一架构

```text
                    ┌─ Booking.com
Accommodation ──────┼─ Agoda
                    └─ Hotel Official

                    ┌─ TableCheck
Restaurant ─────────┼─ OpenTable
                    ├─ Quandoo
                    └─ Restaurant Official

                    ┌─ Attraction Official
Attraction ─────────┼─ Klook
                    ├─ GetYourGuide
                    ├─ Viator
                    └─ Booking Attractions
```

前端不要知道每一家平台的 API 细节。

统一调用：

```text
Provider Gateway
```

---

# 17. Provider Gateway

建议后台建立：

```text
ProviderGateway
├─ AccommodationProvider
├─ RestaurantProvider
└─ AttractionProvider
```

统一返回：

```ts
type BookingOption = {
  providerId: string
  providerName: string
  bookingMode: "redirect" | "embedded" | "api-book"
  price?: number
  currency?: string
  availabilityStatus?: "available" | "limited" | "unknown"
  cancellationSummary?: string
  deeplink?: string
  lastCheckedAt?: string
  official: boolean
  affiliate: boolean
}
```

这样以后增加 Provider 不需要修改地图和详情页结构。

---

# 18. 推荐渠道必须实时检查

价格 / 库存属于动态信息。

因此：

- 地图上的区域推荐可以使用缓存
- 打开具体酒店 / 餐厅 / 景点详情时刷新
- 打开“预约与价格”时再次刷新
- 用户点击最终预订前，必要时再次确认

页面需要显示：

`价格与库存更新时间`

避免用户误以为几小时前的价格仍然有效。

---

# 19. 预约后如何回到行程

外部跳转完成预订后，TravelAssist 应提供：

`我已预订`

用户确认后：

```text
预约
 ↓
Trip State
 ↓
锁定时间
 ↓
重新检查交通
 ↓
检查与其他预约冲突
 ↓
地图 / 时间轴显示“已预约”
```

后期如果 Provider API 支持订单回传，可以自动完成这一步。

---

# 20. 预约状态

统一状态：

- 推荐
- 可预约
- 待确认
- 已预订
- 已付款
- 需现场付款
- 已取消
- 预约失败
- 时间变更

地图 Pin、详情页和底部“预约·票务”必须读取同一个 Trip State。

---

# 21. 技术实现阶段划分

## Phase 1 — MVP

住宿：

- Booking.com Affiliate / Deep Link
- Agoda Affiliate / Deep Link
- 酒店官网

餐饮：

- TableCheck / OpenTable / 餐厅官方预约链接
- 无接口时只外跳

景点：

- 官方票务
- Klook / GetYourGuide / Viator 等 Deep Link

特点：

- TravelAssist 不处理钱
- 不保存银行卡
- 不承担订单结算
- 快速上线

## Phase 2 — 实时查询

逐步申请并接入：

- Booking.com Demand API
- Agoda Demand Search API
- TableCheck
- OpenTable
- Quandoo
- GetYourGuide / Viator / Klook 等合作 API

实现：

- 实时价格
- 实时库存
- 时间段
- 取消政策
- 渠道比较

订单仍可在外部完成。

## Phase 3 — 站内预订

仅对获得明确商业 / API 权限的 Provider 开启：

- 站内酒店下单
- 站内餐厅预约
- 站内景点票务

需要另行设计：

- Payment
- Refund
- Cancellation
- Customer Support
- Order Reconciliation
- Fraud
- Privacy
- Tax / Invoice

不作为当前 Web MVP 前置条件。

---

# 22. 禁止做法

不得：

- 爬取 Booking.com / Agoda 页面价格代替正式接口
- 爬餐厅页面伪造实时桌位
- 把缓存价格标成“实时”
- 把合作返佣平台伪装成唯一最佳选择
- 未获得权限就代用户完成第三方下单
- 在外跳模式下保存第三方支付卡信息

---

# 23. 当前冻结决策

- [x] 点击住宿区域：先解释区域，再显示酒店推荐。
- [x] 点击餐饮区域：先解释区域，再显示餐厅推荐。
- [x] 酒店详情加入“预约与价格”模块。
- [x] 同一家酒店的 Booking / Agoda / 官网归并为一个酒店实体下的不同渠道。
- [x] 餐厅使用地区型 Provider Adapter，不绑定单个平台。
- [x] 日本餐饮优先评估 TableCheck，并同时支持 OpenTable / 官方预约链接。
- [x] 景点详情页加入“门票与预约”模块。
- [x] 景点官方渠道优先保留并标识“官方”。
- [x] 景点支持 Klook / GetYourGuide / Viator / Booking Attractions 等多渠道扩展。
- [x] MVP 优先外跳 / Deep Link，不在 TravelAssist 内处理付款。
- [x] 获得合作权限后再逐步接入实时 API。
- [x] Provider 统一通过 Provider Gateway 接入。
- [x] 外部预订完成后允许“我已预订”并回写 Trip State。
- [x] 推荐排序以用户条件、总价和取消灵活度为核心，不以佣金作为唯一权重。

---

# 24. 仍待后续商业确认

- 各 Provider 的正式合作申请时间。
- 佣金与结算条款。
- 是否具备站内 Book API 权限。
- 各市场首批餐饮 Provider 覆盖范围。
- 是否在 MVP 上线前申请 Booking.com / Agoda API，还是先 Affiliate。
- 景点首批合作渠道选择。
