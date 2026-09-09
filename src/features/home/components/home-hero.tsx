import Link from "next/link";
import type { HomeViewer } from "@/lib/auth/home-viewer";
import { HomeAccountLink } from "./home-account-link";
import { HeroStartButton } from "./hero-start-button";
import styles from "./home-hero.module.css";

export function HomeHero({ viewer = null }: { viewer?: HomeViewer | null }) {
  return (
    <section aria-labelledby="home-heading" className={styles.hero}>
      <p lang="ja" className={styles.eyebrow}>
        まだ見ぬ景色が、きっと待ってる
      </p>
      <h1 className={styles.title} id="home-heading">
        下一站，去哪里？
      </h1>
      <p className={styles.description}>规划行程 · 对话调整</p>
      <p className={styles.invitation}>让 AI 陪你发现更美好的旅程</p>
      <div className={styles.actionRow}>
        <HeroStartButton />
        <div className={styles.accountEntry}>
          <HomeAccountLink viewer={viewer} compact />
          {!viewer ? (
            <Link className={styles.loginAction} href="/login?returnTo=%2F">
              登录
            </Link>
          ) : null}
        </div>
      </div>
      <span className={styles.srOnly} id="start-flow-note">
        进入旅行需求填写流程
      </span>
    </section>
  );
}
