import type { ReactNode } from "react";
import { verifyPersonalAccess } from "@/features/auth/personal-access";
import { AuthUnavailable } from "@/features/auth/auth-page";

// Layouts persist; recheck on child navigation too. Future data APIs still need their own guard.
export default async function PersonalAccessTemplate({
  children,
}: {
  children: ReactNode;
}) {
  const session = await verifyPersonalAccess();
  return session.ok ? children : <AuthUnavailable />;
}
