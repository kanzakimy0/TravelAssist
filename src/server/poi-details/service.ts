import "server-only";
import { parseCanonicalPoiV1 } from "../../shared/contracts/poi/validation";
import {
  projectPoiDetail,
  type PoiDetailV1,
} from "../../shared/contracts/poi-details";
import {
  PoiDetailRepositoryUnavailable,
  type PoiDetailRepository,
} from "./repository";

export type PoiDetailErrorCode =
  | "INVALID_POI_REF"
  | "POI_NOT_FOUND"
  | "POI_DETAIL_REPOSITORY_UNAVAILABLE"
  | "POI_DETAIL_INVALID_CANONICAL_RECORD";

export class PoiDetailError extends Error {
  readonly code: PoiDetailErrorCode;
  constructor(code: PoiDetailErrorCode) {
    super(code);
    this.code = code;
  }
}

/** Mirrors WBS 7.4 internalId grammar; all other identity families are rejected. */
export function isCanonicalPoiRef(value: unknown): value is string {
  return (
    typeof value === "string" && /^poi:[a-z0-9][a-z0-9._-]{2,127}$/.test(value)
  );
}

export async function readPoiDetail(
  poiRef: unknown,
  repository: PoiDetailRepository,
): Promise<PoiDetailV1> {
  if (!isCanonicalPoiRef(poiRef)) throw new PoiDetailError("INVALID_POI_REF");
  let record: unknown;
  try {
    record = await repository.getByInternalId(poiRef);
  } catch (error) {
    if (error instanceof PoiDetailRepositoryUnavailable)
      throw new PoiDetailError("POI_DETAIL_REPOSITORY_UNAVAILABLE");
    throw new PoiDetailError("POI_DETAIL_REPOSITORY_UNAVAILABLE");
  }
  if (record === null) throw new PoiDetailError("POI_NOT_FOUND");
  const parsed = parseCanonicalPoiV1(record);
  if (!parsed.ok || parsed.value.internalId !== poiRef)
    throw new PoiDetailError("POI_DETAIL_INVALID_CANONICAL_RECORD");
  return projectPoiDetail(parsed.value);
}
