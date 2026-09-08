# TASK-021-A Result

## Status

**Blocked — Stage 1 Freeze Gate 未通过。**

已完成 Japan-first 四候选官方来源矩阵；未冻结 Provider，未进入 Stage 2/3。阻塞是套餐、覆盖、授权和预算决策，不是缺少一个 API Key。必须取得矩阵所列书面证据后重跑 Gate，不能仅凭“继续”越过前置。

## Base / Parallel State

- origin/develop base: `74bc3cccf8bcfd603706e2b96d4072076191f308`。
- TASK-019-A state: Issue #226 Open；实际 [PR #227](https://github.com/kanzakimy0/TravelAssist/pull/227) Open / Draft / unmerged，head `f0226b784ede9c310c3796d50edf2592455d117b`；未叠分支或加入 8.5 hook。
- TASK-020-A state: [Issue #228](https://github.com/kanzakimy0/TravelAssist/issues/228) Open / Ready，未提供实现 PR，本次 develop 未包含其成果。Task 中 #226/#228 是 Issue 而非 PR，不将 PR 查询 404 解释为任务不存在。
- final develop integration: 提交前再次 fetch，origin/develop 仍为上述 base，无新提交需要整合。
- TASK-017-B: [PR #221](https://github.com/kanzakimy0/TravelAssist/pull/221) Open / Draft / Partial / unmerged，head `ae8b1e18ea713a2d86b1126178522e1752b1cb8d`；未修改 B 数据表。
- Conflict audit: 独立 clean worktree 从最新 develop 创建，原工作区 Planner 未提交修改保留。本次三个文档路径，WBS 是唯一共享修改点。未修改 lockfile、env、Schema、Migration 或业务代码。
- Spec: [正式 Task](https://github.com/kanzakimy0/TravelAssist/blob/bbe077a22d5b57fe0752a868d5b135c57454fc77/docs/tasks/TASK-021-a-route-system-mainline.md) / [Codex command](https://github.com/kanzakimy0/TravelAssist/blob/bbe077a22d5b57fe0752a868d5b135c57454fc77/docs/tasks/CODEX-TASK-021-a-route-system-mainline-command.md)；按 Blocked 仅研究/Result/WBS 规则未复制 spec 分支。

## Stage 1 — WBS 7.3

- official sources checked: 2026-09-09 JST；[完整来源矩阵](../architecture/route-provider-selection.md)，含官方版本、国家例外、收费、条款、失败检索和未知项。
- candidate providers: Mapbox / Google Maps Platform Routes / HERE / NAVITIME JAPAN。
- Japan walking/driving: Mapbox/NAVITIME 为候选，未完成真实 Japan smoke 或授权冻结；HERE Japan 例外排除 walking/cycling。
- Japan rail/subway/bus transit: Mapbox 无 transit profile；[Google FAQ](https://developers.google.com/maps/faq) 明确排除日本；HERE Japan 班次覆盖未证实；NAVITIME 套餐/运营商范围需书面确认。
- pricing/quota verified: 已记录公开计费单位、限额、免费额度；NAVITIME 真正时刻表需[单独报价](https://api-sdk.navitime.co.jp/api/specs/tips/averagetime.html)，普通平均时间套餐不能替代。HERE 可用付费价目未确认。
- licensing/cache restrictions verified: 已识别 Google 展示限制、HERE Japan retention 特例、NAVITIME 保存/地点来源/使用限制；**没有确认可用于 TravelAssist 的完整授权组合**。Mapbox 最新法律 PDF 读取失败，未套用旧 TTL。
- selected primary: **None / 未冻结**。
- selected fallback/transit provider: **None / 未冻结**。建议询价方向：保留 Mapbox 展示，评估 NAVITIME direct timetable；不是已批准实施方案。
- selection gate: **BLOCKED**（G1/G3/G4/G6 阻塞；G2/G7 有条件；G5 仅技术能力通过）。
- blocker requiring user decision: 月度预算与调用规模、真实班次/公交范围、Mapbox 混合展示和保存字段/TTL、未来 Mobile 使用授权；需供应商书面 scope/quote。本次未联系、购买或签约。

## Stage 2 — WBS 7.5

- executed: **No**。
- canonical contract path: 未创建 `src/shared/contracts/routes/**`。
- schema version: N/A — 未冻结。
- route/leg/segment/step: N/A — 未实现。
- transit metadata: N/A — 未实现。
- time/distance/fare semantics: N/A — 未建立公共契约；研究中的 Provider 字段不是 Schema。
- error model: N/A — 未实现。
- validator/fixtures: N/A — 未创建，未伪造响应。

## Stage 3 — WBS 7.8

- executed: **No**。
- service/API path: N/A — 未创建。
- provider adapters: None。
- request/response validation: N/A。
- timeout/retry: N/A。
- cache boundary: 未实现，未将未确认 ToS 写成固定 TTL。
- secret boundary: 未读取私有 env，未创建或提交真实 Key，现有浏览器 Mapbox 配置不变。
- live smoke: **DEFERRED — Stage 1 Gate 阻塞**；真实路线 API 调用为 0，不是 PASS，也未断言本机没有 Key。

## Validation

- research validation: 四候选、全部矩阵维度、七门槛逐项审计；明确区分官方能力/合同授权、平均时间/班次、绘图/路线服务。
- route tests: Not run / N/A，未进入 Stage 2/3。
- all tests: Not run，按 Task Stage 1 Blocked 例外仅交付研究和追踪。
- lint: Not run（无代码修改）。
- typecheck: Not run（无类型修改）。
- build: Not run（无运行时修改）。
- format/diff: 新增矩阵和 Result 的 Prettier 检查 PASS；WBS 仅 8 行新增 / 1 行替换，保留原格式，基线与当前均有历史格式告警；diff 检查 PASS。未声称全仓格式通过。
- Research structure check: PASS — 4 候选、7 Gates、38 个官方来源链接引用完整，7.5/7.8 状态断言为未开始；未替代逐页官方证据审查。
- Browser QA: N/A，未改 UI，未干扰原预览服务。

## Tracking

- Issue: [#229](https://github.com/kanzakimy0/TravelAssist/issues/229)，保持 Open / Blocked。
- Branch: `codex/a-route-system-mainline` → `develop`。
- Commit: PENDING。
- Draft PR: PENDING。
- WBS 7.3: **待确认 / 阻塞**。
- WBS 7.5: **未开始**。
- WBS 7.8: **未开始**。
- Files changed: `docs/architecture/route-provider-selection.md`、本 Result、`docs/project/WBS-TravelAssist.md`，仅研究与追踪。
- 4.6/4.14、8.5、B 任务及后续 7.6/7.9/7.10/7.11 状态不变；PR 保持 Draft，不自动合并或完成 #229。

## Scope Preserved

- Planner UI unchanged: **Yes**。
- POI 7.2/7.4 untouched: **Yes**。
- AI/Engine/Booking untouched: **Yes**。
- no real secret committed: **Yes**，不含 Token、Cookie、私有协议或带凭据请求 URL。
- Existing work preserved: **Yes**，原工作区未切换、清理、重置或覆盖。

## Ready For Review

**No — 路线主线未完成，Provider 决策未冻结。**

Stage 1 研究文档可供负责人审查；恢复条件见矩阵书面证据清单。到此停止，不进入 7.5/7.8 或其他后续 Task。
