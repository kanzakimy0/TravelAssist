# TASK-007 — B：统一修正 Step 1–5 版式、文案与关键控件样式

## Metadata

- Repository: `kanzakimy0/TravelAssist`
- Owner: B 工作站（客户界面）
- Status: Partially Completed / Blocked（背景原图与窄屏视觉验收待完成）
- GitHub Issue: [#35](https://github.com/kanzakimy0/TravelAssist/issues/35)
- Base Branch: `develop`
- Base Commit: `6b0677e21c0f0089f1612a5f39f43ac8e2dde82f`
- Feature Branch: `feature/b-wizard-layout-polish`
- WBS: 3.6 / 3.8（Step 1–5 版式修正）
- Depends On: TASK-005 / TASK-006
- 正式规格来源：用户提供的《TravelAssist｜Step 1–5 统一版式与交互修正规范 v1.0》及随附 TASK-007 执行要求。本文归档该定稿，不从旧任务推测新设计。

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

## 验收清单

- [x] TASK-005、TASK-006 已合入后开始，初始工作树干净。
- [ ] Step 1～5 使用指定统一背景《樱花海岸与富士山列车夕照》。
- [ ] 五步主面板尺寸相同。
- [ ] 所有“你”改为“您”。
- [ ] 标题左留白至少两倍，标题/内容/操作同基线且左右对称。
- [ ] Step 1 保持 2×2，主文字明显更大。
- [ ] Step 2 16 个兴趣均有统一单色图标。
- [ ] Step 3 交通和预算分别为一排四张正方形卡。
- [ ] 目的地 2×4 且均带单色图标。
- [ ] 日期保持横向展开，Popover / 下拉为页面统一风格。
- [ ] 已确定安排左文案右按钮组，三按钮并排。
- [ ] Step 4/5 完成“您”化、统一尺寸与对齐，现有逻辑不变。
- [ ] lint / typecheck / format:check / build / 相关 tests 通过。
- [ ] 草稿恢复与相关二级弹窗回归验证完成。
- [ ] 无无关配置更改，Task / WBS / Issue / PR 同步。

## Git 工作流

1. `git fetch origin`。
2. `git checkout develop`，`git pull --ff-only origin develop`。
3. 确认 TASK-005/006 已合入且 working tree clean。
4. 从最新 `origin/develop` 创建 `feature/b-wizard-layout-polish`。
5. 实现并修复本任务引入的问题。
6. 运行现有 lint / typecheck / build / tests（如有），补充必要验证。
7. Commit、push 指定分支，创建 PR 到 `develop`，关联本 Issue。
8. 不直接提交 `develop`，不继续下一任务。

## 执行记录

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

### 未完成项与发布限制

1. **指定背景原图未取得**：用户提供的 ChatGPT 签名链接返回 403；浏览器也未能加载。已请求可读本地图片路径。旧海岸列车图只保留为现状，未称其为指定背景，未通过该验收项。
2. **窄屏视觉验收未完成**：浏览器视口设置未生效，实际仍为桌面尺寸。响应式 CSS 已按规范调整，但不声称完成手机渲染实测；拿到原图后仍需复查窄屏及背景可识别性。
3. **尚未 push / 创建 PR**：仓库 `feature/**` 推送会自动创建并尝试合并 PR，背景与视觉验收未完成时不触发该工作流。不改自动化配置、不直接写入 develop。

本任务保持部分完成 / 阻塞状态，Issue #35 继续打开；拿到背景并完成剩余验收后，再推送指定分支并创建关联 Issue #35 的 PR。

## Changed Files

31 个文件（不包含指定背景，原图仍待提供）：

- `docs/project/WBS-TravelAssist.md`
- `docs/tasks/TASK-007-b-wizard-layout-polish.md`
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
- `src/features/start-flow/components/trip-basics-step.tsx`
- `src/features/start-flow/components/wizard-icon.tsx`
- `src/features/start-flow/components/wizard-layout.tsx`
- `src/features/start-flow/lib/calendar.ts`
- `src/features/start-flow/start-flow.module.css`
- `src/features/start-flow/themed-popover.module.css`
- `tests/task-007-calendar.test.mjs`

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
