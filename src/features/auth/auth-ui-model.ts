import type { AuthErrorCode } from "../../lib/auth/contracts";
import { safeReturnTo, validPassword } from "../../lib/auth/policy";

export const loginChannels = ["phone", "email"] as const;
export type AuthPageKind = "login" | "register" | "forgot" | "reset";
export type AuthQuery = Record<string, string | string[] | undefined>;
export const resendCooldownSeconds = 30; // Presentation cooldown, not provider expiry/rate-limit truth.

export function authDestination(value: unknown, fallback = "/") {
  const safe = safeReturnTo(value ?? fallback);
  let path = new URL(safe, "https://return.invalid").pathname;
  for (let i = 0; i < 8 && path.includes("%"); i++)
    path = decodeURIComponent(path);
  // Additional navigation-loop prevention AFTER the canonical security validator.
  return /^\/(?:login|register|forgot-password|reset-password|auth-link-error|auth)(?:\/|$)/.test(
    path,
  )
    ? "/"
    : safe;
}

export function authHref(
  path: "/login" | "/register" | "/forgot-password",
  returnTo: unknown,
  email?: string,
) {
  const query = new URLSearchParams({ returnTo: authDestination(returnTo) });
  if (email) query.set("email", email);
  return `${path}?${query}`;
}

export function confirmationDestination(returnTo: string) {
  return `/register?confirmed=1&returnTo=${encodeURIComponent(authDestination(returnTo))}`;
}

export function passwordIssue(password: string, confirmation: string) {
  if (!validPassword(password))
    return "密码须至少 8 个字符，并包含字母和数字。";
  return password === confirmation ? "" : "两次输入的密码不一致。";
}

export function maskedEmail(email: string) {
  const [name, domain] = email.split("@");
  return domain ? `${name.slice(0, 2)}***@${domain}` : "你的邮箱";
}

export const authErrorText: Record<AuthErrorCode, string> = {
  invalid_input: "请检查输入内容后重试。",
  weak_password: "密码须至少 8 个字符，并包含字母和数字。",
  invalid_credentials: "邮箱或密码不正确，或邮箱尚未确认。请检查后重试。",
  email_not_registered: "此邮箱尚未绑定 TravelAssist 账户",
  invalid_otp: "验证码不正确或已过期，请检查或重新发送。",
  rate_limited: "操作过于频繁，请稍后重试。服务端频率限制仍然适用。",
  unauthenticated: "登录状态已失效，请重新登录或重新获取重设链接。",
  auth_unavailable: "暂时无法连接认证服务，请检查网络后重试。",
  configuration_error: "认证服务尚未配置，请稍后再试。",
  callback_failed: "验证链接无效或已失效，请重新获取链接。",
  provider_unavailable: "此登录方式暂未配置或暂不可用，请使用邮箱或手机登录。",
  forbidden: "请求未通过安全检查，请从本站重新打开登录页面。",
};
