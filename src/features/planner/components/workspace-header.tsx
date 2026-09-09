import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MainHeader } from "@/components/layout/main-header";
import { AccountAvatar } from "@/components/ui/account-avatar";
import { PlannerPopover } from "./planner-popover";
import styles from "../planner.module.css";
import ui from "../planner-v05.module.css";

export function WorkspaceHeader() {
  const [open, setOpen] = useState<
    "search" | "notifications" | "account" | null
  >(null);
  const [query, setQuery] = useState("");
  const [searchNotice, setSearchNotice] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const compact = window.matchMedia("(max-width: 767px)");
    const update = () => {
      if (!compact.matches)
        setOpen((current) => (current === "search" ? null : current));
      setSearchNotice(false);
    };
    compact.addEventListener("change", update);
    return () => compact.removeEventListener("change", update);
  }, []);
  const search = useRef<HTMLButtonElement>(null),
    notifications = useRef<HTMLButtonElement>(null),
    account = useRef<HTMLButtonElement>(null);
  return (
    <MainHeader
      className={styles.header}
      decoration={
        <div className={ui.topFade} data-top-gradient aria-hidden="true" />
      }
    >
      <div className={ui.headerActions}>
        <form
          className={ui.search}
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (searchInput.current?.getClientRects().length) {
              setOpen(null);
              setSearchNotice(true);
              searchInput.current.focus();
            } else setOpen("search");
          }}
        >
          <input
            ref={searchInput}
            aria-label="搜索景点、城市或酒店"
            placeholder="搜索景点 · 城市 · 酒店…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchNotice(false);
            }}
            onBlur={() => setSearchNotice(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearchNotice(false);
            }}
          />
          <button
            ref={search}
            type="submit"
            aria-label="搜索"
            aria-expanded={open === "search"}
            aria-controls={open === "search" ? "header-search" : undefined}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="10" cy="10" r="6.5" />
              <path d="m15 15 6 6" />
            </svg>
          </button>
          {searchNotice && (
            <span className={ui.searchNotice} role="status">
              搜索服务尚未接入，暂不能查询。
            </span>
          )}
        </form>
        <button
          className={ui.headerIcon}
          ref={notifications}
          type="button"
          aria-label="通知"
          aria-expanded={open === "notifications"}
          onClick={() =>
            setOpen(open === "notifications" ? null : "notifications")
          }
        >
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4ZM10 20h4" />
          </svg>
        </button>
        <button
          className={ui.headerIcon}
          ref={account}
          type="button"
          aria-label="个人中心菜单"
          aria-expanded={open === "account"}
          onClick={() => setOpen(open === "account" ? null : "account")}
        >
          <AccountAvatar />
        </button>
      </div>
      {open && (
        <PlannerPopover
          id={"header-" + open}
          title={
            open === "search"
              ? "搜索景点、城市或酒店"
              : open === "notifications"
                ? "通知"
                : "个人中心"
          }
          trigger={
            open === "search"
              ? search
              : open === "notifications"
                ? notifications
                : account
          }
          onClose={() => setOpen(null)}
        >
          {open === "search" ? (
            <div className={ui.searchPanel}>
              <label>
                搜索关键词
                <input
                  data-popover-autofocus
                  aria-label="搜索关键词"
                  placeholder="景点、城市或酒店"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <p>
                “{query || "景点 / 城市 / 酒店"}” ·
                搜索入口演示，尚未连接搜索服务。
              </p>
            </div>
          ) : open === "notifications" ? (
            <p>暂无新通知 · 本地演示</p>
          ) : (
            <Link href="/personal-center">进入个人中心</Link>
          )}
        </PlannerPopover>
      )}
    </MainHeader>
  );
}
