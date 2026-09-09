import { ButtonLink } from "@/components/ui/button";

import styles from "./home-hero.module.css";

export function HeroStartButton() {
  return (
    <ButtonLink
      className={styles.startButton}
      aria-describedby="start-flow-note"
      href="/start"
      size="large"
    >
      <span>让我们开始吧</span>
      <span aria-hidden="true">→</span>
    </ButtonLink>
  );
}
