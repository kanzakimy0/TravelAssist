import styles from "./compact-header.module.css";

function Brand() {
  return (
    <div aria-label="TravelAssist" className={styles.brand}>
      <span aria-hidden="true" className={styles.brandMark} />
      <span>TravelAssist</span>
    </div>
  );
}

function LanguageAction() {
  return (
    <details className={styles.language}>
      <summary aria-label="语言选项，当前为简体中文">
        <span aria-hidden="true">文</span>
        <span>中文</span>
        <span aria-hidden="true" className={styles.chevron}>
          ↓
        </span>
      </summary>
      <p>更多语言即将开放</p>
    </details>
  );
}

export function CompactHeader() {
  return (
    <header className={styles.header}>
      <nav aria-label="首页导航" className={styles.nav}>
        <Brand />
        <LanguageAction />
      </nav>
    </header>
  );
}
