# TASK-013-A — 共享素材库底座与日本首发目的地素材包

## Metadata

- Task ID：`TASK-013-A`
- Owner：`A`
- Priority：`P1`
- Status：`待执行`
- WBS：新增 `2.13 — 素材库 / Asset Registry 基础`（依赖 `2.6 / 2.7`）
- GitHub Issue：`#112`
- Branch：`feature/a-asset-library-foundation`
- Branch Base：`develop@adb0ec680f96857ca5ace4ccd54979d2dd3ddee2`
- Task File：`docs/tasks/TASK-013-a-asset-library-foundation.md`
- Design Source：`docs/assets/asset-library-strategy.md` v1.0
- Result File：`docs/tasks/RESULT-TASK-013-a-asset-library-foundation.md`
- Pull Request：完成实现后创建 Draft PR → `develop`

---

## 1. 任务目标

建立 TravelAssist 第一版可持续扩展的统一素材库底座，并交付真实可用的通用 SVG 素材、目的地素材包结构、授权可追溯的采购清单和自动校验工具。

本 Task 不要求一次性收集全世界所有城市和景点照片。固定采用：

```text
全局通用素材
→ 首发目的地素材包
→ 长尾 POI 按实际使用量补齐
```

完成后应具备：

- 现有素材可审计；
- 新素材有稳定 ID；
- 来源、授权、缓存、真实性状态可追溯；
- 缺图可稳定 fallback；
- Web 与未来 App 可读取统一 Registry；
- 来源不明图片不会进入 runtime；
- 素材体积与重复文件可自动检查；
- 后续接对象存储 / CDN 时无需推翻 Schema。

---

## 2. Codex 启动顺序（强制）

### 2.1 保护当前工作区

