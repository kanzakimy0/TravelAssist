import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAuthUser } from "../../lib/auth/current-user";
import { publicSupabaseConfig } from "../../lib/supabase/config";
import { AuthForm } from "./components/auth-form";
import { authDestination, authHref, type AuthPageKind, type AuthQuery } from "./auth-ui-model";
import styles from "./auth.module.css";

async function providerAvailability() {
  try {
    const { url, key } = publicSupabaseConfig();
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!response.ok) return { google: false, apple: false };
    const settings = await response.json();
    return { google: settings.external?.google === true, apple: settings.external?.apple === true };
  } catch { return { google: false, apple: false }; }
}

export async function AuthPage({ kind, query }: { kind: AuthPageKind; query: AuthQuery }) {
  const returnTo = authDestination(query.returnTo, kind === "register" ? "/start" : "/");
  const session = await currentAuthUser();
  const signedIn = session.ok && !!session.data;
  if (signedIn && (kind === "login" || (kind === "register" && query.confirmed !== "1"))) redirect(returnTo);
  if (kind === "register" && signedIn && query.confirmed === "1") return (
    <div className={styles.success}>
      <span className={styles.successMark} aria-hidden="true">✓</span>
      <h1>账户创建成功 ✓</h1><p role="status">开始你的第一次旅行</p>
      <Link className={styles.primary} href={returnTo}>开始规划</Link>
      <p>稍后完善个人资料</p>
    </div>
  );
  if (kind === "reset" && !signedIn) return (
    <div className={styles.success}><h1>重设链接不可用</h1>
      <p role="alert">没有有效的认证会话。请从邮箱打开重设链接，或重新获取链接。</p>
      <Link className={styles.primary} href="/forgot-password">重新获取重设链接</Link>
      <Link className={styles.textLink} href="/login">返回登录</Link>
    </div>
  );
  return <AuthForm kind={kind} returnTo={returnTo} prefilledEmail={typeof query.email === "string" ? query.email.slice(0, 254) : ""} confirmationPending={kind === "register" && query.confirmed === "1"} providers={kind === "login" || kind === "register" ? await providerAvailability() : { google: false, apple: false }} />;
}

export function AuthUnavailable() {
  return <section className={styles.unavailable}><h1>暂时无法确认登录状态</h1><p role="alert">为保护你的账户，个人中心暂不展示。请稍后重试。</p><Link href={authHref("/login", "/personal-center")}>返回登录</Link></section>;
}
