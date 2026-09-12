import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { format as formatWithPrettier } from "prettier";

import { parseTravelRegionGraphV1 } from "../../src/shared/contracts/planning/index.ts";

const CONTRACT_VERSION = "1.0";
const GRAPH_REVISION = "task-041-japan-pilot-2026-09-11-r2";
const NOW = "2026-09-11T00:00:00+09:00";
const MASTER_CODE_AUDIT_DEVELOP_SHA =
  "f10aded716719eabc94b81d9a3104b386c640946";
const OUTPUT_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../docs/qa/TASK-041",
);

const REPO_DESTINATION_SOURCE = "source-repository-japan-destinations";
const CODEBOOK_SOURCE = "source-region-graph-codebook-v0-1";
const EDITORIAL_SOURCE = "source-task-041-editorial-prior";

const priorMasterCodeAssignments = [];

function classifyPriorMasterCode(value) {
  if (/^JP-(?:RG|PREF|MACRO)-/.test(value)) return "task_041_side_channel_code";
  if (/^jp-/.test(value)) return "destination_id_misused_as_master_code";
  if (value === "JP") return "country_code_misused_as_master_code";
  return "unresolved_noncanonical_value";
}

export const evidenceIndex = {
  schemaVersion: 1,
  generatedAt: NOW,
  policy: {
    sourcePriority: [
      "repository pinned Japan destination evidence",
      "JNTO official destination material",
      "TASK-041 explicitly labeled editorial planning prior",
    ],
    liveProviderQueries: false,
    exactTimetableFacts: false,
    note: "Editorial priors express graph-search usefulness only; they are not live route facts.",
  },
  sources: [
    {
      sourceRef: REPO_DESTINATION_SOURCE,
      kind: "repository_evidence_catalog",
      url: null,
      repositoryPaths: [
        "docs/assets/catalog/core-destination-generation-manifest.v1.csv",
        "docs/assets/catalog/japan-destination-entity-evidence.v1.jsonl",
      ],
      supports:
        "Pinned identity, multilingual name, representative center and JNTO directory linkage for resolved pilot destinations.",
    },
    {
      sourceRef: CODEBOOK_SOURCE,
      kind: "repository_contract_codebook",
      url: null,
      repositoryPaths: [
        "docs/architecture/travel-region-graph-codebook-v0.1.md",
      ],
      supports:
        "Region type, relation, directional edge and planning-prior semantics.",
    },
    {
      sourceRef: EDITORIAL_SOURCE,
      kind: "human_curated_pilot_prior",
      url: null,
      repositoryPaths: ["docs/tasks/TASK-041-a-region-graph-pilot.md"],
      supports:
        "Sparse corridor selection and nullable, reviewable compatibility priors; never live route truth.",
    },
    {
      sourceRef: "source-jnto-tokyo",
      kind: "official_tourism",
      url: "https://www.japan.travel/en/destinations/kanto/tokyo/",
      repositoryPaths: [],
      supports:
        "Tokyo tourism-region identity, districts and air/rail gateway context.",
    },
    {
      sourceRef: "source-jnto-shinjuku",
      kind: "official_tourism",
      url: "https://www.japan.travel/en/destinations/kanto/tokyo/shinjuku/",
      repositoryPaths: [],
      supports: "Shinjuku district and gateway role.",
    },
    {
      sourceRef: "source-jnto-shibuya",
      kind: "official_tourism",
      url: "https://www.japan.travel/en/spot/2109/",
      repositoryPaths: [],
      supports: "Shibuya tourism district identity.",
    },
    {
      sourceRef: "source-jnto-asakusa",
      kind: "official_tourism",
      url: "https://www.japan.travel/en/spot/ma_36/",
      repositoryPaths: [],
      supports: "Asakusa tourism district identity.",
    },
    {
      sourceRef: "source-jnto-hakone",
      kind: "official_tourism",
      url: "https://www.japan.travel/en/destinations/kanto/kanagawa/hakone-and-around/",
      repositoryPaths: [],
      supports:
        "Hakone onsen-resort identity, Odawara/Hakone-Yumoto gateway pattern and broad rail access prior.",
    },
    {
      sourceRef: "source-jnto-fuji-five-lakes",
      kind: "official_tourism",
      url: "https://www.japan.travel/en/destinations/tokai/yamanashi/fuji-five-lakes/",
      repositoryPaths: [],
      supports:
        "Fuji Five Lakes tourism-region identity and Kawaguchiko anchor.",
    },
    {
      sourceRef: "source-jnto-nagano",
      kind: "official_tourism",
      url: "https://www.japan.travel/en/destinations/hokuriku-shinetsu/nagano/",
      repositoryPaths: [],
      supports: "Nagano/Matsumoto corridor and gateway context.",
    },
    {
      sourceRef: "source-jnto-matsumoto",
      kind: "official_tourism",
      url: "https://www.japan.travel/en/spot/ma_99/",
      repositoryPaths: [],
      supports:
        "Matsumoto as Alps gateway and broad Tokyo/Nagano/Takayama transport modes.",
    },
    {
      sourceRef: "source-jnto-shirakawa-go",
      kind: "official_tourism",
      url: "https://www.japan.travel/en/spot/2031/",
      repositoryPaths: [],
      supports:
        "Shirakawa-go tourism identity and broad bus access from Takayama.",
    },
    {
      sourceRef: "source-jnto-kansai",
      kind: "official_tourism",
      url: "https://www.japan.travel/en/destinations/kansai/",
      repositoryPaths: [],
      supports:
        "Kansai macro-area and Kyoto/Nara/Osaka/Kobe corridor grouping.",
    },
    {
      sourceRef: "source-jnto-kyoto",
      kind: "official_tourism",
      url: "https://www.japan.travel/en/destinations/kansai/kyoto/",
      repositoryPaths: [],
      supports:
        "Kyoto travel region, districts and station-area gateway context.",
    },
    {
      sourceRef: "source-jnto-nara",
      kind: "official_tourism",
      url: "https://www.japan.travel/en/destinations/kansai/nara/",
      repositoryPaths: [],
      supports: "Nara identity and planning connectivity with Kyoto/Osaka.",
    },
    {
      sourceRef: "source-jnto-osaka",
      kind: "official_tourism",
      url: "https://www.japan.travel/en/destinations/kansai/osaka/",
      repositoryPaths: [],
      supports:
        "Osaka identity, Namba/Umeda anchors and Kansai base connectivity.",
    },
    {
      sourceRef: "source-jnto-kobe",
      kind: "official_tourism",
      url: "https://www.japan.travel/en/destinations/kansai/hyogo/kobe-and-around",
      repositoryPaths: [],
      supports: "Kobe travel-region identity and waterfront context.",
    },
  ],
};

const evidenceRefs = new Set(
  evidenceIndex.sources.map(({ sourceRef }) => sourceRef),
);

