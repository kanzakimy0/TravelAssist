import {
  validDateOnly,
  strictPlanningInstant,
} from "./task-086-service-access-contract.mjs";
// Narrow public visitor PHONE OD contract. No booking, route API, fixed calls, or timing guarantee.
export function createDynamicOD({
  canonical,
  hash,
  id,
  invariant,
  verifyEvidence,
  metricFields,
}) {
  const same = (a, b) => canonical(a) === canonical(b),
    exact = (x, keys) =>
      x &&
      Object.keys(x).length === keys.length &&
      keys.every((k) => Object.hasOwn(x, k));
  const termKeys = [
    "audience",
    "profile",
    "channel",
    "minimumLeadMinutes",
    "receptionStart",
    "receptionEnd",
    "serviceStart",
    "serviceEnd",
    "validFrom",
    "validTo",
    "plannedEnd",
    "timeZone",
    "operatingDays",
    "payment",
    "dispatchGuarantee",
  ];
  function terms(c) {
    invariant(exact(c, termKeys), "OD_UNMODELED_CONSTRAINT");
    invariant(
      c.audience === "PUBLIC" &&
        c.profile === "PUBLIC_VISITOR" &&
        c.channel === "PHONE" &&
        c.minimumLeadMinutes === 30,
      "OD_UNSUPPORTED_AUDIENCE_OR_CHANNEL",
    );
    invariant(
      c.receptionStart === "07:00" &&
        c.receptionEnd === "18:00" &&
        c.serviceStart === "08:00" &&
        c.serviceEnd === "17:00" &&
        c.timeZone === "Asia/Tokyo" &&
        c.operatingDays === "DAILY",
      "OD_UNSUPPORTED_WINDOWS",
    );
    invariant(
      validDateOnly(c.validFrom) &&
        validDateOnly(c.validTo) &&
        c.validFrom === "2026-10-01" &&
        c.validTo === "2027-01-31" &&
        c.plannedEnd === true &&
        c.payment === "CASH" &&
        c.dispatchGuarantee === false,
      "OD_INVALID_VALIDITY_OR_GUARANTEE",
    );
    return c;
  }
  function bindClaims(
    fact,
    actions,
    sources,
    evidence,
    { reviewedFactAction, validateCorroboratingEvidence } = {},
  ) {
    invariant(
      typeof reviewedFactAction === "function" &&
        typeof validateCorroboratingEvidence === "function",
      "OD_REAL_PROVENANCE_REVIEW_CALLBACKS_REQUIRED",
    );
    invariant(
      fact.kind === "dynamic_od" &&
        ![
          "callingStations",
          "callingNodes",
          "servicePatternId",
          "sequenceEvidence",
          "parentCallingStations",
        ].some((k) => Object.hasOwn(fact, k)),
      "OD_FIXED_SEQUENCE_FORBIDDEN",
    );
    terms(fact.accessTerms);
    reviewedFactAction(fact, actions);
    validateCorroboratingEvidence(fact, actions);
    const pending = [],
      bindings = {};
    for (const o of fact.conditionObservations ?? []) {
      const probe = {
        ...o,
        kind: "condition",
        factId: fact.factId + ":" + o.conditionId,
      };
      const { observed, rights } = reviewedFactAction(probe, actions);
      validateCorroboratingEvidence(probe, actions);
      invariant(
        observed.contentSha256 === o.observedResponseSha256 &&
          o.locator &&
          o.conditionId,
        "OD_OBSERVATION_BINDING",
      );
      const record = {
        kind: "REVIEWED_DYNAMIC_OD_CONDITION",
        conditionId: o.conditionId,
        claims: o.claims,
        sourceUrl: o.sourceUrl,
        observedResponseSha256: o.observedResponseSha256,
      };
      const sourceId = id("source", [
          "dynamic-od-condition",
          o.sourceActionId,
          o.sourceUrl,
          o.observedResponseSha256,
          o.conditionId,
        ]),
        evidenceId = id("evidence", [
          "dynamic-od-condition",
          o.sourceActionId,
          o.sourceUrl,
          o.observedResponseSha256,
          o.conditionId,
        ]);
      const source = {
        sourceId,
        url: o.sourceUrl,
        contentSha256: hash(record),
        evidenceContentSha256: observed.contentSha256,
        observedAt: observed.observedAt,
        rightsClass: rights.rightsClass,
        rawPayloadRetained: false,
        derivedDataAllowed: true,
        redistributionAllowed: true,
        metricPersistenceAllowed: false,
        rightsDecision: "MINIMUM_NONEXPRESSIVE_FACTS_ONLY",
        rightsReview: {
          scope: "MINIMAL_NONEXPRESSIVE_TOPOLOGY_FACTS",
          termsUrl: rights.termsUrl,
          reason: rights.reason,
        },
      };
      const row = {
        evidenceId,
        sourceId,
        sourceSha256: source.contentSha256,
        record,
        recordSha256: hash(record),
        locator: o.locator,
      };
      for (const [key, value] of Object.entries(o.claims)) {
        invariant(
          termKeys.includes(key) &&
            !bindings[key] &&
            same(value, fact.accessTerms[key]),
          "OD_CLAIM_OVERLAP_OR_MISMATCH",
        );
        bindings[key] = evidenceId;
      }
      for (const [map, key, value] of [
        [sources, sourceId, source],
        [evidence, evidenceId, row],
      ]) {
        invariant(
          !map.has(key) || same(map.get(key), value),
          "OD_EVIDENCE_REBIND",
        );
        pending.push([map, key, value]);
      }
    }
    invariant(exact(bindings, termKeys), "OD_EVERY_PARAMETER_REQUIRES_SOURCE");
    for (const [m, k, v] of pending) m.set(k, v);
    return bindings;
  }
  function validateTermsProof(c, bindings, sources, evidence) {
    terms(c);
    invariant(exact(bindings, termKeys), "OD_PARAMETER_BINDING_REQUIRED");
    for (const key of termKeys) {
      const ref = bindings[key],
        r = evidence.get(ref)?.record;
      invariant(
        verifyEvidence([ref], sources, evidence) &&
          r?.kind === "REVIEWED_DYNAMIC_OD_CONDITION" &&
          same(r.claims[key], c[key]) &&
          sources.get(evidence.get(ref).sourceId)?.evidenceContentSha256 ===
            r.observedResponseSha256,
        "OD_PARAMETER_SOURCE_REVOKED_OR_CHANGED",
      );
    }
  }
  function facilityBound(node, context) {
    const { sources, evidence, nativeFacilityByAnchor } = context;
    if (node?.origin !== "TASK_086_INDEPENDENT_P05_AND_PUBLIC_OD") return false;
    const native = nativeFacilityByAnchor?.get(node.identityAnchor),
      r = node.identityRecord;
    return (
      !!native &&
      same(r, native.identityRecord) &&
      node.canonicalNameJa === r.feature.properties.P05_003 &&
      node.latitude === r.feature.geometry.coordinates[1] &&
      node.longitude === r.feature.geometry.coordinates[0] &&
      node.nodeKind === "public_pickup_facility" &&
      node.mode === "demand_shared_taxi" &&
      same(node.operatorRefs, ["facility:P05-22:P05_858"]) &&
      same(node.lineRefs, ["facility:P05-22:P05_858"]) &&
      node.identityAnchor === "p05:22:47:P05_858" &&
      verifyEvidence(node.evidenceRefs, sources, evidence) &&
      node.evidenceRefs.some((ref) => same(evidence.get(ref)?.record, r)) &&
      verifyEvidence([native.currentEndpointEvidenceRef], sources, evidence) &&
      evidence
        .get(native.currentEndpointEvidenceRef)
        ?.record?.endpointNames?.includes(node.canonicalNameJa)
    );
  }
  function endpointBound(node, context) {
    if (!node || node.decision !== "ADMIT_TASK_086_TOPOLOGY") return false;
    if (node.origin === "TASK_086_INDEPENDENT_P05_AND_PUBLIC_OD")
      return facilityBound(node, context);
    return (
      node.nodeId === id("node", "review:official-airport:南大東") &&
      node.identityAnchor === "review:official-airport:南大東" &&
      node.origin === "TASK_086_INDEPENDENT_C28_AND_CURRENT_ACCESS" &&
      node.nodeKind === "airport" &&
      node.identityRecord?.referencePointId === "cf03_00059" &&
      node.canonicalNameJa === node.identityRecord.airportName &&
      node.latitude === node.identityRecord.latitude &&
      node.longitude === node.identityRecord.longitude &&
      verifyEvidence(node.evidenceRefs, context.sources, context.evidence) &&
      node.evidenceRefs.some((ref) =>
        same(context.evidence.get(ref)?.record, node.identityRecord),
      )
    );
  }
  function validateRecord(od, context) {
    const { sources, evidence, nodes } = context;
    invariant(
      exact(od, [
        "kind",
        "odId",
        "from",
        "to",
        "operator",
        "endpointNames",
        "accessTerms",
        "parameterEvidenceRefs",
        "sourceFactRef",
        "evidenceRefs",
        "sourceRefs",
      ]),
      "OD_UNMODELED_RESOLVED_FIELD",
    );
    invariant(
      od?.kind === "dynamic_od" &&
        od.odId &&
        od.from !== od.to &&
        ![
          "callingNodes",
          "callingStations",
          "sequenceEvidence",
          "servicePatternId",
          "parentCallingStations",
        ].some((k) => Object.hasOwn(od, k)),
      "OD_FIXED_SEQUENCE_FORBIDDEN",
    );
    validateTermsProof(
      od.accessTerms,
      od.parameterEvidenceRefs,
      sources,
      evidence,
    );
    invariant(
      verifyEvidence(od.evidenceRefs, sources, evidence) &&
        od.evidenceRefs.length === 1,
      "OD_RESOLVED_PROVENANCE",
    );
    const resolved = evidence.get(od.evidenceRefs[0]).record,
      raw = evidence.get(resolved.sourceFactRef)?.record;
    invariant(
      verifyEvidence([resolved.sourceFactRef], sources, evidence) &&
        raw?.kind === "dynamic_od" &&
        !["callingStations", "callingNodes", "sequenceEvidence"].some((k) =>
          Object.hasOwn(raw, k),
        ) &&
        same(raw.accessTerms, od.accessTerms) &&
        same(resolved.accessTerms, od.accessTerms) &&
        same(resolved.parameterEvidenceRefs, od.parameterEvidenceRefs) &&
        resolved.odId === od.odId &&
        resolved.from === od.from &&
        resolved.to === od.to &&
        same(raw.endpointNames, od.endpointNames) &&
        same(resolved.endpointNames, od.endpointNames) &&
        raw.operator === od.operator &&
        resolved.operator === od.operator,
      "OD_RAW_RESOLVED_BINDING",
    );
    invariant(
      exact(raw, [
        "factId",
        "kind",
        "sourceActionId",
        "sourceUrl",
        "observedResponseSha256",
        "operator",
        "endpointNames",
        "accessTerms",
        "conditionObservations",
        "corroboratingEvidence",
        "locator",
        "endpointIdentityAnchors",
      ]) &&
        exact(resolved, [
          "kind",
          "odId",
          "from",
          "to",
          "operator",
          "endpointNames",
          "accessTerms",
          "parameterEvidenceRefs",
          "sourceFactRef",
        ]),
      "OD_UNMODELED_RAW_RESTRICTION",
    );
    const expectedBindings = {};
    for (const o of raw.conditionObservations) {
      const ref = id("evidence", [
          "dynamic-od-condition",
          o.sourceActionId,
          o.sourceUrl,
          o.observedResponseSha256,
          o.conditionId,
        ]),
        r = evidence.get(ref)?.record;
      invariant(
        r &&
          same(r.claims, o.claims) &&
          r.observedResponseSha256 === o.observedResponseSha256 &&
          r.sourceUrl === o.sourceUrl,
        "OD_RAW_CONDITION_OBSERVATION_MISMATCH",
      );
      for (const key of Object.keys(o.claims)) {
        invariant(!expectedBindings[key], "OD_RAW_DUPLICATE_PARAMETER");
        expectedBindings[key] = ref;
      }
    }
    invariant(
      same(expectedBindings, od.parameterEvidenceRefs),
      "OD_RAW_PARAMETER_SET_MISMATCH",
    );
    invariant(
      same(
        raw.endpointIdentityAnchors.map((anchor) => id("node", anchor)),
        [od.from, od.to],
      ),
      "OD_RAW_EXACT_ENDPOINT_ANCHORS",
    );
    invariant(
      od.operator === "南大東村" &&
        od.endpointNames.length === 2 &&
        same(
          [...od.endpointNames].sort(),
          ["南大東村役場", "南大東空港"].sort(),
        ),
      "OD_PUBLIC_PAIR_SCOPE",
    );
    for (const [i, nodeId] of [od.from, od.to].entries()) {
      const n = nodes.get(nodeId);
      invariant(
        endpointBound(n, context) && n.canonicalNameJa === od.endpointNames[i],
        "OD_EXACT_FACILITY_IDENTITY",
      );
    }
    return od;
  }
  function generate(od, context, generatedAt) {
    validateRecord(od, context);
    return {
      edgeId: id("edge", ["dynamic-od", od.odId]),
      edgeKind: "dynamic_od_ride",
      dynamicODRef: od.odId,
      mode: "demand_shared_taxi",
      directed: true,
      from: { kind: "transport", id: od.from },
      to: { kind: "transport", id: od.to },
      fromTransportNodeId: od.from,
      toTransportNodeId: od.to,
      operatorRef: od.operator,
      boardAllowed: true,
      alightAllowed: true,
      conditionalTopology: true,
      accessContract: { kind: "PUBLIC_PHONE_DYNAMIC_OD", ...od.accessTerms },
      accessContractSha256: hash(od.accessTerms),
      topologyEvidenceRefs: [
        ...od.evidenceRefs,
        ...new Set(Object.values(od.parameterEvidenceRefs)),
      ],
      sourceRefs: od.sourceRefs,
      reservation: "required",
      confidence: 1,
      metrics: metricFields({}, context.sources),
      generatedAt,
    };
  }
  function bindEdge(edge, context) {
    const registry = context?.dynamicODById;
    invariant(registry instanceof Map, "OD_INDEPENDENT_REGISTRY_REQUIRED");
    const od =
      registry.get(edge.dynamicODRef) ??
      [...registry.values()].find(
        (x) => id("edge", ["dynamic-od", x.odId]) === edge.edgeId,
      );
    invariant(od, "OD_RECORD_MISSING");
    const expected = generate(od, context, edge.generatedAt);
    invariant(same(edge, expected), "OD_EDGE_STRIPPED_OR_CHANGED");
    return od;
  }
  function isOD(edge, context) {
    return (
      edge.edgeKind === "dynamic_od_ride" ||
      Object.hasOwn(edge, "dynamicODRef") ||
      [...(context?.dynamicODById?.values() ?? [])].some(
        (x) => id("edge", ["dynamic-od", x.odId]) === edge.edgeId,
      )
    );
  }
  const local = (ms) => new Date(ms + 9 * 3600000).toISOString(),
    inWindow = (s, a, b) =>
      s.slice(11, 23) >= a + ":00.000" && s.slice(11, 23) <= b + ":00.000";
  function allows(edge, context) {
    try {
      if (
        context?.kind !== "EXPLICIT_CONDITIONAL_PLANNING" ||
        context.publicStructureOnly !== true
      )
        return false;
      const od = bindEdge(edge, context.odValidationContext),
        c = od.accessTerms;
      if (!context.acceptedContracts?.includes(hash(c))) return false;
      const i = context.odReservationIntents?.find((x) => x.odId === od.odId);
      if (
        !i ||
        i.kind !== "REQUEST_BEFORE_PICKUP" ||
        i.channel !== "PHONE" ||
        i.profile !== "PUBLIC_VISITOR" ||
        i.payment !== "CASH"
      )
        return false;
      const planning = strictPlanningInstant(context.planningAt),
        request = strictPlanningInstant(i.requestAt),
        pickup = strictPlanningInstant(i.pickupAt);
      if (
        planning === null ||
        request === null ||
        pickup === null ||
        request < planning ||
        pickup - request < c.minimumLeadMinutes * 60000
      )
        return false;
      const req = local(request),
        pick = local(pickup),
        date = pick.slice(0, 10);
      return (
        validDateOnly(context.travelDate) &&
        context.travelDate === date &&
        date >= c.validFrom &&
        date <= c.validTo &&
        inWindow(req, c.receptionStart, c.receptionEnd) &&
        inWindow(pick, c.serviceStart, c.serviceEnd)
      );
    } catch {
      return false;
    }
  }
  return {
    bindClaims,
    validateTermsProof,
    facilityBound,
    generate,
    bindEdge,
    isOD,
    allows,
    validateRecord,
  };
}
