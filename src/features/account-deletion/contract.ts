// Browser-safe request and sanitized error contract. No caller-selected target.
export const ACCOUNT_DELETION_MAX_BYTES = 4096;
export const accountDeletionErrorStatuses = {
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  INVALID_REQUEST: 400,
  PAYLOAD_TOO_LARGE: 413,
  AUTH_UNAVAILABLE: 503,
  ACCOUNT_DELETION_UNAVAILABLE: 503,
  ACCOUNT_DELETION_BLOCKED: 409,
} as const;
export type AccountDeletionErrorCode =
  keyof typeof accountDeletionErrorStatuses;
export class AccountDeletionError extends Error {
  readonly code: AccountDeletionErrorCode;
  constructor(code: AccountDeletionErrorCode) {
    super(code);
    this.code = code;
    this.name = "AccountDeletionError";
  }
}
export type DeleteAccountRequestV1 = {
  schemaVersion: "1.0";
  confirmation: "DELETE_ACCOUNT";
  externalBookingsAcknowledged: true;
};
export function parseDeleteAccountRequest(
  input: unknown,
): DeleteAccountRequestV1 {
  const expected = {
    schemaVersion: "1.0",
    confirmation: "DELETE_ACCOUNT",
    externalBookingsAcknowledged: true,
  } as const;
  if (
    !input ||
    typeof input !== "object" ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Reflect.ownKeys(input).length !== 3
  )
    throw new AccountDeletionError("INVALID_REQUEST");
  for (const [key, value] of Object.entries(expected)) {
    const d = Object.getOwnPropertyDescriptor(input, key);
    if (!d?.enumerable || !("value" in d) || d.value !== value)
      throw new AccountDeletionError("INVALID_REQUEST");
  }
  return { ...expected };
}
