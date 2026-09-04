import { StartFlowShell } from "./components/start-flow-shell";
import styles from "./start-flow.module.css";

export function StartPage() {
  return (
    <main className={styles.page}>
      <div aria-hidden="true" className={styles.backdrop} />
      <StartFlowShell />
    </main>
  );
}
