# TravelAssist 个人中心响应式 / 状态画面规范

> 文档版本：v1.0  
> 更新日期：2026-09-05  
> 对应 WBS：**1.29 个人中心响应式 / 状态画面规范**  
> Owner：B / Personal Center  
> 状态：**设计已确认并冻结**  
> 依赖：1.22–1.28  
> 视觉基准：1.21 Personal Center 方案 D  
> 覆盖：1.22 Shell、1.23 Auth、1.24 Account、1.25 Preferences、1.26 Companions、1.27 Trip Library、1.28 Security / Privacy / Booking Sync  
> 说明：本规范统一约束 1.22–1.28 已冻结个人中心页面在 Desktop / Tablet / Mobile Web 的响应式行为与全局状态呈现。

---

# 1. 设计目标

1.29 不新增业务功能，而是把 1.22–1.28 已冻结的个人中心设计统一成一套可实现的响应式与状态规范。

核心目标：

1. Desktop / Tablet / Mobile 使用同一信息架构，不因屏幕尺寸产生第二套产品。
2. Personal Center Shell 在不同尺寸下有明确变化规则。
3. 所有页面统一 Loading / Skeleton / Empty / Error / Success / Unsaved / Permission / Offline 等状态。
4. 交互从 Hover 迁移到 Touch 时不丢失功能。
5. 避免为了“塞进一屏”而压缩文字、按钮和卡片。
6. Web 响应式设计能自然过渡到未来 Mobile App，但本 WBS 不等于 App 原生设计。
7. 保持 1.21 方案 D 的暖米白、轻日式视觉，不因移动端变成普通后台 UI。

---

# 2. 响应式断点

冻结 4 个布局区间：

| 模式 | 宽度 | 主要用途 |
|---|---:|---|
| Wide Desktop | ≥ 1280px | 主设计基准，16:9 |
| Compact Desktop / Tablet Landscape | 1024–1279px | 小型笔电、横屏平板 |
| Tablet Portrait | 768–1023px | 平板竖屏 |
| Mobile | < 768px | 手机 Web |

实现层可使用 CSS Container / Media Query，但业务布局必须服从以上 4 档。

---

# 3. Personal Center Shell 响应式

## 3.1 Wide Desktop ≥1280

沿用 1.21：

```text
┌────────────── Sidebar ──────────────┬──────── Content ────────┐
│ Logo                                │                         │
│ Avatar / Name                       │ Page Header     🔔 👤    │
│ 我的首页                            │                         │
│ 我的旅行                            │ Main Content            │
│ 旅行偏好                            │                         │
│ 同行人                              │                         │
│ 账户                                │                         │
│                                     │                         │
│ 鸟居水景插画                        │                         │
└─────────────────────────────────────┴─────────────────────────┘
```

规则：

- Sidebar 固定。
- Content 独立滚动或整页滚动，由实现统一，不允许左右区域滚动行为冲突。
- 鸟居水景完整保留。
- Sidebar 宽度不随内容页面变化。

## 3.2 Compact Desktop / Tablet Landscape 1024–1279

Sidebar 收缩为 **Compact Rail**：

```text
┌──── Rail ────┬──────────────────────────────┐
│ Logo Icon    │ Page Header         🔔 👤    │
│ Avatar       │                              │
│ 🏠           │ Main Content                 │
│ 🧳           │                              │
│ ♡            │                              │
│ 👥           │                              │
│ ⚙            │                              │
└──────────────┴──────────────────────────────┘
```

规则：

- Rail 宽约 80–96px。
- 默认只显示图标。
- Hover / Focus 显示 Tooltip。
- Touch 设备点击时不得依赖 Hover 才能知道功能，图标必须是已知语义且可由辅助文本读取。
- 鸟居水景插画隐藏，只保留极淡纹理。
- 当前选中态仍使用樱粉底 + 朱红图标。
- 页面标题不隐藏。

## 3.3 Tablet Portrait 768–1023

不继续保留左侧 Rail，占用内容宽度。

改为：