function node({
  id,
  code,
  type,
  ja,
  zh,
  en,
  aliases = [],
  center = null,
  geometryKind = center ? "point" : "unknown",
  sources = [REPO_DESTINATION_SOURCE],
  gateway = null,
}) {
  priorMasterCodeAssignments.push({
    regionId: id,
    priorValue: code,
    classification: classifyPriorMasterCode(code),
    canonicalRegistryResolution: null,
    action: "cleared_to_null_pending_canonical_allocation",
  });
  return {
    contractVersion: CONTRACT_VERSION,
    schemaVersion: "1.0",
    regionId: id,
    masterCode: null,
    regionType: type,
    names: { nameJa: ja, nameZhCn: zh, nameEn: en, aliases },
    center,
    geometryRef: null,
    geometryKind,
    gatewayProfile: gateway,
    sourceRefs: sources,
    revision: 1,
  };
}

function gatewayProfile(kind, servedRegionRefs, transportNodeRefs, sources) {
  return {
    gatewayKind: kind,
    transportNodeRefs,
    servedRegionRefs,
    luggageEasePrior: null,
    transferEasePrior: null,
    centralityPrior: null,
    sourceRefs: sources,
    confidence: null,
  };
}

export const regionNodes = [
  node({
    id: "region-japan",
    code: "JP",
    type: "country",
    ja: "日本",
    zh: "日本",
    en: "Japan",
    sources: [CODEBOOK_SOURCE],
  }),
  node({
    id: "region-kanto",
    code: "JP-MACRO-KANTO",
    type: "macro_area",
    ja: "関東",
    zh: "关东",
    en: "Kanto",
    sources: ["source-jnto-tokyo"],
  }),
  node({
    id: "region-chubu",
    code: "JP-MACRO-CHUBU",
    type: "macro_area",
    ja: "中部",
    zh: "中部",
    en: "Chubu",
    sources: ["source-jnto-nagano", "source-jnto-fuji-five-lakes"],
  }),
  node({
    id: "region-kansai",
    code: "JP-MACRO-KANSAI",
    type: "macro_area",
    ja: "関西",
    zh: "关西",
    en: "Kansai",
    sources: ["source-jnto-kansai"],
  }),
  ...[
    ["tokyo", "東京都", "东京都", "Tokyo", "source-jnto-tokyo"],
    ["kanagawa", "神奈川県", "神奈川县", "Kanagawa", "source-jnto-hakone"],
    [
      "yamanashi",
      "山梨県",
      "山梨县",
      "Yamanashi",
      "source-jnto-fuji-five-lakes",
    ],
    ["nagano", "長野県", "长野县", "Nagano", "source-jnto-nagano"],
    ["gifu", "岐阜県", "岐阜县", "Gifu", "source-jnto-shirakawa-go"],
    ["ishikawa", "石川県", "石川县", "Ishikawa", REPO_DESTINATION_SOURCE],
    ["kyoto", "京都府", "京都府", "Kyoto", "source-jnto-kyoto"],
    ["nara", "奈良県", "奈良县", "Nara", "source-jnto-nara"],
    ["osaka", "大阪府", "大阪府", "Osaka", "source-jnto-osaka"],
    ["hyogo", "兵庫県", "兵库县", "Hyogo", "source-jnto-kobe"],
  ].map(([id, ja, zh, en, source]) =>
    node({
      id: `prefecture-${id}`,
      code: `JP-PREF-${id.toUpperCase()}`,
      type: "prefecture",
      ja,
      zh,
      en,
      sources: [source],
    }),
  ),
  node({
    id: "region-tokyo",
    code: "jp-tokyo",
    type: "travel_region",
    ja: "東京",
    zh: "东京",
    en: "Tokyo urban travel region",
    aliases: ["Tokyo urban area"],
    center: { longitude: 139.6917, latitude: 35.6894 },
    geometryKind: "tourism",
    sources: [REPO_DESTINATION_SOURCE, "source-jnto-tokyo"],
  }),
  node({
    id: "district-shinjuku",
    code: "JP-RG-SHINJUKU",
    type: "district",
    ja: "新宿",
    zh: "新宿",
    en: "Shinjuku",
    sources: ["source-jnto-shinjuku"],
    geometryKind: "tourism",
  }),
  node({
    id: "district-shibuya-harajuku",
    code: "JP-RG-SHIBUYA-HARAJUKU",
    type: "district",
    ja: "渋谷・原宿",
    zh: "涩谷·原宿",
    en: "Shibuya / Harajuku",
    sources: ["source-jnto-shibuya"],
    geometryKind: "tourism",
  }),
  node({
    id: "district-asakusa-ueno",
    code: "JP-RG-ASAKUSA-UENO",
    type: "district",
    ja: "浅草・上野",
    zh: "浅草·上野",
    en: "Asakusa / Ueno",
    sources: ["source-jnto-asakusa", "source-jnto-tokyo"],
    geometryKind: "tourism",
  }),
  node({
    id: "district-central-tokyo",
    code: "JP-RG-CENTRAL-TOKYO",
    type: "district",
    ja: "東京駅・銀座周辺",
    zh: "东京站·银座一带",
    en: "Tokyo Station / Ginza area",
    sources: ["source-jnto-tokyo"],
    geometryKind: "tourism",
  }),
  node({
    id: "stay-tokyo-station",
    code: "JP-RG-STAY-TOKYO-STATION",
    type: "stay_cluster",
    ja: "東京駅周辺宿泊圏",
    zh: "东京站住宿区",
    en: "Tokyo Station stay cluster",
    sources: ["source-jnto-tokyo", EDITORIAL_SOURCE],
    geometryKind: "cluster",
  }),
  node({
    id: "stay-shinjuku",
    code: "JP-RG-STAY-SHINJUKU",
    type: "stay_cluster",
    ja: "新宿宿泊圏",
    zh: "新宿住宿区",
    en: "Shinjuku stay cluster",
    sources: ["source-jnto-shinjuku", EDITORIAL_SOURCE],
    geometryKind: "cluster",
  }),
  node({
    id: "gateway-tokyo-rail",
    code: "JP-RG-GATE-TOKYO-RAIL",
    type: "gateway",
    ja: "東京鉄道ゲートウェイ",
    zh: "东京铁路门户",
    en: "Tokyo rail gateway",
    sources: ["source-jnto-tokyo", EDITORIAL_SOURCE],
    gateway: gatewayProfile(
      "rail",
      ["region-tokyo"],
      ["transport-node:tokyo-station"],
      ["source-jnto-tokyo"],
    ),
  }),
  node({
    id: "gateway-haneda",
    code: "JP-RG-GATE-HANEDA",
    type: "gateway",
    ja: "羽田ゲートウェイ",
    zh: "羽田门户",
    en: "Haneda gateway",
    sources: ["source-jnto-tokyo", EDITORIAL_SOURCE],
    gateway: gatewayProfile(
      "airport",
      ["region-tokyo"],
      ["transport-node:haneda-airport"],
      ["source-jnto-tokyo"],
    ),
  }),
  node({
    id: "region-odawara",
    code: "jp-odawara",
    type: "municipality",
    ja: "小田原市",
    zh: "小田原市",
    en: "Odawara",
    center: { longitude: 139.1522, latitude: 35.2646 },
    sources: [REPO_DESTINATION_SOURCE, "source-jnto-hakone"],
  }),
  node({
    id: "region-hakone",
    code: "jp-hakone",
    type: "onsen_resort",
    ja: "箱根",
    zh: "箱根",
    en: "Hakone",
    center: { longitude: 139.1069, latitude: 35.2324 },
    geometryKind: "tourism",
    sources: [REPO_DESTINATION_SOURCE, "source-jnto-hakone"],
  }),
  node({
    id: "gateway-hakone-yumoto",
    code: "JP-RG-GATE-HAKONE-YUMOTO",
    type: "gateway",
    ja: "箱根湯本ゲートウェイ",
    zh: "箱根汤本门户",
    en: "Hakone-Yumoto gateway",
    sources: ["source-jnto-hakone", EDITORIAL_SOURCE],
    gateway: gatewayProfile(
      "rail",
      ["region-hakone"],
      ["transport-node:hakone-yumoto-station"],
      ["source-jnto-hakone"],
    ),
  }),
  node({
    id: "region-fuji-five-lakes",
    code: "JP-RG-FUJI-FIVE-LAKES",
    type: "travel_region",
    ja: "富士五湖",
    zh: "富士五湖",
    en: "Fuji Five Lakes",
    geometryKind: "tourism",
    sources: ["source-jnto-fuji-five-lakes"],
  }),
  node({
    id: "region-fujikawaguchiko",
    code: "jp-kawaguchiko",
    type: "municipality",
    ja: "富士河口湖町",
    zh: "富士河口湖町",
    en: "Fujikawaguchiko",
    center: { longitude: 138.755, latitude: 35.497 },
    sources: [REPO_DESTINATION_SOURCE, "source-jnto-fuji-five-lakes"],
  }),
  node({
    id: "gateway-kawaguchiko",
    code: "JP-RG-GATE-KAWAGUCHIKO",
    type: "gateway",
    ja: "河口湖ゲートウェイ",
    zh: "河口湖门户",
    en: "Kawaguchiko gateway",
    sources: ["source-jnto-fuji-five-lakes", EDITORIAL_SOURCE],
    gateway: gatewayProfile(
      "mixed",
      ["region-fuji-five-lakes", "region-fujikawaguchiko"],
      ["transport-node:kawaguchiko-station"],
      ["source-jnto-fuji-five-lakes"],
    ),
  }),
  node({
    id: "region-nagano",
    code: "jp-nagano",
    type: "travel_region",
    ja: "長野市",
    zh: "长野市",
    en: "Nagano",
    center: { longitude: 138.1947, latitude: 36.6487 },
    geometryKind: "tourism",
    sources: [REPO_DESTINATION_SOURCE, "source-jnto-nagano"],
  }),
  node({
    id: "region-matsumoto",
    code: "jp-matsumoto",
    type: "travel_region",
    ja: "松本市",
    zh: "松本市",
    en: "Matsumoto",
    center: { longitude: 137.972, latitude: 36.238 },
    geometryKind: "tourism",
    sources: [REPO_DESTINATION_SOURCE, "source-jnto-matsumoto"],
  }),
  node({
    id: "region-kamikochi",
    code: "jp-kamikochi",
    type: "travel_region",
    ja: "上高地",
    zh: "上高地",
    en: "Kamikochi",
    geometryKind: "tourism",
    sources: [REPO_DESTINATION_SOURCE, "source-jnto-nagano"],
  }),
  node({
    id: "region-takayama",
    code: "jp-takayama",
    type: "travel_region",
    ja: "高山市",
    zh: "高山市",
    en: "Takayama",
    center: { longitude: 137.2522, latitude: 36.146 },
    geometryKind: "tourism",
    sources: [REPO_DESTINATION_SOURCE, "source-jnto-matsumoto"],
  }),
  node({
    id: "region-shirakawa-go",
    code: "jp-shirakawa-go",
    type: "travel_region",
    ja: "白川郷",
    zh: "白川乡",
    en: "Shirakawa-go",
    center: { longitude: 136.905, latitude: 36.2567 },
    geometryKind: "tourism",
    sources: [REPO_DESTINATION_SOURCE, "source-jnto-shirakawa-go"],
  }),
  node({
    id: "region-kanazawa",
    code: "jp-kanazawa",
    type: "travel_region",
    ja: "金沢市",
    zh: "金泽市",
    en: "Kanazawa",
    center: { longitude: 136.6565, latitude: 36.5611 },
    geometryKind: "tourism",
    sources: [REPO_DESTINATION_SOURCE],
  }),
  node({
    id: "gateway-matsumoto",
    code: "JP-RG-GATE-MATSUMOTO",
    type: "gateway",
    ja: "松本ゲートウェイ",
    zh: "松本门户",
    en: "Matsumoto gateway",
    sources: ["source-jnto-matsumoto", EDITORIAL_SOURCE],
    gateway: gatewayProfile(
      "mixed",
      ["region-matsumoto", "region-kamikochi"],
      [
        "transport-node:matsumoto-station",
        "transport-node:matsumoto-bus-terminal",
      ],
      ["source-jnto-matsumoto"],
    ),
  }),
  node({
    id: "gateway-takayama",
    code: "JP-RG-GATE-TAKAYAMA",
    type: "gateway",
    ja: "高山ゲートウェイ",
    zh: "高山门户",
    en: "Takayama gateway",
    sources: [
      "source-jnto-matsumoto",
      "source-jnto-shirakawa-go",
      EDITORIAL_SOURCE,
    ],
    gateway: gatewayProfile(
      "bus",
      ["region-takayama", "region-shirakawa-go"],
      ["transport-node:takayama-bus-center"],
      ["source-jnto-shirakawa-go"],
    ),
  }),
  node({
    id: "gateway-kanazawa",
    code: "JP-RG-GATE-KANAZAWA",
    type: "gateway",
    ja: "金沢ゲートウェイ",
    zh: "金泽门户",
    en: "Kanazawa gateway",
    sources: [REPO_DESTINATION_SOURCE, EDITORIAL_SOURCE],
    gateway: gatewayProfile(
      "mixed",
      ["region-kanazawa", "region-shirakawa-go"],
      ["transport-node:kanazawa-station"],
      [REPO_DESTINATION_SOURCE],
    ),
  }),
  node({
    id: "region-kyoto",
    code: "jp-kyoto",
    type: "travel_region",
    ja: "京都市",
    zh: "京都市",
    en: "Kyoto",
    center: { longitude: 135.7681, latitude: 35.0116 },
    geometryKind: "tourism",
    sources: [REPO_DESTINATION_SOURCE, "source-jnto-kyoto"],
  }),
  node({
    id: "district-higashiyama",
    code: "JP-RG-HIGASHIYAMA",
    type: "district",
    ja: "東山",
    zh: "东山",
    en: "Higashiyama",
    geometryKind: "tourism",
    sources: ["source-jnto-kyoto"],
  }),
  node({
    id: "district-arashiyama",
    code: "JP-RG-ARASHIYAMA",
    type: "district",
    ja: "嵐山",
    zh: "岚山",
    en: "Arashiyama",
    geometryKind: "tourism",
    sources: ["source-jnto-kyoto"],
  }),
  node({
    id: "stay-kyoto-station",
    code: "JP-RG-STAY-KYOTO-STATION",
    type: "stay_cluster",
    ja: "京都駅周辺宿泊圏",
    zh: "京都站住宿区",
    en: "Kyoto Station stay cluster",
    geometryKind: "cluster",
    sources: ["source-jnto-kyoto", EDITORIAL_SOURCE],
  }),
  node({
    id: "gateway-kyoto-rail",
    code: "JP-RG-GATE-KYOTO-RAIL",
    type: "gateway",
    ja: "京都鉄道ゲートウェイ",
    zh: "京都铁路门户",
    en: "Kyoto rail gateway",
    sources: ["source-jnto-kyoto", EDITORIAL_SOURCE],
    gateway: gatewayProfile(
      "rail",
      ["region-kyoto"],
      ["transport-node:kyoto-station"],
      ["source-jnto-kyoto"],
    ),
  }),
  node({
    id: "region-nara",
    code: "jp-nara",
    type: "travel_region",
    ja: "奈良市",
    zh: "奈良市",
    en: "Nara",
    center: { longitude: 135.8048, latitude: 34.685 },
    geometryKind: "tourism",
    sources: [REPO_DESTINATION_SOURCE, "source-jnto-nara"],
  }),
  node({
    id: "region-osaka",
    code: "jp-osaka",
    type: "travel_region",
    ja: "大阪市",
    zh: "大阪市",
    en: "Osaka",
    center: { longitude: 135.5021, latitude: 34.6938 },
    geometryKind: "tourism",
    sources: [REPO_DESTINATION_SOURCE, "source-jnto-osaka"],
  }),
  node({
    id: "district-namba-dotonbori",
    code: "JP-RG-NAMBA-DOTONBORI",
    type: "district",
    ja: "難波・道頓堀",
    zh: "难波·道顿堀",
    en: "Namba / Dotonbori",
    geometryKind: "tourism",
    sources: ["source-jnto-osaka"],
  }),
  node({
    id: "stay-umeda",
    code: "JP-RG-STAY-UMEDA",
    type: "stay_cluster",
    ja: "梅田宿泊圏",
    zh: "梅田住宿区",
    en: "Umeda stay cluster",
    geometryKind: "cluster",
    sources: ["source-jnto-osaka", EDITORIAL_SOURCE],
  }),
  node({
    id: "gateway-osaka-rail",
    code: "JP-RG-GATE-OSAKA-RAIL",
    type: "gateway",
    ja: "大阪鉄道ゲートウェイ",
    zh: "大阪铁路门户",
    en: "Osaka rail gateway",
    sources: ["source-jnto-osaka", EDITORIAL_SOURCE],
    gateway: gatewayProfile(
      "rail",
      ["region-osaka"],
      ["transport-node:osaka-station", "transport-node:shin-osaka-station"],
      ["source-jnto-osaka"],
    ),
  }),
  node({
    id: "region-kobe",
    code: "jp-kobe",
    type: "travel_region",
    ja: "神戸市",
    zh: "神户市",
    en: "Kobe",
    center: { longitude: 135.1954, latitude: 34.6902 },
    geometryKind: "tourism",
    sources: [REPO_DESTINATION_SOURCE, "source-jnto-kobe"],
  }),
  node({
    id: "district-kobe-waterfront",
    code: "JP-RG-KOBE-WATERFRONT",
    type: "district",
    ja: "神戸ウォーターフロント",
    zh: "神户滨水区",
    en: "Kobe waterfront",
    geometryKind: "tourism",
    sources: ["source-jnto-kobe"],
  }),
];

