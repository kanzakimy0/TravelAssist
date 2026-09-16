import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  PRIVATE_API_HEADERS,
  verifiedPrivateRequest,
  readPrivateJson,
} from "../private-http";
import {
  TripLibraryApiError,
  tripLibraryErrorStatuses,
} from "../../shared/contracts/trip-library/index";
import {
  TRIP_HTTP_MAX_BYTES,
  parseTripDraftRequest,
  parseTripSaveRequest,
  parseTripCopyRequest,
  parseTripIfMatch,
  tripRecordId,
  fail,
} from "../../features/trip-library/persistence/requests";
import { tripLibraryRepository } from "./repository";
import { parseTripListQuery } from "./query";
export type TripAction =
  | "list"
  | "read"
  | "create"
  | "update"
  | "save"
  | "history"
  | "copy"
  | "delete";
async function emptyBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return;
  try {
    while (true) {
      const p = await reader.read();
      if (p.done) break;
      if (p.value.byteLength) {
        void reader.cancel().catch(() => {});
        return fail("INVALID_REQUEST");
      }
    }
  } finally {
    reader.releaseLock();
  }
}
export async function handleTripLibrary(
  request: NextRequest,
  action: TripAction,
  rawId?: string,
) {
  let finish: ((response: NextResponse) => NextResponse) | undefined;
  function respond(data: unknown, status = 200, revision?: number) {
    let response =
      status === 204
        ? new NextResponse(null, { status })
        : NextResponse.json(data, { status });
    if (finish) response = finish(response);
    for (const [k, v] of Object.entries(PRIVATE_API_HEADERS))
      response.headers.set(k, v);
    if (revision !== undefined)
      response.headers.set("ETag", '"' + revision + '"');
    return response;
  }
  try {
    // Bound the raw stream before any Auth/DB work. Cookie authentication still precedes parsing/mutation.
    const body =
      action in TRIP_HTTP_MAX_BYTES
        ? await readPrivateJson(
            request,
            (c) => new TripLibraryApiError(c),
            TRIP_HTTP_MAX_BYTES[action as keyof typeof TRIP_HTTP_MAX_BYTES],
          )
        : undefined;
    if (action === "history" || action === "delete") await emptyBody(request);
    const { owner } = await verifiedPrivateRequest(
      request,
      action !== "list" && action !== "read",
      (c) => new TripLibraryApiError(c),
      (value) => {
        finish = value;
      },
      { allowQuery: action === "list" },
    );
    const id = rawId === undefined ? undefined : tripRecordId(rawId);
    const repository = tripLibraryRepository(owner);
    if (action === "list")
      return respond({
        ok: true,
        data: await repository.list(
          parseTripListQuery(request.nextUrl.searchParams),
        ),
      });
    if (action === "read") {
      const data = await repository.read(id!);
      return respond({ ok: true, data }, 200, data.storageRevision);
    }
    if (action === "create") {
      const result = await repository.create(parseTripDraftRequest(body, true));
      return respond(
        { ok: true, data: result.data },
        result.created ? 201 : 200,
        result.data.storageRevision,
      );
    }
    const expected = parseTripIfMatch(request.headers.get("if-match"));
    if (action === "copy") {
      const result = await repository.copy(
        id!,
        expected,
        parseTripCopyRequest(body),
      );
      return respond(
        { ok: true, data: result.data },
        result.created ? 201 : 200,
        result.data.storageRevision,
      );
    }
    const input =
      action === "update"
        ? parseTripDraftRequest(body)
        : action === "save"
          ? parseTripSaveRequest(body)
          : undefined;
    const data = await repository.mutate(id!, expected, action, input);
    return action === "delete"
      ? respond(null, 204)
      : respond({ ok: true, data }, 200, data!.storageRevision);
  } catch (e) {
    const code =
      e instanceof TripLibraryApiError ? e.code : "TRIP_LIBRARY_UNAVAILABLE";
    return respond(
      { ok: false, error: { code } },
      tripLibraryErrorStatuses[code],
    );
  }
}
