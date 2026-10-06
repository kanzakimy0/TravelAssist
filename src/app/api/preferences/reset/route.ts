import type { NextRequest } from "next/server";
import { handlePreference } from "../../../../server/preferences/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = (request: NextRequest) =>
  handlePreference(request, "reset");
