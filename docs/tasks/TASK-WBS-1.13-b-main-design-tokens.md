# WBS-1.13-B — 主系统 Design Token / 色彩 / 字体 / 圆角

- WBS ID：1.13
- Owner：B（用户明确要求在未开始时直接执行；A 保留后续主系统实装责任）
- Responsibility：Main Travel System / Design Specification
- Priority：P1
- 状态：进行中
- 开始日期：2026-09-07（Asia/Tokyo）
- Issue：#178
- Branch：`docs/b-wbs-1-13-main-design-tokens`
- Base：`develop@85675375a52a1bb1adaf37d9b8ea0a48a467eae1`
- 依赖：1.4、1.5 已完成
- Design：`docs/ui/main-system-design-tokens.md`
- Result：`docs/tasks/RESULT-WBS-1.13-b-main-design-tokens.md`

## 目标

冻结 TravelAssist Web 主旅行系统的第一版 canonical Design Token，使首页、Start Flow、Planner、Trip Detail、AI 主系统以后使用同一套语义色彩、字体层级、圆角与基础表面层级，并为后续 1.14 / 1.20 和工程实装提供稳定输入。

本项只做设计规格，不修改运行时代码。

## 已确认前置

最新 `develop` 中：

- 1.4 首页设计冻结 v1：已完成；
- 1.5 Planner 主画面冻结 v1：已完成；
- 1.13：未开始；
- 没有独立的 WBS 1.13 执行 Issue / PR；
- Issue #24 仅覆盖历史 Homepage palette / typography 子集，不等于全主系统 Token 冻结。

## 必读与对照

- `docs/ui/design-system.md`
- `docs/ui/home-page.md`
- `docs/ui/trip-planner.md`
- `docs/ui/planner-right-panel-secondary-tabs.md`
- `docs/ui/trip-detail.md`
- `docs/ui/help-icons.md`
- `src/app/globals.css`（只读，provisional token 现状）
- `src/components/ui/button.module.css`（只读，共享 primitive 依赖）
- `src/features/home/components/home-hero.module.css`（只读）
- `src/features/start-flow/start-flow.module.css`（只读）
- `src/features/planner/planner-v05.module.css`（只读）
- `src/features/personal-center/personal-center.module.css`（只读，只用于视觉对齐，不重构 B 模块）
- 当前项目对话中已确认的暖白、低饱和、珊瑚朱红、淡樱粉、深墨蓝/茶灰、圆润浮层与地图沉浸方向。

## 本次交付

1. 冻结主系统 canonical semantic colors。
2. 冻结品牌色与 success / warning / danger / info 分离规则。
3. 冻结 CJK + Latin 字体栈与排版层级；不新增字体依赖。
4. 冻结 radius scale 与组件映射。
5. 明确 surface / border / shadow / focus / motion 的支持 Token。
6. 给出现有 provisional / local tokens 的迁移映射与冲突裁决。
7. 明确地图路线色、交通色、预约与风险状态不被品牌色覆盖。
8. 明确 Personal Center `--pc-*` 保持其模块 ownership；本项只提供共享色系对齐建议。
9. 输出验收矩阵和后续工程实现边界。
10. 同步 Master WBS、Issue、Result、Draft PR 为待审查。

## 保护边界

禁止修改：

- `src/**`
- `public/**`
- `assets/**`
- package / lockfile
- workflow
- DB / API / Auth
- 页面布局与交互逻辑

禁止：

- 安装字体包；
- 因 Token 冻结重做首页、Start、Planner、Detail 或 Personal Center；
- 把地图路线、交通或状态语义统一染成品牌珊瑚色；
- 提前执行 1.20；
- 把设计计算冒充浏览器或代码测试。

## 验收条件

- [ ] 主系统颜色使用稳定语义名称，不再以 `blue/pink/gray` 命名业务 Token。
- [ ] 白底/暖白底正文与主要控件文字满足可读性目标；对比计算有记录。
- [ ] 珊瑚朱红只承担品牌/选择/主动作，不承担 success / warning / danger。
- [ ] Serif 只用于少量人文/Editorial 标题；数据密集 UI 继续 Sans。
- [ ] 中/日/英混排有明确 fallback，不依赖新增字体文件。
- [ ] Radius scale 能覆盖按钮、卡片、面板、Popover、Dialog、Pin Quick Card。
- [ ] Home / Start / Planner 当前局部值都有明确映射，不要求本 Task 改代码。
- [ ] Personal Center 与主系统色系协调，但不越权改 `--pc-*`。
- [ ] 1.14 / 1.20 可以直接引用本文，不重复定义颜色、字体和圆角。
- [ ] Task / Design / Result / WBS / Issue / Draft PR 同步为待审查。

## 完成规则

设计交付后状态为“待审查”。只有用户验收并合入 `develop` 后才标记“已完成”。本任务不用 Codex；后续真正把 Token 写入 CSS / Tailwind / Components 时另建工程实现 Task。