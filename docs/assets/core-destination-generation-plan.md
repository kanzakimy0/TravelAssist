# TravelAssist 日本国内核心目的地素材生成计划

> - 文档版本：v1.1
> - 范围修正：2026-09-08
> - Owner：A（共享素材基础设施）
> - 关联任务：`TASK-013.2-A` / Issue `#152`
> - 前置：`TASK-013-A`、`TASK-013.1-A`

---

## 1. 范围修正

本任务仅服务 TravelAssist 日本国内版本。旧版 v1.0 错误地把范围扩展为“全球核心目的地”，并把海外城市写入 300 行 Seed；该范围已废止。

v1.1 强制采用 **Japan-only**：

- 300 个目的地全部位于日本境内；
- `country_code` 必须全部为 `JP`；
- `destination_id` 必须全部以 `jp-` 开头；
- 覆盖日本 47 都道府县，不能只集中东京 / 京都 / 大阪等少数区域；
- 允许 city、town、island、onsen、nature-area、destination-cluster 等旅游目的地实体；
- 海外目的地不属于本 Task，未来如扩展全球版必须另建独立 Task / Seed / Batch，不能混入日本素材库。

原有素材规模与尺寸口径保留不变。

---

## 2. 冻结规模

| 层级     |  目的地 | 每目的地景点 |    景点数 | 城市 `md + lg` | 景点 `sm` |  基础输出 |
| -------- | ------: | -----------: | --------: | -------------: | --------: | --------: |
| S 级     |     100 |           40 |     4,000 |            200 |     4,000 |     4,200 |
| A 级     |     200 |           25 |     5,000 |            400 |     5,000 |     5,400 |
| **合计** | **300** |            — | **9,000** |        **600** | **9,000** | **9,600** |

源任务：

```text
300 个 destination master source jobs
+ 9,000 个 POI source/provider jobs
= 9,300 个源任务
```

本 Task 生成生产单、实体清单、来源状态、批次和验证报告；不一次性生成或下载全部图片。

---

## 3. 日本目的地 Seed

冻结输入：

```text
docs/assets/catalog/core-destination-generation-seed.v1.csv
```

字段：

```text
priority_order
batch_id
tier
region
country_code
destination_id
destination_name_en
attraction_quota
```

强制校验：

```text
rows = 300
unique destination_id = 300
country_code = JP for all rows
destination_id starts with jp- for all rows
non-JP rows = 0
S rows = 100
A rows = 200
S attraction_quota = 40
A attraction_quota = 25
sum attraction_quota = 9,000
```

`region` 采用日本国内区域：

```text
hokkaido
tohoku
kanto
chubu
kansai
chugoku
shikoku
kyushu-okinawa
```

Seed 是 TravelAssist 的日本产品覆盖优先级，不声称是客观旅游排名。

### 3.1 47 都道府县覆盖

Destination Manifest enrichment 必须补充：

```text
prefecture_code
prefecture_name_ja
prefecture_name_en
```

最终验证报告必须证明：

```text
prefecture_count = 47
missing_prefectures = 0
```

若 Seed 中某 tourism cluster 跨都道府县，使用 `coverage_note` 明确主归属与覆盖范围，不得伪造行政边界。

---

## 4. 批次冻结

冻结输入：

```text
docs/assets/catalog/core-destination-generation-batches.v1.csv
```

共 40 批：

```text
JP-S-01 .. JP-S-10
JP-A-01 .. JP-A-30
```

规则：

- S 级 100 个目的地分 10 批，每批 10 个；
- A 级 200 个目的地分 30 批，每批 6–7 个；
- 每批最多 10 个目的地；
- 每批基础输出最多 420；
- 40 个 batch ID 全部必须以 `JP-` 开头；
- 不允许出现 `S-EU-*`、`S-NA-*`、`A-SEA-*` 等旧全球批次。

---

## 5. 素材模式

生产单必须区分：

| 模式                   | 含义                     |               AI |         可作为真实 POI 图 |
| ---------------------- | ------------------------ | ---------------: | ------------------------: |
| `illustrative_city`    | 城市 / 区域氛围图        |             允许 | 否，必须标记 illustrative |
| `documentary_photo`    | 可验证真实地点照片       | 不由模型凭空生成 |                        是 |
| `provider_only`        | 仅保存合法 Provider 引用 |           不适用 |          按 Provider 条款 |
| `symbolic_placeholder` | 符号占位                 |             允许 |                        否 |
| `acquisition_required` | 等待采购 / 合法来源      |           不适用 |                        否 |

