// Generic reviewed structural capability context; no actual booking status accepted.
export const CAPABILITY_KIND = "AUDITED_CONDITIONAL_SERVICE_CAPABILITY";
export const CAPABILITY_PREREQUISITES = [
  "OPERATOR_ACCEPTS_EXACT_DIRECTION_REQUEST",
  "PICKUP_AND_DROPOFF_AT_REVIEWED_FACILITIES_AGREED",
  "DISPATCH_AVAILABLE_WITHIN_PUBLISHED_SERVICE_SCOPE",
];
export function capabilityPlain(c) {
  const {
    odValidationContext,
    evidenceContextSha256,
    capabilityReview,
    capabilityInputBindings,
    capabilityInputError,
    ...plain
  } = c;
  return plain;
}
export function capabilityAllows(context, od, v, { hash, canonical }) {
  const r = context?.capabilityReview,
    p = capabilityPlain(context ?? {}),
    keys = [
      "kind",
      "publicStructureOnly",
      "view",
      "actualBookingClaim",
      "actualDispatchClaim",
      "travelDate",
      "capabilityPrerequisites",
      "acceptedContracts",
    ];
  return (
    context?.kind === CAPABILITY_KIND &&
    context.publicStructureOnly === false &&
    context.view === "STRUCTURAL_CAPABILITY_ONLY" &&
    context.actualBookingClaim === false &&
    context.actualDispatchClaim === false &&
    !context.capabilityInputError &&
    Object.keys(p).length === keys.length &&
    keys.every((k) => Object.hasOwn(p, k)) &&
    context.travelDate === od.accessTerms.reviewedStructuralDate &&
    canonical(context.capabilityPrerequisites) ===
      canonical(CAPABILITY_PREREQUISITES) &&
    r?.kind === "REVIEWED_PUBLIC_OD_STRUCTURAL_CAPABILITY_V1" &&
    r.contextSha256 === hash(p) &&
    r.odIds?.includes(od.odId) &&
    r.contractSha256s?.includes(hash(od.accessTerms)) &&
    context.acceptedContracts?.includes(hash(od.accessTerms)) &&
    r.inputBindings?.length >= 3 &&
    r.inputBindings.every(
      (b) => new Map(context.capabilityInputBindings).get(b.path) === b.sha256,
    ) &&
    r.sourceBindings?.length > 0 &&
    r.sourceBindings.every((b) => {
      const s = v.sources.get(b.sourceId);
      return s?.url === b.url && s.contentSha256 === b.contentSha256;
    })
  );
}
