import { NextRequest, NextResponse } from "next/server";
import {
  AI_CONVERSATION_MAX_INPUT_BYTES,
  AiConversationContractError,
  parseAiConversationRequestV1,
} from "../../../../shared/contracts/ai-conversation";
import { readPrivateJson } from "../../../../server/private-http";
import { buildPreferenceContextForRequest } from "../../../../server/ai/context/request-preference";
import { createOpenAiConversationModel } from "../../../../server/ai/conversation/openai-model";
import {
  AI_CONVERSATION_STREAM_HEADERS,
  createAiConversationStreamResponse,
} from "../../../../server/ai/conversation/transport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function invalidResponse(status = 400): NextResponse {
  const response = NextResponse.json(
    {
      ok: false,
      error: { code: "AI_CONVERSATION_INVALID_REQUEST" },
    },
    { status },
  );
  for (const [key, value] of Object.entries(AI_CONVERSATION_STREAM_HEADERS)) {
    if (key !== "Content-Type") response.headers.set(key, value);
  }
  return response;
}

export async function POST(request: NextRequest): Promise<Response> {
  if (request.nextUrl.search) return invalidResponse();
  try {
    const body = await readPrivateJson(
      request,
      () => new AiConversationContractError(),
      AI_CONVERSATION_MAX_INPUT_BYTES + 8 * 1024,
    );
    const parsed = parseAiConversationRequestV1(body);
    const preference = await buildPreferenceContextForRequest(request);
    return createAiConversationStreamResponse(parsed, {
      model: createOpenAiConversationModel(),
      preferenceContext: preference.context,
      finish: preference.finish,
    });
  } catch {
    return invalidResponse();
  }
}
