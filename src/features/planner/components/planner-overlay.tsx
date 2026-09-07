import { useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import styles from "../planner.module.css";
import { PlannerIcon } from "./planner-icon";

export function PlannerOverlay({
  title,
  kind,
  onClose,
  children,
  anchor,
  className,
}: {
  title: string;
  kind: "right" | "bottom" | "quick" | "detail" | "settings";
  onClose: () => void;
  children: ReactNode;
  anchor?: RefObject<HTMLButtonElement | null>;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    if (!anchor) return;
    function position() {
      const element = dialog.current,
        button = anchor?.current;
      if (!element || !button) return;
      const rect = button.getBoundingClientRect();
      const width = Math.min(760, window.innerWidth - 24);
      const height = Math.min(640, window.innerHeight - 96);
      const left =
        rect.left - width - 12 >= 12
          ? rect.left - width - 12
          : Math.max(
              12,
              Math.min(rect.right - width, window.innerWidth - width - 12),
            );
      Object.assign(element.style, {
        width: `${width}px`,
        height: `${height}px`,
        left: `${left}px`,
        top: `${Math.max(72, Math.min(rect.top, window.innerHeight - height - 12))}px`,
        right: "auto",
        bottom: "auto",
        margin: "0",
      });
    }
    position();
    window.addEventListener("resize", position);
    return () => window.removeEventListener("resize", position);
  }, [anchor]);
  useEffect(() => {
    const element = dialog.current;
    const previous =
      document.activeElement instanceof HTMLElement ||
      document.activeElement instanceof SVGElement
        ? document.activeElement
        : null;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={[styles.overlay, className].filter(Boolean).join(" ")}
      data-kind={kind}
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        event.stopPropagation();
        const focusable = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = focusable[0],
          last = focusable.at(-1);
        if (!first || !last) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <header className={styles.overlayHeader}>
        <h2>{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={`关闭${title}`}
          autoFocus
        >
          <PlannerIcon name="close" />
        </button>
      </header>
      {children}
    </dialog>
  );
}
