import {
  id,
  invariant,
  generateDynamicOD,
  dynamicOD,
} from "./task-086-model.mjs";
import {
  reviewedFactAction,
  validateCorroboratingEvidence,
} from "./task-086-source-actions.mjs";
// This narrow intake is called from the raw-fact branch, never from generatePattern.
// Source/evidence factories are the existing remediation factories supplied by its caller.
export function materializeDynamicODFact(fact, context) {
  const {
    actions,
    sources,
    evidence,
    nodes,
    nativeFacilityByAnchor,
    makeEvidence,
    factSource,
    generatedAt,
    phaseId,
  } = context;
  invariant(
    fact.kind === "dynamic_od" &&
      typeof fact.locator === "string" &&
      fact.locator.length > 0 &&
      Array.isArray(fact.endpointIdentityAnchors) &&
      fact.endpointIdentityAnchors.length === 2,
    "OD_TYPED_RAW_INTAKE_REQUIRED",
  );
  reviewedFactAction(fact, actions);
  validateCorroboratingEvidence(fact, actions);
  const parameterEvidenceRefs = dynamicOD.bindClaims(
      fact,
      actions,
      sources,
      evidence,
      { reviewedFactAction, validateCorroboratingEvidence },
    ),
    source = factSource(fact),
    sourceFactRef = makeEvidence(source, fact, fact.locator, [
      "fact",
      phaseId,
      fact.factId,
    ]);
  const resolved = {
    kind: "dynamic_od",
    odId: id("od", [phaseId, fact.factId]),
    from: id("node", fact.endpointIdentityAnchors[0]),
    to: id("node", fact.endpointIdentityAnchors[1]),
    operator: fact.operator,
    endpointNames: fact.endpointNames,
    accessTerms: structuredClone(fact.accessTerms),
    parameterEvidenceRefs,
    sourceFactRef,
  };
  const resolvedRef = makeEvidence(source, resolved, fact.locator, [
    "resolved-dynamic-od",
    phaseId,
    fact.factId,
  ]);
  const od = {
    ...resolved,
    evidenceRefs: [resolvedRef],
    sourceRefs: [
      source.url,
      ...fact.conditionObservations.map((o) => o.sourceUrl),
    ].filter((v, i, a) => a.indexOf(v) === i),
  };
  const edge = generateDynamicOD(
    od,
    { sources, evidence, nodes, nativeFacilityByAnchor },
    generatedAt,
  );
  return {
    od,
    edge,
    group: {
      groupId: od.odId,
      dynamicOD: od,
      edges: [edge],
      sources: [source, ...new Set(Object.values(parameterEvidenceRefs))].map(
        (x) =>
          typeof x === "string" ? sources.get(evidence.get(x).sourceId) : x,
      ),
      nodes: [nodes.get(od.from), nodes.get(od.to)],
    },
  };
}
