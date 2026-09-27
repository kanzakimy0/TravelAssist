import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { parsePoiSearchQuery } from "../../shared/contracts/poi-search/query";
import type { PoiSearchResultV1 } from "../../shared/contracts/poi-search/types";
import type { CanonicalPoiSearchRepository } from "./repository";
import { searchCanonicalPois } from "./service";

const SEARCH_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export interface PoiSearchHandlerDependencies {
  repository?: CanonicalPoiSearchRepository | null;
}

function json(result: PoiSearchResultV1, status: number) {
  return NextResponse.json(result, { status, headers: SEARCH_HEADERS });
}

export function createPoiSearchHandler(
  dependencies: PoiSearchHandlerDependencies = {},
) {
  const repository = dependencies.repository ?? null;
  return async function handle(request: NextRequest) {
    if (request.url.length > 4_096)
      return json(
        {
          ok: false,
          error: {
            code: "invalid_request",
            message: "The search request is invalid.",
          },
        },
        400,
      );
    const parsed = parsePoiSearchQuery(request.nextUrl.searchParams);
    if (!parsed.ok)
      return json(
        {
          ok: false,
          error: {
            code: "invalid_request",
            message: "The search request is invalid.",
          },
        },
        400,
      );
    const result = await searchCanonicalPois(parsed.value, repository);
    return json(
      result,
      result.ok
        ? 200
        : result.error.code === "invalid_request"
          ? 400
          : result.error.code === "repository_unavailable"
            ? 503
            : 500,
    );
  };
}

export const handlePoiSearch = createPoiSearchHandler();
