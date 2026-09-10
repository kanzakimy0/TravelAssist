import type { HomeViewer } from "@/lib/auth/home-viewer";
import { StartFlowShell } from "./components/start-flow-shell";
import styles from "./start-flow.module.css";
import type { StartEntry } from "@/features/navigation/main-flow-navigation";

export function StartPage({
  entry = null,
  viewer = null,
}: {
  entry?: StartEntry;
  viewer?: HomeViewer | null;
}) {
  return (
    <div className={styles.page}>
      <a href="#start-content" className="main-skip-link">
        跳到旅行需求
      </a>
      <div aria-hidden="true" className={styles.backdrop} />
      <StartFlowShell entry={entry} viewer={viewer} />
    </div>
  );
}
