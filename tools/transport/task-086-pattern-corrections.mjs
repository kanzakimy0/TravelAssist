import {
  hash,
  id,
  invariant,
  canonical,
  generatePattern,
} from "./task-086-model.mjs";
import { reviewedFactAction } from "./task-086-source-actions.mjs";

const EXACT = new Map([
  [
    "transport-pattern:086:227b50b76a82c195171bcd4ddbddc5ff",
    [
      "032-shikoku-seto-ohashi-gateway",
      "marine-3135M-west",
      "快速マリンライナー",
    ],
  ],
  [
    "transport-pattern:086:5fb4245b79538fe67680858624cd3671",
    [
      "032-shikoku-seto-ohashi-gateway",
      "marine-3110M-west",
      "快速マリンライナー",
    ],
  ],
  [
    "transport-pattern:086:fc54dd86d4778bb7905bec7de80c5a5a",
    [
      "170-iwakuni-airport-east-exit-actual-sanyo-national-chain",
      "iwakuni-hiroshima-510M",
      "普通",
    ],
  ],
  [
    "transport-pattern:086:ee9eb7b9d3e078e3711a80071f98e05c",
    [
      "090-sonic-current-oita-backbone-and-kokura-monorail-concourse",
      "sonic-3003M-current-kokura-oita-section",
      "特急ソニック",
    ],
  ],
  [
    "transport-pattern:086:f68de1ad76cbfaf9755e77eb7dffb643",
    [
      "090-sonic-current-oita-backbone-and-kokura-monorail-concourse",
      "sonic-3006M-current-kokura-oita-section",
      "特急ソニック",
    ],
  ],
]);
const exactSet = (a, b) =>
  Array.isArray(a) &&
  a.length === new Set(a).size &&
  a.length === b.length &&
  a.every((x) => b.includes(x));
const key = (phaseId, factId) => phaseId + "\0" + factId;
const actionBinding = (a) =>
  hash({
    actionId: a.actionId,
    sourcesChecked: a.sourcesChecked,
    rightsFindings: a.rightsFindings,
  });
