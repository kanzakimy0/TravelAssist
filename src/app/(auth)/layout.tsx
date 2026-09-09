import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AuthShell } from "@/features/auth/auth-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "欢迎出发 · TravelAssist", template: "%s · TravelAssist" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
