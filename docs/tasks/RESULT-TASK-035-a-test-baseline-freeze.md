# TASK-035-A Result — Test Framework / Global Baseline Audit and Freeze

## Status

`Partially Completed / Review`

WBS 9.1 的框架盘点、统一入口、CI 接线、运行规则与证据已完成并可审查。全仓 Node baseline 没有伪报全绿：713 项中 711 PASS、2 FAIL，均为执行基线 `origin/develop@171900698180b80220017c9c4bec551b72792f27` 已存在的 Asset catalog stale。TASK-035 没有越界重写素材清单或静默跳过失败。

## Tracking

- Issue: [#265](https://github.com/kanzakimy0/TravelAssist/issues/265)
- WBS: 9.1 → `待审查`
- Base: `171900698180b80220017c9c4bec551b72792f27`
- Branch: `codex/a-test-baseline-freeze`
- Commit: `91cd32afa5f6954ed865e2457b84c8897c49cc19`
- Draft PR: [#272](https://github.com/kanzakimy0/TravelAssist/pull/272) — Open / Draft

## Inventory

- 61 个源基线 `tests/*.test.mjs`；本 Task 新增 1 个治理回归，共 62 文件。
- 709 个源基线实际 Node cases；本 Task 与 canonical loader 后为 713 cases。
- 16 个 task-owned `.browser.mjs` harness。
- 4 个 Local DB/Auth `.runtime.mjs` harness。
- 6 个 loader/client-boundary/helper/fixture 文件。
- 50 个源基线 `tools/qa/*.mjs`；本 Task 新增 1 个共享浏览器 smoke，共 51 个。
- 4 个 GitHub workflows。
- Open Draft PR #231 的 Security suite 与 Open Draft PR #245 的 Observability/Performance suite 已审计，但不属于 develop 本次 baseline，也未复制进本分支。

完整逐层/逐文件清单、Owner、命令、数据规则与 Deferred 分类见 `docs/qa/test-baseline.md`。

## Implemented

- 新增唯一 `npm test`：沿用 Node `node:test` 与现有 Planner TypeScript resolver，不安装 Jest/Vitest/Playwright 等第二套项目测试框架。
- Quality Gate 由重复的 raw Node 命令改为 `npm test`。
- `npm run typecheck` 先执行 `next typegen`，使 clean checkout 按 Next.js 16 当前规则生成 `next-env.d.ts` 后再 `tsc --noEmit`；生成文件保持 ignored，不人工编辑。
- 新增 local-only `npm run qa:browser:smoke`，在 1440×900 / 390×844 对 Home、Start、Planner、Detail 做真实 Edge 状态码、横向溢出及 React/hydration error smoke。
- 新增治理测试，锁定 canonical script、CI mapping、无第二框架和文档所需分层/状态规则。
- 冻结 deterministic fixture、临时 Auth/DB cleanup、Deferred taxonomy 和 flaky quarantine 规则。

## Validation

| Command / evidence                                  | Result                                                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                            | PASS；395 packages；audit 0 vulnerabilities                                                                      |
| Source raw `node --test "tests/*.test.mjs"`         | 709 total / 706 pass / 3 fail；15.781s Node duration；1 个 TS resolver harness failure + 2 个既有 Asset failures |
| Canonical `npm test`                                | 713 total / 711 pass / 2 fail；15.775s Node duration / 16.272s wall；仅两项既有 Asset failures                   |
| `node --test tests/task-035-test-baseline.test.mjs` | PASS 3/3；53ms                                                                                                   |
| `npm run test:routing`                              | PASS 28/28；264ms                                                                                                |
| `npm run test:db-foundation`                        | PASS 13/13；1.384s                                                                                               |
| Local Supabase `db:start` / `db:status`             | PASS；loopback-only endpoints；未 reset                                                                          |
| TASK-016 Local Profile runtime                      | PASS 25/25；1.340s Node duration；transaction rollback verified                                                  |
| TASK-018 Local Auth runtime                         | PASS 16/16；10.167s；Windows local Docker named pipe explicitly supplied；synthetic users cleaned                |
| `npm run db:stop`                                   | PASS；volumes preserved                                                                                          |
| `npm run qa:browser:smoke`                          | PASS 8/8 route/viewport rows；真实 Edge；7.980s；无横向溢出或 hydration error                                    |
| `npm run lint`                                      | PASS；50.893s                                                                                                    |
| `npm run typecheck`                                 | PASS；`next typegen` + `tsc --noEmit`；11.988s                                                                   |
| `npm run build`                                     | PASS；19 routes；18.644s                                                                                         |
| `npm run deploy:validate:local`                     | PASS；fallback map / disabled external providers / observability export off                                      |
| `npm run deploy:build:local`                        | PASS；1,736-file standalone artifact audited；26.317s                                                            |
| `npm run deploy:verify-artifact`                    | PASS；1,736 files / 0 failures                                                                                   |
| `npm run format:check:deploy`                       | PASS                                                                                                             |
| `npm run format:check`                              | FAIL；31 份执行基线既有文档/JSON格式 debt；本 Task 未批量改写                                                    |
| `git diff --check`                                  | PASS                                                                                                             |

## Known Failures

1. `tests/task-013-1-asset-variants.test.mjs` — `nightly --verify-only does not write canonical catalogs`：verify-only 检测到 stale canonical catalog，确定性复跑仍失败。
2. `tests/task-013-assets.test.mjs` — 完整素材库校验报告四个已移除 design SVG 仍在 legacy inventory：`ai-trip-flow.svg`、`home-concept.svg`、`preference-panel-concept.svg`、`trip-planner-concept.svg`。

两项归属 A / Asset pipeline，应在独立 Asset-owned follow-up 中重新生成并审查 canonical catalogs。TASK-035 不修改这些清单，不 `.skip`、不 quarantine、不中断失败可见性。

## Deferred / Not Claimed

- Live Ekiworld / Mapbox：`DEFERRED_CREDENTIAL`；browser smoke 使用现有 fallback，不声称 live provider。
- Google/Apple OAuth、SMS、hosted Supabase：`DEFERRED_EXTERNAL` / `DEFERRED_AUTHORIZATION`。
- Safari、Firefox、iOS、Android、物理触屏/键盘：`DEFERRED_PLATFORM`。
- Preview/Production/cloud deployment：`DEFERRED_AUTHORIZATION`。
- B 的完整 Auth visual browser runtime 未在本 Task 重跑；其已有 task-owned harness 保留，本 Task 仅运行 shared public-route smoke。
- Security PR #231 与 Observability PR #245：Pending review；不是 TASK-035 PASS，也不从其分支堆叠。

## Files Changed

- `.github/workflows/quality-gate.yml`
- `package.json`
- `docs/qa/test-baseline.md`
- `docs/tasks/CODEX-TASK-035-a-test-baseline-freeze-command.md`
- `docs/tasks/TASK-035-a-test-baseline-freeze.md`
- `docs/tasks/RESULT-TASK-035-a-test-baseline-freeze.md`
- `docs/project/WBS-TravelAssist.md`
- `tests/task-035-test-baseline.test.mjs`
- `tools/qa/task-035-browser-smoke.mjs`

## Review Gate

WBS 9.1 保持 `待审查`。只有 Draft PR 合入 `develop` 且用户验收通过，才能更新为 `已完成`。两项 Asset failure 需要独立修复或明确接受为已知 baseline debt，不能因本 Task 合并而自动变绿。
