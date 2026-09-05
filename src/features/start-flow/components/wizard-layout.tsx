import type { ReactNode } from "react";

import { FloatingPanel } from "@/components/ui/floating-panel";

import styles from "../start-flow.module.css";
import { StartFlowHeader } from "./start-flow-header";
import { StepProgress } from "./step-progress";

/** Every wizard view shares one viewport-sized stage and content baseline. */
export function WizardLayout({
  children,
  currentStep,
}: {
  children: ReactNode;
  currentStep: number;
}) {
  return (
    <div className={styles.flowLayout}>
      <StartFlowHeader />
      <FloatingPanel className={styles.flowPanel} data-wizard-panel>
        <StepProgress currentStep={currentStep} />
        <div className={styles.wizardContent} data-wizard-content>
          {children}
        </div>
      </FloatingPanel>
      <p className={styles.privacyNote}>
        草稿仅保存在当前浏览器，可随时返回继续填写。
      </p>
    </div>
  );
}
