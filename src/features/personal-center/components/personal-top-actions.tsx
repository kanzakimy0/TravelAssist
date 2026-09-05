import { mockPersonalUser } from "../constants/personal-navigation";
import styles from "../personal-center.module.css";
import { PersonalIcon } from "./personal-icon";

export function PersonalTopActions() {
  return (
    <header className={styles.topActions} aria-label="个人中心全局操作">
      <button
        type="button"
        className={styles.notification}
        disabled
        aria-label="通知（暂未开放）"
        title="通知暂未开放"
      >
        <PersonalIcon name="bell" />
      </button>
      <button
        type="button"
        className={styles.avatarTrigger}
        disabled
        aria-label={`${mockPersonalUser.name}（Mock 用户），账户菜单暂未开放`}
        title="账户菜单暂未开放"
      >
        <span className={styles.smallAvatar} aria-hidden="true">
          {mockPersonalUser.initial}
        </span>
        <PersonalIcon name="chevron" width="16" height="16" />
      </button>
    </header>
  );
}
