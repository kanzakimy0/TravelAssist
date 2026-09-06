"use client";

import { PersonalPageErrorState } from "@/features/personal-center/states/personal-states";

export default function PersonalCenterError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PersonalPageErrorState onRetry={reset} />;
}
