"use client";

import { useSyncExternalStore } from "react";

function readToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function subscribe(onChange: () => void) {
  // Update across midnight and when returning to a suspended tab. No persistence.
  const timer = window.setInterval(onChange, 30_000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

const serverToday = () => "";

// SSR and hydration share an unclassified snapshot; the browser supplies local calendar today.
// The portable classification helper itself never reads a clock or imports React.
export function useTripToday() {
  return useSyncExternalStore(subscribe, readToday, serverToday);
}
