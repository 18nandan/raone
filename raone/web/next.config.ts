import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_DAEMON_URL: process.env.NEXT_PUBLIC_DAEMON_URL || "http://localhost:7821",
  },
};

export default nextConfig;
