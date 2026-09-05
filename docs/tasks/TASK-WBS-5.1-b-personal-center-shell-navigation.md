# WBS-5.1-B — Personal Center Shell / Navigation

## Metadata

- Task ID: WBS-5.1-B
- WBS ID: 5.1
- Owner: B
- Status: 待审查
- GitHub Issue: #34
- Branch: `feature/b-account-wbs-5-1-personal-center-shell`
- Base Commit: `6b0677e21c0f0089f1612a5f39f43ac8e2dde82f`
- Depends On: 1.22, 2.6
- Commit: PENDING
- Pull Request: PENDING

## Objective

按照 WBS 1.21 / 1.22 冻结设计实现可复用的 Personal Center Shell、五项导航与首页视觉骨架。

## Existing Work Checked

- 执行前工作区 clean，develop 与 origin/develop 一致。
- WBS 1.22、2.6 已完成，5.1 未开始。
- 最新 A Task 为 TASK-004.1-A（Planned）；TASK-004-A 已完成。
- 最新 B Task 为 TASK-006（已完成，PR #32）；TASK-005 已完成。
- 检查所有远程分支，未发现 `src/app/(account)` 或 `src/features/personal-center` 等价实现；开始时无打开的 PR。
- 搜索未找到 WBS 5.1 Issue，创建 #34。
- 已读取 WBS、personal-center.md、personal-center-shell.md、design-system.md、web-architecture.md、task-tracking.md 与本地 Next.js 文档。

## Scope

- `/personal-center` 共享 layout、Sidebar、五项导航、Top Actions 和内容滚动区域。
- 本地 Mock 首页：下一次旅行、我的旅行、更多功能模块。
- trips / preferences / companions / account 占位路由。
- 仅更新 WBS 5.1 及本 Task 的追踪记录。

## Out of Scope

Auth、Session、Avatar Popover、Logout、API、DB、Planner、Map、AI、Main Header 接线；其他 Task 与 WBS 状态。

## Implementation

- `src/app/(account)/personal-center/layout.tsx` 通过共享 App Router Layout 复用 Shell。
- 五个页面路由：`/personal-center`、`/personal-center/trips`、`/personal-center/preferences`、`/personal-center/companions`、`/personal-center/account`。
- `src/features/personal-center/` 包含 Sidebar、pathname 导航、Top Actions、Mock 首页、子页占位组件、inline SVG 和局部 CSS Module。
- 一级导航严格为五项；支持 Default / Hover / Active / Keyboard Focus，当前项带 `aria-current="page"` 和非颜色标记。
- Sidebar / TopActions / 背景 / 内容容器跨页面保持挂载，只替换页面内容。
- Yuki 明确标记为 Mock 用户。通知、右上头像菜单、继续规划仅保留未开放视觉，不接入真实业务。
- 首页提供下一次旅行、三张示例旅行卡片、旅行灵感 / 我的收藏 / 目的地探索。旅行照片只读复用现有 `public/media/home/home-hero-poster.webp`，全部为静态 Mock。
- 侧栏保留圆角、裁切和轻 CSS 背景插画区域；不下载或生成素材。
- 桌面 Sidebar 宽度为 17.5%，内容独立滚动；窄屏采用基础换行布局，不定义最终移动导航。
- 未修改 A 主系统、其他 Task、共享样式、package.json 或 package-lock.json；未新增依赖。

## Validation

验证环境：Windows、Node v24.18.0、npm 11.16.0、Next.js 16.3.4、React 19.2.8、TypeScript 6.0.3、ESLint 9.39.5。

| Check                                             | Result                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm install`                                     | Passed；361 packages，0 vulnerabilities；原有 unrs-resolver 安装脚本许可提示见下方   |
| `npm run lint`                                    | Passed                                                                               |
| `npm run typecheck`                               | Passed                                                                               |
| `npm run format:check`                            | Failed（3 份原有设计文档格式问题，详见下方；本 Task 文件全部通过）                   |
| 本 Task Prettier check                            | Passed（新增路由、B 模块、当前 Task.md）                                             |
| `npm run build`                                   | Passed；五个个人中心页面均成功静态预渲染                                             |
| `git diff --check`                                | Passed                                                                               |
| `npm run dev -- --hostname 127.0.0.1 --port 3000` | Passed；Ready，五个路由均 HTTP 200                                                   |
| Browser route smoke test                          | Passed；五路由直达、点击跳转、标题和 Active Nav 正确                                 |
| Shared Shell                                      | Passed；Sidebar / TopActions / 背景 / 内容容器 DOM 在五页导航中保持同一实例          |
| Accessibility                                     | Passed；Tab / Enter、3px 可见焦点、Hover、aria-current、非颜色选中标记与图标按钮标签 |
| Content scrolling                                 | Passed；1440 / 1280 下内容独立滚动、侧栏和顶部稳定；滚动后切换子页标题正常可见       |
| Console                                           | 无阻塞错误 / 无 pageerror；仅原有 favicon.ico 404，见下方                            |

真实 Edge 无头浏览器（运行时自带 Playwright，未加入项目依赖）验证并查看截图：

| Viewport  | Horizontal overflow | Sidebar         | Content          |
| --------- | ------------------- | --------------- | ---------------- |
| 1920×1080 | 0px                 | 17.5%，导航完整 | 内容完整显示     |
| 1440×900  | 0px                 | 17.5%，导航完整 | 内容可滚动 75px  |
| 1280×720  | 0px                 | 17.5%，导航完整 | 内容可滚动 227px |
| 390×844   | 0px                 | 基础窄屏换行    | 文档正常滚动     |
| 320×740   | 0px                 | 基础窄屏换行    | 文档正常滚动     |

同时验证 document / Shell / Sidebar / Content 自身宽度，避免全局 overflow-x 隐藏掩盖问题。检查图片加载与解码、浏览器前进/后退，以及禁用的通知/账户菜单按钮。临时验收脚本、JSON 和截图位于本地忽略目录 `node_modules/.cache/wbs-5.1/`，不提交生成文件。

## Result

WBS 5.1 实现和范围内功能验收完成，等待 PR 合并。未开发 5.2 或其他后续业务。

已知限制与原有基线问题：

- Artwork asset pending：仓库暂无正式 Personal Center 侧栏插画，保留 CSS 背景区域。
- 全仓 format:check 的三个失败文件为 `docs/ui/authentication.md`、`docs/ui/personal-center-shell.md`、`docs/ui/personal-center.md`。通过 `git show` 读取 Base Commit 的内容调用相同 Prettier 检查，三份原始文件均不通过，确认不是本 Task 引入；遵循范围限制保持原样，没有修改格式检查配置。
- `npm install` 提示 `unrs-resolver@1.12.2` 的 install script 尚未获 npm allowScripts 批准；没有擅自批准或变更安装策略。安装、lint、typecheck、build 均成功，0 vulnerabilities。
- 浏览器自动请求 `/favicon.ico` 返回 404；Base Commit 中 `src/app/favicon.ico` 和 `public/favicon.ico` 均不存在。作为原有非阻塞资源问题记录，不修改全局图标；除该条外无 console error / pageerror。

## Commit

PENDING

## Pull Request

PENDING

## WBS Sync

5.1 → 待审查；仅增加当前 Task Tracking Record，不修改其他 WBS 行。

## Issue Sync

#34 Open / 待审查；PR 合并并验收后同步为已完成。
