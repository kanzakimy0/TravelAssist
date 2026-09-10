# TASK-030-B Result

## Status

**审计 / 专项测试 / 浏览器 QA 已完成并获用户明确授权发布；WBS 3.3 = Owner B / 待审查；Draft PR [#273](https://github.com/kanzakimy0/TravelAssist/pull/273) → develop。**

首页入口实现正确，本次运行时代码零改动。未合并 develop，未开始后续 Task。全仓测试不是全绿：713 项中 711 通过，2 项旧素材清单失败在未修改的 execution base 上同样复现。

## Preflight

- execution base: b783a101285359a9118d224ae05b1b7c26a498f7（2026-09-10 最新 origin/develop；最终 fetch 未变化）。
- 已执行 git status --short、git branch --show-current、git fetch --all --prune、git rev-parse origin/develop、git log --oneline -20 origin/develop。
- 已读取远端正式 Task、WBS-3.3-owner-correction.md、Master WBS，以及 CTA / shared ButtonLink / Start route / 草稿与方案交接源码和既有测试。
- 3.1 dependency: Master WBS 为已完成，满足启动条件；3.2 已完成并冻结视觉。
- owner correction: TASK-030-B / Owner B，是 WBS 3.3 单项例外。只修改 3.3 Owner，不顺带重分配其他行。
- working tree safety: 原 C:/Users/Administrator/Documents/ChatGPT/TravelAssist 为 feature/b-travelassist-engine-contract，开始时干净且未作修改；之前首页工作区为 codex/home-footer-account-visibility，也未改动。新建 F:/CodexWorktrees/TravelAssist-TASK030 独立工作区。
- 基线复验另建 F:/CodexWorktrees/TravelAssist-TASK030-baseline，detached 于 execution base，源文件无修改；仅复用锁定 node_modules 运行检查。

## Tracking

- WBS 3.3: B / 待审查；启动记录 8935e3f，先登记进行中；最新 Master WBS 只更新本任务行与追踪记录。
- Issue: [#260](https://github.com/kanzakimy0/TravelAssist/issues/260)，保持 Open；记录完整 Result、执行基线、分支、Draft PR 与两项既有 baseline test failure。
- Remote branch: origin/feature/b-wbs-3-3-main-entry。
- Commit: 45e66cecd530947716feddd154a470dc66e236b8（测试 / QA）；2f922e1c27ea0ab19c88af831eef8a4faa51b0d7（本地收口）；最终发布追踪提交见 Draft PR head。
- Draft PR: [#273](https://github.com/kanzakimy0/TravelAssist/pull/273)，feature/b-wbs-3-3-main-entry → develop，Open / Draft，不自动合并。
- Result URL: https://github.com/kanzakimy0/TravelAssist/blob/feature/b-wbs-3-3-main-entry/docs/tasks/RESULT-TASK-030-b-main-entry-closeout.md。
- 发布授权：用户于 2026-09-10 明确授权推送当前同名分支、Result / Master WBS / Issue #260 同步及创建 Draft PR。此前自动审批拒绝记录保留为历史，当前发布门已解除。
- 本轮发布只有文档追踪更新，运行时及素材代码没有改动；不修复无关的两项素材基线失败，不启动后续 Task。

## Existing Implementation Audit

- HeroStartButton: shared ButtonLink href="/start"，无手动 router.push、登录前置条件、spinner、debounce 或重复激活防护补丁。
- ButtonLink: 直接透传 props 给 Next Link，最终为原生 anchor；保留正常浏览器历史及无 JavaScript 的文档导航。
- HomeHero: Guest / 已核验账户都只有一个相同主 Start CTA；账户入口与 CTA 分开，不把 CTA 变成 Login。
- aria-describedby 指向唯一存在的 start-flow-note，内容为“进入旅行需求填写流程”；箭头 aria-hidden，不污染 accessible name。
- /start route: 读取现有 entry 参数并渲染 StartPage；普通 /start 不附加参数，不强制重置草稿当前步数。
- runtime changes required: **No**。src / public / assets / package 与 lockfile 相对 execution base 无改动。
- 在既有 tests/task-025-2-concept-fidelity.test.mjs 扩展 3 项 TASK-030-B 测试，复用真实 TSX 渲染 harness；未删除、替换或弱化 TASK-010 / 024 / 025.2 覆盖。

## Main Entry

四尺寸 1440×900、1024×768、390×844、320×568，各 Guest + signed-in fixture，共 8 组全部通过。

- click → /start: 精确 URL，无 query、Login 或 Planner 中间跳转；触摸尺寸使用 tap。
- keyboard: Tab 可达，Enter 激活；真实链接 accessible name 为“让我们开始吧”，可见实线 focus ring。
- guest: 不要求登录，进入 Wizard 后仅初始化现有旅行需求草稿，不自动生成或保存 Trip。
- signed-in: 复用 TASK-024/025.2 本地已核验资料 fixture，首页显示“验收账户”而不是 Cookie 中伪造姓名；同一个 CTA 进入 /start。未调用真实 Auth 生产服务。
- repeated activation: 三次快速点击、三次 Enter 均正常进入 Start，单次 Back 返回 Home，无明显重复 history entry、自动生成或写 API 副作用。
- back / forward: Home → Start → Back → Home → Forward → Start，URL / 页面一致；草稿原样保留。
- native no-JS link: 额外 1 组关闭 JavaScript 后原生链接仍导航到 /start。既有互动 Wizard 本身需要 JavaScript，不把其恢复占位误报成无 JS 完整向导能力。
- 8 组无 console / hydration 错误、无非 GET/HEAD/OPTIONS 浏览器请求。主 CTA 可见且命中点不被 Account / Footer / AI / Header 遮挡，宽高均大于 44px。

## Regression

- Home: 四尺寸主 CTA 完整可达，零横向溢出、CLS=0；Guest 各元素几何及计算样式与已验收 account-capsule 报告逐项完全一致。
- Start Wizard: UI 选择日本熟悉度、自然风景、滑轨、同行成人数；前后步切换、保存、刷新、返回 Home 后再次 CTA 进入均保留草稿内容及当前步数。
- Planner handoff: 沿既有“生成方案 → 三个示例方案 → 选择深度慢游 → 进入详细路线”；核实 slow-depth → depth 一次性交接已消费，Planner depth 行实际 data-selected=true 且按钮 aria-pressed=true。平板 / 手机通过既有“旅行设置与方案”折叠入口查看，无产品代码修改。
- visual freeze preserved: Yes。首页背景 / Header / Logo / Hero / CTA / Account / Help / Footer / AI 均未修改；Start、Planner、Personal Center 几何和业务代码保持。

## Validation

| Check                 | Result                                                                 |
| --------------------- | ---------------------------------------------------------------------- |
| npm ci                | PASS；395 packages，audit 0 vulnerabilities                            |
| npm run lint          | PASS；最终修改的两个测试/QA 文件另经 ESLint 通过                       |
| npm run typecheck     | PASS                                                                   |
| npm run build         | PASS（生产构建、本地 fixture 环境）                                    |
| npm test --if-present | 执行完成；仓库没有 test script                                         |
| full tests            | **711/713 PASS，2 FAIL**；未修改基线 **708/710 PASS，完全相同 2 FAIL** |
| TASK-030 tests        | 3/3 PASS；既有 main-flow tests 在全仓中继续通过                        |
| browser QA            | 8/8 完整主流程 + 1/1 原生无 JS 链接 PASS；40 张实际 PNG                |
| git diff --check      | PASS                                                                   |
| runtime / asset diff  | 0                                                                      |

全仓命令：node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs。
专项命令：node --test --test-name-pattern='TASK-030-B' tests/task-025-2-concept-fidelity.test.mjs。
浏览器命令：设置 PLAYWRIGHT_MODULE 后执行 node tools/qa/task-030-main-entry-check.mjs。

证据：docs/qa/TASK-030/browser-report.json、test-report.json、asset-baseline-diagnostic.json 和 README.md。
截图：F:/CodexWorktrees/TravelAssist-TASK030/.cache/qa/task030/screenshots/。
预览：http://localhost:3133/。

## Problems / Deferred

1. **既有素材基线失败，没有伪报全绿。** 两项失败为 complete library passes file, schema, hash, rights and protected checks 与 nightly --verify-only does not write canonical catalogs。legacy-inventory.v1.json 的四个 assets/design SVG 记录为 CRLF 字节/哈希，git blob 与实际 checkout 为 LF。四项记录都与转换成 CRLF 的内容精确匹配；在未修改 b783a10 上复现相同失败。当前任务没有改清单、素材或验证器，保留失败让素材维护工作单独修正。
2. **历史发布门已解除。** 先前因本轮仅附件而被自动审批拒绝推送；用户在 2026-09-10 明确授权发布后，已推送指定分支并创建 Draft PR #273，同步 Task / Result / WBS / Issue。该历史不再是当前 blocker。
3. 真正线上认证、AI / Route / Map / Booking / DB 均不在范围。Signed-in QA 是既有隔离 fixture，不代表线上身份服务验收。
4. 未实施 3.2.1 / 3.4 / 3.5 / 3.7，不新增依赖、Client Component 或中间 Loading 页面。

## WBS Updated

Yes：已在发布分支同步 3.3 Owner B、进行中 → 待审查、branch / tests / Result / Issue / Draft PR 追踪，保留其他工作站最新记录。develop 上的合入更新等待本 PR 验收与合并。

## Ready For Review

Yes：Draft PR #273 已发布供审查，含明确的两项既有基线测试失败。最终验收与合并未执行，WBS 3.3 保持待审查，不自动进入 3.4 / 3.5 / 3.7。
