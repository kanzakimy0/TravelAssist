# TravelAssist 页面连接与主流程导航规范

> 状态：v1.2 / 2026-09-06 全局 Logo 与迁移闭环修正版  
> 范围：首页、Start Flow、Planner / Detail Workspace、Personal Center 及当前已存在子页面  
> 核心决策：**所有页面中的 TravelAssist 产品 Logo / Brand 点击后统一进入产品首页 `/`。**

## 1. 当前实际路由

```text
/
├─ /start
├─ /planner
└─ /personal-center
   ├─ /personal-center/trips
   ├─ /personal-center/preferences
   ├─ /personal-center/companions
   └─ /personal-center/account
      ├─ /personal-center/account/security
      ├─ /personal-center/account/privacy
      └─ /personal-center/account/booking-sync
```

补充状态：

- Start Flow 仍是单一路由 `/start`，UI Step 1–4 是页面内部状态，不拆成独立 page route。
- Planner 与 Detail 设计为同一 Trip Workspace 的两种模式；Detail 当前由 `TASK-011-A / Issue #86 / Draft PR #102` 承接，在其合入 `develop` 前不得视为已完成。
- Auth、旅行灵感、目的地探索、分享页等尚未形成当前可运行路由，不在本轮伪造空白页面。

---

## 2. 全局 TravelAssist Logo 契约

### 2.1 唯一目标

所有页面中作为产品品牌入口出现的：

- TravelAssist 图形 Logo；
- TravelAssist Wordmark；
- Desktop Brand；
- Mobile / Compact Brand；
- Auth Shell Brand（未来）；
- Planner / Detail Workspace Brand；

点击后统一：

```text
TravelAssist Logo / Brand → /
```

首页自身 Logo 也使用真实语义链接：

```text
/ 上点击 TravelAssist Logo → /
```

这允许统一组件、统一可访问性和统一自动化测试；不得因为“已经在首页”而把 Logo 改成不可点击的 `div`。

### 2.2 不属于本规则的图形

以下不被视为 TravelAssist 产品 Logo：

- Partner / OTA Logo；
- 地图 POI 图标；
- 用户头像；
- 行程封面图；
- 纯装饰鸟居、樱花、水彩纹理；
- 景点、酒店、餐厅品牌标识。

它们的点击行为由各自业务定义，不得错误跳回首页。

### 2.3 首页返回入口原则

- TravelAssist Logo 是全局稳定的产品首页入口。
- Personal Center 不额外增加“返回 TravelAssist”或“返回首页”菜单项。
- Account 子页可保留“返回账户”等模块级返回按钮；这不与 Logo 返回产品首页冲突。
- 存在未保存修改时，Logo 导航必须继续通过现有 Navigation Guard，不得静默丢失数据。
- Desktop、窄屏和 Mobile 均必须有可见、键盘可达的 Logo。
- 使用 `Link` 或语义等价导航，不使用点击 `div`，不使用 `href="#"`。

---

## 3. 2026-09-06 当前连接审计

