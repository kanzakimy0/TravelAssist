"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

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
  const titleId = `modal-${title.replace(/\s/g, "-")}`;

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
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
    </div>
  );
}
