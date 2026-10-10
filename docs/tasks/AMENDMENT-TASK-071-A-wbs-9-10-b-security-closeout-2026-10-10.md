# AMENDMENT — TASK-071-A / WBS 9.10 安全基线最新 develop 收尾（B 协助执行提案）

- 发布日期：2026-10-10（Asia/Tokyo）
- 项目：TravelAssist
- WBS：**9.10 — Secret 扫描 / 全局安全**，P1
- Canonical Owner：**A**（保持不变）
- 拟执行人：**B**（需 A 先明确授权接管本任务的代码集成；本任务书发布本身不是授权）
- 唯一上游任务：**TASK-071-A**，沿用 [Issue #404](https://github.com/kanzakimy0/TravelAssist/issues/404)
- 唯一既有安全实现：**Draft [PR #231](https://github.com/kanzakimy0/TravelAssist/pull/231)**，原分支 `codex/a-global-security-baseline`
- 当前 WBS 状态：**待审查**，但 PR #231 尚未合并、已落后于当前 develop；不得标为已完成
- 发布时确认：`develop@cfd51e42f96e43f84f406c6aab5aab6e408b713e`（WBS 9.1 完成后）
- 发布时安全分支 HEAD：`fa3fe589759408172c647d932d8ce477d3ae20d4`
- GitHub PR 状态：Open / Draft / Unmerged，`mergeable_state=dirty`（存在冲突，具体文件待本轮实测）
- 原安全分支使用的 develop base 为 `a16ea611b8fb24cfe751615d54a3828f7ef564ca`，不能复用其 2026-09-21 的旧验收结论作为新 HEAD 的通过证明。

## 0. 总执行纪律

此文件是 TASK-071-A 的 **B 协助执行补充规范**，不是替代 TASK、新增 9.10 功能或重新分配 Canonical Owner。

1. **Gate AUTH（必须）：** 本轮可以先做只读审计和提交授权请求；A **明确同意 B 代为修复和收尾 9.10、复用原 #231 分支**后，才可执行集成、修改源码/安全规则、向原分支推送。若无授权，提交 `BLOCKED_OWNER_AUTHORIZATION` 审计报告后停止；不得用用户要求“生成 Task”替代 A 的授权。
2. **唯一实施入口：** 授权后沿用原 `codex/a-global-security-baseline` 及 PR #231，保留 A 历史提交；不要另起一个安全 implementation PR。可以使用独立干净 worktree 或临时无推送试验分支进行冲突预演，但最终集成必须回到**同一 PR #231**。本任务书的文档发布 PR 不计实现 PR。
3. 禁止 `git reset --hard`、`git clean -fd`、任何形式的 `push --force`、历史重写、未经授权 rebase、直接写入 develop、自动合并或自行开启 auto-merge。
4. 若工作树不干净（包含未追踪文件），**停止并报告**，不得 stash、覆盖、代提交或清除；原 TASK-075、TASK-085、TASK-086、其他 B worktree 不触碰。
5. 禁止读取本机凭据仓库、私有 .env 值、实际 Provider 密钥或远程秘密仓库；不得在 PR、Issue、日志、报告、测试中输出疑似 secret 字符串、上下文、可逆编码。发现疑似真实凭据需**仅**提供路径、规则类别、不可逆指纹/脱敏标记及泄露风险，不做在线真实性验证、自动 revoke/rotate；由 Owner 另行安全处理。
6. 不借 9.10 修改 WBS **9.9**（Rate Limit/CSP/Headers）、9.11、AI、POI 43 维、Transport、Planner 行程业务、生产数据或用户凭据。确实必须触碰其他域的兼容位置，只允许经证明的最小修复并单列代码所有权/风险；无法避免跨 Owner 破坏性调整则停止提交方案。

## 1. 前置事实与不可重复开发点

- WBS 2.8 GitHub Actions CI 已完成；WBS 9.1 测试框架与全局基线于 2026-10-10 完成正式状态收口，参见 [PR #471](https://github.com/kanzakimy0/TravelAssist/pull/471)，其新增的 `npm test` 与 TEST-035 回执、TASK-086 证明链不得被削弱。
- PR #231 已实现安全命令：`npm run test:security`、`security:scan`、`security:history`、`security:boundary`、`security:build`、`security:bundle`；安全文件在 `tools/security/*`、`.github/workflows/security.yml`，含 31/31 历史聚焦测试、tracked/reachable history scan、client/server boundary、synthetic private canary、browser bundle 扫描。
- PR #231 历史候选在旧 SHA 上通过 2,678/2,678 Node tests、[Quality Gate run 35479174089](https://github.com/kanzakimy0/TravelAssist/actions/runs/35479174089) 和 [Security baseline run 35479174118](https://github.com/kanzakimy0/TravelAssist/actions/runs/35479174118)，**这些不是最新 develop 的验收**。
- 既有 allowlist 含 102 条历史精确记录（其中 28 条于 TASK-071-A 经授权加入，expiry `2026-12-20`）。新的扫描必须逐条核对 path/scope/category/fingerprint/reason/expiry；不得自动续期、创建 wildcard 或仅通过删除探测类别来清零发现。
- 本任务只做既有安全实现的最新基线兼容和收尾，不添加第二套 scanner、第二条秘密数据通路。

## 2. Phase 0 — 只读审计（立即可做，未经 A 授权不得再进 Phase 1）

1. 在干净隔离环境获取执行时最新 `origin/develop`、`origin/codex/a-global-security-baseline`、PR #231 当前状态。固定确切 SHA、merge-base、`git status --porcelain --untracked-files=all`、历史任务 `TASK-020-A` / `TASK-027-A` / `TASK-071-A` 与 Result、QA。若原任务正文只在原分支，读取原分支，不拷贝未合并代码到 develop。
2. 使用只读 `git merge-tree --write-tree`（或等价安全方式）输出实际 **Git 文本冲突** 列表与 hunk；另外输出 **语义/接口冲突**，例如 9.1 新增全仓测试入口、TASK-086 对 `package.json` / `.github/workflows/quality-gate.yml` 的哈希绑定、现有 Planner 路由变更、最新生成产物和测试集合。
3. 盘点 #231 全部 diff：REUSE / MINIMAL_ADAPT / REQUIRED_OWNER_DECISION / DEFER，说明是否必需同步 `package.json`、security workflow、TS resolve、scanner 规则、allowlist。不要把 `mergeable_state=dirty` 当作已知具体冲突文件名单。
4. 输出 `docs/qa/TASK-071/security-latest-develop-pr231-conflict-audit.md`、脱敏的决策清单及 SHA。若未获 A 授权，保存审计并停止：**BLOCKED_OWNER_AUTHORIZATION**，不得修改/推送旧安全实现。
5. 禁止在未确认的脏工作树上运行会更改内容的构建/安装/生成命令。只读命令也不得解析或打印真实 secret。

## 3. Phase 1 — 经 A 授权后恢复 PR #231（不得新建第二实施 PR）

1. 用 **独立干净 worktree** 引用已有实现分支；记录原 head 和 origin/develop exact SHA，并在现有分支执行**普通 merge 最新 develop**。保留 A 的既有安全实现及最新 develop 的正式业务代码、WBS 9.1 的 accepted 状态、现有测试框架与全部证据。不得自作主张删改已验收历史。
2. 对冲突文件逐个给出两侧语义、最小解和理由。特别核对新增安全 npm scripts 与 9.1 的 canonical `npm test`、现有 TASK-086 认证哈希链、`.github/workflows/security.yml` 与 Quality Gate、Scanner inventory 和 planner server-only 标记。若 TASK-086 冻结输入不兼容，应先用只读绑定证据定位，再依原有认证/Owner 授权刷新派生报告；禁止修改/跳过认证规则或将认证失败记录为通过。
3. 合并变更完成后重新评估 `tools/security/allowlist.json`，限精确受审非敏感 fixture 的 hash-scoped 条目。新真实敏感内容、过期条目、未知类别一律 fail closed；要扩大例外必须交由 A/用户明确审批，不能自行放宽。
4. 再核对所有新增 Auth/DB/Planner/AI/POI/API/env/CI/build 的 server-only 与 client-transitive import，不允许 `NEXT_PUBLIC` 泄露、私有字段被序列化进客户端，不能以项目 build 成功代替 boundary 测试。
5. 不改变浏览器/后端业务功能、Provider 密钥用法、生产凭据、Auth/RLS、DB migration；若发现真实 secret，立即停止集成并按受限安全事件处理。

## 4. Phase 2 — 必须运行并收集的实际 QA

执行时以**整合后的仓库真实脚本**为准，至少运行：

```bash
npm ci
npm run test:security
npm run security:scan
npm run security:history
npm run security:boundary
npm run security:build
npm run security:bundle
npm run test:baseline:inventory -- --check
npm test
npm run lint
npm run typecheck
npm run deploy:validate:local
npm run format:check:deploy
npm run deploy:build:local
npm run deploy:verify-artifact
git diff --check
```

- `security:build` 仅使用随机 synthetic canaries；不加载真实 .env/credential，确保浏览器 bundle canary 泄露数量为 **0**；build/scan 的输出只能包含无害计数/指纹，不能回显源值。
- 扫描按实际 fetched reachable refs；记录 tracked files / decoded bytes / binary / oversized / shallow history / unfetched refs / LFS exclusions，不得把排除范围当作已检查无泄露。真实需求之外不得提升 size/time 限制。
- 所有 current tracked 和 reachable-history unresolved findings = 0；false-negative fixtures / boundary findings / canary leaks = 0；失败/timeout/signal/skip/unknown 都不得标 PASS。
- 在**exact head** 和 **PR merge-result** 分别运行当时必须的 GitHub Quality Gate、Security workflow，并核对真正的 checkout SHA、run/attempt、全套所需 CI jobs、最终聚合；不得复用 `fa3fe...` 旧绿灯。必要时额外做合并后验证，但只有实际运行成功才能记录 PASS。
- 如果完整 `npm test` 因 TASK-086 新的绑定规则、资源或基础设施失败：给出 baseline 对照、失败的 mandatory gate、完整日志/回执与 `BLOCKED`，不可将该门降级为 warning。
- DB 实际运行、Browser E2E、External Secret Store、真实 Provider Credential validity、第三方 rotation/revoke、生产部署、WBS 9.9 CSP/Headers/Rate Limit 不属于本轮，准确标 `NOT_RUN/OUT_OF_SCOPE`。

## 5. 验收与交付

在现有分支/PR #231（仅在 A 授权后）更新：

- `docs/tasks/RESULT-TASK-071-a-security-final-closeout.md`（附实际新 SHA、基线、差异、冲突解决、完整测试计数、可复跑命令、遗留排除），保留原阶段历史事实；
- `docs/qa/TASK-071/` 下机器可审计且全程脱敏的 QA 回执、安全范围矩阵、合并及测试证据；
- `docs/security/secret-scanning-baseline.md` 中确实失效的覆盖统计与规则说明；
- `docs/project/WBS-TravelAssist.md` 的 **9.10 对应行**：实施中为“进行中”，完整验证后但未合并为“待审查”；Canonical Owner 仍 A，执行注明 B 获授权代办，不影响其他 WBS。
- Issue #404 和原 PR #231 更新审查回执。未用户明确验收与合并前不得标“已完成”、不得关闭 Issue、不得自动合并。

### 完成门槛

- [ ] A 明确授权 B 在原 #231 上实施（记录授权链接或明确的用户/Owner 文字）。
- [ ] 当前最新 develop 已安全整合，原 A 历史保留，真实冲突逐文件有理由。
- [ ] Security scanner、tracked + reachable history、allowlist、bundle synthetic canary、client/server boundary 全部 fail-closed 无未处理发现。
- [ ] 当前 9.1 canonical test suite/CI 全量门通过，TASK-086 冻结认证链未被弱化。
- [ ] CI 分支 exact-head 与 PR merge-result 的必需门各自真实 PASS，SHA/run/attempt 能核查。
- [ ] 无真实 secret 值出现在 Task/PR/Issue/测试/日志/产物。
- [ ] 所有非执行范围诚实记录；无第二安全实现 PR。
- [ ] WBS 状态准确，最终 Result/QA 产出，原 PR #231 停留 Draft / Open 等待人工验收。

## 6. Codex 执行口令

先完整阅读本 Amendment、Issue #404、PR #231、其三个历史 TASK/RESULT 与仓库 `AGENTS.md`。**先只执行 Phase 0**，输出当前冲突清单和复用计划。如果确认 A 明确授权 B 处理 #231，才继续 Phase 1–2，复用原 `codex/a-global-security-baseline` 与 PR #231，完整回归和安全证据后停止待审查；不要自动合并，任何真实 secret/未解决强制 Gate 则立即阻塞报告。
