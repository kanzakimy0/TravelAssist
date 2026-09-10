import type { NextRequest } from "next/server";
import { handleAuthPost } from "../../../lib/auth/http";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ operation: string }> },
) {
  return handleAuthPost(request, (await context.params).operation);
}
