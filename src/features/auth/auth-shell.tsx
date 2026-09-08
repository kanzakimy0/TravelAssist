import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./auth.module.css";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#auth-content">
        跳到认证表单
      </a>
      <header className={styles.brandBar}>
        <Link href="/" aria-label="TravelAssist 首页" className={styles.brand}>
          <Image
            src="/media/personal-center/travelassist-logo-torii.png"
            alt="TravelAssist"
            width={220}
            height={56}
            priority
          />
        </Link>
        <Link className={styles.backHome} href="/">
          <span aria-hidden="true">⌂</span>返回首页
        </Link>
      </header>
      <div className={styles.composition}>
        <aside className={styles.travelVisual} aria-label="日本旅行摄影">
          <Image
            src="/media/personal-center/hero-kyoto-sakura.webp"
            alt="樱花盛开时的京都古街与寺塔"
            fill
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 42vw, 57vw"
            priority
            className={styles.travelPhoto}
          />
          <p className={styles.photoCaption}>
            — &nbsp; Plan your next journey in Japan
          </p>
        </aside>
        <main id="auth-content" tabIndex={-1} className={styles.card}>
          <div className={styles.ornament} aria-hidden="true">
            <Image
              src="/media/personal-center/sidebar-shell-ornament-top.png"
              alt=""
              fill
              sizes="(max-width: 767px) 160px, 300px"
            />
          </div>
          <div className={styles.cardContent}>{children}</div>
        </main>
      </div>
    </div>
  );
}
