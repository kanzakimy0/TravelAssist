import type { ReactNode, RefObject } from "react";

import styles from "../start-flow.module.css";

export function SectionHeader({
  eyebrow,
  title,
  id,
  headingRef,
  children,
}: {
  eyebrow: string;
  title: string;
  id: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  children: ReactNode;
}) {
  return (
    <header className={styles.sectionHeader}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.stepTitle} id={id} ref={headingRef} tabIndex={-1}>
        {title}
      </h1>
      {children}
    </header>
  );
}
