import type { PlanningFactRefV1 } from "../planning/facts";
import type { PoiFeatureCode, PoiFeatureSetV1 } from "../planning/features";
import type {
  PoiPlanningProjectionV1,
  PoiVisitProfileV1,
} from "../planning/poi";
import type { MasterCodeRegistryV1 } from "../../master-code/types";

export const CANONICAL_POI_SCHEMA_VERSION = "1.0" as const;
export const CANDIDATE_ADMISSION_SCHEMA_VERSION = "1.0" as const;

export const POI_CLASSIFICATIONS = [
  "cityscape_landmark",
  "culture_history",
  "nature",
  "experience",
  "museum_art",
  "religious_historic",
  "shopping",
] as const;
export type PoiClassification = (typeof POI_CLASSIFICATIONS)[number];

export const POI_LIFECYCLE_STATUSES = [
  "active",
  "temporarily_closed",
  "permanently_closed",
  "merged",
  "superseded",
] as const;
export type PoiLifecycleStatus = (typeof POI_LIFECYCLE_STATUSES)[number];

export type CanonicalPoiSourceRefV1 = {
  sourceRef: string;
  sourceKind:
    | "official"
    | "provider"
    | "open_data"
    | "human_verified"
    | "derived"
    | "master_prior"
    | "ai_labeled";
  authorityBand: "A" | "B" | "C" | "D";
  locator: string | null;
  observedAt: string;
  rights: {
    persistence: "allowed" | "reference_only" | "transient_only";
    redistribution: "allowed" | "restricted" | "unknown";
    attributionRequired: boolean;
  };
};

export type CanonicalPoiV1 = {
  schemaVersion: typeof CANONICAL_POI_SCHEMA_VERSION;
  internalId: string;
  masterCode: string | null;
  names: {
    primaryLocale: string;
    localized: {
      locale: string;
      value: string;
      kind: "official" | "common" | "translated";
    }[];
    aliases: { locale: string; value: string }[];
  };
  classification: {
    primary: PoiClassification;
    secondary: PoiClassification[];
    tags: string[];
  };
  location: {
    supportStatus:
      "japan_supported" | "unsupported_outside_japan" | "unresolved";
    countryCode: "JP" | string | null;
    point: { longitude: number; latitude: number } | null;
    geometryRef: string | null;
    address: {
      prefecture: string | null;
      municipality: string | null;
      postalCode: string | null;
    } | null;
  };
  lifecycle: {
    status: PoiLifecycleStatus;
    mergedIntoPoiRef: string | null;
    supersededByPoiRef: string | null;
    statusChangedAt: string;
  };
  facts: PlanningFactRefV1[];
  features: PoiFeatureSetV1 | null;
  visitProfiles: PoiVisitProfileV1[];
  regionRelations: {
    regionRef: string;
    relationType: "located_in" | "serves" | "near" | "spans";
    primary: boolean;
    sourceRefs: string[];
  }[];
  accessAnchors: {
    anchorId: string;
    transportNodeRef: string;
    kind: "entrance" | "rail" | "bus" | "port" | "parking" | "other";
    relationship: "primary" | "secondary" | "accessible" | "seasonal";
    sourceRefs: string[];
  }[];
  externalIds: {
    provider: string;
    externalId: string;
    sourceRef: string;
    status: "active" | "historical";
  }[];
  assetRefs: string[];
  sourceRefs: CanonicalPoiSourceRefV1[];
  revision: {
    recordRevision: number;
    factsRevision: number;
    featureRevision: number;
    visitProfileRevision: number;
    createdAt: string;
    updatedAt: string;
  };
};

export type CanonicalPoiDatasetV1 = {
  schemaVersion: "1.0";
  datasetRevision: string;
  records: CanonicalPoiV1[];
};

export const CANDIDATE_ADMISSION_STATES = [
  "ADMIT",
  "REVIEW_REQUIRED",
  "BLOCKED",
  "MERGE_TARGET",
  "INSUFFICIENT_EVIDENCE",
] as const;
export type CandidateAdmissionState =
  (typeof CANDIDATE_ADMISSION_STATES)[number];

export const CANDIDATE_ADMISSION_GATE_NAMES = [
  "canonical_identity",
  "duplicate_disposition",
  "japan_location_region",
  "classification",
  "provenance",
  "identity_separation",
  "master_code",
  "lifecycle",
  "feature_shape",
  "unknown_preservation",
  "visit_profiles",
  "static_fact_boundary",
  "persistence_rights",
  "evidence_conflicts",
] as const;
export type CandidateAdmissionGateName =
  (typeof CANDIDATE_ADMISSION_GATE_NAMES)[number];

export type CandidateAdmissionEnvelopeV1 = {
  schemaVersion: typeof CANDIDATE_ADMISSION_SCHEMA_VERSION;
  admissionId: string;
  candidate: {
    candidateKey: string;
    proposedCanonical: CanonicalPoiV1 | null;
    identityResolution: {
      status: "resolved" | "ambiguous" | "unresolved";
      resolvedPoiRef: string | null;
      evidenceRefs: string[];
    };
    duplicateDisposition: {
      status: "unique" | "merge_into" | "conflict" | "unresolved";
      targetPoiRef: string | null;
      evidenceRefs: string[];
    };
    providerObservations: {
      provider: string;
      providerId: string;
      sourceRef: string;
      observedAt: string;
      fields: {
        fieldPath: string;
        valueClass:
          | "identifier"
          | "name"
          | "location"
          | "classification"
          | "fact"
          | "feature"
          | "asset";
        persistenceIntent: "canonical" | "reference_only" | "transient";
        rightsPolicy:
          | "persistent_allowed"
          | "reference_only"
          | "transient_only"
          | "forbidden";
      }[];
    }[];
    featureEvidence: {
      code: PoiFeatureCode;
      observedValue: number | null;
      proposedValue: number | null;
    }[];
    evidenceRefs: string[];
    materialConflicts: {
      conflictId: string;
      fieldPath: string;
      evidenceRefs: string[];
      disposition: "resolved" | "review_required" | "unresolved";
    }[];
  };
  requestedAt: string;
};

export type CandidateAdmissionGateV1 = {
  gate: CandidateAdmissionGateName;
  status: "PASS" | "REVIEW" | "BLOCK" | "INSUFFICIENT";
  reasonCodes: string[];
};

export type CandidateAdmissionResultV1 = {
  schemaVersion: "1.0";
  admissionId: string;
  state: CandidateAdmissionState;
  canonicalPoiRef: string | null;
  mergeTargetPoiRef: string | null;
  gates: CandidateAdmissionGateV1[];
  evaluatedAt: string;
};

export type CandidateAdmissionContextV1 = {
  masterCodeRegistry: MasterCodeRegistryV1;
  regionIds: readonly string[];
  existingPoiIds: readonly string[];
  evidenceIds: readonly string[];
  evaluatedAt: string;
};

export type PoiValidationIssue = {
  path: string;
  code: string;
};

export type PoiValidationResult<T> =
  { ok: true; value: T } | { ok: false; issues: PoiValidationIssue[] };

export type CanonicalPoiPlanningProjection = PoiPlanningProjectionV1;
