import "server-only";
import accessAdjudicationJson from "../../shared/data/canonical-poi-pilot100.access-adjudication.v1.json" with { type: "json" };
import { validateCanonicalAccessAdjudication } from "./access-adjudication";
import { createHash } from "node:crypto";

import datasetJson from "../../shared/data/canonical-poi-pilot100.v1.json" with { type: "json" };
import runtimeManifestJson from "../../shared/data/canonical-poi-pilot100.runtime-manifest.v1.json" with { type: "json" };
import trustedBaselineJson from "../../shared/data/canonical-poi-pilot100.feature43-trusted-baseline.v1.json" with { type: "json" };
import trustedBaselineManifestJson from "../../shared/data/canonical-poi-pilot100.feature43-trusted-baseline.manifest.v1.json" with { type: "json" };
import registryJson from "../../shared/data/master-code-registry.v1.json" with { type: "json" };
import { parseCanonicalPoiDatasetV1 } from "../../shared/contracts/poi";
import type { CanonicalPoiV1 } from "../../shared/contracts/poi/types";
import { parseMasterCodeRegistryV1 } from "../../shared/master-code";
import type { PoiDetailRepository } from "../poi-details/repository";
import {
  attachTrustedFeature43Baseline,
  TrustedFeature43BaselineIntegrityError,
} from "./trusted-baseline";

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
  readonly scope: "CANONICAL_POI_PILOT_100";
  readonly runtimeImportAuthorized: true;
  readonly internalIds: readonly string[];
  readonly datasetRevision: string;
  readonly featureBaselineRevision: string | null;
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

/** Strict, in-memory loader. No request-derived path or candidate-file fallback. */
export function createCanonicalPoiRuntimeRepository(
  datasetInput: unknown,
  manifestInput: unknown,
  registryInput: unknown,
  trustedBaselineInput?: unknown,
  trustedBaselineManifestInput?: unknown,
  accessAdjudicationInput: unknown = accessAdjudicationJson,
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
  try {
    validateCanonicalAccessAdjudication(
      dataset,
      manifestInput,
      accessAdjudicationInput,
    );
  } catch {
    fail();
  }
  const allocations = new Map(
    registry.entries.map((entry) => [entry.masterCode, entry]),
  );
  const byId = new Map<string, CanonicalPoiV1>();
  dataset.records.forEach((poi, index) => {
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
  if (
    (trustedBaselineInput === undefined) !==
    (trustedBaselineManifestInput === undefined)
  )
    fail();
  let effectiveRecords = dataset.records;
  let featureBaselineRevision: string | null = null;
  if (trustedBaselineInput !== undefined) {
    try {
      const attached = attachTrustedFeature43Baseline(
        dataset.records,
        datasetInput,
        manifestInput,
        trustedBaselineInput,
        trustedBaselineManifestInput,
      );
      effectiveRecords = attached.records;
      featureBaselineRevision = attached.revision;
    } catch (error) {
      if (error instanceof TrustedFeature43BaselineIntegrityError) fail();
      throw error;
    }
  }
  const effectiveById = new Map(
    effectiveRecords.map((record) => [record.internalId, record]),
  );
  return {
    scope: "CANONICAL_POI_PILOT_100",
    runtimeImportAuthorized: true,
    internalIds: [...manifest.internalIds],
    datasetRevision: dataset.datasetRevision,
    featureBaselineRevision,
    async getByInternalId(internalId) {
      const record = effectiveById.get(internalId);
      return record === undefined ? null : structuredClone(record);
    },
    async list() {
      return effectiveRecords.map((record) => structuredClone(record));
    },
    async findCandidates(_query) {
      // The Pilot is bounded to exactly 100; returning all 100 lets TASK-080's
      // search service apply its own canonical filtering and pagination. Search
      // does not need restricted internal scoring ratings.
      return {
        datasetRevision: dataset.datasetRevision,
        records: dataset.records.map((record) => structuredClone(record)),
      };
    },
  };
}

export const canonicalPoiRuntimeRepository =
  createCanonicalPoiRuntimeRepository(
    datasetJson,
    runtimeManifestJson,
    registryJson,
    trustedBaselineJson,
    trustedBaselineManifestJson,
  );
