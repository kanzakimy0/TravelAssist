import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

import styles from "./ai-entry-button.module.css";

export type AIEntryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const AIEntryButton = forwardRef<HTMLButtonElement, AIEntryButtonProps>(
  function AIEntryButton({ className, type = "button", ...props }, ref) {
    const classes = [styles.button, className].filter(Boolean).join(" ");

    return (
      <button className={classes} ref={ref} type={type} {...props}>
        <span aria-hidden="true" className={styles.icon}>
          <svg focusable="false" viewBox="0 0 32 32">
            <path d="M8 17c3-7 13-7 16 0-3 7-13 7-16 0Z" />
            <circle cx="16" cy="17" r="2.5" />
            <path d="M16 4v4M5 9l3 3M27 9l-3 3" />
          </svg>
        </span>
        <span className={styles.copy}>
          <strong>问问 AI</strong>
        </span>
      </button>
    );
  },
);
