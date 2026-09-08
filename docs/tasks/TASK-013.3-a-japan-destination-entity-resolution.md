# TASK-013.3-A — 日本300目的地实体解析与验收

## Metadata

- Task ID: `TASK-013.3-A`
- Owner: `A`
- Priority: `P1`
- Status: `待验收`（Partial 交付；46 个目的地尚未通过全部证据门槛）
- Prerequisite audit: PR #187 merged；develop `553b01480345a4e26bd2b7952cf917b2cbbaea4f` 已含 300 destination / 9000 unresolved POI / 40 batch / Result；2.15 保持 Partial。
- WBS: `2.16`
- Depends On: `TASK-013.2-A / PR #187`（已合并）
- Commit: `PENDING`（实现提交后同步）
- Pull Request: `PENDING`（Draft → develop；不得合并）
- Issue: `#189`
- Branch: `feature/a-japan-destination-entity-resolution`
- Stacked Base: `c28c14c619e2bc51daf78f3eede4e2a218ec482d`（PR #187 head）
- Final Base Requirement: PR #187 合并到 `develop` 后同步最新 `origin/develop`
- Result: `docs/tasks/RESULT-TASK-013.3-a-japan-destination-entity-resolution.md`

## Goal

将 TASK-013.2-A 中 300 个 Japan-only destination 从规划槽位解析为稳定、可审核、可供后续 9,000 POI 解析使用的目的地实体。

本 Task 不生成图片，不下载图片，不解析 9,000 个 POI。

## Preconditions

必须先确认：

1. PR #187 已合并到 develop；
2. `docs/tasks/RESULT-TASK-013.2-a-core-destination-generation-manifest.md` 已存在于 develop；
3. 300 destination seed / manifest / 40 batches 已进入 develop；
4. WBS 2.15 保持 Partial / 待后续，而不是错误标记为素材已完成。

任一未满足：返回 Blocked，不轮询，不继续。

## Required Outputs

更新/新增：

```text
docs/assets/catalog/core-destination-generation-manifest.v1.csv
docs/assets/catalog/japan-destination-entity-evidence.v1.jsonl
docs/assets/catalog/japan-destination-aliases.v1.csv
docs/assets/generated/japan-destination-resolution-summary.md
docs/assets/generated/japan-destination-overlap-review.md
docs/assets/generated/japan-destination-source-evidence.md
docs/assets/generated/japan-destination-prefecture-audit.md
docs/assets/generated/japan-destination-coordinate-audit.md
```

## Destination Fields

300 行均需完成或明确状态：

```text
destination_id
entity_type
name_ja
name_zh
name_en
canonical_name
aliases
prefecture_code
prefecture_name_ja
prefecture_name_zh
prefecture_name_en
latitude
longitude
coordinate_source_type
coordinate_source_url
official_source_type
official_source_url
provider_type
provider_entity_id
coverage_scope
parent_destination_id
entity_status
review_notes
```

## Evidence Priority

按以下顺序：

1. JNTO 官方目的地目录；
2. 日本国家/都道府县/市町村官方旅游或政府页面；
3. 已批准的 Provider 实体；
4. 可追溯开放知识实体；
5. 无法确认则保持 unresolved，不得猜测。

每个 destination 至少有一个 source evidence。若没有可靠来源，不得标记 verified。

## Entity Types

只允许明确枚举：

```text
city
town
village
ward
island
region
hot_spring_area
resort_area
destination_cluster
historic_district
other_review_required
```

不得为了统一而把所有实体都写成 city。

## Coverage Scope

每个 destination 必须描述其旅游覆盖范围，例如：

- exact municipality
- central urban area
- island-wide
- resort cluster
- multi-municipality tourism area
- historic district

若 destination 名称是市场常用旅游名而非行政实体，必须记录 coverage_scope 和 parent/alias 关系。

## Coordinate Rules

- 使用可信来源中的代表中心点；
- 不伪造高精度；
- 纬度范围 `20..46`，经度范围 `122..154` 作为日本粗校验；
- 异常岛屿需允许合理边界但必须有来源；
- 坐标必须与 prefecture / entity scope 一致；
- 不得用某个景点坐标冒充整个目的地中心而不说明。

## Prefecture Audit

必须做到：

```text
rows = 300
prefecture resolved = 300
47 prefectures covered
unresolved prefecture = 0
invalid prefecture code = 0
```

若同一旅游区跨多个都道府县，使用 `region` / `destination_cluster`，并在 evidence 中记录 primary / secondary coverage，不强行塞进单一行政市。

## Duplicate / Overlap Audit

检测：

- canonical_name + prefecture；
- aliases；
- provider_entity_id；
- 坐标邻近；
- parent/child；
- 同一行政实体多种旅游名称；
- 同一岛屿与岛内城市重复。

允许合理重叠，但必须在 `japan-destination-overlap-review.md` 明确说明用途与后续 POI 归属规则。

## Downstream POI Contract

为后续 40 个 POI batch 固定：

```text
destination_id
coverage_scope
prefecture_code
center
parent_destination_id
allowed_poi_boundary_policy
```

后续 POI 解析不得再次自行重新定义 destination 边界。

本 Task 不修改 9,000 POI 名称槽位，只允许验证其 destination 外键仍全部有效。

## Scripts / Tests

优先复用 TASK-013.2 工具，新增或扩展：

```text
tools/assets/resolve-japan-destinations.mjs
tools/assets/validate-japan-destination-resolution.mjs
tests/task-013-3-japan-destination-resolution.test.mjs
```

package scripts：

```text
assets:japan-destinations
assets:japan-destinations:validate
test:japan-destinations
```

不新增 npm 依赖。

## Validation

执行：

```bash
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
```

再次运行 resolver + validator，输出应为确定性 no-op。

## Acceptance

必须真实达到：

```text
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
```

如果仍有任何 destination 无法验证：Status = Partial，不得伪造完成。

## WBS / Result / PR

- WBS 新增 `2.16 | 日本300目的地实体解析与验收 | A | P1 | 2.15`；若占用则用下一个可用 ID。
- 开始执行 = 进行中；实现完成未合并 = 待审查；合并验收后 = 已完成。
- 创建 Result 文件并记录真实 resolved/unresolved 数量、evidence 分布、47 prefecture coverage、duplicate/overlap、验证命令。
- 更新 Issue #189。
- Push 到 `feature/a-japan-destination-entity-resolution`。
- 创建 Draft PR → develop。
- 关联 #189、#152、PR #187。
- 不自动 merge。

## Result Format

```md
# TASK-013.3-A Result

## Status

Completed / Partial / Blocked

## Prerequisite

## Tracking

## Destination Resolution

- total
- verified
- unresolved
- entity types

## Prefecture Audit

## Language Names

## Coordinates

## Evidence

## Aliases / Overlap

## Downstream POI Contract

## Validation

## Files Changed

## WBS Update

## Commit(s)

## Draft PR

## Follow-ups

## Known Limitations
```
