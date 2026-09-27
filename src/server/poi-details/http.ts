import "server-only";
import { NextResponse } from "next/server";
import {
  unavailablePoiDetailRepository,
  type PoiDetailRepository,
} from "./repository";
import { PoiDetailError, readPoiDetail } from "./service";

const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
} as const;

export async function handlePoiDetail(
  poiRef: unknown,
  repository: PoiDetailRepository = unavailablePoiDetailRepository,
): Promise<NextResponse> {
  try {
    const data = await readPoiDetail(poiRef, repository);
    return NextResponse.json({ ok: true, data }, { headers: HEADERS });
  } catch (error) {
    const code =
      error instanceof PoiDetailError
        ? error.code
        : "POI_DETAIL_REPOSITORY_UNAVAILABLE";
    const status =
      code === "INVALID_POI_REF" ? 400 : code === "POI_NOT_FOUND" ? 404 : 503;
    return NextResponse.json(
      { ok: false, error: { code } },
      { status, headers: HEADERS },
    );
  }
}
