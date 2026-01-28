import type { NextConfig } from "next";

const backendOrigin = process.env.NEXT_INTERNAL_API_ORIGIN || "http://imgwebp_backend:5000";
const normalizedBackendOrigin = backendOrigin.replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${normalizedBackendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
