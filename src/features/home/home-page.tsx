import { MainHeader } from "@/components/layout/main-header";
import { HomeAIAssistant } from "./components/home-ai-assistant";
import { HomeHero } from "./components/home-hero";
import { ImmersiveBackground } from "./components/immersive-background";
import styles from "./home-page.module.css";

export function HomePage() {
  return (
    <div className={styles.home}>
      <ImmersiveBackground />
      <a href="#home-content" className="main-skip-link">
        跳到主要内容
      </a>
      <MainHeader />
      <main id="home-content" tabIndex={-1} className={styles.content}>
        <HomeHero />
      </main>
      <HomeAIAssistant />
    </div>
  );
}
