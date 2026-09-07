# TravelAssist 全球核心目的地素材生成计划

> 文档版本：v1.0  
> 冻结日期：2026-09-07  
> Owner：A（共享素材基础设施）  
> 关联任务：`TASK-013.2-A` / Issue `#152`  
> 前置：`TASK-013-A`、`TASK-013.1-A`

---

## 1. 决策摘要

本阶段采用一套项目内部的**核心目的地覆盖 Seed**，不声称它是客观或永久不变的全球旅游排名。

固定规模：

| 层级 | 目的地 | 每目的地景点 | 景点数 | 城市 `md + lg` | 景点 `sm` | 基础输出 |
|---|---:|---:|---:|---:|---:|---:|
| S 级 | 100 | 40 | 4,000 | 200 | 4,000 | 4,200 |
| A 级 | 200 | 25 | 5,000 | 400 | 5,000 | 5,400 |
| **合计** | **300** | — | **9,000** | **600** | **9,000** | **9,600** |

素材生产与尺寸派生分开：

```text
300 个目的地 master source
+ 9,000 个景点 source / provider reference
= 9,300 个源任务

300 × 2 个目的地尺寸
+ 9,000 × 1 个景点尺寸
= 9,600 个基础尺寸输出
```

城市/目的地只创建一份高质量源素材，再由 `TASK-013.1-A` 派生 `md` 和 `lg`。景点只准备一份真实来源或合法 Provider 引用，再派生 `sm`。

---

## 2. 已冻结输入

### 2.1 目的地 Seed

```text
docs/assets/catalog/core-destination-generation-seed.v1.csv
```

包含 300 行目的地，字段为：

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

要求：

- S 级正好 100；
- A 级正好 200；
- destination ID 唯一；
- S 级每行 quota=40；
- A 级每行 quota=25；
- attraction quota 合计正好 9,000；
- Seed 是产品覆盖范围，不作为对目的地价值的公开排名。

### 2.2 批次顺序

```text
docs/assets/catalog/core-destination-generation-batches.v1.csv
```

固定 40 个批次，顺序：

```text
1. 日本 S 级
2. 日本 A 级三个批次
3. 其他 S 级目的地
4. 其他 A 级目的地
```

每批最多 10 个目的地，预计基础输出不超过 420 个文件。

---

## 3. “生成”分为四种模式

生产单必须明确每一项属于哪种模式：

| 模式 | 含义 | 是否允许 AI | 是否可作为真实 POI 图 |
|---|---|---:|---:|
| `illustrative_city` | 城市气氛或目的地视觉 | 允许 | 仅作为氛围图，不声称实拍 |
| `documentary_photo` | 可验证的真实地点照片 | 不由模型凭空生成 | 是 |
| `provider_only` | 仅保存合法 Provider ID / URL 规则 | 不适用 | 按 Provider 条款动态显示 |
| `symbolic_placeholder` | 抽象或符号占位 | 允许 | 否 |

状态另行记录：

```text
planned
entity_verified
source_required
acquisition_required
provider_only
prompt_ready
generated_review
approved
rejected
blocked
```

重要原则：

> 著名景点默认需要真实、可验证的图片。AI 生成的景点图不得冒充现场实拍，也不得作为 POI 详情中的纪实图片。

---

## 4. 目的地素材规格

### 4.1 每个目的地的生产任务

每个目的地建立 1 个 source job：

```text
role: destination_master
mode: illustrative_city 或 documentary_photo
recommended source canvas: ≥ 2048 × 1365
orientation: landscape
safe crop: center 70%
variants: md, lg
```

目的地 master 应表达：

- 城市整体气质；
- 能识别目的地，但不要求把多个地标不自然地拼在一起；
- 适合作为卡片、推荐区域、城市选择页；
- 不带文字、Logo、水印或 UI；
- 不出现虚构道路标识、不可读招牌或错误国旗；
- 不过度饱和；
- 保留 TravelAssist 当前偏暖、低饱和、自然旅行摄影方向。

### 4.2 城市 AI 图的标识

AI 生成城市图必须记录：

