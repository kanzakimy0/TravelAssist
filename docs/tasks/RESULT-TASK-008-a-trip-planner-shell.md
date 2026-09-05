# TASK-008-A Result

## Status

Completed — TASK-008 Mock UI shell 已实现、验证，并按用户明确授权合入 develop。

## Prerequisite

- base commit: `6e5132b323c5f215a6c1d430eb702c076d8915ac`（初始 `96a8829`；开发期间同步上游 B 文档更新，无业务代码变化）。
- trip-planner spec: `docs/ui/trip-planner.md v0.2`，已完整读取 Task File / Issue #51 / Design System / Page Overview，并参考已实现个人中心色调。
- TASK-006 merged: Yes；PR #32，merge `5bf85a8`，已验证祖先关系。
- TASK-007 required: No；未使用本地未合并的 TASK-007 代码。

## Tracking

- Issue: [#51](https://github.com/kanzakimy0/TravelAssist/issues/51)
- Task File: `docs/tasks/TASK-008-a-trip-planner-shell.md`
- Branch: `feature/a-trip-planner-shell-v2`
- Commit: `e4648c031817816fb1cbd0dc44552a542d108c91`（实现）；`f9028d84e48266e5c626414d541331b7bfd5e009`（验收记录）；最终追踪提交以 PR head 为准。
- PR: [#59](https://github.com/kanzakimy0/TravelAssist/pull/59)，Merged → develop；merge `1a4201b3181460977c4f16b0c34f60c353751687`。
- WBS updated: Yes；TASK-008 行与关联设计 / 实现项已记录真实范围。

## Route

- planner route: `/planner`；本地预览 `http://127.0.0.1:3000/planner`。仓库此前没有 Planner route。

## Implemented

- Planner layout: 64px 紧凑 Header；75% 地图工作区 + 25% 连续右栏；底栏仅覆盖地图。暖白、淡粉、珊瑚红与蓝灰文字；局部语义 Token，不修改全局样式。
- Mock map: 本地 SVG 地形、城市道路、河口湖、富士山、东京、箱根与富士急等行程节点；路线折线、Day / 日期与交通示例标签。不同天同坐标节点错位显示，均可操作；清楚标注非真实比例与数据。
- left toolbar: 图标 + 文字、收起入口、地形 / 景点 / 交通 / 住宿 / 餐饮 / 预约图层开关；不会改变 Grid。
- day range selector: 地图右侧原位 1日 → 第N天、3日 → Day N–N+2 下拉；全日无下拉。范围改变同步地图边界和底部日期范围，底栏再选择范围内当天。
- 3-day window algorithm: 通用有效连续窗口；5 日 fixture 验证 Day1–3、2–4、3–5，短行程禁用无效 3 日范围。
- right upper settings: 同行人 / 日期双卡，景点 / 餐饮 / 住宿三卡；可打开局部编辑。原生日期键盘输入已验证可同步地图 / 底栏；示例天数保持 3 天。
- more settings popover: 12 项高级设置，预算与节奏顶部并排，小字细则；脱离布局且自动选择上 / 下方可用空间，不挡原 Trigger；再点、外部点击、Escape 关闭。
- replan mock state: “正在刷新示例路线…” → “示例路线预览已刷新”；读取当前设置摘要但明确未真实计算，不伪装 AI。不破坏当前方案、范围和设置。
- 3 recommendation rows: 同尺寸横条，数据驱动缩略路线、编号、差异、箭头；选中项完整外框 + “当前方案”标签。
- bottom 6 tabs: 行程 / 移动 / 预约·票务 / 天气·备选 / 住宿·餐饮 / 详细；所有方案所有日期均非空；示例票务 / 天气清楚标注。
- map/timeline sync: 同一 selectedStopId 双向联动；跨日地图点选切换当天，手机地图点选同时打开执行 Sheet。图层关闭时仍显示从时间轴选中的节点。
- responsive collapse: <1200px 右栏 Drawer；<700px 高或 <768px 宽底栏 Sheet。手机不永久占地图空间；跨断点关闭临时浮层但保留方案与编辑值。

## Ratio Validation

- 1600×900 right panel: 400×836px，25%；地图 / 底栏宽 1200px。
- 1440×900 right panel: 360×836px，25%；地图 / 底栏宽 1080px。
- upper/lower ratio: 两种视口均 418px : 418px；共同边界 y=482，无间隙。
- bottom panel height: 225px，900px 页高的 25%；1280×800 为 200px，1024×768 为 192px。

## Responsive Validation

| Viewport | Result                                                                                       |
| -------- | -------------------------------------------------------------------------------------------- |
| 1600×900 | Passed：完整布局，右栏 400px，上下 / 页面均无溢出                                            |
| 1440×900 | Passed：完整布局，右栏 360px，上下 / 页面均无溢出                                            |
| 1280×800 | Passed：右栏 320px，设置 / 方案各 368px；修复初次检查的设置区拥挤                            |
| 1180×800 | Passed：右栏自动折叠；420px Drawer 打开 / Escape / 焦点恢复正常；地图工作区仍为 1180px       |
| 1024×768 | Passed：右栏折叠，420px Drawer 无横向溢出，底栏 192px                                        |
| 390×844  | Passed：双面板默认折叠，Drawer 390×844px、Sheet 390×520px；地图点选打开对应当天，六 Tab 可用 |
| 1440×650 | Passed：底栏折叠；右栏 360px、上下各 293px，无设置区溢出；Sheet 1440×422.5px                 |

所有上述尺寸 document 的 scrollWidth / scrollHeight 均未超过 viewport。阈值采用 Task 建议值，补充 <768px 手机底栏折叠，避免窄屏时间轴拥挤。Drawer / Sheet 内允许内容滚动，底栏桌面横向时间轴与手机纵向时间轴分别适配。

## Accessibility

- keyboard: 原生 button / input；Tab 可达主要操作，Day selector 可用 Enter / Space 与 Tab 选天；Drawer 使用原生 modal dialog 的焦点约束。
- focus-visible: 暖珊瑚描边；浏览器实际键盘触发已检查，不只靠颜色识别选中项。
- Escape: 关闭 More Settings、日期 / 快速编辑、Drawer / Sheet；嵌套 More Settings 首次 Escape 不误关外层 Drawer。
- focus restore: More Settings 关闭回到原 Trigger；Drawer / Sheet 关闭回到入口，已实测。
- tabs / selectors: tablist / tab / tabpanel / aria-selected / aria-controls；左右箭头循环、Home / End、单一 tab stop；范围 / 方案 / 图层使用 aria-pressed，浮层 Trigger 使用 aria-expanded。

## Validation

- npm ci: Passed，360 packages；未修改 lockfile 或安装策略。
- lint: Passed。
- typecheck: Passed。
- format:check: 本 Task 受检文件全部 Passed；WBS 按仓库既有 `.prettierignore` 保留表格风格，diff check 通过。全仓最新基线仅 `docs/ui/companion-management.md` 失败；已单独对 origin/develop 内容运行 Prettier 证明原有问题，未修改 B 文档。本 Task 的原 Task File 格式交接已处理。
- build: Passed，`/planner` 静态预渲染；使用生产服务实际验收。
- diff check: Passed。
- console: 生产 Planner 实际交互检查 error / warn 日志为空。
- hydration: 未观察到 hydration error。
- tests: `node --experimental-strip-types --test tests/task-008-planner.test.mjs`，9/9 Passed；覆盖 5 日窗口、短行程、范围、计划 / 地点选择、地图边界、三方案差异、所有非空 Tab、日期跨月 / 闰年。

## Scope Preserved

- real map provider not added: Yes，只有可替换的 PlannerMapShell renderer。
- real route API not added: Yes，polyline 仅 Mock 示意。
- AI/Auth/DB not added: Yes。
- /start untouched: Yes；入口完成跳转未修改。
- B account files untouched: Yes；只读参考 / 链接至既有个人中心。
- 配置 / dependencies / 全局 CSS / workflows 未修改；复用现有 Button、CSS Modules、路由与 feature 约定。

## WBS

- tracking row: TASK-008 / Owner A / Issue #51 / 对应 Task / branch / implementation commit；已合并，已完成。
- design items: 1.5 / 1.6 / 1.7 / 1.11 按已合入的 v0.2 页面结构记录设计完成；1.14 / 1.17 / 1.18 保持进行中，并说明仅完成 Planner 布局 / UI 验证。
- implementation items: 4.1 / 4.8 / 4.13 UI shell 已完成；4.2 / 4.6 / 4.14 仍为进行中，真实 Provider / 重规划未完成。

## Problems / Blockers

- 无 TASK-008 功能阻塞；初次交付存在上述单个 B 基线文档格式问题，合并时最新基线情况见下方记录。
- npm 的 ESLint 版本退役提示、unrs-resolver allowScripts 提示与 Node 测试的 MODULE_TYPELESS_PACKAGE_JSON 提示均已记录；未改变安装审批或全局配置。
- 发布保护：当前仓库 `feature/**` push 自动创建并立即合并 PR，另有非 Draft PR 自动合并流程。本 Task 明确要求不自行合并，因此提交包含 `[skip ci]`，只跳过 push 自动合并流程；本地质量检查均照常执行，PR 保持 Draft。参见 [GitHub 跳过工作流文档](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs)。未禁用 / 修改任何仓库工作流。Review 完成后的合并由维护者决定，不自动改为非 Draft。
- 实测环境：当前桌面 Chromium 浏览器及 viewport 调整；未声称 Safari / Firefox / 真实触屏设备验收。
- 完成后停止，不继续 Provider / Route / AI / Trip Store / TASK-009。

## Ready For Review

Yes — 实现与验收完成，并已按用户明确授权合并。原 Draft / 不合并说明保留为交付历史。

## 合并集成复验（2026-09-05）

- 用户明确要求合并 PR #59；先检查工作区、远端 PR 与 develop。无文本冲突，没有 review change request；随后同步最新 develop（含已合并 TASK-007），head `89206953e5178e53dad032d8e9c1cda4bfac9949`。
- lint / typecheck / build / 本任务文件 Prettier / diff check 全部通过；TASK-007 的 21 项测试与 Planner 的 9 项测试合计 30/30 通过。
- 浏览器复验 Planner 的地图点选与时间线同步、三方案切换、六个底栏 Tab、更多设置 / Escape、个人中心入口；新版 /start 标题、指定背景与原草稿仍正常，无横向溢出或 console / hydration error。
- 全仓 format:check 当前仅有 3 份上游基线文档失败：`docs/tasks/TASK-008.1-a-planner-mapbox-interactions.md`、`docs/ui/companion-management.md`、`docs/ui/planner-map-interaction-booking-mapbox.md`；未修改无关文档。
- 解除 Draft 后使用 expected head SHA 执行合并，GitHub 确认 PR #59 Merged；merge `1a4201b3181460977c4f16b0c34f60c353751687`。
- 本地 develop 已同步，源码 / public / tests / dependencies 与上述集成验收版本无差异。Task / Result / WBS 的完成记录经独立文档 PR 更新，不直接提交 develop。
- 本次只完成 TASK-008 合并与追踪。TASK-008.1 的 PR #59 前置条件已满足，但未开始 TASK-008.1 实现，未触碰其历史 Blocked Result。