/**
 * Execution-time origin/develop contains the numeric range codebook but no
 * canonical entity-to-Master-Code allocation registry. This audit preserves
 * the rejected values as review evidence only; none remain assigned to a node.
 */
export const masterCodeAudit = {
  schemaVersion: 1,
  graphDataRevision: GRAPH_REVISION,
  auditedDevelopSha: MASTER_CODE_AUDIT_DEVELOP_SHA,
  canonicalRegistry: {
    status: "unavailable_in_repository",
    registryPaths: [],
    entryCount: 0,
    rangeCodebookPath:
      "docs/architecture/trip-engine-poi-ai-provider-design-v0.3.md",
    note: "The range codebook is not an allocation registry and cannot resolve a region identity to a Master Code.",
  },
  summary: {
    auditedNodes: priorMasterCodeAssignments.length,
    canonicalAssignmentsRetained: 0,
    unresolvedAssignments: priorMasterCodeAssignments.length,
    priorValuesByClassification: countBy(
      priorMasterCodeAssignments,
      ({ classification }) => classification,
    ),
  },
  nodes: priorMasterCodeAssignments,
};

function relation(type, from, to, sourceRefs, confidence = 0.9) {
  return {
    relationId: `rel-${type}-${from}-${to}`,
    relationType: type,
    fromRegionRef: from,
    toRegionRef: to,
    confidence,
    sourceRefs,
    validFrom: null,
    validUntil: null,
    lifecycleStatus: "active",
    revision: 1,
  };
}

