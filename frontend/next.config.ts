import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // External portrait images are rendered as plain <img>, not next/image,
  // so we don't need images.remotePatterns. Add it only if we adopt next/image.
};

export default nextConfig;
