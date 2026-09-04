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
          <p className={styles.eyebrow}>AI ASSISTANT</p>
          <h2 className={styles.title} id={titleId}>
            想从哪里出发？
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

      <div className={styles.preview}>
        <span className={styles.status}>界面预览</span>
        <p>
          直接描述目的地、时间和同行人。AI
          服务尚未连接，本面板当前仅用于验证交互与布局。
        </p>
      </div>

      <div className={styles.composer}>
        <label className={styles.label} htmlFor={`${id}-input`}>
          旅行想法
        </label>
        <textarea
          disabled
          id={`${id}-input`}
          placeholder="例如：秋天想和家人去京都慢慢走走"
          rows={3}
        />
        <Button disabled size="medium">
          发送
        </Button>
      </div>
    </FloatingPanel>
  );
}