export function prepareExactPatternCorrections(
  document,
  { readInput, phases, actions },
) {
  if (!document) return null;
  invariant(
    document.kind === "EXACT_REVIEWED_RAIL_CORRECTIONS_V1" &&
      document.schemaVersion === 1,
    "CORRECTION_SCHEMA",
  );
  invariant(
    document.entries?.length > 0 &&
      document.entries.length <= 5 &&
      new Set(document.entries.map((e) => e.oldPatternId)).size ===
        document.entries.length,
    "CORRECTION_SCOPE",
  );
  if (document.entries.some((e) => e.oldFactId?.startsWith("sonic-")))
    invariant(
      exactSet(
        document.entries.map((e) => e.oldPatternId),
        [...EXACT.keys()],
      ),
      "CORRECTION_SONIC_REQUIRES_BOTH_DIRECTIONS_AND_PRIOR_CORRECTIONS",
    );
  invariant(document.inputBindings?.length > 0, "CORRECTION_BINDINGS_MISSING");
  for (const binding of document.inputBindings)
    invariant(
      hash(readInput(binding.path)) === binding.sha256,
      "CORRECTION_INPUT_CHANGED",
    );
  invariant(
    document.inputBindings.some((b) => b.path === document.archivePath),
    "CORRECTION_ARCHIVE_UNBOUND",
  );
  const archive = JSON.parse(readInput(document.archivePath));
  invariant(
    archive.requiredPatternIds.length === 403 &&
      archive.requiredNodeIds.length === 2521,
    "CORRECTION_ORIGINAL_SCOPE",
  );
  invariant(
    exactSet(archive.requiredPatternIds, [
      ...new Set(archive.requiredPatternIds),
    ]) &&
      exactSet(archive.requiredNodeIds, [...new Set(archive.requiredNodeIds)]),
    "CORRECTION_DUPLICATE_OBLIGATION",
  );
  invariant(
    exactSet(
      archive.reviewScopes?.["source:national-stopping-patterns"]
        ?.requiredPatternIds,
      archive.requiredPatternIds,
    ) &&
      exactSet(
        archive.reviewScopes?.["source:national-stopping-patterns"]
          ?.requiredNodeIds,
        archive.requiredNodeIds,
      ),
    "CORRECTION_PRIMARY_SCOPE_REBOUND",
  );
  invariant(
    archive.reviewScopes?.["service:major-rail-private-metro"]
      ?.requiredPatternIds.length === 375 &&
      archive.reviewScopes?.["service:major-rail-private-metro"]
        ?.requiredNodeIds.length === 2421,
    "CORRECTION_SECONDARY_SCOPE_REBOUND",
  );
  const contexts = new Map(),
    retiredFacts = new Set();
  for (const entry of document.entries) {
    const allowed = EXACT.get(entry.oldPatternId);
    invariant(
      allowed &&
        entry.oldPhaseId === allowed[0] &&
        entry.oldFactId === allowed[1],
      "CORRECTION_NOT_ALLOWLISTED",
    );
    invariant(
      entry.reason === "SOURCE_SPECIFIC_UNSUPPORTED_IMPLEMENTATION" &&
        entry.decision === "REVIEWED_EXPLICIT_IMPLEMENTATION_CORRECTION",
      "CORRECTION_NOT_REVIEWED",
    );
    invariant(
      entry.originalRequiredServiceClass === null ||
        (allowed[2] === "普通" &&
          entry.originalRequiredServiceClass === "普通"),
      "CORRECTION_ORIGINAL_CLASS_STILL_REQUIRED",
    );
    invariant(
      entry.originalRequirementBasis?.length > 0 &&
        entry.originalRequirementBasis.every((p) =>
          document.inputBindings.some((b) => b.path === p),
        ),
      "CORRECTION_ORIGINAL_REQUIREMENT_UNBOUND",
    );
    const oldPattern = archive.patterns.find(
      (p) => p.servicePatternId === entry.oldPatternId,
    );
    const oldFact = archive.facts.find((f) => f.factId === entry.oldFactId);
    const oldEdges = archive.edges.filter(
      (e) => e.servicePatternRef === entry.oldPatternId,
    );
    const phase = phases.find((p) => p.phaseId === entry.oldPhaseId);
    invariant(
      oldPattern &&
        oldFact &&
        phase &&
        hash(oldPattern) === entry.oldPatternSha256 &&
        hash(oldFact) === entry.oldFactSha256 &&
        hash(phase.facts.find((f) => f.factId === entry.oldFactId)) ===
          entry.oldFactSha256,
      "CORRECTION_LEGACY_RECORD_CHANGED",
    );
    invariant(
      oldPattern.serviceClass === allowed[2] &&
        oldEdges.length === oldPattern.callingNodes.length - 1 &&
        canonical(
          Object.fromEntries(oldEdges.map((e) => [e.edgeId, hash(e)])),
        ) === canonical(entry.oldEdgeSha256ById),
      "CORRECTION_LEGACY_EDGES_CHANGED",
    );
    invariant(
      archive.requiredPatternIds.includes(entry.oldPatternId),
      "CORRECTION_NOT_ORIGINAL_OBLIGATION",
    );
    if (entry.replacementKind === "EXACT_SONIC_SEPARATE_SERVICE_CHAIN_V1") {
      const successorFacts = prepareSonicChain(
        entry,
        oldPattern,
        oldFact,
        document,
        phases,
        actions,
        archive,
      );
      contexts.set(entry.oldPatternId, {
        entry,
        oldPattern,
        oldFact,
        oldEdges,
        successorFacts,
      });
      retiredFacts.add(key(entry.oldPhaseId, entry.oldFactId));
      continue;
    }
    invariant(
      !entry.oldFactId.startsWith("sonic-"),
      "CORRECTION_SONIC_CHAIN_REQUIRED",
    );
    const successorPhase = phases.find(
      (p) => p.phaseId === entry.successorPhaseId,
    );
    const successorFact = successorPhase?.facts.find(
      (f) => f.factId === entry.successorFactId,
    );
    invariant(
      successorFact &&
        hash(successorFact) === entry.successorFactSha256 &&
        successorFact.factId !== entry.oldFactId &&
        entry.successorPatternId ===
          id("pattern", [entry.successorPhaseId, entry.successorFactId]) &&
        !archive.requiredPatternIds.includes(entry.successorPatternId),
      "CORRECTION_SUCCESSOR_FACT_CHANGED",
    );
    invariant(
      successorFact.serviceClass === "static_local_all_stop" &&
        oldFact.operator === successorFact.operator &&
        oldFact.mode === successorFact.mode,
      "CORRECTION_FALSE_SERVICE_CLASS",
    );
    const actionIds = [
      ...new Set([
        successorFact.sourceActionId,
        ...(successorFact.corroboratingEvidence ?? []).map(
          (r) => r.sourceActionId ?? successorFact.sourceActionId,
        ),
      ]),
    ];
    invariant(
      exactSet(Object.keys(entry.sourceActionBindings), actionIds),
      "CORRECTION_SOURCE_BINDINGS_INCOMPLETE",
    );
    for (const actionId of actionIds) {
      const action = actions.find((a) => a.actionId === actionId);
      invariant(
        action &&
          entry.sourceActionBindings[actionId] === actionBinding(action),
        "CORRECTION_SOURCE_ACTION_CHANGED",
      );
    }
    reviewedFactAction(successorFact, actions);
    invariant(
      canonical(entry.oldNodeIds) ===
        canonical(oldPattern.callingNodes.map((c) => c.nodeId)),
      "CORRECTION_OLD_NODE_SCOPE_CHANGED",
    );
    invariant(
      entry.newCallCount === successorFact.callingStations.length &&
        entry.newCallCount ===
          (entry.oldFactId === "iwakuni-hiroshima-510M" ? 16 : 12),
      "CORRECTION_INCOMPLETE_LOCAL_SCOPE",
    );
    contexts.set(entry.oldPatternId, {
      entry,
      oldPattern,
      oldFact,
      oldEdges,
      successorFact,
    });
    retiredFacts.add(key(entry.oldPhaseId, entry.oldFactId));
  }
  return {
    document,
    archive,
    contexts,
    retiredFacts,
    phases,
    actions,
    readInput,
  };
}
export const isRetiredCorrectionFact = (context, phase, fact) =>
  context?.retiredFacts.has(key(phase.phaseId, fact.factId)) ?? false;

