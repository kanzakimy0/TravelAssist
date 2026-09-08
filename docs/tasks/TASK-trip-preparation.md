# TASK-TRIP-PREPARATION-A — 完成规划与出发准备

## Metadata

- Task ID: TASK-TRIP-PREPARATION-A
- Owner: A
- Status: 待验收
- WBS: 4.42–4.45
- GitHub Issue: #205
- Branch: `codex/trip-completion-flight-workspace`
- Depends On: PR #204 本地整合成果（未自动合并，作为本轮明确保留的基线）
- Base: `c9589d1c738e5035ec6115e39b46bc10cd458259`
- Commit: PENDING
- Pull Request: PENDING

## 用户已确认设计

1. 详情右栏底部“调整后续行程”右侧新增“完成行程”。居中弹窗支持行程名、组合/单人/临时成员、全程问题/需确认/预约/缺失统计、问题定位和本地保存。
2. 完成指规划完成，不是旅行结束或助手就绪。可保存待办并继续修改，保存前明确承认风险；人数/年龄组不匹配、空行程名或保存失败不得报成功。成员去重，快照不复制私人备注和生日。
3. 个人中心与详情读取同一份明确保存的浏览器同行人库。不接 Auth/DB，演示成员明确标记；游客可选临时成员。保留个人中心未保存保护及并发写入保护。
4. 总览建议区域下方约1/3为航班设置，支持不乘飞机、去程/返程/中转。编辑与购票需求统一进项目详情框；机场、当地日期时间和UTC时差显式录入。待购票不等于已付款或出票，真实购买不在本轮范围。
5. Planner单日餐宿强化三餐覆盖、住宿落点和区域取舍；体检强化指标、问题定位和出发检查。保留底栏高度、地图比例、推荐与详情职责分离。

## 验证与交付

完整 Node tests / lint / typecheck / build / format新增失败审计 / diff check；1440×900、390×844、320×740浏览器实际操作，桌面Mapbox与手机fallback；明确本地存储、没有真实订票和手机助手。更新Result/WBS/Issue，保留原工作树，不自动merge。
