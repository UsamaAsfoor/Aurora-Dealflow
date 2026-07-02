import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@aurora/core",
    "@aurora/trpc",
    "@trpc/client",
    "@trpc/react-query",
    "@trpc/server",
  ],
};

export default nextConfig;
