import {
  accountDeletionErrorStatuses,
  type AccountDeletionErrorCode,
  type DeleteAccountRequestV1,
} from "./contract";
export type DeleteAccountResult =
  { ok: true } | { ok: false; code: AccountDeletionErrorCode };
export async function deleteCurrentAccount(): Promise<DeleteAccountResult> {
  try {
    const body: DeleteAccountRequestV1 = {
      schemaVersion: "1.0",
      confirmation: "DELETE_ACCOUNT",
      externalBookingsAcknowledged: true,
    };
    const response = await fetch("/api/account", {
      method: "DELETE",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status === 204) return { ok: true };
    const payload = await response.json();
    const code = payload?.error?.code;
    if (
      payload?.ok === false &&
      typeof code === "string" &&
      Object.hasOwn(accountDeletionErrorStatuses, code) &&
      accountDeletionErrorStatuses[code as AccountDeletionErrorCode] ===
        response.status
    )
      return { ok: false, code: code as AccountDeletionErrorCode };
  } catch {
    /* Destructive calls are never automatically retried. */
  }
  return { ok: false, code: "ACCOUNT_DELETION_UNAVAILABLE" };
}
export const accountDeletionMessages: Record<AccountDeletionErrorCode, string> =
  {
    AUTH_REQUIRED: "登录状态已失效，请重新登录后确认账户状态。",
    FORBIDDEN: "无法验证此请求来源，请刷新页面后重试。",
    INVALID_REQUEST: "删除确认无效，请重新确认。",
    PAYLOAD_TOO_LARGE: "请求内容超出限制，账户未删除。",
    AUTH_UNAVAILABLE: "暂时无法验证登录状态，请稍后重试。",
    ACCOUNT_DELETION_UNAVAILABLE:
      "暂时无法确认删除结果，请稍后重新登录检查账户状态。",
    ACCOUNT_DELETION_BLOCKED:
      "账户仍有关联的存储内容，暂时无法删除。请联系支持处理。",
  };
