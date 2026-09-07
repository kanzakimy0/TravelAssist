# TASK-013.2-A Result

## Status

Blocked

2026-09-08 JST 范围修正完成，但实现前置仍未满足。`TASK-013.1-A` 的 PR #172 当前仍为 Open / Draft / unmerged，因此本 Task 不进入 9,000 景点 Manifest 实现。

---

## Scope Correction

旧版 TASK-013.2-A 错误地定义为“全球核心目的地素材生成单”。该范围已于 2026-09-08 废止并改为 **Japan-only**。

已修正：

- Task 标题与范围 → 日本国内；
- Design → 日本国内；
- Codex command → 日本国内；
- Seed → 300 个目的地全部改为日本；
- Batch → 40 批全部改为 `JP-*`；
- 强制增加 47 都道府县覆盖验证；
- 强制禁止 non-JP country、non-`jp-` destination ID、non-`JP-` batch ID；
- 海外扩展推迟到未来独立 Task。

---

## Prerequisites

当前已确认：

- `TASK-013-A` 已由父任务链记录为已接受；
- `TASK-013.1-A` / Issue #116 尚未最终完成；
- PR #172：Open / Draft / unmerged；
- 因此 TASK-013.2-A 继续 Blocked。

不轮询、不等待、不猜测父任务 Schema、不创建实现 PR。

---

## Japan-only Seed Validation

修正后的冻结目标：

```text
destinations = 300
unique destination IDs = 300
country_code JP = 300
non-JP = 0
destination IDs with jp- prefix = 300
S = 100
A = 200
S quota = 40
A quota = 25
attraction quota total = 9,000
```

旧 Seed 中韩国、中国、东南亚、欧洲、美洲、中东、大洋洲目的地已从该 Seed 删除。

---

## Batch Validation

修正后的批次：

```text
JP-S-01 .. JP-S-10 = 10 batches
JP-A-01 .. JP-A-30 = 30 batches
total = 40 batches
```

总量：

```text
destinations = 300
attractions = 9,000
city variants = 600
attraction variants = 9,000
expected variants = 9,600
max destinations per batch = 10
max expected variants per batch = 420
```

旧全球批次 ID 已废止。

---

## Prefecture Coverage

实现阶段必须在 Destination Manifest 中加入：

```text
prefecture_code
prefecture_name_ja
prefecture_name_en
coverage_note
```

并生成：

```text
docs/assets/generated/prefecture-coverage.md
```

验收条件：

```text
prefecture_count = 47
missing_prefectures = 0
```

---

## Files Updated in Scope Correction

```text
docs/assets/catalog/core-destination-generation-seed.v1.csv
docs/assets/catalog/core-destination-generation-batches.v1.csv
docs/assets/core-destination-generation-plan.md
docs/tasks/TASK-013.2-a-core-destination-generation-manifest.md
docs/tasks/CODEX-TASK-013.2-a-generation-manifest-command.md
docs/tasks/RESULT-TASK-013.2-a-core-destination-generation-manifest.md
```

Issue #152 同步改为 Japan-only。

---

## Next Executable Condition

只有 `TASK-013.1-A` 合并到 `develop` 且最终验收通过后，才重新执行 TASK-013.2-A。

首次允许准备的 batch：

```text
JP-S-01
```

默认仍使用：

```text
RUN_MODE=manifest
```

不得直接批量生成或下载图片。
