# TASK-068：接下来只需补齐的历史材料

本轮已处理可依据现有证据处理的事项。你不需要逐条重审上万条 POI，也不需要手工选择 175 个冲突编号。

## 已完成

- 原 10,491 条来源观察全部保留；新增 53 次身份合并后，列表为 **10,369 个候选组**，累计明确合并 122 次。
- 224 组疑似重复全部复核：52 组已完整合并、107 组保留分开、2 组是英文占位符误报、63 组证据仍矛盾。107 组中有一个三方组只合并了明确相同的两方，因此本轮是 53 次合并，而不是 52 次。
- 63 组涉及 162 个候选，已列入暂缓富集清单；同名、同地址或历史估算坐标不能单独证明是同一实体。
- 175 个编号冲突已逐项追溯：167 个来自两版生成器的候选池/容量分配差异，8 个来自后续 source-ID 替换。两版共同一致的 4,846 个绑定另列，但没有升级为正式编号分配。
- 旧 2,979 条 source IDs 的名称、来源和历史位置已恢复；原 Master Code 仍空缺。

## 请优先找回这个文件

**travelassist-poi-expansion8000-consolidated-v4.1.zip**

- 文档记录大小：**4,329,068 bytes**
- 文档记录 SHA-256：`e95729269b5edca936e68d07a12ed1d65cda6d9ce5079cf18ebfbde34abb3a60`
- [历史 v4.1 README](https://github.com/kanzakimy0/TravelAssist/blob/f4372a1fff124958fa68f8a32213f468b8ea5d9c/docs/data/poi/expansion8000-v4.1/README.md) 明确记载：利用保留的 v3.9 Master 恢复旧 2,979 条 slot/编号，并在包中保留 17,000 条 effective master index。

等价的 **v3.9 / v4.1 Master Code → source ID 对照主表**也有用。优先检查当时下载的聊天附件、备份或其他电脑；当前仓库、可见 GitHub releases/artifacts，以及本机已检查的 Downloads、Documents/ChatGPT、Desktop、Codex attachments 中未找到该压缩包。这不是“文件一定丢失”的结论。

收到文件后可先校验 hash，再恢复旧编号、比对完整历史索引、裁决 175 个版本冲突，继续处理暂缓身份并锁定真正的 occupied corpus。历史 README 的 17,000 数量目前只是文档声明，没有拿到主表之前不能当作已验证总量。

## 如果原文件确实无法找回

需要单独决定是否修订任务、建立经过批准的编号恢复/分配方案。**这一步尚未授权或执行**；不能用新的顺序编号冒充原编号，也不能将本次 10,369 个候选直接宣布为全部已占用 POI。

目前无需先判断 175 个编号各选哪版。v3.7.1 是后续流程使用的候选基准，仍须与历史主表核对，不能凭版本时间覆盖 stable identity。

## 可直接检查的交付

- [更新后的候选 CSV](../../../data/poi/full/registry/combined-candidates.v1.csv)
- [224 组复核结果 CSV](../../../data/poi/full/registry/identity-review.v1.csv)
- [175 个冲突原因 CSV](../../../data/poi/full/registry/code-lineage-review.v1.csv)
- [2,979 条待恢复编号 CSV](../../../data/poi/full/registry/unmapped-history.v1.csv)
- [完整阶段 Result](../../tasks/RESULT-TASK-068-b-poi-partition-enrichment-transport-linkage.md)

没有重新编号、写入产品 Registry/DB、创建 PR 或关闭 Issue。43 维、Visit Profile 和交通关联仍等待身份及稳定编号 gate。