```text
source.type = ai_generated
authenticity = illustrative
model / provider
prompt version
seed（Provider 支持时）
generatedAt
commercial-use status
review status
```

UI 接入时不能使用“实景照片”“现场照片”等描述。

---

## 5. 景点素材规格

### 5.1 每个景点的源任务

每个已验证景点建立 1 个 source / provider job：

```text
role: poi_photo
preferred mode: documentary_photo 或 provider_only
minimum useful source: ≥ 640 × 480
variant: sm
sm profile: max 480 × 480, inside, no upscale
```

每行必须有稳定实体信息：

```text
poi_id
destination_id
name_zh
name_ja
name_en
canonical_name
entity_type
category
latitude
longitude
provider_type
provider_entity_id
official_url（可用时）
source_mode
rights_status
```

禁止仅用自然语言名称作为唯一标识。

### 5.2 S 级 40 个景点的类别配额

| 类别 | 建议数 |
|---|---:|
| 标志性地标 / 代表建筑 | 10 |
| 博物馆 / 美术馆 / 文化设施 | 6 |
| 历史 / 宗教 / 遗产 | 6 |
| 自然 / 公园 / 观景点 | 5 |
| 亲子 / 乐园 / 水族馆等 | 4 |
| 街区 / 老城 / 特色社区 | 4 |
| 市场 / 商业 / 购物地标 | 3 |
| 食文化 / 城市体验类地点 | 2 |
| **合计** | **40** |

### 5.3 A 级 25 个景点的类别配额

| 类别 | 建议数 |
|---|---:|
| 标志性地标 / 代表建筑 | 7 |
| 博物馆 / 文化设施 | 4 |
| 历史 / 宗教 / 遗产 | 4 |
| 自然 / 公园 / 观景点 | 3 |
| 亲子 / 乐园等 | 2 |
| 街区 / 老城 | 2 |
| 市场 / 商业 | 2 |
| 食文化 / 城市体验 | 1 |
| **合计** | **25** |

某目的地不适用某分类时可以重分配，但必须在 `quota_exception_reason` 中说明；不得为了凑数放入普通便利店、重复入口、同一建筑的多个子项或明显低价值地点。

---

## 6. 景点实体筛选规则

按以下顺序使用证据：

```text
1. 仓库已有稳定 POI Master / Provider ID
2. 已批准的地图或 POI Provider
3. 官方旅游机构 / 官方景点资料
4. 许可兼容的开放知识实体 ID
5. 人工复核
```

不得：

- 仅凭模型记忆生成 9,000 个名称；
- 把相同地点不同语言名当成多个景点；
- 把城市、国家或整片大区域重复作为景点；
- 把已经永久关闭的地点直接设为 approved；
- 未核实便添加经纬度；
- 抓取搜索结果页作为来源；
- 使用 Google Images、Google Maps 截图、Tripadvisor、Booking、Agoda 或社交媒体图片；
- 把 AI 图标为 documentary。

每个景点至少通过：

```text
名称一致性
实体 ID 唯一性
坐标合理性
所属目的地合理性
类别合理性
重复检测
来源模式检测
```

无法验证时保留槽位并标记 `entity_resolution_required`，不得捏造实体。

---

## 7. 生产单交付文件

Codex 必须生成：

```text
docs/assets/catalog/
├─ core-destination-generation-seed.v1.csv       # 已冻结，300 行
├─ core-destination-generation-batches.v1.csv    # 已冻结，40 批
├─ core-destination-generation-manifest.v1.csv   # 丰富后的 300 目的地
├─ core-attraction-generation-manifest.v1.csv    # 9,000 个已验证景点
├─ core-source-jobs.v1.jsonl                     # 9,300 个源任务
├─ core-variant-output-matrix.v1.csv              # 9,600 个逻辑输出
├─ core-generation-prompt-templates.v1.json
└─ core-generation-policy.v1.json

docs/assets/generated/
├─ core-generation-summary.md
├─ core-generation-batch-index.md
├─ core-generation-validation.md
├─ unresolved-destinations.md
├─ unresolved-attractions.md
├─ duplicate-entities.md
├─ rights-blocked-jobs.md
└─ core-generation-cost-estimate.md

docs/assets/generated/core-batches/
└─ {batch-id}.json
```

