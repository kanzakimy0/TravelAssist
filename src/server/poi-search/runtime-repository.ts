import "server-only";

import type { CanonicalPoiSearchRepository } from "./repository";

/** Reuse TASK-083's authorized Pilot-100 loader and its integrity gates. */
export const runtimePoiSearchRepository: CanonicalPoiSearchRepository = {
  async findCandidates(query) {
    // Load inside the service error boundary: missing/tampered authorization
    // must yield the stable unavailable response, including on first request.
    const { canonicalPoiRuntimeRepository } =
      await import("../poi-runtime/repository");
    return canonicalPoiRuntimeRepository.findCandidates(query);
  },
};
