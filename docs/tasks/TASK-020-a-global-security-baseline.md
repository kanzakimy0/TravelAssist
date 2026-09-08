# TASK-020-A — Secret 扫描 / 全局安全基线

## Metadata

- Task ID: `TASK-020-A`
- WBS: `9.10`
- Owner: `A`
- Responsibility: `Shared Infrastructure / Security`
- Priority: `P1`
- Status: `待审查 / Implementation complete; keep Draft`
- GitHub Issue: `#228`
- Spec branch: `task/a-global-security-baseline`
- Planned implementation branch: `codex/a-global-security-baseline`
- Authoring base: `develop@74bc3cccf8bcfd603706e2b96d4072076191f308`
- Dependency: `WBS 2.8 GitHub Actions CI = 已完成`
- Parallel work: `TASK-019-A / #226 / WBS 8.5` 可并行，但最终交付前必须整合最新 `origin/develop` 并重跑安全回归。

## Execution tracking

- Implementation base: `74bc3cccf8bcfd603706e2b96d4072076191f308`
- Implementation branch: `codex/a-global-security-baseline`
- Result: `docs/tasks/RESULT-TASK-020-a-global-security-baseline.md`
- Implementation commit: `296966016faf131b4a8cc1d008586dda965f1987`.
- Draft PR: [#231](https://github.com/kanzakimy0/TravelAssist/pull/231), Open / Draft → develop.
- WBS 9.10: 进行中 → 待审查; not 已完成. Issue #228 stays Open.
- No auto-merge. User acceptance and develop merge are still required.

## Objective

建立 TravelAssist 可重复、确定性、可在 CI 执行的 Secret / credential leakage 安全基线，覆盖当前仓库、Git 历史、环境变量规则、Server-only / Client 边界与生产构建产物。

任何疑似 Secret 都必须以 **redacted finding** 方式处理：

```text
path + category + safe fingerprint/hash + remediation
```

绝对禁止在 terminal transcript、Result、Issue、PR、日志、fixture 或聊天返回中回显真实 Secret/token/password/private key。

## Canonical Sources

执行前读取：

- `CONTRIBUTING.md`
- `AGENTS.md`
- `docs/development/task-tracking.md`
- `docs/project/WBS-TravelAssist.md`
- `docs/architecture/db-orm-migration-standards.md`
- `.gitignore`
- `.env.example`
- `package.json`
- `package-lock.json`
- `.github/workflows/**`
- `src/lib/supabase/**` / `src/server/**` / env/config helpers
- 当前 Mapbox / Auth / DB / provider 配置入口
- 最近 Open PR，尤其 #226 / #221，确认并行边界

## Start Gate / Git Rules

开始前记录：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

要求：

1. 从最新干净 `origin/develop` 创建独立 Worktree / `codex/a-global-security-baseline`。
2. 不从 TASK-019 / TASK-017 / Planner 历史分支叠加。
3. 不删除用户工作区任何未跟踪/未提交内容。
4. 最终 push 前重新 fetch，并安全整合最新 develop；若 DB/Auth/route 配置变化，重新完整扫描与 build bundle 验证。

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

## Hard Safety Rules

- 不读取浏览器密码库、OS credential manager、SSH agent、云厂商 Secret Manager 等仓库外敏感源。
- 不上传 `.env.local`、真实 token、数据库密码、OAuth secret、私钥。
- 不调用第三方“上传源码扫描”服务。
- 不因发现疑似 Secret 就把原值写进 Issue / Result。
- 不自动撤销/轮换真实凭据；只能给出明确的 rotation recommendation。
- 如果必须确认某值是否为真实 key，只能使用本地脱敏 fingerprint / prefix category；不得外发验证。

## Scope

### 1. Repository Secret Scanner

建立仓库内可重复执行的 scanner，建议放：

```text
tools/security/
```

要求：

- Node/TypeScript 或现有项目技术栈实现，优先不增加大型依赖。
- 支持 tracked files 扫描。
- 支持 Git history object/text 扫描。
- 对二进制、超大文件、生成目录设安全 size limit / skip reason。
- 输出 machine-readable report + human-readable summary。
- 默认输出只允许 redacted value / hash fingerprint。
- exit code 可用于 CI gate。
- 支持维护明确 allowlist；allowlist 必须按规则/路径/fixture 原因记录，禁止全局关闭某类检测。

至少检测：

- PEM/private key blocks。
- AWS/GCP/Azure 常见 credential marker（若项目无使用，也作为通用防线）。
- GitHub PAT / App token markers。
- Supabase service role / secret key / JWT secret / DB URL credential。
- OAuth client secret。
- Mapbox secret/public token 的边界：公开 Mapbox token 可按产品规则允许，但 Secret Token 不得进入 client；allowlist 必须区分 public vs secret。
- Stripe/Payment provider 等未来高风险 key patterns。
- 通用 `password=`, `api_key=`, `secret=`, bearer token 等高置信模式。
- URL embedded credentials。
- `.env*` 真实值误提交。
- `NEXT_PUBLIC_*` 中出现 server-only secret category。

不要只靠 entropy；必须降低对 mock/fixture/文档占位的误报。

### 2. Git History Scan

必须扫描当前可达 Git history，而不只扫描 HEAD。

要求：

- 避免将二进制资产全部解码导致内存失控。
- 记录扫描 commit/object 数、skipped binary/oversize 数。
- 对命中历史 Secret 只报告 path / commit short SHA / category / fingerprint。
- 不改写 Git history、不 force push。
- 如发现历史疑似真实 Secret：Result 标 `Security Finding`，建议 rotate；历史清理另建专门授权 Task。

### 3. Environment / Configuration Boundary

审计并在必要时补强：

- `.gitignore` 对 `.env`, `.env.local`, provider credential 文件的保护。
- `.env.example` 只能是空值/明显 placeholder。
- `NEXT_PUBLIC_` 只能包含明确允许的公开配置。
- `DATABASE_URL`, Supabase secret/service-role, OAuth secret 等不得被 client import。
- server-only modules 应有可验证边界。
- 测试/fixture 不使用看起来像真实生产 secret 的字符串，避免 scanner allowlist 腐化。

### 4. Client Bundle Leakage Regression

生产 build 后扫描 browser/client chunks：

- `.next/static/**` / browser bundle 中不得出现 server-only env names、known secret categories、测试 secret fixture 原值。
- 建立自动测试，证明 server-only Auth / DB / provider modules 不进入 client bundle。
- 允许公开配置（例如 publishable/anon/public map token）必须有明确 allowlist + 理由。

### 5. Logs / Reports / Error Surface

审计高风险日志：

- 不日志记录 Authorization header、Cookie session、access/refresh token、DB URL、provider secret。
- Error object / debug dump 不应把 env/config 整包输出。
- 新 scanner 自身也不得输出命中原文。

本 Task 不要求重构整个 logging subsystem；发现范围外问题可做最小安全修复并记录。

### 6. CI Security Gate

把确定性扫描加入现有 CI，要求：

- PR / push 可运行。
- 运行时间受控。
- 当前 tracked files scan 为强制 gate。
- history scan 若成本过高，可在 CI 采用 bounded strategy，同时保留本地 full-history script；必须文档解释。
- scanner 自身有 positive / negative fixture tests。
- CI 日志保证 redacted。

## Explicitly Out of Scope

本 Task 是 `9.10`，不提前完成：

- `9.9` API Rate Limit / Security Headers / CSP。
- `10.1` Dev/Preview/Prod 环境搭建。
- Production secret rotation / Dashboard 操作。
- 第三方渗透测试。
- 账户删除 / privacy lifecycle。
- Provider 选型或 Route API。
- Planner / Personal Center UI 改造。

如果安全发现必须修改少量相关代码，可以做最小修复；不要扩大成 9.9/10.x。

## Required Tests

至少覆盖：

- known fake private key fixture → detected + redacted。
- fake Supabase/service-role pattern → detected。
- public placeholder / `.env.example` → allowed。
- fake Mapbox public token vs secret token boundary。
- URL credential pattern。
- allowlist exact-match/expiry/reason validation。
- binary/oversize skip behavior。
- scanner 输出不含原 secret。
- client bundle leakage negative test。
- server-only import boundary。

## Validation

必须如实执行可用命令并记录：

```text
npm ci（如独立 worktree需要）
security scan: tracked files
security scan: git history
security scanner tests
lint
typecheck
all Node tests
build
client bundle scan
format check / changed-file prettier
git diff --check
```

全仓既有 format debt 必须与本 Task 新增问题分开说明。

## Deliverables

至少：

```text
tools/security/**
tests/task-020-security*.mjs (或等价)
docs/security/secret-scanning-baseline.md
docs/security/secret-scan-report.md (redacted only)
docs/tasks/RESULT-TASK-020-a-global-security-baseline.md
必要的 .gitignore/.env.example/package scripts/CI workflow 最小修改
docs/project/WBS-TravelAssist.md 更新
```

## WBS / Tracking Rules

- 正式启动：`9.10 → 进行中`。
- 实现与本地验收完成、Draft PR 未合并：`9.10 → 待审查`。
- 只有用户验收 + 合入 `develop`：`9.10 → 已完成`。
- Issue #228 在用户最终验收前保持 Open。
- 最终实现 PR 必须 Draft → develop，不自动 merge。

## Required Final Result

```markdown
# TASK-020-A Result

## Status

Completed / Partially Completed / Blocked

## Base / Parallel State

- origin/develop base:
- TASK-019-A state:
- TASK-017-B state:
- final develop integration:

## Security Scan

- tracked files scanned:
- history commits/objects scanned:
- binary/oversize skipped:
- findings by category:
- confirmed secret values printed: No

## Findings

- critical/high/medium/low counts:
- redacted finding references:
- rotation required:
- history rewrite required: No / separate authorization required

## Engineering Controls

- scanner:
- allowlist:
- client bundle guard:
- server-only guard:
- CI gate:

## Validation

- scanner tests:
- history scan:
- lint:
- typecheck:
- tests:
- build:
- bundle scan:
- format/diff:

## Tracking

- Issue: #228
- Branch:
- Commit:
- Draft PR:
- WBS updated:

## Scope Preserved

- no real secret printed:
- no credential store access:
- no forced history rewrite:
- 9.9 / 10.x not claimed:

## Ready For Review

Yes / No
```

完成后停止，不自动执行 9.9、9.11、10.1 或其他后续 Task。
