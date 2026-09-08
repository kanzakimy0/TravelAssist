import { AuthPage } from "@/features/auth/auth-page";
import type { AuthQuery } from "@/features/auth/auth-ui-model";
export const metadata = { title: "登录" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<AuthQuery> }) { return <AuthPage kind="login" query={await searchParams} />; }
