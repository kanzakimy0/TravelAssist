import { StartFlowShell } from "./components/start-flow-shell";
import styles from "./start-flow.module.css";
import type { StartEntry } from "@/features/navigation/main-flow-navigation";

export function StartPage({ entry = null }: { entry?: StartEntry }) {
  return (
    <main className={styles.page}>
      <div aria-hidden="true" className={styles.backdrop} />
      <StartFlowShell entry={entry} />
    </main>
  );
}
