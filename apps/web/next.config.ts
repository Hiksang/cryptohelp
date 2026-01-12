import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile workspace packages for monorepo support
  transpilePackages: ["@buidltown/shared"],
};

export default nextConfig;
