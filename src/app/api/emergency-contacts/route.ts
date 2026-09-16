import type { NextRequest } from "next/server";
import { handleProfile } from "../../../server/profile/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: NextRequest) => handleProfile(request, "contacts");
export const POST = (request: NextRequest) =>
  handleProfile(request, "contacts");