export function exactCorrectionCovers(
  context,
  oldId,
  { nodes, patterns, edges, sources, evidence, generatedAt, connected },
) {
  try {
    if (!context?.contexts.has(oldId)) return false;
    // Recheck native facts, action rights and every independent static input at acceptance time.
    const fresh = prepareExactPatternCorrections(context.document, context);
    const { entry, oldPattern, oldEdges, successorFact, successorFacts } =
      fresh.contexts.get(oldId);
    const byNode =
      nodes instanceof Map ? nodes : new Map(nodes.map((n) => [n.nodeId, n]));
    if (successorFacts)
      return sonicChainCovers(fresh, oldId, {
        nodes: byNode,
        patterns,
        edges,
        sources,
        evidence,
        generatedAt,
        connected,
      });
    const p = patterns.find(
      (p) => p.servicePatternId === entry.successorPatternId,
    );
    invariant(
      p &&
        !patterns.some((x) => x.servicePatternId === oldId) &&
        !edges.some(
          (e) =>
            e.servicePatternRef === oldId ||
            oldEdges.some((o) => o.edgeId === e.edgeId),
        ),
      "CORRECTION_OLD_ACTIVE_RECORD_REMAINS",
    );
    invariant(
      p.factId === entry.successorFactId &&
        p.serviceClass === "static_local_all_stop" &&
        p.callingNodes.length === entry.newCallCount &&
        p.direction === successorFact.direction,
      "CORRECTION_SUCCESSOR_PATTERN_MISMATCH",
    );
    const factEvidence = evidence.get(p.sourceFactRef),
      runtimeSource = sources.get(factEvidence?.sourceId);
    invariant(
      factEvidence &&
        hash(factEvidence.record) === entry.successorFactSha256 &&
        runtimeSource?.evidenceContentSha256 ===
          successorFact.observedResponseSha256,
      "CORRECTION_RUNTIME_FACT_OR_NATIVE_HASH_CHANGED",
    );
    const sameSourceFacts = fresh.phases
      .flatMap((ph) => ph.facts)
      .filter(
        (f) =>
          f.sourceActionId === successorFact.sourceActionId &&
          f.sourceUrl === successorFact.sourceUrl,
      );
    invariant(
      runtimeSource.contentSha256 === hash(sameSourceFacts),
      "CORRECTION_RUNTIME_SOURCE_DESCRIPTOR_CHANGED",
    );
    let cursor = -1;
    for (const oldCall of oldPattern.callingNodes) {
      const next = p.callingNodes.findIndex(
        (c, i) => i > cursor && c.nodeId === oldCall.nodeId,
      );
      invariant(next >= 0, "CORRECTION_LOST_NODE_OR_DIRECTION");
      const replacement = p.callingNodes[next];
      invariant(
        (oldCall.pickupType !== "0" || replacement.pickupType === "0") &&
          (oldCall.dropOffType !== "0" || replacement.dropOffType === "0"),
        "CORRECTION_PASSENGER_RIGHTS_LOST",
      );
      cursor = next;
    }
    for (const call of p.callingNodes)
      invariant(
        byNode.get(call.nodeId)?.decision === "ADMIT_TASK_086_TOPOLOGY" &&
          connected.has(call.nodeId),
        "CORRECTION_NODE_NOT_BIDIRECTIONALLY_CONNECTED",
      );
    const generated = generatePattern(
      p,
      byNode,
      sources,
      evidence,
      generatedAt,
    );
    const actual = edges.filter(
      (e) => e.servicePatternRef === p.servicePatternId,
    );
    invariant(
      generated.length === entry.newCallCount - 1 &&
        canonical(generated.map((e) => [e.edgeId, hash(e)]).sort()) ===
          canonical(actual.map((e) => [e.edgeId, hash(e)]).sort()),
      "CORRECTION_SUCCESSOR_EDGE_INVALID",
    );
    return true;
  } catch {
    return false;
  }
}
export function correctionObligationsPreserved(context, decision) {
  if (!context) return true;
  const scope = context.archive.reviewScopes[decision.deficitId];
  return (
    !!scope &&
    exactSet(decision.requiredPatternIds, scope.requiredPatternIds) &&
    exactSet(decision.requiredNodeIds, scope.requiredNodeIds)
  );
}
export function assertCorrectionGraph(context, graph) {
  if (!context) return [];
  return [...context.contexts].map(
    ([oldId, { entry, oldPattern, oldEdges, oldFact }]) => {
      invariant(
        exactCorrectionCovers(context, oldId, graph),
        "CORRECTION_REPLACEMENT_NOT_VALID:" + oldId,
      );
      return {
        originalPatternId: oldId,
        originalFactId: entry.oldFactId,
        status: "RETIRED_UNSUPPORTED_IMPLEMENTATION_WITH_REVIEWED_SUCCESSOR",
        oldRapidServiceProved: false,
        oldPatternSha256: hash(oldPattern),
        oldFactSha256: hash(oldFact),
        oldEdgeSha256ById: Object.fromEntries(
          oldEdges.map((e) => [e.edgeId, hash(e)]),
        ),
        ...(entry.successors
          ? {
              successorPatternIds: entry.successors.map((s) => s.patternId),
              replacementKind: entry.replacementKind,
              oldLimitedExpressServiceProved: false,
            }
          : { successorPatternId: entry.successorPatternId }),
        reason: entry.reason,
        originalObligationRetained: true,
      };
    },
  );
}

