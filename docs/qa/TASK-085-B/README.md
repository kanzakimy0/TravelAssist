# TASK-085-B 审查修复及扩容准入 QA

**PARTIAL_TARGETED_EVIDENCE_REQUIRED**。站码身份校验及接入限制丢失已修复，四项接入资料仍不足。WBS 7.15 进行中；21 PASS / 4 FAIL（新增限制传播 gate PASS），data allPass=false，global fixpoint=IN_PROGRESS。旧九项 acceptance-exception 状态已撤销。

当前为 **5,201 唯一 ADMIT、345 HOLD记录／315个唯一HOLD NodeID**，347 relationships / 694 directed edges，raw100 / assessed95，94/95 有topology，91/95 >=3。须坂两条边显式重绑；菊水山由ADMIT改HOLD。关系及未知metrics不变，所有边新增有方向绑定的限制元数据。全部Canonical gates PASS，但不代表游客终点或全程开放已确认。详见 [Result](../../tasks/RESULT-TASK-085-b-poi-transport-node-access-edge-generation.md) 和 [本轮审查修复](review-445fbfd5-remediation.md)。

## 离线复现

```sh
python tools/transport/task-085-targeted-source-check.py
node --import ./tests/register-route-ts.mjs tools/transport/task-085-canonical-replay.mjs --check
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --rebuild
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --check
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --resume
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --rerun-batch 1
node --import ./tests/register-route-ts.mjs --test tests/task-085-b-gate0.test.mjs tests/task-085-b-targeted-repair.test.mjs
node --import ./tests/register-route-ts.mjs --test tests/task-085-b-review-corrections.test.mjs tests/task-085-b-expansion.test.mjs
python tools/transport/task-085-expansion-inventory.py --check
node --import ./tests/register-route-ts.mjs tools/transport/task-085-expansion.mjs --check
node --import ./tests/register-route-ts.mjs tools/transport/task-085-expansion.mjs --resume
node --import ./tests/register-route-ts.mjs tools/transport/task-085-expansion.mjs --rerun-batch 1
```

原接入生成器的--rebuild / --resume对当前PARTIAL返回非零；--check通过只代表字节匹配。扩容执行器成功时也保留PARTIAL状态，不将批次完整性通过混作覆盖验收。数据阈值未改变。

原契约测试现按修正后的身份重放冻结来源。旧fixpoint绑定旧admission哈希，必须失效，测试不再期望旧例外自动通过。新增7项身份/限制回归覆盖缺值、混合有效码、拒绝无收据重绑、下游方向引用、HOLD/unique计数、逐边限制读取、防剥离/篡改/跨方向复制、347关系保全及Evidence ID完整性。新增4项扩容回归覆盖7,791目标/39批、Canonical HOLD、禁止candidate升级、限制缺失拒绝、resume、单批重跑和receipt损坏检测。40项TASK-085用例涵盖上述边界。

扩容已核对全部7,791目标：100获Canonical授权、7,691 HOLD，新增覆盖0、既有94 POI覆盖复用。每批最多200条，39批都有结果、边文件和receipt；没有全国重新抓取，不对未准入POI造边。四项缺证不当作穷尽或例外接受；无额外Canonical exclusions，metrics=null，runtime=false，Provider batch=0。

## 验证记录

本轮命令、日志SHA256和结果见 [local-validation.json](local-validation.json)。修复阶段完整回归2,865项：2,864 PASS，1个资产测试30秒超时；该文件单独复跑51/51 PASS，未改超时或断言。新增扩容4/4 PASS。最终head的全仓Quality Gate包含全部2,869项；实际结果核对headSha后记录在同一Draft PR #464 body，不能引用旧head或PR合成merge-ref绿灯。

身份及限制修复、现有回归和扩容批次校验通过后才执行分批输出。构建、lint、typecheck、format及exact-head验证以当前validation receipt和PR body为准；代码质量通过不消除四个接入data gates或7,691条Canonical准入缺口。
