"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import styles from "../start-flow.module.css";

interface ModalProps {
  children: ReactNode;
  description?: string;
  onClose: () => void;
  title: string;
  wide?: boolean;
}

export function Modal({
  children,
  description,
  onClose,
  title,
  wide = false,
}: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const page = document.querySelector("main");
    const previousInert = page?.inert ?? false;
    if (page) page.inert = true;
    closeButtonRef.current?.focus();
    return () => {
      if (page) page.inert = previousInert;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div
      className={`${styles.overlayTheme} ${styles.modalBackdrop}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        ref={dialogRef}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
          if (event.key === "Tab") {
            const controls = Array.from(
              dialogRef.current?.querySelectorAll<HTMLElement>(
                "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex='0']",
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
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.modal}
        data-wide={wide}
        role="dialog"
      >
        <header className={styles.modalHeader}>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button
            aria-label={`关闭${title}`}
            className={styles.modalClose}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            ×
          </button>
        </header>
        <div className={styles.modalBody}>{children}</div>
      </section>
    </div>,
    document.body,
  );
}
