import { useLayoutEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import styles from "../planner.module.css";
import { PlannerIcon } from "./planner-icon";

export function PlannerPopover({
  id,
  title,
  trigger,
  onClose,
  children,
  compact = false,
}: {
  id: string;
  title: string;
  trigger: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  children: ReactNode;
  compact?: boolean;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useLayoutEffect(() => {
    const element = surface.current;
    const button = trigger.current;
    if (!element || !button) return;
    // The top layer keeps viewport coordinates independent of animated,
    // filtered or scroll-clipped ancestors, including nested detail menus.
    element.showPopover();
    function position() {
      if (!element || !button) return;
      const rect = button.getBoundingClientRect();
      if (compact) element.style.width = `${rect.width}px`;
      const width = element.offsetWidth;
      const below = window.innerHeight - rect.bottom - 20;
      const above = Math.min(window.innerHeight - 24, rect.top - 20);
      const placeBelow =
        below >= Math.min(element.scrollHeight, 420) || below >= above;
      element.style.maxHeight = `${Math.min(window.innerHeight - 24, Math.max(80, placeBelow ? below : above))}px`;
      const height = element.offsetHeight;
      element.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`;
      element.style.top = `${Math.max(12, Math.min(window.innerHeight - height - 12, placeBelow ? rect.bottom + 8 : rect.top - height - 8))}px`;
    }
    position();
    element.querySelector<HTMLElement>("button, input")?.focus();
    function outside(event: PointerEvent) {
      if (
        Array.from(document.querySelectorAll("[data-planner-popover]")).at(
          -1,
        ) !== element
      )
        return;
      if (
        event.target instanceof Node &&
        !element?.contains(event.target) &&
        !button?.contains(event.target)
      )
        close.current();
    }
    function escape(event: KeyboardEvent) {
      if (
        Array.from(document.querySelectorAll("[data-planner-popover]")).at(
          -1,
        ) !== element
      )
        return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close.current();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    window.addEventListener("resize", position);
    document.addEventListener("scroll", position, true);
    const observer = new ResizeObserver(position);
    observer.observe(element);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
      window.removeEventListener("resize", position);
      document.removeEventListener("scroll", position, true);
      observer.disconnect();
      if (element.matches(":popover-open")) element.hidePopover();
      button.focus({ preventScroll: true });
    };
  }, [trigger, compact]);
  return (
    <div
      id={id}
      ref={surface}
      popover="manual"
      data-planner-popover
      data-compact={compact || undefined}
      role="dialog"
      aria-label={title}
      className={styles.popover}
    >
      {!compact && (
        <header className={styles.popoverHeader}>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label={`关闭${title}`}>
            <PlannerIcon name="close" />
          </button>
        </header>
      )}
      {children}
    </div>
  );
}
