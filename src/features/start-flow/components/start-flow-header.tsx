import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";

import styles from "../start-flow.module.css";
import { StepProgress } from "./step-progress";

interface StartFlowHeaderProps {
  currentStep: number;
}

export function StartFlowHeader({ currentStep }: StartFlowHeaderProps) {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/">
        TravelAssist
      </Link>
      <StepProgress currentStep={currentStep} />
      <ButtonLink
        aria-label="返回 TravelAssist 首页"
        className={styles.headerHomeLink}
        href="/"
        size="small"
        variant="ghost"
      >
        <span aria-hidden="true">←</span>
        <span>返回首页</span>
      </ButtonLink>
    </header>
  );
}