```text
┌────────────────────────────────────┐
│ ☰  TravelAssist          🔔   👤   │
├────────────────────────────────────┤
│ Page Header                        │
│                                    │
│ Main Content                       │
│                                    │
└────────────────────────────────────┘
```

点击 `☰`：

```text
Left Drawer
├─ 用户头像 / 昵称
├─ 我的首页
├─ 我的旅行
├─ 旅行偏好
├─ 同行人
└─ 账户
```

Drawer：

- 宽度约屏幕 70–80%，最大不超过 360px。
- 点击遮罩关闭。
- Esc 关闭。
- 打开后焦点锁定在 Drawer。
- 不显示大型鸟居插画，仅在底部保留小型低对比装饰。

---

# 4. Mobile Shell <768

Mobile Web 采用：

```text
┌──────────────────────────┐
│ TravelAssist      🔔  👤 │
├──────────────────────────┤
│                          │
│ Page Content             │
│                          │
│                          │
├──────────────────────────┤
│ 首页  旅行  偏好  同行人  账户 │
└──────────────────────────┘
```

## 4.1 Bottom Navigation

固定五项：

- 首页
- 旅行
- 偏好
- 同行人
- 账户

规则：

- 与 Desktop Sidebar 5 项完全对应。
- 不增加第六项“更多”。
- 当前项使用珊瑚朱红。
- 图标 + 文案同时存在。
- 每项最小点击面积 44×44px。
- Bottom Nav 避让系统 Safe Area。

## 4.2 Mobile Top Bar

显示：

- TravelAssist 简化 Logo
- 通知
- Avatar

子页面：

```text
← 登录与安全
```

可替代 Logo 区，但仍保留通知 / Avatar 的可访问入口。

---

# 5. 通用 Content 宽度

## Desktop

- Content 保持最大宽度，避免超宽屏卡片被无限拉长。
- 主要工作区建议 Max Width 1440px 左右。
- 信息型页面使用 12-column Grid。

## Tablet

- 左右边距 24–32px。
- 双栏优先转为单栏或 5:7 比例。

## Mobile

- 页面边距 16px。
- 卡片间距 12–16px。
- 不允许任何业务内容产生横向页面滚动。
- 横向 Tab / Filter 可以自身局部横向滚动。

---

# 6. 通用卡片响应式

统一规则：

```text
Desktop：3列 / 2列 / 大卡 + 小卡
Tablet：2列
Mobile：1列
```

禁止：

- Mobile 强行保留 3 列小卡。
- 通过把字体缩到不可读来保持 Desktop 构图。
- 图片固定 Desktop 高度导致移动端超长。

图片比例建议：

- Hero Desktop：约 16:6 ～ 16:7
- Card：16:9 / 4:3
- Mobile Hero：约 16:9

---

# 7. 1.21 个人中心首页响应式

## Desktop

保持：

- Next Trip Hero
- My Trips
- More Feature Modules

## Tablet

Next Trip Hero 从左右分栏改为：

```text
[图片 40%] [文字 60%]
```

不足 900px 时直接上下排列。

My Trips：

```text
2列
```

More Modules：

```text
2列 + 1列
```

## Mobile

顺序：

```text
下一次旅行
↓
我的旅行
↓
更多功能模块
```

Hero：

```text
[写实照片]
京都 · 3天2晚
日期
关键状态
[查看行程]
```

不在首屏同时展示过多预订细节。

---

# 8. 1.23 Auth 响应式

## Desktop

继续：

```text
Real Travel Photo | Auth Card
```

## Tablet

图片区域缩小为约 38–42%，表单区域扩大。

## Mobile

改为：

```text
[顶部旅行照片 Banner 120–180px]
[Login / Register Form]
```

小屏高度不足或软键盘打开时：

- 允许正常纵向滚动。
- 不固定整个表单高度。
- 不让 CTA 被键盘遮住。
- 不保留 Desktop 的 50/50 双栏。

Google / Apple 按钮全宽。

---

# 9. 1.24 Account 响应式

