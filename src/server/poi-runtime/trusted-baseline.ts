import "server-only";
import { createHash } from "node:crypto";

import {
  POI_FEATURE_CODES,
  POI_FEATURE_DEFINITIONS,
} from "../../shared/contracts/planning/features";
import { parsePoiFeatureSetV1 } from "../../shared/contracts/planning/validation";
import { parseCanonicalPoiV1 } from "../../shared/contracts/poi/validation";
import type { CanonicalPoiV1 } from "../../shared/contracts/poi/types";

const BASELINE_PATH =
  "src/shared/data/canonical-poi-pilot100.feature43-trusted-baseline.v1.json";
const SOURCE_WORKBOOK_PATH =
  "data/poi/full/registry/travelassist-japan-poi-master-registry-v1.66-B-5xxxx-7xxxx-feature43-phase2c-review-v2.xlsx";
const SOURCE_WORKBOOK_SHA256 =
  "b396723fbe1ed326fc205b7b259dd992019120182ad35044c2a96bd8a54d4014";
const BASELINE_MANIFEST_SHA256 =
  "9cfb584c6594d44181278d889a56707f0ed6af5e537cb23bd15752592fa1bbac";
const BASE_DATASET_PATH = "src/shared/data/canonical-poi-pilot100.v1.json";

const digest = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export class TrustedFeature43BaselineIntegrityError extends Error {
  constructor() {
    super("TRUSTED_FEATURE43_BASELINE_INTEGRITY_FAILED");
  }
}

type BaselineRecord = {
  internalId: string;
  masterCode: string;
  legacyUuid: string;
  legacyMasterCodeClaim: string;
  feature43Row: number;
  featureSet: unknown;
};

type BaselineArtifact = {
  schemaVersion: string;
  scope: string;
  trustPolicy: string;
  revision: string;
  records: BaselineRecord[];
};

type BaselineManifest = {
  schemaVersion: string;
  scope: string;
  trustPolicy: string;
  baselineAttachAuthorized: boolean;
  candidateCorpusAuthorized: boolean;
  authorizingTask: string;
  artifactPath: string;
  artifactRevision: string;
  artifactSha256: string;
  baseCanonicalDatasetPath: string;
  baseCanonicalDatasetRevision: string;
  baseCanonicalDatasetSha256: string;
  baseRuntimeManifestSha256: string;
  sourceWorkbookPath: string;
  sourceWorkbookSha256: string;
  featureRegistryVersion: string;
  featureRegistryDefinitionSha256: string;
  recordCount: number;
  featureCount: number;
  cellCount: number;
  internalIds: string[];
  masterCodes: string[];
  legacyUuids: string[];
};

