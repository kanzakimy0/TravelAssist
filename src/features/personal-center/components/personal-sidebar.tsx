import Image from "next/image";
import Link from "next/link";

import { mockPersonalUser } from "../constants/personal-navigation";
import styles from "../personal-center.module.css";
import { PersonalIcon } from "./personal-icon";
import { PersonalPrimaryNav } from "./personal-primary-nav";

export function PersonalSidebar() {
  return (
    <aside className={styles.sidebar} aria-label="个人中心侧栏">
      <Link
        href="/personal-center"
        className={styles.brand}
        aria-label="TravelAssist 个人中心首页"
      >
        <span className={styles.brandMark}>
          <PersonalIcon name="compass" />
        </span>
        <span>TravelAssist</span>
      </Link>
      <Link
        href="/personal-center/account"
        className={styles.userSummary}
        aria-label={`${mockPersonalUser.name}（Mock 用户）的账户`}
      >
        <span className={styles.avatar} aria-hidden="true">
          {mockPersonalUser.initial}
        </span>
        <span className={styles.userText}>
          <strong>{mockPersonalUser.name}</strong>
          <span>{mockPersonalUser.label}</span>
        </span>
      </Link>
      <PersonalPrimaryNav />
      <div className={styles.sidebarArtworkArea} aria-hidden="true">
        <Image
          src="/media/personal-center/sidebar-torii-watercolor.svg"
          alt=""
          fill
          sizes="(min-width: 1024px) 18vw, 100vw"
          style={{ objectFit: "cover", objectPosition: "center 60%" }}
        />
      </div>
    </aside>
  );
}
