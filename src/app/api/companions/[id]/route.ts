import type { NextRequest } from "next/server";
import { handleCompanion } from "@/server/companions/http";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) {
  return handleCompanion(request, false, (await context.params).id);
}
export async function PUT(request: NextRequest, context: Context) {
  return handleCompanion(request, false, (await context.params).id);
}
export async function DELETE(request: NextRequest, context: Context) {
  return handleCompanion(request, false, (await context.params).id);
}
