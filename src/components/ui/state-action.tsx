"use client";

import { useRef, useState } from "react";
import type { ButtonProps } from "./button";
import { Button } from "./button";
import styles from "./state-notice.module.css";

type StateActionProps = Omit<ButtonProps, "onClick"> & {
  onAction: () => void | Promise<unknown>;
  pending?: boolean;
  pendingLabel?: string;
};

/** Keep the focused action mounted; the handler is guarded as well as styled. */
export function StateAction({
  onAction,
  pending = false,
  pendingLabel = "正在重试…",
  disabled,
  children,
  className,
  ...props
}: StateActionProps) {
  const active = useRef(false);
  const [running, setRunning] = useState(false);
  const busy = pending || running;
  return (
    <Button
      {...props}
      variant="secondary"
      className={[styles.action, className].filter(Boolean).join(" ")}
      aria-disabled={disabled || busy || undefined}
      onClick={async () => {
        if (disabled || pending || active.current) return;
        active.current = true;
        setRunning(true);
        try {
          await onAction();
        } finally {
          active.current = false;
          setRunning(false);
        }
      }}
    >
      {busy ? pendingLabel : children}
    </Button>
  );
}
