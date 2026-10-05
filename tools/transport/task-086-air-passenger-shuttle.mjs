// Source-bound fixed shuttle for actual users of a linked published passenger flight. Not advance booking and never unrestricted PUBLIC routing.
export const AIR_PASSENGER_KIND = "AIR_PASSENGER_PUBLIC_SHUTTLE";
const BUS_URL = "https://www.town.taketomi.lg.jp/topics/1753249932/";
const BUS_SHA =
  "845dab9442b329f972dfc9f967f42a67fd1e29494c46b3ba2f3a19513f1f17ae";
const FLYER_URL =
  "https://www.town.taketomi.lg.jp/userfiles/files/topics/seisakusuishin/koustu-syoko/080105haterumabasu.pdf";
const FLYER_SHA =
  "41e15a42ebd4c35db848d65e2a8353941738f9d45daa4284bcdf457a65482f8e";
const FLIGHT_URL = "https://www.dai1air.com/ishigaki/";
const FLIGHT_SHA =
  "3f6dd03e4d60be27c296f48646249a47fbc03ee8ae1464628db988b91eea951d";
const CAL_URL =
  "https://www.dai1air.com/ishigaki/images/diagram/calendar202610HTR.png";
const CAL_SHA =
  "4957c8704cb042597f59ea7ff6afb8c2688f4c609cd51ae899bff224e3f6d265";
