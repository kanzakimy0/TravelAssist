# WBS-5.1-B-VISUAL-POLISH — 个人中心已上传素材实装

## Metadata

- Task ID: `WBS-5.1-B-VISUAL-POLISH`
- Owner: B
- Status: 待开始
- WBS: `5.1`（已完成项的独立补充任务）
- Parent Task / Issue: `WBS-5.1-B` / #34；保持已完成，不重开。
- GitHub Issue: [#67](https://github.com/kanzakimy0/TravelAssist/issues/67)
- Repository: `kanzakimy0/TravelAssist`
- Task File: `docs/tasks/TASK-WBS-5.1-b-visual-assets-integration.md`
- Branch: `feature/b-wbs-5-1-visual-assets-integration`（拟定；尚未创建）
- Base Branch: `develop`
- Reviewed Base: `fd5e4492f202c07567593199baadd25425190367`
- Actual Execution Base: PENDING；执行时记录最新 `origin/develop`，不得回退到复核基线。
- Depends On: 已合入 develop 的 5.1 Shell、正式素材、视觉交接文档。
- Implementation Commit: PENDING
- Implementation Pull Request: PENDING
- Result File: `docs/tasks/RESULT-WBS-5.1-b-visual-assets-integration.md`（执行后创建）
- WBS Sync: 开工时在 Master WBS 追加或续用本补充任务行；不改父项状态。
- Created: 2026-09-05（Asia/Tokyo）

> 本文件是正式实现 Task，承接上一轮素材复核和交接。发布 Task 文档不等于已开始编码；发布文档的提交和 PR 不得填写为实现成果。本任务使用 Issue #67，不重复创建工单。

## 1. 目标与最新基线

将已经上传的主背景纹理真正应用到个人中心共享页面，同时复核已接入的侧栏插画，用实际浏览器结果证明素材可见、布局正确、交互未回退。

本次复核发现：

- `.main` 仍使用两层 `radial-gradient`，没有引用正式主背景纹理。
- 侧栏正式插画已有接入；不是重新生成或替换插画的任务。
- 最新 WBS 已记录 `WBS-5.2-B` 和其 FOLLOWUP 完成。当前 CSS 已有头像菜单相关样式，必须保留，不能恢复旧版整份 CSS。
- 最新任务目录包含 A 的 `TASK-009` 数据库基础任务。本任务不修改其文件或状态，也不增加数据库依赖。
- 本轮检查未发现打开的 develop PR 或同范围正式 5.1 视觉实装 Issue；执行前必须再次检查。

执行范围以本正式 Task 为准；旧交接文档中描述的“头像按钮占位”不得覆盖最新 5.2 已实现行为。

## 2. 执行前必读

```text
AGENTS.md
README.md
CONTRIBUTING.md
docs/README.md
docs/development/task-tracking.md
docs/project/WBS-TravelAssist.md
docs/ui/personal-center.md
docs/ui/personal-center-shell.md
docs/ui/design-system.md
public/media/personal-center/README.md
docs/project/WBS-5.1-VISUAL-READINESS-RECHECK-2026-09-05.md
docs/tasks/CODEX-WBS-5.1-VISUAL-POLISH-2026-09-05.md
docs/tasks/TASK-WBS-5.2-b-avatar-menu-navigation.md
docs/tasks/TASK-WBS-5.2-b-problem-cleanup-followup.md
```

从 docs 索引查找并读取当前 WBS 1.29 响应式规范，不自行制定新的移动导航或布局规范。遵守 AGENTS 要求，使用当前安装版本的 Next.js 本地文档；不凭旧版本记忆改 API。

## 3. Preflight 与重复任务处理

先检查工作区，不清理、覆盖、自动 stash 或强制重置他人改动。工作区不干净时，使用独立 worktree，或说明冲突并停止可能覆盖文件的操作。

```bash
git status --short
git fetch --all --prune
git log -1 --oneline origin/develop
git branch -a
```

读取最新 A/B Task、Issue #67、相关开放 PR 和远程分支。确认本任务文档已进入最新 develop，且两个素材路径存在。不存在时先报告具体缺失项，不生成替代图、不从旧分支整体覆盖。

无冲突且在干净工作区时，从最新远程基线创建实现分支：

```bash
git switch -c feature/b-wbs-5-1-visual-assets-integration origin/develop
```

同名分支已存在时先检查归属和进度，不覆盖。已有本任务未完成实现则续用记录；已有等价实现已合并则先验证、补齐追踪，不制造重复代码变更。仅“分支名相似”不能判定冲突，要检查是否正在修改同一文件。

完成前置检查后同步本 Task、Issue #67 和本补充任务 WBS 追踪行为“进行中”。原 5.1、5.2 和所有其他 Task/WBS 状态保持不变。

## 4. 必须使用的素材

| 素材 | 运行时 URL | 本次处理 |
| --- | --- | --- |
| 主内容低对比纹理 | `/media/personal-center/personal-center-surface-texture.svg` | 接入右侧共享背景 |
| 侧栏鸟居水景插画 | `/media/personal-center/sidebar-torii-watercolor.svg` | 保留接入，检查裁切与叠层 |

上述 URL 对应仓库 `public/media/personal-center/` 内文件。`assets/design/` 是设计源，不作为页面访问路径。两个 SVG 均只读；不重新生成、不更名、不复制到新位置、不额外调低饱和度，也不转成 base64 内嵌。

### 4.1 主背景实装

优先仅修改 `personal-center.module.css` 中共享 `.main` 的背景属性，保留其布局属性：

```css
background-color: var(--pc-bg-canvas);
background-image: url("/media/personal-center/personal-center-surface-texture.svg");
background-repeat: no-repeat;
background-position: center top;
background-size: cover;
```

这是起始参数；根据实际截图确认合理裁切。检查所有同名规则和媒体查询，避免背景在某个断点被覆盖。必须满足：

- 背景仅在个人中心右侧，顶部操作区与内容区连续；不铺到侧栏或主系统其他页面。
- 替换旧占位背景，不盲目叠加旧粉色渐变；不得降低整个容器 opacity 或对整个页面应用 filter。
- 文字、头像菜单、按钮、焦点和卡片保持清晰，纹理不成为视觉主体。
- 保留纯色 fallback；背景失败不影响阅读、点击、布局与导航。
- 保留共享 Shell 和现有内容区滚动，不通过重新挂载、添加动态 key 或重做页面布局实现背景。

### 4.2 侧栏实装复核

保留现有 Image 接入、空 alt 和装饰语义。仅在截图证明存在问题时，调整 `object-position`、容器高度、裁切、圆角或多余伪元素。

侧栏继续遵循个人中心约 16%–18% 的桌面比例和现有窄屏规则，不套用 Planner 的 1/4 侧栏。高度不足优先裁切或缩小装饰区，不压缩导航、不遮挡头像和点击区域。装饰叠层不得截获指针事件。

### 4.3 保留现有功能

五项一级导航、Mock 用户/行程标识、品牌文字和代码图标保持不变。保留 5.2 的头像菜单开启/关闭、菜单路由、键盘操作、焦点返回，以及后续修复；原有未开放业务仍保持原状态，不把可用菜单重新禁用。

如本模块仍有“为你推荐目的地与玩法”，仅将其改为“为您推荐目的地与玩法”，不做全仓文案重构。

## 5. 文件范围与禁止事项

主要修改文件：

```text
src/features/personal-center/personal-center.module.css
```

确有必要才修改以下文件，并在 Result 解释原因：

```text
src/features/personal-center/components/personal-center-shell.tsx
src/features/personal-center/components/personal-sidebar.tsx
src/features/personal-center/components/personal-home-preview.tsx
```

允许更新本 Task、创建本 Result、增加本任务专属局部测试/验收脚本与截图证据，以及定点维护 `docs/project/WBS-TravelAssist.md` 的本补充追踪行。

禁止改动：素材 SVG/设计源、其他历史 Task/Result、首页、Step1–5、Planner、Map、AI、主 Header、共享主题、认证/Session/API/数据库、依赖/锁文件、工程配置和工作流。不得新增 Logo、照片、用户肖像或图标图片。不得为消除全仓既有告警进行越界修复。

## 6. 验证与证据

### 6.1 静态检查

使用执行时仓库规定的 Node/npm 与锁定依赖，不升级、不擅自批准安装脚本。按当前安装策略准备环境后运行：

```text
npm run lint
npm run typecheck
npm run format:check
npm run build
git diff --check
```

对实际修改文件另外运行局部格式检查。优先复用已有测试工具；如已有相关测试，运行并记录命令。不得为了本任务新增测试依赖或编造不存在的 npm script。

全仓失败与本任务引入的失败分开记录；对失败文件与执行前基线比较，不照抄旧文档的“3 个失败”或“8 个失败”为当前结果。对 WBS 大表只定点变更，不自动格式化整表。已明确接受的相同基线例外可引用原记录；新增或变化的失败不得自行豁免。

### 6.2 浏览器与截图

测试五路由：

```text
/personal-center
/personal-center/trips
/personal-center/preferences
/personal-center/companions
/personal-center/account
```

| 检查 | 必须提供的证据 |
| --- | --- |
| 两张 SVG 生效 | 正常加载请求无 404；图片成功解码；`.main` computed background-image 含正式 URL；截图可见 |
| 桌面布局 | 首页 1920×1080、1440×900、1280×720 同条件修改前/后截图 |
| 窄屏回归 | 390×844、320×740 修改后截图；不要求新设计移动导航 |
| 五路由与共享布局 | 直达、导航跳转、前进/后退正常；Shell/Sidebar/TopActions 保持挂载；active 正确 |
| 导航优先 | 1280×720 五项导航及焦点完整，不因插画挤压或遮挡 |
| 无横向溢出 | 检查页面、Shell、Sidebar、内容区自身 scrollWidth/clientWidth，不能靠 overflow-x:hidden 掩盖问题 |
| 5.2 不回退 | 菜单开关、外部点击、Esc、焦点返回、菜单跳转；至少补一张菜单展开截图 |
| 背景降级 | 测试中阻断主纹理请求，纯色 fallback、文字、导航和菜单仍可用；恢复后重验 |
| 运行错误 | 正常场景无新增 console error/pageerror；故障注入预期网络错误单独记录 |
| 范围 | 两个 SVG 无 diff；无越界文件、依赖变化或真实业务新增 |

至少完成一个实际可用桌面浏览器验收，记录浏览器名称/版本。只测试 Chromium/Edge 时不得宣称 Safari/Firefox 已验证。没有浏览器就记录“视觉验收未执行”，不得写 Passed 或宣称整项完成。

截图使用本任务独立目录或 PR 附件，记录可由审查者访问的地址；不得只报本地缓存路径。建议提交最小证据集至 `docs/qa/wbs-5.1-visual-assets/`，执行脚本放在同目录；不提交 node_modules、构建目录或含个人敏感信息的截图。

## 7. Issue / Task / WBS 同步与提交

1. 开工前复用 Issue #67。Master WBS 当前 Task 追踪表没有本 Task 时新增一行，有则续用；只维护该行，父 WBS 5.1 与 5.2 始终保持原已完成状态，不新增未经设计的 WBS ID。
2. 本补充任务状态映射：Task 待开始/进行中/待验收/已完成，对应 WBS 追踪行可开始/进行中/待审查/已完成；无法执行时两者记录阻塞并注明原因。
3. 代码完成后创建本 Result、记录真实测试和截图，Task 为待验收、Issue 保持 Open、本补充追踪行为待审查。
4. Commit subject 包含 `WBS-5.1-B-VISUAL-POLISH`；仅提交本范围文件。实现 PR 目标 develop，引用 Task、Result、Issue #67，并使用 `Closes #67`。检查现有自动 PR，避免重复创建。
5. Task 文档发布 PR 只用 `Refs #67`，不可因发布文档关闭实现 Issue。实现提交/PR 字段保持 PENDING，直到真正产生。
6. 实现 PR 合并并验收通过后，从最新 develop 核验结果，再同步本 Task、Result、WBS 补充行为已完成，补齐 Commit/PR，在 Issue 评论结果并关闭。
7. 自动合并不等于验收通过；若被自动关闭但仍未验收，按追踪规则重新打开 Issue。真实缺陷导致验收失败时记阻塞；单纯缺少视觉验收证据时保持待验收并说明。
8. 回滚本任务只还原本任务引入的代码 hunk，不覆盖素材、不回退整个 CSS 或他人的提交。

## 8. Definition of Done

- [ ] 正式主纹理在真实页面生效，不只是文件存在或 CSS 里出现路径。
- [ ] 侧栏插画正确，短屏导航优先，五路由与已完成 5.2 行为不回退。
- [ ] 三组桌面前后截图、两组窄屏截图和头像菜单截图可查阅。
- [ ] 正常加载与背景失败 fallback 均经过实测。
- [ ] 本任务静态检查/构建通过，基线例外和未执行项清楚记录。
- [ ] 两张素材未被改写，没有新依赖、越界变更或新增业务。
- [ ] 实现 PR 已合入 develop，验收通过，Issue / Task / Result / 本补充 WBS 行同步完成。

## 9. Codex 返回格式

```text
WBS-5.1-B-VISUAL-POLISH Result
Status:
Owner: B
WBS: 5.1（独立补充；父项保持已完成）
Issue: #67
Task File:
Result File:
Execution Base:
Branch:
Implementation Commit:
Implementation PR:

Main background actually displayed:
Sidebar artwork/cropping verified:
Existing 5.2 menu preserved:
Asset files changed: No / 若不是 No 则说明违规原因
Files changed:

Validation（逐项写 Passed / Failed / Not Run）:
Screenshots（可访问位置）:
Baseline exceptions:
Remaining blockers:
WBS supplemental row synced:
Parent 5.1 / 5.2 records unchanged:
Issue synced:
```

**交付目标是让已上传素材在现有网页上正确实装，并提交可检查的运行证据；不是再生成一份概念图或交接说明。**
