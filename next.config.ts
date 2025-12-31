import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Use webpack instead of Turbopack for build to avoid symlink issues on Windows
    useLightningcss: false,
  },
  // Disable Turbopack for build
  typescript: {
    // TypeScript errors are already checked
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
