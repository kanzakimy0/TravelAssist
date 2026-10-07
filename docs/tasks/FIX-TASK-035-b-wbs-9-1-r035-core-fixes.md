# FIX-TASK-035-B — WBS 9.1 核心缺陷 R035-01～04 修复

## 1. 任务身份

- Parent Task：TASK-035-A
- WBS：9.1「测试框架与全局基线」
- Canonical Owner：A / Shared Infrastructure / QA
- 本次执行支持：B
- Issue：#265
- 实现 PR：#272（沿用，禁止另建替代实现 PR）
- 唯一实现分支：`codex/a-test-baseline-freeze`
- 本 Task 发布分支：`docs/b-wbs-9-1-r035-core-fix-task-20261007`
- 发布依据：审核分支 `docs/b-wbs-9-1-review-task-20261007@13503912bbbc163f6464457cfe820e6d748930d7`
- 发布时受审实现 head：`a77ec0ae24a555aba09ed6c6fc6520d2a5e2442c`
- 发布时 develop：`4888b4d507ee75d4f6b9914eb1a8d5661813f64b`
- 状态：READY FOR FIX

本 Task 只修复独立审核中已复现的 **R035-01、R035-02、R035-03、R035-04**。  
**R035-05（共享 CI / 冻结认证输入绑定）不在本 Task 修复范围内。**

本 Task 不依赖 POI 补齐，不等待 WBS 7.x 数据任务，不修改 TASK-085/086 的数据、认证证据、业务规则或冻结产物。

---

## 2. 必读输入

执行前读取：

1. 根目录与相关目录 `AGENTS.md`
2. 最新 `docs/project/WBS-TravelAssist.md`
3. `docs/tasks/RESULT-REVIEW-TASK-035-b-wbs-9-1-phase2-acceptance.md`
4. `docs/qa/TASK-035/review-phase2/findings.md`
5. `docs/qa/TASK-035/review-phase2/review-evidence.json`
6. Phase 2 Task / Result / QA
7. Issue #265、PR #272 当前状态与评论
8. 最新 develop 与 PR head

若 PR #272 head 已前进，先审查增量；不要把旧 SHA 的复现结论机械套到新代码。

---

## 3. 工作树与 Git 规则

- 只在独立、干净、由本任务占用的 worktree 执行。
- 核对 origin 为 `kanzakimy0/TravelAssist`。
- 不 stash/reset/clean 其他工作树。
- 沿用 `codex/a-test-baseline-freeze` 与 PR #272。
- 禁止 rebase、force push、直接写 develop/main。
- 不另建替代实现 PR。
- 正常 fetch 后，如 develop 前进，正常 merge 最新 develop，并记录实际 merge-base。
- 不自动合并 PR，不开启 auto-merge，不关闭 Issue。

---

# 4. 必修缺陷

## R035-01 — P1：顶层 assert 脚本被误判为 ZERO_TESTS

### 已证实行为

`tools/qa/task-035-receipt.mjs` 当前对每个文件 summary 要求：

`counts.tests > 0`

但仓库已有 REQUIRED 测试文件（例如 `tests/task-086-rights-binding.test.mjs`）是顶层 assert 脚本，不注册 `test()`。Node 执行成功时：

- 文件级 summary 可为 `tests=0`
- 最终 summary 仍将脚本计为成功执行
- 子进程 exit = 0

当前 `verifyEvents()` 因此错误抛出 `ZERO_TESTS`。

### 修复要求

- 明确支持两种已审阅执行类型：
  1. registered node:test 文件
  2. top-level assertion script
- 不允许简单删除 `tests > 0` 约束后全局放行。
- 对 top-level assertion script 必须仍证明：
  - 文件确实被选中；
  - 进程成功；
  - 文件执行事件/最终 summary 与选择集合一致；
  - 不存在 failed/skipped/todo/cancelled；
  - 文件没有被静默漏跑。
- 不修改原业务测试文件以迁就 runner。
- 不把任意“0 tests”文件自动视为成功。

### 必加测试

至少覆盖：

- 真实/等价 top-level assert 成功脚本 → PASS
- top-level assert 抛错 → FAIL
- 真正空文件 → 仍 FAIL
- registered tests 正常计数不回退
- nested TAP 不重复计数

---

## R035-02 — P2：Windows npm 子命令无法启动

### 已证实行为

`tools/qa/task-035-baseline.mjs` 的 quality 路径生成：

`["npm", "run", script]`

`tools/qa/task-035-process.mjs` 使用无 shell 的 `spawn(command,args)`。

Windows 标准 npm 通常由 `npm.cmd` 提供；审核实测直接执行 `npm` 返回 `ENOENT`，而 cmd 调用成功。

