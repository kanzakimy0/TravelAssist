import { AuthNavigationLink } from "./components/auth-navigation-link";
import { authDestination, authHref, type AuthQuery } from "./auth-ui-model";
import styles from "./auth.module.css";

/** Callback failure is not proof of email confirmation or of a valid session. */
export function AuthLinkError({ query }: { query: AuthQuery }) {
  const returnTo = authDestination(query.returnTo);
  const recovery = query.flow === "recovery";
  return (
    <section className={styles.success} aria-labelledby="auth-link-heading">
      <h1 id="auth-link-heading">
        {recovery ? "重设链接未完成" : "验证链接未完成"}
      </h1>
      <p role="alert">
        {query.reason === "expired"
          ? "链接已失效或已使用，请重新获取最新邮件。"
          : "未能建立本次验证会话。链接可能已失效、已使用，或缺少发起操作时的浏览器校验信息。"}
      </p>
      <p>请回到发起注册或找回密码的浏览器，使用最新邮件中的链接。</p>
      <AuthNavigationLink
        className={styles.primary}
        href={authHref("/forgot-password", returnTo)}
      >
        重新获取重设链接
      </AuthNavigationLink>
      <AuthNavigationLink
        className={styles.textLink}
        href={`${authHref("/login", returnTo)}&channel=email`}
      >
        邮箱密码登录
      </AuthNavigationLink>
      <p>若邮箱已经确认，可使用注册时的邮箱和密码登录，无需再次点击旧链接。</p>
      <AuthNavigationLink
        className={styles.textLink}
        href={authHref("/register", returnTo)}
      >
        返回注册页面
      </AuthNavigationLink>
    </section>
  );
}
