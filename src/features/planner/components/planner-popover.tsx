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
}: {
  id: string;
  title: string;
  trigger: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  children: ReactNode;
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
    function position() {
      if (!element || !button) return;
      const rect = button.getBoundingClientRect();
      const width = element.offsetWidth;
      const below = window.innerHeight - rect.bottom - 20;
      const above = rect.top - 20;
      const placeBelow =
        below >= Math.min(element.scrollHeight, 420) || below >= above;
      element.style.maxHeight = `${Math.max(80, placeBelow ? below : above)}px`;
      const height = element.offsetHeight;
      element.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`;
      element.style.top = `${Math.max(12, placeBelow ? rect.bottom + 8 : rect.top - height - 8)}px`;
    }
    position();
    element.querySelector<HTMLElement>("button, input")?.focus();
    function outside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !element?.contains(event.target) &&
        !button?.contains(event.target)
      )
        close.current();
    }
    function escape(event: KeyboardEvent) {
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
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
      window.removeEventListener("resize", position);
      document.removeEventListener("scroll", position, true);
      button.focus({ preventScroll: true });
    };
  }, [trigger]);
  return (
    <div
      id={id}
      ref={surface}
      role="dialog"
      aria-label={title}
      className={styles.popover}
    >
      <header className={styles.popoverHeader}>
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label={`关闭${title}`}>
          <PlannerIcon name="close" />
        </button>
      </header>
      {children}
    </div>
  );
}