Desktop：

```text
个人资料 | 联系方式 | 通用设置
紧急联系人
登录与安全 | 数据与隐私 | 预订与账户同步
```

Tablet：

- 上部两栏。
- General Settings 独立一整行。

Mobile：

```text
头像 / 姓名
个人资料
联系方式
通用设置
紧急联系人
账户管理入口（三张纵向）
```

编辑状态：

- Input 全宽。
- `取消 / 保存` 在 Mobile 底部 Sticky Action Bar。
- Sticky Bar 不覆盖 Bottom Nav；编辑期间可临时提高页面底部 Padding。

---

# 10. 1.25 旅行偏好响应式

## Desktop

两个 Radar：

```text
[景点偏好画像] [旅行风格画像]
```

下方六张偏好卡。

## Tablet

Radar 仍可双栏，但每张最小宽度不能低于约 300px。

宽度不足时纵向排列。

## Mobile

```text
景点偏好画像
一句话解释
↓
旅行风格画像
一句话解释
↓
六张偏好摘要卡（单列）
```

Radar 规则：

- Mobile 不显示拥挤的百分比数字。
- 轴名称保持可读。
- 点击 Radar 项可打开对应详细设置。
- 不能只靠 Hover 显示含义。
- `?` 说明在 Touch 上改为 Tap Popover。

---

# 11. 1.26 同行人响应式

Desktop：

- 同行人卡 3–4 列。
- 常用组合横向卡片。
- 特殊需求摘要独立区域。

Tablet：

- 2 列同行人卡。

Mobile：

```text
同行人统计
[+ 添加同行人]

同行人卡
同行人卡
...

常用组合
特殊需求摘要
```

添加 / 编辑：

- Desktop：Right Drawer。
- Tablet：Right Drawer。
- Mobile：Full-height Bottom Sheet / Full-screen Sheet。

人物卡 Mobile 仍最多展示 3 个标签。

---

# 12. 1.27 我的旅行响应式

## Trip Library Desktop

保持：

- Tab
- Search / Filter / Sort
- Next Trip Hero
- Trip Grid

## Tablet

- 搜索占一整行。
- Filter / Sort 在第二行。
- Trip Grid 2 列。

## Mobile

顶部：

```text
我的旅行          [+ 新建旅程]

[全部][即将出发][草稿][历史][收藏] → 横向滚动
```

工具：

```text
[搜索]
[筛选] [排序]
```

Next Trip Hero：

- 图片在上。
- 状态信息在下。
- `继续旅行` 全宽主 CTA。

Trip Card 单列。

`+ 新建旅程` 点击继续遵循 1.27：直接进入 Step 3。

---

# 13. 1.27 单次旅行 / Reservation Hub Mobile

单次旅行 Tab：

```text
总览 地图 日程 预订 预算 设置
```

Mobile 允许 Tab 横向滚动，不压缩成两行。

Reservation Hub：

- 订单卡单列。
- Provider 作为次级标签。
- Voucher / QR 的主要操作置于拇指容易触达的位置。
- 订单详情 Desktop Right Drawer → Mobile Full-screen Sheet。
- `导入已有预订` Desktop Drawer → Mobile Bottom Sheet。

---

# 14. 1.28 Security / Privacy 响应式

## 登录与安全

Desktop：

```text
登录方式 | 登录设备
最近安全活动
```

Mobile：

```text
账户保护摘要
登录方式
登录设备
最近安全活动
```

不缩成双列。

## 数据与隐私

Mobile 顺序：

```text
您的数据
导出我的数据
数据管理
危险区域
```

危险区域保持在页面最下方。

## 删除账户

Mobile 使用 **独立 Full-screen Flow**，不使用小 Dialog。

原因：

- 内容较长。
- 需要明确显示外部订单不会取消。
- 需要 Re-auth 与最终确认。

---

# 15. 1.28 预订与账户同步响应式

Desktop Provider 卡可 3 列。

Tablet：2 列。

Mobile：

