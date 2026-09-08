"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { createTripLibraryFixture } from "@/features/trip-library/trip-library-data";
import {
  activeTrips,
  getTripTiming,
  selectHeroTrip,
  tripTimingLabels,
} from "@/features/trip-library/trip-timing";
import { useTripToday } from "@/features/trip-library/use-trip-today";

import styles from "../personal-center.module.css";
import { PersonalIcon } from "./personal-icon";
import { GuardedLink } from "./guarded-link";

export function PersonalHomePreview() {
  const fixture = useMemo(() => createTripLibraryFixture(), []);
  const today = useTripToday();
  const hero = selectHeroTrip(fixture.trips, today);
  const heroStatus = hero && getTripTiming(hero.startDate, hero.endDate, today);
  const previewTrips = [
    ...activeTrips(fixture.trips, today)
      .filter((trip) => trip.id !== hero?.id)
      .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    ...[...fixture.trips, ...fixture.history]
      .filter(
        (trip) =>
          getTripTiming(trip.startDate, trip.endDate, today) === "completed",
      )
      .sort((a, b) => b.endDate.localeCompare(a.endDate)),
  ].slice(0, 3);
  return (
    <div className={styles.home}>
      <div className={styles.pageHeading}>
        <h1>我的首页</h1>
        <span className={styles.mockBadge}>示例行程 · Mock</span>
      </div>
      {hero && heroStatus ? (
        <section
          aria-labelledby="next-trip-title"
          className={styles.nextTrip}
          data-home-hero={hero.id}
          data-trip-status={heroStatus}
        >
          <Image
            src={hero.cover}
            alt={`${hero.destination}旅行示例照片`}
            fill
            sizes="(max-width: 760px) 100vw, 80vw"
            preload
            className={styles.heroPhoto}
          />
          <div className={styles.heroShade} />
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>{tripTimingLabels[heroStatus]}</p>
            <h2 id="next-trip-title">
              {hero.name}
              <span>{hero.durationLabel}</span>
            </h2>
            <ul className={styles.tripMeta}>
              <li>
                <PersonalIcon name="calendar" />
                {hero.dateLabel}
              </li>
              <li>
                <PersonalIcon name="people" />
                {hero.companionCount} 人同行
              </li>
            </ul>
            <div className={styles.heroAction}>
              <GuardedLink href="/planner" className={styles.planButton}>
                继续规划
                <PersonalIcon name="arrow" width="18" />
              </GuardedLink>
              <GuardedLink
                href="/start?entry=step3"
                className={`${styles.planButton} ${styles.secondaryAction}`}
              >
                开始新旅行
              </GuardedLink>
            </div>
            <p className={styles.navigationNote}>
              继续规划将打开当前示例规划，尚未接入真实保存行程。
            </p>
          </div>
        </section>
      ) : (
        <section className={styles.homeEmpty} aria-live="polite">
          <h2>
            {today ? "暂时没有待出发或进行中的旅行" : "正在整理旅行状态…"}
          </h2>
          <GuardedLink href="/start?entry=step3" className={styles.planButton}>
            开始新旅行
          </GuardedLink>
        </section>
      )}

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
              key={trip.id}
              data-home-preview={trip.id}
              className={styles.tripCard}
              aria-label={`${trip.destination}（Mock 行程），前往我的旅行`}
            >
              <div className={styles.tripCover}>
                <Image
                  src={trip.cover}
                  alt=""
                  fill
                  sizes="(max-width: 760px) 100vw, 26vw"
                  loading="eager"
                  style={{ objectPosition: trip.coverPosition }}
                />
                <span className={styles.tripStatus}>
                  {
                    tripTimingLabels[
                      getTripTiming(trip.startDate, trip.endDate, today)!
                    ]
                  }
                </span>
              </div>
              <div className={styles.tripCardBody}>
                <div>
                  <h3>{trip.name}</h3>
                  <span>{trip.durationLabel}</span>
                </div>
                <p>
                  {trip.dateLabel}
                  <span>{trip.companionCount} 人同行</span>
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
            <Image
              src="/media/personal-center/feature-card-inspiration-bg.png"
              alt=""
              fill
              sizes="(max-width: 760px) 100vw, 28vw"
              className={styles.featureDecoration}
            />
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
            <Image
              src="/media/personal-center/feature-card-favorites-bg.png"
              alt=""
              fill
              sizes="(max-width: 760px) 100vw, 28vw"
              className={styles.featureDecoration}
            />
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
            <Image
              src="/media/personal-center/feature-card-discovery-bg.png"
              alt=""
              fill
              sizes="(max-width: 760px) 100vw, 28vw"
              className={styles.featureDecoration}
            />
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
