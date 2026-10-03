// Entirely synthetic topology/source fixtures. No private source documents or real railway call database.
import {
  hash,
  id,
  generatePattern,
} from "../../tools/transport/task-086-model.mjs";
export function correctionFixture() {
  const oldIds = [
    "transport-pattern:086:227b50b76a82c195171bcd4ddbddc5ff",
    "transport-pattern:086:5fb4245b79538fe67680858624cd3671",
    "transport-pattern:086:fc54dd86d4778bb7905bec7de80c5a5a",
  ];
  const oldFacts = [
    "marine-3135M-west",
    "marine-3110M-west",
    "iwakuni-hiroshima-510M",
  ];
  const oldPhaseIds = [
    "032-shikoku-seto-ohashi-gateway",
    "032-shikoku-seto-ohashi-gateway",
    "170-iwakuni-airport-east-exit-actual-sanyo-national-chain",
  ];
  const nodes = [],
    sources = [],
    evidence = [],
    oldPatterns = [],
    oldEdges = [],
    oldFactRows = [],
    newPatterns = [],
    newEdges = [],
    newFacts = [],
    actions = [];
  const phaseId = "synthetic-correction-phase",
    operator = "Synthetic Operator";
  function ev(source, record, k) {
    const evidenceId = id("evidence", k);
    evidence.push({
      evidenceId,
      sourceId: source.sourceId,
      sourceSha256: source.contentSha256,
      record,
      recordSha256: hash(record),
      locator: "synthetic fixture",
    });
    return evidenceId;
  }
  for (let i = 0; i < 3; i++) {
    const count = i === 2 ? 16 : 12,
      names = Array.from({ length: count }, (_, j) => `Fixture${i}-${j}`);
    const calls = names.map((name, j) => {
      const nodeId = `fixture-node-${i}-${j}`;
      nodes.push({
        nodeId,
        canonicalNameJa: name,
        decision: "ADMIT_TASK_086_TOPOLOGY",
        mode: "conventional_rail",
        operatorRefs: [operator],
        lineRefs: ["Synthetic Line"],
      });
      return { nodeId, sequence: j + 1, pickupType: "0", dropOffType: "0" };
    });
    const oldCalls = (
      i === 0
        ? [calls[0], calls[4], calls[8], calls[11]]
        : i === 1
          ? calls.filter((_, j) => j !== 4 && j !== 6)
          : calls
    ).map((c, j) => ({ ...c, sequence: j + 1 }));
    const oldClass = i === 2 ? "普通" : "快速マリンライナー";
    const oldFact = {
      factId: oldFacts[i],
      operator,
      mode: "conventional_rail",
      serviceClass: oldClass,
    };
    oldFactRows.push(oldFact);
    oldPatterns.push({
      servicePatternId: oldIds[i],
      factId: oldFacts[i],
      serviceClass: oldClass,
      callingNodes: oldCalls,
    });
    oldEdges.push(
      ...oldCalls.slice(1).map((_, j) => ({
        edgeId: `synthetic-old-${i}-${j}`,
        servicePatternRef: oldIds[i],
      })),
    );
    const actionId = `synthetic-source-${i}`,
      url = `https://example.org/factual-source-${i}`,
      nativeHash = hash("native-" + i),
      factId = `synthetic-new-${i}`;
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
          reason: "Synthetic fact-only fixture, not a real rights decision.",
        },
      ],
    };
    actions.push(action);
    const fact = {
      factId,
      kind: "service",
      sourceActionId: actionId,
      sourceUrl: url,
      observedResponseSha256: nativeHash,
      callingStations: names,
      callingComponents: names.map((name) => ({
        name,
        operator,
        line: "Synthetic Line",
        mode: "conventional_rail",
      })),
      operator,
      line: "Synthetic Line",
      mode: "conventional_rail",
      serviceClass: "static_local_all_stop",
      direction: "fixture-forward",
      serviceState: "active",
      serviceStateScope: "SYNTHETIC_TEST_ONLY",
      locator: "synthetic",
    };
    newFacts.push(fact);
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
    sources.push(source);
    const factRef = ev(source, fact, ["synthetic-fact", i]);
    const resolved = {
      factId,
      callingNodes: calls,
      lineRef: "synthetic-line",
      operatorRef: operator,
      mode: "conventional_rail",
      serviceClass: "static_local_all_stop",
      direction: "fixture-forward",
      sourceFactRef: factRef,
    };
    const ref = ev(source, resolved, ["synthetic-resolved", i]);
    const pattern = {
      ...resolved,
      servicePatternId: id("pattern", [phaseId, factId]),
      evidenceRefs: [ref],
      sourceRefs: [url],
      sequenceEvidence: "OFFICIAL_CALLING_SEQUENCE",
      segmentOperators: Array(count - 1).fill(operator),
      serviceState: "active",
      serviceStateScope: "SYNTHETIC_TEST_ONLY",
      metrics: {},
      strictFactBinding: true,
    };
    newPatterns.push(pattern);
    newEdges.push(
      ...generatePattern(
        pattern,
        new Map(nodes.map((n) => [n.nodeId, n])),
        new Map(sources.map((s) => [s.sourceId, s])),
        new Map(evidence.map((e) => [e.evidenceId, e])),
        "2026-10-01T00:00:00Z",
      ),
    );
  }
  const requiredPatternIds = [
    ...oldIds,
    ...Array.from({ length: 400 }, (_, i) => `synthetic-original-pattern-${i}`),
  ];
  const requiredNodeIds = [
    ...nodes.map((n) => n.nodeId),
    ...Array.from(
      { length: 2521 - nodes.length },
      (_, i) => `synthetic-original-node-${i}`,
    ),
  ];
  const archive = {
    requiredPatternIds,
    requiredNodeIds,
    patterns: oldPatterns,
    edges: oldEdges,
    facts: oldFactRows,
    reviewScopes: {
      "source:national-stopping-patterns": {
        requiredPatternIds,
        requiredNodeIds,
      },
      "service:major-rail-private-metro": {
        requiredPatternIds: requiredPatternIds.slice(0, 375),
        requiredNodeIds: requiredNodeIds.slice(0, 2421),
      },
    },
  };
  const phases = [
    { phaseId: oldPhaseIds[0], facts: oldFactRows.slice(0, 2) },
    { phaseId: oldPhaseIds[2], facts: oldFactRows.slice(2) },
    { phaseId, facts: newFacts },
  ];
  const inputMap = [
    ["synthetic-archive", JSON.stringify(archive)],
    [
      "synthetic-original-task",
      "fixture original requirement; no named rapid requirement",
    ],
  ];
  const entries = oldIds.map((oldPatternId, i) => ({
    oldPatternId,
    oldPhaseId: oldPhaseIds[i],
    oldFactId: oldFacts[i],
    oldPatternSha256: hash(oldPatterns[i]),
    oldFactSha256: hash(oldFactRows[i]),
    oldEdgeSha256ById: Object.fromEntries(
      oldEdges
        .filter((e) => e.servicePatternRef === oldPatternId)
        .map((e) => [e.edgeId, hash(e)]),
    ),
    reason: "SOURCE_SPECIFIC_UNSUPPORTED_IMPLEMENTATION",
    decision: "REVIEWED_EXPLICIT_IMPLEMENTATION_CORRECTION",
    originalRequiredServiceClass: i === 2 ? "普通" : null,
    originalRequirementBasis: ["synthetic-original-task"],
    successorPhaseId: phaseId,
    successorFactId: newFacts[i].factId,
    successorFactSha256: hash(newFacts[i]),
    successorPatternId: newPatterns[i].servicePatternId,
    sourceActionBindings: {
      [actions[i].actionId]: hash({
        actionId: actions[i].actionId,
        sourcesChecked: actions[i].sourcesChecked,
        rightsFindings: actions[i].rightsFindings,
      }),
    },
    oldNodeIds: oldPatterns[i].callingNodes.map((c) => c.nodeId),
    newCallCount: newFacts[i].callingStations.length,
  }));
  return {
    document: {
      schemaVersion: 1,
      kind: "EXACT_REVIEWED_RAIL_CORRECTIONS_V1",
      archivePath: "synthetic-archive",
      inputBindings: inputMap.map(([path, bytes]) => ({
        path,
        sha256: hash(bytes),
      })),
      entries,
    },
    inputMap,
    phases,
    actions,
    archive,
    graph: {
      nodes,
      patterns: newPatterns,
      edges: newEdges,
      sources,
      evidence,
      generatedAt: "2026-10-01T00:00:00Z",
      connected: nodes.map((n) => n.nodeId),
    },
  };
}
