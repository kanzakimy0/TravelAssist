# TASK-035-A 补充任务 — B 执行 WBS 9.1 第一阶段：仅审计与测试清单

## 1. 任务身份与授权

- 父任务：TASK-035-A；WBS 9.1「测试框架与全局基线」。
- 沿用 Issue：#265；沿用原实现 PR：#272，不新建第二套实现任务。
- Canonical Owner：A / Shared Infrastructure / QA；本次执行支持：B。
- 本阶段：Phase 1 / Audit only。用户已同意“先审计和 Test Inventory，不改 CI；审查后再决定 runner + CI”。
- 发布状态：READY FOR AUDIT；仅发布任务不代表已开始执行、不代表 WBS 已完成。
- 执行工具不限：人工、Codex 或其他本地开发工具均可。
- 审计文档分支：`docs/b-wbs-9-1-phase1-audit-20261006`。
- 原实现分支：`codex/a-test-baseline-freeze`，本阶段只读，不推送修改。
- 发布日期：2026-10-06（Asia/Tokyo）。

本补充任务限制本阶段的执行范围。原 TASK-035 中允许修改 npm scripts、CI 或新增 smoke 的条款，本阶段不执行。只有用户审查第一阶段成果并另行授权，才可进入实现整合阶段。

## 2. 发布前已核实的事实与纠正

| 对象 | 核实结果 |
| --- | --- |
| `develop` | `4888b4d507ee75d4f6b9914eb1a8d5661813f64b` |
| develop 上 WBS 9.1 | Owner A，依赖 2.9 / 2.10，主表仍写“未开始” |
| Issue #265 | 已有 TASK-035-A；2026-09-09 创建；Open |
| PR #272 | 已有全局测试基线实现；Open / Draft / 未合并 |
| PR #272 head | `f157f23ba1b93def006c2703ea8f42dcd9266c01` |
| 原实现内容 | 测试分层文档、Node 测试入口、CI 映射和本地浏览器 smoke 等 |
| 历史测试结果 | 原分支记录 713 项、711 PASS / 2 FAIL，仅为当时证据，不是当前结果 |

因此，之前把 9.1 当作完全从零开始的新任务不准确。正确下一步是核对旧实现与当前 develop 的差异，建立当前清单，决定后续复用范围；不是直接重写，也不是直接合并旧 PR。

本轮对话的决策链：B 希望避开 A 正在补齐的 POI 链 → 选择了解 WBS 9.1 → 明确 Codex 非必须 → 用户同意先审计、后决定实现。当前任务不依赖补齐全部 POI，也不接手 085A/085B 的数据生产。

## 3. 开始前检查

读取仓库 `AGENTS.md` 和相关目录指引；核对 origin 确为 `kanzakimy0/TravelAssist`。检查 `git status --porcelain=v1` 和 `git worktree list`。发现计划使用的工作树有未提交或未跟踪文件时，停止对该工作树的写入并报告路径；不得自动 stash、reset、clean、提交不明文件或删除他人工作。

在独立、干净的审计 worktree 执行。fetch 最新 develop、审计文档分支和原实现分支；读取 Issue #265、PR #272、最新 WBS 及相关 A/B 活动记录。记录实际 `auditedDevelopSha`、`legacyPrHeadSha`、审计分支 HEAD 和工作树状态。上面的 SHA 是发布快照，不代替执行时核验。

不因 PR 的旧 base 字段而推断最新 develop；不因 WBS 一行“未开始”而忽略已有实现。若发现已有同阶段交付，先评估复用，不重复生成；若旧 PR 已合并或改为新 head，按实际状态审计并记录变化。

## 4. 工作范围

### 4.1 旧实现复用审计

阅读 PR #272 的 Task、Result、`docs/qa/test-baseline.md` 与全部改动，比较当前 develop 的同类能力。对每个旧交付物给出一种结论：

- `REUSE_AS_IS`：内容仍适用，后续可复用。
- `REWORK`：仍有价值，但需适配当前实现。
- `SUPERSEDED`：已被 develop 的新能力取代，不应重复引入。
- `DEFER`：依赖条件未满足或超出本阶段。

每项写明双方文件路径、比较 SHA、理由和后续动作。特别检查旧 npm test、TypeScript loader、typecheck 前置、浏览器运行环境与当前 TASK-086 分片/重建证明链之间的关系。只比较和提出建议，不复制旧实现，不 merge/rebase/cherry-pick 原分支。

### 4.2 全仓测试面盘点

以指定 commit 的 Git 跟踪文件为扫描基础，不只统计 `tests/` 顶层。核查测试文件、嵌套目录、Python 测试、browser/runtime harness、fixture/helper/loader、`package.json`、`tools/qa/`、其他工具目录中实际可执行的 QA 入口、工作流及相关文档命令。

扫描不要依赖运行目标测试来发现测试。不得批量 import、require 或执行待审计脚本；源码里可能含联网、重建、数据写入或 DB 操作。可编写独立、无第三方依赖、只读取 Git 元数据/源码文本的审计生成器，存放在本阶段 QA 目录；它不是新的测试 runner，不接入 package.json 或 CI。

