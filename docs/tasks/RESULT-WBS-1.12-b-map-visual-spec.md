# WBS-1.12-B Result — 地图视觉 / Pin / 区域 / 路线规范

## 原始交付状态（2026-09-07；当前见末节）

**设计已交付 / 待审查。** 本轮由 ChatGPT 直接执行，不依赖 Codex；没有网页实装。用户设计验收和合入 develop 尚未完成，因此 WBS 1.12 不标记已完成。

## Tracking

| 项目          | 记录                                       |
| ------------- | ------------------------------------------ |
| 日期          | 2026-09-07（Asia/Tokyo）                   |
| WBS / Task    | 1.12 / WBS-1.12-B                          |
| Owner         | B，用户明确单项改派；A 仍负责主系统实现    |
| Issue         | #176，保持 Open                            |
| PR            | #177，保持 Draft / Open                    |
| Branch        | `docs/b-wbs-1-12-map-visual-spec`          |
| Base          | `85675375a52a1bb1adaf37d9b8ea0a48a467eae1` |
| Task 初始提交 | `a8dd33e475458864615f98eda885730a6afddd2c` |
| 设计提交      | `687fa0644cbd5670fa92dfc3e43094b77e9188e7` |
| WBS 更新提交  | `236925985605cefe1ad2bc8d43899d14b4819b73` |
| Task 交付同步 | `4ebab3cb28126bd5f172f559c1fef708f2b4a6a0` |

本 Result 自身提交及最终 head 以 PR 记录为准，避免在文件内引用自身尚未生成的 commit。

## 交付文件

- `docs/ui/map-visual-pin-region-route-spec.md`
- `docs/tasks/TASK-WBS-1.12-b-map-visual-spec.md`
- `docs/tasks/RESULT-WBS-1.12-b-map-visual-spec.md`
- `docs/project/WBS-TravelAssist.md`：仅本项负责人、状态和追踪变更。

上述内容位于本任务文档分支，不表示 develop 的正式 WBS 已改变。

## 已完成的设计

设计书包含 0–20 共 21 个编号章节、10 张表和 MV-01 至 MV-24 共 24 项验收场景。

覆盖底图与地图局部色彩、Pin 尺寸/图片/状态、正式节点与候选分离、聚合与重叠、缩放信息层级、住宿/餐饮区、Planner 单日/三日/全程、Detail 单日执行、日期与交通线型、图层/命中顺序、可见地图安全区、跨视图选中、无障碍/动效、数据未知/fallback/定位和来源署名。

已明确的主要冲突裁决：

1. v0.5 的地图到页顶、左上 Logo、粉白珊瑚视觉优先于旧完整 Header；推荐卡和页面几何保持原有边界。
2. Planner 保留地图范围选择；Detail 由底栏切日，地图不再显示规划范围按钮。
3. 当前范围彩色、相邻日期灰线；日期、交通、类别和风险分别表达，已预约不能覆盖执行风险。
4. 1.10 的标签规则作为候选输入引用，不将其待审查状态改为已完成。
5. 1.12 的新增数值是待验收方案，不冒充 1.13 的全站 Token 冻结。

## 实际验证

| 检查          | 结果与范围                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| 前置/查重     | 已核对 develop、WBS 1.5、UI/Task 目录，以及创建前标题含 1.12 的 Issue/PR；未发现独立重复任务           |
| 文档对照      | 已读取 Planner v0.3、v0.5、Detail v2.0、地图技术附录、1.10 标签、Design System、help-icons 的相关内容  |
| 会话对照      | 已遍历当前可见对话及项目共享摘要；不宣称读取了未提供的完整原会话或原图                                 |
| Markdown 解析 | 使用 markdown-it-py 解析本地设计文件；21 个章节序号连续、10 张表、24 项验收 ID 无遗漏/重复             |
| 文本完整性    | UTF-8；30,523 字节；358 行；无 Unicode replacement character；六个外部引用标记都有定义                 |
| 本地/远端一致 | 设计 Git blob SHA 均为 `88afed8d6eca3576a31d58a388407104fc4dc227`                                      |
| 色彩计算      | 已按 sRGB 相对亮度计算七组纯色对比；与设计数值一致；不等于实际透明背景/浏览器检查                      |
| WBS 范围      | 已读取提交 `2369259` 的完整文件 diff；仅新增顶部交付记录、追踪行及修改 1.12 行，共三处；其他行原样保留 |
| 自动合并保护  | 已只读核对现有 workflow；采用 docs/ 分支 + Draft PR，未修改 workflow；[skip ci] 不冒充检查通过         |

外部资料使用 Mapbox 官方图层/署名说明和 W3C WCAG 2.2 对比度/目标尺寸说明，完整地址见设计书 §20。

## 未运行与未实施

没有运行应用 lint、typecheck、build、单元测试、E2E、浏览器截图、真实 Mapbox、实际响应式/辅助技术验收。24 项是后续验收要求，不是本轮 24 项网页测试通过。

没有修改 src、public、assets、依赖、lockfile、工作流、环境变量、数据库、API、认证、订单、真实定位或地图实例代码。没有生成图片素材、调用付费 Provider、打开新的实装任务、启动 1.13 或 1.20。

## 待验收事项

新增的 Pin 尺寸、局部深色文字、日期色候选、密度/缩放阈值、卡片宽度及路线宽度需用户审查。后续实现需在实际底图、遮挡、设备和文本放大环境复验；已存在的 1180px Drawer 等历史差异不在本轮重判。

用户验收并授权合并后，再更新 1.12 完成态和关闭本 Issue。当前停止于文档交付，给 Codex 的交接仅为可选只读获取，不授权开发。

## 2026-09-10 最新分支整合

用户授权检查保留 Draft 并合并可交付内容。已将 develop@88f9d338793dd21f81a3517be9c1ee55fc2d645b 整合到原分支；原审计 head 为 a21a66ea7d19cfe728121ad270658c128e729a52。WBS 的两个冲突逐段解决：保留 develop 全部新任务记录及本任务独有历史，1.13 采用当前 B / 待审查，未覆盖其他工作站。

设计修订为 v1.1：复用当前珊瑚/墨色/表面/focus 变量；每个旅行日维持稳定路线身份色；地图、时间轴、Detail、legend 同日一致；模式与状态不覆盖日色。撤回独立三色 palette 候选，明确旧灰线 runtime 与目标设计的差异。保留 outdoors-v12 和页面几何，新增分阶段迁移及前后截图证据要求。

本次发布的是文档候选，允许合入不等于实装或视觉验收完成。WBS 1.12 维持 B / 待审查，Issue #176 保持 Open。上方 Draft、旧色表、无 Codex 和未合并记录为原始交付历史；当前状态及 merge SHA 以 PR #177 为准。未运行或伪造浏览器/Mapbox live 验收。

本轮检查：三个交付 Markdown 的 Prettier check 通过；git diff --check origin/develop 通过；src/tests/tools/public/assets/package/lockfile/.github 与整合基线无差异。没有重新运行应用测试，因为本 PR 仅修改文档。

## 文档合并事实 — 2026-09-10

PR #177 已按用户授权合入 develop；head e3d24900da5d7644b877d4b382c788b00abea72e；merge f0569cdc57adc44d9c7e2524064be86217b7d628。远端 Install, test and build 通过（run 34477938147）。本次合入 v1.1 设计候选，未进行运行时迁移或新的浏览器视觉验收；WBS 1.12 仍为 B / 待审查，Issue #176 保持 Open。上文 Draft / 尚未合并只描述历史阶段。
