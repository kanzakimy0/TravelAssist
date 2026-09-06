import Image from "next/image";

import {
  ageGroupLabel,
  calculateCurrentAge,
  companionSummaryTags,
  type CompanionViewModel,
} from "../companion-view-model";
import styles from "../companion-center.module.css";

type CompanionCardProps = {
  companion: CompanionViewModel;
  onEdit: (companion: CompanionViewModel, trigger: HTMLElement) => void;
  onDelete: (companion: CompanionViewModel, trigger: HTMLElement) => void;
  onAddToGroup: (companion: CompanionViewModel, trigger: HTMLElement) => void;
};

export function CompanionCard({
  companion,
  onEdit,
  onDelete,
  onAddToGroup,
}: CompanionCardProps) {
  const age = calculateCurrentAge(companion.dateOfBirth);
  const tags = companionSummaryTags(companion);
  const initial = companion.displayName.slice(0, 1).toUpperCase();

  return (
    <article
      className={styles.companionCard}
      data-self={companion.isSelf || undefined}
    >
      <div className={styles.cardTopline}>
        <div className={styles.cardAvatar} aria-hidden="true">
          {companion.avatarUrl ? (
            <Image src={companion.avatarUrl} alt="" fill sizes="80px" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className={styles.identityCopy}>
          <div className={styles.nameLine}>
            <h3>
              {companion.displayName}
              {age !== null ? <small> · {age}岁</small> : null}
            </h3>
            {companion.isSelf ? (
              <span className={styles.selfBadge}>本人</span>
            ) : null}
          </div>
          <p>
            {companion.relationship || "同行人"} ·{" "}
            {ageGroupLabel(companion.ageGroup)}
          </p>
        </div>
      </div>

      <div
        className={styles.tagList}
        aria-label={`${companion.displayName} 的旅行标签`}
      >
        {tags.visible.length ? (
          tags.visible.map((tag) => <span key={tag}>{tag}</span>)
        ) : (
          <span className={styles.mutedTag}>尚未设置旅行标签</span>
        )}
        {tags.overflow > 0 ? (
          <span aria-label={`还有 ${tags.overflow} 个标签`}>
            +{tags.overflow}
          </span>
        ) : null}
      </div>

      <div className={styles.cardActions}>
        <button
          type="button"
          onClick={(event) => onEdit(companion, event.currentTarget)}
          aria-label={`编辑 ${companion.displayName} 的同行人资料`}
        >
          编辑资料
        </button>
        <button
          type="button"
          onClick={(event) => onAddToGroup(companion, event.currentTarget)}
          aria-label={`将 ${companion.displayName} 加入常用组合`}
        >
          加入组合
        </button>
        {!companion.isSelf ? (
          <button
            type="button"
            className={styles.deleteTextButton}
            onClick={(event) => onDelete(companion, event.currentTarget)}
            aria-label={`删除同行人 ${companion.displayName}`}
          >
            删除同行人
          </button>
        ) : null}
      </div>
    </article>
  );
}
