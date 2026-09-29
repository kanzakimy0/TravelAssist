import "server-only";
import { createHash } from "node:crypto";

import datasetJson from "../../shared/data/canonical-poi-pilot100.v1.json" with { type: "json" };
import runtimeManifestJson from "../../shared/data/canonical-poi-pilot100.runtime-manifest.v1.json" with { type: "json" };
import featureOverlayJson from "../../shared/data/canonical-poi-pilot100.feature43-overlay.v1.json" with { type: "json" };
import featureOverlayManifestJson from "../../shared/data/canonical-poi-pilot100.feature43-overlay.manifest.v1.json" with { type: "json" };
import registryJson from "../../shared/data/master-code-registry.v1.json" with { type: "json" };
import { parseCanonicalPoiDatasetV1 } from "../../shared/contracts/poi";
import type { CanonicalPoiV1 } from "../../shared/contracts/poi/types";
import type { PoiFeatureSetV1 } from "../../shared/contracts/planning/features";
import { parseMasterCodeRegistryV1 } from "../../shared/master-code";
import type { PoiDetailRepository } from "../poi-details/repository";

const DATASET_PATH = "src/shared/data/canonical-poi-pilot100.v1.json";
const REGISTRY_PATH = "src/shared/data/master-code-registry.v1.json";

const digest = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export class CanonicalPoiRuntimeIntegrityError extends Error {
  constructor() {
    super("CANONICAL_POI_RUNTIME_INTEGRITY_FAILED");
  }
}

export interface CanonicalPoiRuntimeRepository extends PoiDetailRepository {
  readonly datasetRevision: string;
  list(): Promise<readonly CanonicalPoiV1[]>;
  /** Structural handoff for TASK-080's findCandidates repository contract. */
  findCandidates(query: unknown): Promise<{
    datasetRevision: string;
    records: CanonicalPoiV1[];
  }>;
}

type RuntimeManifest = {
  schemaVersion: string;
  scope: string;
  runtimeImportAuthorized: boolean;
  authorizingTask: string;
  datasetPath: string;
  datasetRevision: string;
  datasetSha256: string;
  recordCount: number;
  internalIds: string[];
  masterCodes: string[];
  registryPath: string;
  registryRevision: string;
  registrySha256: string;
  candidateCorpusAuthorized: boolean;
};

type FeatureOverlay = {
  schemaVersion: string;
  task: string;
  revision: string;
  baseDatasetRevision: string;
  baseDatasetSha256: string;
  recordCount: number;
  decisionCount: number;
  records: {
    internalId: string;
    masterCode: string;
    features: PoiFeatureSetV1 | null;
  }[];
};

type FeatureOverlayManifest = {
  schemaVersion: string;
  scope: string;
  runtimeImportAuthorized: boolean;
  authorizingTask: string;
  candidateCorpusAuthorized: boolean;
  baseDatasetSha256: string;
  baseInternalIds: string[];
  baseMasterCodes: string[];
  overlayPath: string;
  overlayRevision: string;
  overlaySha256: string;
  recordCount: number;
  decisionCount: number;
};