真实景点默认必须使用 documentary / provider 来源。AI 生成图不得冒充实拍。

---

## 6. 目的地素材

每个目的地只建立 1 个 master source job：

```text
role: destination_master
recommended source canvas: >= 2048 x 1365
orientation: landscape
safe crop: center 70%
variants: md, lg
```

视觉方向保持 TravelAssist 当前偏暖、低饱和、自然旅行摄影感，不带文字、Logo、水印或 UI。

AI 城市图必须记录：

```text
source.type = ai_generated
authenticity = illustrative
provider/model
prompt version
generatedAt
commercial-use status
review status
```

---

## 7. 景点素材

每个已验证景点建立 1 个 source/provider job：

```text
role: poi_photo
preferred mode: documentary_photo or provider_only
minimum useful source: >= 640 x 480
variant: sm
sm profile: max 480 x 480, inside, no upscale
```

S 级每目的地 40 个景点；A 级每目的地 25 个景点。

实体来源优先级：

```text
1. 仓库已有 POI Master / Provider ID
2. 已批准地图或 POI Provider
3. 日本官方旅游机构、都道府县 / 市町村官方旅游资料、景点官方网站
4. 许可兼容的开放知识实体
5. 人工复核
```

禁止仅凭模型记忆捏造名称、坐标或 Provider ID。无法验证时必须使用 unresolved 槽位。

---

## 8. 景点类别配额

### S 级 40 个

```text
landmark 10
museum_culture 6
historic_religious 6
nature_viewpoint 5
family_theme 4
district_neighborhood 4
market_shopping 3
food_culture_experience 2
```

### A 级 25 个

```text
landmark 7
museum_culture 4
historic_religious 4
nature_viewpoint 3
family_theme 2
district_neighborhood 2
market_shopping 2
food_culture_experience 1
```

不适用时允许重分配，但必须填写 `quota_exception_reason`。

---

## 9. 输出文件

必须生成：

```text
docs/assets/catalog/
├─ core-destination-generation-seed.v1.csv
├─ core-destination-generation-batches.v1.csv
├─ core-destination-generation-manifest.v1.csv
├─ core-attraction-generation-manifest.v1.csv
├─ core-source-jobs.v1.jsonl
├─ core-variant-output-matrix.v1.csv
├─ core-generation-prompt-templates.v1.json
└─ core-generation-policy.v1.json

docs/assets/generated/
├─ core-generation-summary.md
├─ core-generation-batch-index.md
├─ core-generation-validation.md
├─ prefecture-coverage.md
├─ unresolved-destinations.md
├─ unresolved-attractions.md
├─ duplicate-entities.md
├─ rights-blocked-jobs.md
└─ core-generation-cost-estimate.md

docs/assets/generated/core-batches/
└─ {batch-id}.json
```

Destination Manifest 除旧字段外必须增加 prefecture 信息与 `coverage_note`。

---

## 10. 日本限定验证门

任何构建或 CI 验证必须直接失败于以下任一情况：

```text
country_code != JP
!destination_id.startsWith("jp-")
non-Japan destination detected
batch_id not startsWith JP-
prefecture coverage < 47
rows != 300
S != 100
A != 200
attraction quota total != 9000
source jobs != 9300
variant expectations != 9600
batch count != 40
```

禁止通过把海外地点伪装成 `JP`、修改实体名或使用模糊 cluster 绕过校验。

---

## 11. 网络、版权与真实性边界

不得抓取或缓存：

- Google Images / Google Maps 截图；
- Booking / Agoda / Tripadvisor 图片；
- Instagram、小红书、微博等社交媒体图片；
- 未确认商业使用权的第三方图片。

不得提交 Token、Cookie、账号或私有授权文件。

---

## 12. 执行模式

默认：

```text
RUN_MODE=manifest
```

只生成 Manifest、Jobs、Prompt、Batch 和报告，不下载或生成大规模图片。

单批准备：

```text
RUN_MODE=batch-prepare
BATCH_ID=JP-S-01
```

只有父任务、Provider、权利、预算、存储和 batch manifest 全部批准后，后续 child task 才允许 `batch-execute`。

---

## 13. 未来全球扩展

全球版不删除，但明确推迟为未来独立阶段。届时必须另建例如：

```text
TASK-XXX — Global Destination Asset Expansion
core-global-destination-seed.v1.csv
GLOBAL-* batches
```

不得复用或污染本日本版 `core-destination-generation-seed.v1.csv`。
