import type { PoiSearchQueryV1 } from "../../shared/contracts/poi-search/types";

/**
 * An implementation must retrieve a complete search candidate set for this
 * bounded query from a runtime-authorized canonical index. The test adapter
 * scans fixtures; no production adapter is configured by TASK-080.
 */
export interface CanonicalPoiSearchRepository {
  findCandidates(query: Readonly<PoiSearchQueryV1>): Promise<{
    datasetRevision: string;
    records: unknown[];
  }>;
}
