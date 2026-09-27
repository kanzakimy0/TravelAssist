"use client";

import { useRouter } from "next/navigation";
import { GuardedLink } from "../components/guarded-link";
import { PersonalEmptyState } from "../states/personal-states";
import type {
  PersonalAiHistoryDetailV1,
  PersonalAiHistoryListItemV1,
} from "./projection";
import type { HistoryReadResult } from "./reader";
import styles from "./history.module.css";

function HistoryTime({ value }: { value: string | null }) {
  if (!value) return <span>时间未知</span>;
  return <time dateTime={value}>{value}</time>;
}

function HistoryState({
  status,
}: {
  status: "empty" | "unavailable" | "error";
}) {
  const router = useRouter();
  if (status === "error") {
    return (
      <section
        className={styles.state}
        aria-labelledby="ai-history-error-title"
      >
        <h2 id="ai-history-error-title">暂时无法读取 AI 历史</h2>
        <p>请稍后重试。您的其他个人中心内容不受影响。</p>
        <div className={styles.actions}>
          <button type="button" onClick={() => router.refresh()}>
            重新加载
          </button>
          <GuardedLink href="/personal-center">返回个人中心</GuardedLink>
        </div>
      </section>
    );
  }
  return (
    <PersonalEmptyState
      icon="info"
      title={
        status === "unavailable"
          ? "AI 历史尚未连接"
          : "还没有可显示的 AI 对话记录"
      }
      description={
        status === "unavailable"
          ? "个人中心的历史记录会在会话存储接入后显示。"
          : "已保存的 AI 对话会显示在这里。"
      }
      primaryAction={
        <GuardedLink className={styles.homeLink} href="/personal-center">
          返回个人中心
        </GuardedLink>
      }
    />
  );
}

export function HistoryList({
  result,
}: {
  result: HistoryReadResult<PersonalAiHistoryListItemV1[]>;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>AI 助手历史</h1>
        <p>
          这里只显示已保存的可见对话内容。会话存储接入前，没有可读取的历史记录。
        </p>
      </header>
      {result.status === "ready" ? (
        result.data.length ? (
          <ol className={styles.list} aria-label="AI 对话历史，最近活动优先">
            {result.data.map((item) => (
              <li key={item.conversationId}>
                <GuardedLink
                  href={`/personal-center/ai-history/${encodeURIComponent(item.conversationId)}`}
                  className={styles.item}
                  aria-label={`打开对话：${item.title}`}
                >
                  <strong>{item.title}</strong>
                  {item.preview ? (
                    <span className={styles.preview}>{item.preview}</span>
                  ) : null}
                  <span className={styles.meta}>
                    <HistoryTime value={item.lastActivityAt} /> ·{" "}
                    {item.visibleMessageCount} 条可见消息
                  </span>
                </GuardedLink>
              </li>
            ))}
          </ol>
        ) : (
          <HistoryState status="empty" />
        )
      ) : (
        <HistoryState status={result.status} />
      )}
    </div>
  );
}

export function HistoryDetail({
  result,
}: {
  result: HistoryReadResult<PersonalAiHistoryDetailV1>;
}) {
  return (
    <div className={styles.page}>
      <GuardedLink href="/personal-center/ai-history" className={styles.back}>
        返回 AI 历史
      </GuardedLink>
      {result.status !== "ready" ? (
        <header className={styles.header}>
          <h1>AI 对话记录</h1>
        </header>
      ) : null}
      {result.status === "ready" ? (
        <>
          <header className={styles.header}>
            <h1>{result.data.title}</h1>
            <p>只读对话记录</p>
          </header>
          {result.data.partial ? (
            <p className={styles.notice} role="status">
              部分不支持展示的内容已省略。
            </p>
          ) : null}
          {result.data.messages.length ? (
            <ol className={styles.messages} aria-label="对话消息">
              {result.data.messages.map((message) => (
                <li key={message.id} className={styles.message}>
                  <h2>{message.role === "user" ? "你" : "AI 助手"}</h2>
                  <HistoryTime value={message.createdAt} />
                  {message.blocks.map((block, index) =>
                    block.kind === "text" ? (
                      <p className={styles.messageText} key={index}>
                        {block.text}
                      </p>
                    ) : (
                      <p className={styles.citation} key={index}>
                        引用：{block.label}
                      </p>
                    ),
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <HistoryState status="empty" />
          )}
        </>
      ) : (
        <HistoryState status={result.status} />
      )}
    </div>
  );
}
