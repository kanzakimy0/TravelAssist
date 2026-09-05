import type { ReactNode } from "react";

import styles from "../start-flow.module.css";

/** Shared breathing room between the heading, controls and footer. */
export function WizardStepBody({ children }: { children: ReactNode }) {
  return (
    <div className={styles.stepBody} data-wizard-body>
      {children}
    </div>
  );
}
