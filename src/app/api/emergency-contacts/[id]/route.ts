import type { NextRequest } from "next/server";
import { handleProfile } from "../../../../server/profile/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export const PATCH = async (request: NextRequest, context: Context) =>
  handleProfile(request, "contacts", (await context.params).id);
export const DELETE = async (request: NextRequest, context: Context) =>
  handleProfile(request, "contacts", (await context.params).id);
