import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  verifiedPrivateRequest,
  readPrivateJson,
  PRIVATE_API_HEADERS,
} from "../private-http";
import {
  AccountDeletionError,
  accountDeletionErrorStatuses,
  ACCOUNT_DELETION_MAX_BYTES,
  parseDeleteAccountRequest,
} from "../../features/account-deletion/contract";
import { deleteVerifiedAuthUser } from "./admin";
export async function handleAccountDeletion(request: NextRequest) {
  let finish: ((response: NextResponse) => NextResponse) | undefined;
  function respond(code?: keyof typeof accountDeletionErrorStatuses) {
    const response = code
      ? NextResponse.json(
          { ok: false, error: { code } },
          { status: accountDeletionErrorStatuses[code] },
        )
      : new NextResponse(null, { status: 204 });
    const result = finish ? finish(response) : response;
    for (const [key, value] of Object.entries(PRIVATE_API_HEADERS))
      result.headers.set(key, value);
    return result;
  }
  try {
    const { owner } = await verifiedPrivateRequest(
      request,
      true,
      (code) => new AccountDeletionError(code),
      (value) => {
        finish = value;
      },
    );
    parseDeleteAccountRequest(
      await readPrivateJson(
        request,
        (code) => new AccountDeletionError(code),
        ACCOUNT_DELETION_MAX_BYTES,
      ),
    );
    await deleteVerifiedAuthUser(owner);
    return respond();
  } catch (error) {
    return respond(
      error instanceof AccountDeletionError
        ? error.code
        : "ACCOUNT_DELETION_UNAVAILABLE",
    );
  }
}
