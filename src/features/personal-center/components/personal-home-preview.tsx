import Image from "next/image";
import Link from "next/link";

import styles from "../personal-center.module.css";
import { PersonalIcon } from "./personal-icon";

// Static presentation fixtures only, not a Trip model or saved user data.
const previewTrips = [
  {
    destination: "京都",
    duration: "3天2晚",
    date: "2026.10.16 — 10.18",
    status: "即将到来",
    cover: "/media/personal-center/trip-kyoto-gion.webp",
    position: "60% 50%",
  },
  {
    destination: "大阪",
    duration: "2天1晚",
    date: "日期待定",
    status: "规划中",
    cover: "/media/personal-center/trip-osaka-castle.webp",
    position: "65% 45%",
  },
  {
    destination: "北海道",
    duration: "2天1晚",
    date: "2026.08.15 — 08.16",
    status: "已完成",
    cover: "/media/personal-center/trip-hokkaido-winter.webp",
    position: "50% 55%",
  },
] as const;

const heroCover = "/media/personal-center/hero-kyoto-sakura.webp";

export function PersonalHomePreview() {
  return (
    <div className={styles.home}>
      <div className={styles.pageHeading}>
        <h1>我的首页</h1>
        <span className={styles.mockBadge}>示例行程 · Mock</span>
      </div>
      <section aria-labelledby="next-trip-title" className={styles.nextTrip}>
        <Image
          src={heroCover}
          alt="京都樱花街巷与八坂塔的旅行示例照片"
          fill
          sizes="(max-width: 760px) 100vw, 80vw"
          preload
          className={styles.heroPhoto}
        />
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>下一次旅行</p>
          <h2 id="next-trip-title">
            京都<span>3天2晚</span>
          </h2>
          <ul className={styles.tripMeta}>
            <li>
              <PersonalIcon name="calendar" />
              2026.10.16 — 10.18
            </li>
            <li>
              <PersonalIcon name="people" />2 人同行
            </li>
            <li>
              <PersonalIcon name="train" />
              电车 · 慢旅行
            </li>
          </ul>
          <div className={styles.heroAction}>
            <button type="button" disabled className={styles.planButton}>
              继续规划
              <PersonalIcon name="arrow" width="18" />
            </button>
            <span>即将开放</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="my-trips-title">
        <div className={styles.sectionHeading}>
          <h2 id="my-trips-title">我的旅行</h2>
          <Link href="/personal-center/trips" className={styles.textLink}>
            查看全部
            <PersonalIcon name="arrow" width="18" />
          </Link>
        </div>
        <div className={styles.tripGrid}>
          {previewTrips.map((trip) => (
            <Link
              href="/personal-center/trips"
              key={trip.destination}
              className={styles.tripCard}
              aria-label={`${trip.destination}（Mock 行程），前往我的旅行`}
            >
              <div className={styles.tripCover}>
                <Image
                  src={trip.cover}
                  alt=""
                  fill
                  sizes="(max-width: 760px) 100vw, 26vw"
                  style={{ objectPosition: trip.position }}
                />
                <span className={styles.tripStatus}>{trip.status}</span>
              </div>
              <div className={styles.tripCardBody}>
                <div>
                  <h3>{trip.destination}</h3>
                  <span>{trip.duration}</span>
                </div>
                <p>
                  {trip.date}
                  <span>2 人同行</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="more-features-title">
        <div className={styles.sectionHeading}>
          <h2 id="more-features-title">更多功能模块</h2>
        </div>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>
              <PersonalIcon name="compass" />
            </span>
            <div>
              <h3>旅行灵感</h3>
              <p>为你推荐目的地与玩法</p>
              <span className={styles.comingSoon}>即将开放</span>
            </div>
          </div>
          <Link href="/personal-center/trips" className={styles.featureCard}>
            <span className={styles.featureIcon}>
              <PersonalIcon name="heart" />
            </span>
            <div>
              <h3>我的收藏</h3>
              <p>在我的旅行中管理喜欢的旅程</p>
            </div>
            <PersonalIcon name="arrow" width="18" />
          </Link>
          <div className={styles.featureCard}>
            <span className={styles.featureIcon}>
              <PersonalIcon name="pin" />
            </span>
            <div>
              <h3>目的地探索</h3>
              <p>发现更多精彩旅程</p>
              <span className={styles.comingSoon}>即将开放</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