const containsPairs = [
  ["region-japan", "region-kanto", CODEBOOK_SOURCE],
  ["region-japan", "region-chubu", CODEBOOK_SOURCE],
  ["region-japan", "region-kansai", CODEBOOK_SOURCE],
  ["region-kanto", "prefecture-tokyo", "source-jnto-tokyo"],
  ["region-kanto", "prefecture-kanagawa", "source-jnto-hakone"],
  ["region-chubu", "prefecture-yamanashi", "source-jnto-fuji-five-lakes"],
  ["region-chubu", "prefecture-nagano", "source-jnto-nagano"],
  ["region-chubu", "prefecture-gifu", "source-jnto-shirakawa-go"],
  ["region-chubu", "prefecture-ishikawa", REPO_DESTINATION_SOURCE],
  ["region-kansai", "prefecture-kyoto", "source-jnto-kansai"],
  ["region-kansai", "prefecture-nara", "source-jnto-kansai"],
  ["region-kansai", "prefecture-osaka", "source-jnto-kansai"],
  ["region-kansai", "prefecture-hyogo", "source-jnto-kansai"],
  ["prefecture-tokyo", "region-tokyo", "source-jnto-tokyo"],
  ["prefecture-kanagawa", "region-odawara", REPO_DESTINATION_SOURCE],
  ["prefecture-kanagawa", "region-hakone", "source-jnto-hakone"],
  [
    "prefecture-yamanashi",
    "region-fuji-five-lakes",
    "source-jnto-fuji-five-lakes",
  ],
  ["prefecture-yamanashi", "region-fujikawaguchiko", REPO_DESTINATION_SOURCE],
  ["prefecture-nagano", "region-nagano", REPO_DESTINATION_SOURCE],
  ["prefecture-nagano", "region-matsumoto", REPO_DESTINATION_SOURCE],
  ["prefecture-nagano", "region-kamikochi", "source-jnto-nagano"],
  ["prefecture-gifu", "region-takayama", REPO_DESTINATION_SOURCE],
  ["prefecture-gifu", "region-shirakawa-go", "source-jnto-shirakawa-go"],
  ["prefecture-ishikawa", "region-kanazawa", REPO_DESTINATION_SOURCE],
  ["prefecture-kyoto", "region-kyoto", REPO_DESTINATION_SOURCE],
  ["prefecture-nara", "region-nara", REPO_DESTINATION_SOURCE],
  ["prefecture-osaka", "region-osaka", REPO_DESTINATION_SOURCE],
  ["prefecture-hyogo", "region-kobe", REPO_DESTINATION_SOURCE],
  ["region-tokyo", "district-shinjuku", "source-jnto-shinjuku"],
  ["region-tokyo", "district-shibuya-harajuku", "source-jnto-shibuya"],
  ["region-tokyo", "district-asakusa-ueno", "source-jnto-asakusa"],
  ["region-tokyo", "district-central-tokyo", "source-jnto-tokyo"],
  ["region-tokyo", "stay-tokyo-station", EDITORIAL_SOURCE],
  ["region-tokyo", "stay-shinjuku", EDITORIAL_SOURCE],
  ["region-kyoto", "district-higashiyama", "source-jnto-kyoto"],
  ["region-kyoto", "district-arashiyama", "source-jnto-kyoto"],
  ["region-kyoto", "stay-kyoto-station", EDITORIAL_SOURCE],
  ["region-osaka", "district-namba-dotonbori", "source-jnto-osaka"],
  ["region-osaka", "stay-umeda", EDITORIAL_SOURCE],
  ["region-kobe", "district-kobe-waterfront", "source-jnto-kobe"],
];

