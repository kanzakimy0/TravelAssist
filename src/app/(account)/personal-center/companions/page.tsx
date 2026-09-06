import type { Metadata } from "next";

import { CompanionCenter } from "@/features/companions/companion-center";

export const metadata: Metadata = { title: "同行人" };

export default function CompanionsPage() {
  return <CompanionCenter />;
}
