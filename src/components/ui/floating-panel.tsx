import type { HTMLAttributes } from "react";

import styles from "./floating-panel.module.css";

export type FloatingPanelProps = HTMLAttributes<HTMLDivElement>;

export function FloatingPanel({ className, ...props }: FloatingPanelProps) {
  const classes = [styles.panel, className].filter(Boolean).join(" ");

  return <div className={classes} {...props} />;
}