const gatewayPairs = [
  ["gateway-tokyo-rail", "region-tokyo", "source-jnto-tokyo"],
  ["gateway-haneda", "region-tokyo", "source-jnto-tokyo"],
  ["gateway-hakone-yumoto", "region-hakone", "source-jnto-hakone"],
  [
    "gateway-kawaguchiko",
    "region-fuji-five-lakes",
    "source-jnto-fuji-five-lakes",
  ],
  ["gateway-matsumoto", "region-matsumoto", "source-jnto-matsumoto"],
  ["gateway-takayama", "region-takayama", "source-jnto-shirakawa-go"],
  ["gateway-kanazawa", "region-kanazawa", REPO_DESTINATION_SOURCE],
  ["gateway-kyoto-rail", "region-kyoto", "source-jnto-kyoto"],
  ["gateway-osaka-rail", "region-osaka", "source-jnto-osaka"],
];

export const regionRelations = [
  ...containsPairs.map(([from, to, source]) =>
    relation("contains", from, to, [source]),
  ),
  ...gatewayPairs.map(([from, to, source]) =>
    relation("gateway_of", from, to, [source, EDITORIAL_SOURCE], 0.75),
  ),
  relation(
    "overlaps",
    "district-shinjuku",
    "stay-shinjuku",
    ["source-jnto-shinjuku", EDITORIAL_SOURCE],
    0.7,
  ),
  relation(
    "overlaps",
    "district-central-tokyo",
    "stay-tokyo-station",
    ["source-jnto-tokyo", EDITORIAL_SOURCE],
    0.7,
  ),
  relation(
    "adjacent",
    "district-shinjuku",
    "district-shibuya-harajuku",
    ["source-jnto-tokyo", EDITORIAL_SOURCE],
    0.6,
  ),
  relation(
    "adjacent",
    "district-asakusa-ueno",
    "district-central-tokyo",
    ["source-jnto-tokyo", EDITORIAL_SOURCE],
    0.6,
  ),
];

const emptyRange = () => ({ low: null, typical: null, high: null });
const durationRange = (low, typical, high) => ({ low, typical, high });

function variant(id, mode, sourceRefs, duration = emptyRange(), gateways = {}) {
  return {
    variantId: `variant-${id}-${mode}`,
    mode,
    gatewayFromRef: gateways.from ?? null,
    gatewayToRef: gateways.to ?? null,
    typicalDurationMinutes: duration,
    typicalCostJpy: emptyRange(),
    typicalTransfers: emptyRange(),
    typicalWalkMinutes: emptyRange(),
    frequencyBand: "unknown",
    reservationPrior: "unknown",
    sourceRefs,
    observedAt: null,
    validUntil: null,
    confidence: duration.typical === null ? null : 0.55,
  };
}

function edge(from, to, scope, modes, sources, options = {}) {
  const key = `${from}-${to}`;
  return {
    contractVersion: CONTRACT_VERSION,
    edgeId: `edge-${key}-${scope}`,
    fromRegionRef: from,
    toRegionRef: to,
    scope,
    planningPrior: {
      tripCompatibility: options.compatibility ?? null,
      dayTripFit: options.dayTripFit ?? null,
      sameDayTransitionFit: options.sameDayFit ?? null,
      overnightTransitionFit: options.overnightFit ?? null,
      scenicTransition: options.scenic ?? null,
      slowTravelFit: options.slow ?? null,
      luggageEase: null,
      reliabilityPrior: null,
      detourPenaltyPrior: null,
    },
    recommendedStayAfterArrivalDays: null,
    variants: modes.map(({ mode, duration, fromGateway, toGateway }) =>
      variant(key, mode, sources, duration ?? emptyRange(), {
        from: fromGateway,
        to: toGateway,
      }),
    ),
    sourceRefs: [...new Set([...sources, EDITORIAL_SOURCE])],
    confidence: 0.55,
    revision: 1,
    lifecycleStatus: "active",
  };
}

const bilateral = (a, b, scope, modes, sources, options = {}) => [
  edge(a, b, scope, modes, sources, options),
  edge(
    b,
    a,
    scope,
    modes.map((item) => ({
      ...item,
      fromGateway: item.toGateway,
      toGateway: item.fromGateway,
    })),
    sources,
    options,
  ),
];

