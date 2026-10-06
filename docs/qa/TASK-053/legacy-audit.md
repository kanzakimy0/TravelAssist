# TASK-053-B Legacy Default / Preset Audit

执行基线：`4da2b8883069cd415eee6e18129c874383286653`。以下旧 model 保留兼容测试与历史展示语义，不作为长期 Preference 的写入来源。没有批量迁移旧 mock 默认值。

| 来源 / 值                                                                        | 分类                                              | 本次处理                                                                                                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| mobility `relaxed / balanced / efficient` 与 label/description                   | presentation-only                                 | 旧选项仅改标签，并无冻结 patch；不映射成新模板，不默认选中 balanced。                                                    |
| mobility `fewerTransfers`、`noPublicTransit`、`noBus`、`noFerry` 显式 boolean    | lossless canonical mapping                        | 对应同名 canonical boolean 的语义可保留；旧构造器 true/false 仍是 mock，不能自动导入。新模板严格使用 Task 的 set/unset。 |
| mobility `lessWalking` boolean                                                   | ambiguous/lossy                                   | 不能推导 canonical 五档 walkingTolerance；不转换。新 mobility_easy 的 low 直接来自正式 Task。                            |
| dining `localCuisine=priority`, `smallShops=like`                                | lossless canonical mapping in the frozen template | 正式 dining_local 明确冻结为两个 prioritize；不是任意旧数据迁移。                                                        |
| dining `neutral`, queueTolerance `low / medium / high`                           | lossless canonical mapping                        | 明确选择可表达同名 canonical 值；只有冻结模板会进入 draft。                                                              |
| dining `notSpecial`                                                              | ambiguous/lossy                                   | 不能确定 unset、neutral 或 deprioritize；不映射。                                                                        |
| accommodation `value`                                                            | lossless canonical mapping in the frozen template | accommodation_comfort 的三个 prioritize 直接取自 Task。                                                                  |
| accommodation `neutral`                                                          | lossless canonical mapping                        | accommodation_neutral 明确保存三项 neutral；不等于 missing。                                                             |
| accommodation `notSpecial`                                                       | ambiguous/lossy                                   | 不自动映射。                                                                                                             |
| budget `economical / moderate / flexible`                                        | lossless canonical mapping                        | 三个正式模板只设置 spendingTendency；两个预算优先字段均 unset。                                                          |
| budget `prioritizeAccommodation / prioritizeExperience` boolean                  | lossless canonical mapping                        | 显式用户 boolean 可表达，但旧默认 true/true 不导入正式模板。                                                             |
| attraction 六轴 nature/history/culture/art/photography/activityExperience        | ambiguous/lossy                                   | 六轴不能无损替代 canonical 16 个 InterestCode；不建立 Preset。                                                           |
| attraction `veryLike / like / neutral / dislike / unset` 及 `photoExperience`    | ambiguous/lossy                                   | 旧强度与单一拍照 flag 不能无损映射 canonical signal/detail；不转换旧默认。                                               |
| preference-model 中六轴 radar、weights、category summary 和旅行风格展示 defaults | presentation-only                                 | 既有 overview 从 canonical read 构建展示；权重不是持久化值或 A 43 维 scoring。                                           |
| route generateMetadata 的 createDefaultPreferenceState                           | presentation-only                                 | 只获取分类 title；没有写 API，不初始化资源。                                                                             |
| style.pace/depth/discovery/movement/coverage/priority/planning                   | ambiguous/lossy for preset generation             | canonical 手动编辑保持不变；没有从旧 radar/高层“平衡”生成 1–5 值。                                                       |

当前所有分类页面仍由 `CanonicalPreferenceEditor` 管理。`usePreferenceResource` 初始使用 `emptyPreference()`，首次 GET 仅读取，保存走 `preferenceDraftPatch` 与原有 5.16 PATCH/CAS。Overview 的 `createResetPreferenceState` 只清空展示轴，global reset 仍调用原 API 返回 empty/unset。

唯一新增 registry：`src/features/preferences/presets/preference-presets.ts`。只依赖现有 `shared/contracts/preferences/core`，不复制 23-key parser/registry，不导入上述旧 mock model。所有模板 set/unset 在模块构造时用 canonical parser 验证，类别范围检查与深度冻结；pure tests 逐个核对正式 Task 的精确 patch。
