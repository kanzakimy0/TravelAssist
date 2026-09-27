import { masterCodeRegistry, type MasterCodeEntryV1 } from "../../master-code";
import {
  PLANNING_CONTRACT_VERSION,
  POI_FEATURE_CODES,
  type PlanningFactRefV1,
  type PoiFeatureSetV1,
  type PoiFeatureVectorV1,
  type PoiVisitProfileV1,
} from "../planning";

import type {
  CandidateAdmissionContextV1,
  CandidateAdmissionEnvelopeV1,
  CanonicalPoiDatasetV1,
  CanonicalPoiV1,
  PoiClassification,
} from "./types";

const instant = "2026-09-21T00:00:00+09:00";
const officialSourceRef = "source:fixture-official";
const providerSourceRef = "source:fixture-provider-ref";

const featureValues = (
  values: Partial<Record<(typeof POI_FEATURE_CODES)[number], number | null>>,
): PoiFeatureVectorV1 =>
  Object.fromEntries(
    POI_FEATURE_CODES.map((code) => [code, values[code] ?? null]),
  ) as PoiFeatureVectorV1;

const featureSet = (
  poiRef: string,
  values: Partial<Record<(typeof POI_FEATURE_CODES)[number], number | null>>,
): PoiFeatureSetV1 => ({
  contractVersion: PLANNING_CONTRACT_VERSION,
  featureVersion: "1.0",
  poiRef,
  values: featureValues(values),
  sourceRefs: [officialSourceRef],
  confidence: 0.8,
  updatedAt: instant,
});

const fact = (
  poiRef: string,
  suffix: string,
  factKind: PlanningFactRefV1["factKind"],
): PlanningFactRefV1 => ({
  contractVersion: PLANNING_CONTRACT_VERSION,
  factId: `fact:${suffix}`,
  factKind,
  subjectRef: poiRef,
  source: {
    sourceKind: "official",
    provider: null,
    sourceRef: officialSourceRef,
    authorityBand: "A",
  },
  observedAt: instant,
  effectiveAt: null,
  validFrom: null,
  validUntil: null,
  expiresAt: null,
  confidence: 0.9,
  status: "active",
  revision: 1,
});

const sourceRefs: CanonicalPoiV1["sourceRefs"] = [
  {
    sourceRef: officialSourceRef,
    sourceKind: "official",
    authorityBand: "A",
    locator: "https://example.invalid/official-fixture",
    observedAt: instant,
    rights: {
      persistence: "allowed",
      redistribution: "allowed",
      attributionRequired: false,
    },
  },
  {
    sourceRef: providerSourceRef,
    sourceKind: "provider",
    authorityBand: "B",
    locator: null,
    observedAt: instant,
    rights: {
      persistence: "reference_only",
      redistribution: "restricted",
      attributionRequired: true,
    },
  },
];

type FixtureOptions = {
  internalId: string;
  masterCode: string | null;
  nameJa: string;
  nameEn: string;
  classification: PoiClassification;
  regionRefs: string[];
  featureOverrides?: Partial<
    Record<(typeof POI_FEATURE_CODES)[number], number | null>
  >;
  lifecycle?: CanonicalPoiV1["lifecycle"];
  visitProfiles?: PoiVisitProfileV1[];
  accessAnchors?: CanonicalPoiV1["accessAnchors"];
};

const makePoi = (options: FixtureOptions): CanonicalPoiV1 => ({
  schemaVersion: "1.0",
  internalId: options.internalId,
  masterCode: options.masterCode,
  names: {
    primaryLocale: "ja",
    localized: [
      { locale: "ja", value: options.nameJa, kind: "official" },
      { locale: "en", value: options.nameEn, kind: "translated" },
    ],
    aliases: [],
  },
  classification: {
    primary: options.classification,
    secondary: [],
    tags: [],
  },
  location: {
    supportStatus: "japan_supported",
    countryCode: "JP",
    point: { longitude: 139.7671, latitude: 35.6812 },
    geometryRef: null,
    address: { prefecture: "Tokyo", municipality: null, postalCode: null },
  },
  lifecycle: options.lifecycle ?? {
    status: "active",
    mergedIntoPoiRef: null,
    supersededByPoiRef: null,
    statusChangedAt: instant,
  },
  facts: [
    fact(
      options.internalId,
      `${options.internalId.slice(4)}-identity`,
      "poi_identity",
    ),
  ],
  features: featureSet(options.internalId, options.featureOverrides ?? {}),
  visitProfiles: options.visitProfiles ?? [],
  regionRelations: options.regionRefs.map((regionRef, index) => ({
    regionRef,
    relationType: "located_in" as const,
    primary: index === 0,
    sourceRefs: [officialSourceRef],
  })),
  accessAnchors: options.accessAnchors ?? [],
  externalIds: [
    {
      provider: "fixture-provider",
      externalId: `provider-${options.internalId.slice(4)}`,
      sourceRef: providerSourceRef,
      status: "active",
    },
  ],
  assetRefs: [],
  sourceRefs: structuredClone(sourceRefs),
  revision: {
    recordRevision: 1,
    factsRevision: 1,
    featureRevision: 1,
    visitProfileRevision: options.visitProfiles?.length ? 1 : 0,
    createdAt: instant,
    updatedAt: instant,
  },
});

