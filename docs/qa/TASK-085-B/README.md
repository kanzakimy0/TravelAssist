# TASK-085-B 定向补证 QA

**PARTIAL_TARGETED_EVIDENCE_REQUIRED**。五项达到目标，四项经自行检索后仍需资料。WBS 7.15 进行中；20 PASS / 4 FAIL，data allPass=false，global fixpoint=IN_PROGRESS。旧九项 acceptance-exception 状态已撤销，不得继续引用旧 Excel 作为当前结果。

原 5,200 admitted / 344 HOLD 和 680 directed edges 全部保留；现为 5,202 / 344、347 relationships / 694 directed edges，raw100 / assessed95，94/95 有 topology，91/95 >=3。全部 Canonical gates PASS。详见 [Result](../../tasks/RESULT-TASK-085-b-poi-transport-node-access-edge-generation.md) 与 [九项证据审计和四项交接](targeted-nine-case-source-audit.md)。

## 离线复现

```sh
python tools/transport/task-085-targeted-source-check.py
node --import ./tests/register-route-ts.mjs tools/transport/task-085-canonical-replay.mjs --check
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --rebuild
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --check
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --resume
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --rerun-batch 1
node --import ./tests/register-route-ts.mjs --test tests/task-085-b-gate0.test.mjs tests/task-085-b-targeted-repair.test.mjs
```

生成器的 --rebuild / --resume 对当前 PARTIAL 返回非零（CLI exit2），输出仍完整且通过内部确定性比较；这是真实的 data gate，不是构建崩溃。`--check` 只检查已有全部生成文件字节，通过则 exit0，但输出 acceptance 仍是 PARTIAL；它不改变数据，也不代表 data PASS。测试用例将 data status 与 artifact integrity 分开，绝不将 failed threshold 改为 PASS。

原21项历史契约测试使用冻结 baseline，新增8项测试覆盖当前定向层：原680条边/全部 admissions/HOLD 不变；receipt/archive corruption；Canonical/scope/source row drift；许可/精确 name/operator join；重复/out-of-scope事实；旧 fixpoint撤销；实际 rebuild/resume/single-batch-rerun/corruption恢复；committed artifacts 精确字节。新增两条 licensed GTFS 行另由 Python verifier 对归档逐项验证，不依赖网络。

未重新全国 discovery；当前四项查询失败/资料缺失不当作物理穷尽。保留完整机器来源收据和交接缺口；无额外 Canonical exclusions，未合成 route metrics。Provider batch=0。

## 验证记录

本轮命令、日志 SHA256、退出状态与数据状态见 [local-validation.json](local-validation.json)。首次 Windows 全量运行与构建并行时出现 ENOSPC 和两个30秒子进程超时；清理本任务可重建产物后，最终全量运行使用 --test-concurrency=2，未修改测试超时、断言或公共行为。最终 exact-head workflow_dispatch Quality Gate 必须核对 headSha，结果记录在现有 Draft PR #464 body；代码 CI 通过不能消除四个 data gates。

最终本地全量重跑 **2,858/2,858 PASS**，含 **29/29 TASK-085 focused tests**。Lint 0 errors / 10 existing warnings；typecheck、format、deployment validation、production build 和 standalone verification PASS（1,908 files）。GTFS source-row 校验和 Canonical replay receipt 校验 PASS。首次环境失败与后续完整成功均保留在 validation receipt。