```text
Booking.com
确认邮件
Agoda
...
↓
导入已有预订
```

Provider Logo 缩小，不占大面积。

连接 / 断开确认使用 Bottom Sheet。

---

# 16. Drawer / Dialog / Sheet 统一规则

## Desktop

- 简单确认：Dialog。
- 复杂编辑：Right Drawer。
- 大型高风险流程：独立页面。

## Tablet

- Drawer 可保持。
- 宽度不超过视口 60%。

## Mobile

| Desktop Component | Mobile |
|---|---|
| Popover | Bottom Sheet / anchored sheet |
| Right Drawer | Full-screen Sheet |
| Large Dialog | Full-screen Sheet |
| Simple Confirm Dialog | Center Dialog / Bottom Sheet |
| Hover Tooltip | Tap Popover |

---

# 17. 全局状态模型

所有个人中心页面统一分三层状态：

```text
Page State
Module State
Action State
```

## Page State

- Loading
- Ready
- Empty
- Error
- Offline / Network unavailable
- Authentication expired
- Permission unavailable

## Module State

- Loading
- Partial Error
- Empty
- Stale / Sync pending

## Action State

- Idle
- Submitting
- Success
- Error
- Disabled

---

# 18. Page Loading

首次进入页面：

```text
Shell 立即显示
↓
Content 使用 Skeleton
```

不允许整个页面只显示中央 Spinner。

Shell：

- Sidebar / Mobile Nav 保持可见。
- 页面标题 Skeleton 或直接显示已知标题。
- 不让加载前后布局发生大幅跳动。

---

# 19. Skeleton

Skeleton 必须模仿真实布局。

例如 Trip Card：

```text
[████████ 图片]
██████ 标题
████ 日期
████████ 状态
```

Preference：

- Radar 用圆形 / 多边形 Placeholder。
- 不使用 6 个随意矩形冒充图表。

规则：

- Skeleton 不展示假数据文字。
- 不持续无限 Shimmer；尊重 Reduce Motion。
- 列表加载时优先 3–6 个 Skeleton，而不是铺满长页面。

---

# 20. 局部 Loading

例如：

- 保存 Profile
- 重新授权 Booking
- 删除同行人
- 导入订单

只锁定相关操作区域。

按钮：

```text
保存修改 → 保存中…
```

不要让整个页面重新 Skeleton。

---

# 21. Empty State

统一结构：

```text
轻量图标 / 小型插画
标题
1–2 行说明
Primary CTA（如确有下一步）
Secondary Action（可选）
```

禁止 Empty State：

- 巨型插画占满屏。
- 使用灰色后台风。
- 没有下一步。

---

# 22. 核心 Empty State 例

## 我的旅行

```text
还没有旅行
开始规划下一次旅程。

[+ 新建旅程]
```

## 收藏

```text
还没有收藏
看到喜欢的旅行、景点或住宿时，点击 ♡ 保存。
```

## 同行人

```text
还没有保存的同行人
添加家人、朋友或常用旅伴。

[+ 添加同行人]
```

## 紧急联系人

```text
还没有紧急联系人

[+ 添加紧急联系人]
```

## Reservation

如果行程有节点但无预约：

```text
还没有已确认的预订
您可以从行程中的住宿、门票和餐厅开始。

[查看尚未预订项目]
```

---

# 23. Error State

分级：

## Field Error

输入框下方：

```text
请输入有效的邮箱地址
```

## Action Error

Toast / Inline：

```text
保存失败，请重试
[重试]
```

## Module Error

卡片区域：

```text
预订同步暂时不可用
其他行程数据不受影响。
[重试]
```

## Page Error

```text
暂时无法加载这个页面
您的数据没有丢失。

[重新加载]
[返回个人中心]
```

禁止把一个 Provider 错误升级为整页 Error。

---

# 24. Offline / Network

Web 无网络时：

顶部轻量 Banner：

```text
当前处于离线状态
部分信息可能不是最新内容。
```

若已有缓存：

- 展示缓存内容。
- 标记“上次更新”。

