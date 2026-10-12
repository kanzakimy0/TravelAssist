import type { PoiSearchQueryV1 } from "../../shared/contracts/poi-search/types";

/**
 * An implementation must retrieve a complete search candidate set for this
 * bounded query from a runtime-authorized canonical index. The test adapter
 * scans fixtures. The runtime adapter reuses TASK-083's explicitly authorized,
 * bounded Pilot-100 repository; this is not a full-corpus indexing strategy.
 */
export interface CanonicalPoiSearchRepository {
  findCandidates(query: Readonly<PoiSearchQueryV1>): Promise<{
    datasetRevision: string;
    records: unknown[];
  }>;
}