| 来源 | 目标 | `develop` 当前状态 | 结论 |
|---|---|---|---|
| 首页 TravelAssist Logo | `/` | **不是链接** | 缺失，必须修正 |
| 首页主 CTA | `/start` | 已连接 | 保留 |
| 首页个人中心入口 | `/personal-center` | 已连接 | 保留 |
| 首页登录按钮 | Auth | disabled | 当前无 Auth，保持真实边界 |
| `/start` Logo | `/` | 已连接 | 保留 |
| `/start` 头像 | `/personal-center` | 已连接 | 保留 |
| Start Step 上一步 / 下一步 / 生成 | 同页 Step 状态 | 已连接 | 保留，不拆路由 |
| `/start` 方案结果 | `/planner` | 已连接 | 保留 |
| `/start?entry=step3` | UI Step 3 | 已连接 | 保留 |
| `/planner` Logo | `/` | 已连接 | 保留 |
| `/planner` 新建旅行 | `/start` | 已连接 | 保留 |
| `/planner` 个人中心 | `/personal-center` | 已连接 | 保留 |
| Planner → Detail | `/planner?view=detail&day=N` | `develop` 未完成；Draft PR #102 已实现 | 由 TASK-011-A 继续承接，不在本轮重复修改 Planner |
| Detail Logo | `/` | 仅存在于 Draft PR #102 | PR 合入后复验 |
| Personal Center Desktop Logo | `/` | 当前错误指向 `/personal-center` | 缺失，必须修正 |
| Personal Center Mobile Logo | `/` | 当前错误指向 `/personal-center` | 缺失，必须修正 |
| Personal Center 五项一级导航 | 各子路由 | 已连接 | 保留 |
| Personal Home 继续规划 | `/planner` | Hero 按钮 disabled | 缺失，必须修正 |
| Personal Home 开始新旅行 | `/start?entry=step3` | 不存在 | 缺失，必须补充 |
| Personal Home 查看全部 | `/personal-center/trips` | 已连接 | 保留 |
| Personal Home 旅行卡 | `/personal-center/trips` | 已连接 | 当前为 Mock 入口，保留 |
| Trips 开始新旅行 | `/start?entry=step3` | 页面只有占位文案 | 缺失，必须补充 |
| Trips 返回当前规划 | `/planner` | 页面只有占位文案 | 缺失，必须补充 |
| Account 三个子入口 | Security / Privacy / Booking Sync | 已连接 | 保留 |
| Account 子页返回账户 | `/personal-center/account` | 已连接 | 保留 |
| Avatar Popover 内部导航 | Personal Center 子路由 | 已连接 | 保留；不得增加重复首页项 |

总体结论：

> **当前迁移按钮尚未全部完成。**  
> TASK-010-A 主流程已完成；剩余明确缺口是首页 Logo、Personal Center 双端 Logo、Personal Home 两个主流程动作和 Trips 占位页两个出口。Planner → Detail 已由独立 TASK-011-A / Draft PR #102 实现，等待合入后才能计为完成。

---

## 4. 目标主流程

### 4.1 首次规划

```text
首页 /
  ↓ 让我们开始吧
Start /start（Step 1）
  ↓
Step 2
  ↓
Step 3
  ↓
生成 / 选择方案
  ↓ 使用此方案并进入地图
Planner /planner
```

### 4.2 Personal Center 快速新建旅行

```text
Personal Center
  ↓ 开始新旅行
/start?entry=step3
  ↓
Start Flow UI Step 3
  ↓
生成 / 选择方案
  ↓
Planner
```

### 4.3 继续已有 Mock 规划

```text
Personal Home
  ↓ 继续规划
/planner
```

### 4.4 Planner 与正式行程详情

```text
Planner
  ↓ 进入行程详情
/planner?view=detail&day=N

Detail Mode
  ↓ 返回规划 / AI 行程规划
/planner
```

该部分由 TASK-011-A 管理。TASK-010-B v1.1 只复验，不改写其 Planner 状态、地图和 URL Contract。

### 4.5 任意页面返回产品首页

```text
任意当前页面
  ↓ TravelAssist Logo
/
```

---

## 5. 首页规则

- TravelAssist Logo 必须是 `Link href="/"`。
- 主 CTA → `/start`，从 Step 1 开始。
- Personal Center / Avatar Mock 入口 → `/personal-center`。
- 当前未接真实 Auth，“登录”不得伪装成可用。
- 语言选择和 AI 面板属于同页交互，不建立假路由。
- 首页 Logo 的链接化不得改变首页视觉尺寸、构图和背景。

---

## 6. Start Flow 规则

- Logo → `/`。
- 头像 → `/personal-center`。
- `上一步 / 下一步 / 生成方案 / 返回调整 / 重新生成`属于同一路由内状态变化。
- 选中方案后，`使用此方案并进入地图` → `/planner`。
- `/start?entry=step3` 直接显示 UI Step 3；UI Step 3 对应内部 `currentStep = 2`。
- 不新建 `/start/step3`，不复制 `TripBasicsStep`。
- 无效 `entry` 参数回退标准 `/start` 流程。
- query 只决定入口，不进入正式 Trip State。

---

## 7. Planner / Detail 规则

### Planner

