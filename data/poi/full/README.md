# TASK-068：合并后的唯一候选列表

本次按用户“先进行组合，生成唯一列表”的指示，交付身份合并 checkpoint。它是来源可追溯的候选集合，尚不是已分配 Master Code 的正式 POI Registry。

- [可用 Excel 打开的 CSV](registry/combined-candidates.v1.csv)：10,369 行，UTF-8 BOM。
- [保留全部原始观察字段的 JSONL](registry/combined-candidates.v1.jsonl)：每行一个候选身份组。
- [175 个旧编号冲突 CSV](registry/master-code-conflicts.v1.csv)：每个有争议的绑定一行。
- [224 组身份复核 CSV](registry/identity-review.v1.csv)、[175 个编号原因 CSV](registry/code-lineage-review.v1.csv)、[2,979 条未映射历史身份 CSV](registry/unmapped-history.v1.csv)。
- [下一步所需历史主表](../../../docs/qa/TASK-068/owner-decisions.md)。
- [确定性 checksum checkpoint](manifests/combination-checkpoint.v1.json)。

## 合并规则

输入共 10,491 条来源记录：Geoshape 两版身份表与旧 source-ID 集合的并集 8,169 条、最新 B 累积候选 2,138 条、跨族推荐候选 84 条、TASK-038 Wikidata 身份样本 100 条。

同一 provider source ID 只计一次。122 次跨来源合并根据日文名称、都道府县和地址证据合并，决策保存在 [identity-decisions.v1.json](sources/identity-decisions.v1.json)。这些是可撤销的编辑判断，没有冒充人工验收或外部权威认定。仅仅同名、坐标相近或使用同一个旧编号都不会自动合并。

“唯一”指本次明确身份依据下的唯一候选组。224 组原线索已全部复核：52 组完整合并、107 组保留分开、2 组占位误报、63 组暂缓（涉及 162 个候选）。本轮新增 53 次明确合并，其中一组三方实体仅合并匹配的两方。不保证已完成现实世界实体的最终消歧。英文别名、历史沿革及不同语言的潜在重复也可能尚未识别。

## 字段与编号

`candidateKey` 使用组内已有的 provider/source identity；它不是新分配的 Master Code。所有 `canonicalMasterCode` 留空。`legacyCodeClaims` 保留原编号、来源版本、proposal/effective 声明类别及来源记录，没有将历史脚本的声明升级为 canonical allocation。

- 1,355 条本地 B 旧提案编号保持原样。
- 两版 Geoshape 分别为 5,021 个编号声明，175 个相同编号指向不同身份。
- 旧 2,979 个 source ID 已从原始数据恢复名称和位置，没有猜测缺失的 Master Code 映射。
- JSONL 的 `observations` 无损保留全部 10,491 条输入记录；多版本的名称、地址、坐标均保留，不强行选为当前事实。

CSV 包含日英名称、都道府县、地址、类型、历史坐标、旧编号声明与来源链接。坐标未经导航验证。编号冲突 CSV 的编号列导入 Excel 时请选择“文本”类型。CSV 对公式前缀做了转义，JSONL 则保留原文。

## 来源与使用限制

Geoshape 数据版本为 2025-05-15：

> 『日本歴史地名大系』施設・地点項目データセット（CODH作成） doi:10.20676/00000456

原数据遵循 [CC BY 4.0；来源及说明](https://geoshape.ex.nii.ac.jp/nrct-poi/)。本次只选择既有历史工作流实际使用的 source IDs，调整字段名称并合并来源；没有导入其全部 32,038 行。历史坐标、地址与设施是否仍存在都不能当作当前运营或路线事实。部分地址和名称相互矛盾的记录仍独立保留并进入复核。

B 候选沿用原本地研究输出和其来源 URL；本轮定向核验 23 条官方地址事实，但没有全量重新抓取网页或认证运营状态。100 条 pilot 仅导入身份，没有沿用未经人工裁决的 43 维评分。9,000 条 attraction manifest 是未解析的素材配额槽位，不能计入已占用 POI。另有历史 v4.1 文档记载过 17,000 条 effective index；其压缩包未找回，不能将文档声明当作已验证总量。

## 重建与验证

```sh
node tools/poi/combine-corpus.mjs --dry-run
node tools/poi/combine-corpus.mjs --write
node tools/poi/combine-corpus.mjs --check
node --test tests/task-068-corpus-combination.test.mjs
```

命令从工具所在仓库解析数据路径；无网络请求，无 runtime/DB 写入。输入 checksum 不符或合并证据漂移会失败。`--check` 要求全部生成文件逐字节一致。没有在此阶段实现或宣称 200 条 enrichment batch 的自动续跑。
