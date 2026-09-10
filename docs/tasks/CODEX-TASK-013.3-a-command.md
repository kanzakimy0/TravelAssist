# Codex 执行指令 — TASK-013.3-A

```text
请在 TravelAssist 仓库中完整执行 TASK-013.3-A：日本300目的地实体解析与验收。

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#189

Branch:
feature/a-japan-destination-entity-resolution

Hard dependency:
PR #187 必须已合并到 develop，且 TASK-013.2-A planning manifest 已进入 develop。

开始前执行：

git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop

禁止：

git clean -fd
git reset --hard
git push --force
git push --force-with-lease

读取远端完整 Task：

git show origin/feature/a-japan-destination-entity-resolution:docs/tasks/TASK-013.3-a-japan-destination-entity-resolution.md

切换已有分支：

git switch feature/a-japan-destination-entity-resolution
git pull --ff-only origin feature/a-japan-destination-entity-resolution

若本地不存在：

git switch --track -c feature/a-japan-destination-entity-resolution origin/feature/a-japan-destination-entity-resolution

前置检查：

1. PR #187 已 merged；
2. develop 中存在 TASK-013.2-A Result；
3. 300 destination manifest、9000 unresolved POI slots、40 batches 已进入 develop；
4. WBS 2.15 保持 Partial / planning-manifest 状态。

任一不满足：
- 不轮询；
- 不继续；
- Result = Blocked；
- 在 Issue #189 写明实际 develop SHA 与缺失项；
- 不创建实现 PR。

前置满足后，将最新 origin/develop 安全 merge 到当前分支，不 rebase 已推送分支，不 force push。

本 Task 只解析 300 个日本目的地，不解析 9000 个景点，不生成或下载任何图片。

必须完成：

- 300 个 destination 稳定实体身份；
- 正确 entity_type；
- 300/300 都道府县归属；
- 47 都道府县覆盖；
- ja / zh-CN / en 标准名称与 aliases；
- 300 个可信中心坐标；
- 300 个 source evidence；
- official/JNTO/地方政府来源优先；
- provider/open entity ID 可用时绑定，不可捏造；
- 每个 destination 的 coverage_scope；
- parent/child/alias/overlap 关系；
- duplicate / overlap audit；
- 后续 POI 解析固定的 destination boundary contract。

证据优先级：
1. JNTO；
2. 日本国家/都道府县/市町村官方政府或旅游资料；
3. 已批准 Provider；
4. 可追溯开放知识实体；
5. 无法确认则 unresolved，不得猜测。

禁止：
- 把所有实体统一写成 city；
- 把旅游区、岛屿、温泉乡硬写成行政市；
- 伪造经纬度、Provider ID、官方 URL；
- 简单把英文名复制进中文/日文栏位；
- 修改 9000 个 POI 槽位的具体名称；
- 生成图片；
- 修改业务 UI；
- 新增 npm 依赖。

必须产出：

docs/assets/catalog/japan-destination-entity-evidence.v1.jsonl
docs/assets/catalog/japan-destination-aliases.v1.csv
docs/assets/generated/japan-destination-resolution-summary.md
docs/assets/generated/japan-destination-overlap-review.md
docs/assets/generated/japan-destination-source-evidence.md
docs/assets/generated/japan-destination-prefecture-audit.md
docs/assets/generated/japan-destination-coordinate-audit.md

并更新：

docs/assets/catalog/core-destination-generation-manifest.v1.csv

Acceptance：

destination rows = 300
verified entity identity = 300
verified prefecture = 300
three-language canonical names = 300
valid center coordinates = 300
coverage_scope = 300
source evidence = 300
unresolved destination = 0
unresolved prefecture = 0
unresolved duplicate conflict = 0

如果任何 destination 无法验证，Status 必须是 Partial，不得伪造 Completed。

执行：

npm ci
npm run assets:japan-destinations
npm run assets:japan-destinations:validate
npm run test:japan-destinations
npm run assets:core-validate
npm run test:core-generation
npm run lint
npm run typecheck
npm run format:check
npm run build
git diff --check

再次运行 resolver + validator，验证 deterministic no-op。

更新 WBS：
2.16 | 日本300目的地实体解析与验收 | A | P1 | 2.15
如 2.16 已占用，使用下一个可用 ID，不覆盖。

创建 Result：
docs/tasks/RESULT-TASK-013.3-a-japan-destination-entity-resolution.md

更新 Issue #189。
Commit 并 push 到 feature/a-japan-destination-entity-resolution。
创建 Draft PR → develop，关联 #189、#152、PR #187。
保持 Draft，不自动 merge。

最后严格按 Task Result 格式返回真实数量、证据来源分布、都道府县覆盖、坐标、重复/重叠、验证、WBS、Commit 和 Draft PR。
```
