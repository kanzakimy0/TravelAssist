import type { NextRequest } from "next/server";
import { handleTripLibrary } from "../../../../../server/trip-library/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleTripLibrary(request, "history", (await context.params).id);
}
