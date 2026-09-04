import { FloatingPanel } from "@/components/ui/floating-panel";

import { HeroStartButton } from "./hero-start-button";
import styles from "./home-hero.module.css";

export function HomeHero() {
  return (
    <section aria-labelledby="home-heading" className={styles.hero}>
      <FloatingPanel className={styles.panel}>
        <p className={styles.eyebrow}>AI TRAVEL PLANNER</p>
        <h1 className={styles.title} id="home-heading">
          <span>下一段旅程，</span>
          <span>从这里开始。</span>
        </h1>
        <p className={styles.description}>少一点表单，多一点真实的旅行想法。</p>
        <div className={styles.actionRow}>
          <HeroStartButton />
          <span className={styles.futureNote} id="start-flow-note">
            规划入口即将开放
          </span>
        </div>
      </FloatingPanel>
    </section>
  );
}
