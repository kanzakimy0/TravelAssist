import { CompactTopNav } from "./components/compact-top-nav";
import { DynamicBackgroundLayer } from "./components/dynamic-background-layer";
import { HomeAIAssistant } from "./components/home-ai-assistant";
import { HomeHero } from "./components/home-hero";
import styles from "./home-page.module.css";

export function HomePage() {
  return (
    <main className={styles.home}>
      <DynamicBackgroundLayer />
      <CompactTopNav />
      <div className={styles.content}>
        <HomeHero />
      </div>
      <HomeAIAssistant />
    </main>
  );
}
