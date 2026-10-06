# 剩余 10,097 POI：权威重认证完成 Result

本次无人值守续跑已按冻结顺序完成全部 **10,097 / 10,097** 候选：50 个 200 条批次和最后 1 个 97 条批次。每批都先保留实际搜索与来源缓存，再进行逐条 target-boundary 审读、字段级 provenance/UTF-16 locator 哈希、候选合同和身份保护认证；来源不足或身份未解的字段保持 `null` 并留在待查名单。没有填入默认 `0` 或 `5`。

执行分支为 `codex/b-poi-remaining-10097-evidence-review`，Draft PR #398 保持 Draft/Open；本 Result 不授权合并、关闭 Issue 或启动 P1。

## 模型切换审计与权威范围

| 范围 | 审计分类 | 处理 |
| --- | --- | --- |
| R-0001 至 R-0019 | `ORIGINAL_ACCEPTED_RUN` | 冻结；输入、输出、candidate identity、Registry 和校验和均未改写。|
| 原 R-0020 及其后已有产物 | `SUPERSEDED_MODEL_CHANGE_REVIEW` | 保留为审计证据，不计入正式累计。归档 manifest：`data/poi/full/audit/remaining-v1/model-change-superseded-20260920/manifest.json`。|
| 新 R-0020 至 R-0051 | `AUTHORITATIVE_RERUN` | 使用 `gpt-6-astra` 和继承的冻结运行 reasoning configuration，按原顺序重新认证。|

归档包含 327 个文件、51,500,621 bytes，归档 checksum 为 `db1389650c0ba135212898b31f44164c22a5c289253e5c6f0c30a0c0413fb474`。R-0020 与 R-0021 的 old-vs-rerun comparison 保留在其权威 rerun audit 中；新批次审计均记录输入/输出 checksum、来源缓存、模型、reasoning configuration、查询/打开页面/正文审读与 locator 验证计数。

## 正式累计结果

- R-0001 至 R-0019：3,800 / 10,097（冻结原接受运行）。
- 新 R-0020 至 R-0050：每批 200 条；新 R-0051：97 条。新 rerun 累计 6,297 条。
- 正式累计：**10,097 / 10,097**；每批 `ASSESSMENT_QA_PASS`，无 machine error queue。
- 有评分 POI：272 → **2,510**；新增非 null 43 维字段：**5,244**；总非 null 字段：6,104。
- Visit Profile 新增：**23**；Access Anchor 新增：**1,527**（静态 access link 1,538）。
- 待查候选：10,097。待查不是未执行：每条均已审读；未知、来源层级不足、目标身份未解或尚有未支持字段均继续保留为可重复查询/人工审核入口。

| 待查理由 | 数量 |
| --- | ---: |
| `UNSUPPORTED_FIELDS_REMAIN_NULL` | 2,461 |
| `REVIEWED_TARGET_NO_SUPPORTED_FACT` | 1,422 |
| `TARGET_IDENTITY_UNRESOLVED` | 6,049 |
| `IDENTITY_CONFLICT` | 165 |

最后一批 R-0051 的 97 个 retained target page 均为 Wikipedia 二级记录。页面原文已逐条审读和哈希验证，但没有将其未独立核验的叙述升级为结构化评分、Visit Profile 或 Access Anchor；这些字段保留 null，并进入后续 primary/official source 复查。

## 不变性与恢复入口

- formal Master Code 分配：0；Registry rebind：0；candidateKey、旧编号声明和 batch membership/order：0 变化。
- Registry checksum before/after：`9efcc0b6172dacdabe846789430d1ed54de98f12827097e96a7651131bf044b2`。
- candidate identity checksum before/after：`4c8f6a4904cd85acafc9b355d3f5d8cf85fc6e00781751a657595db821812067`。
- 165 个身份隔离候选均执行检索，但没有自动关联、评分或解除隔离。
- 原始来源缓存保留在 `outputs/poi-remaining-20260919/source-cache`，不是可清理临时文件。

恢复和复查使用：

```powershell
python -X utf8 tools/poi/review-remaining.py --final --check --cache <source-cache>
node --import ./tests/register-route-ts.mjs tools/poi/read-current-candidates.mjs
```

## 已实际执行的最终校验

- `python -X utf8 tools/poi/review-remaining.py --final --check --cache ...`：PASS；10097 candidates、51 batches、`changedFiles: 0`。
- 当前唯一候选视图校验：PASS；population 10,369、new scored 2,238、scored 2,510、non-null features 6,104，且没有 runtime import authorization。
- 每个 R-0001 至 R-0051 的 assessment certificate：PASS；来源正文/locator hash、candidate contract 和受保护 identity checksum 均通过。
- `git diff --check`：PASS。

GitHub Quality Gate 必须在此 Result 所在最终提交推送后，以相同 head SHA 的 PR workflow 核验；不会用较早提交的 run 代替。

## 交付入口

- [批次 QA 与冻结/重跑说明](../qa/POI-REMAINING-10097/assessment/README.md)
- [机器汇总](../qa/POI-REMAINING-10097/review-summary.json)
- [待查索引](../qa/POI-REMAINING-10097/pending-review-index.md)
- [权威 rerun audit](../qa/POI-REMAINING-10097/authoritative-rerun/)
- [模型切换归档 manifest](../../data/poi/full/audit/remaining-v1/model-change-superseded-20260920/manifest.json)
