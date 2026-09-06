import Image from "next/image";

import type {
  CompanionGroupViewModel,
  CompanionViewModel,
} from "../companion-view-model";
import styles from "../companion-center.module.css";

export function CompanionGroupCard({
  group,
  companions,
  onEdit,
}: {
  group: CompanionGroupViewModel;
  companions: CompanionViewModel[];
  onEdit: (group: CompanionGroupViewModel, trigger: HTMLElement) => void;
}) {
  const members = group.companionIds
    .map((id) => companions.find((companion) => companion.id === id))
    .filter((companion): companion is CompanionViewModel => Boolean(companion));

  return (
    <article className={styles.groupCard}>
      <div className={styles.avatarStack} aria-hidden="true">
        {members.slice(0, 4).map((member) => (
          <span key={member.id}>
            {member.avatarUrl ? (
              <Image src={member.avatarUrl} alt="" fill sizes="44px" />
            ) : (
              member.displayName.slice(0, 1).toUpperCase()
            )}
          </span>
        ))}
      </div>
      <div className={styles.groupCopy}>
        <h3>{group.name}</h3>
        <p>{members.map((member) => member.displayName).join(" + ")}</p>
        <small>
          {members.length} 位同行人 · {group.description || "常用旅行组合"}
        </small>
      </div>
      <button
        type="button"
        onClick={(event) => onEdit(group, event.currentTarget)}
        aria-label={`编辑常用组合 ${group.name}`}
      >
        编辑组合
      </button>
    </article>
  );
}
