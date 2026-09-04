import type { Ref } from "react";

import { Button } from "@/components/ui/button";
import { FloatingPanel } from "@/components/ui/floating-panel";

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
            你好，想去哪里？
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

      <div className={styles.composer}>
        <label className={styles.srOnly} htmlFor={`${id}-input`}>
          告诉 AI 你的旅行想法
        </label>
        <textarea
          id={`${id}-input`}
          placeholder="例如：秋天想去京都慢慢走走……"
          rows={4}
        />
        <Button aria-label="发送（AI 服务尚未接入）" disabled size="medium">
          发送
        </Button>
      </div>
      <p className={styles.note}>AI 服务将在后续接入</p>
    </FloatingPanel>
  );
}
