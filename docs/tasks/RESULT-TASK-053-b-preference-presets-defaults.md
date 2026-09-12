# TASK-053-B Result — WBS 5.13 Preference Presets / Defaults v1

## 状态与基线

- Owner：B / Personal Center；Issue #345。
- 实现及真实 Local Supabase/Auth/browser 验收完成，WBS 5.13 待审查；不标记已完成。
- 执行基线：`4da2b8883069cd415eee6e18129c874383286653`，最新 origin/develop；未从 Spec Branch 开发。
- 实现分支：`codex/b-account-wbs-5-13-preference-presets-defaults`。
- [Draft PR #346](https://github.com/kanzakimy0/TravelAssist/pull/346)；base = develop；Issue #345 保持 Open。
- 最终 exact head 的 SHA / Quality Gate run 将记录在 PR 与 Issue 审查记录；只有该 head PASS 后才交付，后续 commit 必须重新验证。

## 实现

新增唯一 browser-safe Preset registry，直接复用 canonical `PreferencePatchV1`、`parsePreferencePatchV1`、`applyPreferencePatch`、`parsePreferenceV1`。没有第二套 23-key registry/parser。

| Preset ID             | 名称         | canonical set                                                                | canonical unset                                             |
| --------------------- | ------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| mobility_easy         | 轻松移动     | mobility.fewerTransfers=true；mobility.walkingTolerance=low                  | mobility.noPublicTransit / noBus / noFerry                  |
| mobility_standard     | 标准移动     | mobility.walkingTolerance=standard                                           | mobility.fewerTransfers / noPublicTransit / noBus / noFerry |
| dining_local          | 当地饮食优先 | dining.localCuisine=prioritize；smallShops=prioritize；queueTolerance=medium | 无                                                          |
| dining_flexible       | 灵活用餐     | dining.localCuisine=neutral；smallShops=neutral；queueTolerance=high         | 无                                                          |
| accommodation_comfort | 舒适省心     | accommodation.transportConvenience / comfort / fewerHotelChanges=prioritize  | 无                                                          |
| accommodation_neutral | 保持中性     | accommodation.transportConvenience / comfort / fewerHotelChanges=neutral     | 无                                                          |
| budget_economical     | 节省预算     | budget.spendingTendency=economical                                           | budget.prioritizeAccommodation / prioritizeExperience       |
| budget_moderate       | 中等预算     | budget.spendingTendency=moderate                                             | budget.prioritizeAccommodation / prioritizeExperience       |
| budget_flexible       | 预算灵活     | budget.spendingTendency=flexible                                             | budget.prioritizeAccommodation / prioritizeExperience       |

表格缩写字段均沿用所在 category 前缀；实际精确 patch 由 Task 与 pure tests 逐项核对。

现有 `CanonicalPreferenceEditor` 的四个支持分类加入“快速模板”。点击只调用 `state.edit` 修改 draft；明确提示点击“保存偏好”后才会保存。资源未加载和 busy 时禁用，取消、保存、清空与 CAS 全部复用现有 5.16 流程。

匹配比较模板全部 set 与 unset，缺失、显式 false 和 neutral 严格区分。修改受控字段后不继续显示原模板精确选中；显示“自定义”或当前实际精确匹配。其他 category 不影响匹配且应用时保持不变。

长期默认值始终为 `{ "schemaVersion": "1.0", "values": {} }`。GET、页面打开、注册初始化和 global reset 不自动应用或写入模板。没有 Attraction/Interest/Interest Detail/style Preset。

## 旧值审计

完整分类见 `docs/qa/TASK-053/legacy-audit.md`：旧 mobility preset label、category summary 和 radar 属展示；`lessWalking`、旧六轴兴趣/强度、photoExperience、notSpecial 和高层 style 值存在歧义，不映射。Dining/accommodation/budget 中可无损表达的明确值只按本 Task 冻结 patch 使用，旧 mock defaults 不作为 persistence source。

## 测试与真实验收

| Suite                          | 结果                 |
| ------------------------------ | -------------------- |
| baseline 全仓                  | 2439/2439            |
| candidate 全仓                 | 2461/2461            |
| TASK-053 pure                  | 22/22                |
| TASK-053 Local/browser         | 21/21，20 个验收场景 |
| test:preferences               | 503/503              |
| test:preferences:db            | 505/505              |
| test:preference-api            | 37/37                |
| test:preference-api:local      | 17/17                |
| test:preference-contract       | 540/540              |
| test:preference-contract:local | 13/13                |
| test:trip-library-api          | 76/76                |
| test:trip-library-api:local    | 35/35                |

所有测试 fail/skip = 0。真实 Local wrappers db:start/status/reset 均执行；没有 migration/generated type 变化，未运行 db:types。

真实 A/B/anon 验证了：fresh GET 无 row side effect、页面打开零 mutation、9 个模板逐个点击零写入、显式 Save/reload、取消/未保存刷新、切换模板、自定义编辑、其他 category 保留、分类清空、global reset、双 Cookie 会话 stale revision 409、A/B 隔离和 anon 拒绝。

5.14 verified request-scoped read 仅返回 canonical Preference 与 source revision；Trip Library draft/save 和真实数据库快照没有 preset metadata。已验证 private/no-store 与 Vary 保持。模板 ID/label/description/match 不进入 DB 或 API payload。

1440×900 desktop、390×844 mobile 已真实运行和截图复核，mobile 无横向溢出，page JS errors = 0。截图在本地 ignored `.artifacts/task053`，不纳入产品资产 catalog。最终纯测试与全部真实回归完成后，A/B 测试用户、相关业务行和 Storage fixture residue 均为 0。

## Quality Gates

- npm ci、typecheck、build、format:check:deploy、deploy:validate:local、deploy:build:local、deploy:verify-artifact、git diff --check：通过。
- npm run lint：基线和候选同为 7 项旧 `.cache/qa/task024-worktree/.cache/qa/*.cjs` 的 no-require-imports 错误，输出逐字相同；本次源码/测试 ESLint = 0 错误。未改旧 cache 或放宽 lint。
- 首轮全仓两项资产 catalog 检查因 QA 截图位于 docs 失败；将截图输出移到 ignored QA artifact 后完整重跑 2461/2461。没有修改或绕过资产检查。
- 初轮测试文件格式问题已修复，最终 format:check:deploy 通过。
- 生产 browser JS/HTML 扫描及 registry import graph 检查通过；没有 DB、private Auth、server-only implementation。
- GitHub Quality Gate：要求最终 exact PR head 单独 PASS，审查记录包含该 head 与 run 链接；不复用基线或旧提交。

## 变更文件

- `src/features/preferences/presets/preference-presets.ts`
- `src/features/preferences/persistence/canonical-preference-editor.tsx`
- `src/features/preferences/persistence/preference-editor.module.css`
- `tests/task-053-preference-presets.test.mjs`
- `tests/task-053-preference-presets.runtime.mjs`
- `package.json`：仅新增 pure 与 Local 两个测试命令。
- 四份正式 Launcher / Task / architecture / start 文档：从 Spec Branch 逐文件读取备份，Markdown hard break 使用反斜杠消除 trailing whitespace，冻结内容保持。
- 本 Result、`docs/qa/TASK-053/README.md`、legacy audit、三份 sanitized JSON evidence。
- `docs/project/WBS-TravelAssist.md`：只修改 5.13 状态行，其他 A/B 状态和历史全部保持。

## 边界与交付

DB/API/Auth/RLS/revision/CAS、5.14 read contract、Trip Library persistence、Planner/AI/Engine/POI、A 43 维 contract 无改动。没有 migration/RPC/表/列、新 API、preset metadata persistence 或 23→43 mapping。

Issue #345 = Open；PR #346 = Draft/Open → develop；WBS 5.13 = 待审查（#345 / TASK-053-B；Draft PR #346）。未合并，未启动 8.6、9.5、9.6 或其他后续 Task；未执行任何禁止的 Git 命令。
