"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "./dialog";
import styles from "../profile.module.css";

export function UnsavedGuard({ dirty }: { dirty: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const abandoning = useRef(false);
  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      if (abandoning.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function navigate(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        abandoning.current
      )
        return;
      const target =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(target instanceof HTMLAnchorElement) ||
        target.hasAttribute("download") ||
        (target.target && target.target !== "_self")
      )
        return;
      const url = new URL(target.href);
      if (
        url.origin !== location.origin ||
        (url.pathname === location.pathname && url.search === location.search)
      )
        return;
      event.preventDefault();
      // Capture runs before Next Link and the existing Avatar menu's click handler.
      // No Shell conversion, history mutation, or private Next router APIs.
      event.stopPropagation();
      setPending(url.pathname + url.search + url.hash);
    }
    document.addEventListener("click", navigate, true);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      document.removeEventListener("click", navigate, true);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [dirty]);
  return (
    pending && (
      <Dialog title="您有尚未保存的修改" onClose={() => setPending(null)}>
        <p className={styles.muted}>离开此页后，本次尚未保存的修改将丢失。</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              abandoning.current = true;
              router.push(pending);
              setPending(null);
            }}
          >
            放弃修改
          </button>
          <button
            type="button"
            className={styles.primary}
            onClick={() => setPending(null)}
          >
            继续编辑
          </button>
        </div>
      </Dialog>
    )
  );
}
