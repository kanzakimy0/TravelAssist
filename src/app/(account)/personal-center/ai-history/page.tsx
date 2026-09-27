import type { Metadata } from "next";
import { AuthUnavailable } from "@/features/auth/auth-page";
import { verifyPersonalAccess } from "@/features/auth/personal-access";
import { HistoryList } from "@/features/personal-center/ai-history/history-surface";
import { productionAiHistoryReader } from "@/features/personal-center/ai-history/production-reader";

export const metadata: Metadata = {
  title: "AI 助手历史",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AiHistoryPage() {
  const session = await verifyPersonalAccess();
  if (!session.ok || !session.data) return <AuthUnavailable />;
  const result = await productionAiHistoryReader.listHistory(
    session.data.userId,
  );
  return <HistoryList result={result} />;
}
