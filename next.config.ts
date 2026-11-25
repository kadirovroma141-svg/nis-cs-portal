import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  typescript: { ignoreBuildErrors: true },
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  outputFileTracingIncludes: {
    "/repeat/topic/[slug]/source": ["./content/curriculum/topic-slides.json"],
  },
};

export default nextConfig;