export function createAirPassengerShuttle({
  canonical,
  hash,
  invariant,
  verifyEvidence,
  validDateOnly,
  validateNode,
  generateFlightPattern,
}) {
  const exact = (o, ks) =>
    o && canonical(Object.keys(o).sort()) === canonical([...ks].sort());
  const eligibility = [
    "CURRENT_LINKED_FLIGHT_USER",
    "NON_LODGING_VISITOR_OR_ISLAND_RESIDENT",
  ];
  const rules = {
    maximumPartySize: 9,
    overcrowdingMayRefuse: true,
    noCapacityGuarantee: true,
    wetBodyAllowed: false,
    intermediateAlightingAllowed: false,
    eatingAllowed: false,
    drinkingAllowed: false,
    smokingIncludingHeatedAndElectronicAllowed: false,
    lodgingVisitorPolicy:
      "PRINCIPALLY_ACCOMMODATION_PICKUP_EXCLUDED_FROM_THIS_REVIEW",
  };
  function restrictedFact(f) {
    return (
      f?.mode === "local_bus" &&
      ((f.sourceUrl === BUS_URL && f.observedResponseSha256 === BUS_SHA) ||
        (f.sourceUrl === FLYER_URL && f.observedResponseSha256 === FLYER_SHA) ||
        f.serviceAccessProfile === AIR_PASSENGER_KIND)
    );
  }
  function restrictedEdge(e, v) {
    return (
      e?.accessContract?.kind === AIR_PASSENGER_KIND ||
      e?.serviceAccessProfile === AIR_PASSENGER_KIND ||
      v?.patternById?.get(e?.servicePatternRef)?.accessContract?.kind ===
        AIR_PASSENGER_KIND ||
      (e?.mode === "local_bus" &&
        e.sourceRefs?.some((u) => u === BUS_URL || u === FLYER_URL)) ||
      [
        ...(e?.topologyEvidenceRefs ?? []),
        ...(v?.patternById?.get(e?.servicePatternRef)?.evidenceRefs ?? []),
      ].some((ref) => {
        const r = v?.evidence?.get(ref)?.record;
        return (
          restrictedFact(r) ||
          restrictedFact(v?.evidence?.get(r?.sourceFactRef)?.record)
        );
      })
    );
  }
  function validate(c) {
    invariant(
      exact(c, [
        "schemaVersion",
        "kind",
        "audience",
        "eligibilityKeys",
        "reservationRequirement",
        "reviewedServiceDate",
        "conditionsEvidenceRef",
        "passengerRules",
        "flightService",
        "sourceEvidenceRefs",
      ]) &&
        c.schemaVersion === 1 &&
        c.kind === AIR_PASSENGER_KIND,
      "AIR_SHUTTLE_SCHEMA",
    );
    invariant(
      c.audience === "ELIGIBILITY_RESTRICTED" &&
        canonical(c.eligibilityKeys) === canonical(eligibility),
      "AIR_SHUTTLE_ELIGIBILITY",
    );
    invariant(
      c.reservationRequirement === "NOT_REQUIRED" &&
        validDateOnly(c.reviewedServiceDate),
      "AIR_SHUTTLE_DATE_OR_BOOKING",
    );
    invariant(
      canonical(c.passengerRules) === canonical(rules),
      "AIR_SHUTTLE_PASSENGER_RULES",
    );
    const f = c.flightService;
    invariant(
      exact(f, [
        "servicePatternId",
        "sourceFactRef",
        "reviewedServiceDate",
        "relation",
        "airportNodeId",
        "calendarEvidenceRef",
      ]) &&
        f.reviewedServiceDate === c.reviewedServiceDate.replaceAll("-", "") &&
        ["ARRIVAL", "DEPARTURE"].includes(f.relation) &&
        [
          "servicePatternId",
          "sourceFactRef",
          "airportNodeId",
          "calendarEvidenceRef",
        ].every((k) => typeof f[k] === "string" && f[k]),
      "AIR_SHUTTLE_FLIGHT_REFERENCE",
    );
    invariant(
      typeof c.conditionsEvidenceRef === "string" &&
        c.conditionsEvidenceRef &&
        Array.isArray(c.sourceEvidenceRefs) &&
        c.sourceEvidenceRefs.length > 0 &&
        new Set(c.sourceEvidenceRefs).size === c.sourceEvidenceRefs.length,
      "AIR_SHUTTLE_SOURCE_REFS",
    );
    return c;
  }
  function sourceRecord(ref, v, kind, url, sha) {
    const e = v.evidence.get(ref),
      s = v.sources.get(e?.sourceId),
      r = e?.record;
    invariant(
      verifyEvidence([ref], v.sources, v.evidence) &&
        r?.kind === kind &&
        r.sourceUrl === url &&
        r.observedResponseSha256 === sha &&
        s?.url === url &&
        s.evidenceContentSha256 === sha,
      "AIR_SHUTTLE_SOURCE_BOUND_REVIEW",
    );
    return r;
  }
  function pattern(c, p, bindings, v) {
    validate(c);
    invariant(
      v?.nodes instanceof Map &&
        v.sources instanceof Map &&
        v.evidence instanceof Map &&
        v.patternById instanceof Map &&
        typeof validateNode === "function" &&
        typeof generateFlightPattern === "function",
      "AIR_SHUTTLE_COMPLETE_REGISTRY",
    );
    invariant(
      p.mode === "local_bus" &&
        p.serviceState === "active" &&
        p.callingNodes.length === 2 &&
        p.callingNodes.every(
          (n) =>
            n.pickupType === "0" &&
            n.dropOffType === "0" &&
            validateNode(v.nodes.get(n.nodeId), v),
        ),
      "AIR_SHUTTLE_REAL_DIRECT_PUBLIC_COMPONENTS",
    );
    const cr = sourceRecord(
      c.conditionsEvidenceRef,
      v,
      "REVIEWED_FLIGHT_USER_SHUTTLE_CONDITIONS",
      BUS_URL,
      BUS_SHA,
    );
    invariant(
      cr.reviewedTermsEffectiveFrom === "2026-01-05" &&
        c.reviewedServiceDate >= cr.reviewedTermsEffectiveFrom &&
        cr.audience === c.audience &&
        canonical(cr.eligibilityKeys) === canonical(c.eligibilityKeys) &&
        cr.reservationRequirement === "NOT_REQUIRED" &&
        canonical(cr.passengerRules) === canonical(c.passengerRules) &&
        cr.corroboratingEvidence?.some(
          (x) => x.url === FLYER_URL && x.observedResponseSha256 === FLYER_SHA,
        ),
      "AIR_SHUTTLE_PARAMETER_SOURCE_BINDING",
    );
    for (const { fact, record } of bindings)
      invariant(
        restrictedFact(fact) &&
          fact.serviceAccessProfile === AIR_PASSENGER_KIND &&
          fact.reservation === "not_required" &&
          canonical(record.callingNodes) === canonical(p.callingNodes) &&
          fact.parentCallingSequence?.calls?.length === 2 &&
          canonical(fact.parentCallingSequence.calls) ===
            canonical(fact.callingStations) &&
          fact.parentCallingSequence.selectedStartIndex === 0 &&
          fact.parentCallingSequence.selectedEndIndex === 1 &&
          fact.callingRestrictions?.every(
            (r) => r.pickupType === "0" && r.dropOffType === "0",
          ),
        "AIR_SHUTTLE_RAW_DIRECT_SEQUENCE",
      );
    const f = c.flightService,
      flight = v.patternById.get(f.servicePatternId),
      raw = v.evidence.get(f.sourceFactRef)?.record;
    invariant(
      flight?.mode === "flight" &&
        flight.serviceState === "active" &&
        flight.strictFactBinding === true &&
        !flight.accessContract &&
        flight.sourceFactRef === f.sourceFactRef &&
        raw?.kind === "service" &&
        raw.mode === "flight" &&
        raw.serviceState === "active" &&
        raw.operator === flight.operatorRef &&
        raw.sourceUrl === FLIGHT_URL &&
        raw.observedResponseSha256 === FLIGHT_SHA &&
        raw.reviewedServiceDate === f.reviewedServiceDate &&
        raw.reviewedFlightCode === undefined &&
        raw.flightNumberPublication === "NOT_PUBLISHED" &&
        raw.visibleScheduleOnly === true &&
        raw.ignoredHtmlCommentSchedules === true &&
        raw.operatingCalendarEvidenceRef === f.calendarEvidenceRef &&
        verifyEvidence(
          [f.sourceFactRef, ...flight.evidenceRefs],
          v.sources,
          v.evidence,
        ),
      "AIR_SHUTTLE_ACTUAL_UNCONDITIONAL_FLIGHT",
    );
    const cal = sourceRecord(
      f.calendarEvidenceRef,
      v,
      "REVIEWED_FLIGHT_OPERATING_DATES",
      CAL_URL,
      CAL_SHA,
    );
    invariant(
      cal.month === "2026-10" &&
        canonical(cal.operatingDates) ===
          canonical([
            "2026-10-03",
            "2026-10-05",
            "2026-10-24",
            "2026-10-26",
            "2026-10-28",
            "2026-10-31",
          ]) &&
        cal.operatingDates.includes(c.reviewedServiceDate),
      "AIR_SHUTTLE_ACTIVE_CALENDAR_DATE",
    );
    invariant(
      flight.callingNodes.length === 2 &&
        flight.callingNodes.every(
          (n) =>
            v.nodes.get(n.nodeId)?.nodeKind === "airport" &&
            validateNode(v.nodes.get(n.nodeId), v),
        ) &&
        (f.relation === "ARRIVAL"
          ? flight.callingNodes[1].nodeId === f.airportNodeId &&
            p.callingNodes[0].nodeId === f.airportNodeId
          : flight.callingNodes[0].nodeId === f.airportNodeId &&
            p.callingNodes[1].nodeId === f.airportNodeId),
      "AIR_SHUTTLE_FLIGHT_DIRECTION",
    );
    const es = generateFlightPattern(flight, v);
    invariant(
      es.length === 1 && es[0].boardAllowed && es[0].alightAllowed,
      "AIR_SHUTTLE_FLIGHT_BOARDING",
    );
  }
  function edge(c, e, p) {
    invariant(
      e.segmentIndex === 0 &&
        e.fromTransportNodeId === p.callingNodes[0].nodeId &&
        e.toTransportNodeId === p.callingNodes[1].nodeId &&
        e.boardAllowed === true &&
        e.alightAllowed === true,
      "AIR_SHUTTLE_EDGE_DIRECTION",
    );
  }
  function allows(e, context, bindEdge) {
    try {
      const c = validate(e.accessContract),
        v = context?.odValidationContext;
      invariant(v?.patternById instanceof Map, "AIR_SHUTTLE_CONTEXT");
      bindEdge(
        e,
        v.sources,
        v.evidence,
        v.patternById.get(e.servicePatternRef),
        v,
      );
      if (
        context.kind !== "EXPLICIT_CONDITIONAL_PLANNING" ||
        context.publicStructureOnly !== false ||
        context.travelDate !== c.reviewedServiceDate ||
        !context.acceptedContracts?.includes(hash(c)) ||
        !c.eligibilityKeys.every((k) => context.eligibilityKeys?.includes(k))
      )
        return false;
      const i = context.airPassengerIntents?.find(
        (i) =>
          i.contractSha256 === hash(c) &&
          i.travelDate === c.reviewedServiceDate,
      );
      return !!(
        i &&
        i.linkedFlightUserDeclared === true &&
        i.flightServicePatternId === c.flightService.servicePatternId &&
        i.flightServiceStatus === "PLANNED_OPERATING" &&
        ["ISLAND_RESIDENT", "NON_LODGING_VISITOR"].includes(i.passengerRole) &&
        i.lodgingVisitor === false &&
        Number.isInteger(i.partySize) &&
        i.partySize >= 1 &&
        i.partySize <= c.passengerRules.maximumPartySize &&
        i.acceptedPassengerRulesSha256 === hash(c.passengerRules) &&
        i.wetBody === false &&
        i.willEat === false &&
        i.willDrink === false &&
        i.willSmokeIncludingHeatedOrElectronic === false &&
        i.acceptsDirectServiceOnly === true &&
        i.acceptsCapacityRefusal === true &&
        i.acceptsNoSeatOrActualDispatchGuarantee === true
      );
    } catch {
      return false;
    }
  }
  return { validate, pattern, edge, allows, restrictedFact, restrictedEdge };
}
