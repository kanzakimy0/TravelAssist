# WBS-1.13-B — 主系统 Design Token / 色彩 / 字体 / 圆角

- WBS ID：1.13
- Owner：B（用户明确要求在未开始时直接执行；A 保留后续主系统实装责任）
- Responsibility：Main Travel System / Design Specification
- Priority：P1
- 状态：待审查（设计已交付；未实装）
- 开始日期：2026-09-07（Asia/Tokyo）
- Issue：#178
- Draft PR：#179
- Branch：`docs/b-wbs-1-13-main-design-tokens`
- Base：`develop@85675375a52a1bb1adaf37d9b8ea0a48a467eae1`
- 依赖：1.4、1.5 已完成
- Design：`docs/ui/main-system-design-tokens.md`
- Result：`docs/tasks/RESULT-WBS-1.13-b-main-design-tokens.md`

## 目标

冻结 TravelAssist Web 主旅行系统的第一版 canonical Design Token，使首页、Start Flow、Planner、Trip Detail、AI 主系统以后使用同一套语义色彩、字体层级、圆角与基础表面层级，并为后续 1.14 / 1.20 和工程实装提供稳定输入。

本项只做设计规格，不修改运行时代码。

## 原始交付前置（2026-09-07）

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
7. 明确地图路线色、交通方式、预约与风险状态不被品牌色覆盖。
8. 明确 Personal Center `--pc-*` 保持其模块 ownership；本项只提供共享色系对齐建议。
9. 输出验收矩阵和后续实现边界。
10. Task / Design / Result / Issue / Draft PR 已同步；Master WBS 的最终完成态在用户验收合并时收尾，避免未验收设计进入 `develop` 主表完成态。

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

- [x] 主系统颜色使用稳定语义名称，不再以 `blue/pink/gray` 命名业务 Token。
- [x] 白底/暖白底正文与主要控件文字满足设计可读性目标；对比计算有记录。
- [x] 珊瑚朱红只承担品牌/选择/主动作，不承担 success / warning / danger。
- [x] Serif 只用于少量人文/Editorial 标题；数据密集 UI 继续 Sans。
- [x] 中/日/英混排有明确 fallback，不依赖新增字体文件。
- [x] Radius scale 能覆盖按钮、卡片、面板、Popover、Dialog、Pin Quick Card。
- [x] Home / Start / Planner 当前局部值都有明确映射，不要求本 Task 改代码。
- [x] Personal Center 与主系统色系协调，但不越权改 `--pc-*`。
- [x] 1.14 / 1.20 可以直接引用本文，不重复定义颜色、字体和圆角。
- [x] Task / Design / Result / Issue / Draft PR 已同步为待审查。
- [ ] 用户验收并授权合并。
- [ ] 合并后 Master WBS 完成态与 Issue closeout。

## 完成规则

当前为“设计已交付 / 待审查”，不是“已完成”。只有用户验收并合入 `develop` 后才标记“已完成”。本任务不用 Codex；后续真正把 Token 写入 CSS / Tailwind / Components 时另建 A 的工程实现 Task。

## 2026-09-10 当前整合结果

用户授权检查 B 保留 Draft 并合并可交付内容。原审计 head 95ccaec1a0f6919f21986a66689ae8d867bf6fd9，已无冲突整合 develop@f0569cdc57adc44d9c7e2524064be86217b7d628。

主规格 v1.1 以当前 globals.css 为唯一来源，撤回旧红棕色、独立 --ta-*、七级 radius/字体/阴影覆盖方向；逐项记录 Home/Start/Planner/Detail/PC 消费及已经存在的 wizard/pc aliases。不存在的 pressed/status/tertiary/dialog 角色明确为待决定，不发明 runtime token。旧 v1.0 数值和测试在上文及 Git 历史保留，仅代表当时交付。

六组当前 HEX 纯色对比重新计算：正文 11.78:1、次级 5.46:1、白字/珊瑚 3.46:1、白字/hover 4.28:1、focus 5.51:1、danger 6.04:1。普通白色小字在珊瑚/hover 上不足 4.5:1，不能沿用旧稿的通过结论；渐变与照片/地图合成仍需浏览器审查。没有修改已验收 UI 或声称新增视觉证据。

本 PR 发布修订后的设计候选；WBS 1.13 = B / 待审查、Issue #178 Open。合并文档不等于完成设计冻结或未来局部迁移。原 Draft / 未合并状态为历史，当前 merge 状态以 PR #179 为准。

本轮检查：三个交付 Markdown 的 Prettier check、git diff --check origin/develop、非文档差异检查；结果在本次提交前实际执行。应用测试/浏览器未重跑，因本 PR 仅修改文档。

## 文档合并事实 — 2026-09-10

PR #179 已按用户授权合入 develop；head a52fbadc69d1d6a67e4bd6291b23aa362d59ddc7；merge 9c404d6dbc9299351a0363377422574bf00a1786。远端 Install, test and build 通过（run 34478356712）。本次合入 v1.1 设计候选，未进行运行时迁移或新的浏览器视觉验收；WBS 1.13 仍为 B / 待审查，Issue #178 保持 Open。上文 Draft / 尚未合并只描述历史阶段。
