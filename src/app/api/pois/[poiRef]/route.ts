import type { NextRequest } from "next/server";
import { handlePoiDetail } from "../../../../server/poi-details/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ poiRef: string }> },
) {
  return handlePoiDetail((await context.params).poiRef);
}
