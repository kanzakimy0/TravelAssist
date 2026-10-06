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
  validateFlightDependency,
  onboardRequestFactory,
  validateOnboardNode,
  validateQualifiedHotelNode,
  hamayusoAccessFactory,
  validateHamayusoNode,
  airPassengerShuttleFactory,
  generatePassengerFlight,
}) {
  if (
    ![canonical, hash, invariant, verifyEvidence].every(
      (x) => typeof x === "function",
    )
  )
    throw new TypeError("ACCESS_CALLBACKS_REQUIRED");
  const hamayuso = hamayusoAccessFactory?.({
    canonical,
    hash,
    invariant,
    verifyEvidence,
    validateNode: validateHamayusoNode,
  });
  const ONBOARD_KIND = "PUBLIC_BUS_ONBOARD_REQUEST";
  const onboard = onboardRequestFactory?.({
    canonical,
    hash,
    invariant,
    validDateOnly,
    verifyEvidence,
    validateNode: validateOnboardNode,
  });
  const AIR_PASSENGER_KIND = "AIR_PASSENGER_PUBLIC_SHUTTLE";
  const airPassenger = airPassengerShuttleFactory?.({
    canonical,
    hash,
    invariant,
    verifyEvidence,
    validDateOnly,
    validateNode: validateOnboardNode,
    generateFlightPattern: generatePassengerFlight,
  });
  const exactKeys = (o, keys) =>
    o && Object.keys(o).every((k) => keys.includes(k));
  function validatePricia(c) {
    invariant(
      exactKeys(c, [
        "schemaVersion",
        "kind",
        "profile",
        "audience",
        "eligibilityKeys",
        "hotelIdentityAnchor",
        "qualificationBasis",
        "contact",
        "flightAssociation",
        "boardingRules",
        "unknowns",
        "sourceEvidenceRefs",
      ]),
      "PRICIA_UNMODELED_CONDITION",
    );
    invariant(
      c.schemaVersion === 1 &&
        c.kind === "QUALIFIED_HOTEL_SHUTTLE" &&
        c.profile === "PRICIA_LODGING_GUEST_SHUTTLE_V1" &&
        c.audience === "ELIGIBILITY_RESTRICTED" &&
        canonical(c.eligibilityKeys) === canonical(["pricia:lodging-guest"]) &&
        c.hotelIdentityAnchor === "osm:way:1353020075:pricia-hotel" &&
        c.qualificationBasis ===
          "OFFICIAL_HOTEL_ACCESS_CUSTOMER_CONTEXT_NOT_EXCLUSIVE_NON_GUEST_BAN",
      "PRICIA_ELIGIBILITY",
    );
    invariant(
      canonical(c.contact) ===
        canonical({
          advanceContact: "REQUESTED_ON_CURRENT_ACCESS_PAGE",
          unbookedBoarding:
            "ALLOWED_IN_OPERATOR_SHUTTLE_DESCRIPTION_WITH_DEPARTURE_RISK",
          deadline: null,
        }),
      "PRICIA_CONTACT_TERMS",
    );
    invariant(
      ["ARRIVAL", "DEPARTURE"].includes(c.flightAssociation) &&
        canonical(c.boardingRules) ===
          canonical({
            reportToStaff: true,
            departureMayOccurWithoutUnreportedPassenger: true,
            hotelDepartureLobbyLeadMinutes: 10,
            otherDestinationsAllowed: false,
          }) &&
        canonical(c.unknowns) ===
          canonical({
            legalMotorCarrier: null,
            exactTimetable: null,
            price: null,
            dispatchGuarantee: null,
          }),
      "PRICIA_OPERATION_TERMS",
    );
    invariant(
      Array.isArray(c.sourceEvidenceRefs) &&
        c.sourceEvidenceRefs.length > 0 &&
        new Set(c.sourceEvidenceRefs).size === c.sourceEvidenceRefs.length,
      "PRICIA_SOURCE_REFS",
    );
    return c;
  }
  function allowsPricia(edge, context) {
    const c = edge.accessContract,
      v = context?.odValidationContext;
    if (
      !v ||
      context.kind !== "EXPLICIT_CONDITIONAL_PLANNING" ||
      context.publicStructureOnly === true ||
      !context.acceptedContracts?.includes(hash(c)) ||
      !context.eligibilityKeys?.includes("pricia:lodging-guest") ||
      context.hotelIdentityAnchor !== c.hotelIdentityAnchor ||
      context.qualificationStatus !== "ACTUAL_LODGING_GUEST" ||
      context.flightServiceStatus !== "PLANNED_OPERATING" ||
      context.acceptsFlightAssociatedOnly !== true ||
      context.acceptsNoDispatchGuarantee !== true ||
      context.acknowledgesStaffReporting !== true ||
      context.advanceContactStatus !== "REPORTED_FOR_THIS_SHUTTLE"
    )
      return false;
    try {
      bindEdge(
        edge,
        v.sources,
        v.evidence,
        v.patternById?.get(edge.servicePatternRef),
        v,
      );
      const hotel = [...v.nodes.values()].find(
        (n) => n.identityAnchor === c.hotelIdentityAnchor,
      );
      if (
        !hotel ||
        hotel.decision !== "ADMIT_TASK_086_TOPOLOGY" ||
        !validateQualifiedHotelNode?.(hotel, v)
      )
        return false;
      return true;
    } catch {
      return false;
    }
  }
  function validateAccessContract(c) {
    if (c?.kind === "QUALIFIED_PACKAGE_HOTEL_SHUTTLE") {
      invariant(hamayuso, "HAMAYUSO_FACTORY_REQUIRED");
      return hamayuso.validate(c);
    }
    if (c?.kind === AIR_PASSENGER_KIND) {
      invariant(airPassenger, "AIR_SHUTTLE_VALIDATOR_REQUIRED");
      return airPassenger.validate(c);
    }
    if (c?.kind === "QUALIFIED_HOTEL_SHUTTLE") return validatePricia(c);
    if (c?.kind === ONBOARD_KIND) {
      invariant(onboard, "ONBOARD_CONTRACT_VALIDATOR_REQUIRED");
      return onboard.validate(c);
    }
    invariant(
      [1, 2, 3].includes(c?.schemaVersion) &&
        c.kind === "BOOKABLE_PASSENGER_SERVICE",
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
        ...(c.schemaVersion === 2 ? ["payment", "passengerRules"] : []),
        ...(c.schemaVersion === 3
          ? ["flightService", "flightDispatch", "passengerRules"]
          : []),
      ]) &&
        exactKeys(c.reservation, [
          "requirement",
          "method",
          "deadline",
          "noBookingNoDispatch",
          ...(c.schemaVersion === 2 ? ["reception"] : []),
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
    if (c.schemaVersion === 2) {
      const reception = c.reservation.reception;
      invariant(
        exactKeys(reception, ["startLocalTime", "endLocalTime", "timeZone"]) &&
          reception?.startLocalTime === "09:00" &&
          reception.endLocalTime === "17:00" &&
          reception.timeZone === "Asia/Tokyo",
        "ACCESS_PHONE_RECEPTION_REQUIRED",
      );
      invariant(c.payment === "CASH_ONLY", "ACCESS_PAYMENT_REQUIRED");
      const rules = c.passengerRules;
      invariant(
        exactKeys(rules, [
          "petsAllowed",
          "dangerousGoodsAllowed",
          "smokingAllowed",
          "drinkingAllowed",
          "largeLuggageNoticeThresholdMetres",
          "largeLuggageNoticeAtBooking",
          "cancellationNoticeHours",
          "bookingDetailsRequired",
        ]) &&
          rules?.petsAllowed === false &&
          rules.dangerousGoodsAllowed === false &&
          rules.smokingAllowed === false &&
          rules.drinkingAllowed === false &&
          rules.largeLuggageNoticeThresholdMetres === 1.5 &&
          rules.largeLuggageNoticeAtBooking === true &&
          rules.cancellationNoticeHours === 2 &&
          canonical(rules.bookingDetailsRequired) ===
            canonical([
              "NAME",
              "PHONE",
              "PASSENGER_COUNT",
              "TRAVEL_DATE",
              "SERVICE",
              "PICKUP",
              "DROPOFF",
            ]),
        "ACCESS_PASSENGER_RULES_REQUIRED",
      );
    }
    if (c.schemaVersion === 3) {
      const b = c.flightService,
        d = c.flightDispatch,
        r = c.passengerRules;
      invariant(
        exactKeys(b, [
          "servicePatternId",
          "sourceFactRef",
          "flightCode",
          "reviewedServiceDate",
        ]) &&
          [b?.servicePatternId, b?.sourceFactRef, b?.flightCode].every(
            (x) => typeof x === "string" && x.length > 0,
          ) &&
          /^\d{8}$/.test(b.reviewedServiceDate) &&
          validDateOnly(
            b.reviewedServiceDate.replace(
              /^(\d{4})(\d{2})(\d{2})$/,
              "$1-$2-$3",
            ),
          ),
        "ACCESS_FLIGHT_SERVICE_REQUIRED",
      );
      invariant(
        exactKeys(d, [
          "airportNodeId",
          "relation",
          "delay",
          "cancellation",
          "diversion",
          "noBookingOrCapacityGuarantee",
        ]) &&
          typeof d?.airportNodeId === "string" &&
          d.airportNodeId.length > 0 &&
          ["ARRIVAL", "DEPARTURE"].includes(d.relation) &&
          d.noBookingOrCapacityGuarantee === true &&
          (d.relation === "ARRIVAL"
            ? d.delay === "WAIT_FOR_ARRIVAL" &&
              d.cancellation === "NO_DISPATCH" &&
              d.diversion === "NO_DISPATCH"
            : d.delay === "SCHEDULED_DEPARTURE" &&
              d.cancellation === "NO_DISPATCH_OR_RETURN_IF_ALREADY_STARTED" &&
              d.diversion === "NOT_STATED"),
        "ACCESS_FLIGHT_DISPATCH_RULES_REQUIRED",
      );
      invariant(
        exactKeys(r, [
          "offStopPickupDropoffAllowed",
          "luggageMustFitTrunk",
          "luggageConsultAtBooking",
          "smokingAllowed",
          "drinkingAllowed",
          "arrivalLeadMinutes",
        ]) &&
          r?.offStopPickupDropoffAllowed === false &&
          r.luggageMustFitTrunk === true &&
          r.luggageConsultAtBooking === true &&
          r.smokingAllowed === false &&
          r.drinkingAllowed === false &&
          r.arrivalLeadMinutes === 5,
        "ACCESS_FIXED_PASSENGER_RULES_REQUIRED",
      );
      invariant(
        c.audience === "PUBLIC" &&
          c.validFrom === "2026-03-29" &&
          c.validTo === "2026-10-24" &&
          b.reviewedServiceDate >= c.validFrom.replaceAll("-", "") &&
          b.reviewedServiceDate <= c.validTo.replaceAll("-", ""),
        "ACCESS_FLIGHT_PROFILE_VALIDITY",
      );
    }
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
  function bindPattern(pattern, sources, evidence, validationContext) {
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
      invariant(
        !bindings.some((x) => airPassenger?.restrictedFact(x.fact)),
        "AIR_SHUTTLE_CONTRACT_STRIPPED",
      );
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
    if (c.kind === "QUALIFIED_PACKAGE_HOTEL_SHUTTLE") {
      hamayuso.sources(c, sources, evidence);
      hamayuso.pattern(c, pattern, validationContext);
    }
    if (c.kind === "QUALIFIED_HOTEL_SHUTTLE") {
      const expected = [
        [
          "https://www.pricia.co.jp/access/",
          "c4ecb6d645e2cd250ff5c6c4558cf0ee63a88b27815d3b4469783b61ad23a1b8",
        ],
        [
          "https://www.pricia.co.jp/staffblog/hotel/25137/",
          "d631711d193aebde5b6e68f8e6eefedbba375349ee1df2b3cefc1af4736a5439",
        ],
      ];
      const actual = c.sourceEvidenceRefs
        .map((ref) => {
          const row = evidence.get(ref),
            source = sources.get(row?.sourceId);
          return [
            source?.url,
            source?.evidenceContentSha256 ?? source?.contentSha256,
          ];
        })
        .sort((a, b) => a[0].localeCompare(b[0]));
      invariant(
        canonical(actual) === canonical(expected),
        "PRICIA_EXACT_CONDITION_SOURCE_BINDING",
      );
    }
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
    if (c.schemaVersion === 3) {
      invariant(
        typeof validateFlightDependency === "function",
        "ACCESS_ACTUAL_FLIGHT_VALIDATOR_REQUIRED",
      );
      validateFlightDependency(c, pattern, validationContext);
    }
    if (bindings.some((x) => airPassenger?.restrictedFact(x.fact)))
      invariant(c.kind === AIR_PASSENGER_KIND, "AIR_SHUTTLE_CONTRACT_REPLACED");
    if (c.kind === AIR_PASSENGER_KIND)
      airPassenger.pattern(c, pattern, bindings, validationContext);
    if (c.kind === ONBOARD_KIND)
      onboard.pattern(c, pattern, bindings, validationContext);
    return c;
  }
  function edgeFields(c) {
    if (c === null) return {};
    validateAccessContract(c);
    return {
      accessContract: structuredClone(c),
      accessContractSha256: hash(c),
      conditionalTopology: true,
      ...(c.kind === AIR_PASSENGER_KIND
        ? { serviceAccessProfile: AIR_PASSENGER_KIND }
        : {}),
    };
  }
  function bindEdge(
    edge,
    sources,
    evidence,
    expectedPattern,
    validationContext,
  ) {
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
      invariant(
        !bindings.some((x) => airPassenger?.restrictedFact(x.fact)),
        "AIR_SHUTTLE_CONTRACT_STRIPPED",
      );
      invariant(!required, "REQUIRED_RESERVATION_WITHOUT_ACCESS_CONTRACT");
      return null;
    }
    invariant(
      expectedPattern?.servicePatternId === edge.servicePatternRef,
      "ACCESS_PATTERN_REGISTRY_REQUIRED",
    );
    const expected = bindPattern(
      expectedPattern,
      sources,
      evidence,
      validationContext,
    );
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
    if (c.kind === AIR_PASSENGER_KIND)
      airPassenger.edge(c, edge, expectedPattern);
    if (c.kind === ONBOARD_KIND) onboard.edge(c, edge, expectedPattern);
    return c;
  }
  function allowsEdge(edge, context) {
    if (airPassenger?.restrictedEdge(edge, context?.odValidationContext))
      return airPassenger.allows(edge, context, bindEdge);
    const registered = context?.odValidationContext?.patternById?.get(
      edge.servicePatternRef,
    );
    if (
      edge.accessContract?.kind === ONBOARD_KIND ||
      registered?.accessContract?.kind === ONBOARD_KIND
    )
      return onboard.allows(edge, context, bindEdge);
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
    if (c.kind === "QUALIFIED_PACKAGE_HOTEL_SHUTTLE")
      return hamayuso.allows(edge, context, bindEdge);
    if (c.kind === "QUALIFIED_HOTEL_SHUTTLE")
      return allowsPricia(edge, context);
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
    if (c.schemaVersion === 2) {
      const requestInstant = strictPlanningInstant(intent.requestAt);
      if (
        requestInstant === null ||
        requestInstant < planningInstant ||
        requestInstant > deadline
      )
        return false;
      const local = new Date(requestInstant + 9 * 3600000).toISOString();
      const clock = local.slice(11, 23);
      if (clock < "09:00:00.000" || clock > "17:00:00.000") return false;
      if (
        intent.channel !== "PHONE" ||
        intent.payment !== "CASH" ||
        intent.acceptedPassengerRulesSha256 !== hash(c.passengerRules)
      )
        return false;
      // A feasible future telephone request is a planning condition, never an accepted booking.
    }
    if (c.schemaVersion === 3) {
      const v = context.odValidationContext,
        b = c.flightService;
      if (
        !v ||
        context.travelDate.replaceAll("-", "") !== b.reviewedServiceDate ||
        intent.channel !== "PHONE" ||
        intent.flightCode !== b.flightCode ||
        intent.flightServicePatternId !== b.servicePatternId ||
        intent.flightServiceStatus !== "PLANNED_OPERATING" ||
        intent.acceptedPassengerRulesSha256 !== hash(c.passengerRules) ||
        intent.acceptsNoDispatchGuarantee !== true
      )
        return false;
      try {
        const expected = v.patternById?.get(edge.servicePatternRef);
        bindEdge(edge, v.sources, v.evidence, expected, v);
        const digest = hash({
          sources: [...v.sources].sort(),
          evidence: [...v.evidence].sort(),
          nodes: [...v.nodes].sort(),
          patterns: [...v.patternById].sort(),
          dynamicOD: [...(v.dynamicODById ?? [])].sort(),
          nativeFacilities: [...(v.nativeFacilityByAnchor ?? [])].sort(),
        });
        if (context.evidenceContextSha256 !== digest) return false;
      } catch {
        return false;
      }
    }
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
