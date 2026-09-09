"use client";

import { useReportWebVitals } from "next/web-vitals";

import { recordWebVital } from "./client";

export function WebVitalsObserver() {
  useReportWebVitals(recordWebVital);
  return null;
}
