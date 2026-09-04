import Link from "next/link";

import styles from "../start-flow.module.css";

export function StartFlowHeader() {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/">
        <span aria-hidden="true" className={styles.brandMark} />
        <span>TravelAssist</span>
      </Link>
      <div className={styles.headerActions}>
        <label className={styles.languageSelect}>
          <span className={styles.srOnly}>语言</span>
          <select aria-label="界面语言" defaultValue="zh-CN">
            <option value="zh-CN">中文</option>
            <option value="ja-JP">日本語</option>
            <option value="en-US">English</option>
          </select>
        </label>
        <button aria-label="用户账户" className={styles.avatar} type="button">
          旅
        </button>
      </div>
    </header>
  );
}
