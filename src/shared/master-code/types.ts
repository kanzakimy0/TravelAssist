export const MASTER_CODE_LIFECYCLE_STATUSES = [
  "reserved",
  "active",
  "deprecated",
  "superseded",
] as const;

export type MasterCodeLifecycleStatus =
  (typeof MASTER_CODE_LIFECYCLE_STATUSES)[number];

export const MASTER_CODE_ENTITY_TYPES = [
  "system.reserved",
  "region.country",
  "region.macro_area",
  "region.prefecture",
  "region.municipality",
  "region.travel_region",
  "region.district",
  "region.stay_cluster",
  "region.onsen_resort",
  "region.gateway",
  "poi.cityscape_landmark",
  "poi.culture_history",
  "poi.nature",
  "poi.experience",
  "poi.museum_art",
  "poi.religious_historic",
  "poi.shopping",
  "transport",
] as const;

export type MasterCodeEntityType = (typeof MASTER_CODE_ENTITY_TYPES)[number];

export type MasterCodeProvenanceV1 = {
  kind: "repository_contract" | "allocation_review" | "migration";
  ref: string;
};

export type MasterCodeEntryV1 = {
  masterCode: string;
  entityType: MasterCodeEntityType;
  entityRef: string | null;
  lifecycleStatus: MasterCodeLifecycleStatus;
  supersededBy: string | null;
  sourceRefs: string[];
  provenance: MasterCodeProvenanceV1[];
  allocationReason: string;
  createdRevision: string;
  updatedRevision: string;
};

export type MasterCodeRegistryV1 = {
  schemaVersion: "1.0";
  registryRevision: string;
  governanceStatus: "candidate";
  entries: MasterCodeEntryV1[];
};

export type MasterCodeValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export type MasterCodeValidationResult<T> =
  { ok: true; value: T } | { ok: false; issues: MasterCodeValidationIssue[] };

export type RegionMasterCodeAllocationV1 = {
  regionId: string;
  regionType: string;
  masterCode: string;
  registryEntityType: MasterCodeEntityType;
  lifecycleStatus: "active";
  sourceRefs: string[];
  provenance: MasterCodeProvenanceV1[];
  allocationReason: string;
};

export type RegionMasterCodeAllocationManifestV1 = {
  schemaVersion: "1.0";
  registryRevision: string;
  sourceGraphRevision: string;
  governanceStatus: "candidate_pending_human_review";
  allocations: RegionMasterCodeAllocationV1[];
};
