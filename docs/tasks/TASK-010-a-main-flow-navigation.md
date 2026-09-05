# TASK-010-A — 主系统页面连接闭环

## Metadata
- Task ID: `TASK-010-A`
- Owner: `A`
- Issue: `#78`
- Status: `Planned`
- Depends On: `TASK-008.3-A / #77` merged
- Design Source: `docs/ui/navigation-flow.md`
- Branch: `feature/a-main-flow-navigation`

## 1. 目标

形成主系统最小可用路由闭环：

```text
/ 首页
→ /start
→ /planner
↔ /personal-center
```

只做导航、入口与最小 Mock bridge，不实现 Auth / DB / Saved Trips / 最终 Trip Contract。

## 2. 当前实际状态

- 首页 CTA 已进入 `/start`。
- 首页 Login disabled；没有可用 Personal Center 入口。
- Start Logo 已回 `/`。
- Start 头像只是 button，没有目标。
- PlanSelectionStep 只能选中方案，不能进入 Planner。
- Planner Brand 已回 `/`。
- Planner 已有 `/personal-center` 链接。

## 3. 首页

保持极简首页，不做大型 Navbar。

新增轻量：
- `个人中心 / 头像（Mock）` → `/personal-center`

真实 Login 仍保持未接 Auth 的边界，不能把 Personal Center Mock 入口伪装成“已登录成功”。主 CTA `/start` 不变。

## 4. Start Header

- Logo → `/` 保留。
- 右上头像从无动作 button 改为可访问 `/personal-center` 的 Link/语义触发。
- 不修改 Step 1–3 内容结构。

## 5. Plan Selection → Planner

选中生成方案后增加明确主 CTA：

`使用此方案并进入地图`

目标 `/planner`。

必须保留选择意图，可使用 query、现有 localStorage selectedPlanId 或明确命名的 temporary Mock adapter。Planner 至少能映射到对应的三个预览方案之一。

禁止：复制第二套 Trip State、将 Start Draft 冒充最终 Contract、为导航写真实数据库。

## 6. Planner Header

保留：
- Brand → `/`
- Personal Center → `/personal-center`

补充：
- `新建旅行` → `/start`

如果 TASK-008.2 / 008.3 已重做 Header，必须适配最新结构，不回滚视觉。

## 7. Back / Forward

验证：
- `/` → `/start` → `/planner`
- browser back 回 `/start`
- forward 回 `/planner`
- selected plan Mock bridge 不造成 redirect loop

## 8. 可访问性

- Link 语义正确
- 不用 `href="#"`
- focus-visible
- keyboard 可达
- Mobile 可操作
- 无横向溢出

## 9. 不包含

Personal Center 内部文件修改（由 TASK-010-B）、Auth/Session、Saved Trips、最终 Start→Trip Contract、Planner v0.3 业务重做。

## 10. 验证

```bash
npm ci
npm run lint
npm run typecheck
npm run test --if-present
npm run format:check
npm run build
git diff --check
```

浏览器至少验证 1440×900 / 1024×768 / 390×844。

## 11. Tracking

最终更新 WBS/Result，Issue #78 与 Task/Branch/Commit/PR 一致；不自动 merge。完成后停止。