/** Attach only to the exact, already admitted Canonical Pilot-100 snapshot. */
export function attachTrustedFeature43Baseline(
  baseRecords: readonly CanonicalPoiV1[],
  datasetInput: unknown,
  runtimeManifestInput: unknown,
  artifactInput: unknown,
  baselineManifestInput: unknown,
): { records: CanonicalPoiV1[]; revision: string } {
  const fail = (): never => {
    throw new TrustedFeature43BaselineIntegrityError();
  };
  if (
    !artifactInput ||
    typeof artifactInput !== "object" ||
    Array.isArray(artifactInput) ||
    !baselineManifestInput ||
    typeof baselineManifestInput !== "object" ||
    Array.isArray(baselineManifestInput) ||
    !datasetInput ||
    typeof datasetInput !== "object" ||
    Array.isArray(datasetInput)
  )
    fail();
  const artifact = artifactInput as BaselineArtifact;
  const manifest = baselineManifestInput as BaselineManifest;
  const dataset = datasetInput as { datasetRevision?: unknown };
  if (
    artifact.schemaVersion !== "1.0" ||
    artifact.scope !== "CANONICAL_POI_PILOT_100_FEATURE43_TRUSTED_BASELINE" ||
    artifact.trustPolicy !== "TRUSTED_INTERNAL_BASELINE" ||
    manifest.schemaVersion !== "1.0" ||
    digest(baselineManifestInput) !== BASELINE_MANIFEST_SHA256 ||
    manifest.scope !== artifact.scope ||
    manifest.trustPolicy !== artifact.trustPolicy ||
    manifest.baselineAttachAuthorized !== true ||
    manifest.candidateCorpusAuthorized !== false ||
    manifest.authorizingTask !== "TASK-088-A" ||
    manifest.artifactPath !== BASELINE_PATH ||
    manifest.artifactRevision !== artifact.revision ||
    manifest.artifactSha256 !== digest(artifactInput) ||
    manifest.baseCanonicalDatasetPath !== BASE_DATASET_PATH ||
    manifest.baseCanonicalDatasetRevision !== dataset.datasetRevision ||
    manifest.baseCanonicalDatasetSha256 !== digest(datasetInput) ||
    manifest.baseRuntimeManifestSha256 !== digest(runtimeManifestInput) ||
    manifest.sourceWorkbookPath !== SOURCE_WORKBOOK_PATH ||
    manifest.sourceWorkbookSha256 !== SOURCE_WORKBOOK_SHA256 ||
    manifest.featureRegistryVersion !== "1.0" ||
    manifest.featureRegistryDefinitionSha256 !==
      digest(POI_FEATURE_DEFINITIONS) ||
    manifest.recordCount !== 100 ||
    manifest.featureCount !== POI_FEATURE_CODES.length ||
    manifest.cellCount !== 4300 ||
    !Array.isArray(artifact.records) ||
    !Array.isArray(manifest.internalIds) ||
    !Array.isArray(manifest.masterCodes) ||
    !Array.isArray(manifest.legacyUuids) ||
    artifact.records.length !== 100 ||
    baseRecords.length !== 100 ||
    manifest.internalIds.length !== 100 ||
    manifest.masterCodes.length !== 100 ||
    manifest.legacyUuids.length !== 100
  )
    fail();
  if (
    new Set(manifest.internalIds).size !== 100 ||
    new Set(manifest.masterCodes).size !== 100 ||
    new Set(manifest.legacyUuids).size !== 100
  )
    fail();
  const attached = baseRecords.map((base, index) => {
    const row = artifact.records[index];
    const uuid = manifest.legacyUuids[index];
    if (
      !row ||
      row.internalId !== manifest.internalIds[index] ||
      row.internalId !== base.internalId ||
      row.masterCode !== manifest.masterCodes[index] ||
      row.masterCode !== base.masterCode ||
      row.legacyUuid !== uuid ||
      row.internalId !== `poi:${uuid}` ||
      typeof row.legacyMasterCodeClaim !== "string" ||
      !/^\d{5}$/.test(row.legacyMasterCodeClaim) ||
      !Number.isSafeInteger(row.feature43Row) ||
      row.feature43Row < 2 ||
      base.features !== null ||
      !base.sourceRefs.some(
        (source) => source.sourceRef === `source:v166:${uuid}`,
      )
    )
      fail();
    const parsed = parsePoiFeatureSetV1(row.featureSet);
    if (!parsed.ok) fail();
    const featureSet = (parsed as Extract<typeof parsed, { ok: true }>).value;
    if (
      featureSet.poiRef !== base.internalId ||
      featureSet.sourceRefs.length !== 1 ||
      featureSet.sourceRefs[0] !== `source:v166:${uuid}` ||
      Object.keys(featureSet.values).length !== POI_FEATURE_CODES.length ||
      Object.keys(featureSet.values).some(
        (code) =>
          !POI_FEATURE_CODES.includes(
            code as (typeof POI_FEATURE_CODES)[number],
          ),
      ) ||
      POI_FEATURE_CODES.some(
        (code) =>
          !Number.isInteger(featureSet.values[code]) ||
          featureSet.values[code] === null ||
          featureSet.values[code] < 0 ||
          featureSet.values[code] > 9,
      )
    )
      fail();
    const attachedRecord: CanonicalPoiV1 = {
      ...structuredClone(base),
      features: structuredClone(featureSet),
      revision: {
        ...base.revision,
        featureRevision: base.revision.featureRevision + 1,
        updatedAt: featureSet.updatedAt,
      },
    };
    if (!parseCanonicalPoiV1(attachedRecord).ok) fail();
    return attachedRecord;
  });
  if (attached.length * POI_FEATURE_CODES.length !== manifest.cellCount) fail();
  return { records: attached, revision: artifact.revision };
}
