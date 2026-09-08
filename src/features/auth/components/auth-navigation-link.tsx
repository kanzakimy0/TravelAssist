"use client";

import Link, { useLinkStatus } from "next/link";
import styles from "../auth.module.css";

function NavigationHint() {
  const { pending } = useLinkStatus();
  return (
    <>
      <span
        className={styles.navigationHint}
        data-pending={pending || undefined}
        aria-hidden="true"
      >
        …
      </span>
      <span className={styles.srOnly} role="status" aria-live="polite">
        {pending ? "页面切换中" : ""}
      </span>
    </>
  );
}

/** Keep the current form visible until the server-verified destination is ready. */
export function AuthNavigationLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`${styles.navigationLink} ${className}`}
      aria-label={children}
    >
      {children}
      <NavigationHint />
    </Link>
  );
}
