# TASK-024-A 浏览器与品牌对照

执行基线：`e74904830cbf8e6745b2013b2888e38984ccf96d`。

## 已验证范围

- 1440×900、1024×768、390×844、320×568。
- `/`、`/start`、`/planner`、`/planner?view=detail&day=1`、`/personal-center`。
- Detail 必须先点击「保存到浏览器并进入详情」，不把保存确认弹窗算作详情验收。
- 每页的 Logo、单一 Header / main、路由边界、无横向溢出、键盘焦点、跳过导航、入口遮挡。
- Main ↔ Personal Center 导航、原有 Avatar 菜单 Escape / 焦点恢复；账户编辑 Guard 的取消与放弃。
- Planner / Detail 的地图、右栏、底部栏与折叠栏和原始 develop 逐项比较 x/y/width/height。
- Node 专项还验证真实 Header TSX 渲染、路由组隔离、共享变量及无跨 feature 业务依赖。

## 品牌规则

| 项目            | 实际来源与对照结论                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Logo / Brand    | 复用 Personal Center 原鸟居 wordmark；`BrandLogo` 只呈现资产，Home Link 与两个 Personal GuardedLink 行为保留。    |
| 页面表面        | 现有 `--color-bg-canvas` / elevated / overlay 承接 `#faf6ef` / `#fffcf7`；Home 保留照片，地图保持原有视觉与面积。 |
| 品牌强调        | 现有 accent primary = `#a74739`、hover/focus = `#954439`、muted = `#f9e7e0`。                                     |
| Typography      | 全局 body 使用 Personal Center 已有字体栈；既有正文、次级文字取共用语义变量；场景标题层级保留。                   |
| Radius          | 沿用原全局半径族；PC 18px、Planner 16/20px 等密度差异保留，Header/按钮使用原 pill/sm。                            |
| Border / Shadow | 暖边框 `#e9dcd1`，共享 card 与 popover 阴影来自 Personal Center 原值。                                            |
| Button          | 现有 shared Button/Link 继续使用既有语义变量，入口行为不改。                                                      |
| Avatar          | 提升原小头像外观为 `AccountAvatar`；主系统显示中性「旅」，PC 保留演示照片，不新增登录态判断。                     |
| Popover         | 原各自交互/定位保留；B 的菜单、退出与 Guard 逻辑未复制。表面、边框、阴影对齐。                                    |
| Hover / Focus   | 极浅暖粉反馈与实线焦点环；键盘可达、Escape 回焦点、skip link 实测。                                               |
| Spacing         | 复用 space 系列；只补已有 fallback 的 space-5、原 68px 工作台 header 高度及 PC 原字体值。                         |
| 页面骨架        | Home Hero、Start Wizard、Planner/Detail 地图工作台、PC Sidebar 各自保持。                                         |

## 证据

- [机器可读浏览器报告](report.json)：20 页/尺寸组合、实际 token、popover 样式、导航与 Guard 结果。
- [几何基线](geometry-baseline.json)：原始 develop 对照，含依赖视图与全部测量字段。
- [截图清单](screenshots.json)：本地截图路径、尺寸、SHA-256；截图存于 worktree 内 `.cache/qa/task024-screenshots/`，不加入业务素材清单。
- 实际检查截图与五页联系图；视觉检查为实现方检查，**用户视觉验收仍待进行**。

## 复现

使用已安装的 Playwright，通过 `PLAYWRIGHT_MODULE` 指向其包路径；浏览器默认 `msedge`，可用 `CHROME_CHANNEL` 指定本机已安装的 Chromium channel。无需新增项目依赖。

1. 在本地启动 `node tools/qa/task-024-visual-auth-fixture.mjs`（仅监听 127.0.0.1:54224）。
2. 为专用测试预览设置 `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54224`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_task024_visual_fixture` 和对应预览的 `AUTH_SITE_URL`。这些仅用于隔离的本地测试，不能用作部署配置。
3. 原始基线 checkout 运行预览。设置 `TASK_024_BASELINE=true`、`TASK_024_URL` 为该预览，运行 `node tools/qa/task-024-shell-check.mjs`，产生 `.cache/qa/baseline/report.json`。
4. 本分支运行 `npm ci`、`npm run build`、`npm start -- -p 3127`；设置 `TASK_024_BASELINE=false`、`TASK_024_URL=http://localhost:3127`，运行同一脚本。

正式结果使用真实 Edge 浏览器和应用页面，但账户身份由本地测试夹具提供；**不声称真实 Supabase 登录 / 外部认证通过**。地图使用现有无 token fallback；**不声称 live Mapbox / Route Provider 通过**。认证保护未被移除或加入绕过开关。

旧 TASK-010-A/B 的 Node 导航测试保留并跟随共享 Header 的源码位置；旧浏览器脚本中的已失效 UI 文案、h1 层级、未登录且 logout disabled 假设不覆盖当前验收行为，本任务用实际页面语义的专项脚本复验相同导航目标与 Guard。

本机调试期间 C 盘空间耗尽，导致原有图片的生产优化请求无法完成。已删除本任务创建的可再生成基线副本并保留几何证据，释放空间后以默认线程池重启生产预览；未修改生产配置。首次原工作区 npm ci 的文件占用问题通过隔离 worktree 安装解决，原工作区依赖已恢复。
