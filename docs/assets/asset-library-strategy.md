# TravelAssist 素材库建设方案

> 文档版本：v1.0  
> 冻结日期：2026-09-06  
> 状态：Phase 1 规格冻结  
> Owner：A（共享基础设施 / 旅行主系统）  
> 关联 Task：`TASK-013-A` / Issue `#112`

---

## 1. 决策摘要

TravelAssist **不在首发前预先收集全世界所有地区与景点素材**。素材库采用三层策略：

```text
L1 全局通用素材
  Logo / 图标 / 交通 / 地图 Marker / 占位图 / 状态插画

L2 首发目的地素材包
  城市主视觉 / 区域封面 / 地标符号 / 重点 POI 引用 / 主题配置

L3 长尾 POI 素材
  用户实际搜索、推荐或打开后按需获取；缺图时走统一 fallback
```

核心原则：

> 首发目的地人工做精，普通目的地使用统一降级，长尾景点按真实使用量补充。

首期不把“图片数量”当成完成标准，而把以下能力作为完成标准：

- 每个素材有稳定 ID；
- 每个素材有来源与授权状态；
- Runtime 路径可校验；
- 缺图有确定 fallback；
- 不允许来源不明图片进入正式运行目录；
- Web 与未来 App 可复用同一套元数据；
- 大量照片未来进入对象存储 / CDN，而不是无限堆入 Git。

---

## 2. 当前仓库状态与迁移原则

当前仓库已经存在分散素材：

```text
public/media/home/**
public/media/start/**
public/media/personal-center/**
assets/design/personal-center/**
docs/assets/**
```

其中 Personal Center 已形成局部 Manifest、SHA-256、source、preview、runtime 的管理方式，可作为参考，但尚不是全局素材库。

迁移规则：

1. 现有已验收素材不删除、不覆盖、不直接重命名；
2. 先生成 inventory 与 alias，再决定未来是否迁移路径；
3. 发现二进制重复时先报告，不因“去重”破坏现有页面引用；
4. 已有 AI 生成图必须继续标记为 illustrative / ai-generated，不得描述为真实地点实拍；
5. 本阶段不修改 Planner、Start Flow、Personal Center 的视觉和业务逻辑；
6. 新素材库只提供底座、可复用资产和索引，页面接入另开 Task。

---

## 3. Phase 1 范围

### 3.1 全局通用素材

首期准备 64 项 SVG 基线：

| 分类 | 数量下限 | 说明 |
|---|---:|---|
| 景点 / POI 分类图标 | 24 | 地标、博物馆、寺社、自然、餐饮、住宿等 |
| 交通方式图标 | 14 | 步行、自行车、汽车、出租车、铁路、公交、轮渡等 |
| 地图 Marker | 12 | 默认、选中、推荐、酒店、餐饮、交通、警告等 |
| 通用占位图 | 8 | 城市、地区、景点、酒店、餐厅、活动、交通、用户上传 |
| 状态插画 | 6 | 空搜索、无图片、离线、错误、加载、权限不足 |
| **合计** | **64** | 全部使用统一 SVG 规范 |

### 3.2 日本试点目的地素材包

根据当前页面与演示行程，先建立 5 个试点包：

| ID | 类型 | 显示名称 |
|---|---|---|
| `jp-tokyo` | city | 东京 |
| `jp-kyoto` | city | 京都 |
| `jp-osaka` | city | 大阪 |
| `jp-fuji-hakone` | destination-cluster | 富士山—河口湖—箱根 |
| `jp-hokkaido` | region | 北海道 |

每个试点包至少包含：

- 目的地描述与稳定 ID；
- 中文、日文、英文名称；
- 主题色与渐变 token；
- 桌面 / 手机主视觉需求槽位；
- 区域封面需求槽位；
- 地标符号需求槽位；
- 城市 / 地区占位图；
- 重点 POI 采购清单；
- fallback 配置；
- 授权与缓存状态；
- 完成度统计。

Phase 1 允许目的地照片槽位为 `acquisition_required`，但不允许使用来源不明图片冒充完成。

---

## 4. 不属于静态素材的内容

