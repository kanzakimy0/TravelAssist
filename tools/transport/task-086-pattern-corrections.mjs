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
      document.entries.length <= 3 &&
      new Set(document.entries.map((e) => e.oldPatternId)).size ===
        document.entries.length,
    "CORRECTION_SCOPE",
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
    const { entry, oldPattern, oldEdges, successorFact } =
      fresh.contexts.get(oldId);
    const byNode =
      nodes instanceof Map ? nodes : new Map(nodes.map((n) => [n.nodeId, n]));
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
        successorPatternId: entry.successorPatternId,
        reason: entry.reason,
        originalObligationRetained: true,
      };
    },
  );
}
