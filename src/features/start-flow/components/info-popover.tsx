import type { ReactNode } from "react";

import styles from "../start-flow.module.css";

interface InfoPopoverProps {
  children?: ReactNode;
  label?: string;
  text?: ReactNode;
}

export function InfoPopover({
  children,
  label = "查看说明",
  text,
}: InfoPopoverProps) {
  return (
    <details className={styles.infoPopover}>
      <summary aria-label={label}>?</summary>
      <div className={styles.infoPopoverContent}>{text ?? children}</div>
    </details>
  );
}
