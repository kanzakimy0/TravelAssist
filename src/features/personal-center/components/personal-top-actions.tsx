"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { mockPersonalUser } from "../constants/personal-navigation";
import styles from "../personal-center.module.css";
import { AvatarPopover } from "./avatar-popover";
import { PersonalIcon } from "./personal-icon";

export function PersonalTopActions() {
  const pathname = usePathname();
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const positionPopover = useCallback(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;

    const rect = trigger.getBoundingClientRect();
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    const menuWidth = Math.min(292, width - 32);
    const menuTop = Math.max(
      top + 16,
      Math.min(rect.bottom + 8, top + height - 76),
    );

    // A scrolled-off trigger must not leave a detached floating menu behind.
    if (rect.bottom < top || rect.top > top + height) {
      if (popover.matches(":popover-open")) popover.hidePopover();
      return;
    }

    popover.style.width = `${menuWidth}px`;
    popover.style.left = `${Math.max(left + 16, Math.min(rect.right - menuWidth, left + width - menuWidth - 16))}px`;
    popover.style.top = `${menuTop}px`;
    popover.style.maxHeight = `${Math.max(44, top + height - menuTop - 16)}px`;
  }, []);

  const closePopover = useCallback(() => {
    const popover = popoverRef.current;
    if (popover?.matches(":popover-open")) popover.hidePopover();
  }, []);

  // Layouts persist across App Router navigation, including browser back/forward.
  useEffect(() => {
    closePopover();
  }, [pathname, closePopover]);

  useEffect(() => {
    if (!isOpen) return;
    const viewport = window.visualViewport;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closePopover();
      triggerRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", positionPopover);
    window.addEventListener("scroll", positionPopover, true);
    viewport?.addEventListener("resize", positionPopover);
    viewport?.addEventListener("scroll", positionPopover);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", positionPopover, true);
      viewport?.removeEventListener("resize", positionPopover);
      viewport?.removeEventListener("scroll", positionPopover);
    };
  }, [isOpen, positionPopover, closePopover]);

  return (
    <header className={styles.topActions} aria-label="个人中心全局操作">
      <button
        type="button"
        className={styles.notification}
        disabled
        aria-label="通知（暂未开放）"
        title="通知暂未开放"
      >
        <PersonalIcon name="bell" />
      </button>
      <button
        ref={triggerRef}
        type="button"
        className={styles.avatarTrigger}
        popoverTarget={popoverId}
        aria-expanded={isOpen}
        aria-controls={popoverId}
        aria-label={`${isOpen ? "关闭" : "打开"}账户菜单，${mockPersonalUser.name}（${mockPersonalUser.label}）`}
      >
        <span className={styles.smallAvatar} aria-hidden="true">
          {mockPersonalUser.initial}
        </span>
        <PersonalIcon name="chevron" width="16" height="16" />
      </button>
      <AvatarPopover
        id={popoverId}
        ref={popoverRef}
        onBeforeToggle={(event) => {
          if (event.newState === "open") {
            positionPopover();
          } else if (
            event.currentTarget.contains(document.activeElement) ||
            document.activeElement === document.body
          ) {
            // Preserve intentional outside focus; never leave focus hidden/body.
            triggerRef.current?.focus({ preventScroll: true });
          }
        }}
        onToggle={(event) => setIsOpen(event.newState === "open")}
        onNavigate={() => {
          closePopover();
          triggerRef.current?.focus({ preventScroll: true });
        }}
      />
    </header>
  );
}
