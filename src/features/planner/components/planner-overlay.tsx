import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import styles from "../planner.module.css";
import { PlannerIcon } from "./planner-icon";

export function PlannerOverlay({
  title,
  kind,
  onClose,
  children,
}: {
  title: string;
  kind: "right" | "bottom";
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous =
      document.activeElement instanceof HTMLElement
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
      className={styles.overlay}
      data-kind={kind}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
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
