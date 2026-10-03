// Synthetic records, URLs, rights decisions and identities; reviewed names only specify the exact bounded branch under test.
import { correctionFixture } from "./task-086-pattern-corrections-fixture.mjs";
import {
  hash,
  id,
  generatePattern,
} from "../../tools/transport/task-086-model.mjs";
const SHAPE = [
  {
    factId: "nippo-yanagigaura-kokura-independent-static-local-v28",
    serviceClass: "static_local_all_stop",
    direction: "柳ヶ浦→小倉",
    callingStations: [
      "柳ヶ浦",
      "豊前善光寺",
      "天津",
      "今津",
      "東中津",
      "中津",
      "吉富",
      "三毛門",
      "宇島",
      "豊前松江",
      "椎田",
      "築城",
      "新田原",
      "南行橋",
      "行橋",
      "小波瀬西工大前",
      "苅田",
      "朽網",
      "下曽根",
      "安部山公園",
      "城野",
      "南小倉",
      "西小倉",
      "小倉",
    ],
  },
  {
    factId: "sonic31-independent-nakatsu-usa-three-call-section-v32",
    serviceClass: "特急ソニック",
    direction: "中津→宇佐",
    callingStations: ["中津", "柳ヶ浦", "宇佐"],
  },
  {
    factId: "nippo-usa-beppu-static-ordinary-return-v35",
    serviceClass: "static_local_all_stop",
    direction: "宇佐→別府",
    callingStations: [
      "宇佐",
      "西屋敷",
      "立石",
      "中山香",
      "杵築",
      "大神",
      "日出",
      "暘谷",
      "豊後豊岡",
      "亀川",
      "別府大学",
      "別府",
    ],
  },
  {
    factId: "nippo-kokura-yoshitomi-static-local-south-v37",
    serviceClass: "static_local_all_stop",
    direction: "小倉→吉富",
    callingStations: [
      "小倉",
      "西小倉",
      "南小倉",
      "城野",
      "安部山公園",
      "下曽根",
      "朽網",
      "苅田",
      "小波瀬西工大前",
      "行橋",
      "南行橋",
      "新田原",
      "築城",
      "椎田",
      "豊前松江",
      "宇島",
      "三毛門",
      "吉富",
    ],
  },
  {
    factId: "nippo-kusami-nakatsu-static-local-south-v37",
    serviceClass: "static_local_all_stop",
    direction: "朽網→中津",
    callingStations: [
      "朽網",
      "苅田",
      "小波瀬西工大前",
      "行橋",
      "南行橋",
      "新田原",
      "築城",
      "椎田",
      "豊前松江",
      "宇島",
      "三毛門",
      "吉富",
      "中津",
    ],
  },
  {
    factId: "nippo-beppu-nakatsu-static-local-north-v37",
    serviceClass: "static_local_all_stop",
    direction: "別府→中津",
    callingStations: [
      "別府",
      "別府大学",
      "亀川",
      "豊後豊岡",
      "暘谷",
      "日出",
      "大神",
      "杵築",
      "中山香",
      "立石",
      "西屋敷",
      "宇佐",
      "豊前長洲",
      "柳ヶ浦",
      "豊前善光寺",
      "天津",
      "今津",
      "東中津",
      "中津",
    ],
  },
  {
    factId: "nippo-beppu-oita-static-local-south-v37",
    serviceClass: "static_local_all_stop",
    direction: "別府→大分",
    callingStations: ["別府", "東別府", "西大分", "大分"],
  },
  {
    factId: "nippo-oita-beppudaigaku-static-local-north-v37",
    serviceClass: "static_local_all_stop",
    direction: "大分→別府大学",
    callingStations: ["大分", "西大分", "東別府", "別府", "別府大学"],
  },
];
export function sonicCorrectionFixture() {
  const f = correctionFixture(),
    g = f.graph,
    phaseId = "219-independent-nippo-rail-source-correction-chain",
    operator = "Synthetic Operator",
    line = "Synthetic Line";
  const oldIds = [
      "transport-pattern:086:ee9eb7b9d3e078e3711a80071f98e05c",
      "transport-pattern:086:f68de1ad76cbfaf9755e77eb7dffb643",
    ],
    oldPhaseId =
      "090-sonic-current-oita-backbone-and-kokura-monorail-concourse",
    oldFactIds = [
      "sonic-3003M-current-kokura-oita-section",
      "sonic-3006M-current-kokura-oita-section",
    ];
  const names = [...new Set(SHAPE.flatMap((s) => s.callingStations))],
    nodeIds = new Map(names.map((n, i) => [n, "synthetic-sonic-node-" + i]));
  g.nodes.push(
    ...names.map((n) => ({
      nodeId: nodeIds.get(n),
      canonicalNameJa: n,
      decision: "ADMIT_TASK_086_TOPOLOGY",
      mode: "conventional_rail",
      operatorRefs: [operator],
      lineRefs: [line],
    })),
  );
  g.connected.push(...nodeIds.values());
  const facts = [],
    successors = [];
  function ev(source, record, k) {
    const evidenceId = id("evidence", k);
    g.evidence.push({
      evidenceId,
      sourceId: source.sourceId,
      sourceSha256: source.contentSha256,
      record,
      recordSha256: hash(record),
      locator: "synthetic",
    });
    return evidenceId;
  }
  for (const [i, shape] of SHAPE.entries()) {
    const actionId = "synthetic-sonic-source-" + i,
      url = "https://example.org/sonic-source-" + i,
      nativeHash = hash("synthetic-native-" + i);
    const action = {
      actionId,
      state: "RIGHTS_REVIEWED",
      sourcesChecked: [
        {
          url,
          status: 200,
          contentSha256: nativeHash,
          observedAt: "2026-10-01",
          rawPayloadRetained: false,
        },
      ],
      rightsFindings: [
        {
          rightsClass: "TOPOLOGY_FACT_ONLY_ALLOWED",
          termsUrl: "https://example.org/terms",
          reason: "Synthetic fixture, no actual rights grant.",
        },
      ],
    };
    f.actions.push(action);
    const fact = {
      ...shape,
      kind: "service",
      sourceActionId: actionId,
      sourceUrl: url,
      observedResponseSha256: nativeHash,
      callingComponents: shape.callingStations.map((name) => ({
        name,
        operator,
        line,
        mode: "conventional_rail",
      })),
      operator,
      line,
      mode: "conventional_rail",
      serviceState: "active",
      serviceStateScope: "SYNTHETIC_TEST_ONLY",
      locator: "synthetic",
    };
    facts.push(fact);
    const source = {
      sourceId: actionId,
      url,
      contentSha256: hash([fact]),
      evidenceContentSha256: nativeHash,
      observedAt: "2026-10-01",
      rightsClass: "TOPOLOGY_FACT_ONLY_ALLOWED",
      rawPayloadRetained: false,
      derivedDataAllowed: true,
      redistributionAllowed: true,
      rightsDecision: "SYNTHETIC_TEST",
      rightsReview: {
        scope: "MINIMAL_NONEXPRESSIVE_TOPOLOGY_FACTS",
        termsUrl: "https://example.org/terms",
        reason: "Synthetic",
      },
    };
    g.sources.push(source);
    const factRef = ev(source, fact, ["synthetic-sonic-fact", i]),
      calls = shape.callingStations.map((name, j) => ({
        nodeId: nodeIds.get(name),
        sequence: j + 1,
        pickupType: "0",
        dropOffType: "0",
      }));
    const resolved = {
      factId: fact.factId,
      callingNodes: calls,
      lineRef: "synthetic-line",
      operatorRef: operator,
      mode: fact.mode,
      serviceClass: fact.serviceClass,
      direction: fact.direction,
      sourceFactRef: factRef,
    };
    const ref = ev(source, resolved, ["synthetic-sonic-resolved", i]),
      pattern = {
        ...resolved,
        servicePatternId: id("pattern", [phaseId, fact.factId]),
        evidenceRefs: [ref],
        sourceRefs: [url],
        sequenceEvidence: "OFFICIAL_CALLING_SEQUENCE",
        segmentOperators: Array(calls.length - 1).fill(operator),
        serviceState: "active",
        serviceStateScope: "SYNTHETIC_TEST_ONLY",
        metrics: {},
        strictFactBinding: true,
      };
    g.patterns.push(pattern);
    g.edges.push(
      ...generatePattern(
        pattern,
        new Map(g.nodes.map((n) => [n.nodeId, n])),
        new Map(g.sources.map((s) => [s.sourceId, s])),
        new Map(g.evidence.map((e) => [e.evidenceId, e])),
        g.generatedAt,
      ),
    );
    successors.push({
      factId: fact.factId,
      factSha256: hash(fact),
      patternId: pattern.servicePatternId,
      sourceActionBindings: {
        [actionId]: hash({
          actionId,
          sourcesChecked: action.sourcesChecked,
          rightsFindings: action.rightsFindings,
        }),
      },
    });
  }
  const originalNames = [
      "小倉",
      "行橋",
      "宇島",
      "中津",
      "柳ヶ浦",
      "宇佐",
      "杵築",
      "別府",
      "大分",
    ],
    oldFacts = [];
  for (let i = 0; i < 2; i++) {
    const oldFact = {
      factId: oldFactIds[i],
      operator,
      mode: "conventional_rail",
      serviceClass: "特急ソニック",
    };
    oldFacts.push(oldFact);
    const oldPattern = {
      servicePatternId: oldIds[i],
      factId: oldFactIds[i],
      serviceClass: "特急ソニック",
      callingNodes: (i ? [...originalNames].reverse() : originalNames).map(
        (name, j) => ({
          nodeId: nodeIds.get(name),
          sequence: j + 1,
          pickupType: "0",
          dropOffType: "0",
        }),
      ),
    };
    const oldEdges = Array.from({ length: 8 }, (_, j) => ({
      edgeId: "synthetic-sonic-old-" + i + "-" + j,
      servicePatternRef: oldIds[i],
    }));
    f.archive.patterns.push(oldPattern);
    f.archive.facts.push(oldFact);
    f.archive.edges.push(...oldEdges);
    f.document.entries.push({
      oldPatternId: oldIds[i],
      oldPhaseId,
      oldFactId: oldFactIds[i],
      oldPatternSha256: hash(oldPattern),
      oldFactSha256: hash(oldFact),
      oldEdgeSha256ById: Object.fromEntries(
        oldEdges.map((e) => [e.edgeId, hash(e)]),
      ),
      reason: "SOURCE_SPECIFIC_UNSUPPORTED_IMPLEMENTATION",
      decision: "REVIEWED_EXPLICIT_IMPLEMENTATION_CORRECTION",
      originalRequiredServiceClass: null,
      originalRequirementBasis: ["synthetic-original-task"],
      replacementKind: "EXACT_SONIC_SEPARATE_SERVICE_CHAIN_V1",
      successorPhaseId: phaseId,
      successors: structuredClone(successors),
      sectionPath: i
        ? [
            [7, 1, 5],
            [5, 2, 14],
            [0, 1, 24],
          ]
        : [
            [3, 1, 18],
            [4, 12, 13],
            [1, 1, 3],
            [2, 1, 12],
            [6, 1, 4],
          ],
      oldNodeIds: oldPattern.callingNodes.map((c) => c.nodeId),
    });
  }
  f.phases.push({ phaseId: oldPhaseId, facts: oldFacts }, { phaseId, facts });
  f.archive.requiredPatternIds.splice(3, 2, ...oldIds);
  f.archive.requiredNodeIds.splice(40, 40, ...nodeIds.values());
  for (const [scope, pc, nc] of [
    ["source:national-stopping-patterns", 403, 2521],
    ["service:major-rail-private-metro", 375, 2421],
  ])
    f.archive.reviewScopes[scope] = {
      requiredPatternIds: f.archive.requiredPatternIds.slice(0, pc),
      requiredNodeIds: f.archive.requiredNodeIds.slice(0, nc),
    };
  f.inputMap.find(([p]) => p === f.document.archivePath)[1] = JSON.stringify(
    f.archive,
  );
  f.document.inputBindings.find(
    (b) => b.path === f.document.archivePath,
  ).sha256 = hash(JSON.stringify(f.archive));
  return f;
}
