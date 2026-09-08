import { AuthPage } from "@/features/auth/auth-page";
import type { AuthQuery } from "@/features/auth/auth-ui-model";
export const metadata = { title: "创建账户" };
export default async function RegisterPage({ searchParams }: { searchParams: Promise<AuthQuery> }) { return <AuthPage kind="register" query={await searchParams} />; }
