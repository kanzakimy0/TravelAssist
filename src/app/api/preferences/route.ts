import type { NextRequest } from "next/server";
import { handlePreference } from "../../../server/preferences/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: NextRequest) => handlePreference(request, "get");
export const PATCH = (request: NextRequest) =>
  handlePreference(request, "patch");
