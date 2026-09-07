# WBS-1.13-B Result — 主系统 Design Token / 色彩 / 字体 / 圆角

## Status

**待审查 / Design Delivered**

WBS 1.13 在最新 `develop` 中原为 `未开始`；依赖 1.4、1.5 均已完成。用户要求“如果还未开始那么开始执行”，本轮已由 B 单项接手设计规格并完成交付。A 继续拥有后续主旅行系统工程实装责任。

## Tracking

- WBS: `1.13`
- Owner: B（本设计项）
- Issue: #178
- Branch: `docs/b-wbs-1-13-main-design-tokens`
- Draft PR: #179
- Base: `85675375a52a1bb1adaf37d9b8ea0a48a467eae1`
- Task commit: `6dc3732f487eb5248f06a0472c72fbbcc1e6db8e`
- Design commit: `f48baab2612015841cb74333fd21b1f58201442b`
- Design: `docs/ui/main-system-design-tokens.md`

## Checked Inputs

### Product / design

- `docs/ui/design-system.md`
- `docs/ui/home-page.md`
- `docs/ui/trip-planner.md`
- `docs/ui/planner-right-panel-secondary-tabs.md`
- `docs/ui/trip-detail.md`
- `docs/ui/help-icons.md`
- 当前项目对话中已确认的暖白、樱粉、珊瑚朱红、深墨蓝/暖墨褐、圆润浮层与地图沉浸方向。

### Current implementation read-only audit

- `src/app/globals.css`
- `src/components/ui/button.module.css`
- `src/features/home/components/home-hero.module.css`
- `src/features/start-flow/start-flow.module.css`
- `src/features/planner/planner-v05.module.css`
- `src/features/personal-center/personal-center.module.css`

发现的主要现状：

1. `globals.css` 明确仍把第一版 Token 标记为 provisional，主 Accent 仍为早期蓝灰 `#56658F`。
2. Start Flow 已形成暖色局部变量：`#D86657 / #BD4F43 / #283342 / #6F6A68`。
3. Planner v0.5 已使用 `#B95649` 作为关键动作 / range accent，Surface 已大量使用 `#FFFCF7`。
4. Personal Center 已形成同家族 `#A74739 / #FAF6EF / #FFFCF7`，但属于 B 模块局部 ownership。
5. 因此本任务不是发明新配色，而是把已有成功方向收敛成 canonical semantic roles。

## Delivered Decisions

### Core palette

- Accent: `#B95649`
- Accent Hover: `#A74739`
- Accent Pressed: `#963E34`
- Canvas: `#FAF6EF`
- Surface: `#FFFCF7`
- Surface Strong: `#FFFDF9`
- Surface Muted: `#F7EEE7`
- Surface Blush: `#FAEEEB`
- Text Primary: `#283342`
- Text Secondary: `#6F6A68`
- Text Tertiary: `#80716B`
- Border: `#E6D9CF`
- Focus: `#954439`

### Status colors

- Success: `#256F52` / soft `#EAF4EF`
- Warning: `#9A6500` / soft `#FFF4D8`
- Danger: `#B6404C` / soft `#FCEBED`
- Info: `#3F6F8F` / soft `#EAF2F7`

品牌珊瑚色与状态色明确分离；Planner 路线 / 交通专用色继续由地图语义拥有，不强制改成珊瑚色。

### Typography

- 默认：CJK + Latin UI Sans fallback；不新增字体包。
- Editorial Serif：只允许 Home / 旅行灵感等少量大型人文标题。
- Planner 时间、价格、路线、表单、Button、风险和状态全部继续 Sans。
- 排版角色：Display / H1 / H2 / H3 / Body Large / Body / Label / Caption / Micro。

### Radius

冻结角色尺度：

```text
8 / 12 / 16 / 20 / 28 / 36 / pill
```

并给出 Input、Card、Panel、Popover、Map Quick Card、Dialog、Search、CTA 映射。

## Contrast Calculation

本轮使用标准 sRGB 相对亮度公式进行纯色组合计算。结果：

| Pair | Ratio |
|---|---:|
| `#283342` on `#FFFCF7` | 12.49:1 |
| `#6F6A68` on `#FFFCF7` | 5.21:1 |
| `#80716B` on `#FFFCF7` | 4.57:1 |
| White on `#B95649` | 4.68:1 |
| White on `#A74739` | 5.83:1 |
| `#954439` on `#FFFCF7` | 6.49:1 |
| `#256F52` on `#EAF4EF` | 5.38:1 |
| `#9A6500` on `#FFF4D8` | 4.53:1 |
| `#B6404C` on `#FCEBED` | 4.77:1 |
| `#3F6F8F` on `#EAF2F7` | 4.78:1 |

这些是**设计计算**，不是浏览器/截图实测。透明 Glass、地图、照片和真实字体仍需后续实现任务重新验证。

## Acceptance Matrix

设计书包含 `DT-01`～`DT-22` 共 22 项验收场景，覆盖：

- 品牌色；
- 文字可读性；
- 状态语义；
- 地图路线颜色边界；
- CJK / Latin 字体；
- Serif 使用边界；
- 最小字号；
- Radius；
- Focus；
- Glass；
- Existing token migration；
- Personal Center ownership；
- 1.14 / 1.20 交接；
- 后续工程实装边界。

## Runtime / Test Boundary

本轮没有修改任何 runtime code，因此没有运行并不冒充以下检查：

- app lint
- typecheck
- build
- unit / E2E
- browser visual regression
-真实字体渲染
- Mapbox live

本轮实际完成的是：

- 最新 WBS 状态核对；
- Issue / PR 查重；
- 设计文档与现有 CSS 只读审计；
- 语义 Token 收敛；
- 纯色对比计算；
- 迁移映射；
- 设计验收矩阵。

## Files Changed

本任务应只包含文档与 WBS tracking，不应包含 `src/**`、assets、package、workflow、DB/API/Auth 修改。

## Remaining Review Gate

- [ ] 用户确认本轮 Accent / Surface / Text / Radius 数值。
- [ ] 用户确认后合入 `develop`。
- [ ] 合并后更新 1.13 为 `已完成` 并关闭 Issue #178。
- [ ] 后续如要实装 Token，另建 A 工程 Task；不要把本 Draft PR 转成代码实装 PR。

## Next Unlock

1.13 用户验收完成后，可以直接作为：

- WBS 1.14 主系统响应式布局规则的视觉基础；
- WBS 1.20 Loading / Empty / Error / Skeleton 的颜色、字体和圆角基础。

本 Result 不启动上述后续 WBS。