需要网络的操作：

```text
当前离线，连接网络后再试
```

不清空已显示内容。

---

# 25. Auth Expired

Session 过期时：

```text
登录状态已过期
为了保护您的账户，请重新登录。

[重新登录]
```

保存用户当前目标地址。

重新登录成功后尽量返回原页面。

未保存的敏感表单是否恢复由安全策略决定；不得未经确认恢复密码等敏感字段。

---

# 26. Permission / Provider Authorization

例如 Booking 授权过期：

```text
Booking.com 授权已过期
现有订单仍保留，但暂时无法自动同步。

[重新授权]
```

不得显示成账户整体异常。

---

# 27. Success Feedback

普通保存：

```text
✓ 已保存
```

Toast / Inline 约 1–2 秒。

重大动作：

- Provider 成功连接
- 数据导出申请
- 删除账户申请

允许使用更明显的确认卡 / 页面。

不要所有成功都弹 Dialog。

---

# 28. Unsaved Changes

统一应用到：

- Profile
- Preference Details
- Companion Edit
- Account Settings

离开时：

```text
您有尚未保存的修改

[放弃修改]
[继续编辑]
```

Mobile 浏览器后退也必须触发相同保护。

---

# 29. Optimistic Update

可用于：

- 收藏 / 取消收藏
- 轻量偏好标签
- 非危险 UI 排序

不可用于：

- 修改邮箱
- 修改手机
- 删除账户
- 外部订单取消
- 退款
- Provider 断开连接

这些必须等待服务端确认。

---

# 30. Toast 统一

位置：

- Desktop：右上内容区。
- Mobile：Bottom Nav 上方。

类型：

- Success
- Info
- Warning
- Error

Toast 不能承载必须长期阅读的重要信息。

例如“删除账户不会取消外部订单”绝不能只放 Toast。

---

# 31. Badge / Status

Status 颜色统一：

```text
Success → Green
Info → Blue / Neutral
Warning → Amber
Danger / Error → Red
Primary Brand Action → Coral Vermilion
```

**Brand Coral 与 Danger Red 必须分开。**

---

# 32. Touch / Hover 转换

现有设计中所有：

```text
?
Hover 说明
Tooltip
```

在 Touch 设备：

```text
Tap → Popover / Bottom Sheet
```

不得出现“手机上无法查看说明”的情况。

---

# 33. Typography

不因为屏幕变小简单缩放全部字体。

建议：

- Desktop Page Title：32–40
- Tablet：28–34
- Mobile：24–30
- 正文 Mobile 不低于 14–16
- Form Input 不低于 16px，避免 iOS 自动缩放
- Caption 可 12–13，但不可承载关键业务信息

---

# 34. Touch Target

Mobile / Touch：

- 最小 44×44px。
- Icon-only Action 必须有 accessible label。
- 相邻危险按钮保持足够间距。
- Checkbox / Radio 点击区域包括文字。

---

# 35. Keyboard / Focus

Desktop Web 必须支持：

- Tab 顺序符合视觉顺序。
- Focus Ring 清楚可见。
- Enter / Space 激活按钮。
- Esc 关闭 Popover / Dialog / Drawer。
- Drawer / Modal 打开时 Focus Trap。
- 关闭后焦点回到触发按钮。

---

# 36. Reduced Motion

若用户设置 Reduce Motion：

- Skeleton 不强制 shimmer。
- Drawer / Sheet 使用极短淡入或无动画。
- Radar 动画关闭。
- Hover 浮动效果关闭。
- 不影响状态信息理解。

---

# 37. Text Expansion / 多语言

虽然第一版中文优先，组件必须容忍：

- 英文长 30–50%
- 日文
- 德文等较长文本

规则：

- 按钮避免固定像素宽度。
- Status Chip 可以换行或扩大。
- 不使用图片内文字作为业务 UI。
- 重要表格 Mobile 转 Card，不横向强撑。

---

# 38. 表格转 Mobile Card

例如 Login Device / Reservation：

Desktop：

