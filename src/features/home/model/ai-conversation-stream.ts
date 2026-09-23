import {
  isAiConversationStreamEventV1,
  type AiConversationStreamEventV1,
} from "../../../shared/contracts/ai-conversation/index";

const MAX_STREAM_BUFFER_BYTES = 256 * 1024;
const MAX_STREAM_EVENTS = 512;

export class AiConversationStreamError extends Error {
  constructor() {
    super("AI_CONVERSATION_STREAM_ERROR");
    this.name = "AiConversationStreamError";
  }
}

function parseFrame(frame: string): AiConversationStreamEventV1 | null {
  const lines = frame.split("\n");
  const eventName = lines
    .find((line) => line.startsWith("event:"))
    ?.slice(6)
    .trim();
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (!eventName || !data) return null;
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    throw new AiConversationStreamError();
  }
  if (!isAiConversationStreamEventV1(value) || value.type !== eventName)
    throw new AiConversationStreamError();
  return value;
}

export async function* readAiConversationEvents(
  response: Response,
): AsyncGenerator<AiConversationStreamEventV1> {
  if (
    !response.ok ||
    !response.body ||
    response.headers.get("content-type")?.split(";")[0].trim() !==
      "text/event-stream"
  )
    throw new AiConversationStreamError();
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let count = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value ?? new Uint8Array(), {
        stream: !chunk.done,
      });
      if (new TextEncoder().encode(buffer).byteLength > MAX_STREAM_BUFFER_BYTES)
        throw new AiConversationStreamError();
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const frame = buffer.slice(0, boundary).replaceAll("\r", "");
        buffer = buffer.slice(boundary + 2);
        const event = parseFrame(frame);
        if (!event) continue;
        count += 1;
        if (count > MAX_STREAM_EVENTS) throw new AiConversationStreamError();
        yield event;
      }
      if (chunk.done) break;
    }
    if (buffer.trim()) {
      const event = parseFrame(buffer.replaceAll("\r", ""));
      if (event) yield event;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new AiConversationStreamError();
  } finally {
    reader.releaseLock();
  }
}
