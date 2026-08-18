import type { NextConfig } from "next";

const backendOrigin = (process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8717").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendOrigin}/api/:path*` }];
  },
};

export default nextConfig;
