import { runTravelPersistence } from "../../../server/preferences/service";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
const statuses: Record<string, number> = {
  AUTH_REQUIRED: 401,
  AUTH_UNAVAILABLE: 503,
  INVALID_INPUT: 400,
  INVALID_OPERATION: 400,
  NOT_FOUND: 404,
  STALE_REVISION: 409,
  STALE_REVISION_OR_NOT_FOUND: 409,
  AMBIGUOUS_PATCH: 400,
  CONFLICTING_INTEREST: 400,
  PAYLOAD_TOO_LARGE: 413,
};
async function boundedJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_INPUT");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 196608) {
        await reader.cancel();
        throw new Error("PAYLOAD_TOO_LARGE");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    try {
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new Error("INVALID_INPUT");
    }
  } finally {
    reader.releaseLock();
  }
}
export async function POST(request: Request) {
  try {
    const match = /^Bearer ([^\s]+)$/.exec(
      request.headers.get("Authorization") ?? "",
    );
    if (!match) throw new Error("AUTH_REQUIRED");
    const body = await boundedJson(request);
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).some((k) => !["operation", "input"].includes(k))
    )
      throw new Error("INVALID_INPUT");
    const { operation, input } = body as {
      operation?: unknown;
      input?: unknown;
    };
    if (typeof operation !== "string") throw new Error("INVALID_OPERATION");
    const result = await runTravelPersistence(match[1], operation, input);
    return Response.json({ ok: true, result }, { headers });
  } catch (error) {
    const code =
      error instanceof Error && Object.hasOwn(statuses, error.message)
        ? error.message
        : "PERSISTENCE_UNAVAILABLE";
    return Response.json(
      { ok: false, code },
      { status: statuses[code] ?? 503, headers },
    );
  }
}
