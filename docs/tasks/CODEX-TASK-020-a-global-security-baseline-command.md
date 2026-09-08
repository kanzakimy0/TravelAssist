# CODEX — TASK-020-A 执行命令

请在 TravelAssist 仓库中完整执行 `TASK-020-A — WBS 9.10 Secret 扫描 / 全局安全基线`。

Repository:
`https://github.com/kanzakimy0/TravelAssist`

Issue:
`#228`

Task spec branch:
`task/a-global-security-baseline`

Implementation branch:
`codex/a-global-security-baseline`

开始前：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

读取远端完整 Task：

```bash
git show origin/task/a-global-security-baseline:docs/tasks/TASK-020-a-global-security-baseline.md
```

必须从最新 `origin/develop` 创建独立干净 Worktree / `codex/a-global-security-baseline`，不得从 TASK-019-A、TASK-017-B、Planner 历史分支或 Task spec branch 开发。

执行重点：

1. 建立 deterministic repository secret scanner。
2. 扫描 tracked files。
3. 扫描可达 Git history，带 binary/oversize safeguards。
4. 检查 `.env*` / `.gitignore` / `.env.example` / `NEXT_PUBLIC_*` 边界。
5. 检查 Supabase service role / DB / OAuth / Mapbox secret/public / GitHub / cloud/provider credential patterns。
6. 所有 finding 只允许 redacted fingerprint，绝不输出真实 Secret。
7. 建立 positive / negative / allowlist / redaction tests。
8. 生产 build 后扫描 client bundle，确认 server-only secret/env/module 未泄漏。
9. 审计高风险日志，必要时做最小安全修复。
10. 把 tracked-file scan 接入现有 CI gate；full-history scan 可本地全量、CI bounded，但必须记录原因。
11. 生成 `docs/security/secret-scanning-baseline.md` 与仅脱敏的 scan report。
12. 完整执行 tests / lint / typecheck / build / bundle scan / format audit / diff check。
13. 最终 fetch 最新 develop；如 TASK-019-A 或其他共享基础设施已合入，安全整合并重新完整扫描与回归。
14. 更新 Result / Master WBS / Issue #228。
15. push `codex/a-global-security-baseline`，创建 Draft PR → develop，不自动合并。

严禁：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

额外硬规则：

- 不访问 OS credential manager / 浏览器密码库 / SSH agent / cloud secret manager。
- 不上传源码到第三方扫描服务。
- 不打印、复制、提交或聊天返回任何真实 token/password/private key。
- 不自动 rotation/revoke credentials。
- 不改写 Git history；发现历史 Secret 时只记录脱敏 finding，并建议另建授权 Task。
- 不提前实现 WBS 9.9 CSP / Rate Limit / Security Headers，也不执行 10.x。

完成后按 Task 的 `Required Final Result` 格式返回，完成后停止。
