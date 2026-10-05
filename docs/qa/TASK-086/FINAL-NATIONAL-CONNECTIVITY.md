# Certified-only national connectivity

Result: **BLOCKED_CERTIFIED_NATIONAL_BACKBONE**. Input SHA `a92b9e90bece0c016ab50e74fd501cf65023ca253b750f27b582102b946ea6d7`.

Passenger-state queries preserve trip continuity, direction, pickup/dropoff restrictions and default conditional-access exclusions. Exact node IDs and retained witnesses are in [final-acceptance.json](final-acceptance.json). Candidate reachability is not substituted for certified reachability.

| Region gateway witness | Result |
|---|---|
| 北海道 | BLOCKED |
| 东北 | BLOCKED |
| 关东 | BLOCKED |
| 中部 | BLOCKED |
| 北陆 | BLOCKED |
| 近畿 | BLOCKED |
| 中国 | BLOCKED |
| 四国 | BLOCKED |
| 九州 | BLOCKED |
| 冲绳 | BLOCKED |

| Applicable national corridor | Result |
|---|---|
| 東京 ↔ 京都 | BLOCKED |
| 東京 ↔ 大阪 | BLOCKED |
| 東京 ↔ 河口湖 | BLOCKED |
| 大阪 ↔ 京都 | BLOCKED |
| 大阪 ↔ 三ノ宮 | BLOCKED |
| 大阪 ↔ 奈良 | BLOCKED |
| 博多 ↔ 熊本 | BLOCKED |
| 札幌 ↔ 旭川 | BLOCKED |
| 札幌 ↔ 函館 | BLOCKED |
| Hokkaido ↔ Honshu | BLOCKED |
| Tohoku ↔ Kanto | BLOCKED |
| Kanto ↔ Chubu / Tokyo ↔ Nagoya | BLOCKED |
| Tokyo ↔ Kansai | BLOCKED |
| Kansai ↔ Chugoku | BLOCKED |
| Honshu ↔ Shikoku | BLOCKED |
| Chugoku ↔ Kyushu | BLOCKED |

Airport/ferry gateway results: {'BLOCKED': 86}. All current required gateways remain obligations; none are declared optional to pass.

Aircraft booking/search and realtime routing are OUT_OF_SCOPE under Route Contract1.0. Static flight topology does not guarantee current service. No applicable national corridor has been silently labelled OUT_OF_SCOPE.

Explicitly attributable affected prefecture: 長崎県 for the five residual native-platform requirements. Other affected prefectures are not enumerated by the retained schema; the verified count1 is a lower bound, not a national total. No unapproved N03 join or invented coordinate-to-prefecture mapping is performed. The10 region-gateway outcomes are separately computed and blocked.
