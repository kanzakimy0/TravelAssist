import Link from "next/link";
import { informationLinks } from "./information-content";
import styles from "./information.module.css";

export function InformationFooter({
  immersive = false,
}: {
  immersive?: boolean;
}) {
  return (
    <footer className={immersive ? styles.immersiveFooter : styles.footer}>
      <small>© 2026 TravelAssist</small>
      <nav aria-label="网站信息">
        {informationLinks.map((link) => (
          <Link key={link.href} href={link.href} aria-label={link.label}>
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
