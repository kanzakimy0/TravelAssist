import "server-only";

import type { PoiMobilityEdgeV1 } from "../../shared/poi-edge-graph";
import { createPoiEdgeLookup } from "../../shared/poi-edge-graph";

export interface PoiEdgeRepository {
  getPoiEdges(fromPoiId: string): readonly PoiMobilityEdgeV1[];
  getPoiEdge(fromPoiId: string, toPoiId: string): PoiMobilityEdgeV1 | null;
  findMobilityOptions(
    fromPoiId: string,
    toPoiId: string,
    context?: { avoidStairs?: boolean },
  ): ReturnType<ReturnType<typeof createPoiEdgeLookup>["findMobilityOptions"]>;
}

export class PoiEdgeRepositoryUnavailable extends Error {
  constructor() {
    super("POI_EDGE_REPOSITORY_UNAVAILABLE");
  }
}

/**
 * No Canonical POI runtime corpus or licensed route batch import is present
 * on develop. Production callers fail closed until a separately accepted
 * dataset and authorization are wired by a later task.
 */
export const unavailablePoiEdgeRepository: PoiEdgeRepository = {
  getPoiEdges() {
    throw new PoiEdgeRepositoryUnavailable();
  },
  getPoiEdge() {
    throw new PoiEdgeRepositoryUnavailable();
  },
  findMobilityOptions() {
    throw new PoiEdgeRepositoryUnavailable();
  },
};
