# TASK-010-B — Personal Center 反向导航与继续规划入口

## Metadata
- Task ID: `TASK-010-B`
- Owner: `B`
- Issue: `#79`
- Status: `Planned`
- Design Source: `docs/ui/navigation-flow.md`
- Branch: `feature/b-personal-center-navigation`

## 1. 目标

让 Personal Center 不再成为与主系统割裂的信息岛，补齐回首页、继续 Planner、新建旅行的最低连接。

只修改 Personal Center 自己的导航与现有 Mock 页面入口，不修改 A 的 Planner / Start 业务。

## 2. 当前实际状态

已存在：
- `/personal-center`
- `/personal-center/trips`
- `/personal-center/preferences`
- `/personal-center/companions`
- `/personal-center/account`

内部五项导航正常。

缺失：
- Brand 回全局首页
- Personal Home `继续规划`
- `新建旅行`
- Trips placeholder 的主系统出口

## 3. Sidebar Brand

当前 TravelAssist Brand 指向 `/personal-center`。

修改为：
- Brand → `/`

同时：
- `我的首页` 继续由现有 primary nav → `/personal-center`

让“产品首页”和“个人中心首页”语义分离。

## 4. Personal Home

将目前 disabled 的 `继续规划` 改为可用 Link：
- → `/planner`
- 辅助说明明确这是当前 Mock 行程预览，不能暗示 Saved Trip 已接入。

增加：
- `新建旅行` → `/start`

现有 `查看全部` → `/personal-center/trips` 保留。

## 5. Trips Placeholder

真实 Saved Trips 尚未实现前，至少提供两个动作：
- `开始新旅行` → `/start`
- `返回当前规划` → `/planner`

页面明确当前没有真实保存列表，这些只是导航入口，不伪造数据库内容。

## 6. Avatar Popover

内部五项目标继续保留。

全局返回至少有一处稳定入口，优先由 Sidebar Brand 完成；如果移动端 Sidebar 不可见，则 Avatar Popover 增加：
- `返回 TravelAssist` → `/`

避免小屏用户无返回主系统路径。

## 7. 必须保留

- active nav
- aria-current
- account/preferences/companions/trips 路由
- avatar popover close / Esc / focus restore
- responsive

## 8. 不包含

Auth / Session / Logout、Saved Trip backend、Planner source、Start source、Preference/Companion 业务实现。

## 9. 验证

```bash
npm ci
npm run lint
npm run typecheck
npm run test --if-present
npm run format:check
npm run build
git diff --check
```

浏览器验证：
- Personal Center → `/`
- Personal Center → `/planner`
- Personal Center → `/start`
- Trips placeholder → `/planner` / `/start`
- back/forward
- 1440×900 / 390×844 / 320×740

## 10. Tracking

最终更新 WBS/Result，Issue #79 与 Task/Branch/Commit/PR 一致；不自动 merge。完成后停止。
