"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { OAuthProvider } from "../../../lib/auth/contracts";
import { validEmail, validOtp, validPhone } from "../../../lib/auth/policy";
import { authRequest, type AuthOperation } from "../auth-client";
import {
  authDestination,
  authErrorText,
  authHref,
  confirmationDestination,
  loginChannels,
  maskedEmail,
  passwordIssue,
  resendCooldownSeconds,
  type AuthPageKind,
} from "../auth-ui-model";
import styles from "../auth.module.css";
import { AuthIcon } from "./auth-icon";

function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
  errorId,
  invalid,
  isNew = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  errorId: string;
  invalid: boolean;
  isNew?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.inputRow}>
        <span aria-hidden="true" className={styles.inputIcon}>
          <AuthIcon name="lock" />
        </span>
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={isNew ? "new-password" : "current-password"}
          placeholder={isNew ? "至少 8 个字符，包含字母和数字" : "请输入密码"}
          required
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={errorId}
        />
        <button
          type="button"
          className={styles.inputAction}
          onClick={() => setVisible(!visible)}
          disabled={disabled}
          aria-label={`${visible ? "隐藏" : "显示"}${label}`}
          aria-pressed={visible}
        >
          {visible ? "隐藏" : "显示"}
        </button>
      </div>
    </div>
  );
}

function PasswordRules({ password }: { password: string }) {
  return (
    <ul className={styles.passwordRules} aria-label="密码规则">
      {[
        [password.length >= 8, "至少 8 个字符"],
        [/[A-Za-z]/.test(password), "包含字母"],
        [/[0-9]/.test(password), "包含数字"],
      ].map(([met, label]) => (
        <li key={String(label)} data-met={!!met}>
          <span aria-hidden="true">{met ? "✓" : "○"}</span>
          <span className={styles.srOnly}>{met ? "已满足：" : "未满足："}</span>
          {label}
        </li>
      ))}
    </ul>
  );
}

