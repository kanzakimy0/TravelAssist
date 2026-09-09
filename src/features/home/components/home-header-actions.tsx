import { LanguageAction } from "@/components/layout/main-header";
import type { HomeViewer } from "../home-viewer";
import { HomeHelp } from "./home-help";
import { HomeAccountLink } from "./home-account-link";
import styles from "./home-header-actions.module.css";

export function HomeHeaderActions({ viewer }: { viewer: HomeViewer | null }) {
  return (
    <div className={styles.actions}>
      <HomeHelp />
      <LanguageAction />
      {viewer ? <HomeAccountLink viewer={viewer} /> : null}
    </div>
  );
}
