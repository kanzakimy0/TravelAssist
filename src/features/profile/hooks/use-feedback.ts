"use client";
import { useEffect, useRef, useState } from "react";
export function useFeedback() {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  function saved() {
    clearTimeout(timer.current);
    setMessage("✓ 已保存");
    timer.current = setTimeout(() => setMessage(""), 1800);
  }
  return { message, saved };
}