### 修复要求

- 建立**集中、受控**的 npm 命令解析/启动方式。
- Windows 能正确启动 npm scripts。
- Linux/macOS 现有行为保持。
- 不为任意外部字符串启用通用 `shell:true`。
- 路径含空格、参数含空格/特殊字符时不得被错误拼接或命令注入。
- 回执中的 argv/command 语义必须仍可审计。
- 非零退出、signal、timeout、spawn error 必须继续传播为失败。

### 必加测试

至少覆盖：

- Windows/npm shim 解析路径或等价模拟
- 含空格 cwd
- 参数含空格
- 特殊字符不被 shell 展开
- npm 子命令非零退出保持失败
- Linux/Posix direct spawn 回归

如果当前执行环境不是 Windows，必须保留审核已提交的 Windows 复现证据，并用可控 shim 单测验证；不能写“Windows PASS”除非有 Windows 实测。

---

## R035-03 — P2：治理测试依赖预先存在 .artifacts

### 已证实行为

全新 clean checkout 中 `.artifacts` 不存在时：

`tests/task-035-runner.test.mjs`

会在 `readdirSync(.artifacts)` 处 ENOENT，导致推荐的聚焦命令 11/12。

### 修复要求

- clean checkout、`.artifacts` 不存在必须是合法初态。
- 测试应验证“import 不产生副作用”，而不是假设目录已存在。
- 建议比较：
  - import 前目录是否存在；
  - import 后状态是否保持等价；
  - 若目录存在，则内容不被意外改变。
- 不要求用户先运行其他 Task 来创建 `.artifacts`。
- 不通过在仓库中提交空目录来掩盖问题。

### 必加测试

- `.artifacts` 不存在 → 聚焦治理测试 PASS
- `.artifacts` 已存在且有 sentinel → import 后 sentinel 不变
- selector import 不执行目标 tests

---

## R035-04 — P2：异常计数可进入 PASS 聚合

### 已证实行为

当前 `verifyEvents()` 对 counts 的结构与一致性校验不足。审核已复现以下异常输入可被接受：

- `passed` 缺失
- `passed < 0`
- 文件级结果很小，但最终 `tests=999`
- 构造完整 receipts 后 `aggregateDirectory()` 仍可能返回 PASS

### 修复要求

对测试事件和 receipt 计数建立明确 schema / invariant：

- 必需字段存在；
- `tests/passed/failed/skipped/todo/cancelled` 为非负整数；
- success 与 failed/cancelled 等字段一致；
- 最终 summary 与文件级执行模型一致；
- registered test 与 top-level assert 的计数规则明确；
- nested child 不重复累计；
- receipt 中记录的 counts 必须与事件重新计算结果一致；
- 聚合不能只验证 hash/SHA/runAttempt 而接受数学上不成立的 counts。

不要用简单“所有文件 counts 求和 = final”解决，因为 Node 对顶层脚本、suite/container、nested tests 的 reporter 语义可能不同。应先固定当前 Node v24 reporter 的受支持模型，再编码 invariant。

### 必加测试

至少拒绝：

- missing passed
- negative count
- passed > tests（若当前模型不允许）
- failed > 0 但 success=true
- final/file summary 明显不一致
- receipt counts 与 events 重算不同

同时保持：

- registered test 正常 PASS
- top-level assert 正常 PASS
- nested child 不重复计数
- 空集/异常 skip 继续 FAIL

---

# 5. 明确不处理的内容

本 Task **不得**：

- 修改 TASK-085/086 数据；
- 刷新 TASK-086 冻结认证证据；
- 修改 transport graph / certification business rules；
- 删除或放宽既有 TASK-086 断言；
- 修改 POI/Feature43 数据；
- 修改 DB migration；
- 调用真实 Provider；
- 执行 db:reset；
- 新增第二套测试框架；
- 越界处理 WBS 9.2～9.11；
- 因 R035-05 失败而停止 R035-01～04 的修复与验证。

R035-05 只在 Result 中保留为外部集成状态，不属于本轮修复完成门。

---

# 6. 允许修改范围

允许按最小必要范围修改：

```text
tools/qa/task-035-receipt.mjs
tools/qa/task-035-baseline.mjs
tools/qa/task-035-process.mjs
tools/qa/task-035-reporter.mjs
tools/qa/task-035-inventory.mjs（仅确有必要）
tests/task-035-runner.test.mjs
tests/task-035-test-baseline.test.mjs
docs/qa/TASK-035/phase-2/（仅本次 fix/validation 追加）
docs/qa/test-baseline.md
docs/tasks/RESULT-FIX-TASK-035-b-wbs-9-1-r035-core-fixes.md
docs/project/WBS-TravelAssist.md（仅 WBS 9.1 tracking）
```