export const travelEdges = [
  ...bilateral(
    "district-shinjuku",
    "district-shibuya-harajuku",
    "local",
    [{ mode: "rail" }, { mode: "walk" }],
    ["source-jnto-tokyo"],
    { compatibility: 8, sameDayFit: 8 },
  ),
  ...bilateral(
    "district-shibuya-harajuku",
    "district-central-tokyo",
    "local",
    [{ mode: "rail" }],
    ["source-jnto-tokyo"],
    { compatibility: 7, sameDayFit: 8 },
  ),
  ...bilateral(
    "district-central-tokyo",
    "district-asakusa-ueno",
    "local",
    [{ mode: "rail" }],
    ["source-jnto-tokyo"],
    { compatibility: 8, sameDayFit: 8 },
  ),
  ...bilateral(
    "district-central-tokyo",
    "stay-tokyo-station",
    "local",
    [{ mode: "walk" }],
    ["source-jnto-tokyo"],
    { compatibility: 8, sameDayFit: 9 },
  ),
  ...bilateral(
    "district-shinjuku",
    "stay-shinjuku",
    "local",
    [{ mode: "walk" }],
    ["source-jnto-shinjuku"],
    { compatibility: 8, sameDayFit: 9 },
  ),
  ...bilateral(
    "region-tokyo",
    "gateway-tokyo-rail",
    "gateway",
    [{ mode: "rail" }],
    ["source-jnto-tokyo"],
    { compatibility: 8 },
  ),
  ...bilateral(
    "region-tokyo",
    "gateway-haneda",
    "gateway",
    [{ mode: "rail" }, { mode: "bus" }],
    ["source-jnto-tokyo"],
    { compatibility: 7 },
  ),
  ...bilateral(
    "region-tokyo",
    "region-hakone",
    "macro",
    [
      {
        mode: "rail",
        duration: durationRange(70, 95, 140),
        fromGateway: "gateway-tokyo-rail",
        toGateway: "gateway-hakone-yumoto",
      },
      { mode: "bus" },
    ],
    ["source-jnto-hakone"],
    {
      compatibility: 9,
      dayTripFit: 8,
      sameDayFit: 8,
      overnightFit: 8,
      scenic: 6,
      slow: 7,
    },
  ),
  ...bilateral(
    "region-tokyo",
    "region-fuji-five-lakes",
    "macro",
    [
      {
        mode: "bus",
        fromGateway: "gateway-tokyo-rail",
        toGateway: "gateway-kawaguchiko",
      },
      { mode: "mixed" },
    ],
    ["source-jnto-fuji-five-lakes"],
    { compatibility: 8, dayTripFit: 7, overnightFit: 8, scenic: 8, slow: 7 },
  ),
  ...bilateral(
    "region-tokyo",
    "region-nagano",
    "macro",
    [{ mode: "rail", fromGateway: "gateway-tokyo-rail" }],
    ["source-jnto-nagano"],
    { compatibility: 8, overnightFit: 8 },
  ),
  ...bilateral(
    "region-tokyo",
    "region-matsumoto",
    "macro",
    [
      {
        mode: "rail",
        duration: durationRange(130, 165, 210),
        fromGateway: "gateway-tokyo-rail",
        toGateway: "gateway-matsumoto",
      },
      { mode: "bus" },
    ],
    ["source-jnto-matsumoto"],
    { compatibility: 8, overnightFit: 8, scenic: 6 },
  ),
  ...bilateral(
    "region-tokyo",
    "region-kyoto",
    "macro",
    [
      {
        mode: "rail",
        fromGateway: "gateway-tokyo-rail",
        toGateway: "gateway-kyoto-rail",
      },
    ],
    ["source-jnto-tokyo", "source-jnto-kyoto"],
    { compatibility: 9, overnightFit: 9 },
  ),
  ...bilateral(
    "region-tokyo",
    "region-osaka",
    "macro",
    [
      {
        mode: "rail",
        fromGateway: "gateway-tokyo-rail",
        toGateway: "gateway-osaka-rail",
      },
    ],
    ["source-jnto-tokyo", "source-jnto-osaka"],
    { compatibility: 9, overnightFit: 9 },
  ),
  ...bilateral(
    "region-odawara",
    "region-hakone",
    "macro",
    [
      { mode: "rail", fromGateway: null, toGateway: "gateway-hakone-yumoto" },
      { mode: "bus" },
    ],
    ["source-jnto-hakone"],
    { compatibility: 9, dayTripFit: 9, sameDayFit: 9 },
  ),
  ...bilateral(
    "region-hakone",
    "region-fuji-five-lakes",
    "macro",
    [{ mode: "bus" }, { mode: "car" }, { mode: "mixed" }],
    ["source-jnto-hakone", "source-jnto-fuji-five-lakes"],
    { compatibility: 7, scenic: 8, slow: 8 },
  ),
  ...bilateral(
    "region-fuji-five-lakes",
    "region-matsumoto",
    "macro",
    [{ mode: "car" }, { mode: "mixed" }],
    ["source-jnto-fuji-five-lakes", "source-jnto-matsumoto"],
    { compatibility: 5, overnightFit: 7, scenic: 7, slow: 7 },
  ),
  ...bilateral(
    "region-nagano",
    "region-matsumoto",
    "macro",
    [{ mode: "rail" }],
    ["source-jnto-nagano", "source-jnto-matsumoto"],
    { compatibility: 8, dayTripFit: 7, sameDayFit: 8 },
  ),
  ...bilateral(
    "region-matsumoto",
    "region-kamikochi",
    "macro",
    [{ mode: "bus", fromGateway: "gateway-matsumoto" }, { mode: "mixed" }],
    ["source-jnto-nagano", "source-jnto-matsumoto"],
    { compatibility: 9, dayTripFit: 8, scenic: 9, slow: 8 },
  ),
  ...bilateral(
    "region-matsumoto",
    "region-takayama",
    "macro",
    [
      {
        mode: "bus",
        duration: durationRange(120, 150, 210),
        fromGateway: "gateway-matsumoto",
        toGateway: "gateway-takayama",
      },
      { mode: "mixed" },
    ],
    ["source-jnto-matsumoto"],
    { compatibility: 8, overnightFit: 8, scenic: 7, slow: 8 },
  ),
  ...bilateral(
    "region-takayama",
    "region-shirakawa-go",
    "macro",
    [
      {
        mode: "bus",
        duration: durationRange(40, 55, 95),
        fromGateway: "gateway-takayama",
      },
      { mode: "car" },
    ],
    ["source-jnto-shirakawa-go"],
    { compatibility: 9, dayTripFit: 8, sameDayFit: 8, scenic: 8, slow: 8 },
  ),
  ...bilateral(
    "region-shirakawa-go",
    "region-kanazawa",
    "macro",
    [{ mode: "bus", toGateway: "gateway-kanazawa" }, { mode: "car" }],
    ["source-jnto-shirakawa-go", REPO_DESTINATION_SOURCE],
    { compatibility: 8, overnightFit: 7, scenic: 7, slow: 8 },
  ),
  ...bilateral(
    "region-takayama",
    "region-kanazawa",
    "macro",
    [
      {
        mode: "bus",
        fromGateway: "gateway-takayama",
        toGateway: "gateway-kanazawa",
      },
      { mode: "mixed" },
    ],
    ["source-jnto-shirakawa-go", REPO_DESTINATION_SOURCE],
    { compatibility: 7, overnightFit: 8, scenic: 7, slow: 8 },
  ),
  ...bilateral(
    "region-kanazawa",
    "region-kyoto",
    "macro",
    [
      {
        mode: "rail",
        fromGateway: "gateway-kanazawa",
        toGateway: "gateway-kyoto-rail",
      },
      { mode: "mixed" },
    ],
    [REPO_DESTINATION_SOURCE, "source-jnto-kyoto"],
    { compatibility: 8, overnightFit: 8 },
  ),
  ...bilateral(
    "region-kanazawa",
    "region-osaka",
    "macro",
    [
      {
        mode: "rail",
        fromGateway: "gateway-kanazawa",
        toGateway: "gateway-osaka-rail",
      },
      { mode: "mixed" },
    ],
    [REPO_DESTINATION_SOURCE, "source-jnto-osaka"],
    { compatibility: 7, overnightFit: 8 },
  ),
  ...bilateral(
    "region-kyoto",
    "region-nara",
    "macro",
    [{ mode: "rail", fromGateway: "gateway-kyoto-rail" }],
    ["source-jnto-nara", "source-jnto-kyoto"],
    { compatibility: 9, dayTripFit: 9, sameDayFit: 9 },
  ),
  ...bilateral(
    "region-nara",
    "region-osaka",
    "macro",
    [{ mode: "rail", toGateway: "gateway-osaka-rail" }],
    ["source-jnto-nara", "source-jnto-osaka"],
    { compatibility: 9, dayTripFit: 9, sameDayFit: 9 },
  ),
  ...bilateral(
    "region-kyoto",
    "region-osaka",
    "macro",
    [
      {
        mode: "rail",
        fromGateway: "gateway-kyoto-rail",
        toGateway: "gateway-osaka-rail",
      },
    ],
    ["source-jnto-kyoto", "source-jnto-osaka"],
    { compatibility: 9, dayTripFit: 9, sameDayFit: 9 },
  ),
  ...bilateral(
    "region-osaka",
    "region-kobe",
    "macro",
    [{ mode: "rail", fromGateway: "gateway-osaka-rail" }],
    ["source-jnto-osaka", "source-jnto-kobe"],
    { compatibility: 9, dayTripFit: 9, sameDayFit: 9 },
  ),
  ...bilateral(
    "region-kyoto",
    "region-kobe",
    "macro",
    [{ mode: "rail", fromGateway: "gateway-kyoto-rail" }],
    ["source-jnto-kyoto", "source-jnto-kobe"],
    { compatibility: 8, dayTripFit: 8, sameDayFit: 8 },
  ),
];

