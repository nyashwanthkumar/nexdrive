import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "blissful-hamster-786.convex.cloud",
      },
    ],
  },
};

export default nextConfig;