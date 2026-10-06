# TravelAssist 主系统 Design Token / 色彩 / 字体 / 圆角规范

> 版本：v1.1 — 当前品牌基线与兼容映射；设计审查中
> 修订日期：2026-09-10；原始交付：2026-09-07
> WBS 1.13 / Owner B / Issue #178 / PR #179
> Branch：docs/b-wbs-1-13-main-design-tokens
> 本轮对照：develop@f0569cdc57adc44d9c7e2524064be86217b7d628

## 0. 当前结论与历史

当前唯一全局来源是 `src/app/globals.css`。TASK-024-A 及后续已验收首页/珊瑚视觉整合已先行实装 shared tokens；本规格记录这些事实，并整理仍待审查的局部角色。不能把旧候选红棕色重新覆盖到已经验收的珊瑚色界面。

原 v1.0（设计提交 f48baab2612015841cb74333fd21b1f58201442b）中的红棕 Accent、`--ta-*` 新命名、七级圆角、字体/阴影替换仅是当时的设计候选，现撤回其覆盖当前基线的效力。原始 Result、提交与 PR 历史保留。本文修订不执行 CSS 迁移，不宣称浏览器视觉验收通过；WBS 1.13 仍为 B / 待审查，Issue #178 保持 Open。

## 1. 范围与优先级

用户已验收的最新品牌/页面决定 > 当前全局 shared tokens 与实际消费关系 > 本文候选局部规则 > 旧设计。本文不重做首页、Logo、Avatar、Planner/Detail 或 Personal Center；不改变地图/右栏/底栏或 PC Sidebar/Content 几何。地图每个旅行日的稳定身份色参见 1.12，不被品牌色或状态色覆盖。

## 2. 视觉方向

暖米白/象牙白表面、深墨文字、珊瑚动作、少量暖粉、大圆角、轻暖色边框与柔和阴影。首页保留沉浸 Hero，Start 保留 Wizard，Planner/Detail 保留地图工作台，Personal Center 保留管理布局。共用视觉语义，不强制共用页面结构。绿色只用于适当状态或自然场景，不是品牌主色。

## 3. 命名与唯一来源

直接消费现有 `--color-*`、`--background-accent-primary`、`--radius-*`、`--space-*`、`--elevation-*`、`--font-*`、`--motion-*`。不要再新增同义 `--ta-*` 命名层或重复 HEX palette。保留现有 `--wizard-*` / `--pc-*` 兼容 alias；组件局部变量仅表达真实独立角色。本文出现的候选角色不是创建新全局变量的授权。

## 4. Core Surface / Text / Accent

| 当前 token                                        | 当前值               | 语义                             |
| ------------------------------------------------- | -------------------- | -------------------------------- |
| `--color-bg-canvas`                               | `#FAF6EF`            | 无照片/地图时底色                |
| `--color-bg-elevated` / `--color-bg-overlay`      | `#FFFCF7`            | 卡片/浮层暖白基底                |
| `--color-bg-muted`                                | `#F9E7E0`            | 弱分组/选中柔和背景              |
| `--color-text-primary`                            | `#383632`            | 主正文与标题                     |
| `--color-text-secondary`                          | `#70665F`            | 辅助说明                         |
| `--color-text-on-accent`                          | `#FFFFFF`            | 强调文字，逐组件检测对比         |
| `--color-accent-primary`                          | `#E95B4B`            | 品牌动作/选择                    |
| `--color-accent-primary-hover`                    | `#D94738`            | hover 强调                       |
| `--color-accent-secondary`                        | `#C9788B`            | 暖粉辅助                         |
| `--color-border-subtle` / `--color-border-strong` | `#E9DCD1`            | 现行边界，两者同值但语义独立     |
| `--color-focus-ring`                              | `#BD362B`            | 键盘焦点                         |
| `--color-scrim`                                   | `rgb(31 38 58 / 8%)` | 现有遮罩基值，按实际模态合成验证 |

主按钮使用 `--background-accent-primary`：155deg 渐变，从 `rgb(244.44 118.52 98.36)` 到 `rgb(233.42 90.68 75.04)`。这是已验收首页 CTA 的共享绘制值，不能仅用纯色计算冒充渐变对比。

没有独立全局 pressed token。共享 Button active 目前复位 transform；Home 有自己的 active 反馈。沿用实际组件行为，不发明红棕 pressed。玻璃、tertiary、strong surface 等角色没有独立全局等价变量时，保留局部消费和审批，不凭旧候选值批量替换。

## 5. 状态语义

当前全局 danger 为 `--color-status-danger: #A33E5B`。Success / Warning / Info 尚无同名全局共享 token，不把 v1.0 候选 `#256F52 / #9A6500 / #3F6F8F` 宣称已冻结或已实装；后续仅在盘点真实消费者和验证对比后决定是否提升为 shared。

状态始终附文字/图标；已预约与迟到风险可以同时显示。未知/未接入不能显示成功；高匹配分不能抵消硬约束。品牌选择与业务风险保持独立，路线的日期色也不等于 Info/Success。

