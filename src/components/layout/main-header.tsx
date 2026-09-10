import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/ui/brand-logo";
import styles from "./main-header.module.css";

export function LanguageAction() {
  return (
    <details className={styles.language}>
      <summary aria-label="语言选项，当前为简体中文">
        <span>中文</span>
        <span aria-hidden="true">⌄</span>
      </summary>
      <p>更多语言即将开放</p>
    </details>
  );
}

/** Promoted TASK-004/TASK-010 Header; adapters own actions and page geometry. */
export function MainHeader({
  children,
  className = styles.home,
  decoration,
  brandCaption,
}: {
  children?: ReactNode;
  className?: string;
  decoration?: ReactNode;
  brandCaption?: string;
}) {
  return (
    <header className={className} data-main-header>
      {decoration}
      <nav className={styles.navigation} aria-label="TravelAssist 主导航">
        <Link href="/" aria-label="TravelAssist 首页" className={styles.brand}>
          <BrandLogo width={190} height={48} priority />
          {brandCaption ? (
            <span className={styles.brandCaption}>{brandCaption}</span>
          ) : null}
        </Link>
        {children ?? <LanguageAction />}
      </nav>
    </header>
  );
}
