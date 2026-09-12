import type { NextRequest } from "next/server";
import { handleTripLibrary } from "../../../../server/trip-library/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleTripLibrary(request, "read", (await context.params).id);
}
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleTripLibrary(request, "update", (await context.params).id);
}
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleTripLibrary(request, "delete", (await context.params).id);
}
