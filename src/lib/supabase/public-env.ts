/** Public browser-safe configuration only; values are read when called. */
export function getSupabasePublicEnv() {
  // Literal property access is required for Next's public-variable replacement.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required when Supabase is used.",
    );
  }
  if (!key.startsWith("sb_publishable_")) {
    throw new Error(
      "Supabase browser/server user clients require a publishable key.",
    );
  }
  return { url, key };
}
