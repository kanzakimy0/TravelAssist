// Pure TASK086 access-contract draft. No imports, filesystem, graph traversal or global state.
// The caller supplies existing canonical/hash/invariant/verifyEvidence implementations.
export function validDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
export function strictPlanningInstant(value) {
  if (typeof value !== "string") return null;
  const m = value.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/,
  );
  if (
    !m ||
    !validDateOnly(m[1]) ||
    Number(m[2]) > 23 ||
    Number(m[3]) > 59 ||
    Number(m[4]) > 59
  )
    return null;
  if (m[5] !== "Z") {
    const h = Number(m[5].slice(1, 3)),
      min = Number(m[5].slice(4, 6));
    if (h > 14 || min > 59 || (h === 14 && min !== 0)) return null;
  }
  const result = Date.parse(value);
  return Number.isFinite(result) ? result : null;
}

export function createServiceAccessContract({
  canonical,
  hash,
  invariant,
  verifyEvidence,
}) {
  if (
    ![canonical, hash, invariant, verifyEvidence].every(
      (x) => typeof x === "function",
    )
  )
    throw new TypeError("ACCESS_CALLBACKS_REQUIRED");
  const exactKeys = (o, keys) =>
    o && Object.keys(o).every((k) => keys.includes(k));
  function validateAccessContract(c) {
    invariant(
      c?.schemaVersion === 1 && c.kind === "BOOKABLE_PASSENGER_SERVICE",
      "ACCESS_CONTRACT_KIND",
    );
    invariant(
      exactKeys(c, [
        "schemaVersion",
        "kind",
        "audience",
        "eligibilityKeys",
        "reservation",
        "validFrom",
        "validTo",
        "operatingDays",
        "sourceEvidenceRefs",
      ]) &&
        exactKeys(c.reservation, [
          "requirement",
          "method",
          "deadline",
          "noBookingNoDispatch",
        ]) &&
        exactKeys(c.reservation.deadline, [
          "daysBefore",
          "localTime",
          "timeZone",
        ]),
      "UNMODELED_ACCESS_CONSTRAINT",
    );
    invariant(
      ["PUBLIC", "ELIGIBILITY_RESTRICTED"].includes(c.audience),
      "ACCESS_AUDIENCE",
    );
    invariant(
      Array.isArray(c.eligibilityKeys) &&
        (c.audience === "PUBLIC"
          ? c.eligibilityKeys.length === 0
          : c.eligibilityKeys.length > 0),
      "ACCESS_ELIGIBILITY",
    );
    invariant(
      c.eligibilityKeys.every((x) => typeof x === "string" && x.length > 0) &&
        new Set(c.eligibilityKeys).size === c.eligibilityKeys.length,
      "ACCESS_ELIGIBILITY_KEYS",
    );
    invariant(
      c.reservation?.requirement === "REQUIRED" &&
        c.reservation.method === "PHONE" &&
        c.reservation.noBookingNoDispatch === true,
      "ACCESS_RESERVATION",
    );
    invariant(
      c.reservation.deadline?.daysBefore === 1 &&
        c.reservation.deadline.localTime === "17:00" &&
        c.reservation.deadline.timeZone === "Asia/Tokyo",
      "UNSUPPORTED_RESERVATION_DEADLINE",
    );
    invariant(
      validDateOnly(c.validFrom) &&
        validDateOnly(c.validTo) &&
        c.validFrom <= c.validTo &&
        c.operatingDays === "DAILY",
      "ACCESS_VALIDITY",
    );
    invariant(
      Array.isArray(c.sourceEvidenceRefs) &&
        c.sourceEvidenceRefs.length > 0 &&
        c.sourceEvidenceRefs.every(
          (x) => typeof x === "string" && x.length > 0,
        ) &&
        new Set(c.sourceEvidenceRefs).size === c.sourceEvidenceRefs.length,
      "ACCESS_SOURCE_REFS",
    );
    return c;
  }

  function requiresReservation(record) {
    return (
      ["required", "REQUIRED"].includes(record?.reservation) ||
      ["required", "REQUIRED"].includes(record?.metrics?.reservation?.value)
    );
  }
  const hasContract = (x) => x != null && Object.hasOwn(x, "accessContract");
  function resolvedFacts(refs, evidence) {
    return (refs ?? [])
      .map((ref) => ({ ref, record: evidence.get(ref)?.record }))
      .filter((x) => x.record?.sourceFactRef)
      .map((x) => ({
        ...x,
        factRef: x.record.sourceFactRef,
        fact: evidence.get(x.record.sourceFactRef)?.record,
      }));
  }
  function bindPattern(pattern, sources, evidence) {
    const bindings = resolvedFacts(pattern.evidenceRefs, evidence);
    const any =
      hasContract(pattern) ||
      bindings.some((x) => hasContract(x.record) || hasContract(x.fact));
    const required =
      requiresReservation(pattern) ||
      bindings.some(
        (x) => requiresReservation(x.record) || requiresReservation(x.fact),
      );
    if (!any) {
      invariant(!required, "REQUIRED_RESERVATION_WITHOUT_ACCESS_CONTRACT");
      return null;
    }
    const c = validateAccessContract(pattern.accessContract);
    invariant(
      pattern.strictFactBinding === true &&
        pattern.sequenceEvidence === "OFFICIAL_CALLING_SEQUENCE",
      "ACCESS_STRICT_OFFICIAL_ONLY",
    );
    invariant(
      verifyEvidence(c.sourceEvidenceRefs, sources, evidence),
      "ACCESS_CONDITION_PROVENANCE",
    );
    const { sourceEvidenceRefs, ...terms } = c;
    invariant(
      sourceEvidenceRefs.every((ref) => {
        const r = evidence.get(ref)?.record;
        return (
          r?.kind === "REVIEWED_SERVICE_ACCESS_CONDITION" &&
          canonical(r.accessTerms) === canonical(terms)
        );
      }),
      "ACCESS_CONDITION_TERMS_BINDING",
    );
    invariant(
      verifyEvidence(pattern.evidenceRefs, sources, evidence) &&
        bindings.length === pattern.evidenceRefs.length,
      "ACCESS_PATTERN_EVIDENCE",
    );
    invariant(
      bindings.every(
        ({ record, factRef, fact }) =>
          verifyEvidence([factRef], sources, evidence) &&
          fact?.kind === "service" &&
          canonical(record.accessContract) === canonical(c) &&
          canonical(fact.accessContract) === canonical(c) &&
          c.sourceEvidenceRefs.every((ref) =>
            fact.corroboratingConditionEvidenceRefs?.includes(ref),
          ),
      ),
      "ACCESS_CONTRACT_SOURCE_BINDING",
    );
    return c;
  }
  function edgeFields(c) {
    if (c === null) return {};
    validateAccessContract(c);
    return {
      accessContract: structuredClone(c),
      accessContractSha256: hash(c),
      conditionalTopology: true,
    };
  }
  function bindEdge(edge, sources, evidence, expectedPattern) {
    const bindings = [
      ...resolvedFacts(edge.topologyEvidenceRefs, evidence),
      ...resolvedFacts(expectedPattern?.evidenceRefs, evidence),
    ];
    const any =
      hasContract(edge) ||
      edge.conditionalTopology !== undefined ||
      edge.accessContractSha256 !== undefined ||
      hasContract(expectedPattern) ||
      bindings.some((x) => hasContract(x.record) || hasContract(x.fact));
    const required =
      requiresReservation(edge) ||
      requiresReservation(expectedPattern) ||
      bindings.some(
        (x) => requiresReservation(x.record) || requiresReservation(x.fact),
      );
    if (!any) {
      invariant(!required, "REQUIRED_RESERVATION_WITHOUT_ACCESS_CONTRACT");
      return null;
    }
    invariant(
      expectedPattern?.servicePatternId === edge.servicePatternRef,
      "ACCESS_PATTERN_REGISTRY_REQUIRED",
    );
    const expected = bindPattern(expectedPattern, sources, evidence);
    invariant(
      expected !== null &&
        canonical(expected) === canonical(edge.accessContract),
      "EDGE_ACCESS_CONTRACT_STRIPPED_OR_CHANGED",
    );
    const c = validateAccessContract(edge.accessContract);
    invariant(
      edge.conditionalTopology === true &&
        edge.accessContractSha256 === hash(c),
      "EDGE_ACCESS_BINDING",
    );
    invariant(
      edge.edgeKind === "service_segment",
      "CONDITIONAL_SHORTCUT_NOT_SUPPORTED",
    );
    invariant(
      verifyEvidence(edge.topologyEvidenceRefs, sources, evidence) &&
        verifyEvidence(c.sourceEvidenceRefs, sources, evidence),
      "EDGE_ACCESS_EVIDENCE",
    );
    invariant(
      expectedPattern.evidenceRefs.every((ref) =>
        edge.topologyEvidenceRefs.includes(ref),
      ) &&
        c.sourceEvidenceRefs.every((ref) =>
          edge.topologyEvidenceRefs.includes(ref),
        ),
      "EDGE_ACCESS_REQUIRED_REFS_STRIPPED",
    );
    invariant(
      bindings.length > 0 &&
        bindings.every(
          ({ record, factRef, fact }) =>
            verifyEvidence([factRef], sources, evidence) &&
            canonical(record.accessContract) === canonical(c) &&
            canonical(fact?.accessContract) === canonical(c),
        ),
      "EDGE_ACCESS_FACT_BINDING",
    );
    return c;
  }
  function allowsEdge(edge, context) {
    if (
      !hasContract(edge) &&
      edge.conditionalTopology === undefined &&
      edge.accessContractSha256 === undefined
    )
      return !requiresReservation(edge);
    const c = edge.accessContract;
    try {
      validateAccessContract(c);
    } catch {
      return false;
    }
    if (!edge.conditionalTopology || edge.accessContractSha256 !== hash(c))
      return false;
    if (
      context?.kind !== "EXPLICIT_CONDITIONAL_PLANNING" ||
      !Array.isArray(context.acceptedContracts) ||
      !context.acceptedContracts.includes(edge.accessContractSha256)
    )
      return false;
    if (
      !validDateOnly(context.travelDate) ||
      context.travelDate < c.validFrom ||
      context.travelDate > c.validTo
    )
      return false;
    if (!Array.isArray(context.reservationIntents)) return false;
    const intent = context.reservationIntents.find(
      (x) =>
        x.contractSha256 === edge.accessContractSha256 &&
        x.travelDate === context.travelDate &&
        x.kind === "REQUEST_BEFORE_DEADLINE",
    );
    const deadline =
      Date.parse(context.travelDate + "T17:00:00+09:00") - 86400000;
    const planningInstant = strictPlanningInstant(intent?.planningAt);
    if (!intent || planningInstant === null || planningInstant > deadline)
      return false;
    // Do not assert a reservation exists or automatically satisfy a hotel/flight-user restriction.
    if (
      c.eligibilityKeys.length &&
      (!Array.isArray(context.eligibilityKeys) ||
        c.eligibilityKeys.some((k) => !context.eligibilityKeys.includes(k)))
    )
      return false;
    if (context.publicStructureOnly === true && c.audience !== "PUBLIC")
      return false;
    return true;
  }

  return Object.freeze({
    validateAccessContract,
    requiresReservation,
    bindPattern,
    edgeFields,
    bindEdge,
    allowsEdge,
  });
}
