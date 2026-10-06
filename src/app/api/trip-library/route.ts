import type { NextRequest } from "next/server";
import { handleTripLibrary } from "../../../server/trip-library/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return handleTripLibrary(request, "list");
}
export async function POST(request: NextRequest) {
  return handleTripLibrary(request, "create");
}
