# TASK-084-B v2 纠错重建成果物与审核清单

日期：2026-09-29

状态：**REWORK_IN_PROGRESS / 未形成通过验收的全国 Master**

Issue：[#441](https://github.com/kanzakimy0/TravelAssist/issues/441)

分支：`fix/b-task-084-transport-master-rework`

## 交付文件

| 文件 | 内容 | 状态 |
| --- | --- | --- |
| `data/transport/nodes/task-084-b-v2-rail-candidates/rail-components.jsonl` | S12 全国轨道组件逐条候选，含客流、来源、拟定等级和身份键 | 待审核 |
| `data/transport/nodes/task-084-b-v2-rail-candidates/v1-rail-lineage.jsonl` | v1 轨道 ID 复用、替代和待核映射 | 待审核 |
| `data/transport/nodes/task-084-b-v2-rail-candidates/s12-high-flow-gate.jsonl` | 所有 S12 每日 5 万及以上源记录与候选的逐条对照 | 候选覆盖，尚未进入正式 Master |
| `data/transport/nodes/task-084-b-v2-airport-review/transport-nodes.jsonl` | 47 个既有机场的官方年度客流等级重算 | 待审核 |
| `data/transport/nodes/task-084-b-v2-airport-access-review/airport-access-audit.jsonl` | 47 个机场的轨道接入逐条审核状态 | 官方指南已核 47 个，其余待核 |
| `data/transport/nodes/task-084-b-v2-bus-review/national-bus-terminal-inventory.jsonl` | 全国主要城际巴士枢纽候选及官方来源 | 站点定位和多数客流待核 |
| `data/transport/nodes/task-084-b-v2-ferry-calibration/domestic-port-passengers-2024.jsonl` | 120 个港口年度国内旅客数及等级分布依据 | 港口汇总，不能给码头直接评级 |
| `data/transport/nodes/task-084-b-v2-poi-gateway-review/canonical-poi-rail-gateway-review.jsonl` | runtime 正式授权 100 条 Canonical POI 的 S12 近邻站审核线索 | 仅地理发现，未生成 085 边 |
| `docs/qa/TASK-084-B/FERRY-TIER-CALIBRATION-V2.md` | Ferry 阈值分析与限制 | 阈值草案 |
| `docs/qa/TASK-084-B/TOKYO-SHINAGAWA-COMPONENT-AUDIT-V2.md` | 东京 / 品川官方车站指南与组件对照 | 服务线路及身份待最终核定 |

## v1 确认缺陷

- 总数 244；等级：T0=8、T1=40、T2=196、T3=0。
- 既有 244 条是历史 v1，未通过全国 Master 质量验收，TASK-085-B / TASK-086-B 不得以此为输入。

| v1 nodeKind | T0 | T1 | T2 | T3 |
| --- | ---: | ---: | ---: | ---: |
| airport | 8 | 33 | 6 | 0 |
| bus_terminal | 0 | 4 | 1 | 0 |
| ferry_port | 0 | 0 | 7 | 0 |
| funicular_station | 0 | 3 | 3 | 0 |
| metro_station | 0 | 0 | 20 | 0 |
| private_rail_station | 0 | 0 | 9 | 0 |
| rail_station | 0 | 0 | 40 | 0 |
| shinkansen_station | 0 | 0 | 110 | 0 |

## v2 候选规模和边界

- S12 FY2024 轨道候选：2,198 个；拟定 T0=80、T1=439、T2=1579、T3=40、客流/等级待核=60。**这些不是已接收 Master 的等级总数。**
- 候选 S12 FY2024 正式客流可用率：2138/2198 = 97.3%；机场 FY2025 年客流：47/47；巴士候选有官方客流支撑的等级：1/16。不同 mode 不合并成一个虚假的总覆盖率。
- S12 每日 ≥200,000 的源记录 80 条：候选漏项 0；正式 Master 尚未生成，正式漏站 Gate 仍未通过。
- S12 每日 ≥50,000 的源记录 519 条：全部有候选映射；逐条状态均为 `CANDIDATE_PRESENT_NOT_YET_ACCEPTED`，尚无正式 accepted/exclusion 判定。
- v1 轨道身份映射 179 条：复用 123，显式替代 54，待核 2；其他 v1 mode 尚无最终 lineage 判定。
- 轨道候选按 200 条/批输出 11 个批次，实际数量 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 198。脚本校验所有批次与 receipt 的 SHA256。
- 机场 47 个，依据 MLIT FY2025 年旅客量拟定 T0=8、T1=20、T2=18、T3=1。
- 机场轨道接入：47 个机场完成官方/运营方指南核对，其中 12 个列出合计 20 个在机场或步行直达的轨道组件且候选均存在，23 个记录为机场外轨道站换乘巴士/出租车，12 个地面接入指南未列在机场轨道站；另 0 个机场接入方式待核。
- 城际巴士：16 个全国候选，其中 1 个历史已关闭；仅 1 个有官方客流支持的拟定等级。
- Ferry：官方 2024 年港口汇总覆盖 120 个一类港口；正式码头评级许可状态为 `false`。
- Canonical POI 旅游入口：严格核对 runtime 授权 manifest 后读取 100 条；70 条 POI 的最近 S12 站不在当前候选，其中 44 条最近站距离 POI 不超过 3 km，需人工判断是否为有效旅游入口；生成 POI→站点边 0 条。

| v2 轨道候选 nodeKind | 候选数 |
| --- | ---: |
| metro_station | 464 |
| other_tourism_transport | 116 |
| private_rail_station | 874 |
| rail_station | 636 |
| shinkansen_station | 108 |

| v2 轨道候选 modeFamily | 拟 T0 | 拟 T1 | 拟 T2 | 拟 T3 | 等级待核 |
| --- | ---: | ---: | ---: | ---: | ---: |
| conventional_rail | 40 | 160 | 433 | 3 | 0 |
| fixed_guideway | 0 | 5 | 110 | 1 | 0 |
| metro | 18 | 122 | 324 | 0 | 0 |
| private_rail | 22 | 147 | 704 | 1 | 0 |
| shinkansen | 0 | 5 | 8 | 35 | 60 |

## Canonical POI 近邻站待审线索（≤3 km）

距离只能用于发现，不能证明道路/公共交通可达或生成 TASK-085-B Access Edge。以下逐条来自正式授权 Pilot-100；距离更远的 POI 仍保留在 JSONL 中。

| Canonical POI | 都道府县 | 最近 S12 站 | 直线距离 km |
| --- | --- | --- | ---: |
| 嵐山モンキーパークいわたやま | 京都府 | 嵐山 | 0.70 |
| 立命館大学末川記念会館 | 京都府 | 等持院・立命館大学衣笠キャンパス前 | 0.73 |
| 角屋 | 京都府 | 梅小路京都西 | 0.34 |
| 阿蘇海 | 京都府 | 天橋立 | 1.79 |
| 鹿苑寺 | 京都府 | 北野白梅町 | 1.36 |
| 伊川 | 兵庫県 | 西新町 | 0.99 |
| 日本基督教団神戸教会 | 兵庫県 | 花隈 | 0.32 |
| 田倉山 | 兵庫県 | 上夜久野 | 1.32 |
| 香美町立ジオパークと海の文化館 | 兵庫県 | 香住 | 2.02 |
| みさき公園 | 大阪府 | みさき公園 | 0.45 |
| 新幹線公園 | 大阪府 | 摂津 | 0.73 |
| 百済寺 | 大阪府 | 宮之阪 | 0.44 |
| まほろば湖 | 奈良県 | 長谷寺 | 2.15 |
| 三輪山 | 奈良県 | 三輪 | 1.88 |
| 上之宮遺跡 | 奈良県 | 桜井 | 1.28 |
| 石舞台古墳 | 奈良県 | 大和上市 | 2.96 |
| 葛城市相撲館 | 奈良県 | 当麻寺 | 0.25 |
| ミュージアム都留 | 山梨県 | 谷村町 | 0.10 |
| 山梨県小瀬スポーツ公園陸上競技場 | 山梨県 | 甲斐住吉 | 2.39 |
| 金生遺跡 | 山梨県 | 長坂 | 2.84 |
| 韮崎中央公園陸上競技場 | 山梨県 | 新府 | 1.69 |
| 中橋 | 岐阜県 | 高山 | 0.71 |
| 仏眼院 | 岐阜県 | 三柿野 | 1.74 |
| 常在寺 | 岐阜県 | 田神 | 2.33 |
| 日本大正村 | 岐阜県 | 明智 | 0.30 |
| 海津市歴史民俗資料館 | 岐阜県 | 美濃山崎 | 2.62 |
| 美濃町 | 岐阜県 | 梅山 | 0.54 |
| 関鍛冶伝承館 | 岐阜県 | せきてらす前 | 0.26 |
| 飛水峡 | 岐阜県 | 上麻生 | 0.88 |
| 馬瀬川 | 岐阜県 | 飛騨金山 | 0.36 |
| のと里山里海ミュージアム | 石川県 | 七尾 | 2.13 |
| 四高記念文化交流館 | 石川県 | 野町 | 1.43 |
| 大蓮寺 | 石川県 | 野町 | 0.59 |
| 妙立寺 | 石川県 | 野町 | 0.47 |
| 御影大橋 | 石川県 | 野町 | 1.15 |
| 金沢スタジアム | 石川県 | 磯部 | 0.79 |
| 田名向原遺跡 | 神奈川県 | 原当麻 | 1.80 |
| 相模湖 | 神奈川県 | 相模湖 | 0.60 |
| 鶴見つばさ橋 | 神奈川県 | 海芝浦 | 1.55 |
| 万水川 | 長野県 | 明科 | 1.76 |
| 村山橋 | 長野県 | 柳原 | 0.98 |
| 海野宿 | 長野県 | 田中 | 1.47 |
| 聖博物館 | 長野県 | 姨捨 | 2.65 |
| 諏訪湖博物館 | 長野県 | 下諏訪 | 1.47 |

## 东京、品川、成田、山口宇部核查样本

| 站名 | 运营者 | mode | S12 FY2024 人/日 | 拟等级 | lineRefs |
| --- | --- | --- | ---: | --- | --- |
| 品川 | 京浜急行電鉄 | private_rail | 241688 | T0 | 本線 |
| 品川 | 東日本旅客鉄道 | conventional_rail | 575878 | T0 | 山手線, 東海道線 |
| 品川 | 東海旅客鉄道 | shinkansen | 75403 | T1 | 東海道新幹線 |
| 成田空港 | 京成電鉄 | private_rail | 35046 | T2 | 成田空港線, 本線 |
| 成田空港 | 東日本旅客鉄道 | conventional_rail | 14290 | T2 | 成田線 |
| 東京 | 東京地下鉄 | metro | 199232 | T1 | 4号線丸ノ内線 |
| 東京 | 東日本旅客鉄道 | conventional_rail | 869128 | T0 | 京葉線, 東北線, 東海道線, 総武線 |
| 東京 | 東日本旅客鉄道 | shinkansen | 未公布/缺失 | 待核 | 東北新幹線 |
| 東京 | 東海旅客鉄道 | shinkansen | 194244 | T1 | 東海道新幹線 |
| 草江 | 西日本旅客鉄道 | conventional_rail | 130 | T3 | 宇部線 |

## S12 客流最高 50 个候选组件

以下为 **S12 单一 operator×station×mode 源记录**，同站不同运营者会分别出现；不能把它们相加当作 Hub 客流。

| # | 站名 | 运营者 | mode | 人/日 | 拟等级 |
| ---: | --- | --- | --- | ---: | --- |
| 1 | 渋谷 | 東急電鉄 | private_rail | 1,770,430 | T0 |
| 2 | 新宿 | 東日本旅客鉄道 | conventional_rail | 1,333,618 | T0 |
| 3 | 池袋 | 東日本旅客鉄道 | conventional_rail | 998,256 | T0 |
| 4 | 東京 | 東日本旅客鉄道 | conventional_rail | 869,128 | T0 |
| 5 | 大阪 | 西日本旅客鉄道 | conventional_rail | 751,006 | T0 |
| 6 | 横浜 | 東日本旅客鉄道 | conventional_rail | 746,020 | T0 |
| 7 | 新宿 | 京王電鉄 | private_rail | 728,874 | T0 |
| 8 | 北千住 | 東武鉄道 | private_rail | 688,265 | T0 |
| 9 | 渋谷 | 東日本旅客鉄道 | conventional_rail | 648,828 | T0 |
| 10 | 品川 | 東日本旅客鉄道 | conventional_rail | 575,878 | T0 |
| 11 | 池袋 | 東京地下鉄 | metro | 518,135 | T0 |
| 12 | 横浜 | 東急電鉄 | private_rail | 514,860 | T0 |
| 13 | 大宮 | 東日本旅客鉄道 | conventional_rail | 508,440 | T0 |
| 14 | 新橋 | 東日本旅客鉄道 | conventional_rail | 463,256 | T0 |
| 15 | 大阪梅田 | 阪急電鉄 | private_rail | 451,568 | T0 |
| 16 | 新宿 | 小田急電鉄 | private_rail | 450,952 | T0 |
| 17 | 秋葉原 | 東日本旅客鉄道 | conventional_rail | 442,842 | T0 |
| 18 | 池袋 | 西武鉄道 | private_rail | 428,121 | T0 |
| 19 | 梅田 | 大阪市高速電気軌道 | metro | 420,718 | T0 |
| 20 | 池袋 | 東武鉄道 | private_rail | 419,499 | T0 |
| 21 | 名古屋 | 東海旅客鉄道 | conventional_rail | 416,867 | T0 |
| 22 | 中野 | 東日本旅客鉄道 | conventional_rail | 406,312 | T0 |
| 23 | 北千住 | 東日本旅客鉄道 | conventional_rail | 397,464 | T0 |
| 24 | 川崎 | 東日本旅客鉄道 | conventional_rail | 388,782 | T0 |
| 25 | 綾瀬 | 東京地下鉄 | metro | 384,554 | T0 |
| 26 | 西船橋 | 東京地下鉄 | metro | 383,395 | T0 |
| 27 | 中目黒 | 東急電鉄 | private_rail | 381,738 | T0 |
| 28 | 目黒 | 東急電鉄 | private_rail | 379,056 | T0 |
| 29 | 名古屋 | 名古屋市 | metro | 369,436 | T0 |
| 30 | 高田馬場 | 東日本旅客鉄道 | conventional_rail | 359,332 | T0 |
| 31 | 難波 | 大阪市高速電気軌道 | metro | 346,418 | T0 |
| 32 | 京都 | 西日本旅客鉄道 | conventional_rail | 344,080 | T0 |
| 33 | 和光市 | 東武鉄道 | private_rail | 343,898 | T0 |
| 34 | 上野 | 東日本旅客鉄道 | conventional_rail | 340,084 | T0 |
| 35 | 大手町 | 東京地下鉄 | metro | 334,541 | T0 |
| 36 | 小竹向原 | 東京地下鉄 | metro | 317,839 | T0 |
| 37 | 横浜 | 相模鉄道 | private_rail | 314,229 | T0 |
| 38 | 立川 | 東日本旅客鉄道 | conventional_rail | 308,182 | T0 |
| 39 | 横浜 | 京浜急行電鉄 | private_rail | 297,707 | T0 |
| 40 | 大崎 | 東日本旅客鉄道 | conventional_rail | 290,388 | T0 |
| 41 | 渋谷 | 京王電鉄 | private_rail | 286,940 | T0 |
| 42 | 名鉄名古屋 | 名古屋鉄道 | private_rail | 278,919 | T0 |
| 43 | 高田馬場 | 西武鉄道 | private_rail | 274,114 | T0 |
| 44 | 代々木上原 | 小田急電鉄 | private_rail | 269,075 | T0 |
| 45 | 浜松町 | 東日本旅客鉄道 | conventional_rail | 267,804 | T0 |
| 46 | 天王寺 | 西日本旅客鉄道 | conventional_rail | 267,658 | T0 |
| 47 | 西船橋 | 東日本旅客鉄道 | conventional_rail | 259,808 | T0 |
| 48 | 船橋 | 東日本旅客鉄道 | conventional_rail | 258,854 | T0 |
| 49 | 町田 | 小田急電鉄 | private_rail | 258,628 | T0 |
| 50 | 吉祥寺 | 東日本旅客鉄道 | conventional_rail | 256,492 | T0 |

## 尚未通过的验收门槛

1. 轨道 2,198 个候选仍需真实物理站与运营边界审核、N02 / 官方站内图核对、正式 accepted / exclusion 决策；不能把候选当成全国 Master。
2. 47 个机场的官方接入指南已经逐项核对，但现有 20 个接入组件仍未正式接收；地面接入指南未列铁路站的 12 个机场保留来源变化复核。
3. 巴士终端缺可复用坐标/设施边界证据，绝大多数缺官方客流和正式等级。
4. Ferry 港口汇总不能直接映射码头；需终端级官方数据、全国范围审核与阈值确认。
5. T0/T1 Hub 逐站官方指南 + N02 + S12 组件完整性、上述 44 条 Canonical POI 近邻站人工甄别、低客流 T3 选取、所有 v1 身份归宿尚未完成。
6. 尚无合并后的 v2 全国 Master、accepted 节点 200/批结果、完整 final QA、exact-head Quality Gate 或用户验收。WBS 7.14 保持返工中，不创建完成态 Draft PR。

## 来源和复现

- [MLIT S12 FY2024](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-S12-2024.html)；[S12 下载包](https://nlftp.mlit.go.jp/ksj/gml/data/S12/S12-25/S12-25_GML.zip)；SHA256 `0785e932a32b3ec15e1a1345537ae145eafe1c07bf38d5c16c11ee2b391e7a28`；许可 CC BY 4.0。
- [MLIT 机场年度统计](https://www.mlit.go.jp/koku/15_bf_000185.html)；[FY2025 表](https://www.mlit.go.jp/koku/content/002016480.xlsx)；SHA256 `0cd693d9b7dcc8b4c279608f6bb21468ededc8013a62754a3530b46bd34e988e`。
- [山口宇部机场官方铁路接入页](https://www.yamaguchiube-airport.jp/mapaccess/train/) 识别草江站为步行直达机场的低客流 T3 候选；机场与站点保持独立身份。
- [MLIT バスタ新宿统计](https://www.mlit.go.jp/road/road_fr4_000091.html)；[2026-06 原始 PDF](https://www.mlit.go.jp/road/content/002008873.pdf)。
- [MLIT 港湾统计](https://www.mlit.go.jp/k-toukei/R6kowan-datebase.html)；[2024 旅客表](https://www.mlit.go.jp/k-toukei/content/001974128.xlsx)；SHA256 `9b301a0ad79acb77aa0e4e018fc00319c78eb6bbfa4c25adfb4e8f52fc9a9bef`。
- 原始下载文件不入库；各 builder 要求源文件 SHA256 匹配，rail builder 同时支持 deterministic rebuild、batch rerun 和损坏检测。
- `python tools/transport/task-084-v2-rail-selftest.py --archive <verified-S12-zip>` 已验证重复运行、指定第 11 批重跑与损坏批次 fail-closed；这是候选批次测试，不能替代最终 accepted Master Quality Gate。
