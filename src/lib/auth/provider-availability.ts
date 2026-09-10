import "server-only";
import { publicSupabaseConfig } from "../supabase/config";

/** WBS-5.3 additive UI capability view. Public Auth settings only, no new identity authority. */
export async function providerAvailability() {
  try {
    const { url, key } = publicSupabaseConfig();
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return { google: false, apple: false };
    const settings = await response.json();
    return {
      google: settings.external?.google === true,
      apple: settings.external?.apple === true,
    };
  } catch {
    return { google: false, apple: false };
  }
}