export const urbanAttractionPoiFixture = makePoi({
  internalId: "poi:tokyo-station",
  masterCode: "10001",
  nameJa: "東京駅",
  nameEn: "Tokyo Station",
  classification: "cityscape_landmark",
  regionRefs: ["region-tokyo", "district-central-tokyo"],
  featureOverrides: { "03": 8, "04": 7, "15": 8, "25": 3 },
  accessAnchors: [
    {
      anchorId: "access:tokyo-station-main",
      transportNodeRef: "transport-node:tokyo-station",
      kind: "rail",
      relationship: "primary",
      sourceRefs: [officialSourceRef],
    },
  ],
});

const templeVisitProfile: PoiVisitProfileV1 = {
  contractVersion: PLANNING_CONTRACT_VERSION,
  profileVersion: "1.0",
  profileId: "visit:sensoji-full",
  poiRef: "poi:sensoji-temple",
  visitMode: "full_visit",
  status: "active",
  minimumDurationMinutes: 30,
  recommendedDurationMinutes: 60,
  maximumUsefulDurationMinutes: 120,
  fixedWalkingLoad: 2,
  variableWalkingLoad: 3,
  fixedPhysicalLoad: 1,
  variablePhysicalLoad: 2,
  terrainModifier: null,
  standingModifier: null,
  sourceRefs: [officialSourceRef],
  confidence: 0.8,
  updatedAt: instant,
};

export const templePoiFixture = makePoi({
  internalId: "poi:sensoji-temple",
  masterCode: "60001",
  nameJa: "浅草寺",
  nameEn: "Senso-ji",
  classification: "religious_historic",
  regionRefs: ["district-asakusa-ueno", "region-tokyo"],
  featureOverrides: { "02": 9, "03": 8, "12": 9, "15": 9, "25": 5 },
  visitProfiles: [templeVisitProfile],
});

export const naturePoiFixture = makePoi({
  internalId: "poi:fuji-viewpoint",
  masterCode: "30001",
  nameJa: "富士山展望地",
  nameEn: "Mount Fuji viewpoint",
  classification: "nature",
  regionRefs: ["region-fuji-five-lakes"],
  featureOverrides: { "01": 9, "04": 9, "07": 9, "39": 8 },
});

export const onsenPoiFixture = makePoi({
  internalId: "poi:hakone-onsen",
  masterCode: "40001",
  nameJa: "箱根温泉",
  nameEn: "Hakone Onsen",
  classification: "experience",
  regionRefs: ["region-hakone"],
  featureOverrides: { "09": 9, "20": 9, "24": 8 },
});

export const shoppingFoodEntertainmentPoiFixture = makePoi({
  internalId: "poi:dotonbori-market",
  masterCode: "70001",
  nameJa: "道頓堀商店街",
  nameEn: "Dotonbori shopping district",
  classification: "shopping",
  regionRefs: ["district-namba-dotonbori", "region-osaka"],
  featureOverrides: { "05": 9, "06": 9, "08": 8, "11": 8 },
});

export const temporarilyClosedPoiFixture = makePoi({
  internalId: "poi:temporary-closure",
  masterCode: "10002",
  nameJa: "一時休館施設",
  nameEn: "Temporarily closed attraction",
  classification: "cityscape_landmark",
  regionRefs: ["region-tokyo"],
  lifecycle: {
    status: "temporarily_closed",
    mergedIntoPoiRef: null,
    supersededByPoiRef: null,
    statusChangedAt: instant,
  },
});

export const permanentlyClosedPoiFixture = makePoi({
  internalId: "poi:historical-closed-site",
  masterCode: "20001",
  nameJa: "閉館済歴史施設",
  nameEn: "Permanently closed historical site",
  classification: "culture_history",
  regionRefs: ["region-tokyo"],
  lifecycle: {
    status: "permanently_closed",
    mergedIntoPoiRef: null,
    supersededByPoiRef: null,
    statusChangedAt: instant,
  },
});

export const mergedDuplicatePoiFixture = makePoi({
  internalId: "poi:sensoji-alias",
  masterCode: null,
  nameJa: "浅草寺旧重複",
  nameEn: "Senso-ji duplicate",
  classification: "religious_historic",
  regionRefs: ["district-asakusa-ueno"],
  lifecycle: {
    status: "merged",
    mergedIntoPoiRef: templePoiFixture.internalId,
    supersededByPoiRef: null,
    statusChangedAt: instant,
  },
});

