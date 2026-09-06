"use client";

import { type ReactNode, useId } from "react";

import { GuardedLink } from "../components/guarded-link";
import {
  PersonalIcon,
  type PersonalIconName,
} from "../components/personal-icon";
import {
  personalStateCopy,
  type PersonalModuleStateKind,
} from "./personal-state-model";
import styles from "./personal-state.module.css";

export type PersonalSkeletonVariant =
  "overview" | "cards" | "form" | "trips" | "preferences";

export function PersonalPageSkeleton({
  variant = "overview",
}: {
  variant?: PersonalSkeletonVariant;
}) {
  return (
    <section
      className={styles.skeletonPage}
      aria-label="正在加载个人中心内容"
      aria-busy="true"
      data-skeleton-variant={variant}
    >
      <div className={styles.skeletonHeader} aria-hidden="true">
        <span className={styles.skeletonTitle} />
        <span className={styles.skeletonAction} />
      </div>
      <div className={styles.skeletonFeatureGrid} aria-hidden="true">
        <div className={styles.skeletonFeature}>
          <span className={styles.radarSkeleton} />
          <span className={styles.skeletonLineLong} />
          <span className={styles.skeletonLineShort} />
        </div>
        <div className={styles.skeletonFeature}>
          <span className={styles.formSkeleton} />
          <span className={styles.formSkeleton} />
          <span className={styles.formSkeleton} />
        </div>
      </div>
      <div className={styles.skeletonCardGrid} aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div className={styles.tripCardSkeleton} key={index}>
            <span className={styles.skeletonImage} />
            <span className={styles.skeletonLineLong} />
            <span className={styles.skeletonLineShort} />
            <span className={styles.skeletonStatus} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function PersonalEmptyState({
  icon = "trips",
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  icon?: PersonalIconName;
  title: string;
  description: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
}) {
  const titleId = useId();
  return (
    <section className={styles.emptyState} aria-labelledby={titleId}>
      <span className={styles.stateIcon} aria-hidden="true">
        <PersonalIcon name={icon} />
      </span>
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
      {primaryAction || secondaryAction ? (
        <div className={styles.stateActions}>
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </section>
  );
}

export function PersonalPageErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section
      className={styles.pageError}
      aria-labelledby="personal-page-error-title"
    >
      <span className={styles.stateIcon} aria-hidden="true">
        <PersonalIcon name="info" />
      </span>
      <h1 id="personal-page-error-title">
        {personalStateCopy.pageError.title}
      </h1>
      <p>{personalStateCopy.pageError.description}</p>
      <div className={styles.stateActions}>
        <button
          type="button"
          className={styles.primaryAction}
          onClick={onRetry}
        >
          {personalStateCopy.pageError.retry}
        </button>
        <GuardedLink className={styles.secondaryAction} href="/personal-center">
          {personalStateCopy.pageError.returnHome}
        </GuardedLink>
      </div>
    </section>
  );
}

const moduleCopy: Record<
  Exclude<PersonalModuleStateKind, "loading" | "empty" | "stale">,
  {
    title: string;
    description: string;
    action: string;
  }
> = {
  partialError: personalStateCopy.partialError,
  permissionUnavailable: personalStateCopy.permissionUnavailable,
  authExpired: personalStateCopy.authExpired,
};

export function PersonalModuleState({
  kind = "partialError",
  title,
  description,
  onRetry,
}: {
  kind?: "partialError" | "permissionUnavailable" | "authExpired";
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const copy = moduleCopy[kind];
  const actionUnavailable = kind === "authExpired" && !onRetry;
  const titleId = useId();
  return (
    <section
      className={styles.moduleState}
      aria-labelledby={titleId}
      data-module-state={kind}
    >
      <span className={styles.moduleIcon} aria-hidden="true">
        <PersonalIcon
          name={kind === "permissionUnavailable" ? "lock" : "info"}
        />
      </span>
      <div>
        <h2 id={titleId}>{title ?? copy.title}</h2>
        <p>{description ?? copy.description}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={!onRetry}
        aria-disabled={!onRetry}
        title={
          actionUnavailable ? "真实登录将在 WBS 5.3 / 8.3 接入" : undefined
        }
      >
        {copy.action}
      </button>
    </section>
  );
}

export function PersonalOfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <aside className={styles.offlineBanner} role="status" aria-live="polite">
      <PersonalIcon name="info" />
      <span>
        <strong>{personalStateCopy.offline.title}</strong>
        {personalStateCopy.offline.description}
      </span>
    </aside>
  );
}

export function PersonalActionFeedback({
  children,
  tone = "success",
}: {
  children: ReactNode;
  tone?: "success" | "info" | "warning" | "error";
}) {
  return (
    <p
      className={styles.actionFeedback}
      data-tone={tone}
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {children}
    </p>
  );
}
