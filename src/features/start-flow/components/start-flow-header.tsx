import Link from "next/link";
import { MainHeader } from "@/components/layout/main-header";
import { AccountAvatar } from "@/components/ui/account-avatar";

import styles from "../start-flow.module.css";

export function StartFlowHeader() {
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
        <Link
          aria-label="前往个人中心"
          className={styles.accountLink}
          href="/personal-center"
        >
          <AccountAvatar />
        </Link>
      </div>
    </MainHeader>
  );
}
