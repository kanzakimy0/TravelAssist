# TASK-012 Recommendation regression

基线：已合并 PR #102 的 `4c1d9bb`；使用同一 Chromium、视口、默认方案和字体。
`PlanRecommendationList` 源文件与基线逐字节一致。推荐区域 CSS、三卡顺序、内容、图片、标签、选择语义、卡片几何尺寸未修改。

| Viewport | Region W×H                | Before                                    | After                                   |
| -------- | ------------------------- | ----------------------------------------- | --------------------------------------- |
| 1600×900 | 399×416                   | [Before](recommendations-before-1600.png) | [After](recommendations-after-1600.png) |
| 1440×900 | 359×416                   | [Before](recommendations-before-1440.png) | [After](recommendations-after-1440.png) |
| 1280×800 | 319×366                   | [Before](recommendations-before-1280.png) | [After](recommendations-after-1280.png) |
| 1180×800 | 418×369 (existing Drawer) | [Before](recommendations-before-1180.png) | [After](recommendations-after-1180.png) |
| 1024×768 | 418×353 (Drawer)          | [Before](recommendations-before-1024.png) | [After](recommendations-after-1024.png) |
| 390×844  | 388×391 (Drawer)          | [Before](recommendations-before-390.png)  | [After](recommendations-after-390.png)  |

六组自动断言确认区域及每张卡 W/H、文字相同。三张方案仍调用原 `onSelect`，预约计数和底部按钮也保持原组件。

截图并非像素完全相同：旧右栏上半的“进入行程详情”按钮及其阴影曾溢出到推荐区顶部（1280 / 1180 / 1024 尤其明显），本 Task 控制上半内容高度后移除了这层遮挡。1440 的差异主要是原上方按钮投射的阴影。没有重画或更改推荐卡。

1180px 规范冲突待确认：当前基线在 1200px 以下使用 Drawer。将 1180 改为侧栏会改变冻结推荐卡尺寸。本实现暂时优先硬性冻结，保留既有 Drawer；不把该项伪报为侧栏验收通过。

## Evidence

- [Six-size actual Mapbox](qa-mapbox.json)
- [Six-size forced fallback](qa-fallback.json)
- [Keyboard / selection / booking / ranges](interaction-qa.json)
- [TASK-011 Detail regression](detail-regression/report.json)

截图是实际浏览器输出，未重绘或美化。Mapbox 的真实网络访问在允许联网环境验证；公开 Token 仅存在于本机未跟踪构建产物。
