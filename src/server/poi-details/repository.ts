import "server-only";
import type { CanonicalPoiV1 } from "../../shared/contracts/poi/types";

/** Storage adapter is deliberately absent until canonical runtime import is approved. */
export interface PoiDetailRepository {
  getByInternalId(internalId: string): Promise<unknown | null>;
}

export class PoiDetailRepositoryUnavailable extends Error {
  constructor() {
    super("POI_DETAIL_REPOSITORY_UNAVAILABLE");
  }
}

export const unavailablePoiDetailRepository: PoiDetailRepository = {
  async getByInternalId(): Promise<never> {
    throw new PoiDetailRepositoryUnavailable();
  },
};

/** Deterministic fixture adapter for tests; never used by the public route. */
export function createFixturePoiDetailRepository(
  records: readonly CanonicalPoiV1[],
): PoiDetailRepository {
  const byId = new Map<string, unknown>();
  for (const record of records)
    byId.set(record.internalId, structuredClone(record));
  return {
    async getByInternalId(internalId) {
      const record = byId.get(internalId);
      return record === undefined ? null : structuredClone(record);
    },
  };
}
