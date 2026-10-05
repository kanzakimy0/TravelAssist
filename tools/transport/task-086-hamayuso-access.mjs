export function createHamayusoAccess({
  canonical,
  hash,
  invariant,
  verifyEvidence,
  validateNode,
}) {
  const kind = "QUALIFIED_PACKAGE_HOTEL_SHUTTLE",
    keys = [
      "hamayuso:lodging-guest",
      "nansei:confirmed-kitadaito-product-participant",
    ],
    anchor = "abr-parcel:473588:0004000:001520000900000:private-hotel-facility";
  function validate(c) {
    invariant(
      c &&
        Object.keys(c).every((k) =>
          [
            "schemaVersion",
            "kind",
            "profile",
            "audience",
            "eligibilityKeys",
            "hotelIdentityAnchor",
            "productUrl",
            "requiredConditions",
            "unknowns",
            "direction",
            "sourceEvidenceRefs",
          ].includes(k),
        ),
      "HAMAYUSO_UNMODELED_CONDITION",
    );
    invariant(
      c.schemaVersion === 1 &&
        c.kind === kind &&
        c.profile === "HAMAYUSO_CONFIRMED_PRODUCT_GUEST_V1" &&
        c.audience === "ELIGIBILITY_RESTRICTED" &&
        canonical(c.eligibilityKeys) === canonical(keys) &&
        c.hotelIdentityAnchor === anchor &&
        c.productUrl === "https://south-west.co.jp/tour/okinawa_kitadaitou/" &&
        ["AIRPORT_TO_HOTEL", "HOTEL_TO_AIRPORT"].includes(c.direction),
      "HAMAYUSO_PROFILE_SCOPE",
    );
    invariant(
      canonical(c.requiredConditions) ===
        canonical({
          actualHotelGuest: true,
          confirmedExactTourProduct: true,
          arrivalFlightInformationReportedToHotel: true,
          bookingRuleScope:
            "PRODUCT_BOOKING_TERMS_NOT_A_SHUTTLE_NUMERIC_CUTOFF",
          serviceChargePublication: "HOTEL_DESCRIBES_FREE",
          unconditionalPublicAccess: false,
        }) &&
        canonical(c.unknowns) ===
          canonical({
            legalMotorCarrier: null,
            shuttleBookingLeadMinutes: null,
            exactTimetable: null,
            capacity: null,
            dispatchGuarantee: null,
          }),
      "HAMAYUSO_CONDITIONS",
    );
    invariant(
      c.sourceEvidenceRefs?.length === 2 &&
        new Set(c.sourceEvidenceRefs).size === 2,
      "HAMAYUSO_CONDITION_REFS",
    );
    return c;
  }
  function sources(c, s, e) {
    validate(c);
    invariant(
      verifyEvidence(c.sourceEvidenceRefs, s, e),
      "HAMAYUSO_SOURCE_RIGHTS",
    );
    const got = c.sourceEvidenceRefs
      .map((ref) => {
        const source = s.get(e.get(ref)?.sourceId);
        return [
          source?.url,
          source?.evidenceContentSha256 ?? source?.contentSha256,
        ];
      })
      .sort();
    const wanted = [
      [
        "https://hamayuso.com/content3.html",
        "ec5942672592c7d4e178676d71de45f079636aef8041707cd385909fbf3ba91b",
      ],
      [
        "https://south-west.co.jp/tour/okinawa_kitadaitou/",
        "802617d6c2961867e04bb8a1c6922d353c26f160545c097076746fbce81b14d3",
      ],
    ].sort();
    invariant(
      canonical(got) === canonical(wanted),
      "HAMAYUSO_EXACT_SOURCE_PAIR",
    );
  }
  function allows(edge, c, bindEdge) {
    const v = c?.odValidationContext,
      contract = edge.accessContract;
    if (
      !v ||
      c.kind !== "EXPLICIT_CONDITIONAL_PLANNING" ||
      c.publicStructureOnly !== false ||
      !c.acceptedContracts?.includes(hash(contract)) ||
      canonical(c.eligibilityKeys) !== canonical(keys) ||
      c.hotelIdentityAnchor !== anchor ||
      c.hotelGuestStatus !== "ACTUAL_LODGING_GUEST" ||
      c.tourProductStatus !== "OPERATOR_CONFIRMED_EXACT_PRODUCT_BOOKING" ||
      c.arrivalFlightInformationStatus !== "REPORTED_TO_HOTEL" ||
      c.flightServiceStatus !== "PLANNED_OPERATING" ||
      c.acceptsUnknownShuttleDispatchAndCapacity !== true
    )
      return false;
    try {
      bindEdge(
        edge,
        v.sources,
        v.evidence,
        v.patternById.get(edge.servicePatternRef),
        v,
      );
      const hotel = [...v.nodes.values()].find(
        (n) => n.identityAnchor === anchor,
      );
      return (
        !!hotel &&
        hotel.decision === "ADMIT_TASK_086_TOPOLOGY" &&
        validateNode(hotel, v)
      );
    } catch {
      return false;
    }
  }
  function pattern(c, p, v) {
    const calls = p.callingNodes,
      hotel = [...(v?.nodes?.values() ?? [])].find(
        (n) => n.identityAnchor === anchor,
      ),
      airport = v?.nodes?.get(
        "transport-node:086:7523deba1977cac488a45c7185a95ad7",
      );
    invariant(
      hotel &&
        airport &&
        validateNode(hotel, v) &&
        calls?.length === 2 &&
        canonical(calls.map((x) => x.nodeId)) ===
          canonical(
            c.direction === "AIRPORT_TO_HOTEL"
              ? [airport.nodeId, hotel.nodeId]
              : [hotel.nodeId, airport.nodeId],
          ),
      "HAMAYUSO_DIRECTION_IDENTITY",
    );
  }
  return { kind, validate, sources, allows, pattern };
}
