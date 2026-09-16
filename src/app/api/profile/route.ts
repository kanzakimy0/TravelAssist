import type { NextRequest } from "next/server";
import { handleProfile } from "../../../server/profile/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: NextRequest) => handleProfile(request, "profile");
export const PATCH = (request: NextRequest) =>
  handleProfile(request, "profile");
