"use client";
import { useState } from "react";
import Link from "next/link";
import { AccountAvatar } from "@/components/ui/account-avatar";
import type { HomeViewer } from "@/lib/auth/home-viewer";
import styles from "./home-header-actions.module.css";

export function HomeAccountLink({
  viewer,
  compact = false,
}: {
  viewer: HomeViewer | null;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <Link
      href="/personal-center"
      className={compact ? styles.heroAccount : styles.account}
      aria-label={
        viewer?.name === "个人中心"
          ? "进入个人中心"
          : (viewer?.name ?? "游客") + " · 个人中心"
      }
    >
      <span onErrorCapture={() => setFailed(true)}>
        <AccountAvatar src={failed ? undefined : viewer?.avatar} unoptimized />
      </span>
      <span className={styles.accountName}>{viewer?.name ?? "游客"}</span>
      {compact && viewer?.name !== "个人中心" ? <span>· 个人中心</span> : null}
      <span aria-hidden="true">›</span>
    </Link>
  );
}