## 6. 对比度与限制

以下按当前 HEX 的 sRGB 相对亮度公式重新计算，仅是纯色数值，不是浏览器/照片/地图或渐变验收：

| 颜色对             | 本轮计算 |
| ------------------ | -------: |
| #383632 on #fffcf7 |  11.78:1 |
| #70665f on #fffcf7 |   5.46:1 |
| #ffffff on #e95b4b |   3.46:1 |
| #ffffff on #d94738 |   4.28:1 |
| #bd362b on #fffcf7 |   5.51:1 |
| #a33e5b on #fffcf7 |   6.04:1 |

白色小字在正常珊瑚色上不足 4.5:1，不能沿用旧红棕色 4.68:1 的通过结论。大字与普通字适用目标不同；渐变最浅区域还需独立测量。已有小字按钮列为后续可读性审查项，本次文档不改已验收 CTA。保持清楚 focus、文字/图标冗余；照片/地图/Glass 必须验证真实合成背景，不能用厚重全屏 overlay 代替局部问题处理。

## 7. 字体

当前 `--font-body`：`"Segoe UI", "Hiragino Sans", "Microsoft YaHei", sans-serif`。

当前 `--font-heading`：`"Yu Mincho", "Hiragino Mincho ProN", "Songti SC", "SimSun", serif`。

UI 数据、时间、价格、表单与按钮优先 Sans；首页人文大标题保留 Serif。沿用当前 CJK/Latin fallback，不新增字体文件、包或 Inter/Noto 优先级来改变已验收换行。PC 的现有 Sans 栈与 global body 一致，保留消费方式。

## 8. 排版与留白

角色保留 display/h1/h2/h3/body/label/caption/micro，但 v1.0 的 64/36/28/20/15/14/12/11px 是历史候选，不是本轮重设页面字号的命令。以各页面已验收 clamp、行高与换行为基线；关键说明不可依赖微小字或低 opacity。字重按实际可用字体检测，不通过统一替换破坏构图。

复用现有 space 1/2/3/4/5/6/8/12，对应 4/8/12/16/20/24/32/48px（默认 16px 根字号）。不要因为统一留白调整 Planner 的保护几何。

## 9. Radius

| 当前 token      | 值             | 使用边界                           |
| --------------- | -------------- | ---------------------------------- |
| `--radius-sm`   | 0.75rem / 12px | 紧凑控件                           |
| `--radius-md`   | 1.25rem / 20px | 已有面板/组件语义                  |
| `--radius-lg`   | 2rem / 32px    | 已有大容器                         |
| `--radius-xl`   | 3rem / 48px    | 已有大型视觉容器，不作所有卡片默认 |
| `--radius-pill` | 999rem         | CTA/Chip/头像操作                  |

撤回强行改成 8/12/16/20/28/36/pill 的全局七级替换。页面已有 16/18/28px 等局部角色保留，只有独立迁移任务证明等价且视觉验收后才提升/清理。输入、地图快速卡和面板不能机械套一个圆角。

## 10. Border / Elevation / Glass

复用现有 `--elevation-card: 0 12px 36px rgb(113 78 59 / 6%)`；panel 为同几何 10%；popover 为 `0 12px 32px rgb(113 78 59 / 14%)`。没有独立全局 dialog shadow，不新增候选同义变量。以轻边框、表面与留白为主，不制造 3D 卡堆。

玻璃是组件合成效果：Home account pill 当前用 elevated 85% 与透明混合，其他浮层消费各自既有值。不要把原设计 84–94% / blur 8–16px 强制写成全站标准；需要逐背景对比和回退测试。

## 11. Focus / Hover / Disabled

Main shell/shared Button 当前 focus 为 3px focus ring、3px offset；PC offset 为 4px，保留已有可见性与几何。Hover 使用现行 accent-hover、边框和轻阴影，active 不引入大位移。Shared Button disabled 目前 opacity 0.48，需按实际背景验证可辨认性；aria/disabled/cursor 必须一致，不把视觉淡化代替禁用语义。

## 12. Motion

复用 `--motion-fast: 140ms`、`--motion-normal: 240ms`、`--motion-slow: 900ms`。不新增同义 panel/scene tokens 或恢复旧 normal 220ms。`prefers-reduced-motion: reduce` 按现有全局规则减少非必要过渡；首页静态背景不是需要启动动画的理由。

## 13. 页面应用

Home 保留真实 CTA/Login/Account/AI 入口与现行背景构图；Start 使用 wizard aliases；Planner/Detail 的品牌控件使用 global，日期颜色和状态保持独立。未来 AI 内容不拥有第二套紫色品牌系统。现有功能和结构不因本文改变。

## 14. Personal Center

PC 已与 Home 共用品牌变量，不再将其描述为独立红棕配色。`--pc-accent-primary`、canvas/card/text/border/focus/shadow 已 alias 到 global。保留 `--pc-bg-sidebar: #FCF8F1`、`--pc-nav-active-bg: #FAE9E2` 等真实局部表面；它们不等于允许另建 Brand System。Sidebar/Content 几何及业务不动。

