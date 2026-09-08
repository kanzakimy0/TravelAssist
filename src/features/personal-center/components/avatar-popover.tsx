import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ComponentPropsWithRef } from "react";
import { authRequest } from "@/features/auth/auth-client";
import { authErrorText } from "@/features/auth/auth-ui-model";
import { avatarMenuItems } from "../constants/avatar-menu";
import { mockPersonalUser } from "../constants/personal-navigation";
import styles from "../personal-center.module.css";
import { usePersonalNavigationGuard } from "./navigation-guard-context";
import { PersonalIcon } from "./personal-icon";

type AvatarPopoverProps = Pick<
  ComponentPropsWithRef<"div">,
  "id" | "ref" | "onBeforeToggle" | "onToggle"
> & {
  onNavigate: () => void;
};

// The host owns its trigger, positioning and focus; B owns content and targets.
// Import from a client host and provide the Personal Center semantic tokens.
export function AvatarPopover({ onNavigate, ...props }: AvatarPopoverProps) {
  const { requestNavigation, isDirty, setIsDirty } = usePersonalNavigationGuard();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const lock = useRef(false);
  async function signOut(discard = false) {
    if (lock.current) return;
    if (isDirty && !discard) { setConfirmDiscard(true); return; }
    lock.current = true; setPending(true); setError("");
    const result = await authRequest("signout");
    if (!result.ok) { setError(authErrorText[result.code]); setPending(false); lock.current = false; return; }
    setIsDirty(false);
    window.setTimeout(() => window.location.replace("/"), 0);
  }

  return (
    <div {...props} popover="auto" className={styles.avatarPopover}>
      <div className={styles.avatarPopoverIdentity}>
        <span className={styles.smallAvatar} aria-hidden="true">
          <Image
            src={mockPersonalUser.avatar}
            alt=""
            fill
            sizes="38px"
            className={styles.identityPhoto}
          />
        </span>
        <div className={styles.userText}>
          <strong>旅行者</strong>
          <span>已登录 · 头像与资料为演示</span>
        </div>
      </div>
      <nav aria-label="账户快捷导航">
        <ul className={styles.avatarMenuList}>
          {avatarMenuItems.map((item) => (
            <li
              key={item.href}
              className={
                item.icon === "account" ? styles.avatarMenuAccount : undefined
              }
            >
              <Link
                href={item.href}
                onNavigate={(event) => {
                  if (requestNavigation(item.href, event)) return;
                  onNavigate();
                }}
                className={styles.avatarMenuLink}
                data-primary={item.icon === "home" || undefined}
              >
                <PersonalIcon name={item.icon} />
                <span>{item.label}</span>
                {item.icon === "home" && (
                  <PersonalIcon name="arrow" width="18" height="18" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <button
        type="button"
        className={styles.avatarLogout}
        disabled={pending}
        onClick={() => signOut()}
        aria-label="退出登录"
        aria-busy={pending}
      >
        <span>{pending ? "正在退出…" : "退出登录"}</span>
        <small>仅退出当前会话</small>
      </button>
      {confirmDiscard && <div role="group" aria-label="确认放弃未保存修改并退出"><p>你有未保存的修改，退出后不会保留。</p><button type="button" className={styles.avatarLogout} disabled={pending} onClick={() => signOut(true)}>放弃修改并退出</button><button type="button" className={styles.avatarLogout} disabled={pending} onClick={() => setConfirmDiscard(false)}>继续编辑</button></div>}
      <p role="alert">{error}</p>
    </div>
  );
}
