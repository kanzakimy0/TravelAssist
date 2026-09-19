# CODEX — TASK-071-A / WBS 9.10 Security 最终收口

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#404

Existing implementation PR:
#231

Existing implementation branch:
`codex/a-global-security-baseline`

Task publication branch:
`task/a-security-performance-final-closeout`

本 Task 不是新实现。必须复用现有 PR #231 / `codex/a-global-security-baseline`，将其与 execution-time 最新 develop 整合并完成最终安全收口。

开始前：
```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/codex/a-global-security-baseline
git log --oneline -15 origin/develop
```

读取完整 Task：
```bash
git show origin/task/a-security-performance-final-closeout:docs/tasks/TASK-071-a-security-final-closeout.md
```

同时读取：
- TASK-020-A / RESULT;
- TASK-027-A / RESULT;
- PR #231 当前 diff/body/checks;
- 当前 Master WBS;
- 当前 deployment / env / auth / server-only / client boundaries.

禁止：
```text
新建第二个 security implementation PR
git rebase
git reset --hard
git clean -fd
git push --force
git push --force-with-lease
history rewrite
读取/打印真实 credential
自动 rotate/revoke credential
实现 WBS 9.9
```

执行要求：
1. 切换到现有 `codex/a-global-security-baseline`。
2. 正常 merge execution-time 最新 `origin/develop`。
3. 仅处理真实 integration conflict / current-repo security compatibility。
4. 对当前仓库重新执行 tracked/history/env/public-name/server-only/client-transitive/build-canary/bundle 全部安全验收。
5. 新增目录、API/server actions、Auth/DB、Planner/Detail、workflow/deployment 均需重新进入覆盖审计。
6. allowlist 必须逐条复核；禁止扩大成宽泛规则。
7. 所有疑似 Secret 输出必须 redact/hash，绝不写原值。
8. 执行完整 QA 与 exact final-head GitHub Quality Gate。
9. 更新 WBS 9.10、RESULT、QA evidence 和现有 PR #231。
10. 保持 PR #231 Draft/Open，不自动 merge。

最终返回：
`# RESULT — TASK-071-A`

必须包含：
- old PR head / latest develop SHA / final head;
- conflicts resolved;
- tracked/history scan counts and exclusions;
- client/server boundary result;
- canary/bundle result;
- allowlist review;
- full regression/lint/typecheck/build/deploy gates;
- hosted Quality Gate;
- Issue #404 / PR #231 / WBS status;
- residual risks and explicitly uncertified scope.
