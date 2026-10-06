import type { ReactNode } from "react";
import styles from "./state-notice.module.css";

export interface StateNoticeProps {
  kind: "loading" | "empty" | "error" | "degraded" | "info";
  title: string;
  description?: string;
  children?: ReactNode;
  compact?: boolean;
  announcement?: "polite" | "assertive" | "off";
  className?: string;
}

/** Presentation only. Callers supply safe copy and an existing recovery action. */
export function StateNotice({
  kind,
  title,
  description,
  children,
  compact = false,
  announcement = "polite",
  className,
}: StateNoticeProps) {
  return (
    <div
      className={[styles.notice, compact ? styles.compact : "", className]
        .filter(Boolean)
        .join(" ")}
      data-state-kind={kind}
    >
      <div
        className={styles.copy}
        role={
          announcement === "off"
            ? undefined
            : announcement === "assertive"
              ? "alert"
              : "status"
        }
        aria-atomic={announcement === "off" ? undefined : true}
      >
        <strong className={styles.title}>{title}</strong>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {children && (
        <div
          className={styles.content}
          aria-busy={kind === "loading" || undefined}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** Static structural placeholders; never progress, content, controls or live text. */
export function StateSkeleton({ rows = 3 }: { rows?: 1 | 2 | 3 }) {
  return (
    <div className={styles.skeleton} aria-hidden="true" data-state-skeleton>
      {Array.from({ length: rows }, (_, index) => (
        <div className={styles.skeletonRow} key={index}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