以下内容变化快，必须由 Provider、数据库或实时服务负责，不应写死进素材库：

- 营业时间与临时休馆；
- 门票、酒店、餐厅价格；
- 用户评分与评论数量；
- 天气、拥挤程度、交通延误；
- 临时展览、季节活动、库存；
- 第三方平台禁止永久缓存的图片；
- 预约状态、用户订单和个人上传内容的业务数据。

素材库可保存 Provider ID、source ID、关联实体 ID 与 fallback，但不保存动态事实快照作为长期真相。

---

## 5. 目录结构

### 5.1 Runtime 资产

```text
public/media/
├─ home/                         # 保留现状
├─ start/                        # 保留现状
├─ personal-center/              # 保留现状，禁止本 Task 迁移
├─ shared/
│  ├─ poi-categories/
│  ├─ transport/
│  ├─ map-markers/
│  ├─ placeholders/
│  └─ states/
└─ destinations/
   └─ jp/
      ├─ tokyo/
      ├─ kyoto/
      ├─ osaka/
      ├─ fuji-hakone/
      └─ hokkaido/
```

### 5.2 设计源、预览与清单

```text
assets/design/asset-library/
├─ README.md
├─ source/                       # 只放自有且确有必要保留的轻量源文件
└─ previews/                     # contact sheet / review preview

docs/assets/
├─ asset-library-strategy.md
├─ catalog/
│  ├─ asset-manifest.v1.json
│  ├─ destination-packs.v1.json
│  ├─ acquisition-backlog.v1.csv
│  ├─ legacy-inventory.v1.json
│  └─ asset-aliases.v1.json
└─ generated/
   ├─ asset-library-index.md
   ├─ duplicate-report.md
   └─ size-report.md
```

### 5.3 程序与校验

```text
src/data/assets/
├─ asset-types.ts
├─ asset-registry.ts
└─ asset-fallback.ts

tools/assets/
├─ inventory-assets.mjs
├─ validate-asset-library.mjs
└─ generate-asset-index.mjs

tests/
└─ task-013-assets.test.mjs
```

---

## 6. 素材 ID 与命名

### 6.1 稳定 ID

推荐格式：

```text
{scope}.{country}.{entity}.{assetType}.{variant}.{sequence}
```

示例：

```text
shared.global.poi-category.museum.default.001
shared.global.transport.train.default.001
destination.jp.tokyo.hero.desktop.001
destination.jp.kyoto.placeholder.city.default.001
```

要求：

- 小写；
- 使用英文 kebab-case；
- ID 不绑定文件扩展名；
- 文件替换时尽量保持 ID；
- 同一个二进制被多处语义引用时使用 alias，不复制文件冒充不同资产。

### 6.2 文件命名

```text
{entity}-{asset-type}-{variant}-{width}x{height}.{ext}
```

SVG 图标可省略尺寸：

```text
museum.svg
train.svg
marker-selected.svg
placeholder-city.svg
```

禁止：

- 空格；
- 中文文件名；
- `final-final-v2-new`；
- 随机 UUID 作为人工维护文件名；
- 来源网站原始乱码文件名。

---

## 7. 元数据 Schema

每个本地或远程引用素材至少包含：

```json
{
  "id": "destination.jp.tokyo.hero.desktop.001",
  "assetType": "destination_hero",
  "entity": {
    "type": "city",
    "id": "jp-tokyo"
  },
  "locale": "ja-JP",
  "runtime": {
    "kind": "local",
    "path": "/media/destinations/jp/tokyo/tokyo-hero-desktop-1920x1080.webp"
  },
  "source": {
    "type": "licensed_stock",
    "provider": "provider-name",
    "sourceId": "external-id",
    "sourceUrl": "https://source.example/item"
  },
  "rights": {
    "license": "license-code",
    "credit": "Author / Provider",
    "commercialUseAllowed": true,
    "cacheAllowed": true,
    "derivativesAllowed": true,
    "expiresAt": null
  },
  "presentation": {
    "alt": "东京城市天际线与街区景观",
    "decorative": false,
    "width": 1920,
    "height": 1080,
    "focalPoint": { "x": 0.52, "y": 0.44 }
  },
  "integrity": {
    "sha256": "...",
    "bytes": 320000
  },
  "authenticity": "documentary",
  "status": "approved"
}
```

