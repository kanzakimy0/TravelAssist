import type { Metadata } from "next";
import { AuthUnavailable } from "@/features/auth/auth-page";
import { verifyPersonalAccess } from "@/features/auth/personal-access";
import { HistoryDetail } from "@/features/personal-center/ai-history/history-surface";
import { productionAiHistoryReader } from "@/features/personal-center/ai-history/production-reader";

export const metadata: Metadata = {
  title: "AI 对话记录",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AiHistoryDetailPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const session = await verifyPersonalAccess();
  if (!session.ok || !session.data) return <AuthUnavailable />;
  const { conversationId } = await params;
  const result = await productionAiHistoryReader.readHistoryDetail(
    session.data.userId,
    conversationId,
  );
  return <HistoryDetail result={result} />;
}
