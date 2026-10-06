import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { authHref } from "@/features/auth/auth-ui-model";
import type { HomeViewer } from "@/lib/auth/home-viewer";

import { MainHeader } from "@/components/layout/main-header";
import { AccountAvatar } from "@/components/ui/account-avatar";

import styles from "../start-flow.module.css";

export function StartFlowHeader({
  viewer = null,
}: {
  viewer?: HomeViewer | null;
}) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const loginHref = authHref("/login", pathname + (query ? "?" + query : ""));
  return (
    <MainHeader className={styles.header}>
      <div className={styles.headerActions}>
        <label className={styles.languageSelect}>
          <span className={styles.srOnly}>语言</span>
          <select aria-label="界面语言" defaultValue="zh-CN">
            <option value="zh-CN">中文</option>
            <option value="ja-JP">日本語</option>
            <option value="en-US">English</option>
          </select>
        </label>
        {viewer ? (
          <Link
            aria-label={`${viewer.name} · 个人中心`}
            title={`${viewer.name} · 个人中心`}
            className={styles.accountLink}
            href="/personal-center"
          >
            <AccountAvatar src={viewer.avatar} unoptimized />
            <span className={styles.accountName}>{viewer.name}</span>
          </Link>
        ) : (
          <Link
            aria-label="登录"
            className={styles.accountLink}
            href={loginHref}
          >
            登录
          </Link>
        )}
      </div>
    </MainHeader>
  );
}
