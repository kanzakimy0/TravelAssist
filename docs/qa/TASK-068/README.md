# TASK-068 QA — 第二轮身份复核

用户授权按建议继续复核疑似重复、追溯编号冲突和恢复旧主表。本轮完成，完整 TASK-068 enrichment 仍在身份 gate 前。

| 检查项                            |           结果 |
| --------------------------------- | -------------: |
| 原始来源观察，无损保留            |         10,491 |
| 当前候选身份组                    |         10,369 |
| 累计明确合并 / 本轮新增           |       122 / 53 |
| 原疑似组全部复核                  |            224 |
| 完整合并 / 保留分开 / 占位误报    |   52 / 107 / 2 |
| 暂缓组 / 涉及唯一候选             |       63 / 162 |
| 定向核验的官方地址事实            |             23 |
| 历史编号冲突：分配差异 / 后续替换 |        167 / 8 |
| 两版一致的 legacy 绑定            |          4,846 |
| 仍缺历史 Master Code 映射         |          2,979 |
| 当前 review queue                 | 239 个分组任务 |
| canonical 编号变更 / 富集批次     |          0 / 0 |

53 次新合并发生在 52 个完整合并组和一个部分合并的三方组。剩余 170 个同名索引组中，107 个保留分开、63 个暂缓；不是仍有 170 组未复核。239 个队列项为 175 个编号组 + 63 个身份组 + 1 个历史映射任务，并非 239 个 POI。

## 证据入口

- [owner-decisions.md](owner-decisions.md)：需要找回的旧主表文件及后续路径。
- `identity-review.json`：224 组逐项结果、原证据指纹、来源坐标和补充官方证据。
- `../../../data/poi/full/sources/identity-decisions.v1.json`：122 条明确合并决策；全部原观察保留。
- `../../../data/poi/full/sources/identity-official-evidence.v1.json`：23 条 primary-source 地址事实，只用于身份复核，不认证开放时间或运营状态。
- `../../../data/poi/full/sources/legacy-code-lineage.v1.json`：175 个冲突的生成器原因、双版绑定、候选建议；不授权改号。
- `missing-history-recovery.json`：v4.1 原主表压缩包名称、hash、大小、历史引用及查找范围。
- `registry-audit.json` / `source-inventory.json` / `recovery-proof.json`：Registry 审计、261 个 refs、247 个 PR、32 个 exact heads，以及 v3.7.1 逐字节恢复证明。
- `duplicate-audit.json` / `review-queue.json`：原始索引冲突与尚未解决的分组任务。
- `gates.json` / `csv-validation.json` / `safety-check.json`：实际验证结果。
- `../../../data/poi/full/manifests/combination-checkpoint.v1.json`：7 份输入与 10 份生成输出的 SHA-256。
- `batch-manifest.json` 和 enrichment coverage：真实标记未开始，未知分母和覆盖率为 null。

## 复现

```sh
node tools/poi/combine-corpus.mjs --check
node --test tests/task-068-corpus-combination.test.mjs
npx eslint tools/poi/combine-corpus.mjs tools/poi/review-identities.mjs tests/task-068-corpus-combination.test.mjs
git diff --check
```

CSV/JSONL/generated JSON 不手动格式化。输入 observation JSONL 的原 SHA-256 必须不变，生成结果遵循 Git LF 规范。每次修改决策后先 `--write`，再 `--check`。

本轮专项 19 项覆盖：无损保留、175 冲突不合并、官方地址证据缺失拒绝、旧 source ID 不补号、估算同坐标不合并、同地址异坐标暂缓、三方部分合并、占位符误报、未知证据绑定拒绝、顺序确定性及逐字节重建。首跑测试脚本出现正则转义笔误，修正后 19/19 通过；未影响数据。

首阶段 npm ci、Planning contracts 21、soak 6、Registry 15、region integration 6、routing 28、lint/typecheck/build 均已实际通过。当前改动仅离线数据工具/测试/文档，本轮重跑专项、工具 lint、独立数据验证和格式检查；阶段区别见 gates.json。

完整 enrichment/batch、全仓 Node、Local Supabase、部署、线上 Provider 和 GitHub final-head Quality Gate 未执行，不记 PASS。Issue #393 保持 Open，未创建最终 Draft PR。