```text
Name | Status | Date | Action
```

Mobile：

```text
MacBook Pro · Chrome
当前设备
日本 · 东京
刚刚
[管理]
```

禁止手机端显示需要水平拖动的大型管理表格。

---

# 39. Sticky Action

Mobile 编辑页可使用底部 Sticky Action：

```text
[取消] [保存修改]
```

但：

- 必须位于 Bottom Nav 之上，或编辑时临时隐藏 Bottom Nav。
- 推荐：**编辑 / 高风险流程中隐藏 Bottom Nav**，避免误切页面。
- 退出编辑后恢复 Bottom Nav。

---

# 40. 高风险页面导航

以下页面隐藏 Bottom Nav：

- 删除账户
- 修改邮箱验证
- 修改手机号验证
- 重设密码
- Provider Re-auth
- 数据导出 Re-auth

顶部使用：

```text
← 返回
```

避免高风险流程中误触一级导航。

---

# 41. 状态页面视觉

所有状态页继续保持方案 D：

- 暖米白背景。
- 小型樱花 / 和纸细节。
- 不用冷灰企业后台插画。
- Error 不用整屏大红。
- Danger 只强调关键操作。

---

# 42. 页面状态覆盖矩阵

至少要求以下页面在实现前具备 State Spec：

| 页面 | Loading | Empty | Error | Unsaved | Mobile |
|---|---|---|---|---|---|
| Personal Home | ✓ | ✓ | ✓ | - | ✓ |
| Auth | ✓ | - | ✓ | Form | ✓ |
| Account | ✓ | 部分 | ✓ | ✓ | ✓ |
| Preferences | ✓ | Default | ✓ | ✓ | ✓ |
| Companions | ✓ | ✓ | ✓ | ✓ | ✓ |
| Trip Library | ✓ | ✓ | ✓ | - | ✓ |
| Reservation Hub | ✓ | ✓ | Partial | - | ✓ |
| Security | ✓ | - | ✓ | Action | ✓ |
| Data / Privacy | ✓ | - | ✓ | - | ✓ |
| Booking Sync | ✓ | ✓ | Partial | - | ✓ |

---

# 43. 已确认概念图覆盖

本轮已确认以下 6 类概念图方向，作为响应式与状态规范的视觉验收依据：

1. **Personal Center Mobile Home**
2. **Mobile 我的旅行**
3. **Mobile 旅行偏好**
4. **Tablet Account / Compact Layout**
5. **Loading / Skeleton / Empty / Error 状态集合**
6. **Mobile Security / Delete Account Full-screen Flow**

不需要为 1.22–1.28 每个页面重新画一次 Desktop。

---

# 44. 最终冻结项

- 四档响应式断点。
- ≥1280 Full Sidebar。
- 1024–1279 Compact Rail。
- 768–1023 Top Bar + Drawer。
- <768 Top Bar + 5 项 Bottom Navigation。
- Mobile 不保留鸟居大型 Sidebar 图，仅保留轻量品牌元素。
- Desktop Drawer 在 Mobile 转 Full-screen Sheet。
- Hover Tooltip 在 Touch 转 Tap Popover / Sheet。
- 所有页面统一 Page / Module / Action State。
- Skeleton 保持真实布局。
- Empty State 必须提供合理下一步。
- Provider 局部失败不升级成整页 Error。
- Mobile 表格转卡片。
- 高风险流程隐藏 Bottom Nav。
- 移动端输入框字体不低于 16px。
- Touch Target 不低于 44×44px。
- Brand Coral 与 Danger Red 严格区分。
- Reduce Motion / Keyboard / Focus 纳入规范。

---

# 45. 暂不冻结

- 原生 iOS / Android Navigation Pattern。
- App 手势返回细节。
- Desktop 超宽屏 >1920 的特殊沉浸布局。
- Foldable / 双屏专用布局。
- Apple Dynamic Type / Android Font Scale 的原生实现。
- Offline-first 数据策略本身。
- Skeleton 动画具体技术库。