### 7.1 Destination Manifest 必填字段

```text
destination_id
batch_id
tier
region
country_code
entity_type
name_zh
name_ja
name_en
canonical_name
latitude
longitude
provider_type
provider_entity_id
attraction_quota
source_mode
source_job_id
md_variant_id
lg_variant_id
status
review_notes
```

### 7.2 Attraction Manifest 必填字段

```text
poi_id
destination_id
batch_id
tier
selection_order
category
name_zh
name_ja
name_en
canonical_name
latitude
longitude
provider_type
provider_entity_id
official_url
source_mode
source_job_id
sm_variant_id
rights_status
status
quota_exception_reason
review_notes
```

### 7.3 Source Job 必填字段

```text
job_id
entity_id
entity_type
asset_role
source_mode
prompt_template_id
provider
provider_reference
input_reference
output_asset_id
requested_master_width
requested_master_height
variants
rights_status
authenticity
batch_id
priority
status
retry_count
error_code
```

JSONL 每行一个合法 JSON 对象，稳定排序，重复运行不产生随机重排。

---

## 8. Prompt 模板

### 8.1 目的地氛围图模板

```text
Create a refined, natural travel editorial image representing {destination_name}, {country_name}.
Use a believable local urban or landscape atmosphere and one coherent point of view.
Warm-neutral color temperature, restrained saturation, soft natural light, premium travel photography composition.
No collage, no text, no logo, no watermark, no UI, no fantasy architecture, no duplicated landmark, no unreadable large signage.
The output is illustrative and must not be described as documentary photography.
Landscape master, center-safe composition for responsive crops.
```

模板必须带版本号，实际 prompt 保存解析后的目的地、国家、季节策略、构图和负面约束。

### 8.2 景点任务模板

真实景点不使用“凭文字生成真实照片”的默认模板。任务内容应优先是：

```text
Resolve an approved documentary image or provider reference for {poi_name}.
Verify entity ID, coordinates, source page, author/provider, license, commercial-use permission, cache permission, derivative permission and attribution.
Do not substitute an AI-generated representation for a documentary POI image.
```

只有 `symbolic_placeholder` 或明确获准的 `illustrative` 模式才建立图像生成 prompt，且输出不得进入 documentary slot。

---

## 9. 批次执行模式

### 9.1 默认模式：只生成清单

```text
RUN_MODE=manifest
```

默认仅执行：

- Seed 校验；
- 目的地实体补全；
- 景点实体清单；
- Source jobs；
- Variant matrix；
- Batch files；
- 权利与缺口报告；
- 成本估算。

不下载、不生成图片二进制。

### 9.2 单批准备模式

```text
RUN_MODE=batch-prepare
BATCH_ID=JP-S-01
```

输出该批次的：

- 已验证实体；
- 来源需求；
- prompt；
- provider 引用；
- 预计调用数、成本和体积；
- QA checklist。

### 9.3 单批执行模式

只有以下条件全部满足才允许：

```text
父任务全部合并
批次 manifest approved
Provider adapter 已存在
密钥来自环境变量
商业使用条款已记录
预算上限已设置
输出位置已批准
```

调用形式示例：

```text
RUN_MODE=batch-execute
BATCH_ID=JP-S-01
MAX_JOBS=205
```

单批执行必须独立 Issue / child task / Result / PR，不得由本 Manifest Task 一次执行全部 9,300 项。

---

## 10. 批次与夜间顺序

固定顺序读取 `core-destination-generation-batches.v1.csv`。

前四个日本批次：

| 顺序 | Batch | 目的地 | 景点 | 基础输出 |
|---:|---|---:|---:|---:|
| 1 | `JP-S-01` | 5 | 200 | 210 |
| 2 | `JP-A-01` | 10 | 250 | 270 |
| 3 | `JP-A-02` | 10 | 250 | 270 |
| 4 | `JP-A-03` | 5 | 125 | 135 |
| **日本合计** | — | **30** | **825** | **885** |

