import "server-only";
import type { NextRequest } from "next/server";
import { readCurrentLongTermPreferenceForRequest } from "../../preferences/public-read";
import type { AiPreferenceContextV1 } from "../contracts";
import { buildPreferenceContext } from "./preference";

function hasAuthenticationHint(request: NextRequest): boolean {
  if (request.headers.has("authorization")) return true;
  return request.cookies
    .getAll()
    .some(({ name }) => /^sb-.*-auth-token(?:\.\d+)?$/.test(name));
}

export async function buildPreferenceContextForRequest(
  request: NextRequest,
): Promise<{
  context: AiPreferenceContextV1;
  finish: <T extends Response>(response: T) => T;
}> {
  if (!hasAuthenticationHint(request))
    return {
      context: buildPreferenceContext(),
      finish: (response) => response,
    };
  const read = await readCurrentLongTermPreferenceForRequest(request);
  return {
    context: buildPreferenceContext(read.result),
    finish: read.finish,
  };
}
