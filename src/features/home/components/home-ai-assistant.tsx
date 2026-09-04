"use client";

import { useEffect, useRef, useState } from "react";

import { AIConversationPanel } from "./ai-conversation-panel";
import { AIEntryButton } from "./ai-entry-button";
import styles from "./home-ai-assistant.module.css";

const PANEL_ID = "home-ai-conversation-panel";

export function HomeAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const entryButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      hasOpenedRef.current = true;
      closeButtonRef.current?.focus();
      return;
    }

    if (hasOpenedRef.current) {
      entryButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {isOpen ? (
        <>
          <button
            aria-label="关闭 AI 助手"
            className={styles.backdrop}
            onClick={() => setIsOpen(false)}
            tabIndex={-1}
            type="button"
          />
          <AIConversationPanel
            closeButtonRef={closeButtonRef}
            id={PANEL_ID}
            onClose={() => setIsOpen(false)}
          />
        </>
      ) : null}
      <AIEntryButton
        aria-controls={PANEL_ID}
        aria-expanded={isOpen}
        aria-label={isOpen ? "AI 助手已展开" : "打开 AI 助手"}
        onClick={() => setIsOpen(true)}
        ref={entryButtonRef}
      />
    </>
  );
}
