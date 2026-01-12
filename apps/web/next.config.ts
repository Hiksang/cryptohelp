import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile workspace packages for monorepo support
  transpilePackages: ["@cryptohelp/shared"],
};

export default nextConfig;
