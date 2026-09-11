# RESULT — TASK-046-B / WBS 5.14 Planner-readable Preference Contract v1

- Result：**PASS — Producer implementation and mandatory QA complete**。
- Ready for User Acceptance review：**Yes**；不代表最终用户或 Consumer 已接受。
- **A / designated integration reviewer：Pending；用户验收：Pending。** 未伪造人工通过。
- WBS 5.14：**待审查**，实际更新中央 Master 状态单元格；未标已完成。
- Issue：[#321](https://github.com/kanzakimy0/TravelAssist/issues/321)，保持 **OPEN**。
- PR：[#323](https://github.com/kanzakimy0/TravelAssist/pull/323)，**Draft → develop**，正文含 Refs #321。
- 分支：`codex/b-account-wbs-5-14-planner-preference-contract`。
- 日期：2026-09-11。

## 1. 基线与启动门禁

执行原工作区的 status / branch / fetch --all --prune / rev-parse / log -15 后，从当时最新干净 `origin/develop@6750a50d9fc49e561e60d25e7ebfc90c76c60a60` 创建独立工作树 `F:/CodexWorktrees/TravelAssist-TASK046`。原工作区 `fix/quality-gate-baseline-repair` 保持不变。没有从规格分支或 #221 开发，没有 feature 分支、hard reset、git clean、force push。

完整正式设计、Task、launcher 来自 `origin/task/b-wbs-5-14-planner-preference-contract@0cbb660cfcecfcd65dd125ec7f6ba57cfe6c6f4f`，原发布基线 `de83a1d6cf33eadc9107a529cb1e9590c95d43a4` 保留为历史。已核对 #321 OPEN；5.11 / 5.16 主表已完成，#309 merge `783f00cfe48565710203a952ab6dd5123e58a793` 与 #319 merge `8bf4198a029c34c38af962840895695126058728` 均为执行基线祖先。基线没有另一个 canonical 5.14 实现。

开始时中央 5.14 已为「进行中」，保留启动事实。实现、真实 DB/browser 与部署产物门禁全部通过后才改「待审查」。5.11、5.12、5.16 和其他 WBS 行均不变。

实现与部署产物 commit：**`597518e8d1e898ecb4466fa68da60d24b87c168c`**。后续提交只收口本 Result、设计当前阶段、WBS 状态和 PR 链接；最终发布 head 由交付消息与 PR 显示。

## 2. 唯一 core / 兼容证明

5.11 原实现机械提升到 `src/shared/contracts/preferences/core.ts`，只改顶部归属说明。旧 `features/preferences/domain/preference-v1.ts` 仅兼容 re-export。5.16 的纯 resource/envelope 实现机械提升到 `shared/contracts/preferences/persistence-resource.ts`，只改 core import；旧 `features/preferences/persistence/preference-resource.ts` 仅 re-export。

本次测试逐 export 比较旧/新路径引用相同，并将新源码与执行基线 blob 精确比较（除上述说明/import）。原 23 keys、16 InterestCode、父子 DetailCode、walking 五档、style 七轴、Hard/Soft、64 KiB、严格 descriptor、异常类型、set/unset、whole-map replacement 与最终结果校验完全保留。没有第二份 registry/parser；没有 shared → features 依赖。原 TASK-042 / TASK-045 测试文件及其行为断言全部未修改。

## 3. 公共只读合同与读取入口

`shared/contracts/preferences/index.ts` 显式导出：

- PREFERENCE_READ_CONTRACT_VERSION、LongTermPreferenceReadV1、ReadonlyPreferenceV1、DeepReadonly。
- parseLongTermPreferenceReadV1、toLongTermPreferenceReadV1、PreferenceReadValidationError。
- PreferenceReadResultV1、PreferenceReadErrorCode。
- preferenceKeys、interestCodes、interestDetails、walkingToleranceValues；必要的 key/strength/interest 类型。
- preferenceStrengths（从唯一 registry 派生，不复制手写强度表）。
- 三个明确 synthetic 的 missing / reset / explicit fixtures。

公共 index 不 export star，不暴露 patch/save/reset、数据库、私有 UI、UI tier 或 field parser 元数据。输出是独立且递归冻结的数据，仅含 contractVersion、scope、sourceRevision、sourceUpdatedAt、preference。JSON round-trip 保持事实。

revision 0 仅允许 empty + null time；正 revision 的 reset-empty 保持正版本与 DB 时间。拒绝非整数/负数/超过当前 DB integer 范围 `2147483647` 的来源版本。ISO 时间验证实际日历日期、时分秒和 Z/offset，保留 DB 微秒，不用 Date.parse 的宽松结果冒充严格时间，不生成当前时间。

浏览器 `src/lib/preferences/client.ts` 的 readCurrentLongTermPreference 只调用现有同源 GET，Cookie credentials same-origin、cache no-store、可取消；没有自报 owner、凭据存储、跨账户缓存或写入入口。

服务器 `src/server/preferences/public-read.ts` 的 readCurrentLongTermPreferenceForRequest 直接复用既有 handlePreference(request, "get")。没有复制 Auth/getUser、没有 service-role 绕过。返回 result + finish；finish 在成功和失败组合响应上回传真实刷新/删除 Cookie、private/no-store 与安全 headers，保留消费者 Cookie/Vary。

AUTH_REQUIRED、AUTH_UNAVAILABLE、PREFERENCE_UNAVAILABLE、INVALID_PREFERENCE_RESPONSE、UNSUPPORTED_PREFERENCE_VERSION、REQUEST_CANCELLED 都是显式失败，不替换为空偏好。Parser 区分不支持 contract/schema 版本和其他损坏响应；不泄漏 owner/token/SQL/堆栈。

## 4. 5.16 wire、UI 与 23/43 边界

GET/PATCH/reset route、http.ts、repository.ts、Auth Core、RLS 和全部原 UI 文件没有修改。GET 仍是 `{ok:true,data:{preference,revision,updatedAt}}`；公共投影在 wire 外完成。缺行不建行、首写 0→1、stale/concurrent loser 409、Reset、same-origin mutation 与 no-store 保持。

长期 23-key 读取不是 planning/features.ts 的 EffectivePreferenceV1（43×1–9 + snapshotRef/overrideRevision），也不是 AI-only SparsePreferenceV1。新增独立 type fixture 证明不可赋值并验证递归 readonly，没有生产 converter、23→43 权重、neutral 5 补齐、snapshot 伪造或 A 合同修改。hard 排除不降为 soft score，false child 不解除 true parent；style.planning 不授权 AI。

读取是 request-time 长期事实，不是 Trip snapshot。4.18 消费接线、5.18 snapshot/override、7.9/后续明确映射校准、5.13 defaults 均未交付/未启动。

## 5. 本次实际 QA 计数

所有下表测试均在本 Task 的工作树实际重新运行；不是引用前一 Task 的 PASS。所有列出的测试 0 fail / 0 skipped。

| 检查                                                     | 本次结果                                                  |
| -------------------------------------------------------- | --------------------------------------------------------- |
| npm ci（锁定依赖，复用本地 npm cache）                   | PASS，0 vulnerabilities                                   |
| 新合同 / facade / A-like / 依赖边界                      | **540/540 PASS**                                          |
| 新真实 Local 公共读取 / Auth / API / browser             | **9/9 PASS**（1 父测试 + 8 场景）                         |
| 5.11 Preference pure                                     | **503/503 PASS**                                          |
| 5.11 Preference real DB                                  | **505/505 PASS**                                          |
| 5.16 API pure                                            | **37/37 PASS**                                            |
| 5.16 real API/browser                                    | **17/17 PASS**（1 父测试 + 16 场景）                      |
| Profile real DB                                          | **25/25 PASS**                                            |
| Companion real DB                                        | **147/147 PASS**                                          |
| 全仓 CI loader tests/*.test.mjs                          | **2072/2072 PASS**，含现有 UI/Profile/Companion pure 回归 |
| lint / typecheck / build                                 | PASS                                                      |
| deploy:validate:local                                    | PASS，local development target                            |
| deploy:build:local / deploy:verify-artifact              | PASS；commit 597518e，1746 files，failures=[]             |
| format:check:deploy                                      | PASS                                                      |
| 新增/机械提升/修改源码、测试、Task/handoff 文档 Prettier | PASS                                                      |
| git diff --check                                         | PASS                                                      |
| db:start / status / reset / types / stop                 | 分别真实执行并 PASS；最后已 stop                          |

环境：Windows、Node 24.18.0、Supabase CLI 2.116.0、真实 Local Docker、Next 16.3.4、实际 headless Microsoft Edge + Playwright。db reset 前验证 local endpoint、travelassist project label、Auth/Preference/Companion 表为空；仅重置此专用可丢弃实例。DB 套件顺序执行。

真实 `db:types` 重新生成后无 diff，SHA-256：`2A7D374BE90755CAE372F566947A21834028A51D226D8BC74F9F97E76193CB26`。SQL / Drizzle / generated types 无修改，未手编类型。

完整 `npm run format:check` 仍 **FAIL：64 个基线格式文件**，不能写全仓格式 PASS。逐文件取执行基线 blob 并运行相同 Prettier，确认 64 个均已在基线失败，新增失败文件为 0。两个保留格式债务的修改文件仅允许 Preference inventory 行和 WBS 5.14 状态单元格变化；没有全表/无关历史重排。证据 `.artifacts/task046/format-audit.json`，明确区别于已通过的部署格式门禁。

npm 安装报告既有依赖 install-script 提示；运行测试/实际 bundle/build 均通过，未修改 lockfile/依赖。Node MODULE_TYPELESS_PACKAGE_JSON 为非阻断既有 warning，未改变 package module mode。部署只执行本地 gate/产物审计，没有外部部署。

## 6. 真实 Local 八场景与 browser 证据

新套件创建两名随机临时真实 Auth 用户，分别建立真实 Cookie/Bearer 会话。通过真实 `/auth/signin` 创建两个独立 browser contexts，在既有 Personal Center 页面加载独立 A-like browser bundle；没有新建测试生产 endpoint、模拟 Auth 或 fake DB。

1. 公共 Cookie/Bearer 缺行读返回 revision 0，缺行 Reset 不建行。
2. anon 与无效显式 Bearer 返回认证失败，即使 Cookie 有效也不回退。
3. 原 PATCH 写入后公共读保留完整 values、DB timestamp、revision；两个账户同 revision 数据隔离，多次读取前后 DB 行完全不变。
4. 将真实会话的本地 expires_at 置为过期，实际 Auth refresh 成功；server finish 产生真实 Set-Cookie，应用后下一请求继续成功。
5. 原 stale PATCH/Reset 仍 409；Reset 后公共读为正 revision 的 empty，不是缺行 0。
6. 两真实浏览器账户的公共 GET 各自读取正确事实；原 API 再写后再次读取立即看到新 revision，无缓存/隐式写入。
7. 实际 browser 取消返回 REQUEST_CANCELLED；网络中断返回 PREFERENCE_UNAVAILABLE，恢复后仍能正确读；公共 facade 捕获的请求全部 GET。
8. Auth 删除 cascade，删除 A 后 B 保持；全部临时 Auth/Preference fixture 清理。

`.artifacts/task046/local-evidence.json`：realAuthUsers=2、realBrowserCookieContexts=2、8 completedScenarios、complete=true。完成项只在对应实际 callback 成功后写入。finalizer 另有 deterministic 多 Cookie/删除 Cookie/属性/Vary/错误响应测试。

原 TASK-045 真实 17/17 在本次重新运行：Save→reload、第二 session 恢复、可见 409 且保留 draft、network failure、Cancel/dirty guard、Reset→空、Guest/空账户无 Mock 写入、全分类/移动端与无 JS 错误均通过。该旧套件仍输出到 `.artifacts/task045/`，运行日志保存在本次 `.artifacts/task046/api-local.log`。没有继承旧截图/计数冒充本次执行。

所有 QA 日志/本地 browser evidence 保留在忽略的 .artifacts，不提交 token、Cookie、真实用户数据或凭据。

## 7. 可复现命令

```powershell
npm ci --cache F:/CodexWorktrees/TravelAssist-TASK045/.artifacts/npm-cache
npm run db:start
npm run db:status
# 核对专用 localhost/project identity 与空 fixture 后：
npm run db:reset
npm run test:preference-contract
npm run test:preferences
npm run test:preference-api
npm run build
$env:CODEX_PLAYWRIGHT_PATH='<本机实际安装的 Playwright 模块路径>'
npm run test:preference-contract:local
npm run test:preference-api:local
npm run db:types
npm run test:preferences:db
node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-016-user-profile.runtime.mjs
npm run test:companions:db
node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs"
npm run lint
npm run typecheck
npm run build
npm run deploy:validate:local
npm run format:check:deploy
npm run deploy:build:local
npm run deploy:verify-artifact
npm run format:check
git diff --check
npm run db:stop
```

npm cache 路径仅为本机加速，可省略。Windows 旧 DB 套件运行前将 DOCKER_HOST 设为经验证的本地 Docker context endpoint；不允许远端 Docker/DB。CODEX_PLAYWRIGHT_PATH 为环境特定路径，本次使用已安装 Codex runtime 中的 Playwright，browser channel 为 msedge。缺少 DB/browser 时失败并报告 Blocked，不静默跳过。

## 8. 交接、文件 diff 与阶段

正式交接：[preference-read-v1-handoff.md](../contracts/preference-read-v1-handoff.md)，含公共 imports、browser/server finish 示例、三个 synthetic JSON、错误分类、路径兼容窗口、版本升级、23/43/default/snapshot 矩阵和人工 reviewer checklist。跨模块库存只更新原 Preference / Companion 组合行的 Preference 部分，其他领域/历史保留，Companion 原边界不变。

新增 runtime：shared/contracts/preferences 下 core、persistence-resource、read、semantics、fixtures、index；lib/preferences 下 client、read-response；server/preferences/public-read。两个旧 B 文件变为兼容 re-export。package.json 仅新增两条测试 script。新增两份测试、两个独立 consumer/type fixtures；未删除/弱化历史测试。

文档：复制正式设计/Task/launcher，新增 handoff/Result，更新设计本 Task 当前阶段、跨模块库存 Preference 行和中央 WBS 5.14 状态。可用 `git diff --name-status 6750a50d9fc49e561e60d25e7ebfc90c76c60a60 HEAD` 核对完整文件清单。

精确主表变化：

```diff
-| 5.14   | Planner 可读取的 Preference Contract | B      | P0     | 5.11,5.16 | 进行中 |
+| 5.14   | Planner 可读取的 Preference Contract | B      | P0     | 5.11,5.16 | 待审查 |
```

Issue #321 的 Result / PR / 阶段已同步到远端正文并保持 OPEN；PR 保持 Draft，无 auto-merge。A/designated reviewer 与用户验收都 Pending，后续真实接受并授权合并后才能完成中央状态；本 Task 不代替这些人工阶段。

PR #221 只读核对 OPEN / Draft，head `929529be302b60c84ace3a580461de95e04de461`；未修改/合并/关闭 #221 或 #207。未改 A Planner/Trip/Engine/AI/POI/scoring、StartFlow、UI 布局、SQL/RLS/Drizzle/generated types；未启动 4.18、5.13、5.17、5.18、5.19、8.6。交付本 Task 后停止。

## 9. R1 审查修复 — 2026-09-12

审查来源：[review 5180255252](https://github.com/kanzakimy0/TravelAssist/pull/323#pullrequestreview-5180255252) / [R1 inline comment](https://github.com/kanzakimy0/TravelAssist/pull/323#discussion_r3990538045)。审查基线与本轮起始 head：`c60041f308d85365e7378d2c420b4e7c21ce93c4`。前文计数与实现提交是首次交付历史；以下为本轮重新执行结果。

**R1 Result：PASS（实施方修复与 QA）。A/designated reviewer 接受、用户验收仍 Pending。** PR #323 保持 Draft，Issue #321 Open，5.14 保持待审查；不代签、不自动合并。

修复 commit / 最终 runtime head：**`5c61a62d57bd001e88f8c67644f9211cf6800af5`**。后续仅追加本 Result；含文档收口的最终发布 head 在 PR/Issue R1 更新及交付消息中记录。

### 先失败，再修复

先仅修改真实 Local 回归，确认 public-read.ts/http.ts 相对起始 head 无 diff，然后在旧 runtime 上执行 `test:preference-contract:local`。结果 **13 tests：9 pass / 4 fail / 0 skipped**，其中 3 个场景失败加父测试失败：

- 带业务 query 的 Cookie/Bearer 组合读变为 PREFERENCE_UNAVAILABLE。
- 有效显式 Bearer + Cookie 的业务查询组合读同样失败。
- 真实过期 Cookie 刷新会修改调用方 headers，违反原请求保持不变的要求。

红灯证据：`.artifacts/task046-r1/red-local.log`。没有改测试预期来迁就旧行为。随后定向修复并重跑最终回归得到 **13/13 PASS**，包含 12 个场景和 1 个父测试。最终矩阵还覆盖业务 GET 与含 body 的 POST。

### 定向修复与保护边界

仅在 server public facade 内创建独立的 canonical `/api/preferences` GET，复制 headers、传递原 signal，然后调用原 handlePreference。调用方 URL/query/body 不进入偏好专用 query 校验，Auth refresh 只修改独立请求。没有消费/克隆调用方 body，没有从业务 query/body 选择 owner。

Cookie/Bearer、getUser/RLS、invalid Bearer 不回退 Cookie 和 finish 保持既有机制。原外部 `/api/preferences?owner=...` 或 `?tripId=demo&locale=zh` 继续 400 INVALID_REQUEST。没有 self-HTTP、新 endpoint、service-role、Schema/SQL/RLS/Drizzle/generated types、原 wire/CAS 或 Planner 改动。

本轮 runtime diff 仅 public-read.ts；测试增加真实 R1 场景并保留原场景；handoff 补充 canonical GET 隔离说明。中央 WBS 无 diff，5.14 仍为待审查。

### 新真实覆盖

- 两真实 Auth 用户 × Cookie/Bearer × 业务 GET/POST，共 8 组正常读取；同 sourceRevision 仍隔离账户。
- query 指定另一用户 owner、POST body 指定另一 owner/reset 操作均不能切换身份或写入。所有读前后 DB payload/revision/timestamp 完全一致。
- 无效显式 Bearer + 有效 Cookie 失败；有效 B Bearer + A Cookie 读取 B。
- 两账户 × Cookie/Bearer × 两类非法 query，共 8 组原直接 HTTP 拒绝。
- 原 URL/query/headers/Cookie/body 不变；body 未消费、未锁定；真实 Auth refresh 场景也检查原请求不变。
- 已取消业务请求保持 REQUEST_CANCELLED。finish 保留消费者 Cookie/Vary、private/no-store，真实刷新 Cookie 可用于下一请求；已有 deterministic 刷新/删除 Cookie 测试亦重跑通过。
- 原真实 browser 读取、取消/网络失败、Auth cascade/fixture cleanup 保留；所有临时用户与数据清理。

证据：`.artifacts/task046-r1/green-local.log`、`local-evidence.json`（12 completedScenarios、complete=true），另有原 API/UI 本轮 `api-local.log`。没有提交凭据或真实用户数据。

### 本轮实际测试与门禁

| 检查                                                     | R1 本轮结果                                                 |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| preference-contract                                      | 540/540 PASS                                                |
| preference-contract:local                                | 13/13 PASS，0 skipped                                       |
| preference-api                                           | 37/37 PASS                                                  |
| preference-api:local                                     | 17/17 PASS，真实 Save/reload/409/Cancel/Reset/UI            |
| 全仓 CI loader tests/*.test.mjs                          | 2072/2072 PASS                                              |
| 5.11 pure / real DB                                      | 503/503、505/505 PASS                                       |
| Profile / Companion real DB                              | 25/25、147/147 PASS                                         |
| lint / typecheck / build                                 | PASS；最终扩展 runtime 矩阵另经 ESLint                      |
| deploy:validate:local / build:local / verify-artifact    | PASS，产物对应修复 commit，1746 files，failures=[]          |
| format:check:deploy / changed-file Prettier / diff check | PASS                                                        |
| db:start / status / types / stop                         | PASS；Local 专用空数据预检通过，DB 套件顺序执行，最终已停止 |

本轮复用已安装锁定依赖与经验证的专用 Local 实例，没有 npm/package/lockfile 变化；预检确认 Auth/Preference/Companion 表为空后运行套件，无需再次 destructive reset。真实 db:types 再生成无 diff。全仓 format:check 本轮实际为 **65 个失败文件**，均已存在于 R1 起始 head c60041f，逐文件内容及 Prettier 结果复核证明新增 R1 失败文件为 0。更正前文首次交付的 64 计数：当时全仓格式日志产生于 Preference inventory 行更新之前，该更新使 cross-module-contract-handoff.md 也成为失败文件；前文审计遗漏了这第 65 项。本轮如实记录此既有 Task-046 文档格式债务，未因 R1 重排无关库存表格，也不声称全仓格式通过。日志位于 `.artifacts/task046-r1/`。

本轮执行范围到 R1 修复、Result/PR/Issue 同步为止；不修改 #221/#207，不启动下游 Task。A/指定集成审查人的接受继续 Pending。
