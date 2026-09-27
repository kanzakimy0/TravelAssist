> 历史记录：本文件描述修订前 checkpoint，当前状态以 TASK-068 Recovery Amendment 与最新 Result 为准。仅调整相对链接使其在本目录可用。

# RESULT — TASK-068-B（第二轮身份复核 checkpoint）

## 状态与范围

**用户授权“按照你推荐的方式处理”：本轮已完成。** 已复核候选重复、追溯编号冲突、查找旧主表，并生成可重建的更新清单。

**完整 TASK-068-B：Blocked / Identity Conflict；未完成富集验收。** 稳定编号冲突依 Task §3/§5 保留 checkpoint，不猜号、不覆盖原绑定。

- Issue：[#393](https://github.com/kanzakimy0/TravelAssist/issues/393)，保持 Open；Owner B。
- base：`45e9f8830ac66d03b3ace6480d36d3ee31907a2e`。
- task publication：`1622eb076a9b023a643b845d66007f4eef7f83ad`。
- branch：`codex/b-poi-partition-enrichment-transport-linkage`；本轮开始 head `36290ac07252d4fed7c70436c4a694d17202db48`。
- 历史 checkpoint：`551a9e7` 首次组合；`5decb4924d3d73300c9b6b2d78e23a9d483482ae` LF/hash 校正；`36290ac` 本地交接。当前成果以执行分支 HEAD 为准。
- 发布：**LOCAL_ONLY_NOT_PUSHED**，没有 PR、merge 或关闭 Issue。完整 occupied 富集尚未完成，未达到 Task 最终 Draft PR 条件。
- 首阶段自动审批曾拒绝包含 push 的命令，理由为上传数据敏感性及目标信任未验证；后续只读核对确认 origin 为用户指定的公开仓库且账户有 WRITE 权限。本轮继续本地整理，没有重试提前发布。

## 交付

| 文件                                                                                            | 当前内容                                        |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| [唯一候选 CSV](../../../data/poi/full/registry/combined-candidates.v1.csv)                      | **10,369 行**，UTF-8 BOM，12 列                 |
| [无损 JSONL](../../../data/poi/full/registry/combined-candidates.v1.jsonl)                      | 全部 10,491 条原观察恰好保留一次                |
| [身份复核 CSV](../../../data/poi/full/registry/identity-review.v1.csv)                          | 原 224 组线索全部复核                           |
| [冲突追溯 CSV](../../../data/poi/full/registry/code-lineage-review.v1.csv)                      | 175 个编号的前后绑定与原因                      |
| [旧编号绑定 CSV](../../../data/poi/full/registry/master-code-conflicts.v1.csv)                  | 175 个冲突编号、350 个绑定                      |
| [缺失映射 CSV](../../../data/poi/full/registry/unmapped-history.v1.csv)                         | 2,979 个 source IDs，Master Code 留空           |
| [两版一致绑定 JSONL](../../../data/poi/full/registry/agreed-legacy-claims.v1.jsonl)             | 4,846 个 legacy 绑定，仍非 canonical allocation |
| [后续所需材料](owner-decisions.md)                                                              | 旧主表文件名、hash、恢复步骤                    |
| [QA](README.md) / [checkpoint](../../../data/poi/full/manifests/combination-checkpoint.v1.json) | 可复现验证及输入/输出 hash                      |

`candidateKey` 使用已有 source ID，是候选组定位键，**不是新 Master Code**。正式编号全部空缺，旧编号原样保留在 `legacyCodeClaims`。候选唯一不代表现实世界实体已全部消歧，也不代表完整已占用库。

## 合并与复核结果

| 来源 / 变化                                     |       数量 |
| ----------------------------------------------- | ---------: |
| Geoshape v3.8、v3.7.1、旧 2,979 source IDs 并集 |      8,169 |
| 最新 B 累积候选（含原 1,355 条 proposed 编号）  |      2,138 |
| 本地跨族推荐候选                                |         84 |
| TASK-038 Wikidata 身份样本                      |        100 |
| 来源观察合计                                    |     10,491 |
| 首阶段明确合并                                  |        −69 |
| 本轮新增明确合并                                |        −53 |
| 当前候选组                                      | **10,369** |

本轮定向核对 **23 条官方来源地址事实**，与保留的双语地址/来源证据一起支持编辑决策。全部 122 条明确合并都有双侧原证据；不按同名、估算坐标或同编号自动合并，未冒充人工验收。

| 原 224 组线索处理                      | 组数 |
| -------------------------------------- | ---: |
| 证据支持完整合并                       |   52 |
| 不同位置证据，保留分开                 |  107 |
| 标点占位名误报                         |    2 |
| 不同历史 source IDs 共用估算坐标，暂缓 |   38 |
| 同地址指向不同历史坐标，暂缓           |   15 |
| 跨来源地点信息矛盾，暂缓               |   10 |

107 组保留分开中，有一组三方同名寺院只合并了明确匹配的两方，所以本轮新增 53 条合并链接。63 个暂缓组涉及 **162 个唯一候选**；仍完整保留、列为暂不富集。剩余 170 个同名索引组 = 107 个保留分开 + 63 个暂缓，不是 170 组未复核。

例：高知「大日寺」只合并香南市两个来源，室户市同名寺院独立保留。三重「観音寺」两个 source IDs 地址相同但历史坐标不同，不擅自纠正。岐阜「八幡神社」多个历史条目共用估算点，不据此认定为同一实体。[Geoshape 数据说明](https://geoshape.ex.nii.ac.jp/nrct-poi/) 明确有推定位置及地理编码局限。

## 编号冲突追溯

175 个冲突已逐项定位到原生成器：

- **167 个**：v3.8 fallback 与后生成 v3.7.1 岐阜容量分配 override 使用不同候选身份。
- **8 个**：v3.7.1 的 cross-version source collision replacement 改绑来源。
- 其余 **4,846 个**新 5,021 编号在两版中一致，单独导出。
- v3.7.1 生成时间较晚，后续 v4.0/v4.1 使用它；可作候选追溯基准，但不能在缺少历史权威主表时据此改写 stable identity。

Canonical Registry `src/shared/data/master-code-registry.v1.json` 保持未改：revision `task-043-candidate-r1`，50 active region + 1 reserved，0 canonical POI allocations。保留的 **6,376 个 distinct legacy code claims** 不是已认证 occupied 数量：

| 声明号段    | 编号数 |
| ----------- | -----: |
| 60000–69999 |  5,670 |
| 70000–79999 |    135 |
| 80000–89999 |    571 |

声明 min/max 为 60000 / 80570；真正 occupied 总量、范围、min/max 仍未知。1,355 条 B 提案编号未改变；旧 2,979 条仍无编号映射。

## 历史主表恢复

已检查 261 个 refs、247 个 PR metadata、32 个相关 exact heads、历史 Git 对象、可见 Actions 制品及本地原输出。v3.7.1 已按原脚本和原 CSV 逐字节恢复，SHA-256 `e42300b3a486acb812d27928522d92db07d97dd94b0a2e65b80e634968c6fdcb` 与 [原 CI](https://github.com/kanzakimy0/TravelAssist/actions/runs/34542822317) 一致。

本轮发现 [v4.1 整合 README](https://github.com/kanzakimy0/TravelAssist/blob/f4372a1fff124958fa68f8a32213f468b8ea5d9c/docs/data/poi/expansion8000-v4.1/README.md) 明确记录：曾用 v3.9 Master 恢复旧 2,979 条编号，并保留 17,000 条 effective index。对应文件：

- **`travelassist-poi-expansion8000-consolidated-v4.1.zip`**
- SHA-256：`e95729269b5edca936e68d07a12ed1d65cda6d9ce5079cf18ebfbde34abb3a60`
- 文档记录大小：**4,329,068 bytes**

该包尚未找回；检查过的本机 Downloads、Documents/ChatGPT、Desktop、Codex attachments 以及远端可见范围内未找到。没有声称搜索了整台电脑或文件已永久丢失。具体范围见 [missing-history-recovery.json](missing-history-recovery.json)。

仓库另一个 9,000 行 attraction manifest 是未解析素材配额，不能导入为 POI；但这**不能否定**历史 v4.1 README 记载的另一份 17,000 主表。没有原包，17,000 也只能记为尚未独立验证的历史声明。

下一步优先找回该包，或等价 v3.9/v4.1 Master Code→source ID 对照表。若确实无法恢复，需另行批准任务/编号治理修订；本轮未授权或执行新编号分配。

Geoshape 使用 CC BY 4.0，署名和历史位置限制保留。B 研究来源未全量重新抓取，本轮仅新增 23 条定向身份事实；pilot 未导入评分。没有将历史位置或身份核对当作当前运营、导航或属性证据。

## 完整 TASK-068 验收字段

| 项目                                      | 当前状态                                                     |
| ----------------------------------------- | ------------------------------------------------------------ |
| total occupied POIs / remaining           | null，身份 gate 未通过                                       |
| processed occupied POIs                   | 0                                                            |
| batch total / completed / partial         | null / 0 / 0                                                 |
| 43-key shape complete                     | 0，未运行 enrichment                                         |
| feature known/null coverage               | null，未测量                                                 |
| Visit Profile / transport anchor coverage | null / null                                                  |
| neighbor edges                            | 0，未生成                                                    |
| review queue                              | 239 个分组：175 编号 + 63 身份 + 1 历史映射                  |
| source tiers                              | 历史公开研究数据、B 原研究、23 条定向官方地址、Wikidata 身份 |
| stable IDs changed / allocated            | 0 / 0                                                        |
| canonical / runtime / DB / Provider 修改  | 0                                                            |

200 项 enrichment batch 自动续跑尚未实现或认证。本轮完成的是身份复核及恢复准备，不能将其当作完整 TASK 验收完成。

## 实际 QA

本轮：

- TASK-068 专项 **19/19 PASS**：无损保留、冲突不合并、证据漂移拒绝、未知编号不补号、估算坐标/地址矛盾、部分合并、占位误报、证据绑定、重建与 CSV。
- `--check` 生成结果逐字节一致；独立 Python CSV/JSONL 验证候选 10,369、来源 10,491、复核 224、冲突追溯 175、未映射 2,979。
- 原 9 份源文件 SHA-256 保持一致，规范化观察输入 hash 不变。
- 工具 ESLint、Task-owned Prettier、`git diff --check`；Git blob 与 7 输入/10 输出 checkpoint 一致。
- 首次测试脚本的正则转义笔误已修正，完整专项重跑通过；未改数据事实。

首阶段已实际执行并通过，当前离线改动不冒称重新执行：`npm ci`、Planning contracts **21/21**、soak **6/6**、Master Code **15/15**、region integration **6/6**、routing **28/28**、全仓 lint、typecheck、build。本轮代码指纹与日志详见 [gates.json](gates.json)。

未执行、不记 PASS：完整 enrichment/batch QA、全仓 Node suite、Local Supabase、部署、GitHub exact-final-head Quality Gate。未调用付费/实时 Route Provider。

本地 checkpoint 已保存。Issue #393 与 WBS 进行中状态保持；未创建 PR、未 merge，未改正式编号。