// Only this reviewed two-pattern correction can use distinct service sections.
const SONIC_PHASE = "219-independent-nippo-rail-source-correction-chain";
const SONIC_SERVICES = [
  {
    factId: "nippo-yanagigaura-kokura-independent-static-local-v28",
    serviceClass: "static_local_all_stop",
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
    direction: "柳ヶ浦→小倉",
  },
  {
    factId: "sonic31-independent-nakatsu-usa-three-call-section-v32",
    serviceClass: "特急ソニック",
    callingStations: ["中津", "柳ヶ浦", "宇佐"],
    direction: "中津→宇佐",
  },
  {
    factId: "nippo-usa-beppu-static-ordinary-return-v35",
    serviceClass: "static_local_all_stop",
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
    direction: "宇佐→別府",
  },
  {
    factId: "nippo-kokura-yoshitomi-static-local-south-v37",
    serviceClass: "static_local_all_stop",
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
    direction: "小倉→吉富",
  },
  {
    factId: "nippo-kusami-nakatsu-static-local-south-v37",
    serviceClass: "static_local_all_stop",
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
    direction: "朽網→中津",
  },
  {
    factId: "nippo-beppu-nakatsu-static-local-north-v37",
    serviceClass: "static_local_all_stop",
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
    direction: "別府→中津",
  },
  {
    factId: "nippo-beppu-oita-static-local-south-v37",
    serviceClass: "static_local_all_stop",
    callingStations: ["別府", "東別府", "西大分", "大分"],
    direction: "別府→大分",
  },
  {
    factId: "nippo-oita-beppudaigaku-static-local-north-v37",
    serviceClass: "static_local_all_stop",
    callingStations: ["大分", "西大分", "東別府", "別府", "別府大学"],
    direction: "大分→別府大学",
  },
];
const SONIC_PATHS = {
  "sonic-3003M-current-kokura-oita-section": [
    [3, 1, 18],
    [4, 12, 13],
    [1, 1, 3],
    [2, 1, 12],
    [6, 1, 4],
  ],
  "sonic-3006M-current-kokura-oita-section": [
    [7, 1, 5],
    [5, 2, 14],
    [0, 1, 24],
  ],
};
function prepareSonicChain(
  entry,
  oldPattern,
  oldFact,
  document,
  phases,
  actions,
  archive,
) {
  invariant(
    SONIC_PATHS[entry.oldFactId] && entry.originalRequiredServiceClass === null,
    "CORRECTION_SONIC_ORIGINAL_CLASS_STILL_REQUIRED",
  );
  invariant(
    entry.successorPhaseId === SONIC_PHASE && entry.successors?.length === 8,
    "CORRECTION_SONIC_EXACT_SCOPE",
  );
  invariant(
    canonical(entry.sectionPath) === canonical(SONIC_PATHS[entry.oldFactId]),
    "CORRECTION_SONIC_DIRECTION_MAPPING",
  );
  invariant(
    canonical(entry.oldNodeIds) ===
      canonical(oldPattern.callingNodes.map((c) => c.nodeId)),
    "CORRECTION_OLD_NODE_SCOPE_CHANGED",
  );
  const phase = phases.find((p) => p.phaseId === SONIC_PHASE);
  invariant(phase?.facts.length === 8, "CORRECTION_SONIC_EXACT_SCOPE");
  return SONIC_SERVICES.map((expected, i) => {
    const binding = entry.successors[i],
      fact = phase.facts.find((f) => f.factId === expected.factId);
    invariant(
      binding &&
        fact &&
        binding.factId === expected.factId &&
        binding.factSha256 === hash(fact) &&
        binding.patternId === id("pattern", [SONIC_PHASE, expected.factId]) &&
        !archive.requiredPatternIds.includes(binding.patternId),
      "CORRECTION_SUCCESSOR_FACT_CHANGED",
    );
    invariant(
      fact.serviceClass === expected.serviceClass &&
        fact.direction === expected.direction &&
        canonical(fact.callingStations) ===
          canonical(expected.callingStations) &&
        fact.operator === oldFact.operator &&
        fact.mode === oldFact.mode,
      "CORRECTION_SONIC_SERVICE_SEMANTICS_CHANGED",
    );
    const actionIds = [
      ...new Set([
        fact.sourceActionId,
        ...(fact.corroboratingEvidence ?? []).map(
          (e) => e.sourceActionId ?? fact.sourceActionId,
        ),
      ]),
    ];
    invariant(
      exactSet(Object.keys(binding.sourceActionBindings ?? {}), actionIds),
      "CORRECTION_SOURCE_BINDINGS_INCOMPLETE",
    );
    for (const actionId of actionIds) {
      const action = actions.find((a) => a.actionId === actionId);
      invariant(
        action &&
          binding.sourceActionBindings[actionId] === actionBinding(action),
        "CORRECTION_SOURCE_ACTION_CHANGED",
      );
    }
    reviewedFactAction(fact, actions);
    return fact;
  });
}
function sonicChainCovers(context, oldId, graph) {
  const { entry, oldPattern, oldEdges, successorFacts } =
    context.contexts.get(oldId);
  const { nodes, patterns, edges, sources, evidence, generatedAt, connected } =
    graph;
  invariant(
    !patterns.some((p) => p.servicePatternId === oldId) &&
      !edges.some(
        (e) =>
          e.servicePatternRef === oldId ||
          oldEdges.some((o) => o.edgeId === e.edgeId),
      ),
    "CORRECTION_OLD_ACTIVE_RECORD_REMAINS",
  );
  const successors = successorFacts.map((fact, i) => {
    const binding = entry.successors[i],
      p = patterns.find((p) => p.servicePatternId === binding.patternId);
    invariant(
      p &&
        p.factId === fact.factId &&
        p.serviceClass === fact.serviceClass &&
        p.direction === fact.direction &&
        p.callingNodes.length === fact.callingStations.length,
      "CORRECTION_SUCCESSOR_PATTERN_MISMATCH",
    );
    const factEvidence = evidence.get(p.sourceFactRef),
      source = sources.get(factEvidence?.sourceId);
    invariant(
      factEvidence &&
        hash(factEvidence.record) === binding.factSha256 &&
        source?.evidenceContentSha256 === fact.observedResponseSha256,
      "CORRECTION_RUNTIME_FACT_OR_NATIVE_HASH_CHANGED",
    );
    invariant(
      source.contentSha256 ===
        hash(
          context.phases
            .flatMap((ph) => ph.facts)
            .filter(
              (f) =>
                f.sourceActionId === fact.sourceActionId &&
                f.sourceUrl === fact.sourceUrl,
            ),
        ),
      "CORRECTION_RUNTIME_SOURCE_DESCRIPTOR_CHANGED",
    );
    for (const call of p.callingNodes)
      invariant(
        nodes.get(call.nodeId)?.decision === "ADMIT_TASK_086_TOPOLOGY" &&
          connected.has(call.nodeId),
        "CORRECTION_NODE_NOT_BIDIRECTIONALLY_CONNECTED",
      );
    const generated = generatePattern(p, nodes, sources, evidence, generatedAt),
      actual = edges.filter((e) => e.servicePatternRef === p.servicePatternId);
    invariant(
      generated.length === fact.callingStations.length - 1 &&
        canonical(generated.map((e) => [e.edgeId, hash(e)]).sort()) ===
          canonical(actual.map((e) => [e.edgeId, hash(e)]).sort()),
      "CORRECTION_SUCCESSOR_EDGE_INVALID",
    );
    return p;
  });
  invariant(
    new Set(successors.flatMap((p) => p.callingNodes.map((c) => c.nodeId)))
      .size === 40,
    "CORRECTION_SONIC_NECESSARY_SCOPE_CHANGED",
  );
  const chain = [];
  for (const [index, from, to] of entry.sectionPath) {
    const calls = successors[index].callingNodes.slice(from - 1, to);
    invariant(
      calls.length === to - from + 1 &&
        from < to &&
        calls[0].pickupType === "0" &&
        calls.at(-1).dropOffType === "0",
      "CORRECTION_SONIC_SECTION_PASSENGER_RIGHTS",
    );
    if (chain.length)
      invariant(
        chain.at(-1).nodeId === calls[0].nodeId &&
          chain.at(-1).dropOffType === "0" &&
          calls[0].pickupType === "0",
        "CORRECTION_SONIC_FALSE_INTERCHANGE",
      );
    chain.push(...(chain.length ? calls.slice(1) : calls));
  }
  let cursor = -1;
  for (const oldCall of oldPattern.callingNodes) {
    const next = chain.findIndex(
      (c, i) => i > cursor && c.nodeId === oldCall.nodeId,
    );
    invariant(next >= 0, "CORRECTION_LOST_NODE_OR_DIRECTION");
    invariant(
      (oldCall.pickupType !== "0" || chain[next].pickupType === "0") &&
        (oldCall.dropOffType !== "0" || chain[next].dropOffType === "0"),
      "CORRECTION_PASSENGER_RIGHTS_LOST",
    );
    cursor = next;
  }
  return true;
}
