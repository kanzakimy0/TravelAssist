"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "../profile.module.css";

export function Dialog({
  title,
  children,
  onClose,
  large = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  large?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      if (
        previous instanceof HTMLElement &&
        previous.isConnected &&
        previous.getClientRects().length
      )
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className={`${styles.dialog} ${large ? styles.largeDialog : ""}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.dialogHeader}>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className={styles.close}
          aria-label={`关闭${title}`}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
