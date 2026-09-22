import type { Ref } from "react";

import { Button } from "@/components/ui/button";
import { FloatingPanel } from "@/components/ui/floating-panel";
import { AIConversationRuntime } from "./ai-conversation-runtime";

import styles from "./ai-conversation-panel.module.css";

interface AIConversationPanelProps {
  closeButtonRef: Ref<HTMLButtonElement>;
  id: string;
  onClose: () => void;
}

export function AIConversationPanel({
  closeButtonRef,
  id,
  onClose,
}: AIConversationPanelProps) {
  const titleId = `${id}-title`;

  return (
    <FloatingPanel
      aria-labelledby={titleId}
      className={styles.panel}
      id={id}
      role="region"
    >
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>TRAVELASSIST AI</p>
          <h2 className={styles.title} id={titleId}>
            您好，想去哪里？
          </h2>
        </div>
        <Button
          aria-label="关闭 AI 助手"
          className={styles.closeButton}
          onClick={onClose}
          ref={closeButtonRef}
          size="small"
          variant="ghost"
        >
          <span aria-hidden="true">×</span>
        </Button>
      </div>

      <AIConversationRuntime id={id} />
    </FloatingPanel>
  );
}
