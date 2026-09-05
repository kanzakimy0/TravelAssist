# TASK-007 — B：统一修正 Step 1–5 版式、文案与关键控件样式

## Metadata

- Repository: `kanzakimy0/TravelAssist`
- Owner: B 工作站（客户界面）
- Status: 待审查（v1.0～v1.3 与指定背景已完成；未合并）
- GitHub Issue: [#35](https://github.com/kanzakimy0/TravelAssist/issues/35)
- Pull Request: [#61](https://github.com/kanzakimy0/TravelAssist/pull/61)（Open / Draft，未合并）
- Background Commit: `25a08054ae85d05082961d80033618dc0aab45db`
- Base Branch: `develop`
- Base Commit: `6b0677e21c0f0089f1612a5f39f43ac8e2dde82f`
- Latest Synced Base: `f9297e5`（合并提交 `c86f592`，保留本地 TASK-007 与最新个人中心成果；未合入 TASK-008 功能分支）
- Feature Branch: `feature/b-wizard-layout-polish`
- WBS: 3.6 / 3.8（Step 1–5 版式修正）
- Depends On: TASK-005 / TASK-006
- 正式规格来源：用户提供的《TravelAssist｜Step 1–5 统一版式与交互修正规范 v1.0》及随附 TASK-007 执行要求。本文归档该定稿，不从旧任务推测新设计。
- 最新覆盖来源：用户提供的《Step 1–5 补充修正规范 v1.2》与《全局说明图标交互规范 v1.3》，并入本 Task、Issue #35 与现有 feature 分支；对应条目覆盖 v1.0 / v1.1。

## 前置依赖

- TASK-005 已合入 `develop`：PR #29，合并提交 `c626b1c`。
- TASK-006 已合入 `develop`：PR #32，合并提交 `5bf85a8`。
- 两个合并提交均是上述最新基线的祖先；开始时 working tree clean。
- 任一依赖未合入时必须返回 `Blocked`，不得在旧结构上绕过实现。

## 设计冻结 v1.0

适用范围：新旅行向导 Step 1～Step 5，以及后续同系列页面。

主题：**日式旅景 × 暖色半透明玻璃界面**。本规范覆盖并修正此前同范围页面规范。

### 统一背景

Step 1～5 以及后续同系列页面统一使用 **《樱花海岸与富士山列车夕照》**。

- 作为所有页面统一背景基底。
- 保持可识别的樱花、海岸、富士山、列车、夕照氛围。
- 页面切换时可使用同一背景或同系列轻微视差版本。
- 不为各 Step 随意更换完全不同的背景。
- UI 容器保持可读。
- 不用现有仅含海岸与列车的旧图冒充指定原图。

### 统一页面框体

- Step 1～5 视觉框体大小一致。
- 切换时只更换内容，不更换整体舞台尺寸。
- 不允许 Step 4/5 比前面明显更小或更窄。

### 礼貌文案

所有页面中的“你”统一改为“您”，包括说明、提示及方案文案。

### 标题、内容与留白

- 标题左侧空间至少扩大为原来的两倍，不贴近主面板左边缘。
- 选项卡、说明区、表单区、按钮组等使用同一左对齐基线。
- 下方内容左边不能比标题更靠左。
- 主内容左右留白对称；标题、内容、底部操作区遵守同一内边距系统。
- 后续相关页面继续遵守上述规则。

## Step 1

标题：**您对日本有多熟悉？**

四张熟悉度卡保持 2×2；最上方主文字字号约为原来的两倍：

- 第一次去日本
- 去过几次
- 日本旅行经验较多
- 很熟悉日本

## Step 2

标题：**您对什么感兴趣？**、**您喜欢怎么玩？**。

保留 16 个一级兴趣及现有六条五档滑轨（3+3 分组）。每个兴趣最前面增加单色小图标，统一线宽、尺寸和颜色，与文字同排。

| 兴趣     | 推荐图形                 |
| -------- | ------------------------ |
| 自然风景 | 小山                     |
| 历史文化 | 鸟居 / 古建筑线稿        |
| 美食     | 餐具 / 筷子              |
| 摄影     | 相机                     |
| 温泉疗愈 | 蒸汽温泉                 |
| 艺术展馆 | 画框 / 美术馆            |
| 动漫娱乐 | 星 / 游戏手柄 / 票券     |
| 购物     | 购物袋                   |
| 城市探索 | 城市天际线               |
| 户外活动 | 徒步鞋 / 山径            |
| 夜间体验 | 月亮 / 夜景              |
| 亲子体验 | 小人组合                 |
| 传统体验 | 折扇 / 茶碗              |
| 主题乐园 | 城堡 / 门票              |
| 乡村小镇 | 小屋                     |
| 季节限定 | 樱花 / 枫叶 / 雪花中择一 |

## Step 3

标题：**这次旅行怎么安排？**

### 交通方式与预算

- 交通方式为一排四个正方形选项卡：系统推荐 / 公共交通 / 自驾 / 混合方式。
- 预算同样为一排四个正方形选项卡：经济 / 标准 / 舒适 / 高端。
- 二者视觉规格一致，使用统一卡片组件，可带单色图标。

### 目的地

维持固定 2×4，最后一格必须是“更多地区”；每格添加单色象征图标：

| 第一行                   | 第二行                |
| ------------------------ | --------------------- |
| 东京：塔 / 城市地标      | 中部：山 / 湖         |
| 大阪 / 关西：城堡 / 都市 | 九州：温泉 / 火山     |
| 北海道：雪花 / 山景      | 冲绳：海浪 / 棕榈     |
| 京都：寺院 / 鸟居        | 更多地区：地图 / 加号 |

目的地与交通、同行人员与预算的既有并排关系保留；不加入已属于 Step 2 的重复偏好字段。

### 日期控件

- 保持当前行内横向展开交互，桌面日期输入不得另起一行。
- 初始为 `[具体日期] [计划日期] [还没决定]`。
- 展开为 `[具体日期 | 出发日期 → 返回日期]`，计划日期同理。
- 日期框、计划日期选择框、下拉菜单与日历 Popover 统一为暖白半透明容器。
- 圆角、边框、阴影、文本风格一致。
- 禁止突兀的浏览器默认下拉或第三方默认样式。

### 已确定安排

- 左侧：**已有确定安排？**
- 右侧并排：**添加机票 / 添加酒店 / 添加已订活动**。
- 按钮组整体靠右，三个按钮并排，左右形成一行布局。

## Step 4

- 标题：**正在为您规划旅行…**
- 副标题：**根据您的偏好，生成最合适的行程方案**
- 保持现有六阶段动态生成逻辑，顶部仍为 4/4、“生成方案”高亮。
- 不加入伪造精确百分比、景点/路线底部统计条或臃肿 Dashboard。
- 使用统一面板尺寸、标题左边距和内容列。

## Step 5

- 标题：**为您准备了 3 个旅行方案**。
- 方案说明中的第二人称全部改为“您”。
- 顶部继续为 4/4，不出现 5/5。
- 三方案卡与标题同列对齐、左右留白对称。
- 保留已确认的三种方案及数据驱动 RouteMiniMap。

## 通用组件建议

`WizardLayout`、`SectionHeader`、`IconTextCard`、`SquareOptionCard`、`ThemedPopover`、`AnchorActionRow`。

优先复用现有组件和工程约定；不重建项目，不修改无关配置；不擅自改变已确认设计。前进、返回、刷新和重新生成不得破坏既有草稿。

## 补充修正规范 v1.1（TASK-007.1，覆盖同名条目）

状态：补充修正。适用范围：新旅行向导 Step 1～5 及后续同系列页面。

### 全局布局

- 中间操作区域（标题以下、底部按钮以上）增加上下空间：标题与第一组内容之间、最后一组内容与底部按钮之间均增加明显间距，整体舒展而不拥挤。
- 桌面端原则上不允许页面内部上下滚动；提前控制主面板高度和内容密度，通过留白、组件尺寸及压缩非关键信息解决，不能把问题留给滚动。
- 底部按钮区与主面板融合，不出现额外白条或残留底栏；分隔仅允许非常轻的线条或透明层。

### Step 2

- “您喜欢怎么玩？”字体更大、字重更粗，作为中下半区明确的小节标题。
- “旅行节奏”“旅行方式”置于各自卡片内部顶部。
- 六条滑轨统一为“左标签 + 中间滑轨 + 右标签”，例如悠闲 / 紧凑、打卡优先 / 深度体验、经典必去 / 当地小众。
- 滑轨缩短、长度适中，不铺满整张卡；保留五档离散节点，保持整洁紧凑。

### Step 3

- 目的地、交通方式、预算范围、已确定安排操作卡 / 按钮内文字居中。
- 同行人员不套用居中规则，保留“名称 + 数量 + 加减按钮”的功能布局。

以上八项补充结论直接并入 TASK-007，不新建不相关的分支或重写已确认业务逻辑。v1.0 的统一背景、框体、四步进度、数据持久化等未被覆盖的要求继续生效。

## 补充修正规范 v1.2（最新布局基准）

- Step 2“您的兴趣”与“您喜欢怎么玩”使用完全相同的字号、字重、行高、左侧起始位置和标题间距；保持与页面主标题的层级关系。按当前“您的兴趣”的字号统一，并采用 Semibold / Bold。
- 六条滑轨在 v1.1 基础上加长约 50%，仍是左标签 / 中间五档滑轨 / 右标签。六条同长、节点等距、两组卡片等宽，分组标题留在各自框内。滑轨不铺满卡片，窄屏优先避免标签挤压与溢出。
- Step 3 改为可辨认的地区地标单色模型，不用普通城市 / 山形代替。图标和文字整体居中，线宽与体量统一。

| 地区        | 本次采用的单色象征物                                           |
| ----------- | -------------------------------------------------------------- |
| 东京        | 东京塔轮廓                                                     |
| 大阪 / 关西 | 道顿堀：戎桥、河道、两侧招牌轮廓（优先方案；未改用备选海游馆） |
| 北海道      | 札幌钟楼                                                       |
| 京都        | 伏见稻荷鸟居                                                   |
| 中部        | 白川乡合掌造                                                   |
| 九州        | 樱岛火山                                                       |
| 冲绳        | 首里城                                                         |
| 更多地区    | 日本地图 + 加号                                                |

- “已有确定安排？”与“同行人员”字号、字重相同，作为正式分区标题；保持左标题、右侧三个操作卡一行排列，不增加白条。
- Step 4 主标题、副标题、日式插画及六阶段组成水平居中的视觉组合；列表整体居中，行内文字可左对齐。进度块不做过宽外框，保持上下留白与无桌面竖向滚动。
- 继续保留五步固定面板、统一背景、对称留白与现有草稿 / 生成逻辑；Step 4 的居中是对旧左对齐规则的明确例外。

## 全局说明图标规范 v1.3

完整定稿与复用方式归档于 [全局说明图标交互规范](../ui/help-icons.md)。覆盖所有旧问号规则，适用于 Step 1～5、弹窗、Popover、下拉及后续同系列页面。

- 小型单色 `?` 为相邻文字字号的约 80%，暖灰色，不抢标题层级。
- 默认仅图标，不自动弹出、不常驻、不改变页面高度。
- 桌面 hover / focus 延迟约 150–250ms 打开，移开约 100–150ms 关闭；实现固定 200ms / 125ms。
- Tab 可聚焦、Focus 显示说明、Escape 关闭；触屏点按打开，再次点按或点击空白关闭。
- 暖白半透明、轻 blur、小圆角、极浅阴影、深墨蓝正文；宽度约 240–320px，内容优先 1～3 行。
- 基本帮助用 Tooltip，不用大型 Modal；真正的选择 / 填写功能保留原弹窗。

## 验收清单

- [x] TASK-005、TASK-006 已合入后开始，初始工作树干净。
- [x] Step 1～5 使用指定统一背景《樱花海岸与富士山列车夕照》。
- [x] 五步主面板尺寸相同。
- [x] 所有“你”改为“您”。
- [x] 标题左留白至少两倍，标题/内容/操作同基线且左右对称。
- [x] Step 1 保持 2×2，主文字明显更大。
- [x] Step 2 16 个兴趣均有统一单色图标。
- [x] Step 3 交通和预算分别为一排四张正方形卡。
- [x] 目的地 2×4 且均带单色图标。
- [x] 日期保持横向展开，Popover / 下拉为页面统一风格。
- [x] 已确定安排左文案右按钮组，三按钮并排。
- [x] Step 4/5 完成“您”化、统一尺寸与对齐，现有逻辑不变。
- [x] v1.1：中间区域上下留白、桌面密度控制、透明底部按钮区。
- [x] v1.1：Step 2 强化小节标题、分组标题入卡、六条短滑轨左右标签同排。
- [x] v1.1：Step 3 选项居中，同行人员功能排列不变。
- [x] v1.2：Step 2 两个同级标题完全一致、滑轨目标长度增加 50%。
- [x] v1.2：八个地区象征图标、Anchor 标题层级、居中生成组合。
- [x] v1.3：全局小问号、默认关闭、悬停 / Focus / Escape / 触屏交互与主题浮层。
- [x] lint / typecheck / build / 21 项 tests / 本任务文件格式通过；全仓格式基线例外见最新验收。
- [x] 草稿恢复与相关二级弹窗回归验证完成。
- [x] 无无关配置更改，Task / WBS / Issue / PR 同步。

## Git 工作流

1. `git fetch origin`。
2. `git checkout develop`，`git pull --ff-only origin develop`。
3. 确认 TASK-005/006 已合入且 working tree clean。
4. 从最新 `origin/develop` 创建 `feature/b-wizard-layout-polish`。
5. 实现并修复本任务引入的问题。
6. 运行现有 lint / typecheck / build / tests（如有），补充必要验证。
7. Commit、push 指定分支，创建 PR 到 `develop`，关联本 Issue。
8. 不直接提交 `develop`，不继续下一任务。

## v1.0 执行历史（尺寸与滚动规则已由下方 v1.1 记录覆盖）

### 已完成的实现

- 本地实现提交：`0508a507ae181655454ae500c02f565bee1f65bb`。
- `WizardLayout` 统一五步面板高度、内容滚动区及底部操作；`SectionHeader` 统一标题基线。
- 水平内边距按原规则加倍：桌面最大 2.5rem → 5rem，平板 1.2rem → 2.4rem，手机 0.8rem → 1.6rem；滚动条双侧预留相同宽度。
- 全部 `src` 中的“你”文案改为“您”；旧步骤组件及首页 AI 说明仅同步此称呼，未改其行为。
- Step 1 保持 2×2，主文字 1rem → 2rem。
- 16 个兴趣图标与 8 个目的地图标使用同一 SVG 线宽、尺寸、颜色。
- 交通与预算复用 `SquareOptionCard`，各自固定四列正方形。
- 新增暖白玻璃 `ThemedPopover`、自绘日历和计划日期菜单；保留行内横向展开。
- 日历支持月切换、方向键、Home / End、PageUp / PageDown、清除、今天、返回日期下限；Escape / 选择后恢复焦点。
- 已确定安排为左文案、右侧三按钮并排。
- 弹窗通过 portal 避免被新的固定滚动框裁切，补充焦点约束与恢复。
- Draft State、生成阶段、方案与 RouteMiniMap 数据未重写。

### 验证结果（2026-09-05）

| 检查                                                                      | 结果                                                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `npm run lint`                                                            | 通过                                                                                  |
| `npm run typecheck`                                                       | 通过                                                                                  |
| `npm run build`                                                           | 通过，首页和 `/start` 静态构建成功                                                    |
| `node --experimental-strip-types --test tests/task-007-calendar.test.mjs` | 7/7 通过；Node 提示模块类型自动检测警告，未为此改无关配置                             |
| 本次修改文件 Prettier 检查                                                | 通过                                                                                  |
| `npm run format:check`                                                    | 未通过：基线已有的 3 份非本任务文档格式问题，见下文                                   |
| `git diff --check`                                                        | 通过                                                                                  |
| `src` 第二人称检索                                                        | 无“你”残留                                                                            |
| 桌面五步 1440×900                                                         | 每步面板均为 1216×752，位置相同                                                       |
| 桌面五步标题基线                                                          | 每步 x≈202.67，标题/卡片/操作区对齐                                                   |
| Step 1 主文字                                                             | 实测 32px（原 16px）                                                                  |
| Step 2                                                                    | 16 个图标；六滑轨保持 3+3                                                             |
| Step 3 交通/预算                                                          | 每张约 95.07×95.07，每组四张同一行                                                    |
| 日期                                                                      | 精确/计划日期均在桌面按钮右侧横向展开；日历方向键、选择、返回下限及菜单 Escape 通过   |
| Step 4/5                                                                  | 同尺寸；六动态阶段、三方案地图缩略图、4/4 进度保留                                    |
| 草稿                                                                      | 日期、兴趣前进/返回/重新生成后保留；方案选择刷新恢复通过                              |
| 二级弹窗                                                                  | 交通详情焦点不跳回；Escape 恢复触发按钮；地区搜索多选确认；机票/酒店/活动打开关闭通过 |
| 浏览器错误日志                                                            | 验收过程未见 console error / hydration error                                          |

全仓格式问题位于 `docs/ui/authentication.md`、`docs/ui/personal-center-shell.md`、`docs/ui/personal-center.md`。对 `origin/develop` 原文的 Prettier 检查同样返回失败，本任务未改这些文件。

## v1.1 实现与验收历史（2026-09-05，对应条目由 v1.2 / v1.3 覆盖）

- 实现提交：`d8e7ae11d325873b05bc1e8d5c9c8e3563d89292`，仅本地。
- 新增 `WizardStepBody`，五步复用同一“标题 / 操作内容 / 底部按钮”空间分配；沿用 v1.0 水平基线与对称内边距。
- 桌面从 768px 起采用视口内统一舞台，最大面板高度 864px；按宽高压缩卡片和次要说明。高度不超过 800px 时收起重复的 STEP 标识和说明段落，主标题、所有控件、六阶段、三方案地图保留。
- 桌面内容 `overflow: visible`，不是通过隐藏或裁切控件制造“无滚动”；实际逐步检查面板边界、内容 scrollHeight / clientHeight 与按钮位置。
- 移动端保留一个必要的面板滚动区；修复地图辅助说明导致的外层额外滚动及五步宽度变化。
- 移除底部 sticky 白色填充与模糊层，仅保留透明操作区和轻分隔。
- Step 2 小节标题 1.35rem / 850（短屏 1.25rem）；分组标题在卡片内部。滑轨最大 9rem（144px），五个节点与键盘操作不变；提示复用兴趣说明行，不再占额外空白行。
- Step 3 目的地、交通、预算与 Anchor 按钮居中；同行人员计数布局不变。修复窄桌面日期行撑宽面板、日期天数徽标与按钮重叠的问题。
- 未改 Draft State、生成状态转换、RouteMiniMap 数据或无关工程配置。

### 多尺寸实测

以下外框尺寸为 CSS 像素，取两位小数；每个视口逐一切换 Step 1～5，面板位置与尺寸保持一致。

| 视口     | 五步统一面板  | 结果                                                              |
| -------- | ------------- | ----------------------------------------------------------------- |
| 1440×900 | 1216×797.93   | 五步完整显示，桌面页面 / 面板均无竖向滚动                         |
| 1280×720 | 1216×630.72   | 五步完整显示，透明底部操作区；Step 3 内容上下间距约 29px          |
| 1024×768 | 992×678.72    | 五步完整显示，四步进度 / 三方案均保留                             |
| 853×1272 | 821.33×864    | 窄桌面侧栏预览通过；日期横向展开，滑轨标签同排                    |
| 768×720  | 736×630.72    | 断点边界无撑宽、无竖向滚动；保存提示出现后 Step 3 上间距仍约 22px |
| 390×844  | 377.20×737.93 | 手机五步同框；无横向溢出、无额外外层滚动，面板内可滚动到全部操作  |

- 桌面六条滑轨实测 144px（窄断点可自适应缩短）；手机约 118.56px。两侧标签纵向中心与滑轨一致，分组标题在容器边界内，`min=1 / max=5 / step=1` 不变。
- 滑轨通过方向键从第 3 档改为第 4 档，刷新后恢复第 4 档；验收后恢复原第 3 档。
- 前进 / 返回 / 生成 / 重新生成保留已有日期、兴趣与偏好。日期日历和计划日期菜单打开 / Escape / 焦点恢复通过。
- 短桌面保存提示、手机底部操作与方案卡滚动可达性通过；手机交通与预算仍为四张约 71.37px 的正方形。
- 浏览器 console / hydration 错误日志为空。
- `npm run lint`、`npm run typecheck`、`npm run build`、7 项日历 tests、修改文件 Prettier、`git diff --check` 均通过。
- 全仓 `npm run format:check` 仍仅报前述 3 份非本任务文档的已有格式问题；未擅自修改。
- 此轮桌面实测覆盖高度 720px 及以上；更低高度 / 非默认缩放未声明通过。

## v1.2 / v1.3 实现与验收（2026-09-05，当前）

- 实现提交：`a438b86c627b8e8d548a44c8d6d6148eb58dde57`，仅本地。
- 同步前工作树干净。读取并合入最新 `origin/develop`（`3449e89`），保留 TASK-005/006 依赖。唯一合并冲突为 WBS 两个新增任务行，已同时保留 TASK-007 与 WBS-5.1-B，未覆盖个人中心成果。
- Step 2 两个小节标题共用 14.4px / 700 / 18.72px，左侧基线相同，使用相同标题容器与间距。
- 六条滑轨目标 144px → 216px（+50%）；1496px、1280px 和 853px 桌面宽度均实测 216px。390px 手机视口按可用空间缩为约 168.17px（原约 118.56px），六条仍同长，标签没有横向溢出。
- 地区图标为八种独立 SVG 模型；桌面常规尺寸 20px，统一 24×24 viewBox、1.5 线宽和单色。大阪采用道顿堀桥 / 河道 / 招牌，不再复用城堡图标。
- “已有确定安排？”与“同行人员”均为 12.8px / 820 / 19.2px，保留左标题右三按钮。
- Step 4 标题、副标题、装饰性山景列车 SVG、六阶段及说明组成居中组合；阶段列表按实际内容宽度居中，不改状态推进逻辑。装饰 SVG 不是指定全局背景的替代品。
- 新增全局 `InfoPopover` 与独立交互控制器；旧向导路径兼容转出。说明使用 portal，保持页面高度与布局不变；不替代选项 / 表单 Modal。

### 验证结果

| 检查                                     | 结果                                                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                           | 通过                                                                                                              |
| `npm run typecheck`                      | 通过；同步新增个人中心路由后重新构建，刷新生成的类型，不改配置                                                    |
| `npm run build`                          | 通过，首页、`/start` 和已合入个人中心路由均构建成功                                                               |
| 日历 + InfoPopover tests                 | 19/19 通过（7 项日历 + 12 项说明交互 / 定位）；沿用 Node 测试能力，无新增依赖                                     |
| 本任务文件 Prettier / `git diff --check` | 通过                                                                                                              |
| 全仓 `format:check`                      | 基线已有 4 份文档未通过，见下文                                                                                   |
| 桌面五步                                 | 1440×900、1280×720、1024×768、853×1272、768×720 全部逐步检查：同框、控件在框内、无横向溢出、无页面 / 内容竖向滚动 |
| Step 4 水平居中                          | 1440px 视口中标题容器、插画与阶段列表中心均为 x≈720；阶段列表内容宽约 205.96px                                    |
| 手机五步                                 | 390×844：面板均约 377.20×737.93；必要内容可滚动到全部操作，无额外外层滚动或横向溢出；生成页无需滚动               |
| 问号比例 / 默认状态                      | 已检查位置字号比例均为 0.8；初始无 Tooltip，浮层宽度 288px                                                        |
| 鼠标与键盘                               | 鼠标进入无需点击即可展开、移开关闭；Tab 聚焦后展开、Esc 关闭且焦点保持                                            |
| 嵌套弹窗                                 | 第一次 Esc 仅关闭说明，第二次关闭兴趣弹窗，触发按钮焦点恢复正常                                                   |
| 触屏交互                                 | 控制器自动测试覆盖不触发 hover、首次点按打开、再次点按关闭及外部关闭；未将桌面鼠标点击冒充实机触屏测试            |
| 延迟与清理                               | 自动测试覆盖 200ms 打开、125ms 隐藏、快速移开取消、浮层可停留、Escape 取消及卸载定时器清理                        |
| 草稿                                     | 滑轨第 3 档改为第 4 档，刷新后恢复第 4 档；验收后恢复原值。前进 / 返回 / 生成保留既有日期与偏好                   |
| 浏览器日志                               | 无 console / hydration error                                                                                      |

本轮格式基线问题为 `docs/ui/authentication.md`、`docs/ui/personal-center-shell.md`、`docs/ui/personal-center.md`、`docs/ui/profile-account.md`。前三份是此前已记录问题；第四份随最新 develop 合入，并已从其远程原文复现格式失败，未改这些无关文件。

桌面实测覆盖高度 720px 及以上；更低高度 / 非默认缩放 / 触屏实机不声明已完成渲染实测。指定背景的最终裁切验收仍待原图。

## 原阻塞记录（已由下方原图接入验收解除）

1. **指定背景原图未取得**：用户提供的 ChatGPT 签名链接返回 403；浏览器也未能加载。已请求可读本地图片路径。旧海岸列车图只保留为现状，未称其为指定背景，未通过该验收项。
2. **窄屏阻塞已解除**：已在实际 390×844 视口完成五步及控件验收。拿到指定原图后仍需复查其裁切及可识别性。
3. **尚未 push / 创建 PR**：仓库 `feature/**` 推送会自动创建并尝试合并 PR，指定背景验收未完成时不触发该工作流。不改自动化配置、不直接写入 develop。

以上为原图到达前的历史状态，以下列最新验收为准。

## 指定原图接入与最终验收（2026-09-05，最新）

- 用户直接提供 PNG 原图，已确认包含樱花、海岸、富士山、列车与夕照；旧签名链接失效不再构成阻塞。
- 原图逐字节复制到 `public/media/start/sakura-coast-fuji-train-sunset.png`，1672×941、2,707,795 bytes；来源与 SHA-256 记录于同目录 README。没有重绘、改色、重新生成或破坏性裁切。
- 唯一渲染代码变化是共用 `.backdrop` 的背景 URL。五步均读取同一图片；保持现有 overlay、玻璃面板、背景定位、reduced-motion 和全部布局 / 业务行为。首页 poster 与个人中心资源不变。
- 原图的完整构图保存在仓库中。横图按现有 `cover` 规则适配视口，竖屏只显示较窄局部；玻璃面板覆盖部分景物。不声称每个视口都能同时完整展示所有景物，也没有拉伸图片或为不同 Step 换图。
- 从干净工作区恢复原 TASK-007 分支，安全同步最新 `origin/develop`（`f9297e5`）；TASK-005 / TASK-006 祖先关系仍满足。未把 TASK-007 混入 TASK-008 PR。
- `npm run lint`、`npm run typecheck`、`npm run build`、21/21 tests、本任务文件 Prettier、`git diff --check` 通过。首次类型检查引用上一个分支的 Planner 生成类型；重启开发服务并重新构建后已刷新，不修改配置或业务代码绕过。
- 全仓 `format:check` 仅失败于最新 develop 中已有的 4 份文档：`docs/tasks/TASK-008-a-trip-planner-shell.md`、`docs/tasks/TASK-008.1-a-planner-mapbox-interactions.md`、`docs/ui/companion-management.md`、`docs/ui/planner-map-interaction-booking-mapbox.md`。分别从 origin/develop 原文复现，未修改无关任务文档。
- 桌面 1440×900：逐一验证 Step 1～5，面板均为 1216×797.93；背景 URL 一致，无页面 / 内容区溢出。
- 短桌面 1280×720：逐一验证 Step 1～5，面板均为 1216×630.72；全部内容在框内，无页面 / 内容区溢出。
- 手机 390×844：逐一验证 Step 1～5，面板均为 377.20×737.93；无页面横向或额外纵向溢出，必要内容保留面板内部滚动，生成页无内部滚动。
- 实际 UI 前进、返回、重新生成、刷新仍保留既有兴趣、地区、同行人和日期模式；浏览器 error / warn 日志为空，未观察到 hydration error。触屏真机与未实测尺寸不声明通过。
- 3000 端口已从旧生产快照切换为 TASK-007 开发预览：`http://127.0.0.1:3000/start`。`/planner` 仍属于独立 TASK-008 分支，未进行跨任务整合。
- 发布使用 `[skip ci]` 避免 feature push 自动合并流程；本地质量检查全部执行。PR 保留 Draft 防止另一个自动合并工作流触发，不改工作流配置、不直接写 develop。实现 Ready For Review: Yes，等待审查。
- 已推送 `feature/b-wizard-layout-polish`，PR [#61](https://github.com/kanzakimy0/TravelAssist/pull/61) 关联 Issue #35；背景实现提交 `25a0805`，后续文档追踪提交以 PR head 为准。Issue 保持 open / 待审查，未宣称已合入 develop。

## Changed Files

43 个文件（TASK-007 累计，含 v1.0～v1.3、指定原图、来源记录与背景回归测试；不计同步合入的个人中心成果）：

- `docs/project/WBS-TravelAssist.md`
- `docs/tasks/TASK-007-b-wizard-layout-polish.md`
- `docs/ui/help-icons.md`
- `public/media/start/sakura-coast-fuji-train-sunset.png`
- `public/media/start/README.md`
- `src/components/ui/info-popover.tsx`
- `src/components/ui/info-popover.module.css`
- `src/components/ui/info-popover-position.ts`
- `src/components/ui/info-popover-interaction.ts`
- `src/features/home/components/ai-conversation-panel.tsx`
- `src/features/start-flow/components/anchor-actions.tsx`
- `src/features/start-flow/components/budget-selector.tsx`
- `src/features/start-flow/components/calendar-popover.tsx`
- `src/features/start-flow/components/companions-step.tsx`
- `src/features/start-flow/components/destination-grid.tsx`
- `src/features/start-flow/components/detail-modals.tsx`
- `src/features/start-flow/components/expandable-date-selector.tsx`
- `src/features/start-flow/components/familiarity-step.tsx`
- `src/features/start-flow/components/generation-step.tsx`
- `src/features/start-flow/components/info-popover.tsx`
- `src/features/start-flow/components/interest-detail-modal.tsx`
- `src/features/start-flow/components/interest-grid.tsx`
- `src/features/start-flow/components/modal.tsx`
- `src/features/start-flow/components/plan-selection-step.tsx`
- `src/features/start-flow/components/planned-date-popover.tsx`
- `src/features/start-flow/components/preferences-step.tsx`
- `src/features/start-flow/components/review-step.tsx`
- `src/features/start-flow/components/section-header.tsx`
- `src/features/start-flow/components/square-option-card.tsx`
- `src/features/start-flow/components/start-flow-shell.tsx`
- `src/features/start-flow/components/themed-popover.tsx`
- `src/features/start-flow/components/transport-selector.tsx`
- `src/features/start-flow/components/travel-style-group.tsx`
- `src/features/start-flow/components/trip-basics-step.tsx`
- `src/features/start-flow/components/wizard-icon.tsx`
- `src/features/start-flow/components/wizard-layout.tsx`
- `src/features/start-flow/components/wizard-step-body.tsx`
- `src/features/start-flow/lib/calendar.ts`
- `src/features/start-flow/start-flow.module.css`
- `src/features/start-flow/themed-popover.module.css`
- `tests/task-007-calendar.test.mjs`
- `tests/task-007-info-popover.test.mjs`
- `tests/task-007-background.test.mjs`

## Result Format

```markdown
# TASK-007 Result

## Status

## Prerequisite Check

## Base Commit

## Feature Branch

## Commit SHA

## Changed Files

## Implemented

## Test / Typecheck / Build Result

## Pull Request

## GitHub Issue

## Blockers
```