在仓库根目录执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -10 origin/develop
```

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

如果存在与本 Task 无关的未提交内容，不得删除或覆盖；先记录并使用安全 stash / 独立 worktree，或返回 Blocked。

### 2.2 获取预建 Task 分支

本分支已由 Task 生成流程从上述 Base 创建，并已包含 Task 与设计书。

```bash
git switch feature/a-asset-library-foundation
git pull --ff-only origin feature/a-asset-library-foundation
```

然后比较：

```bash
git rev-parse HEAD
git rev-parse origin/develop
git merge-base HEAD origin/develop
git log --oneline --left-right HEAD...origin/develop
```

若 `origin/develop` 已前进：

1. 先检查新增提交是否修改本 Task 高冲突路径；
2. 无高冲突时，将最新 `origin/develop` **merge** 到本 feature branch；
3. 不 rebase 已推送分支，不 force push；
4. 有无法安全解决的冲突时记录 SHA、文件与关联 PR，返回 Blocked。

### 2.3 必须阅读

```text
AGENTS.md
package.json
docs/project/WBS-TravelAssist.md
docs/development/task-tracking.md
docs/assets/asset-library-strategy.md
assets/design/personal-center/photoreal-v3/asset-manifest.json
assets/design/personal-center/photoreal-v3/SHA256SUMS.txt
docs/project/WBS-5.1-VISUAL-ASSET-MANIFEST-PHOTOREAL-V3.md
src/features/start-flow/model/japan-regions.ts
```

并检查：

```text
Issue #112
当前所有 Open A/B Issue / Draft PR
任何修改 public/media/**、assets/design/**、docs/assets/**、src/data/**、tools/**、package.json 的未合并 PR
```

### 2.4 冲突判定

以下路径若正被其他未合并 Task 实质修改，先做 owner / conflict 审计：

```text
package.json
public/media/shared/**
public/media/destinations/**
docs/assets/**
assets/design/asset-library/**
src/data/assets/**
tools/assets/**
tests/task-013-assets.test.mjs
```

`public/media/personal-center/**` 属于受保护既有资产。本 Task 只读审计，不与 B 同时修改。

---

## 3. 当前仓库审计

实现前先扫描：

```text
public/media/**
assets/design/**
docs/assets/**
src/** 中所有 /media/ 字符串引用
CSS 中 url(...)
Next/Image src
Manifest / SHA256SUMS / README / preview
```

### 3.1 Inventory 输出

新增：

```text
docs/assets/catalog/legacy-inventory.v1.json
docs/assets/catalog/asset-aliases.v1.json
docs/assets/generated/duplicate-report.md
docs/assets/generated/size-report.md
```

Inventory 每项至少记录：

```text
path
extension
bytes
sha256
width / height（可读取时）
scope guess
referencedBy
sourceMetadataFound
protected
notes
```

扫描扩展名至少包括：

```text
.svg .png .jpg .jpeg .webp .gif .avif
```

### 3.2 受保护路径

至少将以下现有路径标记为 protected：

```text
public/media/home/**
public/media/start/**
public/media/personal-center/**
assets/design/personal-center/**
```

规则：

- 不删除；
- 不重命名；
- 不覆盖；
- 不改变现有页面引用；
- 重复 SHA 只报告或建立 alias，不擅自合并文件；
- 现有授权信息不足时标记 `legacy_review_required`，不据此声称侵权，也不冒充已授权。

### 3.3 工具实现

新增：

```text
tools/assets/inventory-assets.mjs
```

使用 Node.js 内置模块；不得为本 Task 新增 npm 依赖。

---

## 4. 素材目录与 Schema

建立以下目录：

```text
public/media/shared/
├─ poi-categories/
├─ transport/
├─ map-markers/
├─ placeholders/
└─ states/

public/media/destinations/jp/
├─ tokyo/
├─ kyoto/
├─ osaka/
├─ fuji-hakone/
└─ hokkaido/

assets/design/asset-library/
├─ README.md
├─ source/
└─ previews/

docs/assets/catalog/
docs/assets/generated/
src/data/assets/
tools/assets/
```

空目录不以无意义 `.gitkeep` 作为唯一交付；每个目录必须有实际资产、配置或用途说明。

### 4.1 Catalog

新增：

```text
docs/assets/catalog/asset-manifest.v1.json
docs/assets/catalog/destination-packs.v1.json
docs/assets/catalog/acquisition-backlog.v1.csv
docs/assets/catalog/legacy-inventory.v1.json
docs/assets/catalog/asset-aliases.v1.json
```

`asset-manifest.v1.json` 的每个条目必须覆盖设计书中定义的：

- `id`；
- `assetType`；
- `entity`；
- `locale`；
- `runtime.kind / path`；
- `source`；
- `rights`；
- `presentation`；
- `integrity`；
- `authenticity`；
- `status`。

禁止使用 `any-license`、`internet`、`unknown-but-ok` 等含混值绕过校验。

### 4.2 TypeScript Registry

新增：

```text
src/data/assets/asset-types.ts
src/data/assets/asset-registry.ts
src/data/assets/asset-fallback.ts
src/data/assets/index.ts
```

至少导出：

```ts
getAssetById(id)
getDestinationPack(id)
listAssetsByType(type)
resolveAssetFallback(request)
isRuntimeUsable(asset)
```

要求：

- strict TypeScript；
- 无 `any`；
- 不在组件中硬编码 fallback path；
- 无效 ID 安全回退；
- `acquisition_required / rejected / expired` 不得被当作可用 runtime；
- 不接数据库，不接远程 Provider，不引入运行时网络请求。

---

## 5. 全局 SVG 素材基线（64 项，必做）

所有素材必须为原创的简单几何线性 / 面性 SVG，或由项目现有自有形状重新整理；禁止复制受限第三方图标集。

### 5.1 POI 分类图标（24）

创建：

```text
public/media/shared/poi-categories/landmark.svg
public/media/shared/poi-categories/museum.svg
public/media/shared/poi-categories/art-gallery.svg
public/media/shared/poi-categories/temple.svg
public/media/shared/poi-categories/shrine.svg
public/media/shared/poi-categories/church.svg
public/media/shared/poi-categories/castle.svg
public/media/shared/poi-categories/historic-site.svg
public/media/shared/poi-categories/park.svg
public/media/shared/poi-categories/garden.svg
public/media/shared/poi-categories/nature.svg
public/media/shared/poi-categories/mountain.svg
public/media/shared/poi-categories/beach.svg
public/media/shared/poi-categories/viewpoint.svg
public/media/shared/poi-categories/amusement-park.svg
public/media/shared/poi-categories/zoo.svg
public/media/shared/poi-categories/aquarium.svg
public/media/shared/poi-categories/shopping.svg
public/media/shared/poi-categories/market.svg
public/media/shared/poi-categories/restaurant.svg
public/media/shared/poi-categories/cafe.svg
public/media/shared/poi-categories/bar.svg
public/media/shared/poi-categories/hotel.svg
public/media/shared/poi-categories/onsen.svg
```

### 5.2 交通方式图标（14）

创建：

```text
public/media/shared/transport/walk.svg
public/media/shared/transport/bicycle.svg
public/media/shared/transport/car.svg
public/media/shared/transport/taxi.svg
public/media/shared/transport/train.svg
public/media/shared/transport/subway.svg
public/media/shared/transport/tram.svg
public/media/shared/transport/bus.svg
public/media/shared/transport/ferry.svg
public/media/shared/transport/airplane.svg
public/media/shared/transport/shinkansen.svg
public/media/shared/transport/cable-car.svg
public/media/shared/transport/ropeway.svg
public/media/shared/transport/parking.svg
```

### 5.3 地图 Marker（12）

创建：

```text
public/media/shared/map-markers/marker-default.svg
public/media/shared/map-markers/marker-selected.svg
public/media/shared/map-markers/marker-recommended.svg
public/media/shared/map-markers/marker-itinerary.svg
public/media/shared/map-markers/marker-hotel.svg
public/media/shared/map-markers/marker-dining.svg
public/media/shared/map-markers/marker-activity.svg
public/media/shared/map-markers/marker-transit.svg
public/media/shared/map-markers/marker-parking.svg
public/media/shared/map-markers/marker-warning.svg
public/media/shared/map-markers/marker-error.svg
public/media/shared/map-markers/marker-cluster.svg
```

### 5.4 通用占位图（8）

创建：

```text
public/media/shared/placeholders/placeholder-city.svg
public/media/shared/placeholders/placeholder-region.svg
public/media/shared/placeholders/placeholder-attraction.svg
public/media/shared/placeholders/placeholder-hotel.svg
public/media/shared/placeholders/placeholder-restaurant.svg
public/media/shared/placeholders/placeholder-activity.svg
public/media/shared/placeholders/placeholder-transport.svg
public/media/shared/placeholders/placeholder-user-upload.svg
```

### 5.5 状态插画（6）

创建：

```text
public/media/shared/states/state-empty-search.svg
public/media/shared/states/state-no-image.svg
public/media/shared/states/state-offline.svg
public/media/shared/states/state-error.svg
public/media/shared/states/state-loading.svg
public/media/shared/states/state-permission-denied.svg
```

### 5.6 SVG 技术规范

通用图标：

```text
viewBox = 0 0 24 24
currentColor 优先
stroke 约 1.75
round cap / join
```

Marker 建议：

```text
viewBox = 0 0 32 40
使用现有 Planner token 方向
selected / warning / error 除颜色外还必须有形状或 glyph 差异
```

全部 SVG：

- 不内嵌脚本；
- 不外链；
- 不嵌 base64 raster；
- 不内嵌字体；
- 不使用 emoji；
- 不带编辑器冗余 metadata；
- 单个通用 SVG 通常 `<20 KB`，硬上限 `50 KB`；
- 单个 Marker 硬上限 `80 KB`；
- 由调用方提供可访问名称，纯装饰场景允许 `aria-hidden`；
- 视觉上属于同一套系统，不允许 64 个互不相关的随机风格图标。

---

## 6. 日本 5 个试点目的地包

创建目录：

```text
public/media/destinations/jp/tokyo/
public/media/destinations/jp/kyoto/
public/media/destinations/jp/osaka/
public/media/destinations/jp/fuji-hakone/
public/media/destinations/jp/hokkaido/
```

### 6.1 Pack IDs

```text
jp-tokyo             city
jp-kyoto             city
jp-osaka             city
jp-fuji-hakone       destination-cluster
jp-hokkaido          region
```

每个 Pack 在 `destination-packs.v1.json` 中至少记录：

- id / country / type；
- `zh-CN / ja-JP / en` 名称；
- theme tokens；
- desktop hero slot；
- mobile hero slot；
- area cover slots；
- landmark symbol slots；
- POI image / provider slots；
- fallback IDs；
- completion summary；
- rights summary；
- lastReviewedAt。

### 6.2 试点占位资产

每个 Pack 至少创建 1 张独立的 symbolic SVG：

```text
public/media/destinations/jp/tokyo/placeholder-destination.svg
public/media/destinations/jp/kyoto/placeholder-destination.svg
public/media/destinations/jp/osaka/placeholder-destination.svg
public/media/destinations/jp/fuji-hakone/placeholder-destination.svg
public/media/destinations/jp/hokkaido/placeholder-destination.svg
```

要求：

- 只用于 fallback；
- 明确标记 `source.type=placeholder`、`authenticity=symbolic`；
- 不冒充真实照片或精确地理图；
- 使用项目既有色彩方向，不新建冲突品牌色；
- 必须在索引中显示。

### 6.3 采购清单

`acquisition-backlog.v1.csv` 每个 Pack 至少包含：

```text
1 desktop hero
1 mobile hero
3 area covers
8 S 级代表地标素材请求
12 A 级高频 POI 图片 / Provider 请求
```

即每 Pack 至少 25 条、总计至少 125 条采购记录。

CSV 列至少包括：

```text
request_id
pack_id
entity_type
entity_id
display_name_zh
display_name_ja
display_name_en
asset_role
poi_tier
priority
orientation
target_width
target_height
source_policy
status
provider
source_id
source_url
license
credit
commercial_use_allowed
cache_allowed
derivatives_allowed
notes
```

规则：

- 当前代码 / mock 已出现的地点优先；
- POI 名称不能凭空捏造；无法确认时保留为区域/角色需求，不伪造具体实体；
- `source_url` 不得填搜索结果页；
- 尚未采购时 `status=acquisition_required`；
- 没有完整许可时不得标记 `approved`；
- Provider 只允许引用时使用 `provider_only`，不下载二进制；
- 本 Task 不以下载照片数量换取“完成”。

### 6.4 可选合法照片

Codex 只有在以下条件全部满足时才可提交少量照片：

```text
来源页可访问
作者明确
许可明确
商业使用明确
缓存明确
衍生裁切明确
署名方式可实现
Manifest 字段完整
体积预算通过
```

否则只登记采购项。禁止网络随手抓图。

---

## 7. 图片来源与合规边界

允许来源类型：

```text
brand_owned
ai_generated
licensed_stock
official_tourism
wikimedia_commons
public_domain
provider_reference
user_generated
placeholder
```

禁止：

- Google Images / Google Maps 图片下载；
- Tripadvisor / Booking / Agoda / Instagram / 小红书 / 微博抓图；
- 截图、去水印、裁署名；
- 来源不明的博客图片；
- 热链第三方图片；
- 把 AI 图写成真实地点摄影；
- 提交 API Token、Cookie、私有授权合同；
- 复制第三方品牌图标、Logo 或受限 icon pack。

CC BY / CC BY-SA 必须记录作者、文件页、许可版本、是否修改、修改说明、署名位置和 ShareAlike 要求。

---

## 8. Fallback 与运行时规则

实现固定降级链：

```text
POI approved asset
→ destination + POI category placeholder
→ destination generic placeholder
→ global POI category placeholder
→ global no-image placeholder
```

酒店、餐厅、活动分别有自己的分类 fallback。

必须测试：

- 已批准本地资产命中；
- provider-only 不返回本地 path；
- acquisition-required 不作为 runtime；
- expired / rejected 安全降级；
- 未知 ID 安全降级；
- decorative 与 semantic alt 规则；
- destination 缺失时回到 global；
- fallback 无递归循环。

本 Task 不修改实际页面接入；只能提供 Registry 和测试调用。

---

## 9. 校验、索引与报告

新增：

```text
tools/assets/validate-asset-library.mjs
tools/assets/generate-asset-index.mjs
docs/assets/generated/asset-library-index.md
docs/assets/generated/duplicate-report.md
docs/assets/generated/size-report.md
assets/design/asset-library/previews/asset-library-preview.html
```

### 9.1 package.json scripts

在不新增依赖的前提下加入：

```json
{
  "assets:inventory": "node tools/assets/inventory-assets.mjs",
  "assets:validate": "node tools/assets/validate-asset-library.mjs",
  "assets:index": "node tools/assets/generate-asset-index.mjs",
  "test:assets": "node --test tests/task-013-assets.test.mjs"
}
```

不要删除或重命名既有 scripts。

### 9.2 Validator 最低检查项

- JSON / CSV 可读取；
- schemaVersion；
- ID 唯一；
- local runtime path 存在；
- kebab-case 文件名；
- 扩展名白名单；
- approved 非 placeholder 有来源与 rights；
- rights 逻辑一致；
- focalPoint 在 `0..1`；
- width / height / bytes 合法；
- SHA-256 一致；
- SVG 无 script / 外链 / base64 raster / embedded font；
- 单文件体积硬上限；
- 重复 SHA 有 alias 或报告；
- acquisition-required 不可 runtime；
- protected 路径存在且未被本 Task 改写；
- Manifest 内无 Token / Cookie / 私密 URL；
- 64 项全局 SVG 与 5 项 Pack placeholder 全部登记。

### 9.3 Index

`asset-library-index.md` 至少按以下分组：

- Legacy / Protected；
- POI Categories；
- Transport；
- Map Markers；
- Placeholders；
- States；
- Destination Packs；
- Approved；
- Provider Only；
- Acquisition Required；
- Rejected / Expired；
- Counts / Size Summary。

Preview HTML 只用于仓库内审查，不创建正式 App route。

---

## 10. 测试

新增：

```text
tests/task-013-assets.test.mjs
```

至少覆盖：

1. 64 项全局 SVG 全部存在；
2. 5 个试点 placeholder 全部存在；
3. 所有 asset ID 唯一；
4. 所有 local path 存在；
5. SHA 校验；
6. rights 状态规则；
7. forbidden SVG 内容；
8. 文件名规范；
9. 单文件体积预算；
10. duplicate / alias 规则；
11. fallback 正常与异常路径；
12. protected 资产路径未删除；
13. acquisition backlog 每 Pack 至少 25 条；
14. 三语目的地名称完整；
15. 未出现来源不明的新 raster。

执行并记录：

```bash
npm ci
npm run assets:inventory
npm run assets:index
npm run assets:validate
npm run test:assets
npm run lint
npm run typecheck
npm run format:check
npm run build
```

如果全仓 `format:check` 因既有上游文件失败：

- 记录准确文件；
- 对本 Task 修改文件单独执行 Prettier check；
- 不把全仓失败误报为通过；
- 不借机大范围格式化其他 Owner 文件。

---

## 11. 质量预算

硬规则：

```text
通用 SVG：通常 <20 KB，硬上限 50 KB
Marker SVG：硬上限 80 KB
单个新增 runtime raster：无批准不得 >1 MB
Phase 1 新增通用 SVG / placeholder 合计目标 ≤2 MB
来源不明 raster 新增量 = 0
```

现有超预算文件只报告，不在本 Task 中重压缩或替换。

---

## 12. 禁止范围

本 Task 禁止：

- 修改 Planner / Start Flow / Personal Center 的页面视觉；
- 把新图标直接接入业务组件；
- 删除、重命名、覆盖现有已验收素材；
- 大规模移动 `public/media`；
- 接入 S3 / R2 / Cloudinary 等真实对象存储；
- 新增数据库、API、Provider SDK；
- 新增 npm 依赖；
- 静态化营业时间、价格、评分、天气、库存；
- 收集全日本或全世界长尾景点图片；
- 生成不受约束的大量 AI 风景照片；
- 为赶数量复制相同 SVG 并只改文件名；
- 修改 B 的 Personal Center 代码与资产；
- 顺便处理无关 favicon、UI bug、文档格式问题。

---

## 13. WBS / Issue / GitHub 追踪

### 13.1 WBS

在 `docs/project/WBS-TravelAssist.md`：

1. 在工程基础部分新增：

```text
2.13 | 素材库 / Asset Registry 基础 | A | P1 | 2.6,2.7 | 进行中/待审查
```

2. 在 Task 追踪表新增 `TASK-013-A`；
3. 开始实施为 `进行中`；
4. 实现完成、PR 未合并为 `待审查`；
5. 只有合并到 `develop` 并验收后才是 `已完成`；
6. 写入 Issue、Branch、Commit、PR、Result。

若最新 WBS 已占用 `2.13`，不得覆盖；选择下一个可用工程基础 ID，并在 Result 说明。

### 13.2 Issue

Issue：`#112`

开始时追加评论：

- 实际 base SHA；
- 当前 branch；
- 冲突审计；
- Scope 确认。

完成时更新：

- 素材数量；
- 目的地 Pack 数；
- approved / provider-only / acquisition-required 数量；
- tests；
- commit；
- Draft PR；
- blocker / follow-up。

### 13.3 Git

建议提交拆分：

```text
chore(assets): inventory existing media library
feat(assets): add shared SVG asset baseline
feat(assets): add destination pack registry and fallbacks
test(assets): add validation and asset reports
docs(assets): record TASK-013 result and WBS status
```

不得为了匹配示例强行拆成完全相同数量，但提交必须可审查。

完成后：

```bash
git status --short
git diff --check
git push origin feature/a-asset-library-foundation
```

创建 Draft PR：

```text
feature/a-asset-library-foundation → develop
```

禁止自动 merge。

---

## 14. Result 文件格式

创建：

```text
docs/tasks/RESULT-TASK-013-a-asset-library-foundation.md
```

必须包含：

```md
# TASK-013-A Result

## Status
Completed / Blocked

## Tracking
- Issue
- WBS
- Branch
- Base SHA
- Commit(s)
- Draft PR

## Conflict Audit
- Open Tasks / PRs checked
- Protected paths
- Conflicts / resolutions

## Legacy Inventory
- files
- total bytes
- referenced assets
- protected assets
- duplicates
- missing metadata

## Shared Assets
- POI icons: x/24
- Transport icons: x/14
- Markers: x/12
- Placeholders: x/8
- States: x/6

## Destination Packs
- Tokyo
- Kyoto
- Osaka
- Fuji-Hakone
- Hokkaido
- acquisition backlog rows

## Rights Summary
- approved
- provider-only
- acquisition-required
- legacy-review-required
- rejected / expired

## Registry / Fallback
- exported APIs
- tested cases

## Validation
- inventory
- index
- assets:validate
- test:assets
- lint
- typecheck
- format
- build

## Size / Duplication
- new bytes
- largest files
- duplicate groups
- exceptions

## Files Changed

## WBS Update

## Follow-ups

## Known Limitations
```

不能只写“all passed”；必须列实际命令、结果和数量。

---

## 15. Definition of Done

- [ ] 已审计现有素材与代码引用；
- [ ] 受保护路径未删除、未重命名、未覆盖；
- [ ] `legacy-inventory.v1.json` 完成；
- [ ] `asset-manifest.v1.json` 完成；
- [ ] `destination-packs.v1.json` 完成；
- [ ] `acquisition-backlog.v1.csv` 至少 125 行数据；
- [ ] 64 项全局 SVG 全部完成且非复制改名；
- [ ] 5 项 destination symbolic placeholder 完成；
- [ ] Registry 与 fallback 完成；
- [ ] Validator / inventory / index 工具完成；
- [ ] duplicate、size、index 报告生成；
- [ ] 无新增 npm 依赖；
- [ ] 无来源不明 raster；
- [ ] `assets:validate` 通过；
- [ ] `test:assets` 通过；
- [ ] lint / typecheck / build 通过；
- [ ] format 状态准确记录；
- [ ] WBS 更新；
- [ ] Result 提交；
- [ ] Branch push；
- [ ] Draft PR 创建并关联 Issue #112；
- [ ] 未自动 merge。

---

## 16. 阻塞规则

只有以下情况可返回 Blocked：

- 分支无法安全同步且与活动 PR 发生实质冲突；
- 工作区存在不能安全隔离的用户文件；
- 必需仓库文件不可读取或仓库状态损坏；
- 同一高冲突路径已由另一正式 Task 占用；
- GitHub 权限不足导致无法 push / 创建 Draft PR（本地实现仍应尽可能完成并记录）。

以下情况不是阻塞理由：

- 无法一次性找到全部目的地照片；
- 无法验证某张网络图片授权；
- 某些长尾 POI 没图片；
- 对象存储尚未选型；
- Provider 尚未接入。

这些情况应使用 `acquisition_required / provider_only / fallback` 正常完成本 Task。