export const regionGraph = {
  contractVersion: CONTRACT_VERSION,
  graphSchemaVersion: "1.0",
  graphDataRevision: GRAPH_REVISION,
  nodes: regionNodes,
  relations: regionRelations,
  travelEdges,
};

function countBy(items, selector) {
  return Object.fromEntries(
    [
      ...items.reduce(
        (counts, item) =>
          counts.set(selector(item), (counts.get(selector(item)) ?? 0) + 1),
        new Map(),
      ),
    ].sort(([a], [b]) => a.localeCompare(b)),
  );
}

export function masterCodeResolutionReport(
  graph = regionGraph,
  canonicalCodes = [],
) {
  const registry = new Set(canonicalCodes);
  const assigned = graph.nodes.filter(({ masterCode }) => masterCode !== null);
  const unresolved = graph.nodes.filter(
    ({ masterCode }) => masterCode === null,
  );
  const invalidAssigned = assigned.filter(
    ({ masterCode }) => !registry.has(masterCode),
  );
  return {
    registryStatus: masterCodeAudit.canonicalRegistry.status,
    registryEntryCount: registry.size,
    assignedCount: assigned.length,
    unresolvedCount: unresolved.length,
    allAssignedResolve: invalidAssigned.length === 0,
    invalidAssigned: invalidAssigned.map(({ regionId, masterCode }) => ({
      regionId,
      masterCode,
    })),
    unresolvedRegionIds: unresolved.map(({ regionId }) => regionId),
  };
}

function findContainsCycles(relations) {
  const children = new Map();
  for (const rel of relations.filter(
    ({ relationType }) => relationType === "contains",
  )) {
    children.set(rel.fromRegionRef, [
      ...(children.get(rel.fromRegionRef) ?? []),
      rel.toRegionRef,
    ]);
  }
  const cycles = [];
  const done = new Set();
  function visit(id, stack) {
    const index = stack.indexOf(id);
    if (index >= 0) {
      cycles.push([...stack.slice(index), id]);
      return;
    }
    if (done.has(id)) return;
    for (const child of children.get(id) ?? []) visit(child, [...stack, id]);
    done.add(id);
  }
  for (const id of regionNodes.map(({ regionId }) => regionId)) visit(id, []);
  return cycles;
}

export function graphDiagnostics(
  graph = regionGraph,
  evidence = evidenceIndex,
) {
  const parserResult = parseTravelRegionGraphV1(graph);
  const nodeIds = graph.nodes.map(({ regionId }) => regionId);
  const nodeIdSet = new Set(nodeIds);
  const masterCodes = graph.nodes
    .map(({ masterCode }) => masterCode)
    .filter((masterCode) => masterCode !== null);
  const masterCodeResolution = masterCodeResolutionReport(graph);
  const relationIds = graph.relations.map(({ relationId }) => relationId);
  const edgeIds = graph.travelEdges.map(({ edgeId }) => edgeId);
  const symmetricPairs = new Map();
  let symmetricDuplicates = 0;
  for (const rel of graph.relations.filter(({ relationType }) =>
    ["adjacent", "overlaps"].includes(relationType),
  )) {
    const pair = `${rel.relationType}:${[rel.fromRegionRef, rel.toRegionRef].sort().join(":")}`;
    if (symmetricPairs.has(pair)) symmetricDuplicates += 1;
    symmetricPairs.set(pair, rel.relationId);
  }
  const allSourceRefs = [
    ...graph.nodes.flatMap(({ sourceRefs, gatewayProfile }) => [
      ...sourceRefs,
      ...(gatewayProfile?.sourceRefs ?? []),
    ]),
    ...graph.relations.flatMap(({ sourceRefs }) => sourceRefs),
    ...graph.travelEdges.flatMap(({ sourceRefs, variants }) => [
      ...sourceRefs,
      ...variants.flatMap(({ sourceRefs }) => sourceRefs),
    ]),
  ];
  const validRange = ({ low, typical, high }) => {
    const known = [low, typical, high].filter((value) => value !== null);
    return known.every(
      (value, index) => index === 0 || value >= known[index - 1],
    );
  };
  const invalidRanges = graph.travelEdges.flatMap(({ edgeId, variants }) =>
    variants.flatMap((item) =>
      [
        "typicalDurationMinutes",
        "typicalCostJpy",
        "typicalTransfers",
        "typicalWalkMinutes",
      ]
        .filter((key) => !validRange(item[key]))
        .map((key) => `${edgeId}:${item.variantId}:${key}`),
    ),
  );
  const exactTimetableFields = [
    "departureMinute",
    "arrivalMinute",
    "departureTime",
    "arrivalTime",
    "liveFare",
    "availability",
    "providerRaw",
  ];
  const timetableViolations = graph.travelEdges.flatMap(
    ({ edgeId, variants }) =>
      variants.flatMap((item) =>
        exactTimetableFields
          .filter((key) => Object.hasOwn(item, key))
          .map((key) => `${edgeId}:${item.variantId}:${key}`),
      ),
  );
  const danglingRefs = [
    ...graph.relations.flatMap((rel) =>
      [rel.fromRegionRef, rel.toRegionRef].filter((id) => !nodeIdSet.has(id)),
    ),
    ...graph.travelEdges.flatMap((item) =>
      [
        item.fromRegionRef,
        item.toRegionRef,
        ...item.variants.flatMap((variant) =>
          [variant.gatewayFromRef, variant.gatewayToRef].filter(Boolean),
        ),
      ].filter((id) => !nodeIdSet.has(id)),
    ),
    ...graph.nodes.flatMap(({ gatewayProfile }) =>
      (gatewayProfile?.servedRegionRefs ?? []).filter(
        (id) => !nodeIdSet.has(id),
      ),
    ),
  ];
  return {
    graphDataRevision: graph.graphDataRevision,
    parser: parserResult.ok ? { ok: true } : parserResult,
    counts: {
      nodes: graph.nodes.length,
      nodesByType: countBy(graph.nodes, ({ regionType }) => regionType),
      relations: graph.relations.length,
      relationsByType: countBy(
        graph.relations,
        ({ relationType }) => relationType,
      ),
      travelEdges: graph.travelEdges.length,
      variants: graph.travelEdges.reduce(
        (sum, { variants }) => sum + variants.length,
        0,
      ),
      variantsByMode: countBy(
        graph.travelEdges.flatMap(({ variants }) => variants),
        ({ mode }) => mode,
      ),
    },
    violations: {
      duplicateNodeIds: nodeIds.length - new Set(nodeIds).size,
      duplicateMasterCodes: masterCodes.length - new Set(masterCodes).size,
      invalidMasterCodes: masterCodeResolution.invalidAssigned,
      duplicateRelationIds: relationIds.length - new Set(relationIds).size,
      duplicateEdgeIds: edgeIds.length - new Set(edgeIds).size,
      danglingRefs: [...new Set(danglingRefs)].sort(),
      selfRelations: graph.relations
        .filter((item) => item.fromRegionRef === item.toRegionRef)
        .map(({ relationId }) => relationId),
      selfTravelEdges: graph.travelEdges
        .filter((item) => item.fromRegionRef === item.toRegionRef)
        .map(({ edgeId }) => edgeId),
      containsCycles: findContainsCycles(graph.relations),
      symmetricDuplicates,
      invalidRanges,
      planningPriorExactTimetableViolations: timetableViolations,
      missingEvidenceRefs: [
        ...new Set(
          allSourceRefs.filter(
            (sourceRef) =>
              !evidence.sources.some(
                (source) => source.sourceRef === sourceRef,
              ),
          ),
        ),
      ].sort(),
      invalidGatewayServedRefs: graph.nodes.flatMap(
        ({ regionId, gatewayProfile }) =>
          (gatewayProfile?.servedRegionRefs ?? [])
            .filter((id) => !nodeIdSet.has(id))
            .map((id) => `${regionId}:${id}`),
      ),
    },
    evidence: {
      nodeCoverage: graph.nodes.filter(
        ({ sourceRefs }) =>
          sourceRefs.length > 0 &&
          sourceRefs.every((ref) => evidenceRefs.has(ref)),
      ).length,
      nodeTotal: graph.nodes.length,
      relationCoverage: graph.relations.filter(
        ({ sourceRefs }) =>
          sourceRefs.length > 0 &&
          sourceRefs.every((ref) => evidenceRefs.has(ref)),
      ).length,
      relationTotal: graph.relations.length,
      edgeCoverage: graph.travelEdges.filter(
        ({ sourceRefs }) =>
          sourceRefs.length > 0 &&
          sourceRefs.every((ref) => evidenceRefs.has(ref)),
      ).length,
      edgeTotal: graph.travelEdges.length,
    },
    masterCodeResolution,
  };
}

