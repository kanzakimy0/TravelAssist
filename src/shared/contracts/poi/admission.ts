import { parseMasterCodeRegistryV1 } from "../../master-code";

import {
  CANDIDATE_ADMISSION_GATE_NAMES,
  type CandidateAdmissionContextV1,
  type CandidateAdmissionEnvelopeV1,
  type CandidateAdmissionGateName,
  type CandidateAdmissionGateV1,
  type CandidateAdmissionResultV1,
  type PoiClassification,
  type PoiValidationResult,
} from "./types";
import { parseCandidateAdmissionEnvelopeV1 } from "./validation";

const ENTITY_TYPE_BY_CLASSIFICATION: Record<
  PoiClassification,
  | "poi.cityscape_landmark"
  | "poi.culture_history"
  | "poi.nature"
  | "poi.experience"
  | "poi.museum_art"
  | "poi.religious_historic"
  | "poi.shopping"
> = {
  cityscape_landmark: "poi.cityscape_landmark",
  culture_history: "poi.culture_history",
  nature: "poi.nature",
  experience: "poi.experience",
  museum_art: "poi.museum_art",
  religious_historic: "poi.religious_historic",
  shopping: "poi.shopping",
};

const gate = (
  gateName: CandidateAdmissionGateName,
  status: CandidateAdmissionGateV1["status"],
  ...reasonCodes: string[]
): CandidateAdmissionGateV1 => ({
  gate: gateName,
  status,
  reasonCodes,
});

const invalidContext = (
  path: string,
  code: string,
): PoiValidationResult<CandidateAdmissionResultV1> => ({
  ok: false,
  issues: [{ path, code }],
});

