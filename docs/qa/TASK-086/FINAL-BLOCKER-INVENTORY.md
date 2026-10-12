# TASK-086-B Blocking inventory

Input SHA a92b9e90bece0c016ab50e74fd501cf65023ca253b750f27b582102b946ea6d7. Candidate nodes 4061; candidate edges 9409. Original evidence is preserved.

{
  "blocking_source_count": 684,
  "blocking_rights_root_count": 245,
  "blocking_component_count": 12,
  "blocking_node_count": 2887,
  "blocking_edge_count": 6949,
  "blocking_transfer_count": 1035,
  "affected_prefecture_count": 1,
  "affected_prefectures": [
    "長崎県 (five exact residual GTFS stop obligations)"
  ],
  "prefectureCountStatus": "1_EXPLICITLY_VERIFIED_NAGASAKI; other affected prefectures unenumerated without authoritative assignments",
  "affectedPrefectureEnumerationComplete": false,
  "affected_regions": [
    "北海道",
    "东北",
    "关东",
    "中部",
    "北陆",
    "近畿",
    "中国",
    "四国",
    "九州",
    "冲绳"
  ],
  "affected_national_corridors": [
    "東京 ↔ 京都",
    "東京 ↔ 大阪",
    "東京 ↔ 河口湖",
    "大阪 ↔ 京都",
    "大阪 ↔ 三ノ宮",
    "大阪 ↔ 奈良",
    "博多 ↔ 熊本",
    "札幌 ↔ 旭川",
    "札幌 ↔ 函館",
    "Hokkaido ↔ Honshu",
    "Tohoku ↔ Kanto",
    "Kanto ↔ Chubu / Tokyo ↔ Nagoya",
    "Tokyo ↔ Kansai",
    "Kansai ↔ Chugoku",
    "Honshu ↔ Shikoku",
    "Chugoku ↔ Kyushu"
  ],
  "uniqueBlockerCount": 253
}

Complete stable IDs, source evidence, affected endpoints and remediation are in the matching machine-readable JSON. Public accessibility and topology-fact retention decisions are not automatically treated as explicit runtime/redistribution grants. Non-certified dependencies are excluded. Quarantine preserves requirements, does not close them.

## Actual final execution gates

Certification roots:251. Additional publication/validation roots:2. Total:253. Their entity-ID arrays are empty because these are acceptance process gates, not invented new transport coverage gaps.

- `engineering:closeout-push-large-artifact`: Frozen core-stage-acceptance.json is156850452bytes; push rejected by100MB limit. New direct-head workflow did not start.
- `engineering:current-input-regression-or-clean-proof`: {'fullRegression': 'TIMEOUT', 'cleanProofValid': False, 'failures': ['✖ nightly --dry-run does not write canonical catalogs (30031.6185ms)'], 'changedFrozenInputs': []}

[Actual frozen-input validation](final-validation.json). No new research or automatic retry.
