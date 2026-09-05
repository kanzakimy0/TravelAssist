"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";

import theme from "../start-flow.module.css";
import styles from "../themed-popover.module.css";

export function ThemedPopover({
  label,
  value,
  children,
  role = "dialog",
}: {
  label: string;
  value: string;
  children: (close: () => void) => ReactNode;
  role?: "dialog" | "listbox";
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  return (
    <div className={styles.field}>
      <span>{label}</span>
      <button
        ref={triggerRef}
        aria-label={`${label}，${value}`}
        aria-haspopup={role}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        className={styles.fieldButton}
        onClick={() => setOpen(!open)}
        type="button"
      >
        {value}
        <span aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <PopoverSurface
          id={id}
          label={label}
          onClose={() => setOpen(false)}
          role={role}
          triggerRef={triggerRef}
        >
          {children(() => setOpen(false))}
        </PopoverSurface>
      ) : null}
    </div>
  );
}

function PopoverSurface({
  id,
  label,
  role,
  triggerRef,
  onClose,
  children,
}: {
  id: string;
  label: string;
  role: "dialog" | "listbox";
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const close = useEffectEvent(onClose);

  useLayoutEffect(() => {
    function position() {
      const surface = surfaceRef.current;
      const trigger = triggerRef.current;
      if (!surface || !trigger) return;
      const rect = trigger.getBoundingClientRect();
      const height = surface.offsetHeight;
      const width = surface.offsetWidth;
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const top =
        rect.bottom + 8 + height <= viewportHeight - 12
          ? rect.bottom + 8
          : Math.max(12, rect.top - height - 8);
      surface.style.top = `${top}px`;
      surface.style.left = `${Math.max(12, Math.min(rect.left, viewportWidth - width - 12))}px`;
    }
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [triggerRef]);

  useEffect(() => {
    const trigger = triggerRef.current;
    const surface = surfaceRef.current;
    (
      surface?.querySelector<HTMLElement>("[data-autofocus='true']") ??
      surface?.querySelector<HTMLElement>("button:not(:disabled)")
    )?.focus({ preventScroll: true });
    function outside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !surface?.contains(event.target) &&
        !trigger?.contains(event.target)
      )
        close();
    }
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      trigger?.focus({ preventScroll: true });
    };
  }, [triggerRef]);

  return createPortal(
    <div
      ref={surfaceRef}
      id={id}
      role={role}
      aria-label={label}
      className={`${theme.overlayTheme} ${styles.surface}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
        if (event.key === "Tab") {
          const controls = Array.from(
            surfaceRef.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled):not([tabindex='-1'])",
            ) ?? [],
          );
          const first = controls[0];
          const last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          }
          if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
