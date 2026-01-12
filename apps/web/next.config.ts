import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile workspace packages for monorepo support
  transpilePackages: ["@buidltown/shared"],
  // Output standalone build for Vercel deployment
  output: "standalone",
};

export default nextConfig;