记录发现规则、扫描根、完整候选集合和引用关系。所有候选文件必须归入 test / harness / helper / fixture / config / other-with-reason 等角色；不确定项标为 `NEEDS_REVIEW` 并给出原因，不以“排除”掩盖不确定性。辅助文件不是可执行测试，不可计入测试数量。

文件数、测试套件数、实际运行的用例数分别统计。此前提到的约 227 个目录条目不是 227 个测试，更不是验收阈值；本阶段没有运行的用例数量应为 `null` 或明确 `NOT_EXECUTED`，不得估造通过数。

### 4.3 机器可读清单

`test-inventory.json` 至少记录：

- 顶层：schemaVersion、auditedDevelopSha、legacyPrHeadSha、discoveryRules、扫描范围、输入文件哈希、汇总、未决项。
- 每项：id、path、blobSha、role、language、domain、owner 与 ownerEvidence。
- 测试层级：unit / contract / integration / e2e 等；执行环境另设字段，例如 node / browser / local-db / external。
- 环境前置：requiresDb、requiresBrowser、requiresNetwork、requiresSecret、destructivePotential；采用 yes / no / unknown 或等价三态，不把 unknown 当 false。
- 当前入口：已存在的命令、loader、flags、环境变量名称、workflows/jobs、引用来源；不得记录凭据值。
- CI 覆盖：按 PR / develop push / manual-dispatch 等事件和条件分别记录，不只用一个 `defaultCI=true` 概括。
- 运行状态：本阶段未运行则 `NOT_EXECUTED`；人工确认结果与机器发现结果分开。

`data-heavy` 是资源属性，`Deferred` 是状态；不要把二者与 unit / integration 混成互斥维度。分类可保留主层级和附加标签，但不得一份文件重复计数。

### 4.4 当前 CI 映射与缺口

从现有工作流追溯到命令、harness 和实际文件选择逻辑，检查动态分片，不只匹配文件名。记录：哪些已覆盖、哪些按条件覆盖、哪些未覆盖、哪些还无法静态证明。

特别核查 TASK-086 的全仓分片、graph / extraction / resume / proof、制品/回执绑定，以及一般 PR 与 develop 的执行路径差异。覆盖并集应可核对；不同入口重复执行同一测试与漏测要分别报告。找出缺少入口、环境未建模、引用失效、命名误导等问题，但本阶段不修复。

## 5. 验证与结果语义

本阶段验收的是审计完整性与可复现性，不是全仓业务测试通过。

对同一受审 commit 连续生成清单两次：稳定排序，验证无重复 ID/路径，所有候选均有归类，引用路径有效，计数一致。规范化内容哈希不得混入时间戳、临时目录和机器绝对路径；运行时间等易变元数据放单独回执。

允许验证新审计生成器本身（例如临时 fixture 验证扫描/去重/漏项检测），但不得在正式源码里注入假失败或修改现有测试。用于验证的临时文件只属于本审计目录或专用临时目录，生成器不得修改受审文件。

不要求为了交付本阶段而运行全仓回归、完整图重建、真实浏览器、DB runtime 或 Provider smoke；这些全部逐项标明未执行。缺 Docker、浏览器或 API Key 不阻塞静态审计本身，也不构成环境测试 PASS。

历史 711/713、历史基线失败、历史 CI 绿色只能引用为历史证据。不得自动将历史失败加入豁免名单；“零新增失败”也不等于全仓全绿。

回执至少分开记录：`auditValidation`、`businessTestsExecution`、`ciStatus`。PR CI 运行时区分 PR head、event SHA 与实际 checkout SHA；merge-ref 测试不能改称分支 exact-head 实测。CI 尚未运行或失败，不得写 PASS，也不得为了审计交付修改 timeout 或跳过原质量门。

## 6. 写入边界

允许写入：

1. 本补充 Task 与本阶段 Result。
2. `docs/qa/TASK-035/phase-1/` 内的审计报告、JSON 清单、只读生成器及其自身验证资料。
3. `docs/project/WBS-TravelAssist.md` 中仅 WBS 9.1 相关状态/追踪段，保留 Owner A、原 #265 / #272 与历史证据。
4. 原 Issue/PR 的说明性进度记录，不改变原 PR head、合并状态或审查状态。

禁止修改：`.github/workflows/**`、package.json、lockfile、Node/依赖版本、现有 runner/loader、现有 tests、src 业务代码、DB migration、POI/Transport/Asset 数据及证据。不得调整 TASK-086 门禁；不得启动或重跑 POI 数据生产；不得调用真实付费 Provider、访问生产 DB 或执行 db:reset。

只读 fetch 可用；不打印或上传 Secret。禁止 force push、自动合并、开启 auto-merge、关闭 #265，或新建另一份实现 PR 来取代 #272。

## 7. 交付物

