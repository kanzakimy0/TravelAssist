import Link from "next/link";
import styles from "../profile.module.css";
export const accountEntries = [
  {
    slug: "security",
    title: "登录与安全",
    description: "密码、手机、邮箱、登录方式与账户安全",
    icon: "◇",
  },
  {
    slug: "privacy",
    title: "数据与隐私",
    description: "个人数据、导出与账户相关管理",
    icon: "▤",
  },
  {
    slug: "booking-sync",
    title: "预订与账户同步",
    description: "Booking、确认邮件与外部预订同步",
    icon: "⇄",
  },
];
export function AccountEntries() {
  return (
    <nav className={styles.entries} aria-label="账户管理">
      {accountEntries.map((entry) => (
        <Link
          key={entry.slug}
          href={`/personal-center/account/${entry.slug}`}
          className={styles.entry}
        >
          <span className={styles.entryIcon} aria-hidden="true">
            {entry.icon}
          </span>
          <div>
            <h2>{entry.title}</h2>
            <p>{entry.description}</p>
          </div>
          <span aria-hidden="true">→</span>
        </Link>
      ))}
    </nav>
  );
}
export function AccountSubpage({ slug }: { slug: string }) {
  const entry = accountEntries.find((item) => item.slug === slug)!;
  return (
    <div className={styles.profile}>
      <nav className={styles.breadcrumb} aria-label="面包屑">
        <Link href="/personal-center/account">账户</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{entry.title}</span>
      </nav>
      <header className={styles.pageHeader}>
        <h1>{entry.title}</h1>
        <p>{entry.description}</p>
      </header>
      <section className={styles.card}>
        <h2>此功能尚未开放</h2>
        <p className={styles.muted}>您可以先返回账户管理个人资料与基本设置。</p>
        <Link className={styles.textButton} href="/personal-center/account">
          ← 返回账户
        </Link>
      </section>
    </div>
  );
}