export const canonicalPoiPositiveFixtures = [
  urbanAttractionPoiFixture,
  templePoiFixture,
  naturePoiFixture,
  onsenPoiFixture,
  shoppingFoodEntertainmentPoiFixture,
  temporarilyClosedPoiFixture,
  permanentlyClosedPoiFixture,
  mergedDuplicatePoiFixture,
] as const;

export const canonicalPoiDatasetFixture: CanonicalPoiDatasetV1 = {
  schemaVersion: "1.0",
  datasetRevision: "task-050-fixture-r1",
  records: canonicalPoiPositiveFixtures.map((poi) => structuredClone(poi)),
};

const fixtureAllocations: MasterCodeEntryV1[] = canonicalPoiPositiveFixtures
  .filter(
    (poi): poi is CanonicalPoiV1 & { masterCode: string } =>
      poi.masterCode !== null,
  )
  .map((poi) => ({
    masterCode: poi.masterCode,
    entityType: `poi.${poi.classification.primary}`,
    entityRef: poi.internalId,
    lifecycleStatus: "active",
    supersededBy: null,
    sourceRefs: [
      "docs/tasks/TASK-050-a-canonical-poi-schema-validator-candidate-admission-boundary.md",
    ],
    provenance: [{ kind: "allocation_review", ref: "task-050-fixture-only" }],
    allocationReason:
      "TASK-050 deterministic fixture allocation; not production corpus allocation.",
    createdRevision: "task-050-fixture-r1",
    updatedRevision: "task-050-fixture-r1",
  }));

export const candidateAdmissionContextFixture: CandidateAdmissionContextV1 = {
  masterCodeRegistry: {
    ...structuredClone(masterCodeRegistry),
    registryRevision: "task-050-fixture-r1",
    entries: [
      ...structuredClone(masterCodeRegistry.entries),
      ...fixtureAllocations,
    ],
  },
  regionIds: [
    "region-tokyo",
    "district-central-tokyo",
    "district-asakusa-ueno",
    "region-fuji-five-lakes",
    "region-hakone",
    "district-namba-dotonbori",
    "region-osaka",
  ],
  existingPoiIds: canonicalPoiPositiveFixtures.map(
    ({ internalId }) => internalId,
  ),
  evidenceIds: [
    "evidence:identity",
    "evidence:duplicate",
    "evidence:provider-observation",
  ],
  evaluatedAt: instant,
};

export const admittedCandidateFixture: CandidateAdmissionEnvelopeV1 = {
  schemaVersion: "1.0",
  admissionId: "admission:tokyo-station",
  candidate: {
    candidateKey: "candidate:tokyo-station-001",
    proposedCanonical: structuredClone(urbanAttractionPoiFixture),
    identityResolution: {
      status: "resolved",
      resolvedPoiRef: urbanAttractionPoiFixture.internalId,
      evidenceRefs: ["evidence:identity"],
    },
    duplicateDisposition: {
      status: "unique",
      targetPoiRef: null,
      evidenceRefs: ["evidence:duplicate"],
    },
    providerObservations: [
      {
        provider: "fixture-provider",
        providerId: "provider-tokyo-station",
        sourceRef: "evidence:provider-observation",
        observedAt: instant,
        fields: [
          {
            fieldPath: "externalIds.fixture-provider",
            valueClass: "identifier",
            persistenceIntent: "reference_only",
            rightsPolicy: "reference_only",
          },
          {
            fieldPath: "providerPhoto",
            valueClass: "asset",
            persistenceIntent: "transient",
            rightsPolicy: "transient_only",
          },
        ],
      },
    ],
    featureEvidence: [
      { code: "01", observedValue: null, proposedValue: null },
      { code: "03", observedValue: 8, proposedValue: 8 },
    ],
    evidenceRefs: ["evidence:provider-observation"],
    materialConflicts: [],
  },
  requestedAt: instant,
};

export const mergeTargetCandidateFixture: CandidateAdmissionEnvelopeV1 = {
  ...structuredClone(admittedCandidateFixture),
  admissionId: "admission:sensoji-duplicate",
  candidate: {
    ...structuredClone(admittedCandidateFixture.candidate),
    candidateKey: "candidate:sensoji-duplicate",
    proposedCanonical: structuredClone(mergedDuplicatePoiFixture),
    identityResolution: {
      status: "resolved",
      resolvedPoiRef: mergedDuplicatePoiFixture.internalId,
      evidenceRefs: ["evidence:identity"],
    },
    duplicateDisposition: {
      status: "merge_into",
      targetPoiRef: templePoiFixture.internalId,
      evidenceRefs: ["evidence:duplicate"],
    },
    providerObservations: [],
    featureEvidence: [],
    evidenceRefs: ["evidence:identity", "evidence:duplicate"],
  },
};
