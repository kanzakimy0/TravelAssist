import Link from "next/link";
import type { ComponentPropsWithRef } from "react";
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
  const { requestNavigation } = usePersonalNavigationGuard();

  return (
    <div {...props} popover="auto" className={styles.avatarPopover}>
      <div className={styles.avatarPopoverIdentity}>
        <span className={styles.smallAvatar} aria-hidden="true">
          {mockPersonalUser.initial}
        </span>
        <div className={styles.userText}>
          <strong>{mockPersonalUser.name}</strong>
          <span>{mockPersonalUser.label}</span>
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
        disabled
        title="登录功能接入后开放"
        aria-label="退出登录（登录功能接入后开放）"
      >
        <span>退出登录</span>
        <small>登录功能接入后开放</small>
      </button>
    </div>
  );
}
