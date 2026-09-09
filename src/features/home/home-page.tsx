import { MainHeader } from "@/components/layout/main-header";
import { HomeAIAssistant } from "./components/home-ai-assistant";
import { HomeSkipLink } from "./components/home-skip-link";
import { HomeHero } from "./components/home-hero";
import { ImmersiveBackground } from "./components/immersive-background";
import { HomeHeaderActions } from "./components/home-header-actions";
import { InformationFooter } from "@/features/information/information-footer";
import { readHomeViewer } from "@/lib/auth/home-viewer.server";
import styles from "./home-page.module.css";

export async function HomePage() {
  const viewer = await readHomeViewer();
  return (
    <div className={styles.home}>
      <ImmersiveBackground />
      <HomeSkipLink />
      <MainHeader brandCaption="Your Journey, Always With You">
        <HomeHeaderActions viewer={viewer} />
      </MainHeader>
      <main id="home-content" tabIndex={-1} className={styles.content}>
        <HomeHero viewer={viewer} />
      </main>
      <HomeAIAssistant />
      <InformationFooter immersive />
    </div>
  );
}
