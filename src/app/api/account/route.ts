import type { NextRequest } from "next/server";
import { handleAccountDeletion } from "../../../server/account-deletion/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const DELETE = (request: NextRequest) => handleAccountDeletion(request);
