import type { ReactNode } from "react";

/** Shared brand/focus boundary; page adapters retain their accepted geometry. */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="main-shell" data-main-shell>
      {children}
    </div>
  );
}