## 15. 当前消费者与兼容映射

| 来源（均为本轮 develop 基线）                                    | 当前消费                                                                   | 后续边界                                            |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| `src/app/globals.css`                                            | 唯一 shared 定义                                                           | 已存在，不再创建 `--ta-*`                           |
| `src/components/ui/button.module.css`                            | gradient / hover / radius-pill / elevation / focus                         | 保留；小字渐变对比另验                              |
| `src/features/home/components/home-hero.module.css`              | global heading / CTA paint / account pill                                  | 保留首页构图和真实用户状态                          |
| `src/features/start-flow/start-flow.module.css`                  | wizard ink/muted/coral/coral-dark/blush/cream/border/glass 已 alias global | 不再重复执行旧迁移                                  |
| `src/features/planner/planner-v05.module.css`                    | global surface/text/border/accent/gradient                                 | 局部角色逐项盘点，保护地图/右栏/底栏                |
| `src/features/planner/model/trip-model.ts`、`map/route-color.ts` | 日期 color 与旧品牌值显示兼容                                              | 不用 global accent 覆盖所有日期色；见 1.12 迁移差异 |
| `src/features/personal-center/personal-center.module.css`        | pc aliases 已指向 shared                                                   | 保留局部表面与 Sidebar/Content                      |

## 16. 分阶段迁移

先比对当前消费者 → 识别真正重复或不一致角色 → 优先复用现有变量/alias → 独立任务小范围迁移 → 相同数据/视口前后截图及对比度验收 → 再清理无引用值。禁止全仓 HEX 大替换。尚不存在的 pressed/status/dialog 等共享角色保持待决定，不创建占位平行系统。

## 17. 1.14 / 1.20 交接

响应式任务只处理断点、角色尺寸、触控与内容密度；状态页任务复用现有 surface/text/border/focus。都不得借引用本规范重新决定品牌。本文不启动这些任务，不改其 Owner/状态或把缺失依赖伪装完成。

## 18. 视觉证据边界

本轮只有源码只读映射、纯色计算、Markdown 与 Git 差异检查。没有重新执行浏览器视觉测试。后续相同基线/数据/视口对比 Home、Start、Planner、当前 Detail、PC；建议覆盖 1440×900、1024×768、390×844、320×568、reduced motion、键盘/focus、hover/disabled、Popover 与登录态。保存成对截图，确认 surface、Logo/Avatar、按钮、文字、radius、border、shadow、spacing 一致且保护几何不变。

## 19. 验收矩阵

| ID    | 要求                                                         |
| ----- | ------------------------------------------------------------ |
| DT-01 | 品牌不回退绿色/旧蓝灰或红棕                                  |
| DT-02 | Accent #E95B4B / hover #D94738 对齐真实 global               |
| DT-03 | 普通字/大字/渐变对比分别记录，不能沿用旧通过结论             |
| DT-04 | 主正文墨色与暖白表面对比                                     |
| DT-05 | Secondary 不以额外 opacity 降低关键可读性                    |
| DT-06 | 没有独立 tertiary 时不虚构已冻结值                           |
| DT-07 | 业务状态与品牌/日期身份分离                                  |
| DT-08 | 状态附文字或图标                                             |
| DT-09 | 地图/timeline/Detail/legend 同日颜色一致，旧灰线迁移单独验收 |
| DT-10 | Home Serif 与数据 Sans 边界                                  |
| DT-11 | CJK/Latin fallback 与换行回归                                |
| DT-12 | 不新增字体包/文件                                            |
| DT-13 | 字号角色保留现行几何与关键说明可读性                         |
| DT-14 | 保留现行五级 radius 与已验收局部例外                         |
| DT-15 | 不把大圆角套到所有密集控件                                   |
| DT-16 | 键盘 focus 可见，返回焦点正常                                |
| DT-17 | Glass/照片/地图真实合成对比另验                              |
| DT-18 | 五页面实际消费者与 alias 有来源                              |
| DT-19 | PC 与 Home 共用品牌且不重构 PC                               |
| DT-20 | 1.14/1.20 复用，不建立平行体系                               |
| DT-21 | 本 PR 无 runtime/CSS/assets/package/workflow 变更            |
| DT-22 | 合入文档不代表后续视觉实装/冻结验收通过                      |

## 20. 仍待决定 / 不作为已冻结值

普通小字珊瑚渐变可读性、状态色共享提升、pressed/tertiary/dialog 是否需要独立角色、局部圆角/Glass 的必要差异，均须以实际消费者与视觉证据决定。保持现行值和真实回退；不得为了完成文档状态发明新值或宣称全部 UI 达标。

## 21. 发布与完成规则

本轮合并修訂后的文档候选，解除旧分支与 develop 差异；不是把未验收的数值覆盖运行时。WBS 1.13 维持待审查，最终冻结与页面迁移证据仍待相应验收。Result 保留旧候选及旧测试历史，并追加本轮实际结果；后续变化需显式版本记录。
