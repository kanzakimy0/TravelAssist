"use client";
import Link from "next/link";
import type { usePreferenceResource } from "./use-preference-resource";
export function PreferenceStatus({
  state,
}: {
  state: ReturnType<typeof usePreferenceResource>;
}) {
  const messages = {
    AUTH_REQUIRED: "登录后可读取和保存长期偏好。",
    AUTH_UNAVAILABLE: "暂时无法验证登录状态，请稍后重试。",
    FORBIDDEN: "本次保存未通过安全校验，请重新打开当前页面。",
    INVALID_REQUEST: "请求无效，您的本地修改仍保留。",
    INVALID_PREFERENCE: "偏好组合无效，请检查选择；本地修改仍保留。",
    PAYLOAD_TOO_LARGE: "偏好内容过大，请减少内容后重试。",
    STALE_PREFERENCE_REVISION:
      "您的偏好已在其他设备或页面中更新。本地修改仍保留，请重新加载服务器版本后再编辑。",
    PREFERENCE_UNAVAILABLE: "网络或服务暂时不可用，您的本地修改仍保留。",
  };
  return (
    <div aria-live="polite">
      {state.busy ? <p role="status">正在同步长期偏好…</p> : null}
      {state.error ? (
        <div role="alert">
          <p>{messages[state.error]}</p>
          {state.error === "AUTH_REQUIRED" ? (
            <Link href="/login?returnTo=%2Fpersonal-center%2Fpreferences">
              登录
            </Link>
          ) : (
            <button
              type="button"
              disabled={state.busy}
              onClick={() => void state.load()}
            >
              {state.isDirty
                ? "重新加载服务器版本（放弃本地修改）"
                : "重新加载服务器版本"}
            </button>
          )}
        </div>
      ) : null}
      {!state.busy && !state.error && state.resource?.revision === 0 ? (
        <p>尚未设置长期偏好。只有您明确保存的选择才会记录。</p>
      ) : null}
      {state.savedMessage ? <p role="status">已保存长期偏好</p> : null}
    </div>
  );
}