### 7.1 必需枚举

`source.type`：

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

`runtime.kind`：

```text
local
provider_reference
cdn
none
```

`authenticity`：

```text
documentary
illustrative
symbolic
```

`status`：

```text
draft
review_required
approved
rejected
expired
acquisition_required
provider_only
```

---

## 8. Fallback 链

当 POI 无图片或图片失效时，固定按以下顺序降级：

```text
POI 专属 approved asset
→ 目的地 + POI 分类占位
→ 目的地通用占位
→ 全局 POI 分类占位
→ 全局通用无图占位
```

酒店、餐饮、活动分别使用自己的分类 fallback，不允许所有内容都显示同一张灰图。

实现层要求：

- fallback 函数纯函数化；
- 不在组件内到处硬编码路径；
- 无效 ID 安全回退；
- decorative 与有语义图片的 alt 处理分开；
- App 未来可读取同一 registry。

---

## 9. 图片来源与版权规则

### 9.1 允许

- TravelAssist 自有品牌资产；
- 用户明确批准并标记的 AI 生成素材；
- 明确允许商业使用与缓存的授权图库；
- 官方旅游机构明确许可的媒体资料；
- Wikimedia Commons 中许可条件明确、可满足署名/衍生要求的文件；
- Public Domain / CC0；
- 只保存第三方 Provider ID、且不把二进制缓存到仓库的 provider reference。

### 9.2 禁止

- Google Maps / Google Images 搜索结果直接下载；
- Tripadvisor、Booking、Agoda、Instagram、小红书、微博等页面抓图；
- 截图、去水印、裁掉署名；
- 无法确认作者、来源或许可的“网络图片”；
- 把 AI 图标记为真实地点实拍；
- 热链第三方图片作为生产运行资源；
- 把私有授权合同、API Token 或个人账号信息提交到 Git。

### 9.3 CC 与署名

采用 CC BY / CC BY-SA 时必须记录：

- 作者；
- 文件页 URL；
- 许可名称与版本；
- 是否修改；
- 修改说明；
- 署名展示位置；
- ShareAlike 对衍生物的要求。

无法满足许可条件时，状态必须是 `rejected` 或 `acquisition_required`。

---

## 10. SVG 统一规范

通用图标：

- `viewBox="0 0 24 24"`；
- 以 `currentColor` 为主；
- 默认 stroke 约 `1.75`；
- round cap / join；
- 不内嵌字体、base64 raster、脚本或外链；
- 不复制第三方受限 icon set；
- 语义图标由调用组件提供 accessible name；
- 纯装饰图标使用空 alt / `aria-hidden`。

地图 Marker：

- 建议 `viewBox="0 0 32 40"`；
- 可使用项目现有 Planner token；
- 不能只靠颜色表达 warning / error / selected；
- selected、warning、error 需要形状或 glyph 差异；
- 必须在浅色、深色地图区域上有足够轮廓对比。

---

## 11. 质量与体积预算

| 类型 | 建议尺寸 / 上限 |
|---|---|
| 24px 通用 SVG | 通常 `< 20 KB`，硬上限 `50 KB` |
| Marker SVG | 硬上限 `80 KB` |
| 缩略图 | 约 `640×360`，建议 `≤ 120 KB` |
| 卡片图 | 约 `960×640`，建议 `≤ 220 KB` |
| 桌面 Hero | 约 `1920×1080`，建议 `≤ 450 KB` |
| 手机 Hero | 约 `1080×1440`，建议 `≤ 450 KB` |
| 单个 runtime raster | 未批准时不得超过 `1 MB` |

Phase 1 新增 Runtime 二进制总体目标：

```text
通用 SVG 与占位资产合计 ≤ 2 MB
试点目的地本地照片仅在授权完整时提交
来源不明照片新增量 = 0
```

现有超预算素材先记录，不在本 Task 中无损替换或重新压缩，避免破坏已验收画面。

