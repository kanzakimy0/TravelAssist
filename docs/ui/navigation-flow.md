# TravelAssist 页面连接与主流程导航规范

> 状态：v1.0 / 2026-09-05 审计版
> 范围：首页、Start Flow、Planner、Personal Center 及其现有子页面

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
```

## 2. 当前连接审计

| 来源 | 目标 | 当前状态 | 结论 |
|---|---|---|---|
| 首页 `/` 主 CTA | `/start` | 已连接 | 保留 |
| 首页 `/` | `/personal-center` | 缺失 | 补充轻量头像/个人中心 Mock 入口；不得伪造 Auth |
| 首页登录按钮 | Auth | disabled | 保持真实 Auth 边界 |
| `/start` Logo | `/` | 已连接 | 保留 |
| `/start` 头像 | `/personal-center` | 仅 button，无目标 | 补充 |
| `/start` 方案结果 | `/planner` | 缺失 | 选中方案后必须有“使用此方案并进入地图” |
| `/planner` Brand | `/` | 已连接 | 保留 |
| `/planner` | `/personal-center` | 已连接 | 保留 |
| `/planner` | `/start` | 缺少明显新建入口 | 增加“新建旅行” |
| Personal Center 内部五项 | 各子路由 | 已连接 | 保留 |
| Personal Center Brand | `/` | 当前指向 `/personal-center` | 改为全局首页；“我的首页”继续指向个人中心 |
| Personal Home“继续规划” | `/planner` | disabled | 补充 Mock 当前行程入口 |
| Personal Home“新建旅行” | `/start` | 缺失 | 补充 |
| `/personal-center/trips` | `/start` / `/planner` | placeholder 死端 | 补充最低导航闭环 |

## 3. 目标主流程

```text
首页 /
  ↓ 让我们开始吧
Start /start
  ↓ 选择方案
Planner /planner
  ↔ Personal Center /personal-center
  ↘ 新建旅行 /start

Personal Center
  ↔ 首页 /
  ↔ Planner /planner
  ↘ 新建旅行 /start
```

## 4. 首页规则

首页保持极简，不增加传统大型 Navbar。

- 主 CTA → `/start` 保留。
- 当前未接真实 Auth，因此“登录”不能假装完成登录。
- 可新增轻量“个人中心 / 头像（Mock）”入口 → `/personal-center`。
- 未来真实 Session 接入后，由登录态决定显示 Login 或 Avatar。

## 5. Start Flow 规则

- Logo → `/`。
- 头像 → `/personal-center`。
- Step 1–3 不因导航 Task 被重写。
- 方案生成完成并选中后出现 `使用此方案并进入地图` → `/planner`。
- 最终 Trip Contract 未完成前，仅允许使用明确的 Mock bridge 传递选择；不得复制第二套业务数据模型。

## 6. Planner 规则

- Brand → `/`。
- Personal Center → `/personal-center`。
- 增加 `新建旅行` → `/start`。
- 导航 Task 不改写 Mapbox、Trip State、预约或 Planner v0.3 业务。

## 7. Personal Center 规则

- TravelAssist Brand 表示全局产品品牌，目标改为 `/`。
- `我的首页` 继续为 `/personal-center`。
- Personal Home：`继续规划` → `/planner`，`新建旅行` → `/start`。
- Trips placeholder 至少提供 `开始新旅行` → `/start`、`返回当前规划` → `/planner`。
- Mock 入口必须明确不代表真实保存/登录状态。

## 8. 数据桥接原则

Start → Planner 当前只解决“用户选择后能进入相应 Planner 预览”。

允许：query parameter、现有 local/session storage 的 selectedPlanId、显式临时 adapter。

禁止：新建第二套 Trip State、把 Start Draft 当最终 Trip Contract、为导航直接写真实数据库。

## 9. 可访问性

- 所有导航使用 Link 或语义按钮。
- 不使用 `href="#"`。
- Keyboard 可达、focus-visible 清晰。
- Back / Forward 正常。
- Mobile 无横向溢出。
- Disabled 功能不能伪装成可用导航。

## 10. Owner 边界

A： 首页、Start 主流程、Planner、主系统 Header / 入口。

B： Personal Center 内部页面及其返回主系统的链接。

因此实现拆分为 TASK-010-A / TASK-010-B，避免 A/B 同时修改高冲突文件。
