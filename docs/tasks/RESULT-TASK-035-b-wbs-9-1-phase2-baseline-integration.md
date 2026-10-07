# Result — TASK-035-A / WBS 9.1 Phase 2

Canonical Owner A；B implementation / QA；#265 / Draft #272；唯一分支 `codex/a-test-baseline-freeze`。状态：**阻塞（TASK086 冻结认证绑定）**；强制验证未通过，不能置待审查。

已正常合并 develop `4888b4d`（merge `cad0a2b98`）与任务发布 `997ce9e`（merge `4396e2f91`）。旧 Task/Result 与 Phase1 `dbf887525` 保留原文。实现 disposition 见 [legacy-integration-review](../qa/TASK-035/phase-2/legacy-integration-review.md)。

实现：统一 npm test、只读清单校验、TASK086 兼容分片适配、Node 文件事件/最终 summary 回执、受控子进程 timeout/cancel、生产环境变量隔离、输入/日志/回执绑定；CI 使用已有 jobs，补 Python3.12 前置、expectedHead、always artifacts 和严格全局聚合。默认集不遗漏 rebuild。原 TASK086 graph/extraction/resume/published/corruption/routing/engine/quality/final gate 不减弱。

选择总量由清单计算：当前 154 个直接 Node 文件、4 个间接文件；新增两个 TASK035 文件相对 develop（其中一个来自旧 PR，一个为本轮治理测试）。顶层文件数不是 cases；nested child TAP 不额外相加。每项有 profile/hash/evidence；外围 27 未覆盖、17 browser、3 bundle 与其他工具保留明确 OPT_IN/DEFERRED/SUPPORT_ONLY/OUT_OF_BASELINE 分类，不要求 487 待核候选全部清零。

真实基线：run [37422119153](https://github.com/kanzakimy0/TravelAssist/actions/runs/37422119153)，精确 develop SHA `4888b4d507ee75d4f6b9914eb1a8d5661813f64b`。下载核对 516 项输入绑定、六分片日志哈希、152 文件、3,887 Node tests、完整原生证明与必需 jobs；全部通过。环境 Linux / Node24.21.0；旧 Python 实际版本未记录，不声称 Python 版本完全可比。

候选/最终提交证据、失败记录和质量门状态统一见 [validation-summary](../qa/TASK-035/phase-2/validation-summary.json)；未完成项保持 PENDING/NOT_RUN。最终 branch exact-head 与 PR merge-ref 分开，最终 SHA/run/attempt 在 #265/#272 外部交付回执发布；不把先前 commit 的结果移给新 head。

未运行 Local DB/Auth、browser/真机、bundle、TASK055/059 runtime aggregate、live Provider、OAuth/SMS 或云演练/部署。无 db:reset、无数据生产、无依赖升级、无业务语义变更。不得把旧 PR 的 Asset failure 当本轮豁免。当前剩余门：最终候选与最终托管完整链、PR 集成证据、全部质量门、scope 与外部交付回执。验证失败时保持进行中/阻塞，不能写待审查。

WBS9.1 未完成；PR保持 Draft，不合并/auto-merge/APPROVE；Issue保持Open；没有下游任务。

## 本轮阻塞与交付结论

候选 `72fe79f29` 的 push run37465820154 和 PR merge-ref run37465826108 均出现三个强制断言失败，集中在 certification-engine-repair 与 readmittable-closeout；PR 实测 checkout 为 `4201e4d5136b96f97d457019a3e5b2b66696a4bb`，不是分支 head。已验证日志/事件/回执哈希，见 [candidate evidence](../qa/TASK-035/phase-2/candidate-evidence.json)。其余已完成分片、retained extraction 与完整 quality job 通过。

根因已用只读哈希对照证明：`currentBinding()` 将 package.json 与 quality-gate.yml 全字节纳入认证输入；本轮必要接线修改使 frozen eligibility/closeout/report 失效。只在内存替换这两个哈希就重现冻结 input SHA，未替换工作树文件、未篡改测试输入或断言。修复需 A/认证证据 Owner 另行裁定并授权刷新证据或调整绑定规则；本 Task 禁止修改冻结证据、Transport 数据与业务规则，故保持阻塞。

发现阻塞后取消两次候选剩余昂贵图作业，明确未完成 graph/resume/proof、完整 npm test 与 aggregate；不伪称完整链通过。最终文档提交后只取最终 head 的失败/阻塞证据，写入外部 #265/#272 回执，不复用旧 head。

Windows Asset 原30秒 dry-run 超时在独立干净 develop 同样复现（两侧均164/165），属于已证实的本机前置/资源限制；Linux baseline 与候选 Asset 分片均通过。这不是豁免或重试至绿。治理12项、兼容23项、candidate hosted quality与scope检查通过。

实际文件列表与哈希见 scope-validation；原 Task/Result/browser及Phase1不可变，依赖与受保护数据无改动。WBS9.1保持 A Owner / B执行 / 阻塞；PR272 Draft、Issue265 Open。没有合并、auto-merge、生产Provider或下游执行。
