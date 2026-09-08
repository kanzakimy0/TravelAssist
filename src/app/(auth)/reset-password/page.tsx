import { AuthPage } from "@/features/auth/auth-page";
import type { AuthQuery } from "@/features/auth/auth-ui-model";
export const metadata = { title: "重设密码" };
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<AuthQuery>;
}) {
  return <AuthPage kind="reset" query={await searchParams} />;
}
