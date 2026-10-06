# WBS 1.10 Amendment v1.1 — POI Taxonomy 与 43-field / Profile / Rule 映射边界

> 状态：Frozen Amendment
> 日期：2026-09-12
> Parent：`docs/ui/attraction-activity-tag-display-rules.md`
> WBS：1.10

## 1. 目的

本补充不重做 WBS 1.10 的 POI / Activity taxonomy、Surface 展示数量、标签优先级、Provider handoff 或动态事实边界。原规格继续有效。

本补充只修正原规格中“Preference mapping”的时代差异：项目当前已从早期六个用户可见景点偏好维度，发展为更细的 POI / Profile / Rule / Scoring 多维体系（当前 43-field 方向）。因此 WBS 1.10 不再把早期六维视为唯一或最终映射终点。

## 2. Frozen boundary

统一关系如下：

```text
POI taxonomy
(primary / secondary category)
        ↓
semantic / experience / operational attributes
        ↓
versioned POI / Profile / Rule / Scoring dimensions
(current 43-field direction; owned by its canonical schema/spec)
        ↓
user-facing preference abstraction / UI choices
        ↓
recommendation explanation / display selection
```

必须保持三个概念分离：

```text
POI taxonomy = 地点 / 活动是什么
Scoring / Profile dimensions = 用哪些维度描述、比较、约束和计算
User preference UI = 用户选择或表达自己偏好的方式
Display tag = 当前 Surface 上对用户最有价值的少量解释
```

## 3. Ownership

WBS 1.10 只拥有：

- POI / Activity 分类与显示语义；
- experience / operational tag 的展示边界；
- Surface label selection；
- taxonomy → scoring/profile 的映射接口要求。

WBS 1.10 **不拥有**：

- 43-field master schema 的字段清单与 canonical ID；
- 字段权重；
- 推荐打分公式；
- fatigue / feasibility 公式；
- 用户长期 Preference 的持久化 schema；
- Provider 原始字段定义。

因此不得把 43 个字段复制进本 taxonomy 文档形成第二套 schema。

## 4. 早期六维的兼容定位

原规格中的：

```text
自然 / 历史 / 人文 / 艺术 / 摄影 / 活动体验
```

继续可以作为用户可见的高层 Preference abstraction 或兼容映射层，但不再代表完整 POI 特征空间。

例如：

```text
清水寺
primary_category = heritage
secondary_category = temple

可映射到多个细粒度 dimensions：
history / architecture / photo / local / iconic / walking / ...

用户界面可以只显示少量高层偏好或推荐理由，
但内部 scoring / feasibility 不受该 UI 数量限制。
```

上述字段示例仅说明层级关系；canonical 43-field 定义以其正式 Schema / Rule 文档为准。

## 5. Display rule 不变

原 WBS 1.10 已冻结的以下原则不变：

- Map Pin 默认态不堆标签；
- Selected / Quick Card / Detail / Timeline 按 Surface 限制可见数量；
- operational risk / reservation / live state 优先于装饰性 experience tag；
- 动态天气、拥挤、票价、库存、营业、交通时间不得被静态化；
- 高推荐匹配分不得覆盖硬时间、预约、路线、体力或安全约束；
- Provider 原始 taxonomy 不直接作为 traveler-facing canonical taxonomy。

## 6. 后续 handoff

后续 WBS 7.4 / 7.9 / Preference Contract 或 Engine Rule 层接入时，应通过稳定 ID + version + provenance 建立映射，而不是由 UI 文案反推评分字段。

推荐形态：

```ts
type PoiTaxonomyScoringLink = {
  taxonomyVersion: string;
  primaryCategory: string;
  secondaryCategory: string | null;
  dimensionRefs: string[];
  ruleProfileRef: string | null;
  provenanceRefs: string[];
};
```

这是 handoff shape，不是新的 canonical runtime schema。

## 7. 验收结论

本 Amendment 关闭 WBS 1.10 唯一需要补正的旧六维映射问题。原 1.10 主设计 + 本 Amendment 共同构成 Frozen v1 baseline。
