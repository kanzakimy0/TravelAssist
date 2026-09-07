"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { mockPersonalUser } from "../constants/personal-navigation";
import styles from "../personal-center.module.css";
import { GuardedLink } from "./guarded-link";
import { PersonalIcon } from "./personal-icon";
import { PersonalPrimaryNav } from "./personal-primary-nav";

export function PersonalSidebar() {
  const pathname = usePathname();

  return <PersonalSidebarContent key={pathname} />;
}

function PersonalSidebarContent() {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tabletDrawerMode, setTabletDrawerMode] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(
      "(min-width: 768px) and (max-width: 1023px)",
    );
    const updateMode = () => {
      setTabletDrawerMode(query.matches);
      if (!query.matches) setDrawerOpen(false);
    };
    updateMode();
    query.addEventListener("change", updateMode);
    return () => query.removeEventListener("change", updateMode);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const panel = panelRef.current;
    const content = document.getElementById("personal-content");
    if (!panel) return;

    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousContentOverflow = content?.style.overflow ?? "";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (content) content.style.overflow = "hidden";
    document.body.dataset.personalDrawerOpen = "true";

    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("inert"));

    const initialFocusFrame = window.requestAnimationFrame(() => {
      panel.querySelector<HTMLElement>("[data-personal-nav-item]")?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const openDialog =
        document.querySelector<HTMLDialogElement>("dialog[open]");
      if (openDialog && !panel.contains(openDialog)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawerOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || !panel.contains(active))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(initialFocusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.body.style.overflow = previousBodyOverflow;
      if (content) content.style.overflow = previousContentOverflow;
      delete document.body.dataset.personalDrawerOpen;
    };
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
          href="/"
          className={styles.compactBrand}
          aria-label="TravelAssist 首页"
          onNavigate={() => setDrawerOpen(false)}
        >
          <span className={styles.compactBrandLogo} aria-hidden="true">
            <Image
              src="/media/personal-center/travelassist-logo-torii.png"
              alt=""
              fill
              sizes="150px"
            />
          </span>
        </GuardedLink>
      </div>

      <div
        ref={panelRef}
        id="personal-sidebar-panel"
        className={styles.sidebarPanel}
        role={drawerOpen ? "dialog" : undefined}
        aria-modal={drawerOpen ? true : undefined}
        aria-label={drawerOpen ? "个人中心导航" : undefined}
        aria-hidden={tabletDrawerMode && !drawerOpen ? true : undefined}
        inert={tabletDrawerMode && !drawerOpen ? true : undefined}
        tabIndex={drawerOpen ? -1 : undefined}
      >
        <div className={styles.sakuraOverlay} aria-hidden="true">
          <Image
            src="/media/personal-center/sidebar-shell-ornament-top.png"
            alt=""
            fill
            sizes="340px"
          />
        </div>
        <GuardedLink
          href="/"
          className={styles.brand}
          aria-label="TravelAssist 首页"
          onNavigate={() => setDrawerOpen(false)}
        >
          <span className={styles.brandLogo} aria-hidden="true">
            <Image
              src="/media/personal-center/travelassist-logo-torii.png"
              alt=""
              fill
              sizes="190px"
            />
          </span>
        </GuardedLink>
        <GuardedLink
          href="/personal-center/account"
          className={styles.userSummary}
          aria-label={`${mockPersonalUser.name}（Mock 用户）的账户`}
          onNavigate={() => setDrawerOpen(false)}
        >
          <span className={styles.avatar} aria-hidden="true">
            <Image
              src={mockPersonalUser.avatar}
              alt=""
              fill
              sizes="52px"
              className={styles.identityPhoto}
            />
          </span>
          <span className={styles.userText}>
            <strong>{mockPersonalUser.name}</strong>
            <span>{mockPersonalUser.label}</span>
          </span>
        </GuardedLink>
        <PersonalPrimaryNav onNavigate={() => setDrawerOpen(false)} />
        <div className={styles.sidebarArtworkArea} aria-hidden="true">
          <Image
            src="/media/personal-center/sidebar-torii-watercolor-v2.png"
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