/** Strict, in-memory loader. No request-derived path or candidate-file fallback. */
export function createCanonicalPoiRuntimeRepository(
  datasetInput: unknown,
  manifestInput: unknown,
  registryInput: unknown,
  featureOverlayInput: unknown = null,
  featureOverlayManifestInput: unknown = null,
): CanonicalPoiRuntimeRepository {
  const fail = (): never => {
    throw new CanonicalPoiRuntimeIntegrityError();
  };
  if (
    manifestInput === null ||
    typeof manifestInput !== "object" ||
    Array.isArray(manifestInput)
  )
    fail();
  const manifest = manifestInput as RuntimeManifest;
  if (
    manifest.schemaVersion !== "1.0" ||
    manifest.scope !== "CANONICAL_POI_PILOT_100" ||
    manifest.runtimeImportAuthorized !== true ||
    manifest.candidateCorpusAuthorized !== false ||
    manifest.authorizingTask !== "TASK-083-A" ||
    manifest.datasetPath !== DATASET_PATH ||
    manifest.registryPath !== REGISTRY_PATH ||
    manifest.recordCount !== 100 ||
    !Array.isArray(manifest.internalIds) ||
    !Array.isArray(manifest.masterCodes) ||
    manifest.internalIds.length !== 100 ||
    manifest.masterCodes.length !== 100
  )
    fail();
  const parsedDataset = parseCanonicalPoiDatasetV1(datasetInput);
  const parsedRegistry = parseMasterCodeRegistryV1(registryInput);
  if (!parsedDataset.ok) throw new CanonicalPoiRuntimeIntegrityError();
  if (!parsedRegistry.ok) throw new CanonicalPoiRuntimeIntegrityError();
  const dataset = parsedDataset.value;
  const registry = parsedRegistry.value;
  if (
    dataset.datasetRevision !== manifest.datasetRevision ||
    registry.registryRevision !== manifest.registryRevision ||
    digest(datasetInput) !== manifest.datasetSha256 ||
    digest(registryInput) !== manifest.registrySha256 ||
    dataset.records.length !== 100
  )
    fail();
  const allocations = new Map(
    registry.entries.map((entry) => [entry.masterCode, entry]),
  );
  if ((featureOverlayInput === null) !== (featureOverlayManifestInput === null))
    fail();
  let records: CanonicalPoiV1[] = dataset.records;
  let revision = dataset.datasetRevision;
  if (featureOverlayInput !== null && featureOverlayManifestInput !== null) {
    if (
      typeof featureOverlayInput !== "object" ||
      Array.isArray(featureOverlayInput) ||
      typeof featureOverlayManifestInput !== "object" ||
      Array.isArray(featureOverlayManifestInput)
    )
      fail();
    const overlay = featureOverlayInput as FeatureOverlay;
    const overlayManifest =
      featureOverlayManifestInput as FeatureOverlayManifest;
    if (
      overlay.schemaVersion !== "1.0" ||
      overlay.task !== "TASK-081-B" ||
      overlay.revision !== "task-081-b-feature43-v1" ||
      overlay.baseDatasetRevision !== dataset.datasetRevision ||
      overlay.baseDatasetSha256 !== manifest.datasetSha256 ||
      overlay.recordCount !== 100 ||
      overlay.decisionCount !== 4300 ||
      !Array.isArray(overlay.records) ||
      overlay.records.length !== 100 ||
      overlayManifest.schemaVersion !== "1.0" ||
      overlayManifest.scope !== "CANONICAL_POI_PILOT_100_FEATURE43_OVERLAY" ||
      overlayManifest.runtimeImportAuthorized !== true ||
      overlayManifest.authorizingTask !== "TASK-081-B" ||
      overlayManifest.candidateCorpusAuthorized !== false ||
      overlayManifest.baseDatasetSha256 !== manifest.datasetSha256 ||
      overlayManifest.overlayPath !==
        "src/shared/data/canonical-poi-pilot100.feature43-overlay.v1.json" ||
      overlayManifest.overlayRevision !== overlay.revision ||
      overlayManifest.recordCount !== 100 ||
      overlayManifest.decisionCount !== 4300 ||
      digest(featureOverlayInput) !== overlayManifest.overlaySha256 ||
      JSON.stringify(overlayManifest.baseInternalIds) !==
        JSON.stringify(manifest.internalIds) ||
      JSON.stringify(overlayManifest.baseMasterCodes) !==
        JSON.stringify(manifest.masterCodes)
    )
      fail();
    records = dataset.records.map((poi, index) => {
      const row = overlay.records[index];
      if (
        row?.internalId !== poi.internalId ||
        row.masterCode !== poi.masterCode ||
        (row.features !== null && row.features?.poiRef !== poi.internalId)
      )
        fail();
      return { ...poi, features: row.features };
    });
    const enriched = parseCanonicalPoiDatasetV1({
      ...dataset,
      records,
    });
    if (!enriched.ok) fail();
    revision = dataset.datasetRevision + "+" + overlay.revision;
  }
  const byId = new Map<string, CanonicalPoiV1>();
  records.forEach((poi, index) => {
    if (
      poi.internalId !== manifest.internalIds[index] ||
      poi.masterCode !== manifest.masterCodes[index] ||
      allocations.get(poi.masterCode ?? "")?.entityRef !== poi.internalId ||
      allocations.get(poi.masterCode ?? "")?.entityType !==
        `poi.${poi.classification.primary}` ||
      allocations.get(poi.masterCode ?? "")?.lifecycleStatus !== "active"
    )
      fail();
    byId.set(poi.internalId, poi);
  });
  if (byId.size !== 100 || new Set(manifest.masterCodes).size !== 100) fail();
  return {
    datasetRevision: revision,
    async getByInternalId(internalId) {
      const record = byId.get(internalId);
      return record === undefined ? null : structuredClone(record);
    },
    async list() {
      return records.map((record) => structuredClone(record));
    },
    async findCandidates(_query) {
      // The Pilot is bounded to exactly 100; returning all 100 lets TASK-080's
      // search service apply its own canonical filtering and pagination.
      return {
        datasetRevision: revision,
        records: records.map((record) => structuredClone(record)),
      };
    },
  };
}

export const canonicalPoiRuntimeRepository =
  createCanonicalPoiRuntimeRepository(
    datasetJson,
    runtimeManifestJson,
    registryJson,
    featureOverlayJson,
    featureOverlayManifestJson,
  );
