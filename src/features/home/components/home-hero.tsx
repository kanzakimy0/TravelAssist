import Link from "next/link";

import { Button } from "@/components/ui/button";

import { HeroStartButton } from "./hero-start-button";
import styles from "./home-hero.module.css";

export function HomeHero() {
  return (
    <section aria-labelledby="home-heading" className={styles.hero}>
      <p className={styles.eyebrow}>TRAVELASSIST · 旅程规划</p>
      <h1 className={styles.title} id="home-heading">
        下一站，去哪里？
      </h1>
      <p className={styles.description}>规划行程 · 对话调整</p>
      <div className={styles.actionRow}>
        <HeroStartButton />
        <Button
          aria-label="登录（账号功能将在后续任务中接入）"
          className={styles.loginAction}
          disabled
          size="large"
          title="账号功能将在后续任务中接入"
          variant="ghost"
        >
          登录
        </Button>
        <Link className={styles.personalCenterLink} href="/personal-center">
          <span aria-hidden="true" className={styles.personalCenterAvatar}>
            旅
          </span>
          <span>个人中心</span>
        </Link>
      </div>
      <span className={styles.srOnly} id="start-flow-note">
        进入旅行需求填写流程
      </span>
    </section>
  );
}