- Logo → `/`。
- `新建旅行` → `/start`。
- `个人中心` → `/personal-center`。
- 更多设置、方案切换、日程范围、底栏 Tab、地图对象详情属于工作区内交互。
- Planner → Detail 由 TASK-011-A 提供，不由本轮重复实现。

### Detail

- 与 Planner 共用同一个 TravelAssist Logo → `/`。
- Detail 是 Trip Workspace Mode，不重新建立第二套产品 Shell。
- Day 切换、时间轴气泡、项目 Modal、AI 检查属于同页交互。
- 返回 Planner 使用明确模式切换或 `/planner`，不得依赖浏览器 Back 作为唯一出口。

---

## 8. Personal Center 规则

### 8.1 Logo

Desktop 与 Mobile / Compact 的 TravelAssist Logo 都必须：

```text
→ /
```

`我的首页` 继续：

```text
→ /personal-center
```

二者语义严格分离。

### 8.2 Personal Home

```text
继续规划 → /planner
开始新旅行 → /start?entry=step3
查看全部 → /personal-center/trips
```

当前数据仍是 Mock 时，必须明确标注，不得声称真实 Saved Trip 已接入。

### 8.3 Trips 占位页

真实 Trip Library 未实现前，至少提供：

```text
开始新旅行 → /start?entry=step3
返回当前规划 → /planner
```

占位页必须说明没有真实保存列表，但不得成为导航死端。

### 8.4 Preferences / Companions

当前仍可为占位页面，但：

- 必须继续复用 Personal Center Shell；
- Logo → `/`；
- 一级导航可返回其他 Personal Center 页面；
- 具体分类详情与编辑入口由各自 WBS / Task 实现，不在导航修复 Task 中伪造。

### 8.5 Account

- 账户概览的三个入口分别进入 Security、Privacy、Booking Sync。
- 子页面保留 `返回账户`。
- 所有页面共用 Shell Logo → `/`。
- 未保存修改时，Logo、Sidebar 和 Avatar 导航继续经过 Guard。

### 8.6 Avatar Popover

- 保留 Personal Center 内部快捷导航。
- 不增加“返回首页 / 返回 TravelAssist”菜单项。
- Logo 是唯一标准的全局首页返回入口。

---

## 9. 数据与实现边界

允许：

- Next.js `Link`；
- 现有 `GuardedLink`；
- 现有 query parameter；
- 现有 Mock selected plan adapter；
- 新增独立导航回归测试。

禁止：

- 新建第二套 Trip State；
- 写真实数据库；
- 伪造 Auth / Session / Saved Trips；
- 为尚未开发功能创建空路由；
- 为解决 Logo 导航改写 Planner Map、Trip State 或 Detail Workspace；
- 与 Draft PR #102 同时修改其高冲突 Planner 文件；
- 在 Avatar Popover 增加重复首页菜单。

---

## 10. 可访问性与历史记录

- Logo 必须有明确可访问名称，如 `TravelAssist 首页` 或 `返回 TravelAssist 首页`。
- 导航使用 `Link` / `GuardedLink`，不使用 `onClick` 的非语义容器。
- Keyboard 可达，`focus-visible` 清晰。
- Back / Forward 正常。
- Mobile 无横向溢出。
- Disabled 功能必须明确说明原因，不能伪装成可用链接。
- 页面内 Skip Link（例如 `#planner-workspace`）允许保留；禁止的是无目标 `href="#"`。
- Logo 导航触发未保存保护时，确认框必须可取消且不丢失当前修改。

---

## 11. Owner 与任务边界

### A

- 首页 Logo 链接化；
- Start / Planner / Detail Logo 与主流程复验；
- TASK-011-A 的 Planner → Detail 实现。

### B

- Personal Center Desktop / Mobile Logo；
- Personal Home 主流程动作；
- Trips 占位页出口；
- Personal Center Guard / responsive / internal navigation。

### Shared

- 全路由导航审计；
- 独立回归测试；
- 文档和 Result；
- 合并前冲突检查。

执行 Task：`docs/tasks/TASK-010-b-personal-center-navigation.md` v1.1。  
TASK-010-A 已完成；TASK-011-A 独立继续，禁止重复开发。