export function evaluateCandidateAdmissionV1(
  input: unknown,
  context: CandidateAdmissionContextV1,
): PoiValidationResult<CandidateAdmissionResultV1> {
  const parsed = parseCandidateAdmissionEnvelopeV1(input);
  if (!parsed.ok) return parsed;
  const registry = parseMasterCodeRegistryV1(context.masterCodeRegistry);
  if (!registry.ok)
    return {
      ok: false,
      issues: registry.issues.map(({ path, code }) => ({
        path: `$.context.masterCodeRegistry${path.slice(1)}`,
        code,
      })),
    };
  if (!Number.isFinite(Date.parse(context.evaluatedAt)))
    return invalidContext("$.context.evaluatedAt", "INVALID_INSTANT");
  for (const [key, values] of [
    ["regionIds", context.regionIds],
    ["existingPoiIds", context.existingPoiIds],
    ["evidenceIds", context.evidenceIds],
  ] as const)
    if (new Set(values).size !== values.length)
      return invalidContext(`$.context.${key}`, "DUPLICATE_ID");

  const envelope: CandidateAdmissionEnvelopeV1 = parsed.value;
  const candidate = envelope.candidate;
  const poi = candidate.proposedCanonical;
  const gates = new Map<CandidateAdmissionGateName, CandidateAdmissionGateV1>();
  const set = (value: CandidateAdmissionGateV1) => gates.set(value.gate, value);

  if (candidate.identityResolution.status === "unresolved")
    set(gate("canonical_identity", "INSUFFICIENT", "IDENTITY_UNRESOLVED"));
  else if (candidate.identityResolution.status === "ambiguous")
    set(gate("canonical_identity", "REVIEW", "IDENTITY_AMBIGUOUS"));
  else if (
    poi === null ||
    candidate.identityResolution.resolvedPoiRef !== poi.internalId
  )
    set(gate("canonical_identity", "BLOCK", "IDENTITY_RESOLUTION_MISMATCH"));
  else set(gate("canonical_identity", "PASS", "IDENTITY_RESOLVED"));

  const duplicate = candidate.duplicateDisposition;
  if (duplicate.status === "conflict")
    set(gate("duplicate_disposition", "BLOCK", "DUPLICATE_CONFLICT"));
  else if (duplicate.status === "unresolved")
    set(gate("duplicate_disposition", "REVIEW", "DUPLICATE_UNRESOLVED"));
  else if (duplicate.status === "merge_into") {
    if (!context.existingPoiIds.includes(duplicate.targetPoiRef!))
      set(gate("duplicate_disposition", "BLOCK", "MERGE_TARGET_NOT_FOUND"));
    else if (poi !== null && duplicate.targetPoiRef === poi.internalId)
      set(gate("duplicate_disposition", "BLOCK", "SELF_MERGE_TARGET"));
    else set(gate("duplicate_disposition", "PASS", "MERGE_TARGET_RESOLVED"));
  } else set(gate("duplicate_disposition", "PASS", "UNIQUE_ENTITY"));

  if (poi === null)
    set(
      gate("japan_location_region", "INSUFFICIENT", "CANONICAL_RECORD_MISSING"),
    );
  else if (poi.location.supportStatus === "unsupported_outside_japan")
    set(
      gate("japan_location_region", "BLOCK", "EXPLICITLY_UNSUPPORTED_REGION"),
    );
  else if (poi.location.supportStatus === "unresolved")
    set(gate("japan_location_region", "INSUFFICIENT", "LOCATION_UNRESOLVED"));
  else {
    const unknownRegions = poi.regionRelations
      .map(({ regionRef }) => regionRef)
      .filter((regionRef) => !context.regionIds.includes(regionRef));
    if (unknownRegions.length > 0)
      set(gate("japan_location_region", "BLOCK", "UNRESOLVED_REGION_REF"));
    else if (
      poi.regionRelations.length === 0 ||
      !poi.regionRelations.some(({ primary }) => primary)
    )
      set(
        gate("japan_location_region", "INSUFFICIENT", "PRIMARY_REGION_MISSING"),
      );
    else if (poi.location.point === null && poi.location.geometryRef === null)
      set(
        gate(
          "japan_location_region",
          "INSUFFICIENT",
          "LOCATION_GEOMETRY_UNKNOWN",
        ),
      );
    else set(gate("japan_location_region", "PASS", "JAPAN_LOCATION_VALID"));
  }

  set(
    poi === null
      ? gate("classification", "INSUFFICIENT", "CANONICAL_RECORD_MISSING")
      : gate("classification", "PASS", "CLASSIFICATION_VALID"),
  );

  const evidenceIds = new Set(context.evidenceIds);
  const usedEvidence = [
    ...candidate.evidenceRefs,
    ...candidate.identityResolution.evidenceRefs,
    ...candidate.duplicateDisposition.evidenceRefs,
    ...candidate.providerObservations.map(({ sourceRef }) => sourceRef),
    ...candidate.materialConflicts.flatMap(({ evidenceRefs }) => evidenceRefs),
  ];
  const missingEvidence = usedEvidence.filter((ref) => !evidenceIds.has(ref));
  if (usedEvidence.length === 0)
    set(gate("provenance", "INSUFFICIENT", "EVIDENCE_MISSING"));
  else if (missingEvidence.length > 0)
    set(gate("provenance", "BLOCK", "DANGLING_EVIDENCE_REF"));
  else set(gate("provenance", "PASS", "PROVENANCE_RESOLVABLE"));

  if (poi === null)
    set(
      gate("identity_separation", "INSUFFICIENT", "CANONICAL_RECORD_MISSING"),
    );
  else {
    const forbiddenIdentities = new Set([
      candidate.candidateKey,
      ...candidate.providerObservations.map(({ providerId }) => providerId),
      ...poi.externalIds.map(({ externalId }) => externalId),
      ...poi.assetRefs,
      ...poi.regionRelations.map(({ regionRef }) => regionRef),
      ...poi.accessAnchors.map(({ transportNodeRef }) => transportNodeRef),
    ]);
    if (forbiddenIdentities.has(poi.internalId))
      set(gate("identity_separation", "BLOCK", "NON_CANONICAL_ID_SUBSTITUTED"));
    else set(gate("identity_separation", "PASS", "IDENTITY_FAMILIES_SEPARATE"));
  }

  if (poi === null)
    set(gate("master_code", "INSUFFICIENT", "CANONICAL_RECORD_MISSING"));
  else if (poi.masterCode === null)
    set(gate("master_code", "REVIEW", "MASTER_CODE_NOT_ALLOCATED"));
  else {
    const allocation = registry.value.entries.find(
      ({ masterCode }) => masterCode === poi.masterCode,
    );
    const expectedType =
      ENTITY_TYPE_BY_CLASSIFICATION[poi.classification.primary];
    if (!allocation)
      set(gate("master_code", "BLOCK", "MASTER_CODE_NOT_IN_REGISTRY"));
    else if (allocation.lifecycleStatus !== "active")
      set(gate("master_code", "BLOCK", "MASTER_CODE_NOT_ACTIVE"));
    else if (allocation.entityType !== expectedType)
      set(gate("master_code", "BLOCK", "MASTER_CODE_CLASSIFICATION_MISMATCH"));
    else if (allocation.entityRef !== poi.internalId)
      set(gate("master_code", "BLOCK", "MASTER_CODE_ENTITY_MISMATCH"));
    else set(gate("master_code", "PASS", "MASTER_CODE_ACTIVE_AND_RESOLVED"));
  }

  if (poi === null)
    set(gate("lifecycle", "INSUFFICIENT", "CANONICAL_RECORD_MISSING"));
  else if (poi.lifecycle.status === "merged") {
    if (poi.lifecycle.mergedIntoPoiRef !== duplicate.targetPoiRef)
      set(gate("lifecycle", "BLOCK", "MERGE_TARGET_MISMATCH"));
    else set(gate("lifecycle", "PASS", "MERGED_RECORD_TARGET_VALID"));
  } else if (poi.lifecycle.status === "superseded")
    set(gate("lifecycle", "REVIEW", "SUPERSEDED_RECORD_NOT_ADMITTED"));
  else if (duplicate.status === "merge_into")
    set(gate("lifecycle", "REVIEW", "MERGE_LIFECYCLE_UPDATE_REQUIRED"));
  else set(gate("lifecycle", "PASS", "LIFECYCLE_VALID"));

  set(
    poi === null
      ? gate("feature_shape", "INSUFFICIENT", "CANONICAL_RECORD_MISSING")
      : poi.features === null
        ? gate("feature_shape", "PASS", "FEATURE_SET_ABSENT_ALLOWED")
        : gate("feature_shape", "PASS", "FEATURE_VECTOR_43_COMPLETE"),
  );

  const coercedUnknown = candidate.featureEvidence.filter(
    ({ observedValue, proposedValue }) =>
      observedValue === null && proposedValue !== null,
  );
  const mismatchedFeatureEvidence =
    poi?.features === null || poi === null
      ? []
      : candidate.featureEvidence.filter(
          ({ code, proposedValue }) =>
            poi.features!.values[code] !== proposedValue,
        );
  if (coercedUnknown.length > 0)
    set(gate("unknown_preservation", "BLOCK", "UNKNOWN_FEATURE_COERCED"));
  else if (mismatchedFeatureEvidence.length > 0)
    set(gate("unknown_preservation", "BLOCK", "FEATURE_EVIDENCE_MISMATCH"));
  else set(gate("unknown_preservation", "PASS", "UNKNOWN_PRESERVED_AS_NULL"));

  if (poi === null)
    set(gate("visit_profiles", "INSUFFICIENT", "CANONICAL_RECORD_MISSING"));
  else {
    const invalidLoadSemantics = poi.visitProfiles.some(
      (profile) =>
        profile.recommendedDurationMinutes === null &&
        [
          profile.fixedWalkingLoad,
          profile.variableWalkingLoad,
          profile.fixedPhysicalLoad,
          profile.variablePhysicalLoad,
        ].some((value) => value !== null),
    );
    if (invalidLoadSemantics)
      set(
        gate(
          "visit_profiles",
          "BLOCK",
          "LOAD_PRIOR_WITHOUT_RECOMMENDED_DURATION",
        ),
      );
    else set(gate("visit_profiles", "PASS", "VISIT_PROFILE_SEMANTICS_VALID"));
  }

  set(
    poi === null
      ? gate("static_fact_boundary", "INSUFFICIENT", "CANONICAL_RECORD_MISSING")
      : gate("static_fact_boundary", "PASS", "STATIC_FACT_BOUNDARY_VALID"),
  );

  const rightsViolations = candidate.providerObservations.flatMap(
    ({ fields }) =>
      fields.filter(
        ({ persistenceIntent, rightsPolicy }) =>
          persistenceIntent === "canonical" &&
          rightsPolicy !== "persistent_allowed",
      ),
  );
  const transientCanonicalSources =
    poi?.sourceRefs.filter(
      ({ rights }) => rights.persistence === "transient_only",
    ) ?? [];
  if (rightsViolations.length > 0 || transientCanonicalSources.length > 0)
    set(gate("persistence_rights", "BLOCK", "PERSISTENCE_RIGHTS_VIOLATION"));
  else set(gate("persistence_rights", "PASS", "PERSISTENCE_RIGHTS_VALID"));

  if (
    candidate.materialConflicts.some(
      ({ disposition }) => disposition === "unresolved",
    )
  )
    set(gate("evidence_conflicts", "BLOCK", "MATERIAL_CONFLICT_UNRESOLVED"));
  else if (
    candidate.materialConflicts.some(
      ({ disposition }) => disposition === "review_required",
    )
  )
    set(
      gate("evidence_conflicts", "REVIEW", "MATERIAL_CONFLICT_REVIEW_REQUIRED"),
    );
  else
    set(gate("evidence_conflicts", "PASS", "NO_UNRESOLVED_MATERIAL_CONFLICT"));

  const orderedGates = CANDIDATE_ADMISSION_GATE_NAMES.map((name) =>
    gates.get(name)!,
  );
  let state: CandidateAdmissionResultV1["state"];
  if (orderedGates.some(({ status }) => status === "BLOCK")) state = "BLOCKED";
  else if (
    duplicate.status === "merge_into" ||
    poi?.lifecycle.status === "merged" ||
    poi?.lifecycle.status === "superseded"
  )
    state = "MERGE_TARGET";
  else if (orderedGates.some(({ status }) => status === "INSUFFICIENT"))
    state = "INSUFFICIENT_EVIDENCE";
  else if (orderedGates.some(({ status }) => status === "REVIEW"))
    state = "REVIEW_REQUIRED";
  else state = "ADMIT";

  return {
    ok: true,
    value: {
      schemaVersion: "1.0",
      admissionId: envelope.admissionId,
      state,
      canonicalPoiRef: state === "ADMIT" ? (poi?.internalId ?? null) : null,
      mergeTargetPoiRef:
        state === "MERGE_TARGET"
          ? (duplicate.targetPoiRef ??
            poi?.lifecycle.mergedIntoPoiRef ??
            poi?.lifecycle.supersededByPoiRef ??
            null)
          : null,
      gates: orderedGates,
      evaluatedAt: context.evaluatedAt,
    },
  };
}

export { ENTITY_TYPE_BY_CLASSIFICATION as POI_MASTER_CODE_ENTITY_TYPE_BY_CLASSIFICATION };
