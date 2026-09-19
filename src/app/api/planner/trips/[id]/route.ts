import type { NextRequest } from "next/server";
import { handlePlannerCanonicalTrip } from "../../../../../server/planner/canonical-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handlePlannerCanonicalTrip(request, (await context.params).id, "read");
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handlePlannerCanonicalTrip(request, (await context.params).id, "save");
}