export const corridorDefinitions = {
  tokyo: [
    "region-tokyo",
    "district-shinjuku",
    "district-shibuya-harajuku",
    "district-asakusa-ueno",
    "gateway-tokyo-rail",
    "gateway-haneda",
  ],
  hakoneFuji: [
    "region-hakone",
    "region-odawara",
    "region-fuji-five-lakes",
    "region-fujikawaguchiko",
    "gateway-hakone-yumoto",
    "gateway-kawaguchiko",
  ],
  alpineHokuriku: [
    "region-nagano",
    "region-matsumoto",
    "region-kamikochi",
    "region-takayama",
    "region-shirakawa-go",
    "region-kanazawa",
  ],
  kansai: [
    "region-kyoto",
    "region-nara",
    "region-osaka",
    "region-kobe",
    "gateway-kyoto-rail",
    "gateway-osaka-rail",
  ],
};

function findPath(from, to, edges = travelEdges) {
  const outgoing = new Map();
  for (const edge of edges)
    outgoing.set(edge.fromRegionRef, [
      ...(outgoing.get(edge.fromRegionRef) ?? []),
      edge.toRegionRef,
    ]);
  const queue = [[from]];
  const visited = new Set([from]);
  while (queue.length) {
    const path = queue.shift();
    const current = path.at(-1);
    if (current === to) return path;
    for (const next of outgoing.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return null;
}

export function reachabilityReport(edges = travelEdges) {
  const checks = [
    [
      "tokyo_to_hakone",
      "region-tokyo",
      "region-hakone",
      ["region-tokyo", "region-hakone"],
    ],
    [
      "alpine_chain",
      "region-tokyo",
      "region-kanazawa",
      [
        "region-tokyo",
        "region-matsumoto",
        "region-takayama",
        "region-kanazawa",
      ],
    ],
    [
      "kansai_chain",
      "region-kyoto",
      "region-kobe",
      ["region-kyoto", "region-nara", "region-osaka", "region-kobe"],
    ],
    [
      "tokyo_to_kyoto",
      "region-tokyo",
      "region-kyoto",
      ["region-tokyo", "region-kyoto"],
    ],
    [
      "tokyo_to_osaka",
      "region-tokyo",
      "region-osaka",
      ["region-tokyo", "region-osaka"],
    ],
  ].map(([checkId, from, to, requiredPath]) => ({
    checkId,
    from,
    to,
    reachable: Boolean(findPath(from, to, edges)),
    shortestPath: findPath(from, to, edges),
    requiredPlanningPathPresent: requiredPath.every(
      (node, index) =>
        index === 0 ||
        edges.some(
          (edge) =>
            edge.fromRegionRef === requiredPath[index - 1] &&
            edge.toRegionRef === node,
        ),
    ),
    interpretation: "provider-free graph reachability only",
  }));
  return {
    graphDataRevision: GRAPH_REVISION,
    providerQueries: 0,
    checks,
    allReachable: checks.every(({ reachable }) => reachable),
    allRequiredPlanningPathsPresent: checks.every(
      ({ requiredPlanningPathPresent }) => requiredPlanningPathPresent,
    ),
  };
}

export function assertPilotIsValid(graph = regionGraph) {
  const diagnostics = graphDiagnostics(graph);
  if (!diagnostics.parser.ok)
    throw new Error(
      `Planning parser rejected graph: ${diagnostics.parser.issue.code} at ${diagnostics.parser.issue.path}`,
    );
  for (const [name, value] of Object.entries(diagnostics.violations)) {
    const count = Array.isArray(value) ? value.length : value;
    if (count !== 0) throw new Error(`${name}=${JSON.stringify(value)}`);
  }
  const reachability = reachabilityReport(graph.travelEdges);
  if (
    !reachability.allReachable ||
    !reachability.allRequiredPlanningPathsPresent
  )
    throw new Error("Required corridor reachability failed");
  return { diagnostics, reachability };
}

const json = (value) =>
  formatWithPrettier(JSON.stringify(value), { parser: "json" });

export async function writePilotOutputs() {
  const { diagnostics, reachability } = assertPilotIsValid();
  await mkdir(OUTPUT_DIR, { recursive: true });
  const outputs = [
    [
      "region-nodes.json",
      { graphDataRevision: GRAPH_REVISION, nodes: regionNodes },
    ],
    [
      "region-relations.json",
      { graphDataRevision: GRAPH_REVISION, relations: regionRelations },
    ],
    ["travel-edges.json", { graphDataRevision: GRAPH_REVISION, travelEdges }],
    ["graph-validation.json", diagnostics],
    ["master-code-audit.json", masterCodeAudit],
    [
      "corridor-reachability.json",
      { ...reachability, corridors: corridorDefinitions },
    ],
    ["evidence-index.json", evidenceIndex],
  ];
  await Promise.all(
    outputs.map(async ([filename, value]) =>
      writeFile(join(OUTPUT_DIR, filename), await json(value)),
    ),
  );
  return { diagnostics, reachability };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  const result = await writePilotOutputs();
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        counts: result.diagnostics.counts,
        reachability: result.reachability.checks.length,
      },
      null,
      2,
    ),
  );
}
