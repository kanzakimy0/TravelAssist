import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  PRIVATE_API_HEADERS,
  verifiedPrivateRequest,
  readPrivateJson,
} from "../private-http";
import {
  CompanionValidationError,
  parseCompanionId,
  parseCompanionInputV1,
  parseCompanionGroupInputV1,
} from "../../features/companions/domain/companion-v1";
import {
  CompanionApiError,
  companionErrorStatuses,
  parseIfMatch,
} from "../../features/companions/persistence/companion-resource";
import { companionRepository } from "./repository";
export async function handleCompanion(
  request: NextRequest,
  group: boolean,
  id?: string,
) {
  let finish: ((response: NextResponse) => NextResponse) | undefined;
  function respond(body: unknown, status = 200) {
    const response =
      status === 204
        ? new NextResponse(null, { status, headers: PRIVATE_API_HEADERS })
        : NextResponse.json(body, { status, headers: PRIVATE_API_HEADERS });
    const result = finish ? finish(response) : response;
    for (const [key, value] of Object.entries(PRIVATE_API_HEADERS))
      result.headers.set(key, value);
    return result;
  }
  try {
    const { client, owner } = await verifiedPrivateRequest(
      request,
      request.method !== "GET",
      (code) => new CompanionApiError(code),
      (value) => {
        finish = value;
      },
    );
    if (id !== undefined) {
      try {
        id = parseCompanionId(id);
      } catch {
        throw new CompanionApiError("INVALID_REQUEST");
      }
    }
    const repository = companionRepository(client, owner);
    if (request.method === "GET") {
      const data = group
        ? id
          ? await repository.getGroup(id)
          : { groups: await repository.listGroups() }
        : id
          ? await repository.getCompanion(id)
          : { companions: await repository.listCompanions() };
      return respond({ ok: true, data });
    }
    const revision =
      request.method === "POST"
        ? undefined
        : parseIfMatch(request.headers.get("if-match"));
    if (request.method === "DELETE") {
      const reader = request.body?.getReader();
      if (reader) {
        try {
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            if (part.value.byteLength) {
              void reader.cancel().catch(() => {});
              throw new CompanionApiError("INVALID_REQUEST");
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
      if (group) await repository.mutateGroup("delete", id, revision);
      else await repository.mutateCompanion("delete", id, revision);
      return respond(null, 204);
    }
    const body = await readPrivateJson(
      request,
      (code) => new CompanionApiError(code),
    );
    const action = request.method === "POST" ? "create" : "update";
    const data = group
      ? await repository.mutateGroup(
          action,
          id,
          revision,
          parseCompanionGroupInputV1(body),
        )
      : await repository.mutateCompanion(
          action,
          id,
          revision,
          parseCompanionInputV1(body, new Date().toISOString().slice(0, 10)),
        );
    return respond({ ok: true, data }, action === "create" ? 201 : 200);
  } catch (error) {
    const code =
      error instanceof CompanionApiError
        ? error.code
        : error instanceof CompanionValidationError
          ? group
            ? "INVALID_COMPANION_GROUP_INPUT"
            : "INVALID_COMPANION_INPUT"
          : "COMPANION_UNAVAILABLE";
    return respond(
      { ok: false, error: { code } },
      companionErrorStatuses[code],
    );
  }
}
