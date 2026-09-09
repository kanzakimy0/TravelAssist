import { AuthLinkError } from "@/features/auth/auth-link-error";
import type { AuthQuery } from "@/features/auth/auth-ui-model";

export const metadata = { title: "验证链接未完成", referrer: "no-referrer" };

export default async function AuthLinkErrorPage({
  searchParams,
}: {
  searchParams: Promise<AuthQuery>;
}) {
  return <AuthLinkError query={await searchParams} />;
}
