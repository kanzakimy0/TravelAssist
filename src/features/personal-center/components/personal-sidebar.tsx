"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { mockPersonalUser } from "../constants/personal-navigation";
import styles from "../personal-center.module.css";
import { GuardedLink } from "./guarded-link";
import { PersonalIcon } from "./personal-icon";
import { PersonalPrimaryNav } from "./personal-primary-nav";

export function PersonalSidebar() {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDrawerOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [drawerOpen]);

  return (
    <aside
      className={styles.sidebar}
      aria-label="个人中心侧栏"
      data-drawer-open={drawerOpen || undefined}
    >
      <div className={styles.compactTopBar}>
        <button
          ref={menuButtonRef}
          type="button"
          className={styles.drawerTrigger}
          aria-label={drawerOpen ? "关闭个人中心导航" : "打开个人中心导航"}
          aria-expanded={drawerOpen}
          aria-controls="personal-sidebar-panel"
          onClick={() => setDrawerOpen((open) => !open)}
        >
          <PersonalIcon name={drawerOpen ? "close" : "menu"} />
        </button>
        <GuardedLink
          href="/personal-center"
          className={styles.compactBrand}
          aria-label="TravelAssist 个人中心首页"
          onNavigate={() => setDrawerOpen(false)}
        >
          <span className={styles.brandMark}>
            <PersonalIcon name="compass" />
          </span>
          <span>TravelAssist</span>
        </GuardedLink>
      </div>

      <div id="personal-sidebar-panel" className={styles.sidebarPanel}>
        <div className={styles.sakuraOverlay} aria-hidden="true">
          <Image
            src="/media/personal-center/photoreal-v3/sidebar-sakura-photo-overlay.png"
            alt=""
            fill
            sizes="220px"
          />
        </div>
        <GuardedLink
          href="/personal-center"
          className={styles.brand}
          aria-label="TravelAssist 个人中心首页"
          onNavigate={() => setDrawerOpen(false)}
        >
          <span className={styles.brandMark}>
            <PersonalIcon name="compass" />
          </span>
          <span>TravelAssist</span>
        </GuardedLink>
        <GuardedLink
          href="/personal-center/account"
          className={styles.userSummary}
          aria-label={`${mockPersonalUser.name}（Mock 用户）的账户`}
          onNavigate={() => setDrawerOpen(false)}
        >
          <span className={styles.avatar} aria-hidden="true">
            {mockPersonalUser.initial}
          </span>
          <span className={styles.userText}>
            <strong>{mockPersonalUser.name}</strong>
            <span>{mockPersonalUser.label}</span>
          </span>
        </GuardedLink>
        <PersonalPrimaryNav onNavigate={() => setDrawerOpen(false)} />
        <div className={styles.sidebarArtworkArea} aria-hidden="true">
          <Image
            src="/media/personal-center/photoreal-v3/sidebar-torii-photo.webp"
            alt=""
            fill
            sizes="(min-width: 1280px) 18vw, 360px"
          />
        </div>
      </div>
      {drawerOpen ? (
        <button
          type="button"
          className={styles.drawerBackdrop}
          aria-label="关闭个人中心导航"
          onClick={() => {
            setDrawerOpen(false);
            menuButtonRef.current?.focus();
          }}
        />
      ) : null}
    </aside>
  );
}
