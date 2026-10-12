import type { NextRequest } from "next/server";
import { handlePoiSearch } from "@/server/poi-search/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handlePoiSearch(request);
}
