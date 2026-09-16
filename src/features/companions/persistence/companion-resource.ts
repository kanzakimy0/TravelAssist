import type {
  CompanionInputV1,
  CompanionGroupInputV1,
} from "../domain/companion-v1";
export type ResourceAudit = {
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};
export type CompanionResource = CompanionInputV1 & ResourceAudit;
export type CompanionGroupResource = CompanionGroupInputV1 & ResourceAudit;
export const companionErrorStatuses = {
  AUTH_REQUIRED: 401,
  AUTH_UNAVAILABLE: 503,
  FORBIDDEN: 403,
  INVALID_REQUEST: 400,
  PAYLOAD_TOO_LARGE: 413,
  INVALID_COMPANION_INPUT: 400,
  INVALID_COMPANION_GROUP_INPUT: 400,
  COMPANION_NOT_FOUND: 404,
  COMPANION_GROUP_NOT_FOUND: 404,
  STALE_COMPANION_REVISION: 409,
  STALE_COMPANION_GROUP_REVISION: 409,
  COMPANION_GROUP_MEMBER_INVALID: 409,
  COMPANION_LIMIT_REACHED: 409,
  COMPANION_GROUP_LIMIT_REACHED: 409,
  COMPANION_UNAVAILABLE: 500,
} as const;
export type CompanionErrorCode = keyof typeof companionErrorStatuses;
export class CompanionApiError extends Error {
  readonly code: CompanionErrorCode;
  constructor(code: CompanionErrorCode) {
    super(code);
    this.name = "CompanionApiError";
    this.code = code;
  }
}
export function parseIfMatch(value: string | null): number {
  if (!value || !/^"[1-9]\d*"$/.test(value))
    throw new CompanionApiError("INVALID_REQUEST");
  const revision = Number(value.slice(1, -1));
  if (!Number.isSafeInteger(revision) || revision > 2147483647)
    throw new CompanionApiError("INVALID_REQUEST");
  return revision;
}
