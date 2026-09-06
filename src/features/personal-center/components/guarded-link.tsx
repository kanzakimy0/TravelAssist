"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { usePersonalNavigationGuard } from "./navigation-guard-context";

type GuardedLinkProps = Omit<ComponentProps<typeof Link>, "onNavigate"> & {
  onNavigate?: ComponentProps<typeof Link>["onNavigate"];
};

export function GuardedLink({ href, onNavigate, ...props }: GuardedLinkProps) {
  const { requestNavigation } = usePersonalNavigationGuard();

  return (
    <Link
      href={href}
      {...props}
      onNavigate={(event) => {
        if (requestNavigation(String(href), event)) return;
        onNavigate?.(event);
      }}
    />
  );
}
