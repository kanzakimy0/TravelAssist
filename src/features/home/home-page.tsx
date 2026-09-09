import { MainHeader } from "@/components/layout/main-header";
import { HomeAIAssistant } from "./components/home-ai-assistant";
import { HomeSkipLink } from "./components/home-skip-link";
import { HomeHero } from "./components/home-hero";
import { ImmersiveBackground } from "./components/immersive-background";
import styles from "./home-page.module.css";

export function HomePage() {
  return (
    <div className={styles.home}>
      <ImmersiveBackground />
      <HomeSkipLink />
      <MainHeader />
      <main id="home-content" tabIndex={-1} className={styles.content}>
        <HomeHero />
      </main>
      <HomeAIAssistant />
    </div>
  );
}
