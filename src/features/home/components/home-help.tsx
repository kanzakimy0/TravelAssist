"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./home-help.module.css";

export function HomeHelp() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const outside = (event: Event) => {
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [open]);
  return (
    <div className={styles.container} ref={container}>
      <button
        className={styles.trigger}
        type="button"
        ref={trigger}
        aria-label="使用指南"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="home-help-popover"
        onClick={() => setOpen(!open)}
      >
        <span className={styles.question} aria-hidden="true">
          ?
        </span>
        <span className={styles.label}>使用指南</span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-labelledby="home-help-title"
          id="home-help-popover"
          className={styles.popover}
        >
          <button
            ref={closeButton}
            type="button"
            className={styles.close}
            aria-label="关闭使用指南"
            onClick={() => {
              setOpen(false);
              trigger.current?.focus();
            }}
          >
            ×
          </button>
          <h2 id="home-help-title">第一次使用 TravelAssist？</h2>
          <ol>
            <li>告诉我们想去哪里</li>
            <li>设置时间、同行人和偏好</li>
            <li>获取推荐行程</li>
            <li>在地图上调整路线</li>
            <li>保存并在旅途中继续使用</li>
          </ol>
          <Link href="/help">查看完整使用指南 →</Link>
        </div>
      ) : null}
    </div>
  );
}
