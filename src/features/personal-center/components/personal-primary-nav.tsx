"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { personalNavigation } from "../constants/personal-navigation";
import styles from "../personal-center.module.css";
import { usePersonalNavigationGuard } from "./navigation-guard-context";
import { PersonalIcon } from "./personal-icon";

export function PersonalPrimaryNav({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { requestNavigation } = usePersonalNavigationGuard();

  return (
    <nav aria-label="个人中心" className={styles.navigation}>
      <ul>
        {personalNavigation.map(({ href, label, icon }) => {
          const active =
            pathname === href ||
            (href !== "/personal-center" && pathname.startsWith(`${href}/`));

          return (
            <li key={href}>
              <Link
                href={href}
                className={styles.navLink}
                aria-current={active ? "page" : undefined}
                onNavigate={(event) => {
                  if (!requestNavigation(href, event)) onNavigate?.();
                }}
              >
                <PersonalIcon name={icon} />
                <span>{label}</span>
                {active ? (
                  <span className={styles.activeMarker} aria-hidden="true" />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
