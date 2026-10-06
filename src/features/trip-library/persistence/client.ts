import {
  requestTripApi,
  tripResourcePath,
  type TripTransport,
} from "../../../shared/contracts/trip-library/client";
import {
  tripIfMatch,
  TripLibraryApiError,
} from "../../../shared/contracts/trip-library/index";
import {
  parseTripResource,
  parseTripPage,
  type TripLibraryPageV1,
} from "./resource";
import type { TripDraftRequestV1 } from "./requests";
export function tripLibraryClient(transport: TripTransport = fetch) {
  async function resource(
    path: string,
    method: string,
    body?: unknown,
    revision?: number,
  ) {
    const result = await requestTripApi(
      path,
      method,
      body,
      revision,
      transport,
    );
    try {
      const parsed = parseTripResource(result.data);
      if (result.etag !== tripIfMatch(parsed.storageRevision))
        throw new Error();
      return parsed;
    } catch {
      throw new TripLibraryApiError("TRIP_LIBRARY_UNAVAILABLE");
    }
  }
  return {
    create: (input: TripDraftRequestV1 & { creationKey: string }) =>
      resource("/api/trip-library", "POST", { schemaVersion: "1.0", ...input }),
    read: (id: string) => resource(tripResourcePath(id), "GET"),
    update: (
      id: string,
      revision: number,
      input: Omit<TripDraftRequestV1, "creationKey">,
    ) => resource(tripResourcePath(id), "PUT", input, revision),
    save: (
      id: string,
      revision: number,
      planSnapshot: import("../../../shared/contracts/trips/index").TripPlanSnapshotV1,
    ) =>
      resource(
        tripResourcePath(id) + "/save",
        "POST",
        { schemaVersion: "1.0", planSnapshot },
        revision,
      ),
    history: (id: string, revision: number) =>
      resource(tripResourcePath(id) + "/history", "POST", undefined, revision),
    copy: (id: string, revision: number, creationKey: string) =>
      resource(
        tripResourcePath(id) + "/copy",
        "POST",
        { schemaVersion: "1.0", creationKey },
        revision,
      ),
    delete: async (id: string, revision: number) => {
      await requestTripApi(
        tripResourcePath(id),
        "DELETE",
        undefined,
        revision,
        transport,
      );
    },
    list: async (
      query: {
        state?: "all" | "draft" | "saved" | "history";
        limit?: number;
        cursor?: string;
      } = {},
    ): Promise<TripLibraryPageV1> => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query))
        if (value !== undefined) params.set(key, String(value));
      const result = await requestTripApi(
        "/api/trip-library" + (params.size ? "?" + params.toString() : ""),
        "GET",
        undefined,
        undefined,
        transport,
      );
      return parseTripPage(result.data);
    },
  };
}
