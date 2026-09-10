import { AuthPage } from "@/features/auth/auth-page";
import type { AuthQuery } from "@/features/auth/auth-ui-model";
export const metadata = { title: "找回密码" };
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<AuthQuery>;
}) {
  return <AuthPage kind="forgot" query={await searchParams} />;
}
