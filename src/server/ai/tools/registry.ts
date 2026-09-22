import "server-only";
import { parsePreferenceV1 } from "../../../shared/contracts/preferences/core";
import type { AiPreferenceContextV1 } from "../contracts";
import type { AiConversationErrorCodeV1 } from "../../../shared/contracts/ai-conversation";

export const AI_READ_TOOL_NAMES = Object.freeze([
  "user.preference.get",
] as const);

export type AiReadToolNameV1 = (typeof AI_READ_TOOL_NAMES)[number];

export type AiToolDefinitionV1 = {
  readonly name: AiReadToolNameV1;
  readonly version: "1.0.0";
  readonly kind: "read";
  readonly description: string;
  readonly label: string;
  readonly strict: true;
  readonly inputSchema: {
    readonly type: "object";
    readonly properties: Readonly<Record<string, never>>;
    readonly required: readonly never[];
    readonly additionalProperties: false;
  };
};

export type AiToolExecutionContextV1 = {
  readonly preferenceContext: AiPreferenceContextV1;
};

export type AiToolExecutionResultV1 = {
  readonly name: AiReadToolNameV1;
  readonly output: string;
  readonly status: "completed" | "unavailable";
};

export class AiToolError extends Error {
  readonly code: AiConversationErrorCodeV1;
  readonly retryable = false;
  constructor(code: AiConversationErrorCodeV1) {
    super(code);
    this.name = "AiToolError";
    this.code = code;
  }
}

const EMPTY_INPUT_SCHEMA = Object.freeze({
  type: "object" as const,
  properties: Object.freeze({}),
  required: Object.freeze([]),
  additionalProperties: false as const,
});

const preferenceTool = Object.freeze({
  name: "user.preference.get",
  version: "1.0.0",
  kind: "read",
  description:
    "Read the current request's validated long-term travel preference context. The result may explicitly be anonymous, missing, or unavailable.",
  label: "正在读取旅行偏好…",
  strict: true,
  inputSchema: EMPTY_INPUT_SCHEMA,
} satisfies AiToolDefinitionV1);

const tools = Object.freeze([preferenceTool]);

export function listAvailableReadOnlyTools(): readonly AiToolDefinitionV1[] {
  return tools;
}

export function readOnlyToolAvailability() {
  return Object.freeze({
    "user.preference.get": "available" as const,
    "trip.summary.get": "unavailable_no_safe_summary_boundary" as const,
    "planning.context.get": "unavailable_no_request_scope" as const,
  });
}

function plainEmptyObject(input: unknown): boolean {
  return (
    !!input &&
    typeof input === "object" &&
    !Array.isArray(input) &&
    Object.getPrototypeOf(input) === Object.prototype &&
    Reflect.ownKeys(input).length === 0
  );
}

function parseArguments(input: string): Record<string, never> {
  if (typeof input !== "string" || input.length > 256)
    throw new AiToolError("AI_TOOL_INVALID_INPUT");
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch {
    throw new AiToolError("AI_TOOL_INVALID_INPUT");
  }
  if (!plainEmptyObject(value)) throw new AiToolError("AI_TOOL_INVALID_INPUT");
  return value as Record<string, never>;
}

function preferenceOutput(context: AiPreferenceContextV1): unknown {
  return {
    contractVersion: "1.0",
    status: context.status,
    sourceRevision: context.sourceRevision,
    sourceUpdatedAt: context.sourceUpdatedAt,
    preference: context.preference,
  };
}

function validatePreferenceOutput(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new AiToolError("AI_TOOL_INVALID_OUTPUT");
  const value = input as Record<string, unknown>;
  const keys = Reflect.ownKeys(value);
  const expected = [
    "contractVersion",
    "status",
    "sourceRevision",
    "sourceUpdatedAt",
    "preference",
  ];
  if (
    keys.length !== expected.length ||
    keys.some((key) => typeof key !== "string" || !expected.includes(key)) ||
    value.contractVersion !== "1.0" ||
    !["anonymous", "missing", "present", "unavailable"].includes(
      String(value.status),
    ) ||
    (value.sourceRevision !== null &&
      (!Number.isSafeInteger(value.sourceRevision) ||
        Number(value.sourceRevision) < 0)) ||
    (value.sourceUpdatedAt !== null &&
      typeof value.sourceUpdatedAt !== "string")
  )
    throw new AiToolError("AI_TOOL_INVALID_OUTPUT");
  if (value.preference !== null) {
    try {
      value.preference = parsePreferenceV1(value.preference);
    } catch {
      throw new AiToolError("AI_TOOL_INVALID_OUTPUT");
    }
  }
  return value;
}

export function resolveReadOnlyTool(
  name: string,
): AiToolDefinitionV1 | undefined {
  return tools.find((tool) => tool.name === name);
}

export async function executeReadOnlyTool(
  name: string,
  rawArguments: string,
  context: AiToolExecutionContextV1,
): Promise<AiToolExecutionResultV1> {
  const tool = resolveReadOnlyTool(name);
  if (!tool) throw new AiToolError("AI_TOOL_NOT_ALLOWED");
  parseArguments(rawArguments);
  if (tool.name !== "user.preference.get")
    throw new AiToolError("AI_TOOL_UNAVAILABLE");
  const validated = validatePreferenceOutput(
    preferenceOutput(context.preferenceContext),
  );
  return Object.freeze({
    name: tool.name,
    output: JSON.stringify(validated),
    status:
      context.preferenceContext.status === "unavailable"
        ? "unavailable"
        : "completed",
  });
}