全球总批次：40。最大批次为 10 个 S 级目的地，预计 420 个基础输出。

夜间批次执行规则：

- 每晚默认只执行一个 batch；
- 支持 checkpoint / resume；
- 单项失败不阻塞已完成项，但批次不能伪装为完整成功；
- 每批独立预算；
- 每批二次运行应跳过已完成且输入未变化的任务；
- 未经批准不得自动进入下一批；
- Manifest 生成可一次完成，素材二进制生产必须分批。

---

## 11. 成本与存储防护

Manifest 必须计算：

```text
source job 数
按 source_mode 分类的调用数
Provider 请求数
预计生成费用
预计采购费用（无法计算时标 unknown）
预计源文件体积
预计 md / lg / sm 体积
预计 CDN 体积
Git 新增体积
```

基础尺寸按既有预算粗估约 1.3 GB，但不得把全部二进制放进单一 Git PR。

规则：

- Manifest、Prompt、报告进入 Git；
- 小规模已审核样本可进入 Git；
- 大规模源图和衍生图进入对象存储 / CDN；
- 单 PR 新增二进制软上限 50 MiB、硬上限 100 MiB；
- 单 Git object 硬上限 20 MiB；
- 未建立对象存储时，批次执行默认输出本地 staging 并返回存储 blocker，不强行推送。

---

## 12. QA 规则

### 12.1 目的地图

- 无水印、Logo、文字、UI；
- 无明显畸形建筑、重复对象或拼贴感；
- 无错误国旗、宗教符号或地理元素；
- 不将多个相距甚远地标不自然地合成；
- 不包含可识别私人个体作为主体；
- 保持低饱和、自然、编辑感；
- `illustrative` 标签完整；
- md/lg 派生不放大、不严重裁掉主体。

### 12.2 景点图

- 图像实体与 POI 实体一致；
- 来源和许可可追溯；
- 不用附近街景代替具体景点而不说明；
- 不用过时或已拆除状态冒充当前事实；
- 无第三方水印；
- sm 清晰可辨；
- 不产生重复景点图；
- 不把 AI 图放进 documentary slot。

### 12.3 清单

- 300 destination IDs 唯一；
- 9,000 POI IDs 唯一；
- 每个 POI 只能归属一个主 destination；
- 允许跨城市复用的实体必须使用 alias 并说明；
- S 级每城正好 40；
- A 级每城正好 25；
- 9,300 source jobs；
- 9,600 logical variants；
- 40 batches；
- 未解析、rights blocked、duplicate 均有报告；
- 无 Token、Cookie、本机绝对路径。

---

## 13. 版本与变更

Seed v1 冻结后：

- 不因主观偏好直接删改；
- 目的地替换需单独变更记录；
- 保持原 destination ID 不复用；
- 配额总数发生变化必须提升版本；
- 景点实体变化不覆盖历史记录，使用 status / supersededBy；
- 每次批次执行记录 Manifest SHA 和 Prompt version；
- 后续可根据真实搜索量、订单量和收藏量调整 v2，但 v1 保留用于审计。

---

## 14. 完成定义

- [ ] Seed 恰好 300 行；
- [ ] S=100、A=200；
- [ ] 景点配额合计 9,000；
- [ ] 40 个批次且每批 ≤10 目的地；
- [ ] Destination Manifest 300 行；
- [ ] Attraction Manifest 9,000 行或所有未解析槽位有明确 blocker；
- [ ] Source Jobs 9,300；
- [ ] Variant Matrix 9,600；
- [ ] 三语名称、实体 ID、坐标、类别和来源模式完整；
- [ ] 城市 illustrative 与景点 documentary 严格区分；
- [ ] Prompt templates 版本化；
- [ ] 未解析、重复、rights blocked、成本和批次报告完整；
- [ ] 本 Task 不批量提交图片二进制；
- [ ] 后续每个 batch 可以由独立 Codex 指令执行；
- [ ] WBS、Result、Issue、Commit、Draft PR 完整关联；
- [ ] 不自动合并。