如需修改 `package.json`，只能修改 TASK-035 scripts 的最小入口，且需说明理由。  
默认不修改 workflow；若修复 R035-01～04 确实必须改 workflow，先证明必要性并限制最小 diff。

---

# 7. 验证顺序

## 7.1 聚焦治理验证

先运行：

```text
npm run test:baseline:inventory -- --check
node --import ./tests/register-route-ts.mjs --test tests/task-035-test-baseline.test.mjs tests/task-035-runner.test.mjs
```

要求 clean checkout 首次运行就通过，不得先创建 `.artifacts` 作为隐藏前置。

## 7.2 R035-01 真实兼容验证

至少单独执行已有 top-level assertion 测试，通过真实 reporter + `verifyEvents()` 路径验证：

- 原脚本 exit 0
- validator 接受
- 真正空脚本仍拒绝
- 原断言失败仍拒绝

不得修改原业务测试内容。

## 7.3 R035-02 跨平台验证

Windows 环境可用时必须实际跑 npm 启动路径；记录：

- Node/npm/OS
- cwd
- argv
- exit
- log hash

若只有非 Windows 环境，则运行受控 npm.cmd shim / spawn 模型测试并将 Windows 实机状态写为 `NOT_RETESTED`，不能冒充 PASS。

## 7.4 R035-04 合成恶意回执验证

用审核专用 synthetic fixtures 验证异常 counts 全部被拒绝；不把 synthetic 结果当业务测试证据。

## 7.5 回归

完成 R035-01～04 后，至少：

- TASK-035 全部治理测试 PASS
- inventory check PASS
- 受影响的 receipt/process/reporter focused tests PASS
- lint
- typecheck
- `format:check:deploy`
- `git diff --check`

如修改 build/runtime 入口，再执行 deploy build/artifact 检查。

---

# 8. 验收标准

本 Task 可以标记修复完成，仅当：

- [ ] R035-01 已修复并有真实 top-level assert 成功/失败证据。
- [ ] 真正空测试仍被拒绝。
- [ ] registered test / nested TAP 行为不回退。
- [ ] R035-02 Windows npm 启动缺陷已修；有 Windows 实测或明确 NOT_RETESTED + 强 shim 回归证据。
- [ ] R035-03 clean checkout 无 `.artifacts` 时治理命令首次即通过。
- [ ] R035-04 异常 counts / receipt 全部被拒绝，正常 counts 可通过。
- [ ] 非零/timeout/signal/spawn error/skip/空集/错 SHA/错 attempt/错 hash 的失败传播不回退。
- [ ] inventory 与选择集合仍一致。
- [ ] 无正式业务测试、数据或认证证据被修改。
- [ ] lint/typecheck/format/diff-check 通过。
- [ ] Result、QA 与 WBS 9.1 tracking 已更新并推送。
- [ ] PR #272 仍 Draft；Issue #265 仍 Open。
- [ ] 未合并、未 auto-merge、未关闭 Issue。

本轮完成后：

- **只允许写“R035-01～04 已修复 / 待复核”或同等状态。**
- 不得因为这 4 项修复就把整个 WBS 9.1 标为“已完成”。
- R035-05 的共享集成门状态必须单列，不能混成这四项修复失败。

---

# 9. 交付物

```text
docs/tasks/RESULT-FIX-TASK-035-b-wbs-9-1-r035-core-fixes.md
docs/qa/TASK-035/phase-2/core-fix/
  README.md
  validation-summary.json
  focused-results.json
  （必要的去敏小型复现/回执）
docs/project/WBS-TravelAssist.md
```

Result 必须逐项给出：

- R035-01：FIXED / NOT_FIXED
- R035-02：FIXED / NOT_FIXED / NOT_RETESTED_ON_WINDOWS
- R035-03：FIXED / NOT_FIXED
- R035-04：FIXED / NOT_FIXED
- 精确实现 head
- 实际执行命令与结果
- 是否有新增失败
- 修改文件
- 未验证范围
- R035-05 当前状态（只读记录）
- PR #272 / Issue #265 状态

完成后 push 原实现分支并在 #265 / #272 添加说明性回执，停止等待人工复核。

---

# 10. 禁止的收尾行为

不得：

- merge PR #272
- enable auto-merge
- GitHub APPROVE
- close #265
- 将 WBS 9.1 标记已完成
- 启动其他 WBS
- 为了让 CI 变绿而修改 085/086 数据或冻结认证证据
