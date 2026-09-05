import { GuardedLink } from "@/features/personal-center/components/guarded-link";
import { PersonalIcon } from "@/features/personal-center/components/personal-icon";

import styles from "./profile-account.module.css";

export function AccountSubpage({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.accountPage}>
      <header className={styles.pageHeader}>
        <div>
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <span>{description}</span>
        </div>
      </header>
      <section className={styles.card}>
        <div className={styles.emptyContact}>
          <span className={styles.emptyContactIcon} aria-hidden="true">
            <PersonalIcon name="lock" />
          </span>
          <div>
            <strong>此入口已预留</strong>
            <p>
              真实账户与安全业务不属于本 Task，当前不会连接 Auth、API 或数据库。
            </p>
          </div>
        </div>
        <GuardedLink
          href="/personal-center/account"
          className={styles.secondaryButton}
        >
          <PersonalIcon name="arrow" />
          返回账户
        </GuardedLink>
      </section>
    </div>
  );
}
