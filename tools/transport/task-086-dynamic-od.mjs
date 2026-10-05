import {
  OKUSHIRI_TERMS,
  isOkushiri,
  okushiriFacilityBound,
  okushiriSourceScope,
} from "./task-086-okushiri-od-capability.mjs";
import {
  capabilityAllows,
  CAPABILITY_KIND,
} from "./task-086-od-capability-context.mjs";
import {
  AGUNI_TERMS,
  isAguni,
  aguniFacilityBound,
  aguniSourceScope,
} from "./task-086-aguni-od-capability.mjs";
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
  generatePattern,
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
  const noto = (c) => c?.contractKind === "NOTO_FLIGHT_ASSOCIATED_PUBLIC_OD_V1";
  const notoTerms = {
    contractKind: "NOTO_FLIGHT_ASSOCIATED_PUBLIC_OD_V1",
    audience: "PUBLIC",
    profile: "PUBLIC_AIRPORT_SERVICE_REQUEST",
    channels: ["PHONE", "INTERNET"],
    reservationDeadline: {
      dayOffset: -1,
      localTime: "15:00",
      timeZone: "Asia/Tokyo",
    },
    timeZone: "Asia/Tokyo",
    payment: "CASH",
    operation: "FOLLOW_SELECTED_AIRPORT_FLIGHT_SERVICE",
    noReservationNoDispatch: true,
    divertedArrivalCancelsMatchingTaxi: true,
    capacityGuaranteed: false,
    dispatchGuarantee: false,
    assignedPlaceRequired: true,
    operatorConfirmationRequired: true,
    airportBoundConfirmation: "PREVIOUS_DAY_18:00",
    routePolicy: "MAJOR_ROADS_PROVIDER_SELECTED_POSSIBLE_SHARED_STOPS",
    validFrom: "2026-03-29",
    validTo: "2026-10-24",
  };
  const keysFor = (c) =>
    isOkushiri(c)
      ? Object.keys(OKUSHIRI_TERMS)
      : isAguni(c)
        ? Object.keys(AGUNI_TERMS)
        : noto(c)
          ? [...Object.keys(notoTerms), "flightService"]
          : termKeys;
  function notoFlightBound(od, context) {
    const b = od.accessTerms.flightService,
      p = context.patternById?.get(b.servicePatternId),
      raw = context.evidence.get(b.sourceFactRef)?.record;
    const airport = id("node", "review:official-airport:能登"),
      outward = od.from === airport,
      names = outward
        ? ["東京国際空港", "能登空港"]
        : ["能登空港", "東京国際空港"];
    invariant(
      p &&
        p.sourceFactRef === b.sourceFactRef &&
        p.mode === "flight" &&
        p.operatorRef === "全日本空輸株式会社" &&
        p.serviceState === "active" &&
        p.strictFactBinding === true &&
        !p.accessContract &&
        verifyEvidence(
          [b.sourceFactRef, ...p.evidenceRefs],
          context.sources,
          context.evidence,
        ) &&
        raw?.kind === "service" &&
        raw.mode === "flight" &&
        raw.operator === p.operatorRef &&
        raw.serviceState === "active" &&
        raw.reviewedFlightCode === b.flightCode &&
        raw.reviewedServiceDate === b.reviewedServiceDate &&
        b.flightCode === (outward ? "NH747" : "NH748") &&
        same(raw.callingStations, names) &&
        p.callingNodes?.length === 2 &&
        p.callingNodes[outward ? 1 : 0].nodeId === airport,
      "NOTO_OD_FLIGHT_SERVICE_BINDING",
    );
    const rides = generatePattern(
      p,
      context.nodes,
      context.sources,
      context.evidence,
      "2026-10-01T00:00:00Z",
      context,
    );
    invariant(
      rides.length === 1 && rides[0].boardAllowed && rides[0].alightAllowed,
      "NOTO_OD_FLIGHT_PASSENGER_SERVICE_REQUIRED",
    );
    return b;
  }
  function terms(c) {
    if (isOkushiri(c)) {
      invariant(
        exact(c, Object.keys(OKUSHIRI_TERMS)) && same(c, OKUSHIRI_TERMS),
        "OKUSHIRI_EXACT_CAPABILITY_TERMS",
      );
      return;
    }
    if (isAguni(c)) {
      invariant(
        exact(c, Object.keys(AGUNI_TERMS)) && same(c, AGUNI_TERMS),
        "AGUNI_EXACT_CAPABILITY_TERMS",
      );
      return c;
    }
    if (noto(c)) {
      invariant(exact(c, keysFor(c)), "NOTO_OD_UNMODELED_CONSTRAINT");
      invariant(
        Object.entries(notoTerms).every(([k, v]) => same(c[k], v)),
        "NOTO_OD_UNSUPPORTED_TERMS",
      );
      invariant(
        exact(c.flightService, [
          "servicePatternId",
          "sourceFactRef",
          "flightCode",
          "reviewedServiceDate",
        ]) &&
          ["NH747", "NH748"].includes(c.flightService.flightCode) &&
          /^\d{8}$/.test(c.flightService.reviewedServiceDate) &&
          validDateOnly(
            c.flightService.reviewedServiceDate.replace(
              /^(\d{4})(\d{2})(\d{2})$/,
              "$1-$2-$3",
            ),
          ) &&
          c.flightService.reviewedServiceDate >= "20260329" &&
          c.flightService.reviewedServiceDate <= "20261024" &&
          typeof c.flightService.servicePatternId === "string" &&
          typeof c.flightService.sourceFactRef === "string",
        "NOTO_OD_FLIGHT_SELECTION_REQUIRED",
      );
      return c;
    }
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
          keysFor(fact.accessTerms).includes(key) &&
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
    invariant(
      exact(bindings, keysFor(fact.accessTerms)),
      "OD_EVERY_PARAMETER_REQUIRES_SOURCE",
    );
    for (const [m, k, v] of pending) m.set(k, v);
    return bindings;
  }
  function validateTermsProof(c, bindings, sources, evidence) {
    terms(c);
    invariant(exact(bindings, keysFor(c)), "OD_PARAMETER_BINDING_REQUIRED");
    for (const key of keysFor(c)) {
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
    if (node?.identityAnchor === "p05:22:01:P05_2451")
      return okushiriFacilityBound(node, context, {
        canonical,
        hash,
        verifyEvidence,
      });
    if (node?.identityAnchor === "p05:22:47:P05_845")
      return aguniFacilityBound(node, context, {
        canonical,
        hash,
        verifyEvidence,
      });
    const { sources, evidence, nativeFacilityByAnchor } = context;
    if (node?.origin === "TASK_086_INDEPENDENT_P05_AND_PUBLIC_FIXED_SERVICE") {
      const n = nativeFacilityByAnchor?.get(node.identityAnchor),
        r = node.identityRecord,
        ep = evidence.get(n?.currentEndpointEvidenceRef)?.record;
      return (
        !!n &&
        n.origin === node.origin &&
        node.identityAnchor === "p05:22:32:P05_220" &&
        same(r, n.identityRecord) &&
        r.archiveSha256 ===
          "f873e16525173d6a5eaf4812e8764b4a524d4497a856aeee4cf00d385eda0423" &&
        hash(r.feature) ===
          "605b88b90ef640ac5f46efb8077651e16b3d117d18837cbc982ec9f3538c724a" &&
        node.canonicalNameJa === r.feature.properties.P05_003 &&
        node.latitude === r.feature.geometry.coordinates[1] &&
        node.longitude === r.feature.geometry.coordinates[0] &&
        node.nodeKind === "public_pickup_facility" &&
        node.mode === "demand_shared_taxi" &&
        same(node.operatorRefs, ["facility:P05-22:32:P05_220"]) &&
        same(node.lineRefs, ["facility:P05-22:32:P05_220"]) &&
        verifyEvidence(node.evidenceRefs, sources, evidence) &&
        node.evidenceRefs.some((ref) => same(evidence.get(ref)?.record, r)) &&
        verifyEvidence([n.currentEndpointEvidenceRef], sources, evidence) &&
        ep.kind === "reviewed_public_fixed_endpoint" &&
        ep.endpointNames.includes(node.canonicalNameJa)
      );
    }
    if (node?.origin === "TASK_086_INDEPENDENT_P04_AND_PUBLIC_OD") {
      const native = nativeFacilityByAnchor?.get(node.identityAnchor),
        r = node.identityRecord;
      return (
        !!native &&
        same(r, native.identityRecord) &&
        r.dataset === "P04-20" &&
        r.nativeRecordId === "DE01_721" &&
        r.pointReferenceId === "pt721" &&
        r.archiveSha256 ===
          "07c60f5a996989e512c53aa42e9ad35bb6e4898bb57b6ba6a55426907427b2f7" &&
        node.identityAnchor === "p04:20:17:DE01_721" &&
        node.canonicalNameJa === "公立宇出津総合病院" &&
        node.canonicalNameJa === r.feature.properties.P04_002 &&
        r.feature.properties.P04_003 === "鳳珠郡能登町字宇出津タ字97番地" &&
        node.latitude === r.feature.geometry.coordinates[1] &&
        node.longitude === r.feature.geometry.coordinates[0] &&
        Number.isFinite(node.latitude) &&
        Number.isFinite(node.longitude) &&
        node.nodeKind === "public_pickup_facility" &&
        node.mode === "demand_shared_taxi" &&
        same(node.operatorRefs, ["facility:P04-20:DE01_721"]) &&
        same(node.lineRefs, ["facility:P04-20:DE01_721"]) &&
        verifyEvidence(node.evidenceRefs, sources, evidence) &&
        node.evidenceRefs.some((ref) => same(evidence.get(ref)?.record, r)) &&
        verifyEvidence(
          [native.currentEndpointEvidenceRef],
          sources,
          evidence,
        ) &&
        same(
          evidence.get(native.currentEndpointEvidenceRef)?.record
            ?.endpointNames,
          ["能登空港", "公立宇出津総合病院"],
        ) &&
        evidence.get(native.currentEndpointEvidenceRef)?.record
          ?.currentHospitalAddress === r.feature.properties.P04_003
      );
    }
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
    if (
      [
        "TASK_086_INDEPENDENT_P05_AND_PUBLIC_OD",
        "TASK_086_INDEPENDENT_P04_AND_PUBLIC_OD",
      ].includes(node.origin)
    )
      return facilityBound(node, context);
    return (
      [
        ["review:official-airport:南大東", "cf03_00059"],
        ["review:official-airport:能登", "cf03_00069"],
        ["review:official-airport:粟国", "cf03_00089"],
        ["review:official-airport:奥尻", "cf03_00019"],
      ].some(
        ([anchor, point]) =>
          node.identityAnchor === anchor &&
          node.nodeId === id("node", anchor) &&
          node.identityRecord?.referencePointId === point,
      ) &&
      node.origin === "TASK_086_INDEPENDENT_C28_AND_CURRENT_ACCESS" &&
      node.nodeKind === "airport" &&
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
    if (isOkushiri(od.accessTerms)) {
      invariant(
        okushiriSourceScope(raw, { canonical }),
        "OKUSHIRI_EXACT_CONDITION_SOURCE_SCOPE",
      );
      invariant(
        od.operator === "奥尻町（ヤマト運輸・町民ドライバー）" &&
          same(
            [...od.endpointNames].sort(),
            ["奥尻空港", "神威脇生活改善センター"].sort(),
          ) &&
          same(
            [...raw.endpointIdentityAnchors].sort(),
            ["review:official-airport:奥尻", "p05:22:01:P05_2451"].sort(),
          ),
        "OKUSHIRI_EXACT_PUBLIC_PAIR",
      );
    } else if (isAguni(od.accessTerms)) {
      invariant(
        aguniSourceScope(raw, { canonical }),
        "AGUNI_EXACT_CONDITION_SOURCE_SCOPE",
      );
      invariant(
        od.operator === "粟国村" &&
          same(
            [...od.endpointNames].sort(),
            ["粟国空港", "粟国村役場"].sort(),
          ) &&
          same(
            [...raw.endpointIdentityAnchors].sort(),
            ["review:official-airport:粟国", "p05:22:47:P05_845"].sort(),
          ),
        "AGUNI_EXACT_PUBLIC_PAIR",
      );
    } else if (noto(od.accessTerms)) {
      invariant(
        od.operator === "株式会社恋路観光バス" &&
          same(
            [...od.endpointNames].sort(),
            ["公立宇出津総合病院", "能登空港"].sort(),
          ) &&
          same(
            [...raw.endpointIdentityAnchors].sort(),
            ["p04:20:17:DE01_721", "review:official-airport:能登"].sort(),
          ),
        "NOTO_OD_EXACT_PUBLIC_PAIR_SCOPE",
      );
      notoFlightBound(od, context);
    } else
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
      accessContract: {
        kind: noto(od.accessTerms)
          ? "PUBLIC_FLIGHT_ASSOCIATED_DYNAMIC_OD"
          : "PUBLIC_PHONE_DYNAMIC_OD",
        ...od.accessTerms,
      },
      accessContractSha256: hash(od.accessTerms),
      topologyEvidenceRefs: [
        ...od.evidenceRefs,
        ...new Set(
          Object.keys(od.parameterEvidenceRefs)
            .sort()
            .map((key) => od.parameterEvidenceRefs[key]),
        ),
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
      if (context?.kind === CAPABILITY_KIND) {
        const od = bindEdge(edge, context.odValidationContext);
        return (
          (isAguni(od.accessTerms) || isOkushiri(od.accessTerms)) &&
          capabilityAllows(context, od, context.odValidationContext, {
            hash,
            canonical,
          })
        );
      }
      if (
        context?.kind !== "EXPLICIT_CONDITIONAL_PLANNING" ||
        context.publicStructureOnly !== true
      )
        return false;
      const od = bindEdge(edge, context.odValidationContext),
        c = od.accessTerms;
      if (isAguni(c) || isOkushiri(c)) return false; // An actual/request planning context is not a structural capability review.
      if (!context.acceptedContracts?.includes(hash(c))) return false;
      const i = context.odReservationIntents?.find((x) => x.odId === od.odId);
      if (noto(c)) {
        if (
          !i ||
          i.kind !== "REQUEST_BEFORE_PICKUP" ||
          !c.channels.includes(i.channel) ||
          i.profile !== c.profile ||
          i.payment !== c.payment ||
          i.flightCode !== c.flightService.flightCode ||
          i.flightServicePatternId !== c.flightService.servicePatternId ||
          i.flightServiceStatus !== "PLANNED_OPERATING" ||
          i.acceptsOperatorAssignedPlace !== true ||
          i.requestsOperatorConfirmation !== true ||
          i.acceptsNoDispatchGuarantee !== true
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
          pickup <= request
        )
          return false;
        const date = local(pickup).slice(0, 10),
          serviceDate = c.flightService.reviewedServiceDate;
        const deadline = Date.parse(date + "T15:00:00+09:00") - 86400000;
        return (
          validDateOnly(context.travelDate) &&
          context.travelDate === date &&
          date.replaceAll("-", "") === serviceDate &&
          date >= c.validFrom &&
          date <= c.validTo &&
          request <= deadline
        );
      }
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