export function AuthForm({
  kind,
  returnTo,
  prefilledEmail,
  confirmationPending,
  providers,
}: {
  kind: AuthPageKind;
  returnTo: string;
  prefilledEmail: string;
  confirmationPending: boolean;
  providers: Record<OAuthProvider, boolean>;
}) {
  const prefix = useId();
  const errorId = `${prefix}-error`;
  const statusId = `${prefix}-status`;
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const lock = useRef(false);
  const [channel, setChannel] = useState<"phone" | "email">("phone");
  const [emailMode, setEmailMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState(prefilledEmail);
  const [country, setCountry] = useState("+81");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [otp, setOtp] = useState("");
  const [agreement, setAgreement] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [unregistered, setUnregistered] = useState(false);
  const [stage, setStage] = useState<
    "form" | "confirmation" | "sent" | "updated"
  >(confirmationPending ? "confirmation" : "form");
  const [sentTo, setSentTo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const phoneMode = kind === "login" && channel === "phone";
  const otpMode = kind === "login" && (phoneMode || emailMode === "otp");
  const phoneValue = country + phone.replace(/[\s()-]/g, "");
  const agreementRequired = phoneMode || kind === "register";
  const heading = {
    login: "欢迎回来",
    register: "创建账户",
    forgot: "找回密码",
    reset: "设置新密码",
  }[kind];
  const intro = {
    login: "登录后继续你的旅程规划",
    register: "开启你的下一段旅行规划",
    forgot: "输入注册邮箱，我们会发送重设密码链接。",
    reset: "为你的 TravelAssist 账户设置新密码。",
  }[kind];

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(
      () => setCooldown((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function fail(message: string) {
    setError(message);
    setNotice("");
    window.requestAnimationFrame(() => feedbackRef.current?.focus());
  }
  function changeMode(
    next: "phone" | "email",
    mode: "password" | "otp" = "password",
  ) {
    if (lock.current) return;
    setChannel(next);
    setEmailMode(mode);
    setPassword("");
    setOtp("");
    setError("");
    setNotice("");
    setUnregistered(false);
  }
  async function run(
    operation: AuthOperation,
    input: Record<string, unknown>,
    success: (data: {
      state: string;
      returnTo: string;
      url?: string;
    }) => void | Promise<void>,
  ) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const result = await authRequest(operation, input);
      if (!result.ok) {
        if (result.code === "email_not_registered") setUnregistered(true);
        fail(authErrorText[result.code]);
      } else await success(result.data);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  function enter(destination: string) {
    setPassword("");
    setConfirmation("");
    setOtp("");
    window.location.replace(authDestination(destination)); // New document clears App Router's pre-auth cache.
  }
  async function sendOtp() {
    if (pending || cooldown > 0) return;
    if (phoneMode && !agreement)
      return fail("请先勾选服务条款与隐私政策同意，并阅读自动创建账户说明。");
    if (phoneMode ? !validPhone(phoneValue) : !validEmail(email.trim()))
      return fail(
        phoneMode
          ? "请输入有效的国家/地区码和手机号。"
          : "请输入有效的邮箱地址。",
      );
    await run(
      phoneMode ? "phone-otp" : "email-otp",
      phoneMode ? { phone: phoneValue } : { email: email.trim() },
      () => {
        setSentTo(phoneMode ? phoneValue : email.trim());
        setCooldown(resendCooldownSeconds);
        setOtp("");
        setUnregistered(false);
        setNotice(
          "验证码已发送，请检查消息。倒计时仅为页面重发等待提示，服务端限制仍然适用。",
        );
        window.requestAnimationFrame(() =>
          document.getElementById(`${prefix}-otp`)?.focus(),
        );
      },
    );
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    if (agreementRequired && !agreement)
      return fail("请先勾选服务条款与隐私政策同意。");
    if (
      phoneMode
        ? !validPhone(phoneValue)
        : kind !== "reset" && !validEmail(email.trim())
    )
      return fail(
        phoneMode ? "请输入有效的手机号。" : "请输入有效的邮箱地址。",
      );
    if (otpMode && !validOtp(otp)) return fail("请输入六位验证码。");
    if (
      (kind === "register" || kind === "reset") &&
      passwordIssue(password, confirmation)
    )
      return fail(passwordIssue(password, confirmation));
    if (kind === "login" && !otpMode && !password) return fail("请输入密码。");
    if (kind === "register")
      await run(
        "signup",
        {
          email: email.trim(),
          password,
          returnTo: confirmationDestination(returnTo),
        },
        (data) => {
          setPassword("");
          setConfirmation("");
          if (data.state === "signed_in")
            window.location.replace(confirmationDestination(returnTo));
          else {
            setStage("confirmation");
            setNotice(
              "请检查邮箱，并在同一浏览器打开确认链接。完成验证后即可继续旅行。",
            );
          }
        },
      );
    else if (kind === "forgot")
      await run(
        "recovery",
        { email: email.trim(), returnTo: "/reset-password" },
        () => {
          setStage("sent");
          setCooldown(resendCooldownSeconds);
          setNotice(
            "重设邮件请求已发送；若此邮箱可以接收重设邮件，请在邮箱中查看。",
          );
        },
      );
    else if (kind === "reset")
      await run("password", { password }, () => {
        setPassword("");
        setConfirmation("");
        setStage("updated");
        setNotice("密码已更新。");
      });
    else
      await run(
        phoneMode
          ? "verify-phone-otp"
          : emailMode === "otp"
            ? "verify-email-otp"
            : "signin",
        {
          ...(phoneMode ? { phone: phoneValue } : { email: email.trim() }),
          ...(otpMode ? { token: otp } : { password }),
          returnTo,
        },
        (data) => enter(data.returnTo),
      );
  }
  async function social(provider: OAuthProvider) {
    if (agreementRequired && !agreement)
      return fail("请先勾选服务条款与隐私政策同意。");
    await run("oauth", { provider, returnTo }, (data) => {
      if (!providers[provider] || data.state !== "oauth_redirect" || !data.url)
        return fail(authErrorText.provider_unavailable);
      // URL comes only from TASK-018's origin-validated SDK initiation response.
      window.location.assign(data.url);
    });
  }

  return (
    <div className={styles.formContent}>
      <h1>
        {stage === "confirmation"
          ? "请检查邮箱"
          : stage === "sent"
            ? "邮件已发送 ✓"
            : stage === "updated"
              ? "密码已更新 ✓"
              : heading}
      </h1>
      <p className={styles.subtitle}>
        {stage === "form"
          ? intro
          : stage === "confirmation"
            ? "确认邮箱后，再开始你的旅行。"
            : stage === "sent"
              ? `请检查 ${maskedEmail(email)} 的收件箱。`
              : "新密码已生效。返回登录将退出当前会话。"}
      </p>
      {kind === "login" && (
        <div role="tablist" aria-label="登录方式" className={styles.tabs}>
          {loginChannels.map((item) => (
            <button
              key={item}
              role="tab"
              id={`${prefix}-tab-${item}`}
              aria-controls={`${prefix}-panel`}
              aria-selected={channel === item}
              tabIndex={channel === item ? 0 : -1}
              type="button"
              disabled={pending}
              onClick={() => changeMode(item)}
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "phone"
                    : event.key === "End"
                      ? "email"
                      : item === "phone"
                        ? "email"
                        : "phone";
                changeMode(next);
                document.getElementById(`${prefix}-tab-${next}`)?.focus();
              }}
            >
              {item === "phone" ? "手机登录" : "邮箱登录"}
            </button>
          ))}
        </div>
      )}
      <div
        id={`${prefix}-panel`}
        role={kind === "login" ? "tabpanel" : undefined}
        aria-labelledby={
          kind === "login" ? `${prefix}-tab-${channel}` : undefined
        }
      >
        <form
          ref={formRef}
          method="post"
          onSubmit={submit}
          noValidate
          aria-busy={pending}
        >
          {stage === "form" && (
            <fieldset disabled={pending} className={styles.fields}>
              {kind !== "reset" &&
                (phoneMode ? (
                  <div className={styles.field}>
                    <label htmlFor={`${prefix}-phone`}>手机号</label>
                    <div className={styles.phoneRow}>
                      <select
                        aria-label="国家/地区码"
                        value={country}
                        onChange={(e) => {
                          setCountry(e.target.value);
                          setOtp("");
                        }}
                      >
                        <option value="+81">日本 +81</option>
                        <option value="+86">中国 +86</option>
                        <option value="+1">美国/加拿大 +1</option>
                        <option value="+852">香港 +852</option>
                        <option value="+886">台湾 +886</option>
                        <option value="+82">韩国 +82</option>
                        <option value="+44">英国 +44</option>
                        <option value="+61">澳大利亚 +61</option>
                      </select>
                      <input
                        id={`${prefix}-phone`}
                        name="phone"
                        type="tel"
                        autoComplete="tel-national"
                        value={phone}
                        placeholder="手机号（不含国家码）"
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setOtp("");
                        }}
                        aria-invalid={!!error || undefined}
                        aria-describedby={errorId}
                        required
                      />
                    </div>
                    <small>输入国际格式号码，省略本地拨号前缀 0。</small>
                  </div>
                ) : (
                  <div className={styles.field}>
                    <label htmlFor={`${prefix}-email`}>邮箱地址</label>
                    <div className={styles.inputRow}>
                      <span aria-hidden="true" className={styles.inputIcon}>
                        <AuthIcon name="mail" />
                      </span>
                      <input
                        id={`${prefix}-email`}
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setUnregistered(false);
                          setOtp("");
                        }}
                        placeholder="请输入邮箱地址"
                        aria-invalid={!!error || undefined}
                        aria-describedby={errorId}
                        required
                      />
                    </div>
                  </div>
                ))}
              {otpMode ? (
                <div className={styles.field}>
                  <label htmlFor={`${prefix}-otp`}>验证码</label>
                  <div className={styles.inputRow}>
                    <span aria-hidden="true" className={styles.inputIcon}>
                      <AuthIcon name="shield" />
                    </span>
                    <input
                      id={`${prefix}-otp`}
                      name="otp"
                      type="password"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      placeholder="请输入验证码"
                      aria-invalid={!!error || undefined}
                      aria-describedby={`${errorId} ${statusId}`}
                      required
                    />
                    <button
                      type="button"
                      className={styles.inputAction}
                      onClick={sendOtp}
                      disabled={pending || cooldown > 0}
                    >
                      {pending
                        ? "处理中…"
                        : cooldown > 0
                          ? `${cooldown} 秒后重发`
                          : sentTo
                            ? "重新发送"
                            : "获取验证码"}
                    </button>
                  </div>
                </div>
              ) : (
                kind !== "forgot" && (
                  <PasswordField
                    id={`${prefix}-password`}
                    label={kind === "reset" ? "新密码" : "密码"}
                    value={password}
                    onChange={setPassword}
                    disabled={pending}
                    errorId={errorId}
                    invalid={!!error}
                    isNew={kind === "register" || kind === "reset"}
                  />
                )
              )}
              {(kind === "register" || kind === "reset") && (
                <>
                  <PasswordRules password={password} />
                  <PasswordField
                    id={`${prefix}-confirm`}
                    label={kind === "reset" ? "确认新密码" : "确认密码"}
                    value={confirmation}
                    onChange={setConfirmation}
                    disabled={pending}
                    errorId={errorId}
                    invalid={!!error}
                    isNew
                  />
                </>
              )}
              {kind === "login" && channel === "email" && (
                <div className={styles.modeActions}>
                  <button
                    type="button"
                    onClick={() =>
                      changeMode(
                        "email",
                        emailMode === "password" ? "otp" : "password",
                      )
                    }
                  >
                    {emailMode === "password"
                      ? "使用验证码登录"
                      : "使用密码登录"}
                  </button>
                  {emailMode === "password" && (
                    <>
                      <span aria-hidden="true">|</span>
                      <Link
                        href={authHref("/forgot-password", returnTo, email)}
                      >
                        忘记密码？
                      </Link>
                    </>
                  )}
                </div>
              )}
              {agreementRequired && (
                <div className={styles.agreement}>
                  <label>
                    <input
                      name="agreement"
                      type="checkbox"
                      checked={agreement}
                      onChange={(e) => setAgreement(e.target.checked)}
                      aria-describedby={`${prefix}-legal ${errorId}`}
                      required
                    />
                    <span>继续即表示你同意《服务条款》和《隐私政策》</span>
                  </label>
                  <small id={`${prefix}-legal`}>
                    正式法律文件尚待发布（WBS 10.6）。
                  </small>
                  {phoneMode && (
                    <p>未注册手机号验证成功后将自动创建 TravelAssist 账户。</p>
                  )}
                </div>
              )}
            </fieldset>
          )}
          <p
            id={errorId}
            ref={feedbackRef}
            tabIndex={-1}
            className={styles.error}
            role="alert"
          >
            {error}
          </p>
          <p
            id={statusId}
            className={styles.notice}
            role="status"
            aria-live="polite"
          >
            {notice}
          </p>
          {unregistered && (
            <div className={styles.unregistered}>
              <Link
                className={styles.primary}
                href={authHref("/register", returnTo, email.trim())}
              >
                创建账户
              </Link>
              <button
                type="button"
                onClick={() => {
                  setEmail("");
                  setUnregistered(false);
                  setError("");
                  document.getElementById(`${prefix}-email`)?.focus();
                }}
              >
                使用其他邮箱
              </button>
            </div>
          )}
          {stage === "form" && !unregistered && (
            <button className={styles.primary} type="submit" disabled={pending}>
              {pending
                ? "处理中…"
                : {
                    login: "登录",
                    register: "创建账户",
                    forgot: "发送重设链接",
                    reset: "更新密码",
                  }[kind]}
            </button>
          )}
          {stage === "confirmation" && (
            <>
              <p className={styles.notice}>
                注册尚待邮箱确认，请在发起注册的浏览器中完成。没有收到时请检查垃圾邮件，或重新进入注册页面。
              </p>
              <Link
                className={styles.primary}
                href={confirmationDestination(returnTo)}
              >
                我已确认邮箱，继续
              </Link>
            </>
          )}
          {stage === "sent" && (
            <button
              className={styles.primary}
              type="submit"
              disabled={pending || cooldown > 0}
            >
              {pending
                ? "发送中…"
                : cooldown > 0
                  ? `${cooldown} 秒后重新发送`
                  : "重新发送"}
            </button>
          )}
          {stage === "updated" && (
            <button
              type="button"
              className={styles.primary}
              disabled={pending}
              onClick={() =>
                run("signout", {}, () => {
                  window.location.replace("/login");
                })
              }
            >
              {pending ? "退出当前会话…" : "返回登录"}
            </button>
          )}
        </form>
      </div>
      {(kind === "login" || kind === "register") && stage === "form" && (
        <>
          <div className={styles.divider}>
            <span>或</span>
          </div>
          <div className={styles.social}>
            {(["google", "apple"] as const).map((provider) => (
              <button
                type="button"
                key={provider}
                disabled={pending}
                onClick={() => social(provider)}
              >
                <span
                  className={
                    provider === "google" ? styles.google : styles.apple
                  }
                  aria-hidden="true"
                >
                  <AuthIcon name={provider} />
                </span>
                使用 {provider === "google" ? "Google" : "Apple"}{" "}
                {kind === "register" ? "注册" : "登录"}
              </button>
            ))}
          </div>
        </>
      )}
      <footer className={styles.formFooter}>
        {kind === "login" ? (
          <>
            还没有账户？
            <Link href={authHref("/register", returnTo)}>创建账户</Link>
          </>
        ) : kind === "register" ? (
          <>
            已有账户？<Link href={authHref("/login", returnTo)}>登录</Link>
          </>
        ) : stage !== "updated" ? (
          <Link href={authHref("/login", returnTo)}>← 返回登录</Link>
        ) : null}
      </footer>
    </div>
  );
}
