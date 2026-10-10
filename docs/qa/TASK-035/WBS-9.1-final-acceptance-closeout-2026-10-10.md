# WBS 9.1 — 测试框架与全局基线最终验收及状态收口

- 状态：**已完成 / PASS（已验收并已合并）**
- WBS：9.1；Task：TASK-035-A；Issue：[ #265 ](https://github.com/kanzakimy0/TravelAssist/issues/265)
- **Canonical Owner：A；执行及收尾：B**，不变更原分工
- 收口记录日期：2026-10-10（Asia/Tokyo）；原人工验收及合并：2026-10-08 08:41:07（Asia/Tokyo）
- 原始开发 PR：[ #272 ](https://github.com/kanzakimy0/TravelAssist/pull/272) — **MERGED**，本次绝不重复合并原 PR
- 被验收最终 branch HEAD：`0d9a04e855a0704df0563edd72b0d0c78eaf608a`
- 合并前 develop：`4888b4d507ee75d4f6b9914eb1a8d5661813f64b`
- 正式 merge commit / 本次状态收口起始 develop：`8f60c8b94d3f5148abeb414d0d8e209e5d736cea`

## 1. 合并与测试验收证据

| 门禁 | GitHub Run | 已验证事实 |
| --- | --- | --- |
| 分支 exact-head | [37626359282](https://github.com/kanzakimy0/TravelAssist/actions/runs/37626359282) | `push`，HEAD `0d9a04e855...`，completed / SUCCESS；完整 Node 3,905/3,905（原 #265/#272 最终 QA 回执） |
| PR merge-result | [37626364311](https://github.com/kanzakimy0/TravelAssist/actions/runs/37626364311) | `pull_request`，实际测试 merge-result `f1617589bcbf933bd9bc2c27453b6529a6bb9d92`，completed / SUCCESS；完整 Node 3,905/3,905（QA 回执） |
| 合并后的 develop | [37703655019](https://github.com/kanzakimy0/TravelAssist/actions/runs/37703655019) | `push`，HEAD `8f60c8b94...`，completed / SUCCESS；13 jobs 中适用专项链通过，既有 `Install, test and build` 通用替代 job 按条件 skipped |

PR #272 的远端 `merged=true`、`merged_at=2026-10-07T23:41:07Z`；实际 merge commit 的 parents 恰为上述 base + 已验收 HEAD。临时 merge-result 与正式 merge commit 的 tree SHA 同为 `8b0e2631bf365acff68551e8bfd28df3014c4443`，即用于 PR 验证的树与真正合入的仓库内容一致；不可把 `pull_request.head_sha` 错记成实际 merge checkout。

## 2. 实现与质量收口

- `npm test` 使用现有单一 TASK-035 入口，不新设第二套测试框架；动态发现/分片清单、显式 reviewed hash 和 indirect edge 校验均已纳入。
- 跨 Node 测试/Graph 重放/质量门的收据严格绑定 checkout SHA、run/attempt、输入哈希、日志及原生证明链；空/跳过、错误计数、非零退出、超时、信号、缺失/重复/错 HEAD 回执 fail-closed。
- R035-01～04：顶层原生 assertion、Windows npm CLI 传参/退出码、clean checkout / inventory 无副作用、计数/事件及聚合防伪问题均已修复并有聚焦负向验证。
- R035-05：使用原生成器修复冻结认证绑定衍生回执，不更改原始 POI/交通数据、人工审核、算法和认证规则；仅 9 个派生 JSON 更新所需的绑定/哈希元数据；543 项绑定输入、552 项实际读取输入及业务投影等价。原 TASK-086 的业务义务不因本测试框架收口自动关闭。
- 对应最终 QA：[R035-05 Result](../../tasks/RESULT-FIX-TASK-035-b-wbs-9-1-r035-05-evidence-refresh-closeout.md)、[R035-05 QA](r035-05-closeout/README.md)、[Issue 最终验收回执](https://github.com/kanzakimy0/TravelAssist/issues/265#issuecomment-6049085656)、[PR 合并回执](https://github.com/kanzakimy0/TravelAssist/pull/272)。

## 3. 明确保留的测试范围边界

WBS 9.1 是**测试框架与全局基线**的实施验收，不代表以下专项测试已通过：Local DB/Auth 真库、浏览器/移动真机、Safari、Cloud DB、真实 AI Provider、OAuth/SMS、发布部署及其他业务专项 E2E。它们按各自 WBS 管理，不能虚报 PASS；现有 lint **0 errors、69 既有 warnings** 不等于零 warnings。

原 #265/#272 的历史分阶段 Result 含当时 `BLOCKED/待审查` 状态，是保留原始时间点事实；**以最新人工验收合并回执、三次 completed SUCCESS 和本次 WBS 最新状态为准**，不改写历史证据。

## 4. 本轮仅管理性关闭

本轮允许的仓库改动：只更正 `docs/project/WBS-TravelAssist.md` WBS 9.1 为 **已完成**，新增本份状态收口文档；不变更业务代码、QA 算法、数据库、数据或 CI workflow。不重跑已验证的原任务，不借用过去 run 为新提交的代码测试；本轮仅为 docs-only 状态登记。

本次状态同步 PR 经用户明确授权可普通合并；若新 PR 有必需质量门/保护要求，则以实际运行和保护规则为准，不启用 auto-merge 或 force push。成功合并、确认远端 WBS 最新状态后，将 Issue #265 标记 `Closed / completed`，保留原链接及完整测试回执。不修改 9.2、9.3、9.4 或其他下游 WBS 状态。
