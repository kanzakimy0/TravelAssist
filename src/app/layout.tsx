import type { Metadata, Viewport } from "next";

import { WebVitalsObserver } from "@/observability/web-vitals";

import "./globals.css";

export const metadata: Metadata = {
  title: "TravelAssist",
  description: "AI-assisted travel planning",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <WebVitalsObserver />
        {children}
      </body>
    </html>
  );
}
