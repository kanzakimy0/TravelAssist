import { Button } from "@/components/ui/button";
import { FloatingPanel } from "@/components/ui/floating-panel";

import styles from "./compact-top-nav.module.css";

export function CompactTopNav() {
  return (
    <header className={styles.header}>
      <FloatingPanel className={styles.nav}>
        <div className={styles.brand} aria-label="TravelAssist">
          <span aria-hidden="true" className={styles.brandMark} />
          <span>TravelAssist</span>
        </div>
        <Button
          aria-label="登录（账号功能将在后续任务中接入）"
          size="small"
          title="账号功能将在后续任务中接入"
          variant="ghost"
        >
          登录
        </Button>
      </FloatingPanel>
    </header>
  );
}
