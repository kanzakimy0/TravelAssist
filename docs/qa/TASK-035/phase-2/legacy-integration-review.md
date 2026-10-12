# 原 PR #272 整合结果

原 head `f157f23ba1b93def006c2703ea8f42dcd9266c01` 保持可追溯。正常合并 develop 和发布分支；没有重写历史、替代 PR 或 force push。Phase 1 的九项复用判断作为输入，没有重做全仓审计。

| 原能力           | 处理               | 当前等价性/理由                                                                                                                  |
| ---------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| package npm test | REWORK             | 薄入口选择全部顶层 Node 文件，route loader；串行文件执行避免资产资源争用；保留 rebuild。未变依赖/lockfile。                      |
| typecheck 前置   | SUPERSEDED / REUSE | develop 已有 `next typegen && tsc --noEmit`，保持。                                                                              |
| quality-gate     | REWORK             | 普通 verify 使用 npm test；修复 always 上传；expectedHead 校验纳入 revision helper。原 TASK086 lanes/proof/jobs/失败传播均保留。 |
| baseline 文档    | REWORK             | 新增当前阶段规范，旧历史摘要明确标记，旧数值不是当前通过证据。                                                                   |
| TASK035 静态测试 | REWORK             | 入口断言适配薄 runner；框架/loader/typecheck/browser 边界仍在。新增真实 synthetic 子进程和事件/回执测试。                        |
| browser smoke    | DEFER / unchanged  | 原脚本与 npm alias 保持，仅 OPT_IN；本轮未执行。                                                                                 |
| 原 Task/Result   | REUSE historical   | 原文保留；Phase2 Amendment 与新 Result 单独追踪，旧 711/713 无豁免效力。                                                         |
| 原 Command       | 历史说明           | 加当前阶段入口和禁止操作提示，旧指令不可当本轮默认运行计划。                                                                     |
| WBS9.1           | REWORK tracking    | Canonical Owner A，B 实施；进行中至全部强制验证通过，仅可待审查。                                                                |

两个既有基础设施接口适配：TASK086 regression runner 可选接收 reporter 输出及 task-owned lane 目录；默认 CLI 接口保持同步、原参数/超时/断言/分片策略不变。ci-revision 增加非空 expectedHead 格式/相等校验，原 checkoutKind 字段和测试契约保持。

`tests/pr-governance.test.mjs` 仅将 push allowlist 断言从 develop 改为 develop 加唯一原实现分支，维持禁止自动合并等断言；这是发布任务授权的 dispatch fallback。没有修改任何业务测试断言。

资源与事件依据：baseline run37422119153 graph first 26分29秒，resume 28分01秒；原串行 first+second+resume 明显超过普通 verify 35分钟预算。仅 PR272 与其 push 使用既有 full-chain 编排；ordinary npm test 在 proof 内仍执行全部文件（含 rebuild），消费同一次完整图证明。其他普通 PR/普通 dispatch 与 trusted rehearsal 入口集合保持；没有将重建移到可跳过的手动任务。branch push fallback 的原因是 main 上 Quality gate 文件读取返回404，未改变 main/develop 或默认分支。
