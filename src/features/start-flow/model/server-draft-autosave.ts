import {
  draftContent,
  parseDraftResponse,
  type DraftContent,
  type DraftResponse,
} from "../../../shared/contracts/preferences/drafts";
import { parse } from "../../../shared/contracts/trips/validation";
import { uuid } from "../../../shared/contracts/preferences";

export type DraftTransport = (
  operation: string,
  input: unknown,
) => Promise<unknown>;
export type AutosaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";
/** Auth Core supplies a current token. This adapter neither creates users nor stores tokens. */
export function browserDraftTransport(
  getAccessToken: () => Promise<string | null>,
): DraftTransport {
  return async (operation, input) => {
    const token = await getAccessToken();
    if (!token) throw new Error("AUTH_REQUIRED");
    const response = await fetch("/api/travel-persistence", {
      method: "POST",
      cache: "no-store",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ operation, input }),
    });
    const body = await response.json();
    if (!response.ok || body?.ok !== true)
      throw new Error(
        typeof body?.code === "string" ? body.code : "PERSISTENCE_UNAVAILABLE",
      );
    return body.result;
  };
}

/** One instance per owner + creation intent. Caller persists creationKey, not an owner from a request body.
 * No initial/mock-state autosave. queue() is called only after an explicit valid edit.
 * Conflicts stop writes; resume() explicitly discards the queued local revision in favor of server state.
 */
export function createServerDraftAutosave(options: {
  creationKey: string;
  transport: DraftTransport;
  delayMs?: number;
  onStatus?: (status: AutosaveStatus) => void;
}) {
  if (!parse(uuid, options.creationKey).ok)
    throw new Error("INVALID_CREATION_KEY");
  let pending: DraftContent | null = null;
  let current: DraftResponse | null = null;
  let creationContent: DraftContent | null = null;
  let inFlight: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let conflict = false;
  const report = (s: AutosaveStatus) => {
    if (!disposed) options.onStatus?.(s);
  };
  const response = (value: unknown) => {
    const result = parseDraftResponse(value);
    if (!result.ok) throw new Error("INVALID_SERVER_DRAFT");
    return result.value;
  };
  async function drain() {
    while (pending && !disposed && !conflict) {
      const content = pending;
      pending = null;
      report("saving");
      try {
        if (!current) {
          creationContent ??= structuredClone(content);
          current = response(
            await options.transport("createDraft", {
              creationKey: options.creationKey,
              content: creationContent,
            }),
          );
          if (
            current.revision !== 1 ||
            JSON.stringify(current.content) !== JSON.stringify(creationContent)
          )
            throw new Error("STALE_REVISION");
          // A lost create response may resolve to an older saved draft. Never silently drop a new edit.
          if (JSON.stringify(current.content) !== JSON.stringify(content))
            current = response(
              await options.transport("updateDraft", {
                id: current.id,
                revision: current.revision,
                content,
              }),
            );
        } else {
          current = response(
            await options.transport("updateDraft", {
              id: current.id,
              revision: current.revision,
              content,
            }),
          );
        }
        report("saved");
      } catch (error) {
        pending = pending ?? content;
        conflict =
          error instanceof Error &&
          ["STALE_REVISION", "STALE_REVISION_OR_NOT_FOUND"].includes(
            error.message,
          );
        report(conflict ? "conflict" : "error");
        throw error;
      }
    }
  }
  function flush(): Promise<void> {
    if (timer) clearTimeout(timer);
    if (disposed) return Promise.reject(new Error("AUTOSAVE_DISPOSED"));
    if (conflict) return Promise.reject(new Error("RESUME_REQUIRED"));
    if (inFlight) return inFlight;
    inFlight = drain().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }
  return {
    queue(input: DraftContent) {
      if (disposed) throw new Error("AUTOSAVE_DISPOSED");
      const parsed = parse(draftContent, input);
      if (!parsed.ok) throw new Error("INVALID_DRAFT_CONTENT");
      pending = parsed.value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void flush().catch(() => {});
      }, options.delayMs ?? 650);
    },
    flush,
    retry: flush,
    async resume(id: string) {
      if (disposed || inFlight) throw new Error("AUTOSAVE_BUSY");
      if (!parse(uuid, id).ok) throw new Error("INVALID_DRAFT_ID");
      if (timer) clearTimeout(timer);
      const loaded = response(await options.transport("getDraft", { id }));
      // Verify first: a failed load does not destroy unsaved local edits.
      current = loaded;
      pending = null;
      creationContent = null;
      conflict = false;
      report("saved");
      return structuredClone(loaded);
    },
    getCurrent: () => (current ? structuredClone(current) : null),
    dispose() {
      disposed = true;
      if (timer) clearTimeout(timer);
      pending = null;
    },
  };
}
