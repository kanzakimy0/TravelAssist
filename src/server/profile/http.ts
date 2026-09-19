import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  PRIVATE_API_HEADERS,
  verifiedPrivateRequest,
  readPrivateJson,
} from "../private-http";
import {
  ProfileApiError,
  profileErrorStatuses,
  parseEmergencyContactId,
  parseUpdateProfileAccountV1,
  parseCreateEmergencyContactV1,
  parseUpdateEmergencyContactV1,
} from "../../features/profile/domain/profile-account-v1";
import { profileRepository } from "./repository";

export async function handleProfile(
  request: NextRequest,
  resource: "profile" | "contacts",
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
      (code) => new ProfileApiError(code),
      (value) => {
        finish = value;
      },
    );
    if (id !== undefined) id = parseEmergencyContactId(id);
    const repository = profileRepository(owner);
    if (resource === "profile") {
      const input =
        request.method === "PATCH"
          ? parseUpdateProfileAccountV1(
              await readPrivateJson(
                request,
                (code) => new ProfileApiError(code),
              ),
              new Date().toISOString().slice(0, 10),
            )
          : undefined;
      // Reuse the already verified request client. Metadata/session payloads never supply contacts.
      const { data, error } = await client.auth.getUser();
      if (error) throw new ProfileApiError("AUTH_UNAVAILABLE");
      if (!data.user || data.user.id !== owner)
        throw new ProfileApiError("AUTH_REQUIRED");
      const authContact = {
        email: data.user.email || null,
        emailVerified: !!data.user.email && !!data.user.email_confirmed_at,
        phone: data.user.phone || null,
        phoneVerified: !!data.user.phone && !!data.user.phone_confirmed_at,
      };
      return respond({
        ok: true,
        data: input
          ? await repository.patch(input, authContact)
          : await repository.read(authContact),
      });
    }
    if (request.method === "GET")
      return respond({ ok: true, data: await repository.listContacts() });
    if (request.method === "DELETE") {
      // DELETE has no input contract. Reject a body rather than silently accepting owner spoofing.
      if (request.body) {
        const reader = request.body.getReader();
        try {
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            if (part.value.byteLength) {
              void reader.cancel().catch(() => {});
              throw new ProfileApiError("INVALID_REQUEST");
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
      await repository.deleteContact(id!);
      return respond(null, 204);
    }
    const input = await readPrivateJson(
      request,
      (code) => new ProfileApiError(code),
    );
    const data =
      request.method === "POST"
        ? await repository.createContact(parseCreateEmergencyContactV1(input))
        : await repository.updateContact(
            id!,
            parseUpdateEmergencyContactV1(input),
          );
    return respond({ ok: true, data }, request.method === "POST" ? 201 : 200);
  } catch (error) {
    const code =
      error instanceof ProfileApiError ? error.code : "PROFILE_UNAVAILABLE";
    return respond({ ok: false, error: { code } }, profileErrorStatuses[code]);
  }
}
