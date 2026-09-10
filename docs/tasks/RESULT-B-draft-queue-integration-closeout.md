# B Draft PR 队列整合结果

日期：2026-09-10。用户授权处理 B 保留的 Draft：审计最新 head、解决分支差异，合并可交付项，未完成项 push 后保持 Draft。

| PR                                                          | 原审计 head                              | 最新交付 / 结果                                                                                                     |
| ----------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [#171](https://github.com/kanzakimy0/TravelAssist/pull/171) | 46f00dcf003ba25cc00c93038752f36cdb1b3a30 | head c75d7fcea922a9cab4fe5b0bd056b9f16374f83b；merge 88f9d338793dd21f81a3517be9c1ee55fc2d645b                       |
| [#177](https://github.com/kanzakimy0/TravelAssist/pull/177) | a21a66ea7d19cfe728121ad270658c128e729a52 | head e3d24900da5d7644b877d4b382c788b00abea72e；merge f0569cdc57adc44d9c7e2524064be86217b7d628                       |
| [#179](https://github.com/kanzakimy0/TravelAssist/pull/179) | 95ccaec1a0f6919f21986a66689ae8d867bf6fd9 | head a52fbadc69d1d6a67e4bd6291b23aa362d59ddc7；merge 9c404d6dbc9299351a0363377422574bf00a1786                       |
| [#221](https://github.com/kanzakimy0/TravelAssist/pull/221) | ae8b1e18ea713a2d86b1126178522e1752b1cb8d | 已推送整合 323f76305771b76369a3bd640c1e3319b9919e78；仍 Draft / Partial，后续仅吸收本收尾文档时以 PR 最新 head 为准 |

## 差异处理

#171 的 WBS 两段冲突、#177 的 WBS 两段冲突、#221 的 WBS 与 package.json 各一段冲突均逐段解决；#179 无冲突。保留所有最新 develop A/B 记录和独有历史，没有整份 ours/theirs、force push、删除分支、清空目录或覆盖未提交工作。

#171 补最新 Trips/Routes/Auth/Engine canonical/Consumer 清单，旧“shared/server 不存在”降为历史；治理规则已发布，WBS 0.9 B / 已完成，Issue #168 Completed。

#177 修正珊瑚品牌色、稳定日期路线身份与交通/风险分离；沿用 outdoors-v12，明确旧灰线与目标差异及后续成对截图证据。#179 复用现有全局变量，记录 wizard/pc 兼容映射、当前圆角/字体/阴影，撤回旧红棕及平行 --ta-* 设计。两项仅合入修订候选；WBS 1.12/1.13 仍待审查，Issue #176/#178 保持 Open。

#221 原 runtime/SQL/generated types/专项 tests 未修改，正常吸收最新 Auth、Trips、UI、质量检查脚本。811/811 全仓、9/9 专项、npm ci/lint/typecheck/build/format:check:deploy 与 diff check 通过。Docker daemon 不可用，真实 Local DB/RLS/API/reset/types 未复测，不能沿用历史 15/25 计数冒称当前通过。

## 保留 Draft 的原因

#221 还缺实际 StartFlowShell/Personal Center 消费、完整问卷/兴趣细分/交通/付费体验/金额币种映射、登录/换用户/访客草稿迁移与跨设备浏览器验收。5.3 Auth User Flow 已完成，不再作为整体登录缺失。A #227 仍为独立 Draft，数据库组合/类型生成验证留待正式交接，不在本次清队列时合并。

## 验证与状态边界

前三项 PR 的远端质量检查全部通过；修改的 Markdown Prettier / git diff 检查通过。运行时代码、测试行为和资产没有在本轮被编辑；#221 的代码新增来自它原有未合并成果，不进入 develop。旧 baseline failures 与原始测试记录全部保留，新结果单独记录。没有新增浏览器或地图 live 验收。

本收尾 PR 仅更新 WBS 与 Task/Result，合并后再把文档变化普通 merge 回 #221，维持其最新基线和 Draft。未启动其他 WBS。个人中心/地图/Engine runtime 均不改。
