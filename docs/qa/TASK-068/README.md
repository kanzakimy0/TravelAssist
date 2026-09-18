# TASK-068 QA — 身份合并 checkpoint

当前交付为用户要求的“先组合、生成唯一列表”，不是完整 TASK-068 验收。正式 occupied population 未锁定，富集阶段因身份冲突停在 gate 前。

## 结果

| 检查项                           |                            结果 |
| -------------------------------- | ------------------------------: |
| 输入来源观察                     |                          10,491 |
| 合并候选身份组                   |                          10,422 |
| 有地址依据的跨来源合并           |                              69 |
| 所有来源记录和旧编号声明无损保留 |                            PASS |
| 旧编号冲突                       |                             175 |
| 同名同地区待复核分组             |                             224 |
| 历史 Master Code 映射缺失        |                           2,979 |
| review queue 条目                | 400 个分组任务，不是 400 个 POI |
| canonical POI allocation 变更    |                               0 |
| 已处理富集批次                   |                               0 |

## 证据

- `registry-audit.json`：canonical Registry、外部表、号段声明与未知范围。
- `source-inventory.json`：261 个 remote refs（含 origin 符号别名）、247 个 PR metadata、32 个相关 PR exact-head 路径检查及可见 Actions 制品。
- `recovery-proof.json`：丢失的 v3.7.1 制品通过固定输入重建，其 SHA-256 与历史 CI 完全一致。
- `duplicate-audit.json`：175 个编号冲突及 224 组疑似重复；没有按冲突编号合并。
- `review-queue.json`：175 个编号组、224 个名称组、1 个包含 2,979 source IDs 的历史映射任务；分组间可能涉及相同候选。
- `source-coverage.json`：身份来源覆盖，不能当作属性证据覆盖率。
- `safety-check.json`：持久化数据的凭证模式及 URL 检查，注明扫描范围与局限。
- `batch-manifest.json` 和各 enrichment coverage JSON：真实标记 `IDENTITY_GATE_PENDING` / `NOT_STARTED`，未知分母与覆盖率用 null。
- `gates.json`：实际执行的本阶段检查。
- `../../../data/poi/full/manifests/combination-checkpoint.v1.json`：输入、决策、输出 SHA-256。

## 复现

```sh
npm ci
node tools/poi/combine-corpus.mjs --check
node --test tests/task-068-corpus-combination.test.mjs
npm run test:planning-contracts
npm run test:planning-soak
npm run test:master-code-registry
npm run test:region-master-code-integration
npm run test:routing
npm run lint
npm run typecheck
npm run build
git diff --check
```

CSV / JSONL / generated QA JSON 是脚本确定性输出；不要手动格式化生成文件。生成器和测试使用 Prettier 检查。输入 observation JSONL 与其 SHA-256 保持不变。

初次边界测试发现 JavaScript 正则可把 numeric code 隐式转换成字符串；已在本次新增工具中要求五位字符串，并通过回归。没有修改产品 runtime。

## 本阶段未执行

未锁定 occupied corpus、未执行 43 维标注、Visit Profile、transport anchors、neighbors 或 200 项 batch 自动续跑。未运行或声称完整 TASK-068 batch 验收、Local Supabase、部署、线上 Provider、全仓 Node suite 或 GitHub final-head Quality Gate。没有创建最终 Draft PR、合并或关闭 Issue #393。
