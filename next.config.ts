// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // eski: experimental.serverComponentsExternalPackages
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
