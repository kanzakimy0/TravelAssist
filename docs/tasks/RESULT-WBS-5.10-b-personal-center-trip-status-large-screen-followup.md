# WBS-5.10-B-FOLLOWUP-1 — 执行结果

## Metadata / Tracking

- Owner：B；Follow-up：**待审查**；Issue：[#193](https://github.com/kanzakimy0/TravelAssist/issues/193)（Open）。
- Workspace：`F:\TravelAssist`。
- Draft PR：[#197](https://github.com/kanzakimy0/TravelAssist/pull/197)，base=`develop`，保持 Open / Draft。
- 实现提交：`053457c`，已推送指定分支；本记录随后以文档提交回填。
- Branch：`fix/b-personal-center-trip-status-large-screen-polish`；Base：`develop`。
- 执行基线：`64be3bae73b80eaae6ad59471761e4b70a4b6aa5`。
- Parent 5.1 / 5.4 / 5.6 / 5.10 / 5.20 保持“已完成”；5.3 保持“未开始”。
- 不自动合并、不关闭 Issue、不开始其他 Task；等待用户验收。

## Preflight

依次执行 `git status --short --untracked-files=all`、`git fetch --all --prune`、`git switch develop`、`git pull --ff-only origin develop`、`git log -1 --oneline`。由 `0317b7c` 快进至 `64be3ba`，随后创建指定实现分支。

初始未追踪文件 `README.txt`、`asset-contact-sheet.jpg`、`publish_assets.py` 全部保留，不提交、不移动、不删除。远端为 `https://github.com/kanzakimy0/TravelAssist.git`。

完整读取当前 Task、其全部 Source of Truth、根 AGENTS.md 和已安装 Next.js 的 Server/Client Components、CSS 指南。Issue #193 为 Open；预检 PR 搜索与相关实现分支搜索均无重复。执行过程中仅更新当前 Task / Result 与 Master WBS 独立 Follow-up 记录。

## Trip Timing / 可迁移边界

新增 `src/features/trip-library/trip-timing.ts`，不依赖 React、浏览器、系统时钟或日期库。`getTripTiming(startDate, endDate, today)` 使用严格 date-only 校验及整数日差：

| 条件                                   | 状态      | UI            |
| -------------------------------------- | --------- | ------------- |
| 出发距今天 >30 天                      | next      | 下一次旅行    |
| 出发距今天 2–30 天（含边界）           | upcoming  | 即将出发      |
| 出发距今天 <2 天，且结束日期未早于今天 | ongoing   | 旅行进行中    |
| 结束日期早于今天                       | completed | 已完成 / 历史 |

结束当日仍进行中；无效日期、反向日期不猜测分类。Hero 依次优先 ongoing、upcoming、next，同状态按 startDate 升序，ID 稳定打破并列。草稿、历史快照、已结束 Trip 永不进入 Hero。纯 helper 同时提供混合卡排序和 8 卡分页，便于未来 Mobile App 复用。

React 适配器 `use-trip-today.ts` 单独取得浏览器本地日历日期，通过一致的 SSR snapshot 避免构建日期固定及 hydration 差异；每 30 秒和页面重新可见时检查日期。未冻结正式 Trip timezone Contract。

## Personal Home

- 首页读取 `createTripLibraryFixture()`，与旅行库使用相同 Hero 选择函数、状态文案和正式 Trip 数据。
- Hero 最多一张；下方最多三张正式/已完成旅行预览，排除 Hero，不混入收藏或草稿操作。
- 动态标题、日期、同行人数、旅行时长；无可展示 Hero 时给出明确空态。
- 保留更多功能和 `/planner` Mock bridge；只添加必要标题换行与空态样式，未接真实 Planner Contract。

## Trip Library

- All 显示“全部旅行”，仅包含未结束正式 Trip + Draft，不计入 History/Favorites。
- Hero 仍由正式 Trip 选取；下方混合卡区排除 Hero。
- 默认日期近→远；Draft 增加 presentation-only `startDate?`，有日期一起排序；无日期后置，再按 updatedAt 降序。不解析 dateLabel。
- All 每页最多 8 张实际卡片；fixture 3 个正式 Trip + 7 个 Draft，排除 Hero 后 9 项，第二页可实际到达。
- 草稿显示“草稿 / 规划完成度 / 最后编辑时间”，保留独立 Draft Tab 继续编辑、删除、外部预订警告。
- Upcoming 只含 2–30 天；已结束正式 Trip 派生到历史展示，最近完成区在大屏也可访问。历史复制与收藏仍为不可变、页内操作。
- 保留旧 phase-based model exports 供历史调用兼容；两个页面不再使用旧 selectNextTrip/shouldShowNextTripHero 判定。

## Companion Wide Layout

仅追加 `>=1440px` CSS：1220px 上限并居中，Summary 总数 / 年龄计数 / 操作三段，同行人三列，卡片自然高度，lower grid 约 60/40、顶部对齐。现有 Drawer/Sheet、Self、年龄规则、组合验证、保存/删除/未保存确认逻辑均未修改。

## Account Wide Layout

仅追加 `>=1440px` CSS：1220px 上限，Profile 8/12 主区跨两行，联系方式与基本设置位于 4/12 次列，紧急联系人和三个 Account Entry 位于全宽下层。编辑状态保留相同卡片尺寸及保存栏空间。字段、联系方式、建议值、紧急联系人、路由、Save/Cancel/Validation 均未修改。

## Browser QA

生产预览：`http://localhost:3001`，使用 `npm run build` 后的 `npm run start -- --port 3001`。

- 外部 Playwright：`1.62.1`，通过 `CODEX_PLAYWRIGHT_PATH` 复用已有 runtime，不添加依赖。
- Microsoft Edge：`152.0.4191.66`，真实执行。
- Chromium：`151.0.7922.34`，真实执行。
- Firefox / WebKit：Deferred，当前无 runtime，未安装。
- Safari：未测试，无真机证据，不声明 PASS。

以下每一格均覆盖首页、旅行库、同行人、账户四路由：

| Viewport  | Edge | Chromium | 主要验证                          |
| --------- | ---- | -------- | --------------------------------- |
| 2560×1440 | PASS | PASS     | 1220px 居中、三列、主次比例       |
| 1920×1080 | PASS | PASS     | lower grid 60/40、账户编辑稳定    |
| 1600×900  | PASS | PASS     | 大屏密度、操作可达                |
| 1440×900  | PASS | PASS     | Wide 起点、日期 Hero、分页        |
| 1280×720  | PASS | PASS     | 原 Companion/Account 区块几何不变 |
| 1024×768  | PASS | PASS     | 原 Compact 区块几何不变           |
| 768×1024  | PASS | PASS     | Tablet Drawer / Escape / 焦点归还 |
| 390×844   | PASS | PASS     | Mobile Sheet、编辑/取消、分页     |
| 320×740   | PASS | PASS     | 小屏换行、按钮可达、无横向溢出    |

共 72 个路由/视口检查。两种浏览器另各执行 8 个显式日期场景（31/30/2/1 天、出发当天、途中、结束当日、结束后），每个场景对比 Home / Trips Hero 一致性和严格 Upcoming 分类。所有视口均验证 All 含正式卡/草稿、Hero 去重、8+1 分页、键盘翻页、搜索空态与复位、草稿外部警告、历史/收藏可达、同行人 Escape/焦点归还、账户编辑/取消。

生产测试无 pageerror、hydration error 或业务网络错误。浏览器请求缺失的 `favicon.ico` 出现 404，为未修改的基线，单独列入 knownBaseline，不计为业务请求 PASS。

## Evidence / Reproduce

- Runner：`tests/personal-center-followup.browser.mjs`。
- 专项测试：`tests/trip-status-personal-center-followup.test.mjs`。
- 结构化结果与日志：`docs/evidence/WBS-5.10-B-FOLLOWUP-1/`。
- 原始截图：`.next/qa/WBS-5.10-B-FOLLOWUP-1/screenshots/`；压缩备份 `docs/evidence/WBS-5.10-B-FOLLOWUP-1/screenshots.zip`。
- 截图不作为新产品素材加入资产 catalog。优化前截图/metrics 用于 <1440px 几何比较；生产版截图使用 `edge-` / `chromium-` 前缀。

```powershell
$env:CODEX_PLAYWRIGHT_PATH = 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
$env:WBS_BASE_URL = 'http://localhost:3001'
$env:WBS_EVIDENCE_DIR = 'docs/evidence/WBS-5.10-B-FOLLOWUP-1'
$env:WBS_BROWSER = 'edge' # 第二次改为 chromium
node tests/personal-center-followup.browser.mjs
```

## Validation

| Command                                    | Result                                                      |
| ------------------------------------------ | ----------------------------------------------------------- |
| node --version / npm --version             | v24.18.0 / 11.16.0                                          |
| npm ci                                     | PASS，362 packages，0 vulnerabilities                       |
| npm run lint                               | PASS                                                        |
| npm run typecheck                          | PASS                                                        |
| npm run format:check                       | 29 份历史文件格式基线失败；当前任务文件均通过，不越界格式化 |
| 本 Follow-up owned files targeted Prettier | PASS                                                        |
| npm run test --if-present                  | **NO-OP**，package.json 无通用 test script，不记为 PASS     |
| node --test tests/*.test.mjs               | **441 PASS / 3 FAIL / 444 总计**，仅剩已确认的资产 baseline |
| 显式专项 + 既有旅行库 tests                | **33/33 PASS**（本轮 16 + 原旅行库 17）                     |
| 授权修正的三个历史测试文件                 | **33/33 PASS**（5.20：16；5.4：5；9.12：12）                |
| npm run build                              | PASS，生产构建及 21 页生成成功                              |
| git diff --check                           | PASS                                                        |

未修改 package.json、lockfile 或 Workflow；未安装浏览器依赖。Node 的 MODULE_TYPELESS_PACKAGE_JSON 警告为原有 TypeScript 测试加载方式，不为消除此警告改包配置。

## Problems / 历史差异

全仓 Node tests **不是全绿**。首轮为 439 PASS / 6 FAIL / 445 总计；随后按用户明确授权，仅修正指定的三个历史测试文件，当前为 441 PASS / 3 FAIL / 444 总计，未跳过失败用例。下列 1–2 共三项资产 baseline 仍失败，3–5 已修正；保留发现与处置记录：

1. `task-013-1-asset-variants.test.mjs` 的 verify-only 与 full catalog coverage 两项：用户原有未追踪 `asset-contact-sheet.jpg` 不在 catalog，且四个旧 SVG 有 source-protection 差异。截图已移出扫描范围，最终 coverage 新增项仅为用户原文件。
2. `task-013-assets.test.mjs`：四个未修改 SVG 的 inventory stale：`ai-trip-flow.svg`、`home-concept.svg`、`preference-panel-concept.svg`、`trip-planner-concept.svg`。资产目录、catalog、工具均无本轮改动。
3. `wbs-5-20-personal-center-responsive-states.test.mjs`：旧断言固定旧提交以来的精确文件清单，不能容纳明确授权的 data/model/helper 改动。**已修正**：只删除永久 Git 文件白名单测试，其余 16 项 responsive/state/focus/navigation/integration-boundary 测试保持不变。
4. `wbs-5.4-v2.test.mjs`：旧断言要求四个图片路径字面量出现在 Home TSX。**已修正**：执行真实 Home + 当前共享 fixture + timing helper，固定测试日期 2026-03-01，断言四项 approved 图片实际渲染且对应 public 文件存在、非空；保留其他素材和禁止旧素材断言。
5. `wbs-9-12-personal-center-qa.test.mjs`：旧断言将整个工作区 status 限制在旧 9.12 文件白名单。**已修正**：移除工作区白名单部分，保留同一测试内的无集成边界断言，其余 11 项 QA/responsive/accessibility 测试保持不变。

三项资产 baseline 继续作为待审查事项呈报，不越界修复、不声称通过。当前 Follow-up 引入的历史断言失败已消除。当前 Task ID 以外的历史 Task / Result 均未修改。

旧 history fixture 中 `history-hokkaido-2027` 在当前 2026 年仍为未来日期；保持原快照数据，只在已结束后显示于历史，未将其误标为当前已完成或提升为 Hero。日期规则优先于旧 fixture 的 phase 标签。

优化前采集曾将所有浏览器页时钟拨到 2027 年，触发旧同行人年龄与服务端年龄不一致；最终 runner 将模拟日期隔离到 Home/Trips，同行人和账户使用真实时钟。优化期间 HMR 曾出现 Router 初始化错误；最终生产版两浏览器复验无该错误。早期基线记录保留，不冒充最终通过证据。

## 用户授权的历史测试修正（2026-09-08）

- 本轮起点：`71a276485874720fcc66c3e99a3afd68701b9a4d`，继续使用原分支、PR #197、Issue #193。
- 仅修正用户指定的三个测试文件；相对本轮起点，Runtime、package/lockfile、Workflow、资产及资产工具均零改动。
- 使用现有 TypeScript/React 在 Node 内存中编译并渲染 Home；只适配 Next 装饰组件与显式测试日期，不伪造共享 fixture。没有新增 package dependency。
- 逐项比对测试函数：5.20 其余 16 项、5.4 其余 4 项、9.12 其余 11 项均保持原测试体。总数 445 → 444 仅因为移除一项非业务的永久 Git 文件白名单测试；不是跳过业务测试。
- 重新执行 `node --test tests/*.test.mjs`：444 总计，441 PASS，3 FAIL，0 skipped/cancelled/todo。失败均为上节已确认的资产 baseline。
- 三个修正后的测试文件共 33/33 PASS；重新执行 lint、typecheck、build、git diff --check 均 PASS。当前修改文件的 targeted Prettier PASS；全仓 format:check 的旧结果仍保留，不宣称全仓格式通过。
- 新日志为 `docs/evidence/WBS-5.10-B-FOLLOWUP-1/historical-tests-repair-*.log`；原始 `node-tests.log` 保留首轮六项失败快照，不覆盖旧证据。
- 本轮没有重新执行浏览器矩阵；上节 Browser QA 为先前 Runtime 的验证记录。Runtime 不变，继续等待用户最终视觉验收。
- `README.txt`、`asset-contact-sheet.jpg`、`publish_assets.py` 仍未追踪，SHA-256 与本轮预检一致，未修改、删除或提交。
- Follow-up 保持“待审查”，PR 保持 Open / Draft，Issue #193 保持 Open；Parent WBS 的完成状态及 5.3 状态不变。

## Ownership / Git / Stop

- Companion / Profile TSX 零改动；仅各自 CSS 的 >=1440px 规则改变布局。
- Planner / Map / Start Flow / Preference / DB / API / Supabase / Auth / localStorage / Cookie / Session / dependencies / Workflow 零实现改动。
- Master WBS 仅追加本 Follow-up 的独立追踪，Parent 完成状态及 5.3 状态不变。
- 只精确暂存本 Task 文件，不使用 `git add .`、clean、hard reset、force push。
- 已提交/推送指定分支并创建 Draft PR #197，base=develop、`Relates to #193`；Issue #193 更新待审查说明并保持 Open。等待用户验收，不自动开始其他任务。
