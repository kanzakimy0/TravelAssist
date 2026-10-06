# WBS 9.1 / TASK-035-A — Phase 1 审计报告

状态：**进行中（Phase 1 审计成果待人工审查；runner/CI 后续阶段未授权）**。Canonical Owner **A / Shared Infrastructure / QA**，本阶段执行支持 **B**。沿用 [Issue #265](https://github.com/kanzakimy0/TravelAssist/issues/265) 与 [PR #272](https://github.com/kanzakimy0/TravelAssist/pull/272)，不另建实现，不合并，不关闭 Issue，不启动第二阶段。

## 固定输入与执行边界

| 输入                           | 审计值                                     |
| ------------------------------ | ------------------------------------------ |
| auditedDevelopSha              | `4888b4d507ee75d4f6b9914eb1a8d5661813f64b` |
| legacyPrHeadSha                | `f157f23ba1b93def006c2703ea8f42dcd9266c01` |
| 任务发布 / 审计分支起点        | `4fbbe4a12626b41ddcad15cc9ebf9440698192fc` |
| 原 PR 与 develop 的 merge-base | `171900698180b80220017c9c4bec551b72792f27` |
| 审计分支                       | `docs/b-wbs-9-1-phase1-audit-20261006`     |
| GitHub 观察日期                | 2026-10-06，Asia/Tokyo                     |

origin 已核对为 `kanzakimy0/TravelAssist`；使用 `fetch --no-prune --no-tags` 获取审计分支、develop、原实现分支及 PR #272 head。主工作树有既有 TASK-073/075 修改与未跟踪文件，本次未写入、stash、reset、clean 或提交它们。在新建独立 worktree 中确认空 porcelain 状态后检出审计文档分支；原实现分支只读。机器路径和现场观察单列于 [source-observations.json](source-observations.json)，不进入规范化清单内容哈希。

已读根 AGENTS、docs 索引、分工说明、原 TASK/Command/Result、PR 全部九个改动文件、Issue/PR 讨论、当前 WBS 及 TASK-086 最新收口。当前 7.16 已按 Backbone scope 验收合并；旧阶段的 BLOCKED/旧计数不代替当前状态，也不因审计继续数据生产。9.10/9.11 的 WBS 记录仍指向各自原实现，本次不引入其他分支测试。

## 文件数量与口径

扫描受审 Git 树的 **12,106 个 blob**，读取 **1,658 个源码/Markdown/YAML/TOML/SQL/配置输入**，其余保留 Git 元数据。完整候选集合、逐文件 blob/hash、归属证据、环境信号、引用行号及事件映射见 [test-inventory.json](test-inventory.json)。包含 `tests/` 之外的共享 contract fixtures、工具中的 Python selftest 及所有 `tools/qa/` 入口，不依赖 import 或执行发现测试。

| 主角色（互斥）    |  文件数 | 口径                                                                                                            |
| ----------------- | ------: | --------------------------------------------------------------------------------------------------------------- |
| test              |     183 | 152 顶层 `.test.mjs` + 23 `.runtime.mjs` + 1 `.cases.mjs` + 7 Python 测试/selftest                              |
| harness           |     112 | 21 个 tests 内入口（17 个 browser、3 个 bundle、1 个 replay）及 91 个工具 QA 候选；工具可能兼有 helper/输出作用 |
| helper            |      27 | tests 内 25、tools 内 2；不计入测试文件数                                                                       |
| fixture           |     115 | tests 内 109、src/shared/contracts 内 6；含工厂模块及二进制 fixture，不计为测试                                 |
| config            |      13 | 3 个 workflows、package/lock、Node/TS/Next/ESLint/Prettier、Supabase、Git 字节配置                              |
| other-with-reason |     136 | 全量工具扫描保留的生产/转换/收据工具；逐项有原因，未假定为测试                                                  |
| 总候选            | **586** | 每个 path/id 仅出现一次                                                                                         |

辅助文件若定义为 helper + fixture + config，共 **155**；全部非测试候选为 **403**，其中还包括 harness 和 operational tools。`tests/` 共 **336** 个跟踪文件，`tools/qa/` 共 **72** 个候选，package 共 **93** 个既有 scripts；这些集合相互重叠，不能相加作为测试数。测试套件数量、运行用例数量均为 `null / NOT_EXECUTED`；不能拿文件数或历史 713 cases 当作本次运行计数。

## 事件、条件、分片与真实文件选择

[ci-coverage-map.json](ci-coverage-map.json) 固定保存三个 workflow 的源行、93 个 package commands、逐事件条件、分片文件集合、已审间接执行边及 TASK-055 aggregate 的动态清单。

| 事件                       | 实际入口 / 选择                                                                                   | 证明范围                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 普通 PR                    | `verify`：route loader + `tests/*.test.mjs`，152 文件                                             | 默认 checkout 为 event merge ref；包括串行重建测试，但不形成 full-lane published proof |
| backbone 分支 PR           | `regression` 5 lanes + graph/extraction/resume/proof/quality/aggregate                            | 默认仍可为 merge ref；不能称为分支 exact-head 实测                                     |
| develop push               | 与 full-lane PR 相同                                                                              | 绑定事件 SHA；不自动证明后来前进的分支 head                                            |
| Quality gate 手动执行      | `task086FinalCloseout=true` 或选 develop/backbone → full lanes；其他 false → verify               | full lanes 检查可选 expectedHead；verify 未检查该输入                                  |
| release rehearsal 手动执行 | develop trust gate 比对输入 commit_sha，再明确 checkout trusted_sha；串行 Node + standalone smoke | 本地发布演练，不是生产部署，也不是 full-lane artifact chain                            |
| feature push               | auto-create-pr 创建 Draft                                                                         | 不执行测试                                                                             |
| 本审计 docs 分支 push      | 当前 workflows 无匹配 push trigger                                                                | 不为交付主动 dispatch；不是 CI PASS                                                    |

TASK-086 的 `regressionInventory()` 使用 **非递归** `readdirSync(tests)`、`.endsWith('.test.mjs')`、字典序排序；本阶段按源码独立转写选择算法，未 import/执行原 runner，包括其 `--inventory` 模式。

| lane                 |  文件数 | 选择 / 条件                                   |
| -------------------- | ------: | --------------------------------------------- |
| assets               |       5 | `^tests/task-013`；子进程 concurrency=1       |
| regression-0         |      37 | 去掉 assets/rebuild 后按序 index % 4          |
| regression-1         |      37 | 同上                                          |
| regression-2         |      36 | 同上                                          |
| regression-3         |      36 | 同上                                          |
| rebuild（proof job） |       1 | `tests/task-086-b-rebuild.test.mjs`           |
| 并集                 | **152** | 独立静态校验：无重复、无丢失，恰等于顶层 glob |

四条人工核对过源码的间接测试执行边：

| 父测试                                                    | 子测试                                                   | 前置                                                                                     |
| --------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `tests/task-019-trip-plan.test.mjs`                       | `tests/task-019-projection.cases.mjs`                    | 子进程 `--conditions=react-server` + **planner loader**，非父进程 route loader；localEnv |
| `tests/poi-remaining-review.test.mjs`                     | `tests/poi-remaining-review.test.py`                     | Windows python / 其他 python3，`-X utf8`                                                 |
| `tests/task-086-b-selected-gtfs-trailing-fields.test.mjs` | `tests/python/task_086_selected_gtfs_trailing_fields.py` | PYTHON override 或平台 Python；wrapper 的“35”是旧断言，不是本次统计                      |
| `tests/task-086-hateruma-air-passenger.test.mjs`          | `tests/task-086-hateruma-abr.test.py`                    | TASK086_PYTHON 或字面 `python`；PYTHONUTF8                                               |

因此直接 + 间接静态选择 **156 个唯一测试文件**；另 **27 个**没有证明被这些 CI 入口选择：23 个 `.runtime.mjs`、`tests/task-084-b-n02-candidates.test.py`、`tests/task-084-b-phase2.test.py`、`tools/transport/task-084-v2-amendment-selftest.py`、`tools/transport/task-084-v2-rail-selftest.py`。17 个 browser harness、三个 bundle 检查和 replay 独立于该 test 文件口径，不能静默计入全仓 Node 覆盖。

TASK-055 aggregate 从自身 JSON 按 execution.mode 取 **28 non-local / 15 local / 19 excluded**，不是从仓库自动发现所有测试。当前 workflows 没有调用 `test:personal-center`、`:local` 或 `:e2e`。CI 中 TASK-055 的 runner 测试只验证合成子 TAP 的成功/失败/skip 语义，不代表真实 Local aggregate 已运行。TASK-059 的 e2e harness 有 edge/chromium/firefox/webkit 四种选择，不等于现有 CI browser matrix。

## TASK-086 证明链与重复执行判断

`graph[first,second]` 分别生成、`extraction` 重现保留原始源、`resume` 下载 first 产物做 checksum skip；`proof` 下载 graph/resume/extraction 产物，通过原 rebuild test 消费完整 receipts，强制 `TASK086_VERIFY_PUBLISHED=1`，写 deterministic-recovery proof。aggregate 依赖所有六类 jobs 成功，校验 checkoutSha、runId、runAttempt、proof status、回归并集、routing eligibility 与 certification-engine receipt。代码同时绑定 inputCodeSha256、proofInputSha256、Node/platform、生成器/输入/产物哈希，并检验 corruption invalidation。

产物按 `<github.sha>` 命名，full-lane中间产物保留 3 天，final receipt 保留 30 天；带隐藏目录上传。`ci-revision.mjs` 分开记录 branchHeadSha/eventSha/checkoutSha 和 `PULL_REQUEST_MERGE_TEST`。**job 名中的 exact-head 不足以证明 PR 分支 head 被直接 checkout。** aggregate 读取共享 regression-inventory 文件并依赖 job success，没有逐个比较所有 lane receipt/log digest；本次不把它当作审计文件的运行回执。

六个主分片文件并集无重复。但不同 npm focus aliases、TASK-055 non-local aggregate 和默认 Node 选择有重叠；这是不同入口的重复选择，不是每次 CI 都重复跑。原 verifier 的 focused replay 只在 `publish=true / TASK086_PUBLISH_VALIDATION=1` 分支执行；当前 reviewed workflows 未设置此变量。graph first/second/resume 的重复生成是确定性证明义务，不是误分片。

## 环境前置、缺口与未决项

| 范围            | 已确认或待确认的前置                                                                                                                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node / TS       | `.nvmrc=24`；锁定依赖 npm ci；现有 route loader 支持 server-only stub、next/server.js 与 index.ts fallback，planner loader 只补相对 `.ts`。loader 不替代类型检查。当前 `typecheck=next typegen && tsc --noEmit` 已具备 clean-checkout 前置。              |
| Python          | 默认 Node 实际调用 Python；CI 未 setup-python，依赖 ubuntu runner 预置解释器。不同脚本有 PYTHON、TASK086_PYTHON 或平台默认；TASK-084 rail selftest 还需要已验证 S12 archive。扫描也发现外围生产工具 requests/lxml，不能据此宣称所有 Python 都仅用标准库。 |
| Browser         | 现有外部 Playwright runtime，常见 CODEX_PLAYWRIGHT_PATH / PLAYWRIGHT_MODULE、CHROME_EXE、任务 URL、WBS_BROWSER；需要本地 server/viewport/fixture。未新增依赖或浏览器下载。部分脚本写 `.cache/qa` 或 tracked docs/qa 报告，不能批量运行来发现测试。        |
| DB/Auth         | Docker / loopback Supabase、独占 travelassist stack、临时用户/事务清理；aggregate 还要求 .next/BUILD_ID、3000/3001 空闲和生成类型一致。Local 凭据、真实 Provider 凭据与无凭据 fixture 必须分别确认。                                                      |
| 图/数据         | 冻结原始归档、Python、足够磁盘/内存、checksum-bound 输入和临时产物；串行普通 PR 并不是轻量入口。禁止以本审计为由修改 timeout 或降低 TASK-086 质量门。                                                                                                     |
| Bundle / replay | bundle 检查要求实际 `.next/static`；migration replay 有 DB/cleanup 前置。文件名含 browser/client 不一定启动浏览器。                                                                                                                                       |

逐文件三态中：requiresDb unknown **396**、requiresBrowser unknown **354**、requiresNetwork unknown **372**、requiresSecret unknown **472**、destructivePotential unknown **246**。`yes` 的写入信号可能只是临时文件，不等于破坏生产；`unknown` 不等于 false。**487 个候选**至少一个维度待人工核对（包含 136 个保守收录的 operational tools）；**200 个文件**无法从 task-number 或既有 scoped inventory 唯一指定 owner。其余归属也是机器推断，不更改 Canonical Owner，也不凭模块关键字重新划分 A/B 职责。

引用记录保留 **7,064 条有效路径边**。目录 URL 单列为 directoryReferences；另 **15 个文本表达式**保留 NEEDS_REVIEW，不宣称 broken imports：包含子进程 `--eval` 中相对根目录的源码、动态 `${p}`、生成 fixture、源码替换断言等。例如 asset test 中图片 import 是临时 fixture 字符串，migration helper 对 `../drizzle/` 明确断言不存在。文本提取不是 AST/call graph；计算型路径、条件调用和服务配置仍需下一阶段人工确认。

其他确定性缺口：

- develop 没有 `npm test`；旧 PR 的精确字符串 governance test 无法直接复用。
- `verify` 的 final-closeout artifact step 要求 task086FinalCloseout=true，但同一输入使 verify job 不运行；该 step 静态不可达。
- 普通 PR 与 release rehearsal 虽包含 serial rebuild，却不等价于 full-lane published-artifact proof；其预算与前置风险需在下一阶段讨论。
- `expectedHead` 只在 full-lane jobs 检查；manual-ordinary verify 不检查。validationTimeoutMinutes 也只影响 verify，不能概括为所有 jobs 的参数。
- 原基线声称四个 workflows、62 个 Node 文件、待合入旧专项，均是历史快照；当前 develop 只有三个 workflows，不能把旧文档直接命名为当前 canonical baseline。

## 验证、历史证据与未执行项目

运行的只有新审计生成器及其 in-memory 自检。每次执行做两次完整固定 Git 对象扫描，验证 JSON 字节相同、ID/path 唯一、角色计数、CI 并集、已解析引用目标；10 个自检断言包括重复路径拒绝、嵌套/Python/fixture/helper 分类。结果见 [audit-validation.json](audit-validation.json)。内容哈希无时钟、输出绝对路径或临时目录。

**业务运行全部 NOT_EXECUTED**：全仓 Node、Python/selftest、graph/rebuild/extraction/resume/proof、真实浏览器/设备、Local DB/Auth、真实 Provider/network smoke、lint/typecheck/build/deploy。没有执行既有 runner 的 inventory 模式，也没有批量 import/require 目标脚本。没有安装依赖、启动 POI 生产、访问生产 DB 或 db:reset。

GitHub API 观察到受审 develop 已有 [Quality gate run 37422119153](https://github.com/kanzakimy0/TravelAssist/actions/runs/37422119153)，event=push、headSha=受审 develop、conclusion=success；这是本次审计之前的远端运行。本次没有下载其 checkout/proof receipt，actualCheckoutSha 保持未独立验证，不能据此给本阶段 businessTestsExecution 写 PASS。旧 PR 的 711/713 和旧 Asset failures 只保留历史，不自动作为当前失败豁免。

复现：在包含固定三个提交的 checkout 中，只运行 `node docs/qa/TASK-035/phase-1/inventory-audit.mjs`。它固定输入并仅写同目录三个 JSON，不执行 npm scripts、测试、现有 runner、Provider 或数据生成。不要将它接入 package 或 CI。

## 交付与停止点

- [逐项旧 PR 复用审计](legacy-pr-reuse-review.md)
- [下一阶段建议（待授权）](next-phase-recommendation.md)
- [本阶段 Result](../../../tasks/RESULT-TASK-035-b-wbs-9-1-phase1-audit-only.md)
- [只读生成器](inventory-audit.mjs)

受保护文件零修改的 Git 路径审计、最终发布 commit 和远端确认见外部 Issue/PR 交付回执。只提交本 QA 目录、补充 Task、本阶段 Result 与 WBS 9.1 段/行；不把整个 WBS 9.1 标完成。推送后停在人工审查点。