```text
docs/qa/TASK-035/phase-1/README.md
docs/qa/TASK-035/phase-1/test-inventory.json
docs/qa/TASK-035/phase-1/ci-coverage-map.json
docs/qa/TASK-035/phase-1/legacy-pr-reuse-review.md
docs/qa/TASK-035/phase-1/audit-validation.json
docs/qa/TASK-035/phase-1/next-phase-recommendation.md
docs/qa/TASK-035/phase-1/inventory-audit.mjs
  （仅在需要可复现生成器时新增；不得执行目标测试）
docs/tasks/RESULT-TASK-035-b-wbs-9-1-phase1-audit-only.md
```

报告必须回答：当前有多少独立测试文件/辅助文件；哪些入口在何种事件下覆盖它们；哪些环境无法静态确认；旧 PR 有哪些可复用项；下一阶段需要改哪些文件、风险是什么。下一阶段建议是待审清单，不是实现授权。

## 8. WBS 与 GitHub 交付规则

本阶段开始执行时，在审计分支中记录 9.1 为“进行中（#265 / TASK-035-A；B 执行 Phase 1 audit；原实现 PR #272 未合并）”，Owner 保持 A。历史旧 PR 的“待审查”记录保留并标注历史，不冒充当前已验收。

阶段成果达到验收条件后，写明“进行中（Phase 1 审计成果待人工审查；runner/CI 后续阶段未授权）”。不得把父 WBS 9.1 改成“已完成”，也不得因仅审计完成宣称整个实现待合并。

Task / Result / QA / WBS 改动提交并推送到审计文档分支；第一阶段不要求新开 PR，使用原 #265 / #272 记录审计成果链接。不要使用 `Closes #265`。若仓库外部自动化创建了审计 PR，如实报告、保留 Draft、不合并。

完成后停止，不进入第二阶段。最终报告包含受审 SHA、发布 commit、文件数与分类、未决项、验证结果、未执行项目、受保护文件零改动证据及 GitHub 链接。发布 commit 写入外部交付回执，不让产物为了包含自身最终 SHA 而无限追加提交。

## 9. 第一阶段验收表

- [ ] 复用 #265 / TASK-035-A，核实 #272 当前状态；未另起实现。
- [ ] 固定并记录实际受审 develop 与旧 PR head。
- [ ] 全部已发现候选文件被归类；未知项显式记录，无静默漏项。
- [ ] 用途、测试层级、执行环境、资源属性与执行状态分开。
- [ ] CI 按事件/条件/入口映射，含间接 harness 与分片。
- [ ] 旧 PR 逐项 REUSE / REWORK / SUPERSEDED / DEFER，有证据。
- [ ] 同输入两次清单一致，去重/计数/引用校验通过。
- [ ] 未执行的业务测试明确标记；未复用历史 PASS 充当前结果。
- [ ] CI、package、既有测试、业务源码与数据均零修改。
- [ ] WBS Owner A 不变，父任务未标完成；Task/Result/WBS 追踪一致。
- [ ] 成果已推送审计分支；原 PR 未合并，未关闭 Issue。
- [ ] 停在人工审查点，没有进入 runner/CI 实现。

## 10. 证据入口

- WBS 发布快照：https://github.com/kanzakimy0/TravelAssist/blob/4888b4d507ee75d4f6b9914eb1a8d5661813f64b/docs/project/WBS-TravelAssist.md
- 原 Issue：https://github.com/kanzakimy0/TravelAssist/issues/265
- 原实现 PR：https://github.com/kanzakimy0/TravelAssist/pull/272
- 原 Task：https://github.com/kanzakimy0/TravelAssist/blob/f157f23ba1b93def006c2703ea8f42dcd9266c01/docs/tasks/TASK-035-a-test-baseline-freeze.md
- 原基线文档：https://github.com/kanzakimy0/TravelAssist/blob/f157f23ba1b93def006c2703ea8f42dcd9266c01/docs/qa/test-baseline.md
- 当前工作流：https://github.com/kanzakimy0/TravelAssist/blob/4888b4d507ee75d4f6b9914eb1a8d5661813f64b/.github/workflows/quality-gate.yml

## 11. 给执行者的启动指令

```text
仓库：kanzakimy0/TravelAssist。
本次我是 B，只执行 WBS 9.1 第一阶段审计。
沿用 TASK-035-A / Issue #265，Canonical Owner 保持 A。

先检查工作树和远端，安全 fetch 后读取：
分支 docs/b-wbs-9-1-phase1-audit-20261006
文件 docs/tasks/AMENDMENT-TASK-035-b-wbs-9-1-phase1-audit-only.md

再读取原 TASK-035、Issue #265、PR #272，以及最新 develop。
按补充 Task 执行旧 PR 复用审计、测试清单和当前 CI 映射。
只在独立、干净的审计 worktree 工作，不改原实现分支。
不改 CI、package、既有测试、业务代码或 POI/交通数据；不跑真实 Provider。
不为本阶段强制跑完整回归/图重建；未执行项目必须明示。
只交付审计资料、Result 和 WBS 9.1 的阶段追踪，提交推送后停止。
不要 merge、不要自动开启下一阶段、不要把 WBS 9.1 标成已完成。
```
