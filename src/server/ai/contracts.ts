import type {
  LongTermPreferenceReadV1,
  PreferenceReadErrorCode,
  ReadonlyPreferenceV1,
} from "../../shared/contracts/preferences/read";

export const AI_RUNTIME_CONTRACT_VERSION = "1.0" as const;
export const AI_RUNTIME_MAX_INPUT_BYTES = 32 * 1024;

export type AiRuntimeErrorCode =
  | "AI_PROVIDER_NOT_CONFIGURED"
  | "AI_PROVIDER_TIMEOUT"
  | "AI_PROVIDER_RATE_LIMITED"
  | "AI_PROVIDER_UNAVAILABLE"
  | "AI_INVALID_PROVIDER_RESPONSE"
  | "AI_RUNTIME_INVALID_REQUEST";

export type AiModelClass =
  "low_cost" | "standard" | "high_reasoning" | "unknown";

export type AiPromptDescriptorV1 = {
  readonly key: string;
  readonly version: string;
  readonly instructions: string;
  readonly checksum: `sha256:${string}`;
  readonly role: string;
  readonly purpose: string;
  readonly contextProfile: "preference_context_v1";
};

export type AiPreferenceContextV1 = {
  readonly profile: "preference_context_v1";
  readonly status: "anonymous" | "missing" | "present" | "unavailable";
  readonly contractVersion: LongTermPreferenceReadV1["contractVersion"] | null;
  readonly sourceRevision: number | null;
  readonly sourceUpdatedAt: string | null;
  readonly preference: ReadonlyPreferenceV1 | null;
  readonly unavailableReason: Exclude<
    PreferenceReadErrorCode,
    "AUTH_REQUIRED"
  > | null;
};

export type AiProviderRequestV1 = {
  readonly instructions: string;
  readonly input: string;
  readonly traceId: string;
  readonly correlationId: string | null;
};

export type AiProviderUsageV1 = {
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly cachedInputTokens: number | null;
};

export type AiProviderMetadataV1 = {
  readonly providerClass: string;
  readonly modelClass: AiModelClass;
  readonly requestId: string | null;
  readonly usage: AiProviderUsageV1;
  readonly latencyMilliseconds: number;
  readonly retryCount: number;
};

export type AiProviderResultV1 =
  | {
      readonly ok: true;
      readonly outputText: string;
      readonly metadata: AiProviderMetadataV1;
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: AiRuntimeErrorCode;
        readonly retryable: boolean;
      };
      readonly metadata: AiProviderMetadataV1;
    };

export interface AiProvider {
  generate(request: AiProviderRequestV1): Promise<AiProviderResultV1>;
}

export type AiRuntimeRequestV1 = {
  readonly promptKey: string;
  readonly promptVersion: string;
  readonly input: string;
  readonly traceId: string;
  readonly correlationId?: string | null;
};

export type AiUsageRecordV1 = {
  readonly contractVersion: "1.0";
  readonly providerClass: string;
  readonly modelClass: AiModelClass;
  readonly promptKey: string;
  readonly promptVersion: string;
  readonly promptChecksum: `sha256:${string}`;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly cachedInputTokens: number | null;
  readonly latencyMilliseconds: number;
  readonly retryCount: number;
  readonly status: "ok" | "error";
  readonly errorCode: AiRuntimeErrorCode | null;
  readonly providerRequestId: string | null;
  readonly traceId: string;
  readonly correlationId: string | null;
  readonly pricingConfigVersion: string | null;
  readonly estimatedCostMinor: number | null;
  readonly currency: string | null;
};

export type AiRuntimeResultV1 =
  | {
      readonly ok: true;
      readonly outputText: string;
      readonly preferenceContext: AiPreferenceContextV1;
      readonly usage: AiUsageRecordV1;
      readonly fallback: null;
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: AiRuntimeErrorCode;
        readonly retryable: boolean;
      };
      readonly preferenceContext: AiPreferenceContextV1;
      readonly usage: AiUsageRecordV1 | null;
      readonly fallback: {
        readonly mode: "deterministic_only";
        readonly reasonCode: AiRuntimeErrorCode;
      };
    };
