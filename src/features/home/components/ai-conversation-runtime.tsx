"use client";

import { useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import type {
  AiConversationErrorCodeV1,
  AiConversationHistoryMessageV1,
} from "@/shared/contracts/ai-conversation/index";
import { readAiConversationEvents } from "../model/ai-conversation-stream";
import styles from "./ai-conversation-panel.module.css";

type VisibleMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

function safeErrorMessage(code: AiConversationErrorCodeV1 | null): string {
  if (code === "AI_PROVIDER_NOT_CONFIGURED")
    return "AI 服务尚未配置，您可以继续使用已有规划功能。";
  if (code === "AI_PROVIDER_TIMEOUT")
    return "响应时间较长，尚未完成。输入内容已保留。";
  if (code === "AI_PROVIDER_RATE_LIMITED")
    return "AI 服务当前请求较多，请稍后再试。输入内容已保留。";
  if (code?.startsWith("AI_TOOL_"))
    return "只读资料读取未能安全完成。本次没有更改任何行程。";
  return "AI 服务暂不可用。输入内容已保留，您可以稍后重试。";
}

export function AIConversationRuntime({ id }: { id: string }) {
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [history, setHistory] = useState<
    readonly AiConversationHistoryMessageV1[]
  >([]);
  const [messages, setMessages] = useState<readonly VisibleMessage[]>([]);
  const [phase, setPhase] = useState<
    "idle" | "loading" | "streaming" | "tool" | "error" | "stopped"
  >("idle");
  const [status, setStatus] = useState("可以询问日本旅行与行程规划问题。");
  const controller = useRef<AbortController | null>(null);
  const composing = useRef(false);
  const busy = phase === "loading" || phase === "streaming" || phase === "tool";

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const input = draft.trim();
    if (!input || busy) return;
    const requestHistory = history.slice(-12);
    const userId = `local-user-${Date.now()}`;
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", text: input },
    ]);
    setPhase("loading");
    setStatus("正在连接 AI 服务…");
    const abort = new AbortController();
    controller.current = abort;
    let completed = false;
    let assistantText = "";
    try {
      const response = await fetch("/api/ai/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractVersion: "1.0",
          conversationId,
          correlationId: crypto.randomUUID(),
          history: requestHistory,
          input,
        }),
        signal: abort.signal,
      });
      for await (const streamEvent of readAiConversationEvents(response)) {
        if (streamEvent.type === "turn.started") {
          setConversationId(streamEvent.conversationId);
          continue;
        }
        if (streamEvent.type === "tool.started") {
          setPhase("tool");
          setStatus(streamEvent.label);
          continue;
        }
        if (streamEvent.type === "tool.completed") {
          setPhase("loading");
          setStatus(
            streamEvent.status === "completed"
              ? "资料读取完成，正在组织回答…"
              : "部分资料不可用，正在生成可确认的回答…",
          );
          continue;
        }
        if (streamEvent.type === "text.delta") {
          setPhase("streaming");
          setStatus("正在生成回答…");
          assistantText += streamEvent.delta;
          const text = assistantText;
          setMessages((current) => {
            const index = current.findIndex(
              (message) => message.id === streamEvent.messageId,
            );
            if (index < 0)
              return [
                ...current,
                { id: streamEvent.messageId, role: "assistant", text },
              ];
            return current.map((message, messageIndex) =>
              messageIndex === index ? { ...message, text } : message,
            );
          });
          continue;
        }
        if (streamEvent.type === "turn.completed") {
          const finalText = streamEvent.message.blocks
            .filter((block) => block.type === "text")
            .map((block) => block.text)
            .join("\n");
          assistantText = finalText;
          setMessages((current) => {
            const found = current.some(
              (message) => message.id === streamEvent.message.id,
            );
            return found
              ? current.map((message) =>
                  message.id === streamEvent.message.id
                    ? { ...message, text: finalText }
                    : message,
                )
              : [
                  ...current,
                  {
                    id: streamEvent.message.id,
                    role: "assistant",
                    text: finalText,
                  },
                ];
          });
          setHistory(
            [
              ...requestHistory,
              { role: "user", text: input },
              { role: "assistant", text: finalText },
            ].slice(-12) as readonly AiConversationHistoryMessageV1[],
          );
          setDraft("");
          setPhase("idle");
          setStatus("回答已完成。本次对话只保留在当前页面内。没有修改行程。");
          completed = true;
          continue;
        }
        if (streamEvent.type === "turn.error") {
          setPhase("error");
          setStatus(safeErrorMessage(streamEvent.error.code));
          completed = true;
        }
      }
      if (!completed) throw new Error("INCOMPLETE_AI_STREAM");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setPhase("stopped");
        setStatus("已停止生成。输入内容仍保留，本次没有修改行程。");
      } else {
        setPhase("error");
        setStatus(safeErrorMessage(null));
      }
    } finally {
      controller.current = null;
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      !composing.current
    ) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <>
      <ol aria-label="AI 对话" className={styles.messages}>
        {messages.map((message) => (
          <li
            className={styles.message}
            data-role={message.role}
            key={message.id}
          >
            <span className={styles.messageRole}>
              {message.role === "user" ? "您" : "TravelAssist AI"}
            </span>
            <p>{message.text}</p>
          </li>
        ))}
      </ol>
      <form className={styles.composer} onSubmit={send}>
        <label className={styles.srOnly} htmlFor={`${id}-input`}>
          告诉 AI 您的旅行想法
        </label>
        <textarea
          disabled={busy}
          id={`${id}-input`}
          maxLength={16_000}
          onChange={(event) => setDraft(event.target.value)}
          onCompositionEnd={() => {
            composing.current = false;
          }}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onKeyDown={onKeyDown}
          placeholder="例如：秋天想去京都慢慢走走……"
          rows={4}
          value={draft}
        />
        {busy ? (
          <Button
            aria-label="停止生成"
            onClick={() => controller.current?.abort()}
            size="medium"
            type="button"
            variant="secondary"
          >
            停止
          </Button>
        ) : (
          <Button
            aria-label="发送给 AI"
            disabled={draft.trim().length === 0}
            size="medium"
            type="submit"
          >
            发送
          </Button>
        )}
      </form>
      <p
        aria-live={phase === "error" ? "assertive" : "polite"}
        className={styles.status}
        data-ai-status={phase}
        role="status"
      >
        {status}
      </p>
    </>
  );
}
