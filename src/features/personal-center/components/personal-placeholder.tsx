import styles from "../personal-center.module.css";
import { GuardedLink } from "./guarded-link";

export function PersonalPlaceholder({
  title,
  description,
  actions = [],
}: {
  title: string;
  description: string;
  actions?: { href: string; label: string }[];
}) {
  return (
    <section className={styles.placeholder}>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions.length > 0 && (
        <div className={styles.heroAction}>
          {actions.map((action, index) => (
            <GuardedLink
              key={action.href}
              href={action.href}
              className={`${styles.planButton} ${index > 0 ? styles.secondaryAction : ""}`}
            >
              {action.label}
            </GuardedLink>
          ))}
        </div>
      )}
    </section>
  );
}
