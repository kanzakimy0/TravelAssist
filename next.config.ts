import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The desktop preview opens the local app through 127.0.0.1. Without this,
  // Next.js serves the HTML but blocks its dev-only client assets, leaving the
  // page visible and non-interactive.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
