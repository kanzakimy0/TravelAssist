"use client";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "./dialog";
import styles from "../profile.module.css";

export function Avatar({
  value,
  initial,
}: {
  value: string | null;
  initial: string;
}) {
  return (
    <span className={styles.avatar}>
      {value && value !== "default" ? (
        // A blob URL is a local preview, deliberately not sent to the Next image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="个人头像本地预览" />
      ) : value === "default" ? (
        <span aria-label="默认头像">{initial}</span>
      ) : (
        <svg
          viewBox="0 0 48 48"
          width="42"
          height="42"
          role="img"
          aria-label="未设置头像"
        >
          <circle
            cx="24"
            cy="16"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M8 42c0-17 32-17 32 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      )}
    </span>
  );
}
export function AvatarEditor({
  value,
  savedValue,
  initial,
  onChange,
}: {
  value: string | null;
  savedValue: string | null;
  initial: string;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const urls = useRef(new Set<string>());
  const request = useRef(0);
  useEffect(() => {
    for (const url of urls.current)
      if (url !== value && url !== savedValue) {
        URL.revokeObjectURL(url);
        urls.current.delete(url);
      }
  }, [value, savedValue]);
  useEffect(() => {
    const owned = urls.current;
    const sequence = request;
    return () => {
      sequence.current++;
      for (const url of owned) URL.revokeObjectURL(url);
      owned.clear();
    };
  }, []);
  function close() {
    request.current++;
    setOpen(false);
    setError("");
  }
  async function preview(file?: File) {
    if (!file) return;
    const current = ++request.current;
    if (
      ![
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
        "image/avif",
      ].includes(file.type)
    ) {
      setError("请选择 PNG、JPEG、WebP、GIF 或 AVIF 图片");
      return;
    }
    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.src = url;
    try {
      await probe.decode();
      if (current !== request.current) {
        URL.revokeObjectURL(url);
        return;
      }
      urls.current.add(url);
      onChange(url);
      close();
    } catch {
      URL.revokeObjectURL(url);
      if (current === request.current)
        setError("无法读取这张图片，请选择其他图片");
    }
  }
  return (
    <div className={styles.avatarRow}>
      <Avatar value={value} initial={initial} />
      <div>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => setOpen(true)}
        >
          更换头像
        </button>
        <p className={styles.muted}>选择一张喜欢的照片</p>
      </div>
      {open && (
        <Dialog title="更换头像" onClose={close}>
          <div className={styles.avatarOptions}>
            <Avatar value={value} initial={initial} />
            <p className={styles.muted}>图片仅在当前页面本地预览，不会上传。</p>
            <label className={styles.field}>
              选择头像图片
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                aria-describedby={error ? "avatar-error" : undefined}
                onChange={(event) => {
                  void preview(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            {error && (
              <p className={styles.error} id="avatar-error" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                onChange(null);
                close();
              }}
            >
              删除头像
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                onChange("default");
                close();
              }}
            >
              恢复默认头像
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
