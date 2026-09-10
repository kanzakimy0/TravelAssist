import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentAuthUser } from "../../lib/auth/current-user";
import { safeReturnTo } from "../../lib/auth/policy";
import { authHref } from "./auth-ui-model";

/** Request-scoped only. Proxy forwards path intent, never an authorization claim. */
export const verifyPersonalAccess = cache(async () => {
  const result = await currentAuthUser();
  if (result.ok && !result.data) {
    const intent = safeReturnTo((await headers()).get("x-travelassist-path"));
    const path = new URL(intent, "https://return.invalid").pathname;
    redirect(
      authHref(
        "/login",
        path === "/personal-center" || path.startsWith("/personal-center/")
          ? intent
          : "/personal-center",
      ),
    );
  }
  return result;
});
