// Narrow fixed public bus contract. No booking, timetable API, or inferred passenger purpose.
export const ONBOARD_KIND = "PUBLIC_BUS_ONBOARD_REQUEST";
export function createOnboardRequest({
  canonical,
  hash,
  invariant,
  validDateOnly,
  verifyEvidence,
  validateNode,
}) {
  const exact = (o, keys) =>
    o && canonical(Object.keys(o).sort()) === canonical([...keys].sort());
  const rules = {
    listedBoardingStopsOnly: true,
    surfboardsAllowed: false,
    inconveniencingLargeLuggageAllowed: false,
    excursion: {
      maximumPerRun: 6,
      mayRefuseOrRequireAlighting: true,
      excludedPeriods: ["GOLDEN_WEEK", "JUL21_AUG31", "SILVER_WEEK"],
      unresolvedAnnualHolidayDates: true,
    },
  };
  function validate(c) {
    invariant(
      exact(c, [
        "schemaVersion",
        "kind",
        "audience",
        "eligibilityKeys",
        "reviewedServiceDate",
        "driverRequestDropoffNodeIds",
        "passengerRules",
        "sourceEvidenceRefs",
      ]) &&
        c.schemaVersion === 1 &&
        c.kind === ONBOARD_KIND,
      "ONBOARD_SCHEMA",
    );
    invariant(
      c.audience === "PUBLIC" && canonical(c.eligibilityKeys) === "[]",
      "ONBOARD_PUBLIC_AUDIENCE",
    );
    invariant(validDateOnly(c.reviewedServiceDate), "ONBOARD_REVIEWED_DATE");
    invariant(
      Array.isArray(c.driverRequestDropoffNodeIds) &&
        c.driverRequestDropoffNodeIds.every(
          (x) => typeof x === "string" && x.length > 0,
        ) &&
        new Set(c.driverRequestDropoffNodeIds).size ===
          c.driverRequestDropoffNodeIds.length,
      "ONBOARD_REQUEST_POINTS",
    );
    invariant(
      canonical(c.passengerRules) === canonical(rules),
      "ONBOARD_PASSENGER_RULES",
    );
    invariant(
      Array.isArray(c.sourceEvidenceRefs) &&
        c.sourceEvidenceRefs.length > 0 &&
        c.sourceEvidenceRefs.every((x) => typeof x === "string" && x) &&
        new Set(c.sourceEvidenceRefs).size === c.sourceEvidenceRefs.length,
      "ONBOARD_SOURCE_REFS",
    );
    return c;
  }
  function pattern(c, p, bindings, v) {
    validate(c);
    invariant(
      v?.nodes instanceof Map && typeof validateNode === "function",
      "ONBOARD_NODE_REGISTRY_REQUIRED",
    );
    invariant(
      p.callingNodes.every((call) => {
        const n = v.nodes.get(call.nodeId);
        return n && validateNode(n, v);
      }),
      "ONBOARD_NODE_ADMISSION_INVALID",
    );
    invariant(
      p.mode === "local_bus" &&
        p.serviceState === "active" &&
        p.callingNodes.length >= 2,
      "ONBOARD_ACTIVE_FIXED_BUS",
    );
    invariant(
      p.callingNodes.every(
        (n) =>
          ["0", "1"].includes(n.pickupType) &&
          ["0", "1", "3"].includes(n.dropOffType),
      ),
      "ONBOARD_RESTRICTION_VALUES",
    );
    const requested = p.callingNodes
      .filter((n) => n.dropOffType === "3")
      .map((n) => n.nodeId);
    invariant(
      canonical(requested) === canonical(c.driverRequestDropoffNodeIds),
      "ONBOARD_REQUEST_CALL_BINDING",
    );
    for (const { fact, record } of bindings) {
      invariant(
        canonical(record.callingNodes) === canonical(p.callingNodes) &&
          canonical(fact.callingRestrictions) ===
            canonical(
              p.callingNodes.map(({ pickupType, dropOffType }) => ({
                pickupType,
                dropOffType,
              })),
            ),
        "ONBOARD_RAW_RESTRICTIONS_BINDING",
      );
      invariant(
        fact.parentCallingSequence &&
          Array.isArray(fact.parentCallingSequence.calls),
        "ONBOARD_PARENT_REQUIRED",
      );
      const parent = fact.parentCallingSequence;
      invariant(
        Number.isInteger(parent.selectedStartIndex) &&
          parent.selectedStartIndex >= 0 &&
          parent.selectedEndIndex ===
            parent.selectedStartIndex + fact.callingStations.length - 1 &&
          parent.selectedEndIndex < parent.calls.length,
        "ONBOARD_CONTIGUOUS_SECTION",
      );
      invariant(
        canonical(
          parent.calls.slice(
            parent.selectedStartIndex,
            parent.selectedEndIndex + 1,
          ),
        ) === canonical(fact.callingStations),
        "ONBOARD_PARENT_CALL_BINDING",
      );
      invariant(
        typeof parent.sourceTripLabel === "string" &&
          parent.sourceTripLabel.length > 0,
        "ONBOARD_PARENT_DIRECTION",
      );
      invariant(
        !["required", "REQUIRED"].includes(fact.reservation),
        "ONBOARD_NOT_ADVANCE_BOOKING",
      );
    }
  }
  function edge(c, e, p) {
    const i = e.segmentIndex,
      a = p.callingNodes[i],
      b = p.callingNodes[i + 1];
    invariant(
      a &&
        b &&
        e.fromTransportNodeId === a.nodeId &&
        e.toTransportNodeId === b.nodeId &&
        e.boardAllowed === (a.pickupType !== "1") &&
        e.alightAllowed === (b.dropOffType !== "1"),
      "ONBOARD_EDGE_CALL_BINDING",
    );
  }
  function allows(e, context, bindEdge) {
    const c = e.accessContract,
      v = context?.odValidationContext;
    try {
      validate(c);
      if (!v || !(v.patternById instanceof Map)) return false;
      const p = v.patternById.get(e.servicePatternRef);
      bindEdge(e, v.sources, v.evidence, p, v);
      if (
        !p.callingNodes.every((call) => {
          const n = v.nodes?.get(call.nodeId);
          return (
            n?.decision === "ADMIT_TASK_086_TOPOLOGY" &&
            verifyEvidence(n.evidenceRefs, v.sources, v.evidence) &&
            typeof validateNode === "function" &&
            validateNode(n, v)
          );
        })
      )
        return false;
      if (
        context.kind !== "EXPLICIT_CONDITIONAL_PLANNING" ||
        context.travelDate !== c.reviewedServiceDate ||
        !context.acceptedContracts?.includes(hash(c))
      )
        return false;
      const intent = context.onboardIntents?.find(
        (x) =>
          x.contractSha256 === hash(c) && x.travelDate === context.travelDate,
      );
      // A visitor may make an ordinary journey. Never infer purpose from citizenship, airport, or route.
      // Excursions remain unsupported until source-bound annual GW/SW dates and per-run capacity can be checked.
      if (
        !intent ||
        intent.purpose !== "ORDINARY_POINT_TO_POINT" ||
        intent.purposeExplicitlyDeclared !== true ||
        intent.acceptedPassengerRulesSha256 !== hash(c.passengerRules) ||
        intent.carriesSurfboard !== false ||
        intent.carriesInconveniencingLargeLuggage !== false ||
        intent.acceptsNoSeatOrDispatchGuarantee !== true
      )
        return false;
      if (
        c.driverRequestDropoffNodeIds.length &&
        (intent.driverRequestMethod !== "ONBOARD_TELL_DRIVER" ||
          canonical(intent.requestedDropoffNodeIds) !==
            canonical(c.driverRequestDropoffNodeIds))
      )
        return false;
      return true;
    } catch {
      return false;
    }
  }
  return { validate, pattern, edge, allows };
}
