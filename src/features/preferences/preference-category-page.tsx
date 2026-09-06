import Image from "next/image";
import Link from "next/link";

import {
  createDefaultPreferenceState,
  getCategory,
  type CategoryKey,
} from "./preference-model";
import { PreferenceIcon } from "./preference-icon";
import styles from "./preference-center.module.css";

const advancedSummary = "行程节奏、无障碍与其他低频长期偏好";

export function PreferenceCategoryPage({
  categoryKey,
}: {
  categoryKey: CategoryKey | "advanced";
}) {
  const category = getCategory(createDefaultPreferenceState(), categoryKey);
  const title = category?.title ?? "更多详细设置";
  const summary = category?.summary ?? advancedSummary;

  return (
    <div className={styles.preferencePage}>
      <header className={styles.pageHeader}>
        <div>
          <p>PREFERENCE DETAILS</p>
          <h1>{title}</h1>
          <span>长期旅行偏好的稳定导航目标</span>
        </div>
        <Link
          href="/personal-center/preferences"
          className={styles.secondaryButton}
        >
          <PreferenceIcon name="back" />
          返回旅行偏好
        </Link>
      </header>

      <section className={styles.detailCard}>
        {category ? (
          <div className={styles.detailArtwork} aria-hidden="true">
            <Image src={category.image} alt="" fill sizes="360px" priority />
          </div>
        ) : (
          <div className={styles.advancedArtwork} aria-hidden="true">
            <PreferenceIcon name="settings" />
          </div>
        )}
        <div className={styles.detailCopy}>
          <span>当前摘要</span>
          <h2>{summary}</h2>
          <p>
            详细编辑将在后续对应 WBS
            中开放。此页面当前只展示长期偏好摘要，不会连接
            API、数据库或覆盖具体旅行中的临时设置。
          </p>
          <div className={styles.detailNotice}>
            <strong>长期偏好与本次旅行分开</strong>
            <span>
              Planner 中针对某次旅行的临时调整不会永久改变这里的长期默认值。
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
