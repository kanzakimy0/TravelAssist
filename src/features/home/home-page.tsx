import { CompactHeader } from "./components/compact-header";
import { HomeAIAssistant } from "./components/home-ai-assistant";
import { HomeHero } from "./components/home-hero";
import { ImmersiveBackground } from "./components/immersive-background";
import styles from "./home-page.module.css";

export function HomePage() {
  return (
    <main className={styles.home}>
      <ImmersiveBackground />
      <CompactHeader />
      <div className={styles.content}>
        <HomeHero />
      </div>
      <HomeAIAssistant />
    </main>
  );
}
