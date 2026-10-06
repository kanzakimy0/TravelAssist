import type { NextRequest } from "next/server";
import { handleCompanion } from "@/server/companions/http";
export const runtime = "nodejs";
export const GET = (request: NextRequest) => handleCompanion(request, false);
export const POST = (request: NextRequest) => handleCompanion(request, false);
