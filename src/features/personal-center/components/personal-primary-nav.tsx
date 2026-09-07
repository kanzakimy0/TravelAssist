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
        {personalNavigation.map(({ href, label, mobileLabel, icon }, index) => {
          const active =
            pathname === href ||
            (href !== "/personal-center" && pathname.startsWith(`${href}/`));
          const tooltipId = `personal-nav-tooltip-${index}`;

          return (
            <li key={href}>
              <Link
                href={href}
                className={styles.navLink}
                aria-current={active ? "page" : undefined}
                aria-describedby={tooltipId}
                data-personal-nav-item
                onNavigate={(event) => {
                  if (!requestNavigation(href, event)) onNavigate?.();
                }}
              >
                <PersonalIcon name={icon} />
                <span className={styles.navLabel}>{label}</span>
                <span className={styles.mobileNavLabel}>{mobileLabel}</span>
                <span
                  id={tooltipId}
                  role="tooltip"
                  className={styles.railTooltip}
                >
                  {label}
                </span>
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
