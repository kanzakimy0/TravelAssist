import styles from "../personal-center.module.css";

export function PersonalPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className={styles.placeholder}>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}