---

## 12. 目的地素材包标准

### 12.1 每个首发城市 / 地区的目标规模

正式上线前的完整目标：

| 素材 | 每目的地建议数量 |
|---|---:|
| 桌面主视觉 | 1–2 |
| 手机主视觉 | 1 |
| 区域封面 | 3–8 |
| 地标剪影 / 单色图形 | 8–20 |
| 重点景点图片或 Provider ID | 20–50 |
| 特色标签图标 | 5–12 |
| 目的地专属占位图 | 2–4 |
| 色彩 / 渐变 / 焦点配置 | 1 套 |
| 中日英名称与短文案 | 1 套 |

Phase 1 只建立试点包、占位和采购清单，不以一次性补齐上述所有照片为条件。

### 12.2 POI 分级

#### S 级：代表地标

每个目的地约 8–15 个，正式上线前需人工审核：

- 正式封面；
- 地图缩略图；
- 地标剪影；
- 桌面 / 手机裁切；
- 版权与署名；
- 中日英名称；
- 图片焦点。

#### A 级：高频推荐景点

每个目的地约 30–80 个：

- 至少 1 张合法图片或 Provider ID；
- 名称、分类、坐标、所属街区；
- 来源、授权与缓存状态。

#### B/C 级：普通与长尾 POI

上线前只要求：

- POI ID；
- 名称；
- 坐标；
- 分类；
- 所属目的地。

图片按需获取，缺图走 fallback。

---

## 13. Git 与对象存储边界

### 13.1 适合进入 Git

- Logo 与品牌自有 SVG；
- 通用图标与 Marker；
- 占位图、状态插画；
- 少量已批准的小体积 Hero / 卡片资产；
- Manifest、Schema、采购清单；
- SHA-256、预览、校验脚本；
- 目的地配置。

### 13.2 应进入对象存储 / CDN

- 大量城市、街区、景点照片；
- 酒店与餐厅图片；
- 用户上传图片；
- 自动生成的多尺寸衍生图；
- 会频繁替换或有授权到期时间的图片。

在对象存储未接入前，Manifest 应支持：

```text
runtime.kind = cdn / provider_reference / none
```

不得为了“看起来完整”把几千张原图提交到仓库。

---

## 14. 自动校验要求

`npm run assets:validate` 至少检查：

- Manifest / pack JSON 可解析；
- schemaVersion 正确；
- asset ID 唯一；
- 本地 runtime path 存在；
- 文件名符合 kebab-case；
- 扩展名在白名单；
- 必需元数据完整；
- rights 字段逻辑一致；
- approved 非 placeholder 资产有来源与授权；
- focal point 在 `0..1`；
- SHA-256 与文件一致；
- 文件体积未超硬上限；
- 重复 SHA 有 alias 或报告；
- 不存在第三方热链被误写为 local；
- 现有受保护素材路径仍存在；
- acquisition_required 不得被运行时当作可用资产。

校验工具使用 Node.js 内置模块，不因本 Task 增加图片处理依赖。

---

## 15. Phase 1 完成标准

- 现有素材 inventory 完成；
- 全局目录与 Schema 建立；
- 64 项通用 SVG 基线完成；
- 5 个日本试点 pack 完成；
- fallback registry 可被 TypeScript 使用；
- 采购清单区分 approved / provider-only / acquisition-required；
- index、重复报告、体积报告可自动生成；
- `npm run assets:validate`、测试、lint、typecheck、build 全部通过；
- 没有来源不明的新照片；
- 没有破坏任何现有页面资源路径；
- WBS、Issue、Result、Draft PR 完成关联。

---

## 16. 后续阶段

Phase 1 合并后再拆分：

```text
Phase 2 — 首发目的地正式照片采购与审核
Phase 3 — 对象存储 / CDN / 自动衍生尺寸
Phase 4 — Provider 图片按需获取与缓存策略
Phase 5 — 内容运营后台与授权到期巡检
Phase 6 — App 离线素材包与增量同步
```

任何后续页面不得绕过 Registry 直接新增散乱路径；确有例外时必须在 Manifest 中登记并说明原因。
