# Codex 交接指令：WBS 5.1 视觉接入与完善

> 本文件是可执行的交接说明，不是已创建或已完成的正式 Task。  
> Owner：B；关联 WBS：5.1。  
> 复核基线：`78edd9525d36488ab1065d841e94edabd4858cee`。执行时必须读取更新后的 `origin/develop`，不得强制回退到此提交。

## 目标

在现有个人中心 Shell 上接入已上传的正式主背景纹理，检查侧栏插画的裁切和叠层，并完成视觉与回归验证。不重新设计页面，不新增图片，不开发 5.2 或其他业务功能。

## 第一步：确认状态，避免重复和覆盖

1. 先检查本地未提交修改；不得覆盖、清理或强制重置他人工作。执行 `git fetch --all --prune`，检查最新 develop、A/B Task、Issue、PR 和相关远程分支。
2. 阅读 `AGENTS.md`，按其要求读取当前安装版本 `node_modules/next/dist/docs/` 的相关指南；不凭旧版本记忆改写框架 API。
3. 阅读 Master WBS、追踪规则、1.21 / 1.22 设计、design-system.md、现有素材审计与接入说明，以及本次复核报告。
4. 重新检查 `.main` 是否已引用正式主背景。如果他人已经完成，先验证现有实现，不重复生成图片或覆盖已有提交。
5. 本次为已交付 5.1 的补充工作。可用任务标识 `WBS-5.1-B-VISUAL-POLISH`，但必须先检查是否已有同名或等价任务，优先续用真实记录。未创建的 Issue、Commit、PR 一律写 PENDING，不伪造编号。
6. 正式开工时使用独立 Issue、Task 文件和 B feature 分支，遵循 `docs/development/task-tracking.md`。保留原 5.1 Task、Issue #34 和已完成记录；补充任务独立追加跟踪，不覆盖原条目、其他 WBS 行或别人的 Task。不要因本交接文档存在就声称开发已开始。

## 允许范围

主要代码范围：

```text
src/features/personal-center/personal-center.module.css
src/features/personal-center/components/personal-center-shell.tsx
src/features/personal-center/components/personal-sidebar.tsx
src/features/personal-center/components/personal-home-preview.tsx
```

只有证明确有需要时才改动相应文件；不要为了凑齐文件范围而改代码。

允许追加本补充任务的 Task / Result、测试证据与局部 WBS 追踪记录。不要重新保存或覆盖任何既有 Task 文件。

只读素材：

```text
public/media/personal-center/sidebar-torii-watercolor.svg
public/media/personal-center/personal-center-surface-texture.svg
```

禁止改动主系统首页、Step1–Step5、Planner、Map、AI、主 Header、共享主题、依赖版本、锁文件、工程配置；禁止添加 API、Auth、Session、数据库和真实业务接线。

## 必须完成的修改

### 1. 接入右侧主背景

正式路径：

```text
/media/personal-center/personal-center-surface-texture.svg
```

优先在共享 `.main` 中使用 CSS background。保留原有 flex 布局、尺寸和滚动结构，仅替换背景规则。以下是实现起点，最终裁切参数以实际截图验证为准：

```css
background-color: var(--pc-bg-canvas);
background-image: url("/media/personal-center/personal-center-surface-texture.svg");
background-repeat: no-repeat;
background-position: center top;
background-size: cover;
```

要求：

- 背景只在右侧，不铺到 Sidebar。
- 顶部操作区与内容区背景连续，页面切换不闪烁、不重建 Shell。
- 不与旧 radial-gradient 盲目叠加；不调低整个容器 opacity。
- 不改变文字、表单、卡片和 focus 的不透明度。
- 保留纯色 fallback；不用图片中的低对比纹理承担任何信息表达。
- 不叠加新的富士山、鸟居、寺庙、书法或大花瓣装饰。

### 2. 复核 Sidebar 正式插画

保留现有路径、空 alt 和装饰语义。检查 `object-fit`、`object-position`、圆角、底部贴合以及 CSS 伪元素叠层。

桌面侧栏继续采用已冻结的约 16%–18% 比例，不套用 Planner 页的 1/4 侧栏规则。低高度时允许裁切或减少插画高度，五项导航和键盘焦点优先。只有截图证明叠层多余时才减弱旧渐变或波纹。

### 3. 保持布局与边界

保留五项一级导航、当前项非颜色标记、Hover / Focus、路由结构、Mock 标识和现有占位行为。个人中心设计允许内容区滚动，不套用入口 Step 页的“整页不能上下滚动”要求。

品牌文字、现有代码图标、Mock 用户头像和 Mock 旅行封面继续沿用。不得自行生成新 Logo、用户肖像或目的地照片；不得将“正式图片已齐”扩写为“完整个人中心所有素材已冻结”。

在 `personal-home-preview.tsx` 中把仍存在的“为你推荐目的地与玩法”改为“为您推荐目的地与玩法”，仅在本模块内修正，不做全仓文案重构。

## 必须执行的验证

### 静态检查和构建

使用仓库锁定依赖和既有安装策略，不擅自批准新的安装脚本、升级依赖或重写 lockfile。运行：

```text
npm run lint
npm run typecheck
npm run format:check
npm run build
git diff --check
```

同时对本任务实际修改的文件运行局部格式检查。全仓失败与本任务新增失败分开记录；历史基线问题必须重新核实，不直接抄成当前结论。

### 浏览器回归

五个路由：

```text
/personal-center
/personal-center/trips
/personal-center/preferences
/personal-center/companions
/personal-center/account
```

视口：1920×1080、1440×900、1280×720、390×844、320×740。

至少记录以下真实结果：

- 五个路由可访问、导航与浏览器前进后退正确，Shell 不重建。
- 两个正式 SVG 请求成功并能显示，主背景不是未生效的 CSS 声明。
- 三个桌面尺寸的修改前 / 后截图；窄屏回归截图。
- 页面、Shell、Sidebar、内容区无非预期横向溢出；不能只用 overflow-x:hidden 掩盖问题。
- 短屏导航完整，Tab / Enter / focus-visible 正常；插画不覆盖可点击区域。
- 主背景克制、正文可读、卡片与顶部操作区正常；没有新增控制台异常。
- 原有禁用按钮保持禁用，不把占位操作伪装成已实现业务。

截图与结果放在本任务专属目录或附件中，避免覆盖他人截图。没有可用浏览器时，明确记录“视觉验收未执行”，不得写 Passed 或标记整项已完成。

## 完成后的提交与追踪

提交只包含本任务文件；提交标题含实际 Task ID，PR 目标为 develop，关联本补充任务真实 Issue。

代码实现完而 PR 未合并或视觉待验收：按仓库规则记录待审查 / 待验收。合并并通过验收后才标记补充任务完成。原始 WBS-5.1-B 的历史交付记录保留，不重写为本次结果。

返回结果必须包括：Task ID、WBS、Owner、基线、分支、Commit、Issue、PR、变更文件、逐项验证结果、截图位置、已知限制和 WBS 同步结果。

**最终目标：完成已冻结素材的实际接入，而不是重新生成一套看起来不同的页面。**
