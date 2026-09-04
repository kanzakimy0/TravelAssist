import type { Ref } from "react";

import { Button, ButtonLink } from "@/components/ui/button";

import styles from "../start-flow.module.css";

interface ReadyStateProps {
  headingRef: Ref<HTMLHeadingElement>;
  onReturnToReview: () => void;
}

export function ReadyState({ headingRef, onReturnToReview }: ReadyStateProps) {
  return (
    <section aria-labelledby="ready-heading" className={styles.readyState}>
      <span aria-hidden="true" className={styles.readyIcon}>
        ✓
      </span>
      <p className={styles.eyebrow}>READY</p>
      <h1
        className={styles.stepTitle}
        id="ready-heading"
        ref={headingRef}
        tabIndex={-1}
      >
        需求信息已经准备好了
      </h1>
      <p className={styles.readyDescription}>
        下一阶段会根据这些条件生成行程方案。当前不会生成虚构行程或保存数据。
      </p>
      <div className={styles.readyActions}>
        <Button onClick={onReturnToReview} variant="secondary">
          返回修改
        </Button>
        <ButtonLink href="/" variant="ghost">
          返回首页
        </ButtonLink>
      </div>
    </section>
  );
}
