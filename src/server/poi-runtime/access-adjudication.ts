import { createHash } from "node:crypto";
import type { CanonicalPoiDatasetV1 } from "../../shared/contracts/poi/types";

export const ACCESS_ADJUDICATION_PATH =
  "src/shared/data/canonical-poi-pilot100.access-adjudication.v1.json";
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

type Decision = {
  internalId: string;
  masterCode: string;
  name: string;
  lifecycleStatus: string;
  decisionStatus: string;
  owner: string;
  publicAccess: string;
  generalTouristAccessEligible: boolean;
  visitorEndpoint: unknown;
  replacementPoiRef: unknown;
  evidence: { url: string; finding: string }[];
};
type Adjudication = {
  schemaVersion: string;
  scope: string;
  owner: string;
  authorizingTask: string;
  revision: string;
  decisionStatus: string;
  datasetRevision: string;
  datasetSha256: string;
  membershipPreserved: boolean;
  canonicalRecordCount: number;
  adjudicatedCount: number;
  records: Decision[];
  downstreamAssessment: {
    excludedInternalIds: string[];
    remainingRecordCount: number;
  };
};

/** Owner decisions are not TransportNode/route evidence and never rebind a POI. */
export function validateCanonicalAccessAdjudication(
  dataset: CanonicalPoiDatasetV1,
  manifestInput: unknown,
  input: unknown,
): void {
  const fail = (): never => {
    throw new Error("CANONICAL_ACCESS_ADJUDICATION_INTEGRITY_FAILED");
  };
  if (!input || typeof input !== "object" || Array.isArray(input)) fail();
  const a = input as Adjudication;
  const m = manifestInput as {
    accessAdjudicationPath: string;
    accessAdjudicationRevision: string;
    accessAdjudicationSha256: string;
  };
  if (
    m.accessAdjudicationPath !== ACCESS_ADJUDICATION_PATH ||
    m.accessAdjudicationRevision !== a.revision ||
    m.accessAdjudicationSha256 !== digest(input) ||
    a.schemaVersion !== "1.0" ||
    a.scope !== "CANONICAL_POI_ACCESS_ADJUDICATION" ||
    a.authorizingTask !== "TASK-083-A" ||
    a.owner !== "A_CANONICAL" ||
    a.decisionStatus !== "FINAL" ||
    a.membershipPreserved !== true ||
    a.datasetRevision !== dataset.datasetRevision ||
    a.datasetSha256 !== digest(dataset) ||
    a.canonicalRecordCount !== dataset.records.length ||
    !Array.isArray(a.records) ||
    a.adjudicatedCount !== a.records.length ||
    new Set(a.records.map((r) => r.internalId)).size !== a.records.length ||
    !a.downstreamAssessment ||
    !Array.isArray(a.downstreamAssessment.excludedInternalIds) ||
    JSON.stringify([...a.downstreamAssessment.excludedInternalIds].sort()) !==
      JSON.stringify(a.records.map((r) => r.internalId).sort()) ||
    a.downstreamAssessment.remainingRecordCount !==
      dataset.records.length - a.records.length
  )
    fail();
  const lifecycleFor: Record<string, string> = {
    CLOSED: "permanently_closed",
    RESTRICTED_RESIDENTS_RECOVERY_ONLY: "temporarily_closed",
    NOT_A_VISITOR_ENDPOINT: "active",
    HISTORICAL_RECORD_ONLY: "active",
  };
  for (const row of a.records) {
    const poi = dataset.records.find((p) => p.internalId === row.internalId);
    if (
      !poi ||
      poi.masterCode !== row.masterCode ||
      !poi.names.localized.some((n) => n.value === row.name) ||
      poi.lifecycle.status !== row.lifecycleStatus ||
      lifecycleFor[row.publicAccess] !== row.lifecycleStatus ||
      row.owner !== "A_CANONICAL" ||
      row.decisionStatus !== "FINAL" ||
      row.generalTouristAccessEligible !== false ||
      row.visitorEndpoint !== null ||
      row.replacementPoiRef !== null ||
      !Array.isArray(row.evidence) ||
      row.evidence.length === 0 ||
      !row.evidence.every(
        (e) =>
          typeof e.url === "string" &&
          e.url.startsWith("https://") &&
          typeof e.finding === "string" &&
          e.finding.length > 0,
      ) ||
      !row.evidence.every((e) =>
        poi.sourceRefs.some(
          (s) => s.locator === e.url && s.sourceKind === "official",
        ),
      )
    )
      fail();
  }
}
