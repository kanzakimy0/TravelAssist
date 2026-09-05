import type { ReactNode } from "react";

import styles from "../personal-center.module.css";
import { PersonalSidebar } from "./personal-sidebar";
import { PersonalTopActions } from "./personal-top-actions";

export function PersonalCenterShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <a href="#personal-content" className={styles.skipLink}>
        跳到主要内容
      </a>
      <PersonalSidebar />
      <div className={styles.main}>
        <PersonalTopActions />
        <main
          id="personal-content"
          tabIndex={-1}
          className={styles.contentArea}
        >
          <div className={styles.contentInner}>{children}</div>
        </main>
      </div>
    </div>
  );
}
