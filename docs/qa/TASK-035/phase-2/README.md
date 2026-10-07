# TASK-035-A / WBS 9.1 Phase 2

Canonical Owner A；B implementation / QA。沿用 Issue #265、Draft PR #272、`codex/a-test-baseline-freeze`。阶段状态：**阻塞（TASK086 冻结认证绑定）**；不是待审查或 WBS 完成声明。

基线是 `develop@4888b4d507ee75d4f6b9914eb1a8d5661813f64b`。正常合并记录：`cad0a2b98` 整合 develop，`4396e2f91` 整合发布任务 `997ce9ed5e5da621398d56bf8bfa89531a5084dd`。第一阶段 `dbf887525` 与原 Result 保持历史原文。

| 交付                         | 用途                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| execution-policy.json        | REQUIRED 每文件审阅哈希、责任依据、执行 profile、间接边和全部外围分类；外围 unknown 保留 |
| test-inventory.json          | 动态选择器的紧凑快照；直接文件、间接文件、lane 与 cases 分开                             |
| execution-path-review.md     | 默认执行路径、子进程、输入及副作用校准                                                   |
| ci-event-matrix.json         | 前后事件义务与 PR272 受控完整链                                                          |
| baseline-evidence.json       | 下载验证后的 develop 完整托管运行；非图标推断                                            |
| validation-summary.json      | 分项实测状态和可比性限制                                                                 |
| scope-validation.json        | 变更白名单及受保护范围核验                                                               |
| legacy-integration-review.md | 旧 PR 能力处置与兼容性                                                                   |

执行命令：

```sh
npm test
npm run test:baseline:inventory -- --check
npm run test:baseline:lane -- --lane assets
npm run test:baseline:lane -- --lane regression-0
# 同理 regression-1 / regression-2 / regression-3 / rebuild
node --test tests/task-035-runner.test.mjs
```

`npm test` 动态执行顶层全部 `.test.mjs`，包括重建。当前 route loader 保持；TASK019 子进程仍 planner loader + react-server。普通入口采用 concurrency=1 避免 Asset scratch/资源争用；分片沿用 TASK086 原并集和轮转规则，不存在 quick 子集。新增文件被发现但在副作用 profile 审阅/哈希更新前 fail closed；`--check` 不写文件、不 import 测试。更新清单先人工更新 execution-policy 的审阅项，再执行 `node tools/qa/task-035-inventory.mjs --write`；不能为消除漂移直接批准未知副作用。

完整 hosted chain 保留 first/second/extraction/resume/rebuild、published comparison、corruption、routing eligibility、certification engine、quality、旧 aggregate。额外 ordinary 全集合在 proof job 内消费本次 exact checkout/run/attempt 的原生证明后执行，所有原断言保留。新 aggregate 另外验证六个分片、ordinary、graph-first/second、extraction、resume、quality 的回执全集；ordinary 与分片为重复验证，不能相加冒充独立覆盖数。

PR checkout 的 merge-ref 为 `PR_MERGE_RESULT`；push/dispatch 精确 checkout 为 `BRANCH_EXACT_HEAD`。最终 SHA 和最终 run URL 写到 #265/#272 外部回执，避免自引用提交循环。任何提交变化使旧运行仅剩历史效力。Draft、Owner A、WBS 未完成状态保持。

日志位于独立 `.artifacts/task-035/candidate/<run>/<attempt>/<lane>/<uuid>/`，不提交大日志/图产物。GitHub global receipt artifacts 保留 30 天，原 TASK086 artifact 名称和三天期限保持兼容，最终小收据保留 30 天。审查若超过原始证据有效期需要重新取得可核验证据。

Node final summary 是唯一 cases 口径；文件级 summary 证明实际选择集合。间接 Python/TASK019 child TAP 不叠加。非零、signal、timeout、spawn error、零测试、skip/todo/cancel、缺/重复/串 SHA/串 attempt/哈希漂移或缺失原生 proof 均不能 PASS。所有层都保留首轮失败，不自动重试至绿。

没有执行 Local DB、browser、real device、bundle、live Provider、OAuth/SMS、云演练/部署；没有 db:reset。Python 工具安装与 GitHub 工程操作不是业务 Provider 请求。未改变依赖版本、lockfile、Node 版本、业务语义或数据。环境差异和未执行项见 validation-summary，而非使用旧 PR 713 cases 摘要代替。

## 本轮阻塞与交付结论

候选 `72fe79f29` 的 push run37465820154 和 PR merge-ref run37465826108 均出现三个强制断言失败，集中在 certification-engine-repair 与 readmittable-closeout；PR 实测 checkout 为 `4201e4d5136b96f97d457019a3e5b2b66696a4bb`，不是分支 head。已验证日志/事件/回执哈希，见 [candidate evidence](candidate-evidence.json)。其余已完成分片、retained extraction 与完整 quality job 通过。

根因已用只读哈希对照证明：`currentBinding()` 将 package.json 与 quality-gate.yml 全字节纳入认证输入；本轮必要接线修改使 frozen eligibility/closeout/report 失效。只在内存替换这两个哈希就重现冻结 input SHA，未替换工作树文件、未篡改测试输入或断言。修复需 A/认证证据 Owner 另行裁定并授权刷新证据或调整绑定规则；本 Task 禁止修改冻结证据、Transport 数据与业务规则，故保持阻塞。

发现阻塞后取消两次候选剩余昂贵图作业，明确未完成 graph/resume/proof、完整 npm test 与 aggregate；不伪称完整链通过。最终文档提交后只取最终 head 的失败/阻塞证据，写入外部 #265/#272 回执，不复用旧 head。

Windows Asset 原30秒 dry-run 超时在独立干净 develop 同样复现（两侧均164/165），属于已证实的本机前置/资源限制；Linux baseline 与候选 Asset 分片均通过。这不是豁免或重试至绿。治理12项、兼容23项、candidate hosted quality与scope检查通过。

实际文件列表与哈希见 scope-validation；原 Task/Result/browser及Phase1不可变，依赖与受保护数据无改动。WBS9.1保持 A Owner / B执行 / 阻塞；PR272 Draft、Issue265 Open。没有合并、auto-merge、生产Provider或下游执行。
